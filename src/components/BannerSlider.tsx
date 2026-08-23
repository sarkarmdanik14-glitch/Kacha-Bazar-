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
}

export const BannerSlider: React.FC<BannerSliderProps> = ({
  lang,
  loggedInUser,
  userReferralCode,
  timeLeft,
  onReferralClick,
  onFlashSaleClick,
  customBanners = []
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

  // Combine active custom banners and default templates
  const activeCustomBanners = customBanners.filter(b => b.isActive !== false);

  const defaultBanners = [
    { id: "default_ref", type: "referral" },
    { id: "default_promo", type: "promo" },
    { id: "default_mango", type: "mango" },
    { id: "default_hilsha", type: "hilsha" },
    { id: "default_flash", type: "flash" },
    { id: "default_weekly", type: "weekly" },
  ];

  const slides = [...activeCustomBanners, ...defaultBanners];
  const totalSlides = slides.length;

  const nextSlide = () => {
    setActiveIndex((prev) => (prev + 1) % totalSlides);
  };

  const prevSlide = () => {
    setActiveIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  // Render the sliding banners with standard height
  const containerHeightClass = "h-[145px] sm:h-[170px]";

  return (
    <section className="max-w-7xl mx-auto px-4 mt-4 relative">
      {/* Slider Container with smooth height transition */}
      <div 
        className={`w-full relative rounded-2xl overflow-hidden shadow-md transition-all duration-300 ease-out border border-slate-100 ${containerHeightClass}`}
        id="home-banner-slider"
      >
        {/* Navigation Buttons (Always visible on hover, elegant design) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            prevSlide();
          }}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition backdrop-blur-xs focus:outline-none cursor-pointer"
          aria-label="Previous slide"
          id="btn-slider-prev"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            nextSlide();
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition backdrop-blur-xs focus:outline-none cursor-pointer"
          aria-label="Next slide"
          id="btn-slider-next"
        >
          <ArrowRight className="w-4 h-4" />
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

              // Check if it's a default template banner
              if (slide.type === "referral") {
                return (
                  <div 
                    onClick={onReferralClick}
                    className="w-full h-full bg-gradient-to-r from-emerald-950 via-emerald-800 to-teal-950 text-white p-4 sm:p-6 flex items-center justify-between relative overflow-hidden cursor-pointer select-none"
                  >
                    {/* Decorative glowing particles */}
                    <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none"></div>
                    
                    <div className="z-10 space-y-1 sm:space-y-1.5 max-w-[70%]">
                      <div className="flex items-center space-x-1.5">
                        <span className="bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded text-[8px] sm:text-[10px] font-bold tracking-wider text-emerald-300 uppercase">
                          {lang === "bn" ? "আমন্ত্রণ ও পুরস্কার" : "REFERRAL REWARD"}
                        </span>
                        {userReferralCode && (
                          <span className="bg-white/10 border border-white/20 rounded px-2 py-0.5 text-[8px] sm:text-[10px] font-mono font-bold tracking-wider text-yellow-300">
                            {userReferralCode}
                          </span>
                        )}
                      </div>
                      
                      <h3 className="text-sm sm:text-base md:text-lg font-extrabold text-white leading-tight">
                        {lang === "bn" 
                          ? "🎉 বন্ধুদের আমন্ত্রণ জানান, ৳৫০ বোনাস জিতুন!" 
                          : "🎉 Refer Friends, Earn ৳50 Wallet Credit!"}
                      </h3>
                      
                      <p className="text-[10px] sm:text-xs text-emerald-100 font-medium truncate">
                        {lang === "bn"
                          ? "বন্ধুরা প্রথম অর্ডারে পাবেন ফ্রি ডেলিভারি এবং আপনার ওয়ালেটে যোগ হবে ৳৫০ ক্যাশব্যাক।"
                          : "Friends get Free Delivery on first order. You earn BDT 50 wallet cashback."}
                      </p>
                    </div>

                    <div className="z-10 shrink-0 flex flex-col items-end gap-1.5">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onReferralClick();
                        }}
                        className="bg-gradient-to-r from-yellow-400 to-amber-400 hover:from-yellow-300 hover:to-amber-300 text-slate-950 px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-extrabold transition-all duration-300 flex items-center space-x-1 shadow hover:scale-105 active:scale-95 cursor-pointer"
                      >
                        <span>{lang === "bn" ? "রেফার করুন" : "Refer Now"}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                      <span className="text-[8px] sm:text-[10px] text-emerald-200/80 font-medium">
                        {lang === "bn" ? "*শর্ত প্রযোজ্য" : "*T&C Apply"}
                      </span>
                    </div>
                  </div>
                );
              }

              if (slide.type === "promo") {
                return (
                  <div className="w-full h-full bg-gradient-to-r from-emerald-700 via-teal-600 to-green-700 text-white p-4 sm:p-6 flex items-center justify-between relative overflow-hidden select-none">
                    <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-20 pointer-events-none bg-[url('https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80')] bg-cover bg-center"></div>
                    <div className="z-10 space-y-1 sm:space-y-1.5 max-w-[70%]">
                      <span className="bg-emerald-800/60 border border-emerald-500/30 px-2 py-0.5 rounded text-[8px] sm:text-[10px] font-bold tracking-wider text-emerald-200 uppercase">
                        {lang === "bn" ? "ফ্ল্যাশ ক্যাম্পেইন" : "FLASH CAMPAIGN"}
                      </span>
                      <h3 className="text-sm sm:text-base md:text-lg font-extrabold text-white leading-tight">
                        {lang === "bn" ? "সরাসরি মাঠ থেকে আপনার রান্নাঘরে" : "Directly from Farms to Your Kitchen"}
                      </h3>
                      <p className="text-[10px] sm:text-xs text-emerald-100 font-medium truncate">
                        {lang === "bn" ? "⚡ ১ ঘণ্টার মধ্যে ডেলিভারি, একদম সতেজ এবং খাঁটি গ্যারান্টি" : "⚡ 1 Hour Delivery of fresh organic produce"}
                      </p>
                      <span className="text-[10px] sm:text-xs text-yellow-300 font-bold block">
                        {lang === "bn" ? "২৫% পর্যন্ত মেগা ছাড়" : "UP TO 25% MEGA SAVINGS"}
                      </span>
                    </div>
                    <div className="z-10 shrink-0">
                      <div className="bg-white text-emerald-800 px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-extrabold shadow hover:bg-emerald-50 transition cursor-pointer flex items-center gap-1">
                        <span>{lang === "bn" ? "কিনুন" : "Shop Now"}</span>
                        <ArrowRight className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                );
              }

              if (slide.type === "mango") {
                return (
                  <div className="w-full h-full bg-gradient-to-r from-orange-600 via-amber-500 to-yellow-600 text-white p-4 sm:p-6 flex items-center justify-between relative overflow-hidden select-none">
                    <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-20 pointer-events-none bg-[url('https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=400&q=80')] bg-cover bg-center"></div>
                    <div className="z-10 space-y-1 sm:space-y-1.5 max-w-[70%]">
                      <span className="bg-amber-700/60 border border-amber-500/30 px-2 py-0.5 rounded text-[8px] sm:text-[10px] font-bold tracking-wider text-amber-100 uppercase">
                        {lang === "bn" ? "আমের মৌসুম" : "MANGO MANIA"}
                      </span>
                      <h3 className="text-sm sm:text-base md:text-lg font-extrabold text-white leading-tight">
                        {lang === "bn" ? "রাজশাহীর মিষ্টি হিমসাগর আমমেলা" : "Sweet & Luscious Himsagar Mango Fest"}
                      </h3>
                      <p className="text-[10px] sm:text-xs text-amber-50 font-medium truncate">
                        {lang === "bn" ? "১০০% ফরমালিন ও রাসায়নিক মুক্ত গাছের পাকা আম" : "100% chemical-free naturally tree-ripened sweet mangoes"}
                      </p>
                      <span className="text-[10px] sm:text-xs text-yellow-200 font-bold block">
                        {lang === "bn" ? "১৮% সরাসরি মূল্যছাড়" : "UP TO 18% DIRECT CUT"}
                      </span>
                    </div>
                    <div className="z-10 shrink-0">
                      <div className="bg-white text-amber-700 px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-extrabold shadow hover:bg-amber-50 transition cursor-pointer flex items-center gap-1">
                        <span>{lang === "bn" ? "আম কিনুন" : "Buy Mangoes"}</span>
                        <ArrowRight className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                );
              }

              if (slide.type === "hilsha") {
                return (
                  <div className="w-full h-full bg-gradient-to-r from-indigo-700 via-blue-600 to-cyan-700 text-white p-4 sm:p-6 flex items-center justify-between relative overflow-hidden select-none">
                    <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-20 pointer-events-none bg-[url('https://images.unsplash.com/photo-1534604973900-c43ab4c2e0ab?auto=format&fit=crop&w=400&q=80')] bg-cover bg-center"></div>
                    <div className="z-10 space-y-1 sm:space-y-1.5 max-w-[70%]">
                      <span className="bg-indigo-800/60 border border-indigo-500/30 px-2 py-0.5 rounded text-[8px] sm:text-[10px] font-bold tracking-wider text-indigo-100 uppercase">
                        {lang === "bn" ? "সরাসরি সোর্স" : "DIRECTLY SOURCED"}
                      </span>
                      <h3 className="text-sm sm:text-base md:text-lg font-extrabold text-white leading-tight">
                        {lang === "bn" ? "পদ্মার রূপালী ইলিশ উৎসব চলছে!" : "Padma River Hilsha Festival!"}
                      </h3>
                      <p className="text-[10px] sm:text-xs text-indigo-50 font-medium truncate">
                        {lang === "bn" ? "নদী থেকে ধৃত সরাসরি ইলিশ, স্বাদে ও আকৃতিতে শতভাগ খাঁটি" : "Authentic river-caught Silver Hilsha with unmatched flavor"}
                      </p>
                      <span className="text-[10px] sm:text-xs text-cyan-200 font-bold block">
                        {lang === "bn" ? "ফ্ল্যাট ১২% সরাসরি ছাড়" : "FLAT 12% INSTANT DISCOUNT"}
                      </span>
                    </div>
                    <div className="z-10 shrink-0">
                      <div className="bg-white text-indigo-800 px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-extrabold shadow hover:bg-indigo-50 transition cursor-pointer flex items-center gap-1">
                        <span>{lang === "bn" ? "অর্ডার দিন" : "Order Now"}</span>
                        <ArrowRight className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                );
              }

              if (slide.type === "flash") {
                return (
                  <div 
                    onClick={onFlashSaleClick}
                    className="w-full h-full bg-gradient-to-r from-rose-800 via-red-600 to-orange-600 text-white p-4 sm:p-6 flex items-center justify-between relative overflow-hidden cursor-pointer select-none"
                  >
                    <div className="absolute right-0 top-0 bottom-0 w-1/4 opacity-15 pointer-events-none bg-[url('https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=300&q=80')] bg-cover bg-center"></div>
                    <div className="z-10 space-y-1 sm:space-y-1.5 max-w-[65%]">
                      <div className="flex items-center space-x-1">
                        <span className="bg-black/40 border border-red-400/40 px-2 py-0.5 rounded text-[8px] sm:text-[10px] font-bold tracking-wider text-yellow-300 uppercase flex items-center gap-1 animate-pulse">
                          <Zap className="w-3 h-3 text-yellow-300 fill-yellow-300" />
                          <span>{lang === "bn" ? "সীমিত অফার" : "FLASH SALE"}</span>
                        </span>
                      </div>
                      <h3 className="text-sm sm:text-base md:text-lg font-extrabold text-white leading-tight">
                        {lang === "bn" ? "⚡ ফ্ল্যাশ সেল মেগা অফার চলছে!" : "⚡ Flash Sale Megadeal is LIVE!"}
                      </h3>
                      <p className="text-[10px] sm:text-xs text-rose-100 font-medium truncate">
                        {lang === "bn" ? "সেরা মূল্যে সতেজ পণ্য স্টক ফুরানোর আগেই কিনে নিন" : "Unbeatable prices on organic foods. Stock is running out fast!"}
                      </p>
                    </div>

                    <div className="z-10 flex flex-col items-end shrink-0 bg-black/30 backdrop-blur-xs p-2 rounded-xl border border-white/10">
                      <span className="text-[8px] sm:text-[10px] font-bold text-rose-200 mb-1 uppercase tracking-wider">
                        {lang === "bn" ? "সময় বাকি:" : "ENDS IN:"}
                      </span>
                      <div className="flex items-center space-x-1 text-xs sm:text-sm font-black text-yellow-300 font-mono">
                        <span className="bg-white/10 px-1.5 py-0.5 rounded">{fmtNum(timeLeft.hours.toString().padStart(2, "0"))}</span>
                        <span>:</span>
                        <span className="bg-white/10 px-1.5 py-0.5 rounded">{fmtNum(timeLeft.minutes.toString().padStart(2, "0"))}</span>
                        <span>:</span>
                        <span className="bg-white/10 px-1.5 py-0.5 rounded">{fmtNum(timeLeft.seconds.toString().padStart(2, "0"))}</span>
                      </div>
                    </div>
                  </div>
                );
              }

              if (slide.type === "weekly") {
                return (
                  <div className="w-full h-full bg-gradient-to-r from-rose-700 via-red-600 to-pink-700 text-white p-4 sm:p-6 flex items-center justify-between relative overflow-hidden select-none">
                    <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-20 pointer-events-none bg-[url('https://images.unsplash.com/photo-1506617498319-3310023a1a01?auto=format&fit=crop&w=400&q=80')] bg-cover bg-center"></div>
                    <div className="z-10 space-y-1 sm:space-y-1.5 max-w-[70%]">
                      <span className="bg-rose-800/60 border border-rose-500/30 px-2 py-0.5 rounded text-[8px] sm:text-[10px] font-bold tracking-wider text-rose-100 uppercase">
                        {lang === "bn" ? "সাপ্তাহিক বাজার" : "WEEKLY BAZAR"}
                      </span>
                      <h3 className="text-sm sm:text-base md:text-lg font-extrabold text-white leading-tight">
                        {lang === "bn" ? "উইকেন্ড ফ্যামিলি গ্রোসারি মেলা" : "Weekend Family Grocery Fair"}
                      </h3>
                      <p className="text-[10px] sm:text-xs text-rose-50 font-medium truncate">
                        {lang === "bn" ? "চাল, ডাল, তেল ও ডিমের বাজারে বিশেষ ছাড়" : "Massive savings on everyday staple household essentials"}
                      </p>
                      <span className="text-[10px] sm:text-xs text-yellow-200 font-bold block">
                        {lang === "bn" ? "সর্বোচ্চ ৩০০ টাকা ক্যাশব্যাক" : "UP TO BDT 300 CASHBACK"}
                      </span>
                    </div>
                    <div className="z-10 shrink-0">
                      <div className="bg-white text-rose-700 px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-extrabold shadow hover:bg-rose-50 transition cursor-pointer flex items-center gap-1">
                        <span>{lang === "bn" ? "কিনুন" : "Explore Now"}</span>
                        <ArrowRight className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                );
              }

              // Otherwise, it is an active Custom Banner from Firestore!
              return (
                <div className={`w-full h-full bg-gradient-to-r ${slide.bgGradient || "from-emerald-700 via-teal-600 to-green-700"} text-white p-4 sm:p-6 flex items-center justify-between relative overflow-hidden select-none`}>
                  {slide.image && (
                    <div 
                      className="absolute right-0 top-0 bottom-0 w-1/3 opacity-30 pointer-events-none bg-cover bg-center" 
                      style={{ backgroundImage: `url(${slide.image})` }}
                    ></div>
                  )}
                  <div className="z-10 space-y-1 sm:space-y-1.5 max-w-[70%]">
                    {(slide.tagEn || slide.tagBn) && (
                      <span className="bg-emerald-900/60 border border-emerald-500/35 px-2 py-0.5 rounded text-[8px] sm:text-[10px] font-bold tracking-wider text-emerald-200 uppercase">
                        {lang === "bn" ? slide.tagBn || slide.tagEn : slide.tagEn || slide.tagBn}
                      </span>
                    )}
                    <h3 className="text-sm sm:text-base md:text-lg font-extrabold text-white leading-tight">
                      {lang === "bn" ? slide.titleBn || slide.titleEn : slide.titleEn || slide.titleBn}
                    </h3>
                    {(slide.tagEn || slide.tagBn) && (
                      <span className="text-[10px] sm:text-xs text-yellow-300 font-bold block">
                        {lang === "bn" ? slide.tagBn || slide.tagEn : slide.tagEn || slide.tagBn}
                      </span>
                    )}
                  </div>
                  <div className="z-10 shrink-0">
                    <div className="bg-white text-emerald-800 px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-extrabold shadow hover:bg-emerald-50 transition cursor-pointer flex items-center gap-1">
                      <span>{lang === "bn" ? "কিনুন" : "Shop Now"}</span>
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              );
            })()}
          </motion.div>
        </AnimatePresence>

        {/* Circular Bottom Dot Indicators */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex space-x-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                setActiveIndex(i);
              }}
              className={`w-2 h-2 rounded-full transition-all duration-300 focus:outline-none cursor-pointer ${
                i === activeIndex 
                  ? "bg-white w-5" 
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
