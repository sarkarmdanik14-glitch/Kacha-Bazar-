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
  addDoc 
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
      headers: { "Content-Type": "application/json" },
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staffId, status })
    });
  } catch (err) {
    console.warn("Staff heartbeat notice:", err);
  }
}
