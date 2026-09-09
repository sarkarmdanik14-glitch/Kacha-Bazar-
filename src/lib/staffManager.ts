import { 
  StaffRole, 
  StaffStatus, 
  StaffOnlineStatus, 
  StaffMember, 
  StaffActivityLog, 
  RoleDefinition, 
  PermissionModule, 
  PermissionAction,
  PermissionsMap 
} from "../types";
import { 
  db, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  serverTimestamp, 
  addDoc,
  onSnapshot 
} from "./firebase";

// Module registry with descriptions
export interface ModuleInfo {
  id: PermissionModule;
  nameBn: string;
  nameEn: string;
  descriptionBn: string;
  descriptionEn: string;
  supportedActions: PermissionAction[];
}

/**
 * Safely sanitizes an object before writing to Firestore:
 * - Omits any keys whose value is undefined
 * - Recursively processes nested plain objects and arrays
 * - Guarantees Firestore setDoc/updateDoc never encounters 'Unsupported field value: undefined'
 */
export function sanitizeForFirestore<T extends Record<string, any>>(obj: T): Record<string, any> {
  if (!obj || typeof obj !== "object") return obj;
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      continue;
    }
    if (Array.isArray(value)) {
      clean[key] = value
        .filter(item => item !== undefined)
        .map(item => (item !== null && typeof item === "object" && !(item instanceof Date)) ? sanitizeForFirestore(item) : item);
    } else if (value !== null && typeof value === "object" && !(value instanceof Date)) {
      clean[key] = sanitizeForFirestore(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

export const PERMISSION_MODULES: ModuleInfo[] = [
  {
    id: "dashboard",
    nameBn: "সিস্টেম ড্যাশবোর্ড ও রিপোর্ট",
    nameEn: "System Analytics & Dashboard",
    descriptionBn: "স্টোর এনালিটিক্স, সেলস চার্ট ও গ্রাফ দেখার অনুমতি",
    descriptionEn: "Access to store metrics, charts, and live operational stats",
    supportedActions: ["view"]
  },
  {
    id: "daily_sales",
    nameBn: "দৈনিক সেলস ওভারভিউ",
    nameEn: "Daily Sales Overview",
    descriptionBn: "প্রতিদিনের বিক্রয় হিসাব, মোট কেজি/গ্রাম, পণ্যভিত্তিক বিক্রয় ও সময়ভিত্তিক চার্ট",
    descriptionEn: "Daily sales analytics, kg/gram sold metrics, hourly sales charts and product breakdowns",
    supportedActions: ["view"]
  },
  {
    id: "orders",
    nameBn: "অর্ডার ট্র্যাকিং ও ডেলিভারি",
    nameEn: "Order Management",
    descriptionBn: "অর্ডার দেখা, স্ট্যাটাস পরিবর্তন, রাইডার অ্যাসাইন এবং বাতিল",
    descriptionEn: "View orders, update status, assign riders, and process orders",
    supportedActions: ["view", "add", "edit", "delete"]
  },
  {
    id: "products",
    nameBn: "পণ্য সম্ভার ও ইনভেন্টরি",
    nameEn: "Product Catalog & Inventory",
    descriptionBn: "পণ্য তালিকা দেখা, নতুন পণ্য যোগ, স্টক ও মূল্য এডিট এবং ডিলিট",
    descriptionEn: "View, add, edit pricing/stock, and delete grocery items",
    supportedActions: ["view", "add", "edit", "delete"]
  },
  {
    id: "categories",
    nameBn: "ক্যাটাগরি ম্যানেজমেন্ট",
    nameEn: "Categories Management",
    descriptionBn: "ক্যাটাগরি তৈরি, এডিট এবং সাজানো",
    descriptionEn: "Create, edit, and organize product categories",
    supportedActions: ["view", "add", "edit", "delete"]
  },
  {
    id: "memo_management",
    nameBn: "মেমো ম্যানেজমেন্ট ও ডিজিটাল সিল",
    nameEn: "Memo & Digital Seal",
    descriptionBn: "অফিসিয়াল ক্যাশ মেমো জেনারেট, প্রিন্ট, ভেরিফিকেশন ও অডিট",
    descriptionEn: "Generate, verify, print and download tamper-proof order memos",
    supportedActions: ["view", "add", "edit", "delete"]
  },
  {
    id: "home_management",
    nameBn: "হোম পেজ ও ব্যানার",
    nameEn: "Home Page & Promo Banners",
    descriptionBn: "হোম পেজের অফার ব্যানার ও ফ্লাশ সেল পরিচালনা",
    descriptionEn: "Configure promotional banners and seasonal campaign layouts",
    supportedActions: ["view", "add", "edit", "delete"]
  },
  {
    id: "users",
    nameBn: "গ্রাহক, বিক্রেতা ও রাইডার ডাটাবেজ",
    nameEn: "User Accounts (Customer/Seller/Rider)",
    descriptionBn: "ইউজারদের প্রোফাইল দেখা, অ্যাপ্রুভ/রিজেক্ট ও ব্যালেন্স মনিটরিং",
    descriptionEn: "View, approve, modify and manage customers, sellers, and riders",
    supportedActions: ["view", "add", "edit", "delete"]
  },
  {
    id: "staff_management",
    nameBn: "স্টাফ ম্যানেজমেন্ট ও রোল এক্সেস",
    nameEn: "Staff Management & RBAC",
    descriptionBn: "নতুন স্টাফ তৈরি, রোল ও পারমিশন নির্ধারণ, পাসওয়ার্ড রিসেট ও লগ",
    descriptionEn: "Manage team members, roles, granular permissions, and audit logs",
    supportedActions: ["view", "add", "edit", "delete"]
  },
  {
    id: "partner_shops",
    nameBn: "পার্টনার শপস ও কমিশন কন্ট্রোল",
    nameEn: "Partner Shops & Commission Control",
    descriptionBn: "পার্টনার শপ অনুমোদন, কমিশন রেট ও সেলস রিপোর্ট ব্যবস্থাপনা",
    descriptionEn: "Manage verified merchant partner shops, commission rates and financial payouts",
    supportedActions: ["view", "add", "edit", "delete"]
  },
  {
    id: "leadership",
    nameBn: "নেতৃত্ব ও টিম ম্যানেজমেন্ট",
    nameEn: "Leadership & Organization",
    descriptionBn: "কোম্পানি লিডারশিপ টিম ও অর্গানাইজেশন চার্ট পরিচালনা",
    descriptionEn: "Manage company executives, team members, and departments",
    supportedActions: ["view", "add", "edit", "delete"]
  },
  {
    id: "support_chat",
    nameBn: "লাইভ কাস্টমার সাপোর্ট চ্যাট",
    nameEn: "Live Customer Support Chat",
    descriptionBn: "গ্রাহকদের সাথে রিয়েল-টাইম চ্যাট ও অভিযোগ সমাধান",
    descriptionEn: "Real-time messaging, customer ticket handling, and assistance",
    supportedActions: ["view", "add", "edit", "delete"]
  },
  {
    id: "voice_calls",
    nameBn: "কল সেন্টার (২০ এজেন্ট ডেস্ক)",
    nameEn: "Call Center (20 Agent Desks)",
    descriptionBn: "গ্রাহকদের ফোন কল রিসিভ, ভয়েস সাপোর্ট ও কল লগ",
    descriptionEn: "WebRTC live voice calls, agent desk allocation, and call records",
    supportedActions: ["view", "add", "edit", "delete"]
  },
  {
    id: "coupons",
    nameBn: "ডিসকাউন্ট কুপনস ও অফার",
    nameEn: "Coupons & Discounts",
    descriptionBn: "কুপন তৈরি, ডিসকাউন্ট নির্ধারণ ও কুপন ডিলিট",
    descriptionEn: "Create and manage promotional discount voucher codes",
    supportedActions: ["view", "add", "edit", "delete"]
  },
  {
    id: "notifications",
    nameBn: "বিজ্ঞপ্তি ব্রডকাস্ট",
    nameEn: "Broadcast Notifications",
    descriptionBn: "সকল ব্যবহারকারীকে পুশ ও ইন-অ্যাপ নোটিফিকেশন পাঠানো",
    descriptionEn: "Broadcast system alerts and promotional notifications",
    supportedActions: ["view", "add", "edit", "delete"]
  },
  {
    id: "settings",
    nameBn: "গ্লোবাল সিস্টেম সেটিংস",
    nameEn: "Global Store Settings",
    descriptionBn: "ডেলিভারি চার্জ, পেমেন্ট নাম্বার (বিকাশ/নগদ) ও ফ্রি ডেলিভারি লিমিট",
    descriptionEn: "Configure delivery fees, payment gateway accounts, and rules",
    supportedActions: ["view", "edit"]
  },
  {
    id: "accounts",
    nameBn: "হিসাবরক্ষণ ও আর্থিক লেনদেন",
    nameEn: "Accounts & Financial Ledger",
    descriptionBn: "লেনদেন হিসাব, রিফান্ড প্রসেসিং ও মোট আয় নিরীক্ষা",
    descriptionEn: "Financial transactions, refund credits, and ledger audits",
    supportedActions: ["view", "add", "edit"]
  }
];

// Helper to build full permissions
const allPermissionsTrue = (): PermissionsMap => {
  const map: PermissionsMap = {};
  PERMISSION_MODULES.forEach(m => {
    m.supportedActions.forEach(a => {
      map[`${m.id}.${a}`] = true;
    });
  });
  return map;
};

// Default Roles & Predefined Permission Matrices
export const DEFAULT_ROLES: RoleDefinition[] = [
  {
    id: "super_admin",
    nameBn: "সুপার এডমিন",
    nameEn: "Super Admin",
    icon: "👑",
    badgeColor: "bg-purple-600 text-white",
    descriptionBn: "সম্পূর্ণ সিস্টেম ও স্টাফ নিয়ন্ত্রণের সর্বোচ্চ ক্ষমতা",
    descriptionEn: "Full unconstrained system authority, staff control, and master config",
    defaultPermissions: allPermissionsTrue()
  },
  {
    id: "admin",
    nameBn: "এডমিন",
    nameEn: "Admin",
    icon: "🛠️",
    badgeColor: "bg-emerald-600 text-white",
    descriptionBn: "স্টাফ ম্যানেজমেন্ট ব্যতিরেকে প্রায় সকল ব্যবসায়িক ফিচার পরিচালনা",
    descriptionEn: "Full operational access to store inventory, orders, customers, and configs",
    defaultPermissions: {
      "dashboard.view": true,
      "daily_sales.view": true,
      "orders.view": true,
      "orders.add": true,
      "orders.edit": true,
      "orders.delete": true,
      "products.view": true,
      "products.add": true,
      "products.edit": true,
      "products.delete": true,
      "categories.view": true,
      "categories.add": true,
      "categories.edit": true,
      "categories.delete": true,
      "memo_management.view": true,
      "memo_management.add": true,
      "memo_management.edit": true,
      "memo_management.delete": true,
      "home_management.view": true,
      "home_management.add": true,
      "home_management.edit": true,
      "home_management.delete": true,
      "users.view": true,
      "users.add": true,
      "users.edit": true,
      "users.delete": true,
      "staff_management.view": true,
      "partner_shops.view": true,
      "partner_shops.add": true,
      "partner_shops.edit": true,
      "partner_shops.delete": true,
      "leadership.view": true,
      "leadership.add": true,
      "leadership.edit": true,
      "support_chat.view": true,
      "support_chat.add": true,
      "support_chat.edit": true,
      "voice_calls.view": true,
      "voice_calls.add": true,
      "voice_calls.edit": true,
      "coupons.view": true,
      "coupons.add": true,
      "coupons.edit": true,
      "coupons.delete": true,
      "notifications.view": true,
      "notifications.add": true,
      "notifications.edit": true,
      "settings.view": true,
      "settings.edit": true,
      "accounts.view": true,
      "accounts.add": true,
      "accounts.edit": true
    }
  },
  {
    id: "order_manager",
    nameBn: "অর্ডার ম্যানেজার",
    nameEn: "Order Manager",
    icon: "📦",
    badgeColor: "bg-blue-600 text-white",
    descriptionBn: "অর্ডার গ্রহণ, স্ট্যাটাস পরিবর্তন, রাইডার অ্যাসাইন এবং ক্যাশ মেমো প্রিন্ট",
    descriptionEn: "Manage orders flow, rider assignments, memo downloads and fulfillment",
    defaultPermissions: {
      "dashboard.view": true,
      "daily_sales.view": true,
      "orders.view": true,
      "orders.add": true,
      "orders.edit": true,
      "memo_management.view": true,
      "memo_management.add": true,
      "memo_management.edit": true,
      "users.view": true,
      "support_chat.view": true,
      "support_chat.add": true
    }
  },
  {
    id: "product_manager",
    nameBn: "প্রোডাক্ট ম্যানেজার",
    nameEn: "Product Manager",
    icon: "🛒",
    badgeColor: "bg-amber-600 text-white",
    descriptionBn: "পণ্য সামগ্রী, ক্যাটাগরি, স্টক ও হোম ব্যানার নিয়ন্ত্রণ",
    descriptionEn: "Manage products catalog, stocks, pricing, categories and promo banners",
    defaultPermissions: {
      "dashboard.view": true,
      "products.view": true,
      "products.add": true,
      "products.edit": true,
      "products.delete": true,
      "categories.view": true,
      "categories.add": true,
      "categories.edit": true,
      "categories.delete": true,
      "home_management.view": true,
      "home_management.add": true,
      "home_management.edit": true,
      "coupons.view": true,
      "coupons.add": true
    }
  },
  {
    id: "call_center_agent",
    nameBn: "কল সেন্টার এজেন্ট",
    nameEn: "Call Center Agent",
    icon: "📞",
    badgeColor: "bg-teal-600 text-white",
    descriptionBn: "২০ ডেস্ক কল সেন্টার থেকে সরাসরি গ্রাহকদের কল ও ভয়েস সাপোর্ট",
    descriptionEn: "Receive customer live voice calls, manage desk status, and assist customers",
    defaultPermissions: {
      "voice_calls.view": true,
      "voice_calls.add": true,
      "voice_calls.edit": true,
      "support_chat.view": true,
      "support_chat.add": true,
      "support_chat.edit": true,
      "orders.view": true,
      "products.view": true
    }
  },
  {
    id: "customer_support",
    nameBn: "কাস্টমার সাপোর্ট",
    nameEn: "Customer Support",
    icon: "💬",
    badgeColor: "bg-indigo-600 text-white",
    descriptionBn: "লাইভ চ্যাটে গ্রাহকদের সাথে যোগাযোগ এবং প্রশ্নের উত্তর প্রদান",
    descriptionEn: "Handle customer live chat tickets, inquiries, order lookup, and feedback",
    defaultPermissions: {
      "support_chat.view": true,
      "support_chat.add": true,
      "support_chat.edit": true,
      "orders.view": true,
      "products.view": true,
      "users.view": true
    }
  },
  {
    id: "delivery_manager",
    nameBn: "ডেলিভারি ম্যানেজার",
    nameEn: "Delivery Manager",
    icon: "🚚",
    badgeColor: "bg-cyan-600 text-white",
    descriptionBn: "রাইডার সমন্বয়, ডেলিভারি ট্র্যাকিং এবং অর্ডার শিপমেন্ট ব্যবস্থাপনা",
    descriptionEn: "Coordinate delivery fleet, assign orders to riders, and track transit",
    defaultPermissions: {
      "dashboard.view": true,
      "orders.view": true,
      "orders.edit": true,
      "users.view": true,
      "users.edit": true,
      "memo_management.view": true
    }
  },
  {
    id: "accounts_manager",
    nameBn: "একাউন্টস ম্যানেজার",
    nameEn: "Accounts Manager",
    icon: "💰",
    badgeColor: "bg-emerald-700 text-white",
    descriptionBn: "পেমেন্ট ভেরিফিকেশন, রিফান্ড ও আর্থিক ট্রানজ্যাকশন পর্যবেক্ষণ",
    descriptionEn: "Financial ledgers, revenue audits, payment verification and refund credits",
    defaultPermissions: {
      "dashboard.view": true,
      "daily_sales.view": true,
      "accounts.view": true,
      "accounts.add": true,
      "accounts.edit": true,
      "orders.view": true,
      "orders.edit": true,
      "memo_management.view": true,
      "users.view": true
    }
  },
  {
    id: "custom",
    nameBn: "কাস্টম রোল",
    nameEn: "Custom Role",
    icon: "⚙️",
    badgeColor: "bg-slate-700 text-white",
    descriptionBn: "সুপার এডমিন কর্তৃক কাস্টমাইজড বিশেষ পারমিশন সেট",
    descriptionEn: "Tailored granular permission set configured by Super Administrator",
    defaultPermissions: {
      "dashboard.view": true
    }
  }
];

// Helper to check permission in UI or backend
export function hasPermission(
  user: any, 
  module: PermissionModule, 
  action: PermissionAction = "view"
): boolean {
  if (!user) return false;

  // 1. Super Admin has unrestricted universal permissions
  if (user.role === "super_admin" || user.isSuperAdmin === true || user.role === "founder") {
    return true;
  }

  // 2. Legacy 'admin' fallback if no specific permissions map exists
  if (user.role === "admin" && (!user.permissions || Object.keys(user.permissions).length === 0)) {
    return true;
  }

  // 3. Check explicit custom permissions on staff object
  const permKey = `${module}.${action}`;
  if (user.permissions && user.permissions[permKey] !== undefined) {
    return !!user.permissions[permKey];
  }

  // 4. Check fallback view if checking edit/add/delete
  if (action !== "view" && user.permissions && user.permissions[`${module}.view`] === false) {
    return false;
  }

  // 5. Check role default permissions
  const roleDef = DEFAULT_ROLES.find(r => r.id === user.role);
  if (roleDef && roleDef.defaultPermissions) {
    if (roleDef.defaultPermissions[permKey] !== undefined) {
      return !!roleDef.defaultPermissions[permKey];
    }
  }

  return false;
}

// Helper to calculate sequential Staff ID (Format: CFI-KB-001, CFI-KB-002, etc.)
export function generateNextStaffId(staffList: StaffMember[]): string {
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

/**
 * Format staff username strictly according to rule:
 * CFI-KB-001 → cfikb001
 * CFI-KB-002 → cfikb002
 * Strips '@', removes all hyphens/spaces, strictly lowercase.
 */
export function formatStaffUsername(input?: string): string {
  if (!input) return "";
  return input.trim().replace(/^@+/, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export const DEPARTMENTS = [
  { id: "Executive Administration", nameBn: "নির্বাহী প্রশাসন ও ম্যানেজমেন্ট", nameEn: "Executive Administration" },
  { id: "Order Fulfillment & Logistics", nameBn: "অর্ডার প্রসেসিং ও লজিস্টিকস", nameEn: "Order Fulfillment & Logistics" },
  { id: "Inventory & Catalog", nameBn: "পণ্য সম্ভার ও ইনভেন্টরি", nameEn: "Inventory & Catalog" },
  { id: "Customer Care & Voice Support", nameBn: "কল সেন্টার ও ভয়েস সাপোর্ট", nameEn: "Customer Care & Voice Support" },
  { id: "Live Chat Support", nameBn: "কাস্টমার সাপোর্ট ও লাইভ চ্যাট", nameEn: "Live Chat Support" },
  { id: "Rider & Delivery Fleet", nameBn: "ডেলিভারি রাইডার ও ফ্লিট", nameEn: "Rider & Delivery Fleet" },
  { id: "Finance & Accounts", nameBn: "হিসাবরক্ষণ ও অডিট বিভাগ", nameEn: "Finance & Accounts" },
  { id: "Store Operations", nameBn: "স্টোর অপারেশনস", nameEn: "Store Operations" }
];

export const BLOOD_GROUPS = ["A (+ve)", "A (-ve)", "B (+ve)", "B (-ve)", "O (+ve)", "O (-ve)", "AB (+ve)", "AB (-ve)"];

// Format joining date helper
export function formatStaffJoiningDate(dateStr?: string, lang: "bn" | "en" = "bn"): string {
  if (!dateStr) return lang === "bn" ? "০১ জানুয়ারি, ২০২৬" : "01 Jan 2026";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    
    if (lang === "bn") {
      const bnMonths = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];
      const toBnDigits = (n: number | string) => {
        const bnDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
        return String(n).replace(/\d/g, d => bnDigits[parseInt(d, 10)]);
      };
      const day = toBnDigits(String(d.getDate()).padStart(2, "0"));
      const month = bnMonths[d.getMonth()];
      const year = toBnDigits(d.getFullYear());
      return `${day} ${month}, ${year}`;
    } else {
      return d.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
    }
  } catch (e) {
    return dateStr;
  }
}

/**
 * Returns authentication headers for Staff/Admin API calls.
 * Automatically injects active session token, staff ID, and email.
 */
export function getStaffAuthHeaders(user?: any): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };

  try {
    const sessionId = user?.sessionId || 
      (typeof window !== "undefined" ? (localStorage.getItem("kb_staff_session") || sessionStorage.getItem("kb_staff_session")) : null);
    
    if (sessionId) {
      headers["Authorization"] = `Bearer ${sessionId}`;
      headers["x-session-id"] = sessionId;
    }

    if (user?.email) {
      headers["x-user-email"] = user.email;
    } else if (typeof window !== "undefined") {
      const storedEmail = localStorage.getItem("kb_staff_email");
      if (storedEmail) headers["x-user-email"] = storedEmail;
    }

    if (user?.staffId) {
      headers["x-staff-id"] = user.staffId;
    }
  } catch (e) {
    // Graceful fallback if storage is unavailable
  }

  return headers;
}

// Activity Logging helper
export async function logStaffActivity(params: {
  staffUser: any;
  action: string;
  module: string;
  details: string;
  targetId?: string;
}) {
  try {
    const { staffUser, action, module, details, targetId } = params;
    const staffId = staffUser?.staffId || staffUser?.uid || "SYS-ADMIN";
    const staffName = staffUser?.fullName || staffUser?.displayName || staffUser?.email || "System Admin";
    const staffRole = staffUser?.role || "super_admin";

    // 1. Post to Server API (which persists and ensures server audit integrity)
    fetch("/api/staff/activity-logs", {
      method: "POST",
      headers: getStaffAuthHeaders(staffUser),
      body: JSON.stringify({
        staffId,
        staffName,
        staffRole,
        action,
        module,
        details,
        targetId: targetId || ""
      })
    }).catch((e) => console.warn("Staff activity server log notice:", e));

    // 2. Also write to Firestore directly for instant real-time snapshot sync
    const logRef = doc(collection(db, "staff_activity_logs"));
    await setDoc(logRef, {
      id: logRef.id,
      staffId,
      staffName,
      staffRole,
      action,
      module,
      details,
      targetId: targetId || "",
      createdAt: serverTimestamp()
    });
  } catch (err) {
    console.error("Error creating staff activity log:", err);
  }
}

// Heartbeat updater for Staff Online / Away status
export async function sendStaffHeartbeat(staffId: string, status: StaffOnlineStatus = "online") {
  if (!staffId) return;
  try {
    await fetch("/api/staff/heartbeat", {
      method: "POST",
      headers: getStaffAuthHeaders({ staffId }),
      body: JSON.stringify({ staffId, status })
    });
    // Also update onlineStatus in Firestore if staffId exists
    const q = query(collection(db, "staff"), where("staffId", "==", staffId), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const staffDoc = snap.docs[0];
      await updateDoc(doc(db, "staff", staffDoc.id), {
        onlineStatus: status,
        lastActiveAt: new Date().toISOString()
      }).catch(() => {});
    }
  } catch (err) {
    console.warn("Staff heartbeat notice:", err);
  }
}

// ============================================================================
// FIREBASE FIRESTORE AS PRIMARY SOURCE OF TRUTH FOR STAFF MANAGEMENT
// ============================================================================

/**
 * Fetch all staff members using Firebase Firestore as the primary source of truth.
 * If the Firestore collection is empty (e.g. initial deployment or migration),
 * it bootstraps the default staff records from the server store into Firestore.
 */
export async function fetchStaffFromFirestore(): Promise<StaffMember[]> {
  try {
    const staffColRef = collection(db, "staff");
    const snapshot = await getDocs(staffColRef);

    if (!snapshot.empty) {
      const list: StaffMember[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          staffId: data.staffId || docSnap.id,
          username: data.username || "",
          fullName: data.fullName || "Staff Member",
          mobile: data.mobile || "",
          email: data.email || "",
          photoURL: data.photoURL || "",
          digitalSignature: data.digitalSignature || data.signature || data.signatureURL || data.signatureUrl || "",
          role: (data.role as StaffRole) || "order_manager",
          designation: data.designation || "Staff Executive",
          department: data.department || "General Operations",
          joiningDate: data.joiningDate || new Date().toISOString().split("T")[0],
          bloodGroup: data.bloodGroup || "N/A",
          emergencyContact: data.emergencyContact || data.mobile || "",
          monthlySalary: data.monthlySalary !== undefined && data.monthlySalary !== null ? Number(data.monthlySalary) : undefined,
          salaryStatus: data.salaryStatus || "due",
          lastPaymentDate: data.lastPaymentDate || "",
          salaryHistory: Array.isArray(data.salaryHistory) ? data.salaryHistory : [],
          status: (data.status as StaffStatus) || "active",
          onlineStatus: (data.onlineStatus as StaffOnlineStatus) || "offline",
          lastActiveAt: data.lastActiveAt || new Date().toISOString(),
          isSuperAdmin: !!data.isSuperAdmin || data.role === "super_admin",
          permissions: data.permissions || {},
          assignedAgentDesk: (data.role === "call_center_agent" && data.assignedAgentDesk) ? Number(data.assignedAgentDesk) : null,
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString()
        });
      });

      // Sort staff members by staffId (e.g. CFI-KB-001, CFI-KB-002)
      list.sort((a, b) => (a.staffId || "").localeCompare(b.staffId || ""));
      return list;
    }

    // If Firestore collection is currently empty, seed from server store
    console.info("Firestore staff collection is empty. Initializing and syncing seed data to Firestore...");
    const res = await fetch("/api/staff/list", {
      headers: getStaffAuthHeaders()
    });
    const data = await res.json();
    if (data.success && Array.isArray(data.staff) && data.staff.length > 0) {
      for (const s of data.staff) {
        const docRef = doc(db, "staff", s.id || `staff-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`);
        const safeSeedData = sanitizeForFirestore({
          ...s,
          assignedAgentDesk: s.role === "call_center_agent" ? (Number(s.assignedAgentDesk) || 1) : null,
          id: docRef.id,
          updatedAt: new Date().toISOString()
        });
        await setDoc(docRef, safeSeedData, { merge: true }).catch(err => console.warn("Firestore staff seed doc warning:", err));
      }
      return data.staff;
    }

    return [];
  } catch (err) {
    console.error("Error fetching staff from Firestore, falling back to server API:", err);
    try {
      const res = await fetch("/api/staff/list", {
        headers: getStaffAuthHeaders()
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.staff)) {
        return data.staff;
      }
    } catch (e) {
      console.error("Fallback server fetch also failed:", e);
    }
    return [];
  }
}

