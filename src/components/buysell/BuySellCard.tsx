import React from "react";
import { MapPin, Phone, MessageCircle, MessageSquare, Edit2, Trash2, CheckCircle2, Clock } from "lucide-react";
import { BuySellListing } from "../../types/buySell";

interface BuySellCardProps {
  listing: BuySellListing;
  currentUser: any;
  lang: "bn" | "en";
  onViewDetails: (listing: BuySellListing) => void;
  onEdit?: (listing: BuySellListing) => void;
  onDelete?: (listing: BuySellListing) => void;
  onOpenChat?: (listing: BuySellListing) => void;
}

export default function BuySellCard({
  listing,
  currentUser,
  lang,
  onViewDetails,
  onEdit,
  onDelete,
  onOpenChat
}: BuySellCardProps) {
  const isMine = currentUser?.uid && currentUser.uid === listing.sellerUid;
  const isSold = listing.status === "sold";

  const conditionLabels: Record<string, { bn: string; en: string; color: string }> = {
    brand_new: { bn: "একদম নতুন", en: "Brand New", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    like_new: { bn: "নতুনের মতো", en: "Like New", color: "bg-blue-50 text-blue-700 border-blue-200" },
    used: { bn: "ব্যবহৃত", en: "Used", color: "bg-amber-50 text-amber-700 border-amber-200" }
  };

  const conditionInfo = conditionLabels[listing.condition] || conditionLabels.used;

  // Format relative time
  const getTimeAgo = (timestamp: any) => {
    if (!timestamp) return lang === "bn" ? "সম্প্রতি" : "Recently";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 60) {
        return lang === "bn" ? `${diffMins || 1} মিনিট আগে` : `${diffMins || 1}m ago`;
      } else if (diffHours < 24) {
        return lang === "bn" ? `${diffHours} ঘণ্টা আগে` : `${diffHours}h ago`;
      } else {
        return lang === "bn" ? `${diffDays} দিন আগে` : `${diffDays}d ago`;
      }
    } catch {
      return lang === "bn" ? "সম্প্রতি" : "Recently";
    }
  };

  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (listing.sellerPhone) {
      window.location.href = `tel:${listing.sellerPhone}`;
    }
  };

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const phone = listing.sellerWhatsApp || listing.sellerPhone;
    if (phone) {
      const cleaned = phone.replace(/[^0-9]/g, "");
      const formatted = cleaned.startsWith("880") ? cleaned : (cleaned.startsWith("0") ? `88${cleaned}` : `880${cleaned}`);
      const text = encodeURIComponent(
        lang === "bn"
          ? `আসসালামু আলাইকুম, আমি কাঁচা বাজার বাই-সেল জোনে আপনার "${listing.title}" বিজ্ঞাপনের ব্যাপারে কথা বলতে চাই।`
          : `Hello, I am interested in your item "${listing.title}" on Kacha Bazar Buy & Sell Zone.`
      );
      window.open(`https://wa.me/${formatted}?text=${text}`, "_blank");
    }
  };

  return (
    <div
      onClick={() => onViewDetails(listing)}
      className="group bg-white rounded-2xl border border-slate-200/90 hover:border-emerald-500/50 shadow-2xs hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden cursor-pointer relative"
    >
      {/* Top Image Container */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
        <img
          src={listing.images?.[0] || "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=500&auto=format&fit=crop&q=80"}
          alt={listing.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e: any) => {
            e.target.src = "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=500&auto=format&fit=crop&q=80";
          }}
        />

        {/* Condition Tag */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border shadow-2xs ${conditionInfo.color} backdrop-blur-xs`}>
            {lang === "bn" ? conditionInfo.bn : conditionInfo.en}
          </span>
          {isSold && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-600 text-white shadow-xs">
              {lang === "bn" ? "বিক্রিত" : "SOLD"}
            </span>
          )}
        </div>

        {/* Time Ago badge */}
        <div className="absolute bottom-2 left-2 z-10">
          <span className="text-[9px] font-medium px-2 py-0.5 rounded-md bg-black/60 text-white backdrop-blur-xs flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />
            <span>{getTimeAgo(listing.createdAt)}</span>
          </span>
        </div>

        {/* My listing action shortcuts */}
        {isMine && (
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1 z-10" onClick={(e) => e.stopPropagation()}>
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(listing)}
                title={lang === "bn" ? "এডিট করুন" : "Edit"}
                className="p-1.5 rounded-full bg-white/90 hover:bg-white text-slate-700 shadow-md transition cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(listing)}
                title={lang === "bn" ? "মুছে ফেলুন" : "Delete"}
                className="p-1.5 rounded-full bg-white/90 hover:bg-rose-600 hover:text-white text-rose-600 shadow-md transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="p-3 sm:p-3.5 flex-1 flex flex-col justify-between">
        <div>
          {/* Location */}
          <div className="flex items-center gap-1 text-[11px] text-slate-500 mb-1">
            <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
            <span className="truncate">{listing.location}</span>
          </div>

          {/* Title */}
          <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition line-clamp-2 leading-snug mb-2">
            {listing.title}
          </h4>
        </div>

        <div>
          {/* Price & Negotiable */}
          <div className="flex items-baseline justify-between gap-1 mb-2.5">
            <div className="flex items-baseline gap-1">
              <span className="text-base sm:text-lg font-black text-emerald-600 tracking-tight">
                ৳{listing.price.toLocaleString("bn-BD")}
              </span>
            </div>
            {listing.isNegotiable && (
              <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                {lang === "bn" ? "আলোচনা সাপেক্ষে" : "Negotiable"}
              </span>
            )}
          </div>

          {/* Seller Name & Action Buttons */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
            <span className="text-[11px] text-slate-500 truncate max-w-[45%] font-medium">
              {listing.sellerName}
            </span>

            <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
              {listing.allowCall && listing.sellerPhone && (
                <button
                  type="button"
                  onClick={handleCall}
                  title={lang === "bn" ? "সরাসরি কল করুন" : "Call seller"}
                  className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white transition cursor-pointer border border-emerald-100"
                >
                  <Phone className="w-3.5 h-3.5" />
                </button>
              )}

              {listing.allowWhatsApp && (listing.sellerWhatsApp || listing.sellerPhone) && (
                <button
                  type="button"
                  onClick={handleWhatsApp}
                  title={lang === "bn" ? "হোয়াটসঅ্যাপে চ্যাট করুন" : "WhatsApp"}
                  className="p-1.5 rounded-lg bg-emerald-50 hover:bg-[#25D366] text-[#25D366] hover:text-white transition cursor-pointer border border-emerald-100"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                </button>
              )}

              {onOpenChat && !isMine && (
                <button
                  type="button"
                  onClick={() => onOpenChat(listing)}
                  title={lang === "bn" ? "ইন-অ্যাপ চ্যাট" : "In-App Chat"}
                  className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-700 text-slate-700 hover:text-white transition cursor-pointer border border-slate-200"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
