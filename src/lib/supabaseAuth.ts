/**
 * Supabase Authentication Engine for Kacha Bazar
 * Handles user & staff authentication via Supabase Auth (Email/Password, Google OAuth, Session Management)
 * backed by PostgreSQL 'users', 'staff', 'sellers', and 'riders' tables.
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

  const isStaffOrPartner =
    preferredRole === "admin" ||
    preferredRole === "partner" ||
    preferredRole === "super_admin" ||
    cleanEmail.toUpperCase().startsWith("CFI-") ||
    cleanEmail.toUpperCase().startsWith("KB-") ||
    SUPER_ADMIN_EMAILS.has(lowerEmail);

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

        const verifiedProfile: SupabaseUserProfile = {
          uid: u.uid || u.id || u.staffId,
          id: u.id || u.staffId,
          email: u.email || cleanEmail,
          displayName: u.name || u.fullName || u.displayName || (targetRole === "admin" || targetRole === "super_admin" ? "এডমিনিস্ট্রেটর" : "স্টাফ মেম্বার"),
          fullName: u.fullName || u.name || (targetRole === "admin" || targetRole === "super_admin" ? "এডমিনিস্ট্রেটর" : "স্টাফ মেম্বার"),
          role: targetRole as any,
          isSuperAdmin: targetRole === "super_admin" || SUPER_ADMIN_EMAILS.has((u.email || cleanEmail).toLowerCase()),
          photoURL: u.photoURL || u.photo_url || ""
        };

        return {
          success: true,
          user: verifiedProfile,
          role: targetRole
        };
      }
    } catch {
      // Non-blocking, fallback to Supabase Auth
    }
  }

  // 2. Authenticate with Supabase Auth (Fast Client Direct attempt + Instant Server Proxy Fallback)
  try {
    let authData: any = null;
    let authError: any = null;

    // Fast client-side authentication attempt (3.5-second race to prevent user wait)
    try {
      const authPromise = supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: pass
      });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("CLIENT_TIMEOUT")), 4500)
      );

      const res = (await Promise.race([authPromise, timeoutPromise])) as any;
      authData = res?.data;
      authError = res?.error;
    } catch (clientErr: any) {
      authError = clientErr;
    }

    // Check for explicit wrong credentials on client
    if (authError && authError.message !== "CLIENT_TIMEOUT") {
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
    }

    // 3. If SDK direct call timed out or was blocked by browser shields:
    // Try Direct Supabase REST API (works on static Cloudflare Pages without backend server!)
    if (!authData?.user) {
      try {
        const directResp = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
          method: "POST",
          headers: {
            "apikey": SUPABASE_ANON_KEY,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ email: cleanEmail, password: pass })
        });
        const directData = await directResp.json();
        if (directResp.ok && directData?.user) {
          authData = directData;
          try {
            await supabase.auth.setSession({
              access_token: directData.access_token,
              refresh_token: directData.refresh_token
            });
          } catch {}
        } else if (directData?.error_description || directData?.msg || directData?.message) {
          const directMsg = (directData.error_description || directData.msg || directData.message || "").toLowerCase();
          if (directMsg.includes("invalid login credentials") || directMsg.includes("invalid credentials")) {
            return { success: false, error: "ভুল ইমেইল বা পাসওয়ার্ড! অনুগ্রহ করে সঠিক তথ্য দিন।" };
          }
          if (directMsg.includes("email not confirmed")) {
            return {
              success: false,
              error: "ইমেইল কনফার্মেশন সম্পন্ন হয়নি! অনুগ্রহ করে আপনার ইমেইল ইনবক্স চেক করে লিঙ্কটিতে ক্লিক করুন।"
            };
          }
        }
      } catch (directErr) {
        // Direct fetch failed, proceed to server proxy rescue
      }
    }

    // 4. If still not authenticated, try server-side verification proxy as ultimate safety
    if (!authData?.user) {
      try {
        const fallbackRes = await apiClient.post<any>("/api/auth/login-verify", {
          identifier: cleanEmail,
          password: pass
        }, { silent: true, timeoutMs: 6000, skipAuth: true });

        if (fallbackRes?.success && fallbackRes?.user) {
          const u = fallbackRes.user;
          const targetRole = fallbackRes.role || "customer";

          if (fallbackRes.session) {
            try {
              const setSessionPromise = supabase.auth.setSession({
                access_token: fallbackRes.session.access_token,
                refresh_token: fallbackRes.session.refresh_token
              });
              const setSessionTimeout = new Promise((resolve) => setTimeout(resolve, 800));
              await Promise.race([setSessionPromise, setSessionTimeout]);
            } catch {}
          }

          if (fallbackRes.session?.access_token || u.accessToken) {
            const token = fallbackRes.session?.access_token || u.accessToken;
            try {
              localStorage.setItem("kb_supabase_token", token);
              sessionStorage.setItem("kb_supabase_token", token);
            } catch {}
          }

          const fallbackProfile: SupabaseUserProfile = {
            uid: u.uid || u.id,
            id: u.id || u.uid,
            email: u.email || cleanEmail,
            displayName: u.displayName || u.fullName || "গ্রাহক",
            fullName: u.fullName || u.displayName || "গ্রাহক",
            phone: u.phone || "",
            phoneNumber: u.phone || "",
            role: targetRole as any,
            isSuperAdmin: targetRole === "super_admin" || SUPER_ADMIN_EMAILS.has((u.email || cleanEmail).toLowerCase()),
            photoURL: u.photoURL || ""
          };

          return {
            success: true,
            user: fallbackProfile,
            role: targetRole
          };
        } else if (fallbackRes?.error) {
          return { success: false, error: fallbackRes.error };
        }
      } catch {
        // Network trouble
      }

      if (authError && authError.message && authError.message !== "CLIENT_TIMEOUT") {
        const rawMsg = (authError.message || "").toLowerCase();
        if (rawMsg.includes("failed to fetch") || rawMsg.includes("networkerror") || rawMsg.includes("fetch failed")) {
          return {
            success: false,
            error: "সার্ভারের সাথে সংযোগ স্থাপন করা যায়নি (Failed to fetch)। অনুগ্রহ করে আপনার ইন্টারনেট সংযোগ অথবা Supabase প্রজেক্ট সচল (Active) আছে কিনা পরীক্ষা করুন।"
          };
        }
        if (rawMsg.includes("invalid login credentials") || rawMsg.includes("invalid credentials")) {
          return { success: false, error: "ভুল ইমেইল বা পাসওয়ার্ড! অনুগ্রহ করে সঠিক তথ্য দিন।" };
        }
        if (rawMsg.includes("email not confirmed")) {
          return {
            success: false,
            error: "ইমেইল কনফার্মেশন সম্পন্ন হয়নি! অনুগ্রহ করে আপনার ইমেইল ইনবক্স চেক করে লিঙ্কটিতে ক্লিক করুন।"
          };
        }
        return { success: false, error: authError.message || "ভুল ইমেইল বা পাসওয়ার্ড!" };
      }

      return {
        success: false,
        error: "লগইন করতে সময় বেশি লেগেছে। অনুগ্রহ করে ইন্টারনেট সংযোগ চেক করে আবার চেষ্টা করুন।"
      };
    }

    const uid = authData.user.id;
    // Store access token for API authorization
    if (authData.session?.access_token) {
      try {
        localStorage.setItem("kb_supabase_token", authData.session.access_token);
        sessionStorage.setItem("kb_supabase_token", authData.session.access_token);
      } catch {}
    }

    // 4. Fetch user profile from public.users table (with safe 3.5s timeout)
    let profile: SupabaseUserProfile | null = null;
    try {
      const profilePromise = fetchUserProfile(uid);
      const profileTimeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3500));
      profile = await Promise.race([profilePromise, profileTimeout]);
    } catch {}

    const isSuperAdminEmail = SUPER_ADMIN_EMAILS.has(lowerEmail);

    if (!profile) {
      // Auto-create user profile in public.users if not exists
      const meta = authData.user.user_metadata || {};
      const isDbAdmin = isSuperAdminEmail || (await checkIsSupabaseAdmin(uid, lowerEmail));
      const resolvedName = meta.full_name || meta.display_name || cleanEmail.split("@")[0] || (isDbAdmin ? "এডমিনিস্ট্রেটর" : "গ্রাহক");
      profile = {
        uid,
        id: uid,
        email: authData.user.email || cleanEmail,
        displayName: resolvedName,
        fullName: resolvedName,
        phone: meta.phone || authData.user.phone || "",
        phoneNumber: meta.phone || authData.user.phone || "",
        role: isSuperAdminEmail ? "super_admin" : (isDbAdmin ? "admin" : "customer"),
        isSuperAdmin: isSuperAdminEmail,
        referralCode: "REF" + uid.substring(0, 5).toUpperCase(),
        address: "চাঁচকৈড় বাজার, গুরুদাশপুর, নাটোর",
        walletBalance: 0,
        rewardPoints: 0,
        membershipTier: isDbAdmin ? "Platinum" : "Silver"
      };
      saveUserProfile(profile).catch(() => {});
    } else if (isSuperAdminEmail) {
      profile.role = "super_admin";
      profile.isSuperAdmin = true;
    }

    // Exchange staff session ONLY if genuinely admin or staff in the database
    if (profile.role === "admin" || profile.role === "super_admin" || profile.isSuperAdmin) {
      try {
        const sessionRes = await apiClient.post<any>("/api/staff/supabase-session", {
          accessToken: authData.session?.access_token,
          token: authData.session?.access_token
        }, { silent: true, timeoutMs: 4000 });
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
  // 1. Exhaustive session cleanup from localStorage & sessionStorage FIRST (instant client-side logout)
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
          key === "kb_firebase_id_token" ||
          key === "referredBy"
        )) {
          localStorage.removeItem(key);
        }
      }
      sessionStorage.clear();
    }
  } catch {}

  localStorage.removeItem("kb_supabase_token");
  sessionStorage.removeItem("kb_supabase_token");
  localStorage.removeItem("kb_staff_session");
  sessionStorage.removeItem("kb_staff_session");
  localStorage.removeItem("kb_current_user");
  localStorage.removeItem("kb_user_photo");

  // 2. Revoke active server staff/user session in background (non-blocking with 2s timeout)
  apiClient.post("/api/auth/logout", {}, { silent: true, timeoutMs: 2000 }).catch(() => {});

  // 3. Local and global Supabase auth sign out in background (non-blocking)
  try {
    (supabase.auth as any).signOut({ scope: "local" }).catch(() => {});
  } catch {}
  try {
    supabase.auth.signOut().catch(() => {});
  } catch {}

  // 4. Synchronously notify the entire application that user has logged out
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

let latestAuthSequence = 0;

/**
 * Listen to Auth State changes across the entire app
 */
