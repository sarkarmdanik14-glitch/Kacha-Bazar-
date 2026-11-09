import React, { useState, useEffect } from "react";
import { 
  MapPin, 
  ChevronDown, 
  Bell, 
  ShoppingBag, 
  User, 
  Search, 
  Mic, 
  QrCode, 
  Zap, 
  MessageCircle, 
  Phone, 
  ArrowRight, 
  ChevronRight, 
  Clock, 
  Heart, 
  Plus, 
  Minus, 
  ShieldCheck, 
  Home, 
  LayoutGrid, 
  Tag, 
  Receipt, 
  X, 
  Check,
  Sparkles
} from "lucide-react";
import { APP_LOGO_URL } from "../../constants/branding";

export interface MobileFlutterHomeViewProps {
  products: any[];
  categories: any[];
  cart: any[];
  wishlist: string[];
  lang: "bn" | "en";
  fmtNum: (num: any) => string;
  addToCart: (product: any) => void;
  updateCartQuantity: (id: string, delta: number) => void;
  removeFromCart: (id: string) => void;
  toggleWishlist: (id: string) => void;
  openQuickView: (product: any) => void;
  navigateToCategory: (catId: string) => void;
  onOpenCart: () => void;
  onOpenPortal: (role?: string) => void;
  onOpenVoiceCall: () => void;
  onOpenLiveChat: () => void;
  onOpenQRCode: () => void;
  onVoiceSearch: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  globalSettings?: any;
  user?: any;
  userRole?: string;
  userProfilePhoto?: string;
}

export const DHAKA_AREAS = [
  "ধানমন্ডি, ঢাকা",
  "গুলশান, ঢাকা",
  "বনানী, ঢাকা",
  "উত্তরা, ঢাকা",
  "মিরপুর, ঢাকা",
  "মোহাম্মদপুর, ঢাকা",
  "বাড্ডা, ঢাকা",
  "মতিঝিল, ঢাকা",
  "তেজগাঁও, ঢাকা",
  "বসুন্ধরা, ঢাকা"
];

