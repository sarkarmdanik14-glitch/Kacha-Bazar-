import React, { useState, useEffect, useRef } from "react";
import { auth, db, doc, getDoc, setDoc, serverTimestamp, signOut, onAuthStateChanged, collection, query, where, getDocs } from "../../lib/firebase";
import { supabase } from "../../lib/supabase";
import { supabaseSignOut, onSupabaseAuthStateChange, getSupabaseUser, checkIsSupabaseAdmin, verifyServerAdminOrStaffSession, fetchUserProfile, isExplicitLogoutActive } from "../../lib/supabaseAuth";
import { X, RefreshCw, Key, Shield, LogOut, Lock } from "lucide-react";

import AuthView from "./AuthView";
import CustomerPortal from "./CustomerPortal";
import SellerPanel from "./SellerPanel";
import RiderPanel from "./RiderPanel";
import AdminPanel from "./AdminPanel";
import PartnerShopPanel from "./PartnerShopPanel";
import { getCurrentPartnerSession, logoutPartnerSession, PartnerShop } from "../../lib/partnerManager";
import { apiClient } from "../../lib/apiClient";
import { createTranslator } from "../../lib/formatUtils";
import { generateMemberId, normalizeMemberId } from "../../lib/memberIdUtils";

interface PortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: "bn" | "en";
  initialTab?: "dashboard" | "orders" | "wallet" | "referral" | "notifications";
  forcedRole?: "customer" | "admin" | "seller" | "rider" | "partner";
  initialAuthMode?: "login" | "register";
  referralCode?: string;
  products?: any[];
  categories?: any[];
  banners?: any[];
  globalSettings?: any;
  onProductSaved?: (product: any) => void;
  onProductDeleted?: (productId: string) => void;
  onCategoryDeleted?: (categoryId: string) => void;
  onCategorySaved?: (category: any) => void;
  onOpenCart?: () => void;
  initialUser?: any | null;
  onUserChange?: (user: any | null) => void;
}

// Helper to quickly detect if any session token exists locally before triggering async auth
function hasStoredAuthSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (
      localStorage.getItem("kb_current_user") ||
      localStorage.getItem("kb_supabase_token") ||
      localStorage.getItem("kb_staff_session") ||
      sessionStorage.getItem("kb_staff_session")
    ) {
      return true;
    }
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) || "";
      if (k.startsWith("sb-") && k.endsWith("-auth-token")) {
        return true;
      }
    }
  } catch {}
  return false;
}

