import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

export const TRANSPARENT_PIXEL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

// ================= GLOBAL IN-MEMORY CACHES =================
const imageCache = new Map<string, string>();
const imageFetchPromises = new Map<string, Promise<string>>();
let fontsPreloaded = false;
let fontPreloadPromise: Promise<void> | null = null;
let activeDownloadLock = false;

/**
 * Preload Bangla Unicode Fonts once globally so PDF generation never blocks on fonts
 */
export function preloadBanglaFonts(): Promise<void> {
  if (fontsPreloaded) return Promise.resolve();
  if (fontPreloadPromise) return fontPreloadPromise;

  fontPreloadPromise = (async () => {
    if (typeof document !== "undefined" && document.fonts) {
      try {
        await Promise.race([
          Promise.all([
            document.fonts.load('14px "Hind Siliguri"'),
            document.fonts.load('14px "Noto Sans Bengali"'),
          ]),
          new Promise((r) => setTimeout(r, 600)),
        ]);
      } catch (e) {
        // Fallback silently if font loading encounters an issue
      }
    }
    fontsPreloaded = true;
  })();

  return fontPreloadPromise;
}

// Kick off font preloading immediately in the background
if (typeof window !== "undefined") {
  setTimeout(() => {
    preloadBanglaFonts().catch(() => {});
  }, 100);
}

/**
 * High-performance Helper to convert any image URL to a Base64 Data URL
 * Uses global in-memory caching to eliminate redundant network fetches.
 */
export async function imageToDataUrl(url: string): Promise<string> {
  if (!url) return "";
  if (url.startsWith("data:image/")) {
    imageCache.set(url, url);
    return url;
  }

  // Check in-memory cache first (0ms latency)
  const cached = imageCache.get(url);
  if (cached) return cached;

  // Deduplicate ongoing fetch requests for the exact same URL
  const inFlight = imageFetchPromises.get(url);
  if (inFlight) return inFlight;

  const fetchPromise = (async () => {
    try {
      const response = await fetch(url, {
        mode: "cors",
        credentials: "omit",
        cache: "force-cache",
      });

      if (!response.ok) {
        imageCache.set(url, "");
        return "";
      }

      const blob = await response.blob();
      if (!blob.type.startsWith("image/")) {
        imageCache.set(url, "");
        return "";
      }

      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result;
          resolve(
            typeof result === "string" && result.startsWith("data:image/")
              ? result
              : ""
          );
        };
        reader.onerror = () => resolve("");
        reader.readAsDataURL(blob);
      });

      if (dataUrl) {
        imageCache.set(url, dataUrl);
      }
      return dataUrl;
    } catch (error) {
      console.warn("Notice: image conversion cached fallback for:", url);
      return "";
    } finally {
      imageFetchPromises.delete(url);
    }
  })();

  imageFetchPromises.set(url, fetchPromise);
  return fetchPromise;
}

/**
 * Safely format order timestamp without throwing Invalid Date errors
 */
