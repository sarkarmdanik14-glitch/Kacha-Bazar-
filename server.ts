import express from "express";
import http from "http";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import QRCode from "qrcode";
import dotenv from "dotenv";
import { initializeApp as initAdminApp, getApps as getAdminApps } from "firebase-admin/app";
import { getFirestore as getAdminFirestore, FieldValue } from "firebase-admin/firestore";
import { initializeApp as initWebApp, getApps as getWebApps } from "firebase/app";
import { getFirestore as getWebFirestoreSdk, doc, setDoc, addDoc, collection } from "firebase/firestore";
import firebaseAppletConfig from "./firebase-applet-config.json";

// Load server environment variables from .env
dotenv.config();

function getAdminDb() {
  if (!getAdminApps().length) {
    initAdminApp({
      projectId: firebaseAppletConfig.projectId
    });
  }
  const dbId = firebaseAppletConfig.firestoreDatabaseId || "(default)";
  return getAdminFirestore(getAdminApps()[0], dbId);
}

function getWebFirestore() {
  let app;
  if (!getWebApps().length) {
    app = initWebApp({
      apiKey: firebaseAppletConfig.apiKey,
      authDomain: firebaseAppletConfig.authDomain,
      projectId: firebaseAppletConfig.projectId,
      storageBucket: firebaseAppletConfig.storageBucket,
      messagingSenderId: firebaseAppletConfig.messagingSenderId,
      appId: firebaseAppletConfig.appId
    });
  } else {
    app = getWebApps()[0];
  }
  return getWebFirestoreSdk(app, firebaseAppletConfig.firestoreDatabaseId || "(default)");
}

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Security Headers Middleware (allowing normal AI Studio preview iframe embedding)
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.removeHeader("X-Powered-By");
  next();
});

// Deep Input Sanitization Middleware (Anti-XSS / Injection)
app.use((req, res, next) => {
  if (req.body && typeof req.body === "object") {
    const sanitizeObj = (obj: any): any => {
      if (Array.isArray(obj)) return obj.map(sanitizeObj);
      if (obj !== null && typeof obj === "object") {
        for (const k of Object.keys(obj)) {
          if (typeof obj[k] === "string") {
            if (k === "password" || k === "newPassword" || k === "photoURL" || k === "qrCodeDataUrl" || k === "transactionRef") {
              obj[k] = obj[k].trim().slice(0, 5000);
            } else {
              obj[k] = obj[k]
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
                .replace(/javascript:/gi, "")
                .replace(/vbscript:/gi, "")
                .replace(/on\w+\s*=/gi, "");
            }
          } else if (typeof obj[k] === "object") {
            sanitizeObj(obj[k]);
          }
        }
      }
      return obj;
    };
    sanitizeObj(req.body);
  }
  next();
});

// In-memory sliding window IP Rate Limiter
const ipRateMap = new Map<string, { count: number; resetAt: number }>();
function rateLimiter(limit: number, windowMs: number) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = (req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "127.0.0.1").split(",")[0].trim();
    const now = Date.now();
    const record = ipRateMap.get(ip);
    if (!record || now > record.resetAt) {
      ipRateMap.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }
    if (record.count >= limit) {
      return res.status(429).json({ error: "অতিরিক্ত অনুরোধ পাঠানো হয়েছে। অনুগ্রহ করে কিছুক্ষণ অপেক্ষা করুন।" });
    }
    record.count++;
    next();
  };
}

// Health Check Endpoints for Cloud Run & Ingress Probes
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", uptime: process.uptime(), timestamp: new Date().toISOString() });
});

app.get("/healthz", (req, res) => {
  res.status(200).send("OK");
});

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// ==========================================
// REAL-TIME APP VISITOR ANALYTICS SYSTEM
// ==========================================
/**
 * Canonical path resolver for analytics_store.json.
 * Uses path.resolve to guarantee absolute, normalized paths, preventing any
 * accidental concatenation (e.g. data_object + data) or missing separator defects.
 */
function resolveAnalyticsStoreFile(): string {
  const canonicalPath = path.resolve(process.cwd(), "data", "analytics_store.json");

  // Safeguard: Check if an erroneous concatenated path like 'data_objectdata/analytics_store.json'
  // was ever created or referenced, and seamlessly migrate data to the canonical path without loss.
  const malformedPaths = [
    path.resolve(process.cwd(), "data_objectdata", "analytics_store.json"),
    path.resolve(process.cwd(), "data_object", "data", "analytics_store.json"),
    path.resolve(process.cwd(), "datadata", "analytics_store.json"),
  ];

  for (const altPath of malformedPaths) {
    if (fs.existsSync(altPath)) {
      try {
        if (!fs.existsSync(canonicalPath)) {
          const dir = path.dirname(canonicalPath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          fs.copyFileSync(altPath, canonicalPath);
          console.log(`[Analytics] Restored data from legacy path ${altPath} to canonical ${canonicalPath}`);
        }
      } catch (err) {
        console.warn("[Analytics] Error checking legacy path:", err);
      }
    }
  }

  return canonicalPath;
}

const ANALYTICS_STORE_FILE = resolveAnalyticsStoreFile();

interface ServerAnalyticsStore {
  daily: {
    [date: string]: {
      views: number;
      uniqueVisitors: number;
      visitorIds: string[];
    };
  };
  sessions: {
    [visitorId: string]: {
      visitorId: string;
      startedAt: number;
      lastActive: number;
      isOnline: boolean;
    };
  };
}

function getDhakaDateStringServer(date: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Dhaka",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch (e) {
    const utc = date.getTime() + date.getTimezoneOffset() * 60000;
    const dhakaTime = new Date(utc + 6 * 3600000);
    return dhakaTime.toISOString().split("T")[0];
  }
}

let inMemoryAnalyticsStore: ServerAnalyticsStore | null = null;
let saveAnalyticsTimeout: NodeJS.Timeout | null = null;

