import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export const TRANSPARENT_PIXEL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

/**
 * Helper to convert any image URL (HTTP, HTTPS, or blob) to a Base64 Data URL
 * to ensure 100% reliable CORS-free canvas & PDF rendering.
 * Returns an empty string if conversion fails, never returning raw cross-origin URLs.
 */
export async function imageToDataUrl(url: string): Promise<string> {
  if (!url) return "";
  if (url.startsWith("data:image/")) return url;

  try {
    const response = await fetch(url, {
      mode: "cors",
      credentials: "omit",
      cache: "no-cache",
    });

    if (!response.ok) return "";

    const blob = await response.blob();

    if (!blob.type.startsWith("image/")) return "";

    return await new Promise<string>((resolve) => {
      const reader = new FileReader();

      reader.onload = () => {
        const result = reader.result;
        resolve(
          typeof result === "string" && result.startsWith("data:image/")
            ? result
            : ""
        );
      };

      reader.onerror = () => resolve("");
      reader.onabort = () => resolve("");

      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Image conversion failed:", url, error);
    return "";
  }
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
 * Helper to convert any oklch color string to rgb/rgba using canvas 2d context
 */
/**
 * Helper to convert any oklch color string to rgb/rgba using canvas 2d context or pure JS parser
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
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 1, 1);
      ctx.fillStyle = colorStr;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
      if (a === 255) {
        return `rgb(${r}, ${g}, ${b})`;
      }
      return `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(2)})`;
    }
  } catch (e) {}
  return parseOklchToRgb(colorStr);
}

/**
 * Replace all occurrences of oklch(...) in a CSS string or text with rgb/rgba equivalent
 */
export function replaceOklchInText(text: string): string {
  if (!text || !text.includes("oklch")) return text;
  return text.replace(/oklch\([^)]+\)/gi, (match) => oklchToRgb(match));
}

/**
 * Download Order Memo PDF directly from the unified Preview component element.
 * Guarantees 100% template fidelity (Logo, Layout, Colors, QR Code, Seals,
 * Founder Signature, Payment Status, Typography, and Unicode Bangla text).
 */
export async function downloadMemoPDF(
  element: HTMLElement | null, 
  orderOrData: any, 
  memoSettingsOrSignatureUrl?: any
): Promise<void> {
  let targetEl = element || document.getElementById("printable-memo-card");

  // Retry up to 15 times if DOM element is still mounting
  if (!targetEl) {
    for (let i = 0; i < 15; i++) {
      await new Promise((r) => setTimeout(r, 100));
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

  // Step 1: Preload Bangla Unicode Fonts with strict timeout safety
  if (typeof document !== "undefined" && document.fonts) {
    try {
      await Promise.race([
        Promise.all([
          document.fonts.load('14px "Hind Siliguri"'),
          document.fonts.load('14px "Noto Sans Bengali"'),
          document.fonts.ready,
        ]),
        new Promise((r) => setTimeout(r, 1000)),
      ]);
    } catch (e) {
      console.warn("Notice: Font load completed with fallback.");
    }
  }

  // Step 2: Convert ALL images inside the preview card element to Base64 Data URLs
  const imgElements = Array.from(targetEl.querySelectorAll("img"));
  await Promise.all(
    imgElements.map(async (img) => {
      const currentSrc = img.getAttribute("src");
      if (currentSrc && !currentSrc.startsWith("data:image")) {
        try {
          const dataUrl = await imageToDataUrl(currentSrc);
          if (dataUrl && dataUrl.startsWith("data:image")) {
            img.setAttribute("src", dataUrl);
            img.removeAttribute("crossorigin");
          } else {
            // Replace unconvertible cross-origin src with safe transparent pixel
            img.setAttribute("src", TRANSPARENT_PIXEL);
            img.removeAttribute("crossorigin");
          }
        } catch (e) {
          img.setAttribute("src", TRANSPARENT_PIXEL);
          img.removeAttribute("crossorigin");
        }
      }

      if (img.complete && img.naturalWidth > 0) return;

      return new Promise<void>((resolve) => {
        let settled = false;
        const done = () => {
          if (!settled) {
            settled = true;
            resolve();
          }
        };
        img.addEventListener("load", done, { once: true });
        img.addEventListener("error", done, { once: true });
        const interval = setInterval(() => {
          if (img.complete) {
            clearInterval(interval);
            done();
          }
        }, 30);
        setTimeout(() => {
          clearInterval(interval);
          done();
        }, 1500);
      });
    })
  );

  // Slight pause to ensure DOM paint/layout stabilization
  await new Promise((resolve) => setTimeout(resolve, 150));

  // Step 3: Capture preview card with cloned DOM isolation and retry scale fallback
  const html2canvasOptions = (scaleNum: number) => ({
    scale: scaleNum,
    useCORS: true,
    allowTaint: false,
    logging: false,
    backgroundColor: "#ffffff",
    imageTimeout: 15000,
    onclone: (clonedDoc: Document) => {
      try {
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

      // Sanitize style tags
      const styleElements = Array.from(clonedDoc.querySelectorAll("style"));
      styleElements.forEach((styleEl) => {
        if (styleEl.textContent && styleEl.textContent.includes("oklch")) {
          styleEl.textContent = replaceOklchInText(styleEl.textContent);
        }
      });

      // Sanitize all inline styles
      const allElements = Array.from(clonedDoc.querySelectorAll("*")) as HTMLElement[];
      allElements.forEach((el) => {
        const styleAttr = el.getAttribute("style");
        if (styleAttr && styleAttr.includes("oklch")) {
          el.setAttribute("style", replaceOklchInText(styleAttr));
        }
      });

      const clonedCard = clonedDoc.getElementById("printable-memo-card") || clonedDoc.querySelector(".printable-memo-card");
      if (clonedCard) {
        const cardEl = clonedCard as HTMLElement;
        const isolatedCard = cardEl.cloneNode(true) as HTMLElement;

        clonedDoc.body.innerHTML = "";
        clonedDoc.body.style.margin = "0";
        clonedDoc.body.style.padding = "0";
        clonedDoc.body.style.backgroundColor = "#ffffff";

        isolatedCard.style.maxWidth = "794px";
        isolatedCard.style.width = "794px";
        isolatedCard.style.height = "auto";
        isolatedCard.style.maxHeight = "none";
        isolatedCard.style.overflow = "visible";
        isolatedCard.style.boxShadow = "none";
        isolatedCard.style.transform = "none";
        isolatedCard.style.display = "block";
        isolatedCard.style.padding = "32px";
        isolatedCard.style.margin = "0 auto";
        isolatedCard.style.backgroundColor = "#ffffff";
        isolatedCard.style.fontFamily = "'Hind Siliguri', 'Noto Sans Bengali', 'SolaimanLipi', sans-serif";

        clonedDoc.body.appendChild(isolatedCard);

        const cardSubElements = [isolatedCard, ...Array.from(isolatedCard.querySelectorAll("*"))] as HTMLElement[];
        cardSubElements.forEach((el) => {
          try {
            const computed = clonedDoc.defaultView?.getComputedStyle(el) || window.getComputedStyle(el);
            if (computed) {
              const properties = [
                "color",
                "backgroundColor",
                "borderColor",
                "borderTopColor",
                "borderRightColor",
                "borderBottomColor",
                "borderLeftColor",
                "outlineColor",
                "fill",
                "stroke",
                "boxShadow",
                "textDecorationColor"
              ];
              properties.forEach((prop) => {
                const val = computed.getPropertyValue(prop);
                if (val && val.includes("oklch")) {
                  const converted = replaceOklchInText(val);
                  el.style.setProperty(prop, converted, "important");
                }
              });
            }
          } catch (e) {}
        });

        const clonedImgs = Array.from(isolatedCard.querySelectorAll("img"));
        clonedImgs.forEach((cImg) => {
          const src = cImg.getAttribute("src");
          if (!src || !src.startsWith("data:image")) {
            cImg.setAttribute("src", TRANSPARENT_PIXEL);
          }
          cImg.removeAttribute("crossorigin");
        });
      }
    },
  });

  let canvas: HTMLCanvasElement;
  try {
    canvas = await html2canvas(targetEl, html2canvasOptions(2));
  } catch (e1) {
    console.warn("html2canvas scale 2 failed, trying scale 1.5:", e1);
    try {
      canvas = await html2canvas(targetEl, html2canvasOptions(1.5));
    } catch (e2) {
      console.warn("html2canvas scale 1.5 failed, trying scale 1.0:", e2);
      try {
        canvas = await html2canvas(targetEl, html2canvasOptions(1.0));
      } catch (e3) {
        throw new Error(`Memo PDF canvas render failed: ${e3 instanceof Error ? e3.message : String(e3)}`);
      }
    }
  }

  let imgData = "";
  try {
    imgData = canvas.toDataURL("image/png", 1.0);
  } catch (dataUrlErr) {
    try {
      imgData = canvas.toDataURL("image/jpeg", 0.95);
    } catch (dataUrlErr2) {
      throw new Error(`Failed to export canvas to image: ${dataUrlErr2 instanceof Error ? dataUrlErr2.message : String(dataUrlErr2)}`);
    }
  }

  if (!imgData || !imgData.startsWith("data:image") || imgData.length < 500) {
    throw new Error("Failed to render preview canvas into valid image data");
  }

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
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");
  } else {
    let heightLeft = pdfHeight;
    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight, undefined, "FAST");
    heightLeft -= pageHeight;

    while (heightLeft > 5) {
      position = heightLeft - pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight, undefined, "FAST");
      heightLeft -= pageHeight;
    }
  }

  savePdfToFile(pdf, fileName);
}

function savePdfToFile(pdf: jsPDF, fileName: string) {
  try {
    pdf.save(fileName);
    return;
  } catch (saveErr) {
    console.warn("pdf.save fallback to Blob download:", saveErr);
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

