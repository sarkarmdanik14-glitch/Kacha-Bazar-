import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Gift, 
  ArrowRight, 
  ArrowLeft, 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2,
  Tag,
  Star
} from "lucide-react";
import { fmtNum as formatNumber } from "../lib/formatUtils";

interface BannerSliderProps {
  lang: "bn" | "en";
  loggedInUser: any;
  userReferralCode: string;
  timeLeft: { hours: number; minutes: number; seconds: number };
  onReferralClick: () => void;
  onFlashSaleClick: () => void;
  onCategoryClick?: (categoryId: string) => void;
  customBanners?: any[];
  referralBanner?: any;
  loading?: boolean;
}

// 6 Crystal-Clear, High-Resolution Curated Hero Banners with Vibrant, Unmistakable Photography
export const DEFAULT_HERO_IMAGE_SLIDES = [
  {
    id: "hero-fresh-vegetables",
    image: "https://images.unsplash.com/photo-1610348725531-843dff563e2c?auto=format&fit=crop&w=1200&q=80",
    tagBn: "বাগান-টাটকা কাঁচাবাজার 🥦",
    tagEn: "100% Fresh Harvest 🥦",
    titleBn: "১০০% ফরমালিনমুক্ত বিষমুক্ত তাজা শাকসবজি ও ফলমূল",
    titleEn: "Fresh Chemical-Free Vegetables & Seasonal Fruits",
    subtitleBn: "সরাসরি কৃষকের খামার থেকে সংগৃহীত সেরা মানের সতেজ কাঁচাবাজার প্রতিদিন",
    subtitleEn: "Harvested fresh daily from trusted local farms to your kitchen doorstep",
    highlightBn: "⚡ ৩০ মিনিটে দ্রুততম ডেলিভারি | সর্বোচ্চ তাজা নিশ্চয়তা",
    highlightEn: "⚡ 30-min express doorstep delivery guaranteed fresh",
    buttonTextBn: "সবজি বাজার করুন",
    buttonTextEn: "Shop Vegetables",
    link: "category:vegetables",
    badgeBg: "bg-emerald-500/25 text-emerald-300 border-emerald-400/40",
    bgGradient: "from-emerald-950 via-teal-950 to-slate-950",
    featureTagBn: "১০০% অর্গানিক",
    featureTagEn: "100% Organic",
    photoCaptionBn: "তাজা শাকসবজি",
    photoCaptionEn: "Fresh Produce",
    isActive: true
  },
  {
    id: "hero-padma-hilsha",
    image: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80",
    tagBn: "নদীর তাজা মাছ 🐟",
    tagEn: "River Fish Harvest 🐟",
    titleBn: "পদ্মা ও মেঘনার ১০০% তাজা ডিমওয়ালা রুপালি ইলিশ",
    titleEn: "100% Fresh River Padma Hilsha & Sweetwater Fish",
    subtitleBn: "কোনো প্রিজারভেটিভ ছাড়া খাঁটি স্বাদের নদীর মাছ বরফজাত অবস্থায় ডেলিভারি",
    subtitleEn: "Chemical-free authentic river catch delivered with chilled chain",
    highlightBn: "✨ আজই অর্ডার করুন সেরা স্বাদের খাঁটি ইলিশ ও নদীর মাছ",
    highlightEn: "✨ Authentic sweetwater Hilsha delivered chilled",
    buttonTextBn: "তাজা মাছ দেখুন",
    buttonTextEn: "Shop Fresh Fish",
    link: "category:fish",
    badgeBg: "bg-sky-500/25 text-sky-300 border-sky-400/40",
    bgGradient: "from-sky-950 via-blue-950 to-slate-950",
    featureTagBn: "নদীর তাজা মাছ",
    featureTagEn: "Fresh River Catch",
    photoCaptionBn: "পদ্মার তাজা মাছ",
    photoCaptionEn: "Fresh Catch",
    isActive: true
  },
  {
    id: "hero-weekly-grocery",
    image: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80",
    tagBn: "সাপ্তাহিক বাজার অফার 🛒",
    tagEn: "Weekly Pantry Deals 🛒",
    titleBn: "দৈনন্দিন দরকারি অরিজিনাল মুদি পণ্য সবচেয়ে কম দামে!",
    titleEn: "Daily Grocery & Pantry Essentials at Best Prices",
    subtitleBn: "চাল, ডাল, খাঁটি সয়াবিন তেল, চিনি ও প্রিমিয়াম ব্র্যান্ডের খাঁটি মসলা",
    subtitleEn: "Rice, pulses, oils, spices and daily kitchen staples in one click",
    highlightBn: "🔥 সাপ্তাহিক সুপার সেভার অফারে বিশেষ ক্যাশব্যাক ও ছাড়",
    highlightEn: "🔥 Big weekly savings on all pantry essentials",
    buttonTextBn: "মুদি বাজার করুন",
    buttonTextEn: "Shop Groceries",
    link: "category:groceries",
    badgeBg: "bg-amber-500/25 text-amber-300 border-amber-400/40",
    bgGradient: "from-amber-950 via-orange-950 to-slate-950",
    featureTagBn: "বাজার সেরা দাম",
    featureTagEn: "Best Price",
    photoCaptionBn: "দৈনন্দিন মুদি বাজার",
    photoCaptionEn: "Grocery Essentials",
    isActive: true
  },
  {
    id: "hero-pure-dairy",
    image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=1200&q=80",
    tagBn: "খাঁটি ডেইরি ও ডিম 🥛",
    tagEn: "Pure Dairy & Farm Eggs 🥛",
    titleBn: "দেশি গাভীর খাঁটি দুধ, দানাদার ঘি ও ফার্মের টাটকা ডিম",
    titleEn: "100% Pure Organic Milk, Ghee & Fresh Eggs",
    subtitleBn: "কোনো ভেজাল ছাড়াই স্বাস্থ্যকর প্রাকৃতিক পুষ্টি আপনার পরিবারের জন্য",
    subtitleEn: "Nutritious farm-fresh dairy direct from healthy village farms",
    highlightBn: "🥛 সকালের নাস্তায় নিশ্চিত বিশুদ্ধ পুষ্টি ও ফ্রেশ স্বাদ",
    highlightEn: "🥛 Pure morning nutrition directly delivered",
    buttonTextBn: "ডেইরি সংগ্রহ করুন",
    buttonTextEn: "Shop Dairy",
    link: "category:dairy-eggs",
    badgeBg: "bg-cyan-500/25 text-cyan-300 border-cyan-400/40",
    bgGradient: "from-teal-950 via-cyan-950 to-slate-950",
    featureTagBn: "১০০% খাঁটি",
    featureTagEn: "100% Pure",
    photoCaptionBn: "খাঁটি দুধ ও ডিম",
    photoCaptionEn: "Pure Dairy",
    isActive: true
  },
  {
    id: "hero-pharmacy-care",
    image: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=1200&q=80",
    tagBn: "জরুরি স্বাস্থ্যসেবা 💊",
    tagEn: "Express Pharmacy 💊",
    titleBn: "ফার্মেসি ও প্রেসক্রিপশনের প্রয়োজনীয় সব জেনুইন ওষুধ",
    titleEn: "100% Genuine Pharmacy & Healthcare Supplies",
    subtitleBn: "জরুরি ওষুধ, ডায়াবেটিস কেয়ার ও ফার্স্ট এইড আইটেম দ্রুততম ডেলিভারি",
    subtitleEn: "Essential medicines and first aid supplies delivered safely",
    highlightBn: "🚑 অনুমোদিত আসল ঔষধ | লাইসেন্সপ্রাপ্ত ফার্মেসি সেবা",
    highlightEn: "🚑 Licensed genuine pharmacy products",
    buttonTextBn: "ওষুধ অর্ডার করুন",
    buttonTextEn: "Order Medicines",
    link: "category:pharmacy",
    badgeBg: "bg-emerald-500/25 text-emerald-300 border-emerald-400/40",
    bgGradient: "from-emerald-950 via-teal-950 to-slate-950",
    featureTagBn: "জরুরি ডেলিভারি",
    featureTagEn: "Express Care",
    photoCaptionBn: "জেনুইন ফার্মেসি",
    photoCaptionEn: "Genuine Medicine",
    isActive: true
  },
  {
    id: "app-referral-banner",
    type: "referral",
    image: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1200&q=80",
    tagBn: "আমন্ত্রণ ও পুরস্কার 🎁",
    tagEn: "REFERRAL REWARD 🎁",
    titleBn: "🎉 বন্ধুকে রেফার করুন! পান ৳১৯ নিশ্চিত বোনাস",
    titleEn: "🎉 Refer Friends & Earn ৳19 Instant Wallet Bonus!",
    subtitleBn: "আপনার কোড শেয়ার করুন, বন্ধু কেনাকাটা করলেই ওয়ালেটে ক্যাশব্যাক যোগ হবে",
    subtitleEn: "Share your code, get instant wallet cash with every successful delivered order",
    highlightBn: "💰 ওয়ালেট ব্যালেন্স সরাসরি যেকোনো অর্ডারে ব্যবহারযোগ্য",
    highlightEn: "💰 Wallet balance directly applicable for next orders",
    buttonTextBn: "রেফার করুন",
    buttonTextEn: "Refer Now",
    badgeBg: "bg-purple-500/25 text-purple-300 border-purple-400/40",
    bgGradient: "from-purple-950 via-indigo-950 to-slate-950",
    featureTagBn: "৳১৯ বোনাস",
    featureTagEn: "৳19 Bonus",
    photoCaptionBn: "ইনস্ট্যান্ট বোনাস",
    photoCaptionEn: "Instant Bonus",
    isActive: true
  }
];

