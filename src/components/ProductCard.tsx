import React from "react";
import { Heart, Eye, Star } from "lucide-react";
import { Product, CartItem } from "../types";

interface ProductCardProps {
  product: Product;
  lang: "bn" | "en";
  fmtNum: (num: any) => string;
  wishlist: string[];
  toggleWishlist: (id: string) => void;
  cart: CartItem[];
  addToCart: (product: Product) => void;
  handleBuyNow: (product: Product) => void;
  openQuickView: (product: Product) => void;
  handleProductImgError: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
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
}) => {
  const isWishlisted = wishlist.includes(product.id);
  const isInCart = cart.some((item) => item.product.id === product.id);

  return (
    <div 
      className="bg-white rounded-2xl overflow-hidden border border-slate-100/90 shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col justify-between relative group hover:-translate-y-0.5"
    >
      {/* Discount Badge */}
      {product.discount && product.discount > 0 ? (
        <span className="absolute top-1.5 left-1.5 z-10 bg-rose-500 text-white text-[8px] sm:text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-xs leading-none flex items-center gap-0.5">
          <span>{fmtNum(product.discount)}%</span>
          <span>{lang === "bn" ? "ছাড়" : "OFF"}</span>
        </span>
      ) : null}

      {/* Wishlist Button */}
      <button 
        onClick={() => toggleWishlist(product.id)}
        className="absolute top-1.5 right-1.5 z-10 p-1 sm:p-1.5 rounded-full bg-white/90 hover:bg-white text-slate-400 hover:text-rose-500 shadow-2xs transition-all duration-200 cursor-pointer hover:scale-110"
        title={lang === "bn" ? "উইশলিস্টে যুক্ত করুন" : "Add to wishlist"}
      >
        <Heart className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${isWishlisted ? "fill-rose-500 text-rose-500" : ""}`} />
      </button>

      {/* Image container - Full, balanced, and professional scale */}
      <div className="relative w-full aspect-[4/3] overflow-hidden bg-gradient-to-b from-slate-50 to-slate-100/80 flex items-center justify-center">
        <img 
          src={product.image} 
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-108" 
          alt={product.nameEn}
          referrerPolicy="no-referrer"
          onError={handleProductImgError}
        />
        <div className="absolute inset-0 bg-black/15 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[1px]">
          <button 
            onClick={() => openQuickView(product)}
            className="p-1.5 rounded-full bg-white hover:bg-emerald-600 text-slate-800 hover:text-white shadow-md transition-all duration-200 cursor-pointer hover:scale-110"
            title={lang === "bn" ? "দ্রুত দেখুন" : "Quick View"}
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Details Box */}
      <div className="px-1.5 py-1.5 sm:px-2 sm:py-2 flex-1 flex flex-col justify-between">
        <div>
          {product.subcategory && (
            <span className="text-[7.5px] sm:text-[8px] text-slate-400 uppercase font-bold tracking-wider leading-none block truncate">
              {product.subcategory}
            </span>
          )}
          <h4 className="text-[10.5px] sm:text-xs font-bold text-slate-800 line-clamp-1 group-hover:text-emerald-600 transition-colors leading-tight mt-0.5">
            {lang === "bn" ? product.nameBn : product.nameEn}
          </h4>
          <p className="text-[8px] sm:text-[8.5px] text-slate-400 line-clamp-1 leading-none mt-0.5">
            {lang === "bn" ? product.nameEn : product.nameBn}
          </p>
          
          <div className="flex items-center justify-between mt-0.5 text-[8px] sm:text-[8.5px]">
            <div className="flex items-center space-x-0.5">
              <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
              <span className="font-bold text-slate-600">
                {fmtNum(product.rating)}
              </span>
            </div>
            {(product.unitBn || product.unitEn) && (
              <span className="text-[7.5px] sm:text-[8px] text-slate-400 font-medium truncate max-w-[50%]">
                {lang === "bn" ? product.unitBn : product.unitEn}
              </span>
            )}
          </div>
        </div>

        <div className="mt-1 pt-0.5 border-t border-slate-100">
          <div className="flex items-baseline gap-1 flex-wrap">
            <span className="text-xs sm:text-[13px] font-black text-emerald-600 leading-tight">৳{fmtNum(product.price)}</span>
            {product.originalPrice && product.originalPrice > product.price ? (
              <span className="text-[8px] sm:text-[8.5px] text-slate-400 line-through leading-tight">৳{fmtNum(product.originalPrice)}</span>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-1 mt-1">
            <button 
              onClick={() => addToCart(product)}
              className={`py-0.5 sm:py-1 px-1 text-[8px] sm:text-[8.5px] font-bold rounded-lg transition shadow-2xs cursor-pointer flex items-center justify-center whitespace-nowrap border ${
                isInCart 
                  ? "bg-emerald-50 text-emerald-700 border-emerald-600 hover:bg-emerald-100" 
                  : "bg-white text-emerald-600 border-emerald-500 hover:bg-emerald-50"
              }`}
            >
              {isInCart ? (
                <span>{lang === "bn" ? "✓ কার্ট" : "✓ Cart"}</span>
              ) : (
                <span>{lang === "bn" ? "🛒 কার্ট" : "🛒 Cart"}</span>
              )}
            </button>
            <button 
              onClick={() => handleBuyNow(product)}
              className="py-0.5 sm:py-1 px-1 text-[8px] sm:text-[8.5px] font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 active:bg-emerald-800 transition shadow-2xs cursor-pointer flex items-center justify-center whitespace-nowrap"
            >
              <span>{lang === "bn" ? "🛍️ অর্ডার" : "🛍️ Order"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