export const MobileFlutterHomeView: React.FC<MobileFlutterHomeViewProps> = ({
  products,
  categories,
  cart,
  wishlist,
  lang,
  fmtNum,
  addToCart,
  updateCartQuantity,
  toggleWishlist,
  openQuickView,
  navigateToCategory,
  onOpenCart,
  onOpenPortal,
  onOpenLiveChat,
  onOpenQRCode,
  onVoiceSearch,
  searchQuery,
  setSearchQuery,
  globalSettings,
  user,
  userRole,
  userProfilePhoto
}) => {
  // Mobile active tab state: home | categories | offers | orders | profile
  const [activeTab, setActiveTab] = useState<"home" | "categories" | "offers" | "orders" | "profile">("home");
  
  // Location dropdown state
  const [selectedArea, setSelectedArea] = useState<string>(() => {
    try {
      return localStorage.getItem("kb_delivery_area") || "ধানমন্ডি, ঢাকা";
    } catch {
      return "ধানমন্ডি, ঢাকা";
    }
  });
  const [showLocationPicker, setShowLocationPicker] = useState<boolean>(false);

  // Countdown timer for Flash Deals (03:45:12)
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number }>({
    hours: 3,
    minutes: 45,
    seconds: 12
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 3, minutes: 59, seconds: 59 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format countdown string
  const formatTimer = () => {
    const pad = (n: number) => n.toString().padStart(2, "0");
    const raw = `${pad(timeLeft.hours)}:${pad(timeLeft.minutes)}:${pad(timeLeft.seconds)}`;
    return fmtNum(raw);
  };

  // Resolve cart metrics
  const cartTotalItems = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
  const cartTotalPrice = cart.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0);

  // Filtered Flash Deal products (top discounted products or featured fresh meats/grains)
  const flashDealProducts = React.useMemo(() => {
    if (!products || products.length === 0) return [];
    // Prioritize products with explicit discount or top staples
    const withDiscount = products.filter(p => {
      const orig = Number(p.originalPrice || 0);
      const pr = Number(p.price || 0);
      return orig > pr && p.isAvailable !== false;
    });
    if (withDiscount.length >= 2) return withDiscount.slice(0, 6);
    return products.filter(p => p.isAvailable !== false).slice(0, 6);
  }, [products]);

  // Active categories for mobile icon circles
  const activeCategories = React.useMemo(() => {
    if (!categories || categories.length === 0) return [];
    return categories.filter(c => c.id !== "all" && c.isAvailable !== false);
  }, [categories]);

  // Hotline and WhatsApp numbers from global settings or defaults
  const hotline = globalSettings?.hotline || "01670118115";
  const whatsapp = globalSettings?.whatsapp || "01670118115";

  const handleSelectArea = (area: string) => {
    setSelectedArea(area);
    try {
      localStorage.setItem("kb_delivery_area", area);
    } catch {}
    setShowLocationPicker(false);
  };

  return (
    <div className="w-full min-h-screen bg-[#F7F9F6] text-gray-800 pb-28 md:hidden font-sans select-none flex flex-col relative" id="flutter-mobile-app-root">
      
      {/* ================= 1. FLUTTER APP TOP APP BAR ================= */}
      <header className="sticky top-0 z-40 bg-[#F7F9F6]/95 backdrop-blur-md px-3.5 pt-2 pb-2.5 border-b border-gray-100/80 shadow-2xs">
        {/* Upper Row: Brand + Location + Action Icons */}
        <div className="flex items-center justify-between gap-2 mb-2">
          
          {/* Logo & Brand & Location */}
          <div className="flex items-center space-x-2 min-w-0">
            <div 
              onClick={() => setActiveTab("home")} 
              className="w-9 h-9 rounded-full overflow-hidden border border-emerald-200 bg-white p-0.5 shrink-0 shadow-xs cursor-pointer active:scale-95 transition"
            >
              <img 
                src={APP_LOGO_URL} 
                alt="মেগা বাজার" 
                className="w-full h-full object-contain"
              />
            </div>
            
            <div className="min-w-0">
              <div className="flex items-center space-x-1">
                <span className="font-bold text-[15px] text-[#0c733f] leading-none tracking-tight">
                  মেগা বাজার
                </span>
                <span className="bg-rose-500 text-white text-[8.5px] font-bold px-1 py-0.5 rounded uppercase tracking-wider leading-none">
                  অ্যাপ
                </span>
              </div>
              
              {/* Location Dropdown Trigger */}
              <button 
                type="button"
                onClick={() => setShowLocationPicker(true)}
                className="flex items-center text-[11px] text-gray-600 font-medium cursor-pointer active:text-emerald-700 mt-0.5 truncate"
              >
                <MapPin className="w-3 h-3 text-emerald-600 mr-0.5 shrink-0" />
                <span className="truncate max-w-[130px] font-semibold">{selectedArea}</span>
                <ChevronDown className="w-3 h-3 text-gray-400 ml-0.5 shrink-0" />
              </button>
            </div>
          </div>

          {/* Right Action Icons: Notification, Cart, Profile */}
          <div className="flex items-center space-x-1.5 shrink-0">
            
            {/* Notification Bell */}
            <button 
              type="button"
              onClick={() => onOpenPortal("customer")}
              aria-label="Notifications"
              className="relative p-1.5 rounded-full hover:bg-gray-100 text-gray-700 cursor-pointer active:scale-90 transition"
            >
              <Bell className="w-5 h-5 text-gray-700" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            {/* Shopping Bag with Count Badge */}
            <button 
              type="button"
              onClick={onOpenCart}
              aria-label="Shopping Cart"
              className="relative p-1.5 rounded-full hover:bg-gray-100 text-gray-800 cursor-pointer active:scale-90 transition"
            >
              <ShoppingBag className="w-5 h-5 text-gray-800" />
              {cartTotalItems > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-orange-600 text-white font-bold text-[9px] w-4 h-4 rounded-full flex items-center justify-center border border-white shadow-2xs">
                  {fmtNum(cartTotalItems)}
                </span>
              )}
            </button>

            {/* User Profile Avatar / Initial */}
            <button 
              type="button"
              onClick={() => onOpenPortal(userRole === "admin" || userRole === "super_admin" ? "admin" : "customer")}
              className="w-7 h-7 rounded-full bg-emerald-100 border border-emerald-200 overflow-hidden flex items-center justify-center text-xs font-bold text-emerald-800 cursor-pointer active:scale-95 transition shrink-0"
              title="প্রোফাইল"
            >
              {userProfilePhoto ? (
                <img src={userProfilePhoto} alt="User" className="w-full h-full object-cover" />
              ) : user?.displayName ? (
                user.displayName.charAt(0).toUpperCase()
              ) : (
                <User className="w-4 h-4 text-emerald-700" />
              )}
            </button>
          </div>
        </div>

        {/* Search Bar with Voice & QR triggers */}
        <div className="relative flex items-center bg-white rounded-xl px-2.5 py-1.5 border border-slate-200/90 shadow-2xs focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition">
          <Search className="w-4 h-4 text-emerald-700 mr-2 shrink-0" />
          <input 
            type="text"
            placeholder={lang === "bn" ? "চাল, ডাল, মাছ, মাংস খুঁজুন..." : "Search groceries, fish, meat..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-xs text-gray-800 placeholder-gray-400 focus:outline-none border-none p-0 focus:ring-0 leading-normal"
          />
          <div className="flex items-center space-x-1.5 text-gray-400 ml-1 shrink-0">
            {searchQuery ? (
              <button 
                type="button" 
                onClick={() => setSearchQuery("")} 
                className="p-1 hover:text-red-500 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : null}
            <button 
              type="button"
              onClick={onVoiceSearch}
              className="p-1 hover:text-emerald-700 cursor-pointer active:scale-90 transition"
              title="ভয়েস সার্চ"
            >
              <Mic className="w-4 h-4 text-gray-600" />
            </button>
            <button 
              type="button"
              onClick={onOpenQRCode}
              className="p-1 hover:text-emerald-700 cursor-pointer active:scale-90 transition"
              title="স্ক্যান কিউআর কোড"
            >
              <QrCode className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
      </header>

      {/* ================= 2. MAIN SCROLLABLE CONTENT ================= */}
      <main className="flex-1 px-3 py-2 space-y-3">
        
        {/* Delivery Status & Direct Action Buttons */}
        <section className="space-y-1.5" id="mobile-delivery-status-section">
          {/* 30-min express status strip */}
          <div className="bg-emerald-50 text-emerald-800 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg flex items-center justify-between border border-emerald-100 shadow-2xs">
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>⚡ ৩০ মিনিটে এক্সপ্রেস ডেলিভারি • {selectedArea.split(",")[0]}</span>
            </div>
            <span className="text-[10px] text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded font-bold">
              খোলা আছে ●
            </span>
          </div>

          {/* 2-column quick action buttons: WhatsApp & Direct Call */}
          <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
            <a 
              href={`https://wa.me/88${whatsapp.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#e8f5e9] border border-emerald-200 text-[#1b5e20] py-2 px-2 rounded-xl flex items-center justify-center space-x-1.5 shadow-2xs active:scale-98 transition"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600 fill-emerald-100" />
              <span>হোয়াটসঅ্যাপে অর্ডার</span>
            </a>

            <a 
              href={`tel:${hotline}`}
              className="bg-[#fbe9e7] border border-orange-200 text-[#bf360c] py-2 px-2 rounded-xl flex items-center justify-center space-x-1.5 shadow-2xs active:scale-98 transition"
            >
              <Phone className="w-3.5 h-3.5 text-orange-600 fill-orange-100" />
              <span>{fmtNum(hotline)}</span>
            </a>
          </div>
        </section>

        {/* Hero Promo Banner (Flutter Native App Style) */}
        <section className="relative bg-gradient-to-r from-emerald-800 via-emerald-700 to-emerald-600 rounded-2xl p-3.5 text-white overflow-hidden shadow-sm" id="mobile-hero-promo">
          <div className="relative z-10 w-2/3">
            <span className="inline-block bg-amber-500 text-slate-900 text-[9px] font-black px-2 py-0.5 rounded-full mb-1">
              রমজানের মেগা অফার
            </span>
            <h2 className="text-sm font-bold leading-tight mb-1 text-white">
              দৈনন্দিন বাজার ও সেহরিতে ৫০% পর্যন্ত সাশ্রয়!
            </h2>
            <p className="text-[10px] text-emerald-100 leading-snug line-clamp-2 mb-2.5">
              তাতকা শাক-সবজি, মাছ ও মাংস ঘরে বসেই পান দ্রুততম সময়ে।
            </p>
            <button 
              type="button"
              onClick={() => {
                const el = document.getElementById("mobile-flash-deals");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              className="bg-white text-emerald-800 font-black text-[10px] px-3 py-1.5 rounded-full inline-flex items-center space-x-1 shadow-sm active:scale-95 transition cursor-pointer"
            >
              <span>অফার দেখুন</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          
          {/* Decorative Shopping Bag Illustration SVG on Right */}
          <div className="absolute -right-3 -bottom-3 opacity-25 text-white pointer-events-none">
            <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 6h-2c0-2.76-2.24-5-5-5S7 3.24 7 6H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-7-3c1.66 0 3 1.34 3 3H9c0-1.66 1.34-3 3-3zm7 17H5V8h14v12z" />
            </svg>
          </div>
        </section>

        {/* Circular Categories Carousel */}
        <section id="mobile-categories-section">
          <div className="flex items-center justify-between mb-2 px-0.5">
            <h3 className="text-xs font-bold text-gray-800">ক্যাটাগরি সমূহ</h3>
            <button 
              type="button"
              onClick={() => setActiveTab("categories")}
              className="text-[11px] text-emerald-700 font-semibold flex items-center hover:underline cursor-pointer"
            >
              <span>সব দেখুন</span>
              <ChevronRight className="w-3 h-3 ml-0.5" />
            </button>
          </div>

          {/* Horizontal scrollable category circles */}
          <div className="flex space-x-3 overflow-x-auto no-scrollbar py-1">
            {activeCategories.slice(0, 10).map((cat, idx) => {
              const bgColors = [
                "bg-emerald-50 border-emerald-200 text-emerald-700",
                "bg-cyan-50 border-cyan-200 text-cyan-700",
                "bg-red-50 border-red-200 text-red-700",
                "bg-amber-50 border-amber-200 text-amber-700",
                "bg-orange-50 border-orange-200 text-orange-700",
                "bg-purple-50 border-purple-200 text-purple-700"
              ];
              const colorClass = bgColors[idx % bgColors.length];

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => navigateToCategory(cat.id)}
                  className="flex flex-col items-center shrink-0 w-[60px] text-center cursor-pointer group active:scale-95 transition"
                >
                  <div className={`w-12 h-12 rounded-full border flex items-center justify-center p-1 shadow-2xs overflow-hidden ${colorClass}`}>
                    {cat.imageUrl || cat.image ? (
                      <img 
                        src={cat.imageUrl || cat.image} 
                        alt={cat.nameBn || cat.nameEn} 
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <span className="text-xl">
                        {idx === 0 ? "🥬" : idx === 1 ? "🐟" : idx === 2 ? "🥩" : idx === 3 ? "🌾" : idx === 4 ? "🍎" : "🛒"}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-semibold text-gray-700 mt-1.5 leading-tight truncate w-full">
                    {lang === "bn" ? cat.nameBn : cat.nameEn}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Flash Deals / "🔥 আজকের ধামাকা ডিল" (2-column Native Grid) */}
        <section className="space-y-2" id="mobile-flash-deals">
          <div className="flex items-center justify-between px-0.5">
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-bold text-gray-800 flex items-center gap-1">
                🔥 আজকের ধামাকা ডিল
              </span>
              {/* Countdown badge */}
              <span className="bg-red-50 text-red-600 text-[10px] font-bold px-1.5 py-0.5 rounded border border-red-200 font-mono flex items-center gap-1">
                <Clock className="w-2.5 h-2.5 text-red-500" />
                <span>{formatTimer()}</span>
              </span>
            </div>
            
            <button 
              type="button" 
              onClick={() => setActiveTab("offers")}
              className="text-[11px] text-emerald-700 font-semibold flex items-center hover:underline cursor-pointer"
            >
              <span>সব দেখুন</span>
              <ChevronRight className="w-3 h-3 ml-0.5" />
            </button>
          </div>

          {/* 2-column Compact Product Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            {flashDealProducts.map((prod) => {
              const inWishlist = wishlist.includes(prod.id);
              const cartItem = cart.find(c => c.id === prod.id);
              const origPrice = Number(prod.originalPrice || 0);
              const curPrice = Number(prod.price || 0);
              const discountPercent = origPrice > curPrice ? Math.round(((origPrice - curPrice) / origPrice) * 100) : 5;

              return (
                <div 
                  key={prod.id}
                  className="bg-white rounded-xl p-2.5 border border-gray-100 shadow-2xs flex flex-col justify-between relative hover:border-emerald-200 transition"
                >
                  {/* Discount Badge */}
                  <span className="absolute top-2 left-2 bg-rose-500 text-white font-bold text-[9px] px-1.5 py-0.5 rounded z-10 shadow-xs">
                    -{fmtNum(discountPercent)}%
                  </span>

                  {/* Favorite Heart Button */}
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleWishlist(prod.id);
                    }}
                    className="absolute top-2 right-2 p-1 text-gray-300 hover:text-rose-500 z-10 active:scale-125 transition cursor-pointer"
                    aria-label="Wishlist"
                  >
                    <Heart className={`w-3.5 h-3.5 ${inWishlist ? "fill-rose-500 text-rose-500" : ""}`} />
                  </button>

                  {/* Product Image Frame */}
                  <div 
                    onClick={() => openQuickView(prod)}
                    className="w-full h-24 bg-gray-50 rounded-lg flex items-center justify-center my-1 overflow-hidden cursor-pointer group"
                  >
                    {prod.image || prod.imageUrl ? (
                      <img 
                        src={prod.image || prod.imageUrl} 
                        alt={prod.nameBn || prod.nameEn} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <span className="text-3xl">🥦</span>
                    )}
                  </div>

                  {/* Meta: Weight & Name */}
                  <div onClick={() => openQuickView(prod)} className="cursor-pointer">
                    <span className="text-[9.5px] text-gray-400 block font-medium">
                      {lang === "bn" ? prod.unitBn || prod.unit || "১ কেজি" : prod.unitEn || "1 kg"}
                    </span>
                    <h4 className="text-xs font-bold text-gray-800 line-clamp-1 leading-snug hover:text-emerald-700 transition">
                      {lang === "bn" ? prod.nameBn : prod.nameEn}
                    </h4>
                    
                    {/* Price Block */}
                    <div className="flex items-center space-x-1.5 my-1">
                      <span className="text-xs font-black text-emerald-700">
                        ৳{fmtNum(curPrice)}
                      </span>
                      {origPrice > curPrice && (
                        <span className="text-[10px] text-gray-400 line-through">
                          ৳{fmtNum(origPrice)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Add to Cart / Quantity Controller */}
                  {cartItem ? (
                    <div className="flex items-center justify-between bg-emerald-600 text-white rounded-lg p-0.5 font-bold text-xs shadow-xs mt-1">
                      <button 
                        type="button"
                        onClick={() => updateCartQuantity(prod.id, -1)}
                        className="w-7 h-6 flex items-center justify-center hover:bg-emerald-700 rounded active:scale-90 transition cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-1 text-[11px] font-black">{fmtNum(cartItem.quantity)}</span>
                      <button 
                        type="button"
                        onClick={() => updateCartQuantity(prod.id, 1)}
                        className="w-7 h-6 flex items-center justify-center hover:bg-emerald-700 rounded active:scale-90 transition cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button 
                      type="button"
                      onClick={() => addToCart(prod)}
                      className="w-full bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/80 font-bold text-[11px] py-1.5 rounded-lg flex items-center justify-center space-x-1 active:scale-95 transition cursor-pointer mt-1 shadow-2xs"
                    >
                      <Plus className="w-3 h-3 text-emerald-700" />
                      <span>{lang === "bn" ? "যোগ করুন" : "Add"}</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* 100% Organic & Fresh Trust Banner */}
        <section className="bg-white rounded-xl p-2.5 border border-emerald-100 flex items-center space-x-2.5 shadow-2xs">
          <div className="w-8 h-8 rounded-lg bg-[#0c733f] text-white flex items-center justify-center text-xs shrink-0 shadow-2xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="text-[10px] leading-tight">
            <p className="font-bold text-gray-800">১০০% তাজা ও অর্গানিক নিশ্চয়তা</p>
            <p className="text-gray-500 mt-0.5">সরাসরি স্থানীয় খামার থেকে আপনার কিচেনে</p>
          </div>
        </section>

      </main>

      {/* ================= 3. FLOATING MINI CART INDICATOR ================= */}
      {cartTotalItems > 0 && (
        <div className="fixed bottom-[68px] inset-x-3 z-40 animate-slide-up" id="mobile-floating-cart-pill">
          <div className="bg-[#0c733f] text-white px-3.5 py-2.5 rounded-xl flex items-center justify-between shadow-xl shadow-emerald-950/20 border border-emerald-600/40">
            <div className="flex items-center space-x-2.5">
              <div className="bg-white/20 p-1.5 rounded-lg">
                <ShoppingBag className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="text-xs font-bold leading-tight">
                  {fmtNum(cartTotalItems)}টি আইটেম • ৳{fmtNum(cartTotalPrice)}
                </div>
                <div className="text-[9px] text-emerald-200 font-medium">
                  {cartTotalPrice >= 500 ? "ফ্রি ডেলিভারি প্রযোজ্য" : "৩০ মিনিটে এক্সপ্রেস ডেলিভারি"}
                </div>
              </div>
            </div>

            <button 
              type="button"
              onClick={onOpenCart}
              className="bg-white text-emerald-800 text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center space-x-1 shadow-sm active:scale-95 transition cursor-pointer"
            >
              <span>ভিউ কার্ট</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* ================= 4. FIXED FLUTTER BOTTOM TAB BAR ================= */}
      <nav className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-gray-200/80 px-2 py-1.5 flex items-center justify-around z-40 select-none shadow-lg">
        
        {/* Tab 1: হোম */}
        <button 
          type="button"
          onClick={() => {
            setActiveTab("home");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className={`flex flex-col items-center flex-1 py-0.5 transition cursor-pointer ${
            activeTab === "home" ? "text-[#0c733f] font-bold" : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">{lang === "bn" ? "হোম" : "Home"}</span>
        </button>

        {/* Tab 2: ক্যাটাগরি */}
        <button 
          type="button"
          onClick={() => {
            setActiveTab("categories");
            const el = document.getElementById("mobile-categories-section");
            if (el) el.scrollIntoView({ behavior: "smooth" });
          }}
          className={`flex flex-col items-center flex-1 py-0.5 transition cursor-pointer ${
            activeTab === "categories" ? "text-[#0c733f] font-bold" : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <LayoutGrid className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">{lang === "bn" ? "ক্যাটাগরি" : "Category"}</span>
        </button>

        {/* Tab 3: অফার */}
        <button 
          type="button"
          onClick={() => {
            setActiveTab("offers");
            const el = document.getElementById("mobile-flash-deals");
            if (el) el.scrollIntoView({ behavior: "smooth" });
          }}
          className={`flex flex-col items-center flex-1 py-0.5 transition cursor-pointer ${
            activeTab === "offers" ? "text-[#0c733f] font-bold" : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <Tag className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">{lang === "bn" ? "অফার" : "Offers"}</span>
        </button>

        {/* Tab 4: অর্ডার */}
        <button 
          type="button"
          onClick={() => {
            setActiveTab("orders");
            onOpenPortal("customer");
          }}
          className={`flex flex-col items-center flex-1 py-0.5 transition cursor-pointer ${
            activeTab === "orders" ? "text-[#0c733f] font-bold" : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <Receipt className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">{lang === "bn" ? "অর্ডার" : "Orders"}</span>
        </button>

        {/* Tab 5: প্রোফাইল */}
        <button 
          type="button"
          onClick={() => {
            setActiveTab("profile");
            onOpenPortal(userRole === "admin" || userRole === "super_admin" ? "admin" : "customer");
          }}
          className={`flex flex-col items-center flex-1 py-0.5 transition cursor-pointer ${
            activeTab === "profile" ? "text-[#0c733f] font-bold" : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">{lang === "bn" ? "প্রোফাইল" : "Profile"}</span>
        </button>
      </nav>

      {/* ================= 5. LOCATION PICKER BOTTOM SHEET MODAL ================= */}
      {showLocationPicker && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-2xs animate-fade-in">
          <div className="bg-white w-full rounded-t-3xl max-h-[75vh] flex flex-col p-4 shadow-2xl animate-slide-up">
            
            {/* Sheet Handle */}
            <div className="w-10 h-1.5 bg-gray-300 rounded-full mx-auto mb-3" />
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center space-x-1.5">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-sm text-gray-900">ডেলিভারি লোকেশন নির্বাচন করুন</h3>
              </div>
              <button 
                type="button"
                onClick={() => setShowLocationPicker(false)}
                className="p-1 text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Location List */}
            <div className="py-2 overflow-y-auto space-y-1 divide-y divide-gray-50 flex-1">
              {DHAKA_AREAS.map((area) => {
                const isSelected = selectedArea === area;
                return (
                  <button
                    key={area}
                    type="button"
                    onClick={() => handleSelectArea(area)}
                    className={`w-full flex items-center justify-between py-3 px-2 rounded-xl text-xs font-semibold cursor-pointer transition ${
                      isSelected ? "bg-emerald-50 text-emerald-800 font-bold" : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span className="flex items-center space-x-2">
                      <MapPin className={`w-3.5 h-3.5 ${isSelected ? "text-emerald-600" : "text-gray-400"}`} />
                      <span>{area}</span>
                    </span>
                    {isSelected && <Check className="w-4 h-4 text-emerald-600" />}
                  </button>
                );
              })}
            </div>

            <p className="text-[10px] text-gray-400 text-center pt-2">
              মেগা বাজার • ৩০ মিনিটে এক্সপ্রেস ডেলিভারি সমগ্র ঢাকায়
            </p>
          </div>
        </div>
      )}

    </div>
  );
};
