import React, { useState, useEffect, useRef, useMemo } from "react";
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
  setDoc,
  updateDoc,
  serverTimestamp,
  increment,
  onSnapshot,
  sendEmailVerification,
  updatePassword,
  sendPasswordResetEmail,
  RecaptchaVerifier,
  signInWithPhoneNumber
} from "../../lib/firebase";
import type { ConfirmationResult } from "firebase/auth";
import { 
  User, CreditCard, ShoppingBag, Gift, MapPin, 
  ArrowUpRight, ArrowDownLeft, Clock, CheckCircle, 
  ShieldAlert, RefreshCw, Star, Share2, Clipboard, 
  Smartphone, Bell, Eye, EyeOff, LogOut, ChevronRight, Printer,
  Camera, Trash2, Save, Edit3, Lock, Mail, Phone, ShieldCheck,
  Menu, X, Sparkles, QrCode, Award, Heart, Settings, Edit2, Check,
  Crown, Percent, Zap, CheckCircle2, AlertCircle, Key, Ticket, ArrowLeft
} from "lucide-react";
import QRCode from "qrcode";
import OrderMemoModal from "./OrderMemoModal";
import RewardRedemptionView from "./RewardRedemptionView";
import { createTranslator } from "../../lib/formatUtils";
import { normalizeMemberId, generateMemberId, getDigitalMembershipCardId } from "../../lib/memberIdUtils";
import { checkAndUpgradePremiumMembership } from "../../lib/membership";
import { uploadImageWithFallback, compressImage } from "../../lib/imageUploadHelper";
import { apiClient } from "../../lib/apiClient";
import { APP_LOGO_URL } from "../../constants/branding";


interface CustomerPortalProps {
  user: any;
  onLogout: () => void;
  lang: "bn" | "en";
  triggerToast: (bn: string, en: string) => void;
  initialTab?: "dashboard" | "orders" | "wallet" | "referral" | "notifications" | "rewards";
  onClose?: () => void;
}

