import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Menu,
  X,
  User,
  ShoppingBag,
  CreditCard,
  Gift,
  Bell,
  LogOut,
  Camera,
  CheckCircle,
  Phone,
  Mail,
  MapPin,
  Award,
  ChevronRight,
  Heart,
  Settings,
  Sparkles,
  QrCode,
  ShieldCheck,
  ShieldAlert,
  Edit2,
  Check,
  ExternalLink,
  Crown,
  Percent,
  Zap,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Key,
  AlertCircle,
  RefreshCw,
  ShoppingCart,
  ArrowRight
} from "lucide-react";
import QRCode from "qrcode";
import { db, doc, getDoc, setDoc, serverTimestamp, onSnapshot, auth, RecaptchaVerifier, signInWithPhoneNumber, updateProfile } from "../../lib/firebase";
import type { ConfirmationResult } from "firebase/auth";
import { normalizeMemberId, generateMemberId, getDigitalMembershipCardId } from "../../lib/memberIdUtils";
import { uploadImageWithFallback, compressImage } from "../../lib/imageUploadHelper";
import { apiClient } from "../../lib/apiClient";
import RewardRedemptionView from "./RewardRedemptionView";
import { APP_LOGO_URL } from "../../constants/branding";

export interface CustomerDashboardProps {
  initialUser?: {
    displayName?: string;
    phone?: string;
    email?: string;
    photoURL?: string;
    customerId?: string;
    username?: string;
    membershipTier?: string;
    isVerified?: boolean;
    isEmailVerified?: boolean;
    isPhoneVerified?: boolean;
    isPremiumMember?: boolean;
    orders?: any[];
    address?: string;
    walletBalance?: number;
    totalOrders?: number;
    referralEarnings?: number;
    rewardPoints?: number;
    [key: string]: any;
  };
  onLogout?: () => void;
  onSaveProfile?: (updatedData: {
    displayName: string;
    fullName?: string;
    name?: string;
    phone: string;
    email: string;
    address: string;
    photoURL: string;
    [key: string]: any;
  }) => Promise<void> | void;
  onNavigateTab?: (tabId: string) => void;
  onAddressUpdate?: (newAddress: string) => Promise<void> | void;
}

