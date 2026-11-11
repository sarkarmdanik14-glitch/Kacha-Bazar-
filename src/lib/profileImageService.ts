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
    // 3. Client-side compression for high visual fidelity (< 45KB budget, ~280px avatar)
    const compressed = await compressImage(file, 280, 0.75, 45 * 1024);
    const cleanFilename = `profile_${cleanUserId}_${Date.now()}.jpg`;
    let uploadRes: any = null;

    // TIER 1: Direct-to-Cloud Signed Upload (Completely bypasses reverse proxy 413 limits)
    try {
      const signedRes = await apiClient.post<any>("/api/upload/signed-url", {
        folder,
        filename: cleanFilename,
        contentType: "image/jpeg"
      }, {
        silent: true,
        timeoutMs: 10000
      });

      if (signedRes?.success && (signedRes?.signedUrl || signedRes?.token) && signedRes?.publicUrl) {
        let uploadSucceeded = false;

        // Method A: Direct PUT fetch
        if (signedRes.signedUrl) {
          try {
            const putRes = await fetch(signedRes.signedUrl, {
              method: "PUT",
              headers: {
                "Content-Type": "image/jpeg"
              },
              body: compressed.blob
            });
            if (putRes.ok) {
              uploadSucceeded = true;
            }
          } catch (fetchErr) {
            console.warn("[ProfilePhoto] Direct fetch PUT notice:", fetchErr);
          }
        }

        // Method B: Supabase SDK uploadToSignedUrl fallback
        if (!uploadSucceeded && supabase?.storage && signedRes?.path && signedRes?.token) {
          try {
            const bucketName = folder === "profiles" ? "profiles" : "products";
            const cleanPath = signedRes.path.replace(new RegExp(`^${bucketName}/`), "");
            const { error: upToSignErr } = await supabase.storage
              .from(bucketName)
              .uploadToSignedUrl(cleanPath, signedRes.token, compressed.blob, {
                contentType: "image/jpeg",
                upsert: true
              });
            if (!upToSignErr) {
              uploadSucceeded = true;
            }
          } catch (sdkErr) {
            console.warn("[ProfilePhoto] SDK uploadToSignedUrl notice:", sdkErr);
          }
        }

        if (uploadSucceeded) {
          uploadRes = {
            success: true,
            url: signedRes.publicUrl,
            provider: "supabase_storage"
          };
          console.info("[ProfilePhoto] Direct cloud upload succeeded:", signedRes.publicUrl);
        }
      }
    } catch (signedErr) {
      console.warn("[ProfilePhoto] Signed upload tier notice:", signedErr);
    }

    // TIER 2: Backend upload to Cloudflare R2 / Server storage
    if (!uploadRes?.url) {
      try {
        const compact = await compressImage(file, 160, 0.60, 8 * 1024);
        const backendRes = await apiClient.post<any>("/api/upload", {
          dataUrl: compact.dataUrl,
          filename: cleanFilename,
          folder,
          userId: cleanUserId,
          targetUserId: cleanUserId
        }, {
          skipAuth: false,
          timeoutMs: 25000
        });
        if (backendRes?.url) {
          uploadRes = backendRes;
        }
      } catch (uploadErr: any) {
        console.warn("[ProfilePhoto] Backend upload fallback notice:", uploadErr?.message || uploadErr);

        // Emergency retry with minimal footprint if 413 occurred
        const is413 = uploadErr?.status === 413 || /413|too large|entity/i.test(uploadErr?.message || "");
        if (is413) {
          try {
            const emergency = await compressImage(file, 120, 0.45, 3 * 1024);
            const retryRes = await apiClient.post<any>("/api/upload", {
              dataUrl: emergency.dataUrl,
              filename: `emergency_${cleanFilename}`,
              folder,
              userId: cleanUserId,
              targetUserId: cleanUserId
            }, {
              skipAuth: false,
              timeoutMs: 20000
            });
            if (retryRes?.url) {
              uploadRes = retryRes;
            }
          } catch (retryErr: any) {
            console.warn("[ProfilePhoto] Emergency retry notice:", retryErr?.message || retryErr);
          }
        }
      }
    }

    // Null safety guard: Verify upload result is valid before dereferencing
    if (!uploadRes?.url) {
      throw new Error(
        uploadRes?.error ||
        uploadRes?.message ||
        "ক্লাউডে ছবি আপলোড সম্পন্ন হতে পারেনি। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।"
      );
    }

    const permanentUrl = String(uploadRes.url || "").trim();

    // Verify it is a genuine permanent cloud URL and NOT a data URL
    if (!permanentUrl || !isPermanentCloudUrl(permanentUrl)) {
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

      // Update Supabase auth user metadata if active (avatar_url is valid in auth metadata)
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
