import React, { useState, useEffect } from "react";
import { 
  Download, 
  X, 
  Smartphone, 
  Sparkles, 
  CheckCircle2, 
  QrCode, 
  ShoppingBag, 
  ArrowRight,
  ShieldCheck,
  Zap
} from "lucide-react";
import logoImg from "../assets/images/logo_1783882658678.jpg";
import { 
  isPWAInstalled, 
  getClientPlatform, 
  getGlobalDeferredPrompt, 
  BeforeInstallPromptEvent,
  openPWAQRCodeModal
} from "../utils/pwa";
import { PWAQRCodeModal } from "./PWAQRCodeModal";

interface PWAInstallBannerProps {
  lang: "bn" | "en";
}

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({ lang }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState<boolean>(false);
  const [showLandingModal, setShowLandingModal] = useState<boolean>(false);
  const [showQRModal, setShowQRModal] = useState<boolean>(false);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [showIOSGuide, setShowIOSGuide] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isInstalling, setIsInstalling] = useState<boolean>(false);
  const [platformInfo, setPlatformInfo] = useState(getClientPlatform());
  const [autoPromptAttempted, setAutoPromptAttempted] = useState<boolean>(false);

  useEffect(() => {
    // 1. Initial State Check
    const installed = isPWAInstalled();
    setIsInstalled(installed);
    const platform = getClientPlatform();
    setPlatformInfo(platform);

    // 2. Check if user arrived via QR Code Scan (?pwa_install=true or ?scan=qr)
    let isQRScan = false;
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      isQRScan = urlParams.get("pwa_install") === "true" || urlParams.get("scan") === "qr";
      
      // If NOT already installed and arrived via QR Scan, display QR Landing Card
      if (isQRScan && !installed) {
        setShowLandingModal(true);
      }
    }

    // Function to attempt auto-triggering native install prompt for QR visitors
    const tryAutoPrompt = async (promptObj: BeforeInstallPromptEvent) => {
      if (installed || isPWAInstalled()) return;
      if (!isQRScan || autoPromptAttempted) return;

      setAutoPromptAttempted(true);
      try {
        console.log("[PWA] Attempting automatic native install prompt for QR visitor...");
        await promptObj.prompt();
        const { outcome } = await promptObj.userChoice;
        console.log("[PWA] Auto-prompt outcome:", outcome);
        if (outcome === "accepted") {
          setShowLandingModal(false);
          setShowBanner(false);
        }
      } catch (err) {
        console.warn("[PWA] Automatic prompt deferred by browser policy until user click:", err);
        // If automatic invocation without user gesture is blocked by browser,
        // showLandingModal is already true with the prominent 1-click Install button!
      }
    };

    // 3. Retrieve global cached prompt if already fired
    const cachedPrompt = getGlobalDeferredPrompt();
    if (cachedPrompt) {
      setDeferredPrompt(cachedPrompt);
      if (!installed) {
        if (isQRScan) {
          setTimeout(() => tryAutoPrompt(cachedPrompt), 500);
        } else {
          setShowBanner(true);
        }
      }
    }

    // 4. Listen for prompt available event
    const handlePromptAvailable = () => {
      const prompt = getGlobalDeferredPrompt();
      setDeferredPrompt(prompt);
      if (!isPWAInstalled()) {
        if (isQRScan && prompt) {
          setTimeout(() => tryAutoPrompt(prompt), 500);
        } else {
          setShowBanner(true);
        }
      }
    };

    window.addEventListener("pwa-prompt-available", handlePromptAvailable);

    // 5. Listen for successful install event
    const handleInstallSuccess = () => {
      setIsInstalled(true);
      setShowBanner(false);
      setShowLandingModal(false);
      setShowSuccessModal(true);
      setDeferredPrompt(null);
      console.log("[PWA] App successfully installed event caught!");
    };

    window.addEventListener("pwa-installed-success", handleInstallSuccess);
    window.addEventListener("appinstalled", handleInstallSuccess);

    // 6. Listen for manual trigger events from header / portal
    const handleOpenInstall = () => {
      if (isPWAInstalled()) {
        setShowLandingModal(true);
      } else {
        setShowLandingModal(true);
      }
    };

    const handleOpenQR = () => {
      setShowQRModal(true);
    };

    window.addEventListener("open-pwa-install-modal", handleOpenInstall);
    window.addEventListener("open-pwa-qrcode-modal", handleOpenQR);

    // If iOS and not installed, show banner after 3 seconds if not dismissed
    if (platform.isIOS && !installed && !isQRScan) {
      const dismissed = localStorage.getItem("pwa_dismissed_time");
      if (!dismissed || Date.now() - parseInt(dismissed, 10) > 24 * 60 * 60 * 1000) {
        const timer = setTimeout(() => setShowBanner(true), 2500);
        return () => clearTimeout(timer);
      }
    }

    return () => {
      window.removeEventListener("pwa-prompt-available", handlePromptAvailable);
      window.removeEventListener("pwa-installed-success", handleInstallSuccess);
      window.removeEventListener("appinstalled", handleInstallSuccess);
      window.removeEventListener("open-pwa-install-modal", handleOpenInstall);
      window.removeEventListener("open-pwa-qrcode-modal", handleOpenQR);
    };
  }, [autoPromptAttempted]);

  // Main Install Action Function
  const handleInstallClick = async () => {
    // If prompt is ready (Android Chrome, Desktop Chrome/Edge)
    const activePrompt = deferredPrompt || getGlobalDeferredPrompt();
    if (activePrompt) {
      try {
        setIsInstalling(true);
        await activePrompt.prompt();
        const { outcome } = await activePrompt.userChoice;
        if (outcome === "accepted") {
          console.log("[PWA] User confirmed app installation");
          setShowLandingModal(false);
          setShowBanner(false);
        } else {
          console.log("[PWA] User dismissed app installation");
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.error("[PWA] Install prompt error:", err);
      } finally {
        setIsInstalling(false);
      }
      return;
    }

    // If iOS Safari
    if (platformInfo.isIOS) {
      setShowLandingModal(false);
      setShowIOSGuide(true);
      return;
    }

    // If already installed
    if (isInstalled) {
      setShowLandingModal(false);
      setShowSuccessModal(true);
      return;
    }

    // If desktop or mobile without prompt captured yet, guide user
    if (platformInfo.isDesktop) {
      alert(
        lang === "bn" 
          ? "ব্রাউজারের অ্যাড্রেস বারের ডান পাশে থাকা 'Install App' (⊕) আইকনে ক্লিক করে ইনস্টল করুন।" 
          : "Click the 'Install App' (⊕) icon in your browser's address bar."
      );
    } else {
      setShowIOSGuide(true);
    }
  };

  const handleDismissBanner = () => {
    setShowBanner(false);
    localStorage.setItem("pwa_dismissed_time", Date.now().toString());
  };

  return (
    <>
      {/* 1. Dedicated Landing Modal for QR Code Scan Visitors */}
      {showLandingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            id="pwa-qr-landing-card"
            className="bg-white max-w-sm w-full rounded-3xl p-5 sm:p-6 shadow-2xl border border-emerald-100 text-center space-y-4 animate-in zoom-in-95 duration-200 relative overflow-hidden"
          >
            {/* Top Close Button */}
            <button
              onClick={() => setShowLandingModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* App Icon with Glow */}
            <div className="relative mx-auto w-20 h-20 pt-1">
              <div className="absolute inset-0 bg-emerald-500/20 rounded-2xl blur-lg animate-pulse"></div>
              <img 
                src={logoImg} 
                alt="কাচা বাজার App Icon" 
                className="relative w-20 h-20 rounded-2xl object-cover shadow-lg border-2 border-emerald-500 mx-auto"
              />
              <span className="absolute -bottom-1 -right-1 bg-emerald-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full border border-white shadow-xs">
                PWA
              </span>
            </div>

            {/* Title & Subtitle */}
            <div className="space-y-1.5 pt-1">
              <h3 className="text-lg font-black text-slate-800 tracking-tight">
                📱 {lang === "bn" ? "কাঁচা বাজার অ্যাপ ইনস্টল করুন" : "Install Kacha Bazar App"}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {lang === "bn"
                  ? "আরও দ্রুত ও সহজে কাঁচা বাজার ব্যবহার করতে অ্যাপটি ইনস্টল করুন।"
                  : "Install the app for the fastest ordering experience and instant deals."}
              </p>
            </div>

            {/* Value Highlights */}
            <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-3 text-left space-y-2 text-xs text-slate-700">
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="text-[11px] font-semibold">
                  {lang === "bn" ? "১৫ মিনিটে দ্রুত ডেলিভারি নোটিফিকেশন" : "15-minute quick delivery updates"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="text-[11px] font-semibold">
                  {lang === "bn" ? "কোনো মেমরি বা স্টোরেজ খরচ ছাড়াই দ্রুত চালু" : "Instant launch with zero storage footprint"}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              {isInstalled ? (
                <div className="space-y-2">
                  <div className="p-2.5 bg-emerald-100 text-emerald-800 text-xs font-black rounded-xl flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{lang === "bn" ? "অ্যাপটি ইতিমধ্যে ইনস্টল করা আছে" : "App is already installed"}</span>
                  </div>
                  <button
                    onClick={() => setShowLandingModal(false)}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>{lang === "bn" ? "শপিং শুরু করুন" : "Start Shopping"}</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleInstallClick}
                  disabled={isInstalling}
                  className="w-full py-3 bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-98 text-white font-black text-sm rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4 animate-bounce" />
                  <span>
                    {isInstalling 
                      ? (lang === "bn" ? "ইনস্টল হচ্ছে..." : "Installing...") 
                      : (lang === "bn" ? "অ্যাপ ইনস্টল করুন" : "Install App")}
                  </span>
                </button>
              )}

              <button
                onClick={() => setShowLandingModal(false)}
                className="text-xs text-slate-500 hover:text-slate-700 font-bold py-1 transition cursor-pointer"
              >
                {lang === "bn" ? "ব্রাউজারে চালিয়ে যান" : "Continue in browser"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Floating Bottom PWA Banner (Non-Intrusive) */}
      {!isInstalled && showBanner && !showLandingModal && (
        <div 
          id="pwa-floating-banner"
          className="fixed bottom-4 left-3 right-3 sm:left-auto sm:right-5 sm:max-w-md z-40 bg-white/95 backdrop-blur-md border border-emerald-500/30 rounded-2xl shadow-xl p-3 sm:p-3.5 transition-all animate-in slide-in-from-bottom-5 duration-300"
        >
          <div className="flex items-center gap-3">
            {/* App Icon */}
            <div className="relative shrink-0">
              <img 
                src={logoImg} 
                alt="কাচা বাজার Logo" 
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl object-cover border border-emerald-100 shadow-2xs"
              />
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 text-[8px] text-white font-bold">
                ★
              </span>
            </div>

            {/* Info Text */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs sm:text-sm font-black text-slate-800 truncate">
                  {lang === "bn" ? "কাচা বাজার অ্যাপ" : "Kacha Bazar App"}
                </h4>
                <span className="bg-emerald-100 text-emerald-800 text-[8.5px] font-extrabold px-1.5 py-0.2 rounded shrink-0">
                  PWA
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 leading-tight mt-0.5 line-clamp-1">
                {lang === "bn" 
                  ? "আরও দ্রুত অর্ডারের জন্য অ্যাপ ইনস্টল করুন" 
                  : "Instant access, fast orders & offline support"}
              </p>
            </div>

            {/* Action Buttons: QR + Install + Close */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowQRModal(true)}
                className="p-1.5 sm:px-2 sm:py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1 cursor-pointer border border-emerald-200"
                title={lang === "bn" ? "QR কোড দেখুন" : "View QR Code"}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">QR</span>
              </button>

              <button
                type="button"
                onClick={handleInstallClick}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{lang === "bn" ? "ইনস্টল" : "Install"}</span>
              </button>
              
              <button
                type="button"
                onClick={handleDismissBanner}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                title={lang === "bn" ? "বন্ধ করুন" : "Dismiss"}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Success Celebration Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white max-w-sm w-full rounded-3xl p-6 text-center space-y-4 shadow-2xl border border-emerald-100 animate-in zoom-in-95">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-800">
                🎉 {lang === "bn" ? "অভিনন্দন! অ্যাপ ইনস্টল হয়েছে" : "App Installed Successfully!"}
              </h3>
              <p className="text-xs text-slate-500">
                {lang === "bn" 
                  ? "কাচা বাজার অ্যাপটি আপনার হোমস্ক্রিন বা অ্যাপ লিস্টে যুক্ত হয়েছে।" 
                  : "Kacha Bazar is now installed on your home screen."}
              </p>
            </div>
            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
            >
              {lang === "bn" ? "শপিং শুরু করুন" : "Start Shopping"}
            </button>
          </div>
        </div>
      )}

      {/* 4. iOS / Unsupported Browser Manual Installation Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl space-y-4 animate-in zoom-in-95 border border-emerald-100">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-emerald-600" />
                <h3 className="font-black text-slate-800 text-sm">
                  {lang === "bn" ? "সহজ ইনস্টলেশন নির্দেশিকা" : "Installation Guide"}
                </h3>
              </div>
              <button 
                onClick={() => setShowIOSGuide(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0 text-xs">1</span>
                <p>
                  {lang === "bn" 
                    ? "Safari বা ব্রাউজারের নিচে শেয়ার (Share ⎋) বা মেনু (⋮) আইকনে ট্যাপ করুন।" 
                    : "Tap the Share button (⎋) or Menu (⋮) in your browser."}
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0 text-xs">2</span>
                <p>
                  {lang === "bn" 
                    ? 'নিচে স্ক্রল করে "Add to Home Screen" বা "হোম স্ক্রিনে যোগ করুন" সিলেক্ট করুন।' 
                    : 'Scroll down and tap "Add to Home Screen" (বা Install App).'}
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0 text-xs">3</span>
                <p>
                  {lang === "bn" 
                    ? 'উপরে "Add" চাপুন। এবার সরাসরি অ্যাপের মতো ব্যবহার করুন!' 
                    : 'Tap "Add" in the top corner to open directly as an app!'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-xs hover:bg-emerald-700 transition cursor-pointer"
            >
              {lang === "bn" ? "ঠিক আছে, বুঝেছি" : "Got it"}
            </button>
          </div>
        </div>
      )}

      {/* 5. QR Code Generator & Download Modal */}
      <PWAQRCodeModal 
        isOpen={showQRModal} 
        onClose={() => setShowQRModal(false)} 
        lang={lang} 
      />
    </>
  );
};
