/**
 * Supabase Authentication Engine for Kacha Bazar
 * Handles user & staff authentication via Supabase Auth (Email/Password, Google OAuth, Session Management)
 * backed by PostgreSQL 'users', 'staff', 'sellers', and 'riders' tables.
 */

import { supabase } from "./supabase";
import { apiClient } from "./apiClient";
import { generateMemberId } from "./memberIdUtils";

export interface SupabaseUserProfile {
  uid: string;
  id: string;
  email: string;
  displayName: string;
  fullName: string;
  phoneNumber?: string;
  phone?: string;
  photoURL?: string;
  role: "customer" | "admin" | "seller" | "rider" | "partner";
  address?: string;
  referralCode?: string;
  referredBy?: string;
  walletBalance?: number;
  rewardPoints?: number;
  membershipTier?: string;
  isVerified?: boolean;
  status?: string;
  createdAt?: string;
}

/**
 * Sign In with Email & Password via Supabase Auth
 */
export async function supabaseSignInWithEmail(
  email: string,
  pass: string,
  preferredRole: string = "customer"
): Promise<{ success: boolean; user?: SupabaseUserProfile; role?: string; error?: string }> {
  const cleanEmail = email.trim();
  const lowerEmail = cleanEmail.toLowerCase();
  const isSuperAdminEmail = 
    lowerEmail === "sarkarmdanik14@gmail.com" ||
    lowerEmail === "allahuakber094@gmail.com" ||
    lowerEmail === "grphics949@gmail.com" ||
    lowerEmail === "kachabazar369@gmail.com";

  const effectivePreferredRole = isSuperAdminEmail ? "admin" : preferredRole;

  // 1. Direct Partner Shop / Staff credential check (covers super_admin like sarkarmdanik14@gmail.com)
  try {
    const verifyData = await apiClient.post<any>("/api/auth/login-verify", {
      identifier: cleanEmail,
      password: pass
    }, { silent: true });

    if (verifyData?.success && verifyData?.user) {
      const u = verifyData.user;
      const targetRole = isSuperAdminEmail ? "admin" : (verifyData.role || effectivePreferredRole);
      if (verifyData.sessionId) {
        try {
          localStorage.setItem("kb_staff_session", verifyData.sessionId);
          sessionStorage.setItem("kb_staff_session", verifyData.sessionId);
          if (u.email) localStorage.setItem("kb_staff_email", u.email);
          if (u.staffId) localStorage.setItem("kb_staff_id", u.staffId);
        } catch {}
      }

      return {
        success: true,
        user: {
          uid: u.uid || u.id || u.staffId,
          id: u.id || u.staffId,
          email: u.email || cleanEmail,
          displayName: u.name || u.fullName || u.displayName || (isSuperAdminEmail ? "Sarkar Md Anik (Super Admin)" : "স্টাফ মেম্বার"),
          fullName: u.fullName || u.name || (isSuperAdminEmail ? "Sarkar Md Anik (Super Admin)" : "স্টাফ মেম্বার"),
          role: targetRole as any,
          photoURL: u.photoURL || u.photo_url || ""
        },
        role: targetRole
      };
    }
  } catch {}

  // 2. Authenticate with Supabase Auth
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: pass
    });

    if (error) {
      if (isSuperAdminEmail || error.message.toLowerCase().includes("invalid login credentials")) {
        // Try server staff verification directly via Supabase backend
        try {
          const verifyRes = await apiClient.post<any>("/api/auth/staff-verify", {
            email: cleanEmail,
            password: pass,
            preferredRole: effectivePreferredRole
          }, { silent: true });

          if (verifyRes?.success && verifyRes?.user) {
            return {
              success: true,
              user: verifyRes.user,
              role: verifyRes.user.role || effectivePreferredRole
            };
          }
        } catch (serverErr) {
          // Fall through to direct table check
        }

        // Check staff table in Supabase
        const { data: staffData } = await supabase
          .from("staff")
          .select("*")
          .or(`email.eq.${cleanEmail},username.eq.${cleanEmail},mobile.eq.${cleanEmail}`)
          .single();

        if (staffData && staffData.status === "active") {
          return {
            success: true,
            user: {
              uid: staffData.id || staffData.staff_id,
              id: staffData.id || staffData.staff_id,
              email: staffData.email,
              displayName: staffData.full_name,
              fullName: staffData.full_name,
              role: (staffData.role || "admin") as any,
              photoURL: staffData.photo_url || ""
            },
            role: staffData.role || "admin"
          };
        }
      }
      return { success: false, error: error.message };
    }

    if (!data.user) {
      return { success: false, error: "ইউজার ডেটা পাওয়া যায়নি।" };
    }

    const uid = data.user.id;
    // Store access token for API authorization
    if (data.session?.access_token) {
      localStorage.setItem("kb_supabase_token", data.session.access_token);
      sessionStorage.setItem("kb_supabase_token", data.session.access_token);
    }

    // 3. Fetch user profile from public.users table
    let profile = await fetchUserProfile(uid);

    if (!profile) {
      // Auto-create user profile in public.users if not exists
      const meta = data.user.user_metadata || {};
      const resolvedName = meta.full_name || meta.display_name || (isSuperAdminEmail ? "Sarkar Md Anik (Super Admin)" : cleanEmail.split("@")[0]) || "গ্রাহক";
      profile = {
        uid,
        id: uid,
        email: data.user.email || cleanEmail,
        displayName: resolvedName,
        fullName: resolvedName,
        phone: meta.phone || data.user.phone || "",
        phoneNumber: meta.phone || data.user.phone || "",
        role: (isSuperAdminEmail ? "admin" : (meta.role || effectivePreferredRole || "customer")) as any,
        referralCode: "REF" + uid.substring(0, 5).toUpperCase(),
        address: "চাঁচকৈড় বাজার, গুরুদাশপুর, নাটোর",
        walletBalance: 0,
        rewardPoints: 0,
        membershipTier: "Silver"
      };
      await saveUserProfile(profile);
    }

    if (isSuperAdminEmail && profile) {
      profile.role = "admin";
    }

    // Exchange staff session if admin or staff
    if (profile.role === "admin" || effectivePreferredRole === "admin" || isSuperAdminEmail) {
      try {
        const sessionRes = await apiClient.post<any>("/api/staff/supabase-session", {
          accessToken: data.session?.access_token,
          token: data.session?.access_token
        }, { silent: true });
        if (sessionRes?.sessionId) {
          localStorage.setItem("kb_staff_session", sessionRes.sessionId);
          sessionStorage.setItem("kb_staff_session", sessionRes.sessionId);
          if (sessionRes.staff?.staffId) localStorage.setItem("kb_staff_id", sessionRes.staff.staffId);
          if (sessionRes.staff?.email) localStorage.setItem("kb_staff_email", sessionRes.staff.email);
        }
      } catch (sessErr) {
        console.warn("Notice exchanging admin staff session:", sessErr);
      }
    }

    return {
      success: true,
      user: profile,
      role: isSuperAdminEmail ? "admin" : profile.role
    };
  } catch (err: any) {
    console.error("[Supabase Auth] Login error:", err);
    return { success: false, error: err.message || "লগইন করতে সমস্যা হয়েছে।" };
  }
}

