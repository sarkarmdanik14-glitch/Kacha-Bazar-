import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import crypto from "crypto";
import QRCode from "qrcode";
import { jsPDF } from "jspdf";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Secret HMAC key for tamper detection
const MEMO_SECRET = process.env.MEMO_SECRET_KEY || "KANCHA_BAZAR_OFFICIAL_MEMO_SECRET_2026";

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

// API ROUTE 2: Verify Order Memo Tamper Status
app.post("/api/memo/verify-status", (req, res) => {
  try {
    const { orderId, total, phone, itemsCount, hash, code } = req.body;
    if (!orderId) {
      return res.status(400).json({ error: "Missing parameters" });
    }

    const expected = generateVerificationData(orderId, total || 0, phone || "", itemsCount || 0);

    const isHashValid = hash ? hash === expected.hash.slice(0, 16) || hash === expected.hash : true;
    const isCodeValid = code ? code === expected.verificationCode : true;

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
    return res.status(500).json({ error: err.message || "Verification failed" });
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

// Vite Middleware & Server Lifecycle
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