export default function PortalModal({ 
  isOpen, 
  onClose, 
  lang, 
  initialTab, 
  forcedRole,
  initialAuthMode,
  referralCode,
  products,
  categories,
  banners,
  globalSettings,
  onProductSaved,
  onProductDeleted,
  onCategoryDeleted,
  onCategorySaved,
  onOpenCart,
  initialUser,
  onUserChange
}: PortalModalProps) {
  const resolveInitialRole = () => {
    if (forcedRole && forcedRole !== "customer") return forcedRole;
    if (initialUser?.role) return initialUser.role;
    return "customer";
  };

  const initialRole = resolveInitialRole();
  const [currentUser, setCurrentUser] = useState<any | null>(() => initialUser || null);
  const [currentPartner, setCurrentPartner] = useState<PartnerShop | null>(null);
  const [userRole, setUserRole] = useState<string>(initialRole);
  const [activePortalTab, setActivePortalTab] = useState<string>(() => {
    if (forcedRole && forcedRole !== "customer") return forcedRole;
    if (initialRole === "admin" || initialRole === "super_admin") return "admin";
    if (initialRole === "seller") return "seller";
    if (initialRole === "rider") return "rider";
    if (initialRole === "partner") return "partner";
    return "customer";
  });
  // If user is already provided or no stored session exists, never block on loading
  const [loading, setLoading] = useState<boolean>(() => {
    if (initialUser || forcedRole === "partner") return false;
    return hasStoredAuthSession();
  });
  const [toasts, setToasts] = useState<{ id: string; bn: string; en: string }[]>([]);
  const isLoggingOutLocalRef = useRef<boolean>(false);

  const getTranslation = createTranslator(lang);

  // Helper to check if role allows tab
  const isTabAllowed = (tab: string, role: string) => {
    const r = role?.toLowerCase();
    if (r === "admin" || r === "super_admin" || r === "founder") return true;
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

  // Toast notifier helper with globally unique collision-proof keys
  const triggerToast = (bn: string, en: string) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    setToasts(prev => [...prev, { id, bn, en }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Keep in sync if initialUser updates from parent
  useEffect(() => {
    if (initialUser && (!currentUser || currentUser.uid !== initialUser.uid || currentUser.id !== initialUser.id)) {
      const role = (forcedRole && forcedRole !== "customer") ? forcedRole : (initialUser.role || "customer");
      
      setCurrentUser({ ...initialUser, role, isSuperAdmin: Boolean(initialUser.isSuperAdmin || role === "super_admin") });
      setUserRole(role);
      if (forcedRole && forcedRole !== "customer") {
        setActivePortalTab(forcedRole);
      } else if (role === "admin" || role === "super_admin") {
        setActivePortalTab("admin");
      } else if (role === "seller") {
        setActivePortalTab("seller");
      } else if (role === "rider") {
        setActivePortalTab("rider");
      } else {
        setActivePortalTab("customer");
      }
      setLoading(false);
    } else if (!initialUser && !hasStoredAuthSession()) {
      setCurrentUser(null);
      setLoading(false);
    }
  }, [initialUser, forcedRole]);

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
    let isMounted = true;

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

    // Hard safety timeout: Spinner MUST NEVER remain visible for more than 1000ms
    const safetyTimeout = setTimeout(() => {
      if (isMounted) {
        setLoading(false);
      }
    }, 1000);

    const handleUserSession = async (user: any, sbAccessToken?: string) => {
      if (!isMounted || isLoggingOutLocalRef.current || isExplicitLogoutActive()) return;
      try {
        if (!user) {
          setCurrentUser(null);
          const resolvedRole = (forcedRole && forcedRole !== "customer") ? forcedRole : "customer";
          setUserRole(resolvedRole);
          setActivePortalTab(resolvedRole);
          setLoading(false);
          return;
        }

        const uid = user.uid || user.id;
        const email = (user.email || "").toLowerCase().trim();

        if (forcedRole === "admin" || user.role === "admin" || user.role === "super_admin") {
          let isAdminUser = false;
          let adminData: any = null;

          // 1. Supabase admin check (strict database verification by uid & email)
          isAdminUser = await checkIsSupabaseAdmin(uid, email);

          // 2. Verified active staff session check
          if (!isAdminUser) {
            const staffSessionId = localStorage.getItem("kb_staff_session") || sessionStorage.getItem("kb_staff_session");
            if (staffSessionId) {
              try {
                const sRes = await apiClient.get<any>("/api/staff/active-session", { silent: true });
                if (sRes?.success && sRes?.staff && (sRes.staff.role === "admin" || sRes.staff.role === "super_admin" || sRes.staff.role === "founder")) {
                  isAdminUser = true;
                  adminData = sRes.staff;
                }
              } catch {}
            }
          }

          if (isAdminUser) {
            const adminUserObj = {
              uid,
              id: uid,
              email: user.email,
              displayName: adminData?.displayName || user.displayName || user.fullName || email.split("@")[0] || "System Admin",
              role: "admin",
              profileStatus: "approved"
            };

            // Authenticate server session
            try {
              const tokenToUse = sbAccessToken || localStorage.getItem("kb_supabase_token") || "";
              if (tokenToUse) {
                const sessionData = await apiClient.post<any>("/api/staff/supabase-session", {
                  accessToken: tokenToUse,
                  token: tokenToUse
                }, { silent: true });
                if (sessionData?.sessionId) {
                  localStorage.setItem("kb_staff_session", sessionData.sessionId);
                  sessionStorage.setItem("kb_staff_session", sessionData.sessionId);
                  if (sessionData.staff?.staffId) localStorage.setItem("kb_staff_id", sessionData.staff.staffId);
                  if (sessionData.staff?.email) localStorage.setItem("kb_staff_email", sessionData.staff.email);
                }
              }
            } catch (sessErr) {
              console.warn("Notice authenticating staff session:", sessErr);
            }

            if (!isMounted) return;
            setCurrentUser(adminUserObj);
            setUserRole("admin");
            setActivePortalTab("admin");
            setLoading(false);
            return;
          } else {
            // User is currently authenticated as customer, but opened admin panel:
            // Allow them to see the admin login interface without throwing an error or signing out
            if (user && (user.role === "customer" || !user.role)) {
              if (!isMounted) return;
              setCurrentUser(user);
              setUserRole("customer");
              if (forcedRole === "admin") {
                setActivePortalTab("admin");
              } else {
                setActivePortalTab("customer");
              }
              setLoading(false);
              return;
            }
            await supabaseSignOut().catch(() => {});
            await signOut(auth).catch(() => {});
            if (!isMounted) return;
            setCurrentUser(null);
            setUserRole(forcedRole === "admin" ? "admin" : "customer");
            setActivePortalTab(forcedRole === "admin" ? "admin" : "customer");
            setLoading(false);
            return;
          }
        } else if (forcedRole === "seller") {
          let isSellerUser = false;
          let sellerStatus = "pending";
          let sellerData: any = null;

          // Check Supabase sellers
          try {
            const { data: sbSeller } = await supabase.from("sellers").select("*").or(`id.eq.${uid},user_id.eq.${uid}`).single();
            if (sbSeller) {
              isSellerUser = true;
              sellerData = sbSeller;
              sellerStatus = sbSeller.status || "pending";
            } else {
              const { data: sbUser } = await supabase.from("users").select("*").or(`id.eq.${uid},uid.eq.${uid}`).single();
              if (sbUser?.role === "seller") {
                isSellerUser = true;
                sellerData = sbUser;
                sellerStatus = sbUser.status || "pending";
              }
            }
          } catch {}

          if (!isMounted) return;

          if (isSellerUser) {
            if (sellerStatus === "rejected") {
              await supabaseSignOut().catch(() => {});
              await signOut(auth).catch(() => {});
              if (!isMounted) return;
              setCurrentUser(null);
              setUserRole("customer");
              triggerToast(
                "আপনার বিক্রেতা আবেদনটি এডমিন কর্তৃক বাতিল করা হয়েছে।",
                "Your seller account application was rejected by admin."
              );
              setLoading(false);
              return;
            }
            const sellerUserObj = {
              uid,
              id: uid,
              email: user.email,
              displayName: sellerData?.shop_name || sellerData?.owner_name || sellerData?.shopName || user.displayName || "Seller",
              role: "seller",
              profileStatus: sellerStatus
            };
            setCurrentUser(sellerUserObj);
            setUserRole("seller");
            setActivePortalTab("seller");
            setLoading(false);
            return;
          } else {
            await supabaseSignOut().catch(() => {});
            await signOut(auth).catch(() => {});
            if (!isMounted) return;
            setCurrentUser(null);
            setUserRole("customer");
            triggerToast(
              "প্রবেশাধিকার সংরক্ষিত। এই অ্যাকাউন্টটি বিক্রেতা হিসেবে নিবন্ধিত নয়।",
              "Access denied. This account is not registered as a seller."
            );
            setLoading(false);
            return;
          }
        } else if (forcedRole === "rider") {
          let isRiderUser = false;
          let riderStatus = "pending";
          let riderData: any = null;

          // Check Supabase riders
          try {
            const { data: sbRider } = await supabase.from("riders").select("*").or(`id.eq.${uid},user_id.eq.${uid}`).single();
            if (sbRider) {
              isRiderUser = true;
              riderData = sbRider;
              riderStatus = sbRider.status || "pending";
            } else {
              const { data: sbUser } = await supabase.from("users").select("*").or(`id.eq.${uid},uid.eq.${uid}`).single();
              if (sbUser?.role === "rider") {
                isRiderUser = true;
                riderData = sbUser;
                riderStatus = sbUser.status || "pending";
              }
            }
          } catch {}

          if (!isMounted) return;

          if (isRiderUser) {
            if (riderStatus === "rejected") {
              await supabaseSignOut().catch(() => {});
              await signOut(auth).catch(() => {});
              if (!isMounted) return;
              setCurrentUser(null);
              setUserRole("customer");
              triggerToast(
                "আপনার রাইডার আবেদনটি এডমিন কর্তৃক বাতিল করা হয়েছে।",
                "Your rider account application was rejected by admin."
              );
              setLoading(false);
              return;
            }
            const riderUserObj = {
              uid,
              id: uid,
              email: user.email,
              displayName: riderData?.name || user.displayName || "Rider",
              role: "rider",
              profileStatus: riderStatus
            };
            setCurrentUser(riderUserObj);
            setUserRole("rider");
            setActivePortalTab("rider");
            setLoading(false);
            return;
          } else {
            await supabaseSignOut().catch(() => {});
            await signOut(auth).catch(() => {});
            if (!isMounted) return;
            setCurrentUser(null);
            setUserRole("customer");
            triggerToast(
              "প্রবেশাধিকার সংরক্ষিত। এই অ্যাকাউন্টটি রাইডার হিসেবে নিবন্ধিত নয়।",
              "Access denied. This account is not registered as a rider."
            );
            setLoading(false);
            return;
          }
        } else {
          // Customer App default authentication handling
          // Check if admin
          const isAdminUser = await checkIsSupabaseAdmin(uid, email);

          if (!isMounted) return;

          if (isAdminUser) {
            setCurrentUser({
              uid,
              id: uid,
              email: user.email,
              displayName: user.displayName || user.fullName || "System Admin",
              role: "admin",
              profileStatus: "approved"
            });
            setUserRole("admin");
            setActivePortalTab("admin");
            setLoading(false);
            return;
          }

          // Fetch profile from Supabase users
          let userData: any = null;
          try {
            const { data: sbUser } = await supabase.from("users").select("*").or(`id.eq.${uid},uid.eq.${uid}`).single();
            if (sbUser) {
              const photo = sbUser.photo_url || sbUser.photoURL || sbUser.avatar || sbUser.image || user.photoURL || user.avatar_url || user.user_metadata?.avatar_url || "";
              userData = {
                uid,
                id: uid,
                email: sbUser.email || user.email,
                displayName: sbUser.display_name || sbUser.full_name || user.displayName || "গ্রাহক",
                fullName: sbUser.full_name || sbUser.display_name || user.displayName || "গ্রাহক",
                name: sbUser.full_name || sbUser.display_name || user.displayName || "গ্রাহক",
                phone: sbUser.phone || sbUser.mobile || "",
                role: sbUser.role || "customer",
                referralCode: sbUser.referral_code,
                address: sbUser.address,
                photoURL: photo,
                avatar: photo,
                image: photo,
                customerId: generateMemberId(uid)
              };
            }
          } catch {}

          if (!userData) {
            // Check fetchUserProfile from supabaseAuth (with server fallback to /api/user/profile/:uid)
            try {
              const profile = await fetchUserProfile(uid);
              if (profile) {
                const photo = profile.photoURL || (profile as any).photo_url || (profile as any).avatar || (profile as any).image || user.photoURL || "";
                userData = {
                  ...profile,
                  photoURL: photo,
                  avatar: photo,
                  image: photo,
                  customerId: generateMemberId(uid)
                };
              }
            } catch {}
          }

          if (!userData) {
            // Fallback to /api/user/profile server endpoint directly
            try {
              const sRes = await apiClient.get<any>(`/api/user/profile/${uid}?email=${encodeURIComponent(email || "")}`, { silent: true });
              if (sRes?.success && sRes?.profile) {
                const sp = sRes.profile;
                const photo = sp.photoURL || sp.photo_url || sp.avatar || sp.image || user.photoURL || "";
                userData = {
                  uid,
                  id: uid,
                  email: sp.email || email,
                  displayName: sp.displayName || sp.fullName || "গ্রাহক",
                  fullName: sp.fullName || sp.displayName || "গ্রাহক",
                  name: sp.fullName || sp.displayName || "গ্রাহক",
                  phone: sp.phone || "",
                  role: sp.role || "customer",
                  address: sp.address || "",
                  photoURL: photo,
                  avatar: photo,
                  image: photo,
                  customerId: generateMemberId(uid),
                  referralCode: sp.referralCode || "REF" + uid.substring(0, 5).toUpperCase()
                };
              }
            } catch {}
          }

          if (!userData) {
            const effectiveName = user.displayName || user.fullName || "গ্রাহক";
            const customerId = generateMemberId(uid);
            const userPhoto = user.photoURL || user.photo_url || user.avatar || user.user_metadata?.avatar_url || (typeof localStorage !== "undefined" ? localStorage.getItem("kb_user_photo") || "" : "");
            userData = {
              uid,
              id: uid,
              email: user.email,
              displayName: effectiveName,
              fullName: effectiveName,
              name: effectiveName,
              photoURL: userPhoto,
              avatar: userPhoto,
              image: userPhoto,
              role: "customer",
              customerId,
              referralCode: "REF" + uid.substring(0, 5).toUpperCase()
            };
          } else {
            // If photoURL is still empty, check user object or localStorage
            if (!userData.photoURL && !userData.avatar) {
              const fallbackPhoto = user.photoURL || user.avatar_url || user.user_metadata?.avatar_url || (typeof localStorage !== "undefined" ? localStorage.getItem("kb_user_photo") || "" : "");
              if (fallbackPhoto) {
                userData.photoURL = fallbackPhoto;
                userData.avatar = fallbackPhoto;
                userData.image = fallbackPhoto;
              }
            }
          }

          if (!isMounted) return;
          const targetRole = (userData?.role || "customer") as any;
          setCurrentUser(userData);
          setUserRole(targetRole);
          if (!forcedRole || forcedRole === "customer") {
            setActivePortalTab(targetRole === "admin" ? "admin" : (targetRole === "seller" ? "seller" : (targetRole === "rider" ? "rider" : "customer")));
          }
          onUserChange?.(userData);
          setLoading(false);
        }
      } catch (err) {
        console.warn("Notice in portal user session handling:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // If initialUser was already supplied, use it immediately
    if (initialUser) {
      handleUserSession(initialUser);
    } else if (!hasStoredAuthSession()) {
      // No stored session exists; finish loading immediately without waiting for network
      setLoading(false);
    } else {
      // Initial check with Supabase user
      getSupabaseUser()
        .then((sbU) => {
          if (isMounted) {
            handleUserSession(sbU);
          }
        })
        .catch(() => {
          if (isMounted) {
            handleUserSession(null);
          }
        })
        .finally(() => {
          if (isMounted) {
            setLoading(false);
          }
        });
    }

    // Subscribe to Supabase Auth state changes (Primary & Single Source of Truth)
    const unsubSb = onSupabaseAuthStateChange((sbU) => {
      if (isMounted && !isLoggingOutLocalRef.current && !isExplicitLogoutActive()) {
        handleUserSession(sbU);
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(safetyTimeout);
      unsubSb();
    };
  }, [isOpen, forcedRole]);

  const handleAuthSuccess = async (userData: any, authRole: string) => {
    isLoggingOutLocalRef.current = false;
    const cleanEmail = (userData?.email || "").toLowerCase().trim();
    const uid = userData?.uid || userData?.id || "";

    let targetRole = (userData?.role || authRole || "customer").toLowerCase();

    // Verify staff/admin privileges authoritatively on backend
    let isAdmin = false;
    let isSuperAdmin = false;
    let verifiedStaffObj: any = null;

    if (targetRole === "admin" || targetRole === "super_admin" || targetRole === "founder" || authRole === "admin") {
      const serverCheck = await verifyServerAdminOrStaffSession();
      if (serverCheck.isAuthenticated && (serverCheck.isAdmin || serverCheck.isSuperAdmin)) {
        isAdmin = serverCheck.isAdmin;
        isSuperAdmin = serverCheck.isSuperAdmin;
        targetRole = serverCheck.role;
        verifiedStaffObj = serverCheck.staff;
      } else {
        isAdmin = false;
        isSuperAdmin = false;
        targetRole = "customer";
      }
    }

    if (targetRole === "partner") {
      setCurrentPartner(userData);
      setCurrentUser(userData);
      setUserRole("partner");
      setActivePortalTab("partner");
      onUserChange?.(userData);
      triggerToast(
        "লগইন সফল হয়েছে! পার্টনার পোর্টালে স্বাগতম।",
        "Login successful! Welcome to the Partner portal."
      );
      return;
    }

    if (isAdmin || targetRole === "admin" || targetRole === "super_admin") {
      let adminObj = {
        ...userData,
        ...(verifiedStaffObj || {}),
        role: targetRole,
        isSuperAdmin: isSuperAdmin
      };

      setCurrentUser(adminObj);
      setUserRole(adminObj.role);
      setActivePortalTab("admin");
      onUserChange?.(adminObj);
      triggerToast(
        "এডমিন প্যানেলে সফলভাবে লগইন হয়েছে!",
        "Successfully logged into Admin Panel!"
      );
      return;
    }

    if (targetRole === "seller") {
      const sellerUser = {
        ...userData,
        role: "seller",
        profileStatus: userData.profileStatus || userData.status || "approved"
      };
      setCurrentUser(sellerUser);
      setUserRole("seller");
      setActivePortalTab("seller");
      onUserChange?.(sellerUser);
      triggerToast(
        "বিক্রেতা প্যানেলে সফলভাবে লগইন হয়েছে!",
        "Successfully logged into Seller Panel!"
      );
      return;
    }

    if (targetRole === "rider") {
      const riderUser = {
        ...userData,
        role: "rider",
        profileStatus: userData.profileStatus || userData.status || "approved"
      };
      setCurrentUser(riderUser);
      setUserRole("rider");
      setActivePortalTab("rider");
      onUserChange?.(riderUser);
      triggerToast(
        "রাইডার প্যানেলে সফলভাবে লগইন হয়েছে!",
        "Successfully logged into Rider Panel!"
      );
      return;
    }

    // Default: Customer login
    let customerUser = {
      ...userData,
      role: "customer",
      isSuperAdmin: false
    };

    if (!customerUser.photoURL && !customerUser.avatar) {
      const localPhoto = localStorage.getItem("kb_user_photo");
      if (localPhoto && !localPhoto.startsWith("data:") && !localPhoto.startsWith("blob:")) {
        customerUser.photoURL = localPhoto;
        customerUser.avatar = localPhoto;
        customerUser.image = localPhoto;
      }
    }

    try {
      localStorage.setItem("kb_current_user", JSON.stringify(customerUser));
      const photo = customerUser.photoURL || customerUser.photo_url || customerUser.avatar || customerUser.image;
      if (photo && !photo.startsWith("data:") && !photo.startsWith("blob:")) {
        localStorage.setItem("kb_user_photo", photo);
        window.dispatchEvent(new CustomEvent("kb_profile_updated", { detail: { photoURL: photo } }));
      }
    } catch {}

    // Instant switch to Customer Dashboard with 0 lag
    setCurrentUser(customerUser);
    setUserRole("customer");
    setActivePortalTab("customer");
    setLoading(false);
    onUserChange?.(customerUser);
    triggerToast(
      "লগইন সফল হয়েছে! মেগা বাজারে স্বাগতম।",
      "Login successful! Welcome to Kacha Bazar."
    );

    // If photoURL is still missing, fetch profile asynchronously in background without blocking UI
    if (!customerUser.photoURL && !customerUser.avatar) {
      const targetUid = customerUser.uid || customerUser.id;
      if (targetUid) {
        apiClient.get<any>(`/api/user/profile/${targetUid}?email=${encodeURIComponent(customerUser.email || "")}`, { silent: true })
          .then((sRes) => {
            if (sRes?.success && sRes?.profile) {
              const sp = sRes.profile;
              const ph = sp.photoURL || sp.photo_url || sp.avatar || sp.image;
              if (ph) {
                setCurrentUser((prev: any) => prev ? ({ ...prev, photoURL: ph, avatar: ph, image: ph }) : prev);
                try {
                  localStorage.setItem("kb_user_photo", ph);
                  window.dispatchEvent(new CustomEvent("kb_profile_updated", { detail: { photoURL: ph } }));
                } catch {}
              }
            }
          })
          .catch(() => {});
      }
    }
  };

  const handleLogout = async () => {
    try {
      isLoggingOutLocalRef.current = true;
      // 1. Immediately reset portal state and partner session synchronously
      logoutPartnerSession();
      setCurrentPartner(null);
      setCurrentUser(null);
      setUserRole("customer");
      setActivePortalTab("customer");
      setLoading(false);

      // 2. Immediately inform parent App component and broadcast global logout event
      onUserChange?.(null);
      window.dispatchEvent(new CustomEvent("kb_user_logout"));

      // 3. Trigger positive confirmation toast
      triggerToast(
        "সফলভাবে লগআউট করা হয়েছে।",
        "Successfully logged out of your session."
      );

      // 4. Safely complete server and Supabase sign out (handles server session first, then purges local/session storage)
      await supabaseSignOut().catch(() => {});
      signOut(auth).catch(() => {});

      // 5. Cleanly close the modal so customer returns to shop
      if (onClose) {
        onClose();
      }
    } catch (err) {
      console.error("Signout error:", err);
    } finally {
      setTimeout(() => {
        isLoggingOutLocalRef.current = false;
      }, 2500);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-2 lg:p-3 bg-black/50 backdrop-blur-sm overflow-y-auto" id="portal-modal-overlay">
      
      {/* Floating toasts */}
      <div className="fixed top-5 right-5 space-y-2 z-[2000] max-w-sm">
        {toasts.map((t, idx) => (
          <div key={`${t.id || "toast"}_${idx}`} className="bg-slate-900 border border-slate-800 text-white rounded-2xl px-4 py-3 shadow-2xl flex items-center justify-between text-xs space-x-3 animate-slide-in">
            <span>{getTranslation(t.bn, t.en)}</span>
            <button onClick={() => setToasts(prev => prev.filter(item => item.id !== t.id))} className="text-slate-400 hover:text-white font-bold">✕</button>
          </div>
        ))}
      </div>

      <div className="bg-white w-full h-full md:h-[96vh] md:max-h-[96vh] max-w-[98vw] 2xl:max-w-[1720px] md:rounded-2xl rounded-none overflow-hidden shadow-2xl relative flex flex-col animate-scale-up">
        
        {/* Floating close button (Replaces bulky dark header strip) */}
        <button 
          onClick={onClose}
          aria-label={getTranslation("বন্ধ করুন", "Close")}
          title={getTranslation("বন্ধ করুন", "Return to Store")}
          className="absolute top-3 right-3 z-50 p-1.5 px-3 rounded-full bg-slate-900/90 hover:bg-slate-900 text-white shadow-lg backdrop-blur-xs transition cursor-pointer flex items-center gap-1.5 text-xs font-bold"
        >
          <X className="w-4 h-4" />
          <span className="text-[11px] hidden sm:inline">{getTranslation("বন্ধ করুন", "Exit")}</span>
        </button>

        {/* Content body */}
        <div className="flex-1 min-h-0 bg-slate-50 overflow-hidden flex flex-col">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4 p-6 text-center">
              <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                {lang === "bn" ? "সেশন যাচাই করা হচ্ছে..." : "Loading Session..."}
              </p>
              <button
                type="button"
                onClick={() => setLoading(false)}
                className="mt-2 text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-4 py-1.5 rounded-full transition cursor-pointer border border-emerald-200"
              >
                {lang === "bn" ? "সরাসরি লগইনে যান" : "Continue to Login"}
              </button>
            </div>
          ) : !currentUser ? (
            <div className="h-full flex items-center justify-center p-4 py-12 overflow-y-auto">
              <React.Suspense fallback={<div className="flex flex-col items-center justify-center h-48 space-y-2"><RefreshCw className="w-6 h-6 text-emerald-600 animate-spin" /><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Loading...</p></div>}>
                <AuthView 
                  onAuthSuccess={handleAuthSuccess} 
                  lang={lang} 
                  forcedRole={forcedRole}
                  initialAuthMode={forcedRole === "admin" || forcedRole === "partner" ? "login" : initialAuthMode}
                  initialReferralCode={forcedRole === "admin" || forcedRole === "partner" ? "" : referralCode}
                />
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
                  activePortalTab === "admin" ? (
                    <div className="h-full flex items-center justify-center p-4 py-8 overflow-y-auto">
                      <div className="w-full max-w-md mx-auto space-y-4">
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-amber-800">
                          <Lock className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
                          <div>
                            <p className="font-bold">{lang === "bn" ? "এডমিন অ্যাকাউন্টে লগইন করুন" : "Sign In to Admin Panel"}</p>
                            <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                              {lang === "bn"
                                ? `আপনি বর্তমানে সাধারণ গ্রাহক হিসেবে সাইন-ইন আছেন। এডমিন প্যানেলে প্রবেশ করতে আপনার এডমিন আইডি বা ইমেইল এবং পাসওয়ার্ড দিয়ে লগইন করুন।`
                                : `You are currently in customer mode. Please sign in with your admin credentials to enter the admin panel.`}
                            </p>
                          </div>
                        </div>
                        <React.Suspense fallback={<div className="flex flex-col items-center justify-center h-48 space-y-2"><RefreshCw className="w-6 h-6 text-emerald-600 animate-spin" /><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Loading...</p></div>}>
                          <AuthView 
                            onAuthSuccess={handleAuthSuccess} 
                            lang={lang} 
                            forcedRole="admin"
                            initialAuthMode="login"
                          />
                        </React.Suspense>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-red-50 border border-red-200 rounded-2xl m-4 flex flex-col items-center justify-center space-y-3">
                      <Shield className="w-12 h-12 text-red-600 animate-bounce" />
                      <p className="text-red-750 font-black text-sm">
                        Access Denied. You do not have permission to access this page.
                      </p>
                    </div>
                  )
                ) : (
                  <div className="h-full w-full min-h-0">
                    {(activePortalTab === "admin" || activePortalTab === "super_admin") && (
                      <AdminPanel 
                        user={currentUser} 
                        onLogout={handleLogout} 
                        lang={lang} 
                        triggerToast={triggerToast}
                        initialProducts={products}
                        initialCategories={categories}
                        initialBanners={banners}
                        initialSettings={globalSettings}
                        onProductSaved={onProductSaved}
                        onProductDeleted={onProductDeleted}
                        onCategoryDeleted={onCategoryDeleted}
                        onCategorySaved={onCategorySaved}
                      />
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
                      <CustomerPortal user={currentUser} onLogout={handleLogout} lang={lang} triggerToast={triggerToast} initialTab={initialTab} onClose={onClose} onOpenCart={onOpenCart} />
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
  const getTranslation = createTranslator(lang);

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
