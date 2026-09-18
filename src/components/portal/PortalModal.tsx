import React, { useState, useEffect } from "react";
import { auth, db, doc, getDoc, signOut, onAuthStateChanged, collection, query, where, getDocs } from "../../lib/firebase";
import { X, RefreshCw, Key, Shield, LogOut } from "lucide-react";

import AuthView from "./AuthView";
import CustomerPortal from "./CustomerPortal";
import SellerPanel from "./SellerPanel";
import RiderPanel from "./RiderPanel";
import AdminPanel from "./AdminPanel";
import PartnerShopPanel from "./PartnerShopPanel";
import { getCurrentPartnerSession, logoutPartnerSession, PartnerShop } from "../../lib/partnerManager";

interface PortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: "bn" | "en";
  initialTab?: "dashboard" | "orders" | "wallet" | "referral" | "notifications";
  forcedRole?: "customer" | "admin" | "seller" | "rider" | "partner";
}

export default function PortalModal({ isOpen, onClose, lang, initialTab, forcedRole }: PortalModalProps) {
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [currentPartner, setCurrentPartner] = useState<PartnerShop | null>(null);
  const [userRole, setUserRole] = useState<string>("customer");
  const [activePortalTab, setActivePortalTab] = useState<string>("customer");
  const [loading, setLoading] = useState<boolean>(true);
  const [toasts, setToasts] = useState<{ id: number; bn: string; en: string }[]>([]);

  const getTranslation = (bn: string, en: string) => (lang === "bn" ? bn : en);

  // Helper to check if role allows tab
  const isTabAllowed = (tab: string, role: string) => {
    const r = role?.toLowerCase();
    if (r === "admin" || r === "founder") return true;
    if (tab === "customer") return true;
    if (tab === "partner" && (r === "partner" || currentPartner !== null)) return true;
    if (tab === "seller" && r === "seller") return true;
    if (tab === "rider" && r === "rider") return true;
    return false;
  };

  const tabsList = [
    { id: "customer", bn: "গ্রাহক পোর্টাল", en: "Customer Portal" },
    { id: "partner", bn: "🏪 পার্টনার শপ", en: "Partner Shop" },
    { id: "seller", bn: "বিক্রেতা প্যানেল", en: "Seller Panel" },
    { id: "rider", bn: "রাইডার প্যানেল", en: "Rider Panel" },
    { id: "admin", bn: "এডমিন প্যানেল", en: "Admin Panel" }
  ];

  // Toast notifier helper
  const triggerToast = (bn: string, en: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, bn, en }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    // Check for existing Partner Session first
    const partnerSession = getCurrentPartnerSession();
    if (forcedRole === "partner" || partnerSession) {
      if (partnerSession) {
        setCurrentPartner(partnerSession);
        setCurrentUser(partnerSession);
        setUserRole("partner");
        setActivePortalTab("partner");
        setLoading(false);
        return;
      } else if (forcedRole === "partner") {
        setCurrentPartner(null);
        setCurrentUser(null);
        setUserRole("partner");
        setActivePortalTab("partner");
        setLoading(false);
        return;
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      if (user) {
        try {
          if (forcedRole === "admin") {
            const adminDocSnap = await getDoc(doc(db, "admins", user.uid));
            let isAdminUser = false;
            let adminData: any = null;

            if (adminDocSnap.exists()) {
              adminData = adminDocSnap.data();
              if (
                adminData &&
                typeof adminData.uid === "string" &&
                adminData.uid === user.uid &&
                typeof adminData.email === "string" &&
                user.email &&
                adminData.email.toLowerCase() === user.email.toLowerCase() &&
                adminData.createdAt &&
                (adminData.isActive === undefined || adminData.isActive === true)
              ) {
                isAdminUser = true;
              }
            }

            if (isAdminUser) {
              const adminUserObj = {
                uid: user.uid,
                email: user.email,
                displayName: adminData?.displayName || user.displayName || user.email?.split("@")[0] || "System Admin",
                role: "admin",
                profileStatus: "approved"
              };

              try {
                const idToken = await user.getIdToken();
                const sessionRes = await fetch("/api/staff/firebase-session", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ idToken })
                });
                const sessionData = await sessionRes.json();
                if (sessionRes.ok && sessionData.sessionId) {
                  localStorage.setItem("kb_staff_session", sessionData.sessionId);
                  sessionStorage.setItem("kb_staff_session", sessionData.sessionId);
                  if (sessionData.staff?.staffId) localStorage.setItem("kb_staff_id", sessionData.staff.staffId);
                  if (sessionData.staff?.email) localStorage.setItem("kb_staff_email", sessionData.staff.email);
                }
              } catch (e) {
                console.warn("Notice authenticating staff session:", e);
              }

              setCurrentUser(adminUserObj);
              setUserRole("admin");
              setActivePortalTab("admin");
            } else {
              await signOut(auth);
              setCurrentUser(null);
              setUserRole("customer");
              setActivePortalTab("customer");
              alert(getTranslation("প্রবেশাধিকার সংরক্ষিত। আপনি এডমিন হিসেবে অনুমোদিত নন।", "Access denied. You are not authorized as an admin."));
              setLoading(false);
              return;
            }
          } else if (forcedRole === "seller") {
            let isSellerUser = false;
            let sellerStatus = "pending";
            let sellerData: any = null;

            const sellerSnap = await getDoc(doc(db, "sellers", user.uid));
            if (sellerSnap.exists()) {
              isSellerUser = true;
              sellerData = sellerSnap.data();
              sellerStatus = sellerData?.status || "pending";
            } else {
              const userSnap = await getDoc(doc(db, "users", user.uid));
              if (userSnap.exists()) {
                const uData = userSnap.data();
                if (uData.role === "seller") {
                  isSellerUser = true;
                  sellerData = uData;
                  sellerStatus = uData.sellerStatus || uData.status || "pending";
                }
              }
            }

            if (isSellerUser) {
              if (sellerStatus === "rejected") {
                await signOut(auth);
                setCurrentUser(null);
                setUserRole("customer");
                alert(getTranslation("আপনার বিক্রেতা আবেদনটি এডমিন কর্তৃক বাতিল করা হয়েছে।", "Your seller account application was rejected by admin."));
                setLoading(false);
                return;
              }
              const sellerUserObj = {
                uid: user.uid,
                email: user.email,
                displayName: sellerData?.ownerName || sellerData?.displayName || user.displayName || "Seller",
                role: "seller",
                profileStatus: sellerStatus
              };
              setCurrentUser(sellerUserObj);
              setUserRole("seller");
              setActivePortalTab("seller");
            } else {
              await signOut(auth);
              setCurrentUser(null);
              setUserRole("customer");
              alert(getTranslation("প্রবেশাধিকার সংরক্ষিত। এই অ্যাকাউন্টটি বিক্রেতা হিসেবে নিবন্ধিত নয়।", "Access denied. This account is not registered as a seller."));
              setLoading(false);
              return;
            }
          } else if (forcedRole === "rider") {
            let isRiderUser = false;
            let riderStatus = "pending";
            let riderData: any = null;

            const riderSnap = await getDoc(doc(db, "riders", user.uid));
            if (riderSnap.exists()) {
              isRiderUser = true;
              riderData = riderSnap.data();
              riderStatus = riderData?.status || "pending";
            } else {
              const userSnap = await getDoc(doc(db, "users", user.uid));
              if (userSnap.exists()) {
                const uData = userSnap.data();
                if (uData.role === "rider") {
                  isRiderUser = true;
                  riderData = uData;
                  riderStatus = uData.riderStatus || uData.status || "pending";
                }
              }
            }

            if (isRiderUser) {
              if (riderStatus === "rejected") {
                await signOut(auth);
                setCurrentUser(null);
                setUserRole("customer");
                alert(getTranslation("আপনার রাইডার আবেদনটি এডমিন কর্তৃক বাতিল করা হয়েছে।", "Your rider account application was rejected by admin."));
                setLoading(false);
                return;
              }
              const riderUserObj = {
                uid: user.uid,
                email: user.email,
                displayName: riderData?.name || riderData?.displayName || user.displayName || "Rider",
                role: "rider",
                profileStatus: riderStatus
              };
              setCurrentUser(riderUserObj);
              setUserRole("rider");
              setActivePortalTab("rider");
            } else {
              await signOut(auth);
              setCurrentUser(null);
              setUserRole("customer");
              alert(getTranslation("প্রবেশাধিকার সংরক্ষিত। এই অ্যাকাউন্টটি রাইডার হিসেবে নিবন্ধিত নয়।", "Access denied. This account is not registered as a rider."));
              setLoading(false);
              return;
            }
          } else {
            // Customer App default authentication handling
            const adminDocSnap = await getDoc(doc(db, "admins", user.uid));
            let isAdminUser = false;
            if (adminDocSnap.exists()) {
              const data = adminDocSnap.data();
              if (data && data.uid === user.uid && data.isActive !== false) {
                isAdminUser = true;
              }
            }

            if (isAdminUser) {
              try {
                const idToken = await user.getIdToken();
                const sessionRes = await fetch("/api/staff/firebase-session", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ idToken })
                });
                const sessionData = await sessionRes.json();
                if (sessionRes.ok && sessionData.sessionId) {
                  localStorage.setItem("kb_staff_session", sessionData.sessionId);
                  sessionStorage.setItem("kb_staff_session", sessionData.sessionId);
                  if (sessionData.staff?.staffId) localStorage.setItem("kb_staff_id", sessionData.staff.staffId);
                  if (sessionData.staff?.email) localStorage.setItem("kb_staff_email", sessionData.staff.email);
                }
              } catch (e) {
                console.warn("Notice authenticating staff session:", e);
              }

              setCurrentUser({
                uid: user.uid,
                email: user.email,
                displayName: adminDocSnap.data()?.displayName || user.displayName || "System Admin",
                role: "admin",
                profileStatus: "approved"
              });
              setUserRole("admin");
              setActivePortalTab("admin");
            } else {
              const userDocSnap = await getDoc(doc(db, "users", user.uid));
              let userData: any = null;
              if (userDocSnap.exists()) {
                userData = userDocSnap.data();
              } else {
                userData = {
                  uid: user.uid,
                  email: user.email,
                  displayName: user.displayName || user.email?.split("@")[0] || "Customer",
                  role: "customer",
                  profileStatus: "approved"
                };
              }
              const role = userData.role === "admin" ? "customer" : (userData.role || "customer");
              setCurrentUser({ ...userData, role, profileStatus: "approved" });
              setUserRole(role);
              setActivePortalTab(role);
            }
          }
        } catch (err: any) {
          if (!err?.message?.includes("offline")) {
            console.warn("Portal fetch user role notice:", err?.message || err);
          }
          if (user) {
            const fallbackUser = {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName || user.email?.split("@")[0] || "Customer",
              role: "customer",
              profileStatus: "approved"
            };
            setCurrentUser(fallbackUser);
            setUserRole("customer");
            setActivePortalTab("customer");
          } else {
            setCurrentUser(null);
            setUserRole("customer");
            setActivePortalTab("customer");
          }
        }
      } else {
        setCurrentUser(null);
        setUserRole("customer");
        setActivePortalTab("customer");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isOpen, forcedRole]);

  const handleAuthSuccess = (userData: any, role: string) => {
    if (role === "partner") {
      setCurrentPartner(userData);
    }
    setCurrentUser(userData);
    setUserRole(role);
    setActivePortalTab(role);
    triggerToast(
      "লগইন সফল হয়েছে! কাচা বাজার পোর্টালে স্বাগতম।",
      "Login successful! Welcome to the Kacha Bazar system portal."
    );
  };

  const handleLogout = async () => {
    try {
      logoutPartnerSession();
      setCurrentPartner(null);
      await signOut(auth);
      try {
        localStorage.removeItem("kacha_user_session");
        localStorage.removeItem("user_role");
        localStorage.removeItem("kb_staff_session");
        localStorage.removeItem("kb_staff_email");
        localStorage.removeItem("kb_staff_id");
        sessionStorage.clear();
      } catch (e) {}
      setCurrentUser(null);
      setUserRole("customer");
      setActivePortalTab("customer");
      triggerToast(
        "সফলভাবে লগআউট করা হয়েছে।",
        "Successfully logged out of your session."
      );
    } catch (err) {
      console.error("Signout error:", err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-50 flex items-center justify-center p-0 md:p-2 lg:p-3" id="portal-modal-overlay">
      
      {/* Floating toasts */}
      <div className="fixed top-5 right-5 space-y-2 z-[2000] max-w-sm">
        {toasts.map((t) => (
          <div key={t.id} className="bg-slate-900 border border-slate-800 text-white rounded-2xl px-4 py-3 shadow-2xl flex items-center justify-between text-xs space-x-3 animate-slide-in">
            <span>{getTranslation(t.bn, t.en)}</span>
            <button onClick={() => setToasts(prev => prev.filter(item => item.id !== t.id))} className="text-slate-400 hover:text-white font-bold">✕</button>
          </div>
        ))}
      </div>

      <div className="bg-white w-full h-full md:h-[96vh] md:max-h-[96vh] max-w-[98vw] 2xl:max-w-[1720px] md:rounded-2xl rounded-none overflow-hidden shadow-2xl relative flex flex-col animate-scale-up">
        
        {/* Portal Header controller */}
        <div className="bg-slate-900 border-b border-slate-800 px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between shrink-0 text-white">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
            <h1 className="font-black text-slate-100 text-xs sm:text-sm tracking-tight flex items-center gap-1.5 uppercase">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>{getTranslation("কাচা বাজার ক্লাউড পোর্টাল", "Kacha Bazar System Portal")}</span>
            </h1>
          </div>
          
          <button 
            onClick={onClose}
            className="p-1.5 px-2.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer flex items-center space-x-1.5 border border-slate-750 bg-slate-850"
          >
            <X className="w-4 h-4" />
            <span className="text-[10px] font-black hidden sm:inline uppercase">{getTranslation("বন্ধ করুন", "Return to Store")}</span>
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 min-h-0 bg-slate-50 overflow-hidden flex flex-col">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full space-y-3">
              <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Loading Cloud Session...</p>
            </div>
          ) : !currentUser ? (
            <div className="h-full flex items-center justify-center p-4 py-12 overflow-y-auto">
              <React.Suspense fallback={<div className="flex flex-col items-center justify-center h-48 space-y-2"><RefreshCw className="w-6 h-6 text-emerald-600 animate-spin" /><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Loading...</p></div>}>
                <AuthView onAuthSuccess={handleAuthSuccess} lang={lang} forcedRole={forcedRole} />
              </React.Suspense>
            </div>
          ) : (
            <div className="h-full flex-1 min-h-0 flex flex-col overflow-hidden">
              {/* Role selector tabs - only show if user has elevated permissions AND no specific forced role */}
              {userRole !== "customer" && !forcedRole && (
                <div className="bg-white border-b border-slate-100 px-6 py-2 flex items-center space-x-2 shrink-0 overflow-x-auto scrollbar-none">
                  <span className="text-[10px] font-bold text-slate-400 uppercase mr-2 tracking-wider shrink-0">
                    {getTranslation("প্যানেল স্যুইচ করুন:", "Switch Panel:")}
                  </span>
                  {tabsList
                    .filter(tab => isTabAllowed(tab.id, userRole))
                    .map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActivePortalTab(tab.id)}
                        className={`px-3.5 py-1 rounded-full text-xs font-bold transition cursor-pointer shrink-0 ${
                          activePortalTab === tab.id
                            ? "bg-emerald-600 text-white shadow-sm"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {getTranslation(tab.bn, tab.en)}
                      </button>
                    ))}
                </div>
              )}

              <div className="flex-1 min-h-0 overflow-hidden">
                {!isTabAllowed(activePortalTab, userRole) ? (
                  <div className="p-8 text-center bg-red-50 border border-red-200 rounded-2xl m-4 flex flex-col items-center justify-center space-y-3">
                    <Shield className="w-12 h-12 text-red-600 animate-bounce" />
                    <p className="text-red-750 font-black text-sm">
                      Access Denied. You do not have permission to access this page.
                    </p>
                  </div>
                ) : (
                  <div className="h-full w-full min-h-0">
                    {activePortalTab === "admin" && (
                      <AdminPanel user={currentUser} onLogout={handleLogout} lang={lang} triggerToast={triggerToast} />
                    )}
                    {activePortalTab === "partner" && (
                      <PartnerShopPanel 
                        partner={currentPartner || currentUser} 
                        onLogout={handleLogout} 
                        lang={lang} 
                        triggerToast={triggerToast} 
                      />
                    )}
                    {activePortalTab === "seller" && (
                      currentUser?.profileStatus === "approved" ? (
                        <SellerPanel user={currentUser} onLogout={handleLogout} lang={lang} triggerToast={triggerToast} />
                      ) : (
                        <RestrictedPanelStatus role="seller" status={currentUser?.profileStatus} onLogout={handleLogout} lang={lang} />
                      )
                    )}
                    {activePortalTab === "rider" && (
                      currentUser?.profileStatus === "approved" ? (
                        <RiderPanel user={currentUser} onLogout={handleLogout} lang={lang} triggerToast={triggerToast} />
                      ) : (
                        <RestrictedPanelStatus role="rider" status={currentUser?.profileStatus} onLogout={handleLogout} lang={lang} />
                      )
                    )}
                    {activePortalTab === "customer" && (
                      <CustomerPortal user={currentUser} onLogout={handleLogout} lang={lang} triggerToast={triggerToast} initialTab={initialTab} />
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

function RestrictedPanelStatus({ 
  role, 
  status, 
  onLogout, 
  lang 
}: { 
  role: "seller" | "rider"; 
  status: string; 
  onLogout: () => void; 
  lang: "bn" | "en";
}) {
  const getTranslation = (bn: string, en: string) => (lang === "bn" ? bn : en);

  const title = getTranslation(
    role === "seller" ? "বিক্রেতা প্যানেল এক্সেস সীমাবদ্ধ" : "রাইডার প্যানেল এক্সেস সীমাবদ্ধ",
    role === "seller" ? "Seller Panel Access Restricted" : "Rider Panel Access Restricted"
  );

  let statusTextBn = "";
  let statusTextEn = "";
  let messageBn = "";
  let messageEn = "";
  let colorClass = "text-amber-500 bg-amber-50 border-amber-200";

  if (status === "pending" || !status) {
    statusTextBn = "অপেক্ষমান";
    statusTextEn = "Pending Approval";
    messageBn = "আপনার বিক্রেতা/রাইডার অ্যাকাউন্টটি বর্তমানে সিস্টেম অ্যাডমিনের পর্যালোচনার অপেক্ষায় রয়েছে। অ্যাকাউন্টটি অনুমোদিত হলে আপনি এই প্যানেলটি ব্যবহার করতে পারবেন।";
    messageEn = "Your registration is currently pending review by our administrator. You will be granted access once your application is approved.";
    colorClass = "text-amber-600 bg-amber-50 border-amber-200";
  } else if (status === "rejected") {
    statusTextBn = "প্রত্যাখ্যাত";
    statusTextEn = "Rejected";
    messageBn = "দুঃখিত, আপনার অ্যাকাউন্ট আবেদনটি সিস্টেম অ্যাডমিন দ্বারা প্রত্যাখ্যাত হয়েছে। অনুগ্রহ করে বিস্তারিত জানতে বা পুনরায় আবেদন করতে সহায়তার সাথে যোগাযোগ করুন।";
    messageEn = "We regret to inform you that your application has been rejected by system administration. Please contact support if you believe this was an error.";
    colorClass = "text-red-600 bg-red-50 border-red-200";
  } else if (status === "suspended") {
    statusTextBn = "স্থগিত";
    statusTextEn = "Suspended";
    messageBn = "নিরাপত্তা নীতি বা প্রশাসনিক কারণে আপনার অ্যাকাউন্টটি সাময়িকভাবে স্থগিত করা হয়েছে। বিশদ জানতে অনুগ্রহ করে সিস্টেম অ্যাডমিনের সাথে যোগাযোগ করুন।";
    messageEn = "Your account has been temporarily suspended due to administrative policies. Please contact system administrators to appeal this decision.";
    colorClass = "text-rose-600 bg-rose-50 border-rose-250 animate-pulse";
  }

  return (
    <div className="h-full flex items-center justify-center p-6 bg-slate-50 overflow-y-auto">
      <div className="bg-white border border-slate-100 rounded-3xl p-8 max-w-md w-full shadow-xl text-center space-y-6">
        
        {/* Visual icon badge */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shadow-inner flex items-center justify-center">
          <Shield className="w-8 h-8" />
        </div>

        {/* Headline */}
        <div className="space-y-1">
          <h2 className="text-base font-black text-slate-800 tracking-tight uppercase">
            {title}
          </h2>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider animate-pulse">
            {getTranslation("নিরাপত্তা গেটওয়ে", "Security Verification Gateway")}
          </p>
        </div>

        {/* Current status chip */}
        <div className="flex justify-center">
          <span className={`px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest border ${colorClass}`}>
            {getTranslation(statusTextBn, statusTextEn)}
          </span>
        </div>

        {/* Detailed Message */}
        <div className="text-xs text-slate-500 leading-relaxed space-y-2 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
          <p className="font-extrabold text-slate-700">{getTranslation(messageBn, messageEn)}</p>
          <p className="text-[10px] text-slate-400">{getTranslation("সহায়তা ইমেইল: support@kachabazar.com", "Support Helpline: support@kachabazar.com")}</p>
        </div>

        {/* Actions buttons */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <button 
            onClick={onLogout}
            className="flex-1 bg-red-50 hover:bg-red-100 text-red-650 text-xs font-bold py-2.5 px-4 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 border border-red-150 uppercase"
          >
            <LogOut className="w-4 h-4" />
            <span>{getTranslation("লগআউট করুন", "Log Out Session")}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