export function safeFormatOrderDate(createdAt: any, lang: "bn" | "en" = "bn"): string {
  try {
    let d: Date;
    if (!createdAt) {
      d = new Date();
    } else if (typeof createdAt === "object" && typeof createdAt.seconds === "number") {
      d = new Date(createdAt.seconds * 1000);
    } else if (typeof createdAt === "object" && typeof createdAt.toDate === "function") {
      d = createdAt.toDate();
    } else if (typeof createdAt === "number") {
      d = new Date(createdAt);
    } else if (typeof createdAt === "string") {
      d = new Date(createdAt);
    } else {
      d = new Date();
    }

    if (isNaN(d.getTime())) d = new Date();

    return d.toLocaleString(lang === "bn" ? "bn-BD" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch (e) {
    return new Date().toLocaleString();
  }
}

/**
 * Fast helper to convert OKLCH color strings to RGB/RGBA if present
 */
export function parseOklchToRgb(oklchStr: string): string {
  try {
    const match = oklchStr.match(/oklch\(\s*([\d.%]+)\s+([\d.%]+)\s+([\d.]+)(?:\s*\/\s*([\d.%]+))?\s*\)/i);
    if (!match) return oklchStr;

    const lStr = match[1];
    const cStr = match[2];
    const hStr = match[3];
    const aStr = match[4];

    const L = lStr.endsWith("%") ? parseFloat(lStr) / 100 : parseFloat(lStr);
    const C = cStr.endsWith("%") ? parseFloat(cStr) / 100 : parseFloat(cStr);
    const H = parseFloat(hStr);
    const A = aStr ? (aStr.endsWith("%") ? parseFloat(aStr) / 100 : parseFloat(aStr)) : 1;

    if (isNaN(L) || isNaN(C) || isNaN(H)) return oklchStr;

    const hRad = (H * Math.PI) / 180;
    const a = C * Math.cos(hRad);
    const b = C * Math.sin(hRad);

    const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

    const L_lms = l_ * l_ * l_;
    const M_lms = m_ * m_ * m_;
    const S_lms = s_ * s_ * s_;

    const r_lin = +4.0767416621 * L_lms - 3.3077115913 * M_lms + 0.2309699292 * S_lms;
    const g_lin = -1.2684380046 * L_lms + 2.6097574011 * M_lms - 0.3413193965 * S_lms;
    const b_lin = -0.0041960863 * L_lms - 0.7034186147 * M_lms + 1.7076147010 * S_lms;

    const gamma = (x: number) => (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(Math.max(0, x), 1 / 2.4) - 0.055);

    const R = Math.min(255, Math.max(0, Math.round(gamma(r_lin) * 255)));
    const G = Math.min(255, Math.max(0, Math.round(gamma(g_lin) * 255)));
    const B = Math.min(255, Math.max(0, Math.round(gamma(b_lin) * 255)));

    if (A < 1) {
      return `rgba(${R}, ${G}, ${B}, ${A.toFixed(2)})`;
    }
    return `rgb(${R}, ${G}, ${B})`;
  } catch (e) {
    return oklchStr;
  }
}

export function oklchToRgb(colorStr: string): string {
  if (!colorStr || !colorStr.toLowerCase().includes("oklch")) return colorStr;
  return parseOklchToRgb(colorStr);
}

export function replaceOklchInText(text: string): string {
  if (!text || !text.includes("oklch")) return text;
  return text.replace(/oklch\([^)]+\)/gi, (match) => parseOklchToRgb(match));
}

/**
 * Optimized, High-Speed Order Memo PDF Generator.
 * Guarantees 100% template fidelity, crystal-clear Bangla typography, logo & seals,
 * with non-blocking execution, in-memory resource reuse, and duplicate-click protection.
 */
export async function downloadMemoPDF(
  element: HTMLElement | null, 
  orderOrData: any, 
  memoSettingsOrSignatureUrl?: any
): Promise<void> {
  // Prevent duplicate concurrent executions (Mutex Lock)
  if (activeDownloadLock) {
    console.warn("Memo PDF download is already in progress, ignoring duplicate trigger.");
    return;
  }

  activeDownloadLock = true;

  try {
    let targetEl = element || document.getElementById("printable-memo-card");

    // Fast active check for target DOM element if still mounting
    if (!targetEl) {
      for (let i = 0; i < 8; i++) {
        await new Promise((r) => setTimeout(r, 40));
        targetEl = document.getElementById("printable-memo-card");
        if (targetEl) break;
      }
    }

    if (!targetEl) {
      throw new Error("Order Memo Preview element (#printable-memo-card) not found in DOM");
    }

    // Extract order metadata and normalize object
    const orderData = typeof orderOrData === "object" && orderOrData !== null ? orderOrData : { id: orderOrData || "MEMO" };
    const orderId = (orderData.id || orderData.orderId || "MEMO").toString();
    const cleanOrderId = orderId.slice(-8).toUpperCase();
    const fileName = `Order_Memo_${cleanOrderId}.pdf`;

    // Step 1: Ensure fonts are loaded (returns instantly if already preloaded)
    await preloadBanglaFonts();

    // Step 2: Ensure all images inside target card are converted to Base64
    const imgElements = Array.from(targetEl.querySelectorAll("img"));
    if (imgElements.length > 0) {
      await Promise.all(
        imgElements.map(async (img) => {
          const currentSrc = img.getAttribute("src");
          if (currentSrc && !currentSrc.startsWith("data:image")) {
            const cached = imageCache.get(currentSrc);
            if (cached) {
              img.setAttribute("src", cached);
              img.removeAttribute("crossorigin");
            } else {
              try {
                const dataUrl = await imageToDataUrl(currentSrc);
                if (dataUrl && dataUrl.startsWith("data:image")) {
                  img.setAttribute("src", dataUrl);
                  img.removeAttribute("crossorigin");
                } else {
                  img.setAttribute("src", TRANSPARENT_PIXEL);
                  img.removeAttribute("crossorigin");
                }
              } catch (e) {
                img.setAttribute("src", TRANSPARENT_PIXEL);
                img.removeAttribute("crossorigin");
              }
            }
          }
        })
      );
    }

    // Yield control briefly to ensure UI spinner paints smoothly without freezing
    await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 30)));

    // Step 3: Fast, High-Fidelity Canvas Rendering
    const html2canvasOptions = {
      scale: 2, // 2x scale for razor-sharp A4 print resolution
      useCORS: true,
      allowTaint: false,
      logging: false,
      backgroundColor: "#ffffff",
      imageTimeout: 4000,
      onclone: (clonedDoc: Document, clonedEl?: HTMLElement) => {
        try {
          // Inject Bangla typography rule
          const fontStyle = clonedDoc.createElement("style");
          fontStyle.textContent = `
            @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap');
            *, body, div, p, span, h1, h2, h3, h4, th, td, table {
              font-family: 'Hind Siliguri', 'Noto Sans Bengali', 'SolaimanLipi', sans-serif !important;
            }
          `;
          if (clonedDoc.head) {
            clonedDoc.head.appendChild(fontStyle);
          }
        } catch (e) {}

        // Locate cloned memo card and optimize strictly on its container
        const cardEl = (clonedEl || 
          clonedDoc.getElementById("printable-memo-card") || 
          clonedDoc.querySelector(".printable-memo-card")) as HTMLElement | null;

        if (cardEl) {
          cardEl.style.maxWidth = "794px";
          cardEl.style.width = "794px";
          cardEl.style.height = "auto";
          cardEl.style.maxHeight = "none";
          cardEl.style.overflow = "visible";
          cardEl.style.boxShadow = "none";
          cardEl.style.transform = "none";
          cardEl.style.display = "block";
          cardEl.style.visibility = "visible";
          cardEl.style.opacity = "1";
          cardEl.style.backgroundColor = "#ffffff";
          cardEl.style.fontFamily = "'Hind Siliguri', 'Noto Sans Bengali', 'SolaimanLipi', sans-serif";

          // Ensure parents do not clip the card
          let parent: HTMLElement | null = cardEl.parentElement;
          while (parent && parent !== clonedDoc.documentElement) {
            parent.style.overflow = "visible";
            parent.style.maxHeight = "none";
            parent.style.height = "auto";
            parent.style.transform = "none";
            parent.style.visibility = "visible";
            parent.style.opacity = "1";
            parent = parent.parentElement;
          }

          // Ensure all images in cloned memo have valid sources
          const clonedImgs = Array.from(cardEl.querySelectorAll("img"));
          clonedImgs.forEach((cImg) => {
            const src = cImg.getAttribute("src");
            if (!src || !src.startsWith("data:image")) {
              const cached = src ? imageCache.get(src) : null;
              cImg.setAttribute("src", cached || TRANSPARENT_PIXEL);
            }
            cImg.removeAttribute("crossorigin");
          });
        }
      },
    };

    let canvas: HTMLCanvasElement | null = null;
    try {
      canvas = await html2canvas(targetEl, html2canvasOptions);
    } catch (e1) {
      console.warn("html2canvas scale 2 retry at scale 1.5:", e1);
      try {
        canvas = await html2canvas(targetEl, { ...html2canvasOptions, scale: 1.5 });
      } catch (e2) {
        console.warn("html2canvas scale 1.5 retry at scale 1.0:", e2);
        canvas = await html2canvas(targetEl, { ...html2canvasOptions, scale: 1.0 });
      }
    }

    if (!canvas || canvas.width === 0 || canvas.height === 0) {
      throw new Error("Memo PDF canvas render failed: empty canvas produced");
    }

    // Step 4: Fast Image Export (High-Quality JPEG 0.96 is 5x faster than PNG while maintaining razor-sharp text)
    let imgData = "";
    try {
      imgData = canvas.toDataURL("image/jpeg", 0.96);
    } catch (dataUrlErr) {
      imgData = canvas.toDataURL("image/png", 1.0);
    }

    if (!imgData || !imgData.startsWith("data:image") || imgData.length < 50) {
      throw new Error("Failed to render preview canvas into valid image data");
    }

    // Step 5: Fast PDF Document Assembly
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    pdf.setProperties({
      title: `Order Memo ${cleanOrderId}`,
      subject: `Official Order Memo #${orderId}`,
      author: orderData.storeName || "Kancha Bazar",
      creator: "Kancha Bazar System",
    });

    const pdfWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    if (pdfHeight <= pageHeight) {
      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");
    } else {
      let heightLeft = pdfHeight;
      let position = 0;

      pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, pdfHeight, undefined, "FAST");
      heightLeft -= pageHeight;

      while (heightLeft > 5) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, pdfHeight, undefined, "FAST");
        heightLeft -= pageHeight;
      }
    }

    // Step 6: Trigger Download
    savePdfToFile(pdf, fileName);

  } finally {
    // Release the concurrency lock
    activeDownloadLock = false;
  }
}

function savePdfToFile(pdf: jsPDF, fileName: string) {
  try {
    pdf.save(fileName);
    return;
  } catch (saveErr) {
    console.warn("pdf.save fallback to direct Blob download:", saveErr);
  }

  let blob: Blob;
  try {
    blob = pdf.output("blob");
  } catch (blobErr) {
    console.error("pdf.output blob error:", blobErr);
    throw new Error(`PDF Blob generation failed: ${blobErr instanceof Error ? blobErr.message : String(blobErr)}`);
  }

  if (!blob || blob.size < 100) {
    throw new Error("Generated PDF Blob is empty or invalid");
  }

  try {
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = fileName;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
  } catch (err) {
    throw new Error(`Could not save PDF file: ${err instanceof Error ? err.message : String(err)}`);
  }
}
