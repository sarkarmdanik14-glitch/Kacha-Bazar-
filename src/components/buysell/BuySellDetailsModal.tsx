import React, { useState, useEffect } from "react";
import { X, MapPin, Phone, MessageCircle, MessageSquare, Flag, Share2, Calendar, Eye, ShieldCheck, CheckCircle, Trash2, Edit, AlertCircle } from "lucide-react";
import { db, doc, updateDoc, increment, deleteDoc } from "../../lib/firebase";
import { BuySellListing, BUY_SELL_CATEGORIES } from "../../types/buySell";

interface BuySellDetailsModalProps {
  listing: BuySellListing;
  currentUser: any;
  lang: "bn" | "en";
  onClose: () => void;
  onEdit?: (listing: BuySellListing) => void;
  onDelete?: (listingId: string) => void;
  onOpenChat: (listing: BuySellListing) => void;
  onReport: (listing: BuySellListing) => void;
  triggerToast: (bn: string, en: string) => void;
}

export default function BuySellDetailsModal({
  listing,
  currentUser,
  lang,
  onClose,
  onEdit,
  onDelete,
  onOpenChat,
  onReport,
  triggerToast
}: BuySellDetailsModalProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [currentStatus, setCurrentStatus] = useState(listing.status);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isMine = currentUser?.uid && currentUser.uid === listing.sellerUid;
  const isSold = currentStatus === "sold";

  // Increment view counter once per view
  useEffect(() => {
    try {
      const docRef = doc(db, "buy_sell_listings", listing.id);
      updateDoc(docRef, {
        views: increment(1)
      }).catch(() => {});
    } catch {
      // Ignore view increment error
    }
  }, [listing.id]);

  const images = listing.images && listing.images.length > 0 
    ? listing.images 
    : ["https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop&q=80"];

  const conditionLabels: Record<string, { bn: string; en: string; color: string }> = {
    brand_new: { bn: "একদম নতুন (Brand New)", en: "Brand New", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    like_new: { bn: "নতুনের মতো (Like New)", en: "Like New", color: "bg-blue-50 text-blue-700 border-blue-200" },
    used: { bn: "ব্যবহৃত (Used)", en: "Used", color: "bg-amber-50 text-amber-700 border-amber-200" }
  };

  const categoryName = BUY_SELL_CATEGORIES.find(c => c.id === listing.category)?.[lang === "bn" ? "nameBn" : "nameEn"] || listing.category;

  const handleCall = () => {
    if (listing.sellerPhone) {
      window.location.href = `tel:${listing.sellerPhone}`;
    }
  };

  const handleWhatsApp = () => {
    const phone = listing.sellerWhatsApp || listing.sellerPhone;
    if (phone) {
      const cleaned = phone.replace(/[^0-9]/g, "");
      const formatted = cleaned.startsWith("880") ? cleaned : (cleaned.startsWith("0") ? `88${cleaned}` : `880${cleaned}`);
      const text = encodeURIComponent(
        lang === "bn"
          ? `আসসালামু আলাইকুম, আমি কাঁচা বাজার বাই-সেল জোনে আপনার "${listing.title}" বিজ্ঞাপনের ব্যাপারে কথা বলতে চাই।`
          : `Hello, I am contacting you regarding your listing "${listing.title}" on Kacha Bazar Buy & Sell Zone.`
      );
      window.open(`https://wa.me/${formatted}?text=${text}`, "_blank");
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: listing.title,
        text: `${listing.title} - ৳${listing.price} | কাঁচা বাজার বাই-সেল জোন`,
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      triggerToast("বিজ্ঞাপনের লিঙ্ক কপি করা হয়েছে!", "Listing link copied to clipboard!");
    }
  };

  const handleToggleSold = async () => {
    setUpdatingStatus(true);
    try {
      const newStatus = isSold ? "active" : "sold";
      const docRef = doc(db, "buy_sell_listings", listing.id);
      await updateDoc(docRef, { status: newStatus });
      setCurrentStatus(newStatus);
      triggerToast(
        newStatus === "sold" ? "পণ্যটি বিক্রিত হিসেবে চিহ্নিত করা হয়েছে।" : "পণ্যটি আবার সক্রিয় করা হয়েছে।",
        newStatus === "sold" ? "Marked as sold." : "Marked as active."
      );
    } catch (err) {
      console.error(err);
      triggerToast("স্ট্যাটাস পরিবর্তন করতে সমস্যা হয়েছে।", "Failed to update status.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDeleteListing = async () => {
    try {
      const docRef = doc(db, "buy_sell_listings", listing.id);
      await deleteDoc(docRef);
      triggerToast("বিজ্ঞাপনটি সফলভাবে মুছে ফেলা হয়েছে।", "Listing deleted successfully.");
      if (onDelete) {
        onDelete(listing.id);
      }
      onClose();
    } catch (err) {
      console.error(err);
      triggerToast("মুছে ফেলতে সমস্যা হয়েছে।", "Failed to delete listing.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="max-h-[85vh] sm:max-h-[90vh] flex flex-col w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
        {/* Top bar with close button */}
        <div className="flex-shrink-0 p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium truncate">
            <span>{categoryName}</span>
            <span>•</span>
            <span className="truncate">{listing.location}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleShare}
              title={lang === "bn" ? "শেয়ার করুন" : "Share"}
              className="p-2 rounded-full hover:bg-slate-200/70 text-slate-600 transition cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-slate-200/70 text-slate-400 hover:text-slate-600 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          {/* Photos Showcase */}
          <div className="space-y-3">
            <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full bg-slate-900 rounded-2xl overflow-hidden flex items-center justify-center">
              <img
                src={images[activeImageIndex]}
                alt={listing.title}
                className="w-full h-full object-contain"
                onError={(e: any) => {
                  e.target.src = "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop&q=80";
                }}
              />

              {isSold && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-2xs flex items-center justify-center">
                  <span className="bg-rose-600 text-white font-black px-6 py-2 rounded-xl text-lg sm:text-xl shadow-2xl tracking-wider uppercase transform -rotate-6">
                    {lang === "bn" ? "বিক্রি হয়ে গেছে (SOLD)" : "SOLD OUT"}
                  </span>
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImageIndex(idx)}
                    className={`w-16 h-16 rounded-xl overflow-hidden border-2 shrink-0 transition cursor-pointer ${
                      activeImageIndex === idx ? "border-emerald-600 scale-95" : "border-slate-200 opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={img} alt="Thumb" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Pricing & Condition Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border shadow-2xs ${conditionLabels[listing.condition]?.color || conditionLabels.used.color}`}>
                  {conditionLabels[listing.condition]?.[lang === "bn" ? "bn" : "en"] || conditionLabels.used.bn}
                </span>
                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                  {categoryName}
                </span>
              </div>
              <h2 className="text-lg sm:text-2xl font-bold text-slate-900 leading-tight">
                {listing.title}
              </h2>
            </div>

            <div className="sm:text-right">
              <div className="flex items-baseline sm:justify-end gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight">
                  ৳{listing.price.toLocaleString("bn-BD")}
                </span>
              </div>
              {listing.isNegotiable ? (
                <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md inline-block mt-0.5">
                  {lang === "bn" ? "দাম আলোচনা সাপেক্ষে" : "Price Negotiable"}
                </span>
              ) : (
                <span className="text-xs text-slate-400">
                  {lang === "bn" ? "ফিক্সড প্রাইস" : "Fixed Price"}
                </span>
              )}
            </div>
          </div>

          {/* Details & Location meta */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs">
            <div className="flex items-center gap-2 text-slate-700">
              <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 block">{lang === "bn" ? "লোকেশন" : "Location"}</span>
                <span className="font-semibold truncate block">{listing.location}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-slate-700">
              <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 block">{lang === "bn" ? "পোস্টের তারিখ" : "Posted Date"}</span>
                <span className="font-semibold block">
                  {listing.createdAt?.toDate ? listing.createdAt.toDate().toLocaleDateString("bn-BD") : "সম্প্রতি"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-slate-700 col-span-2 sm:col-span-1">
              <Eye className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 block">{lang === "bn" ? "মোট ভিউ" : "Total Views"}</span>
                <span className="font-semibold block">{(listing.views || 0) + 1} {lang === "bn" ? "বার" : "times"}</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-2">
              {lang === "bn" ? "পণ্যের বিস্তারিত বিবরণ:" : "Item Description:"}
            </h4>
            <div className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line bg-white p-4 rounded-2xl border border-slate-200">
              {listing.description || (lang === "bn" ? "কোনো বিবরণ প্রদান করা হয়নি।" : "No detailed description provided.")}
            </div>
          </div>

          {/* Seller Information Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-50/60 to-teal-50/60 border border-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white font-bold flex items-center justify-center text-lg shadow-md shrink-0">
                {listing.sellerName ? listing.sellerName.charAt(0).toUpperCase() : "S"}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-sm sm:text-base font-bold text-slate-900">
                    {listing.sellerName}
                  </h4>
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-xs text-slate-500">
                  {lang === "bn" ? "যাচাইকৃত সেলার • কাঁচা বাজার বাই-সেল" : "Verified Seller • Kacha Bazar Marketplace"}
                </p>
              </div>
            </div>

            {/* Buyer Contact Actions */}
            {!isMine && (
              <div className="flex flex-wrap items-center gap-2">
                {listing.allowCall && listing.sellerPhone && (
                  <button
                    onClick={handleCall}
                    className="flex-1 sm:flex-initial px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Phone className="w-4 h-4" />
                    <span>{lang === "bn" ? "সরাসরি কল" : "Call"}</span>
                  </button>
                )}

                {listing.allowWhatsApp && (listing.sellerWhatsApp || listing.sellerPhone) && (
                  <button
                    onClick={handleWhatsApp}
                    className="flex-1 sm:flex-initial px-4 py-2.5 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>WhatsApp</span>
                  </button>
                )}

                <button
                  onClick={() => onOpenChat(listing)}
                  className="flex-1 sm:flex-initial px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>{lang === "bn" ? "ইন-অ্যাপ চ্যাট" : "Chat"}</span>
                </button>
              </div>
            )}
          </div>

          {/* Owner Actions if this is current user's item */}
          {isMine && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h5 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-700" />
                  <span>{lang === "bn" ? "এটি আপনার নিজস্ব বিজ্ঞাপন" : "This is your listing"}</span>
                </h5>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  {lang === "bn" ? "আপনি যেকোনো সময় এটি সম্পাদন, বিক্রি হিসেবে চিহ্নিত অথবা মুছে ফেলতে পারেন।" : "You can edit, mark as sold or delete this ad."}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={updatingStatus}
                  onClick={handleToggleSold}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    isSold
                      ? "bg-slate-200 text-slate-700 hover:bg-slate-300"
                      : "bg-amber-600 text-white hover:bg-amber-700 shadow-sm"
                  }`}
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>{isSold ? (lang === "bn" ? "সক্রিয় করুন" : "Make Active") : (lang === "bn" ? "বিক্রিত চিহ্নিত করুন" : "Mark as Sold")}</span>
                </button>

                {onEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onEdit(listing);
                    }}
                    className="px-3 py-2 bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>{lang === "bn" ? "এডিট" : "Edit"}</span>
                  </button>
                )}

                {confirmDelete ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleDeleteListing}
                      className="px-2.5 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 cursor-pointer"
                    >
                      {lang === "bn" ? "হ্যাঁ, মুছুন" : "Confirm"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="px-2 py-2 bg-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-300 cursor-pointer"
                    >
                      {lang === "bn" ? "না" : "No"}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="px-3 py-2 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white border border-rose-200 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{lang === "bn" ? "মুছুন" : "Delete"}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Report Listing Button */}
          {!isMine && (
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => onReport(listing)}
                className="text-xs text-slate-400 hover:text-rose-600 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Flag className="w-3.5 h-3.5" />
                <span>{lang === "bn" ? "এই বিজ্ঞাপনে সমস্যা থাকলে রিপোর্ট করুন" : "Report this listing"}</span>
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex-shrink-0 p-4 border-t border-slate-100 flex flex-wrap gap-2 justify-end bg-gray-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            {lang === "bn" ? "বন্ধ করুন" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
}
