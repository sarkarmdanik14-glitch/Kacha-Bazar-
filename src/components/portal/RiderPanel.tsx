import React, { useState, useEffect } from "react";
import { 
  db, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  addDoc, 
  setDoc,
  updateDoc,
  serverTimestamp,
  onSnapshot,
  increment
} from "../../lib/firebase";
import { 
  Bike, CheckCircle, Clock, ShoppingBag, MapPin, 
  DollarSign, RefreshCw, Star, Play, Check, Navigation,
  Smartphone, Bell, Eye, LogOut, ShieldAlert
} from "lucide-react";

import { checkAndRewardReferral } from "../../lib/referral";

interface RiderPanelProps {
  user: any;
  onLogout: () => void;
  lang: "bn" | "en";
  triggerToast: (bn: string, en: string) => void;
}

export default function RiderPanel({ user, onLogout, lang, triggerToast }: RiderPanelProps) {
  if (user?.role !== "rider" && user?.role !== "admin" && user?.role !== "founder") {
    return (
      <div className="p-8 text-center bg-red-50 border border-red-200 rounded-2xl m-4 flex flex-col items-center justify-center space-y-3">
        <p className="text-red-750 font-black text-sm">
          Access Denied. You do not have permission to access this page.
        </p>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState<"dashboard" | "available" | "active" | "history">("dashboard");
  const [riderProfile, setRiderProfile] = useState<any | null>(null);
  const [availableOrders, setAvailableOrders] = useState<any[]>([]);
  const [activeOrder, setActiveOrder] = useState<any | null>(null);
  const [deliveryHistory, setDeliveryHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const getTranslation = (bn: string, en: string) => (lang === "bn" ? bn : en);

  useEffect(() => {
    if (!user?.uid) return;

    // Listen to rider profile info
    const unsubRider = onSnapshot(
      doc(db, "riders", user.uid), 
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setRiderProfile(data);
          
          // Find if they have an active order they are currently delivering
          if (data.currentOrderId) {
            const unsubActiveOrd = onSnapshot(
              doc(db, "orders", data.currentOrderId), 
              (orderSnap) => {
                if (orderSnap.exists()) {
                  setActiveOrder({ id: orderSnap.id, ...orderSnap.data() });
                } else {
                  setActiveOrder(null);
                }
              },
              (err) => console.warn("Rider active order sync notice:", err.message)
            );
            return () => unsubActiveOrd();
          } else {
            setActiveOrder(null);
          }
        }
      },
      (err) => console.warn("Rider profile sync notice:", err.message)
    );

    // Listen to available orders (orders that are "confirmed" or "pending" and have no riderId yet)
    const availableQuery = query(
      collection(db, "orders"),
      where("orderStatus", "==", "confirmed")
    );
    const unsubAvailable = onSnapshot(
      availableQuery, 
      (snapshot) => {
        const ords: any[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (!data.riderId) {
            ords.push({ id: doc.id, ...data });
          }
        });
        setAvailableOrders(ords);
        setLoading(false);
      },
      (err) => {
        console.warn("Rider available orders sync notice:", err.message);
        setLoading(false);
      }
    );

    // Listen to completed deliveries for this rider
    const historyQuery = query(
      collection(db, "orders"),
      where("riderId", "==", user.uid),
      where("orderStatus", "==", "delivered")
    );
    const unsubHistory = onSnapshot(
      historyQuery, 
      (snapshot) => {
        const ords: any[] = [];
        snapshot.forEach((doc) => {
          ords.push({ id: doc.id, ...doc.data() });
        });
        setDeliveryHistory(ords);
      },
      (err) => console.warn("Rider history sync notice:", err.message)
    );

    return () => {
      unsubRider();
      unsubAvailable();
      unsubHistory();
    };
  }, [user]);

  const isRiderActive = riderProfile?.dutyStatus !== "offline";

  const handleToggleStatus = async () => {
    if (!riderProfile) return;
    const isCurrentlyActive = riderProfile.dutyStatus !== "offline";
    const nextStatus = isCurrentlyActive ? "offline" : "active";
    try {
      await updateDoc(doc(db, "riders", user.uid), {
        dutyStatus: nextStatus
      });
      triggerToast(
        `আপনার স্ট্যাটাস এখন ${nextStatus === "active" ? "অনলাইন" : "অফলাইন"}!`,
        `Your status is now ${nextStatus === "active" ? "Online" : "Offline"}!`
      );
    } catch (err) {
      console.error("Error toggling status:", err);
    }
  };

  const handleAcceptOrder = async (orderId: string) => {
    if (riderProfile?.currentOrderId) {
      triggerToast(
        "আপনার ইতিমধ্যে একটি চলমান ডেলিভারি অর্ডার রয়েছে!",
        "You already have an active order in progress!"
      );
      return;
    }

    try {
      // 1. Update order status to "picked up" and bind riderId
      await updateDoc(doc(db, "orders", orderId), {
        riderId: user.uid,
        orderStatus: "picked up",
        riderName: riderProfile?.name || user.displayName
      });

      // 2. Set current order id on rider
      await updateDoc(doc(db, "riders", user.uid), {
        currentOrderId: orderId
      });

      // 3. Create rider notification
      await addDoc(collection(db, "notifications"), {
        userId: user.uid,
        titleBn: "অর্ডার গ্রহণ করা হয়েছে",
        titleEn: "Order Delivery Accepted",
        messageBn: `আপনি অর্ডার #${orderId.slice(-6).toUpperCase()} ডেলিভারি করার জন্য গ্রহণ করেছেন।`,
        messageEn: `You have accepted to deliver Order #${orderId.slice(-6).toUpperCase()}.`,
        isRead: false,
        createdAt: serverTimestamp()
      });

      triggerToast("ডেলিভারি রিকোয়েস্ট সফলভাবে গ্রহণ করা হয়েছে!", "Delivery request accepted successfully!");
      setActiveTab("active");
    } catch (err) {
      console.error("Error accepting order:", err);
    }
  };

  const handleStartDelivery = async () => {
    if (!activeOrder) return;
    try {
      await updateDoc(doc(db, "orders", activeOrder.id), {
        orderStatus: "out for delivery"
      });
      triggerToast(
        "ডেলিভারির যাত্রা শুরু হয়েছে! গন্তব্যের দিকে এগিয়ে যান।",
        "Delivery started! Head towards the customer's location."
      );
    } catch (err) {
      console.error("Error starting delivery:", err);
    }
  };

  const handleCompleteDelivery = async () => {
    if (!activeOrder) return;
    try {
      const deliveryFee = activeOrder.deliveryCharge || 45;

      // 1. Set order as Delivered and payment as Paid
      await updateDoc(doc(db, "orders", activeOrder.id), {
        orderStatus: "delivered",
        paymentStatus: "paid"
      });

      // Trigger referral reward check if applicable
      if (activeOrder.customerId) {
        await checkAndRewardReferral(activeOrder.customerId);
      }

      // 2. Update Rider's balance (they get the delivery fee!) and clean current order
      await updateDoc(doc(db, "riders", user.uid), {
        balance: increment(deliveryFee),
        currentOrderId: ""
      });

      // 3. Create rider earnings transaction
      const txId = "ride_fee_" + activeOrder.id;
      await setDoc(doc(db, "transactions", txId), {
        id: txId,
        userId: user.uid,
        type: "deposit",
        amount: deliveryFee,
        description: getTranslation(
          `অর্ডার #${activeOrder.id.slice(-6).toUpperCase()} এর ডেলিভারি ফি ওয়ালেটে জমা হয়েছে।`,
          `Delivery fee for Order #${activeOrder.id.slice(-6).toUpperCase()} credited to wallet.`
        ),
        createdAt: serverTimestamp(),
        referenceId: activeOrder.id
      });

      // 4. Send notification to the customer
      await addDoc(collection(db, "notifications"), {
        userId: activeOrder.customerId,
        titleBn: "অর্ডার সফলভাবে ডেলিভারি হয়েছে!",
        titleEn: "Order Successfully Delivered!",
        messageBn: `আপনার অর্ডার #${activeOrder.id.slice(-6).toUpperCase()} আমাদের রাইডার সফলভাবে ডেলিভারি করেছেন।`,
        messageEn: `Your Order #${activeOrder.id.slice(-6).toUpperCase()} has been successfully delivered by our rider.`,
        isRead: false,
        createdAt: serverTimestamp()
      });

      triggerToast("ডেলিভারি সফলভাবে সম্পন্ন হয়েছে!", "Delivery marked as successfully completed!");
      setActiveOrder(null);
      setActiveTab("dashboard");
    } catch (err) {
      console.error("Error completing delivery:", err);
    }
  };

  return (
    <div className="w-full bg-slate-50 min-h-screen rounded-3xl overflow-hidden flex flex-col md:flex-row border border-slate-100">
      
      {/* Sidebar Navigation */}
      <div className="w-full md:w-64 bg-slate-900 text-white p-5 shrink-0 flex flex-col justify-between">
        <div>
          {/* Rider profile card */}
          <div className="flex items-center space-x-3 mb-8 pb-5 border-b border-slate-800">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md shrink-0">
              <Bike className="w-5 h-5 animate-bounce" />
            </div>
            <div className="truncate">
              <h3 className="font-black text-white text-sm leading-tight">{riderProfile?.name || "Rider Hero"}</h3>
              <p className="text-[10px] text-emerald-400 font-bold mt-0.5 uppercase tracking-wider">
                {riderProfile?.vehicleType || "Bicycle"}
              </p>
            </div>
          </div>

          <nav className="space-y-1">
            {[
              { id: "dashboard", labelBn: "রাইডার হাব", labelEn: "Rider Hub", icon: <Bike className="w-4 h-4" /> },
              { id: "available", labelBn: "অ্যাভেলেবল অর্ডারস", labelEn: "Available Runs", icon: <ShoppingBag className="w-4 h-4" /> },
              { id: "active", labelBn: "চলমান ডেলিভারি", labelEn: "Active run", icon: <Navigation className="w-4 h-4" /> },
              { id: "history", labelBn: "ডেলিভারি হিস্ট্রি", labelEn: "Delivery Runs Logs", icon: <CheckCircle className="w-4 h-4" /> }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTab === tab.id 
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-950" 
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  {tab.icon}
                  <span>{getTranslation(tab.labelBn, tab.labelEn)}</span>
                </div>
                {tab.id === "available" && availableOrders.length > 0 && (
                  <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                    {availableOrders.length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <button
          onClick={onLogout}
          className="w-full flex items-center space-x-2 px-3.5 py-2.5 text-red-400 hover:bg-slate-800 rounded-xl text-xs font-bold mt-10 transition cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
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
            {/* TAB: DASHBOARD */}
            {activeTab === "dashboard" && (
              <div className="space-y-6 animate-fade-in">
                {/* Rider status and welcome header */}
                <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-black text-slate-800">
                      {getTranslation(`স্বাগতম, ${riderProfile?.name || "রাইডার"}!`, `Welcome, ${riderProfile?.name || "Rider"}!`)}
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      {getTranslation("আপনার এলাকা: চাঁচকৈড় বাজার, গুরুদাশপুর", "Your Region: Chanchkoir Bazar, Gurudaspur")}
                    </p>
                  </div>

                  {/* Online offline switch */}
                  <div className="flex items-center space-x-3 shrink-0">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      {isRiderActive ? "Online to deliver" : "Offline / Sleep"}
                    </span>
                    <button
                      onClick={handleToggleStatus}
                      className={`w-12 h-6 rounded-full p-1 transition duration-300 relative cursor-pointer ${
                        isRiderActive ? "bg-emerald-600" : "bg-slate-300"
                      }`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition duration-300 transform ${
                        isRiderActive ? "translate-x-6" : "translate-x-0"
                      }`}></div>
                    </button>
                  </div>
                </div>

                {/* Rider stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center space-x-3 shadow-sm">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        {getTranslation("রাইডার ব্যালেন্স", "Earnings Wallet")}
                      </p>
                      <h4 className="text-lg font-black text-slate-800 mt-0.5">৳{riderProfile?.balance || 0}</h4>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center space-x-3 shadow-sm">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        {getTranslation("মোট ডেলিভারি", "Deliveries Made")}
                      </p>
                      <h4 className="text-lg font-black text-slate-800 mt-0.5">{deliveryHistory.length}</h4>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center space-x-3 shadow-sm">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                      <Star className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        {getTranslation("রেটিং স্কোর", "Rider Rating")}
                      </p>
                      <h4 className="text-lg font-black text-slate-800 mt-0.5">4.9 ★</h4>
                    </div>
                  </div>
                </div>

                {/* Active run preview if exists */}
                {activeOrder ? (
                  <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl p-5 text-white shadow-lg flex items-center justify-between">
                    <div>
                      <span className="bg-white/20 text-white backdrop-blur-md text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                        Ongoing Delivery Run
                      </span>
                      <h3 className="font-black text-lg mt-2">#{activeOrder.id.slice(-6).toUpperCase()}</h3>
                      <p className="text-xs text-emerald-100 mt-1">{activeOrder.deliveryAddress}</p>
                    </div>
                    <button
                      onClick={() => setActiveTab("active")}
                      className="bg-white text-emerald-700 hover:bg-emerald-50 px-4 py-2 rounded-xl text-xs font-black shadow transition cursor-pointer"
                    >
                      {getTranslation("ম্যাপ ও ট্র্যাকিং", "Open Run Navigator")}
                    </button>
                  </div>
                ) : (
                  <div className="bg-white border border-slate-100 rounded-3xl p-6 text-center text-slate-400 text-xs">
                    <Clock className="w-12 h-12 text-slate-200 mx-auto mb-2" />
                    <p>{getTranslation("কোনো ডেলিভারি রান চলছে না।", "No active run in progress.")}</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB: AVAILABLE ORDERS */}
            {activeTab === "available" && (
              <div className="space-y-4 animate-fade-in">
                <h2 className="text-base font-black text-slate-800">
                  {getTranslation("নিকটবর্তী ডেলিভারি সুযোগসমূহ", "Available Local Delivery Runs")}
                </h2>

                {!isRiderActive ? (
                  <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center text-slate-400 text-xs">
                    <ShieldAlert className="w-12 h-12 text-slate-200 mx-auto mb-2" />
                    <p className="mb-2">{getTranslation("অর্ডার দেখতে অনলাইন স্ট্যাটাস চালু করুন।", "Turn on your Online switch to see local delivery requests.")}</p>
                    <button onClick={handleToggleStatus} className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-xl border border-emerald-100 font-bold transition cursor-pointer">
                      {getTranslation("অনলাইন করুন", "Go Online")}
                    </button>
                  </div>
                ) : availableOrders.length === 0 ? (
                  <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center text-slate-400 text-xs">
                    <ShoppingBag className="w-12 h-12 text-slate-200 mx-auto mb-2" />
                    <p>{getTranslation("এই মুহূর্তে এলাকায় কোনো ডেলিভারি খালি নেই।", "No local delivery runs available at this moment. Stay tuned!")}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {availableOrders.map((ord) => (
                      <div 
                        key={ord.id} 
                        className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
                      >
                        <div className="space-y-1">
                          <span className="font-black text-slate-800 text-sm">#{ord.id.slice(-6).toUpperCase()}</span>
                          <div className="text-xs text-slate-500 font-medium flex items-center space-x-1.5">
                            <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="truncate max-w-sm">{ord.deliveryAddress}</span>
                          </div>
                          <p className="text-[10px] text-slate-400">
                            {getTranslation("ক্রেতা:", "Customer:")} {ord.customerName} • {ord.customerPhone}
                          </p>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-5">
                          <div className="text-left sm:text-right">
                            <span className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider block">{getTranslation("রাইডার ফি", "Rider Fee")}</span>
                            <span className="text-sm font-black text-slate-800">৳{ord.deliveryCharge || 45}</span>
                          </div>
                          <button
                            onClick={() => handleAcceptOrder(ord.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-4 py-2.5 rounded-xl transition shadow-sm cursor-pointer"
                          >
                            {getTranslation("অর্ডার নিন", "Accept Delivery")}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: ACTIVE DELIVERY TRACKER */}
            {activeTab === "active" && (
              <div className="space-y-4 animate-fade-in">
                {!activeOrder ? (
                  <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center text-slate-400 text-xs">
                    <Navigation className="w-12 h-12 text-slate-200 mx-auto mb-2" />
                    <p>{getTranslation("কোনো চলমান ডেলিভারি নেই।", "No active delivery run in progress.")}</p>
                  </div>
                ) : (
                  <div className="bg-white border border-slate-100 rounded-3xl p-5 sm:p-6 shadow-sm space-y-6">
                    <div>
                      <span className="bg-amber-100 text-amber-800 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                        Run Navigator Active
                      </span>
                      <h2 className="text-lg font-black text-slate-800 mt-2">
                        {getTranslation("ডেলিভারি ট্র্যাকিং", "Delivery Run Tracker")} #{activeOrder.id.slice(-6).toUpperCase()}
                      </h2>
                    </div>

                    {/* Step wizard */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 relative">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Pick up products from</span>
                        <h4 className="font-bold text-slate-800 text-xs">কাচা বাজার সোর্সিং ডিপো</h4>
                        <p className="text-[10px] text-slate-500 mt-0.5">চাঁচকৈড় বাজার, গুরুদাশপুর, নাটোর</p>
                      </div>

                      <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 relative">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Deliver products to</span>
                        <h4 className="font-bold text-slate-800 text-xs">{activeOrder.customerName}</h4>
                        <p className="text-[10px] text-slate-500 mt-0.5">{activeOrder.deliveryAddress}</p>
                      </div>
                    </div>

                    {/* Customer phone block */}
                    <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                          <Smartphone className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">{activeOrder.customerName}</p>
                          <span className="text-[10px] font-mono text-slate-500">{activeOrder.customerPhone}</span>
                        </div>
                      </div>
                      <a href={`tel:${activeOrder.customerPhone}`} className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold px-3.5 py-1.5 rounded-xl transition shadow-sm">
                        {getTranslation("কল দিন", "Call Client")}
                      </a>
                    </div>

                    {/* Action button based on run state */}
                    <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">{getTranslation("মোট কালেকশন বিল", "COD Collection Amount")}</span>
                        <span className="text-base font-black text-slate-800">৳{activeOrder.total}</span>
                      </div>

                      {activeOrder.orderStatus === "picked up" ? (
                        <button
                          onClick={handleStartDelivery}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-5 py-3 rounded-xl transition shadow flex items-center space-x-2 cursor-pointer"
                        >
                          <Play className="w-4 h-4 fill-white" />
                          <span>{getTranslation("ডেলিভারি যাত্রা শুরু", "Start Navigation Run")}</span>
                        </button>
                      ) : (
                        <button
                          onClick={handleCompleteDelivery}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-5 py-3 rounded-xl transition shadow flex items-center space-x-2 cursor-pointer"
                        >
                          <Check className="w-4 h-4 stroke-[3px]" />
                          <span>{getTranslation("ডেলিভারি সম্পন্ন করুন", "Complete delivery")}</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: HISTORY LOGS */}
            {activeTab === "history" && (
              <div className="space-y-4 animate-fade-in">
                <h2 className="text-base font-black text-slate-800">
                  {getTranslation("ডেলিভারির ইতিহাস", "Delivered Runs History")}
                </h2>
                {deliveryHistory.length === 0 ? (
                  <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center text-slate-400 text-xs">
                    <CheckCircle className="w-12 h-12 text-slate-200 mx-auto mb-2" />
                    <p>{getTranslation("আপনি এখনও কোনো অর্ডার ডেলিভারি করেননি।", "No delivery history log recorded yet.")}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {deliveryHistory.map((ord) => (
                      <div key={ord.id} className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                        <div>
                          <span className="font-black text-slate-800 text-xs">#{ord.id.slice(-6).toUpperCase()}</span>
                          <p className="text-[10px] text-slate-400 mt-1">{ord.deliveryAddress}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] text-emerald-600 font-bold uppercase block tracking-wider">Earned</span>
                          <span className="font-black text-slate-800 text-xs">+৳{ord.deliveryCharge || 45}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </>
        )}
      </div>

    </div>
  );
}
