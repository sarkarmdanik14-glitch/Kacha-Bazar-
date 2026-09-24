import React, { useState } from "react";
import { X, AlertTriangle, CheckCircle, ShieldAlert, Flag } from "lucide-react";
import { db, collection, addDoc, doc, updateDoc, increment } from "../../lib/firebase";
import { BuySellListing } from "../../types/buySell";

interface BuySellReportModalProps {
  listing: BuySellListing;
  currentUser: any;
  lang: "bn" | "en";
  onClose: () => void;
  triggerToast: (bn: string, en: string) => void;
}

const REPORT_REASONS = [
  { id: "fraud", bn: "প্রতারণামূলক বা স্ক্যাম বিজ্ঞাপন", en: "Fraudulent or scam listing" },
  { id: "misleading", bn: "ভুল বা মিথ্যা তথ্য প্রদান করা হয়েছে", en: "Misleading or false information" },
  { id: "offensive", bn: "আপত্তিকর বা অশালীন কনটেন্ট/ছবি", en: "Offensive or inappropriate content" },
  { id: "already_sold", bn: "পণ্যটি ইতিমধ্যে বিক্রি হয়ে গেছে", en: "Item is already sold" },
  { id: "duplicate", bn: "একই বিজ্ঞাপন বারবার পোস্ট করা (ডুপ্লিকেট)", en: "Duplicate or spam listing" },
  { id: "illegal", bn: "নিষিদ্ধ, চোরাই বা অবৈধ সামগ্রী", en: "Illegal or prohibited item" },
  { id: "other", bn: "অন্যান্য কোনো সমস্যা", en: "Other issue" }
];

export default function BuySellReportModal({
  listing,
  currentUser,
  lang,
  onClose,
  triggerToast
}: BuySellReportModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>("fraud");
  const [details, setDetails] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReason) return;

    setSubmitting(true);
    try {
      const reportData = {
        listingId: listing.id,
        listingTitle: listing.title,
        sellerUid: listing.sellerUid,
        sellerName: listing.sellerName,
        reportedByUid: currentUser?.uid || "anonymous",
        reportedByName: currentUser?.displayName || (lang === "bn" ? "সাধারণ ব্যবহারকারী" : "Anonymous User"),
        reason: selectedReason,
        reasonText: REPORT_REASONS.find(r => r.id === selectedReason)?.[lang === "bn" ? "bn" : "en"] || selectedReason,
        details: details.trim(),
        status: "pending",
        createdAt: new Date()
      };

      await addDoc(collection(db, "buy_sell_reports"), reportData);

      // Increment reportCount on the listing
      try {
        const listingRef = doc(db, "buy_sell_listings", listing.id);
        await updateDoc(listingRef, {
          reportCount: increment(1)
        });
      } catch (err) {
        console.warn("Could not increment report count:", err);
      }

      setSubmitted(true);
      triggerToast("রিপোর্টটি সফলভাবে জমা হয়েছে। অ্যাডমিন টিম দ্রুত ব্যবস্থা নেবে।", "Report submitted successfully. Admins will review it promptly.");
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error("Error submitting report:", err);
      triggerToast("রিপোর্ট জমা দিতে সমস্যা হয়েছে। আবার চেষ্টা করুন।", "Failed to submit report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="max-h-[85vh] sm:max-h-[90vh] flex flex-col w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
        {/* Header */}
        <div className="flex-shrink-0 p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-rose-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {lang === "bn" ? "বিজ্ঞাপন রিপোর্ট করুন" : "Report Listing"}
              </h3>
              <p className="text-xs text-slate-500 line-clamp-1">
                {listing.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="overflow-y-auto flex-1 p-8 text-center">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-bold text-slate-800 mb-1">
              {lang === "bn" ? "ধন্যবাদ, রিপোর্ট জমা হয়েছে!" : "Thank you! Report Received"}
            </h4>
            <p className="text-xs text-slate-500">
              {lang === "bn" 
                ? "আমাদের অ্যাডমিন টিম বিজ্ঞাপনটি পরীক্ষা করে উপযুক্ত ব্যবস্থা গ্রহণ করবে।" 
                : "Our moderation team will review this listing shortly."}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="overflow-y-auto flex-1 p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  {lang === "bn" ? "রিপোর্টের কারণ নির্বাচন করুন:" : "Select Reason for Report:"}
                </label>
                <div className="space-y-2">
                  {REPORT_REASONS.map((reason) => (
                    <label
                      key={reason.id}
                      className={`flex items-start gap-3 p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                        selectedReason === reason.id
                          ? "bg-rose-50 border-rose-300 text-rose-900 font-semibold"
                          : "border-slate-200 hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <input
                        type="radio"
                        name="reportReason"
                        value={reason.id}
                        checked={selectedReason === reason.id}
                        onChange={(e) => setSelectedReason(e.target.value)}
                        className="mt-0.5 text-rose-600 focus:ring-rose-500"
                      />
                      <span>{lang === "bn" ? reason.bn : reason.en}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {lang === "bn" ? "অতিরিক্ত বিবরণ (ঐচ্ছিক):" : "Additional Details (Optional):"}
                </label>
                <textarea
                  rows={2}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder={lang === "bn" ? "সমস্যা সম্পর্কে সংক্ষেপে লিখুন..." : "Describe the issue briefly..."}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                ></textarea>
              </div>
            </div>

            <div className="flex-shrink-0 p-4 border-t border-slate-100 flex flex-wrap gap-2 justify-end bg-gray-50/50">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                {lang === "bn" ? "বাতিল" : "Cancel"}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Flag className="w-3.5 h-3.5" />
                <span>{submitting ? (lang === "bn" ? "জমা হচ্ছে..." : "Submitting...") : (lang === "bn" ? "রিপোর্ট পাঠান" : "Submit Report")}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
