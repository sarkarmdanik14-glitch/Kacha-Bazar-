import React, { useState, useEffect } from "react";
import { APP_LOGO_URL } from "../constants/branding";

interface AppSplashScreenProps {
  onFinish?: () => void;
  minDurationMs?: number;
}

export const AppSplashScreen: React.FC<AppSplashScreenProps> = ({
  onFinish,
  minDurationMs = 2000,
}) => {
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(true);

  useEffect(() => {
    // Keep splash screen visible for at least minDurationMs for a smooth, premium feel
    const timer = setTimeout(() => {
      setIsFadingOut(true);
    }, minDurationMs);

    return () => clearTimeout(timer);
  }, [minDurationMs]);

  useEffect(() => {
    if (isFadingOut) {
      const exitTimer = setTimeout(() => {
        setIsMounted(false);
        if (onFinish) onFinish();
      }, 700); // 700ms fade-out transition duration

      return () => clearTimeout(exitTimer);
    }
  }, [isFadingOut, onFinish]);

  if (!isMounted) return null;

  return (
    <div
      onClick={() => setIsFadingOut(true)}
      className={`fixed inset-0 z-[999999] flex flex-col items-center justify-center select-none overflow-hidden transition-all duration-700 ease-out cursor-pointer ${
        isFadingOut
          ? "opacity-0 scale-105 pointer-events-none"
          : "opacity-100 scale-100"
      }`}
      style={{
        background: "radial-gradient(circle at center, #065f46 0%, #064e3b 45%, #022c22 100%)",
      }}
      aria-hidden="true"
    >
      {/* Background Ambient Radial Light Glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[480px] h-[340px] sm:h-[480px] rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(16, 185, 129, 0.35) 0%, rgba(5, 150, 105, 0.15) 50%, rgba(6, 78, 59, 0) 75%)",
          }}
        />
        <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-black/20 to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
      </div>

      {/* Main Centered Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-4">
        
        {/* Animated Breathing / Pulsing Logo */}
        <div className="relative flex items-center justify-center mb-6">
          {/* Subtle Outer Pulsing Halo Rings */}
          <div 
            className="absolute rounded-full pointer-events-none border border-emerald-400/30"
            style={{
              width: "180px",
              height: "180px",
              animation: "haloPulse 2.4s infinite ease-in-out",
            }}
          />
          <div 
            className="absolute rounded-full pointer-events-none border border-emerald-300/20"
            style={{
              width: "210px",
              height: "210px",
              animation: "haloPulse 2.4s infinite ease-in-out 0.4s",
            }}
          />

          {/* Logo Badge Container with Smooth Scale Animation */}
          <div 
            className="w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-white p-2.5 sm:p-3 shadow-2xl shadow-emerald-950/90 border-4 border-emerald-400/50 flex items-center justify-center overflow-hidden"
            style={{
              animation: "logoBreathe 2.4s infinite ease-in-out",
              boxShadow: "0 20px 50px -10px rgba(2, 44, 34, 0.9), 0 0 35px 2px rgba(16, 185, 129, 0.4)",
            }}
          >
            <img
              src={APP_LOGO_URL}
              alt="মেগা বাজার"
              className="w-full h-full object-contain rounded-full select-none"
              draggable={false}
            />
          </div>
        </div>

        {/* Brand Name Typography */}
        <div className="space-y-1.5 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-md">
            মেগা বাজার
          </h1>

          <div className="inline-flex items-center gap-1.5 bg-emerald-900/80 backdrop-blur-xs text-emerald-200 text-xs sm:text-sm font-extrabold uppercase tracking-widest px-4 py-1 rounded-full border border-emerald-400/30 shadow-inner">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            <span>হোম ডেলিভারি</span>
          </div>
        </div>

        {/* Shimmering Progress Bar */}
        <div className="mt-8 flex flex-col items-center space-y-2">
          <div className="w-36 sm:w-44 h-1.5 bg-emerald-950/80 rounded-full overflow-hidden border border-emerald-800/60 p-0.5">
            <div 
              className="h-full bg-gradient-to-r from-emerald-400 via-teal-200 to-emerald-400 rounded-full"
              style={{
                width: "100%",
                animation: "shimmerProgress 1.8s infinite linear",
              }}
            />
          </div>
          <span className="text-[11px] font-semibold text-emerald-300/80 tracking-wide">
            স্বাগতম... লোড হচ্ছে
          </span>
        </div>

      </div>

      {/* Embedded CSS Animations */}
      <style>{`
        @keyframes logoBreathe {
          0%, 100% {
            transform: scale(0.95);
          }
          50% {
            transform: scale(1.08);
          }
        }

        @keyframes haloPulse {
          0%, 100% {
            transform: scale(0.92);
            opacity: 0.4;
          }
          50% {
            transform: scale(1.15);
            opacity: 0.15;
          }
        }

        @keyframes shimmerProgress {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
};
