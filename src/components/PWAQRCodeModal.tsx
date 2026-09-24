import React, { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import { QrCode, Download, Copy, Check, X, Smartphone, Globe, ExternalLink, Printer, Sparkles, Share2 } from "lucide-react";
import logoImg from "../assets/images/logo_1783882658678.jpg";

interface PWAQRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: "bn" | "en";
}

export const PWAQRCodeModal: React.FC<PWAQRCodeModalProps> = ({ isOpen, onClose, lang }) => {
  const [targetUrl, setTargetUrl] = useState<string>("");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const posterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const currentOrigin = window.location.origin;
      const defaultInstallUrl = `${currentOrigin}/?pwa_install=true`;
      setTargetUrl(defaultInstallUrl);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!targetUrl) return;

    setIsGenerating(true);
    QRCode.toDataURL(targetUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: "#064e3b", // Deep emerald dark
        light: "#ffffff",
      },
      errorCorrectionLevel: "H",
    })
      .then((url) => {
        setQrDataUrl(url);
        setIsGenerating(false);
      })
      .catch((err) => {
        console.error("Failed to generate QR Code:", err);
        setIsGenerating(false);
      });
  }, [targetUrl]);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(targetUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error("Copy failed:", e);
    }
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = "kacha-bazar-pwa-qr-code.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrintFlyer = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div 
        id="pwa-qrcode-modal"
        className="max-h-[85vh] sm:max-h-[90vh] flex flex-col w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-700 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center border border-white/20 shadow-inner">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight leading-tight">
                {lang === "bn" ? "কিউআর কোড স্ক্যান করে অ্যাপ ইনস্টল" : "Scan QR Code to Install App"}
              </h3>
              <p className="text-emerald-100 text-xs font-medium mt-0.5">
                {lang === "bn" ? "যেকোনো স্মার্টফোন দিয়ে সহজে স্ক্যান করুন" : "Quick scan from any smartphone"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center transition-colors cursor-pointer"
            title={lang === "bn" ? "বন্ধ করুন" : "Close"}
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          {/* Printable QR Code Poster Card */}
          <div 
            ref={posterRef}
            className="bg-gradient-to-b from-emerald-50/80 to-slate-50 border-2 border-emerald-200/80 rounded-3xl p-5 text-center flex flex-col items-center shadow-inner relative overflow-hidden"
          >
            {/* Top Brand Banner */}
            <div className="flex items-center space-x-2 mb-3">
              <img 
                src={logoImg} 
                alt="Logo" 
                className="w-7 h-7 rounded-full border border-emerald-300 object-cover"
              />
              <span className="text-emerald-800 font-black text-sm tracking-tight">
                {lang === "bn" ? "কাচা বাজার অনলাইন সুপারশপ" : "Kacha Bazar Online Super Shop"}
              </span>
            </div>

            <p className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1.5 bg-white/90 px-3 py-1 rounded-full border border-emerald-100 shadow-2xs">
              <Smartphone className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
              <span>
                {lang === "bn" ? "ক্যামেরা দিয়ে স্ক্যান করে অ্যাপ ইনস্টল করুন" : "Scan with camera to install app"}
              </span>
            </p>

            {/* QR Code Container with Centered Logo */}
            <div className="relative p-3 bg-white rounded-2xl shadow-md border border-slate-100 flex items-center justify-center">
              {isGenerating ? (
                <div className="w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center text-slate-400 text-xs">
                  {lang === "bn" ? "কিউআর তৈরি হচ্ছে..." : "Generating QR Code..."}
                </div>
              ) : qrDataUrl ? (
                <div className="relative group">
                  <img 
                    src={qrDataUrl} 
                    alt="Kacha Bazar PWA Install QR Code" 
                    className="w-48 h-48 sm:w-56 sm:h-56 object-contain rounded-xl"
                  />
                  {/* Floating Center Brand Badge */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white p-0.5 shadow-md border border-emerald-400 flex items-center justify-center">
                      <img 
                        src={logoImg} 
                        alt="Brand Icon" 
                        className="w-full h-full rounded-full object-cover"
                      />
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Dynamic URL Label */}
            <div className="mt-3 w-full">
              <span className="text-[10px] sm:text-[11px] text-slate-500 font-mono break-all line-clamp-1">
                {targetUrl}
              </span>
            </div>
          </div>

          {/* Dynamic Link URL Input (for testing / custom domains) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-emerald-600" />
              <span>{lang === "bn" ? "টার্গেট ইনস্টল লিংক (URL):" : "Target Install URL:"}</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="https://..."
                className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-slate-700 bg-slate-50 focus:bg-white transition"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? (lang === "bn" ? "কপি হয়েছে!" : "Copied!") : (lang === "bn" ? "কপি" : "Copy")}</span>
              </button>
            </div>
          </div>

          {/* Action Buttons: Download QR & Print */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleDownloadQR}
              className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{lang === "bn" ? "QR কোড ডাউনলোড" : "Download QR Code"}</span>
            </button>

            <button
              type="button"
              onClick={() => window.open(targetUrl, "_blank")}
              className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 active:scale-98 text-slate-700 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <ExternalLink className="w-4 h-4 text-slate-500" />
              <span>{lang === "bn" ? "লিংক টেস্ট করুন" : "Test Link"}</span>
            </button>
          </div>

          {/* Scan Instructions Step-by-Step */}
          <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100 space-y-2 text-xs text-slate-600">
            <p className="font-bold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>{lang === "bn" ? "কীভাবে কাজ করে?" : "How does it work?"}</span>
            </p>
            <ol className="list-decimal list-inside space-y-1 text-[11px] sm:text-xs text-slate-600">
              <li>{lang === "bn" ? "ফোনের ক্যামেরা বা QR স্ক্যানার দিয়ে স্ক্যান করুন।" : "Scan QR code using smartphone camera or QR scanner."}</li>
              <li>{lang === "bn" ? "ওয়েবসাইটে ঢুকলেই স্বয়ংক্রিয়ভাবে ইনস্টলেশন কার্ড দেখতে পাবেন।" : "Website will open and present the 1-click Install card."}</li>
              <li>{lang === "bn" ? "‘অ্যাপ ইনস্টল করুন’ বাটনে ট্যাপ করলেই হোমস্ক্রিনে যুক্ত হয়ে যাবে।" : "Tap 'Install App' to add standalone app to home screen."}</li>
            </ol>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="flex-shrink-0 p-4 border-t flex flex-wrap gap-2 justify-end bg-gray-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
          >
            {lang === "bn" ? "বন্ধ করুন" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
};