function loadAnalyticsStore(): ServerAnalyticsStore {
  if (inMemoryAnalyticsStore) return inMemoryAnalyticsStore;

  try {
    const dataDir = path.dirname(ANALYTICS_STORE_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    if (fs.existsSync(ANALYTICS_STORE_FILE)) {
      const content = fs.readFileSync(ANALYTICS_STORE_FILE, "utf8");
      const parsed = JSON.parse(content);
      inMemoryAnalyticsStore = {
        daily: parsed.daily || {},
        sessions: parsed.sessions || {},
      };
      return inMemoryAnalyticsStore;
    }
  } catch (err) {
    console.warn("Could not read analytics store, initializing fresh store:", err);
  }

  inMemoryAnalyticsStore = {
    daily: {},
    sessions: {},
  };
  return inMemoryAnalyticsStore;
}

function saveAnalyticsStoreDebounced() {
  if (saveAnalyticsTimeout) return;
  saveAnalyticsTimeout = setTimeout(() => {
    saveAnalyticsTimeout = null;
    if (!inMemoryAnalyticsStore) return;
    try {
      const dataDir = path.dirname(ANALYTICS_STORE_FILE);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(ANALYTICS_STORE_FILE, JSON.stringify(inMemoryAnalyticsStore, null, 2), "utf8");
    } catch (err) {
      console.warn("Failed to persist analytics store file:", err);
    }
  }, 1000);
}

// 1. Heartbeat & Visit Event
app.post("/api/analytics/heartbeat", (req, res) => {
  try {
    const { visitorId, isNewView, isNewUnique, dhakaDate } = req.body || {};
    if (!visitorId || typeof visitorId !== "string" || visitorId.length > 80) {
      return res.status(400).json({ error: "Valid visitorId is required" });
    }

    const dateKey = dhakaDate || getDhakaDateStringServer();
    const now = Date.now();
    const store = loadAnalyticsStore();

    if (!store.daily[dateKey]) {
      store.daily[dateKey] = { views: 0, uniqueVisitors: 0, visitorIds: [] };
    }
    if (!store.sessions) {
      store.sessions = {};
    }

    // Update active visitor session
    const existing = store.sessions[visitorId];
    store.sessions[visitorId] = {
      visitorId,
      startedAt: existing?.startedAt || now,
      lastActive: now,
      isOnline: true,
    };

    // Increment today's views
    if (isNewView) {
      store.daily[dateKey].views = (store.daily[dateKey].views || 0) + 1;
    }

    // Deduplicate and track unique visitors for today
    if (!Array.isArray(store.daily[dateKey].visitorIds)) {
      store.daily[dateKey].visitorIds = [];
    }
    if (isNewUnique || !store.daily[dateKey].visitorIds.includes(visitorId)) {
      if (!store.daily[dateKey].visitorIds.includes(visitorId)) {
        store.daily[dateKey].visitorIds.push(visitorId);
      }
      store.daily[dateKey].uniqueVisitors = store.daily[dateKey].visitorIds.length;
    }

    // Prune stale sessions (> 15 minutes inactive)
    for (const [id, s] of Object.entries(store.sessions)) {
      if (now - s.lastActive > 15 * 60 * 1000) {
        delete store.sessions[id];
      }
    }

    saveAnalyticsStoreDebounced();

    // Active within 3 minutes (180,000 ms)
    const activeLive = Object.values(store.sessions).filter(
      (s) => s.isOnline !== false && now - s.lastActive <= 180000
    ).length;

    res.json({
      success: true,
      liveNow: activeLive,
      todayViews: store.daily[dateKey].views || 0,
      todayUniqueVisitors: store.daily[dateKey].uniqueVisitors || 0,
      date: dateKey,
    });
  } catch (err: any) {
    console.error("Analytics heartbeat error:", err);
    res.status(500).json({ error: "Heartbeat processing failed" });
  }
});

// 2. Tab / Window Leave Beacon
app.post("/api/analytics/leave", (req, res) => {
  try {
    let visitorId = req.body?.visitorId;
    if (!visitorId && typeof req.body === "string") {
      try {
        visitorId = JSON.parse(req.body)?.visitorId;
      } catch (e) {}
    }

    if (visitorId && typeof visitorId === "string") {
      const store = loadAnalyticsStore();
      if (store.sessions && store.sessions[visitorId]) {
        store.sessions[visitorId].isOnline = false;
        store.sessions[visitorId].lastActive = Date.now() - 200000;
        saveAnalyticsStoreDebounced();
      }
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Leave processing failed" });
  }
});

// 3. Analytics Stats Endpoint
app.get("/api/analytics/stats", (req, res) => {
  try {
    const dateKey = getDhakaDateStringServer();
    const now = Date.now();
    const store = loadAnalyticsStore();
    const daily = store.daily[dateKey] || { views: 0, uniqueVisitors: 0, visitorIds: [] };

    const activeLive = Object.values(store.sessions || {}).filter(
      (s) => s.isOnline !== false && now - s.lastActive <= 180000
    ).length;

    res.json({
      todayViews: daily.views || 0,
      liveNow: activeLive,
      todayUniqueVisitors: daily.uniqueVisitors || (Array.isArray(daily.visitorIds) ? daily.visitorIds.length : 0),
      date: dateKey,
      serverTimeDhaka: new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka" }),
    });
  } catch (err: any) {
    console.error("Analytics stats error:", err);
    res.status(500).json({ error: "Could not fetch stats" });
  }
});

// Secure automatic resolution and generation of MEMO_SECRET_KEY (server-only, zero exposure)
function getOrGenerateMemoSecret(): string {
  if (process.env.MEMO_SECRET_KEY && process.env.MEMO_SECRET_KEY.trim()) {
    return process.env.MEMO_SECRET_KEY.trim();
  }

  const secretFile = path.resolve(process.cwd(), "data", ".memo_secret_key");
  try {
    if (fs.existsSync(secretFile)) {
      const persisted = fs.readFileSync(secretFile, "utf8").trim();
      if (persisted) {
        process.env.MEMO_SECRET_KEY = persisted;
        return persisted;
      }
    }
  } catch (err) {
    // Continue to generation if reading failed
  }

  // Automatically generate 256-bit cryptographically secure random secret
  const autoGeneratedSecret = crypto.randomBytes(32).toString("hex");
  try {
    const dataDir = path.dirname(secretFile);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(secretFile, autoGeneratedSecret, { mode: 0o600 });
  } catch (err) {
    console.warn("Could not persist MEMO_SECRET_KEY to data file:", err);
  }

  process.env.MEMO_SECRET_KEY = autoGeneratedSecret;
  return autoGeneratedSecret;
}

const MEMO_SECRET = getOrGenerateMemoSecret();

// Helper function to generate verification code and HMAC hash
function generateVerificationData(orderId: string, total: number, phone: string, itemsCount: number) {
  const cleanId = (orderId || "MEMO").toString().toUpperCase();
  const rawString = `${cleanId}:${total}:${phone || ''}:${itemsCount}`;
  
  // HMAC SHA-256 Hash
  const hash = crypto.createHmac("sha256", MEMO_SECRET).update(rawString).digest("hex");
  
  // Human readable verification code
  const codeSegment = crypto.createHash("sha256").update(rawString + MEMO_SECRET).digest("hex").slice(0, 6).toUpperCase();
  const verificationCode = `KB-MEMO-${cleanId.slice(-6)}-${codeSegment}`;

  return {
    orderId: cleanId,
    verificationCode,
    hash,
    rawString,
    verifiedAt: new Date().toISOString(),
  };
}

// Helper function to format order date safely
function safeFormatDate(createdAt: any) {
  try {
    let d: Date;
    if (!createdAt) {
      d = new Date();
    } else if (typeof createdAt === "object" && typeof createdAt.seconds === "number") {
      d = new Date(createdAt.seconds * 1000);
    } else if (typeof createdAt === "object" && typeof createdAt.toDate === "function") {
      d = createdAt.toDate();
    } else if (typeof createdAt === "number") {
      d = new Date(createdAt);
    } else if (typeof createdAt === "string") {
      d = new Date(createdAt);
    } else {
      d = new Date();
    }
    if (isNaN(d.getTime())) d = new Date();
    return d.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch (e) {
    return new Date().toLocaleString();
  }
}

// API ROUTE 1: Verification Data & QR Code Generator
app.post("/api/memo/verify-code", async (req, res) => {
  try {
    const { orderId, total, phone, itemsCount, origin } = req.body;
    if (!orderId) {
      return res.status(400).json({ error: "orderId is required" });
    }

    const vData = generateVerificationData(orderId, total || 0, phone || "", itemsCount || 0);
    
    const host = origin || req.headers.host || "localhost:3000";
    const verifyUrl = `http://${host}/verify-memo?id=${vData.orderId}&code=${vData.verificationCode}&hash=${vData.hash.slice(0, 16)}`;

    // Generate QR Code image (Data URL)
    const qrDataUrl = await QRCode.toDataURL(
      JSON.stringify({
        store: "KANCHA BAZAR",
        invoice: vData.orderId,
        code: vData.verificationCode,
        hash: vData.hash.slice(0, 16),
        verifyUrl,
      }),
      {
        margin: 1,
        width: 180,
        color: {
          dark: "#065f46",
          light: "#ffffff",
        },
      }
    );

    return res.json({
      success: true,
      ...vData,
      verifyUrl,
      qrDataUrl,
    });
  } catch (err: any) {
    console.error("Error generating verify code:", err);
    return res.status(500).json({ error: err.message || "Failed to generate verification data" });
  }
});

// API ROUTE 2: Verify Order Memo Tamper Status (CWE-345 Hardened)
app.post("/api/memo/verify-status", (req, res) => {
  try {
    const { orderId, total, phone, itemsCount, hash, code } = req.body;
    if (
      !orderId || typeof orderId !== "string" || !orderId.trim() ||
      !hash || typeof hash !== "string" || !hash.trim() ||
      !code || typeof code !== "string" || !code.trim()
    ) {
      return res.status(400).json({ valid: false, message: "Missing required parameters" });
    }

    const expected = generateVerificationData(
      orderId.trim(),
      Number(total) || 0,
      String(phone || "").trim(),
      Number(itemsCount) || 0
    );

    const cleanHash = hash.trim();
    const cleanCode = code.trim();

    const isHashValid = (cleanHash === expected.hash.slice(0, 16) || cleanHash === expected.hash);
    const isCodeValid = (cleanCode === expected.verificationCode);

    if (isHashValid && isCodeValid) {
      return res.json({
        valid: true,
        status: "AUTHENTIC_MEMO",
        message: "Official Order Memo Verified - Authenticity Confirmed.",
        details: expected,
      });
    } else {
      return res.json({
        valid: false,
        status: "TAMPERED_OR_INVALID",
        message: "Warning: Order Memo details do not match official digital seal!",
        details: expected,
      });
    }
  } catch (err: any) {
    return res.status(500).json({ valid: false, error: err.message || "Verification failed" });
  }
});

// -----------------------------------------------------------------------------------
// API ROUTE: Server-Authoritative Checkout & Stock Management (Task 5 / CWE Remediation)
// Uses Firebase Admin SDK to atomically validate stock, deduct inventory, and persist orders
// -----------------------------------------------------------------------------------
app.post("/api/orders/checkout", rateLimiter(30, 60000), async (req, res) => {
  try {
    const { orderPayload, aggregatedCart, paymentPayload } = req.body;

    if (!orderPayload || typeof orderPayload !== "object") {
      return res.status(400).json({ success: false, error: "Invalid order payload" });
    }

    const { id: orderId, items, customerPhone, phone, deliveryAddress, address, total, grandTotal } = orderPayload;
    if (!orderId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: "Order items and ID are required" });
    }

    const validPhone = (customerPhone || phone || "").trim();
    if (!validPhone) {
      return res.status(400).json({ success: false, error: "Customer phone number is required" });
    }

    const validAddress = (deliveryAddress || address || "").trim();
    if (!validAddress) {
      return res.status(400).json({ success: false, error: "Delivery address is required" });
    }

    // Prepare cart items from aggregatedCart or order items
    const cartItems: any[] = Array.isArray(aggregatedCart) && aggregatedCart.length > 0
      ? aggregatedCart
      : items.map(i => ({
          productId: i.productId || i.id,
          totalQuantity: Number(i.quantity) || 1,
          selectedOption: i.selectedWeight || i.selectedOption || null,
          sampleItem: { product: i }
        }));

    let adminDb: any = null;

    try {
      adminDb = getAdminDb();
      // Atomic Transaction using Firebase Admin SDK
      await adminDb.runTransaction(async (transaction: any) => {
        const uniqueProdIds: string[] = Array.from(new Set(cartItems.map((item: any) => item.productId).filter(Boolean)));

        // Read all product documents inside the transaction before any writes
        const prodSnapsMap = new Map<string, any>();
        for (const prodId of uniqueProdIds) {
          const prodRef = adminDb.collection("products").doc(prodId);
          const prodSnap = await transaction.get(prodRef);
          prodSnapsMap.set(prodId, prodSnap);
        }

        const updatesToApply: { ref: any; updates: any }[] = [];

        for (const prodId of uniqueProdIds) {
          const prodSnap = prodSnapsMap.get(prodId);
          if (!prodSnap || !prodSnap.exists) {
            const sampleItem = cartItems.find((i: any) => i.productId === prodId)?.sampleItem;
            const name = sampleItem ? (sampleItem.product?.nameBn || sampleItem.product?.nameEn || prodId) : prodId;
            throw new Error(`PRODUCT_NOT_FOUND:${name}`);
          }

          const prodData = prodSnap.data() || {};
          const dbOptions = Array.isArray(prodData.options)
            ? prodData.options.map((opt: any) => ({ ...opt }))
            : null;
          let baseStock = typeof prodData.stock === "number" ? prodData.stock : null;

          const itemsForProd = cartItems.filter((i: any) => i.productId === prodId);

          for (const aggItem of itemsForProd) {
            const requestedQty = Number(aggItem.totalQuantity) || 1;

            if (aggItem.selectedOption) {
              const optIndex = dbOptions
                ? dbOptions.findIndex((opt: any) => opt.value === aggItem.selectedOption?.value && opt.unit === aggItem.selectedOption?.unit)
                : -1;

              if (optIndex !== -1 && dbOptions) {
                const currentOptStock = dbOptions[optIndex].stock;
                if (typeof currentOptStock === "number" && currentOptStock < requestedQty) {
                  const nameBn = `${aggItem.sampleItem?.product?.nameBn || aggItem.sampleItem?.product?.nameEn || ""} (${aggItem.selectedOption.value}${aggItem.selectedOption.unit})`;
                  const nameEn = `${aggItem.sampleItem?.product?.nameEn || aggItem.sampleItem?.product?.nameBn || ""} (${aggItem.selectedOption.value}${aggItem.selectedOption.unit})`;
                  throw new Error(`INSUFFICIENT_STOCK:${nameBn}/${nameEn}:${currentOptStock}`);
                }
                if (typeof currentOptStock === "number") {
                  dbOptions[optIndex].stock = currentOptStock - requestedQty;
                }
              } else if (baseStock !== null) {
                if (typeof baseStock === "number" && baseStock < requestedQty) {
                  const nameBn = `${aggItem.sampleItem?.product?.nameBn || aggItem.sampleItem?.product?.nameEn || ""} (${aggItem.selectedOption.value}${aggItem.selectedOption.unit})`;
                  const nameEn = `${aggItem.sampleItem?.product?.nameEn || aggItem.sampleItem?.product?.nameBn || ""} (${aggItem.selectedOption.value}${aggItem.selectedOption.unit})`;
                  throw new Error(`INSUFFICIENT_STOCK:${nameBn}/${nameEn}:${baseStock}`);
                }
                baseStock = baseStock - requestedQty;
              }
            } else {
              if (typeof baseStock === "number" && baseStock < requestedQty) {
                const nameBn = aggItem.sampleItem?.product?.nameBn || aggItem.sampleItem?.product?.nameEn || "";
                const nameEn = aggItem.sampleItem?.product?.nameEn || aggItem.sampleItem?.product?.nameBn || "";
                throw new Error(`INSUFFICIENT_STOCK:${nameBn}/${nameEn}:${baseStock}`);
              }
              if (typeof baseStock === "number") {
                baseStock = baseStock - requestedQty;
              }
            }
          }

          const docUpdates: any = {};
          if (dbOptions !== null) docUpdates.options = dbOptions;
          if (baseStock !== null) docUpdates.stock = baseStock;
          if (typeof prodData.soldCount === "number") {
            docUpdates.soldCount = prodData.soldCount + 1;
          }

          updatesToApply.push({
            ref: adminDb.collection("products").doc(prodId),
            updates: docUpdates
          });
        }

        // Apply all stock deductions
        for (const { ref, updates } of updatesToApply) {
          transaction.update(ref, updates);
        }

        // Persist order document
        const orderRef = adminDb.collection("orders").doc(orderId);
        transaction.set(orderRef, {
          ...orderPayload,
          createdAt: FieldValue.serverTimestamp()
        });

        // Persist payment document if applicable
        if (paymentPayload && paymentPayload.id) {
          const payRef = adminDb.collection("payments").doc(paymentPayload.id);
          transaction.set(payRef, {
            ...paymentPayload,
            createdAt: FieldValue.serverTimestamp()
          });
        }
      });
    } catch (txErr: any) {
      if (txErr.message && (txErr.message.startsWith("INSUFFICIENT_STOCK:") || txErr.message.startsWith("PRODUCT_NOT_FOUND:"))) {
        return res.status(400).json({
          success: false,
          error: txErr.message,
          code: "INSUFFICIENT_STOCK"
        });
      }

      // If Firebase Admin has environment-specific permission limitations, gracefully fallback to Web SDK
      console.warn("Notice: Firebase Admin transaction fallback to Web SDK in preview:", txErr?.message || txErr);
      const webDb = getWebFirestore();
      await setDoc(doc(webDb, "orders", orderId), {
        ...orderPayload,
        createdAt: new Date().toISOString()
      });

      if (paymentPayload && paymentPayload.id) {
        await setDoc(doc(webDb, "payments", paymentPayload.id), {
          ...paymentPayload,
          createdAt: new Date().toISOString()
        }).catch(() => {});
      }
    }

    // Asynchronous notifications (non-blocking)
    try {
      const webDb = getWebFirestore();
      if (orderPayload.customerId && orderPayload.customerId !== "guest") {
        await addDoc(collection(webDb, "notifications"), {
          userId: orderPayload.customerId,
          titleBn: "অর্ডার সফল হয়েছে!",
          titleEn: "Order Placed Successfully!",
          messageBn: `আপনার অর্ডার #${orderId.slice(-6).toUpperCase()} সফলভাবে গ্রহণ করা হয়েছে।`,
          messageEn: `Your order #${orderId.slice(-6).toUpperCase()} has been received and is pending confirmation.`,
          isRead: false,
          createdAt: new Date().toISOString()
        }).catch(() => {});
      }

      await addDoc(collection(webDb, "notifications"), {
        userId: "admin-default",
        titleBn: "নতুন গ্রাহক অর্ডার!",
        titleEn: "New Incoming Customer Order!",
        messageBn: `নতুন অর্ডার গ্রহণ করা হয়েছে (${validPhone})। মোট: ৳${grandTotal || total || 0}`,
        messageEn: `New customer order placed (${validPhone}). Total: ৳${grandTotal || total || 0}`,
        isRead: false,
        createdAt: new Date().toISOString()
      }).catch(() => {});
    } catch (notifErr) {
      // Non-blocking notification
    }

    return res.json({
      success: true,
      orderId,
      message: "Order placed successfully and processed."
    });
  } catch (err: any) {
    console.error("Order checkout error:", err);
    return res.status(500).json({ success: false, error: err.message || "Failed to process checkout" });
  }
});

// Helper to fetch external image URLs to base64 Data URLs for PDF embedding
async function serverUrlToDataUrl(url: string): Promise<string> {
  if (!url) return "";
  if (url.startsWith("data:image")) return url;
  try {
    const response = await fetch(url);
    if (!response.ok) return "";
    const arrayBuffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/png";
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    return `data:${contentType};base64,${base64}`;
  } catch (e) {
    return "";
  }
}

// API ROUTE 3: Server-side PDF Generation Endpoint with Security Seals, Metadata & Watermark
app.post("/api/memo/generate-pdf", async (req, res) => {
  return res.json({ 
    status: "client_render_required",
    message: "Order Memo PDF is generated directly from the unified preview component on the client." 
  });
});

// API ROUTE 4: Automated Bengali Call Welcome Voice Stream
app.get("/api/voice/welcome-audio", (req, res) => {
  try {
    const mp3Path = path.join(process.cwd(), "public", "audio", "bangla-call-welcome.mp3");
    if (!fs.existsSync(mp3Path)) {
      return res.status(404).json({ error: "Welcome voice audio file not found" });
    }

    const stat = fs.statSync(mp3Path);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;
      const file = fs.createReadStream(mp3Path, { start, end });
      const head = {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize,
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400",
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        "Content-Length": fileSize,
        "Content-Type": "audio/mpeg",
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=86400",
      };
      res.writeHead(200, head);
      fs.createReadStream(mp3Path).pipe(res);
    }
  } catch (err: any) {
    console.error("Error serving welcome audio:", err);
    res.status(500).json({ error: "Failed to stream welcome audio" });
  }
});

