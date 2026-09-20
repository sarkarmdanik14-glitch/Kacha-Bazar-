import React from "react";
import { Phone, Facebook } from "lucide-react";

interface FloatingContactOverlayProps {
  hotlinePhone?: string;
  whatsappNumber?: string;
  facebookUrl?: string;
  lang?: "bn" | "en";
}

export const FloatingContactOverlay: React.FC<FloatingContactOverlayProps> = ({
  hotlinePhone = "01615581975",
  whatsappNumber = "01615581975",
  facebookUrl = "https://web.facebook.com/profile.php?id=61594593267528",
  lang = "bn"
}) => {
  // Format WhatsApp number for wa.me URL: digits only, ensuring Bangladesh country code 880
  const rawDigits = (whatsappNumber || "01615581975").replace(/\D/g, "");
  const formattedWhatsAppNumber = rawDigits.startsWith("880")
    ? rawDigits
    : rawDigits.startsWith("0")
    ? `88${rawDigits}`
    : `880${rawDigits}`;
  
  const fullWhatsAppUrl = `https://wa.me/${formattedWhatsAppNumber}`;

  // Clean Hotline for tel: link
  const cleanHotline = (hotlinePhone || "01615581975").trim();

  // Clean Facebook URL
  const rawFbUrl = (facebookUrl || "https://web.facebook.com/profile.php?id=61594593267528").trim();
  const cleanFacebookUrl = rawFbUrl.startsWith("http")
    ? rawFbUrl
    : `https://${rawFbUrl}`;

  return (
    <div
      id="floating-contact-overlay"
      className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex flex-col items-end gap-1.5 sm:gap-2 select-none pointer-events-auto"
      style={{ touchAction: "manipulation" }}
      role="region"
      aria-label={lang === "bn" ? "যোগাযোগ ও সহায়তা ওভারলে" : "Contact & Support Overlay"}
    >
      {/* 1. HOTLINE OPTION (Icon Only) */}
      <a
        href={`tel:${cleanHotline}`}
        id="floating-hotline-btn"
        title={lang === "bn" ? `হটলাইন: ${cleanHotline}` : `Hotline: ${cleanHotline}`}
        aria-label={lang === "bn" ? `হটলাইন কল করুন ${cleanHotline}` : `Call Hotline ${cleanHotline}`}
        className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-l-xl bg-gradient-to-b from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 active:scale-95 text-white shadow-lg shadow-red-950/25 border-t border-b border-l border-rose-400/40 hover:-translate-x-1 transition-all duration-200 cursor-pointer group"
      >
        <Phone className="w-4 h-4 sm:w-4.5 sm:h-4.5 group-hover:scale-110 transition-transform shrink-0" />
      </a>

      {/* 2. WHATSAPP OPTION (Logo Only) */}
      <a
        href={fullWhatsAppUrl}
        target="_blank"
        rel="noopener noreferrer"
        id="floating-whatsapp-btn"
        title={lang === "bn" ? "হোয়াটসঅ্যাপে চ্যাট করুন" : "Chat on WhatsApp"}
        aria-label="WhatsApp"
        className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-l-xl bg-[#25D366] hover:bg-[#20bd5a] active:scale-95 text-white shadow-lg shadow-emerald-950/25 border-t border-b border-l border-emerald-300/40 hover:-translate-x-1 transition-all duration-200 cursor-pointer group"
      >
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-4 h-4 sm:w-4.5 sm:h-4.5 group-hover:scale-110 transition-transform shrink-0"
          aria-hidden="true"
        >
          <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.634.055-.956.055-.411 0-.916-.101-1.373-.284-1.954-.78-3.21-2.735-3.308-2.865-.097-.13-.794-1.053-.794-2.009 0-.955.503-1.425.681-1.618.179-.193.391-.242.522-.242.13 0 .261.002.375.008.12.006.28-.046.438.334.163.39.555 1.353.604 1.452.049.098.082.213.016.342-.065.13-.098.212-.196.326-.098.114-.207.255-.296.342-.098.098-.2.205-.086.401.114.195.508.838 1.09 1.356.75.669 1.381.876 1.577.973.196.098.31.082.424-.049.114-.13.49-.571.62-.767.13-.195.261-.163.441-.098.179.065 1.144.539 1.34.637.196.098.326.146.375.228.049.082.049.474-.095.879z" />
          <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2.05 21.95l4.912-1.288A9.956 9.956 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.2c-1.63 0-3.15-.49-4.43-1.33l-.32-.21-3.27.86.87-3.19-.23-.34A8.17 8.17 0 0 1 3.8 12c0-4.52 3.68-8.2 8.2-8.2 4.52 0 8.2 3.68 8.2 8.2 0 4.52-3.68 8.2-8.2 8.2z" />
        </svg>
      </a>

      {/* 3. FACEBOOK OPTION (Logo Only) */}
      <a
        href={cleanFacebookUrl}
        target="_blank"
        rel="noopener noreferrer"
        id="floating-facebook-btn"
        title={lang === "bn" ? "ফেসবুক পেইজ ভিজিট করুন" : "Visit Facebook Page"}
        aria-label="Facebook"
        className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-l-xl bg-[#1877F2] hover:bg-[#166fe5] active:scale-95 text-white shadow-lg shadow-blue-950/25 border-t border-b border-l border-blue-300/40 hover:-translate-x-1 transition-all duration-200 cursor-pointer group"
      >
        <Facebook 
          className="w-4 h-4 sm:w-4.5 sm:h-4.5 group-hover:scale-110 transition-transform shrink-0" 
          fill="currentColor" 
          aria-hidden="true" 
        />
      </a>
    </div>
  );
};
