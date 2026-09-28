import React from "react";
import { Product } from "../types";
import { ProductCard } from "./ProductCard";

export interface ProductSectionProps {
  title?: string;
  subtitle?: string;
  accentColorClass?: string;
  products: Product[];
  loading?: boolean;
  limit?: number;
  onToggleLimit?: () => void;
  lang: "bn" | "en";
  className?: string;
  showHeader?: boolean;
  // ProductCard action handlers
  fmtNum: (num: number | string) => string;
  wishlist: string[];
  toggleWishlist: (id: string) => void;
  cart: any[];
  addToCart: (product: Product, quantity?: number, showFeedback?: boolean, selectedOption?: any) => void;
  updateCartQuantity?: (productId: string, delta: number, selectedOption?: any) => void;
  removeFromCart?: (productId: string, selectedOption?: any) => void;
  handleBuyNow: (p: Product) => void;
  openQuickView: (p: Product) => void;
  handleProductImgError: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
}

/**
 * Standard 9-item pulse skeleton grid for responsive mobile 3-col & desktop 4-col views.
 */
export const ProductGridSkeleton: React.FC = () => (
  <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
    {Array.from({ length: 9 }).map((_, i) => (
      <div 
        key={i} 
        className={`bg-white rounded-2xl border border-slate-100 p-2 sm:p-2.5 animate-pulse shadow-2xs ${i === 8 ? "md:hidden" : ""}`}
      >
        <div className="w-full aspect-[4/3] bg-slate-100 rounded-xl mb-2"></div>
        <div className="h-2.5 w-3/4 bg-slate-100 rounded mb-1"></div>
        <div className="h-2 w-1/2 bg-slate-100 rounded mb-2"></div>
        <div className="h-6 w-full bg-slate-100 rounded"></div>
      </div>
    ))}
  </div>
);

/**
 * Reusable Product Section component eliminating duplicated product grids and skeleton loaders.
 */
export const ProductSection: React.FC<ProductSectionProps> = ({
  title,
  subtitle,
  accentColorClass = "bg-emerald-600",
  products,
  loading = false,
  limit,
  onToggleLimit,
  lang,
  className = "max-w-7xl mx-auto px-2 sm:px-4 mt-6 sm:mt-8",
  showHeader = true,
  fmtNum,
  wishlist,
  toggleWishlist,
  cart,
  addToCart,
  updateCartQuantity,
  removeFromCart,
  handleBuyNow,
  openQuickView,
  handleProductImgError
}) => {
  // If a limit is specified, slice products (if limit is 8, slice 9 so mobile 3x3 displays 9 and 9th is hidden on desktop)
  const displayProducts = limit !== undefined 
    ? products.slice(0, limit === 8 ? 9 : limit) 
    : products;

  if (!loading && displayProducts.length === 0 && !showHeader) {
    return null;
  }

  return (
    <section className={className}>
      {showHeader && title && (
        <div className="flex justify-between items-center mb-3 sm:mb-4">
          <div>
            <h3 className="text-sm sm:text-lg font-bold text-slate-800 flex items-center gap-1.5">
              <span className={`w-2 h-4 sm:h-5 ${accentColorClass} rounded-full inline-block`}></span>
              {title}
            </h3>
            {subtitle && (
              <p className="text-[10px] sm:text-xs text-slate-400">
                {subtitle}
              </p>
            )}
          </div>
          {onToggleLimit && limit !== undefined && (
            <button
              onClick={onToggleLimit}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-bold hover:underline cursor-pointer"
            >
              {limit === 8 
                ? (lang === "bn" ? "সবগুলো দেখুন" : "See All") 
                : (lang === "bn" ? "কম দেখুন" : "See Less")
              }
            </button>
          )}
        </div>
      )}

      {loading ? (
        <ProductGridSkeleton />
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
          {displayProducts.map((product, idx) => (
            <ProductCard
              key={product.id}
              product={product}
              lang={lang}
              fmtNum={fmtNum}
              wishlist={wishlist}
              toggleWishlist={toggleWishlist}
              cart={cart}
              addToCart={addToCart}
              updateCartQuantity={updateCartQuantity}
              removeFromCart={removeFromCart}
              handleBuyNow={handleBuyNow}
              openQuickView={openQuickView}
              handleProductImgError={handleProductImgError}
              className={limit === 8 && idx === 8 ? "md:hidden" : ""}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default ProductSection;
