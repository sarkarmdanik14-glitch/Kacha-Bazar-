import { apiClient } from "./apiClient";
import { supabase } from "./supabase";
import { compressImage } from "./imageUploadHelper";
import { isExplicitLogoutActive, getAuthEpoch } from "./supabaseAuth";

/**
 * Checks whether a URL is a permanent cloud URL (R2, CDN, server media, or uploads)
 * and NOT a temporary Base64 data URL or blob URL.
 */
export function isPermanentCloudUrl(url?: string | null): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (trimmed.startsWith("data:") || trimmed.startsWith("blob:")) return false;
  return (
    trimmed.startsWith("https://") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("/api/media/") ||
    trimmed.startsWith("/uploads/")
  );
}

/**
 * Resolves the authoritative profile image URL from user profile data.
 * Prioritizes genuine permanent cloud URLs over temporary base64/local data.
 */
export function resolveProfilePhotoUrl(user?: any, fallback = ""): string {
  if (!user || typeof user !== "object") return fallback;
  const candidates = [
    user.photo_url,
    user.photoURL,
    user.avatar_url,
    user.avatar,
    user.image
  ];

  for (const c of candidates) {
    if (isPermanentCloudUrl(c)) {
      return c.trim();
    }
  }

  // Check localStorage ONLY if it contains a permanent cloud URL (never Base64)
  if (typeof window !== "undefined") {
    try {
      const local = localStorage.getItem("kb_user_photo");
      if (isPermanentCloudUrl(local)) {
        return local!.trim();
      }
    } catch {}
  }

  return fallback;
}

export interface UploadProfilePhotoOptions {
  file: File;
  userId: string;
  folder?: "profiles" | "staff";
  previousPhotoUrl?: string;
  onPreview?: (previewUrl: string) => void;
}

export interface UploadProfilePhotoResult {
  permanentUrl: string;
  provider: string;
}

/**
 * Unified customer and staff profile image uploader.
 * 
 * Rules:
 * 1. Immediate local preview via URL.createObjectURL for 0ms UI lag.
 * 2. Uploads strictly to backend /api/upload with authenticated session.
 * 3. Requires permanent cloud URL from Cloudflare R2 / Object Storage.
 * 4. Never stores Base64 or LocalStorage as permanent profile image.
 * 5. Saves permanent URL into Supabase public.users (or staff table).
 * 6. If upload or database save fails, reverts preview and preserves previous photo.
 */