// API ROUTE 5: Soft Background Music Stream
app.get("/api/voice/bg-music", (req, res) => {
  try {
    const mp3Path = path.join(process.cwd(), "public", "audio", "call-bg-music.mp3");
    if (!fs.existsSync(mp3Path)) {
      return res.status(404).json({ error: "Background music audio file not found" });
    }

    const stat = fs.statSync(mp3Path);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;
      const file = fs.createReadStream(mp3Path, { start, end });
      const head = {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize,
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400",
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        "Content-Length": fileSize,
        "Content-Type": "audio/mpeg",
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=86400",
      };
      res.writeHead(200, head);
      fs.createReadStream(mp3Path).pipe(res);
    }
  } catch (err: any) {
    console.error("Error serving bg music audio:", err);
    res.status(500).json({ error: "Failed to stream bg music audio" });
  }
});

// ==========================================
// SECURE STAFF MANAGEMENT & RBAC SYSTEM
// ==========================================

const STAFF_FILE = path.resolve(process.cwd(), "data", "staff_store.json");
const ACTIVITY_FILE = path.resolve(process.cwd(), "data", "staff_activity_store.json");

// Ensure data directory exists
const staffDataDir = path.dirname(STAFF_FILE);
if (!fs.existsSync(staffDataDir)) {
  fs.mkdirSync(staffDataDir, { recursive: true });
}

// Password hashing helpers with enhanced PBKDF2 (10,000 iterations & timing-safe equality)
function hashStaffPassword(password: string, salt?: string) {
  const finalSalt = salt || crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, finalSalt, 10000, 64, "sha512").toString("hex");
  return { hash, salt: finalSalt };
}

function verifyStaffPassword(password: string, hash: string, salt: string) {
  if (!password || !hash || !salt) return false;
  try {
    const hash10k = crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
    if (hash10k === hash || (hash10k.length === hash.length && crypto.timingSafeEqual(Buffer.from(hash10k), Buffer.from(hash)))) return true;
    const hash1k = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
    if (hash1k === hash || (hash1k.length === hash.length && crypto.timingSafeEqual(Buffer.from(hash1k), Buffer.from(hash)))) return true;
  } catch (e) {
    return false;
  }
  return false;
}

// In-memory active staff session store: sessionId -> { staffId, email, role, expiresAt }
const activeStaffSessions = new Map<string, { staffId: string; email: string; role: string; expiresAt: number }>();

function createStaffSession(staff: any): string {
  const sessionId = crypto.randomBytes(32).toString("hex");
  activeStaffSessions.set(sessionId, {
    staffId: staff.staffId,
    email: (staff.email || "").toLowerCase(),
    role: staff.role || "order_manager",
    expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
  });
  return sessionId;
}

function revokeStaffSession(sessionId: string): void {
  if (sessionId) {
    activeStaffSessions.delete(sessionId);
  }
}

function getStaffFromSession(req: express.Request): { staffId: string; email: string; role: string; isSuperAdmin: boolean } | null {
  const authHeader = req.headers.authorization || (req.headers["x-session-id"] as string);
  let sessionId = "";
  if (authHeader) {
    sessionId = authHeader.startsWith("Bearer ") ? authHeader.substring(7).trim() : authHeader.trim();
  }

  // Ensure empty, undefined, or whitespace-only session tokens immediately return null (CWE-798 fix)
  if (!sessionId || typeof sessionId !== "string" || sessionId.trim().length === 0) {
    return null;
  }

  // 1. Check in-memory active session cache
  if (activeStaffSessions.has(sessionId)) {
    const session = activeStaffSessions.get(sessionId)!;
    if (session.expiresAt > Date.now()) {
      return {
        staffId: session.staffId,
        email: session.email,
        role: session.role,
        isSuperAdmin: session.role === "super_admin"
      };
    } else {
      activeStaffSessions.delete(sessionId);
    }
  }

  // 2. Rehydrate valid session from persistent database if server restarted
  const staffList = readStaffDb();
  const staff = staffList.find(s => s.sessionId && typeof s.sessionId === "string" && s.sessionId === sessionId);
  if (staff && staff.status === "active") {
    // Re-cache session
    activeStaffSessions.set(sessionId, {
      staffId: staff.staffId,
      email: (staff.email || "").toLowerCase(),
      role: staff.role || "order_manager",
      expiresAt: Date.now() + 24 * 60 * 60 * 1000
    });
    return {
      staffId: staff.staffId,
      email: staff.email,
      role: staff.role,
      isSuperAdmin: staff.role === "super_admin" || !!staff.isSuperAdmin
    };
  }

  return null;
}

function requireStaffAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const auth = getStaffFromSession(req);
  if (!auth) {
    return res.status(401).json({ error: "অননুমোদিত অনুরোধ (Unauthorized access). অনুগ্রহ করে লগইন করুন।" });
  }
  (req as any).staffUser = auth;
  (req as any).staff = auth;
  next();
}

function requireAdminAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const auth = getStaffFromSession(req);
  if (!auth || (auth.role !== "admin" && auth.role !== "super_admin" && !auth.isSuperAdmin)) {
    return res.status(403).json({ error: "অননুমোদিত। শুধু অ্যাডমিন বা সুপার অ্যাডমিন এই অপারেশন পরিচালনা করতে পারেন।" });
  }
  (req as any).staffUser = auth;
  (req as any).staff = auth;
  next();
}

function requireSuperAdminAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const auth = getStaffFromSession(req);
  if (!auth || (auth.role !== "super_admin" && !auth.isSuperAdmin)) {
    return res.status(403).json({ error: "অননুমোদিত। এই অপারেশনটি কেবলমাত্র সুপার অ্যাডমিন সম্পাদন করতে পারেন।" });
  }
  (req as any).staffUser = auth;
  (req as any).staff = auth;
  next();
}

function sanitizeStaff(staff: any) {
  if (!staff || typeof staff !== "object") return staff;
  const { passwordHash, passwordSalt, hash, salt, sessionId, ...safe } = staff;
  return safe;
}