export default function CustomerPortal({ user, onLogout, lang, triggerToast, initialTab, onClose }: CustomerPortalProps) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "orders" | "wallet" | "referral" | "notifications" | "rewards">(initialTab || "dashboard");
  const [showMembershipModal, setShowMembershipModal] = useState<boolean>(false);
  const [showAddressModal, setShowAddressModal] = useState<boolean>(false);
  const [showWishlistModal, setShowWishlistModal] = useState<boolean>(false);

  const customerNavItems = [
    { id: "dashboard", labelBn: "ড্যাশবোর্ড", labelEn: "Dashboard", icon: <User className="w-4 h-4" /> },
    { id: "orders", labelBn: "অর্ডার হিস্ট্রি / ট্র্যাকিং", labelEn: "Order History / Tracking", icon: <ShoppingBag className="w-4 h-4" /> },
    { id: "rewards", labelBn: "রিওয়ার্ড পয়েন্ট", labelEn: "Reward Points", icon: <Award className="w-4 h-4" /> },
    { id: "wishlist", labelBn: "উইশলিস্ট", labelEn: "Wishlist", icon: <Heart className="w-4 h-4" /> },
    { id: "address", labelBn: "ডেলিভারি ঠিকানা", labelEn: "Delivery Address", icon: <MapPin className="w-4 h-4" /> },
    { id: "wallet", labelBn: "আমার ওয়ালেট", labelEn: "My Wallet", icon: <CreditCard className="w-4 h-4" /> },
    { id: "referral", labelBn: "রেফার অ্যান্ড আর্ন", labelEn: "Refer & Earn", icon: <Gift className="w-4 h-4" /> },
    { id: "notifications", labelBn: "নোটিফিকেশনস", labelEn: "Notifications", icon: <Bell className="w-4 h-4" /> },
    { id: "settings", labelBn: "প্রোফাইল সেটিংস", labelEn: "Profile Settings", icon: <Settings className="w-4 h-4" /> }
  ];

  const handleMenuNavigation = (tabId: string) => {
    setIsMenuOpen(false);
    if (tabId === "address") {
      setShowAddressModal(true);
      return;
    }
    if (tabId === "wishlist") {
      setShowWishlistModal(true);
      return;
    }
    if (tabId === "settings") {
      setShowProfileSettingsModal(true);
      return;
    }
    if (tabId === "orders") {
      setSelectedOrder(null);
      setActiveTab("orders");
      return;
    }
    setActiveTab(tabId as any);
  };

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
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
  const [displayNameInput, setDisplayNameInput] = useState<string>(
    user?.fullName || user?.displayName || user?.name || dbUser?.fullName || dbUser?.displayName || dbUser?.name || ""
  );
  const [phoneInput, setPhoneInput] = useState<string>(user?.phone || user?.phoneNumber || dbUser?.phone || "");
  const [emailInput, setEmailInput] = useState<string>(user?.email || dbUser?.email || "");
  const [photoUrlInput, setPhotoUrlInput] = useState<string>(user?.photoURL || dbUser?.photoURL || "");
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);

  useEffect(() => {
    if (dbUser) {
      const currentName = dbUser.fullName || dbUser.displayName || dbUser.name || user?.fullName || user?.displayName;
      if (currentName) {
        setDisplayNameInput(currentName);
      }
      if (dbUser.phone !== undefined) {
        setPhoneInput(dbUser.phone || "");
      }
      if (dbUser.email !== undefined) {
        setEmailInput(dbUser.email || "");
      }
      if (dbUser.address !== undefined) {
        setProfileAddress(dbUser.address || "");
      }
      if (dbUser.photoURL !== undefined) {
        setPhotoUrlInput(dbUser.photoURL || "");
      }
    }
  }, [dbUser?.fullName, dbUser?.displayName, dbUser?.name, dbUser?.phone, dbUser?.email, dbUser?.address, dbUser?.photoURL]);

  // Digital ID and Membership States - Every ID strictly starts with CFI prefix
  const customerId = normalizeMemberId(dbUser?.customerId, user?.uid);

  // Auto-sync & migrate legacy ID in Firestore (e.g. FCIMWZ -> CFIMWZ) without altering any user credentials or balance
  useEffect(() => {
    if (user?.uid && dbUser) {
      const fixedId = normalizeMemberId(dbUser.customerId, user.uid);
      if (dbUser.customerId !== fixedId) {
        setDoc(doc(db, "users", user.uid), { customerId: fixedId }, { merge: true }).catch((err) => {
          console.warn("Notice syncing updated CFI customerId:", err);
        });
      }
    }
  }, [user?.uid, dbUser?.customerId]);

  // Prioritize displaying the full name: userData?.fullName || userData?.displayName || user?.displayName || 'গ্রাহক'
  const profileName = (
    dbUser?.fullName || 
    dbUser?.displayName || 
    dbUser?.name || 
    user?.fullName || 
    user?.displayName || 
    user?.name || 
    "গ্রাহক"
  ).trim();

  // Automatically format and generate the username handle below it based on this name (e.g., @ followed by sanitized name)
  const getSanitizedUsername = () => {
    if (dbUser?.username && typeof dbUser.username === "string" && dbUser.username.trim()) {
      return dbUser.username.trim();
    }
    const rawName = (
      dbUser?.fullName || 
      dbUser?.displayName || 
      dbUser?.name || 
      user?.fullName || 
      user?.displayName || 
      user?.name || 
      ""
    ).trim();
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

  // Dynamic verification flags - never hardcoded to true
  const isEmailVerified = Boolean(dbUser?.isEmailVerified || auth.currentUser?.emailVerified);
  const isPhoneVerified = Boolean(dbUser?.isPhoneVerified);
  // Account Status Rule: Only when BOTH Email & Phone verifications are complete is the overall account verified
  const isAccountVerified = Boolean((isEmailVerified && isPhoneVerified) || (dbUser?.isVerified && isEmailVerified && isPhoneVerified));

  // Reward points strictly initialized to 0 for accounts with no points earned
  const rewardPoints = dbUser?.rewardPoints ?? dbUser?.points ?? 0;

  // Real-time numeric value strictly from users/{userId}/walletBalance, fallback to users/{userId}/balance, then wallet/{userId}/balance, strictly defaulting to 0
  const realTimeWalletBalance = Number(dbUser?.walletBalance ?? dbUser?.balance ?? walletBalance ?? 0);

  // Auto-initialize reward points strictly at 0 in Firestore if missing
  useEffect(() => {
    if (user?.uid && dbUser && dbUser.rewardPoints === undefined && dbUser.points === undefined) {
      setDoc(doc(db, "users", user.uid), { rewardPoints: 0, points: 0 }, { merge: true }).catch(() => {});
    }
  }, [user?.uid, dbUser?.rewardPoints, dbUser?.points]);

  // Auto-initialize wallet balance strictly at 0 in Firestore if missing
  useEffect(() => {
    if (user?.uid && dbUser && dbUser.walletBalance === undefined && dbUser.balance === undefined) {
      setDoc(doc(db, "users", user.uid), { walletBalance: 0, balance: 0 }, { merge: true }).catch(() => {});
    }
  }, [user?.uid, dbUser?.walletBalance, dbUser?.balance]);

  // Dynamic Premium Membership criteria evaluation (e.g. single-day delivered orders >= ৳6,000)
  const isPremiumQualified = useMemo(() => {
    if (dbUser?.isPremiumMember) return true;
    if (dbUser?.membershipTier === "প্রিমিয়াম মেম্বার" || dbUser?.membershipTier === "✨ প্রিমিয়াম মেম্বার") return true;
    if (!orders || orders.length === 0) return false;

    const dailyDeliveredTotals: Record<string, number> = {};
    for (const ord of orders) {
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
  }, [orders, dbUser]);

  const membershipTier = isPremiumQualified ? "✨ প্রিমিয়াম মেম্বার" : "সাধারণ মেম্বার";

  // Custom 6-digit OTP Email Verification State
  const [showProfileSettingsModal, setShowProfileSettingsModal] = useState<boolean>(false);
  const [isSendingVerificationEmail, setIsSendingVerificationEmail] = useState<boolean>(false);
  const [verificationEmailSent, setVerificationEmailSent] = useState<boolean>(false);
  const [isCheckingEmailStatus, setIsCheckingEmailStatus] = useState<boolean>(false);
  const [emailOtpInput, setEmailOtpInput] = useState<string>("");
  const [isVerifyingEmailOtp, setIsVerifyingEmailOtp] = useState<boolean>(false);
  const [emailVerificationCooldown, setEmailVerificationCooldown] = useState<number>(0);

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
          if (auth.currentUser.emailVerified && !isEmailVerified && user?.uid) {
            const willBeFullyVerified = isPhoneVerified;
            await setDoc(doc(db, "users", user.uid), {
              isEmailVerified: true,
              ...(willBeFullyVerified ? { isVerified: true } : {}),
              updatedAt: serverTimestamp()
            }, { merge: true });
            setDbUser((prev: any) => ({
              ...prev,
              isEmailVerified: true,
              ...(willBeFullyVerified ? { isVerified: true } : {})
            }));
          }
        } catch (e) {
          // non-blocking
        }
      }
    };
    syncEmailVerifiedState();
  }, [user?.uid, isEmailVerified, isPhoneVerified, showProfileSettingsModal]);

  // Phone Verification OTP State (Firebase Phone Auth signInWithPhoneNumber)
  const [isSendingPhoneOtp, setIsSendingPhoneOtp] = useState<boolean>(false);
  const [phoneOtpSent, setPhoneOtpSent] = useState<boolean>(false);
  const [phoneOtpInput, setPhoneOtpInput] = useState<string>("");
  const [phoneConfirmationResult, setPhoneConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [phoneOtpCooldown, setPhoneOtpCooldown] = useState<number>(0);
  const [isVerifyingPhone, setIsVerifyingPhone] = useState<boolean>(false);

  // Phone OTP cooldown timer
  useEffect(() => {
    let interval: any = null;
    if (phoneOtpCooldown > 0) {
      interval = setInterval(() => {
        setPhoneOtpCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [phoneOtpCooldown]);

  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [isEditingAddress, setIsEditingAddress] = useState<boolean>(false);
  const [profileModalTab, setProfileModalTab] = useState<"all" | "verification" | "profile" | "security">("all");
  const verificationSectionRef = useRef<HTMLDivElement>(null);
  const securitySectionRef = useRef<HTMLDivElement>(null);

  const handleOpenVerificationSection = () => {
    setProfileModalTab("verification");
    setShowProfileSettingsModal(true);
    setTimeout(() => {
      verificationSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
  };

  const handleOpenSecuritySection = () => {
    setProfileModalTab("security");
    setShowProfileSettingsModal(true);
    setTimeout(() => {
      securitySectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
  };

  // Security & Password Reset states in Profile Settings
  const [newPasswordInput, setNewPasswordInput] = useState<string>("");
  const [confirmPasswordInput, setConfirmPasswordInput] = useState<string>("");
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState<boolean>(false);
  const [passwordChangeMode, setPasswordChangeMode] = useState<"otp" | "direct">("otp");

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
    const targetIdentifier = emailInput || dbUser?.email || user?.email || phoneInput || dbUser?.phone || user?.phone || "";
    if (!targetIdentifier) {
      setSecurityError(getTranslation(
        "অনুগ্রহ করে আগে আপনার প্রোফাইলে একটি ভেরিফাইড ইমেইল বা ফোন নম্বর দিন।",
        "Please provide an email or phone number in your profile first."
      ));
      return;
    }

    setIsSendingSecurityOtp(true);
    setSecurityError("");
    setSecuritySuccess("");

    try {
      if (targetIdentifier.includes("@")) {
        try {
          await sendPasswordResetEmail(auth, targetIdentifier);
        } catch (e) {}
      }

      const res = await apiClient.post<any>("/api/auth/forgot-password/send-code", {
        identifier: targetIdentifier
      });

      if (res && res.success) {
        setSecurityResetId(res.resetId);
        setSecurityOtpSent(true);
        setSecurityTimer(60);
        setSecuritySuccess(res.messageBn || getTranslation("ভেরিফিকেশন কোড পাঠানো হয়েছে!", "Verification code has been sent!"));
        triggerToast("ভেরিফিকেশন কোড পাঠানো হয়েছে", "Verification OTP sent successfully");
      } else {
        throw new Error(res?.error || res?.message || "Failed to send code");
      }
    } catch (err: any) {
      setSecurityError(err?.message || getTranslation("কোড পাঠাতে ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।", "Failed to send OTP code."));
    } finally {
      setIsSendingSecurityOtp(false);
    }
  };

  const handleVerifySecurityOtp = async () => {
    const code = securityOtpCode.trim();
    if (code.length < 6) {
      setSecurityError(getTranslation("অনুগ্রহ করে সম্পূর্ণ ৬-সংখ্যার কোড লিখুন।", "Please enter full 6-digit code."));
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
        setSecuritySuccess(getTranslation("কোড সফলভাবে যাচাই হয়েছে! এবার নতুন পাসওয়ার্ড সেট করুন।", "Code verified! Please enter your new password."));
        triggerToast("কোড সফলভাবে যাচাই হয়েছে!", "Code verified successfully!");
      } else {
        throw new Error(res?.error || res?.message || "Failed to verify code");
      }
    } catch (err: any) {
      setSecurityError(err?.message || getTranslation("ভুল ভেরিফিকেশন কোড! অনুগ্রহ করে আবার চেষ্টা করুন।", "Invalid OTP code. Please try again."));
    } finally {
      setIsVerifyingSecurityOtp(false);
    }
  };

  const handleUpdateSecurityPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPasswordInput || newPasswordInput.length < 6) {
      setSecurityError(getTranslation("পাসওয়ার্ড ন্যূনতম ৬ অক্ষরের হতে হবে।", "Password must be at least 6 characters long."));
      return;
    }
    if (newPasswordInput !== confirmPasswordInput) {
      setSecurityError(getTranslation("নতুন পাসওয়ার্ড দুটি মিলছে না! অনুগ্রহ করে মিলিয়ে লিখুন।", "Passwords do not match."));
      return;
    }

    setIsUpdatingPassword(true);
    setSecurityError("");
    setSecuritySuccess("");

    try {
      if (passwordChangeMode === "otp" && securityResetToken) {
        const res = await apiClient.post<any>("/api/auth/forgot-password/reset", {
          resetToken: securityResetToken,
          newPassword: newPasswordInput
        });
        if (!res || !res.success) {
          throw new Error(res?.error || res?.message || "Failed to reset password");
        }
      } else {
        // Direct password change for authenticated profile
        const res = await apiClient.post<any>("/api/auth/profile/change-password", {
          userId: user.uid,
          newPassword: newPasswordInput
        });
        if (!res || !res.success) {
          throw new Error(res?.error || res?.message || "Failed to update password");
        }
      }

      // Also update Firebase Auth client session if active
      if (auth.currentUser) {
        try {
          await updatePassword(auth.currentUser, newPasswordInput);
        } catch (authErr: any) {
          console.warn("Client updatePassword notice:", authErr?.message);
        }
      }

      // Update Firestore user document timestamp
      if (user?.uid) {
        await updateDoc(doc(db, "users", user.uid), {
          passwordUpdatedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }).catch(() => {});
      }

      setSecuritySuccess(getTranslation("পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!", "Password has been successfully changed!"));
      triggerToast("পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!", "Password has been updated successfully!");
      setNewPasswordInput("");
      setConfirmPasswordInput("");
      setSecurityOtpSent(false);
      setSecurityOtpCode("");
      setSecurityResetToken("");
      setSecurityResetId("");
    } catch (err: any) {
      setSecurityError(err?.message || getTranslation("পাসওয়ার্ড পরিবর্তন করতে সমস্যা হয়েছে।", "Failed to update password. Please try again."));
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  useEffect(() => {
    const payload = JSON.stringify({
      id: customerId,
      name: profileName || "Customer",
      user: username,
      tier: membershipTier,
      verified: isAccountVerified,
      app: "KanchaBazar"
    });
    QRCode.toDataURL(payload, {
      width: 200,
      margin: 1,
      color: { dark: "#064e3b", light: "#ffffff" }
    })
      .then(url => setQrCodeDataUrl(url))
      .catch(err => console.warn("QR generation error:", err));
  }, [customerId, username, profileName, membershipTier, isAccountVerified]);

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
      const sanitizedHandle = trimmedName
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^\w\u0980-\u09FF]/gi, "") || customerId.toLowerCase();

      const updatedFields: any = {
        uid: user.uid,
        displayName: trimmedName,
        name: trimmedName,
        fullName: trimmedName,
        username: sanitizedHandle,
        phone: phoneInput.trim(),
        email: emailInput.trim() || user.email || "",
        address: profileAddress.trim(),
        photoURL: photoUrlInput || "",
        customerId: customerId,
        role: dbUser?.role || user?.role || "customer",
        updatedAt: serverTimestamp()
      };

      // setDoc with merge: true creates the document if missing or updates if existing
      await setDoc(doc(db, "users", user.uid), updatedFields, { merge: true });

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: trimmedName,
          photoURL: photoUrlInput || ""
        });
      }

      setDbUser((prev: any) => ({
        ...prev,
        ...updatedFields
      }));

      try {
        if (photoUrlInput) {
          localStorage.setItem("kb_user_photo", photoUrlInput);
        } else {
          localStorage.removeItem("kb_user_photo");
        }
        window.dispatchEvent(new CustomEvent("kb_profile_updated", { detail: { photoURL: photoUrlInput || "" } }));
      } catch {}

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

    if (file.size > 10 * 1024 * 1024) {
      triggerToast(
        "ছবির সাইজ ১০ মেগাবাইটের কম হতে হবে",
        "Image size must be less than 10MB"
      );
      if (e.target) e.target.value = "";
      return;
    }

    setIsUploadingPhoto(true);

    // 1. Immediate local preview via URL.createObjectURL for 0ms perceived lag
    const localPreviewUrl = URL.createObjectURL(file);
    setPhotoUrlInput(localPreviewUrl);
    setDbUser((prev: any) => ({
      ...prev,
      photoURL: localPreviewUrl,
      avatar: localPreviewUrl,
      image: localPreviewUrl
    }));

    try {
      // 2. Compress image for fast transfer & local data URL
      const compressed = await compressImage(file, 400, 0.85);
      const immediateDataUrl = compressed.dataUrl || localPreviewUrl;

      // Update storage and broadcast event
      try {
        localStorage.setItem("kb_user_photo", immediateDataUrl);
        window.dispatchEvent(new CustomEvent("kb_profile_updated", { detail: { photoURL: immediateDataUrl } }));
      } catch {}

      // 3. Persist to Firestore user document under photoURL, avatar, and image without affecting other fields
      if (user?.uid) {
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          photoURL: immediateDataUrl,
          avatar: immediateDataUrl,
          image: immediateDataUrl,
          updatedAt: serverTimestamp()
        }, { merge: true });
      }

      // 4. In background, upload to Cloudinary CDN / Firebase Storage fallback
      uploadImageWithFallback(file, {
        folder: "profiles",
        maxDimension: 400,
        quality: 0.85
      }).then(async (cdnUrl) => {
        if (cdnUrl && !cdnUrl.startsWith("data:") && user?.uid) {
          setPhotoUrlInput(cdnUrl);
          setDbUser((prev: any) => ({ 
            ...prev, 
            photoURL: cdnUrl, 
            avatar: cdnUrl, 
            image: cdnUrl 
          }));
          try {
            localStorage.setItem("kb_user_photo", cdnUrl);
            window.dispatchEvent(new CustomEvent("kb_profile_updated", { detail: { photoURL: cdnUrl } }));
          } catch {}
          await setDoc(doc(db, "users", user.uid), {
            photoURL: cdnUrl,
            avatar: cdnUrl,
            image: cdnUrl,
            updatedAt: serverTimestamp()
          }, { merge: true }).catch(() => {});
          if (auth.currentUser) {
            updateProfile(auth.currentUser, { photoURL: cdnUrl }).catch(() => {});
          }
        }
      }).catch((cdnErr) => {
        console.warn("Background photo CDN upload notice:", cdnErr);
      });

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
      if (e.target) {
        e.target.value = "";
      }
    }
  };

  const handleRemovePhoto = async () => {
    if (!confirm(getTranslation("আপনি কি নিশ্চিত আপনার প্রোফাইল ছবি মুছে ফেলতে চান?", "Are you sure you want to remove your profile picture?"))) return;

    setIsUploadingPhoto(true);
    try {
      setPhotoUrlInput("");
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        photoURL: "",
        updatedAt: serverTimestamp()
      }, { merge: true });

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          photoURL: ""
        });
      }

      setDbUser((prev: any) => ({
        ...prev,
        photoURL: ""
      }));

      try {
        localStorage.removeItem("kb_user_photo");
        window.dispatchEvent(new CustomEvent("kb_profile_updated", { detail: { photoURL: "" } }));
      } catch {}

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

  const getTranslation = createTranslator(lang);

  useEffect(() => {
    if (!user?.uid) return;

    // Listen to real-time User details
    const unsubUser = onSnapshot(
      doc(db, "users", user.uid), 
      (docSnap) => {
        if (docSnap.exists()) {
          const udata = docSnap.data();
          setDbUser(udata);
          const liveName = udata.fullName || udata.displayName || udata.name;
          if (liveName) {
            setDisplayNameInput(liveName);
          }
          // Real-time synchronization of wallet balance directly from users/{userId}/walletBalance
          if (udata.walletBalance !== undefined) {
            setWalletBalance(Number(udata.walletBalance) || 0);
          } else if (udata.balance !== undefined) {
            setWalletBalance(Number(udata.balance) || 0);
          }
          if (udata.photoURL !== undefined) {
            setPhotoUrlInput(udata.photoURL || "");
            try {
              if (udata.photoURL) {
                localStorage.setItem("kb_user_photo", udata.photoURL);
              } else {
                localStorage.removeItem("kb_user_photo");
              }
              window.dispatchEvent(new CustomEvent("kb_profile_updated", { detail: { photoURL: udata.photoURL || "" } }));
            } catch {}
          }
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
      checkAndUpgradePremiumMembership(user.uid);
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

        // Reset unintentional default 50 balance back to 0 if user has no actual transactions or qualifying tasks
        if (txs.length === 0) {
          const rawBal = Number(dbUser?.walletBalance ?? dbUser?.balance ?? walletBalance ?? 0);
          if (rawBal === 50) {
            setWalletBalance(0);
            setDoc(doc(db, "wallet", user.uid), { balance: 0, updatedAt: serverTimestamp() }, { merge: true }).catch(() => {});
            setDoc(doc(db, "users", user.uid), { walletBalance: 0, balance: 0, updatedAt: serverTimestamp() }, { merge: true }).catch(() => {});
          }
        }
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
            earnings += (doc.data().rewardAmount ?? 19);
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
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        address: profileAddress.trim(),
        updatedAt: serverTimestamp()
      }, { merge: true });
      triggerToast(
        "ডেলিভারি ঠিকানা সফলভাবে আপডেট করা হয়েছে!",
        "Delivery address successfully updated!"
      );
    } catch (err) {
      console.error("Error updating address:", err);
    }
  };

  const handleSendEmailVerification = async () => {
    const targetEmail = (emailInput || dbUser?.email || user?.email || auth.currentUser?.email || "").trim().toLowerCase();
    if (!targetEmail || !targetEmail.includes("@")) {
      triggerToast(
        "অনুগ্রহ করে একটি সঠিক ইমেইল ঠিকানা প্রদান করুন।",
        "Please enter a valid email address."
      );
      return;
    }

    const uId = user?.uid || auth.currentUser?.uid;
    if (!uId) {
      triggerToast(
        "ভেরিফিকেশন কোড পাঠাতে আপনার লগইন সেশন সক্রিয় থাকতে হবে।",
        "Active login session required to send verification code."
      );
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
        console.warn("Notice: could not dispatch via backend mail API:", apiErr);
      }

      setVerificationEmailSent(true);
      setEmailVerificationCooldown(60);
      setEmailOtpInput("");
      triggerToast(
        `আপনার ইমেইলে (${targetEmail}) একটি ৬-সংখ্যার ভেরিফিকেশন কোড পাঠানো হয়েছে। ইনবক্স বা স্প্যাম ফোল্ডার চেক করুন।`,
        `A 6-digit verification code has been sent to ${targetEmail}. Please check your inbox or spam folder.`
      );
    } catch (err: any) {
      console.error("sendEmailVerification error:", err);
      let errorMsgBn = "ভেরিফিকেশন কোড পাঠাতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।";
      let errorMsgEn = "Failed to send verification code. Please try again.";

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
            triggerToast(
              `আপনার ইমেইলে (${targetEmail}) একটি ৬-সংখ্যার ভেরিফিকেশন কোড পাঠানো হয়েছে।`,
              `A 6-digit verification code has been sent to ${targetEmail}.`
            );
            return;
          }
        } catch (fbErr) {}
      }

      triggerToast(errorMsgBn, errorMsgEn);
    } finally {
      setIsSendingVerificationEmail(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    const cleanCode = emailOtpInput.trim();
    if (!cleanCode || cleanCode.length !== 6) {
      triggerToast(
        "অনুগ্রহ করে ৬-সংখ্যার ভেরিফিকেশন কোডটি দিন।",
        "Please enter the 6-digit verification code."
      );
      return;
    }

    const uId = user?.uid || auth.currentUser?.uid;
    if (!uId) {
      triggerToast(
        "লগইন সেশন পাওয়া যায়নি। অনুগ্রহ করে পুনরায় লগইন করুন।",
        "No active session found. Please re-login."
      );
      return;
    }

    const targetEmail = (emailInput || dbUser?.email || user?.email || auth.currentUser?.email || "").trim().toLowerCase();

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
              triggerToast(
                "ভেরিফিকেশন কোডের মেয়াদ শেষ হয়ে গেছে। অনুগ্রহ করে আবার নতুন কোড পাঠান।",
                "Verification code has expired. Please request a new code."
              );
              setIsVerifyingEmailOtp(false);
              return;
            }
            isMatched = true;
          }
        }
      } catch (fErr) {
        console.warn("Direct Firestore verification notice:", fErr);
      }

      // 2. Fallback to backend verification endpoint if direct check didn't match or had permission lag
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
        triggerToast(
          "ভুল ভেরিফিকেশন কোড! অনুগ্রহ করে সঠিক ৬-সংখ্যার কোডটি প্রবেশ করান।",
          "Invalid verification code! Please enter the correct 6-digit code."
        );
        setIsVerifyingEmailOtp(false);
        return;
      }

      // 3. If matched, update user profile in Firestore: isEmailVerified: true
      const willBeFullyVerified = isPhoneVerified;
      await setDoc(doc(db, "users", uId), {
        uid: uId,
        isEmailVerified: true,
        ...(willBeFullyVerified ? { isVerified: true } : {}),
        updatedAt: serverTimestamp()
      }, { merge: true });

      // Mark verification record completed
      try {
        await setDoc(doc(db, "email_verifications", uId), { verified: true }, { merge: true });
      } catch (e) {}

      // Update badge status to "ভেরিফাইড ✓"
      setDbUser((prev: any) => ({
        ...prev,
        isEmailVerified: true,
        ...(willBeFullyVerified ? { isVerified: true } : {})
      }));

      setVerificationEmailSent(false);
      setEmailOtpInput("");

      triggerToast(
        "অভিনন্দন! আপনার ইমেইল সফলভাবে ভেরিফাইড হয়েছে ✓",
        "Congratulations! Your email has been verified successfully ✓"
      );

      if (willBeFullyVerified) {
        const { checkAndRewardReferral } = await import("../../lib/referral");
        await checkAndRewardReferral(uId);
      }
    } catch (err: any) {
      console.error("handleVerifyEmailOtp error:", err);
      triggerToast(
        "কোড যাচাই করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।",
        "Failed to verify code. Please try again."
      );
    } finally {
      setIsVerifyingEmailOtp(false);
    }
  };

  const handleSendPhoneOtp = async () => {
    const rawPhone = (phoneInput || dbUser?.phone || user?.phone || user?.phoneNumber || "").trim();
    if (!rawPhone || rawPhone.length < 10) {
      triggerToast(
        "অনুগ্রহ করে একটি সঠিক মোবাইল নম্বর লিখুন (কমপক্ষে ১০ ডিজিট)।",
        "Please enter a valid phone number (at least 10 digits)."
      );
      return;
    }

    // Format phone number to E.164 (e.g. +8801XXXXXXXXX)
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
      const uId = user?.uid || auth.currentUser?.uid;
      const res = await apiClient.post<any>("/api/auth/phone/send-verification-otp", {
        phone: rawPhone,
        userId: uId
      });

      if (res?.success) {
        setPhoneOtpSent(true);
        setPhoneOtpCooldown(60);
        triggerToast(
          "আপনার নম্বরে ওটিপি পাঠানো হয়েছে। অনুগ্রহ করে ইনবক্স চেক করুন।",
          "An OTP has been sent to your number. Please check your inbox."
        );
      } else {
        throw new Error(res?.error || "ওটিপি পাঠাতে সমস্যা হয়েছে।");
      }
    } catch (err: any) {
      console.warn("Notice sending phone OTP:", err?.message || err);
      let errorMsgBn = "এসএমএস ওটিপি পাঠাতে ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।";
      let errorMsgEn = "Failed to send SMS OTP. Please try again.";

      if (err?.message) {
        errorMsgBn = err.message;
      }
      triggerToast(errorMsgBn, errorMsgEn);
    } finally {
      setIsSendingPhoneOtp(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    const code = phoneOtpInput.trim();
    if (!code) {
      triggerToast(
        "অনুগ্রহ করে আপনার ফোনে প্রাপ্ত ওটিপি কোডটি লিখুন।",
        "Please enter the OTP code received on your phone."
      );
      return;
    }

    setIsVerifyingPhone(true);
    try {
      const uId = user?.uid || auth.currentUser?.uid;
      const targetPhone = (phoneInput || dbUser?.phone || user?.phone || user?.phoneNumber || "").trim();

      // Verify via server OTP verification endpoint
      const res = await apiClient.post<any>("/api/auth/phone/verify-otp", {
        phone: targetPhone,
        code: code,
        userId: uId
      });

      if (!res?.success) {
        throw new Error(res?.error || "ভুল ওটিপি কোড।");
      }

      if (phoneConfirmationResult) {
        try {
          await phoneConfirmationResult.confirm(code);
        } catch (e) {
          // If Firebase confirmation fails or isn't used, server-side verification already succeeded
        }
      }

      const willBeFullyVerified = isEmailVerified;
      if (uId) {
        await setDoc(doc(db, "users", uId), {
          uid: uId,
          isPhoneVerified: true,
          phone: targetPhone,
          ...(willBeFullyVerified ? { isVerified: true } : { isVerified: false }),
          updatedAt: serverTimestamp()
        }, { merge: true });
      }

      setDbUser((prev: any) => ({
        ...prev,
        isPhoneVerified: true,
        phone: targetPhone,
        ...(willBeFullyVerified ? { isVerified: true } : { isVerified: false })
      }));
      setPhoneOtpSent(false);
      setPhoneOtpInput("");
      setPhoneConfirmationResult(null);

      triggerToast(
        "অভিনন্দন! ফোন নাম্বার সফলভাবে ভেরিফাই করা হয়েছে! ✓",
        "Congratulations! Phone number has been verified successfully! ✓"
      );

      if (willBeFullyVerified && uId) {
        const { checkAndRewardReferral } = await import("../../lib/referral");
        await checkAndRewardReferral(uId);
      }
    } catch (err: any) {
      console.warn("Notice verifying phone OTP:", err?.message || err);
      let errorMsgBn = "ভুল OTP কোড! আবার চেষ্টা করুন।";
      let errorMsgEn = "Invalid OTP code. Please try again.";

      if (err?.code === "auth/invalid-verification-code") {
        errorMsgBn = "ভুল ওটিপি কোড! অনুগ্রহ করে আপনার ফোনে প্রাপ্ত কোডটি যাচাই করে আবার লিখুন।";
        errorMsgEn = "Incorrect verification code. Please check your SMS and try again.";
      } else if (err?.code === "auth/code-expired") {
        errorMsgBn = "ওটিপি কোডের মেয়াদ উত্তীর্ণ হয়ে গেছে। অনুগ্রহ করে পুনরায় নতুন কোড পাঠান।";
        errorMsgEn = "Verification code has expired. Please send a new code.";
      } else if (err?.message) {
        errorMsgBn = `${err.message}`;
      }

      triggerToast(errorMsgBn, errorMsgEn);
    } finally {
      setIsVerifyingPhone(false);
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
    <div className="w-full h-full bg-slate-50 overflow-hidden flex flex-col md:flex-row relative">
      {/* Hidden File Input for Profile Avatar Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handlePhotoUpload}
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        style={{ display: "none" }}
      />
      
      {/* 1. Mobile Slide-out Drawer (Modal) */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Dark Backdrop with blur */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity cursor-pointer animate-fadeIn"
            onClick={() => setIsMenuOpen(false)}
          />

          {/* Off-canvas Slide-out Menu Panel */}
          <aside className="relative w-72 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col justify-between z-10 animate-slideRight">
            <div className="flex flex-col flex-1 min-h-0">
              {/* Drawer Top Header: Brand Logo & User Profile Info */}
              <div className="p-4 sm:p-5 border-b border-gray-100 shrink-0 bg-slate-50/50 space-y-3">
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
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition cursor-pointer shrink-0"
                    aria-label="Close menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-center space-x-3 min-w-0 pt-2 border-t border-slate-200/60">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold overflow-hidden border border-emerald-200 shrink-0">
                    {photoUrlInput || dbUser?.photoURL || user?.photoURL ? (
                      <img 
                        src={photoUrlInput || dbUser?.photoURL || user?.photoURL} 
                        alt={dbUser?.displayName || user?.displayName || "Profile"} 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <User className="w-5 h-5 text-emerald-600" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black text-slate-800 text-sm leading-tight truncate">
                      {profileName}
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-bold uppercase tracking-wider truncate">
                      {dbUser?.role || user?.role || "customer"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Navigation Items */}
              <nav className="flex-1 min-h-0 overflow-y-auto space-y-1.5 p-4">
                {customerNavItems.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => handleMenuNavigation(tab.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer text-left ${
                      activeTab === tab.id 
                        ? "bg-emerald-600 text-white shadow shadow-emerald-950 font-black" 
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <span className="shrink-0">{tab.icon}</span>
                      <span className="truncate">{getTranslation(tab.labelBn, tab.labelEn)}</span>
                    </div>
                    {tab.id === "notifications" && notifications.filter(n => !n.isRead).length > 0 ? (
                      <span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 opacity-40 shrink-0" />
                    )}
                  </button>
                ))}
              </nav>
            </div>

            {/* Red Logout Button cleanly pinned at the very bottom border of drawer */}
            <div className="border-t border-gray-100 p-4 shrink-0 bg-white">
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center justify-center space-x-2 px-3.5 py-2.5 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold transition cursor-pointer border border-red-100"
              >
                <LogOut className="w-4 h-4" />
                <span>{getTranslation("লগআউট", "Logout")}</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop Sidebar Navigation */}
      <aside className="hidden md:flex md:w-64 lg:w-72 bg-white border-r border-gray-100 p-4 sm:p-5 shrink-0 flex-col justify-between h-full z-10">
        <div className="flex flex-col flex-1 min-h-0">
          {/* Brand Logo & Portal Branding */}
          <div className="flex items-center space-x-2.5 pb-3 mb-3 border-b border-gray-100 shrink-0">
            <img 
              src={APP_LOGO_URL} 
              alt="কাঁচা বাজার" 
              className="h-9 w-auto max-w-[42px] object-contain rounded-xl border border-emerald-100 bg-white p-0.5 shadow-2xs shrink-0" 
            />
            <div className="min-w-0">
              <span className="text-sm font-black text-emerald-800 block truncate">কাঁচা বাজার</span>
              <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">কাস্টমার পোর্টাল</span>
            </div>
          </div>

          {/* Customer Avatar & Profile info */}
          <div className="flex items-center space-x-3 pb-4 mb-3 border-b border-gray-100 shrink-0">
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold overflow-hidden border border-slate-200 shrink-0">
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
            <div className="min-w-0">
              <h3 className="font-black text-slate-800 text-sm leading-tight truncate">{profileName}</h3>
              <p className="text-[10px] text-slate-400 mt-0.5 font-bold uppercase tracking-wider truncate">{dbUser?.role || user?.role || "customer"}</p>
            </div>
          </div>

          <nav className="flex-1 min-h-0 overflow-y-auto space-y-1 py-1">
            {customerNavItems.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleMenuNavigation(tab.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer text-left ${
                  activeTab === tab.id 
                    ? "bg-emerald-600 text-white shadow shadow-emerald-950 font-black" 
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <span className="shrink-0">{tab.icon}</span>
                  <span className="truncate">{getTranslation(tab.labelBn, tab.labelEn)}</span>
                </div>
                {tab.id === "notifications" && notifications.filter(n => !n.isRead).length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="pt-3 border-t border-gray-100 shrink-0">
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center space-x-2 px-3.5 py-2.5 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold transition cursor-pointer border border-red-100"
          >
            <LogOut className="w-4 h-4" />
            <span>{getTranslation("লগআউট", "Logout")}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 h-full min-h-0 flex flex-col overflow-hidden bg-slate-50 focus:outline-none">
        {/* Clean Top Header with Hamburger Menu, App Title ("গ্রাহক প্রোফাইল"), Notification Bell & Avatar Preview */}
        <header className="bg-white border-b border-gray-100 px-4 sm:px-6 py-3 flex items-center justify-between shrink-0 z-10 shadow-xs">
          <div className="flex items-center space-x-3">
            {/* Hamburger Menu icon (visible on mobile to open drawer) */}
            <button
              type="button"
              onClick={() => setIsMenuOpen(true)}
              className="p-2 -ml-1 text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer md:hidden"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5 text-slate-800" />
            </button>
            
            <img 
              src={APP_LOGO_URL} 
              alt="কাঁচা বাজার" 
              className="h-8 sm:h-9 w-auto max-w-[40px] object-contain rounded-xl border border-emerald-100 bg-white p-0.5 shadow-2xs shrink-0" 
            />
            
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                {getTranslation("গ্রাহক প্রোফাইল", "Customer Profile")}
              </h2>
              <p className="text-[10px] text-slate-400 font-bold hidden sm:block">
                {getTranslation("কাস্টমার ড্যাশবোর্ড ও ডিজিটাল আইডি", "Customer Dashboard & Digital ID")}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            {/* Notification Bell */}
            <button
              type="button"
              onClick={() => {
                setActiveTab("notifications");
                setSelectedOrder(null);
              }}
              className="relative p-2 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition cursor-pointer"
              title={getTranslation("নোটিফিকেশনস", "Notifications")}
            >
              <Bell className="w-5 h-5" />
              {notifications.filter(n => !n.isRead).length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white animate-pulse" />
              )}
            </button>

            {/* User Profile Avatar Preview */}
            <div 
              onClick={() => setShowProfileSettingsModal(true)}
              className="flex items-center space-x-2 pl-1 cursor-pointer"
              title={getTranslation("প্রোফাইল সেটিংস দেখুন", "View Profile Settings")}
            >
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs overflow-hidden border-2 border-emerald-500/40 shadow-xs">
                {photoUrlInput || dbUser?.photoURL || user?.photoURL ? (
                  <img 
                    src={photoUrlInput || dbUser?.photoURL || user?.photoURL} 
                    alt="Profile" 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <User className="w-4 h-4 text-emerald-700" />
                )}
              </div>
              <span className="text-xs font-bold text-slate-700 hidden sm:inline-block max-w-[120px] truncate">
                {profileName}
              </span>
            </div>
          </div>
        </header>

        {/* Scrollable Main Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 lg:p-7 xl:p-8">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
            </div>
          ) : (
            <>
              {/* TAB: DASHBOARD */}
              {activeTab === "dashboard" && (
                <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
                  {/* 2. Hero Card (Profile & Digital ID Badge) */}
                  <div className="relative bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-emerald-700/30 overflow-hidden">
                    {/* Ambient Glows */}
                    <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
                    <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-40 h-40 rounded-full bg-teal-500/10 blur-xl pointer-events-none" />

                    {/* Top Row: Circular Avatar + Info */}
                    <div className="relative z-10 flex items-center space-x-4">
                      {/* Left: Circular Avatar with Clean Border + Camera Button */}
                      <div className="relative shrink-0">
                        <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-slate-800 border-2 border-white/90 shadow-md ring-4 ring-emerald-500/30 overflow-hidden flex items-center justify-center">
                          {photoUrlInput || dbUser?.photoURL || user?.photoURL ? (
                            <img 
                              src={photoUrlInput || dbUser?.photoURL || user?.photoURL} 
                              alt="Avatar" 
                              className="w-full h-full object-cover" 
                            />
                          ) : (
                            <User className="w-9 h-9 sm:w-10 sm:h-10 text-emerald-400" />
                          )}
                        </div>

                        {/* Camera trigger */}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploadingPhoto}
                          className="absolute bottom-0 right-0 p-1.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white shadow-md border-2 border-slate-900 transition cursor-pointer"
                          title={getTranslation("ছবি পরিবর্তন করুন", "Change Photo")}
                        >
                          <Camera className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Right: User Information */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-1.5 flex-wrap">
                          <h2 className="text-base sm:text-xl font-black text-white leading-tight truncate">
                            {profileName}
                          </h2>
                          {isAccountVerified ? (
                            <button
                              type="button"
                              onClick={handleOpenVerificationSection}
                              title={getTranslation("পরিচয় নিশ্চিত (ভেরিফাইড)", "Identity Verified")}
                              className="cursor-pointer hover:opacity-80 transition"
                            >
                              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={handleOpenVerificationSection}
                              title={getTranslation("পরিচয় নিশ্চিত করুন (ভেরিফাই করুন)", "Verify Identity Now")}
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
                          {isAccountVerified ? (
                            <button
                              type="button"
                              onClick={handleOpenVerificationSection}
                              className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-400/30 transition cursor-pointer shadow-xs active:scale-95"
                              title={getTranslation("পরিচয় নিশ্চিত স্ট্যাটাস দেখুন", "View Verified Identity Status")}
                            >
                              <CheckCircle className="w-3 h-3 text-emerald-400" />
                              <span>{getTranslation("✓ পরিচয় নিশ্চিত", "✓ Identity Verified")}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={handleOpenVerificationSection}
                              className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-400/40 hover:border-amber-300 transition cursor-pointer shadow-xs active:scale-95 group"
                              title={getTranslation("পরিচয় নিশ্চিত করতে ভেরিফিকেশন মোডাল খুলুন", "Click to open verification modal")}
                            >
                              <ShieldAlert className="w-3 h-3 text-amber-300 group-hover:scale-110 transition-transform" />
                              <span>
                                {isEmailVerified || isPhoneVerified 
                                  ? getTranslation("পরিচয় নিশ্চিত করুন (১/২)", "Verify Identity (1/2)") 
                                  : getTranslation("আনভেরিফাইড (পরিচয় নিশ্চিত করুন)", "Unverified (Verify Identity)")}
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
                            title={getTranslation("কাঁচা বাজার প্রিমিয়াম মেম্বারশিপ অফার ও শর্তাবলী দেখুন", "View Kacha Bazar Premium Membership Offer & Terms")}
                          >
                            <Sparkles className="w-3 h-3 text-amber-300 animate-pulse group-hover:rotate-12 transition-transform" />
                            <span>{getTranslation("প্রিমিয়াম মেম্বার", "Premium Member")}</span>
                            {isPremiumQualified ? (
                              <ChevronRight className="w-2.5 h-2.5 text-amber-300/80 group-hover:translate-x-0.5 transition-transform" />
                            ) : (
                              <span className="text-[9px] text-amber-400 underline ml-0.5">({getTranslation("অফার দেখুন", "View Offer")})</span>
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
                            {getTranslation("ডিজিটাল মেম্বারশিপ আইডি", "Digital Membership ID")}
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
                        <span>{getTranslation("QR কোড", "QR Code")}</span>
                      </button>
                    </div>
                  </div>

                  {/* 3. Quick Stats Grid (2x2 Clean Modern Cards) */}
                  <div>
                    <div className="flex items-center justify-between mb-2.5 px-0.5">
                      <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                        {getTranslation("অ্যাকাউন্ট ওভারভিউ", "Account Overview")}
                      </h3>
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        {getTranslation("লাইভ আপডেট", "Live Updates")}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      {/* Card 1: মোট অর্ডার */}
                      <div 
                        onClick={() => {
                          setActiveTab("orders");
                          setSelectedOrder(null);
                        }}
                        className="relative overflow-hidden bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-white border border-emerald-200/60 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all duration-200 cursor-pointer group active:scale-95 transform hover:-translate-y-0.5"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-500/25 group-hover:scale-105 transition-transform duration-200">
                            <ShoppingBag className="w-5 h-5" />
                          </div>
                        </div>
                        <p className="text-xs font-semibold text-slate-500">
                          {getTranslation("মোট অর্ডার", "Total Orders")}
                        </p>
                        <h4 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight mt-1 flex items-baseline">
                          <span>{orders.length}</span>
                          <span className="text-xs font-bold text-emerald-700 ml-1.5 bg-emerald-100/70 px-2 py-0.5 rounded-lg border border-emerald-200/60">
                            {getTranslation("টি", "orders")}
                          </span>
                        </h4>
                      </div>

                      {/* Card 2: ওয়ালেট ব্যালেন্স */}
                      <div 
                        onClick={() => setActiveTab("wallet")}
                        className="relative overflow-hidden bg-gradient-to-br from-teal-500/10 via-teal-500/5 to-white border border-teal-200/60 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md hover:border-teal-300 transition-all duration-200 cursor-pointer group active:scale-95 transform hover:-translate-y-0.5"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-600 to-cyan-500 text-white flex items-center justify-center font-bold shadow-md shadow-teal-500/25 group-hover:scale-105 transition-transform duration-200">
                            <CreditCard className="w-5 h-5" />
                          </div>
                        </div>
                        <p className="text-xs font-semibold text-slate-500">
                          {getTranslation("ওয়ালেট ব্যালেন্স", "Wallet Balance")}
                        </p>
                        <h4 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight mt-1 flex items-baseline">
                          <span className="text-base sm:text-lg font-bold text-teal-600 mr-0.5">৳</span>
                          <span>{realTimeWalletBalance}</span>
                        </h4>
                      </div>

                      {/* Card 3: 🎉 রেফার করে জিতুন ৳১৯! */}
                      <div 
                        onClick={() => setActiveTab("referral")}
                        className="relative overflow-hidden bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-white border border-amber-200/60 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md hover:border-amber-300 transition-all duration-200 cursor-pointer group active:scale-95 transform hover:-translate-y-0.5"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center font-bold shadow-md shadow-amber-500/25 group-hover:scale-105 transition-transform duration-200">
                            <Gift className="w-5 h-5" />
                          </div>
                        </div>
                        <p className="text-xs font-semibold text-slate-500 truncate" title={getTranslation("🎉 রেফার করে জিতুন ৳১৯!", "🎉 Refer & Earn ৳19!")}>
                          {getTranslation("🎉 রেফার করে জিতুন ৳১৯!", "🎉 Refer & Earn ৳19!")}
                        </p>
                        <h4 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight mt-1 flex items-baseline">
                          <span className="text-base sm:text-lg font-bold text-amber-600 mr-0.5">৳</span>
                          <span>{referralStats.earnings || 0}</span>
                        </h4>
                      </div>

                      {/* Card 4: রিওয়ার্ড পয়েন্ট */}
                      <div 
                        onClick={() => setActiveTab("rewards")}
                        className="relative overflow-hidden bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-white border border-purple-200/60 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md hover:border-purple-300 transition-all duration-200 cursor-pointer group active:scale-95 transform hover:-translate-y-0.5"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 text-white flex items-center justify-center font-bold shadow-md shadow-purple-500/25 group-hover:scale-105 transition-transform duration-200">
                            <Award className="w-5 h-5" />
                          </div>
                          <span className="text-[10px] font-black text-purple-700 bg-gradient-to-r from-purple-50 to-pink-50 px-2.5 py-1 rounded-full border border-purple-200/80 shadow-xs flex items-center gap-1 group-hover:border-purple-300 transition-colors">
                            <Gift className="w-3 h-3 text-purple-600" />
                            <span>{getTranslation("উপহার নিন", "Claim Gift")}</span>
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-500">
                          {getTranslation("রিওয়ার্ড পয়েন্ট", "Reward Points")}
                        </p>
                        <h4 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight mt-1 flex items-baseline">
                          <span>{rewardPoints}</span>
                          <span className="text-xs font-bold text-purple-700 ml-1.5 bg-purple-100/70 px-2 py-0.5 rounded-lg border border-purple-200/60">
                            pts
                          </span>
                        </h4>
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
                {/* View Navigation Top Bar */}
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("dashboard");
                      setSelectedOrder(null);
                    }}
                    className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 text-xs font-bold shadow-xs transition cursor-pointer group active:scale-95"
                  >
                    <ArrowLeft className="w-4 h-4 text-emerald-600 group-hover:-translate-x-0.5 transition-transform" />
                    <span>{getTranslation("← ড্যাশবোর্ডে ফিরুন", "← Back to Dashboard")}</span>
                  </button>
                </div>

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
                {/* View Navigation Top Bar */}
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab("dashboard")}
                    className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 text-xs font-bold shadow-xs transition cursor-pointer group active:scale-95"
                  >
                    <ArrowLeft className="w-4 h-4 text-emerald-600 group-hover:-translate-x-0.5 transition-transform" />
                    <span>{getTranslation("← ড্যাশবোর্ডে ফিরুন", "← Back to Dashboard")}</span>
                  </button>
                </div>

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
                      <h3 className="text-3xl font-black mt-2">৳{realTimeWalletBalance}</h3>
                    </div>
                    <span className="bg-white/10 backdrop-blur-md text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                      Active Balance
                    </span>
                  </div>

                  <div className="mt-8 flex justify-between text-[11px] text-emerald-200">
                    <div>
                      <span>CARD HOLDER</span>
                      <p className="font-bold text-white uppercase mt-0.5">{profileName}</p>
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
              <div className="space-y-6 pb-16 sm:pb-4">
                {/* View Navigation Top Bar */}
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab("dashboard")}
                    className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 text-xs font-bold shadow-xs transition cursor-pointer group active:scale-95"
                  >
                    <ArrowLeft className="w-4 h-4 text-emerald-600 group-hover:-translate-x-0.5 transition-transform" />
                    <span>{getTranslation("← ড্যাশবোর্ডে ফিরুন", "← Back to Dashboard")}</span>
                  </button>
                </div>

                {/* 1. Top Hero Section (Moomoo Fintech Style) */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 via-teal-900 to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-emerald-500/30">
                  {/* Ambient decorative glow orbs */}
                  <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-500/25 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-emerald-500/25 rounded-full blur-3xl pointer-events-none" />

                  <div className="relative z-10 text-center space-y-3.5">
                    <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold shadow-inner">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                      <span>{getTranslation("এক্সক্লুসিভ রিওয়ার্ড প্রোগ্রাম", "Exclusive Referral Program")}</span>
                    </div>

                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
                      {getTranslation("🎉 রেফার করে জিতুন ৳১৯!", "🎉 Refer & Earn ৳19 Bonus!")}
                    </h2>

                    <p className="text-xs sm:text-sm text-slate-200 max-w-lg mx-auto leading-relaxed font-medium">
                      {getTranslation(
                        "বন্ধুকে রেফার করুন! বন্ধু কমপক্ষে ৩০০ টাকার সফল অর্ডার সম্পন্ন করলে আপনি পাবেন ৳১৯ বোনাস।",
                        "Refer friends! When your friend signs up and completes a successful delivered order of at least ৳300, you will get ৳19 bonus."
                      )}
                    </p>

                    {/* Referral stats */}
                    <div className="grid grid-cols-2 gap-3 pt-3 max-w-md mx-auto">
                      <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-3.5 text-center shadow-inner">
                        <p className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">
                          {getTranslation("মোট রেফারেল", "Total Invited")}
                        </p>
                        <h4 className="text-xl sm:text-2xl font-black text-white mt-1">{referralStats.count}</h4>
                      </div>
                      <div className="bg-white/10 backdrop-blur-md border border-amber-400/40 rounded-2xl p-3.5 text-center shadow-inner">
                        <p className="text-[10px] text-amber-200 font-bold uppercase tracking-wider">
                          {getTranslation("মোট বোনাস অর্জিত", "Total Bonus Earned")}
                        </p>
                        <h4 className="text-xl sm:text-2xl font-black text-amber-300 mt-1">৳{referralStats.earnings}</h4>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Voucher / Coupon Card Section (Inspired by Moomoo rewards) */}
                <div className="relative overflow-hidden bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-3xl p-5 text-white shadow-lg border border-amber-300/40">
                  {/* Left & Right realistic perforated voucher notches */}
                  <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-50 rounded-full shadow-inner border-r border-amber-400/40" />
                  <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-50 rounded-full shadow-inner border-l border-amber-400/40" />

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-3 sm:px-4">
                    <div className="flex items-center gap-3.5 text-left w-full sm:w-auto">
                      <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shrink-0 shadow-inner">
                        <Ticket className="w-8 h-8 text-white drop-shadow" />
                      </div>
                      <div>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/25 text-[10px] font-bold text-amber-100 uppercase tracking-wide">
                          <Sparkles className="w-3 h-3 text-amber-200" />
                          {getTranslation("স্পেশাল অফার ভাউচার", "Special Offer Voucher")}
                        </span>
                        <h3 className="text-2xl sm:text-3xl font-black text-white mt-0.5 tracking-tight drop-shadow-sm">
                          {getTranslation("৳১৯ ওয়ালেট বোনাস", "৳19 Wallet Bonus")}
                        </h3>
                        <p className="text-xs text-amber-100 font-medium">
                          {getTranslation("বন্ধুর ১ম সফল (Delivered) অর্ডারে প্রযোজ্য", "Unlocked on friend's first delivered order")}
                        </p>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2 border-t sm:border-t-0 sm:border-l border-dashed border-white/40 pt-3 sm:pt-0 sm:pl-5">
                      <div className="text-left sm:text-right">
                        <p className="text-[10px] text-amber-100 uppercase font-bold tracking-wider">
                          {getTranslation("ন্যূনতম অর্ডার", "Min. Order Value")}
                        </p>
                        <p className="text-base font-black text-white font-mono">৳৩০০</p>
                      </div>
                      <span className="px-3 py-1 rounded-xl bg-white text-orange-600 font-black text-xs shadow-md shrink-0">
                        {getTranslation("ইনস্ট্যান্ট ক্রেডিট", "Instant Credit")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Referral Code & Link Box */}
                <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
                  {/* Referral Code Box */}
                  <div className="bg-gradient-to-r from-amber-50/70 via-orange-50/40 to-slate-50 border-2 border-amber-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-center sm:text-left">
                      <p className="text-[11px] text-amber-800 font-bold uppercase tracking-wider flex items-center justify-center sm:justify-start gap-1">
                        <Gift className="w-3.5 h-3.5 text-amber-600" />
                        {getTranslation("আপনার রেফারেল কোড", "Your Referral Code")}
                      </p>
                      <span className="text-2xl font-mono font-black text-slate-900 tracking-widest block mt-0.5">
                        {getReferralCode()}
                      </span>
                    </div>
                    <button
                      onClick={copyReferralCode}
                      className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 px-5 py-2.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center space-x-2 shadow-md hover:shadow-lg"
                      title={getTranslation("কোড কপি করুন", "Copy Code")}
                    >
                      <Clipboard className="w-4 h-4" />
                      <span>{getTranslation("কোড কপি", "Copy Code")}</span>
                    </button>
                  </div>

                  {/* Referral Link Box */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
                      <Share2 className="w-3 h-3 text-slate-400" />
                      {getTranslation("আপনার রেফারেল লিংক", "Your Referral Link")}
                    </p>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <div className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-mono text-slate-700 truncate shadow-inner select-all">
                        {getReferralLink()}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={copyReferralLink}
                          className="flex-1 sm:flex-none bg-slate-800 hover:bg-slate-900 active:scale-95 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 shadow-sm flex items-center justify-center space-x-1.5"
                          title={getTranslation("লিংক কপি করুন", "Copy Link")}
                        >
                          <Clipboard className="w-4 h-4" />
                          <span>{getTranslation("লিংক কপি", "Copy Link")}</span>
                        </button>
                        <button
                          onClick={handleShareLink}
                          className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 shadow-sm flex items-center justify-center space-x-1.5"
                          title={getTranslation("শেয়ার করুন", "Share Link")}
                        >
                          <Share2 className="w-4 h-4" />
                          <span>{getTranslation("শেয়ার", "Share")}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. 3-Step Guide (৩টি সহজ ধাপে বোনাস পান) */}
                <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
                  <div className="text-center space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                      {getTranslation("সহজ ও দ্রুত", "Simple & Fast")}
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-slate-900">
                      {getTranslation("৩টি সহজ ধাপে বোনাস পান", "Get Bonus in 3 Easy Steps")}
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                    {/* Step 1 */}
                    <div className="relative bg-slate-50/80 border border-slate-200/70 rounded-2xl p-4 flex flex-col items-center text-center space-y-2 group hover:border-emerald-300 transition">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white font-black flex items-center justify-center shadow-md text-base">
                        ১
                      </div>
                      <h4 className="text-xs font-black text-slate-800">
                        {getTranslation("ইনভাইট পাঠান", "Share Invite")}
                      </h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        {getTranslation(
                          "আপনার লিংক বা কোডটি বন্ধুদের সাথে শেয়ার করুন।",
                          "Share your referral code or link with friends."
                        )}
                      </p>
                    </div>

                    {/* Step 2 */}
                    <div className="relative bg-slate-50/80 border border-slate-200/70 rounded-2xl p-4 flex flex-col items-center text-center space-y-2 group hover:border-emerald-300 transition">
                      <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 font-black flex items-center justify-center shadow-md text-base">
                        ২
                      </div>
                      <h4 className="text-xs font-black text-slate-800">
                        {getTranslation("বন্ধু অর্ডার করবে", "Friend Places Order")}
                      </h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        {getTranslation(
                          "বন্ধু কোড দিয়ে সাইন-আপ করে ন্যূনতম ৩০০ টাকার অর্ডার ডেলিভারি নেবে।",
                          "Friend signs up with code and receives delivery of at least ৳300 order."
                        )}
                      </p>
                    </div>

                    {/* Step 3 */}
                    <div className="relative bg-slate-50/80 border border-slate-200/70 rounded-2xl p-4 flex flex-col items-center text-center space-y-2 group hover:border-emerald-300 transition">
                      <div className="w-10 h-10 rounded-2xl bg-orange-600 text-white font-black flex items-center justify-center shadow-md text-base">
                        ৩
                      </div>
                      <h4 className="text-xs font-black text-slate-800">
                        {getTranslation("বোনাস বুঝে নিন", "Receive Bonus")}
                      </h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        {getTranslation(
                          "সফল ডেলিভারির সাথে সাথে আপনার ওয়ালেটে ৳১৯ বোনাস পেয়ে যান।",
                          "Get instant ৳19 reward deposited right into your wallet."
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 5. Terms & Conditions Card */}
                <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 sm:p-6 text-left space-y-3 shadow-xs">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2.5 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>{getTranslation("রেফারেল নিয়মাবলী ও শর্তাদি", "Referral Rules & Conditions")}</span>
                  </h3>
                  <ul className="space-y-2 text-xs text-slate-600">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-500 font-bold">•</span>
                      <span>
                        {getTranslation(
                          "বন্ধুকে অবশ্যই আপনার রেফারেল কোড ব্যবহার করে সাইন আপ করতে হবে।",
                          "Friend must sign up using your referral code."
                        )}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-500 font-bold">•</span>
                      <span>
                        {getTranslation(
                          "বন্ধুকে কমপক্ষে ৩০০ টাকার সফল (Delivered) অর্ডার সম্পন্ন করতে হবে।",
                          "Friend must complete a successful (Delivered) order of at least ৳300."
                        )}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-500 font-bold">•</span>
                      <span>
                        {getTranslation(
                          "সফলভাবে অর্ডার সম্পন্ন হওয়ার সাথে সাথে রেফারের ওয়ালেটে ৳১৯ বোনাস জমা হবে।",
                          "As soon as the order is Delivered, ৳19 bonus will be credited immediately to the referrer's wallet."
                        )}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-500 font-bold">•</span>
                      <span>
                        {getTranslation(
                          "প্রতিটি আমন্ত্রিত বা রেফার্ড ইউজারের জন্য কেবল একবার রিওয়ার্ড প্রযোজ্য।",
                          "Reward applies only once per invited or referred user."
                        )}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-rose-500 font-bold">•</span>
                      <span>
                        {getTranslation(
                          "নিজের রেফারেল নিজে নেওয়া গ্রহণযোগ্য বা অনুমতিপ্রাপ্ত নয়।",
                          "Self-referral is strictly not allowed or permitted."
                        )}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-rose-500 font-bold">•</span>
                      <span>
                        {getTranslation(
                          "ডুপ্লিকেট বা ফেক অ্যাকাউন্ট তৈরি করে বোনাস নেওয়া নিষিদ্ধ।",
                          "Creating duplicate or fake accounts to earn bonus is strictly prohibited."
                        )}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-rose-500 font-bold">•</span>
                      <span>
                        {getTranslation(
                          "বাতিলকৃত বা রিফান্ড হওয়া অর্ডারসমূহ বোনাসের জন্য বিবেচিত হবে না।",
                          "Cancelled or refunded orders will not be considered for bonus."
                        )}
                      </span>
                    </li>
                  </ul>
                </div>

                {/* 6. Bottom Sticky Action Bar (For quick access on mobile) */}
                <div className="sticky bottom-3 z-30 sm:hidden">
                  <div className="bg-slate-900/95 backdrop-blur-md text-white border border-slate-800 rounded-2xl p-3 shadow-2xl flex items-center justify-between gap-3">
                    <div className="text-left pl-1">
                      <p className="text-[10px] text-amber-300 font-bold uppercase tracking-wider">
                        {getTranslation("রেফারেল বোনাস", "Referral Bonus")}
                      </p>
                      <span className="text-sm font-black text-white">{getTranslation("৳১৯ ক্যাশব্যাক", "৳19 Cashback")}</span>
                    </div>
                    <button
                      onClick={handleShareLink}
                      className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 active:scale-95 text-white font-black text-xs px-4 py-2.5 rounded-xl shadow-md flex items-center gap-1.5 transition cursor-pointer shrink-0"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>{getTranslation("এখনই ইনভাইট করুন", "Invite Now")}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: NOTIFICATIONS */}
            {activeTab === "notifications" && (
              <div className="space-y-4">
                {/* View Navigation Top Bar */}
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab("dashboard")}
                    className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 text-xs font-bold shadow-xs transition cursor-pointer group active:scale-95"
                  >
                    <ArrowLeft className="w-4 h-4 text-emerald-600 group-hover:-translate-x-0.5 transition-transform" />
                    <span>{getTranslation("← ড্যাশবোর্ডে ফিরুন", "← Back to Dashboard")}</span>
                  </button>
                </div>

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

            {/* TAB: REWARDS (IN-PAGE FULL DASHBOARD VIEW) */}
            {activeTab === "rewards" && (
              <RewardRedemptionView
                user={dbUser || user}
                currentPoints={rewardPoints}
                onPointsUpdated={(newPts) => setDbUser((prev: any) => prev ? { ...prev, rewardPoints: newPts, points: newPts } : prev)}
                onBack={() => setActiveTab("dashboard")}
                lang={lang}
                triggerToast={triggerToast}
              />
            )}
          </>
        )}
        </div>
      </main>

      {/* Digital Membership QR Code Modal */}
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
              <h3 className="font-black text-base text-slate-900">
                {getTranslation("ডিজিটাল মেম্বারশিপ QR", "Digital Membership QR")}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {getTranslation("গ্রাহক পরিচয় ও ডেলিভারি পয়েন্ট যাচাই", "Verify customer ID & delivery station")}
              </p>
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
            {/* Top decorative amber-emerald ambient glow */}
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
                {getTranslation(
                  "🌟 কাঁচা বাজার প্রিমিয়াম মেম্বারশিপ অফার",
                  "🌟 Kacha Bazar Premium Membership Offer"
                )}
              </h3>
              <p className="text-xs text-emerald-200/80 max-w-xs mx-auto">
                {getTranslation(
                  "কাঁচা বাজার পরিবারের এক্সক্লুসিভ ভিআইপি প্রিভিলেজ ও বিশেষ সুবিধাসমূহ",
                  "Exclusive VIP privileges and special shopping offers for valued members"
                )}
              </p>
            </div>

            {/* Current Member Badge Display */}
            <div className="relative z-10 bg-emerald-900/40 border border-emerald-500/30 rounded-2xl px-4 py-3 flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-300">
                {getTranslation("আপনার বর্তমান স্ট্যাটাস:", "Your Current Status:")}
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
                  {getTranslation("প্রধান শর্ত (Eligibility Criteria)", "Key Condition (Eligibility Criteria)")}
                </h4>
              </div>
              <ul className="space-y-1.5 pl-6 text-xs sm:text-sm font-bold text-white">
                <li className="list-disc leading-relaxed text-amber-100">
                  {getTranslation(
                    "একদিনে সর্বনিম্ন ৬,০০০ (ছয় হাজার) টাকার বাজার বা অর্ডার সম্পন্ন করতে হবে।",
                    "Must complete a minimum market/order of ৳6,000 (six thousand taka) in a single day."
                  )}
                </li>
              </ul>
              <p className="text-[11px] text-amber-200/80 pl-6 leading-normal font-normal">
                {getTranslation(
                  "এই লক্ষ্য পূরণ হওয়া মাত্রই আপনি স্থায়ী প্রিমিয়াম মেম্বার সুবিধা উপভোগ করতে পারবেন।",
                  "Upon meeting this milestone, premium privileges are instantly active for your profile."
                )}
              </p>
            </div>

            {/* Benefits / Offer Details (সুবিধাসমূহ) */}
            <div className="relative z-10 space-y-2.5">
              <h4 className="text-xs font-black text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>{getTranslation("সুবিধাসমূহ (Membership Benefits)", "Membership Benefits & Offers")}</span>
              </h4>

              <div className="space-y-2.5">
                {/* Benefit 1: 5% Discount */}
                <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3.5 flex items-start space-x-3 shadow-xs">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 border border-amber-400/30">
                    <Percent className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <h5 className="text-xs font-black text-amber-200">
                      {getTranslation("ফ্ল্যাট ৫% ডিসকাউন্ট (5% Discount)", "Flat 5% Discount on Every Order")}
                    </h5>
                    <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                      {getTranslation(
                        "শর্ত পূরণ করে প্রিমিয়াম মেম্বার হলে পরবর্তী প্রত্যেক অর্ডারে পাবেন ৫% ডিসকাউন্ট।",
                        "Qualifying as a Premium Member entitles you to a 5% discount on every subsequent order."
                      )}
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
                      {getTranslation("বিশেষ সাপোর্ট ও প্রায়োরিটি ডেলিভারি", "Priority Delivery & Dedicated Support")}
                    </h5>
                    <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                      {getTranslation(
                        "বিশেষ কাস্টমার সাপোর্ট ও প্রায়োরিটি ডেলিভারি সুবিধা।",
                        "Enjoy dedicated VIP customer care and expedited priority express delivery on all orders."
                      )}
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
                  if (onClose) {
                    onClose();
                  } else {
                    triggerToast("কাঁচা বাজার স্টোরফ্রন্টে আপনাকে স্বাগতম!", "Welcome to Kacha Bazar storefront!");
                  }
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-xs font-black shadow-lg shadow-emerald-500/20 flex items-center justify-center space-x-2 cursor-pointer transition active:scale-95"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>{getTranslation("বাজার করুন", "Shop Now")}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowMembershipModal(false)}
                className="py-3 px-5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white text-xs font-bold cursor-pointer transition active:scale-95 text-center"
              >
                <span>{getTranslation("বুঝেছি", "Got It")}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Delivery Address Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => {
              setShowAddressModal(false);
              setIsEditingAddress(false);
            }}
          />
          <div className="relative bg-white rounded-3xl p-5 sm:p-7 max-w-md w-full shadow-2xl z-10 space-y-5 animate-in zoom-in-95 duration-200 my-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3.5">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-base">
                    {getTranslation("ডেলিভারি ঠিকানা", "Delivery Address")}
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    {getTranslation("দ্রুত পণ্য পৌঁছানোর জন্য সংরক্ষিত ঠিকানা", "Saved address for quick grocery delivery")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddressModal(false);
                  setIsEditingAddress(false);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Address Content / Form */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-600">
                {getTranslation("আপনার সম্পূর্ণ ডেলিভারি ঠিকানা", "Full Delivery Address")}
              </label>

              <textarea
                value={profileAddress}
                onChange={(e) => setProfileAddress(e.target.value)}
                rows={3}
                placeholder={getTranslation(
                  "বাসা/হোল্ডিং নম্বর, ফ্ল্যাট, রোড, এলাকা, থানা ও জেলা উল্লেখ করুন...",
                  "House/holding, flat, road, area, thana & district..."
                )}
                className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-2xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 leading-relaxed"
              />

              <p className="text-[10px] text-slate-400 leading-normal">
                {getTranslation(
                  "অর্ডার করার সময় এই ঠিকানায় স্বয়ংক্রিয়ভাবে পণ্য ডেলিভারি পাঠানো হবে।",
                  "Orders will automatically be delivered to this saved location."
                )}
              </p>
            </div>

            {/* Modal Buttons */}
            <div className="pt-2 flex items-center gap-2.5">
              <button
                type="button"
                onClick={async () => {
                  await updateAddress();
                  setShowAddressModal(false);
                  setIsEditingAddress(false);
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md shadow-emerald-600/20 flex items-center justify-center space-x-1.5 cursor-pointer transition active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>{getTranslation("সংরক্ষণ করুন", "Save Address")}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddressModal(false);
                  setIsEditingAddress(false);
                }}
                className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition cursor-pointer"
              >
                <span>{getTranslation("বাতিল", "Cancel")}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wishlist Modal */}
      {showWishlistModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setShowWishlistModal(false)}
          />
          <div className="relative bg-white rounded-3xl p-5 sm:p-7 max-w-md w-full shadow-2xl z-10 space-y-5 animate-in zoom-in-95 duration-200 my-auto text-center">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center space-x-2.5 text-left">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                  <Heart className="w-5 h-5 fill-rose-100" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-base">
                    {getTranslation("পছন্দের তালিকা (উইশলিস্ট)", "My Saved Wishlist")}
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    {getTranslation("আপনার সংরক্ষিত প্রিয় কাঁচাবাজার পণ্যসমূহ", "Your favorite saved grocery items")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowWishlistModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Wishlist Empty State / Info */}
            <div className="py-6 space-y-3">
              <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-500 mx-auto flex items-center justify-center border border-rose-100 shadow-inner">
                <Heart className="w-8 h-8 fill-rose-500 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black text-slate-800">
                  {getTranslation("পছন্দের কাঁচাবাজার পণ্যসমূহ সহজে খুঁজে পান", "Easily Find Your Favorite Items")}
                </h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                  {getTranslation(
                    "স্টোরফ্রন্টে যেকোনো পণ্যের উপরের ডানপাশের হার্ট (❤️) আইকনে ক্লিক করলেই সেটি আপনার পছন্দের তালিকায় সংরক্ষিত থাকবে।",
                    "Click the heart (❤️) icon on any grocery item on the storefront to save it to your personal wishlist."
                  )}
                </p>
              </div>
            </div>

            {/* Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowWishlistModal(false);
                  if (onClose) {
                    onClose();
                  } else {
                    triggerToast("শপে স্বাগতম! পছন্দের পণ্যগুলো বেছে নিন।", "Welcome to store! Pick your favorite items.");
                  }
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black shadow-md shadow-emerald-600/20 flex items-center justify-center space-x-2 cursor-pointer transition active:scale-95"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>{getTranslation("বাজার করুন / শপ ব্রাউজ করুন", "Browse Shop & Wishlist")}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowWishlistModal(false)}
                className="py-3 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer text-center"
              >
                <span>{getTranslation("বুঝেছি", "Got It")}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Settings & Verification Modal */}
      {showProfileSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setShowProfileSettingsModal(false)}
          />
          <div className="relative bg-white rounded-3xl p-5 sm:p-7 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl z-10 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 sticky top-0 bg-white z-10 -mt-1 pt-1">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900 leading-tight">
                    {getTranslation("প্রোফাইল সেটিংস ও ভেরিফিকেশন", "Profile Settings & Verification")}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    {getTranslation("ব্যক্তিগত তথ্য সম্পাদনা ও অ্যাকাউন্ট স্ট্যাটাস", "Manage profile, avatar & account identity")}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowProfileSettingsModal(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
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
                {getTranslation("সব সেকশন", "All Sections")}
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
                <span>{getTranslation("অ্যাকাউন্ট ভেরিফিকেশন", "Account Verification")}</span>
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
                <Edit3 className="w-3.5 h-3.5" />
                <span>{getTranslation("ব্যক্তিগত তথ্য", "Personal Info")}</span>
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
                <span>{getTranslation("পাসওয়ার্ড ও নিরাপত্তা", "Password & Security")}</span>
              </button>
            </div>

            {/* SECTION 1: ব্যক্তিগত প্রোফাইল তথ্য সম্পাদনা (Personal Profile Edit) */}
            {(profileModalTab === "all" || profileModalTab === "profile") && (
              <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                  <Edit3 className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-black text-slate-800">
                  {getTranslation("ব্যক্তিগত প্রোফাইল তথ্য সম্পাদনা", "Personal Profile Information")}
                </h4>
              </div>

              {/* Avatar circle with change and remove button */}
              <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4 bg-slate-50 p-4 rounded-2xl border border-gray-100">
                <div className="relative shrink-0">
                  <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xl overflow-hidden border-2 border-white shadow-md ring-2 ring-emerald-500/20">
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
                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center text-white">
                      <RefreshCw className="w-6 h-6 animate-spin" />
                    </div>
                  )}
                </div>

                <div className="flex-1 text-center sm:text-left space-y-2">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingPhoto}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      {isUploadingPhoto ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Camera className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {isUploadingPhoto 
                          ? getTranslation("আপলোড হচ্ছে...", "Uploading...") 
                          : getTranslation("ছবি পরিবর্তন করুন", "Change Photo")}
                      </span>
                    </button>

                    {(photoUrlInput || dbUser?.photoURL || user?.photoURL) && (
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        disabled={isUploadingPhoto}
                        className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{getTranslation("ছবি মুছুন", "Remove")}</span>
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium">
                    {getTranslation("সর্বোচ্চ সাইজ: ১০ মেগাবাইট (JPG, PNG, WebP)", "Max size: 10MB (JPG, PNG, WebP)")}
                  </p>
                </div>
              </div>

              {/* Form Inputs */}
              <div className="space-y-3 pt-1">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center space-x-1">
                    <User className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{getTranslation("ডিসপ্লে নাম / পূর্ণ নাম", "Full Name")}</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={displayNameInput}
                    onChange={(e) => setDisplayNameInput(e.target.value)}
                    placeholder={getTranslation("আপনার পূর্ণ নাম লিখুন", "Enter your full name")}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:bg-white outline-none focus:ring-1 focus:ring-emerald-500 font-medium text-slate-800"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Phone */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center space-x-1">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{getTranslation("মোবাইল নম্বর", "Phone Number")}</span>
                    </label>
                    <input
                      type="tel"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      placeholder={getTranslation("০১৭১৯-XXXXXX", "01719-XXXXXX")}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:bg-white outline-none focus:ring-1 focus:ring-emerald-500 font-medium text-slate-800"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center space-x-1">
                      <Mail className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{getTranslation("ইমেইল এড্রেস", "Email Address")}</span>
                    </label>
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder={getTranslation("example@domain.com", "example@domain.com")}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:bg-white outline-none focus:ring-1 focus:ring-emerald-500 font-medium text-slate-800"
                    />
                  </div>
                </div>

                {/* Delivery Address */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center space-x-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{getTranslation("ডেলিভারি ঠিকানা", "Delivery Address")}</span>
                  </label>
                  <textarea
                    rows={2}
                    value={profileAddress}
                    onChange={(e) => setProfileAddress(e.target.value)}
                    placeholder={getTranslation("বাসা, রোড, এলাকা, জেলা", "House, Road, Area, City")}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:bg-white outline-none focus:ring-1 focus:ring-emerald-500 font-medium text-slate-800"
                  />
                </div>

                <div className="pt-1 flex justify-end">
                  <button
                    type="button"
                    onClick={async () => {
                      await handleSaveProfile();
                    }}
                    disabled={isSavingProfile}
                    className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 shadow-xs"
                  >
                    {isSavingProfile ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span>{getTranslation("প্রোফাইল সংরক্ষণ করুন", "Save Profile Details")}</span>
                  </button>
                </div>
              </div>
            </div>
            )}

            {/* SECTION 2: অ্যাকাউন্ট ভেরিফিকেশন (Account Verification: Email & Phone OTP) */}
            {(profileModalTab === "all" || profileModalTab === "verification") && (
              <div
                ref={verificationSectionRef}
                className={`pt-5 ${profileModalTab === "all" ? "border-t border-gray-100" : ""} space-y-4 ${
                  profileModalTab === "verification" ? "ring-2 ring-emerald-500/20 rounded-2xl p-4 bg-emerald-50/20" : ""
                }`}
              >
                {/* Verification Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-black text-slate-800">
                    {getTranslation("অ্যাকাউন্ট ভেরিফিকেশন", "Account Verification")}
                  </h4>
                </div>

                {/* Overall Account Status Rule: Only when BOTH Email & Phone are verified is it "ভেরিফাইড ✓" */}
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${
                  isAccountVerified 
                    ? "bg-emerald-100 text-emerald-800 border-emerald-300" 
                    : (isEmailVerified || isPhoneVerified)
                      ? "bg-amber-100 text-amber-800 border-amber-300"
                      : "bg-red-50 text-red-700 border-red-200"
                }`}>
                  {isAccountVerified 
                    ? getTranslation("ভেরিফাইড ✓", "Verified ✓") 
                    : (isEmailVerified || isPhoneVerified)
                      ? getTranslation("অসম্পূর্ণ (১/২)", "Incomplete (1/2)")
                      : getTranslation("আনভেরিফাইড", "Unverified")}
                </span>
              </div>

              {/* Status Explanation Card */}
              {isAccountVerified ? (
                <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-emerald-900">
                      {getTranslation("আপনার অ্যাকাউন্টটি সম্পূর্ণ ভেরিফাইড!", "Your Account is Fully Verified!")}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {getTranslation("ইমেইল ও ফোন ভেরিফিকেশন সফল হয়েছে। রেফারেল ইনকাম ও সব সুবিধা সচল আছে।", "Email and Phone verifications are complete. All benefits active.")}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50/60 border border-amber-200/70 rounded-2xl p-3.5 flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-amber-900">
                      {isEmailVerified || isPhoneVerified 
                        ? getTranslation("ভেরিফিকেশন অসম্পূর্ণ (১/২ সম্পন্ন)", "Verification Incomplete (1/2 Completed)")
                        : getTranslation("ভেরিফিকেশন আবশ্যক", "Verification Required")}
                    </p>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                      {getTranslation(
                        "অ্যাকাউন্ট ভেরিফাইড স্ট্যাটাস অর্জন করতে অনুগ্রহ করে নিচের দুটি পদ্ধতিই (ইমেইল ও মোবাইল নম্বর) ভেরিফাই করুন।",
                        "Please complete both verification methods below (Email and Phone) to verify your account."
                      )}
                    </p>
                  </div>
                </div>
              )}

              {/* Method A: Email Verification */}
              <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                      isEmailVerified ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                    }`}>
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="text-xs font-black text-slate-800">
                        {getTranslation("ইমেইল ভেরিফিকেশন", "Email Verification")}
                      </h5>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {emailInput || dbUser?.email || user?.email || getTranslation("ইমেইল যুক্ত নেই", "No email added")}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                    isEmailVerified 
                      ? "bg-emerald-100 text-emerald-800 border-emerald-300/60" 
                      : "bg-amber-100 text-amber-800 border-amber-300/60"
                  }`}>
                    {isEmailVerified ? getTranslation("ভেরিফাইড ✓", "Verified ✓") : getTranslation("অপেক্ষমান", "Pending")}
                  </span>
                </div>

                {!isEmailVerified && (
                  <div className="pt-2.5 border-t border-slate-200/60 space-y-3">
                    {!verificationEmailSent ? (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/80">
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-slate-800">
                            {getTranslation("৬-সংখ্যার ইমেইল ভেরিফিকেশন ওটিপি", "6-Digit Email Verification OTP")}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {getTranslation(
                              "আপনার ইমেইল ঠিকানায় কাঁচা বাজার টিম থেকে একটি ৬-সংখ্যার ওটিপি কোড পাঠানো হবে।",
                              "A secure 6-digit verification code will be sent to your email from Kacha Bazar Team."
                            )}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleSendEmailVerification}
                          disabled={isSendingVerificationEmail || emailVerificationCooldown > 0}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shrink-0 cursor-pointer disabled:opacity-50 shadow-xs"
                        >
                          {isSendingVerificationEmail ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>{getTranslation("পাঠানো হচ্ছে...", "Sending...")}</span>
                            </>
                          ) : (
                            <>
                              <Mail className="w-3.5 h-3.5" />
                              <span>{getTranslation("ভেরিফিকেশন কোড পাঠান", "Send Verification Code")}</span>
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3.5 bg-emerald-50/70 p-4 rounded-xl border border-emerald-200/80 animate-in fade-in duration-200">
                        <div className="flex items-start space-x-2.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-emerald-950">
                              {getTranslation("ভেরিফিকেশন কোড পাঠানো হয়েছে!", "Verification Code Sent!")}
                            </p>
                            <p className="text-[11px] text-emerald-900/80 leading-relaxed">
                              {getTranslation(
                                `আপনার ${emailInput || dbUser?.email || user?.email || ""} ঠিকানায় প্রেরিত ৬-সংখ্যার কোডটি প্রবেশ করিয়ে যাচাই সম্পন্ন করুন।`,
                                `Please enter the 6-digit code sent to ${emailInput || dbUser?.email || user?.email || ""} to complete verification.`
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-emerald-200/60 space-y-2">
                          <label className="block text-[11px] font-bold text-slate-700">
                            {getTranslation("৬-ডিজিটের ভেরিফিকেশন কোড:", "6-Digit Verification Code:")}
                          </label>
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              maxLength={6}
                              value={emailOtpInput}
                              onChange={(e) => setEmailOtpInput(e.target.value.replace(/[^\d]/g, "").slice(0, 6))}
                              placeholder="যেমন: 123456"
                              className="w-full sm:w-44 px-3 py-2 bg-white border border-emerald-300 rounded-xl text-center font-mono text-base font-bold tracking-widest text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                            />
                            <button
                              type="button"
                              onClick={handleVerifyEmailOtp}
                              disabled={isVerifyingEmailOtp || emailOtpInput.trim().length !== 6}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                            >
                              {isVerifyingEmailOtp ? (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  <span>{getTranslation("যাচাই করা হচ্ছে...", "Verifying...")}</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>{getTranslation("যাচাই সম্পন্ন করুন", "Complete Verification")}</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={handleSendEmailVerification}
                              disabled={isSendingVerificationEmail || emailVerificationCooldown > 0}
                              className="px-3 py-2 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50 text-center"
                            >
                              {emailVerificationCooldown > 0
                                ? getTranslation(`পুনরায় পাঠান (${emailVerificationCooldown} সে.)`, `Resend (${emailVerificationCooldown}s)`)
                                : getTranslation("পুনরায় কোড পাঠান", "Resend Code")}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Method B: Phone Verification (OTP) */}
              <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                      isPhoneVerified ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                    }`}>
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="text-xs font-black text-slate-800">
                        {getTranslation("ফোন নাম্বার ভেরিফিকেশন", "Phone Verification")}
                      </h5>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {phoneInput || dbUser?.phone || user?.phone || user?.phoneNumber || getTranslation("নম্বর যুক্ত নেই", "No phone added")}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                    isPhoneVerified 
                      ? "bg-emerald-100 text-emerald-800 border-emerald-300/60" 
                      : "bg-amber-100 text-amber-800 border-amber-300/60"
                  }`}>
                    {isPhoneVerified ? getTranslation("ভেরিফাইড ✓", "Verified ✓") : getTranslation("অপেক্ষমান", "Pending")}
                  </span>
                </div>

                {!isPhoneVerified && (
                  <div className="pt-2 border-t border-slate-200/60 space-y-2.5">
                    {!phoneOtpSent ? (
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] text-slate-500">
                          {getTranslation("Google Firebase Auth-এর মাধ্যমে মোবাইলে নিরাপদ এসএমএস ওটিপি পাঠানো হবে।", "A secure SMS OTP will be sent to your phone via Google Firebase Auth.")}
                        </p>
                        <button
                          id="phone-verify-button"
                          type="button"
                          onClick={handleSendPhoneOtp}
                          disabled={isSendingPhoneOtp || phoneOtpCooldown > 0}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1 shrink-0 cursor-pointer disabled:opacity-50 shadow-xs"
                        >
                          {isSendingPhoneOtp && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                          <span>
                            {phoneOtpCooldown > 0
                              ? getTranslation(`অপেক্ষা করুন (${phoneOtpCooldown}s)`, `Wait (${phoneOtpCooldown}s)`)
                              : getTranslation("ওটিপি পাঠান / ভেরিফাই করুন", "Send OTP / Verify")}
                          </span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2 bg-white p-3 rounded-xl border border-emerald-200">
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] text-emerald-800 font-bold">
                            {getTranslation("আপনার ফোনে প্রেরিত ৬-সংখ্যার এসএমএস OTP লিখুন:", "Enter the 6-digit SMS OTP received on your phone:")}
                          </p>
                          {phoneOtpCooldown > 0 ? (
                            <span className="text-[10px] text-slate-400 font-mono">
                              {getTranslation(`পুনরায় পাঠান (${phoneOtpCooldown}s)`, `Resend (${phoneOtpCooldown}s)`)}
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={handleSendPhoneOtp}
                              disabled={isSendingPhoneOtp}
                              className="text-[10px] text-emerald-600 hover:underline font-bold cursor-pointer"
                            >
                              {getTranslation("পুনরায় কোড পাঠান", "Resend Code")}
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            maxLength={6}
                            value={phoneOtpInput}
                            onChange={(e) => setPhoneOtpInput(e.target.value.replace(/\D/g, ""))}
                            placeholder="• • • • • •"
                            className="flex-1 bg-slate-50 border border-slate-300 focus:border-emerald-500 rounded-xl px-3 py-1.5 text-xs font-mono font-bold tracking-widest text-slate-800 outline-none text-center"
                          />
                          <button
                            type="button"
                            onClick={handleVerifyPhoneOtp}
                            disabled={isVerifyingPhone || phoneOtpInput.length < 6}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1 shrink-0 cursor-pointer disabled:opacity-50 shadow-xs"
                          >
                            {isVerifyingPhone && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                            <span>{getTranslation("যাচাই সম্পন্ন করুন", "Verify OTP")}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            )}

            {/* SECTION 3: অ্যাকাউন্ট ভেরিফিকেশন ও স্ট্যাটাস (Account Identity & Status) */}
            {(profileModalTab === "all" || profileModalTab === "verification") && (
              <div className="pt-5 border-t border-gray-100 space-y-3">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>{getTranslation("অ্যাকাউন্ট ভেরিফিকেশন ও স্ট্যাটাস", "Account Identity & Status")}</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* User ID (UID) & Customer ID */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    {getTranslation("গ্রাহক আইডি ও ইউজার আইডি", "Customer ID & UID")}
                  </span>
                  <p className="text-xs font-mono font-black text-emerald-700">
                    ID: {customerId}
                  </p>
                  <p className="text-[10px] font-mono text-slate-500 truncate mt-0.5">
                    UID: {user?.uid || "N/A"}
                  </p>
                </div>

                {/* Role & Dynamic Premium Membership Status */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      {getTranslation("মেম্বারশিপ ও রোল", "Membership & Role")}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowMembershipModal(true)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800 hover:text-emerald-700 transition cursor-pointer text-left"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>
                        {isPremiumQualified 
                          ? getTranslation("✨ প্রিমিয়াম মেম্বার", "✨ Premium Member") 
                          : getTranslation("সাধারণ মেম্বার (Regular Member)", "Regular Member")}
                      </span>
                    </button>
                    <p className="text-[10px] text-slate-400 uppercase mt-0.5">
                      Role: {dbUser?.role || user?.role || "Customer"}
                    </p>
                  </div>
                  {isPremiumQualified ? (
                    <span className="px-2 py-1 rounded-full text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                      {getTranslation("ভেরিফাইড / সক্রিয়", "Verified / Active")}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowMembershipModal(true)}
                      className="px-2 py-1 rounded-full text-[9px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300 transition cursor-pointer"
                      title={getTranslation("শর্ত পূরণ করতে অফার দেখুন", "View criteria offer")}
                    >
                      {getTranslation("শর্ত পূরণ করুন (অফার দেখুন)", "View Offer")}
                    </button>
                  )}
                </div>
              </div>
            </div>
            )}

            {/* SECTION 4: পাসওয়ার্ড পরিবর্তন ও নিরাপত্তা (Change Password & Security) */}
            {(profileModalTab === "all" || profileModalTab === "security") && (
              <div ref={securitySectionRef} className="pt-5 border-t border-gray-100 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-800">
                        {getTranslation("পাসওয়ার্ড পরিবর্তন ও নিরাপত্তা", "Change Password & Security")}
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        {getTranslation("৬-সংখ্যার ওটিপি যাচাইকরণের মাধ্যমে নতুন পাসওয়ার্ড সেট করুন", "Reset or update your password with secure OTP verification")}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {getTranslation("নিরাপদ যাচাই", "Secure Reset")}
                  </span>
                </div>

                {securityError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3 flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{securityError}</span>
                  </div>
                )}

                {securitySuccess && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl p-3 flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                    <span>{securitySuccess}</span>
                  </div>
                )}

                {/* Step 1: Send & Verify OTP if not yet verified */}
                {!securityResetToken ? (
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                        <Key className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <h5 className="text-xs font-bold text-slate-800">
                          {getTranslation("ধাপ ১: ওটিপি কোড যাচাইকরণ", "Step 1: OTP Code Verification")}
                        </h5>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {getTranslation(
                            "পাসওয়ার্ড পরিবর্তনের পূর্বে আপনার পরিচয় নিশ্চিত করতে নিবন্ধিত ইমেইল বা নম্বরে ৬-সংখ্যার কোড পাঠানো হবে।",
                            "To verify your identity before changing password, a 6-digit code will be sent to your registered account."
                          )}
                        </p>
                        <p className="text-[11px] font-mono text-emerald-700 font-bold mt-1">
                          {emailInput || dbUser?.email || user?.email || phoneInput || dbUser?.phone || user?.phone || "Registered Account"}
                        </p>
                      </div>
                    </div>

                    {!securityOtpSent ? (
                      <button
                        type="button"
                        onClick={handleSendSecurityOtp}
                        disabled={isSendingSecurityOtp}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                      >
                        {isSendingSecurityOtp ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>{getTranslation("কোড পাঠানো হচ্ছে...", "Sending Code...")}</span>
                          </>
                        ) : (
                          <>
                            <Key className="w-4 h-4" />
                            <span>{getTranslation("ভেরিফিকেশন কোড পাঠান", "Send Verification Code")}</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="space-y-3 pt-2 border-t border-slate-200">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 mb-1">
                            {getTranslation("৬-সংখ্যার কোডটি লিখুন:", "Enter the 6-digit verification code:")}
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              maxLength={6}
                              value={securityOtpCode}
                              onChange={(e) => setSecurityOtpCode(e.target.value.replace(/\D/g, ""))}
                              placeholder="• • • • • •"
                              className="flex-1 bg-white border border-slate-300 focus:border-emerald-500 rounded-xl px-3 py-2 text-sm font-mono font-bold tracking-widest text-slate-800 outline-none text-center"
                            />
                            <button
                              type="button"
                              onClick={handleVerifySecurityOtp}
                              disabled={isVerifyingSecurityOtp || securityOtpCode.length < 6}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-black transition flex items-center space-x-1 shrink-0 cursor-pointer disabled:opacity-50 shadow-xs"
                            >
                              {isVerifyingSecurityOtp && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                              <span>{getTranslation("যাচাই করুন", "Verify OTP")}</span>
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          {securityTimer > 0 ? (
                            <span>{getTranslation(`পুনরায় কোড: ${securityTimer} সে.`, `Resend in: ${securityTimer}s`)}</span>
                          ) : (
                            <button
                              type="button"
                              onClick={handleSendSecurityOtp}
                              className="text-emerald-600 hover:underline font-bold cursor-pointer"
                            >
                              {getTranslation("কোড পাননি? পুনরায় পাঠান", "Didn't receive code? Resend")}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Step 2: Set New Password Form */
                  <form onSubmit={handleUpdateSecurityPassword} className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3.5">
                    <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-2 rounded-xl text-xs font-bold">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{getTranslation("ওটিপি সফলভাবে যাচাই হয়েছে ✓", "OTP Verified Successfully ✓")}</span>
                      </div>
                      <span className="text-[10px] uppercase font-mono font-bold text-emerald-700">Step 2 / 2</span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        {getTranslation("নতুন পাসওয়ার্ড দিন", "Set New Password")}
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? "text" : "password"}
                          required
                          placeholder="••••••••"
                          value={newPasswordInput}
                          onChange={(e) => setNewPasswordInput(e.target.value)}
                          className="w-full bg-white border border-slate-300 focus:border-emerald-500 rounded-xl pl-3 pr-10 py-2 text-xs text-slate-800 outline-none transition"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword((prev) => !prev)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                          tabIndex={-1}
                          title={showNewPassword ? getTranslation("পাসওয়ার্ড লুকান", "Hide") : getTranslation("পাসওয়ার্ড দেখুন", "Show")}
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        {getTranslation("পাসওয়ার্ড নিশ্চিত করুন", "Confirm Password")}
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          required
                          placeholder="••••••••"
                          value={confirmPasswordInput}
                          onChange={(e) => setConfirmPasswordInput(e.target.value)}
                          className="w-full bg-white border border-slate-300 focus:border-emerald-500 rounded-xl pl-3 pr-10 py-2 text-xs text-slate-800 outline-none transition"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((prev) => !prev)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                          tabIndex={-1}
                          title={showConfirmPassword ? getTranslation("পাসওয়ার্ড লুকান", "Hide") : getTranslation("পাসওয়ার্ড দেখুন", "Show")}
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-400">
                      {getTranslation("পাসওয়ার্ড ন্যূনতম ৬ অক্ষরের হতে হবে।", "Password must be at least 6 characters long.")}
                    </p>

                    <button
                      type="submit"
                      disabled={isUpdatingPassword || !newPasswordInput || !confirmPasswordInput}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                    >
                      {isUpdatingPassword ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>{getTranslation("পাসওয়ার্ড সংরক্ষণ হচ্ছে...", "Saving Password...")}</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>{getTranslation("নতুন পাসওয়ার্ড সংরক্ষণ করুন", "Save New Password")}</span>
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            )}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowProfileSettingsModal(false)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                {getTranslation("বন্ধ করুন", "Close")}
              </button>
            </div>
          </div>
        </div>
      )}

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
