import { apiClient } from "./apiClient";

export interface UploadImageOptions {
  folder?: string;
  maxDimension?: number;
  quality?: number;
  maxBytes?: number;
}

export interface CompressOptions {
  maxDimension?: number;
  quality?: number;
  maxBytes?: number;
}

/**
 * Universal client-side image compression with iterative byte-budget enforcement.
 * Ensures output is always well within Google Front End / Cloud Run proxy limits (< 300KB).
 */
export async function compressImage(
  file: File,
  maxDimOrOptions: number | CompressOptions = 800,
  initialQuality = 0.78,
  maxBytesBudget = 240 * 1024
): Promise<{ blob: Blob; dataUrl: string }> {
  let targetMaxDim = typeof maxDimOrOptions === "number" ? maxDimOrOptions : (maxDimOrOptions.maxDimension || 800);
  let currentQuality = typeof maxDimOrOptions === "object" && maxDimOrOptions.quality !== undefined ? maxDimOrOptions.quality : initialQuality;
  const targetMaxBytes = typeof maxDimOrOptions === "object" && maxDimOrOptions.maxBytes !== undefined ? maxDimOrOptions.maxBytes : maxBytesBudget;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("ছবির ফাইল পড়তে ব্যর্থ হয়েছে।"));
    reader.onload = () => {
      const rawData = reader.result as string;
      const img = new Image();
      img.onerror = () => reject(new Error("ছবির ফরম্যাট সমর্থন করে না বা ফাইলটি ক্ষতিগ্রস্ত।"));
      img.onload = () => {
        try {
          const originalWidth = img.width || 400;
          const originalHeight = img.height || 400;

          // Helper to render on canvas at specific scale and quality
          const renderCanvas = (dim: number, q: number): string => {
            let width = originalWidth;
            let height = originalHeight;

            if (width > height) {
              if (width > dim) {
                height = Math.max(1, Math.round((height * dim) / width));
                width = dim;
              }
            } else {
              if (height > dim) {
                width = Math.max(1, Math.round((width * dim) / height));
                height = dim;
              }
            }

            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d", { willReadFrequently: false });
            if (!ctx) {
              throw new Error("ক্যানভাস ইনিশিয়ালাইজ করা যায়নি।");
            }

            // Fill neutral background so transparent PNGs don't produce black background
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);

            return canvas.toDataURL("image/jpeg", Math.min(0.92, Math.max(0.3, q)));
          };

          // Pass 1: Initial compression
          let outDataUrl = renderCanvas(targetMaxDim, currentQuality);
          const maxAllowedChars = Math.round(targetMaxBytes * 1.33);

          // Iterative reduction passes until payload strictly satisfies budget
          let pass = 0;
          while (outDataUrl.length > maxAllowedChars && pass < 7) {
            pass++;
            targetMaxDim = Math.max(96, Math.round(targetMaxDim * 0.72));
            currentQuality = Math.max(0.30, currentQuality - 0.12);
            outDataUrl = renderCanvas(targetMaxDim, currentQuality);
          }

          // Convert final dataUrl to Blob
          const byteString = atob(outDataUrl.split(",")[1]);
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
          }
          const finalBlob = new Blob([ab], { type: "image/jpeg" });

          resolve({ blob: finalBlob, dataUrl: outDataUrl });
        } catch (canvasErr) {
          reject(canvasErr);
        }
      };
      img.src = rawData;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Universal Image Uploader with 4-Tier Fallback:
 * 1. Cloudinary (configured via VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET)
 * 2. Firebase Storage (if available)
 * 3. Server Upload endpoint (/api/upload)
 * 4. High-efficiency Base64 Data URL
 */
