import React, { useState, useEffect } from "react";
import { 
  db, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  onSnapshot, 
  orderBy, 
  limit, 
  query,
  serverTimestamp,
  addDoc,
  increment
} from "../../lib/firebase";
import { 
  ShieldAlert, Settings, Layers, ShoppingBag, User, 
  Store, Bike, CreditCard, Gift, Percent, Bell, 
  TrendingUp, DollarSign, Plus, Edit, Trash2, CheckCircle, 
  X, RefreshCw, Eye, Star, Info, ChevronRight, FileText, Check, Award,
  BarChart3
} from "lucide-react";
import { checkAndRewardReferral } from "../../lib/referral";

// Import modular sub-panels
import AdminDashboardReport from "./AdminDashboardReport";
import AdminDailySalesTab from "./AdminDailySalesTab";
import AdminOrdersTab from "./AdminOrdersTab";
import AdminProductsTab from "./AdminProductsTab";
import AdminUsersTab from "./AdminUsersTab";
import AdminSettingsTab from "./AdminSettingsTab";
import AdminSupportChatTab from "./AdminSupportChatTab";
import AdminLeadershipTab from "./AdminLeadershipTab";
import AdminHomePageTab from "./AdminHomePageTab";
import AdminMemoManagementTab from "./AdminMemoManagementTab";
import AdminVoiceCallTab from "./AdminVoiceCallTab";
import AdminIncomingCallModal from "./AdminIncomingCallModal";
import AdminStaffManagementTab from "./AdminStaffManagementTab";
import AdminPartnerShopsTab from "./AdminPartnerShopsTab";
import { MessageSquare, Printer, Layout, PhoneCall, Users } from "lucide-react";
import OrderMemoModal from "./OrderMemoModal";
import { hasPermission, logStaffActivity, sendStaffHeartbeat, DEFAULT_ROLES } from "../../lib/staffManager";

interface AdminPanelProps {
  user: any;
  onLogout: () => void;
  lang: "bn" | "en";
  triggerToast: (bn: string, en: string) => void;
}