export function onSupabaseAuthStateChange(
  callback: (user: SupabaseUserProfile | null) => void
): () => void {
  const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
    const currentSeq = ++latestAuthSequence;

    if (session?.user) {
      const uid = session.user.id;
      if (session.access_token) {
        try {
          localStorage.setItem("kb_supabase_token", session.access_token);
          sessionStorage.setItem("kb_supabase_token", session.access_token);
        } catch {}
      }

      let profile = await fetchUserProfile(uid);
      if (currentSeq !== latestAuthSequence) return;

      if (!profile) {
        const cleanEmail = (session.user.email || "").toLowerCase().trim();
        const isSuper = cleanEmail ? SUPER_ADMIN_EMAILS.has(cleanEmail) : false;
        const isSbAdmin = isSuper || (await checkIsSupabaseAdmin(uid, cleanEmail));
        if (currentSeq !== latestAuthSequence) return;

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
      if (currentSeq !== latestAuthSequence) return;
      callback(null);
    }
  });

  return () => {
    authListener.subscription.unsubscribe();
  };
}

// In-flight request deduplication map for fetchUserProfile
const profileInFlight = new Map<string, Promise<SupabaseUserProfile | null>>();

/**
 * Helper to fetch user profile from public.users with authoritative staff/admin resolution
 */