/**
 * Convenient alias for fetchStaffFromFirestore
 */
export const fetchStaffMembers = fetchStaffFromFirestore;

/**
 * Real-time listener for the Firestore staff collection.
 * Triggers callback immediately on changes across all sessions and devices.
 */
export function subscribeToStaffCollection(callback: (staff: StaffMember[]) => void): () => void {
  try {
    const staffColRef = collection(db, "staff");
    const unsubscribe = onSnapshot(staffColRef, (snapshot) => {
      const list: StaffMember[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          staffId: data.staffId || docSnap.id,
          username: data.username || "",
          fullName: data.fullName || "Staff Member",
          mobile: data.mobile || "",
          email: data.email || "",
          photoURL: data.photoURL || "",
          digitalSignature: data.digitalSignature || data.signature || data.signatureURL || data.signatureUrl || "",
          role: (data.role as StaffRole) || "order_manager",
          designation: data.designation || "Staff Executive",
          department: data.department || "General Operations",
          joiningDate: data.joiningDate || new Date().toISOString().split("T")[0],
          bloodGroup: data.bloodGroup || "N/A",
          emergencyContact: data.emergencyContact || data.mobile || "",
          monthlySalary: data.monthlySalary !== undefined && data.monthlySalary !== null ? Number(data.monthlySalary) : undefined,
          salaryStatus: data.salaryStatus || "due",
          lastPaymentDate: data.lastPaymentDate || "",
          salaryHistory: Array.isArray(data.salaryHistory) ? data.salaryHistory : [],
          status: (data.status as StaffStatus) || "active",
          onlineStatus: (data.onlineStatus as StaffOnlineStatus) || "offline",
          lastActiveAt: data.lastActiveAt || new Date().toISOString(),
          isSuperAdmin: !!data.isSuperAdmin || data.role === "super_admin",
          permissions: data.permissions || {},
          assignedAgentDesk: (data.role === "call_center_agent" && data.assignedAgentDesk) ? Number(data.assignedAgentDesk) : null,
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString()
        });
      });
      list.sort((a, b) => (a.staffId || "").localeCompare(b.staffId || ""));
      callback(list);
    }, (error) => {
      console.warn("Staff real-time listener notice:", error.message);
    });

    return unsubscribe;
  } catch (err) {
    console.error("Failed to subscribe to Firestore staff collection:", err);
    return () => {};
  }
}