/**
 * Sign Up with Email & Password via Supabase Auth
 */
export async function supabaseSignUpWithEmail(params: {
  email: string;
  pass: string;
  fullName: string;
  phone?: string;
  role?: "customer" | "admin" | "seller" | "rider" | "partner";
  shopName?: string;
  vehicleType?: string;
  referralCode?: string;
}): Promise<{ success: boolean; user?: SupabaseUserProfile; role?: string; error?: string }> {
  const cleanEmail = params.email.trim();
  const cleanName = params.fullName.trim();
  const userRole = params.role || "customer";

  try {
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: params.pass,
      options: {
        data: {
          full_name: cleanName,
          display_name: cleanName,
          phone: params.phone || "",
          role: userRole
        }
      }
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data.user) {
      return { success: false, error: "অ্যাকাউন্ট তৈরি সম্পন্ন হয়নি।" };
    }

    const uid = data.user.id;
    const refCode = "REF" + uid.substring(0, 5).toUpperCase();
    const customerId = generateMemberId(uid);

    const profile: SupabaseUserProfile = {
      uid,
      id: uid,
      email: cleanEmail,
      displayName: cleanName,
      fullName: cleanName,
      phone: params.phone || "",
      phoneNumber: params.phone || "",
      role: userRole,
      referralCode: refCode,
      referredBy: params.referralCode || "",
      address: "চাঁচকৈড় বাজার, গুরুদাশপুর, নাটোর",
      walletBalance: 0,
      rewardPoints: 0,
      membershipTier: "Silver",
      status: (userRole === "seller" || userRole === "rider") ? "pending" : "approved",
      createdAt: new Date().toISOString()
    };

    // Save profile into public.users
    await saveUserProfile(profile);

    // Save into riders or sellers if applicable
    if (userRole === "seller") {
      try {
        await supabase.from("sellers").insert({
          id: uid,
          user_id: uid,
          shop_name: params.shopName || "আমার কাচা বাজার",
          owner_name: cleanName,
          phone: params.phone || "",
          status: "pending"
        });
      } catch {}
    } else if (userRole === "rider") {
      try {
        await supabase.from("riders").insert({
          id: uid,
          user_id: uid,
          name: cleanName,
          phone: params.phone || "",
          vehicle_type: params.vehicleType || "bike",
          status: "pending"
        });
      } catch {}
    }

    // Initialize wallet with 0 balance in Supabase wallets table
    try {
      await supabase.from("wallets").upsert({
        id: uid,
        user_id: uid,
        balance: 0,
        currency: "BDT"
      });
    } catch {}

    // Save access token if session is returned
    if (data.session?.access_token) {
      localStorage.setItem("kb_supabase_token", data.session.access_token);
      sessionStorage.setItem("kb_supabase_token", data.session.access_token);
    }

    return {
      success: true,
      user: profile,
      role: userRole
    };
  } catch (err: any) {
    console.error("[Supabase Auth] SignUp error:", err);
    return { success: false, error: err.message || "রেজিস্ট্রেশন করতে সমস্যা হয়েছে।" };
  }
}

