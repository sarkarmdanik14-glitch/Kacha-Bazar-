import React, { useState, useRef, useEffect } from "react";
import { User, Mail, Lock, AlertCircle, Key, LogIn, UserPlus, Gift, Sparkles, RefreshCw, Smartphone, Store, Eye, EyeOff, ArrowLeft, CheckCircle2, ShieldCheck, Check } from "lucide-react";
import { authenticatePartner } from "../../lib/partnerManager";
import { apiClient } from "../../lib/apiClient";
import { createTranslator } from "../../lib/formatUtils";
import { generateMemberId } from "../../lib/memberIdUtils";
import { APP_LOGO_URL } from "../../constants/branding";
import { 
  supabaseSignInWithEmail, 
  supabaseSignUpWithEmail, 
  supabaseSignInWithGoogle, 
  supabaseSendPasswordResetEmail,
  supabaseSignOut,
  checkIsSupabaseAdmin,
  saveUserProfile,
  verifyServerAdminOrStaffSession
} from "../../lib/supabaseAuth";
import { supabase } from "../../lib/supabase";
const loginPartnerWithCredentials = authenticatePartner;

interface AuthViewProps {
  onAuthSuccess: (user: any, role: string) => void | Promise<void>;
  lang: "bn" | "en";
  forcedRole?: "customer" | "admin" | "seller" | "rider" | "partner";
  initialAuthMode?: "login" | "register";
  initialReferralCode?: string;
  onRoleChange?: (role: "customer" | "admin" | "seller" | "rider" | "partner") => void;
  onAuthStart?: () => void;
  onAuthEnd?: () => void;
}

