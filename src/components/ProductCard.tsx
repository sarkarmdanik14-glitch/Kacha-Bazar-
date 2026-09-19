import React from "react";
import { 
  Heart, Star, ShoppingCart, ShoppingBag, Plus, Minus, Trash2, AlertCircle 
} from "lucide-react";
import { Product, CartItem } from "../types";

interface ProductCardProps {
  product: Product;
  lang: "bn" | "en";
  fmtNum: (num: any) => string;
  wishlist: string[];
  toggleWishlist: (id: string) => void;
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number, showFeedback?: boolean, selectedOption?: any) => void;
  updateCartQuantity?: (productId: string, delta: number, selectedOption?: any) => void;
  removeFromCart?: (productId: string, selectedOption?: any) => void;
  handleBuyNow: (product: Product) => void;
  openQuickView: (product: Product) => void;
  handleProductImgError: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  className?: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  lang,
  fmtNum,
  wishlist,
  toggleWishlist,
  cart,
  addToCart,
  updateCartQuantity,
  removeFromCart,
  handleBuyNow,
  openQuickView,
  handleProductImgError,
  className = "",
}) => {
  const isWishlisted = wishlist.includes(product.id);
  
  // Find cart items matching this product
  const cartItem = cart.find((item) => item.product.id === product.id);
  const inCartQty = cartItem ? cartItem.quantity : 0;
  const isOutOfStock = product.stock <= 0 || product.isAvailable === false;

  // Category / Subcategory display
  const rawCatDisplay = (product.category === "staples" || product.category === "spices-oils")
    ? (lang === "bn" ? "মুদি পণ্য" : "Groceries")
    : product.category;
  const subcategoryDisplay = (
    product.subcategory || 
    rawCatDisplay || 
    (lang === "bn" ? "ফ্রেশ গ্রোসারি" : "Fresh Grocery")
  ).toUpperCase();

  // Unit display fallback
  const unitLabel = lang === "bn" 
    ? (product.unitBn || "১ কেজি") 
    : (product.unitEn || "1 kg");

  // Display Names
  const displayName = lang === "bn" ? product.nameBn : product.nameEn;
  const secondaryName = lang === "bn" ? product.nameEn : product.nameBn;

  // Handlers for in-card quantity modification
  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (updateCartQuantity) {
      updateCartQuantity(product.id, 1, cartItem?.selectedOption);
    } else {
      addToCart(product, 1, false);
    }
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (updateCartQuantity) {
      updateCartQuantity(product.id, -1, cartItem?.selectedOption);
    } else if (removeFromCart && inCartQty === 1) {
      removeFromCart(product.id, cartItem?.selectedOption);
    }
  };

  return (
    <div 
      className={`group relative bg-white rounded-2xl border border-slate-200/80 hover:border-emerald-500/50 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden h-full select-none ${className}`}
    >
      {/* ========================================================================= */}
      {/* 1. TOP HERO IMAGE CONTAINER (Full Cover Edge-to-Edge) */}
      {/* ========================================================================= */}
      <div className="relative w-full aspect-[4/3] sm:aspect-[1/0.88] bg-slate-100 overflow-hidden border-b border-slate-100/80">
        
        {/* Wishlist Button (Top-Right Floating Circle) */}
        <button 
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleWishlist(product.id);
          }}
          className={`absolute top-2 right-2 z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shadow-xs active:scale-90 border ${
            isWishlisted 
              ? "bg-white text-rose-500 border-rose-200 fill-rose-500 shadow-rose-100" 
              : "bg-white/90 backdrop-blur-xs hover:bg-white text-slate-500 hover:text-rose-500 border-slate-200/80"
          }`}
          title={lang === "bn" ? (isWishlisted ? "উইশলিস্ট থেকে সরান" : "উইশলিস্টে যোগ করুন") : (isWishlisted ? "Remove from wishlist" : "Add to wishlist")}
        >
          <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform ${isWishlisted ? "fill-rose-500 text-rose-500 scale-110" : ""}`} />
        </button>

        {/* Product Image - Edge-to-Edge Full Cover */}
        <div 
          onClick={() => openQuickView(product)}
          className="w-full h-full cursor-pointer relative overflow-hidden"
        >
          <img 
            src={product.image} 
            alt={displayName}
            referrerPolicy="no-referrer"
            onError={handleProductImgError}
            loading="lazy"
            className={`w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105 ${
              isOutOfStock ? "opacity-35 grayscale" : ""
            }`}
          />

          {/* Out of Stock Overlay */}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center">
              <span className="bg-slate-900/90 text-white text-[10px] sm:text-[11px] font-bold px-2.5 py-1 rounded-lg border border-slate-700 shadow-xs uppercase tracking-wider flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-rose-400" />
                <span>{lang === "bn" ? "স্টক শেষ" : "Out of Stock"}</span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. PRODUCT INFORMATION AREA (Ultra Compact & Full Visibility) */}
      {/* ========================================================================= */}
      <div className="p-1.5 sm:p-2 flex-1 flex flex-col justify-between text-left">
        
        <div>
          {/* Subcategory Label */}
          <span className="block text-[8px] sm:text-[9px] font-semibold text-slate-400 uppercase tracking-tight truncate leading-none mb-0.5">
            {subcategoryDisplay}
          </span>

          {/* Product Name (Bangla Title) */}
          <h4 
            onClick={() => openQuickView(product)}
            className="text-[11px] sm:text-xs md:text-[13px] font-bold text-slate-800 line-clamp-1 leading-tight group-hover:text-emerald-600 transition-colors cursor-pointer"
            title={displayName}
          >
            {displayName}
          </h4>

          {/* Secondary Subtitle (English Name) */}
          <p 
            className="text-[8.5px] sm:text-[9.5px] text-slate-400 truncate leading-none mt-0.5 mb-1"
            title={secondaryName}
          >
            {secondaryName}
          </p>

          {/* Rating & Weight Meta Row */}
          <div className="flex items-center justify-between gap-1 text-[9.5px] sm:text-[10.5px] leading-none mb-1">
            <div className="flex items-center gap-0.5 shrink-0">
              <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-400 fill-amber-400 shrink-0" />
              <span className="font-bold text-slate-700">
                {fmtNum(product.rating || 4.5)}
              </span>
            </div>

            <span className="text-slate-500 font-medium text-[9px] sm:text-[10px] whitespace-nowrap shrink-0 text-right">
              {unitLabel}
            </span>
          </div>

          {/* Partner Shop Badge */}
          {product.partnerShopName && (
            <div className="flex items-center gap-1 text-[8px] sm:text-[9px] text-emerald-800 bg-emerald-50/90 px-1 py-0.5 rounded border border-emerald-200/80 mb-1 truncate">
              <span className="shrink-0 text-[8.5px]">🏪</span>
              <span className="truncate font-semibold">{product.partnerShopName}</span>
              <span className="text-[7px] font-extrabold bg-emerald-600 text-white px-1 py-0.2 rounded-full shrink-0 ml-auto">✓ Verified</span>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* 3. PRICE & DUAL ACTION BUTTONS AREA (Compact) */}
        {/* ========================================================================= */}
        <div className="pt-0.5">
          
          {/* Price Row */}
          <div className="flex items-baseline gap-1 mb-1 leading-none">
            <span className="text-xs sm:text-[13px] md:text-sm font-black text-[#008958] tracking-tight leading-none">
              ৳{fmtNum(product.price)}
            </span>
            {product.originalPrice && product.originalPrice > product.price ? (
              <span className="text-[8.5px] sm:text-[9.5px] font-normal text-slate-400 line-through leading-none">
                ৳{fmtNum(product.originalPrice)}
              </span>
            ) : null}
          </div>

          {/* Action Area */}
          {isOutOfStock ? (
            <button 
              disabled
              className="w-full py-1 px-1 bg-slate-100 text-slate-400 font-bold text-[9.5px] sm:text-[10.5px] rounded-md cursor-not-allowed text-center border border-slate-200/80 flex items-center justify-center gap-1"
            >
              <AlertCircle className="w-2.5 h-2.5 shrink-0" />
              <span className="whitespace-nowrap">{lang === "bn" ? "স্টক শেষ" : "Out of Stock"}</span>
            </button>
          ) : inCartQty > 0 ? (
            /* In-Cart Quantity Control */
            <div className="w-full flex items-center justify-between bg-emerald-50/80 border border-emerald-500 rounded-md p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={handleDecrement}
                className="w-5 h-5 sm:w-6 sm:h-6 rounded bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-600 border border-emerald-200/60 shadow-2xs flex items-center justify-center transition-all active:scale-90 cursor-pointer shrink-0"
                title={inCartQty === 1 ? (lang === "bn" ? "কার্ট থেকে মুছুন" : "Remove from cart") : (lang === "bn" ? "পরিমাণ কমান" : "Decrease quantity")}
              >
                {inCartQty === 1 ? (
                  <Trash2 className="w-2.5 h-2.5 text-rose-500" />
                ) : (
                  <Minus className="w-2.5 h-2.5 font-bold text-emerald-800" />
                )}
              </button>

              <div className="flex items-center justify-center px-1">
                <span className="text-[10.5px] sm:text-xs font-black text-emerald-900 font-mono leading-none">
                  {fmtNum(inCartQty)}
                </span>
              </div>

              <button
                type="button"
                onClick={handleIncrement}
                className="w-5 h-5 sm:w-6 sm:h-6 rounded bg-[#008958] hover:bg-emerald-700 text-white shadow-2xs flex items-center justify-center transition-all active:scale-90 cursor-pointer shrink-0"
                title={lang === "bn" ? "পরিমাণ বাড়ান" : "Increase quantity"}
              >
                <Plus className="w-2.5 h-2.5 font-bold" />
              </button>
            </div>
          ) : (
            /* Dual Buttons: Left Cart (Outline) + Right Order (Filled Emerald) */
            <div className="grid grid-cols-2 gap-1">
              {/* Left: Cart Button */}
              <button 
                type="button"
                onClick={() => addToCart(product)}
                className="py-1 px-1 bg-white hover:bg-emerald-50 active:bg-emerald-100 text-[#008958] border border-[#008958] font-bold text-[9.5px] sm:text-[10.5px] rounded-md transition-all duration-150 shadow-2xs cursor-pointer flex items-center justify-center gap-0.5 active:scale-95 whitespace-nowrap min-w-0"
              >
                <ShoppingCart className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#008958] shrink-0" />
                <span className="whitespace-nowrap leading-none">
                  {lang === "bn" ? "কার্ট" : "Cart"}
                </span>
              </button>

              {/* Right: Order / Buy Now Button */}
              <button 
                type="button"
                onClick={() => handleBuyNow(product)}
                className="py-1 px-1 bg-[#008958] hover:bg-[#007a4e] active:bg-emerald-900 text-white font-bold text-[9.5px] sm:text-[10.5px] rounded-md transition-all duration-150 shadow-2xs cursor-pointer flex items-center justify-center gap-0.5 active:scale-95 whitespace-nowrap min-w-0"
                title={lang === "bn" ? "এখনই অর্ডার করুন" : "Buy Now"}
              >
                <ShoppingBag className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white shrink-0" />
                <span className="whitespace-nowrap leading-none">
                  {lang === "bn" ? "অর্ডার" : "Order"}
                </span>
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