/**
 * Google OAuth Sign In via Supabase
 */
export async function supabaseSignInWithGoogle(): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin
      }
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Sign Out
 */
export async function supabaseSignOut(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch {}
  localStorage.removeItem("kb_supabase_token");
  sessionStorage.removeItem("kb_supabase_token");
  localStorage.removeItem("kb_staff_session");
  sessionStorage.removeItem("kb_staff_session");
}

/**
 * Send Password Reset Email
 */
export async function supabaseSendPasswordResetEmail(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}#reset-password`
    });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Listen to Auth State changes across the entire app
 */
export function onSupabaseAuthStateChange(
  callback: (user: SupabaseUserProfile | null) => void
): () => void {
  const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      const uid = session.user.id;
      if (session.access_token) {
        localStorage.setItem("kb_supabase_token", session.access_token);
        sessionStorage.setItem("kb_supabase_token", session.access_token);
      }

      let profile = await fetchUserProfile(uid);
      if (!profile) {
        const meta = session.user.user_metadata || {};
        const name = meta.full_name || meta.display_name || session.user.email?.split("@")[0] || "গ্রাহক";
        profile = {
          uid,
          id: uid,
          email: session.user.email || "",
          displayName: name,
          fullName: name,
          phone: meta.phone || session.user.phone || "",
          phoneNumber: meta.phone || session.user.phone || "",
          role: meta.role || "customer",
          photoURL: meta.avatar_url || meta.picture || ""
        };
      }
      callback(profile);
    } else {
      if (event === "SIGNED_OUT") {
        callback(null);
      } else if (event === "INITIAL_SESSION") {
        // Double check active session before prematurely dispatching null
        try {
          const { data: { session: activeSession } } = await supabase.auth.getSession();
          if (!activeSession) {
            callback(null);
          }
        } catch {
          callback(null);
        }
      } else {
        callback(null);
      }
    }
  });

  return () => {
    authListener.subscription.unsubscribe();
  };
}