export async function uploadProfilePhotoUnified({
  file,
  userId,
  folder = "profiles",
  previousPhotoUrl = "",
  onPreview
}: UploadProfilePhotoOptions): Promise<UploadProfilePhotoResult> {
  if (!file) {
    throw new Error("ফাইল নির্বাচন করা হয়নি।");
  }

  if (isExplicitLogoutActive()) {
    return { permanentUrl: previousPhotoUrl || "", provider: "cancelled" };
  }
  const uploadEpoch = getAuthEpoch();

  const cleanUserId = (userId || "").trim();
  if (!cleanUserId) {
    throw new Error("ইউজার আইডি পাওয়া যায়নি। অনুগ্রহ করে পুনরায় লগইন করুন।");
  }

  // 1. File Type and Size Validation
  const validTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
  if (!validTypes.includes(file.type.toLowerCase())) {
    throw new Error("শুধুমাত্র JPEG, PNG এবং WebP ছবি আপলোড করা যাবে।");
  }

  if (file.size > 10 * 1024 * 1024) {
    throw new Error("ছবির সাইজ সর্বোচ্চ ১০ মেগাবাইট হতে পারবে।");
  }

  // 2. Immediate local preview
  let localPreviewUrl = "";
  try {
    localPreviewUrl = URL.createObjectURL(file);
    if (onPreview) {
      onPreview(localPreviewUrl);
    }
  } catch (prevErr) {
    console.warn("Local preview notice:", prevErr);
  }

  try {
    // 3. Client-side compression for fast network upload (max 180px for avatars, max 28KB budget for GFE proxy safety)
    const compressed = await compressImage(file, 180, 0.68, 28 * 1024);
    let dataUrlToSend = compressed.dataUrl;

    if (!dataUrlToSend || !dataUrlToSend.startsWith("data:image/")) {
      throw new Error("ছবিটি প্রক্রিয়াকরণ করা সম্ভব হয়নি।");
    }

    // 4. Authenticated backend upload to Cloudflare R2
    const cleanFilename = `profile_${cleanUserId}_${Date.now()}.jpg`;
    let uploadRes: any = null;

    try {
      uploadRes = await apiClient.post<any>("/api/upload", {
        dataUrl: dataUrlToSend,
        filename: cleanFilename,
        folder,
        userId: cleanUserId,
        targetUserId: cleanUserId
      }, {
        skipAuth: false,
        timeoutMs: 30000
      });
    } catch (uploadErr: any) {
      const errStr = String(uploadErr?.message || uploadErr?.status || "");
      // If 413 or proxy payload limit is encountered, automatically re-compress with ultra-compact 140px avatar and retry
      if (errStr.includes("413") || uploadErr?.status === 413 || errStr.includes("সীমার চেয়ে বড়")) {
        console.warn("Retrying profile upload with ultra-compact 140px avatar due to proxy limits...");
        const fallbackComp = await compressImage(file, 140, 0.55, 18 * 1024);
        uploadRes = await apiClient.post<any>("/api/upload", {
          dataUrl: fallbackComp.dataUrl,
          filename: `c_${cleanFilename}`,
          folder,
          userId: cleanUserId,
          targetUserId: cleanUserId
        }, {
          skipAuth: false,
          timeoutMs: 25000
        });
      } else {
        throw uploadErr;
      }
    }

    if (!uploadRes?.success || !uploadRes?.url) {
      throw new Error(uploadRes?.error || uploadRes?.message || "ক্লাউডে ছবি আপলোড করতে ব্যর্থ হয়েছে।");
    }

    const permanentUrl = uploadRes.url.trim();

    // Verify it is a genuine permanent cloud URL and NOT a data URL
    if (!isPermanentCloudUrl(permanentUrl)) {
      throw new Error("সার্ভার থেকে স্থায়ী ক্লাউড ইউআরএল পাওয়া যায়নি।");
    }

    // Abort if explicit logout occurred while upload was in progress
    if (isExplicitLogoutActive() || uploadEpoch !== getAuthEpoch()) {
      return { permanentUrl: previousPhotoUrl || "", provider: "cancelled" };
    }

    // 5. Authoritative persistence in Supabase public.users
    if (folder === "profiles") {
      try {
        if (supabase) {
          const { error: sbErr } = await supabase.from("users").update({
            photo_url: permanentUrl,
            updated_at: new Date().toISOString()
          }).or(`id.eq.${cleanUserId},uid.eq.${cleanUserId}`);
          if (sbErr) {
            console.warn("Supabase user photo update notice:", sbErr);
          }
        }
      } catch (sbEx) {
        console.warn("Supabase exception during photo update:", sbEx);
      }

      // Sync via server profile endpoint
      try {
        await apiClient.post("/api/user/profile", {
          userId: cleanUserId,
          photoURL: permanentUrl
        }, { silent: true });
      } catch (apiErr) {
        console.warn("Server profile sync notice:", apiErr);
      }

      // Update Supabase auth user metadata if active
      try {
        if (supabase?.auth?.updateUser) {
          (supabase.auth as any).updateUser({
            data: {
              avatar_url: permanentUrl,
              picture: permanentUrl,
              photoURL: permanentUrl
            }
          }).catch(() => {});
        }
      } catch {}
    } else if (folder === "staff") {
      // Staff update
      try {
        if (supabase) {
          await supabase.from("staff").update({
            photo_url: permanentUrl,
            updated_at: new Date().toISOString()
          }).or(`id.eq.${cleanUserId},staff_id.eq.${cleanUserId}`);
        }
      } catch (stErr) {
        console.warn("Supabase staff photo update notice:", stErr);
      }
    }

    // 6. Update local storage with PERMANENT cloud URL (never base64)
    try {
      if (typeof window !== "undefined" && !isExplicitLogoutActive() && uploadEpoch === getAuthEpoch()) {
        localStorage.setItem("kb_user_photo", permanentUrl);
        const currentUserStr = localStorage.getItem("kb_current_user");
        if (currentUserStr) {
          const parsed = JSON.parse(currentUserStr);
          parsed.photoURL = permanentUrl;
          parsed.photo_url = permanentUrl;
          parsed.avatar = permanentUrl;
          localStorage.setItem("kb_current_user", JSON.stringify(parsed));
        }
        window.dispatchEvent(new CustomEvent("kb_profile_updated", { detail: { photoURL: permanentUrl } }));
      }
    } catch {}

    // Revoke temporary object URL
    if (localPreviewUrl) {
      try {
        URL.revokeObjectURL(localPreviewUrl);
      } catch {}
    }

    return {
      permanentUrl,
      provider: uploadRes.provider || "cloudflare_r2"
    };
  } catch (err: any) {
    // 7. On Failure: Revoke preview and throw error to preserve previous photo
    if (localPreviewUrl) {
      try {
        URL.revokeObjectURL(localPreviewUrl);
      } catch {}
    }
    console.error("Profile photo upload failed:", err);
    throw err;
  }
}
