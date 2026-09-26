import React, { useState, useEffect } from "react";
import { 
  AlertCircle, Info, Bell, Sparkles, ChevronDown, ChevronUp, 
  X, Megaphone, Clock, ShoppingBag
} from "lucide-react";
import { db, doc, onSnapshot } from "../../lib/firebase";
import { LiveNoticeConfig, DEFAULT_LIVE_NOTICE } from "../../types";

interface LiveNoticeBannerProps {
  lang?: "bn" | "en";
  noticeOverride?: LiveNoticeConfig | null;
  className?: string;
  onNoticeStateChange?: (isActive: boolean, config: LiveNoticeConfig) => void;
}

export const LiveNoticeBanner: React.FC<LiveNoticeBannerProps> = ({
  lang = "bn",
  noticeOverride,
  className = "",
  onNoticeStateChange
}) => {
  const [notice, setNotice] = useState<LiveNoticeConfig>(noticeOverride || DEFAULT_LIVE_NOTICE);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  // Subscribe to live notice config in Firestore
  useEffect(() => {
    if (noticeOverride) {
      setNotice(noticeOverride);
      return;
    }

    const unsub = onSnapshot(
      doc(db, "settings", "notice"),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as Partial<LiveNoticeConfig>;
          const merged: LiveNoticeConfig = {
            isActive: data.isActive !== undefined ? data.isActive : true,
            badgeBn: data.badgeBn || DEFAULT_LIVE_NOTICE.badgeBn,
            badgeEn: data.badgeEn || DEFAULT_LIVE_NOTICE.badgeEn,
            titleBn: data.titleBn || DEFAULT_LIVE_NOTICE.titleBn,
            titleEn: data.titleEn || DEFAULT_LIVE_NOTICE.titleEn,
            messageBn: data.messageBn || DEFAULT_LIVE_NOTICE.messageBn,
            messageEn: data.messageEn || DEFAULT_LIVE_NOTICE.messageEn,
            theme: data.theme || DEFAULT_LIVE_NOTICE.theme,
            showDotPulse: data.showDotPulse !== undefined ? data.showDotPulse : true,
            orderDisabled: data.orderDisabled !== undefined ? data.orderDisabled : true,
            updatedAt: data.updatedAt
          };
          setNotice(merged);
          if (onNoticeStateChange) {
            onNoticeStateChange(merged.isActive, merged);
          }
        } else {
          setNotice(DEFAULT_LIVE_NOTICE);
          if (onNoticeStateChange) {
            onNoticeStateChange(DEFAULT_LIVE_NOTICE.isActive, DEFAULT_LIVE_NOTICE);
          }
        }
      },
      (err) => {
        console.warn("Notice banner real-time sync notice:", err.message);
      }
    );

    return () => unsub();
  }, [noticeOverride]);

  if (!notice.isActive || isDismissed) {
    return null;
  }

  const badgeText = lang === "bn" 
    ? (notice.badgeBn || "🔴 LIVE UPDATE") 
    : (notice.badgeEn || "🔴 LIVE UPDATE");

  const titleText = lang === "bn" 
    ? (notice.titleBn || DEFAULT_LIVE_NOTICE.titleBn) 
    : (notice.titleEn || DEFAULT_LIVE_NOTICE.titleEn);

  const messageText = lang === "bn" 
    ? (notice.messageBn || DEFAULT_LIVE_NOTICE.messageBn) 
    : (notice.messageEn || DEFAULT_LIVE_NOTICE.messageEn);

  // Theme styling presets
  const theme = notice.theme || "rose";
  const themeStyles = {
    rose: {
      wrapper: "bg-gradient-to-r from-rose-50 via-red-50 to-amber-50 border-rose-200/80 text-rose-950 shadow-sm",
      badge: "bg-rose-600 text-white border-rose-700 shadow-rose-200",
      dot: "bg-red-500",
      ping: "bg-red-400",
      accentBg: "bg-white/80 border-rose-100",
      titleColor: "text-rose-900",
      messageColor: "text-rose-800/90",
      iconColor: "text-rose-600",
      buttonHover: "hover:bg-rose-100/70 text-rose-700",
      pillBg: "bg-rose-100/80 text-rose-800 border-rose-200"
    },
    amber: {
      wrapper: "bg-gradient-to-r from-amber-50 via-orange-50 to-yellow-50 border-amber-200/80 text-amber-950 shadow-sm",
      badge: "bg-amber-600 text-white border-amber-700 shadow-amber-200",
      dot: "bg-amber-500",
      ping: "bg-amber-400",
      accentBg: "bg-white/80 border-amber-100",
      titleColor: "text-amber-950",
      messageColor: "text-amber-900/90",
      iconColor: "text-amber-600",
      buttonHover: "hover:bg-amber-100/70 text-amber-800",
      pillBg: "bg-amber-100/80 text-amber-900 border-amber-200"
    },
    emerald: {
      wrapper: "bg-gradient-to-r from-emerald-50 via-teal-50 to-green-50 border-emerald-200/80 text-emerald-950 shadow-sm",
      badge: "bg-emerald-600 text-white border-emerald-700 shadow-emerald-200",
      dot: "bg-emerald-500",
      ping: "bg-emerald-400",
      accentBg: "bg-white/80 border-emerald-100",
      titleColor: "text-emerald-950",
      messageColor: "text-emerald-900/90",
      iconColor: "text-emerald-600",
      buttonHover: "hover:bg-emerald-100/70 text-emerald-800",
      pillBg: "bg-emerald-100/80 text-emerald-900 border-emerald-200"
    },
    blue: {
      wrapper: "bg-gradient-to-r from-blue-50 via-sky-50 to-indigo-50 border-blue-200/80 text-blue-950 shadow-sm",
      badge: "bg-blue-600 text-white border-blue-700 shadow-blue-200",
      dot: "bg-blue-500",
      ping: "bg-blue-400",
      accentBg: "bg-white/80 border-blue-100",
      titleColor: "text-blue-950",
      messageColor: "text-blue-900/90",
      iconColor: "text-blue-600",
      buttonHover: "hover:bg-blue-100/70 text-blue-800",
      pillBg: "bg-blue-100/80 text-blue-900 border-blue-200"
    }
  }[theme];

  return (
    <aside 
      aria-label="Website Live Notice"
      id="website-live-notice-banner"
      className={`w-full transition-all duration-300 ${className}`}
    >
      <div className="max-w-7xl mx-auto px-2 sm:px-4 pt-2 pb-1">
        <div 
          className={`relative rounded-2xl border transition-all duration-300 overflow-hidden ${themeStyles.wrapper} ${
            isMinimized ? "py-2 px-3 sm:px-4" : "p-3 sm:p-4 md:p-4.5"
          }`}
        >
          {/* Subtle Ambient Background Decorative Glow */}
          <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-white/40 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-28 h-28 rounded-full bg-white/50 blur-xl pointer-events-none" />

          {/* Collapsed / Minimized View */}
          {isMinimized ? (
            <div className="flex items-center justify-between gap-2 relative z-10">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {/* Live Indicator Pill */}
                <div className="flex items-center gap-1.5 shrink-0 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-black bg-rose-600 text-white shadow-xs">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                  </span>
                  <span>LIVE</span>
                </div>

                <p className="text-xs sm:text-sm font-black truncate text-rose-950">
                  {titleText}
                </p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsMinimized(false)}
                  className={`p-1 sm:px-2 sm:py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${themeStyles.buttonHover}`}
                  title={lang === "bn" ? "বিস্তারিত দেখুন" : "View Details"}
                >
                  <span className="hidden sm:inline text-[11px]">{lang === "bn" ? "বিস্তারিত" : "Details"}</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* Full Expanded Live Notice Card */
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 relative z-10">
              
              {/* Left Content Column */}
              <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                
                {/* Animated Pulsing Beacon Icon */}
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/90 shadow-sm border border-rose-200/60 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                  <div className="relative flex items-center justify-center">
                    <span className="animate-ping absolute inline-flex h-6 w-6 rounded-full bg-rose-400 opacity-60"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-600 shadow-xs"></span>
                  </div>
                </div>

                {/* Text Content Area */}
                <div className="min-w-0 flex-1 space-y-1">
                  
                  {/* Badge & Meta Line */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black tracking-wide uppercase shadow-xs ${themeStyles.badge}`}>
                      {notice.showDotPulse !== false && (
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-80"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
                        </span>
                      )}
                      <span>{badgeText}</span>
                    </span>

                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold ${themeStyles.pillBg}`}>
                      <Clock className="w-3 h-3 shrink-0" />
                      <span>{lang === "bn" ? "জরুরি ঘোষণা" : "Announcement"}</span>
                    </span>
                  </div>

                  {/* Main Headline */}
                  <h3 className={`text-sm sm:text-base md:text-[16px] font-black tracking-tight leading-snug sm:leading-normal ${themeStyles.titleColor}`}>
                    {titleText}
                  </h3>

                  {/* Secondary Description Message */}
                  <p className={`text-xs sm:text-[13px] font-medium leading-relaxed ${themeStyles.messageColor}`}>
                    {messageText}
                  </p>
                </div>
              </div>

              {/* Right Action / Control Buttons */}
              <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-rose-200/40">
                <button
                  type="button"
                  onClick={() => setIsMinimized(true)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer bg-white/70 hover:bg-white border border-rose-200/60 text-slate-700 shadow-2xs`}
                  title={lang === "bn" ? "ছোট করুন" : "Minimize"}
                >
                  <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-[11px]">{lang === "bn" ? "সংক্ষেপ করুন" : "Minimize"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsDismissed(true)}
                  className={`p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white/80 transition cursor-pointer border border-transparent hover:border-slate-200/60`}
                  title={lang === "bn" ? "নোটিশ বন্ধ করুন" : "Close Notice"}
                  aria-label="Close Notice"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

            </div>
          )}

        </div>
      </div>
    </aside>
  );
};

export default LiveNoticeBanner;