/**
 * Helper to fetch user profile from public.users
 */
export async function fetchUserProfile(uid: string): Promise<SupabaseUserProfile | null> {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .or(`uid.eq.${uid},id.eq.${uid}`)
      .single();

    if (!error && data) {
      return {
        uid: data.uid || data.id,
        id: data.id || data.uid,
        email: data.email,
        displayName: data.display_name || data.full_name || "সম্মানিত গ্রাহক",
        fullName: data.full_name || data.display_name || "সম্মানিত গ্রাহক",
        phone: data.phone || data.mobile || "",
        phoneNumber: data.phone || data.mobile || "",
        photoURL: data.photo_url || "",
        role: data.role || "customer",
        address: data.address,
        referralCode: data.referral_code,
        referredBy: data.referred_by,
        walletBalance: Number(data.wallet_balance || 0),
        rewardPoints: Number(data.reward_points || 0),
        membershipTier: data.membership_tier || "Silver",
        isVerified: Boolean(data.is_verified)
      };
    }
  } catch {}
  return null;
}

/**
 * Helper to save user profile into public.users
 */
export async function saveUserProfile(profile: SupabaseUserProfile): Promise<void> {
  try {
    await supabase.from("users").upsert({
      id: profile.id || profile.uid,
      uid: profile.uid || profile.id,
      email: profile.email,
      full_name: profile.fullName,
      display_name: profile.displayName,
      phone: profile.phone || profile.phoneNumber || null,
      mobile: profile.phone || profile.phoneNumber || null,
      photo_url: profile.photoURL || null,
      role: profile.role || "customer",
      address: profile.address || null,
      referral_code: profile.referralCode || null,
      referred_by: profile.referredBy || null,
      wallet_balance: profile.walletBalance || 0,
      reward_points: profile.rewardPoints || 0,
      membership_tier: profile.membershipTier || "Silver",
      updated_at: new Date().toISOString()
    });
  } catch (err) {
    console.warn("Save user profile note:", err);
  }
}

/**
 * Get currently authenticated Supabase user profile
 */
export async function getSupabaseUser(): Promise<SupabaseUserProfile | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const uid = session.user.id;
      let profile = await fetchUserProfile(uid);
      if (!profile) {
        const meta = session.user.user_metadata || {};
        const name = meta.full_name || meta.display_name || session.user.email?.split("@")[0] || "গ্রাহক";
        profile = {
          uid,
          id: uid,
          email: session.user.email || "",
          displayName: name,
          fullName: name,
          phone: meta.phone || session.user.phone || "",
          phoneNumber: meta.phone || session.user.phone || "",
          role: meta.role || "customer",
          photoURL: meta.avatar_url || meta.picture || ""
        };
      }
      return profile;
    }
  } catch {}
  return null;
}

/**
 * Check if a user is an authorized admin in Supabase
 */
export async function checkIsSupabaseAdmin(uid: string, email?: string): Promise<boolean> {
  const cleanEmail = (email || "").toLowerCase().trim();
  if (
    cleanEmail === "allahuakber094@gmail.com" ||
    cleanEmail === "sarkarmdanik14@gmail.com" ||
    cleanEmail === "grphics949@gmail.com" ||
    cleanEmail === "kachabazar369@gmail.com"
  ) {
    return true;
  }
  try {
    // 1. Check staff table
    const { data: staffData } = await supabase
      .from("staff")
      .select("*")
      .or(`id.eq.${uid},staff_id.eq.${uid}${cleanEmail ? `,email.eq.${cleanEmail}` : ""}`)
      .single();
    if (staffData && staffData.status === "active" && (staffData.role === "admin" || staffData.role === "super_admin")) {
      return true;
    }

    // 2. Check users table
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .or(`id.eq.${uid},uid.eq.${uid}`)
      .single();
    if (userData && (userData.role === "admin" || userData.role === "super_admin")) {
      return true;
    }
  } catch {}
  return false;
}