export default function AuthView({ 
  onAuthSuccess, 
  lang, 
  forcedRole,
  initialAuthMode = "login",
  initialReferralCode,
  onRoleChange,
  onAuthStart,
  onAuthEnd
}: AuthViewProps) {
  const [role, setRole] = useState<"customer" | "admin" | "seller" | "rider" | "partner">(forcedRole || "customer");
  const isStrictLoginOnly = forcedRole === "admin" || forcedRole === "partner" || role === "admin" || role === "partner";
  const [isLogin, setIsLogin] = useState<boolean>(isStrictLoginOnly ? true : initialAuthMode !== "register");
  const [authMethod, setAuthMethod] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [fullName, setFullName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [shopName, setShopName] = useState<string>(""); // for seller
  const [vehicleType, setVehicleType] = useState<string>("Bicycle"); // for rider
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [referralInput, setReferralInput] = useState<string>(() => {
    if (forcedRole === "admin" || forcedRole === "partner") return "";
    return (initialReferralCode || localStorage.getItem("referredBy") || sessionStorage.getItem("referredBy") || "").trim().toUpperCase();
  });

  // Forgot Password / Password Reset workflow states
  const [isForgotPassword, setIsForgotPassword] = useState<boolean>(false);
  const [forgotStep, setForgotStep] = useState<"request" | "verify" | "reset" | "success">("request");
  const [forgotIdentifier, setForgotIdentifier] = useState<string>("");
  const [forgotResetId, setForgotResetId] = useState<string>("");
  const [forgotMaskedTarget, setForgotMaskedTarget] = useState<string>("");
  const [forgotOtpCode, setForgotOtpCode] = useState<string>("");
  const [forgotResetToken, setForgotResetToken] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmNewPassword, setConfirmNewPassword] = useState<string>("");
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState<boolean>(false);
  const [forgotTimer, setForgotTimer] = useState<number>(0);
  const [successMsg, setSuccessMsg] = useState<string>("");

  React.useEffect(() => {
    if (forcedRole) {
      setRole(forcedRole);
      onRoleChange?.(forcedRole);
    }
  }, [forcedRole]);

  React.useEffect(() => {
    if (isStrictLoginOnly) {
      setIsLogin(true);
      return;
    }
    if (initialAuthMode === "register") {
      setIsLogin(false);
    } else if (initialAuthMode === "login") {
      setIsLogin(true);
    }
  }, [initialAuthMode, isStrictLoginOnly]);

  React.useEffect(() => {
    if (isStrictLoginOnly) {
      setReferralInput("");
      return;
    }
    if (initialReferralCode) {
      setReferralInput(initialReferralCode.trim().toUpperCase());
    }
  }, [initialReferralCode, isStrictLoginOnly]);

  // Phone auth states
  const [otpCode, setOtpCode] = useState<string>("");
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [otpSending, setOtpSending] = useState<boolean>(false);
  const [confirmationResult, setConfirmationResult] = useState<any | null>(null);
  const [otpNotice, setOtpNotice] = useState<string>("");

  const isMountedRef = useRef<boolean>(true);
  const isSubmittingRef = useRef<boolean>(false);
  const authRequestSeqRef = useRef<number>(0);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      isSubmittingRef.current = false;
    };
  }, []);

  const getTranslation = createTranslator(lang);

  // Countdown timer for resending OTP code
  useEffect(() => {
    if (forgotTimer <= 0) return;
    const interval = setInterval(() => {
      setForgotTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [forgotTimer]);

  // Step 1: Send Reset Code
  const handleSendResetCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (loading || isSubmittingRef.current) return;

    const ident = (forgotIdentifier || email || phone || "").trim();
    if (!ident) {
      setError(getTranslation("অনুগ্রহ করে আপনার নিবন্ধিত ইমেইল বা মোবাইল নম্বর দিন।", "Please enter your registered email or phone number."));
      return;
    }

    setLoading(true);
    isSubmittingRef.current = true;
    setError("");
    setSuccessMsg("");

    const isEmail = ident.includes("@") && ident.includes(".");
    const cleanDigits = ident.replace(/[^\d]/g, "");
    const isPhone = !isEmail && (cleanDigits.length >= 10 || ident.startsWith("+88") || ident.startsWith("01"));

    if (isPhone) {
      isSubmittingRef.current = false;
      setLoading(false);
      setError(getTranslation(
        "বর্তমানে মোবাইল এসএমএস সার্ভিস রক্ষণাবেক্ষণে রয়েছে, অনুগ্রহ করে ইমেইলের মাধ্যমে পাসওয়ার্ড রিসেট করুন।",
        "Mobile SMS service is currently undergoing maintenance. Please reset your password using your registered Email."
      ));
      return;
    }

    let emailDispatched = false;
    try {
      if (isEmail || ident.includes("@")) {
        const sbRes = await supabaseSendPasswordResetEmail(ident);
        if (sbRes.success) {
          emailDispatched = true;
          if (isMountedRef.current) {
            setSuccessMsg(getTranslation(
              "আপনার ইমেইলে পাসওয়ার্ড রিসেট নির্দেশিকা পাঠানো হয়েছে।",
              "Password reset instructions have been sent to your email."
            ));
          }
        }
      }

      // Backend OTP reset code endpoint
      const res = await apiClient.post("/api/auth/forgot-password/send-code", {
        identifier: ident
      }, { timeoutMs: 10000, silent: true });

      if (res && res.success) {
        if (isMountedRef.current) {
          setForgotResetId(res.resetId);
          setForgotMaskedTarget(res.maskedTarget || ident);
          setForgotStep("verify");
          setForgotTimer(60);
          setSuccessMsg(res.messageBn || getTranslation(
            "আপনার ইমেইলে পাসওয়ার্ড রিসেট নির্দেশিকা পাঠানো হয়েছে।",
            "Password reset instructions have been sent to your email."
          ));
        }
      } else if (!emailDispatched) {
        throw new Error(res?.error || res?.message || getTranslation("পাসওয়ার্ড রিসেট কোড পাঠাতে সমস্যা হয়েছে।", "Failed to send reset code."));
      }
    } catch (apiErr: any) {
      if (emailDispatched) {
        if (isMountedRef.current) {
          setSuccessMsg(getTranslation(
            "আপনার ইমেইলে পাসওয়ার্ড রিসেট নির্দেশিকা পাঠানো হয়েছে।",
            "Password reset instructions have been sent to your email."
          ));
        }
      } else if (isMountedRef.current) {
        setError(apiErr?.message || getTranslation(
          "পাসওয়ার্ড রিসেট করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।",
          "Failed to process password reset. Please try again."
        ));
      }
    } finally {
      isSubmittingRef.current = false;
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  // Step 2: Verify 6-digit Code
  const handleVerifyResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || isSubmittingRef.current) return;

    const code = forgotOtpCode.trim();
    if (code.length < 6) {
      setError(getTranslation("অনুগ্রহ করে সম্পূর্ণ ৬-সংখ্যার কোড লিখুন।", "Please enter the complete 6-digit code."));
      return;
    }

    setLoading(true);
    isSubmittingRef.current = true;
    setError("");
    setSuccessMsg("");

    try {
      const res = await apiClient.post("/api/auth/forgot-password/verify-code", {
        resetId: forgotResetId,
        code: code
      }, { timeoutMs: 10000 });

      if (res && res.success && res.resetToken) {
        if (isMountedRef.current) {
          setForgotResetToken(res.resetToken);
          setForgotStep("reset");
          setSuccessMsg(res.messageBn || getTranslation("কোড সফলভাবে যাচাই হয়েছে! এবার নতুন পাসওয়ার্ড দিন।", "Code verified! Now enter your new password."));
        }
      } else {
        throw new Error(res?.error || res?.message || getTranslation("কোড যাচাই করতে সমস্যা হয়েছে।", "Failed to verify code."));
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err?.message || getTranslation("ভুল ভেরিফিকেশন কোড। অনুগ্রহ করে সঠিক কোড দিন।", "Invalid verification code. Please check and try again."));
      }
    } finally {
      isSubmittingRef.current = false;
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  // Step 3: Complete Reset & Set New Password
  const handleCompleteReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || isSubmittingRef.current) return;

    if (!newPassword || newPassword.length < 6) {
      setError(getTranslation("পাসওয়ার্ড ন্যূনতম ৬ অক্ষরের হতে হবে।", "Password must be at least 6 characters long."));
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError(getTranslation("নতুন পাসওয়ার্ড দুটি মিলছে না! অনুগ্রহ করে মিলিয়ে লিখুন।", "New passwords do not match."));
      return;
    }

    setLoading(true);
    isSubmittingRef.current = true;
    setError("");
    setSuccessMsg("");

    try {
      const res = await apiClient.post("/api/auth/forgot-password/reset", {
        resetToken: forgotResetToken,
        newPassword: newPassword
      }, { timeoutMs: 10000 });

      if (res && res.success) {
        if (isMountedRef.current) {
          setForgotStep("success");
          setSuccessMsg(res.messageBn || getTranslation("পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!", "Password has been successfully reset!"));
          if (forgotIdentifier && forgotIdentifier.includes("@")) {
            setEmail(forgotIdentifier);
          }
        }
      } else {
        throw new Error(res?.error || res?.message || getTranslation("পাসওয়ার্ড পরিবর্তন করতে সমস্যা হয়েছে।", "Failed to reset password."));
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err?.message || getTranslation("পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।", "Failed to update password. Please try again."));
      }
    } finally {
      isSubmittingRef.current = false;
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  // Helper to verify if user is a real admin via backend verification
  const checkIsAdmin = async (uid: string, userEmail?: string): Promise<boolean> => {
    try {
      const cleanEmail = (userEmail || email || "").toLowerCase().trim();
      if (!uid && !cleanEmail) return false;

      // Authoritative backend staff session verification
      const serverCheck = await verifyServerAdminOrStaffSession();
      if (serverCheck.isAuthenticated && (serverCheck.isAdmin || serverCheck.isSuperAdmin)) {
        return true;
      }

      // Check server active staff session
      const staffSessionId = localStorage.getItem("kb_staff_session") || sessionStorage.getItem("kb_staff_session");
      if (staffSessionId) {
        try {
          const sRes = await apiClient.get<any>("/api/staff/active-session", { silent: true, timeoutMs: 5000 });
          if (sRes?.success && sRes?.staff && (sRes.staff.role === "admin" || sRes.staff.role === "super_admin" || sRes.staff.isSuperAdmin)) {
            return true;
          }
        } catch {}
      }

      // Check Supabase staff and users tables
      const isSbAdmin = await checkIsSupabaseAdmin(uid, cleanEmail);
      if (isSbAdmin) return true;
    } catch (err: any) {
      console.warn("Notice verifying admin permissions:", err?.message || err);
    }
    return false;
  };

  // Helper to verify seller role and status in Supabase
  const checkSellerStatus = async (uid: string): Promise<{ isSeller: boolean; status: string }> => {
    try {
      const { data: sbSeller } = await supabase
        .from("sellers")
        .select("*")
        .or(`id.eq.${uid},user_id.eq.${uid}`)
        .maybeSingle();
      if (sbSeller) {
        return { isSeller: true, status: sbSeller.status || "pending" };
      }

      const { data: sbUser } = await supabase
        .from("users")
        .select("role, status")
        .or(`id.eq.${uid},uid.eq.${uid}`)
        .maybeSingle();
      if (sbUser?.role === "seller") {
        return { isSeller: true, status: sbUser.status || "pending" };
      }
    } catch (err: any) {
      console.warn("Notice checking seller status:", err?.message || err);
    }
    return { isSeller: false, status: "none" };
  };

  // Helper to verify rider role and status in Supabase
  const checkRiderStatus = async (uid: string): Promise<{ isRider: boolean; status: string }> => {
    try {
      const { data: sbRider } = await supabase
        .from("riders")
        .select("*")
        .or(`id.eq.${uid},user_id.eq.${uid}`)
        .maybeSingle();
      if (sbRider) {
        return { isRider: true, status: sbRider.status || "pending" };
      }

      const { data: sbUser } = await supabase
        .from("users")
        .select("role, status")
        .or(`id.eq.${uid},uid.eq.${uid}`)
        .maybeSingle();
      if (sbUser?.role === "rider") {
        return { isRider: true, status: sbUser.status || "pending" };
      }
    } catch (err: any) {
      console.warn("Notice checking rider status:", err?.message || err);
    }
    return { isRider: false, status: "none" };
  };

  // Helper to register the referral connection in Supabase
  const linkReferral = async (newUserId: string, referralCodeUsed: string) => {
    if (!referralCodeUsed || referralCodeUsed.trim() === "") return;
    try {
      const code = referralCodeUsed.trim().toUpperCase();
      const { data: refUser } = await supabase
        .from("users")
        .select("id, uid")
        .eq("referral_code", code)
        .maybeSingle();

      const referrerId = refUser?.id || refUser?.uid;
      if (referrerId && referrerId !== newUserId) {
        const refId = `ref_${referrerId}_${newUserId}`;
        await supabase.from("referrals").upsert({
          id: refId,
          referrer_id: referrerId,
          referred_id: newUserId,
          status: "pending",
          bonus_paid: false,
          created_at: new Date().toISOString()
        });
        localStorage.removeItem("referredBy");
      }
    } catch (err) {
      console.warn("Notice linking referral:", err);
    }
  };

  // Phone Auth: Send OTP via backend SMS endpoint
  const handleSendOTP = async () => {
    if (loading || isSubmittingRef.current || otpSending) return;
    setError("");
    setOtpNotice("");
    if (!phone || !phone.trim()) {
      setError(getTranslation("অনুগ্রহ করে মোবাইল নম্বর প্রদান করুন।", "Please provide a mobile number."));
      return;
    }
    setOtpSending(true);

    let formattedPhone = phone.trim().replace(/[\s-]/g, "");
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "+88" + formattedPhone;
    } else if (!formattedPhone.startsWith("+")) {
      formattedPhone = "+880" + formattedPhone.replace(/^880/, "");
    }

    try {
      const res = await apiClient.post("/api/auth/phone/send-verification-otp", {
        phone: formattedPhone
      }, { timeoutMs: 10000 });

      if (res && res.success) {
        if (isMountedRef.current) {
          setOtpSent(true);
          setOtpNotice(res.messageBn || getTranslation(
            "আপনার মোবাইলে এসএমএস-এর মাধ্যমে ওটিপি কোড পাঠানো হয়েছে। অনুগ্রহ করে কোডটি লিখুন।",
            "An SMS verification OTP has been sent to your phone. Please enter it below."
          ));
        }
      } else {
        throw new Error(res?.error || res?.message || getTranslation("ওটিপি পাঠাতে সমস্যা হয়েছে।", "Failed to send OTP."));
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        setOtpSent(false);
        setError(err?.message || getTranslation(
          "বর্তমানে এসএমএস সার্ভিস রক্ষণাবেক্ষণে রয়েছে। অনুগ্রহ করে ইমেইল ও পাসওয়ার্ড অথবা গুগল দিয়ে সাইন ইন করুন।",
          "SMS service is temporarily unavailable. Please sign in with Email & Password or Google."
        ));
      }
    } finally {
      if (isMountedRef.current) {
        setOtpSending(false);
      }
    }
  };

  // Phone Auth: Verify OTP and log in user
  const handleVerifyOTP = async () => {
    if (loading || isSubmittingRef.current) return;
    setError("");
    if (!otpCode || otpCode.trim().length < 4) {
      setError(getTranslation("অনুগ্রহ করে ওটিপি কোডটি লিখুন।", "Please enter the OTP code."));
      return;
    }

    setLoading(true);
    isSubmittingRef.current = true;

    let formattedPhone = phone.trim().replace(/[\s-]/g, "");
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "+88" + formattedPhone;
    } else if (!formattedPhone.startsWith("+")) {
      formattedPhone = "+880" + formattedPhone.replace(/^880/, "");
    }

    let otpSuccess = false;
    try {
      const res = await apiClient.post("/api/auth/phone/verify-otp", {
        phone: formattedPhone,
        code: otpCode.trim()
      }, { timeoutMs: 10000 });

      if (res && res.success) {
        const { data: existingUser } = await supabase
          .from("users")
          .select("*")
          .eq("phone", formattedPhone)
          .maybeSingle();

        if (existingUser) {
          if (isMountedRef.current) {
            otpSuccess = true;
            await onAuthSuccess(existingUser, existingUser.role || role);
          }
        } else {
          const randomId = "user_" + Math.random().toString(36).substring(2, 10);
          const newProfile = {
            id: randomId,
            uid: randomId,
            phone: formattedPhone,
            displayName: fullName || getTranslation("মোবাইল গ্রাহক", "Mobile Customer"),
            fullName: fullName || getTranslation("মোবাইল গ্রাহক", "Mobile Customer"),
            email: `${formattedPhone.replace(/[^\d]/g, "")}@megabazar.com`,
            role: "customer"
          };
          saveUserProfile(newProfile as any).catch(() => {});
          if (isMountedRef.current) {
            otpSuccess = true;
            await onAuthSuccess(newProfile, "customer");
          }
        }
      } else {
        throw new Error(res?.error || getTranslation("ভুল ওটিপি কোড! অনুগ্রহ করে আবার চেষ্টা করুন।", "Invalid OTP code! Please try again."));
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err?.message || getTranslation("ওটিপি যাচাই ব্যর্থ হয়েছে।", "OTP verification failed."));
      }
    } finally {
      if (!otpSuccess) {
        isSubmittingRef.current = false;
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    }
  };

  // Primary Authentication Handler (Email/Password & Registration)
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || isSubmittingRef.current) return;

    if (isLogin && authMethod === "phone") {
      await handleVerifyOTP();
      return;
    }

    setError("");

    if (!email || !password || (!isLogin && !fullName)) {
      setError(getTranslation("অনুগ্রহ করে সব তথ্য পূরণ করুন।", "Please fill in all fields."));
      return;
    }

    if (!isLogin && role === "admin") {
      setError(getTranslation(
        "এডমিন অ্যাকাউন্ট সরাসরি তৈরি করা যাবে না।",
        "Admin account registration is not permitted."
      ));
      return;
    }

    setLoading(true);
    isSubmittingRef.current = true;
    onAuthStart?.();
    const currentRequestSeq = ++authRequestSeqRef.current;

    // Timeout safety fallback (20s for mobile network resilience)
    const timeoutId = setTimeout(() => {
      if (isMountedRef.current && currentRequestSeq === authRequestSeqRef.current) {
        setLoading(false);
        isSubmittingRef.current = false;
        onAuthEnd?.();
        setError(getTranslation(
          "অনুরোধ সম্পন্ন হতে অতিরিক্ত সময় লেগেছে। অনুগ্রহ করে ইন্টারনেট সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।",
          "Request timed out. Please check your internet connection and try again."
        ));
      }
    }, 20000);

    let authSucceeded = false;
    try {
      if (isLogin) {
        // Direct Partner Shop login with Partner ID / Email & Password
        if (role === "partner" || email.trim().toUpperCase().startsWith("KB-SHOP-")) {
          const partnerRes = await loginPartnerWithCredentials(email, password);
          if (partnerRes.success && partnerRes.partner) {
            if (isMountedRef.current && currentRequestSeq === authRequestSeqRef.current) {
              authSucceeded = true;
              await onAuthSuccess(partnerRes.partner, "partner");
            }
            return;
          } else {
            throw new Error(partnerRes.error || getTranslation("পার্টনার শপ লগইন ব্যর্থ হয়েছে। আইডি বা পাসওয়ার্ড সঠিক নয়।", "Partner shop login failed. Incorrect ID or password."));
          }
        }

        // Single authoritative call to Supabase Auth login (handles server verification, Supabase Auth, and profile resolution)
        const sbRes = await supabaseSignInWithEmail(email, password, role);

        // Point 1: Invalidate stale response if request was superseded or timed out
        if (currentRequestSeq !== authRequestSeqRef.current) {
          console.warn("[AuthView] Discarding stale login response from previous timed-out request");
          return;
        }

        if (!sbRes.success || !sbRes.user) {
          const errText = sbRes.error || "";
          if (/email not confirmed/i.test(errText)) {
            throw new Error(getTranslation(
              "ইমেইল কনফার্মেশন সম্পন্ন হয়নি (Email not confirmed)! অনুগ্রহ করে আপনার ইমেইল ইনবক্স চেক করে লিঙ্কটিতে ক্লিক করুন।",
              "Email not confirmed! Please check your email inbox to confirm your account."
            ));
          }
          throw new Error(errText || getTranslation("ভুল ইমেইল বা পাসওয়ার্ড! অনুগ্রহ করে সঠিক তথ্য দিন।", "Incorrect email or password. Please check your credentials."));
        }

        const authenticatedUser = sbRes.user;
        let authenticatedRole = sbRes.role || role;
        const userUid = authenticatedUser.uid || authenticatedUser.id || "";
        const cleanEmail = (authenticatedUser.email || email).toLowerCase().trim();

        // Role authorization check for selected tab: strictly verified on backend
        if (role === "admin") {
          let isAdmin = false;
          let serverCheckRole = "customer";
          let isSuperAdmin = false;

          // Check if session was already authoritatively verified inside supabaseSignInWithEmail
          const hasStaffSession = typeof window !== "undefined" && Boolean(localStorage.getItem("kb_staff_session") || sessionStorage.getItem("kb_staff_session"));
          if (hasStaffSession && (sbRes.user?.role === "admin" || sbRes.user?.role === "super_admin" || sbRes.user?.isSuperAdmin)) {
            isAdmin = true;
            serverCheckRole = sbRes.user.role || "admin";
            isSuperAdmin = Boolean(sbRes.user.isSuperAdmin || sbRes.user.role === "super_admin");
          } else {
            const serverCheck = await verifyServerAdminOrStaffSession();
            isAdmin = serverCheck.isAuthenticated && (serverCheck.isAdmin || serverCheck.isSuperAdmin);
            serverCheckRole = serverCheck.role;
            isSuperAdmin = serverCheck.isSuperAdmin;
          }

          if (!isAdmin) {
            await supabaseSignOut();
            throw new Error(getTranslation("প্রবেশাধিকার সংরক্ষিত। আপনি এডমিন হিসেবে অনুমোদিত নন।", "Access denied. You are not authorized as an admin."));
          }
          authenticatedRole = serverCheckRole;
          authenticatedUser.role = authenticatedRole as any;
          authenticatedUser.isSuperAdmin = isSuperAdmin;
        } else if (role === "seller") {
          const sRes = await checkSellerStatus(userUid);
          if (!sRes.isSeller) {
            await supabaseSignOut();
            throw new Error(getTranslation("প্রবেশাধিকার সংরক্ষিত। এই অ্যাকাউন্টটি বিক্রেতা হিসেবে নিবন্ধিত নয়।", "Access denied. This account is not registered as a seller."));
          }
          if (sRes.status === "rejected") {
            await supabaseSignOut();
            throw new Error(getTranslation("আপনার বিক্রেতা অ্যাকাউন্টটি এডমিন কর্তৃক বাতিল করা হয়েছে।", "Your seller account application was rejected by admin."));
          }
        } else if (role === "rider") {
          const rRes = await checkRiderStatus(userUid);
          if (!rRes.isRider) {
            await supabaseSignOut();
            throw new Error(getTranslation("প্রবেশাধিকার সংরক্ষিত। এই অ্যাকাউন্টটি রাইডার হিসেবে নিবন্ধিত নয়।", "Access denied. This account is not registered as a rider."));
          }
          if (rRes.status === "rejected") {
            await supabaseSignOut();
            throw new Error(getTranslation("আপনার রাইডার অ্যাকাউন্টটি এডমিন কর্তৃক বাতিল করা হয়েছে।", "Your rider account application was rejected by admin."));
          }
        }

        if (isMountedRef.current && currentRequestSeq === authRequestSeqRef.current) {
          authSucceeded = true;
          await onAuthSuccess(authenticatedUser, authenticatedRole);
        }
      } else {
        // Sign up with Supabase Auth
        const trimmedFullName = (fullName || "").trim();
        if (!trimmedFullName) {
          throw new Error(getTranslation("অনুগ্রহ করে আপনার সম্পূর্ণ নাম লিখুন।", "Please enter your full name."));
        }

        const sbSignUpRes = await supabaseSignUpWithEmail({
          email: email.trim(),
          pass: password,
          fullName: trimmedFullName,
          phone: phone.trim(),
          role: role,
          shopName: shopName || getTranslation("আমার মেগা বাজার", "My Mega Bazar"),
          vehicleType: vehicleType,
          referralCode: referralInput
        });

        if (!sbSignUpRes.success || !sbSignUpRes.user) {
          throw new Error(sbSignUpRes.error || getTranslation("অ্যাকাউন্ট তৈরি করতে সমস্যা হয়েছে।", "Failed to create account."));
        }

        const newUser = sbSignUpRes.user;
        await linkReferral(newUser.uid, referralInput);

        if (isMountedRef.current) {
          authSucceeded = true;
          await onAuthSuccess(newUser, role);
        }
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        let errMsg = err.message || "";
        if (/failed to fetch/i.test(errMsg) || /networkerror/i.test(errMsg)) {
          errMsg = getTranslation(
            "সার্ভারের সাথে সংযোগ স্থাপন করা যায়নি (Failed to fetch)। অনুগ্রহ করে আপনার ইন্টারনেট সংযোগ অথবা Supabase প্রজেক্ট সচল (Active) আছে কিনা পরীক্ষা করুন।",
            "Unable to connect to server (Failed to fetch). Please check your internet connection or Supabase project status."
          );
        } else if (err.code === "auth/email-already-in-use") {
          errMsg = getTranslation("এই ইমেইলটি ইতিমধ্যে ব্যবহৃত হয়েছে।", "This email is already in use.");
        } else if (err.code === "auth/weak-password") {
          errMsg = getTranslation("পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।", "Password must be at least 6 characters.");
        } else if (err.code === "auth/invalid-credential") {
          errMsg = getTranslation("ভুল ইমেইল বা পাসওয়ার্ড।", "Invalid email or password.");
        } else if (err.code === "auth/user-not-found") {
          errMsg = getTranslation("এই ইমেইলে কোনো অ্যাকাউন্ট পাওয়া যায়নি।", "No account found with this email.");
        }
        setError(errMsg || getTranslation("লগইন করতে সমস্যা হয়েছে।", "Authentication failed."));
      }
    } finally {
      clearTimeout(timeoutId);
      if (!authSucceeded) {
        isSubmittingRef.current = false;
        onAuthEnd?.();
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    }
  };

  // Google Sign-In via Supabase OAuth
  const handleGoogleLogin = async () => {
    if (loading || isSubmittingRef.current) return;
    setError("");
    setLoading(true);
    isSubmittingRef.current = true;

    try {
      const sbOAuth = await supabaseSignInWithGoogle();
      if (!sbOAuth.success) {
        throw new Error(sbOAuth.error || getTranslation("গুগল সাইন ইন সম্পন্ন হতে পারেনি।", "Google sign-in failed."));
      }
      // Supabase initiates OAuth redirect to Google
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err?.message || getTranslation("গুগল সাইন ইন ত্রুটি।", "Google sign-in error."));
      }
    } finally {
      isSubmittingRef.current = false;
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  if (isForgotPassword) {
    return (
      <div className="w-full max-w-md mx-auto bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-100 relative overflow-hidden animate-fade-in">
        {/* Decorative gradient headers */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600"></div>

        {/* Header navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => {
              setIsForgotPassword(false);
              setForgotStep("request");
              setError("");
              setSuccessMsg("");
            }}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{getTranslation("লগইনে ফিরে যান", "Back to Login")}</span>
          </button>
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
            {getTranslation("নিরাপদ রিসেট", "Secure Reset")}
          </span>
        </div>

        <div className="text-center mb-5">
          <img 
            src={APP_LOGO_URL} 
            alt="মেগা বাজার" 
            className="h-12 w-auto max-w-[64px] object-contain rounded-2xl mx-auto mb-2.5 border border-emerald-100 bg-white p-1 shadow-xs" 
          />
          <h2 className="text-xl font-black text-slate-800 tracking-tight">
            {getTranslation("পাসওয়ার্ড রিসেট", "Reset Password")}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {forgotStep === "request" && getTranslation("আপনার নিবন্ধিত ইমেইল বা ফোন নম্বর দিন। আমরা একটি ৬-সংখ্যার ভেরিফিকেশন কোড পাঠাব।", "Enter your registered email or phone to receive a 6-digit verification code.")}
            {forgotStep === "verify" && getTranslation("আপনার কাছে পাঠানো ৬-সংখ্যার কোডটি প্রবেশ করান।", "Enter the 6-digit verification code sent to your device.")}
            {forgotStep === "reset" && getTranslation("আপনার অ্যাকাউন্টের জন্য নতুন পাসওয়ার্ড সেট করুন।", "Create a new strong password for your account.")}
            {forgotStep === "success" && getTranslation("পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!", "Password changed successfully!")}
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-100 text-red-700 text-xs rounded-xl p-3 flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && forgotStep !== "success" && (
          <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-2xl p-4 flex items-start space-x-3 shadow-xs animate-in fade-in duration-200">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
            <div className="space-y-1 flex-1">
              <p className="font-bold text-emerald-950">{successMsg}</p>
              <p className="text-[11px] text-emerald-800/90 leading-relaxed">
                {getTranslation(
                  "অনুগ্রহ করে আপনার ইনবক্স বা স্প্যাম ফোল্ডার চেক করুন এবং প্রেরিত লিংকে ক্লিক করে নতুন পাসওয়ার্ড দিন।",
                  "Please check your inbox or spam folder and click the link to reset your password."
                )}
              </p>
            </div>
          </div>
        )}

        {/* STEP 1: REQUEST CODE */}
        {forgotStep === "request" && (
          <form onSubmit={handleSendResetCode} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                {getTranslation("নিবন্ধিত ইমেইল বা মোবাইল নম্বর", "Registered Email or Phone")}
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                <input
                  type="text"
                  required
                  placeholder={getTranslation("যেমন: user@example.com", "e.g. user@example.com")}
                  value={forgotIdentifier}
                  onChange={(e) => {
                    setForgotIdentifier(e.target.value);
                    if (error) setError("");
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !forgotIdentifier.trim()}
              className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white py-3 rounded-2xl text-xs font-black shadow-md hover:shadow-lg transition flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{getTranslation("রিসেট নির্দেশিকা পাঠানো হচ্ছে...", "Sending Instructions...")}</span>
                </>
              ) : (
                <>
                  <Key className="w-4 h-4" />
                  <span>{getTranslation("পাসওয়ার্ড রিসেট লিংক পাঠান", "Send Password Reset Link")}</span>
                </>
              )}
            </button>

            {successMsg && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(false);
                    setIsLogin(true);
                    setForgotStep("request");
                    setError("");
                    setSuccessMsg("");
                  }}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-2xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <LogIn className="w-4 h-4 text-emerald-600" />
                  <span>{getTranslation("লগইন পেজে যান", "Return to Login")}</span>
                </button>
              </div>
            )}
          </form>
        )}

        {/* STEP 2: VERIFY CODE */}
        {forgotStep === "verify" && (
          <form onSubmit={handleVerifyResetCode} className="space-y-4">
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs text-slate-600">
              <p className="text-[11px]">
                {getTranslation("কোড পাঠানো হয়েছে:", "Code sent to:")} <strong className="text-slate-800 font-semibold">{forgotMaskedTarget}</strong>
              </p>
              <button
                type="button"
                onClick={() => {
                  setForgotStep("request");
                  setError("");
                }}
                className="text-[10px] text-emerald-600 hover:underline font-bold mt-1 inline-block cursor-pointer"
              >
                {getTranslation("নম্বর বা ইমেইল পরিবর্তন করুন", "Change Email or Phone")}
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                {getTranslation("৬-সংখ্যার ভেরিফিকেশন কোড (OTP)", "6-Digit Verification Code (OTP)")}
              </label>
              <input
                type="text"
                required
                maxLength={6}
                placeholder="• • • • • •"
                value={forgotOtpCode}
                onChange={(e) => setForgotOtpCode(e.target.value.replace(/\D/g, ""))}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-base font-mono text-center tracking-widest font-black focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading || forgotOtpCode.trim().length < 6}
              className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white py-3 rounded-2xl text-xs font-black shadow-md hover:shadow-lg transition flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{getTranslation("কোড যাচাই হচ্ছে...", "Verifying Code...")}</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>{getTranslation("যাচাই করুন ও এগিয়ে যান", "Verify & Proceed")}</span>
                </>
              )}
            </button>

            <div className="text-center pt-2">
              {forgotTimer > 0 ? (
                <span className="text-[11px] text-slate-400 font-bold">
                  {getTranslation(`পুনরায় কোড পাঠানোর সময় বাকি: ${forgotTimer} সেকেন্ড`, `Resend code in: ${forgotTimer}s`)}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSendResetCode()}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-bold hover:underline cursor-pointer"
                >
                  {getTranslation("কোড পাননি? পুনরায় পাঠান", "Didn't receive code? Resend")}
                </button>
              )}
            </div>
          </form>
        )}

        {/* STEP 3: SET NEW PASSWORD */}
        {forgotStep === "reset" && (
          <form onSubmit={handleCompleteReset} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                {getTranslation("নতুন পাসওয়ার্ড", "New Password")}
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                <input
                  type={showNewPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-11 py-2.5 text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer transition p-1 rounded-lg hover:bg-slate-200/50"
                  tabIndex={-1}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                {getTranslation("নতুন পাসওয়ার্ড নিশ্চিত করুন", "Confirm New Password")}
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                <input
                  type={showConfirmNewPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-11 py-2.5 text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmNewPassword((prev) => !prev)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer transition p-1 rounded-lg hover:bg-slate-200/50"
                  tabIndex={-1}
                >
                  {showConfirmNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 font-medium">
              {getTranslation("পাসওয়ার্ড ন্যূনতম ৬ অক্ষরের হতে হবে।", "Password must be at least 6 characters long.")}
            </p>

            <button
              type="submit"
              disabled={loading || !newPassword || !confirmNewPassword}
              className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white py-3 rounded-2xl text-xs font-black shadow-md hover:shadow-lg transition flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{getTranslation("পাসওয়ার্ড সংরক্ষণ হচ্ছে...", "Saving Password...")}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{getTranslation("পাসওয়ার্ড সংরক্ষণ করুন", "Save New Password")}</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 4: SUCCESS */}
        {forgotStep === "success" && (
          <div className="text-center space-y-4 py-2">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md animate-scale-up">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                {getTranslation("পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!", "Password Successfully Changed!")}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {getTranslation("এখন আপনার নতুন পাসওয়ার্ড দিয়ে স্বাচ্ছন্দ্যে লগইন করতে পারেন।", "You can now log in to your account using your new password.")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsForgotPassword(false);
                setIsLogin(true);
                setForgotStep("request");
                setPassword("");
                setError("");
                setSuccessMsg("");
              }}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-2xl text-xs font-black shadow-md hover:shadow-lg transition flex items-center justify-center space-x-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>{getTranslation("নতুন পাসওয়ার্ড দিয়ে লগইন করুন", "Log in with New Password")}</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 pt-8 sm:pt-9 shadow-xl shadow-slate-100 relative overflow-hidden animate-fade-in my-auto">
      
      {/* Decorative gradient headers */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600"></div>

      <div className="text-center mb-6">
        <img 
          src={APP_LOGO_URL} 
          alt="মেগা বাজার" 
          className="h-12 w-auto max-w-[64px] object-contain rounded-2xl mx-auto mb-3 border border-emerald-100 bg-white p-1 shadow-xs" 
        />
        <h2 className="text-xl font-black text-slate-800 tracking-tight">
          {role === "admin" 
            ? getTranslation("এডমিন পোর্টাল লগইন", "Admin Portal Login")
            : role === "partner"
            ? getTranslation("পার্টনার শপ লগইন", "Partner Shop Merchant Login")
            : role === "seller"
            ? (isLogin ? getTranslation("বিক্রেতা পোর্টাল লগইন", "Seller Portal Login") : getTranslation("নতুন বিক্রেতা নিবন্ধন", "Seller Account Registration"))
            : role === "rider"
            ? (isLogin ? getTranslation("রাইডার পোর্টাল লগইন", "Rider Portal Login") : getTranslation("নতুন রাইডার নিবন্ধন", "Rider Account Registration"))
            : (isLogin ? getTranslation("গ্রাহক অ্যাকাউন্ট লগইন", "Customer Account Sign In") : getTranslation("নতুন গ্রাহক অ্যাকাউন্ট তৈরি করুন", "Create Customer Account"))}
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          {role === "admin" 
            ? getTranslation("এডমিন সিস্টেমে নিরাপদ প্রবেশাধিকার", "Secure Admin System Access")
            : role === "partner"
            ? getTranslation("মেগা বাজার পার্টনার শপ মার্চেন্ট ড্যাশবোর্ড", "Access Your Mega Bazar Partner Store Hub")
            : role === "seller" 
            ? getTranslation("মেগা বাজার মার্চেন্ট প্যানেলে প্রবেশ করুন", "Access Mega Bazar Seller Hub")
            : role === "rider" 
            ? getTranslation("মেগা বাজার ডেলিভারি নেটওয়ার্কে প্রবেশ করুন", "Access Mega Bazar Rider Network")
            : getTranslation("মেগা বাজার অনলাইন পোর্টালে প্রবেশ করুন", "Access Mega Bazar Customer Portal")}
        </p>
      </div>

      {/* Role Selection Switcher for General Login Modal */}
      {(!forcedRole || forcedRole === "customer") && (
        <div className="flex bg-slate-100 p-1 rounded-2xl mb-4 text-xs font-bold gap-1 overflow-x-auto scrollbar-none border border-slate-200/60">
          {[
            { id: "customer", bn: "গ্রাহক", en: "Customer" },
            { id: "admin", bn: "এডমিন", en: "Admin" },
            { id: "partner", bn: "পার্টনার", en: "Partner" },
            { id: "seller", bn: "বিক্রেতা", en: "Seller" },
            { id: "rider", bn: "রাইডার", en: "Rider" }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                const newRole = tab.id as "customer" | "admin" | "seller" | "rider" | "partner";
                setRole(newRole);
                onRoleChange?.(newRole);
                setError("");
              }}
              className={`flex-1 py-1.5 px-2 rounded-xl transition text-center cursor-pointer whitespace-nowrap text-[11px] ${
                role === tab.id
                  ? "bg-white text-emerald-800 shadow-xs font-black border border-slate-200/80"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {lang === "bn" ? tab.bn : tab.en}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
            <span className="leading-relaxed font-medium">{error}</span>
          </div>
          {error.includes("Email not confirmed") && email && (
            <div className="pt-2 border-t border-red-200/60 flex items-center justify-between gap-2 flex-wrap">
              <span className="text-[11px] text-red-600 font-medium">ইনবক্সে কনফার্মেশন লিঙ্ক চান?</span>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const { error: resendErr } = await supabase.auth.resend({ type: "signup", email: email.trim() });
                    if (resendErr) throw resendErr;
                    setError(getTranslation(
                      `'${email.trim()}' ঠিকানায় কনফার্মেশন লিঙ্ক পাঠানো হয়েছে! ইনবক্স অথবা স্প্যাম ফোল্ডার চেক করুন।`,
                      `Confirmation link sent to '${email.trim()}'! Please check your inbox or spam folder.`
                    ));
                  } catch (e: any) {
                    setError(e.message || "কনফার্মেশন লিঙ্ক পাঠানো সম্ভব হয়নি।");
                  }
                }}
                className="text-[11px] bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold px-2.5 py-1 rounded-lg transition cursor-pointer"
              >
                {getTranslation("কনফার্মেশন ইমেইল পাঠান", "Resend Confirmation")}
              </button>
            </div>
          )}
        </div>
      )}

      {isLogin && role !== "partner" && (
        <div className="flex bg-slate-50 border border-slate-100 p-0.5 rounded-xl mb-4 text-[10px]">
          <button
            type="button"
            onClick={() => {
              setAuthMethod("email");
              setError("");
            }}
            className={`flex-1 py-1.5 rounded-lg font-bold transition text-center cursor-pointer ${
              authMethod === "email"
                ? "bg-white text-emerald-700 shadow-sm border border-slate-100"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {getTranslation("ইমেইল ও পাসওয়ার্ড", "Email & Password")}
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMethod("phone");
              setError("");
            }}
            className={`flex-1 py-1.5 rounded-lg font-bold transition text-center cursor-pointer ${
              authMethod === "phone"
                ? "bg-white text-emerald-700 shadow-sm border border-slate-100"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {getTranslation("মোবাইল ওটিপি (OTP)", "Mobile SMS OTP")}
          </button>
        </div>
      )}

      <form onSubmit={handleAuth} className="space-y-4">
        {isLogin && authMethod === "phone" ? (
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                {getTranslation("মোবাইল নম্বর", "Mobile Number")}
              </label>
              <div className="relative">
                <input
                  type="tel"
                  required
                  disabled={otpSent}
                  placeholder="01711XXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition disabled:opacity-60"
                />
              </div>
            </div>

            {!otpSent ? (
              <button
                id="phone-sign-in-button"
                type="button"
                disabled={otpSending}
                onClick={handleSendOTP}
                className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white py-2.5 rounded-2xl text-xs font-black transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 shadow-sm"
              >
                {otpSending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>{getTranslation("ওটিপি পাঠানো হচ্ছে...", "Sending OTP...")}</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>{getTranslation("ওটিপি পাঠান / ভেরিফাই করুন", "Send OTP / Verify")}</span>
                  </>
                )}
              </button>
            ) : (
              <div className="space-y-3">
                {otpNotice && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center space-x-2 text-xs text-emerald-900 shadow-sm animate-in fade-in duration-200">
                    <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-medium text-[11px] leading-tight">{otpNotice}</span>
                  </div>
                )}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      {getTranslation("ভেরিফিকেশন কোড (OTP)", "Verification Code (OTP)")}
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setOtpSent(false);
                        setOtpCode("");
                        setOtpNotice("");
                        setError("");
                      }}
                      className="text-[10px] text-emerald-700 hover:underline font-bold cursor-pointer"
                    >
                      {getTranslation("নম্বর পরিবর্তন", "Change Number")}
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="• • • • • •"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-mono text-center tracking-widest focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {!isLogin && (
              <>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    {getTranslation("পূর্ণ নাম", "Full Name")}
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                      type="text"
                      required
                      placeholder={getTranslation("যেমন: মোহাম্মদ", "e.g., Mohammad")}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    {getTranslation("মোবাইল নম্বর", "Mobile Number")}
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="01711XXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
                  />
                </div>

                {role === "seller" && (
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      {getTranslation("দোকানের নাম", "Shop Name")}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={getTranslation("যেমন: নাটোর ডেইরি ফার্ম", "e.g., Natore Dairy Farm")}
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
                    />
                  </div>
                )}

                {role === "rider" && (
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      {getTranslation("যানবাহনের ধরণ", "Vehicle Type")}
                    </label>
                    <select
                      value={vehicleType}
                      onChange={(e) => setVehicleType(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
                    >
                      <option value="Bicycle">{getTranslation("সাইকেল", "Bicycle")}</option>
                      <option value="Motorcycle">{getTranslation("মোটরসাইকেল", "Motorcycle")}</option>
                      <option value="Van / Auto-Rickshaw">{getTranslation("ভ্যান / অটো-রিকশা", "Van / Auto-Rickshaw")}</option>
                    </select>
                  </div>
                )}
              </>
            )}

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                {role === "admin" 
                  ? getTranslation("ইউজারনেম / স্টাফ আইডি / ইমেইল", "Username / Staff ID / Email")
                  : role === "partner"
                  ? getTranslation("পার্টনার আইডি (KB-SHOP-001) বা ইমেইল", "Partner ID (KB-SHOP-001) or Email")
                  : getTranslation("ইমেইল ঠিকানা", "Email Address")}
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type={role === "admin" || role === "partner" ? "text" : "email"}
                  required
                  placeholder={role === "admin" 
                    ? getTranslation("যেমন: CFI-KB-001 বা name@example.com", "e.g. CFI-KB-001 or name@example.com")
                    : role === "partner"
                    ? getTranslation("যেমন: KB-SHOP-001 বা greenvalley@kachabazar.com", "e.g. KB-SHOP-001 or email")
                    : "name@example.com"}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                {getTranslation("পাসওয়ার্ড", "Password")}
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-11 py-2.5 text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer transition p-1 rounded-lg hover:bg-slate-200/50"
                  title={showPassword ? getTranslation("পাসওয়ার্ড লুকান", "Hide Password") : getTranslation("পাসওয়ার্ড দেখুন", "Show Password")}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {isLogin && (
                <div className="flex justify-end mt-1.5 px-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(true);
                      setForgotStep("request");
                      setForgotIdentifier(email || phone || "");
                      setError("");
                      setSuccessMsg("");
                    }}
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer transition inline-flex items-center gap-1"
                  >
                    <Key className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{getTranslation("পাসওয়ার্ড ভুলে গেছেন?", "Forgot Password?")}</span>
                  </button>
                </div>
              )}
            </div>

            {!isLogin && !isStrictLoginOnly && (
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  {getTranslation("রেফারেল কোড (ঐচ্ছিক)", "Referral Code (Optional)")}
                </label>
                <div className="relative">
                  <Gift className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="e.g., REF12345"
                    value={referralInput}
                    onChange={(e) => setReferralInput(e.target.value.toUpperCase())}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-mono font-bold uppercase focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
                  />
                </div>
                {referralInput && (
                  <p className="text-[10.5px] text-emerald-600 font-bold mt-1.5 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                    <span>{getTranslation("রেফারেল কোড যুক্ত হয়েছে! অ্যাকাউন্ট খুললেই বোনাস পাবেন।", "Referral code applied! You will receive your bonus upon registration.")}</span>
                  </p>
                )}
              </div>
            )}
          </>
        )}

        <button
          type="submit"
          disabled={loading || (isLogin && authMethod === "phone" && !otpSent)}
          className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white py-3 rounded-2xl text-xs font-black shadow-md hover:shadow-lg transition flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {loading ? (
            <span className="flex items-center justify-center space-x-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span>{getTranslation("যাচাই করা হচ্ছে...", "Verifying...")}</span>
            </span>
          ) : isLogin ? (
            <>
              <LogIn className="w-4 h-4" />
              <span>
                {role === "partner" 
                  ? getTranslation("পার্টনার শপে প্রবেশ করুন", "Enter Partner Dashboard") 
                  : getTranslation("লগইন করুন", "Sign In")}
              </span>
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4" />
              <span>{getTranslation("অ্যাকাউন্ট তৈরি করুন", "Create Account")}</span>
            </>
          )}
        </button>
      </form>

      {/* Google Sign In Option - only for customer and non-partner */}
      {role !== "admin" && role !== "partner" && (
        <>
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-400">
              <span className="bg-white px-3">{getTranslation("অথবা", "or")}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 py-2.5 rounded-2xl text-xs font-bold transition flex items-center justify-center space-x-2 cursor-pointer"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{getTranslation("গুগল দিয়ে সাইন ইন করুন", "Sign in with Google")}</span>
          </button>
        </>
      )}

      {/* Switch auth mode */}
      {!isStrictLoginOnly && (
        <div className="mt-5 text-center text-xs text-slate-500">
          {isLogin ? (
            <>
              <span>{getTranslation("পোর্টাল অ্যাকাউন্ট নেই?", "Don't have a portal account?")} </span>
              <button
                onClick={() => setIsLogin(false)}
                className="text-emerald-600 font-bold hover:underline cursor-pointer"
              >
                {getTranslation("নিবন্ধন করুন", "Sign Up Now")}
              </button>
            </>
          ) : (
            <>
              <span>{getTranslation("ইতিমধ্যে অ্যাকাউন্ট আছে?", "Already have an account?")} </span>
              <button
                onClick={() => setIsLogin(true)}
                className="text-emerald-600 font-bold hover:underline cursor-pointer"
              >
                {getTranslation("লগইন করুন", "Sign In Instead")}
              </button>
            </>
          )}
        </div>
      )}

    </div>
  );
}
