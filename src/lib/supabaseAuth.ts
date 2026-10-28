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
  role: "customer" | "admin" | "super_admin" | "seller" | "rider" | "partner";
  isSuperAdmin?: boolean;
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

export const SUPER_ADMIN_EMAILS = new Set([
  "sarkarmdanik14@gmail.com",
  "megabajar@admin.com"
]);

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
  const effectivePreferredRole = preferredRole;

  // 1. Direct Partner Shop / Staff credential check with secure server-side verification
  try {
    const verifyData = await apiClient.post<any>("/api/auth/login-verify", {
      identifier: cleanEmail,
      password: pass
    }, { silent: true });

    if (verifyData?.success && verifyData?.user) {
      const u = verifyData.user;
      const targetRole = verifyData.role || effectivePreferredRole;
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
          displayName: u.name || u.fullName || u.displayName || "স্টাফ মেম্বার",
          fullName: u.fullName || u.name || "স্টাফ মেম্বার",
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
      return { success: false, error: error.message || "ভুল ইমেইল বা পাসওয়ার্ড!" };
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

    const isSuperAdminEmail = SUPER_ADMIN_EMAILS.has(cleanEmail.toLowerCase());
    const isDbAdmin = isSuperAdminEmail || (await checkIsSupabaseAdmin(uid, cleanEmail));

    if (!profile) {
      // Auto-create user profile in public.users if not exists
      const meta = data.user.user_metadata || {};
      const resolvedName = meta.full_name || meta.display_name || cleanEmail.split("@")[0] || (isDbAdmin ? "এডমিনিস্ট্রেটর" : "গ্রাহক");
      profile = {
        uid,
        id: uid,
        email: data.user.email || cleanEmail,
        displayName: resolvedName,
        fullName: resolvedName,
        phone: meta.phone || data.user.phone || "",
        phoneNumber: meta.phone || data.user.phone || "",
        role: isSuperAdminEmail ? "super_admin" : (isDbAdmin ? "admin" : "customer"),
        isSuperAdmin: isSuperAdminEmail,
        referralCode: "REF" + uid.substring(0, 5).toUpperCase(),
        address: "চাঁচকৈড় বাজার, গুরুদাশপুর, নাটোর",
        walletBalance: 0,
        rewardPoints: 0,
        membershipTier: isDbAdmin ? "Platinum" : "Silver"
      };
      await saveUserProfile(profile);
    } else if (isDbAdmin) {
      profile.role = isSuperAdminEmail ? "super_admin" : (profile.role === "super_admin" ? "super_admin" : "admin");
      profile.isSuperAdmin = isSuperAdminEmail || profile.role === "super_admin";
    }

    // Exchange staff session ONLY if genuinely admin or staff in the database
    if (profile.role === "admin" || profile.role === "super_admin" || isDbAdmin) {
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
      role: profile.role
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
          shop_name: params.shopName || "আমার মেগা বাজার",
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
        const cleanEmail = (session.user.email || "").toLowerCase().trim();
        const isSuper = cleanEmail ? SUPER_ADMIN_EMAILS.has(cleanEmail) : false;
        const isSbAdmin = isSuper || (await checkIsSupabaseAdmin(uid, cleanEmail));
        const meta = session.user.user_metadata || {};
        const resolvedRole = isSuper ? "super_admin" : (isSbAdmin ? "admin" : (meta.role || "customer"));
        const name = meta.full_name || meta.display_name || cleanEmail.split("@")[0] || (isSbAdmin ? "এডমিনিস্ট্রেটর" : "গ্রাহক");
        profile = {
          uid,
          id: uid,
          email: session.user.email || "",
          displayName: name,
          fullName: name,
          phone: meta.phone || session.user.phone || "",
          phoneNumber: meta.phone || session.user.phone || "",
          role: resolvedRole,
          isSuperAdmin: isSuper,
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
 * Helper to fetch user profile from public.users with authoritative staff/admin resolution
 */
export async function fetchUserProfile(uid: string): Promise<SupabaseUserProfile | null> {
  try {
    const { data } = await supabase
      .from("users")
      .select("*")
      .or(`uid.eq.${uid},id.eq.${uid}`)
      .maybeSingle();

    let staffData: any = null;
    const userEmail = (data?.email || "").toLowerCase().trim();

    try {
      let staffQuery = supabase.from("staff").select("*");
      if (uid && userEmail) {
        staffQuery = staffQuery.or(`id.eq.${uid},staff_id.eq.${uid},email.ilike.${userEmail}`);
      } else if (uid) {
        staffQuery = staffQuery.or(`id.eq.${uid},staff_id.eq.${uid}`);
      } else if (userEmail) {
        staffQuery = staffQuery.eq("email", userEmail);
      }
      const { data: sRow } = await staffQuery.maybeSingle();
      if (sRow && (sRow.status === "active" || sRow.status === undefined)) {
        staffData = sRow;
      }
    } catch {}

    const resolvedEmail = (data?.email || staffData?.email || "").toLowerCase().trim();
    const isSuperAdminEmail = resolvedEmail ? SUPER_ADMIN_EMAILS.has(resolvedEmail) : false;
    const isStaffAdmin = staffData && (staffData.role === "admin" || staffData.role === "super_admin" || staffData.role === "founder");
    const isSuper = isSuperAdminEmail || staffData?.role === "super_admin" || staffData?.role === "founder";

    let role = "customer";
    if (isSuper) {
      role = "super_admin";
    } else if (isStaffAdmin || data?.role === "admin" || data?.role === "super_admin") {
      role = (data?.role === "super_admin" || staffData?.role === "super_admin") ? "super_admin" : "admin";
    } else if (data?.role) {
      role = data.role;
    } else if (staffData?.role) {
      role = staffData.role;
    }

    const defaultTitle = role === "super_admin" ? "সুপার এডমিন" : (role === "admin" ? "এডমিনিস্ট্রেটর" : "সম্মানিত গ্রাহক");

    if (data) {
      return {
        uid: data.uid || data.id || uid,
        id: data.id || data.uid || uid,
        email: data.email || resolvedEmail,
        displayName: data.display_name || data.full_name || staffData?.name || staffData?.fullName || defaultTitle,
        fullName: data.full_name || data.display_name || staffData?.fullName || staffData?.name || defaultTitle,
        phone: data.phone || data.mobile || staffData?.phone || "",
        phoneNumber: data.phone || data.mobile || staffData?.phone || "",
        photoURL: data.photo_url || staffData?.photoURL || staffData?.photo_url || "",
        role: role as any,
        isSuperAdmin: isSuper,
        address: data.address || staffData?.address,
        referralCode: data.referral_code,
        referredBy: data.referred_by,
        walletBalance: Number(data.wallet_balance || 0),
        rewardPoints: Number(data.reward_points || 0),
        membershipTier: (role === "admin" || role === "super_admin") ? "Platinum" : (data.membership_tier || "Silver"),
        isVerified: Boolean(data.is_verified || staffData)
      };
    }

    if (staffData) {
      return {
        uid: staffData.id || staffData.staff_id || uid,
        id: staffData.id || staffData.staff_id || uid,
        email: staffData.email || resolvedEmail,
        displayName: staffData.name || staffData.fullName || staffData.displayName || defaultTitle,
        fullName: staffData.fullName || staffData.name || staffData.displayName || defaultTitle,
        phone: staffData.phone || staffData.mobile || "",
        phoneNumber: staffData.phone || staffData.mobile || "",
        photoURL: staffData.photo_url || staffData.photoURL || "",
        role: role as any,
        isSuperAdmin: isSuper,
        address: staffData.address,
        membershipTier: "Platinum",
        isVerified: true
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
      const cleanEmail = (session.user.email || "").toLowerCase().trim();
      let profile = await fetchUserProfile(uid);
      if (!profile) {
        const meta = session.user.user_metadata || {};
        const isSuper = SUPER_ADMIN_EMAILS.has(cleanEmail);
        const isSbAdmin = isSuper || (await checkIsSupabaseAdmin(uid, cleanEmail));
        const resolvedRole = isSuper ? "super_admin" : (isSbAdmin ? "admin" : (meta.role || "customer"));
        const name = meta.full_name || meta.display_name || cleanEmail.split("@")[0] || (isSbAdmin ? "এডমিনিস্ট্রেটর" : "গ্রাহক");
        profile = {
          uid,
          id: uid,
          email: session.user.email || "",
          displayName: name,
          fullName: name,
          phone: meta.phone || session.user.phone || "",
          phoneNumber: meta.phone || session.user.phone || "",
          role: resolvedRole,
          isSuperAdmin: isSuper,
          photoURL: meta.avatar_url || meta.picture || ""
        };
      } else if (cleanEmail && SUPER_ADMIN_EMAILS.has(cleanEmail)) {
        profile.role = "super_admin";
        profile.isSuperAdmin = true;
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
  if (!uid && !cleanEmail) return false;

  // 0. Super Admin / Founder emails
  const SUPER_ADMIN_EMAILS = new Set([
    "sarkarmdanik14@gmail.com",
    "megabajar@admin.com"
  ]);
  if (cleanEmail && SUPER_ADMIN_EMAILS.has(cleanEmail)) {
    return true;
  }

  try {
    // 1. Check staff table by authenticated UID, staff_id, or email
    let staffQuery = supabase.from("staff").select("id, staff_id, email, role, status");
    if (uid && cleanEmail) {
      staffQuery = staffQuery.or(`id.eq.${uid},staff_id.eq.${uid},email.ilike.${cleanEmail}`);
    } else if (uid) {
      staffQuery = staffQuery.or(`id.eq.${uid},staff_id.eq.${uid}`);
    } else {
      staffQuery = staffQuery.eq("email", cleanEmail);
    }

    const { data: staffData } = await staffQuery.maybeSingle();

    if (staffData && staffData.status === "active" && (staffData.role === "admin" || staffData.role === "super_admin" || staffData.role === "founder")) {
      return true;
    }

    // 2. Check users table by authenticated UID or email
    let userQuery = supabase.from("users").select("role, email, id, uid");
    if (uid && cleanEmail) {
      userQuery = userQuery.or(`id.eq.${uid},uid.eq.${uid},email.ilike.${cleanEmail}`);
    } else if (uid) {
      userQuery = userQuery.or(`id.eq.${uid},uid.eq.${uid}`);
    } else {
      userQuery = userQuery.eq("email", cleanEmail);
    }

    const { data: userData } = await userQuery.maybeSingle();

    if (userData && (userData.role === "admin" || userData.role === "super_admin" || userData.role === "founder")) {
      return true;
    }
  } catch (err) {
    console.warn("[Supabase Auth] Notice checking admin status:", err);
  }
  return false;
}
