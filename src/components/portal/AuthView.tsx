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
  signOut
} from "../../lib/firebase";
import { User, Mail, Lock, AlertCircle, Key, LogIn, UserPlus, Gift } from "lucide-react";

interface AuthViewProps {
  onAuthSuccess: (user: any, role: string) => void;
  lang: "bn" | "en";
  forcedRole?: "customer" | "admin" | "seller" | "rider";
}

export default function AuthView({ onAuthSuccess, lang, forcedRole }: AuthViewProps) {
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [authMethod, setAuthMethod] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [fullName, setFullName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [shopName, setShopName] = useState<string>(""); // for seller
  const [vehicleType, setVehicleType] = useState<string>("Bicycle"); // for rider
  const [role, setRole] = useState<"customer" | "admin" | "seller" | "rider">(forcedRole || "customer");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [referralInput, setReferralInput] = useState<string>(() => {
    return localStorage.getItem("referredBy") || "";
  });

  // Phone auth states
  const [otpCode, setOtpCode] = useState<string>("");
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [otpSending, setOtpSending] = useState<boolean>(false);
  const [confirmationResult, setConfirmationResult] = useState<any | null>(null);

  const getTranslation = (bn: string, en: string) => (lang === "bn" ? bn : en);

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
    } catch (err) {
      console.error("Error verifying admin permissions:", err);
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
    } catch (err) {
      console.error("Error checking seller status:", err);
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
    } catch (err) {
      console.error("Error checking rider status:", err);
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
    if (!phone) {
      setError(getTranslation("অনুগ্রহ করে মোবাইল নম্বর প্রদান করুন।", "Please provide a mobile number."));
      return;
    }
    setOtpSending(true);
    
    let formattedPhone = phone.trim();
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "+88" + formattedPhone;
    } else if (!formattedPhone.startsWith("+")) {
      formattedPhone = "+880" + formattedPhone;
    }

    try {
      const container = document.getElementById("recaptcha-container");
      if (!container) {
        const div = document.createElement("div");
        div.id = "recaptcha-container";
        document.body.appendChild(div);
      }

      const appVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
        callback: () => {},
        "expired-callback": () => {
          setError(getTranslation("ক্যাপচা মেয়াদ উত্তীর্ণ হয়েছে। আবার চেষ্টা করুন।", "reCAPTCHA expired. Please try again."));
        }
      });

      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(confirmation);
      setOtpSent(true);
      setError("");
    } catch (err: any) {
      console.error("Real Phone SMS failed:", err);
      setError(getTranslation(
        "মোবাইল ভেরিফিকেশন কোড পাঠানো ব্যর্থ হয়েছে। অনুগ্রহ করে ইমেইল ব্যবহার করুন।",
        "Failed to send mobile verification OTP. Please try with Email & Password."
      ));
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

    try {
      if (!confirmationResult) {
        throw new Error("No confirmation result available. Please request OTP again.");
      }

      const result = await confirmationResult.confirm(otpCode);
      const user = result.user;
      const uid = user.uid;
      const emailAddress = user.email || `${phone}@kachabazar.com`;
      const displayName = user.displayName || getTranslation("ভেরিফাইড মোবাইল ব্যবহারকারী", "Verified Mobile User");

      // Verify admin role if tab is admin
      if (role === "admin") {
        const isAdminUser = await checkIsAdmin(uid);
        if (!isAdminUser) {
          await signOut(auth);
          throw new Error("Access denied. You are not authorized as an admin.");
        }
      }

      const userDocRef = doc(db, "users", uid);
      const userDocSnap = await getDoc(userDocRef);

      let userRole = role;
      let userData = null;

      if (userDocSnap.exists()) {
        userData = userDocSnap.data();
        userRole = userData.role || "customer";
      } else {
        const refCode = "REF" + uid.substring(0, 5).toUpperCase();
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
          status: (role === "seller" || role === "rider") ? "pending" : "approved",
          ...(role === "seller" ? { sellerStatus: "pending" } : {}),
          ...(role === "rider" ? { riderStatus: "pending" } : {})
        };
        await setDoc(userDocRef, userData);

        if (role === "seller") {
          await setDoc(doc(db, "sellers", uid), {
            uid,
            email: emailAddress,
            shopName: getTranslation("আমার কাস্টম শপ", "My Custom Shop"),
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
            vehicleType: "Bicycle",
            status: "pending",
            createdAt: serverTimestamp(),
            balance: 0,
            currentOrderId: ""
          });
        }

        await setDoc(doc(db, "wallet", uid), {
          userId: uid,
          balance: 50,
          updatedAt: serverTimestamp()
        });
      }

      onAuthSuccess(userData, userRole);
    } catch (err: any) {
      console.error("OTP Verification Error:", err);
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
          userData = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || email.split("@")[0],
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
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        const refCode = "REF" + user.uid.substring(0, 5).toUpperCase();

        const userData: any = {
          uid: user.uid,
          email: user.email,
          displayName: fullName,
          role: role,
          phoneNumber: phone,
          createdAt: serverTimestamp(),
          address: getTranslation("চাঁচকৈড় বাজার, গুরুদাশপুর, নাটোর", "Chanchkoir Bazar, Gurudaspur, Natore"),
          referralCode: refCode,
          balance: 0,
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

        // Initialize wallet
        await setDoc(doc(db, "wallet", user.uid), {
          userId: user.uid,
          balance: 50,
          updatedAt: serverTimestamp()
        });

        // Add welcome transaction
        await setDoc(doc(db, "transactions", "welcome_" + user.uid), {
          id: "welcome_" + user.uid,
          userId: user.uid,
          type: "deposit",
          amount: 50,
          description: getTranslation("নতুন অ্যাকাউন্ট খোলার জন্য বোনাস!", "Welcome registration wallet bonus!"),
          createdAt: serverTimestamp()
        });

        await linkReferral(user.uid, referralInput);

        onAuthSuccess(userData, role);
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      let errMsg = err.message;
      if (err.code === "auth/email-already-in-use") {
        errMsg = getTranslation("এই ইমেইলটি ইতিমধ্যে ব্যবহৃত হয়েছে।", "This email is already in use.");
      } else if (err.code === "auth/weak-password") {
        errMsg = getTranslation("পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।", "Password must be at least 6 characters.");
      } else if (err.code === "auth/invalid-credential") {
        errMsg = getTranslation("ভুল ইমেইল বা পাসওয়ার্ড।", "Invalid email or password.");
      } else if (err.code === "auth/user-not-found") {
        errMsg = getTranslation("এই ইমেইলে কোনো অ্যাকাউন্ট পাওয়া যায়নি।", "No account found with this email.");
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
        userData = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email?.split("@")[0] || "User",
          role: userRole,
          createdAt: serverTimestamp(),
          address: getTranslation("চাঁচকৈড় বাজার, গুরুদাশপুর, নাটোর", "Chanchkoir Bazar, Gurudaspur, Natore"),
          referralCode: refCode
        };
        await setDoc(userDocRef, userData);
        
        await setDoc(doc(db, "wallet", user.uid), {
          userId: user.uid,
          balance: 50,
          updatedAt: serverTimestamp()
        });

        await linkReferral(user.uid, referralInput);
      }

      onAuthSuccess(userData, userRole);
    } catch (err: any) {
      console.error("Google Sign-In error:", err);
      setError(err.message || "Google Sign-In failed.");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-100 relative overflow-hidden animate-fade-in">
      
      {/* Decorative gradient headers */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600"></div>

      <div className="text-center mb-6">
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3 border border-emerald-100">
          <Key className="w-6 h-6 animate-pulse" />
        </div>
        <h2 className="text-xl font-black text-slate-800 tracking-tight">
          {role === "admin" 
            ? getTranslation("এডমিন পোর্টাল লগইন", "Admin Portal Login")
            : role === "seller"
            ? (isLogin ? getTranslation("বিক্রেতা পোর্টাল লগইন", "Seller Portal Login") : getTranslation("নতুন বিক্রেতা নিবন্ধন", "Seller Account Registration"))
            : role === "rider"
            ? (isLogin ? getTranslation("রাইডার পোর্টাল লগইন", "Rider Portal Login") : getTranslation("নতুন রাইডার নিবন্ধন", "Rider Account Registration"))
            : (isLogin ? getTranslation("গ্রাহক অ্যাকাউন্ট লগইন", "Customer Account Sign In") : getTranslation("নতুন গ্রাহক অ্যাকাউন্ট তৈরি করুন", "Create Customer Account"))}
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          {role === "admin" 
            ? getTranslation("এডমিন সিস্টেমে নিরাপদ প্রবেশাধিকার", "Secure Admin System Access")
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

      {isLogin && (
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
                type="button"
                disabled={otpSending}
                onClick={handleSendOTP}
                className="w-full bg-slate-100 hover:bg-slate-200 text-emerald-800 border border-slate-200 py-2.5 rounded-2xl text-xs font-black transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {otpSending ? (
                  <span className="w-4 h-4 border-2 border-emerald-800 border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <span>{getTranslation("ভেরিফিকেশন কোড পাঠান", "Send Verification OTP")}</span>
                )}
              </button>
            ) : (
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  {getTranslation("ভেরিফিকেশন কোড (OTP)", "Verification Code (OTP)")}
                </label>
                <input
                  type="text"
                  required
                  placeholder="123456"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-mono text-center tracking-widest focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
                />
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
                      placeholder={getTranslation("যেমন: সিয়াম আহমেদ", "e.g., Siam Ahmed")}
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
                {getTranslation("ইমেইল ঠিকানা", "Email Address")}
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
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
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
                />
              </div>
            </div>

            {!isLogin && (
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  {getTranslation("রেফারেল কোড (ঐচ্ছিক)", "Referral Code (Optional)")}
                </label>
                <div className="relative">
                  <Gift className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="e.g., REF12345"
                    value={referralInput}
                    onChange={(e) => setReferralInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs uppercase focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
                  />
                </div>
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
              <span>{getTranslation("লগইন করুন", "Sign In")}</span>
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4" />
              <span>{getTranslation("অ্যাকাউন্ট তৈরি করুন", "Create Account")}</span>
            </>
          )}
        </button>
      </form>

      {/* Google Sign In Option */}
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
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        <span>{getTranslation("গুগল দিয়ে প্রবেশ করুন", "Sign In with Google")}</span>
      </button>

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
