/**
 * Supabase Authentication Engine for Kacha Bazar
 * Handles user & staff authentication via Supabase Auth (Email/Password, Google OAuth, Session Management)
 * backed by PostgreSQL 'users', 'staff', 'sellers', and 'riders' tables.
 * 
 * Security: Staff and admin permissions are verified server-side only. Client-supplied
 * user_metadata and frontend email lists are never trusted for privilege elevation.
 */

import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase";
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

// Deprecated: Kept for type signature compatibility; permissions are strictly verified on the backend
export const SUPER_ADMIN_EMAILS = new Set<string>();

let currentAuthEpoch = 1;
const EXPLICIT_LOGOUT_STORAGE_KEY = "kb_explicit_logout";

export function getAuthEpoch(): number {
  return currentAuthEpoch;
}

/**
 * Mark explicit logout: sets in-memory epoch and persists across tabs via localStorage.
 */
export function markExplicitLogout(): void {
  currentAuthEpoch++;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(EXPLICIT_LOGOUT_STORAGE_KEY, String(Date.now()));
      sessionStorage.setItem(EXPLICIT_LOGOUT_STORAGE_KEY, String(Date.now()));
    } catch {}
  }
}

/**
 * Clear explicit logout: called when user starts a fresh login action.
 */
export function clearExplicitLogout(): void {
  currentAuthEpoch++;
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(EXPLICIT_LOGOUT_STORAGE_KEY);
      sessionStorage.removeItem(EXPLICIT_LOGOUT_STORAGE_KEY);
    } catch {}
  }
}

/**
 * Checks if explicit logout is active to prevent resurrection of old sessions.
 */
export function isExplicitLogoutActive(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const val = localStorage.getItem(EXPLICIT_LOGOUT_STORAGE_KEY) || sessionStorage.getItem(EXPLICIT_LOGOUT_STORAGE_KEY);
    return Boolean(val);
  } catch {
    return false;
  }
}

/**
 * Authoritatively verifies staff/admin permissions on the backend server.
 * Never assigns admin or super_admin privileges based on client-supplied lists or metadata.
 */
export async function verifyServerAdminOrStaffSession(token?: string): Promise<{
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  role: "customer" | "admin" | "super_admin" | "staff" | string;
  staff?: any;
}> {
  try {
    const sbToken = token || (typeof window !== "undefined"
      ? (localStorage.getItem("kb_supabase_token") || sessionStorage.getItem("kb_supabase_token"))
      : null);
    const staffSession = typeof window !== "undefined"
      ? (localStorage.getItem("kb_staff_session") || sessionStorage.getItem("kb_staff_session"))
      : null;

    if (sbToken) {
      const res = await apiClient.post<any>("/api/staff/supabase-session", {
        accessToken: sbToken,
        token: sbToken
      }, { silent: true, timeoutMs: 4000 });

      if (res?.success && res?.staff) {
        if (res.sessionId && typeof window !== "undefined") {
          try {
            localStorage.setItem("kb_staff_session", res.sessionId);
            sessionStorage.setItem("kb_staff_session", res.sessionId);
            if (res.staff.email) localStorage.setItem("kb_staff_email", res.staff.email);
            if (res.staff.staffId) localStorage.setItem("kb_staff_id", res.staff.staffId);
          } catch {}
        }
        const isSuper = Boolean(res.staff.role === "super_admin" || res.staff.isSuperAdmin);
        const isAdmin = isSuper || Boolean(res.staff.role === "admin");
        return {
          isAuthenticated: true,
          isAdmin,
          isSuperAdmin: isSuper,
          role: res.staff.role || (isSuper ? "super_admin" : (isAdmin ? "admin" : "staff")),
          staff: res.staff
        };
      }
    }

    if (staffSession) {
      const aRes = await apiClient.get<any>("/api/staff/active-session", { silent: true, timeoutMs: 4000 });
      if (aRes?.success && aRes?.staff) {
        const isSuper = Boolean(aRes.staff.role === "super_admin" || aRes.staff.isSuperAdmin);
        const isAdmin = isSuper || Boolean(aRes.staff.role === "admin");
        return {
          isAuthenticated: true,
          isAdmin,
          isSuperAdmin: isSuper,
          role: aRes.staff.role || (isSuper ? "super_admin" : (isAdmin ? "admin" : "staff")),
          staff: aRes.staff
        };
      }
    }
  } catch {}

  return {
    isAuthenticated: false,
    isAdmin: false,
    isSuperAdmin: false,
    role: "customer"
  };
}

