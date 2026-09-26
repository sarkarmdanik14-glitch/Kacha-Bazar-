import React from "react";
import { 
  Heart, Star, ShoppingCart, ShoppingBag, AlertCircle, Phone, Truck 
} from "lucide-react";
import { Product, CartItem } from "../types";
import { resolveProductDisplayUnit } from "../lib/productWeightUtils";
import { SAFE_PRODUCT_PLACEHOLDER } from "../lib/masterImageRegistry";

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

  // Unit display fallback with smart resolution
  const unitLabel = resolveProductDisplayUnit(product, lang);

  // Display Names
  const displayName = lang === "bn" ? product.nameBn : product.nameEn;
  const secondaryName = lang === "bn" ? product.nameEn : product.nameBn;

  // Detect if product is a vehicle rental
  const isVehicle = product.category === "vehicles" || (product.unitBn && product.unitBn.includes("আলোচনা"));

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
            src={product.image || (product as any).imageUrl || SAFE_PRODUCT_PLACEHOLDER} 
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
          <div className="flex items-center justify-between gap-1 text-[9.5px] sm:text-[10.5px] leading-none mb-1.5">
            <div className="flex items-center gap-0.5 shrink-0">
              <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-400 fill-amber-400 shrink-0" />
              <span className="font-bold text-slate-700">
                {fmtNum(product.rating || 4.5)}
              </span>
            </div>

            <span className="inline-flex items-center font-bold text-slate-700 bg-slate-100 hover:bg-slate-200/60 border border-slate-200/90 px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] whitespace-nowrap shrink-0 text-right shadow-2xs">
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
          <div className="flex items-baseline flex-wrap gap-1 mb-1 leading-none">
            {isVehicle ? (
              <span className="text-[10px] sm:text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200/90 px-1.5 py-0.5 rounded leading-tight">
                {lang === "bn" ? "ভাড়া আলোচনা সাপেক্ষে" : "Fare on discussion"}
              </span>
            ) : product.price !== undefined && product.price !== null && product.price > 0 ? (
              <>
                <span className="text-xs sm:text-[13px] md:text-sm font-black text-[#008958] tracking-tight leading-none">
                  ৳{fmtNum(typeof product.price === "number" ? product.price.toLocaleString("en-IN") : product.price)}
                </span>
                {product.originalPrice && product.originalPrice > product.price ? (
                  <span className="text-[8.5px] sm:text-[9.5px] font-normal text-slate-400 line-through leading-none">
                    ৳{fmtNum(typeof product.originalPrice === "number" ? product.originalPrice.toLocaleString("en-IN") : product.originalPrice)}
                  </span>
                ) : null}
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 leading-none">
                  / {unitLabel}
                </span>
              </>
            ) : (
              <span className="text-xs sm:text-[13px] font-bold text-slate-400 tracking-tight leading-none">
                —
              </span>
            )}
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
          ) : isVehicle ? (
            /* Vehicle Action Buttons: Call & Rent */
            <div className="grid grid-cols-2 gap-1">
              <a 
                href="tel:+8801615581975"
                onClick={(e) => e.stopPropagation()}
                className="py-1 px-1 bg-white hover:bg-blue-50 active:bg-blue-100 text-blue-700 border border-blue-300 font-bold text-[9.5px] sm:text-[10.5px] rounded-md transition-all duration-150 shadow-2xs cursor-pointer flex items-center justify-center gap-1 active:scale-95 whitespace-nowrap min-w-0"
                title={lang === "bn" ? "সরাসরি কল করুন (+8801615581975)" : "Call directly (+8801615581975)"}
              >
                <Phone className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-blue-600 shrink-0" />
                <span className="whitespace-nowrap leading-none">
                  {lang === "bn" ? "কল দিন" : "Call"}
                </span>
              </a>

              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openQuickView(product);
                }}
                className="py-1 px-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-[9.5px] sm:text-[10.5px] rounded-md transition-all duration-150 shadow-2xs cursor-pointer flex items-center justify-center gap-0.5 active:scale-95 whitespace-nowrap min-w-0"
                title={lang === "bn" ? "ভাড়া ও বুকিং বিবরণী" : "Rent & Booking"}
              >
                <Truck className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white shrink-0" />
                <span className="whitespace-nowrap leading-none">
                  {lang === "bn" ? "ভাড়া নিন" : "Rent"}
                </span>
              </button>
            </div>
          ) : (
            /* Dual Buttons: Left Cart (Outline) + Right Order (Filled Emerald) */
            <div className="grid grid-cols-2 gap-1">
              {/* Left: Cart Button - Directly adds product to cart */}
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  addToCart(product);
                }}
                className="py-1 px-1 bg-white hover:bg-emerald-50 active:bg-emerald-100 text-[#008958] border border-[#008958] font-bold text-[9.5px] sm:text-[10.5px] rounded-md transition-all duration-150 shadow-2xs cursor-pointer flex items-center justify-center gap-1 active:scale-95 whitespace-nowrap min-w-0"
              >
                <ShoppingCart className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#008958] shrink-0" />
                <span className="whitespace-nowrap leading-none">
                  {lang === "bn" ? "কার্ট" : "Cart"}
                </span>
                {inCartQty > 0 && (
                  <span className="ml-0.5 px-1 py-0.2 bg-[#008958] text-white text-[8px] sm:text-[8.5px] rounded-full font-bold font-mono leading-none">
                    {fmtNum(inCartQty)}
                  </span>
                )}
              </button>

              {/* Right: Order / Buy Now Button */}
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleBuyNow(product);
                }}
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
