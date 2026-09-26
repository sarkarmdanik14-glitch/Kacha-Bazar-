const MASTER_PRODUCT_IMAGE_MAP: Record<string, string> = {};

/**
 * Clean SVG data URI placeholder for products that fails safely without network requests
 */
export const SAFE_PRODUCT_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200' width='100%25' height='100%25'%3E%3Crect width='200' height='200' fill='%23f8fafc'/%3E%3Cg fill='none' stroke='%23cbd5e1' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M60 75 L140 75 L130 150 L70 150 Z' fill='%23f1f5f9'/%3E%3Cpath d='M80 75 C80 55 120 55 120 75' stroke='%2394a3b8'/%3E%3Ccircle cx='100' cy='112' r='14' stroke='%2310b981' fill='%23ecfdf5'/%3E%3Cpath d='M94 112 L98 116 L106 108' stroke='%2310b981' stroke-width='2'/%3E%3C/g%3E%3Ctext x='100' y='175' font-family='system-ui, sans-serif' font-size='11' font-weight='600' fill='%2394a3b8' text-anchor='middle'%3EKacha Bazar%3C/text%3E%3C/svg%3E";

/**
 * Universal safe image onError handler that prevents infinite error loops
 */
export function handleProductImgError(e: React.SyntheticEvent<HTMLImageElement, Event>) {
  const target = (e.currentTarget || e.target) as HTMLImageElement;
  if (!target) return;
  // Instantly break any recursion loop
  target.onerror = null;
  if (target.dataset.triedFallback === "true") return;
  target.dataset.triedFallback = "true";
  target.src = SAFE_PRODUCT_PLACEHOLDER;
}

/**
 * Reconnects a product to its authentic master image if candidate is missing or corrupted
 */
export function resolveAuthenticProductImage(productId: string | undefined | null, candidateImage: string | undefined | null): string {
  const current = (candidateImage || "").trim();

  // If candidate is a valid custom upload (e.g. Cloudinary, data:image, custom server/CDN), preserve untouched
  if (
    current.includes("cloudinary.com") || 
    current.includes("/uploads/") ||
    current.startsWith("data:image/") ||
    (current.startsWith("http") && !current.includes("images.unsplash.com/featured/"))
  ) {
    return current;
  }

  // If missing or corrupted with Unsplash /featured/ redirect, reconnect from master registry
  if (productId && MASTER_PRODUCT_IMAGE_MAP[productId]) {
    return MASTER_PRODUCT_IMAGE_MAP[productId];
  }

  return current || SAFE_PRODUCT_PLACEHOLDER;
}

export { MASTER_PRODUCT_IMAGE_MAP };