/**
 * Sign In with Email & Password via Supabase Auth
 */
export async function supabaseSignInWithEmail(
  email: string,
  pass: string,
  preferredRole: string = "customer"
): Promise<{ success: boolean; user?: SupabaseUserProfile; role?: string; error?: string }> {
  clearExplicitLogout();
  const thisEpoch = currentAuthEpoch;
  const cleanEmail = email.trim();
  const lowerEmail = cleanEmail.toLowerCase();
  const effectivePreferredRole = preferredRole;

  const isStaffOrPartner =
    preferredRole === "admin" ||
    preferredRole === "partner" ||
    preferredRole === "super_admin" ||
    cleanEmail.toUpperCase().startsWith("CFI-") ||
    cleanEmail.toUpperCase().startsWith("KB-");

  // 1. For Staff or Partner, check server credentials first
  if (isStaffOrPartner) {
    try {
      const verifyData = await apiClient.post<any>("/api/auth/login-verify", {
        identifier: cleanEmail,
        password: pass
      }, { silent: true, timeoutMs: 4000 });

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

        const isSuper = Boolean(targetRole === "super_admin" || u.isSuperAdmin);

        const verifiedProfile: SupabaseUserProfile = {
          uid: u.uid || u.id || u.staffId,
          id: u.id || u.staffId,
          email: u.email || cleanEmail,
          displayName: u.name || u.fullName || u.displayName || (targetRole === "admin" || targetRole === "super_admin" ? "এডমিনিস্ট্রেটর" : "স্টাফ মেম্বার"),
          fullName: u.fullName || u.name || (targetRole === "admin" || targetRole === "super_admin" ? "এডমিনিস্ট্রেটর" : "স্টাফ মেম্বার"),
          role: targetRole as any,
          isSuperAdmin: isSuper,
          photoURL: u.photoURL || u.photo_url || ""
        };

        return {
          success: true,
          user: verifiedProfile,
          role: targetRole
        };
      }
    } catch {
      // Non-blocking, fallback to standard Supabase Auth
    }
  }

  // 2. Direct, standard Supabase Auth call
  try {
    const signInPromise = supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: pass
    });
    const signInTimeout = new Promise<{ data: any; error: any; isTimeout: true }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: null, isTimeout: true }), 15000)
    );

    const raceResult = await Promise.race([signInPromise, signInTimeout]);
    if ("isTimeout" in raceResult && raceResult.isTimeout) {
      return {
        success: false,
        error: "সার্ভার সাড়া দিচ্ছে না। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।"
      };
    }

    const { data: authData, error: authError } = raceResult;

    if (authError) {
      const msg = (authError.message || "").toLowerCase();
      if (msg.includes("invalid login credentials") || msg.includes("invalid credentials")) {
        return { success: false, error: "ভুল ইমেইল বা পাসওয়ার্ড! অনুগ্রহ করে সঠিক তথ্য দিন।" };
      }
      if (msg.includes("email not confirmed")) {
        return {
          success: false,
          error: "ইমেইল কনফার্মেশন সম্পন্ন হয়নি! অনুগ্রহ করে আপনার ইমেইল ইনবক্স চেক করে লিঙ্কটিতে ক্লিক করুন।"
        };
      }
      if (msg.includes("failed to fetch") || msg.includes("networkerror") || msg.includes("fetch failed")) {
        return {
          success: false,
          error: "ইন্টারনেট সংযোগে সমস্যা দেখা দিয়েছে। অনুগ্রহ করে আপনার ইন্টারনেট কানেকশন চেক করে আবার চেষ্টা করুন।"
        };
      }
      return { success: false, error: authError.message || "ভুল ইমেইল বা পাসওয়ার্ড!" };
    }

    if (!authData?.user) {
      return { success: false, error: "লগইন সম্পন্ন করা সম্ভব হয়নি। অনুগ্রহ করে আবার চেষ্টা করুন।" };
    }

    if (isExplicitLogoutActive() || thisEpoch !== currentAuthEpoch) {
      return { success: false, error: "সেশন বাতিল করা হয়েছে।" };
    }

    const uid = authData.user.id;
    // Store access token for API authorization
    if (authData.session?.access_token) {
      try {
        localStorage.setItem("kb_supabase_token", authData.session.access_token);
        sessionStorage.setItem("kb_supabase_token", authData.session.access_token);
      } catch {}
    }

    // 3. Authoritatively verify staff/admin privileges on backend
    const serverAuth = await verifyServerAdminOrStaffSession(authData.session?.access_token);

    // 4. Fetch user profile from public.users table (with safe 3.5s timeout)
    let profile: SupabaseUserProfile | null = null;
    let isProfileFetchTimeoutOrError = false;
    try {
      const profilePromise = fetchUserProfile(uid);
      const profileTimeout = new Promise<"FETCH_TIMEOUT">((resolve) => setTimeout(() => resolve("FETCH_TIMEOUT"), 3500));
      const res = await Promise.race([profilePromise, profileTimeout]);
      if (res === "FETCH_TIMEOUT") {
        isProfileFetchTimeoutOrError = true;
      } else {
        profile = res;
      }
    } catch {
      isProfileFetchTimeoutOrError = true;
    }

    if (isExplicitLogoutActive() || thisEpoch !== currentAuthEpoch) {
      return { success: false, error: "সেশন বাতিল করা হয়েছে।" };
    }

    if (!profile) {
      const meta = authData.user.user_metadata || {};
      const resolvedRole = serverAuth.isAdmin ? serverAuth.role : "customer";
      const resolvedName = meta.full_name || meta.display_name || cleanEmail.split("@")[0] || (serverAuth.isAdmin ? "এডমিনিস্ট্রেটর" : "গ্রাহক");
      profile = {
        uid,
        id: uid,
        email: authData.user.email || cleanEmail,
        displayName: resolvedName,
        fullName: resolvedName,
        phone: meta.phone || authData.user.phone || "",
        phoneNumber: meta.phone || authData.user.phone || "",
        role: resolvedRole as any,
        isSuperAdmin: serverAuth.isSuperAdmin,
        referralCode: "REF" + uid.substring(0, 5).toUpperCase(),
        address: "চাঁচকৈড় বাজার, গুরুদাশপুর, নাটোর",
        walletBalance: 0,
        rewardPoints: 0,
        membershipTier: serverAuth.isAdmin ? "Platinum" : "Silver"
      };

      if (!isProfileFetchTimeoutOrError) {
        saveUserProfile(profile).catch(() => {});
      }
    } else if (serverAuth.isAdmin) {
      profile.role = serverAuth.role as any;
      profile.isSuperAdmin = serverAuth.isSuperAdmin;
    } else {
      profile.role = "customer";
      profile.isSuperAdmin = false;
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
  clearExplicitLogout();
  const cleanEmail = params.email.trim();
  const cleanName = params.fullName.trim();
  // Role security: customer is the default for new signups unless verified by backend
  const userRole = (params.role === "seller" || params.role === "rider" || params.role === "partner")
    ? params.role
    : "customer";

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
      try {
        localStorage.setItem("kb_supabase_token", data.session.access_token);
        sessionStorage.setItem("kb_supabase_token", data.session.access_token);
      } catch {}
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
  clearExplicitLogout();
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
 * Authoritative Universal Logout
 * 1. Bumps auth epoch & marks persistent explicit logout.
 * 2. Captures all required session identifiers before clearing storage.
 * 3. Awaits server session invalidation and Supabase signOut safely.
 * 4. Exhaustively clears authentication tokens and cached user state.
 * 5. Broadcasts logout event across tabs and window.
 */
export async function supabaseSignOut(): Promise<void> {
  // 1. Immediately bump auth epoch & mark explicit logout flag
  markExplicitLogout();

  // 2. CAPTURE all required session identifiers BEFORE clearing storage
  let staffSessionId = "";
  let supabaseToken = "";
  let staffId = "";
  let staffEmail = "";

  try {
    if (typeof window !== "undefined") {
      staffSessionId = localStorage.getItem("kb_staff_session") || sessionStorage.getItem("kb_staff_session") || "";
      supabaseToken = localStorage.getItem("kb_supabase_token") || sessionStorage.getItem("kb_supabase_token") || "";
      staffId = localStorage.getItem("kb_staff_id") || sessionStorage.getItem("kb_staff_id") || "";
      staffEmail = localStorage.getItem("kb_staff_email") || "";
    }
  } catch {}

  // 3. AWAIT server session invalidation and Supabase signOut safely (protected against hung networks)
  try {
    const serverLogoutPromise = apiClient.post(
      "/api/auth/logout",
      { sessionId: staffSessionId, token: supabaseToken, staffId, email: staffEmail },
      {
        silent: true,
        timeoutMs: 3000,
        headers: staffSessionId ? { Authorization: `Bearer ${staffSessionId}` } : undefined
      }
    ).catch(() => {});

    const supabaseSignOutPromise = supabase.auth.signOut().catch(() => {});

    await Promise.allSettled([
      serverLogoutPromise,
      Promise.race([
        supabaseSignOutPromise,
        new Promise((resolve) => setTimeout(resolve, 2000))
      ])
    ]);
  } catch (err) {
    console.warn("[Supabase Auth] Notice during logout synchronization:", err);
  }

  // 4. Exhaustively clear all authentication tokens, session identifiers, and user cached state
  try {
    if (typeof window !== "undefined") {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (
          key.startsWith("sb-") ||
          key.startsWith("firebase:") ||
          key.startsWith("kb_staff_") ||
          key.startsWith("kb_user_") ||
          key === "kb_current_user" ||
          key === "kacha_user_session" ||
          key === "user_role" ||
          key === "current_partner" ||
          key === "kb_supabase_token" ||
          key === "kb_staff_session" ||
          key === "kb_firebase_id_token" ||
          key === "referredBy"
        )) {
          localStorage.removeItem(key);
        }
      }
      sessionStorage.clear();
      // Retain the explicit logout marker so refreshes never auto-restore zombie sessions
      localStorage.setItem(EXPLICIT_LOGOUT_STORAGE_KEY, String(Date.now()));
    }
  } catch {}

  // 5. Synchronously notify entire application that user has logged out
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new CustomEvent("kb_user_logout"));
    } catch {}
  }
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
  async function handleAuthChange(_event: string, session: any) {
    const thisEpoch = ++currentAuthEpoch;

    if (session?.user) {
      if (isExplicitLogoutActive()) {
        callback(null);
        return;
      }
      const uid = session.user.id;
      if (session.access_token) {
        try {
          localStorage.setItem("kb_supabase_token", session.access_token);
          sessionStorage.setItem("kb_supabase_token", session.access_token);
        } catch {}
      }

      let profile = await fetchUserProfile(uid);
      if (thisEpoch !== currentAuthEpoch || isExplicitLogoutActive()) return;

      if (!profile) {
        const serverAuth = await verifyServerAdminOrStaffSession(session.access_token);
        if (thisEpoch !== currentAuthEpoch || isExplicitLogoutActive()) return;

        const meta = session.user.user_metadata || {};
        const resolvedRole = serverAuth.isAdmin ? serverAuth.role : "customer";
        const name = meta.full_name || meta.display_name || session.user.email?.split("@")[0] || (serverAuth.isAdmin ? "এডমিনিস্ট্রেটর" : "গ্রাহক");
        profile = {
          uid,
          id: uid,
          email: session.user.email || "",
          displayName: name,
          fullName: name,
          phone: meta.phone || session.user.phone || "",
          phoneNumber: meta.phone || session.user.phone || "",
          role: resolvedRole as any,
          isSuperAdmin: serverAuth.isSuperAdmin,
          photoURL: meta.avatar_url || meta.picture || ""
        };
      }
      callback(profile);
    } else {
      if (thisEpoch !== currentAuthEpoch) return;
      callback(null);
    }
  }

  const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
    setTimeout(() => {
      handleAuthChange(event, session).catch((e) =>
        console.warn("[Supabase Auth] auth state handler error:", e)
      );
    }, 0);
  });

  return () => {
    authListener.subscription.unsubscribe();
  };
}