export async function uploadImageWithFallback(file: File, options: UploadImageOptions = {}): Promise<string> {
  const folder = options.folder || "products";
  const cloudName = (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "").trim();
  const uploadPreset = (import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "").trim();

  // Tier 0: Dynamic budget allocation based on target destination
  const isAvatar = folder === "profiles" || folder === "staff";
  const defaultMaxDim = isAvatar ? 160 : (options.maxDimension || 480);
  const defaultQuality = isAvatar ? 0.65 : (options.quality || 0.70);
  const maxBytes = isAvatar ? 12 * 1024 : (options.maxBytes || 28 * 1024);

  let compressedDataUrl = "";
  let compressedBlob: Blob = file;

  try {
    const compressed = await compressImage(file, defaultMaxDim, defaultQuality, maxBytes);
    compressedBlob = compressed.blob;
    compressedDataUrl = compressed.dataUrl;
  } catch (compErr) {
    console.warn("[ImageUpload] Compression warning:", compErr);
  }

  // TIER 1: Cloudflare R2 Object Storage
  if (compressedDataUrl) {
    try {
      const filename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const data = await apiClient.post<any>("/api/upload", {
        dataUrl: compressedDataUrl,
        filename,
        folder
      }, { skipAuth: false, timeoutMs: 25000 });

      if (data?.url) {
        return data.url;
      }
    } catch (r2Err: any) {
      console.warn("[ImageUpload] Primary upload attempt notice:", r2Err?.message || r2Err);

      // If status 413 (Entity Too Large), execute aggressive emergency compression (< 50KB) and retry once
      const is413 = r2Err?.status === 413 || /413|too large|entity/i.test(r2Err?.message || "");
      if (is413) {
        try {
          console.info("[ImageUpload] Performing emergency compression retry for 413 error...");
          const emergency = await compressImage(file, 240, 0.60, 45 * 1024);
          const retryFilename = `retry_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
          const retryData = await apiClient.post<any>("/api/upload", {
            dataUrl: emergency.dataUrl,
            filename: retryFilename,
            folder
          }, { skipAuth: false, timeoutMs: 20000 });

          if (retryData?.url) {
            return retryData.url;
          }
        } catch (retryErr) {
          console.warn("[ImageUpload] Emergency retry notice:", retryErr);
        }
      }
    }
  }

  // TIER 1.5: Direct-to-Cloud Signed Upload (Bypasses proxy limits)
  try {
    const filename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const signedRes = await apiClient.post<any>("/api/upload/signed-url", {
      folder,
      filename,
      contentType: "image/jpeg"
    }, { silent: true, timeoutMs: 10000 });

    if (signedRes?.success && signedRes?.signedUrl && signedRes?.publicUrl) {
      const putRes = await fetch(signedRes.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": "image/jpeg" },
        body: compressedBlob
      });
      if (putRes.ok) {
        return signedRes.publicUrl;
      }
    }
  } catch (signedErr) {
    console.warn("[ImageUpload] Signed URL tier notice:", signedErr);
  }

  // TIER 2: Cloudinary Fallback
  if (cloudName && uploadPreset) {
    try {
      const formData = new FormData();
      if (compressedDataUrl) {
        formData.append("file", compressedDataUrl);
      } else {
        formData.append("file", compressedBlob, file.name || "image.jpg");
      }
      formData.append("upload_preset", uploadPreset);
      if (folder) {
        formData.append("folder", folder);
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData,
        signal: controller.signal
      });
      clearTimeout(timer);

      if (res.ok) {
        const data = await res.json();
        if (data.secure_url) {
          return data.secure_url;
        }
      }
    } catch (cldErr) {
      // Graceful fallback to next tier
    }
  }

  // Profile and staff images must be permanent cloud URLs, never Base64
  if (folder === "profiles" || folder === "staff") {
    throw new Error("ক্লাউড স্টোরেজে ছবি আপলোড করা সম্ভব হয়নি। পূর্বের ছবিটি অপরিবর্তিত রাখা হয়েছে।");
  }

  // TIER 3: High-efficiency Base64 Data URL Fallback for other general images
  if (compressedDataUrl) {
    return compressedDataUrl;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("ছবির ফাইল পড়তে ব্যর্থ হয়েছে।"));
    reader.readAsDataURL(file);
  });
}
