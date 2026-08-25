import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Gift, ArrowRight, ArrowLeft, Zap, Sparkles, Percent, Award, Share2 } from "lucide-react";

interface BannerSliderProps {
  lang: "bn" | "en";
  loggedInUser: any;
  userReferralCode: string;
  timeLeft: { hours: number; minutes: number; seconds: number };
  onReferralClick: () => void;
  onFlashSaleClick: () => void;
  customBanners?: any[];
  loading?: boolean;
}

export const BannerSlider: React.FC<BannerSliderProps> = ({
  lang,
  loggedInUser,
  userReferralCode,
  timeLeft,
  onReferralClick,
  onFlashSaleClick,
  customBanners = [],
  loading = false
}) => {
  const [activeIndex, setActiveIndex] = useState(0);

  const toBnNum = (num: number | string): string => {
    const digits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
    return num.toString().split("").map(char => {
      const p = parseInt(char, 10);
      return isNaN(p) ? char : digits[p];
    }).join("");
  };

  const fmtNum = (num: number | string): string => {
    return lang === "bn" ? toBnNum(num) : num.toString();
  };

  // Render sleek, compact banner height (reduced by ~50% for optimal balance)
  const containerHeightClass = "h-[85px] sm:h-[100px] md:h-[110px]";

  // If loading banners from Firebase, show a sleek skeleton
  if (loading) {
    return (
      <section className="max-w-7xl mx-auto px-4 mt-3 relative">
        <div 
          className={`w-full relative rounded-2xl overflow-hidden shadow-xs border border-slate-100 bg-slate-100 animate-pulse ${containerHeightClass}`}
        >
          <div className="w-full h-full flex items-center justify-between p-3 sm:p-4 bg-gradient-to-r from-slate-200/60 via-slate-100 to-slate-200/60">
            <div className="space-y-1.5 max-w-[65%]">
              <div className="h-2.5 w-20 bg-slate-300/70 rounded-md"></div>
              <div className="h-4 sm:h-5 w-44 sm:w-72 bg-slate-300/80 rounded-lg"></div>
              <div className="h-2.5 w-32 sm:w-48 bg-slate-300/60 rounded-md"></div>
            </div>
            <div className="h-7 sm:h-8 w-20 bg-slate-300/70 rounded-xl"></div>
          </div>
        </div>
      </section>
    );
  }

  // Use only dynamic custom banners from Firestore/Admin.
  const activeCustomBanners = customBanners.filter(b => b.isActive !== false);

  // If no banners configured in Firebase, do not show hard-coded fallback banners
  if (activeCustomBanners.length === 0) {
    return null;
  }

  const slides = activeCustomBanners;
  const totalSlides = slides.length;

  const nextSlide = () => {
    setActiveIndex((prev) => (prev + 1) % totalSlides);
  };

  const prevSlide = () => {
    setActiveIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  return (
    <section className="max-w-7xl mx-auto px-4 mt-3 relative">
      {/* Slider Container with smooth height transition */}
      <div 
        className={`w-full relative rounded-2xl overflow-hidden shadow-xs transition-all duration-300 ease-out border border-slate-100 ${containerHeightClass}`}
        id="home-banner-slider"
      >
        {/* Navigation Buttons (Always visible on hover, elegant design) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            prevSlide();
          }}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-black/35 hover:bg-black/60 text-white flex items-center justify-center transition backdrop-blur-xs focus:outline-none cursor-pointer shadow-xs"
          aria-label="Previous slide"
          id="btn-slider-prev"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            nextSlide();
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-black/35 hover:bg-black/60 text-white flex items-center justify-center transition backdrop-blur-xs focus:outline-none cursor-pointer shadow-xs"
          aria-label="Next slide"
          id="btn-slider-next"
        >
          <ArrowRight className="w-3.5 h-3.5" />
        </button>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeIndex}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="w-full h-full"
          >
            {(() => {
              const slide = slides[activeIndex];
              if (!slide) return null;

              // Referral Banner
              if (slide.type === "referral") {
                return (
                  <div 
                    onClick={onReferralClick}
                    className="w-full h-full bg-gradient-to-r from-emerald-950 via-emerald-800 to-teal-950 text-white px-3.5 sm:px-6 py-2 sm:py-3 flex items-center justify-between relative overflow-hidden cursor-pointer select-none"
                  >
                    <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-400/10 rounded-full blur-xl pointer-events-none"></div>
                    
                    <div className="z-10 space-y-0.5 sm:space-y-1 max-w-[70%]">
                      <div className="flex items-center space-x-1.5">
                        <span className="bg-emerald-500/20 border border-emerald-500/30 px-1.5 py-0.2 rounded text-[7.5px] sm:text-[9px] font-bold tracking-wider text-emerald-300 uppercase">
                          {lang === "bn" ? "আমন্ত্রণ ও পুরস্কার" : "REFERRAL REWARD"}
                        </span>
                        {userReferralCode && (
                          <span className="bg-white/10 border border-white/20 rounded px-1.5 py-0.2 text-[7.5px] sm:text-[9px] font-mono font-bold tracking-wider text-yellow-300">
                            {userReferralCode}
                          </span>
                        )}
                      </div>
                      
                      <h3 className="text-xs sm:text-sm md:text-base font-extrabold text-white leading-snug line-clamp-1">
                        {lang === "bn" 
                          ? (slide.titleBn || "🎉 বন্ধুদের আমন্ত্রণ জানান, ৳৫০ বোনাস জিতুন!") 
                          : (slide.titleEn || "🎉 Refer Friends, Earn ৳50 Wallet Credit!")}
                      </h3>
                      
                      <p className="text-[9px] sm:text-[11px] text-emerald-100/90 font-medium truncate">
                        {lang === "bn"
                          ? (slide.subtitleBn || "বন্ধুরা প্রথম অর্ডারে পাবেন ফ্রি ডেলিভারি এবং আপনার ওয়ালেটে যোগ হবে ৳৫০ ক্যাশব্যাক।")
                          : (slide.subtitleEn || "Friends get Free Delivery on first order. You earn BDT 50 wallet cashback.")}
                      </p>
                    </div>

                    <div className="z-10 shrink-0 flex flex-col items-end gap-1">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onReferralClick();
                        }}
                        className="bg-gradient-to-r from-yellow-400 to-amber-400 hover:from-yellow-300 hover:to-amber-300 text-slate-950 px-2.5 sm:px-3 py-1 sm:py-1.2 rounded-lg text-[9px] sm:text-[11px] font-black transition-all duration-300 flex items-center space-x-1 shadow hover:scale-105 active:scale-95 cursor-pointer"
                      >
                        <span>{lang === "bn" ? "রেফার করুন" : "Refer Now"}</span>
                        <ArrowRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      </button>
                      <span className="text-[7.5px] sm:text-[9px] text-emerald-200/80 font-medium">
                        {lang === "bn" ? "*শর্ত প্রযোজ্য" : "*T&C Apply"}
                      </span>
                    </div>
                  </div>
                );
              }

              // Flash Sale Banner
              if (slide.type === "flash") {
                return (
                  <div 
                    onClick={onFlashSaleClick}
                    className="w-full h-full bg-gradient-to-r from-rose-800 via-red-600 to-orange-600 text-white px-3.5 sm:px-6 py-2 sm:py-3 flex items-center justify-between relative overflow-hidden cursor-pointer select-none"
                  >
                    <div className="z-10 space-y-0.5 sm:space-y-1 max-w-[65%]">
                      <div className="flex items-center space-x-1">
                        <span className="bg-black/40 border border-red-400/40 px-1.5 py-0.2 rounded text-[7.5px] sm:text-[9px] font-bold tracking-wider text-yellow-300 uppercase flex items-center gap-1 animate-pulse">
                          <Zap className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-yellow-300 fill-yellow-300" />
                          <span>{lang === "bn" ? "সীমিত অফার" : "FLASH SALE"}</span>
                        </span>
                      </div>
                      <h3 className="text-xs sm:text-sm md:text-base font-extrabold text-white leading-snug line-clamp-1">
                        {lang === "bn" ? (slide.titleBn || "⚡ ফ্ল্যাশ সেল মেগা অফার চলছে!") : (slide.titleEn || "⚡ Flash Sale Megadeal is LIVE!")}
                      </h3>
                      <p className="text-[9px] sm:text-[11px] text-rose-100 font-medium truncate">
                        {lang === "bn" ? (slide.subtitleBn || "সেরা মূল্যে সতেজ পণ্য স্টক ফুরানোর আগেই কিনে নিন") : (slide.subtitleEn || "Unbeatable prices on organic foods.")}
                      </p>
                    </div>

                    <div className="z-10 flex flex-col items-end shrink-0 bg-black/30 backdrop-blur-xs px-2 py-1 rounded-xl border border-white/10">
                      <span className="text-[7.5px] sm:text-[9px] font-bold text-rose-200 uppercase tracking-wider">
                        {lang === "bn" ? "সময় বাকি:" : "ENDS IN:"}
                      </span>
                      <div className="flex items-center space-x-0.5 text-[10px] sm:text-xs font-black text-yellow-300 font-mono mt-0.5">
                        <span className="bg-white/10 px-1 py-0.2 rounded">{fmtNum(timeLeft.hours.toString().padStart(2, "0"))}</span>
                        <span>:</span>
                        <span className="bg-white/10 px-1 py-0.2 rounded">{fmtNum(timeLeft.minutes.toString().padStart(2, "0"))}</span>
                        <span>:</span>
                        <span className="bg-white/10 px-1 py-0.2 rounded">{fmtNum(timeLeft.seconds.toString().padStart(2, "0"))}</span>
                      </div>
                    </div>
                  </div>
                );
              }

              // Dynamic Custom Banner from Firebase Firestore
              return (
                <div 
                  onClick={() => {
                    if (slide.link) {
                      if (slide.link.startsWith("category:")) {
                        // Category navigation handled via link
                      }
                    }
                  }}
                  className={`w-full h-full bg-gradient-to-r ${slide.bgGradient || "from-emerald-800 via-teal-700 to-emerald-900"} text-white px-3.5 sm:px-6 py-2 sm:py-3 flex items-center justify-between relative overflow-hidden select-none`}
                >
                  {slide.image && (
                    <div 
                      className="absolute right-0 top-0 bottom-0 w-1/3 opacity-25 pointer-events-none bg-cover bg-center" 
                      style={{ backgroundImage: `url(${slide.image})` }}
                    ></div>
                  )}
                  <div className="z-10 space-y-0.5 sm:space-y-1 max-w-[70%]">
                    {(slide.tagEn || slide.tagBn) && (
                      <span className="bg-black/30 border border-white/20 px-1.5 py-0.2 rounded text-[7.5px] sm:text-[9px] font-bold tracking-wider text-emerald-200 uppercase">
                        {lang === "bn" ? slide.tagBn || slide.tagEn : slide.tagEn || slide.tagBn}
                      </span>
                    )}
                    <h3 className="text-xs sm:text-sm md:text-base font-extrabold text-white leading-snug line-clamp-1">
                      {lang === "bn" ? slide.titleBn || slide.titleEn : slide.titleEn || slide.titleBn}
                    </h3>
                    {(slide.subtitleBn || slide.subtitleEn) && (
                      <p className="text-[9px] sm:text-[11px] text-slate-100 font-medium truncate">
                        {lang === "bn" ? slide.subtitleBn || slide.subtitleEn : slide.subtitleEn || slide.subtitleBn}
                      </p>
                    )}
                    {(slide.highlightBn || slide.highlightEn) && (
                      <span className="text-[9px] sm:text-[11px] text-yellow-300 font-bold block">
                        {lang === "bn" ? slide.highlightBn || slide.highlightEn : slide.highlightEn || slide.highlightBn}
                      </span>
                    )}
                  </div>
                  <div className="z-10 shrink-0">
                    <div className="bg-white text-emerald-900 px-2.5 sm:px-3 py-1 sm:py-1.2 rounded-lg text-[9px] sm:text-[11px] font-black shadow hover:bg-emerald-50 transition cursor-pointer flex items-center gap-1">
                      <span>
                        {lang === "bn" 
                          ? (slide.buttonTextBn || "কিনুন") 
                          : (slide.buttonTextEn || "Shop Now")}
                      </span>
                      <ArrowRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    </div>
                  </div>
                </div>
              );
            })()}
          </motion.div>
        </AnimatePresence>

        {/* Circular Bottom Dot Indicators */}
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 z-20 flex space-x-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                setActiveIndex(i);
              }}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 focus:outline-none cursor-pointer ${
                i === activeIndex 
                  ? "bg-white w-4" 
                  : "bg-white/40 hover:bg-white/60"
              }`}
              aria-label={`Go to slide ${i + 1}`}
              id={`btn-dot-${i}`}
            ></button>
          ))}
        </div>
      </div>
    </section>
  );
};