// In-flight request deduplication map for fetchUserProfile
const profileInFlight = new Map<string, Promise<SupabaseUserProfile | null>>();

/**
 * Helper to fetch user profile from public.users with authoritative backend staff/admin resolution
 */
export async function fetchUserProfile(uid: string): Promise<SupabaseUserProfile | null> {
  if (!uid || isExplicitLogoutActive()) return null;
  const thisEpoch = currentAuthEpoch;
  const cleanUid = String(uid).trim();
  if (profileInFlight.has(cleanUid)) {
    return profileInFlight.get(cleanUid)!;
  }

  const promise = (async (): Promise<SupabaseUserProfile | null> => {
    try {
      if (isExplicitLogoutActive() || thisEpoch !== currentAuthEpoch) return null;

      const { data } = await supabase
        .from("users")
        .select("*")
        .or(`uid.eq.${cleanUid},id.eq.${cleanUid}`)
        .maybeSingle();

      if (isExplicitLogoutActive() || thisEpoch !== currentAuthEpoch) return null;

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

      // Authoritative backend verification for admin/super_admin privileges
      let isVerifiedAdmin = false;
      let isVerifiedSuperAdmin = false;
      let finalRole = (data?.role || staffData?.role || "customer").toLowerCase();

      // If user or staff data claims admin/super_admin, verify against backend!
      if (finalRole === "admin" || finalRole === "super_admin" || staffData) {
        const serverCheck = await verifyServerAdminOrStaffSession();
        if (serverCheck.isAuthenticated && (serverCheck.isAdmin || serverCheck.isSuperAdmin)) {
          isVerifiedAdmin = serverCheck.isAdmin;
          isVerifiedSuperAdmin = serverCheck.isSuperAdmin;
          finalRole = serverCheck.role;
        } else {
          isVerifiedAdmin = false;
          isVerifiedSuperAdmin = false;
          if (finalRole === "admin" || finalRole === "super_admin") {
            finalRole = "customer";
          }
        }
      }

      if (isExplicitLogoutActive() || thisEpoch !== currentAuthEpoch) return null;

      const defaultTitle = isVerifiedSuperAdmin ? "সুপার এডমিন" : (isVerifiedAdmin ? "এডমিনিস্ট্রেটর" : "সম্মানিত গ্রাহক");

      if (data) {
        return {
          uid: data.uid || data.id || uid,
          id: data.id || data.uid || uid,
          email: data.email || userEmail,
          displayName: data.display_name || data.full_name || staffData?.name || staffData?.fullName || defaultTitle,
          fullName: data.full_name || data.display_name || staffData?.fullName || staffData?.name || defaultTitle,
          phone: data.phone || data.mobile || staffData?.phone || "",
          phoneNumber: data.phone || data.mobile || staffData?.phone || "",
          photoURL: data.photo_url || staffData?.photoURL || staffData?.photo_url || "",
          role: finalRole as any,
          isSuperAdmin: isVerifiedSuperAdmin,
          address: data.address || staffData?.address,
          referralCode: data.referral_code,
          referredBy: data.referred_by,
          walletBalance: Number(data.wallet_balance || 0),
          rewardPoints: Number(data.reward_points || 0),
          membershipTier: (isVerifiedAdmin || isVerifiedSuperAdmin) ? "Platinum" : (data.membership_tier || "Silver"),
          isVerified: Boolean(data.is_verified || staffData)
        };
      }

      if (staffData && (isVerifiedAdmin || isVerifiedSuperAdmin)) {
        return {
          uid: staffData.id || staffData.staff_id || uid,
          id: staffData.id || staffData.staff_id || uid,
          email: staffData.email || userEmail,
          displayName: staffData.name || staffData.fullName || staffData.displayName || defaultTitle,
          fullName: staffData.fullName || staffData.name || staffData.displayName || defaultTitle,
          phone: staffData.phone || staffData.mobile || "",
          phoneNumber: staffData.phone || staffData.mobile || "",
          photoURL: staffData.photo_url || staffData.photoURL || "",
          role: finalRole as any,
          isSuperAdmin: isVerifiedSuperAdmin,
          address: staffData.address,
          membershipTier: "Platinum",
          isVerified: true
        };
      }

      // 3. Server-authoritative fallback if client query returned null
      if (!data && !staffData && uid) {
        try {
          const sRes = await apiClient.get<any>(`/api/user/profile/${uid}?email=${encodeURIComponent(userEmail || "")}`, { silent: true });
          if (sRes?.success && sRes?.profile) {
            const sp = sRes.profile;
            const userPhoto = sp.photoURL || sp.photo_url || sp.avatar || sp.image || "";
            return {
              uid: sp.userId || sp.uid || sp.id || uid,
              id: sp.id || sp.userId || sp.uid || uid,
              email: sp.email || userEmail,
              displayName: sp.displayName || sp.fullName || defaultTitle,
              fullName: sp.fullName || sp.displayName || defaultTitle,
              phone: sp.phone || "",
              phoneNumber: sp.phone || "",
              photoURL: userPhoto,
              role: (sp.role === "admin" || sp.role === "super_admin") ? "customer" : (sp.role || "customer") as any,
              address: sp.address,
              walletBalance: Number(sp.walletBalance || 0),
              rewardPoints: Number(sp.rewardPoints || 0),
              membershipTier: sp.membershipTier || "Silver",
              isVerified: true
            };
          }
        } catch {}
      }
    } catch {}
    return null;
  })();

  profileInFlight.set(cleanUid, promise);
  promise.finally(() => {
    setTimeout(() => {
      profileInFlight.delete(cleanUid);
    }, 2500);
  });

  return promise;
}