export async function fetchUserProfile(uid: string): Promise<SupabaseUserProfile | null> {
  if (!uid) return null;
  const cleanUid = String(uid).trim();
  if (profileInFlight.has(cleanUid)) {
    return profileInFlight.get(cleanUid)!;
  }

  const promise = (async (): Promise<SupabaseUserProfile | null> => {
    try {
      const { data } = await supabase
        .from("users")
        .select("*")
        .or(`uid.eq.${cleanUid},id.eq.${cleanUid}`)
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

    // 3. Server-authoritative fallback if client query returned null (RLS restriction or offline mode)
    if (!data && !staffData && uid) {
      try {
        const sRes = await apiClient.get<any>(`/api/user/profile/${uid}?email=${encodeURIComponent(userEmail || "")}`, { silent: true });
        if (sRes?.success && sRes?.profile) {
          const sp = sRes.profile;
          const userPhoto = sp.photoURL || sp.photo_url || sp.avatar || sp.image || "";
          return {
            uid: sp.userId || sp.uid || sp.id || uid,
            id: sp.id || sp.userId || sp.uid || uid,
            email: sp.email || resolvedEmail,
            displayName: sp.displayName || sp.fullName || defaultTitle,
            fullName: sp.fullName || sp.displayName || defaultTitle,
            phone: sp.phone || "",
            phoneNumber: sp.phone || "",
            photoURL: userPhoto,
            role: (sp.role || "customer") as any,
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
  try {
    await supabase.from("users").upsert({
      id: targetId,
      uid: targetId,
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

  // Dual sync to server profile store so it persists even when client RLS or offline mode applies
  try {
    if (targetId) {
      await apiClient.post("/api/user/profile", {
        userId: targetId,
        ...profile
      }, { silent: true });
    }
  } catch {}

  // Sync Supabase Auth metadata if session is active
  try {
    if (profile.photoURL) {
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
  try {
    const sessionPromise = supabase.auth.getSession();
    const timeoutPromise = new Promise<{ data: { session: any } }>((resolve) => {
      setTimeout(() => resolve({ data: { session: null } }), 1200);
    });
    const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]) as any;
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
        
        // Also check server-side disk cache for persistent photoURL
        let restoredPhoto = meta.avatar_url || meta.picture || meta.photoURL || "";
        if (!restoredPhoto) {
          try {
            const sRes = await apiClient.get<any>(`/api/user/profile/${uid}?email=${encodeURIComponent(cleanEmail)}`, { silent: true });
            if (sRes?.success && sRes?.profile?.photoURL) {
              restoredPhoto = sRes.profile.photoURL;
            }
          } catch {}
        }

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
          photoURL: restoredPhoto
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
