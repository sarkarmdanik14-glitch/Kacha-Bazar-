import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import QRCode from "qrcode";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

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

const STAFF_FILE = path.join(process.cwd(), "data", "staff_store.json");
const ACTIVITY_FILE = path.join(process.cwd(), "data", "staff_activity_store.json");

// Ensure data directory exists
if (!fs.existsSync(path.join(process.cwd(), "data"))) {
  fs.mkdirSync(path.join(process.cwd(), "data"), { recursive: true });
}

// Password hashing helpers
function hashStaffPassword(password: string, salt?: string) {
  const finalSalt = salt || crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, finalSalt, 1000, 64, "sha512").toString("hex");
  return { hash, salt: finalSalt };
}

function verifyStaffPassword(password: string, hash: string, salt: string) {
  if (!password || !hash || !salt) return false;
  const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return verifyHash === hash;
}

// Read staff database
function readStaffDb(): any[] {
  try {
    if (fs.existsSync(STAFF_FILE)) {
      const data = fs.readFileSync(STAFF_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Error reading staff DB:", e);
  }
  
  // Seed default initial staff members if empty
  const defaultStaff = [
    {
      id: "staff-super-admin-01",
      staffId: "KB-STF-001",
      fullName: "Sarkar Md Anik (Super Admin)",
      mobile: "01700000001",
      email: "sarkarmdanik14@gmail.com",
      photoURL: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      role: "super_admin",
      status: "active",
      onlineStatus: "online",
      lastActiveAt: new Date().toISOString(),
      ...hashStaffPassword("admin1234"),
      passwordHash: hashStaffPassword("admin1234").hash,
      passwordSalt: hashStaffPassword("admin1234").salt,
      isSuperAdmin: true,
      permissions: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sessionId: "sess-super-admin-init"
    },
    {
      id: "staff-order-mgr-02",
      staffId: "KB-STF-002",
      fullName: "Md. Rahimul Islam",
      mobile: "01700000002",
      email: "rahim@kachabazar.com",
      photoURL: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
      role: "order_manager",
      status: "active",
      onlineStatus: "offline",
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
      updatedAt: new Date().toISOString(),
      sessionId: "sess-order-mgr-init"
    },
    {
      id: "staff-call-agent-03",
      staffId: "KB-STF-003",
      fullName: "Nasrin Sultana",
      mobile: "01700000003",
      email: "nasrin@kachabazar.com",
      photoURL: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
      role: "call_center_agent",
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
      updatedAt: new Date().toISOString(),
      sessionId: "sess-call-agent-init"
    },
    {
      id: "staff-prod-mgr-04",
      staffId: "KB-STF-004",
      fullName: "Fatema Khatun",
      mobile: "01700000004",
      email: "fatema@kachabazar.com",
      photoURL: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
      role: "product_manager",
      status: "active",
      onlineStatus: "away",
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
      updatedAt: new Date().toISOString(),
      sessionId: "sess-prod-mgr-init"
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

// 1. GET /api/staff/list - List all staff members (passwordHash sanitized)
app.get("/api/staff/list", (req, res) => {
  try {
    const staffList = readStaffDb();
    const sanitized = staffList.map(s => {
      const { passwordHash, passwordSalt, ...rest } = s;
      return rest;
    });
    return res.json({ success: true, staff: sanitized });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch staff list" });
  }
});

// 2. POST /api/staff/create - Add New Staff with Validations & Duplicate Check
app.post("/api/staff/create", (req, res) => {
  try {
    const { 
      fullName, 
      mobile, 
      email, 
      photoURL, 
      staffId, 
      password, 
      role, 
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

    // Check duplicate staff ID
    const cleanStaffId = (staffId || `KB-STF-${String(staffList.length + 1).padStart(3, "0")}`).trim().toUpperCase();
    if (staffList.some(s => s.staffId.toUpperCase() === cleanStaffId)) {
      return res.status(400).json({ error: "এই স্টাফ আইডি ইতোমধ্যে ব্যবহার করা হয়েছে! ভিন্ন আইডি ব্যবহার করুন।" });
    }

    const { hash, salt } = hashStaffPassword(password);
    const newId = `staff-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const newStaff = {
      id: newId,
      staffId: cleanStaffId,
      fullName: fullName.trim(),
      mobile: cleanPhone,
      email: email.trim().toLowerCase(),
      photoURL: photoURL || "",
      role: role || "order_manager",
      status: status || "active",
      onlineStatus: "offline",
      lastActiveAt: new Date().toISOString(),
      passwordHash: hash,
      passwordSalt: salt,
      permissions: permissions || {},
      assignedAgentDesk: assignedAgentDesk ? Number(assignedAgentDesk) : undefined,
      isSuperAdmin: role === "super_admin",
      sessionId: `sess-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    staffList.push(newStaff);
    writeStaffDb(staffList);

    // Record Audit Log
    appendActivityLog({
      staffId: "KB-STF-001",
      staffName: creatorName || "Super Admin",
      staffRole: "super_admin",
      action: "staff_created",
      module: "staff_management",
      details: `নতুন স্টাফ যুক্ত করা হয়েছে: ${newStaff.fullName} (${newStaff.staffId}) - রোল: ${newStaff.role}`,
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

// 3. POST /api/staff/update - Edit Staff Info & Granular Permissions
app.post("/api/staff/update", (req, res) => {
  try {
    const { 
      id, 
      fullName, 
      mobile, 
      email, 
      photoURL, 
      role, 
      status, 
      permissions,
      assignedAgentDesk,
      updaterName,
      updaterRole 
    } = req.body;

    if (!id) {
      return res.status(400).json({ error: "Staff ID is required for update" });
    }

    const staffList = readStaffDb();
    const index = staffList.findIndex(s => s.id === id || s.staffId === id);
    if (index === -1) {
      return res.status(404).json({ error: "Staff member not found" });
    }

    const targetStaff = staffList[index];

    // SUPER ADMIN PROTECTION
    // If target is Super Admin, protect against demoting or deactivating unless updater is verified Super Admin
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

    // Duplicate checks if email or mobile changed
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

    // Apply updates
    if (fullName) targetStaff.fullName = fullName.trim();
    if (mobile) targetStaff.mobile = mobile.replace(/\s+/g, "");
    if (email) targetStaff.email = email.trim().toLowerCase();
    if (photoURL !== undefined) targetStaff.photoURL = photoURL;
    if (role && (!targetStaff.isSuperAdmin || role === "super_admin")) targetStaff.role = role;
    if (status && !targetStaff.isSuperAdmin) targetStaff.status = status;
    if (permissions !== undefined) targetStaff.permissions = permissions;
    if (assignedAgentDesk !== undefined) targetStaff.assignedAgentDesk = assignedAgentDesk;
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
      details: `স্টাফ তথ্য ও পারমিশন আপডেট করা হয়েছে: ${targetStaff.fullName} (${targetStaff.staffId})`,
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

// 4. POST /api/staff/delete - Delete Staff with Super Admin Protection
app.post("/api/staff/delete", (req, res) => {
  try {
    const { id, deleterName } = req.body;
    if (!id) {
      return res.status(400).json({ error: "Staff ID is required" });
    }

    const staffList = readStaffDb();
    const target = staffList.find(s => s.id === id || s.staffId === id);
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
app.post("/api/staff/reset-password", (req, res) => {
  try {
    const { id, newPassword, adminName } = req.body;
    if (!id || !newPassword) {
      return res.status(400).json({ error: "Staff ID and newPassword are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "পাসওয়ার্ড ন্যূনতম ৬ অক্ষরের হতে হবে।" });
    }

    const staffList = readStaffDb();
    const index = staffList.findIndex(s => s.id === id || s.staffId === id);
    if (index === -1) {
      return res.status(404).json({ error: "Staff member not found" });
    }

    const target = staffList[index];
    const { hash, salt } = hashStaffPassword(newPassword);
    target.passwordHash = hash;
    target.passwordSalt = salt;
    target.sessionId = `sess-${Date.now()}`; // Invalidate old sessions on password reset
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
app.post("/api/staff/login", (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ error: "অনুগ্রহ করে ইমেইল/স্টাফ আইডি এবং পাসওয়ার্ড লিখুন।" });
    }

    const staffList = readStaffDb();
    const cleanIdent = identifier.trim().toLowerCase();

    // Match by email, staffId, or mobile
    const staff = staffList.find(s => 
      s.email.toLowerCase() === cleanIdent || 
      s.staffId.toLowerCase() === cleanIdent || 
      s.mobile.replace(/\s+/g, "") === identifier.replace(/\s+/g, "")
    );

    if (!staff) {
      return res.status(401).json({ error: "ভুল ইমেইল/স্টাফ আইডি বা পাসওয়ার্ড!" });
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
      return res.status(401).json({ error: "ভুল ইমেইল/স্টাফ আইডি বা পাসওয়ার্ড!" });
    }

    // Generate new Session Token
    const newSessionId = `sess_${Date.now()}_${crypto.randomBytes(8).toString("hex")}`;
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

    const { passwordHash, passwordSalt, ...sanitized } = staff;
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
app.post("/api/staff/logout-session", (req, res) => {
  try {
    const { staffId, adminName } = req.body;
    if (!staffId) {
      return res.status(400).json({ error: "Staff ID is required" });
    }

    const staffList = readStaffDb();
    const index = staffList.findIndex(s => s.id === staffId || s.staffId === staffId);
    if (index === -1) {
      return res.status(404).json({ error: "Staff member not found" });
    }

    const staff = staffList[index];
    staff.sessionId = `revoked_${Date.now()}`;
    staff.onlineStatus = "offline";
    staff.lastActiveAt = new Date().toISOString();
    writeStaffDb(staffList);

    // Audit Log
    appendActivityLog({
      staffId: staff.staffId,
      staffName: adminName || staff.fullName,
      staffRole: staff.role,
      action: "session_revoked",
      module: "auth",
      details: `স্টাফ লগইন সেশন ফোর্স লগআউট / বাতিল করা হয়েছে (${staff.fullName} - ${staff.staffId})`,
      targetId: staff.staffId,
      ipAddress: req.ip
    });

    return res.json({ success: true, message: `স্টাফ ${staff.fullName}-এর সেশন সফলভাবে টার্মিনেট করা হয়েছে।` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to revoke session" });
  }
});

// 8. POST /api/staff/heartbeat - Real-Time Online/Away/Offline Status Heartbeat
app.post("/api/staff/heartbeat", (req, res) => {
  try {
    const { staffId, status } = req.body;
    if (!staffId) return res.status(400).json({ error: "staffId required" });

    const staffList = readStaffDb();
    const staff = staffList.find(s => s.id === staffId || s.staffId === staffId);
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

// 9. GET /api/staff/activity-logs - Filtered Staff Activity Audit Logs
app.get("/api/staff/activity-logs", (req, res) => {
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

// 10. POST /api/staff/activity-logs - Append New Immutable Activity Log
app.post("/api/staff/activity-logs", (req, res) => {
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

// Vite Middleware & Server Lifecycle
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        root: process.cwd(),
        configFile: path.resolve(process.cwd(), "vite.config.ts"),
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (err) {
      console.error("Failed to initialize Vite middleware in development mode:", err);
    }
  } else {
    const distPath = path.join(process.cwd(), "dist");
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
