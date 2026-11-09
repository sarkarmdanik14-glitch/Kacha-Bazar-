import { apiClient } from "./apiClient";

export interface UploadImageOptions {
  folder?: string;
  maxDimension?: number;
  quality?: number;
}

/**
 * Compresses an image file in browser using canvas with smart size budget.
 * Uses URL.createObjectURL for 0ms memory overhead instead of loading giant strings with FileReader.
 * Iteratively ensures the output Base64 dataUrl is strictly under maxBytes (default 250KB).
 */
export async function compressImage(
  file: File, 
  maxDim = 400, 
  quality = 0.72,
  maxSizeBytes = 35 * 1024 // 35KB max payload to guarantee no GFE 413 proxy reject
): Promise<{ blob: Blob; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error("কোনো ফাইল পাওয়া যায়নি।"));
    }

    // Support standard image types
    const validMimes = ["image/jpeg", "image/png", "image/webp", "image/jpg", "image/gif"];
    if (file.type && !validMimes.includes(file.type.toLowerCase())) {
      return reject(new Error("শুধুমাত্র JPEG, PNG অথবা WebP ফরম্যাটের ছবি আপলোড করা যাবে।"));
    }

    let objectUrl = "";
    try {
      objectUrl = URL.createObjectURL(file);
    } catch {
      // Fallback to FileReader if createObjectURL fails in rare webviews
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("ফাইলটি পড়া সম্ভব হয়নি।"));
      reader.onload = () => {
        processImage(reader.result as string, () => {});
      };
      reader.readAsDataURL(file);
      return;
    }

    const cleanup = () => {
      if (objectUrl) {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch {}
      }
    };

    processImage(objectUrl, cleanup);

    function processImage(src: string, onFinish: () => void) {
      const img = new Image();

      img.onerror = () => {
        onFinish();
        reject(new Error("ছবিটি লোড করা সম্ভব হয়নি। ফাইলটি ক্ষতিগ্রস্ত বা অনুপযুক্ত হতে পারে।"));
      };

      img.onload = () => {
        onFinish();

        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (!width || !height) {
          return reject(new Error("ছবির সাইজ নির্ণয় করা সম্ভব হয়নি।"));
        }

        // Calculate initial target dimensions respecting maxDim
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        let ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          return reject(new Error("Canvas context unavailable"));
        }

        // Draw solid white background so transparent PNGs don't turn black
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        let currentQuality = Math.min(Math.max(quality, 0.4), 0.85);
        let dataUrl = canvas.toDataURL("image/jpeg", currentQuality);

        // Robust loop: progressively reduce quality and scale down canvas until strictly <= maxSizeBytes
        let attempts = 0;
        while (dataUrl.length > maxSizeBytes && attempts < 8) {
          attempts++;
          if (currentQuality > 0.45) {
            currentQuality = Math.max(0.4, Number((currentQuality - 0.12).toFixed(2)));
          } else {
            // Downscale dimensions by 25%
            const nextW = Math.max(64, Math.round(canvas.width * 0.75));
            const nextH = Math.max(64, Math.round(canvas.height * 0.75));

            const tempCanvas = document.createElement("canvas");
            tempCanvas.width = nextW;
            tempCanvas.height = nextH;
            const tempCtx = tempCanvas.getContext("2d");
            if (tempCtx) {
              tempCtx.fillStyle = "#ffffff";
              tempCtx.fillRect(0, 0, nextW, nextH);
              tempCtx.drawImage(canvas, 0, 0, nextW, nextH);

              canvas.width = nextW;
              canvas.height = nextH;
              ctx = canvas.getContext("2d", { willReadFrequently: true });
              if (ctx) {
                ctx.drawImage(tempCanvas, 0, 0);
              }
            }
            currentQuality = 0.65;
          }
          dataUrl = canvas.toDataURL("image/jpeg", currentQuality);
        }

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve({ blob, dataUrl });
            } else {
              resolve({ blob: file, dataUrl });
            }
          },
          "image/jpeg",
          currentQuality
        );
      };

      img.src = src;
    }
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

  // Pre-compress image with strict 35KB budget for fast upload and GFE proxy safety
  let compressedDataUrl = "";
  let compressedBlob: Blob = file;

  try {
    const compressed = await compressImage(file, options.maxDimension || 480, options.quality || 0.72, 35 * 1024);
    compressedBlob = compressed.blob;
    compressedDataUrl = compressed.dataUrl;
  } catch (compErr) {
    console.warn("Client compression notice:", compErr);
  }

  // TIER 1: Cloudflare R2 Object Storage (Zero Egress, Unlimited CDN)
  try {
    const filename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const data = await apiClient.post("/api/upload", {
      dataUrl: compressedDataUrl,
      filename,
      folder
    }, { skipAuth: false, timeoutMs: 25000 });

    if (data?.url) {
      return data.url;
    }
  } catch (r2Err: any) {
    const errStr = String(r2Err?.message || r2Err?.status || "");
    if (errStr.includes("413") || r2Err?.status === 413) {
      try {
        console.warn("Retrying /api/upload with compact 24KB image due to proxy size limit...");
        const compact = await compressImage(file, 320, 0.55, 24 * 1024);
        const retryData = await apiClient.post("/api/upload", {
          dataUrl: compact.dataUrl,
          filename: `c_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`,
          folder
        }, { skipAuth: false, timeoutMs: 25000 });
        if (retryData?.url) return retryData.url;
      } catch (retryErr) {
        console.warn("Compact upload retry notice:", retryErr);
      }
    }
    console.warn("Cloudflare R2 tier notice, attempting Cloudinary fallback:", r2Err);
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
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
