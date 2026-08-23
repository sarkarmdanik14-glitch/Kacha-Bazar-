import React, { useState, useEffect, useRef } from "react";
import { 
  db, 
  auth,
  storage,
  ref,
  uploadBytes,
  getDownloadURL,
  updateProfile,
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  addDoc, 
  updateDoc,
  serverTimestamp,
  increment,
  onSnapshot
} from "../../lib/firebase";
import { 
  User, CreditCard, ShoppingBag, Gift, MapPin, 
  ArrowUpRight, ArrowDownLeft, Clock, CheckCircle, 
  ShieldAlert, RefreshCw, Star, Share2, Clipboard, 
  Smartphone, Bell, Eye, LogOut, ChevronRight, Printer,
  Camera, Trash2, Save, Edit3, Lock, Mail, Phone, ShieldCheck
} from "lucide-react";
import OrderMemoModal from "./OrderMemoModal";


interface CustomerPortalProps {
  user: any;
  onLogout: () => void;
  lang: "bn" | "en";
  triggerToast: (bn: string, en: string) => void;
  initialTab?: "dashboard" | "orders" | "wallet" | "referral" | "notifications";
}

export default function CustomerPortal({ user, onLogout, lang, triggerToast, initialTab }: CustomerPortalProps) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "orders" | "wallet" | "referral" | "notifications">(initialTab || "dashboard");

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [orders, setOrders] = useState<any[]>([]);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [referralStats, setReferralStats] = useState({ count: 0, earnings: 0 });
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [showMemoModal, setShowMemoModal] = useState<boolean>(false);
  const [refundReason, setRefundReason] = useState<string>("");
  const [showRefundForm, setShowRefundForm] = useState<boolean>(false);
  const [profileAddress, setProfileAddress] = useState<string>(user.address || "");
  const [loading, setLoading] = useState<boolean>(true);
  const [dbUser, setDbUser] = useState<any>(user);
  const [verifying, setVerifying] = useState<boolean>(false);

  // Profile editing states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [displayNameInput, setDisplayNameInput] = useState<string>(user?.displayName || dbUser?.displayName || "");
  const [photoUrlInput, setPhotoUrlInput] = useState<string>(user?.photoURL || dbUser?.photoURL || "");
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);

  useEffect(() => {
    if (dbUser) {
      if (dbUser.displayName) {
        setDisplayNameInput(dbUser.displayName);
      }
      if (dbUser.photoURL !== undefined) {
        setPhotoUrlInput(dbUser.photoURL || "");
      }
    }
  }, [dbUser?.displayName, dbUser?.photoURL]);

  const handleSaveProfile = async () => {
    const trimmedName = displayNameInput.trim();
    if (!trimmedName || trimmedName.length < 2) {
      triggerToast(
        "অনুগ্রহ করে সঠিক নাম লিখুন (কমপক্ষে ২ অক্ষর)",
        "Please enter a valid display name (at least 2 characters)"
      );
      return;
    }

    setIsSavingProfile(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        displayName: trimmedName,
        photoURL: photoUrlInput,
        updatedAt: serverTimestamp()
      });

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: trimmedName,
          photoURL: photoUrlInput || ""
        });
      }

      setDbUser((prev: any) => ({
        ...prev,
        displayName: trimmedName,
        photoURL: photoUrlInput
      }));

      triggerToast(
        "প্রোফাইল তথ্য সফলভাবে আপডেট করা হয়েছে!",
        "Profile updated successfully!"
      );
    } catch (err: any) {
      console.error("Error updating profile:", err);
      triggerToast(
        "প্রোফাইল আপডেট করতে সমস্যা হয়েছে: " + (err.message || ""),
        "Failed to update profile: " + (err.message || "")
      );
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      triggerToast(
        "ছবির সাইজ ৫ মেগাবাইটের কম হতে হবে",
        "Image size must be less than 5MB"
      );
      return;
    }

    setIsUploadingPhoto(true);
    try {
      let downloadURL = "";
      try {
        const fileExt = file.name.split(".").pop() || "jpg";
        const storagePath = `users/${user.uid}/profile_${Date.now()}.${fileExt}`;
        const imageRef = ref(storage, storagePath);
        const snapshot = await uploadBytes(imageRef, file);
        downloadURL = await getDownloadURL(snapshot.ref);
      } catch (storageErr) {
        console.warn("Storage upload notice (falling back to Data URL):", storageErr);
        downloadURL = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }

      setPhotoUrlInput(downloadURL);

      await updateDoc(doc(db, "users", user.uid), {
        photoURL: downloadURL,
        updatedAt: serverTimestamp()
      });

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          photoURL: downloadURL
        });
      }

      setDbUser((prev: any) => ({
        ...prev,
        photoURL: downloadURL
      }));

      triggerToast(
        "প্রোফাইল ছবি সফলভাবে আপডেট করা হয়েছে!",
        "Profile picture updated successfully!"
      );
    } catch (err: any) {
      console.error("Error uploading photo:", err);
      triggerToast(
        "ছবি আপলোড করতে সমস্যা হয়েছে!",
        "Failed to upload photo!"
      );
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!confirm(getTranslation("আপনি কি নিশ্চিত আপনার প্রোফাইল ছবি মুছে ফেলতে চান?", "Are you sure you want to remove your profile picture?"))) return;

    setIsUploadingPhoto(true);
    try {
      setPhotoUrlInput("");
      await updateDoc(doc(db, "users", user.uid), {
        photoURL: "",
        updatedAt: serverTimestamp()
      });

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          photoURL: ""
        });
      }

      setDbUser((prev: any) => ({
        ...prev,
        photoURL: ""
      }));

      triggerToast(
        "প্রোফাইল ছবি সফলভাবে মুছে ফেলা হয়েছে!",
        "Profile picture removed successfully!"
      );
    } catch (err: any) {
      console.error("Error removing photo:", err);
      triggerToast(
        "ছবি মুছে ফেলতে সমস্যা হয়েছে!",
        "Failed to remove photo!"
      );
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const getTranslation = (bn: string, en: string) => (lang === "bn" ? bn : en);

  useEffect(() => {
    if (!user?.uid) return;

    // Listen to real-time User details
    const unsubUser = onSnapshot(
      doc(db, "users", user.uid), 
      (docSnap) => {
        if (docSnap.exists()) {
          setDbUser(docSnap.data());
        }
      },
      (err) => console.warn("Customer user sync notice:", err.message)
    );

    // Listen to orders
    const ordersQuery = query(
      collection(db, "orders"),
      where("customerId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    const unsubOrders = onSnapshot(ordersQuery, (snapshot) => {
      const ords: any[] = [];
      snapshot.forEach((doc) => {
        ords.push({ id: doc.id, ...doc.data() });
      });
      setOrders(ords);
      setLoading(false);
    }, (err) => {
      console.warn("Error reading customer orders:", err.message);
      // Fallback with empty if not permitted
      setOrders([]);
      setLoading(false);
    });

    // Listen to Wallet balance & transactions
    const unsubWallet = onSnapshot(
      doc(db, "wallet", user.uid), 
      (docSnap) => {
        if (docSnap.exists()) {
          setWalletBalance(docSnap.data().balance || 0);
        }
      },
      (err) => console.warn("Customer wallet sync notice:", err.message)
    );

    const txQuery = query(
      collection(db, "transactions"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    const unsubTx = onSnapshot(
      txQuery, 
      (snapshot) => {
        const txs: any[] = [];
        snapshot.forEach((doc) => {
          txs.push({ id: doc.id, ...doc.data() });
        });
        setTransactions(txs);
      },
      (err) => console.warn("Customer tx sync notice:", err.message)
    );

    // Listen to notifications
    const notifyQuery = query(
      collection(db, "notifications"),
      where("userId", "in", [user.uid, "all"]),
      orderBy("createdAt", "desc")
    );
    const unsubNotify = onSnapshot(
      notifyQuery, 
      (snapshot) => {
        const notifs: any[] = [];
        snapshot.forEach((doc) => {
          notifs.push({ id: doc.id, ...doc.data() });
        });
        setNotifications(notifs);
      },
      (err) => console.warn("Customer notifications sync notice:", err.message)
    );

    // Listen to referrals
    const refQuery = query(
      collection(db, "referrals"),
      where("referrerId", "==", user.uid)
    );
    const unsubRef = onSnapshot(
      refQuery, 
      (snapshot) => {
        const refs: any[] = [];
        let earnings = 0;
        snapshot.forEach((doc) => {
          refs.push(doc.data());
          if (doc.data().bonusPaid) {
            earnings += 50; // 50 TK per referral
          }
        });
        setReferralStats({ count: refs.length, earnings });
      },
      (err) => console.warn("Customer referrals sync notice:", err.message)
    );

    return () => {
      unsubUser();
      unsubOrders();
      unsubWallet();
      unsubTx();
      unsubNotify();
      unsubRef();
    };
  }, [user]);

  const getReferralCode = () => dbUser?.referralCode || user?.referralCode || "KACHA50";

  const getReferralLink = () => {
    const code = getReferralCode();
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}?ref=${code}`;
  };

  const copyReferralCode = () => {
    const code = getReferralCode();
    try {
      navigator.clipboard.writeText(code);
    } catch (e) {}
    triggerToast(
      `রেফারেল কোড "${code}" কপি করা হয়েছে!`,
      `Referral code "${code}" copied to clipboard!`
    );
  };

  const copyReferralLink = () => {
    const link = getReferralLink();
    try {
      navigator.clipboard.writeText(link);
    } catch (e) {}
    triggerToast(
      "রেফারেল লিংক কপি করা হয়েছে!",
      "Referral link copied to clipboard!"
    );
  };

  const handleShareLink = async () => {
    const code = getReferralCode();
    const link = getReferralLink();
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: getTranslation("কাঁচা বাজার রেফারেল লিংক", "Kacha Bazar Referral Link"),
          text: getTranslation(
            `কাঁচা বাজার-এ সাইন আপ করে রিওয়ার্ড জিতুন! রেফারেল কোড: ${code}`,
            `Join Kacha Bazar and earn rewards! Use my referral code: ${code}`
          ),
          url: link,
        });
      } catch (err) {
        if ((err as Error)?.name !== "AbortError") {
          copyReferralLink();
        }
      }
    } else {
      copyReferralLink();
    }
  };

  const updateAddress = async () => {
    try {
      await updateDoc(doc(db, "users", user.uid), {
        address: profileAddress
      });
      triggerToast(
        "ডেলিভারি ঠিকানা সফলভাবে আপডেট করা হয়েছে!",
        "Delivery address successfully updated!"
      );
    } catch (err) {
      console.error("Error updating address:", err);
    }
  };

  const handleVerifyAccount = async () => {
    setVerifying(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        isVerified: true
      });
      triggerToast(
        "আপনার অ্যাকাউন্ট সফলভাবে ভেরিফাই করা হয়েছে!",
        "Your account has been successfully verified!"
      );
      const { checkAndRewardReferral } = await import("../../lib/referral");
      await checkAndRewardReferral(user.uid);
    } catch (err) {
      console.error("Error verifying account:", err);
      triggerToast(
        "ভেরিফিকেশন ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।",
        "Verification failed. Please try again."
      );
    } finally {
      setVerifying(false);
    }
  };

  const handleClaimRefund = async (order: any) => {
    if (!refundReason) return;
    try {
      // Set orderStatus to refund_requested, do not change paymentStatus directly from client
      await updateDoc(doc(db, "orders", order.id), {
        orderStatus: "refund_requested",
        refundReason: refundReason
      });

      // Send system notification to admins
      await addDoc(collection(db, "notifications"), {
        userId: "admin-default",
        titleBn: "রিফান্ড আবেদন",
        titleEn: "Refund Request",
        messageBn: `অর্ডার #${order.id.slice(-6).toUpperCase()} এর জন্য রিফান্ড আবেদন জমা পড়েছে। কারণ: ${refundReason}`,
        messageEn: `A refund request has been submitted for Order #${order.id.slice(-6).toUpperCase()}. Reason: ${refundReason}`,
        isRead: false,
        createdAt: serverTimestamp()
      });

      setSelectedOrder(null);
      setShowRefundForm(false);
      setRefundReason("");
      triggerToast(
        "রিফান্ড আবেদন সফলভাবে জমা দেয়া হয়েছে! অ্যাডমিন এটি যাচাই করে সম্পন্ন করবেন।",
        "Refund request submitted successfully! Admin will verify and process your refund shortly."
      );
    } catch (err) {
      console.error("Error claiming refund:", err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "pending": return "bg-amber-100 text-amber-700";
      case "confirmed": return "bg-blue-100 text-blue-700";
      case "picked up": return "bg-purple-100 text-purple-700";
      case "out for delivery": return "bg-indigo-100 text-indigo-700";
      case "delivered": return "bg-emerald-100 text-emerald-700";
      case "refunded": return "bg-red-100 text-red-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className="w-full bg-slate-50 min-h-screen rounded-3xl overflow-hidden flex flex-col md:flex-row border border-slate-100">
      
      {/* Sidebar Navigation */}
      <div className="w-full md:w-64 bg-white border-r border-slate-100 p-5 shrink-0 flex flex-col justify-between">
        <div>
          {/* Customer Avatar & Profile info */}
          <div className="flex items-center space-x-3 mb-8 pb-5 border-b border-slate-100">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold overflow-hidden border border-slate-200 shrink-0">
              {photoUrlInput || dbUser?.photoURL || user?.photoURL ? (
                <img 
                  src={photoUrlInput || dbUser?.photoURL || user?.photoURL} 
                  alt={dbUser?.displayName || user?.displayName} 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <User className="w-5 h-5 text-emerald-600" />
              )}
            </div>
            <div className="truncate">
              <h3 className="font-black text-slate-800 text-sm leading-tight">{dbUser?.displayName || user?.displayName}</h3>
              <p className="text-[10px] text-slate-400 mt-0.5 font-bold uppercase tracking-wider">{dbUser?.role || user?.role || "customer"}</p>
            </div>
          </div>

          <nav className="space-y-1.5">
            {[
              { id: "dashboard", labelBn: "ড্যাশবোর্ড", labelEn: "Dashboard", icon: <User className="w-4 h-4" /> },
              { id: "orders", labelBn: "অর্ডার ট্র্যাকিং", labelEn: "Order Tracking", icon: <ShoppingBag className="w-4 h-4" /> },
              { id: "wallet", labelBn: "আমার ওয়ালেট", labelEn: "My Wallet", icon: <CreditCard className="w-4 h-4" /> },
              { id: "referral", labelBn: "রেফার অ্যান্ড আর্ন", labelEn: "Refer & Earn", icon: <Gift className="w-4 h-4" /> },
              { id: "notifications", labelBn: "নোটিফিকেশনস", labelEn: "Notifications", icon: <Bell className="w-4 h-4" /> }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setSelectedOrder(null);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTab === tab.id 
                    ? "bg-emerald-50 text-emerald-700" 
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  {tab.icon}
                  <span>{getTranslation(tab.labelBn, tab.labelEn)}</span>
                </div>
                {tab.id === "notifications" && notifications.filter(n => !n.isRead).length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <button
          onClick={onLogout}
          className="w-full flex items-center space-x-2 px-3.5 py-2.5 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold mt-10 transition cursor-pointer"
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
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl p-6 text-white shadow-lg shadow-emerald-50 relative overflow-hidden">
                  <div className="absolute right-0 bottom-0 opacity-10 translate-x-10 translate-y-10">
                    <ShoppingBag className="w-64 h-64" />
                  </div>
                  <h2 className="text-xl font-black mb-1">
                    {getTranslation(`স্বাগতম, ${dbUser?.displayName || user?.displayName}!`, `Welcome back, ${dbUser?.displayName || user?.displayName}!`)}
                  </h2>
                  <p className="text-xs text-emerald-100">
                    {getTranslation("আজকে কি তাজা পণ্য অর্ডার করছেন?", "What fresh products are we delivering today?")}
                  </p>
                </div>

                {/* Grid Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center space-x-3 shadow-sm">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        {getTranslation("মোট অর্ডার", "Total Orders")}
                      </p>
                      <h4 className="text-lg font-black text-slate-800 mt-0.5">{orders.length}</h4>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center space-x-3 shadow-sm">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        {getTranslation("ওয়ালেট ব্যালেন্স", "Wallet Balance")}
                      </p>
                      <h4 className="text-lg font-black text-slate-800 mt-0.5">৳{walletBalance}</h4>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center space-x-3 shadow-sm">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                      <Gift className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        {getTranslation("রেফারেল ইনকাম", "Referral Earnings")}
                      </p>
                      <h4 className="text-lg font-black text-slate-800 mt-0.5">৳{referralStats.earnings}</h4>
                    </div>
                  </div>
                </div>

                {/* Delivery Address Configuration */}
                <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
                  <h3 className="font-black text-sm text-slate-800 flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    <span>{getTranslation("ডিফল্ট ডেলিভারি ঠিকানা", "Default Delivery Address")}</span>
                  </h3>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={profileAddress}
                      onChange={(e) => setProfileAddress(e.target.value)}
                      placeholder={getTranslation("আপনার সম্পূর্ণ ঠিকানা লিখুন", "Enter your full delivery address")}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:bg-white outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <button
                      onClick={updateAddress}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      {getTranslation("সংরক্ষণ", "Save")}
                    </button>
                  </div>
                </div>

                {/* Account Verification Status Card */}
                <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-sm text-slate-800 flex items-center space-x-2">
                      <ShieldAlert className="w-4 h-4 text-emerald-600" />
                      <span>{getTranslation("অ্যাকাউন্ট ভেরিফিকেশন", "Account Verification")}</span>
                    </h3>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                      dbUser?.isVerified 
                        ? "bg-emerald-100 text-emerald-800" 
                        : "bg-amber-100 text-amber-800"
                    }`}>
                      {dbUser?.isVerified 
                        ? getTranslation("ভেরিফাইড ✓", "Verified ✓") 
                        : getTranslation("আনভেরিফাইড", "Unverified")}
                    </span>
                  </div>
                  
                  {!dbUser?.isVerified ? (
                    <div className="space-y-3 bg-amber-50/50 border border-amber-100 rounded-xl p-4">
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {getTranslation(
                          "রেফারেল বোনাস এবং অন্যান্য সুবিধা পেতে অনুগ্রহ করে আপনার অ্যাকাউন্টটি ভেরিফাই করুন।",
                          "Please verify your account to unlock referral rewards and additional platform benefits."
                        )}
                      </p>
                      <button
                        onClick={handleVerifyAccount}
                        disabled={verifying}
                        className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                      >
                        {verifying ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        <span>{getTranslation("অ্যাকাউন্ট ভেরিফাই করুন", "Verify Account Now")}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                        <CheckCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-emerald-800">
                          {getTranslation("আপনার অ্যাকাউন্টটি ভেরিফাইড!", "Your Account is Verified!")}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {getTranslation("সব সুবিধা সচল আছে।", "All benefits are active.")}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Personal Profile Settings Card (Customer Profile Editing) */}
                <div className="bg-white border border-slate-100 rounded-2xl p-5 sm:p-6 shadow-sm space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                        <Edit3 className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-black text-sm text-slate-800">
                          {getTranslation("ব্যক্তিগত প্রোফাইল তথ্য সম্পাদনা", "Personal Profile Settings")}
                        </h3>
                        <p className="text-[11px] text-slate-400 font-medium">
                          {getTranslation("আপনার নাম ও প্রোফাইল ছবি সম্পাদনা করুন", "Update display name and manage avatar image")}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Avatar & Photo Upload / Remove */}
                  <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6 bg-slate-50/70 p-4 rounded-xl border border-slate-100">
                    <div className="relative group shrink-0">
                      <div className="w-20 h-20 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xl overflow-hidden border-2 border-white shadow-sm">
                        {photoUrlInput || dbUser?.photoURL || user?.photoURL ? (
                          <img 
                            src={photoUrlInput || dbUser?.photoURL || user?.photoURL} 
                            alt={displayNameInput || "Profile"} 
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <User className="w-10 h-10 text-emerald-600" />
                        )}
                      </div>
                      {isUploadingPhoto && (
                        <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center text-white">
                          <RefreshCw className="w-6 h-6 animate-spin" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 text-center sm:text-left space-y-2">
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                        <input 
                          type="file" 
                          ref={fileInputRef}
                          onChange={handlePhotoUpload}
                          accept="image/*"
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploadingPhoto}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>{getTranslation("ছবি পরিবর্তন করুন", "Change Photo")}</span>
                        </button>

                        {(photoUrlInput || dbUser?.photoURL || user?.photoURL) && (
                          <button
                            type="button"
                            onClick={handleRemovePhoto}
                            disabled={isUploadingPhoto}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{getTranslation("ছবি মুছুন", "Remove Photo")}</span>
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {getTranslation("সর্বোচ্চ ফাইল সাইজ: ৫ মেগাবাইট (JPG, PNG, WebP)", "Max file size: 5MB (JPG, PNG, WebP)")}
                      </p>
                    </div>
                  </div>

                  {/* Display Name Edit Form */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        {getTranslation("ডিসপ্লে নাম / পূর্ণ নাম", "Display Name / Full Name")} <span className="text-red-500">*</span>
                      </label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={displayNameInput}
                          onChange={(e) => setDisplayNameInput(e.target.value)}
                          placeholder={getTranslation("আপনার পূর্ণ নাম লিখুন", "Enter your full display name")}
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:bg-white outline-none focus:ring-1 focus:ring-emerald-500 font-medium text-slate-800"
                        />
                        <button
                          type="button"
                          onClick={handleSaveProfile}
                          disabled={isSavingProfile}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 shrink-0"
                        >
                          {isSavingProfile ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Save className="w-3.5 h-3.5" />
                          )}
                          <span>{getTranslation("নাম সংরক্ষণ করুন", "Save Name")}</span>
                        </button>
                      </div>
                    </div>

                    {/* Read-Only Account Information */}
                    <div className="pt-3 border-t border-slate-100 space-y-3">
                      <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                        <Lock className="w-3 h-3 text-slate-400" />
                        <span>{getTranslation("অপরিবর্তনীয় তথ্য (Read-Only Fields)", "Read-Only Account Details")}</span>
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Email */}
                        <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex items-center space-x-1">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span>{getTranslation("ইমেইল এড্রেস", "Email Address")}</span>
                          </span>
                          <p className="text-xs font-bold text-slate-700 truncate">
                            {dbUser?.email || user?.email || "N/A"}
                          </p>
                        </div>

                        {/* Phone */}
                        <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex items-center space-x-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{getTranslation("মোবাইল নম্বর", "Phone Number")}</span>
                          </span>
                          <p className="text-xs font-bold text-slate-700 truncate">
                            {dbUser?.phone || user?.phone || user?.phoneNumber || getTranslation("সংযুক্ত নয়", "Not linked")}
                          </p>
                        </div>

                        {/* User ID (UID) */}
                        <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex items-center space-x-1">
                            <User className="w-3 h-3 text-slate-400" />
                            <span>{getTranslation("ইউজার আইডি (UID)", "User ID (UID)")}</span>
                          </span>
                          <p className="text-xs font-mono font-bold text-slate-600 truncate">
                            {user?.uid || "N/A"}
                          </p>
                        </div>

                        {/* Account Role & Status */}
                        <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex items-center space-x-1">
                              <ShieldCheck className="w-3 h-3 text-slate-400" />
                              <span>{getTranslation("অ্যাকাউন্ট রোল ও স্ট্যাটাস", "Role & Account Status")}</span>
                            </span>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-bold text-slate-800 uppercase">
                                {dbUser?.role || user?.role || "Customer"}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                dbUser?.isVerified ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                              }`}>
                                {dbUser?.isVerified ? getTranslation("ভেরিফাইড", "Verified") : getTranslation("এক্টিভ", "Active")}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Orders List snippet */}
                <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-sm text-slate-800">
                      {getTranslation("সাম্প্রতিক অর্ডারসমূহ", "Recent Orders")}
                    </h3>
                    <button 
                      onClick={() => setActiveTab("orders")}
                      className="text-emerald-600 text-xs font-bold hover:underline"
                    >
                      {getTranslation("সব দেখুন", "View All")}
                    </button>
                  </div>

                  {orders.length === 0 ? (
                    <p className="text-slate-400 text-xs text-center py-6">
                      {getTranslation("আপনি এখনও কোনো অর্ডার করেননি!", "You haven't placed any orders yet!")}
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {orders.slice(0, 3).map((order) => (
                        <div key={order.id} className="py-3 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-black text-slate-800">#{order.id.slice(-6).toUpperCase()}</span>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {new Date(order.createdAt?.seconds * 1000 || Date.now()).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center space-x-3">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${getStatusColor(order.orderStatus)}`}>
                              {order.orderStatus}
                            </span>
                            <span className="font-black text-slate-800">৳{order.total}</span>
                            <button
                              onClick={() => {
                                setSelectedOrder(order);
                                setActiveTab("orders");
                              }}
                              className="p-1 text-slate-400 hover:text-emerald-600 transition"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Logout Button Block at the bottom of Customer Profile */}
                <div className="bg-white border border-red-100 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h4 className="font-black text-sm text-slate-800">
                      {getTranslation("অ্যাকাউন্ট থেকে লগআউট", "Account Logout")}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {getTranslation("অ্যাকাউন্ট সেশন থেকে নিরাপদে বের হয়ে যান", "Safely sign out from your customer account session")}
                    </p>
                  </div>
                  <button
                    onClick={onLogout}
                    className="w-full sm:w-auto bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 cursor-pointer shrink-0"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{getTranslation("লগআউট করুন", "Logout")}</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB: ORDERS & DETAILED TRACKING */}
            {activeTab === "orders" && (
              <div className="space-y-4">
                {!selectedOrder ? (
                  <>
                    <h2 className="text-lg font-black text-slate-800 mb-2">
                      {getTranslation("আপনার অর্ডারসমূহ", "Your Active Orders")}
                    </h2>
                    {orders.length === 0 ? (
                      <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center text-slate-400 text-xs">
                        <ShoppingBag className="w-12 h-12 mx-auto text-slate-200 mb-3" />
                        <p>{getTranslation("কোনো অর্ডার রেকর্ড নেই।", "No order records available.")}</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3">
                        {orders.map((order) => (
                          <div 
                            key={order.id} 
                            onClick={() => setSelectedOrder(order)}
                            className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:border-emerald-200 transition shadow-sm"
                          >
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600 shrink-0">
                                <ShoppingBag className="w-5 h-5" />
                              </div>
                              <div>
                                <span className="font-black text-slate-800 text-sm">#{order.id.slice(-6).toUpperCase()}</span>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  {new Date(order.createdAt?.seconds * 1000 || Date.now()).toLocaleString()}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-5">
                              <div className="text-left sm:text-right">
                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                                  {getTranslation("মোট বিল", "Total Bill")}
                                </p>
                                <span className="font-black text-slate-800 text-sm">৳{order.total}</span>
                              </div>
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${getStatusColor(order.orderStatus)}`}>
                                {order.orderStatus}
                              </span>
                              {(order.orderStatus?.toLowerCase() === "delivered" || order.orderStatus?.toLowerCase() === "completed") && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedOrder(order);
                                    setShowMemoModal(true);
                                  }}
                                  className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/40 text-[10px] font-black uppercase transition shrink-0 flex items-center gap-1 cursor-pointer shadow-sm"
                                  title="View / Print Memo"
                                >
                                  <Printer className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>{getTranslation("মেমো", "View Memo")}</span>
                                </button>
                              )}
                              <ChevronRight className="w-5 h-5 text-slate-400 hidden sm:block" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  // Detailed order invoice & tracking view
                  <div className="bg-white border border-slate-100 rounded-3xl p-5 sm:p-6 shadow-sm space-y-6">
                    <div className="flex items-center justify-between">
                      <button 
                        onClick={() => {
                          setSelectedOrder(null);
                          setShowRefundForm(false);
                        }}
                        className="text-emerald-600 text-xs font-bold hover:underline flex items-center space-x-1.5"
                      >
                        <ChevronRight className="w-4 h-4 rotate-180" />
                        <span>{getTranslation("তালিকায় ফিরুন", "Back to Orders")}</span>
                      </button>

                      <button
                        onClick={() => setShowMemoModal(true)}
                        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-black px-3.5 py-1.5 rounded-xl border border-emerald-200/50 flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{getTranslation("মেমো ডাউনলোড / প্রিন্ট", "View/Download Memo")}</span>
                      </button>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-4">
                      <div>
                        <h2 className="text-base font-black text-slate-800">
                          {getTranslation("অর্ডার চালান", "Order Invoice")} #{selectedOrder.id.slice(-6).toUpperCase()}
                        </h2>
                        <p className="text-[10px] text-slate-400 mt-1">
                          {getTranslation("তারিখ:", "Issued Date:")} {new Date(selectedOrder.createdAt?.seconds * 1000 || Date.now()).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${getStatusColor(selectedOrder.orderStatus)}`}>
                          {selectedOrder.orderStatus}
                        </span>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded-lg font-bold">
                          {selectedOrder.paymentMethod}
                        </span>
                      </div>
                    </div>

                    {/* Order progress stepper */}
                    <div className="py-2">
                      <h4 className="text-xs font-black text-slate-500 mb-3 tracking-wide uppercase">
                        {getTranslation("লাইভ ট্র্যাকিং স্ট্যাটাস", "Live Tracking Status")}
                      </h4>
                      <div className="flex items-center justify-between relative">
                        {/* progress line */}
                        <div className="absolute left-4 right-4 h-0.5 bg-slate-100 -z-10 top-3"></div>
                        {[
                          { key: "pending", bn: "পেন্ডিং", en: "Pending" },
                          { key: "confirmed", bn: "নিশ্চিত", en: "Confirmed" },
                          { key: "picked up", bn: "পিকড আপ", en: "Picked Up" },
                          { key: "out for delivery", bn: "ডেলিভারি চলছে", en: "On Way" },
                          { key: "delivered", bn: "ডেলিভারড", en: "Delivered" }
                        ].map((step, idx) => {
                          const steps = ["pending", "confirmed", "picked up", "out for delivery", "delivered"];
                          const currentIdx = steps.indexOf(selectedOrder.orderStatus?.toLowerCase());
                          const isDone = idx <= currentIdx && selectedOrder.orderStatus !== "refunded";
                          return (
                            <div key={step.key} className="flex flex-col items-center">
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 ${
                                isDone 
                                  ? "bg-emerald-600 border-emerald-600 text-white" 
                                  : "bg-white border-slate-200 text-slate-400"
                              }`}>
                                {idx + 1}
                              </span>
                              <span className="text-[8px] sm:text-[10px] font-bold text-slate-500 mt-1.5 text-center">
                                {getTranslation(step.bn, step.en)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Order items lists */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-black text-slate-500 tracking-wide uppercase">
                        {getTranslation("পণ্য তালিকা", "Itemized Products")}
                      </h4>
                      <div className="bg-slate-50 rounded-2xl p-3.5 space-y-2">
                        {selectedOrder.items?.map((item: any, idx: number) => {
                          const itemPrice = item.selectedOption ? item.selectedOption.price : item.product.price;
                          const optionLabel = item.selectedOption ? ` (${item.selectedOption.value}${item.selectedOption.unit})` : "";
                          return (
                            <div key={idx} className="flex items-center justify-between text-xs py-1">
                              <span className="text-slate-700 font-medium">
                                {getTranslation(item.product.nameBn, item.product.nameEn)}{optionLabel} <span className="text-slate-400 font-bold ml-1">x{item.quantity}</span>
                              </span>
                              <span className="font-black text-slate-800">৳{itemPrice * item.quantity}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Breakdown */}
                    <div className="border-t border-slate-100 pt-4 space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-500">
                        <span>{getTranslation("উপমোট", "Subtotal")}</span>
                        <span>৳{selectedOrder.subtotal}</span>
                      </div>
                      {selectedOrder.discount > 0 && (
                        <div className="flex justify-between text-red-600">
                          <span>{getTranslation("ছাড়", "Discount")}</span>
                          <span>-৳{selectedOrder.discount}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-slate-500">
                        <span>{getTranslation("ডেলিভারি চার্জ", "Delivery Charge")}</span>
                        <span>৳{selectedOrder.deliveryCharge}</span>
                      </div>
                      <div className="flex justify-between text-slate-800 font-black text-sm pt-2 border-t border-dashed border-slate-100">
                        <span>{getTranslation("সর্বমোট বিল", "Total Bill")}</span>
                        <span className="text-emerald-700">৳{selectedOrder.total}</span>
                      </div>
                    </div>

                    {/* Refund Claim panel if order is delivered */}
                    {selectedOrder.orderStatus?.toLowerCase() === "delivered" && (
                      <div className="bg-orange-50/50 border border-orange-100 rounded-2xl p-4 mt-6">
                        {!showRefundForm ? (
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                              <h4 className="text-xs font-black text-orange-800">
                                {getTranslation("পণ্যে কোনো সমস্যা পেয়েছেন?", "Found issues with items?")}
                              </h4>
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                {getTranslation("২৪ ঘণ্টার মধ্যে ওয়ালেটে ইনস্ট্যান্ট রিফান্ড ক্লেইম করুন।", "Claim an instant wallet refund within 24 hours of delivery.")}
                              </p>
                            </div>
                            <button
                              onClick={() => setShowRefundForm(true)}
                              className="bg-orange-600 hover:bg-orange-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0"
                            >
                              {getTranslation("রিফান্ড ক্লেইম করুন", "Claim Wallet Refund")}
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <h4 className="text-xs font-black text-orange-800">
                              {getTranslation("রিফান্ডের কারণ উল্লেখ করুন", "Specify Refund Reason")}
                            </h4>
                            <textarea
                              value={refundReason}
                              onChange={(e) => setRefundReason(e.target.value)}
                              placeholder={getTranslation("যেমন: সবজি পচা ছিল বা ভুল পণ্য দেয়া হয়েছে...", "e.g., rotten vegetables, wrong item delivered...")}
                              className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs outline-none focus:border-orange-500"
                              rows={2}
                            />
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => setShowRefundForm(false)}
                                className="text-slate-500 text-xs font-bold px-3 py-1.5"
                              >
                                {getTranslation("বাতিল", "Cancel")}
                              </button>
                              <button
                                onClick={() => handleClaimRefund(selectedOrder)}
                                disabled={!refundReason}
                                className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white px-4 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer"
                              >
                                {getTranslation("রিফান্ড নিশ্চিত করুন", "Confirm Refund")}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                )}
              </div>
            )}

            {/* TAB: WALLET */}
            {activeTab === "wallet" && (
              <div className="space-y-6">
                {/* Credit wallet card */}
                <div className="bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-800 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
                  <div className="absolute right-0 bottom-0 opacity-10 translate-x-8 translate-y-8 rotate-12">
                    <CreditCard className="w-48 h-48" />
                  </div>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] text-emerald-200 font-bold uppercase tracking-wider">
                        {getTranslation("ডিজিটাল কাস্টমার ওয়ালেট", "Digital Customer Wallet")}
                      </p>
                      <h3 className="text-3xl font-black mt-2">৳{walletBalance}</h3>
                    </div>
                    <span className="bg-white/10 backdrop-blur-md text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                      Active Balance
                    </span>
                  </div>

                  <div className="mt-8 flex justify-between text-[11px] text-emerald-200">
                    <div>
                      <span>CARD HOLDER</span>
                      <p className="font-bold text-white uppercase mt-0.5">{user.displayName}</p>
                    </div>
                    <div className="text-right">
                      <span>WALLET ID</span>
                      <p className="font-mono text-white mt-0.5">KBW-{user.uid.slice(0, 8).toUpperCase()}</p>
                    </div>
                  </div>
                </div>

                {/* Ledger / Transactions List */}
                <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
                  <h3 className="font-black text-sm text-slate-800">
                    {getTranslation("লেনদেন বিবরণী", "Wallet Transaction Ledger")}
                  </h3>

                  {transactions.length === 0 ? (
                    <p className="text-slate-400 text-xs text-center py-6">
                      {getTranslation("কোনো লেনদেন রেকর্ড নেই।", "No transaction records available.")}
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {transactions.map((tx) => {
                        const isDeposit = tx.type === "deposit" || tx.type === "refund" || tx.type === "referral_bonus";
                        return (
                          <div key={tx.id} className="py-3 flex items-center justify-between text-xs">
                            <div className="flex items-center space-x-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                isDeposit ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                              }`}>
                                {isDeposit ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                              </div>
                              <div>
                                <p className="font-bold text-slate-800">{tx.description}</p>
                                <span className="text-[10px] text-slate-400 mt-0.5 inline-block">
                                  {new Date(tx.createdAt?.seconds * 1000 || Date.now()).toLocaleString()}
                                </span>
                              </div>
                            </div>
                            <span className={`font-black ${isDeposit ? "text-emerald-700" : "text-red-600"}`}>
                              {isDeposit ? "+" : "-"}৳{tx.amount}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: REFERRAL */}
            {activeTab === "referral" && (
              <div className="space-y-6">
                <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm text-center space-y-5">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
                    <Gift className="w-8 h-8 animate-bounce" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-800">
                      {getTranslation("🎉 রেফার করে জিতুন ৳৫০!", "🎉 Refer & Earn ৳50 Wallet Credit!")}
                    </h2>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto mt-2 leading-relaxed">
                      {getTranslation(
                        "বন্ধুকে রেফার করুন। আপনার বন্ধু রেফারেল কোড ব্যবহার করে সাইন আপ করে মোট কমপক্ষে ৳৫০০ টাকার সফল (Delivered) অর্ডার সম্পন্ন করলে আপনি আপনার Wallet-এ ৳৫০ বোনাস পাবেন।",
                        "Refer your friends. Once your friend signs up using your referral code and successfully completes delivered orders totaling at least ৳500, you will receive a ৳50 bonus in your Wallet."
                      )}
                    </p>
                  </div>

                  {/* Referral Code & Referral Link Boxes */}
                  <div className="max-w-md mx-auto space-y-3">
                    {/* Referral Code Box */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider text-left">
                          {getTranslation("আপনার কোড", "Your Referral Code")}
                        </p>
                        <span className="text-lg font-mono font-black text-slate-800 tracking-wider">
                          {getReferralCode()}
                        </span>
                      </div>
                      <button
                        onClick={copyReferralCode}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 shadow-sm"
                        title={getTranslation("কোড কপি করুন", "Copy Code")}
                      >
                        <Clipboard className="w-4 h-4" />
                        <span>{getTranslation("কোড কপি", "Copy Code")}</span>
                      </button>
                    </div>

                    {/* Referral Link Box */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        {getTranslation("আপনার রেফারেল লিংক", "Your Referral Link")}
                      </p>
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-700 truncate shadow-inner select-all">
                          {getReferralLink()}
                        </div>
                        <button
                          onClick={copyReferralLink}
                          className="bg-slate-800 hover:bg-slate-900 text-white px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 shadow-sm flex items-center space-x-1.5"
                          title={getTranslation("লিংক কপি করুন", "Copy Link")}
                        >
                          <Clipboard className="w-4 h-4" />
                          <span className="hidden sm:inline">{getTranslation("লিংক কপি", "Copy Link")}</span>
                        </button>
                        <button
                          onClick={handleShareLink}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 shadow-sm flex items-center space-x-1.5"
                          title={getTranslation("শেয়ার করুন", "Share Link")}
                        >
                          <Share2 className="w-4 h-4" />
                          <span>{getTranslation("শেয়ার", "Share")}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Referral Rules & Conditions List */}
                  <div className="max-w-md mx-auto text-left bg-slate-50 border border-slate-150 rounded-2xl p-5 mt-4 space-y-3">
                    <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-2">
                      {getTranslation("রেফারেল নিয়মাবলী ও শর্তাদি", "Referral Rules & Conditions")}
                    </h3>
                    <ul className="space-y-2 text-xs text-slate-600">
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-500 font-bold">•</span>
                        <span>
                          {getTranslation(
                            "বন্ধুকে অবশ্যই আপনার রেফারেল কোড ব্যবহার করে সাইন আপ করতে হবে।",
                            "Friend must sign up using the referral code."
                          )}
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-500 font-bold">•</span>
                        <span>
                          {getTranslation(
                            "বন্ধুকে কমপক্ষে ৳৫০০ টাকার সফল (Delivered) অর্ডার সম্পন্ন করতে হবে।",
                            "Friend must complete a minimum Delivered order of ৳500."
                          )}
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-500 font-bold">•</span>
                        <span>
                          {getTranslation(
                            "যোগ্য অর্ডার সম্পন্ন হওয়ার পর রেফারার ৳৫০ ওয়ালেট বোনাস পাবেন।",
                            "After the qualifying order is completed, the referrer receives a ৳50 wallet bonus."
                          )}
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-500 font-bold">•</span>
                        <span>
                          {getTranslation(
                            "প্রতিটি আমন্ত্রিত বা রেফারড ইউজারের জন্য কেবল একবার রিওয়ার্ড প্রযোজ্য।",
                            "One reward per referred user."
                          )}
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-rose-500 font-bold">•</span>
                        <span>
                          {getTranslation(
                            "নিজের রেফারেল নিজে নেওয়া গ্রহণযোগ্য বা অনুমতিপ্রাপ্ত নয়।",
                            "Self-referral is not allowed."
                          )}
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-rose-500 font-bold">•</span>
                        <span>
                          {getTranslation(
                            "ডুপ্লিকেট বা ফেক অ্যাকাউন্ট তৈরি করে বোনাস নেওয়া নিষিদ্ধ।",
                            "Duplicate accounts are not allowed."
                          )}
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-rose-500 font-bold">•</span>
                        <span>
                          {getTranslation(
                            "বাতিলকৃত বা রিফান্ড হওয়া অর্ডারসমূহ বোনাসের জন্য বিবেচিত হবে না।",
                            "Cancelled or refunded orders are not eligible."
                          )}
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Referral stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white border border-slate-100 rounded-2xl p-5 text-center shadow-sm">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      {getTranslation("মোট রেফারেল", "Total Invited")}
                    </p>
                    <h4 className="text-2xl font-black text-slate-800 mt-1">{referralStats.count}</h4>
                  </div>
                  <div className="bg-white border border-slate-100 rounded-2xl p-5 text-center shadow-sm">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      {getTranslation("মোট বোনাস অর্জিত", "Total Bonus Earned")}
                    </p>
                    <h4 className="text-2xl font-black text-emerald-700 mt-1">৳{referralStats.earnings}</h4>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: NOTIFICATIONS */}
            {activeTab === "notifications" && (
              <div className="space-y-4">
                <h2 className="text-lg font-black text-slate-800 mb-2">
                  {getTranslation("ইন-অ্যাপ নোটিফিকেশনস", "Your System Notifications")}
                </h2>

                {notifications.length === 0 ? (
                  <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center text-slate-400 text-xs">
                    <Bell className="w-12 h-12 mx-auto text-slate-200 mb-3" />
                    <p>{getTranslation("কোনো নোটিফিকেশন নেই।", "No notifications at this time.")}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {notifications.map((notif) => (
                      <div 
                        key={notif.id} 
                        className={`p-4 rounded-2xl border transition shadow-sm ${
                          notif.isRead 
                            ? "bg-white border-slate-100" 
                            : "bg-emerald-50/40 border-emerald-100"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="text-xs font-black text-slate-800">
                              {getTranslation(notif.titleBn, notif.titleEn)}
                            </h4>
                            <p className="text-xs text-slate-600 mt-1">
                              {getTranslation(notif.messageBn, notif.messageEn)}
                            </p>
                          </div>
                          <span className="text-[8px] text-slate-400 font-bold uppercase">
                            {new Date(notif.createdAt?.seconds * 1000 || Date.now()).toLocaleDateString()}
                          </span>
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

      <OrderMemoModal
        isOpen={showMemoModal}
        onClose={() => setShowMemoModal(false)}
        order={selectedOrder}
        lang={lang}
        triggerToast={triggerToast}
      />

    </div>
  );
}