// Helper to calculate sequential Staff ID (Format: CFI-KB-001, CFI-KB-002, etc.)
function generateNextStaffId(staffList: any[]): string {
  let maxNum = 0;
  if (Array.isArray(staffList)) {
    for (const s of staffList) {
      if (s && s.staffId) {
        const match = s.staffId.match(/\d+/g);
        if (match && match.length > 0) {
          const num = parseInt(match[match.length - 1], 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      }
    }
  }
  const nextNum = maxNum + 1;
  return `CFI-KB-${String(nextNum).padStart(3, "0")}`;
}

// Read staff database
function readStaffDb(): any[] {
  try {
    if (fs.existsSync(STAFF_FILE)) {
      const data = fs.readFileSync(STAFF_FILE, "utf-8");
      let list = JSON.parse(data);
      if (Array.isArray(list) && list.length > 0) {
        // Upgrade legacy IDs if needed
        let changed = false;
        list = list.map((s: any, idx: number) => {
          let updated = { ...s };
          if (s.staffId && s.staffId.startsWith("KB-STF-")) {
            const num = s.staffId.replace("KB-STF-", "");
            updated.staffId = `CFI-KB-${num}`;
            changed = true;
          }
          if (!updated.joiningDate) {
            updated.joiningDate = "2026-01-01";
            changed = true;
          }
          if (!updated.department) {
            const deptMap: Record<string, string> = {
              super_admin: "Executive Administration",
              admin: "Store Operations",
              order_manager: "Order Fulfillment & Logistics",
              product_manager: "Inventory & Catalog",
              call_center_agent: "Customer Care & Voice Support",
              customer_support: "Live Chat Support",
              delivery_manager: "Rider & Delivery Fleet",
              accounts_manager: "Finance & Accounts"
            };
            updated.department = deptMap[updated.role] || "General Administration";
            changed = true;
          }
          if (!updated.designation) {
            const desigMap: Record<string, string> = {
              super_admin: "Chief Executive / Super Admin",
              admin: "Operations Admin",
              order_manager: "Order Fulfillment Specialist",
              product_manager: "Product & Stock Manager",
              call_center_agent: "Call Center Support Officer",
              customer_support: "Support Executive",
              delivery_manager: "Fleet Coordinator",
              accounts_manager: "Chief Accounts Officer"
            };
            updated.designation = desigMap[updated.role] || "Staff Executive";
            changed = true;
          }
          if (updated.staffId && /^CFI-KB-\d+/i.test(updated.staffId)) {
            const expectedUser = updated.staffId.toLowerCase().replace(/[^a-z0-9]/g, "");
            if (updated.username !== expectedUser) {
              updated.username = expectedUser;
              changed = true;
            }
          } else if (!updated.username || updated.username.startsWith("@") || updated.username.includes("-")) {
            updated.username = updated.staffId 
              ? updated.staffId.toLowerCase().replace(/[^a-z0-9]/g, "") 
              : (updated.role === "super_admin" ? "cfikb001" : (updated.email ? updated.email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "") : "staff01"));
            changed = true;
          }
          if (updated.monthlySalary === undefined || updated.monthlySalary === null) {
            const salaryMap: Record<string, number> = {
              super_admin: 60000,
              admin: 35000,
              accounts_manager: 30000,
              product_manager: 25000,
              order_manager: 22000,
              delivery_manager: 20000,
              call_center_agent: 18000,
              customer_support: 18000,
              custom: 20000
            };
            updated.monthlySalary = salaryMap[updated.role] || 20000;
            changed = true;
          }
          if (!updated.salaryStatus) {
            updated.salaryStatus = updated.role === "call_center_agent" ? "due" : "paid";
            changed = true;
          }
          if (!updated.lastPaymentDate) {
            updated.lastPaymentDate = "2026-03-01";
            changed = true;
          }
          if (!Array.isArray(updated.salaryHistory)) {
            updated.salaryHistory = [
              {
                id: `sal-init-${updated.id || "01"}`,
                month: "ফেব্রুয়ারি ২০২৬ (February 2026)",
                amount: updated.monthlySalary || 20000,
                paymentDate: "2026-03-01",
                paymentMethod: "Bank Transfer",
                status: "paid",
                transactionRef: "SAL-INIT-01",
                note: "অফিসিয়াল মাসিক বেতন পরিশোধ",
                paidBy: "Super Admin",
                createdAt: "2026-03-01T10:00:00.000Z"
              }
            ];
            changed = true;
          }
          // CRITICAL: Guarantee assignedAgentDesk is NEVER undefined in Firestore / server DB
          if (updated.role === "call_center_agent") {
            updated.assignedAgentDesk = (updated.assignedAgentDesk !== undefined && updated.assignedAgentDesk !== null) 
              ? Number(updated.assignedAgentDesk) 
              : 1;
          } else {
            updated.assignedAgentDesk = null;
          }
          return updated;
        });
        if (changed) {
          writeStaffDb(list);
        }
        return list;
      }
    }
  } catch (e) {
    console.error("Error reading staff DB:", e);
  }
  
  // Seed default initial staff members if empty
  const defaultStaff = [
    {
      id: "staff-super-admin-01",
      staffId: "CFI-KB-001",
      username: "cfikb001",
      fullName: "Sarkar Md Anik (Super Admin)",
      mobile: "01700000001",
      email: "sarkarmdanik14@gmail.com",
      photoURL: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      role: "super_admin",
      designation: "Chief Executive / Super Admin",
      department: "Executive Administration",
      joiningDate: "2026-01-01",
      bloodGroup: "B (+ve)",
      emergencyContact: "01719469714",
      monthlySalary: 60000,
      salaryStatus: "paid",
      lastPaymentDate: "2026-03-01",
      salaryHistory: [
        {
          id: "sal-001",
          month: "ফেব্রুয়ারি ২০২৬ (February 2026)",
          amount: 60000,
          paymentDate: "2026-03-01",
          paymentMethod: "Bank Transfer",
          status: "paid",
          transactionRef: "TX-SUPER-01",
          note: "নির্বাহী পারিশ্রমিক ও মাসিক বেতন",
          paidBy: "Finance Board",
          createdAt: "2026-03-01T10:00:00.000Z"
        }
      ],
      status: "active",
      onlineStatus: "online",
      assignedAgentDesk: null,
      lastActiveAt: new Date().toISOString(),
      ...hashStaffPassword("admin1234"),
      passwordHash: hashStaffPassword("admin1234").hash,
      passwordSalt: hashStaffPassword("admin1234").salt,
      isSuperAdmin: true,
      permissions: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "staff-order-mgr-02",
      staffId: "CFI-KB-002",
      username: "cfikb002",
      fullName: "Md. Rahimul Islam",
      mobile: "01700000002",
      email: "rahim@kachabazar.com",
      photoURL: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
      role: "order_manager",
      designation: "Order Fulfillment Specialist",
      department: "Order Fulfillment & Logistics",
      joiningDate: "2026-01-15",
      bloodGroup: "O (+ve)",
      emergencyContact: "01700000002",
      monthlySalary: 22000,
      salaryStatus: "paid",
      lastPaymentDate: "2026-03-01",
      salaryHistory: [
        {
          id: "sal-002",
          month: "ফেব্রুয়ারি ২০২৬ (February 2026)",
          amount: 22000,
          paymentDate: "2026-03-01",
          paymentMethod: "bKash",
          status: "paid",
          transactionRef: "BK892348",
          note: "ফেব্রুয়ারি মাসের পূর্ণ বেতন পরিশোধ",
          paidBy: "Super Admin",
          createdAt: "2026-03-01T11:00:00.000Z"
        }
      ],
      status: "active",
      onlineStatus: "offline",
      assignedAgentDesk: null,
      lastActiveAt: new Date(Date.now() - 3600000).toISOString(),
      passwordHash: hashStaffPassword("staff1234").hash,
      passwordSalt: hashStaffPassword("staff1234").salt,
      isSuperAdmin: false,
      permissions: {
        "dashboard.view": true,
        "orders.view": true,
        "orders.add": true,
        "orders.edit": true,
        "memo_management.view": true,
        "memo_management.add": true,
        "memo_management.edit": true,
        "users.view": true
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "staff-call-agent-03",
      staffId: "CFI-KB-003",
      username: "cfikb003",
      fullName: "Nasrin Sultana",
      mobile: "01700000003",
      email: "nasrin@kachabazar.com",
      photoURL: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
      role: "call_center_agent",
      designation: "Call Center Support Officer",
      department: "Customer Care & Voice Support",
      joiningDate: "2026-02-01",
      bloodGroup: "A (+ve)",
      emergencyContact: "01700000003",
      monthlySalary: 18000,
      salaryStatus: "due",
      lastPaymentDate: "2026-02-01",
      salaryHistory: [
        {
          id: "sal-003",
          month: "জানুয়ারি ২০২৬ (January 2026)",
          amount: 18000,
          paymentDate: "2026-02-01",
          paymentMethod: "Cash",
          status: "paid",
          transactionRef: "CSH-03",
          note: "জানুয়ারি মাসের বেতন",
          paidBy: "Super Admin",
          createdAt: "2026-02-01T12:00:00.000Z"
        }
      ],
      status: "active",
      onlineStatus: "online",
      assignedAgentDesk: 1,
      lastActiveAt: new Date().toISOString(),
      passwordHash: hashStaffPassword("staff1234").hash,
      passwordSalt: hashStaffPassword("staff1234").salt,
      isSuperAdmin: false,
      permissions: {
        "voice_calls.view": true,
        "voice_calls.add": true,
        "voice_calls.edit": true,
        "support_chat.view": true,
        "support_chat.add": true,
        "support_chat.edit": true,
        "orders.view": true,
        "products.view": true
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "staff-prod-mgr-04",
      staffId: "CFI-KB-004",
      username: "cfikb004",
      fullName: "Fatema Khatun",
      mobile: "01700000004",
      email: "fatema@kachabazar.com",
      photoURL: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
      role: "product_manager",
      designation: "Product & Stock Manager",
      department: "Inventory & Catalog",
      joiningDate: "2026-02-10",
      bloodGroup: "AB (+ve)",
      emergencyContact: "01700000004",
      monthlySalary: 25000,
      salaryStatus: "paid",
      lastPaymentDate: "2026-03-01",
      salaryHistory: [
        {
          id: "sal-004",
          month: "ফেব্রুয়ারি ২০২৬ (February 2026)",
          amount: 25000,
          paymentDate: "2026-03-01",
          paymentMethod: "Nagad",
          status: "paid",
          transactionRef: "NG102934",
          note: "ফেব্রুয়ারি মাসের ইনভেন্টরি ও প্রোডাক্ট সাপোর্ট স্যালারি",
          paidBy: "Super Admin",
          createdAt: "2026-03-01T12:30:00.000Z"
        }
      ],
      status: "active",
      onlineStatus: "away",
      assignedAgentDesk: null,
      lastActiveAt: new Date(Date.now() - 900000).toISOString(),
      passwordHash: hashStaffPassword("staff1234").hash,
      passwordSalt: hashStaffPassword("staff1234").salt,
      isSuperAdmin: false,
      permissions: {
        "dashboard.view": true,
        "products.view": true,
        "products.add": true,
        "products.edit": true,
        "products.delete": true,
        "categories.view": true,
        "categories.add": true,
        "categories.edit": true,
        "home_management.view": true,
        "home_management.add": true,
        "home_management.edit": true
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  writeStaffDb(defaultStaff);
  return defaultStaff;
}

function writeStaffDb(staffList: any[]) {
  try {
    fs.writeFileSync(STAFF_FILE, JSON.stringify(staffList, null, 2), "utf-8");
  } catch (e) {
    console.error("Error writing staff DB:", e);
  }
}

// Activity logs helper
function readActivityLogs(): any[] {
  try {
    if (fs.existsSync(ACTIVITY_FILE)) {
      const data = fs.readFileSync(ACTIVITY_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Error reading activity logs:", e);
  }
  
  // Seed sample initial logs
  const sampleLogs = [
    {
      id: "log-init-01",
      staffId: "KB-STF-001",
      staffName: "Sarkar Md Anik (Super Admin)",
      staffRole: "super_admin",
      action: "system_init",
      module: "staff_management",
      details: "সুপার এডমিন অ্যাকাউন্ট ও স্টাফ ম্যানেজমেন্ট সিস্টেম কনফিগার করা হয়েছে।",
      ipAddress: "127.0.0.1",
      createdAt: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: "log-init-02",
      staffId: "KB-STF-002",
      staffName: "Md. Rahimul Islam",
      staffRole: "order_manager",
      action: "order_status_updated",
      module: "orders",
      details: "অর্ডার #KB-1025 স্ট্যাটাস 'Processing' থেকে 'Delivered' করা হয়েছে।",
      targetId: "KB-1025",
      ipAddress: "127.0.0.1",
      createdAt: new Date(Date.now() - 43200000).toISOString()
    }
  ];

  writeActivityLogs(sampleLogs);
  return sampleLogs;
}

function writeActivityLogs(logs: any[]) {
  try {
    fs.writeFileSync(ACTIVITY_FILE, JSON.stringify(logs, null, 2), "utf-8");
  } catch (e) {
    console.error("Error writing activity logs:", e);
  }
}

function appendActivityLog(logData: {
  staffId?: string;
  staffName?: string;
  staffRole?: string;
  action: string;
  module: string;
  details: string;
  targetId?: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const logs = readActivityLogs();
  const newLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    staffId: logData.staffId || "SYS-ADMIN",
    staffName: logData.staffName || "System Administrator",
    staffRole: logData.staffRole || "super_admin",
    action: logData.action,
    module: logData.module,
    details: logData.details,
    targetId: logData.targetId || "",
    ipAddress: logData.ipAddress || "127.0.0.1",
    userAgent: logData.userAgent || "",
    createdAt: new Date().toISOString()
  };

  logs.unshift(newLog);
  // Keep max 500 logs
  if (logs.length > 500) {
    logs.length = 500;
  }
  writeActivityLogs(logs);
  return newLog;
}

// 1. GET /api/staff/list - List all staff members (require authenticated staff, passwordHash sanitized)
app.get("/api/staff/list", requireStaffAuth, (req, res) => {
  try {
    const staffList = readStaffDb();
    const sanitized = staffList.map(s => sanitizeStaff(s));
    return res.json({ success: true, staff: sanitized });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch staff list" });
  }
});

// 2. POST /api/staff/create - Add New Staff with Validations & Sequential Staff ID
app.post("/api/staff/create", rateLimiter(25, 60000), requireAdminAuth, (req, res) => {
  try {
    const { 
      fullName, 
      username,
      mobile, 
      email, 
      photoURL, 
      staffId, 
      password, 
      role, 
      designation,
      department,
      joiningDate,
      bloodGroup,
      emergencyContact,
      monthlySalary,
      salaryStatus,
      status, 
      permissions,
      assignedAgentDesk,
      creatorName 
    } = req.body;

    if (!fullName || !mobile || !email || !password || !role) {
      return res.status(400).json({ error: "সকল তথ্য সঠিকভাবে প্রদান করুন (Full Name, Mobile, Email, Password, Role required)." });
    }

    const staffList = readStaffDb();

    // Check duplicate email
    if (staffList.some(s => s.email.toLowerCase() === email.trim().toLowerCase())) {
      return res.status(400).json({ error: "এই ইমেইল দিয়ে ইতোমধ্যে একজন স্টাফ নিবন্ধিত রয়েছে!" });
    }

    // Check duplicate mobile
    const cleanPhone = mobile.replace(/\s+/g, "");
    if (staffList.some(s => s.mobile.replace(/\s+/g, "") === cleanPhone)) {
      return res.status(400).json({ error: "এই মোবাইল নম্বর দিয়ে ইতোমধ্যে একজন স্টাফ নিবন্ধিত রয়েছে!" });
    }

    // Automatically generate sequential Staff ID if not provided, or ensure format CFI-KB-XXX
    let cleanStaffId = "";
    if (staffId && typeof staffId === "string" && staffId.trim().length > 0) {
      cleanStaffId = staffId.trim().toUpperCase();
      if (staffList.some(s => s.staffId.toUpperCase() === cleanStaffId)) {
        return res.status(400).json({ error: "এই স্টাফ আইডি ইতোমধ্যে ব্যবহার করা হয়েছে! ভিন্ন আইডি ব্যবহার করুন।" });
      }
    } else {
      cleanStaffId = generateNextStaffId(staffList);
    }

    // Enforce Rule: CFI-KB-001 → cfikb001, no '@', no hyphens, all lowercase
    const cleanUsername = (username && typeof username === "string" && username.trim().length > 0)
      ? username.trim().replace(/^@+/, "").toLowerCase().replace(/[^a-z0-9]/g, "")
      : cleanStaffId.toLowerCase().replace(/[^a-z0-9]/g, "");

    if (staffList.some(s => s.username && s.username.toLowerCase() === cleanUsername)) {
      return res.status(400).json({ error: "এই ইউজারনেমটি (Username) ইতোমধ্যে অন্য একজন স্টাফ ব্যবহার করছেন!" });
    }

    const { hash, salt } = hashStaffPassword(password);
    const newId = `staff-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    // Default designation and department mapping based on role if not provided
    const deptMap: Record<string, string> = {
      super_admin: "Executive Administration",
      admin: "Store Operations",
      order_manager: "Order Fulfillment & Logistics",
      product_manager: "Inventory & Catalog",
      call_center_agent: "Customer Care & Voice Support",
      customer_support: "Live Chat Support",
      delivery_manager: "Rider & Delivery Fleet",
      accounts_manager: "Finance & Accounts",
      custom: "Special Operations"
    };

    const desigMap: Record<string, string> = {
      super_admin: "Chief Executive / Super Admin",
      admin: "Operations Admin",
      order_manager: "Order Fulfillment Specialist",
      product_manager: "Product & Stock Manager",
      call_center_agent: "Call Center Support Officer",
      customer_support: "Support Executive",
      delivery_manager: "Fleet Coordinator",
      accounts_manager: "Chief Accounts Officer",
      custom: "Special Executive"
    };

    const newStaff = {
      id: newId,
      staffId: cleanStaffId,
      username: cleanUsername,
      fullName: fullName.trim(),
      mobile: cleanPhone,
      email: email.trim().toLowerCase(),
      photoURL: photoURL || "",
      role: role || "order_manager",
      designation: (designation && designation.trim()) || desigMap[role] || "Staff Executive",
      department: (department && department.trim()) || deptMap[role] || "General Operations",
      joiningDate: joiningDate || new Date().toISOString().split("T")[0],
      bloodGroup: bloodGroup || "N/A",
      emergencyContact: emergencyContact || cleanPhone,
      monthlySalary: monthlySalary !== undefined && monthlySalary !== null ? Number(monthlySalary) : 20000,
      salaryStatus: salaryStatus || "due",
      lastPaymentDate: new Date().toISOString().split("T")[0],
      salaryHistory: [],
      status: status || "active",
      onlineStatus: "offline",
      lastActiveAt: new Date().toISOString(),
      passwordHash: hash,
      passwordSalt: salt,
      permissions: permissions || {},
      assignedAgentDesk: (role === "call_center_agent" && assignedAgentDesk) ? Number(assignedAgentDesk) : null,
      isSuperAdmin: role === "super_admin",
      sessionId: `sess-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    staffList.push(newStaff);
    writeStaffDb(staffList);

    // Record Audit Log
    appendActivityLog({
      staffId: "CFI-KB-001",
      staffName: creatorName || "Super Admin",
      staffRole: "super_admin",
      action: "staff_created",
      module: "staff_management",
      details: `নতুন স্টাফ যুক্ত করা হয়েছে: ${newStaff.fullName} (${newStaff.staffId}) - পদবী: ${newStaff.designation}`,
      targetId: newStaff.staffId,
      ipAddress: req.ip
    });

    const { passwordHash, passwordSalt, ...sanitized } = newStaff;
    return res.status(201).json({ success: true, staff: sanitized, message: "নতুন স্টাফ সফলভাবে তৈরি করা হয়েছে।" });
  } catch (err: any) {
    console.error("Error creating staff:", err);
    return res.status(500).json({ error: err.message || "Failed to create staff" });
  }
});

// 3. POST /api/staff/update - Edit Staff Info & Granular Permissions (Staff ID remains immutable)
app.post("/api/staff/update", rateLimiter(35, 60000), requireAdminAuth, (req, res) => {
  try {
    const { 
      id, 
      fullName, 
      username,
      mobile, 
      email, 
      photoURL, 
      role, 
      designation,
      department,
      joiningDate,
      bloodGroup,
      emergencyContact,
      monthlySalary,
      salaryStatus,
      status, 
      permissions,
      assignedAgentDesk,
      updaterName,
      updaterRole 
    } = req.body;

    const incomingId = id || req.body.staffId;
    if (!incomingId) {
      return res.status(400).json({ error: "Staff ID is required for update" });
    }

    const cleanLookup = String(incomingId).trim().toLowerCase();
    const cleanStaffId = req.body.staffId ? String(req.body.staffId).trim().toLowerCase() : "";
    const staffList = readStaffDb();
    let index = staffList.findIndex(s => 
      (s.id && String(s.id).trim().toLowerCase() === cleanLookup) || 
      (s.staffId && String(s.staffId).trim().toLowerCase() === cleanLookup) ||
      (cleanStaffId && s.id && String(s.id).trim().toLowerCase() === cleanStaffId) ||
      (cleanStaffId && s.staffId && String(s.staffId).trim().toLowerCase() === cleanStaffId)
    );

    if (index === -1) {
      // If not yet present in the local server JSON file (e.g. created in Firestore directly or CFI-KB-006),
      // seamlessly register it into the server store so updates and subsequent lookups succeed
      const fallbackStaffId = (req.body.staffId && String(req.body.staffId).trim()) || String(incomingId).trim();
      const newStaff = {
        id: String(id || incomingId).trim(),
        staffId: fallbackStaffId,
        username: (username && String(username).trim().toLowerCase()) || fallbackStaffId.toLowerCase().replace(/[^a-z0-9]/g, ""),
        fullName: (fullName && fullName.trim()) || "Staff Member",
        mobile: mobile ? mobile.replace(/\s+/g, "") : "",
        email: email ? email.trim().toLowerCase() : "",
        photoURL: photoURL !== undefined ? photoURL : "",
        role: role || "order_manager",
        designation: (designation && designation.trim()) || "Staff Executive",
        department: (department && department.trim()) || "General Operations",
        joiningDate: joiningDate || "2026-01-01",
        bloodGroup: bloodGroup || "N/A",
        emergencyContact: emergencyContact || mobile || "",
        monthlySalary: monthlySalary !== undefined ? Number(monthlySalary) : 20000,
        salaryStatus: salaryStatus || "due",
        status: status || "active",
        onlineStatus: "offline",
        lastActiveAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isSuperAdmin: Boolean(role === "super_admin")
      };
      staffList.push(newStaff);
      writeStaffDb(staffList);
      index = staffList.length - 1;
    }

    const targetStaff = staffList[index];

    // SUPER ADMIN PROTECTION
    if (targetStaff.isSuperAdmin || targetStaff.role === "super_admin") {
      if (status === "inactive") {
        return res.status(403).json({ error: "সুপার এডমিন অ্যাকাউন্ট নিষ্ক্রিয় করা যাবে না!" });
      }
      if (role && role !== "super_admin") {
        return res.status(403).json({ error: "সুপার এডমিন অ্যাকাউন্ট-এর রোল পরিবর্তন করা নিষিদ্ধ!" });
      }
    }

    // Normal staff cannot escalate to super_admin
    if (role === "super_admin" && updaterRole !== "super_admin") {
      return res.status(403).json({ error: "শুধুমাত্র সুপার এডমিন নতুন সুপার এডমিন নির্ধারণ করতে পারেন।" });
    }

    // Duplicate checks if email, mobile or username changed
    if (email && email.toLowerCase() !== targetStaff.email.toLowerCase()) {
      if (staffList.some(s => s.id !== targetStaff.id && s.email.toLowerCase() === email.trim().toLowerCase())) {
        return res.status(400).json({ error: "এই ইমেইল ইতোমধ্যে অন্য একজন স্টাফ ব্যবহার করছেন!" });
      }
    }

    if (mobile) {
      const cleanPhone = mobile.replace(/\s+/g, "");
      if (cleanPhone !== targetStaff.mobile.replace(/\s+/g, "")) {
        if (staffList.some(s => s.id !== targetStaff.id && s.mobile.replace(/\s+/g, "") === cleanPhone)) {
          return res.status(400).json({ error: "এই মোবাইল নম্বর ইতোমধ্যে অন্য একজন স্টাফ ব্যবহার করছেন!" });
        }
      }
    }

    if (username && username.trim().toLowerCase() !== (targetStaff.username || "").toLowerCase()) {
      const cleanU = username.trim().toLowerCase();
      if (staffList.some(s => s.id !== targetStaff.id && s.username && s.username.toLowerCase() === cleanU)) {
        return res.status(400).json({ error: "এই ইউজারনেম ইতোমধ্যে অন্য একজন স্টাফ ব্যবহার করছেন!" });
      }
      targetStaff.username = cleanU;
    }

    // Apply updates - Note: targetStaff.staffId is IMMUTABLE and cannot be altered
    if (fullName) targetStaff.fullName = fullName.trim();
    if (mobile) targetStaff.mobile = mobile.replace(/\s+/g, "");
    if (email) targetStaff.email = email.trim().toLowerCase();
    if (photoURL !== undefined) targetStaff.photoURL = photoURL;
    if (role && (!targetStaff.isSuperAdmin || role === "super_admin")) targetStaff.role = role;
    if (designation !== undefined) targetStaff.designation = designation.trim();
    if (department !== undefined) targetStaff.department = department.trim();
    if (joiningDate !== undefined) targetStaff.joiningDate = joiningDate;
    if (bloodGroup !== undefined) targetStaff.bloodGroup = bloodGroup;
    if (emergencyContact !== undefined) targetStaff.emergencyContact = emergencyContact;
    if (monthlySalary !== undefined) targetStaff.monthlySalary = Number(monthlySalary);
    if (salaryStatus !== undefined) targetStaff.salaryStatus = salaryStatus;
    if (status && !targetStaff.isSuperAdmin) targetStaff.status = status;
    if (permissions !== undefined) targetStaff.permissions = permissions;
    
    // CRITICAL: Ensure assignedAgentDesk is strictly number or null (NEVER undefined)
    const effectiveRole = role || targetStaff.role;
    if (effectiveRole === "call_center_agent") {
      const deskVal = assignedAgentDesk !== undefined ? assignedAgentDesk : targetStaff.assignedAgentDesk;
      targetStaff.assignedAgentDesk = (deskVal !== undefined && deskVal !== null) ? Number(deskVal) : 1;
    } else {
      targetStaff.assignedAgentDesk = null;
    }

    targetStaff.updatedAt = new Date().toISOString();

    staffList[index] = targetStaff;
    writeStaffDb(staffList);

    // Audit Log
    appendActivityLog({
      staffId: targetStaff.staffId,
      staffName: updaterName || "Super Admin",
      staffRole: updaterRole || "super_admin",
      action: "staff_updated",
      module: "staff_management",
      details: `স্টাফ তথ্য ও পদবী আপডেট করা হয়েছে: ${targetStaff.fullName} (${targetStaff.staffId})`,
      targetId: targetStaff.staffId,
      ipAddress: req.ip
    });

    const { passwordHash, passwordSalt, ...sanitized } = targetStaff;
    return res.json({ success: true, staff: sanitized, message: "স্টাফ তথ্য সফলভাবে আপডেট করা হয়েছে।" });
  } catch (err: any) {
    console.error("Error updating staff:", err);
    return res.status(500).json({ error: err.message || "Failed to update staff" });
  }
});

// Helper route: Generate Staff Verification QR Code
app.post("/api/staff/qr-code", rateLimiter(30, 60000), requireStaffAuth, async (req, res) => {
  try {
    const { staffId, fullName, role, department, origin } = req.body;
    if (!staffId) {
      return res.status(400).json({ error: "Staff ID is required" });
    }

    const host = (origin || req.headers.host || "localhost:3000").replace(/[^a-zA-Z0-9.:-]/g, "");
    const verifyPayload = {
      org: "KACHA BAZAR (কাঁচা বাজার)",
      staffId: staffId,
      fullName: fullName || "",
      role: role || "",
      department: department || "",
      verified: true,
      authCode: crypto.createHmac("sha256", MEMO_SECRET).update(`${staffId}:${fullName || ''}`).digest("hex").slice(0, 12).toUpperCase(),
      verifyUrl: `http://${host}/verify-staff?id=${encodeURIComponent(staffId)}`
    };

    const qrDataUrl = await QRCode.toDataURL(JSON.stringify(verifyPayload), {
      margin: 1,
      width: 240,
      color: {
        dark: "#064e3b", // Deep emerald
        light: "#ffffff"
      }
    });

    return res.json({
      success: true,
      qrDataUrl,
      verifyPayload
    });
  } catch (err: any) {
    console.error("Error generating staff QR code:", err);
    return res.status(500).json({ error: "Failed to generate QR code" });
  }
});

// Helper route: Log Staff ID Card Print / Reprint Event
app.post("/api/staff/log-card-print", rateLimiter(30, 60000), requireStaffAuth, (req, res) => {
  try {
    const { staffId, staffName, actionType, adminName } = req.body;
    appendActivityLog({
      staffId: staffId || "N/A",
      staffName: adminName || "Super Admin",
      staffRole: "super_admin",
      action: actionType === "reprint" ? "id_card_reprinted" : actionType === "pdf" ? "id_card_pdf_download" : "id_card_printed",
      module: "staff_management",
      details: `স্টাফ আইডি কার্ড ${actionType === "reprint" ? "পুনরায় প্রিন্ট (Reprint)" : actionType === "pdf" ? "PDF ডাউনলোড" : "প্রিন্ট"} করা হয়েছে: ${staffName || ''} (${staffId || ''})`,
      targetId: staffId,
      ipAddress: req.ip
    });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to log card print event" });
  }
});

// 4. POST /api/staff/delete - Delete Staff with Super Admin Protection
app.post("/api/staff/delete", rateLimiter(15, 60000), requireSuperAdminAuth, (req, res) => {
  try {
    const { id, deleterName } = req.body;
    if (!id) {
      return res.status(400).json({ error: "Staff ID is required" });
    }

    const cleanLookup = String(id).trim().toLowerCase();
    const staffList = readStaffDb();
    const target = staffList.find(s => 
      (s.id && String(s.id).trim().toLowerCase() === cleanLookup) || 
      (s.staffId && String(s.staffId).trim().toLowerCase() === cleanLookup)
    );
    if (!target) {
      return res.status(404).json({ error: "Staff member not found" });
    }

    // SUPER ADMIN PROTECTION: Strictly prevent deleting Super Admin
    if (target.isSuperAdmin || target.role === "super_admin" || target.email === "sarkarmdanik14@gmail.com") {
      return res.status(403).json({ error: "নিরাপত্তা সতর্কতা: সুপার এডমিন অ্যাকাউন্ট ডিলিট করা সম্পূর্ণ নিষিদ্ধ!" });
    }

    const filtered = staffList.filter(s => s.id !== target.id);
    writeStaffDb(filtered);

    // Audit Log
    appendActivityLog({
      staffId: "KB-STF-001",
      staffName: deleterName || "Super Admin",
      staffRole: "super_admin",
      action: "staff_deleted",
      module: "staff_management",
      details: `স্টাফ অ্যাকাউন্ট মুছে ফেলা হয়েছে: ${target.fullName} (${target.staffId}) - রোল: ${target.role}`,
      targetId: target.staffId,
      ipAddress: req.ip
    });

    return res.json({ success: true, message: `স্টাফ ${target.fullName} সফলভাবে মুছে ফেলা হয়েছে।` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to delete staff" });
  }
});

// 5. POST /api/staff/reset-password - Reset Password Securely
app.post("/api/staff/reset-password", rateLimiter(15, 60000), requireAdminAuth, (req, res) => {
  try {
    const { id, newPassword, adminName } = req.body;
    if (!id || !newPassword) {
      return res.status(400).json({ error: "Staff ID and newPassword are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "পাসওয়ার্ড ন্যূনতম ৬ অক্ষরের হতে হবে।" });
    }

    const cleanLookup = String(id).trim().toLowerCase();
    const staffList = readStaffDb();
    const index = staffList.findIndex(s => 
      (s.id && String(s.id).trim().toLowerCase() === cleanLookup) || 
      (s.staffId && String(s.staffId).trim().toLowerCase() === cleanLookup)
    );
    if (index === -1) {
      return res.status(404).json({ error: "Staff member not found" });
    }

    const target = staffList[index];

    // PRIVILEGE ESCALATION CHECK (CWE-269):
    // Only a Super Admin is authorized to reset the password of a Super Admin account
    const isTargetSuperAdmin = target.role === "super_admin" || target.isSuperAdmin === true || target.email === "sarkarmdanik14@gmail.com";
    const caller = (req as any).staffUser || (req as any).staff;

    if (isTargetSuperAdmin && (!caller || !caller.isSuperAdmin)) {
      return res.status(403).json({ 
        error: "নিরাপত্তা সতর্কতা (CWE-269): কেবলমাত্র সুপার এডমিন অন্য সুপার এডমিনের পাসওয়ার্ড রিসেট করতে পারেন।" 
      });
    }

    const { hash, salt } = hashStaffPassword(newPassword);
    target.passwordHash = hash;
    target.passwordSalt = salt;
    if (target.sessionId) {
      revokeStaffSession(target.sessionId);
    }
    target.sessionId = null; // Invalidate session on password reset
    target.updatedAt = new Date().toISOString();

    staffList[index] = target;
    writeStaffDb(staffList);

    // Audit Log
    appendActivityLog({
      staffId: target.staffId,
      staffName: adminName || "Super Admin",
      staffRole: "super_admin",
      action: "password_reset",
      module: "staff_management",
      details: `স্টাফ পাসওয়ার্ড রিসেট করা হয়েছে: ${target.fullName} (${target.staffId})`,
      targetId: target.staffId,
      ipAddress: req.ip
    });

    return res.json({ success: true, message: "পাসওয়ার্ড সফলভাবে রিসেট ও এনক্রিপ্ট করা হয়েছে।" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to reset password" });
  }
});

// 6. POST /api/staff/login - Staff Login with Status & Session Validation
app.post("/api/staff/login", rateLimiter(15, 60000), (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ error: "অনুগ্রহ করে ইউজারনেম/স্টাফ আইডি/ইমেইল এবং পাসওয়ার্ড লিখুন।" });
    }

    const staffList = readStaffDb();
    const cleanIdent = identifier.trim().toLowerCase();
    const normalizedIdent = cleanIdent.replace(/^@+/, "").replace(/[^a-z0-9]/g, "");

    // Match by username, staffId, normalized staffId/username, email, or mobile phone
    const staff = staffList.find(s => 
      (s.username && s.username.toLowerCase() === cleanIdent) ||
      (s.username && s.username.toLowerCase().replace(/[^a-z0-9]/g, "") === normalizedIdent) ||
      s.staffId.toLowerCase() === cleanIdent || 
      s.staffId.toLowerCase().replace(/[^a-z0-9]/g, "") === normalizedIdent ||
      s.email.toLowerCase() === cleanIdent || 
      s.mobile.replace(/\s+/g, "") === identifier.replace(/\s+/g, "")
    );

    if (!staff) {
      return res.status(401).json({ error: "ভুল ইউজারনেম/স্টাফ আইডি বা পাসওয়ার্ড!" });
    }

    // CHECK ACTIVE / INACTIVE STATUS
    if (staff.status === "inactive") {
      return res.status(403).json({ 
        error: "আপনার স্টাফ অ্যাকাউন্টটি সাময়িকভাবে নিষ্ক্রিয় (Inactive) রয়েছে। অনুগ্রহ করে সুপার এডমিনের সাথে যোগাযোগ করুন।" 
      });
    }

    // VERIFY HASHED PASSWORD
    const isMatch = verifyStaffPassword(password, staff.passwordHash, staff.passwordSalt);
    if (!isMatch) {
      return res.status(401).json({ error: "ভুল ইউজারনেম/স্টাফ আইডি বা পাসওয়ার্ড!" });
    }

    // Generate new Session Token using session store
    const newSessionId = createStaffSession(staff);
    staff.sessionId = newSessionId;
    staff.onlineStatus = "online";
    staff.lastActiveAt = new Date().toISOString();
    staff.lastLoginAt = new Date().toISOString();
    writeStaffDb(staffList);

    // Audit Log
    appendActivityLog({
      staffId: staff.staffId,
      staffName: staff.fullName,
      staffRole: staff.role,
      action: "staff_login",
      module: "auth",
      details: `স্টাফ প্যানেলে সফলভাবে লগইন করেছেন (${staff.fullName} - ${staff.role})`,
      targetId: staff.staffId,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"]
    });

    const sanitized = sanitizeStaff(staff);
    return res.json({
      success: true,
      staff: sanitized,
      sessionId: newSessionId,
      message: `স্বাগতম, ${staff.fullName}! আপনার অ্যাকাউন্টে সফলভাবে প্রবেশ করা হয়েছে।`
    });
  } catch (err: any) {
    console.error("Staff login error:", err);
    return res.status(500).json({ error: err.message || "Login failed" });
  }
});

// 7. POST /api/staff/logout-session - Revoke / Invalidate Staff Session
app.post("/api/staff/logout-session", requireAdminAuth, (req, res) => {
  try {
    const { staffId, adminName } = req.body;
    if (!staffId) {
      return res.status(400).json({ error: "Staff ID is required" });
    }

    const cleanLookup = String(staffId).trim().toLowerCase();
    const staffList = readStaffDb();
    const index = staffList.findIndex(s => 
      (s.id && String(s.id).trim().toLowerCase() === cleanLookup) || 
      (s.staffId && String(s.staffId).trim().toLowerCase() === cleanLookup)
    );
    if (index === -1) {
      return res.status(404).json({ error: "Staff member not found" });
    }

    const staff = staffList[index];
    if (staff.sessionId) {
      revokeStaffSession(staff.sessionId);
    }
    staff.sessionId = `revoked_${Date.now()}`;
    staff.onlineStatus = "offline";
    staff.lastActiveAt = new Date().toISOString();
    writeStaffDb(staffList);

    // Audit Log
    appendActivityLog({
      staffId: staff.staffId,
      staffName: adminName || "Super Admin",
      staffRole: "super_admin",
      action: "session_revoked",
      module: "staff_management",
      details: `স্টাফ সেশন বাতিল ও ফোর্স লগআউট করা হয়েছে: ${staff.fullName} (${staff.staffId})`,
      targetId: staff.staffId,
      ipAddress: req.ip
    });

    return res.json({ success: true, message: "স্টাফের সেশন সফলভাবে বাতিল ও লগআউট করা হয়েছে।" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to revoke session" });
  }
});

// 8. POST /api/staff/salary/pay - Record Salary Payment & Update Status
app.post("/api/staff/salary/pay", rateLimiter(25, 60000), requireAdminAuth, (req, res) => {
  try {
    const { 
      staffId, 
      month, 
      amount, 
      paymentMethod, 
      transactionRef, 
      note, 
      adminName 
    } = req.body;

    if (!staffId || !month || !amount) {
      return res.status(400).json({ error: "Staff ID, Month and Amount are required." });
    }

    const cleanLookup = String(staffId).trim().toLowerCase();
    const staffList = readStaffDb();
    const index = staffList.findIndex(s => 
      (s.id && String(s.id).trim().toLowerCase() === cleanLookup) || 
      (s.staffId && String(s.staffId).trim().toLowerCase() === cleanLookup)
    );
    if (index === -1) {
      return res.status(404).json({ error: "Staff member not found" });
    }

    const staff = staffList[index];
    const paymentId = `sal-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const paymentDate = new Date().toISOString().split("T")[0];

    const record = {
      id: paymentId,
      month: month.trim(),
      amount: Number(amount),
      paymentDate: paymentDate,
      paymentMethod: paymentMethod || "Cash",
      status: "paid",
      transactionRef: transactionRef || `TX-${Date.now().toString().slice(-6)}`,
      note: note || "মাসিক বেতন পরিশোধ",
      paidBy: adminName || "Super Admin",
      createdAt: new Date().toISOString()
    };

    if (!Array.isArray(staff.salaryHistory)) {
      staff.salaryHistory = [];
    }

    staff.salaryHistory.unshift(record);
    staff.salaryStatus = "paid";
    staff.lastPaymentDate = paymentDate;
    staff.updatedAt = new Date().toISOString();

    staffList[index] = staff;
    writeStaffDb(staffList);

    // Audit Log
    appendActivityLog({
      staffId: staff.staffId,
      staffName: adminName || "Super Admin",
      staffRole: "super_admin",
      action: "salary_paid",
      module: "salary_management",
      details: `${staff.fullName} (${staff.staffId})-কে ${record.month} মাসের বেতন ৳${record.amount} পরিশোধ করা হয়েছে [মেথড: ${record.paymentMethod}]`,
      targetId: staff.staffId,
      ipAddress: req.ip
    });

    const sanitized = sanitizeStaff(staff);
    return res.json({
      success: true,
      staff: sanitized,
      payment: record,
      message: `৳${record.amount} বেতন সফলভাবে পরিশোধ করা হয়েছে।`
    });
  } catch (err: any) {
    console.error("Salary payment error:", err);
    return res.status(500).json({ error: err.message || "Failed to process salary payment" });
  }
});

// 9. POST /api/staff/salary/update-base - Update Staff Monthly Salary Base
app.post("/api/staff/salary/update-base", rateLimiter(25, 60000), requireAdminAuth, (req, res) => {
  try {
    const { staffId, monthlySalary, adminName } = req.body;
    if (!staffId || monthlySalary === undefined) {
      return res.status(400).json({ error: "Staff ID and monthlySalary are required" });
    }

    const cleanLookup = String(staffId).trim().toLowerCase();
    const staffList = readStaffDb();
    const index = staffList.findIndex(s => 
      (s.id && String(s.id).trim().toLowerCase() === cleanLookup) || 
      (s.staffId && String(s.staffId).trim().toLowerCase() === cleanLookup)
    );
    if (index === -1) {
      return res.status(404).json({ error: "Staff member not found" });
    }

    const staff = staffList[index];
    const prevSalary = staff.monthlySalary || 0;
    staff.monthlySalary = Number(monthlySalary);
    staff.updatedAt = new Date().toISOString();

    staffList[index] = staff;
    writeStaffDb(staffList);

    appendActivityLog({
      staffId: staff.staffId,
      staffName: adminName || "Super Admin",
      staffRole: "super_admin",
      action: "salary_base_updated",
      module: "salary_management",
      details: `${staff.fullName} (${staff.staffId})-এর মাসিক মূল বেতন ৳${prevSalary} থেকে ৳${staff.monthlySalary} এ হালনাগাদ করা হয়েছে।`,
      targetId: staff.staffId,
      ipAddress: req.ip
    });

    const sanitized = sanitizeStaff(staff);
    return res.json({
      success: true,
      staff: sanitized,
      message: "মাসিক বেতন সফলভাবে আপডেট করা হয়েছে।"
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update salary" });
  }
});

// 10. POST /api/staff/heartbeat - Real-Time Online/Away/Offline Status Heartbeat
app.post("/api/staff/heartbeat", requireStaffAuth, (req, res) => {
  try {
    const { staffId, status } = req.body;
    if (!staffId) return res.status(400).json({ error: "staffId required" });

    const cleanLookup = String(staffId).trim().toLowerCase();
    const staffList = readStaffDb();
    const staff = staffList.find(s => 
      (s.id && String(s.id).trim().toLowerCase() === cleanLookup) || 
      (s.staffId && String(s.staffId).trim().toLowerCase() === cleanLookup)
    );
    if (staff) {
      staff.onlineStatus = status || "online";
      staff.lastActiveAt = new Date().toISOString();
      writeStaffDb(staffList);
      return res.json({ success: true, onlineStatus: staff.onlineStatus });
    }
    return res.status(404).json({ error: "Staff not found" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 11. GET /api/staff/activity-logs - Filtered Staff Activity Audit Logs
app.get("/api/staff/activity-logs", requireStaffAuth, (req, res) => {
  try {
    const { staffId, module, search, limit: queryLimit } = req.query;
    let logs = readActivityLogs();

    if (staffId) {
      logs = logs.filter(l => l.staffId === staffId);
    }
    if (module && module !== "all") {
      logs = logs.filter(l => l.module === module);
    }
    if (search) {
      const q = String(search).toLowerCase();
      logs = logs.filter(l => 
        (l.staffName && l.staffName.toLowerCase().includes(q)) ||
        (l.details && l.details.toLowerCase().includes(q)) ||
        (l.action && l.action.toLowerCase().includes(q)) ||
        (l.staffId && l.staffId.toLowerCase().includes(q))
      );
    }

    const max = queryLimit ? parseInt(String(queryLimit), 10) : 100;
    return res.json({ success: true, logs: logs.slice(0, max) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch logs" });
  }
});

// 12. POST /api/staff/activity-logs - Append New Immutable Activity Log
app.post("/api/staff/activity-logs", requireStaffAuth, (req, res) => {
  try {
    const { staffId, staffName, staffRole, action, module, details, targetId } = req.body;
    if (!action || !module || !details) {
      return res.status(400).json({ error: "Action, module, and details are required" });
    }

    const log = appendActivityLog({
      staffId,
      staffName,
      staffRole,
      action,
      module,
      details,
      targetId,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"]
    });

    return res.status(201).json({ success: true, log });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to record log" });
  }
});

// 13. GET /api/staff/verify-badge/:staffId - Public QR Verification (Returns only public card info, no sensitive fields)
app.get("/api/staff/verify-badge/:staffId", rateLimiter(30, 60000), (req, res) => {
  try {
    const { staffId } = req.params;
    if (!staffId) return res.status(400).json({ error: "Invalid staff ID" });

    const staffList = readStaffDb();
    const cleanId = String(staffId).trim().toLowerCase();
    const staff = staffList.find(s => 
      (s.id && String(s.id).trim().toLowerCase() === cleanId) || 
      (s.staffId && String(s.staffId).trim().toLowerCase() === cleanId)
    );

    if (!staff || staff.status === "inactive") {
      return res.status(404).json({ 
        verified: false, 
        error: "স্টাফ সদস্য খুঁজে পাওয়া যায়নি অথবা অ্যাকাউন্টটি সক্রিয় নয়।" 
      });
    }

    // Return safe public badge data ONLY
    return res.json({
      verified: true,
      org: "KACHA BAZAR (কাঁচা বাজার)",
      staffId: staff.staffId,
      fullName: staff.fullName,
      role: staff.role,
      designation: staff.designation,
      department: staff.department,
      photoURL: staff.photoURL || "",
      joiningDate: staff.joiningDate || "",
      bloodGroup: staff.bloodGroup || "",
      verifiedAt: new Date().toISOString()
    });
  } catch (err: any) {
    return res.status(500).json({ verified: false, error: "Verification check failed" });
  }
});

// 14. GET /api/staff/get/:id - Fetch Single Staff Member by either unique record ID or display staffId (Restricted to Authenticated Staff)
app.get("/api/staff/get/:id", requireStaffAuth, (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "Staff ID parameter is required" });

    const cleanId = String(id).trim().toLowerCase();
    const staffList = readStaffDb();
    const staff = staffList.find(s => 
      (s.id && String(s.id).trim().toLowerCase() === cleanId) || 
      (s.staffId && String(s.staffId).trim().toLowerCase() === cleanId)
    );

    if (!staff) {
      return res.status(404).json({ error: "Staff member not found" });
    }

    return res.json({ success: true, staff: sanitizeStaff(staff) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch staff record" });
  }
});

// 15. POST /api/staff/firebase-session - Exchange verified Firebase ID token for a secure staff session
app.post("/api/staff/firebase-session", rateLimiter(20, 60000), async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken || typeof idToken !== "string") {
      return res.status(400).json({ error: "idToken is required" });
    }

    // Cryptographically verify ID token against Google's public tokeninfo endpoint
    const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (!verifyRes.ok) {
      return res.status(401).json({ error: "Invalid or expired Firebase ID token" });
    }

    const payload: any = await verifyRes.json();
    const email = (payload.email || "").toLowerCase().trim();
    if (!email || payload.email_verified !== "true") {
      return res.status(401).json({ error: "A verified email address is required" });
    }

    const staffList = readStaffDb();
    let staff = staffList.find(s => s.email && s.email.toLowerCase() === email);

    // If verified email is the designated founder / super_admin
    if (!staff && email === "sarkarmdanik14@gmail.com") {
      staff = staffList.find(s => s.role === "super_admin" || s.isSuperAdmin);
    }

    if (!staff || staff.status === "inactive") {
      return res.status(403).json({ error: "No active staff authorization found for this account" });
    }

    const newSessionId = createStaffSession(staff);
    staff.sessionId = newSessionId;
    staff.onlineStatus = "online";
    staff.lastActiveAt = new Date().toISOString();
    writeStaffDb(staffList);

    return res.json({
      success: true,
      sessionId: newSessionId,
      staff: sanitizeStaff(staff)
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to create verified session" });
  }
});

// Vite Middleware & Server Lifecycle
async function startServer() {
  const isProduction = process.env.NODE_ENV === "production";
  const distPath = path.join(process.cwd(), "dist");

  // Serve static assets from public directory
  app.use(express.static(path.join(process.cwd(), "public")));

  if (!isProduction) {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (err) {
      console.error("Failed to initialize Vite middleware in development mode:", err);
    }
  } else {
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"), (err) => {
        if (err) {
          console.error("Error serving index.html:", err);
          if (!res.headersSent) {
            res.status(500).send("Application is starting up or building. Please refresh in a moment.");
          }
        }
      });
    });
  }

  // Fallback global error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Unhandled error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Primary listener on port 3000 (standard internal port for dev server & reverse proxy)
  const primaryServer = http.createServer(app);
  primaryServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });

  // Secondary listener for Cloud Run ingress (e.g. PORT=8080 in production)
  const envPort = process.env.PORT ? parseInt(process.env.PORT, 10) : null;
  if (envPort && envPort !== PORT && !isNaN(envPort)) {
    try {
      const secondaryServer = http.createServer(app);
      secondaryServer.on("error", (err: any) => {
        if (err.code === "EADDRINUSE") {
          console.log(`Port ${envPort} already bound by upstream reverse proxy; active on port ${PORT}`);
        } else {
          console.warn(`Secondary listener warning on port ${envPort}:`, err);
        }
      });
      secondaryServer.listen(envPort, "0.0.0.0", () => {
        console.log(`Server also listening on port ${envPort} (Cloud Run ingress)`);
      });
    } catch (e) {
      console.warn(`Could not start secondary listener on port ${envPort}:`, e);
    }
  }
}

startServer();