export default function AdminPanel({ user, onLogout, lang, triggerToast }: AdminPanelProps) {
  // Check authorization for all staff roles
  const isAuthorized = 
    user?.role === "admin" || 
    user?.role === "super_admin" || 
    user?.role === "founder" || 
    user?.role === "order_manager" || 
    user?.role === "product_manager" || 
    user?.role === "call_center_agent" || 
    user?.role === "customer_support" || 
    user?.role === "delivery_manager" || 
    user?.role === "accounts_manager" || 
    user?.isSuperAdmin === true;

  if (!isAuthorized) {
    return (
      <div className="p-8 text-center bg-red-50 border border-red-200 rounded-2xl m-4 flex flex-col items-center justify-center space-y-3 text-slate-700">
        <ShieldAlert className="w-12 h-12 text-red-600 animate-bounce" />
        <p className="text-red-750 font-black text-sm">
          Access Denied. You do not have permission to access this page.
        </p>
      </div>
    );
  }

  // All menu tabs with their corresponding module
  const ALL_MENU_TABS = [
    { id: "dashboard", module: "dashboard", labelBn: "সিস্টেম ড্যাশবোর্ড", labelEn: "System Analytics", icon: <TrendingUp className="w-4 h-4" /> },
    { id: "daily_sales", module: "daily_sales", labelBn: "দৈনিক সেলস ওভারভিউ", labelEn: "Daily Sales Overview", icon: <BarChart3 className="w-4 h-4" /> },
    { id: "orders", module: "orders", labelBn: "অর্ডার ট্র্যাকিং", labelEn: "All Orders", icon: <ShoppingBag className="w-4 h-4" /> },
    { id: "products", module: "products", labelBn: "পণ্য সম্ভার", labelEn: "All Products", icon: <Layers className="w-4 h-4" /> },
    { id: "memo_management", module: "memo_management", labelBn: "মেমো ম্যানেজমেন্ট", labelEn: "Memo Management", icon: <Printer className="w-4 h-4" /> },
    { id: "staff_management", module: "staff_management", labelBn: "👥 স্টাফ ম্যানেজমেন্ট", labelEn: "Staff Management", icon: <Users className="w-4 h-4" /> },
    { id: "partner_shops", module: "partner_shops", labelBn: "🏪 পার্টনার শপস", labelEn: "Partner Shops", icon: <Store className="w-4 h-4" /> },
    { id: "home_management", module: "home_management", labelBn: "হোম পেজ ম্যানেজমেন্ট", labelEn: "Home Page Management", icon: <Layout className="w-4 h-4" /> },
    { id: "users", module: "users", labelBn: "ইউজার ডাটাবেজ", labelEn: "Role Management", icon: <User className="w-4 h-4" /> },
    { id: "leadership", module: "leadership", labelBn: "নেতৃত্ব ব্যবস্থাপনা", labelEn: "Leadership Management", icon: <Award className="w-4 h-4" /> },
    { id: "support_chat", module: "support_chat", labelBn: "লাইভ কাস্টমার সাপোর্ট", labelEn: "Live Chat Support", icon: <MessageSquare className="w-4 h-4" /> },
    { id: "voice_calls", module: "voice_calls", labelBn: "কল সেন্টার (২০ এজেন্ট)", labelEn: "Call Center (20 Agents)", icon: <PhoneCall className="w-4 h-4" /> },
    { id: "coupons", module: "coupons", labelBn: "ডিসকাউন্ট কুপনস", labelEn: "Coupons & Discounts", icon: <Percent className="w-4 h-4" /> },
    { id: "notifications", module: "notifications", labelBn: "বিজ্ঞপ্তি ব্রডকাস্ট", labelEn: "Notification Broadcast", icon: <Bell className="w-4 h-4" /> },
    { id: "settings", module: "settings", labelBn: "গ্লোবাল সেটিংস", labelEn: "Global Config", icon: <Settings className="w-4 h-4" /> }
  ];

  // Filter allowed tabs based on user permissions
  const allowedTabs = ALL_MENU_TABS.filter(tab => hasPermission(user, tab.module as any, "view"));

  const getInitialTab = () => {
    if (user?.role === "call_center_agent") return "voice_calls";
    if (user?.role === "customer_support") return "support_chat";
    if (user?.role === "order_manager") return "orders";
    if (user?.role === "product_manager") return "products";
    if (allowedTabs.length > 0) return allowedTabs[0].id;
    return "dashboard";
  };

  const [activeTab, setActiveTab] = useState<string>(getInitialTab());
  
  // Real-time states
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [settings, setSettings] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Order Memo Modal state
  const [selectedMemoOrder, setSelectedMemoOrder] = useState<any | null>(null);
  const [showMemoModal, setShowMemoModal] = useState<boolean>(false);

  // Notifications form state
  const [notifTitleBn, setNotifTitleBn] = useState<string>("");
  const [notifTitleEn, setNotifTitleEn] = useState<string>("");
  const [notifMsgBn, setNotifMsgBn] = useState<string>("");
  const [notifMsgEn, setNotifMsgEn] = useState<string>("");

  // Coupon form state
  const [copCode, setCopCode] = useState<string>("");
  const [copDiscount, setCopDiscount] = useState<number>(0);
  const [copMin, setCopMin] = useState<number>(0);
  const [showCouponForm, setShowCouponForm] = useState<boolean>(false);

  const getTranslation = (bn: string, en: string) => (lang === "bn" ? bn : en);

  // Real-time Staff Heartbeat
  useEffect(() => {
    const sId = user?.staffId || user?.uid;
    if (sId) {
      sendStaffHeartbeat(sId, "online");
      const interval = setInterval(() => {
        sendStaffHeartbeat(sId, "online");
      }, 25000);
      return () => {
        clearInterval(interval);
        sendStaffHeartbeat(sId, "offline");
      };
    }
  }, [user]);

  // Adjust activeTab if current is unauthorized
  useEffect(() => {
    if (allowedTabs.length > 0 && !allowedTabs.some(t => t.id === activeTab)) {
      setActiveTab(allowedTabs[0].id);
    }
  }, [user]);

  useEffect(() => {
    setLoading(true);

    // Listen to orders
    const unsubOrders = onSnapshot(
      collection(db, "orders"), 
      (snapshot) => {
        const ords: any[] = [];
        snapshot.forEach((doc) => {
          ords.push({ id: doc.id, ...doc.data() });
        });
        setOrders(ords);
      },
      (err) => console.warn("Admin orders sync notice:", err.message)
    );

    // Listen to products
    const unsubProds = onSnapshot(
      collection(db, "products"), 
      (snapshot) => {
        const prods: any[] = [];
        snapshot.forEach((doc) => {
          prods.push({ id: doc.id, ...doc.data() });
        });
        setProducts(prods);
        setLoading(false);
      },
      (err) => {
        console.warn("Admin prods sync notice:", err.message);
        setLoading(false);
      }
    );

    // Listen to users
    const unsubUsers = onSnapshot(
      collection(db, "users"), 
      (snapshot) => {
        const usrs: any[] = [];
        snapshot.forEach((doc) => {
          usrs.push({ id: doc.id, ...doc.data() });
        });
        setUsers(usrs);
      },
      (err) => console.warn("Admin users sync notice:", err.message)
    );

    // Listen to coupons
    const unsubCoupons = onSnapshot(
      collection(db, "coupons"), 
      (snapshot) => {
        const cops: any[] = [];
        snapshot.forEach((doc) => {
          cops.push({ id: doc.id, ...doc.data() });
        });
        setCoupons(cops);
      },
      (err) => console.warn("Admin coupons sync notice:", err.message)
    );

    // Listen to categories
    const unsubCats = onSnapshot(
      collection(db, "categories"), 
      (snapshot) => {
        const cats: any[] = [];
        snapshot.forEach((doc) => {
          cats.push({ id: doc.id, ...doc.data() });
        });
        cats.sort((a, b) => {
          const orderA = typeof a.displayOrder === "number" ? a.displayOrder : (typeof a.order === "number" ? a.order : 9999);
          const orderB = typeof b.displayOrder === "number" ? b.displayOrder : (typeof b.order === "number" ? b.order : 9999);
          return orderA - orderB;
        });
        setCategories(cats);
      },
      (err) => console.warn("Admin cats sync notice:", err.message)
    );

    // Listen to transactions
    const unsubTx = onSnapshot(
      query(collection(db, "transactions"), orderBy("createdAt", "desc"), limit(50)),
      (snapshot) => {
        const txs: any[] = [];
        snapshot.forEach((doc) => {
          txs.push({ id: doc.id, ...doc.data() });
        });
        setTransactions(txs);
      },
      (err) => console.warn("Admin tx sync notice:", err.message)
    );

    // Listen to referrals
    const unsubRef = onSnapshot(
      query(collection(db, "referrals"), orderBy("createdAt", "desc")),
      (snapshot) => {
        const refs: any[] = [];
        snapshot.forEach((doc) => {
          refs.push({ id: doc.id, ...doc.data() });
        });
        setReferrals(refs);
      },
      (err) => console.warn("Admin ref sync notice:", err.message)
    );

    // Listen to banners
    const unsubBanners = onSnapshot(
      collection(db, "banners"), 
      (snapshot) => {
        const bans: any[] = [];
        snapshot.forEach((doc) => {
          bans.push({ id: doc.id, ...doc.data() });
        });
        setBanners(bans);
      },
      (err) => console.warn("Admin banners sync notice:", err.message)
    );

    // Listen to global settings
    const unsubSettings = onSnapshot(
      doc(db, "settings", "global"), 
      (docSnap) => {
        if (docSnap.exists()) {
          setSettings(docSnap.data());
        }
      },
      (err) => console.warn("Admin settings sync notice:", err.message)
    );

    return () => {
      unsubOrders();
      unsubProds();
      unsubUsers();
      unsubCoupons();
      unsubCats();
      unsubTx();
      unsubRef();
      unsubBanners();
      unsubSettings();
    };
  }, []);

  // Update order status
  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    try {
      await updateDoc(doc(db, "orders", orderId), {
        orderStatus: status
      });
      triggerToast(`অর্ডার স্ট্যাটাস আপডেট করা হয়েছে: ${status}`, `Order status updated to: ${status}`);

      if (status === "delivered") {
        const orderSnap = await getDoc(doc(db, "orders", orderId));
        if (orderSnap.exists()) {
          const orderData = orderSnap.data();
          const customerId = orderData.customerId;
          if (customerId) {
            await checkAndRewardReferral(customerId);
          }
        }
      }
    } catch (err) {
      console.error("Error updating order status:", err);
    }
  };

  // Update payment status (Securely handles admin manual payment verification and refund processing)
  const handleUpdatePaymentStatus = async (orderId: string, status: string) => {
    try {
      const orderRef = doc(db, "orders", orderId);
      const orderSnap = await getDoc(orderRef);
      if (!orderSnap.exists()) return;
      const orderData = orderSnap.data();

      // Update paymentStatus in Firestore
      await updateDoc(orderRef, {
        paymentStatus: status,
        // If status is refunded, also mark orderStatus as refunded
        ...(status === "refunded" ? { orderStatus: "refunded" } : {})
      });

      // Handle wallet credit if setting status to refunded
      if (status === "refunded" && orderData.customerId && orderData.customerId !== "guest") {
        const refundAmount = orderData.total || orderData.totalAmount || 0;
        
        // 1. Update wallet balance
        const walletRef = doc(db, "wallet", orderData.customerId);
        const walletSnap = await getDoc(walletRef);
        if (walletSnap.exists()) {
          await updateDoc(walletRef, {
            balance: increment(refundAmount),
            updatedAt: serverTimestamp()
          });
        } else {
          await setDoc(walletRef, {
            balance: refundAmount,
            updatedAt: serverTimestamp()
          });
        }

        // 2. Create transaction record
        const txId = "refund_" + orderId + "_" + Date.now();
        await setDoc(doc(db, "transactions", txId), {
          id: txId,
          userId: orderData.customerId,
          type: "refund",
          amount: refundAmount,
          description: getTranslation(
            `অর্ডার #${orderId.slice(-6).toUpperCase()} এর রিফান্ড অনুমোদন করা হয়েছে।`,
            `Refund approved and credited for Order #${orderId.slice(-6).toUpperCase()}.`
          ),
          createdAt: serverTimestamp(),
          referenceId: orderId
        });

        // 3. Send notification to user
        await addDoc(collection(db, "notifications"), {
          userId: orderData.customerId,
          titleBn: "রিফান্ড অনুমোদন",
          titleEn: "Refund Approved",
          messageBn: `আপনার অর্ডার #${orderId.slice(-6).toUpperCase()} এর রিফান্ড আপনার ওয়ালেটে যোগ করা হয়েছে।`,
          messageEn: `The refund for Order #${orderId.slice(-6).toUpperCase()} has been credited to your wallet.`,
          isRead: false,
          createdAt: serverTimestamp()
        });
      }

      triggerToast(`পেমেন্ট স্ট্যাটাস আপডেট করা হয়েছে: ${status}`, `Payment status updated to: ${status}`);
    } catch (err) {
      console.error("Error updating payment status:", err);
      triggerToast("পেমেন্ট স্ট্যাটাস আপডেট ব্যর্থ হয়েছে।", "Failed to update payment status.");
    }
  };

  // Assign Rider to order
  const handleAssignRider = async (orderId: string, riderId: string) => {
    if (!riderId) return;
    try {
      const selectedRider = users.find(u => u.uid === riderId || u.id === riderId);
      if (!selectedRider) return;

      // 1. Update order with rider details and status "picked up"
      await updateDoc(doc(db, "orders", orderId), {
        riderId: riderId,
        orderStatus: "picked up",
        riderName: selectedRider.displayName || selectedRider.name || "Rider"
      });

      // 2. Clear previous or assign active order reference to rider's profile
      await setDoc(doc(db, "riders", riderId), {
        currentOrderId: orderId
      }, { merge: true });

      triggerToast("রাইডার নিযুক্ত করা হয়েছে!", "Rider assigned and order moved to picked up status!");
    } catch (err) {
      console.error("Error assigning rider:", err);
      triggerToast("রাইডার নিয়োগ ব্যর্থ হয়েছে।", "Failed to assign rider.");
    }
  };

  // Create Coupon
  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!copCode || copDiscount <= 0) return;
    try {
      const codeUpper = copCode.toUpperCase().trim();
      await setDoc(doc(db, "coupons", codeUpper), {
        code: codeUpper,
        discountAmount: Number(copDiscount),
        minOrderAmount: Number(copMin),
        isActive: true,
        expiryDate: serverTimestamp()
      });
      triggerToast(`কুপন "${codeUpper}" তৈরি করা হয়েছে!`, `Coupon "${codeUpper}" successfully created!`);
      setCopCode("");
      setCopDiscount(0);
      setCopMin(0);
      setShowCouponForm(false);
    } catch (err) {
      console.error("Error creating coupon:", err);
    }
  };

  // Delete Coupon
  const handleDeleteCoupon = async (code: string) => {
    if (!confirm(getTranslation("কুপন ডিলিট করতে চান?", "Are you sure you want to delete this coupon?"))) return;
    try {
      await deleteDoc(doc(db, "coupons", code));
      triggerToast("কুপন ডিলিট করা হয়েছে!", "Coupon deleted successfully!");
    } catch (err) {
      console.error("Error deleting coupon:", err);
    }
  };

  // Send Broadcast push notification
  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitleBn || !notifTitleEn) return;
    try {
      const newRef = doc(collection(db, "notifications"));
      await setDoc(newRef, {
        id: newRef.id,
        userId: "all", // Broadcast
        titleBn: notifTitleBn,
        titleEn: notifTitleEn,
        messageBn: notifMsgBn,
        messageEn: notifMsgEn,
        isRead: false,
        createdAt: serverTimestamp()
      });
      triggerToast("সিস্টেম নোটিফিকেশন ব্রডকাস্ট সম্পন্ন হয়েছে!", "System broadcast notification sent successfully!");
      setNotifTitleBn("");
      setNotifTitleEn("");
      setNotifMsgBn("");
      setNotifMsgEn("");
    } catch (err) {
      console.error("Error sending broadcast:", err);
    }
  };

  // Approved active riders list
  const activeRidersList = users.filter(u => u.role === "rider");

  return (
    <div className="w-full h-full bg-slate-50 overflow-hidden flex flex-col md:flex-row">
      
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 lg:w-72 bg-slate-950 text-white shrink-0 flex flex-col h-auto md:h-full z-10 border-b md:border-b-0 md:border-r border-slate-850">
        {/* Sidebar Header */}
        <div className="p-4 sm:p-5 pb-3 sm:pb-4 border-b border-slate-850 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-900 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-black text-white text-sm leading-tight truncate">
                {user?.fullName || user?.displayName || getTranslation("এডমিন প্যানেল", "Admin Portal")}
              </h3>
              <p className="text-[10px] text-emerald-400 font-bold mt-0.5 uppercase tracking-wider truncate">
                {user?.role === "super_admin" || user?.isSuperAdmin ? "👑 Super Admin" : (user?.role || "Staff Member")}
              </p>
            </div>
          </div>
        </div>

        {/* Sidebar Menu with smooth independent scrolling & Dynamic RBAC */}
        <nav className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-1">
          {allowedTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer text-left ${
                activeTab === tab.id 
                  ? "bg-emerald-600 text-white shadow shadow-emerald-950 font-black" 
                  : "text-slate-400 hover:bg-slate-850 hover:text-white"
              }`}
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <span className="shrink-0">{tab.icon}</span>
                <span className="truncate">{getTranslation(tab.labelBn, tab.labelEn)}</span>
              </div>
            </button>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-850 shrink-0 bg-slate-950">
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center space-x-2 px-3.5 py-2.5 text-red-400 hover:bg-red-950/40 hover:text-red-300 rounded-xl text-xs font-bold transition cursor-pointer border border-red-900/30"
          >
            <X className="w-4 h-4" />
            <span>{getTranslation("লগআউট", "Logout")}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area - Single Unified Scrollable Container */}
      <main className="flex-1 min-w-0 h-full min-h-0 overflow-y-auto p-3 sm:p-5 lg:p-6 bg-slate-50 focus:outline-none">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
          </div>
        ) : (
          <>
            {/* TAB: DASHBOARD REPORT */}
            {activeTab === "dashboard" && (
              <div className="space-y-6 animate-fade-in">
                <div className="bg-gradient-to-r from-emerald-800 to-teal-900 rounded-3xl p-6 text-white shadow relative overflow-hidden">
                  <h2 className="text-xl font-black">{getTranslation("সিস্টেম লাইভ মনিটরিং হাব", "Real-Time System Monitoring Control")}</h2>
                  <p className="text-xs text-emerald-200 mt-1">
                    {getTranslation(
                      "কাচা বাজার গ্রোসারি অ্যাপ্লিকেশনের সব কার্যক্রম রিয়েল-টাইমে পর্যবেক্ষণ করুন।",
                      "Monitor, approve, and track all store inventory, sales, users, and riders securely from a single pane of glass."
                    )}
                  </p>
                </div>
                
                <AdminDashboardReport orders={orders} products={products} users={users} lang={lang} />
              </div>
            )}

            {/* TAB: DAILY SALES OVERVIEW */}
            {activeTab === "daily_sales" && (
              <div className="space-y-6 animate-fade-in">
                <AdminDailySalesTab
                  orders={orders}
                  products={products}
                  lang={lang}
                  triggerToast={triggerToast}
                />
              </div>
            )}

            {/* TAB: ORDERS */}
            {activeTab === "orders" && (
              <div className="space-y-6 animate-fade-in">
                <AdminOrdersTab
                  orders={orders}
                  users={users}
                  lang={lang}
                  triggerToast={triggerToast}
                  onSelectMemoOrder={(order) => {
                    setSelectedMemoOrder(order);
                    setShowMemoModal(true);
                  }}
                  handleUpdateOrderStatus={handleUpdateOrderStatus}
                  handleUpdatePaymentStatus={handleUpdatePaymentStatus}
                  handleAssignRider={handleAssignRider}
                />
              </div>
            )}

            {/* TAB: PRODUCTS */}
            {activeTab === "products" && (
              <div className="space-y-6 animate-fade-in">
                <AdminProductsTab products={products} categories={categories} lang={lang} triggerToast={triggerToast} />
              </div>
            )}

            {/* TAB: USERS & ROLES */}
            {activeTab === "users" && (
              <div className="space-y-6 animate-fade-in">
                <AdminUsersTab users={users} transactions={transactions} referrals={referrals} lang={lang} triggerToast={triggerToast} currentUser={user} />
              </div>
            )}

            {/* TAB: LEADERSHIP MANAGEMENT */}
            {activeTab === "leadership" && (
              <div className="space-y-6 animate-fade-in">
                <AdminLeadershipTab lang={lang} triggerToast={triggerToast} />
              </div>
            )}

            {/* TAB: HOME PAGE MANAGEMENT */}
            {activeTab === "home_management" && (
              <div className="space-y-6 animate-fade-in">
                <AdminHomePageTab
                  products={products}
                  categories={categories}
                  lang={lang}
                  triggerToast={triggerToast}
                />
              </div>
            )}

            {/* TAB: COUPONS */}
            {activeTab === "coupons" && (
              <div className="space-y-6 animate-fade-in">
                <div className="bg-white border border-slate-100 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-slate-800 text-sm">{getTranslation("কুপন ও প্রচারমূলক অফার", "Coupons & Discounts Ledger")}</h3>
                    <button 
                      onClick={() => setShowCouponForm(!showCouponForm)}
                      className="bg-slate-900 hover:bg-black text-white text-xs font-black px-4 py-2 rounded-xl transition flex items-center gap-2 cursor-pointer uppercase"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{getTranslation("নতুন কুপন", "Create Coupon")}</span>
                    </button>
                  </div>

                  {showCouponForm && (
                    <form onSubmit={handleCreateCoupon} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fade-in">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Coupon Code</label>
                        <input type="text" required placeholder="e.g. KACHA50" value={copCode} onChange={(e) => setCopCode(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs outline-none" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Discount Amount (৳)</label>
                        <input type="number" required min={1} value={copDiscount} onChange={(e) => setCopDiscount(Number(e.target.value))} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs outline-none" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Min Order Limit (৳)</label>
                        <input type="number" required min={0} value={copMin} onChange={(e) => setCopMin(Number(e.target.value))} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs outline-none" />
                      </div>
                      <div className="sm:col-span-3 flex justify-end gap-2 mt-2">
                        <button type="button" onClick={() => setShowCouponForm(false)} className="bg-slate-100 text-slate-600 px-4 py-1.5 rounded-lg text-xs font-bold">Cancel</button>
                        <button type="submit" className="bg-emerald-600 text-white px-5 py-1.5 rounded-lg text-xs font-bold uppercase">Save Code</button>
                      </div>
                    </form>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {coupons.map((c) => (
                      <div key={c.id} className="bg-slate-50 border border-slate-150 p-4 rounded-2xl flex items-center justify-between">
                        <div>
                          <div className="text-xs font-black text-slate-800">{c.code}</div>
                          <span className="text-[10px] text-slate-400 font-bold block mt-1">Discount: ৳{c.discountAmount} (Min: ৳{c.minOrderAmount})</span>
                        </div>
                        <button 
                          onClick={() => handleDeleteCoupon(c.id)}
                          className="p-1.5 text-slate-350 hover:text-red-600 rounded-lg hover:bg-red-50 transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: NOTIFICATIONS */}
            {activeTab === "notifications" && (
              <div className="space-y-6 animate-fade-in">
                <div className="bg-white border border-slate-100 rounded-3xl p-5 sm:p-6 shadow-sm">
                  <h3 className="font-black text-slate-800 text-sm mb-4">{getTranslation("বিজ্ঞপ্তি ব্রডকাস্ট করুন", "Broadcast System Notification")}</h3>
                  
                  <form onSubmit={handleSendNotification} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Notification Title (English) *</label>
                        <input type="text" required placeholder="e.g. Fresh Mangoes Back in Stock!" value={notifTitleEn} onChange={(e) => setNotifTitleEn(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:bg-white outline-none font-bold" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">বিজ্ঞপ্তির শিরোনাম (বাংলা) *</label>
                        <input type="text" required placeholder="যেমনঃ তাজা ল্যাংড়া আম স্টক-এ এসেছে!" value={notifTitleBn} onChange={(e) => setNotifTitleBn(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:bg-white outline-none font-bold" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Detailed Message (English)</label>
                        <textarea rows={2} placeholder="Short description text to inform users..." value={notifMsgEn} onChange={(e) => setNotifMsgEn(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:bg-white outline-none" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">বিস্তারিত বার্তা (বাংলা)</label>
                        <textarea rows={2} placeholder="গ্রাহকদের প্রেরণের জন্য সংক্ষিপ্ত বার্তা..." value={notifMsgBn} onChange={(e) => setNotifMsgBn(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:bg-white outline-none" />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button type="submit" className="bg-slate-900 hover:bg-black text-white text-xs font-black px-5 py-2.5 rounded-xl transition shadow cursor-pointer uppercase">
                        Broadcast Notification
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* TAB: MEMO MANAGEMENT */}
            {activeTab === "memo_management" && (
              <div className="space-y-6 animate-fade-in">
                <AdminMemoManagementTab orders={orders} settings={settings} lang={lang} triggerToast={triggerToast} currentUser={user} />
              </div>
            )}

            {/* TAB: STAFF MANAGEMENT */}
            {activeTab === "staff_management" && (
              <div className="space-y-6 animate-fade-in">
                <AdminStaffManagementTab currentUser={user} lang={lang} triggerToast={triggerToast} />
              </div>
            )}

            {/* TAB: PARTNER SHOPS */}
            {activeTab === "partner_shops" && (
              <div className="space-y-6 animate-fade-in">
                <AdminPartnerShopsTab currentUser={user} lang={lang} triggerToast={triggerToast} />
              </div>
            )}

            {/* TAB: LIVE SUPPORT CHAT */}
            {activeTab === "support_chat" && (
              <div className="space-y-6 animate-fade-in">
                <AdminSupportChatTab lang={lang} triggerToast={triggerToast} />
              </div>
            )}

            {/* TAB: VOICE CALLS */}
            {activeTab === "voice_calls" && (
              <div className="space-y-6 animate-fade-in">
                <AdminVoiceCallTab lang={lang} triggerToast={triggerToast} />
              </div>
            )}

            {/* TAB: SETTINGS */}
            {activeTab === "settings" && (
              <div className="space-y-6 animate-fade-in">
                <AdminSettingsTab settings={settings} banners={banners} lang={lang} triggerToast={triggerToast} />
              </div>
            )}

          </>
        )}
      </main>

      {/* Global Incoming Voice Call Ringing / Active Modal */}
      <AdminIncomingCallModal 
        lang={lang} 
        triggerToast={triggerToast} 
        onNavigateToVoiceTab={() => setActiveTab("voice_calls")} 
      />

      {/* Printable Order Memo / Invoice Modal Overlay */}
      <OrderMemoModal
        isOpen={showMemoModal}
        onClose={() => {
          setShowMemoModal(false);
          setSelectedMemoOrder(null);
        }}
        order={selectedMemoOrder}
        lang={lang}
        triggerToast={triggerToast}
        founderSignature={settings?.founderSignature}
        memoSettings={settings}
      />

    </div>
  );
}
