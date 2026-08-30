/**
 * Dedicated Native Browser Print Utility for Order Memos
 * Bypasses iframe sandbox print restrictions by rendering into a dedicated print document/window.
 */

let activePrintLock = false;

export interface PrintMemoOptions {
  orderId?: string;
  storeName?: string;
  lang?: "bn" | "en";
  onPopupBlocked?: () => void;
}

export async function printOrderMemo(
  memoElement: HTMLElement,
  options: PrintMemoOptions = {}
): Promise<boolean> {
  if (!memoElement || activePrintLock) return false;
  activePrintLock = true;

  const orderTitle = options.orderId 
    ? `Memo_${options.orderId.toUpperCase()}` 
    : "Order_Memo";
  const storeName = options.storeName || "KachaBazar Store";

  try {
    // Open a clean, standalone print window
    const printWindow = window.open("", "_blank", "width=850,height=950,menubar=no,toolbar=no,location=no,status=no");

    if (!printWindow || printWindow.closed || typeof printWindow.closed === "undefined") {
      // Popup was blocked by browser
      activePrintLock = false;
      if (options.onPopupBlocked) {
        options.onPopupBlocked();
      } else {
        // Fallback: try local iframe print
        try {
          window.focus();
          window.print();
        } catch (e) {
          console.warn("Local print fallback blocked:", e);
        }
      }
      return false;
    }

    // Collect all stylesheets and style tags from current document
    let styleTagsHtml = "";
    document.querySelectorAll("style, link[rel='stylesheet']").forEach((node) => {
      styleTagsHtml += node.outerHTML + "\n";
    });

    // Extract Memo HTML
    const memoHtml = memoElement.outerHTML;

    // Construct isolated print document with A4 specifications & Bengali Unicode typography
    const printDocContent = `<!DOCTYPE html>
<html lang="${options.lang === 'bn' ? 'bn' : 'en'}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${orderTitle} - ${storeName}</title>
  
  <!-- Preconnect and Google Fonts for flawless Unicode Bangla Typography -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Hind+Siliguri:wght@400;500;600;700&family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap" rel="stylesheet">
  
  ${styleTagsHtml}

  <style>
    @page {
      size: A4 portrait;
      margin: 8mm;
    }

    *, *::before, *::after {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }

    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff !important;
      color: #0f172a !important;
      font-family: 'Hind Siliguri', 'Noto Sans Bengali', 'SolaimanLipi', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      width: 100%;
      height: auto;
      overflow: visible;
    }

    body {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      padding: 16px;
      background-color: #f8fafc;
    }

    .print-wrapper {
      width: 100%;
      max-width: 650px;
      margin: 0 auto;
      background: #ffffff;
    }

    .printable-memo-card {
      width: 100% !important;
      max-width: 100% !important;
      margin: 0 auto !important;
      box-shadow: none !important;
      border: 1px solid #cbd5e1 !important;
      border-radius: 16px !important;
      background: #ffffff !important;
      padding: 24px !important;
    }

    /* Print media overrides */
    @media print {
      body {
        padding: 0 !important;
        background: #ffffff !important;
      }
      .print-wrapper {
        max-width: 100% !important;
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .printable-memo-card {
        border: 1px solid #cbd5e1 !important;
        border-radius: 8px !important;
        padding: 18px !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .no-print, button, nav, header, footer {
        display: none !important;
        visibility: hidden !important;
      }
    }
  </style>
</head>
<body>
  <div class="print-wrapper">
    ${memoHtml}
  </div>

  <script>
    // Wait for all images & fonts to load before triggering native print
    (async function() {
      try {
        const images = Array.from(document.images);
        await Promise.all(images.map(img => {
          if (img.complete) return Promise.resolve();
          return new Promise(resolve => {
            img.onload = resolve;
            img.onerror = resolve;
            setTimeout(resolve, 800);
          });
        }));

        if (document.fonts && document.fonts.ready) {
          await document.fonts.ready;
        }
      } catch (e) {
        console.warn("Asset load check warning:", e);
      }

      // Small tick for layout stabilization
      setTimeout(function() {
        try {
          window.focus();
          window.print();
        } catch(err) {
          console.error("Print invocation error:", err);
        }
      }, 100);

      // Auto close when user completes or cancels print
      window.onafterprint = function() {
        try {
          window.close();
        } catch(e) {}
      };
    })();
  </script>
</body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(printDocContent);
    printWindow.document.close();

    return true;
  } catch (err) {
    console.error("Error opening dedicated print window:", err);
    // Fallback
    try {
      window.focus();
      window.print();
    } catch (e) {}
    return false;
  } finally {
    setTimeout(() => {
      activePrintLock = false;
    }, 600);
  }
}
