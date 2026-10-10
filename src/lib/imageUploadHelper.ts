import { storage, ref, uploadBytes, getDownloadURL } from "./firebase";
import { apiClient } from "./apiClient";

export interface UploadImageOptions {
  folder?: string;
  maxDimension?: number;
  quality?: number;
}

/**
 * Compresses an image file in browser using canvas
 */
export async function compressImage(file: File, maxDim = 1200, quality = 0.85): Promise<{ blob: Blob; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

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
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return reject(new Error("Canvas context unavailable"));
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve({ blob, dataUrl });
            } else {
              resolve({ blob: file, dataUrl });
            }
          },
          "image/jpeg",
          quality
        );
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Universal Image Uploader with 4-Tier Fallback:
 * 1. Cloudinary (using user's configured/active cloud 'upvkzb3p' and preset 'k0x8mjmx')
 * 2. Firebase Storage (if available)
 * 3. Server Upload endpoint (/api/upload)
 * 4. High-efficiency Base64 Data URL
 */
export async function uploadImageWithFallback(file: File, options: UploadImageOptions = {}): Promise<string> {
  const folder = options.folder || "products";
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "upvkzb3p";
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "k0x8mjmx";

  // Pre-compress image for fast upload and lower bandwidth
  let compressedDataUrl = "";
  let compressedBlob: Blob = file;

  try {
    const compressed = await compressImage(file, options.maxDimension || 1200, options.quality || 0.85);
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
    }, { skipAuth: true, timeoutMs: 25000 });

    if (data?.url) {
      return data.url;
    }
  } catch (r2Err) {
    console.warn("Cloudflare R2 tier notice, attempting Cloudinary fallback:", r2Err);
  }

  // TIER 2: Cloudinary Fallback
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

  // TIER 3: Firebase Storage Fallback (Protected with 10s timeout)
  try {
    if (storage) {
      const filename = `${folder}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const storageRef = ref(storage, filename);
      
      const uploadPromise = (async () => {
        const snap = await uploadBytes(storageRef, compressedBlob, {
          contentType: file.type || "image/jpeg"
        });
        return await getDownloadURL(snap.ref);
      })();

      const timeoutPromise = new Promise<string>((_, reject) => 
        setTimeout(() => reject(new Error("Firebase Storage upload timed out")), 10000)
      );

      const downloadUrl = await Promise.race([uploadPromise, timeoutPromise]);
      if (downloadUrl) {
        return downloadUrl;
      }
    }
  } catch (fsErr) {
    // Graceful fallback to base64
  }

  // TIER 4: High-efficiency Base64 Data URL Fallback
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