export default function CustomerDashboardMobile({
  initialUser = {},
  onLogout,
  onSaveProfile,
  onNavigateTab,
  onAddressUpdate
}: CustomerDashboardProps) {
  // Mobile Drawer State
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  // Profile data states - Prioritize displaying full name
  const [displayName, setDisplayName] = useState<string>(() => {
    return (initialUser.fullName || initialUser.displayName || initialUser.name || "গ্রাহক").trim();
  });
  const [phone, setPhone] = useState<string>(initialUser.phone || "01700-000000");
  const [email, setEmail] = useState<string>(initialUser.email || "user@kanchabazar.com");
  const [photoURL, setPhotoURL] = useState<string>(initialUser.photoURL || "");
  const [address, setAddress] = useState<string>(initialUser.address || "হাউজ #১২, রোড #৪, ধানমন্ডি, ঢাকা");
  const [isEditingAddress, setIsEditingAddress] = useState<boolean>(false);
  const [tempAddress, setTempAddress] = useState<string>(address);

  // Digital Badge & Identity states - strictly CFI prefix
  const customerId = normalizeMemberId(
    initialUser.customerId,
    initialUser.uid || initialUser.id || initialUser.phone || initialUser.email
  );

  // Auto-sync & migrate legacy ID in Firestore (e.g. FCIMWZ -> CFIMWZ)
  useEffect(() => {
    const uId = initialUser.uid || initialUser.id;
    if (uId && initialUser.customerId) {
      const fixedId = normalizeMemberId(initialUser.customerId, uId);
      if (initialUser.customerId !== fixedId) {
        setDoc(doc(db, "users", uId), { customerId: fixedId }, { merge: true }).catch(() => {});
      }
    }
  }, [initialUser.uid, initialUser.id, initialUser.customerId]);

  const getSanitizedUsername = () => {
    if (initialUser.username && typeof initialUser.username === "string" && initialUser.username.trim()) {
      return initialUser.username.trim();
    }
    const rawName = (displayName || initialUser.fullName || initialUser.displayName || initialUser.name || "").trim();
    if (rawName) {
      const sanitized = rawName
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^\w\u0980-\u09FF]/gi, "");
      if (sanitized) return sanitized;
    }
    return customerId.toLowerCase();
  };
  const username = getSanitizedUsername();
  // Cart synchronization state from localStorage
  const [cart, setCart] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem("kb_cart");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const handleCartSync = () => {
      try {
        const saved = localStorage.getItem("kb_cart");
        setCart(saved ? JSON.parse(saved) : []);
      } catch {
        setCart([]);
      }
    };
    window.addEventListener("storage", handleCartSync);
    window.addEventListener("kb_cart_updated", handleCartSync);
    return () => {
      window.removeEventListener("storage", handleCartSync);
      window.removeEventListener("kb_cart_updated", handleCartSync);
    };
  }, []);

  const cartTotalQty = useMemo(() => {
    return cart.reduce((total, item) => total + (item.quantity || 1), 0);
  }, [cart]);

  const cartSubtotal = useMemo(() => {
    return cart.reduce((total, item) => {
      const price = item.selectedOption?.price !== undefined 
        ? item.selectedOption.price 
        : (item.product?.price || 0);
      return total + price * (item.quantity || 1);
    }, 0);
  }, [cart]);

  const isEmailVerified = Boolean(initialUser.isEmailVerified);
  const isPhoneVerified = Boolean(initialUser.isPhoneVerified);
  const isVerified = Boolean((isEmailVerified && isPhoneVerified) || (initialUser.isVerified && isEmailVerified && isPhoneVerified));
  const isPremiumQualified = useMemo(() => {
    if (initialUser.isPremiumMember) return true;
    if (initialUser.membershipTier === "প্রিমিয়াম মেম্বার" || initialUser.membershipTier === "✨ প্রিমিয়াম মেম্বার") return true;
    const ords = initialUser.orders || [];
    if (!ords || ords.length === 0) return false;

    const dailyDeliveredTotals: Record<string, number> = {};
    for (const ord of ords) {
      const status = (ord.orderStatus || ord.status || "").toLowerCase();
      if (status === "cancelled" || status === "বাতিল" || status === "refunded") continue;

      let dateKey = "";
      if (ord.createdAt?.seconds) {
        const d = new Date(ord.createdAt.seconds * 1000);
        dateKey = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      } else if (ord.createdAt) {
        const d = new Date(ord.createdAt);
        if (!isNaN(d.getTime())) {
          dateKey = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
        }
      }
      if (dateKey) {
        const amt = Number(ord.total || ord.subtotal || ord.finalAmount || 0);
        dailyDeliveredTotals[dateKey] = (dailyDeliveredTotals[dateKey] || 0) + amt;
      }
    }
    return Object.values(dailyDeliveredTotals).some((sum) => sum >= 6000);
  }, [initialUser]);
  const membershipTier = isPremiumQualified ? "✨ প্রিমিয়াম মেম্বার" : "সাধারণ মেম্বার";

  // Stats values
  const totalOrders = initialUser.totalOrders ?? 0;
  const referralEarnings = initialUser.referralEarnings ?? 0;
  // Real-time wallet balance strictly initialized to 0 if no balance yet
  const [liveWalletBalance, setLiveWalletBalance] = useState<number>(() => {
    return Number(initialUser.walletBalance ?? (initialUser as any).balance ?? 0);
  });

  // Real-time reward points strictly initialized to 0 if no points yet
  const [liveRewardPoints, setLiveRewardPoints] = useState<number>(() => {
    return initialUser.rewardPoints ?? (initialUser as any).points ?? 0;
  });

  useEffect(() => {
    const uId = initialUser.uid || initialUser.id;
    if (!uId) return;

    // Listen to users/{userId} doc
    const unsub = onSnapshot(doc(db, "users", uId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const pts = data.rewardPoints ?? data.points ?? 0;
        setLiveRewardPoints(pts);

        // Fetch real-time numeric value from users/{userId}/walletBalance
        const wb = data.walletBalance !== undefined 
          ? Number(data.walletBalance) 
          : data.balance !== undefined 
          ? Number(data.balance) 
          : 0;
        setLiveWalletBalance(wb);

        // Real-time synchronization of customer full name & details
        const liveName = (data.fullName || data.displayName || data.name || "").trim();
        if (liveName) {
          setDisplayName(liveName);
        }
        if (data.phone) setPhone(data.phone);
        if (data.email) setEmail(data.email);
        if (data.address) setAddress(data.address);
        if (data.photoURL !== undefined) setPhotoURL(data.photoURL || "");
      }
    }, (err) => {
      console.warn("Mobile live user listener notice:", err?.message || err);
    });

    // Also listen to wallet/{userId} doc
    const unsubWallet = onSnapshot(doc(db, "wallet", uId), (wSnap) => {
      if (wSnap.exists()) {
        const wBal = wSnap.data().balance;
        if (wBal !== undefined) {
          setLiveWalletBalance(Number(wBal) || 0);
        }
      }
    }, () => {});

    return () => {
      unsub();
      unsubWallet();
    };
  }, [initialUser.uid, initialUser.id]);

  useEffect(() => {
    if (initialUser.walletBalance !== undefined || (initialUser as any).balance !== undefined) {
      setLiveWalletBalance(Number(initialUser.walletBalance ?? (initialUser as any).balance ?? 0));
    }
  }, [initialUser.walletBalance, (initialUser as any).balance]);

  useEffect(() => {
    if (initialUser.rewardPoints !== undefined || (initialUser as any).points !== undefined) {
      setLiveRewardPoints(initialUser.rewardPoints ?? (initialUser as any).points ?? 0);
    }
  }, [initialUser.rewardPoints, (initialUser as any).points]);

  useEffect(() => {
    const nextName = (initialUser.fullName || initialUser.displayName || initialUser.name || "").trim();
    if (nextName) {
      setDisplayName(nextName);
    }
    if (initialUser.phone) setPhone(initialUser.phone);
    if (initialUser.email) setEmail(initialUser.email);
    if (initialUser.address) setAddress(initialUser.address);
    if (initialUser.photoURL !== undefined) setPhotoURL(initialUser.photoURL || "");
  }, [initialUser.fullName, initialUser.displayName, initialUser.name, initialUser.phone, initialUser.email, initialUser.address, initialUser.photoURL]);

  // Auto-initialize rewardPoints to 0 in Firestore if missing for user
  useEffect(() => {
    const uId = initialUser.uid || initialUser.id;
    if (uId && initialUser.rewardPoints === undefined && (initialUser as any).points === undefined) {
      setDoc(doc(db, "users", uId), { rewardPoints: 0, points: 0 }, { merge: true }).catch(() => {});
    }
  }, [initialUser.uid, initialUser.id, initialUser.rewardPoints]);

  // Auto-initialize walletBalance to 0 in Firestore if missing for user
  useEffect(() => {
    const uId = initialUser.uid || initialUser.id;
    if (uId && initialUser.walletBalance === undefined && (initialUser as any).balance === undefined) {
      setDoc(doc(db, "users", uId), { walletBalance: 0, balance: 0 }, { merge: true }).catch(() => {});
    }
  }, [initialUser.uid, initialUser.id, initialUser.walletBalance]);

  const walletBalance = liveWalletBalance;
  const rewardPoints = liveRewardPoints;

  // Interactive UI states
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [showNotificationsModal, setShowNotificationsModal] = useState<boolean>(false);
  const [showProfileEditModal, setShowProfileEditModal] = useState<boolean>(false);
  const [profileModalTab, setProfileModalTab] = useState<"all" | "verification" | "profile" | "security">("all");
  const verificationSectionRef = useRef<HTMLDivElement>(null);
  const securitySectionRef = useRef<HTMLDivElement>(null);

  const handleOpenVerificationSection = () => {
    setProfileModalTab("verification");
    setShowProfileEditModal(true);
    setTimeout(() => {
      verificationSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
  };

  const handleOpenSecuritySection = () => {
    setProfileModalTab("security");
    setShowProfileEditModal(true);
    setTimeout(() => {
      securitySectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
  };
  const [showMembershipModal, setShowMembershipModal] = useState<boolean>(false);
  const [showAddressModal, setShowAddressModal] = useState<boolean>(false);
  const [showWishlistModal, setShowWishlistModal] = useState<boolean>(false);

  // Email and Phone verification states
  const [emailVerifiedLocal, setEmailVerifiedLocal] = useState<boolean>(isEmailVerified);
  const [phoneVerifiedLocal, setPhoneVerifiedLocal] = useState<boolean>(isPhoneVerified);

  // Custom 6-digit OTP Email Verification State
  const [isSendingVerificationEmail, setIsSendingVerificationEmail] = useState<boolean>(false);
  const [verificationEmailSent, setVerificationEmailSent] = useState<boolean>(false);
  const [isCheckingEmailStatus, setIsCheckingEmailStatus] = useState<boolean>(false);
  const [emailOtpInput, setEmailOtpInput] = useState<string>("");
  const [isVerifyingEmailOtp, setIsVerifyingEmailOtp] = useState<boolean>(false);
  const [emailVerificationCooldown, setEmailVerificationCooldown] = useState<number>(0);

  // Phone OTP verification states (Firebase Phone Auth signInWithPhoneNumber)
  const [phoneOtpSent, setPhoneOtpSent] = useState<boolean>(false);
  const [phoneOtpCode, setPhoneOtpCode] = useState<string>("");
  const [isSendingPhoneOtp, setIsSendingPhoneOtp] = useState<boolean>(false);
  const [isVerifyingPhone, setIsVerifyingPhone] = useState<boolean>(false);
  const [phoneConfirmationResult, setPhoneConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [phoneOtpCooldown, setPhoneOtpCooldown] = useState<number>(0);

  // Phone OTP cooldown timer
  useEffect(() => {
    let timer: any = null;
    if (phoneOtpCooldown > 0) {
      timer = setInterval(() => {
        setPhoneOtpCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [phoneOtpCooldown]);

  // Email verification cooldown timer
  useEffect(() => {
    let timer: any = null;
    if (emailVerificationCooldown > 0) {
      timer = setInterval(() => {
        setEmailVerificationCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [emailVerificationCooldown]);

  // Sync auth.currentUser emailVerified status with Firestore
  useEffect(() => {
    const syncEmailVerifiedState = async () => {
      if (auth.currentUser) {
        try {
          await auth.currentUser.reload();
          if (auth.currentUser.emailVerified && !emailVerifiedLocal) {
            setEmailVerifiedLocal(true);
            const uId = initialUser.uid || initialUser.id;
            if (uId) {
              await setDoc(doc(db, "users", uId), {
                isEmailVerified: true,
                ...(phoneVerifiedLocal ? { isVerified: true } : {}),
                updatedAt: serverTimestamp()
              }, { merge: true });
            }
          }
        } catch (e) {
          // non-blocking
        }
      }
    };
    syncEmailVerifiedState();
  }, [initialUser.uid, initialUser.id, emailVerifiedLocal, phoneVerifiedLocal, showProfileEditModal]);

  const handleSendEmailVerification = async () => {
    const targetEmail = (email || initialUser?.email || auth.currentUser?.email || "").trim().toLowerCase();
    if (!targetEmail || !targetEmail.includes("@")) {
      triggerToast("অনুগ্রহ করে একটি সঠিক ইমেইল ঠিকানা প্রদান করুন।");
      return;
    }

    const uId = initialUser.uid || initialUser.id || auth.currentUser?.uid;
    if (!uId) {
      triggerToast("ভেরিফিকেশন কোড পাঠাতে লগইন সেশন আবশ্যক।");
      return;
    }

    setIsSendingVerificationEmail(true);
    try {
      // 1. Generate secure 6-digit OTP code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

      // 2. Save under Firestore email_verifications/{userId}
      await setDoc(doc(db, "email_verifications", uId), {
        code,
        userId: uId,
        email: targetEmail,
        expiresAt,
        createdAt: serverTimestamp(),
        verified: false
      }, { merge: true });

      // 3. Dispatch transactional email via custom mail handler on backend (Resend, Brevo, or backend API)
      // Sender: "কাঁচা বাজার টিম" <no-reply@kachabazaronline.com>
      // Subject: "কাঁচা বাজার - ইমেইল ভেরিফিকেশন কোড"
      try {
        await fetch("/api/auth/send-email-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: uId, email: targetEmail, code })
        });
      } catch (apiErr) {
        console.warn("Notice: backend email dispatch failed:", apiErr);
      }

      setVerificationEmailSent(true);
      setEmailVerificationCooldown(60);
      setEmailOtpInput("");
      triggerToast(`আপনার ইমেইলে (${targetEmail}) একটি ৬-সংখ্যার ভেরিফিকেশন কোড পাঠানো হয়েছে।`);
    } catch (err: any) {
      console.error("Mobile sendEmailVerification error:", err);
      let errorMsg = "ভেরিফিকেশন কোড পাঠাতে সমস্যা হয়েছে।";
      if (err?.code === "permission-denied") {
        try {
          const res = await fetch("/api/auth/send-email-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: uId, email: targetEmail })
          });
          const data = await res.json();
          if (data.success) {
            setVerificationEmailSent(true);
            setEmailVerificationCooldown(60);
            setEmailOtpInput("");
            triggerToast(`আপনার ইমেইলে (${targetEmail}) একটি ৬-সংখ্যার ভেরিফিকেশন কোড পাঠানো হয়েছে।`);
            return;
          }
        } catch (fbErr) {}
      }
      triggerToast(errorMsg);
    } finally {
      setIsSendingVerificationEmail(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    const cleanCode = emailOtpInput.trim();
    if (!cleanCode || cleanCode.length !== 6) {
      triggerToast("অনুগ্রহ করে ৬-সংখ্যার ভেরিফিকেশন কোডটি দিন।");
      return;
    }

    const uId = initialUser.uid || initialUser.id || auth.currentUser?.uid;
    if (!uId) {
      triggerToast("লগইন সেশন পাওয়া যায়নি। অনুগ্রহ করে পুনরায় লগইন করুন।");
      return;
    }

    const targetEmail = (email || initialUser?.email || auth.currentUser?.email || "").trim().toLowerCase();

    setIsVerifyingEmailOtp(true);
    try {
      let isMatched = false;

      // 1. Verify code against Firestore email_verifications/{userId}
      try {
        const snap = await getDoc(doc(db, "email_verifications", uId));
        if (snap.exists()) {
          const data = snap.data();
          if (data && String(data.code).trim() === cleanCode) {
            if (data.expiresAt && Date.now() > data.expiresAt) {
              triggerToast("ভেরিফিকেশন কোডের মেয়াদ শেষ হয়ে গেছে। অনুগ্রহ করে আবার নতুন কোড পাঠান।");
              setIsVerifyingEmailOtp(false);
              return;
            }
            isMatched = true;
          }
        }
      } catch (fErr) {
        console.warn("Direct Firestore mobile verification notice:", fErr);
      }

      // 2. Fallback to server endpoint
      if (!isMatched) {
        try {
          const res = await fetch("/api/auth/verify-email-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: uId, email: targetEmail, code: cleanCode })
          });
          const resData = await res.json();
          if (resData.success) {
            isMatched = true;
          }
        } catch (bErr) {}
      }

      if (!isMatched) {
        triggerToast("ভুল ভেরিফিকেশন কোড! অনুগ্রহ করে সঠিক ৬-সংখ্যার কোড লিখুন।");
        setIsVerifyingEmailOtp(false);
        return;
      }

      // 3. If matched, update user profile in Firestore: isEmailVerified: true
      await setDoc(doc(db, "users", uId), {
        uid: uId,
        isEmailVerified: true,
        ...(phoneVerifiedLocal ? { isVerified: true } : {}),
        updatedAt: serverTimestamp()
      }, { merge: true });

      try {
        await setDoc(doc(db, "email_verifications", uId), { verified: true }, { merge: true });
      } catch (e) {}

      setEmailVerifiedLocal(true);
      setVerificationEmailSent(false);
      setEmailOtpInput("");

      triggerToast("অভিনন্দন! আপনার ইমেইল সফলভাবে ভেরিফাইড হয়েছে ✓");
    } catch (err: any) {
      console.error("handleVerifyEmailOtp error:", err);
      triggerToast("কোড যাচাই করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।");
    } finally {
      setIsVerifyingEmailOtp(false);
    }
  };

  const handleSendPhoneOtp = async () => {
    const rawPhone = (phone || "").trim();
    if (!rawPhone || rawPhone.length < 10) {
      triggerToast("অনুগ্রহ করে একটি সঠিক মোবাইল নম্বর লিখুন (কমপক্ষে ১০ ডিজিট)।");
      return;
    }

    let formattedPhone = rawPhone.replace(/[\s-]/g, "");
    if (!formattedPhone.startsWith("+")) {
      if (formattedPhone.startsWith("880")) {
        formattedPhone = `+${formattedPhone}`;
      } else if (formattedPhone.startsWith("0")) {
        formattedPhone = `+88${formattedPhone}`;
      } else {
        formattedPhone = `+880${formattedPhone}`;
      }
    }

    setIsSendingPhoneOtp(true);
    try {
      const uId = initialUser.uid || initialUser.id;
      const res = await apiClient.post<any>("/api/auth/phone/send-verification-otp", {
        phone: rawPhone,
        userId: uId
      });

      if (res?.success) {
        setPhoneOtpSent(true);
        setPhoneOtpCooldown(60);
        triggerToast("আপনার নম্বরে ওটিপি পাঠানো হয়েছে। অনুগ্রহ করে ইনবক্স চেক করুন।");
      } else {
        throw new Error(res?.error || "ওটিপি পাঠাতে সমস্যা হয়েছে।");
      }
    } catch (err: any) {
      console.warn("Mobile notice sending phone OTP:", err?.message || err);
      let errorMsg = "এসএমএস ওটিপি পাঠাতে ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।";
      if (err?.message) {
        errorMsg = err.message;
      }
      triggerToast(errorMsg);
    } finally {
      setIsSendingPhoneOtp(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    const code = phoneOtpCode.trim();
    if (!code) {
      triggerToast("অনুগ্রহ করে ওটিপি কোডটি লিখুন।");
      return;
    }

    setIsVerifyingPhone(true);
    try {
      const uId = initialUser.uid || initialUser.id;
      const res = await apiClient.post<any>("/api/auth/phone/verify-otp", {
        phone: phone,
        code: code,
        userId: uId
      });

      if (!res?.success) {
        throw new Error(res?.error || "ভুল ওটিপি কোড।");
      }

      if (phoneConfirmationResult) {
        try {
          await phoneConfirmationResult.confirm(code);
        } catch (e) {}
      }

      setPhoneVerifiedLocal(true);
      if (uId) {
        await setDoc(doc(db, "users", uId), {
          isPhoneVerified: true,
          phone: phone,
          ...(emailVerifiedLocal ? { isVerified: true } : {}),
          updatedAt: serverTimestamp()
        }, { merge: true });
      }
      setPhoneOtpSent(false);
      setPhoneOtpCode("");
      setPhoneConfirmationResult(null);
      triggerToast("অভিনন্দন! ফোন নাম্বার সফলভাবে ভেরিফাই করা হয়েছে! ✓");
    } catch (err: any) {
      console.warn("Mobile notice verifying phone OTP:", err?.message || err);
      let errorMsg = "ভুল OTP কোড! অনুগ্রহ করে আবার চেষ্টা করুন।";
      if (err?.code === "auth/invalid-verification-code") {
        errorMsg = "ভুল ওটিপি কোড! অনুগ্রহ করে যাচাই করে আবার লিখুন।";
      } else if (err?.code === "auth/code-expired") {
        errorMsg = "ওটিপি কোডের মেয়াদ উত্তীর্ণ হয়ে গেছে।";
      } else if (err?.message) {
        errorMsg = err.message;
      }
      triggerToast(errorMsg);
    } finally {
      setIsVerifyingPhone(false);
    }
  };

  // Security & Password Reset states in Profile Settings
  const [newPasswordInput, setNewPasswordInput] = useState<string>("");
  const [confirmPasswordInput, setConfirmPasswordInput] = useState<string>("");
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState<boolean>(false);

  // OTP Verification for Password Reset
  const [securityOtpSent, setSecurityOtpSent] = useState<boolean>(false);
  const [securityOtpCode, setSecurityOtpCode] = useState<string>("");
  const [securityResetId, setSecurityResetId] = useState<string>("");
  const [securityResetToken, setSecurityResetToken] = useState<string>("");
  const [securityTimer, setSecurityTimer] = useState<number>(0);
  const [isSendingSecurityOtp, setIsSendingSecurityOtp] = useState<boolean>(false);
  const [isVerifyingSecurityOtp, setIsVerifyingSecurityOtp] = useState<boolean>(false);
  const [securityError, setSecurityError] = useState<string>("");
  const [securitySuccess, setSecuritySuccess] = useState<string>("");

  useEffect(() => {
    let interval: any = null;
    if (securityTimer > 0) {
      interval = setInterval(() => {
        setSecurityTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [securityTimer]);

  const handleSendSecurityOtp = async () => {
    const targetIdentifier = email || phone || initialUser?.email || initialUser?.phone || "";
    if (!targetIdentifier) {
      setSecurityError("অনুগ্রহ করে আগে আপনার প্রোফাইলে একটি ইমেইল বা ফোন নম্বর দিন।");
      return;
    }

    setIsSendingSecurityOtp(true);
    setSecurityError("");
    setSecuritySuccess("");

    try {
      const res = await apiClient.post<any>("/api/auth/forgot-password/send-code", {
        identifier: targetIdentifier
      });

      if (res && res.success) {
        setSecurityResetId(res.resetId);
        setSecurityOtpSent(true);
        setSecurityTimer(60);
        setSecuritySuccess(res.messageBn || "ভেরিফিকেশন কোড পাঠানো হয়েছে!");
        triggerToast("ভেরিফিকেশন কোড পাঠানো হয়েছে!");
      } else {
        throw new Error(res?.error || res?.message || "কোড পাঠাতে ব্যর্থ হয়েছে");
      }
    } catch (err: any) {
      setSecurityError(err?.message || "কোড পাঠাতে ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।");
    } finally {
      setIsSendingSecurityOtp(false);
    }
  };

  const handleVerifySecurityOtp = async () => {
    const code = securityOtpCode.trim();
    if (code.length < 6) {
      setSecurityError("অনুগ্রহ করে সম্পূর্ণ ৬-সংখ্যার কোড লিখুন।");
      return;
    }

    setIsVerifyingSecurityOtp(true);
    setSecurityError("");
    setSecuritySuccess("");

    try {
      const res = await apiClient.post<any>("/api/auth/forgot-password/verify-code", {
        resetId: securityResetId,
        code: code
      });

      if (res && res.success && res.resetToken) {
        setSecurityResetToken(res.resetToken);
        setSecuritySuccess("কোড সফলভাবে যাচাই হয়েছে! এবার নতুন পাসওয়ার্ড সেট করুন।");
        triggerToast("কোড সফলভাবে যাচাই হয়েছে!");
      } else {
        throw new Error(res?.error || res?.message || "কোড যাচাই ব্যর্থ হয়েছে");
      }
    } catch (err: any) {
      setSecurityError(err?.message || "ভুল ভেরিফিকেশন কোড! অনুগ্রহ করে আবার চেষ্টা করুন।");
    } finally {
      setIsVerifyingSecurityOtp(false);
    }
  };

  const handleUpdateSecurityPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPasswordInput || newPasswordInput.length < 6) {
      setSecurityError("পাসওয়ার্ড ন্যূনতম ৬ অক্ষরের হতে হবে।");
      return;
    }
    if (newPasswordInput !== confirmPasswordInput) {
      setSecurityError("নতুন পাসওয়ার্ড দুটি মিলছে না! অনুগ্রহ করে মিলিয়ে লিখুন।");
      return;
    }

    setIsUpdatingPassword(true);
    setSecurityError("");
    setSecuritySuccess("");

    try {
      if (securityResetToken) {
        const res = await apiClient.post<any>("/api/auth/forgot-password/reset", {
          resetToken: securityResetToken,
          newPassword: newPasswordInput
        });
        if (!res || !res.success) {
          throw new Error(res?.error || res?.message || "পাসওয়ার্ড রিসেট ব্যর্থ হয়েছে");
        }
      } else {
        const uId = initialUser.uid || initialUser.id || customerId;
        const res = await apiClient.post<any>("/api/auth/profile/change-password", {
          userId: uId,
          newPassword: newPasswordInput
        });
        if (!res || !res.success) {
          throw new Error(res?.error || res?.message || "পাসওয়ার্ড আপডেট ব্যর্থ হয়েছে");
        }
      }

      setSecuritySuccess("পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!");
      triggerToast("পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!");
      setNewPasswordInput("");
      setConfirmPasswordInput("");
      setSecurityOtpSent(false);
      setSecurityOtpCode("");
      setSecurityResetToken("");
      setSecurityResetId("");
    } catch (err: any) {
      setSecurityError(err?.message || "পাসওয়ার্ড পরিবর্তন করতে সমস্যা হয়েছে।");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const isFullyVerified = Boolean(emailVerifiedLocal && phoneVerifiedLocal);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate QR Code data URL
  useEffect(() => {
    const qrData = JSON.stringify({
      id: customerId,
      name: displayName,
      user: username,
      tier: membershipTier,
      verified: isVerified,
      app: "KanchaBazar"
    });

    QRCode.toDataURL(qrData, {
      width: 200,
      margin: 1,
      color: {
        dark: "#064e3b",
        light: "#ffffff"
      }
    })
      .then((url) => setQrCodeDataUrl(url))
      .catch((err) => console.warn("QR generation error:", err));
  }, [customerId, displayName, username, membershipTier, isVerified]);

  // Toast notification helper
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Instant image compression and client-side update
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      triggerToast("ছবির সাইজ ১০ মেগাবাইটের কম হতে হবে");
      if (e.target) e.target.value = "";
      return;
    }

    setIsUploadingPhoto(true);

    // 1. Immediate local preview via URL.createObjectURL for 0ms lag
    const localPreviewUrl = URL.createObjectURL(file);
    setPhotoURL(localPreviewUrl);

    try {
      // 2. Compress image for ultra-fast upload & lightweight data URL
      const compressed = await compressImage(file, 400, 0.85);
      const immediateDataUrl = compressed.dataUrl || localPreviewUrl;

      // Update storage and broadcast event
      try {
        localStorage.setItem("kb_user_photo", immediateDataUrl);
        window.dispatchEvent(new CustomEvent("kb_profile_updated", { detail: { photoURL: immediateDataUrl } }));
      } catch {}

      // 3. Persist to Firestore document under photoURL, avatar, image
      const uId = initialUser.uid || initialUser.id;
      if (uId) {
        await setDoc(doc(db, "users", uId), {
          uid: uId,
          photoURL: immediateDataUrl,
          avatar: immediateDataUrl,
          image: immediateDataUrl,
          updatedAt: serverTimestamp()
        }, { merge: true }).catch(() => {});
      }

      // Notify parent if save handler is supplied
      if (onSaveProfile) {
        onSaveProfile({
          displayName,
          phone,
          email,
          address,
          photoURL: immediateDataUrl
        });
      }

      // 4. In background, upload to Cloudinary / Storage / CDN
      uploadImageWithFallback(file, {
        folder: "profiles",
        maxDimension: 400,
        quality: 0.85
      }).then(async (cdnUrl) => {
        if (cdnUrl && !cdnUrl.startsWith("data:") && uId) {
          setPhotoURL(cdnUrl);
          try {
            localStorage.setItem("kb_user_photo", cdnUrl);
            window.dispatchEvent(new CustomEvent("kb_profile_updated", { detail: { photoURL: cdnUrl } }));
          } catch {}
          await setDoc(doc(db, "users", uId), {
            photoURL: cdnUrl,
            avatar: cdnUrl,
            image: cdnUrl,
            updatedAt: serverTimestamp()
          }, { merge: true }).catch(() => {});
        }
      }).catch((cdnErr) => {
        console.warn("Background photo CDN upload notice:", cdnErr);
      });

      triggerToast("ছবি সফলভাবে আপডেট করা হয়েছে!");
    } catch (err) {
      console.error("Photo processing error:", err);
      triggerToast("ছবি আপলোড করতে ব্যর্থ হয়েছে।");
    } finally {
      setIsUploadingPhoto(false);
      if (e.target) e.target.value = "";
    }
  };

  // Save Delivery Address
  const handleSaveAddress = async () => {
    if (!tempAddress.trim()) {
      triggerToast("অনুগ্রহ করে সঠিক ঠিকানা লিখুন");
      return;
    }

    setAddress(tempAddress.trim());
    setIsEditingAddress(false);
    triggerToast("ডেলিভারি ঠিকানা সফলভাবে সংরক্ষণ করা হয়েছে!");

    if (onAddressUpdate) {
      await onAddressUpdate(tempAddress.trim());
    } else if (onSaveProfile) {
      await onSaveProfile({
        displayName,
        phone,
        email,
        address: tempAddress.trim(),
        photoURL
      });
    }
  };

  // Save Full Profile Form
  const handleSaveFullProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      triggerToast("অনুগ্রহ করে আপনার নাম লিখুন");
      return;
    }

    setIsSaving(true);
    try {
      const trimmed = displayName.trim();
      const uId = initialUser.uid || initialUser.id;
      if (uId) {
        await setDoc(doc(db, "users", uId), {
          displayName: trimmed,
          fullName: trimmed,
          name: trimmed,
          phone: phone.trim(),
          email: email.trim(),
          address: address.trim(),
          photoURL: photoURL || "",
          updatedAt: serverTimestamp()
        }, { merge: true });
        if (auth.currentUser) {
          await updateProfile(auth.currentUser, {
            displayName: trimmed,
            photoURL: photoURL || ""
          }).catch(() => {});
        }
      }

      if (onSaveProfile) {
        await onSaveProfile({
          displayName: trimmed,
          fullName: trimmed,
          name: trimmed,
          phone: phone.trim(),
          email: email.trim(),
          address: address.trim(),
          photoURL
        });
      }
      try {
        if (photoURL) {
          localStorage.setItem("kb_user_photo", photoURL);
        } else {
          localStorage.removeItem("kb_user_photo");
        }
        window.dispatchEvent(new CustomEvent("kb_profile_updated", { detail: { photoURL } }));
      } catch {}
      triggerToast("প্রোফাইল তথ্য সফলভাবে সংরক্ষণ করা হয়েছে!");
      setShowProfileEditModal(false);
    } catch (err) {
      triggerToast("সংরক্ষণ ব্যর্থ হয়েছে!");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 text-slate-900 font-sans antialiased pb-12 select-none">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-lg border border-emerald-500/30 flex items-center space-x-2 animate-bounce">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Mobile Slide-out Drawer (Modal) */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Dark Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setIsMenuOpen(false)}
          />

          {/* Drawer Menu Panel */}
          <aside className="relative w-72 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col justify-between z-10 animate-in slide-in-from-left duration-300">
            <div className="flex flex-col flex-1 min-h-0">
              {/* Drawer Top Header: Brand Logo & User Profile Info */}
              <div className="p-4 border-b border-gray-100 bg-slate-50/70 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <img 
                      src={APP_LOGO_URL} 
                      alt="কাঁচা বাজার" 
                      className="h-8 w-auto object-contain rounded-xl border border-emerald-100 bg-white p-0.5 shadow-2xs shrink-0" 
                    />
                    <span className="text-sm font-black text-emerald-800">কাঁচা বাজার</span>
                  </div>
                  {/* Close Button (X) */}
                  <button
                    type="button"
                    onClick={() => setIsMenuOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition cursor-pointer"
                    aria-label="Close menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-center space-x-3 pt-2 border-t border-slate-200/60">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-sm overflow-hidden border border-emerald-300">
                    {photoURL ? (
                      <img src={photoURL} alt={displayName} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-5 h-5 text-emerald-700" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-slate-800 text-xs truncate">{displayName}</p>
                    <p className="text-[10px] text-emerald-600 font-bold tracking-tight">@{username}</p>
                  </div>
                </div>
              </div>

              {/* Navigation Links */}
              <nav className="flex-1 min-h-0 overflow-y-auto space-y-1.5 p-4">
                {[
                  { id: "dashboard", labelBn: "ড্যাশবোর্ড", icon: <User className="w-4 h-4" /> },
                  { id: "orders", labelBn: "অর্ডার হিস্ট্রি / ট্র্যাকিং", icon: <ShoppingBag className="w-4 h-4" /> },
                  { id: "rewards", labelBn: "রিওয়ার্ড পয়েন্ট", icon: <Award className="w-4 h-4" /> },
                  { id: "wishlist", labelBn: "উইশলিস্ট", icon: <Heart className="w-4 h-4" /> },
                  { id: "address", labelBn: "ডেলিভারি ঠিকানা", icon: <MapPin className="w-4 h-4" /> },
                  { id: "wallet", labelBn: "আমার ওয়ালেট", icon: <CreditCard className="w-4 h-4" /> },
                  { id: "referral", labelBn: "রেফার অ্যান্ড আর্ন", icon: <Gift className="w-4 h-4" /> },
                  { id: "notifications", labelBn: "নোটিফিকেশনস", icon: <Bell className="w-4 h-4" /> },
                  { id: "settings", labelBn: "প্রোফাইল সেটিংস", icon: <Settings className="w-4 h-4" /> }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setIsMenuOpen(false);
                      if (item.id === "address") {
                        setTempAddress(address);
                        setShowAddressModal(true);
                        return;
                      }
                      if (item.id === "wishlist") {
                        setShowWishlistModal(true);
                        return;
                      }
                      if (item.id === "notifications") {
                        setShowNotificationsModal(true);
                        return;
                      }
                      if (item.id === "settings") {
                        setShowProfileEditModal(true);
                        return;
                      }
                      setActiveTab(item.id);
                      if (onNavigateTab) {
                        onNavigateTab(item.id);
                      }
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer text-left ${
                      activeTab === item.id
                        ? "bg-emerald-600 text-white shadow-xs font-black"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <span className="shrink-0">{item.icon}</span>
                      <span>{item.labelBn}</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                  </button>
                ))}
              </nav>
            </div>

            {/* Red Logout Button Cleanly Pinned at the Very Bottom */}
            <div className="border-t border-gray-100 p-4 shrink-0 bg-white">
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  if (onLogout) onLogout();
                }}
                className="w-full flex items-center justify-center space-x-2 px-3.5 py-2.5 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold transition cursor-pointer border border-red-100"
              >
                <LogOut className="w-4 h-4" />
                <span>লগআউট</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* 2. Top Header (Mobile View) */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 sm:px-6 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-2.5">
          {/* Hamburger Menu Icon */}
          <button
            type="button"
            onClick={() => setIsMenuOpen(true)}
            className="p-1.5 -ml-1 text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5 text-slate-800" />
          </button>

          <img 
            src={APP_LOGO_URL} 
            alt="কাঁচা বাজার" 
            className="h-8 w-auto max-w-[36px] object-contain rounded-xl border border-emerald-100 bg-white p-0.5 shadow-2xs shrink-0" 
          />

          {/* App Title */}
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 leading-none">
              গ্রাহক প্রোফাইল
            </h1>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5">
              কাস্টমার ড্যাশবোর্ড ও মেম্বারশিপ
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center space-x-2.5">
          {/* Notification Bell Icon */}
          <button
            type="button"
            onClick={() => setShowNotificationsModal(true)}
            className="relative p-2 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white animate-pulse" />
          </button>

          {/* User Profile Avatar Preview */}
          <button
            type="button"
            onClick={() => setShowProfileEditModal(true)}
            className="flex items-center pl-1 cursor-pointer focus:outline-none"
            title="প্রোফাইল দেখুন"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs overflow-hidden border-2 border-emerald-500/40 shadow-xs">
              {photoURL ? (
                <img src={photoURL} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <User className="w-4 h-4 text-emerald-700" />
              )}
            </div>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-md sm:max-w-2xl mx-auto px-4 pt-4 sm:pt-6 space-y-4 sm:space-y-5">
        {activeTab === "rewards" ? (
          <RewardRedemptionView
            user={{
              ...initialUser,
              uid: initialUser.uid || initialUser.id,
              phone: phone || initialUser.phone,
              address: address || initialUser.address
            }}
            currentPoints={rewardPoints}
            onPointsUpdated={(newPts) => setLiveRewardPoints(newPts)}
            onBack={() => setActiveTab("dashboard")}
            triggerToast={(bn) => triggerToast(bn)}
          />
        ) : (
          <>
            {/* Hidden File Input for Avatar Change */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoSelect}
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              style={{ display: "none" }}
            />

        {/* 3. Hero Card (Profile & Digital ID Badge) */}
        <div className="relative bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-emerald-700/30 overflow-hidden">
          {/* Ambient Decorative Background Glows */}
          <div className="absolute top-0 right-0 -mr-12 -mt-12 w-44 h-44 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-36 h-36 rounded-full bg-teal-500/10 blur-xl pointer-events-none" />

          {/* Top Row: Avatar + User Info */}
          <div className="relative z-10 flex items-center space-x-4">
            {/* Left: Circular User Avatar with Clean Border + Camera Button */}
            <div className="relative shrink-0">
              <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-slate-800 border-2 border-white/90 shadow-md ring-4 ring-emerald-500/30 overflow-hidden flex items-center justify-center">
                {photoURL ? (
                  <img src={photoURL} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-9 h-9 sm:w-10 sm:h-10 text-emerald-400" />
                )}
              </div>

              {/* Camera Icon Overlay to Change Photo */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingPhoto}
                className="absolute bottom-0 right-0 p-1.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white shadow-md border-2 border-slate-900 transition cursor-pointer"
                title="ছবি পরিবর্তন করুন"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Right: User Information */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-1.5 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-white leading-tight truncate">
                  {displayName}
                </h2>
                {isFullyVerified || isVerified ? (
                  <button
                    type="button"
                    onClick={handleOpenVerificationSection}
                    title="পরিচয় নিশ্চিত (ভেরিফাইড)"
                    className="cursor-pointer hover:opacity-80 transition"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleOpenVerificationSection}
                    title="পরিচয় নিশ্চিত করুন (ভেরিফাই করুন)"
                    className="cursor-pointer hover:opacity-80 transition text-amber-400"
                  >
                    <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                  </button>
                )}
              </div>

              <div className="flex items-center space-x-2 text-xs text-emerald-200/90 font-medium mt-1">
                <span className="font-bold">ID: {customerId}</span>
                <span className="text-emerald-400/50">•</span>
                <span className="text-emerald-300 font-mono">@{username}</span>
              </div>

              {/* Badges Row: Verified & Membership Tier */}
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                {isFullyVerified || isVerified ? (
                  <button
                    type="button"
                    onClick={handleOpenVerificationSection}
                    className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-400/30 transition cursor-pointer shadow-xs active:scale-95"
                    title="পরিচয় নিশ্চিত স্ট্যাটাস দেখুন"
                  >
                    <CheckCircle className="w-3 h-3 text-emerald-400" />
                    <span>✓ পরিচয় নিশ্চিত</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleOpenVerificationSection}
                    className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-400/40 hover:border-amber-300 transition cursor-pointer shadow-xs active:scale-95 group"
                    title="পরিচয় নিশ্চিত করতে ভেরিফিকেশন মোডাল খুলুন"
                  >
                    <ShieldAlert className="w-3 h-3 text-amber-300 group-hover:scale-110 transition-transform" />
                    <span>
                      {emailVerifiedLocal || phoneVerifiedLocal 
                        ? "পরিচয় নিশ্চিত করুন (১/২)" 
                        : "আনভেরিফাইড (পরিচয় নিশ্চিত করুন)"}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowMembershipModal(true)}
                  className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black transition-all active:scale-95 shadow-xs group cursor-pointer ${
                    isPremiumQualified
                      ? "bg-gradient-to-r from-amber-400/20 via-yellow-400/25 to-amber-500/20 hover:from-amber-400/35 hover:to-amber-500/35 text-amber-300 border border-amber-400/40 hover:border-amber-300/60"
                      : "bg-slate-800/90 hover:bg-slate-800 text-slate-300 border border-slate-700/80 hover:border-amber-400/40"
                  }`}
                  title="কাঁচা বাজার প্রিমিয়াম মেম্বারশিপ অফার ও শর্তাবলী দেখুন"
                >
                  <Sparkles className="w-3 h-3 text-amber-300 animate-pulse group-hover:rotate-12 transition-transform" />
                  <span>প্রিমিয়াম মেম্বার</span>
                  {isPremiumQualified ? (
                    <ChevronRight className="w-2.5 h-2.5 text-amber-300/80 group-hover:translate-x-0.5 transition-transform" />
                  ) : (
                    <span className="text-[9px] text-amber-400 underline ml-0.5">(অফার দেখুন)</span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Row of Hero Card: Digital Membership ID & QR Code Section */}
          <div className="relative z-10 mt-5 pt-3.5 border-t border-emerald-700/30 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div
                onClick={() => setShowQrModal(true)}
                className="w-10 h-10 rounded-xl bg-white p-1 shadow-sm shrink-0 cursor-pointer hover:scale-105 transition"
              >
                {qrCodeDataUrl ? (
                  <img src={qrCodeDataUrl} alt="QR Code" className="w-full h-full object-contain" />
                ) : (
                  <QrCode className="w-full h-full text-emerald-800" />
                )}
              </div>
              <div>
                <p className="text-[10px] font-bold text-emerald-200/80 uppercase tracking-wider">
                  ডিজিটাল মেম্বার আইডি
                </p>
                <p className="text-xs font-black text-white tracking-wide">
                  {customerId}-VERIFIED
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowQrModal(true)}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition flex items-center space-x-1 cursor-pointer border border-white/10"
            >
              <QrCode className="w-3.5 h-3.5 text-emerald-400" />
              <span>QR কোড</span>
            </button>
          </div>
        </div>

        {/* 4. Quick Stats Grid (2x2 Clean Minimalist Cards) */}
        <div>
          <div className="flex items-center justify-between mb-2.5 px-0.5">
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">
              অ্যাকাউন্ট ওভারভিউ
            </h3>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              লাইভ আপডেট
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Card 1: মোট অর্ডার */}
            <div
              onClick={() => onNavigateTab && onNavigateTab("orders")}
              className="relative overflow-hidden bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-white border border-emerald-200/60 rounded-2xl p-4 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all duration-200 cursor-pointer group active:scale-95 transform hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-500/25 group-hover:scale-105 transition-transform duration-200">
                  <ShoppingBag className="w-5 h-5" />
                </div>
              </div>
              <p className="text-xs font-semibold text-slate-500">মোট অর্ডার</p>
              <h4 className="text-xl font-black text-slate-800 tracking-tight mt-1 flex items-baseline">
                <span>{totalOrders}</span>
                <span className="text-xs font-bold text-emerald-700 ml-1.5 bg-emerald-100/70 px-2 py-0.5 rounded-lg border border-emerald-200/60">
                  টি
                </span>
              </h4>
            </div>

            {/* Card 2: ওয়ালেট ব্যালেন্স */}
            <div
              onClick={() => onNavigateTab && onNavigateTab("wallet")}
              className="relative overflow-hidden bg-gradient-to-br from-teal-500/10 via-teal-500/5 to-white border border-teal-200/60 rounded-2xl p-4 shadow-xs hover:shadow-md hover:border-teal-300 transition-all duration-200 cursor-pointer group active:scale-95 transform hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-600 to-cyan-500 text-white flex items-center justify-center font-bold shadow-md shadow-teal-500/25 group-hover:scale-105 transition-transform duration-200">
                  <CreditCard className="w-5 h-5" />
                </div>
              </div>
              <p className="text-xs font-semibold text-slate-500">ওয়ালেট ব্যালেন্স</p>
              <h4 className="text-xl font-black text-slate-800 tracking-tight mt-1 flex items-baseline">
                <span className="text-base font-bold text-teal-600 mr-0.5">৳</span>
                <span>{walletBalance}</span>
              </h4>
            </div>

            {/* Card 3: 🎉 রেফার করে জিতুন ৳১৯! */}
            <div
              onClick={() => onNavigateTab && onNavigateTab("referral")}
              className="relative overflow-hidden bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-white border border-amber-200/60 rounded-2xl p-4 shadow-xs hover:shadow-md hover:border-amber-300 transition-all duration-200 cursor-pointer group active:scale-95 transform hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center font-bold shadow-md shadow-amber-500/25 group-hover:scale-105 transition-transform duration-200">
                  <Gift className="w-5 h-5" />
                </div>
              </div>
              <p className="text-xs font-semibold text-slate-500 truncate" title="🎉 রেফার করে জিতুন ৳১৯!">
                🎉 রেফার করে জিতুন ৳১৯!
              </p>
              <h4 className="text-xl font-black text-slate-800 tracking-tight mt-1 flex items-baseline">
                <span className="text-base font-bold text-amber-600 mr-0.5">৳</span>
                <span>{referralEarnings}</span>
              </h4>
            </div>

            {/* Card 4: রিওয়ার্ড পয়েন্ট */}
            <div
              onClick={() => setActiveTab("rewards")}
              className="relative overflow-hidden bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-white border border-purple-200/60 rounded-2xl p-4 shadow-xs hover:shadow-md hover:border-purple-300 transition-all duration-200 cursor-pointer group active:scale-95 transform hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 text-white flex items-center justify-center font-bold shadow-md shadow-purple-500/25 group-hover:scale-105 transition-transform duration-200">
                  <Award className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black text-purple-700 bg-gradient-to-r from-purple-50 to-pink-50 px-2.5 py-1 rounded-full border border-purple-200/80 shadow-xs flex items-center gap-1 group-hover:border-purple-300 transition-colors">
                  <Gift className="w-3 h-3 text-purple-600" />
                  <span>উপহার নিন</span>
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-500">রিওয়ার্ড পয়েন্ট</p>
              <h4 className="text-xl font-black text-slate-800 tracking-tight mt-1 flex items-baseline">
                <span>{rewardPoints}</span>
                <span className="text-xs font-bold text-purple-700 ml-1.5 bg-purple-100/70 px-2 py-0.5 rounded-lg border border-purple-200/60">
                  pts
                </span>
              </h4>
            </div>
          </div>
        </div>

        {/* My Shopping Cart Section (আমার শপিং কার্ট) - Replaces Recent Orders */}
        <div className="bg-white border border-emerald-100/90 hover:border-emerald-200 rounded-2xl p-5 shadow-xs space-y-4 transition-all">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
                <ShoppingCart className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-2">
                  <h3 className="font-black text-sm text-slate-800 truncate">
                    আমার শপিং কার্ট
                  </h3>
                  {cart.length > 0 && (
                    <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-2 py-0.5 rounded-full shrink-0">
                      {cartTotalQty} টি পণ্য
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 font-medium truncate">
                  {cart.length > 0 ? "কার্টে যুক্ত পণ্যসমূহের তালিকা" : "পছন্দমতো পণ্য যোগ করে কেনাকাটা শুরু করুন"}
                </p>
              </div>
            </div>
            {cart.length > 0 && (
              <button 
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent("kb_open_cart"))}
                className="text-emerald-600 text-xs font-bold hover:text-emerald-700 flex items-center space-x-1 cursor-pointer bg-emerald-50/80 hover:bg-emerald-100/80 px-2.5 py-1.5 rounded-xl transition shrink-0"
              >
                <span>কার্ট দেখুন</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {cart.length === 0 ? (
            <div 
              onClick={() => window.dispatchEvent(new CustomEvent("kb_open_cart"))}
              className="text-center py-6 px-4 bg-slate-50/70 border border-dashed border-slate-200 rounded-xl cursor-pointer hover:bg-emerald-50/30 hover:border-emerald-200 transition group"
            >
              <div className="w-11 h-11 mx-auto mb-2 rounded-2xl bg-emerald-100/60 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <ShoppingCart className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-xs font-bold text-slate-600">
                আপনার শপিং কার্ট খালি!
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                কাঁচা বাজার থেকে তাজা পণ্যগুলো কার্টে যুক্ত করুন
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div 
                onClick={() => window.dispatchEvent(new CustomEvent("kb_open_cart"))}
                className="divide-y divide-slate-100 max-h-60 overflow-y-auto pr-1 cursor-pointer group"
                title="কার্ট দেখতে ক্লিক করুন"
              >
                {cart.map((item, idx) => {
                  const itemPrice = item.selectedOption?.price !== undefined 
                    ? item.selectedOption.price 
                    : (item.product?.price || 0);
                  const itemTotal = itemPrice * (item.quantity || 1);
                  const productName = item.product?.nameBn || item.product?.nameEn || "পণ্য";
                  const unitLabel = item.selectedOption 
                    ? `${item.selectedOption.value} ${item.selectedOption.unit}` 
                    : item.product?.unitBn;

                  return (
                    <div key={`cart_mb_${item.product?.id || idx}_${idx}`} className="py-2.5 flex items-center justify-between text-xs hover:bg-slate-50/80 px-2 rounded-xl transition">
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200/80 overflow-hidden shrink-0 flex items-center justify-center">
                          {item.product?.image ? (
                            <img 
                              src={item.product.image} 
                              alt={productName} 
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <ShoppingCart className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 text-xs truncate max-w-[150px]">
                            {productName}
                          </p>
                          <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 mt-0.5">
                            {unitLabel && (
                              <span className="bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-medium">
                                {unitLabel}
                              </span>
                            )}
                            <span>•</span>
                            <span className="font-semibold text-emerald-600">
                              {item.quantity} টি
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-black text-slate-800 text-xs">
                          ৳{itemTotal}
                        </p>
                        {item.quantity > 1 && (
                          <p className="text-[10px] text-slate-400">
                            ৳{itemPrice} / টি
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Summary & Checkout Action */}
              <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    মোট বিল
                  </span>
                  <span className="font-black text-sm text-slate-800">
                    ৳{cartSubtotal}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent("kb_open_cart"))}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-xs hover:shadow-md cursor-pointer shrink-0"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>কার্ট ও চেকআউট</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Account Logout Block */}
        <div className="bg-white border border-red-100 rounded-2xl p-4 shadow-xs flex items-center justify-between gap-3">
          <div>
            <h4 className="font-black text-xs text-slate-800">
              অ্যাকাউন্ট থেকে লগআউট
            </h4>
            <p className="text-[10px] text-slate-400 mt-0.5">
              নিরাপদে আপনার অ্যাকাউন্ট থেকে বের হয়ে যান
            </p>
          </div>
          <button
            type="button"
            onClick={() => onLogout && onLogout()}
            className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>লগআউট</span>
          </button>
        </div>
          </>
        )}
      </main>

      {/* QR Code Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setShowQrModal(false)}
          />
          <div className="relative bg-white rounded-3xl p-6 max-w-xs w-full shadow-2xl z-10 text-center space-y-4">
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center font-black">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-base text-slate-900">ডিজিটাল মেম্বারশিপ QR</h3>
              <p className="text-xs text-slate-500 mt-0.5">গ্রাহক পরিচয় ও ডেলিভারি পয়েন্ট যাচাই</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-center">
              {qrCodeDataUrl ? (
                <img src={qrCodeDataUrl} alt="Member QR" className="w-44 h-44 object-contain" />
              ) : (
                <p className="text-xs text-slate-400">QR কোড তৈরি হচ্ছে...</p>
              )}
            </div>
            <p className="text-[11px] font-mono font-bold text-slate-500 bg-slate-100 py-1.5 rounded-xl">
              ID: {customerId} • @{username}
            </p>
          </div>
        </div>
      )}

      {/* Notifications Modal */}
      {showNotificationsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setShowNotificationsModal(false)}
          />
          <div className="relative bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl z-10 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center space-x-2">
                <Bell className="w-5 h-5 text-emerald-600" />
                <h3 className="font-black text-sm text-slate-900">নোটিফিকেশনস</h3>
              </div>
              <button
                onClick={() => setShowNotificationsModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2.5 max-h-64 overflow-y-auto">
              <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl">
                <p className="text-xs font-bold text-emerald-950">স্বাগতম অফার সক্রিয়!</p>
                <p className="text-[11px] text-slate-500 mt-0.5">প্রথম অর্ডারে ফ্রি হোম ডেলিভারি উপভোগ করুন।</p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <p className="text-xs font-bold text-slate-800">ওয়ালেট আপডেট</p>
                <p className="text-[11px] text-slate-500 mt-0.5">আপনার ওয়ালেট অ্যাকাউন্ট প্রস্তুত।</p>
              </div>
            </div>
            <button
              onClick={() => setShowNotificationsModal(false)}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>
      )}

      {/* Profile Settings Modal */}
      {showProfileEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setShowProfileEditModal(false)}
          />
          <div className="relative bg-white rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl z-10 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center space-x-2">
                <Settings className="w-5 h-5 text-emerald-600" />
                <h3 className="font-black text-sm text-slate-900">প্রোফাইল সেটিংস</h3>
              </div>
              <button
                onClick={() => setShowProfileEditModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Section Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl">
              <button
                type="button"
                onClick={() => setProfileModalTab("all")}
                className={`flex-1 py-1.5 px-2 rounded-xl text-[11px] font-bold transition cursor-pointer text-center ${
                  profileModalTab === "all"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                সব সেকশন
              </button>
              <button
                type="button"
                onClick={() => {
                  setProfileModalTab("verification");
                  setTimeout(() => {
                    verificationSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }, 100);
                }}
                className={`flex-1 py-1.5 px-2 rounded-xl text-[11px] font-bold transition flex items-center justify-center space-x-1 cursor-pointer ${
                  profileModalTab === "verification"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-emerald-700"
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>ভেরিফিকেশন</span>
              </button>
              <button
                type="button"
                onClick={() => setProfileModalTab("profile")}
                className={`flex-1 py-1.5 px-2 rounded-xl text-[11px] font-bold transition flex items-center justify-center space-x-1 cursor-pointer ${
                  profileModalTab === "profile"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>ব্যক্তিগত তথ্য</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setProfileModalTab("security");
                  setTimeout(() => {
                    securitySectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }, 100);
                }}
                className={`flex-1 py-1.5 px-2 rounded-xl text-[11px] font-bold transition flex items-center justify-center space-x-1 cursor-pointer ${
                  profileModalTab === "security"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-emerald-700"
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>নিরাপত্তা</span>
              </button>
            </div>

            {(profileModalTab === "all" || profileModalTab === "profile") && (
              <form onSubmit={handleSaveFullProfile} className="space-y-3.5">
              {/* Avatar circle in modal */}
              <div className="flex items-center space-x-4 bg-slate-50 p-3 rounded-2xl border border-gray-100">
                <div className="relative w-14 h-14 rounded-full bg-slate-200 border-2 border-white shadow-xs overflow-hidden flex items-center justify-center shrink-0">
                  {photoURL ? (
                    <img src={photoURL} alt={displayName} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-7 h-7 text-slate-400" />
                  )}
                  {isUploadingPhoto && (
                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center text-white">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    </div>
                  )}
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingPhoto}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {isUploadingPhoto ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Camera className="w-3.5 h-3.5" />
                    )}
                    <span>{isUploadingPhoto ? "আপলোড হচ্ছে..." : "ছবি পরিবর্তন করুন"}</span>
                  </button>
                  <p className="text-[10px] text-slate-400 mt-1">সর্বোচ্চ ১০MB (JPG, PNG, WebP)</p>
                </div>
              </div>

              {/* Display Name Input */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">সম্পূর্ণ নাম</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="আপনার নাম"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:bg-white outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Phone Input */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">মোবাইল নম্বর</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:bg-white outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Email Input */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">ইমেইল ঠিকানা</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:bg-white outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Delivery Address Input */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">ডিফল্ট ঠিকানা</label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={2}
                  placeholder="আপনার সম্পূর্ণ ঠিকানা"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:bg-white outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowProfileEditModal(false)}
                  className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-xs disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSaving ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন"}</span>
                </button>
              </div>
            </form>
            )}

            {/* SECTION: অ্যাকাউন্ট ভেরিফিকেশন (Email & Phone OTP) */}
            {(profileModalTab === "all" || profileModalTab === "verification") && (
              <div
                ref={verificationSectionRef}
                className={`pt-4 ${profileModalTab === "all" ? "border-t border-gray-100" : ""} space-y-3 ${
                  profileModalTab === "verification" ? "ring-2 ring-emerald-500/20 rounded-2xl p-3 bg-emerald-50/20" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-black text-slate-800">
                    অ্যাকাউন্ট ভেরিফিকেশন
                  </h4>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                  isFullyVerified 
                    ? "bg-emerald-100 text-emerald-800 border-emerald-300" 
                    : (emailVerifiedLocal || phoneVerifiedLocal)
                      ? "bg-amber-100 text-amber-800 border-amber-300"
                      : "bg-red-50 text-red-700 border-red-200"
                }`}>
                  {isFullyVerified 
                    ? "ভেরিফাইড ✓" 
                    : (emailVerifiedLocal || phoneVerifiedLocal) 
                      ? "অসম্পূর্ণ (১/২)" 
                      : "আনভেরিফাইড"}
                </span>
              </div>

              {/* Method A: Email Verification */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    <span className="font-bold text-slate-700">ইমেইল ভেরিফিকেশন</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                    emailVerifiedLocal ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                  }`}>
                    {emailVerifiedLocal ? "ভেরিফাইড ✓" : "অপেক্ষমান"}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 font-mono">{email}</p>

                {!emailVerifiedLocal && (
                  <div className="pt-2 border-t border-slate-200 space-y-2.5">
                    {!verificationEmailSent ? (
                      <div className="space-y-2">
                        <p className="text-[10px] text-slate-500 leading-tight">
                          আপনার ইমেইল ঠিকানায় কাঁচা বাজার টিম থেকে একটি ৬-সংখ্যার ওটিপি কোড পাঠানো হবে।
                        </p>
                        <button
                          type="button"
                          onClick={handleSendEmailVerification}
                          disabled={isSendingVerificationEmail || emailVerificationCooldown > 0}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                        >
                          {isSendingVerificationEmail ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>পাঠানো হচ্ছে...</span>
                            </>
                          ) : (
                            <>
                              <Mail className="w-3.5 h-3.5" />
                              <span>ভেরিফিকেশন কোড পাঠান</span>
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2.5 bg-emerald-50/70 p-3 rounded-xl border border-emerald-200 animate-in fade-in duration-200">
                        <div className="flex items-start space-x-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <div className="space-y-0.5">
                            <p className="text-[11px] font-bold text-emerald-950">
                              ভেরিফিকেশন কোড পাঠানো হয়েছে!
                            </p>
                            <p className="text-[10px] text-emerald-900/80 leading-relaxed">
                              {email || ""} ঠিকানায় প্রেরিত ৬-সংখ্যার কোডটি প্রবেশ করিয়ে যাচাই সম্পন্ন করুন।
                            </p>
                          </div>
                        </div>

                        <div className="pt-1.5 border-t border-emerald-200/60 space-y-2">
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={6}
                            value={emailOtpInput}
                            onChange={(e) => setEmailOtpInput(e.target.value.replace(/[^\d]/g, "").slice(0, 6))}
                            placeholder="৬-সংখ্যার কোড (যেমন: 123456)"
                            className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-center font-mono text-sm font-bold tracking-widest text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                          />
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={handleVerifyEmailOtp}
                              disabled={isVerifyingEmailOtp || emailOtpInput.trim().length !== 6}
                              className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1 cursor-pointer disabled:opacity-50 shadow-xs"
                            >
                              {isVerifyingEmailOtp ? (
                                <>
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                  <span>যাচাই করা হচ্ছে...</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>যাচাই সম্পন্ন করুন</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={handleSendEmailVerification}
                              disabled={isSendingVerificationEmail || emailVerificationCooldown > 0}
                              className="px-3 py-2 bg-white text-emerald-800 border border-emerald-300 rounded-xl text-[10px] font-bold transition cursor-pointer disabled:opacity-50 shrink-0"
                            >
                              {emailVerificationCooldown > 0
                                ? `${emailVerificationCooldown} সে.`
                                : "পুনরায় পাঠান"}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Method B: Phone Verification */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <span className="font-bold text-slate-700">ফোন নাম্বার ভেরিফিকেশন</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                    phoneVerifiedLocal ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                  }`}>
                    {phoneVerifiedLocal ? "ভেরিফাইড ✓" : "অপেক্ষমান"}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 font-mono">{phone}</p>

                {!phoneVerifiedLocal && (
                  <div className="pt-1.5 border-t border-slate-200 space-y-2">
                    {!phoneOtpSent ? (
                      <button
                        id="mobile-phone-verify-button"
                        type="button"
                        onClick={handleSendPhoneOtp}
                        disabled={isSendingPhoneOtp || phoneOtpCooldown > 0}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                      >
                        {isSendingPhoneOtp && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                        <span>
                          {phoneOtpCooldown > 0
                            ? `পুনরায় পাঠান (${phoneOtpCooldown} সে.)`
                            : "ওটিপি পাঠান / ভেরিফাই করুন"}
                        </span>
                      </button>
                    ) : (
                      <div className="space-y-2 bg-white p-2.5 rounded-lg border border-emerald-200">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-emerald-800">
                            ফোনে প্রেরিত ৬-সংখ্যার OTP লিখুন:
                          </span>
                          {phoneOtpCooldown > 0 ? (
                            <span className="text-[9px] text-slate-400 font-mono">
                              {phoneOtpCooldown} সে.
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={handleSendPhoneOtp}
                              disabled={isSendingPhoneOtp}
                              className="text-[9px] text-emerald-600 hover:underline font-bold cursor-pointer"
                            >
                              পুনরায় কোড
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          maxLength={6}
                          value={phoneOtpCode}
                          onChange={(e) => setPhoneOtpCode(e.target.value.replace(/\D/g, ""))}
                          placeholder="• • • • • •"
                          className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-500 rounded-lg p-2 text-xs text-center font-mono font-bold tracking-widest outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleVerifyPhoneOtp}
                          disabled={isVerifyingPhone || phoneOtpCode.length < 6}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                        >
                          {isVerifyingPhone && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                          <span>যাচাই সম্পন্ন করুন</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            )}

            {/* SECTION: অ্যাকাউন্ট ভেরিফিকেশন ও স্ট্যাটাস */}
            {(profileModalTab === "all" || profileModalTab === "verification") && (
              <div className="pt-3 border-t border-gray-100 space-y-2.5">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                অ্যাকাউন্ট ভেরিফিকেশন ও স্ট্যাটাস
              </h4>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold block">কাস্টমার আইডি</span>
                  <p className="font-mono font-black text-emerald-700">{customerId}</p>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 font-bold block">মেম্বারশিপ টায়ার</span>
                  <button
                    type="button"
                    onClick={() => setShowMembershipModal(true)}
                    className="inline-flex items-center gap-1 font-bold text-slate-800 hover:text-emerald-700 transition cursor-pointer text-left mt-1"
                  >
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span>{isPremiumQualified ? "✨ প্রিমিয়াম মেম্বার" : "সাধারণ মেম্বার (Regular Member)"}</span>
                  </button>
                  <div className="mt-1">
                    {isPremiumQualified ? (
                      <span className="px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                        ভেরিফাইড / সক্রিয়
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowMembershipModal(true)}
                        className="px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-amber-100 text-amber-800 border border-amber-200"
                      >
                        শর্ত পূরণ করুন (অফার দেখুন)
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
            )}

            {/* SECTION: পাসওয়ার্ড পরিবর্তন ও নিরাপত্তা (Change Password & Security) */}
            {(profileModalTab === "all" || profileModalTab === "security") && (
              <div ref={securitySectionRef} className="pt-3 border-t border-gray-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                      <Lock className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-800">
                        পাসওয়ার্ড পরিবর্তন ও নিরাপত্তা
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        ৬-সংখ্যার ওটিপি যাচাইকরণের মাধ্যমে নতুন পাসওয়ার্ড সেট করুন
                      </p>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    নিরাপদ যাচাই
                  </span>
                </div>

                {securityError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-2.5 flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{securityError}</span>
                  </div>
                )}

                {securitySuccess && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl p-2.5 flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                    <span>{securitySuccess}</span>
                  </div>
                )}

                {/* Step 1: Send & Verify OTP if not yet verified */}
                {!securityResetToken ? (
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-2.5">
                    <div className="flex items-start space-x-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                        <Key className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1">
                        <h5 className="text-[11px] font-bold text-slate-800">
                          ধাপ ১: ওটিপি কোড যাচাইকরণ
                        </h5>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          পাসওয়ার্ড পরিবর্তনের পূর্বে আপনার পরিচয় নিশ্চিত করতে নিবন্ধিত অ্যাকাউন্টে ৬-সংখ্যার কোড পাঠানো হবে।
                        </p>
                        <p className="text-[10px] font-mono text-emerald-700 font-bold mt-1 truncate">
                          {email || phone || initialUser?.email || initialUser?.phone || "Registered Account"}
                        </p>
                      </div>
                    </div>

                    {!securityOtpSent ? (
                      <button
                        type="button"
                        onClick={handleSendSecurityOtp}
                        disabled={isSendingSecurityOtp}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {isSendingSecurityOtp ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>কোড পাঠানো হচ্ছে...</span>
                          </>
                        ) : (
                          <>
                            <Key className="w-3.5 h-3.5" />
                            <span>ভেরিফিকেশন কোড পাঠান</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="space-y-2.5 pt-2 border-t border-slate-200">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">
                            ৬-সংখ্যার কোডটি লিখুন:
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              maxLength={6}
                              value={securityOtpCode}
                              onChange={(e) => setSecurityOtpCode(e.target.value.replace(/\D/g, ""))}
                              placeholder="• • • • • •"
                              className="flex-1 bg-white border border-slate-300 focus:border-emerald-500 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold tracking-widest text-slate-800 outline-none text-center"
                            />
                            <button
                              type="button"
                              onClick={handleVerifySecurityOtp}
                              disabled={isVerifyingSecurityOtp || securityOtpCode.length < 6}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1 shrink-0 cursor-pointer disabled:opacity-50 shadow-xs"
                            >
                              {isVerifyingSecurityOtp && <RefreshCw className="w-3 h-3 animate-spin" />}
                              <span>যাচাই করুন</span>
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          {securityTimer > 0 ? (
                            <span>পুনরায় কোড: {securityTimer} সে.</span>
                          ) : (
                            <button
                              type="button"
                              onClick={handleSendSecurityOtp}
                              className="text-emerald-600 hover:underline font-bold cursor-pointer"
                            >
                              কোড পাননি? পুনরায় পাঠান
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Step 2: Set New Password Form */
                  <form onSubmit={handleUpdateSecurityPassword} className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-3">
                    <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 text-emerald-800 px-2.5 py-1.5 rounded-lg text-[11px] font-bold">
                      <div className="flex items-center space-x-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>ওটিপি সফলভাবে যাচাই হয়েছে ✓</span>
                      </div>
                      <span className="text-[9px] uppercase font-mono font-bold text-emerald-700">ধাপ ২ / ২</span>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">
                        নতুন পাসওয়ার্ড দিন
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? "text" : "password"}
                          required
                          placeholder="••••••••"
                          value={newPasswordInput}
                          onChange={(e) => setNewPasswordInput(e.target.value)}
                          className="w-full bg-white border border-slate-300 focus:border-emerald-500 rounded-xl pl-3 pr-9 py-1.5 text-xs text-slate-800 outline-none transition"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword((prev) => !prev)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                          tabIndex={-1}
                          title={showNewPassword ? "লুকান" : "দেখুন"}
                        >
                          {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">
                        নতুন পাসওয়ার্ড নিশ্চিত করুন
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          required
                          placeholder="••••••••"
                          value={confirmPasswordInput}
                          onChange={(e) => setConfirmPasswordInput(e.target.value)}
                          className="w-full bg-white border border-slate-300 focus:border-emerald-500 rounded-xl pl-3 pr-9 py-1.5 text-xs text-slate-800 outline-none transition"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((prev) => !prev)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                          tabIndex={-1}
                          title={showConfirmPassword ? "লুকান" : "দেখুন"}
                        >
                          {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <p className="text-[9px] text-slate-400">
                      পাসওয়ার্ড ন্যূনতম ৬ অক্ষরের হতে হবে।
                    </p>

                    <button
                      type="submit"
                      disabled={isUpdatingPassword || !newPasswordInput || !confirmPasswordInput}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isUpdatingPassword ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>পাসওয়ার্ড সংরক্ষণ হচ্ছে...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>নতুন পাসওয়ার্ড সংরক্ষণ করুন</span>
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 🌟 Premium Membership Info & Offer Modal */}
      {showMembershipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity"
            onClick={() => setShowMembershipModal(false)}
          />

          {/* Modal Container */}
          <div className="relative bg-gradient-to-b from-slate-900 via-emerald-950 to-slate-950 border border-amber-500/30 text-white rounded-3xl p-5 sm:p-7 max-w-md w-full shadow-2xl z-10 space-y-5 animate-in zoom-in-95 duration-200 overflow-hidden my-auto">
            {/* Top decorative ambient glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-56 h-28 bg-gradient-to-r from-amber-500/20 via-emerald-500/30 to-amber-500/20 rounded-full blur-2xl pointer-events-none" />

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowMembershipModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition cursor-pointer z-20"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="text-center space-y-2 pt-1 relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500/25 via-emerald-500/20 to-yellow-400/30 border border-amber-400/40 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/10">
                <Crown className="w-7 h-7 text-amber-300 animate-pulse" />
              </div>

              <h3 className="text-lg sm:text-xl font-black text-white leading-snug tracking-tight">
                🌟 কাঁচা বাজার প্রিমিয়াম মেম্বারশিপ অফার
              </h3>
              <p className="text-xs text-emerald-200/80 max-w-xs mx-auto">
                কাঁচা বাজার পরিবারের এক্সক্লুসিভ ভিআইপি প্রিভিলেজ ও বিশেষ সুবিধাসমূহ
              </p>
            </div>

            {/* Current Member Badge Display */}
            <div className="relative z-10 bg-emerald-900/40 border border-emerald-500/30 rounded-2xl px-4 py-3 flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-300">
                আপনার বর্তমান স্ট্যাটাস:
              </span>
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-amber-400/20 to-yellow-400/20 text-amber-300 border border-amber-400/40 shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>{membershipTier}</span>
              </span>
            </div>

            {/* Key Condition (প্রধান শর্ত) */}
            <div className="relative z-10 bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/15 border border-amber-500/35 rounded-2xl p-4 space-y-2 shadow-inner">
              <div className="flex items-center space-x-2 text-amber-300">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-amber-400" />
                <h4 className="text-xs font-black uppercase tracking-wider">
                  প্রধান শর্ত (Eligibility Criteria)
                </h4>
              </div>
              <ul className="space-y-1.5 pl-6 text-xs sm:text-sm font-bold text-white">
                <li className="list-disc leading-relaxed text-amber-100">
                  একদিনে সর্বনিম্ন ৬,০০০ (ছয় হাজার) টাকার বাজার বা অর্ডার সম্পন্ন করতে হবে।
                </li>
              </ul>
              <p className="text-[11px] text-amber-200/80 pl-6 leading-normal font-normal">
                এই লক্ষ্য পূরণ হওয়া মাত্রই আপনি স্থায়ী প্রিমিয়াম মেম্বার সুবিধা উপভোগ করতে পারবেন।
              </p>
            </div>

            {/* Benefits / Offer Details (সুবিধাসমূহ) */}
            <div className="relative z-10 space-y-2.5">
              <h4 className="text-xs font-black text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>সুবিধাসমূহ (Membership Benefits)</span>
              </h4>

              <div className="space-y-2.5">
                {/* Benefit 1: 5% Discount */}
                <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3.5 flex items-start space-x-3 shadow-xs">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 border border-amber-400/30">
                    <Percent className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <h5 className="text-xs font-black text-amber-200">
                      ফ্ল্যাট ৫% ডিসকাউন্ট (5% Discount)
                    </h5>
                    <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                      শর্ত পূরণ করে প্রিমিয়াম মেম্বার হলে পরবর্তী প্রত্যেক অর্ডারে পাবেন ৫% ডিসকাউন্ট।
                    </p>
                  </div>
                </div>

                {/* Benefit 2: Priority Support & Delivery */}
                <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3.5 flex items-start space-x-3 shadow-xs">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-400/30">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <h5 className="text-xs font-black text-emerald-200">
                      বিশেষ সাপোর্ট ও প্রায়োরিটি ডেলিভারি
                    </h5>
                    <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                      বিশেষ কাস্টমার সাপোর্ট ও প্রায়োরিটি ডেলিভারি সুবিধা।
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Clear CTA Buttons */}
            <div className="relative z-10 pt-2 flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowMembershipModal(false);
                  triggerToast("কাঁচা বাজার স্টোরফ্রন্টে আপনাকে স্বাগতম!");
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-xs font-black shadow-lg shadow-emerald-500/20 flex items-center justify-center space-x-2 cursor-pointer transition active:scale-95"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>বাজার করুন</span>
              </button>

              <button
                type="button"
                onClick={() => setShowMembershipModal(false)}
                className="py-3 px-5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white text-xs font-bold cursor-pointer transition active:scale-95 text-center"
              >
                <span>বুঝেছি</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
