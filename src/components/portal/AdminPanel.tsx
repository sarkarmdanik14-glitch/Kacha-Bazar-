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
  X, RefreshCw, Eye, Star, Info, ChevronRight, FileText, Check, Award
} from "lucide-react";
import { checkAndRewardReferral } from "../../lib/referral";

// Import modular sub-panels
import AdminDashboardReport from "./AdminDashboardReport";
import AdminProductsTab from "./AdminProductsTab";
import AdminUsersTab from "./AdminUsersTab";
import AdminSettingsTab from "./AdminSettingsTab";
import AdminSupportChatTab from "./AdminSupportChatTab";
import AdminLeadershipTab from "./AdminLeadershipTab";
import AdminHomePageTab from "./AdminHomePageTab";
import AdminMemoManagementTab from "./AdminMemoManagementTab";
import AdminVoiceCallTab from "./AdminVoiceCallTab";
import AdminIncomingCallModal from "./AdminIncomingCallModal";
import { MessageSquare, Printer, Layout, PhoneCall } from "lucide-react";
import OrderMemoModal from "./OrderMemoModal";

interface AdminPanelProps {
  user: any;
  onLogout: () => void;
  lang: "bn" | "en";
  triggerToast: (bn: string, en: string) => void;
}

export default function AdminPanel({ user, onLogout, lang, triggerToast }: AdminPanelProps) {
  // Ensure strict authorization before rendering anything
  if (user?.role !== "admin" && user?.role !== "founder") {
    return (
      <div className="p-8 text-center bg-red-50 border border-red-200 rounded-2xl m-4 flex flex-col items-center justify-center space-y-3 text-slate-700">
        <ShieldAlert className="w-12 h-12 text-red-600 animate-bounce" />
        <p className="text-red-750 font-black text-sm">
          Access Denied. You do not have permission to access this page.
        </p>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState<"dashboard" | "orders" | "products" | "memo_management" | "users" | "leadership" | "home_management" | "coupons" | "notifications" | "settings" | "support_chat" | "voice_calls">("dashboard");
  
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
    <div className="w-full bg-slate-50 min-h-screen rounded-3xl overflow-hidden flex flex-col md:flex-row border border-slate-100">
      
      {/* Sidebar Navigation */}
      <div className="w-full md:w-64 bg-slate-950 text-white p-5 shrink-0 flex flex-col justify-between">
        <div>
          <div className="flex items-center space-x-3 mb-8 pb-5 border-b border-slate-850">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-900 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-white text-sm leading-tight">{getTranslation("এডমিন প্যানেল", "Admin Portal")}</h3>
              <p className="text-[10px] text-emerald-400 font-bold mt-0.5 uppercase tracking-wider">Super Administrator</p>
            </div>
          </div>

          <nav className="space-y-1">
            {[
              { id: "dashboard", labelBn: "সিস্টেম ড্যাশবোর্ড", labelEn: "System Analytics", icon: <TrendingUp className="w-4 h-4" /> },
              { id: "orders", labelBn: "অর্ডার ট্র্যাকিং", labelEn: "All Orders", icon: <ShoppingBag className="w-4 h-4" /> },
              { id: "products", labelBn: "পণ্য সম্ভার", labelEn: "All Products", icon: <Layers className="w-4 h-4" /> },
              { id: "memo_management", labelBn: "মেমো ম্যানেজমেন্ট", labelEn: "Memo Management", icon: <Printer className="w-4 h-4" /> },
              { id: "home_management", labelBn: "হোম পেজ ম্যানেজমেন্ট", labelEn: "Home Page Management", icon: <Layout className="w-4 h-4" /> },
              { id: "users", labelBn: "ইউজার ডাটাবেজ", labelEn: "Role Management", icon: <User className="w-4 h-4" /> },
              { id: "leadership", labelBn: "নেতৃত্ব ব্যবস্থাপনা", labelEn: "Leadership Management", icon: <Award className="w-4 h-4" /> },
              { id: "support_chat", labelBn: "লাইভ কাস্টমার সাপোর্ট", labelEn: "Live Chat Support", icon: <MessageSquare className="w-4 h-4" /> },
              { id: "voice_calls", labelBn: "কল সেন্টার (২০ এজেন্ট)", labelEn: "Call Center (20 Agents)", icon: <PhoneCall className="w-4 h-4" /> },
              { id: "coupons", labelBn: "ডিসকাউন্ট কুপনস", labelEn: "Coupons & Discounts", icon: <Percent className="w-4 h-4" /> },
              { id: "notifications", labelBn: "বিজ্ঞপ্তি ব্রডকাস্ট", labelEn: "Notification Broadcast", icon: <Bell className="w-4 h-4" /> },
              { id: "settings", labelBn: "গ্লোবাল সেটিংস", labelEn: "Global Config", icon: <Settings className="w-4 h-4" /> }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTab === tab.id 
                    ? "bg-emerald-600 text-white shadow shadow-emerald-950" 
                    : "text-slate-400 hover:bg-slate-850 hover:text-white"
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  {tab.icon}
                  <span>{getTranslation(tab.labelBn, tab.labelEn)}</span>
                </div>
              </button>
            ))}
          </nav>
        </div>

        <button
          onClick={onLogout}
          className="w-full flex items-center space-x-2 px-3.5 py-2.5 text-red-400 hover:bg-slate-850 rounded-xl text-xs font-bold mt-10 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
          <span>{getTranslation("লগআউট", "Logout")}</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-5 sm:p-8 overflow-y-auto max-h-[85vh]">
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

            {/* TAB: ORDERS */}
            {activeTab === "orders" && (
              <div className="space-y-6 animate-fade-in">
                <div className="bg-white border border-slate-100 rounded-3xl p-5 sm:p-6 shadow-sm">
                  <h3 className="font-black text-slate-800 text-sm mb-4">{getTranslation("অর্ডার তালিকা ও অ্যাকশন হাব", "Central Order Desk")}</h3>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase text-[10px] font-black">
                          <th className="p-4">{getTranslation("অর্ডার আইডি", "Order ID")}</th>
                          <th className="p-4">{getTranslation("তারিখ / সময়", "Timestamp")}</th>
                          <th className="p-4">{getTranslation("গ্রাহক তথ্য", "Customer Info")}</th>
                          <th className="p-4">{getTranslation("মোট বিল", "Total Bill")}</th>
                          <th className="p-4">{getTranslation("বর্তমান স্থিতি", "Order Status")}</th>
                          <th className="p-4">{getTranslation("রাইডার নিযুক্ত করুন", "Assign Rider")}</th>
                          <th className="p-4 text-center">{getTranslation("অ্যাকশন", "Change Status")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 font-medium">
                        {orders.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center p-8 text-slate-400 font-bold">
                              {getTranslation("কোন অর্ডার পাওয়া যায়নি।", "No customer orders logged yet.")}
                            </td>
                          </tr>
                        ) : (
                          orders.map((o) => (
                            <tr key={o.id} className="hover:bg-slate-50/30 text-slate-600">
                              <td className="p-4 font-bold text-slate-800 font-mono">#{o.id.slice(-6).toUpperCase()}</td>
                              <td className="p-4 text-[10px] text-slate-400 font-bold">
                                {o.createdAt ? new Date(o.createdAt?.seconds * 1000).toLocaleString() : "Live"}
                              </td>
                              <td className="p-4">
                                <div className="font-extrabold text-slate-800">{o.name || "Guest Customer"}</div>
                                <div className="text-[10px] text-indigo-500 font-bold">{o.phone}</div>
                                <div className="text-[10px] text-slate-400 truncate max-w-xs">{o.address}</div>
                              </td>
                              <td className="p-4">
                                <div className="font-extrabold text-slate-800">৳{o.totalAmount}</div>
                                <div className="flex flex-col gap-1 mt-1">
                                  <span className="text-[10px] uppercase font-bold text-slate-400">{o.paymentMethod || "COD"}</span>
                                  <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold w-max ${
                                    o.paymentStatus === "paid" ? "bg-emerald-50 text-emerald-600" :
                                    o.paymentStatus === "refunded" ? "bg-red-50 text-red-600" :
                                    o.paymentStatus === "failed" ? "bg-slate-100 text-slate-500" :
                                    "bg-amber-50 text-amber-600"
                                  }`}>
                                    {o.paymentStatus || "pending"}
                                  </span>
                                  <select
                                    value={o.paymentStatus || "pending"}
                                    onChange={(e) => handleUpdatePaymentStatus(o.id, e.target.value)}
                                    className="bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-[9px] font-bold text-slate-500 outline-none w-max mt-0.5"
                                  >
                                    <option value="pending">{getTranslation("পেন্ডিং", "Pending")}</option>
                                    <option value="paid">{getTranslation("পরিশোধিত", "Paid")}</option>
                                    <option value="failed">{getTranslation("ব্যর্থ", "Failed")}</option>
                                    <option value="refunded">{getTranslation("ফেরত", "Refunded")}</option>
                                  </select>
                                </div>
                              </td>
                              <td className="p-4 capitalize">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                  o.orderStatus === "delivered" ? "bg-emerald-50 text-emerald-600" :
                                  o.orderStatus === "picked up" ? "bg-indigo-50 text-indigo-600" :
                                  o.orderStatus === "confirmed" ? "bg-blue-50 text-blue-600" :
                                  o.orderStatus === "pending" ? "bg-amber-50 text-amber-600 animate-pulse" : "bg-red-50 text-red-600"
                                }`}>
                                  {o.orderStatus || "pending"}
                                </span>
                              </td>
                              <td className="p-4">
                                {o.riderId ? (
                                  <div className="flex items-center gap-1">
                                    <Bike className="w-3.5 h-3.5 text-emerald-600" />
                                    <span className="text-xs font-bold text-slate-700 capitalize">{o.riderName || "Rider Assigned"}</span>
                                  </div>
                                ) : (
                                  <select 
                                    onChange={(e) => handleAssignRider(o.id, e.target.value)}
                                    defaultValue=""
                                    className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 text-[10px] font-bold text-slate-500 outline-none"
                                  >
                                    <option value="" disabled>{getTranslation("রাইডার বাছাই করুন", "Select Rider")}</option>
                                    {activeRidersList.map(r => (
                                      <option key={r.id || r.uid} value={r.uid || r.id}>{r.displayName || r.name}</option>
                                    ))}
                                  </select>
                                )}
                              </td>
                              <td className="p-4 text-center">
                                <div className="flex items-center justify-center gap-1.5 flex-wrap md:flex-nowrap">
                                  {["confirmed", "delivered", "cancelled"].map((status) => (
                                    <button
                                      key={status}
                                      onClick={() => handleUpdateOrderStatus(o.id, status)}
                                      className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase cursor-pointer ${
                                        o.orderStatus === status 
                                          ? "bg-slate-800 text-white" 
                                          : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                                      }`}
                                    >
                                      {status === "confirmed" ? getTranslation("নিশ্চিত", "Confirm") :
                                       status === "delivered" ? getTranslation("ডেলিভার", "Deliver") : getTranslation("বাতিল", "Cancel")}
                                    </button>
                                  ))}

                                  <button
                                    onClick={() => {
                                      setSelectedMemoOrder(o);
                                      setShowMemoModal(true);
                                    }}
                                    className="px-2 py-1 rounded-lg text-[10px] font-black uppercase cursor-pointer bg-emerald-50 hover:bg-emerald-100 text-emerald-700 flex items-center gap-1 transition shadow-sm border border-emerald-200/50"
                                    title="View / Print Memo"
                                  >
                                    <Printer className="w-3 h-3 text-emerald-600" />
                                    <span>{getTranslation("চালান", "Memo")}</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
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
      </div>

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
