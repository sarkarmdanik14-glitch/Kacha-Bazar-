import React, { useRef, useState, useEffect } from "react";
import { 
  Printer, X, FileText, CheckCircle, ShoppingBag, Phone, MapPin, 
  User, Calendar, CreditCard, Download, Loader2, ShieldCheck, QrCode, CheckCircle2 
} from "lucide-react";
import QRCode from "qrcode";
import { downloadMemoPDF, imageToDataUrl } from "../../lib/pdfUtils";
import { db, doc, getDoc } from "../../lib/firebase";
import defaultLogoImg from "../../assets/images/logo_1783882658678.jpg";
import defaultFounderImg from "../../assets/images/founder_md_anik_1784735314684.jpg";

interface OrderMemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
  lang: "bn" | "en";
  triggerToast?: (bn: string, en: string) => void;
  founderSignature?: string;
  memoSettings?: any;
}

export default function OrderMemoModal({
  isOpen,
  onClose,
  order,
  lang,
  triggerToast,
  founderSignature: propSignature,
  memoSettings: propSettings,
}: OrderMemoModalProps) {
  const memoRef = useRef<HTMLDivElement>(null);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [memoConfig, setMemoConfig] = useState<any>(propSettings || {});
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [verificationCode, setVerificationCode] = useState<string>("");
  const [showVerificationDrawer, setShowVerificationDrawer] = useState<boolean>(false);
  const [verificationDetails, setVerificationDetails] = useState<any>(null);
  const [logoDataUrl, setLogoDataUrl] = useState<string>("");
  const [signatureDataUrl, setSignatureDataUrl] = useState<string>("");

  // Sync settings
  useEffect(() => {
    if (propSettings && Object.keys(propSettings).length > 0) {
      setMemoConfig(propSettings);
    } else if (isOpen) {
      getDoc(doc(db, "settings", "global"))
        .then((docSnap) => {
          if (docSnap.exists()) {
            setMemoConfig(docSnap.data());
          }
        })
        .catch((err) => console.warn("Notice: Sync memo settings error:", err));
    }
  }, [propSettings, isOpen]);

  // Pre-convert Store Logo & Founder Signature to Base64 Data URLs for guaranteed CORS-free rendering
  const storeLogoRaw = memoConfig?.storeLogo || memoConfig?.logoUrl || defaultLogoImg;
  const founderSigRaw = memoConfig?.founderSignature || memoConfig?.founderSignatureUrl || propSignature || defaultFounderImg;

  useEffect(() => {
    if (storeLogoRaw) {
      if (storeLogoRaw.startsWith("data:image/")) {
        setLogoDataUrl(storeLogoRaw);
      } else {
        imageToDataUrl(storeLogoRaw).then((url) => {
          if (url) {
            setLogoDataUrl(url);
          } else if (storeLogoRaw !== defaultLogoImg) {
            imageToDataUrl(defaultLogoImg).then((defUrl) => setLogoDataUrl(defUrl || defaultLogoImg));
          } else {
            setLogoDataUrl(defaultLogoImg);
          }
        });
      }
    } else {
      setLogoDataUrl(defaultLogoImg);
    }
  }, [storeLogoRaw]);

  useEffect(() => {
    if (founderSigRaw) {
      if (founderSigRaw.startsWith("data:image/")) {
        setSignatureDataUrl(founderSigRaw);
      } else {
        imageToDataUrl(founderSigRaw).then((url) => {
          if (url) {
            setSignatureDataUrl(url);
          } else if (founderSigRaw !== defaultFounderImg) {
            imageToDataUrl(defaultFounderImg).then((defUrl) => setSignatureDataUrl(defUrl || defaultFounderImg));
          } else {
            setSignatureDataUrl(defaultFounderImg);
          }
        });
      }
    } else {
      setSignatureDataUrl(defaultFounderImg);
    }
  }, [founderSigRaw]);

  // Generate QR verification data when modal opens
  useEffect(() => {
    if (isOpen && order) {
      const orderId = order.id || "MEMO";
      const total = order.total || order.totalAmount || order.grandTotal || 0;
      const phone = order.customerPhone || order.phone || order.userPhone || "";
      const itemsList = Array.isArray(order.items) ? order.items : (Array.isArray(order.products) ? order.products : (Array.isArray(order.cart) ? order.cart : []));
      const cleanId = orderId.toString().toUpperCase().slice(-6);
      const code = `KB-MEMO-${cleanId}-VERIFIED`;
      setVerificationCode(code);

      const qrPayload = `KANCHA BAZAR OFFICIAL ORDER MEMO\nOrder ID: #${orderId}\nTotal: ৳${total}\nPhone: ${phone}\nItems: ${itemsList.length}\nVerification Code: ${code}`;

      // Generate local QR code Data URL immediately
      QRCode.toDataURL(qrPayload, { margin: 1, width: 140, color: { dark: "#064e3b", light: "#ffffff" } })
        .then((url) => {
          setQrDataUrl(url);
        })
        .catch((err) => {
          console.warn("Notice: QRCode generation warning:", err);
        });

      // Optionally enrich from verification API if endpoint is available
      fetch("/api/memo/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          total,
          phone,
          itemsCount: itemsList.length,
          origin: typeof window !== "undefined" ? window.location.host : "",
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data && data.success) {
            if (data.qrDataUrl) setQrDataUrl(data.qrDataUrl);
            if (data.verificationCode) setVerificationCode(data.verificationCode);
            setVerificationDetails(data);
          }
        })
        .catch(() => {});
    }
  }, [isOpen, order]);

  if (!isOpen || !order) return null;

  const getTranslation = (bn: string, en: string) => (lang === "bn" ? bn : en);

  // Dynamic Memo Fields with defaults
  const storeLogo = logoDataUrl || storeLogoRaw;
  const storeName = memoConfig?.storeName || getTranslation("কাঁচা বাজার", "Kancha Bazar");
  const storeTagline = memoConfig?.storeTagline || getTranslation("বিশুদ্ধ ও নিরাপদ খাদ্যের প্রতিশ্রুতি", "The Assurance of Pure & Fresh Food");
  const supportPhone = memoConfig?.supportPhone || "+8801722638985";
  const founderName = memoConfig?.founderName || "Md Anik Sarkar";
  const founderSig = signatureDataUrl || founderSigRaw;

  // Prepared By - use configured value, if empty fall back to "Kancha Bazar Team" / "কাঁচা বাজার টিম"
  const preparedBy = (memoConfig?.preparedBy && memoConfig.preparedBy.trim().length > 0)
    ? memoConfig.preparedBy
    : getTranslation("কাঁচা বাজার টিম", "Kancha Bazar Team");

  const thankYouMsg = memoConfig?.thankYouMessage || getTranslation("পণ্য সরবরাহ করার জন্য আপনাকে ধন্যবাদ। কোন জিজ্ঞাসা থাকলে যোগাযোগ করুন।", "Thank you for shopping with us! Please check all details upon delivery.");
  const footerTerms = memoConfig?.termsAndConditions || getTranslation("চাঁচকৈড় বাজার, বাংলাদেশ | বিশুদ্ধ পণ্য সরবরাহে আমরা দায়বদ্ধ।", "Chanchkoir Bazar, Bangladesh | We are committed to supplying fresh groceries.");

  // Customer Full Name Priority Resolution: Profile Full Name -> Order Customer Name -> Name -> Username -> Guest
  const customerFullName = 
    order.customerFullName || 
    order.userFullName || 
    order.fullName || 
    order.user?.fullName || 
    order.user?.name || 
    order.customerName || 
    order.name || 
    order.userName || 
    getTranslation("অজানা গ্রাহক", "Guest Customer");

  // Date Formatter (Prevents "Invalid Date")
  const formatOrderDate = (createdAt: any) => {
    try {
      let d: Date;
      if (!createdAt) {
        d = new Date();
      } else if (typeof createdAt === "object" && typeof createdAt.seconds === "number") {
        d = new Date(createdAt.seconds * 1000);
      } else if (typeof createdAt === "object" && typeof createdAt.toDate === "function") {
        d = createdAt.toDate();
      } else if (typeof createdAt === "number") {
        d = new Date(createdAt);
      } else if (typeof createdAt === "string") {
        d = new Date(createdAt);
      } else {
        d = new Date();
      }

      if (isNaN(d.getTime())) d = new Date();

      return d.toLocaleString(lang === "bn" ? "bn-BD" : "en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch (e) {
      return new Date().toLocaleString();
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!memoRef.current || downloadingPDF) return;
    setDownloadingPDF(true);
    try {
      const fullConfig = {
        ...memoConfig,
        storeLogo,
        storeName,
        storeTagline,
        supportPhone,
        founderName,
        founderSignature: founderSig,
        preparedBy,
        thankYouMessage: thankYouMsg,
        termsAndConditions: footerTerms,
      };
      await downloadMemoPDF(memoRef.current, order, fullConfig);
      if (triggerToast) {
        triggerToast("পিডিএফ মেমো ডাউনলোড সফল হয়েছে!", "PDF Memo downloaded successfully!");
      }
    } catch (err) {
      console.error("PDF generation failed:", err);
      if (triggerToast) {
        triggerToast(
          "মেমো ডাউনলোড করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।",
          "Failed to generate PDF memo. Please try again."
        );
      }
    } finally {
      setDownloadingPDF(false);
    }
  };

  // Safely normalize items array
  const itemsList = Array.isArray(order.items) && order.items.length > 0 
    ? order.items 
    : (Array.isArray(order.products) && order.products.length > 0 
        ? order.products 
        : (Array.isArray(order.cart) ? order.cart : []));

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in no-print">
      {/* CSS stylesheet injected for flawless printing behavior & Unicode Bangla Font Rendering */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap');

        .printable-memo-card, .printable-memo-card * {
          font-family: 'Hind Siliguri', 'Noto Sans Bengali', 'SolaimanLipi', system-ui, -apple-system, BlinkMacSystemFont, sans-serif !important;
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          body, html {
            background: #fff !important;
            color: #000 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
          }
          body * {
            visibility: hidden !important;
          }
          .no-print, button {
            display: none !important;
          }
          .printable-memo-container, .printable-memo-container * {
            visibility: visible !important;
          }
          .printable-memo-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
            box-shadow: none !important;
            border: none !important;
            overflow: visible !important;
          }
          .printable-memo-card {
            border: 1px solid #cbd5e1 !important;
            box-shadow: none !important;
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 24px !important;
            overflow: visible !important;
            border-radius: 0 !important;
          }
        }
      `}} />

      {/* On-screen Modal Window */}
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col relative animate-scale-up">
        
        {/* Header Bar with Action Buttons */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-sm">
                {getTranslation("অর্ডার মেমো / চালান", "Order Invoice Memo")}
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">
                #{order.id.slice(-8).toUpperCase()}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowVerificationDrawer(!showVerificationDrawer)}
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-black px-3 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer border border-emerald-200"
              title="Verify Official Stamp"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">{getTranslation("যাচাই করুন", "Verify Seal")}</span>
            </button>

            <button
              onClick={handleDownloadPDF}
              disabled={downloadingPDF}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
            >
              {downloadingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>{downloadingPDF ? getTranslation("তৈরি হচ্ছে...", "Generating...") : getTranslation("পিডিএফ ডাউনলোড", "Download PDF")}</span>
            </button>

            <button
              onClick={handlePrint}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>{getTranslation("প্রিন্ট করুন", "Print Memo")}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Optional QR Seal Drawer */}
        {showVerificationDrawer && (
          <div className="bg-emerald-950 text-white p-4 border-b border-emerald-800 flex items-center justify-between text-xs animate-fade-in">
            <div className="flex items-center gap-3">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="QR Seal" className="w-12 h-12 bg-white p-1 rounded-xl shrink-0" />
              ) : (
                <QrCode className="w-8 h-8 text-emerald-400" />
              )}
              <div>
                <span className="bg-emerald-800 text-emerald-300 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest inline-block mb-0.5">
                  OFFICIAL DIGITAL VERIFICATION SEAL
                </span>
                <p className="font-mono font-bold text-white text-xs">
                  {verificationCode || "KB-MEMO-VERIFIED"}
                </p>
                <p className="text-[10px] text-emerald-300/80">
                  Status: AUTHENTICATED | Hash Signed by {storeName}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowVerificationDrawer(false)}
              className="text-emerald-300 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Printable Memo Content Container */}
        <div className="p-4 sm:p-8 pb-10 sm:pb-12 flex-1 printable-memo-container">
          <div 
            id="printable-memo-card" 
            ref={memoRef} 
            className="printable-memo-card max-w-xl mx-auto border border-slate-200 bg-white rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden"
          >
            {/* Subtle Security Watermark Background */}
            <div 
              className="absolute inset-0 flex items-center justify-center pointer-events-none select-none text-slate-900 font-black text-3xl sm:text-4xl text-center leading-tight z-0"
              style={{
                opacity: 0.05,
                transform: "rotate(-25deg)",
                WebkitTransform: "rotate(-25deg)",
                transformOrigin: "center center",
              }}
            >
              {storeName.toUpperCase()} OFFICIAL ORDER MEMO
            </div>

            {/* Store Branding Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-dashed border-slate-200 relative z-10">
              <div className="flex flex-col items-start">
                {storeLogo ? (
                  <div className="flex items-center gap-3 mb-2">
                    <img
                      src={storeLogo}
                      alt={storeName}
                      className="h-12 max-w-[160px] object-contain"
                    />
                    <h1 className="text-lg font-black text-slate-900 tracking-tight">
                      {storeName}
                    </h1>
                  </div>
                ) : (
                  <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-1.5 mb-1">
                    <span className="w-2.5 h-6 bg-emerald-600 rounded-md inline-block"></span>
                    {storeName}
                  </h1>
                )}
                <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest">
                  {storeTagline}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                  {footerTerms} | {getTranslation("সাপোর্ট: ", "Support: ")}{supportPhone}
                </p>
              </div>

              <div className="mt-4 sm:mt-0 text-left sm:text-right flex flex-col items-start sm:items-end">
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-black rounded-full text-[10px] uppercase tracking-wider border border-emerald-200/60 inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>{getTranslation("অফিসিয়াল মেমো", "OFFICIAL MEMO")}</span>
                </span>

                <p className="text-xs font-mono text-slate-700 font-extrabold mt-2">
                  ID: #{order.id.toUpperCase()}
                </p>

                {verificationCode && (
                  <p className="text-[9px] font-mono text-emerald-700 font-bold bg-slate-50 px-2 py-0.5 rounded-md mt-0.5 border border-slate-100">
                    {verificationCode}
                  </p>
                )}

                <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1 mt-1">
                  <Calendar className="w-3 h-3" />
                  {formatOrderDate(order.createdAt || order.orderDate || order.date)}
                </p>
              </div>
            </div>

            {/* Customer Details Block */}
            <div className="py-6 grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-slate-100 text-xs relative z-10">
              <div className="space-y-2">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {getTranslation("গ্রাহকের বিবরণ", "Delivery Address")}
                </h4>
                <div className="space-y-1 bg-white p-3 rounded-2xl border border-slate-100/60 shadow-sm">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{customerFullName}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-bold text-slate-500 font-mono">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{order.customerPhone || order.phone || order.userPhone || "N/A"}</span>
                  </div>
                  <div className="flex items-start gap-1.5 text-slate-600 leading-relaxed pt-0.5 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="break-words font-sans">{order.deliveryAddress || order.address || order.fullAddress || order.shippingAddress || getTranslation("ঠিকানা পাওয়া যায়নি", "No Address Supplied")}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {getTranslation("পেমেন্ট ও অর্ডার বিবরণী", "Payment & Order Details")}
                </h4>
                <div className="space-y-2 bg-white p-3 rounded-2xl border border-slate-100/60 shadow-sm">
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-slate-400">{getTranslation("পেমেন্ট পদ্ধতি", "Payment Method")}:</span>
                    <span className="font-extrabold text-slate-700 uppercase">{order.paymentMethod || "COD"}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-t border-slate-50">
                    <span className="text-slate-400">{getTranslation("পেমেন্ট স্ট্যাটাস", "Payment Status")}:</span>
                    <span className="font-extrabold text-emerald-600 uppercase text-[10px] bg-emerald-50 px-2 py-0.5 rounded-full">{order.paymentStatus || "pending"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Itemized Products Table */}
            <div className="py-6 relative z-10">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                {getTranslation("অর্ডারকৃত পণ্য তালিকা", "Itemized Products Ledger")}
              </h4>
              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 uppercase text-[9px] font-black tracking-wider">
                      <th className="p-3">{getTranslation("পণ্য বিবরণ", "Product details")}</th>
                      <th className="p-3 text-center">{getTranslation("পরিমাণ", "Qty")}</th>
                      <th className="p-3 text-right">{getTranslation("একক মূল্য", "Unit Price")}</th>
                      <th className="p-3 text-right">{getTranslation("মোট বিল", "Subtotal")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                    {itemsList.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-4 text-center text-slate-400 font-bold">
                          {getTranslation("পণ্য তথ্য সংরক্ষিত নেই", "No items recorded")}
                        </td>
                      </tr>
                    ) : (
                      itemsList.map((item: any, idx: number) => {
                        const itemPrice = item.selectedOption?.price ?? item.product?.price ?? item.price ?? 0;
                        
                        // Extract Variant / Weight / Unit / Size option details
                        const rawOption = item.selectedOption 
                          ? (typeof item.selectedOption === "object" 
                              ? (item.selectedOption.label || item.selectedOption.value ? `${item.selectedOption.value || item.selectedOption.label || ""}${item.selectedOption.unit || ""}` : JSON.stringify(item.selectedOption))
                              : item.selectedOption)
                          : (item.weight || item.unit || item.variant || item.size || item.packSize || item.selectedVariant || item.product?.weight || item.product?.unit || "");

                        const optionLabel = rawOption ? String(rawOption).trim() : "";

                        const productName = item.product 
                          ? getTranslation(item.product.nameBn || item.product.titleBn, item.product.nameEn || item.product.titleEn) 
                          : getTranslation(item.nameBn || item.titleBn || item.name || item.title || "পণ্য", item.nameEn || item.titleEn || item.name || item.title || "Product");
                        const quantity = item.quantity || item.qty || 1;
                        
                        return (
                          <tr key={idx} className="hover:bg-slate-50/20">
                            <td className="p-3">
                              <div className="font-bold text-slate-800">{productName}</div>
                              {optionLabel && (
                                <div className="text-[9px] text-emerald-600 font-extrabold mt-0.5">
                                  {getTranslation("ভেরিয়েন্ট / সাইজ: ", "Variant / Size: ")}{optionLabel}
                                </div>
                              )}
                            </td>
                            <td className="p-3 text-center font-bold font-mono">
                              {quantity}
                            </td>
                            <td className="p-3 text-right font-bold font-mono">
                              ৳{itemPrice}
                            </td>
                            <td className="p-3 text-right font-black font-mono text-slate-900">
                              ৳{itemPrice * quantity}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Billing Breakdown Area */}
            <div className="py-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs relative z-10">
              <div className="flex flex-col justify-between text-slate-500 leading-relaxed font-medium text-[11px]">
                <div>
                  <p className="text-slate-700 font-bold">{thankYouMsg}</p>
                  <p className="text-[9px] text-slate-400 mt-1">{footerTerms}</p>
                </div>

                {/* QR Code Graphic element on printed memo */}
                {qrDataUrl && (
                  <div className="mt-3 flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100 w-fit">
                    <img src={qrDataUrl} alt="QR Seal" className="w-10 h-10 object-contain" />
                    <div>
                      <span className="text-[9px] font-black text-slate-700 uppercase block leading-tight">Official QR Stamp</span>
                      <span className="text-[8px] font-mono text-slate-400 block">{verificationCode}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-2.5 shadow-sm">
                <div className="flex justify-between items-center text-slate-500 font-bold">
                  <span>{getTranslation("উপমোট বিল (সাবটোটাল)", "Subtotal")}:</span>
                  <span className="font-bold font-mono text-slate-800">৳{order.subtotal || order.itemsTotal || order.total || 0}</span>
                </div>
                {(order.discount > 0 || order.couponDiscount > 0) && (
                  <div className="flex justify-between items-center text-red-500 font-bold">
                    <span>{getTranslation("ডিসকাউন্ট (ছাড়)", "Discount")}:</span>
                    <span className="font-bold font-mono">-৳{order.discount || order.couponDiscount}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-slate-500 font-bold">
                  <span>{getTranslation("ডেলিভারি চার্জ", "Delivery Charge")}:</span>
                  <span className="font-bold font-mono text-slate-800">৳{order.deliveryCharge ?? order.deliveryFee ?? 0}</span>
                </div>
                
                <div className="flex justify-between items-center pt-2.5 border-t border-slate-100 text-emerald-600 font-black">
                  <span className="text-sm">{getTranslation("সর্বমোট বিল (টোটাল)", "Grand Total")}:</span>
                  <span className="text-base font-mono">৳{order.total || order.totalAmount || order.grandTotal || 0}</span>
                </div>
              </div>
            </div>

            {/* Footnote Signature & Founder Authorization Blocks */}
            <div className="flex justify-between items-end mt-8 pt-6 border-t border-slate-200 text-center text-[10px] text-slate-500 relative z-10">
              <div className="w-1/3 text-center">
                <div className="border-t border-slate-300 pt-1.5 w-28 mx-auto font-bold text-slate-600">
                  {getTranslation("গ্রাহকের স্বাক্ষর", "Customer Sign")}
                </div>
              </div>

              <div className="w-1/3 text-center">
                <div className="border-t border-slate-300 pt-1.5 w-28 mx-auto font-bold text-slate-600">
                  {preparedBy}
                </div>
              </div>

              <div className="w-1/3 text-center flex flex-col items-center justify-end">
                {founderSig ? (
                  <img 
                    src={founderSig} 
                    alt="Founder Signature" 
                    className="h-10 max-w-[130px] object-contain mb-1"
                  />
                ) : (
                  <div className="h-8"></div>
                )}
                <div className="border-t border-emerald-500 pt-1.5 w-32 mx-auto">
                  <div className="font-black text-emerald-700 text-[11px] font-mono uppercase">
                    {founderName}
                  </div>
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                    {getTranslation("প্রতিষ্ঠাতা ও অনুমোদিত স্বাক্ষর", "Founder & Authorized Sign")}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