/**
 * Helper to save user profile into public.users and server storage
 */
export async function saveUserProfile(profile: SupabaseUserProfile): Promise<void> {
  const targetId = profile.id || profile.uid;
  if (!targetId || isExplicitLogoutActive()) return;

  try {
    await supabase.from("users").upsert({
      id: targetId,
      uid: targetId,
      email: profile.email,
      full_name: profile.fullName,
      display_name: profile.displayName,
      phone: profile.phone || profile.phoneNumber || null,
      mobile: profile.phone || profile.phoneNumber || null,
      photo_url: (profile.photoURL && !profile.photoURL.startsWith("data:") && !profile.photoURL.startsWith("blob:")) ? profile.photoURL : null,
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

  // Dual sync to server profile store so it persists even when client RLS or offline mode applies
  try {
    if (targetId && !isExplicitLogoutActive()) {
      const safePhoto = (profile.photoURL && !profile.photoURL.startsWith("data:") && !profile.photoURL.startsWith("blob:") && (profile.photoURL.startsWith("http") || profile.photoURL.startsWith("/"))) ? profile.photoURL : undefined;
      await apiClient.post("/api/user/profile", {
        userId: targetId,
        email: profile.email,
        fullName: profile.fullName,
        displayName: profile.displayName,
        phone: profile.phone || profile.phoneNumber,
        address: profile.address,
        role: profile.role,
        referralCode: profile.referralCode,
        ...(safePhoto ? { photoURL: safePhoto } : {})
      }, { silent: true });
    }
  } catch {}

  // Sync Supabase Auth metadata if session is active
  try {
    if (profile.photoURL && !isExplicitLogoutActive()) {
      await (supabase.auth as any).updateUser({
        data: {
          avatar_url: profile.photoURL,
          picture: profile.photoURL,
          photoURL: profile.photoURL,
          full_name: profile.fullName,
          display_name: profile.displayName
        }
      });
    }
  } catch {}
}

/**
 * Get currently authenticated Supabase user profile
 */
export async function getSupabaseUser(): Promise<SupabaseUserProfile | null> {
  if (isExplicitLogoutActive()) return null;
  const thisEpoch = currentAuthEpoch;
  try {
    const sessionPromise = supabase.auth.getSession();
    const timeoutPromise = new Promise<{ data: { session: any } }>((resolve) => {
      setTimeout(() => resolve({ data: { session: null } }), 1200);
    });
    const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]) as any;
    if (session?.user) {
      if (isExplicitLogoutActive() || thisEpoch !== currentAuthEpoch) return null;
      const uid = session.user.id;
      let profile = await fetchUserProfile(uid);
      if (isExplicitLogoutActive() || thisEpoch !== currentAuthEpoch) return null;

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
          role: "customer",
          isSuperAdmin: false,
          photoURL: meta.avatar_url || meta.picture || meta.photoURL || ""
        };
      }
      return profile;
    }
  } catch {}
  return null;
}

/**
 * Check if a user is an authorized admin in Supabase via backend verification
 */
export async function checkIsSupabaseAdmin(uid: string, email?: string): Promise<boolean> {
  const cleanEmail = (email || "").toLowerCase().trim();
  if (!uid && !cleanEmail) return false;

  try {
    const verified = await verifyServerAdminOrStaffSession();
    if (verified.isAdmin || verified.isSuperAdmin) {
      return true;
    }

    // Secondary backend verification check via active session
    const sRes = await apiClient.get<any>("/api/staff/active-session", { silent: true, timeoutMs: 3000 });
    if (sRes?.success && sRes?.staff && (sRes.staff.role === "admin" || sRes.staff.role === "super_admin" || sRes.staff.isSuperAdmin)) {
      return true;
    }
  } catch (err) {
    console.warn("[Supabase Auth] Notice checking admin status:", err);
  }
  return false;
}