export const BannerSlider: React.FC<BannerSliderProps> = ({
  lang,
  loggedInUser,
  userReferralCode,
  timeLeft,
  onReferralClick,
  onFlashSaleClick,
  onCategoryClick,
  customBanners = [],
  referralBanner,
  loading = false
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState<number>(1);
  const [isHovered, setIsHovered] = useState<boolean>(false);

  const fmtNum = (num: number | string): string => formatNumber(num, lang);

  // Modern, generous e-commerce banner height allowing photos to breathe with clear proportions
  const containerHeightClass = "h-[180px] xs:h-[205px] sm:h-[250px] md:h-[290px] lg:h-[320px]";

  // Dynamic custom referral slide if configured
  const dynamicReferralSlide = {
    id: "app-referral-banner",
    type: "referral",
    image: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1200&q=80",
    tagBn: "আমন্ত্রণ ও পুরস্কার 🎁",
    tagEn: "REFERRAL REWARD 🎁",
    titleBn: referralBanner?.titleBn || "🎉 বন্ধুকে রেফার করুন! ৳১৯ বোনাস পান",
    titleEn: referralBanner?.titleEn || "🎉 Refer Friends, Earn ৳19 Wallet Bonus!",
    subtitleBn: referralBanner?.descBn || "বন্ধুকে রেফার করুন! বন্ধু সাইন আপ করে ৩শ টাকার অর্ডার সম্পন্ন করলেই আপনি পাবেন ৳১৯ বোনাস।",
    subtitleEn: referralBanner?.descEn || "Refer friends! When your friend signs up and shops, you get ৳19 wallet bonus.",
    highlightBn: "💰 ওয়ালেট ব্যালেন্স সরাসরি যেকোনো অর্ডারে ব্যবহারযোগ্য",
    highlightEn: "💰 Wallet bonus directly applicable on orders",
    buttonTextBn: referralBanner?.buttonTextBn || "রেফার করুন",
    buttonTextEn: referralBanner?.buttonTextEn || "Refer Now",
    badgeBg: "bg-purple-500/25 text-purple-300 border-purple-400/40",
    bgGradient: "from-purple-950 via-indigo-950 to-slate-950",
    featureTagBn: "৳১৯ বোনাস",
    featureTagEn: "৳19 Bonus",
    photoCaptionBn: "ইনস্ট্যান্ট বোনাস",
    photoCaptionEn: "Instant Bonus",
    isActive: referralBanner?.enabled !== false
  };

  // Determine active slides list:
  // If admin configured custom banners exist, use them.
  // Otherwise, use DEFAULT_HERO_IMAGE_SLIDES with crystal-clear photography.
  const activeCustomBanners = (customBanners || []).filter(b => b && b.isActive !== false);

  const baseSlides = activeCustomBanners.length > 0 
    ? activeCustomBanners 
    : DEFAULT_HERO_IMAGE_SLIDES;

  const hasReferral = baseSlides.some(b => b.type === "referral" || b.id === "app-referral-banner");

  const slides = [
    ...baseSlides,
    ...(!hasReferral && dynamicReferralSlide.isActive ? [dynamicReferralSlide] : [])
  ];

  const totalSlides = slides.length;

  // Safeguard activeIndex if slides array changes dynamically
  useEffect(() => {
    if (activeIndex >= totalSlides && totalSlides > 0) {
      setActiveIndex(0);
    }
  }, [totalSlides, activeIndex]);

  const nextSlide = () => {
    if (totalSlides <= 1) return;
    setDirection(1);
    setActiveIndex((prev) => (prev + 1) % totalSlides);
  };

  const prevSlide = () => {
    if (totalSlides <= 1) return;
    setDirection(-1);
    setActiveIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  const goToSlide = (index: number) => {
    if (index === activeIndex) return;
    setDirection(index > activeIndex ? 1 : -1);
    setActiveIndex(index);
  };

  // Automatic sliding every 5 seconds (pausing on hover for readability)
  useEffect(() => {
    if (totalSlides <= 1 || isHovered) return;

    const interval = setInterval(() => {
      if (document.hidden) return;
      setDirection(1);
      setActiveIndex((prev) => (prev + 1) % totalSlides);
    }, 5000);

    return () => clearInterval(interval);
  }, [totalSlides, activeIndex, isHovered]);

  // Mobile touch swipe handling
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const hasSwipedRecently = useRef<boolean>(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = touchStartX.current - touchEndX;
    const diffY = touchStartY.current - touchEndY;

    const minSwipeDistance = 35; // px threshold for intentional swipe

    if (Math.abs(diffX) > minSwipeDistance && Math.abs(diffX) > Math.abs(diffY)) {
      hasSwipedRecently.current = true;
      setTimeout(() => {
        hasSwipedRecently.current = false;
      }, 200);

      if (diffX > 0) {
        nextSlide();
      } else {
        prevSlide();
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
  };

  // Safe slide click / CTA handler
  const handleSlideAction = (slide: any) => {
    if (hasSwipedRecently.current) return;

    if (slide.type === "referral") {
      onReferralClick();
      return;
    }

    if (slide.type === "flash") {
      onFlashSaleClick();
      return;
    }

    const targetLink = slide.link || slide.linkUrl;
    if (targetLink) {
      if (targetLink.startsWith("category:")) {
        const catId = targetLink.replace("category:", "");
        onCategoryClick?.(catId);
        return;
      }
      if (targetLink.startsWith("http")) {
        window.open(targetLink, "_blank", "noopener,noreferrer");
        return;
      }
    }
  };

  // Safe image error fallback
  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.currentTarget;
    if (target.dataset.triedFallback === "true") return;
    target.dataset.triedFallback = "true";
    target.src = "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80";
  };

  // Loading skeleton
  if (loading) {
    return (
      <section className="max-w-7xl mx-auto px-4 mt-3 sm:mt-4 relative">
        <div 
          className={`w-full relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm border border-slate-200/80 bg-slate-100 animate-pulse ${containerHeightClass}`}
        >
          <div className="w-full h-full flex items-center justify-between p-4 sm:p-8 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200">
            <div className="space-y-3 max-w-[60%]">
              <div className="h-4 w-28 bg-slate-300 rounded-full"></div>
              <div className="h-6 sm:h-9 w-60 sm:w-96 bg-slate-300 rounded-lg"></div>
              <div className="h-3 sm:h-4 w-40 sm:w-64 bg-slate-300 rounded-md"></div>
              <div className="h-8 sm:h-10 w-28 bg-slate-300 rounded-xl mt-4"></div>
            </div>
            <div className="w-[35%] h-[80%] bg-slate-300/80 rounded-2xl"></div>
          </div>
        </div>
      </section>
    );
  }

  // Animation variants
  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? "100%" : "-100%",
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? "-100%" : "100%",
      opacity: 0,
    }),
  };

  return (
    <section className="max-w-7xl mx-auto px-4 mt-3 sm:mt-4 relative">
      {/* Slider Container with responsive aspect ratio, hover pause & gesture swipe */}
      <div 
        className={`w-full relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-md sm:shadow-lg transition-all duration-300 ease-out border border-slate-200/80 dark:border-slate-800 bg-slate-950 select-none group ${containerHeightClass}`}
        id="home-banner-slider"
        style={{ touchAction: "pan-y" }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Navigation Arrows (visible on hover or always on touch) */}
        {totalSlides > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                prevSlide();
              }}
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-30 w-7 h-7 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition-all duration-200 backdrop-blur-md border border-white/20 shadow-lg hover:scale-110 active:scale-95 cursor-pointer opacity-90 sm:opacity-0 sm:group-hover:opacity-100"
              aria-label="Previous slide"
              id="btn-slider-prev"
            >
              <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                nextSlide();
              }}
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-30 w-7 h-7 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition-all duration-200 backdrop-blur-md border border-white/20 shadow-lg hover:scale-110 active:scale-95 cursor-pointer opacity-90 sm:opacity-0 sm:group-hover:opacity-100"
              aria-label="Next slide"
              id="btn-slider-next"
            >
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
            </button>
          </>
        )}

        {/* Slides Content */}
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={activeIndex}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "tween", ease: [0.25, 1, 0.5, 1], duration: 0.45 },
              opacity: { duration: 0.25 }
            }}
            className="w-full h-full relative cursor-pointer"
            onClick={() => handleSlideAction(slides[activeIndex])}
          >
            {(() => {
              const slide = slides[activeIndex];
              if (!slide) return null;

              const bgImg = slide.image || (slide.images && slide.images[0]) || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80";

              const title = lang === "bn" ? slide.titleBn || slide.titleEn : slide.titleEn || slide.titleBn;
              const subtitle = lang === "bn" ? slide.subtitleBn || slide.subtitleEn : slide.subtitleEn || slide.subtitleBn;
              const tag = lang === "bn" ? slide.tagBn || slide.tagEn : slide.tagEn || slide.tagBn;
              const highlight = lang === "bn" ? slide.highlightBn || slide.highlightEn : slide.highlightEn || slide.highlightBn;

              // Check if there is meaningful text to overlay and it is not hidden
              const hasTextContent = Boolean(title || subtitle || tag) && !slide.hideTextOverlay;

              return (
                <div className="w-full h-full relative overflow-hidden bg-slate-950">
                  
                  {/* 1. FULL BANNER COVER IMAGE: Covers 100% width and height, full bleed, no one-sided crop */}
                  <img
                    src={bgImg}
                    alt={title || "Hero Banner"}
                    className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
                    loading="eager"
                    referrerPolicy="no-referrer"
                    onError={handleImgError}
                  />

                  {/* 2. OPTIONAL TEXT OVERLAY: Only rendered if slide has text & not hideTextOverlay */}
                  {/* Gentle fade gradient on the left so typography is razor-sharp while the rest of the image stays 100% bright & visible */}
                  {hasTextContent && (
                    <div className="absolute inset-0 z-10 flex flex-col justify-center px-4 xs:px-6 sm:px-10 md:px-12 py-3 sm:py-5 bg-gradient-to-r from-black/85 via-black/45 sm:via-black/40 to-transparent max-w-[85%] sm:max-w-[70%] md:max-w-[58%]">
                      
                      {/* Badge Pill */}
                      {tag && (
                        <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] xs:text-[9.5px] sm:text-xs font-bold tracking-wider uppercase border backdrop-blur-md shadow-xs ${slide.badgeBg || "bg-emerald-500/30 text-emerald-200 border-emerald-400/40"}`}>
                            <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-300" />
                            <span>{tag}</span>
                          </span>
                          {slide.type === "referral" && userReferralCode && (
                            <span className="bg-amber-400/30 border border-amber-400/50 rounded-full px-2 py-0.5 text-[8px] xs:text-[9px] sm:text-xs font-mono font-bold tracking-wider text-amber-300 backdrop-blur-md">
                              {userReferralCode}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Main Headline */}
                      {title && (
                        <h3 className="text-sm xs:text-base sm:text-xl md:text-2xl lg:text-3xl font-black text-white leading-tight drop-shadow-md line-clamp-2">
                          {title}
                        </h3>
                      )}

                      {/* Subtitle */}
                      {subtitle && (
                        <p className="hidden xs:block text-[9.5px] sm:text-xs md:text-sm text-slate-100/95 font-medium line-clamp-1 sm:line-clamp-2 mt-0.5 sm:mt-1 drop-shadow-sm">
                          {subtitle}
                        </p>
                      )}

                      {/* Highlight Offer Line */}
                      {highlight && (
                        <div className="text-[8.5px] xs:text-[10px] sm:text-xs md:text-[13px] font-bold text-amber-300 mt-0.5 sm:mt-1 flex items-center gap-1 drop-shadow-sm">
                          <span>{highlight}</span>
                        </div>
                      )}

                      {/* CTA Button */}
                      <div className="mt-2 sm:mt-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSlideAction(slide);
                          }}
                          className="inline-flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-yellow-300 hover:to-amber-300 text-slate-950 font-black text-[9.5px] xs:text-[10.5px] sm:text-xs md:text-sm rounded-lg sm:rounded-xl shadow-lg hover:shadow-amber-400/30 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
                        >
                          <span>
                            {lang === "bn" 
                              ? slide.buttonTextBn || "অর্ডার করুন" 
                              : slide.buttonTextEn || "Shop Now"}
                          </span>
                          <ArrowRight className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />
                        </button>

                        {slide.featureTagBn && (
                          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] sm:text-xs text-emerald-200 font-bold ml-1 bg-black/40 px-2.5 py-1 rounded-lg border border-white/20 backdrop-blur-md shadow-xs">
                            <ShieldCheck className="w-3 h-3 text-emerald-400" />
                            <span>{lang === "bn" ? slide.featureTagBn : slide.featureTagEn}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Gentle bottom-right caption if configured */}
                  {!hasTextContent && (slide.photoCaptionBn || slide.featureTagBn) && (
                    <div className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 z-10">
                      <span className="inline-flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full text-[8px] xs:text-[9px] sm:text-xs font-bold text-slate-900 bg-white/95 backdrop-blur-md shadow-lg border border-white/40">
                        <CheckCircle2 className="w-2.5 sm:w-3 h-2.5 sm:h-3 text-emerald-600" />
                        <span>{lang === "bn" ? slide.photoCaptionBn || slide.featureTagBn : slide.photoCaptionEn || slide.featureTagEn}</span>
                      </span>
                    </div>
                  )}

                </div>
              );
            })()}
          </motion.div>
        </AnimatePresence>

        {/* Circular / Elongated Bottom Dot Indicators */}
        {totalSlides > 1 && (
          <div className="absolute bottom-2 sm:bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center space-x-1.5 sm:space-x-2 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/20 shadow-md">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={(e) => {
                  e.stopPropagation();
                  goToSlide(i);
                }}
                className={`transition-all duration-300 focus:outline-none cursor-pointer rounded-full ${
                  i === activeIndex 
                    ? "bg-amber-400 w-5 sm:w-7 h-1.5 sm:h-2 shadow-sm" 
                    : "bg-white/40 hover:bg-white/80 w-1.5 sm:w-2 h-1.5 sm:h-2"
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default BannerSlider;
