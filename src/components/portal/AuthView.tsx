import React, { useState } from "react";
import { 
  auth, 
  db, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  googleProvider,
  doc, 
  setDoc, 
  getDoc,
  serverTimestamp,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  collection,
  query,
  where,
  getDocs,
  signOut,
  updateProfile,
  sendPasswordResetEmail
} from "../../lib/firebase";
import { User, Mail, Lock, AlertCircle, Key, LogIn, UserPlus, Gift, Sparkles, RefreshCw, Smartphone, Store, Eye, EyeOff, ArrowLeft, CheckCircle2, ShieldCheck, Check } from "lucide-react";
import { authenticatePartner } from "../../lib/partnerManager";
import { apiClient } from "../../lib/apiClient";
import { createTranslator } from "../../lib/formatUtils";
import { generateMemberId } from "../../lib/memberIdUtils";
import { APP_LOGO_URL } from "../../constants/branding";
const loginPartnerWithCredentials = authenticatePartner;

interface AuthViewProps {
  onAuthSuccess: (user: any, role: string) => void;
  lang: "bn" | "en";
  forcedRole?: "customer" | "admin" | "seller" | "rider" | "partner";
  initialAuthMode?: "login" | "register";
  initialReferralCode?: string;
}

export default function AuthView({ 
  onAuthSuccess, 
  lang, 
  forcedRole,
  initialAuthMode = "login",
  initialReferralCode 
}: AuthViewProps) {
  const [isLogin, setIsLogin] = useState<boolean>(initialAuthMode !== "register");
  const [authMethod, setAuthMethod] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [fullName, setFullName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [shopName, setShopName] = useState<string>(""); // for seller
  const [vehicleType, setVehicleType] = useState<string>("Bicycle"); // for rider
  const [role, setRole] = useState<"customer" | "admin" | "seller" | "rider" | "partner">(forcedRole || "customer");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [referralInput, setReferralInput] = useState<string>(() => {
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
    if (initialAuthMode === "register") {
      setIsLogin(false);
    } else if (initialAuthMode === "login") {
      setIsLogin(true);
    }
  }, [initialAuthMode]);

  React.useEffect(() => {
    if (initialReferralCode) {
      setReferralInput(initialReferralCode.trim().toUpperCase());
    }
  }, [initialReferralCode]);

  // Phone auth states
  const [otpCode, setOtpCode] = useState<string>("");
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [otpSending, setOtpSending] = useState<boolean>(false);
  const [confirmationResult, setConfirmationResult] = useState<any | null>(null);
  const [otpNotice, setOtpNotice] = useState<string>("");

  // Clean up any lingering invisible reCAPTCHA verifier instance when AuthView unmounts
  React.useEffect(() => {
    return () => {
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (e) {}
        window.recaptchaVerifier = undefined;
      }
    };
  }, []);

  const getTranslation = createTranslator(lang);

  // Countdown timer for resending OTP code
  React.useEffect(() => {
    if (forgotTimer <= 0) return;
    const interval = setInterval(() => {
      setForgotTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [forgotTimer]);

  // Step 1: Send Reset Code
  const handleSendResetCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const ident = (forgotIdentifier || email || phone || "").trim();
    if (!ident) {
      setError(getTranslation("অনুগ্রহ করে আপনার নিবন্ধিত ইমেইল বা মোবাইল নম্বর দিন।", "Please enter your registered email or phone number."));
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMsg("");

    const isEmail = ident.includes("@") && ident.includes(".");
    const cleanDigits = ident.replace(/[^\d]/g, "");
    const isPhone = !isEmail && (cleanDigits.length >= 10 || ident.startsWith("+88") || ident.startsWith("01"));

    // If user inputs a phone number without an active SMS API gateway configured
    if (isPhone) {
      setLoading(false);
      setError(getTranslation(
        "বর্তমানে মোবাইল এসএমএস সার্ভিস রক্ষণাবেক্ষণে রয়েছে, অনুগ্রহ করে ইমেইলের মাধ্যমে পাসওয়ার্ড রিসেট করুন।",
        "Mobile SMS service is currently undergoing maintenance. Please reset your password using your registered Email."
      ));
      return;
    }

    // When user inputs an email, ensure standard Firebase Auth reset dispatch is invoked cleanly from client SDK
    let emailDispatched = false;
    if (isEmail || ident.includes("@")) {
      try {
        await sendPasswordResetEmail(auth, ident);
        emailDispatched = true;
        setSuccessMsg(getTranslation(
          "আপনার ইমেইলে পাসওয়ার্ড রিসেট নির্দেশিকা পাঠানো হয়েছে।",
          "Password reset instructions have been sent to your email."
        ));
      } catch (fbErr: any) {
        console.warn("Client sendPasswordResetEmail error:", fbErr?.code || fbErr?.message);
        if (fbErr?.code === "auth/user-not-found") {
          setError(getTranslation(
            "এই ইমেইল ঠিকানায় কোনো অ্যাকাউন্ট খুঁজে পাওয়া যায়নি। অনুগ্রহ করে সঠিক ইমেইল দিন।",
            "No account found matching this email address. Please check and try again."
          ));
          setLoading(false);
          return;
        } else if (fbErr?.code === "auth/invalid-email") {
          setError(getTranslation(
            "অনুগ্রহ করে একটি সঠিক ইমেইল ঠিকানা প্রদান করুন।",
            "Please enter a valid email address."
          ));
          setLoading(false);
          return;
        } else if (fbErr?.code === "auth/too-many-requests") {
          setError(getTranslation(
            "অতিরিক্ত অনুরোধের কারণে সাময়িক বিরতি প্রয়োজন। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।",
            "Too many requests. Please wait a moment before trying again."
          ));
          setLoading(false);
          return;
        }
      }
    }

    // Optional custom OTP code via backend API in safe try/catch
    try {
      const res = await apiClient.post("/api/auth/forgot-password/send-code", {
        identifier: ident
      });

      if (res && res.success) {
        setForgotResetId(res.resetId);
        setForgotMaskedTarget(res.maskedTarget || ident);
        setForgotStep("verify");
        setForgotTimer(60);
        setSuccessMsg(res.messageBn || getTranslation(
          "আপনার ইমেইলে পাসওয়ার্ড রিসেট নির্দেশিকা পাঠানো হয়েছে।",
          "Password reset instructions have been sent to your email."
        ));
      } else if (!emailDispatched) {
        throw new Error(res?.error || res?.message || "Failed to send code");
      }
    } catch (apiErr: any) {
      console.warn("Backend send-code notice (fell back to standard Firebase Auth):", apiErr?.message);
      // If email was already cleanly sent via Firebase SDK, keep success message and never throw 405 error
      if (emailDispatched) {
        setSuccessMsg(getTranslation(
          "আপনার ইমেইলে পাসওয়ার্ড রিসেট নির্দেশিকা পাঠানো হয়েছে।",
          "Password reset instructions have been sent to your email."
        ));
      } else {
        setError(apiErr?.message || getTranslation(
          "পাসওয়ার্ড রিসেট করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।",
          "Failed to process password reset. Please try again."
        ));
      }
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify 6-digit Code
  const handleVerifyResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = forgotOtpCode.trim();
    if (code.length < 6) {
      setError(getTranslation("অনুগ্রহ করে সম্পূর্ণ ৬-সংখ্যার কোড লিখুন।", "Please enter the complete 6-digit code."));
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await apiClient.post("/api/auth/forgot-password/verify-code", {
        resetId: forgotResetId,
        code: code
      });

      if (res && res.success && res.resetToken) {
        setForgotResetToken(res.resetToken);
        setForgotStep("reset");
        setSuccessMsg(res.messageBn || getTranslation("কোড সফলভাবে যাচাই হয়েছে! এবার নতুন পাসওয়ার্ড দিন।", "Code verified! Now enter your new password."));
      } else {
        throw new Error(res?.error || res?.message || getTranslation("কোড যাচাই করতে সমস্যা হয়েছে।", "Failed to verify code."));
      }
    } catch (err: any) {
      setError(err?.message || getTranslation("ভুল ভেরিফিকেশন কোড। অনুগ্রহ করে সঠিক কোড দিন।", "Invalid verification code. Please check and try again."));
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Complete Reset & Set New Password
  const handleCompleteReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setError(getTranslation("পাসওয়ার্ড ন্যূনতম ৬ অক্ষরের হতে হবে।", "Password must be at least 6 characters long."));
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError(getTranslation("নতুন পাসওয়ার্ড দুটি মিলছে না! অনুগ্রহ করে মিলিয়ে লিখুন।", "New passwords do not match."));
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await apiClient.post("/api/auth/forgot-password/reset", {
        resetToken: forgotResetToken,
        newPassword: newPassword
      });

      if (res && res.success) {
        setForgotStep("success");
        setSuccessMsg(res.messageBn || getTranslation("পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!", "Password has been successfully reset!"));
        if (forgotIdentifier && forgotIdentifier.includes("@")) {
          setEmail(forgotIdentifier);
        }
      } else {
        throw new Error(res?.error || res?.message || getTranslation("পাসওয়ার্ড পরিবর্তন করতে সমস্যা হয়েছে।", "Failed to reset password."));
      }
    } catch (err: any) {
      setError(err?.message || getTranslation("পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।", "Failed to update password. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  // Helper to verify if user is a real admin in Firestore
  const checkIsAdmin = async (uid: string): Promise<boolean> => {
    try {
      if (!uid) return false;
      const currentUid = auth.currentUser?.uid;
      const authEmail = auth.currentUser?.email;

      if (!currentUid || currentUid !== uid) {
        return false;
      }

      const adminDocRef = doc(db, "admins", uid);
      const adminDocSnap = await getDoc(adminDocRef);
      if (!adminDocSnap.exists()) {
        return false;
      }

      const adminData = adminDocSnap.data();
      if (!adminData) {
        return false;
      }

      const uidValue = adminData.uid;
      const emailValue = adminData.email;
      const createdAtValue = adminData.createdAt;

      if (typeof uidValue !== "string" || uidValue !== uid) {
        return false;
      }
      if (typeof emailValue !== "string" || !createdAtValue) {
        return false;
      }

      if (!authEmail || emailValue.toLowerCase() !== authEmail.toLowerCase()) {
        return false;
      }

      if (adminData.isActive !== undefined && adminData.isActive !== true) {
        return false;
      }

      return true;
    } catch (err: any) {
      if (!err?.message?.includes("offline")) {
        console.warn("Notice verifying admin permissions:", err?.message || err);
      }
    }
    return false;
  };

  // Helper to verify seller role and status in Firestore
  const checkSellerStatus = async (uid: string): Promise<{ isSeller: boolean; status: string }> => {
    try {
      const sellerDocSnap = await getDoc(doc(db, "sellers", uid));
      if (sellerDocSnap.exists()) {
        const data = sellerDocSnap.data();
        return { isSeller: true, status: data?.status || "pending" };
      }
      const userDocSnap = await getDoc(doc(db, "users", uid));
      if (userDocSnap.exists()) {
        const uData = userDocSnap.data();
        if (uData?.role === "seller") {
          return { isSeller: true, status: uData?.sellerStatus || uData?.status || "pending" };
        }
      }
    } catch (err: any) {
      if (!err?.message?.includes("offline")) {
        console.warn("Notice checking seller status:", err?.message || err);
      }
    }
    return { isSeller: false, status: "none" };
  };

  // Helper to verify rider role and status in Firestore
  const checkRiderStatus = async (uid: string): Promise<{ isRider: boolean; status: string }> => {
    try {
      const riderDocSnap = await getDoc(doc(db, "riders", uid));
      if (riderDocSnap.exists()) {
        const data = riderDocSnap.data();
        return { isRider: true, status: data?.status || "pending" };
      }
      const userDocSnap = await getDoc(doc(db, "users", uid));
      if (userDocSnap.exists()) {
        const uData = userDocSnap.data();
        if (uData?.role === "rider") {
          return { isRider: true, status: uData?.riderStatus || uData?.status || "pending" };
        }
      }
    } catch (err: any) {
      if (!err?.message?.includes("offline")) {
        console.warn("Notice checking rider status:", err?.message || err);
      }
    }
    return { isRider: false, status: "none" };
  };

  // Helper to register the referral connection if a valid code was provided
  const linkReferral = async (newUserId: string, referralCodeUsed: string) => {
    if (!referralCodeUsed || referralCodeUsed.trim() === "") return;
    try {
      const code = referralCodeUsed.trim().toUpperCase();
      // Search for user who owns this referral code
      const q = query(collection(db, "users"), where("referralCode", "==", code));
      const qSnap = await getDocs(q);
      if (!qSnap.empty) {
        const referrerDoc = qSnap.docs[0];
        const referrerId = referrerDoc.id;
        if (referrerId !== newUserId) {
          // 1. Create a referral tracking record
          const refId = `ref_${referrerId}_${newUserId}`;
          await setDoc(doc(db, "referrals", refId), {
            id: refId,
            referrerId: referrerId,
            referredId: newUserId,
            status: "pending",
            bonusPaid: false,
            createdAt: serverTimestamp()
          });

          // 2. Update the referredBy field in the newly created user's document
          await setDoc(doc(db, "users", newUserId), {
            referredBy: referrerId
          }, { merge: true });

          console.log(`Successfully linked referral code ${code}. Referrer ID: ${referrerId}`);
          
          // Clear used code from localStorage
          localStorage.removeItem("referredBy");
        }
      } else {
        console.warn(`Referral code ${code} not found in database.`);
      }
    } catch (err) {
      console.error("Error linking referral:", err);
    }
  };

  const handleSendOTP = async () => {
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
      if (formattedPhone.startsWith("880")) {
        formattedPhone = "+" + formattedPhone;
      } else {
        formattedPhone = "+880" + formattedPhone;
      }
    }

    try {
      // 1. Reset any previous verifier instance to clear stale tokens or rendering state
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (e) {
          console.warn("Notice clearing previous reCAPTCHA instance:", e);
        }
        window.recaptchaVerifier = undefined;
      }

      // 2. Ensure target button element exists in DOM for binding
      let targetButton = document.getElementById("phone-sign-in-button");
      if (!targetButton) {
        const fallbackContainer = document.createElement("div");
        fallbackContainer.id = "phone-sign-in-button";
        fallbackContainer.style.display = "none";
        document.body.appendChild(fallbackContainer);
      }

      // 3. Configure invisible RecaptchaVerifier bound directly to phone-sign-in-button
      // Do NOT render a visible checkbox container (size: 'invisible' renders silently in background)
      const appVerifier = new RecaptchaVerifier(auth, "phone-sign-in-button", {
        size: "invisible",
        callback: () => {
          // reCAPTCHA verification passed silently in the background
        },
        "expired-callback": () => {
          // Reset verifier instance if token expires
          if (window.recaptchaVerifier) {
            try {
              window.recaptchaVerifier.clear();
            } catch (e) {}
            window.recaptchaVerifier = undefined;
          }
          setError(
            getTranslation(
              "ক্যাপচা মেয়াদ উত্তীর্ণ হয়েছে। অনুগ্রহ করে আবার ওটিপি পাঠান।",
              "reCAPTCHA token expired. Please click Send OTP again."
            )
          );
        }
      });

      // Save active verifier to window
      window.recaptchaVerifier = appVerifier;

      // 4. Trigger signInWithPhoneNumber silently in background with invisible verifier
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(confirmation);
      setOtpSent(true);
      setError("");
      setOtpNotice(
        getTranslation(
          "আপনার মোবাইলে এসএমএস-এর মাধ্যমে ওটিপি কোড পাঠানো হয়েছে। অনুগ্রহ করে কোডটি লিখুন।",
          "An SMS verification OTP has been sent to your phone. Please enter it below."
        )
      );
    } catch (err: any) {
      console.error("Firebase Phone Auth error:", err);
      // If reCAPTCHA token expires or throws an error, reset the verifier instance
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (e) {}
        window.recaptchaVerifier = undefined;
      }
      setConfirmationResult(null);
      setOtpSent(false);
      setOtpNotice("");

      let userFriendlyMessage = getTranslation(
        "এসএমএস ওটিপি পাঠাতে ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন অথবা ইমেইল দিয়ে লগইন করুন।",
        "Failed to send SMS OTP. Please retry sending SMS or sign in using Email."
      );

      if (err?.code === "auth/unauthorized-domain" || err?.message?.includes("unauthorized-domain")) {
        const domain = typeof window !== "undefined" ? window.location.hostname : "localhost";
        userFriendlyMessage = getTranslation(
          `ডোমেইনটি অনুমোদিত নয় (${domain})। অনুগ্রহ করে Firebase Console → Authentication → Settings → Authorized domains-এ ডোমেইনটি যোগ করুন।`,
          `Domain is not authorized (${domain}). Please add this domain to Firebase Console → Authentication → Settings → Authorized domains.`
        );
      } else if (err?.code === "auth/quota-exceeded" || err?.message?.includes("quota")) {
        userFriendlyMessage = getTranslation(
          "এসএমএস কোটার দৈনিক লিমিট শেষ হয়েছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন অথবা ইমেইল দিয়ে লগইন করুন।",
          "SMS quota exceeded for today. Please retry later or sign in with Email."
        );
      } else if (err?.code === "auth/invalid-phone-number") {
        userFriendlyMessage = getTranslation(
          "মোবাইল নম্বরটি সঠিক নয়। অনুগ্রহ করে সঠিক ১১ ডিজিটের নম্বর দিন (যেমন: 017XXXXXXXX)।",
          "Invalid phone number format. Please provide a valid 11-digit mobile number."
        );
      } else if (err?.code === "auth/too-many-requests") {
        userFriendlyMessage = getTranslation(
          "অতিরিক্ত অনুরোধের কারণে সাময়িক বিরতি প্রয়োজন। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।",
          "Too many requests from this device. Please wait a moment and try again."
        );
      } else if (err?.code === "auth/captcha-check-failed") {
        userFriendlyMessage = getTranslation(
          "reCAPTCHA ভেরিফিকেশন সম্পন্ন হতে পারেনি। অনুগ্রহ করে আবার চেষ্টা করুন।",
          "reCAPTCHA verification failed. Please try again."
        );
      } else if (err?.code === "auth/network-request-failed") {
        userFriendlyMessage = getTranslation(
          "নেটওয়ার্ক সংযোগ ত্রুটি। অনুগ্রহ করে আপনার ইন্টারনেট সংযোগ পরীক্ষা করুন।",
          "Network error. Please check your internet connection and try again."
        );
      } else if (err?.message) {
        userFriendlyMessage = `${getTranslation("এসএমএস পাঠাতে ব্যর্থ:", "Failed to send SMS:")} ${err.message}`;
      }

      setError(userFriendlyMessage);
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOTP = async () => {
    setError("");
    setLoading(true);

    if (!otpCode) {
      setError(getTranslation("অনুগ্রহ করে ওটিপি কোডটি লিখুন।", "Please enter the OTP code."));
      setLoading(false);
      return;
    }

    if (!confirmationResult) {
      setError(getTranslation("অনুগ্রহ করে প্রথমে মোবাইলে ওটিপি কোড পাঠান।", "Please request an SMS verification code first."));
      setLoading(false);
      return;
    }

    try {
      const result = await confirmationResult.confirm(otpCode.trim());
      const user = result.user;
      const uid = user.uid;
      const emailAddress = user.email || `${phone.trim()}@kachabazar.com`;
      const displayName = user.displayName || fullName || getTranslation("ভেরিফাইড মোবাইল ব্যবহারকারী", "Verified Mobile User");

      // Verify admin role if tab is admin
      if (role === "admin") {
        const isAdminUser = await checkIsAdmin(uid);
        if (!isAdminUser) {
          await signOut(auth);
          throw new Error(getTranslation("প্রবেশাধিকার সংরক্ষিত। আপনি এডমিন হিসেবে অনুমোদিত নন।", "Access denied. You are not authorized as an admin."));
        }
      }

      const userDocRef = doc(db, "users", uid);
      const userDocSnap = await getDoc(userDocRef);

      let userRole = role;
      let userData: any = null;

      if (userDocSnap.exists()) {
        userData = userDocSnap.data();
        userRole = userData.role || "customer";
      } else {
        const refCode = "REF" + (uid.length >= 5 ? uid.substring(0, 5).toUpperCase() : Math.random().toString(36).substring(2, 7).toUpperCase());
        userData = {
          uid: uid,
          email: emailAddress,
          displayName: displayName,
          role: role,
          phoneNumber: phone,
          createdAt: serverTimestamp(),
          address: getTranslation("চাঁচকৈড় বাজার, গুরুদাশপুর, নাটোর", "Chanchkoir Bazar, Gurudaspur, Natore"),
          referralCode: refCode,
          balance: 0,
          walletBalance: 0,
          rewardPoints: 0,
          points: 0,
          // Conform to firestore.rules: status must be 'pending' or omitted
          ...(role === "seller" || role === "rider" ? { status: "pending" } : {}),
          ...(role === "seller" ? { sellerStatus: "pending" } : {}),
          ...(role === "rider" ? { riderStatus: "pending" } : {})
        };
        await setDoc(userDocRef, userData);

        if (role === "seller") {
          await setDoc(doc(db, "sellers", uid), {
            uid,
            email: emailAddress,
            shopName: shopName || getTranslation("আমার কাস্টম শপ", "My Custom Shop"),
            ownerName: displayName,
            phoneNumber: phone,
            status: "pending",
            createdAt: serverTimestamp(),
            balance: 1000
          });
        } else if (role === "rider") {
          await setDoc(doc(db, "riders", uid), {
            uid,
            email: emailAddress,
            name: displayName,
            phoneNumber: phone,
            vehicleType: vehicleType || "Bicycle",
            status: "pending",
            createdAt: serverTimestamp(),
            balance: 0,
            currentOrderId: ""
          });
        }

        try {
          await setDoc(doc(db, "wallet", uid), {
            userId: uid,
            balance: 0,
            updatedAt: serverTimestamp()
          });
        } catch (wErr) {
          console.warn("Wallet creation notice:", wErr);
        }

        // Link referral if applicable
        if (referralInput) {
          await linkReferral(uid, referralInput);
        }
      }

      onAuthSuccess(userData, userRole);
    } catch (err: any) {
      console.warn("Notice during OTP verification:", err?.message || err);
      setError(err.message || getTranslation("ভুল ওটিপি কোড! অনুগ্রহ করে আবার চেষ্টা করুন।", "Invalid OTP code! Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (isLogin && authMethod === "phone") {
      await handleVerifyOTP();
      return;
    }

    setLoading(true);

    if (!email || !password || (!isLogin && !fullName)) {
      setError(getTranslation("অনুগ্রহ করে সব তথ্য পূরণ করুন।", "Please fill in all fields."));
      setLoading(false);
      return;
    }

    // Direct registration for admin role is blocked
    if (!isLogin && role === "admin") {
      setError(getTranslation(
        "এডমিন অ্যাকাউন্ট সরাসরি তৈরি করা যাবে না।",
        "Admin account registration is not permitted."
      ));
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        // Direct Partner Shop login with Partner ID / Email & Password
        if (role === "partner" || email.trim().toUpperCase().startsWith("KB-SHOP-")) {
          const partnerRes = await loginPartnerWithCredentials(email, password);
          if (partnerRes.success && partnerRes.partner) {
            onAuthSuccess(partnerRes.partner, "partner");
            setLoading(false);
            return;
          } else {
            throw new Error(partnerRes.error || getTranslation("পার্টনার শপ লগইন ব্যর্থ হয়েছে। আইডি বা পাসওয়ার্ড সঠিক নয়।", "Partner shop login failed. Incorrect ID or password."));
          }
        }

        // First check if user is logging into Admin/Staff portal via Staff API
        if (role === "admin") {
          try {
            const staffData = await apiClient.post("/api/staff/login", {
              identifier: email,
              password: password
            });

            if (staffData?.success && staffData?.staff) {
              const staffUser = staffData.staff;
              if (staffData.sessionId) {
                try {
                  localStorage.setItem("kb_staff_session", staffData.sessionId);
                  sessionStorage.setItem("kb_staff_session", staffData.sessionId);
                  if (staffUser.email) localStorage.setItem("kb_staff_email", staffUser.email);
                  if (staffUser.staffId) localStorage.setItem("kb_staff_id", staffUser.staffId);
                } catch (e) {}
              }
              const formattedUser = {
                uid: staffUser.id || staffUser.staffId,
                id: staffUser.id,
                staffId: staffUser.staffId,
                email: staffUser.email,
                displayName: staffUser.fullName,
                fullName: staffUser.fullName,
                mobile: staffUser.mobile,
                role: staffUser.role,
                isSuperAdmin: staffUser.isSuperAdmin,
                permissions: staffUser.permissions,
                assignedAgentDesk: staffUser.assignedAgentDesk,
                sessionId: staffData.sessionId,
                photoURL: staffUser.photoURL
              };
              onAuthSuccess(formattedUser, staffUser.role);
              setLoading(false);
              return;
            }
          } catch (staffErr: any) {
            console.warn("Staff API check bypass, falling back to Firebase:", staffErr?.message || staffErr);
          }
        }

        // Sign in using real Firebase Authentication
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Verify role authorization
        if (role === "admin") {
          const isAdminUser = await checkIsAdmin(user.uid);
          if (!isAdminUser) {
            await signOut(auth);
            throw new Error(getTranslation("প্রবেশাধিকার সংরক্ষিত। আপনি এডমিন হিসেবে অনুমোদিত নন।", "Access denied. You are not authorized as an admin."));
          }
        } else if (role === "seller") {
          const sRes = await checkSellerStatus(user.uid);
          if (!sRes.isSeller) {
            await signOut(auth);
            throw new Error(getTranslation("প্রবেশাধিকার সংরক্ষিত। এই অ্যাকাউন্টটি বিক্রেতা হিসেবে নিবন্ধিত নয়।", "Access denied. This account is not registered as a seller."));
          }
          if (sRes.status === "rejected") {
            await signOut(auth);
            throw new Error(getTranslation("আপনার বিক্রেতা অ্যাকাউন্টটি এডমিন কর্তৃক বাতিল করা হয়েছে।", "Your seller account application was rejected by admin."));
          }
        } else if (role === "rider") {
          const rRes = await checkRiderStatus(user.uid);
          if (!rRes.isRider) {
            await signOut(auth);
            throw new Error(getTranslation("প্রবেশাধিকার সংরক্ষিত। এই অ্যাকাউন্টটি রাইডার হিসেবে নিবন্ধিত নয়।", "Access denied. This account is not registered as a rider."));
          }
          if (rRes.status === "rejected") {
            await signOut(auth);
            throw new Error(getTranslation("আপনার রাইডার অ্যাকাউন্টটি এডমিন কর্তৃক বাতিল করা হয়েছে।", "Your rider account application was rejected by admin."));
          }
        }

        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        let userRole = role;
        let userData = null;

        if (userDocSnap.exists()) {
          userData = userDocSnap.data();
          userRole = userData.role || role;
        } else {
          const resolvedName = user.displayName || "গ্রাহক";
          userData = {
            uid: user.uid,
            email: user.email,
            displayName: resolvedName,
            fullName: resolvedName,
            name: resolvedName,
            role: userRole,
            createdAt: serverTimestamp(),
            address: getTranslation("চাঁচকৈড় বাজার, নাটোর", "Chanchkoir Bazar, Natore"),
            referralCode: "REF" + user.uid.substring(0, 5).toUpperCase()
          };
          await setDoc(userDocRef, userData);
        }

        onAuthSuccess(userData, userRole);
      } else {
        // Sign up
        const trimmedFullName = (fullName || "").trim();
        if (!trimmedFullName) {
          setError(getTranslation("অনুগ্রহ করে আপনার সম্পূর্ণ নাম লিখুন।", "Please enter your full name."));
          setLoading(false);
          return;
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const user = userCredential.user;

        // 1. Immediately after createUserWithEmailAndPassword succeeds:
        // Call Firebase Auth's updateProfile(res.user, { displayName: fullName.trim() })
        try {
          await updateProfile(user, { displayName: trimmedFullName });
        } catch (profileErr) {
          console.warn("Could not set auth displayName:", profileErr);
        }

        const refCode = "REF" + user.uid.substring(0, 5).toUpperCase();
        const customerId = generateMemberId(user.uid);
        const sanitizedHandle = trimmedFullName
          .toLowerCase()
          .replace(/\s+/g, "_")
          .replace(/[^\w\u0980-\u09FF]/gi, "") || customerId.toLowerCase();

        // 2. Save user profile to Firestore users/{uid} document with exact required fields:
        const userData: any = {
          uid: user.uid,
          displayName: trimmedFullName,
          fullName: trimmedFullName,
          name: trimmedFullName,
          phone: phone.trim(),
          phoneNumber: phone.trim(),
          email: email.trim(),
          walletBalance: 0,
          rewardPoints: 0,
          balance: 0,
          points: 0,
          role: role || "customer",
          createdAt: serverTimestamp(),
          username: sanitizedHandle,
          customerId: customerId,
          address: getTranslation("চাঁচকৈড় বাজার, গুরুদাশপুর, নাটোর", "Chanchkoir Bazar, Gurudaspur, Natore"),
          referralCode: refCode,
          status: (role === "seller" || role === "rider") ? "pending" : "approved",
          ...(role === "seller" ? { sellerStatus: "pending" } : {}),
          ...(role === "rider" ? { riderStatus: "pending" } : {})
        };

        // Save into main users collection
        await setDoc(doc(db, "users", user.uid), userData);

        // Non-admin roles additional collections setup
        if (role === "seller") {
          await setDoc(doc(db, "sellers", user.uid), {
            uid: user.uid,
            email: user.email,
            shopName: shopName || getTranslation("আমার কাচা বাজার", "My Kacha Bazar"),
            ownerName: fullName,
            phoneNumber: phone,
            status: "pending",
            createdAt: serverTimestamp(),
            balance: 1000
          });
        } else if (role === "rider") {
          await setDoc(doc(db, "riders", user.uid), {
            uid: user.uid,
            email: user.email,
            name: fullName,
            phoneNumber: phone,
            vehicleType: vehicleType,
            status: "pending",
            createdAt: serverTimestamp(),
            balance: 0,
            currentOrderId: ""
          });
        }

        // Initialize wallet with 0 balance
        await setDoc(doc(db, "wallet", user.uid), {
          userId: user.uid,
          balance: 0,
          updatedAt: serverTimestamp()
        });

        await linkReferral(user.uid, referralInput);

        onAuthSuccess(userData, role);
      }
    } catch (err: any) {
      if (!err?.message?.includes("offline")) {
        console.warn("Auth error notice:", err?.message || err);
      }
      let errMsg = err.message || "";
      if (err.code === "auth/unauthorized-domain" || err.message?.includes("unauthorized-domain")) {
        const domain = typeof window !== "undefined" ? window.location.hostname : "kachabazar-fawn.vercel.app";
        errMsg = getTranslation(
          `ডোমেইনটি অনুমোদিত নয় (${domain})। অনুগ্রহ করে Firebase Console → Authentication → Settings → Authorized domains-এ ডোমেইনটি যোগ করুন।`,
          `Domain is not authorized (${domain}). Please add this domain to Firebase Console → Authentication → Settings → Authorized domains.`
        );
      } else if (err.code === "auth/email-already-in-use") {
        errMsg = getTranslation("এই ইমেইলটি ইতিমধ্যে ব্যবহৃত হয়েছে।", "This email is already in use.");
      } else if (err.code === "auth/weak-password") {
        errMsg = getTranslation("পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।", "Password must be at least 6 characters.");
      } else if (err.code === "auth/invalid-credential") {
        errMsg = getTranslation("ভুল ইমেইল বা পাসওয়ার্ড।", "Invalid email or password.");
      } else if (err.code === "auth/user-not-found") {
        errMsg = getTranslation("এই ইমেইলে কোনো অ্যাকাউন্ট পাওয়া যায়নি।", "No account found with this email.");
      } else if (err.message?.includes("offline")) {
        errMsg = getTranslation("ইন্টারনেট সংযোগ পাওয়া যায়নি। আপনার নেটওয়ার্ক পরীক্ষা করুন।", "Network offline. Please check your connection.");
      }
      
      setError(errMsg);
      setLoading(false);
    }
  };

  // Google Login Helper
  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      if (role === "admin") {
        const isAdminUser = await checkIsAdmin(user.uid);
        if (!isAdminUser) {
          await signOut(auth);
          throw new Error(getTranslation("প্রবেশাধিকার সংরক্ষিত। আপনি এডমিন হিসেবে অনুমোদিত নন।", "Access denied. You are not authorized as an admin."));
        }
      } else if (role === "seller") {
        const sRes = await checkSellerStatus(user.uid);
        if (!sRes.isSeller) {
          await signOut(auth);
          throw new Error(getTranslation("প্রবেশাধিকার সংরক্ষিত। এই অ্যাকাউন্টটি বিক্রেতা হিসেবে নিবন্ধিত নয়।", "Access denied. This account is not registered as a seller."));
        }
        if (sRes.status === "rejected") {
          await signOut(auth);
          throw new Error(getTranslation("আপনার বিক্রেতা অ্যাকাউন্টটি এডমিন কর্তৃক বাতিল করা হয়েছে।", "Your seller account application was rejected by admin."));
        }
      } else if (role === "rider") {
        const rRes = await checkRiderStatus(user.uid);
        if (!rRes.isRider) {
          await signOut(auth);
          throw new Error(getTranslation("প্রবেশাধিকার সংরক্ষিত। এই অ্যাকাউন্টটি রাইডার হিসেবে নিবন্ধিত নয়।", "Access denied. This account is not registered as a rider."));
        }
        if (rRes.status === "rejected") {
          await signOut(auth);
          throw new Error(getTranslation("আপনার রাইডার অ্যাকাউন্টটি এডমিন কর্তৃক বাতিল করা হয়েছে।", "Your rider account application was rejected by admin."));
        }
      }

      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);
      
      let userRole = role;
      let userData = null;

      if (userDocSnap.exists()) {
        userData = userDocSnap.data();
        userRole = userData.role || role;
      } else {
        const refCode = "REF" + user.uid.substring(0, 5).toUpperCase();
        const customerId = generateMemberId(user.uid);
        userData = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || "গ্রাহক",
          fullName: user.displayName || "গ্রাহক",
          name: user.displayName || "গ্রাহক",
          customerId: customerId,
          role: userRole,
          createdAt: serverTimestamp(),
          address: getTranslation("চাঁচকৈড় বাজার, গুরুদাশপুর, নাটোর", "Chanchkoir Bazar, Gurudaspur, Natore"),
          referralCode: refCode,
          balance: 0,
          walletBalance: 0,
          rewardPoints: 0,
          points: 0
        };
        await setDoc(userDocRef, userData);
        
        // Strictly initialize wallet with 0 balance for all new registrations
        await setDoc(doc(db, "wallet", user.uid), {
          userId: user.uid,
          balance: 0,
          updatedAt: serverTimestamp()
        });

        await linkReferral(user.uid, referralInput);
      }

      onAuthSuccess(userData, userRole);
    } catch (err: any) {
      if (!err?.message?.includes("offline")) {
        console.warn("Google Sign-In notice:", err?.message || err);
      }
      let errorMsg = err.message || "Google Sign-In failed.";
      if (err?.code === "auth/unauthorized-domain" || err?.message?.includes("unauthorized-domain") || err?.message?.includes("auth/unauthorized-domain")) {
        const domain = typeof window !== "undefined" ? window.location.hostname : "kachabazar-fawn.vercel.app";
        errorMsg = getTranslation(
          `Firebase Authentication ডোমেইন অনুমোদন প্রয়োজন: "${domain}" ডোমেইনটি অনুমোদিত নয়। অনুগ্রহ করে Firebase Console (Authentication → Settings → Authorized domains)-এ "${domain}" ডোমেইনটি যুক্ত করুন।`,
          `Firebase: Unauthorized domain (${domain}). Please add "${domain}" to Firebase Console → Authentication → Settings → Authorized domains.`
        );
      } else if (err?.code === "auth/popup-closed-by-user") {
        errorMsg = getTranslation("লগইন উইন্ডো বন্ধ করা হয়েছে।", "Login window was closed by user.");
      } else if (err?.code === "auth/popup-blocked") {
        errorMsg = getTranslation("পপআপ উইন্ডো ব্রাউজার দ্বারা ব্লক করা হয়েছে। অনুগ্রহ করে পপআপ অনুমোদন করুন।", "Popup blocked by browser. Please allow popups for this site.");
      } else if (err?.message?.includes("offline")) {
        errorMsg = getTranslation("ইন্টারনেট সংযোগ পাওয়া যায়নি।", "Network offline. Please check your connection.");
      }
      setError(errorMsg);
      setLoading(false);
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
            alt="কাঁচা বাজার" 
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
    <div className="w-full max-w-md mx-auto bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-100 relative overflow-hidden animate-fade-in">
      
      {/* Decorative gradient headers */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600"></div>

      <div className="text-center mb-6">
        <img 
          src={APP_LOGO_URL} 
          alt="কাঁচা বাজার" 
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
            ? getTranslation("কাচা বাজার পার্টনার শপ মার্চেন্ট ড্যাশবোর্ড", "Access Your Kacha Bazar Partner Store Hub")
            : role === "seller" 
            ? getTranslation("কাচা বাজার মার্চেন্ট প্যানেলে প্রবেশ করুন", "Access Kacha Bazar Seller Hub")
            : role === "rider" 
            ? getTranslation("কাচা বাজার ডেলিভারি নেটওয়ার্কে প্রবেশ করুন", "Access Kacha Bazar Rider Network")
            : getTranslation("কাচা বাজার অনলাইন পোর্টালে প্রবেশ করুন", "Access Kacha Bazar Customer Portal")}
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-100 text-red-700 text-xs rounded-xl p-3 flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
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
                    ? getTranslation("যেমন: cfikb001, CFI-KB-002 বা ইমেইল", "e.g. cfikb001, CFI-KB-002 or email")
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

            {!isLogin && (
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
            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
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

    </div>
  );
}