/**
 * Create a new staff member with instant Firestore document creation
 * and server-side synchronization.
 */
export async function createStaffInFirestore(params: {
  fullName: string;
  mobile: string;
  email: string;
  username?: string;
  staffId?: string;
  password?: string;
  role: StaffRole;
  designation?: string;
  department?: string;
  joiningDate?: string;
  bloodGroup?: string;
  emergencyContact?: string;
  monthlySalary?: number;
  salaryStatus?: "paid" | "due" | "pending";
  status?: StaffStatus;
  photoURL?: string;
  assignedAgentDesk?: number | null;
  permissions?: PermissionsMap;
  creatorUser?: any;
}): Promise<StaffMember> {
  const {
    fullName,
    mobile,
    email,
    username,
    staffId,
    password,
    role,
    designation,
    department,
    joiningDate,
    bloodGroup,
    emergencyContact,
    monthlySalary,
    salaryStatus = "due",
    status = "active",
    photoURL = "",
    assignedAgentDesk,
    permissions = {},
    creatorUser
  } = params;

  // Validate assignedAgentDesk for call_center_agent vs other roles
  const cleanDesk = role === "call_center_agent"
    ? (assignedAgentDesk ? Number(assignedAgentDesk) : 1)
    : null;

  // 1. Sync with backend API to safely store credentials hash and retrieve computed ID
  const res = await fetch("/api/staff/create", {
    method: "POST",
    headers: getStaffAuthHeaders(creatorUser),
    body: JSON.stringify({
      fullName: (fullName || "").trim(),
      mobile: (mobile || "").replace(/\s+/g, ""),
      email: (email || "").trim().toLowerCase(),
      username: username ? username.trim().toLowerCase() : undefined,
      staffId: staffId ? staffId.trim().toUpperCase() : undefined,
      password,
      role,
      designation: (designation || "").trim() || undefined,
      department: (department || "").trim() || undefined,
      joiningDate: joiningDate || undefined,
      bloodGroup: bloodGroup || undefined,
      emergencyContact: (emergencyContact || "").trim() || undefined,
      monthlySalary: monthlySalary !== undefined ? Number(monthlySalary) : undefined,
      salaryStatus,
      status,
      photoURL: photoURL || "",
      assignedAgentDesk: cleanDesk,
      permissions,
      creatorName: creatorUser?.fullName || creatorUser?.displayName || "Super Admin"
    })
  });

  const apiData = await res.json();
  if (!res.ok) {
    throw new Error(apiData.error || "Failed to create staff");
  }

  const createdStaff: StaffMember = apiData.staff;
  const staffDocId = createdStaff.id || `staff-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  // 2. Immediately write/update the document in Firebase Firestore
  const staffDocRef = doc(db, "staff", staffDocId);
  const firestoreData = sanitizeForFirestore({
    id: staffDocId,
    staffId: createdStaff.staffId || staffId || staffDocId,
    username: formatStaffUsername(createdStaff.username || username || createdStaff.staffId || staffId),
    fullName: (createdStaff.fullName || fullName || "").trim(),
    mobile: (createdStaff.mobile || mobile || "").replace(/\s+/g, ""),
    email: (createdStaff.email || email || "").trim().toLowerCase(),
    photoURL: createdStaff.photoURL || photoURL || "",
    role: createdStaff.role || role || "order_manager",
    designation: (createdStaff.designation || designation || "Staff Executive").trim(),
    department: (createdStaff.department || department || "General Operations").trim(),
    joiningDate: createdStaff.joiningDate || joiningDate || new Date().toISOString().split("T")[0],
    bloodGroup: createdStaff.bloodGroup || bloodGroup || "N/A",
    emergencyContact: (createdStaff.emergencyContact || emergencyContact || mobile || "").trim(),
    monthlySalary: createdStaff.monthlySalary !== undefined ? Number(createdStaff.monthlySalary) : (monthlySalary ? Number(monthlySalary) : null),
    salaryStatus: createdStaff.salaryStatus || salaryStatus || "due",
    salaryHistory: createdStaff.salaryHistory || [],
    status: createdStaff.status || status || "active",
    onlineStatus: createdStaff.onlineStatus || "offline",
    lastActiveAt: createdStaff.lastActiveAt || new Date().toISOString(),
    isSuperAdmin: Boolean(createdStaff.isSuperAdmin || (createdStaff.role || role) === "super_admin"),
    permissions: createdStaff.permissions || permissions || {},
    assignedAgentDesk: cleanDesk,
    createdAt: createdStaff.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    updatedBy: creatorUser?.fullName || creatorUser?.displayName || "Super Admin"
  });

  await setDoc(staffDocRef, firestoreData, { merge: true });

  // 3. Log activity in Firestore
  await logStaffActivity({
    staffUser: creatorUser || { fullName: "Super Admin", role: "super_admin" },
    action: "staff_created",
    module: "staff_management",
    details: `নতুন স্টাফ Firestore-এ যুক্ত করা হয়েছে: ${createdStaff.fullName} (${createdStaff.staffId})`,
    targetId: createdStaff.staffId
  });

  return createdStaff;
}

/**
 * Update staff member in Firebase Firestore immediately.
 * Handles editing information, toggling status, changing roles and granular permissions.
 */
export async function updateStaffInFirestore(
  staffIdOrDocId: string,
  updateData: Partial<StaffMember> & {
    updaterName?: string;
    updaterRole?: string;
    updaterUser?: any;
  }
): Promise<StaffMember> {
  const { updaterName, updaterRole, updaterUser, ...fieldsToUpdate } = updateData;

  // 1. Clean and normalize payload fields to ensure NO undefined values reach any step
  const cleanedFields: Record<string, any> = {};
  for (const [key, val] of Object.entries(fieldsToUpdate)) {
    if (val !== undefined) {
      cleanedFields[key] = val;
    }
  }

  // Validate and normalize assignedAgentDesk
  if ("role" in cleanedFields || "assignedAgentDesk" in cleanedFields) {
    if (cleanedFields.role === "call_center_agent") {
      cleanedFields.assignedAgentDesk = (cleanedFields.assignedAgentDesk !== undefined && cleanedFields.assignedAgentDesk !== null)
        ? (Number(cleanedFields.assignedAgentDesk) || 1)
        : 1;
    } else if (cleanedFields.role) {
      cleanedFields.assignedAgentDesk = null;
    } else if (cleanedFields.assignedAgentDesk === undefined) {
      cleanedFields.assignedAgentDesk = null;
    }
  }

  // 2. Sync with server API
  const res = await fetch("/api/staff/update", {
    method: "POST",
    headers: getStaffAuthHeaders(updaterUser),
    body: JSON.stringify({
      id: staffIdOrDocId,
      ...cleanedFields,
      updaterName: updaterName || updaterUser?.fullName || updaterUser?.displayName || "Super Admin",
      updaterRole: updaterRole || updaterUser?.role || "super_admin"
    })
  });

  const apiData = await res.json();
  if (!res.ok) {
    throw new Error(apiData.error || "Failed to update staff");
  }

  const updatedStaff: StaffMember = apiData.staff;
  const targetDocId = updatedStaff.id || staffIdOrDocId;

  // 3. Immediately update the document in Firebase Firestore
  const staffDocRef = doc(db, "staff", targetDocId);
  const rawPayload: Record<string, any> = {
    ...cleanedFields,
    id: targetDocId,
    updatedAt: new Date().toISOString(),
    updatedBy: updaterName || updaterUser?.fullName || "Super Admin"
  };

  // Prevent overriding immutable fields
  if (updatedStaff.staffId) {
    rawPayload.staffId = updatedStaff.staffId;
  }

  // Ensure assignedAgentDesk is strictly number or null (NEVER undefined)
  const finalRole = updatedStaff.role || cleanedFields.role;
  if (finalRole === "call_center_agent") {
    const d = rawPayload.assignedAgentDesk !== undefined ? rawPayload.assignedAgentDesk : updatedStaff.assignedAgentDesk;
    rawPayload.assignedAgentDesk = (d !== undefined && d !== null) ? Number(d) : 1;
  } else {
    rawPayload.assignedAgentDesk = null;
  }

  // Sanitize full payload to guarantee zero undefined values are passed to Firestore setDoc
  const firestorePayload = sanitizeForFirestore(rawPayload);
  for (const k of Object.keys(firestorePayload)) {
    if (firestorePayload[k] === undefined) {
      delete firestorePayload[k];
    }
  }

  await setDoc(staffDocRef, firestorePayload, { merge: true });

  // 4. Log activity in Firestore
  await logStaffActivity({
    staffUser: updaterUser || { fullName: updaterName || "Super Admin", role: updaterRole || "super_admin" },
    action: "staff_updated",
    module: "staff_management",
    details: `স্টাফ তথ্য Firestore-এ আপডেট করা হয়েছে: ${updatedStaff.fullName} (${updatedStaff.staffId})`,
    targetId: updatedStaff.staffId
  });

  return updatedStaff;
}

/**
 * Record a salary payment in Firestore and sync with server API.
 */
export async function payStaffSalaryInFirestore(params: {
  staffId: string;
  month: string;
  amount: number;
  paymentMethod: string;
  transactionRef?: string;
  note?: string;
  adminUser?: any;
}): Promise<StaffMember> {
  const { staffId, month, amount, paymentMethod, transactionRef, note, adminUser } = params;

  // 1. Call server API
  const res = await fetch("/api/staff/salary/pay", {
    method: "POST",
    headers: getStaffAuthHeaders(adminUser),
    body: JSON.stringify({
      staffId,
      month,
      amount,
      paymentMethod,
      transactionRef,
      note,
      adminName: adminUser?.fullName || adminUser?.displayName || "Super Admin"
    })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "বেতন পরিশোধ সম্পন্ন করা যায়নি");
  }

  const updatedStaff: StaffMember = data.staff;
  const paymentRecord = data.payment;

  // 2. Sync Firestore
  const staffDocRef = doc(db, "staff", updatedStaff.id || staffId);
  const payload = sanitizeForFirestore({
    salaryStatus: "paid",
    lastPaymentDate: paymentRecord.paymentDate,
    salaryHistory: updatedStaff.salaryHistory || [],
    updatedAt: new Date().toISOString()
  });

  await setDoc(staffDocRef, payload, { merge: true }).catch(err => console.warn("Firestore salary sync warning:", err));

  // 3. Log activity in Firestore
  await logStaffActivity({
    staffUser: adminUser || { fullName: "Super Admin", role: "super_admin" },
    action: "salary_paid",
    module: "salary_management",
    details: `${updatedStaff.fullName} (${updatedStaff.staffId})-কে ${month} মাসের বেতন ৳${amount} পরিশোধ করা হয়েছে [পদ্ধতি: ${paymentMethod}]`,
    targetId: updatedStaff.staffId
  });

  return updatedStaff;
}

/**
 * Update staff monthly salary base in Firestore and server.
 */
export async function updateStaffSalaryBaseInFirestore(params: {
  staffId: string;
  monthlySalary: number;
  adminUser?: any;
}): Promise<StaffMember> {
  const { staffId, monthlySalary, adminUser } = params;

  const res = await fetch("/api/staff/salary/update-base", {
    method: "POST",
    headers: getStaffAuthHeaders(adminUser),
    body: JSON.stringify({
      staffId,
      monthlySalary,
      adminName: adminUser?.fullName || adminUser?.displayName || "Super Admin"
    })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "বেতন আপডেট করা যায়নি");
  }

  const updatedStaff: StaffMember = data.staff;
  const staffDocRef = doc(db, "staff", updatedStaff.id || staffId);
  const payload = sanitizeForFirestore({
    monthlySalary: Number(monthlySalary),
    updatedAt: new Date().toISOString()
  });

  await setDoc(staffDocRef, payload, { merge: true }).catch(err => console.warn("Firestore salary base sync warning:", err));

  return updatedStaff;
}

/**
 * Delete a staff member from Firebase Firestore and server store with Super Admin protection.
 */
export async function deleteStaffFromFirestore(
  staffIdOrDocId: string,
  deleterUser?: any
): Promise<void> {
  // 1. Call server API for validation and password hash removal
  const res = await fetch("/api/staff/delete", {
    method: "POST",
    headers: getStaffAuthHeaders(deleterUser),
    body: JSON.stringify({
      id: staffIdOrDocId,
      deleterName: deleterUser?.fullName || deleterUser?.displayName || "Super Admin"
    })
  });

  const apiData = await res.json();
  if (!res.ok) {
    throw new Error(apiData.error || "Failed to delete staff");
  }

  // 2. Immediately delete from Firebase Firestore
  const staffDocRef = doc(db, "staff", staffIdOrDocId);
  await deleteDoc(staffDocRef).catch(async (e) => {
    // If keyed by staffId instead of doc id, try finding doc by staffId
    const q = query(collection(db, "staff"), where("staffId", "==", staffIdOrDocId), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      await deleteDoc(doc(db, "staff", snap.docs[0].id));
    }
  });

  // 3. Log activity in Firestore
  await logStaffActivity({
    staffUser: deleterUser || { fullName: "Super Admin", role: "super_admin" },
    action: "staff_deleted",
    module: "staff_management",
    details: `স্টাফ অ্যাকাউন্ট Firestore থেকে মুছে ফেলা হয়েছে: ${staffIdOrDocId}`,
    targetId: staffIdOrDocId
  });
}

/**
 * Fetch staff activity logs from Firestore with fallback to server API.
 */
export async function fetchStaffLogsFromFirestore(limitCount: number = 150): Promise<StaffActivityLog[]> {
  try {
    const logsCol = collection(db, "staff_activity_logs");
    const q = query(logsCol, orderBy("createdAt", "desc"), limit(limitCount));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const logs: StaffActivityLog[] = [];
      snapshot.forEach(docSnap => {
        const d = docSnap.data();
        let createdAtStr = new Date().toISOString();
        if (d.createdAt) {
          if (typeof d.createdAt.toDate === "function") {
            createdAtStr = d.createdAt.toDate().toISOString();
          } else if (typeof d.createdAt === "string") {
            createdAtStr = d.createdAt;
          }
        }
        logs.push({
          id: docSnap.id,
          staffId: d.staffId || "",
          staffName: d.staffName || "Staff Member",
          staffRole: d.staffRole || "admin",
          action: d.action || "",
          module: d.module || "staff_management",
          details: d.details || "",
          targetId: d.targetId || "",
          createdAt: createdAtStr,
          ipAddress: d.ipAddress || ""
        });
      });
      return logs;
    }

    // Fallback to server endpoint
    const res = await fetch(`/api/staff/activity-logs?limit=${limitCount}`, {
      headers: getStaffAuthHeaders()
    });
    const data = await res.json();
    if (data.success && Array.isArray(data.logs)) {
      return data.logs;
    }
    return [];
  } catch (err) {
    console.warn("Firestore logs fetch notice, falling back to server API:", err);
    try {
      const res = await fetch(`/api/staff/activity-logs?limit=${limitCount}`, {
        headers: getStaffAuthHeaders()
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.logs)) {
        return data.logs;
      }
    } catch (e) {}
    return [];
  }
}

