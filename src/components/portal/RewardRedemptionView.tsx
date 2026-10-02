import React, { useState, useEffect } from "react";
import { 
  ArrowLeft, Gift, Award, Sparkles, CheckCircle2, 
  Package, ShieldCheck, RefreshCw, Star, Info, X
} from "lucide-react";
import { 
  RewardGift, 
  REWARD_GIFTS_CATALOG, 
  redeemRewardGift, 
  RewardClaimRecord 
} from "../../lib/rewardPoints";
import { db, collection, query, where, getDocs } from "../../lib/firebase";

export interface RewardRedemptionViewProps {
  user: any;
  currentPoints: number;
  onPointsUpdated?: (newPoints: number) => void;
  onBack: () => void;
  lang?: "bn" | "en";
  triggerToast: (bn: string, en?: string) => void;
}

export default function RewardRedemptionView({
  user,
  currentPoints,
  onPointsUpdated,
  onBack,
  lang = "bn",
  triggerToast
}: RewardRedemptionViewProps) {
  const [activeTab, setActiveTab] = useState<"catalog" | "eligible" | "my_claims">("catalog");
  const [selectedGift, setSelectedGift] = useState<RewardGift | null>(null);
  const [isConfirming, setIsConfirming] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [claimedSuccessGift, setClaimedSuccessGift] = useState<RewardGift | null>(null);
  const [deliveryNotes, setDeliveryNotes] = useState<string>("");
  const [deliveryPhone, setDeliveryPhone] = useState<string>("");
  const [deliveryAddress, setDeliveryAddress] = useState<string>("");

  // Customer claims history state
  const [myClaims, setMyClaims] = useState<RewardClaimRecord[]>([]);
  const [loadingClaims, setLoadingClaims] = useState<boolean>(false);

  // Sync shipping info from current user
  useEffect(() => {
    if (user) {
      setDeliveryPhone(user.phone || user.phoneNumber || "");
      setDeliveryAddress(user.address || "চাঁচকৈড় বাজার, গুরুদাশপুর, নাটোর");
    }
  }, [user]);

  // Load claims history when tab opens
  useEffect(() => {
    if (activeTab === "my_claims" && user?.uid) {
      loadCustomerClaims();
    }
  }, [activeTab, user?.uid]);

  const loadCustomerClaims = async () => {
    if (!user?.uid) return;
    setLoadingClaims(true);
    try {
      const q = query(
        collection(db, "reward_claims"),
        where("userId", "==", user.uid)
      );
      const snap = await getDocs(q);
      const records: RewardClaimRecord[] = [];
      snap.forEach((d) => {
        records.push({ ...d.data(), id: d.id } as RewardClaimRecord);
      });
      // Sort newest first
      records.sort((a, b) => new Date(b.claimDate || 0).getTime() - new Date(a.claimDate || 0).getTime());
      setMyClaims(records);
    } catch (err) {
      console.warn("Notice loading reward claims:", err);
    } finally {
      setLoadingClaims(false);
    }
  };

  const handleInitiateClaim = (gift: RewardGift) => {
    if (currentPoints < gift.pointsRequired) {
      triggerToast(
        "আপনার পর্যাপ্ত পয়েন্ট নেই! আরও অর্ডার সম্পন্ন করে পয়েন্ট অর্জন করুন।",
        "Insufficient points! Complete more orders to earn points."
      );
      return;
    }
    setSelectedGift(gift);
    setIsConfirming(true);
  };

  const handleConfirmRedemption = async () => {
    if (!selectedGift || !user?.uid) return;
    setIsProcessing(true);

    try {
      const result = await redeemRewardGift(user.uid, selectedGift, {
        customerName: user.displayName || user.fullName || "সম্মানিত গ্রাহক",
        phone: deliveryPhone || user.phone || user.phoneNumber || "",
        address: deliveryAddress || user.address || "চাঁচকৈড় বাজার, নাটোর",
        notes: deliveryNotes.trim()
      });

      if (result.success) {
        if (typeof result.newPoints === "number" && onPointsUpdated) {
          onPointsUpdated(result.newPoints);
        }
        triggerToast(
          `🎉 অভিনন্দন! আপনার "${selectedGift.nameBn}" উপহারের দাবি গ্রহণ করা হয়েছে!`,
          `🎉 Congratulations! Your claim for "${selectedGift.nameEn}" was submitted successfully!`
        );
        setClaimedSuccessGift(selectedGift);
        setIsConfirming(false);
      } else {
        triggerToast(
          result.reason || "উপহার দাবি প্রক্রিয়াকরণ ব্যর্থ হয়েছে।",
          result.reason || "Failed to process gift redemption."
        );
      }
    } catch (err: any) {
      triggerToast(
        err?.message || "উপহার দাবি প্রক্রিয়াকরণে সমস্যা হয়েছে।",
        err?.message || "Error submitting claim."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Filter gifts based on active tab
  const displayedGifts = REWARD_GIFTS_CATALOG.filter((gift) => {
    if (activeTab === "eligible") {
      return currentPoints >= gift.pointsRequired;
    }
    return true;
  });

  return (
    <div className="w-full space-y-5 sm:space-y-6 pb-12 animate-fade-in">
      {/* 1. View Navigation Top Bar */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-2xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 text-xs sm:text-sm font-black shadow-xs transition cursor-pointer group active:scale-95"
        >
          <ArrowLeft className="w-4 h-4 text-emerald-600 group-hover:-translate-x-0.5 transition-transform" />
          <span>← ড্যাশবোর্ডে ফিরুন</span>
        </button>

        <div className="flex items-center space-x-1.5 text-purple-700 text-xs font-black uppercase tracking-wider bg-purple-50 px-3.5 py-1.5 rounded-full border border-purple-100 shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-purple-600" />
          <span>কাচা বাজার এক্সক্লুসিভ রিওয়ার্ড ক্লাব</span>
        </div>
      </div>

      {/* 2. Full Page Header Banner */}
      <div className="relative bg-gradient-to-r from-purple-800 via-indigo-800 to-purple-900 text-white rounded-3xl p-5 sm:p-7 shadow-lg border border-purple-600/30 overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="flex items-center space-x-2 text-amber-300 text-xs font-black uppercase tracking-wider mb-1.5">
              <Gift className="w-4 h-4" />
              <span>লয়্যালটি ও গিফট প্রোগ্রাম</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>🎁 রিওয়ার্ড পয়েন্ট রিডিম ও উপহার কালেকশন</span>
            </h1>
            <p className="text-xs sm:text-sm text-purple-100/90 mt-1 max-w-xl leading-relaxed">
              আপনার অর্জিত রিওয়ার্ড পয়েন্ট দিয়ে সম্পূর্ণ বিনামূল্যে আকর্ষণীয় গিফট বুঝে নিন! কোনো লুকানো চার্জ বা ডেলিভারি ফি নেই।
            </p>
          </div>

          {/* Current Balance Card */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/20 shadow-inner flex items-center space-x-4 shrink-0 min-w-[240px]">
            <div className="w-13 h-13 rounded-2xl bg-amber-400 text-purple-950 flex items-center justify-center font-black shadow-md shrink-0">
              <Award className="w-7 h-7" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-purple-200 uppercase tracking-wider">
                আপনার মোট পয়েন্ট:
              </p>
              <div className="flex items-baseline space-x-1.5 mt-0.5">
                <h3 className="text-2xl sm:text-3xl font-black text-amber-300 font-mono tracking-tight">
                  {currentPoints.toLocaleString()}
                </h3>
                <span className="text-xs font-bold text-white uppercase tracking-wider">pts</span>
              </div>
            </div>
          </div>
        </div>

        {/* Earning Rules & Trust Signals */}
        <div className="relative z-10 mt-5 pt-4 border-t border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-purple-100">
          <div className="flex items-center space-x-2">
            <Info className="w-4 h-4 text-amber-300 shrink-0" />
            <span>পয়েন্ট অর্জনের নিয়ম: প্রতি <strong>৳১০০</strong> টাকার ক্রয়ে অর্জিত হয় <strong>১০ পয়েন্ট</strong></span>
          </div>
          <div className="flex items-center space-x-1.5 text-emerald-300 font-bold text-[11px]">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>১০০% ক্যাশলেস রিওয়ার্ড ও ফ্রি ডেলিভারি</span>
          </div>
        </div>
      </div>

      {/* 3. Catalog Sub-Tabs */}
      <div className="bg-white border border-slate-200 rounded-2xl p-1.5 flex flex-wrap gap-1 shadow-xs">
        <button
          type="button"
          onClick={() => setActiveTab("catalog")}
          className={`flex-1 min-w-[130px] py-2.5 px-4 text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center space-x-2 ${
            activeTab === "catalog"
              ? "bg-purple-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <Gift className="w-4 h-4" />
          <span>সকল উপহার ({REWARD_GIFTS_CATALOG.length})</span>
        </button>
        
        <button
          type="button"
          onClick={() => setActiveTab("eligible")}
          className={`flex-1 min-w-[130px] py-2.5 px-4 text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center space-x-2 ${
            activeTab === "eligible"
              ? "bg-purple-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          <span>দাবিযোগ্য ({REWARD_GIFTS_CATALOG.filter(g => currentPoints >= g.pointsRequired).length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("my_claims")}
          className={`flex-1 min-w-[130px] py-2.5 px-4 text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center space-x-2 ${
            activeTab === "my_claims"
              ? "bg-purple-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <Package className="w-4 h-4" />
          <span>আমার দাবি সমূহ</span>
        </button>
      </div>

      {/* 4. Full Page Content (Natural Page Vertical Scrolling) */}
      {activeTab !== "my_claims" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {displayedGifts.length === 0 ? (
            <div className="col-span-full py-16 text-center bg-white rounded-3xl border border-dashed border-slate-300 p-8 shadow-xs">
              <div className="w-16 h-16 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-3">
                <Gift className="w-8 h-8" />
              </div>
              <h4 className="text-base font-black text-slate-800">
                এখনো কোনো উপহার দাবিযোগ্য নয়
              </h4>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                আপনার বর্তমান ব্যালেন্স {currentPoints} pts। আরও পণ্য ক্রয় করে পয়েন্ট সংগ্রহ করুন এবং ফ্রি উপহার উপভোগ করুন!
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("catalog")}
                className="mt-4 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
              >
                সকল উপহার ক্যাটালগ দেখুন
              </button>
            </div>
          ) : (
            displayedGifts.map((gift) => {
              const isEligible = currentPoints >= gift.pointsRequired;
              const progressPct = Math.min(100, Math.floor((currentPoints / gift.pointsRequired) * 100));
              const neededPoints = Math.max(0, gift.pointsRequired - currentPoints);

              return (
                <div
                  key={gift.id}
                  className={`group bg-white rounded-3xl border transition-all duration-200 overflow-hidden flex flex-col shadow-xs hover:shadow-md ${
                    isEligible 
                      ? "border-purple-200 hover:border-purple-400" 
                      : "border-slate-200/80 opacity-95"
                  }`}
                >
                  {/* Image Thumbnail with Tag */}
                  <div className="relative h-44 sm:h-48 w-full bg-slate-100 overflow-hidden shrink-0">
                    <img
                      src={gift.image}
                      alt={gift.nameBn}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

                    {gift.tagBn && (
                      <div className="absolute top-3 left-3 bg-amber-500 text-white px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center space-x-1">
                        <Star className="w-3 h-3 fill-white" />
                        <span>{gift.tagBn}</span>
                      </div>
                    )}

                    {/* Points Requirement Badge (NO commercial market price) */}
                    <div className="absolute top-3 right-3 bg-purple-900/85 backdrop-blur-md text-amber-300 px-3 py-1 rounded-xl text-xs font-black font-mono shadow-sm flex items-center space-x-1 border border-purple-400/30">
                      <Award className="w-3.5 h-3.5 text-amber-400" />
                      <span>{gift.pointsRequired.toLocaleString()} pts</span>
                    </div>

                    {/* Category tag */}
                    <div className="absolute bottom-2.5 left-3 right-3 flex items-center text-white text-[11px]">
                      <span className="font-bold text-slate-200 bg-black/50 backdrop-blur-sm px-2.5 py-0.5 rounded-md text-[10px]">
                        {gift.categoryBn}
                      </span>
                    </div>
                  </div>

                  {/* Details Body */}
                  <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <h4 className="font-black text-sm sm:text-base text-slate-900 leading-tight">
                        {gift.nameBn}
                      </h4>
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                        {gift.nameEn}
                      </p>
                      <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                        {gift.descriptionBn}
                      </p>
                    </div>

                    {/* Progress or Status */}
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      {!isEligible ? (
                        <div>
                          <div className="flex items-center justify-between text-[11px] mb-1">
                            <span className="text-slate-500 font-bold">অগ্রগতি</span>
                            <span className="font-mono font-black text-purple-700">{progressPct}%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div 
                              className="bg-purple-600 h-full rounded-full transition-all duration-300"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-amber-700 font-bold mt-1 text-right">
                            আর {neededPoints.toLocaleString()} পয়েন্ট প্রয়োজন
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1.5 text-emerald-600 text-xs font-bold py-1">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span>আপনি এখনই এই উপহারটি দাবি করতে পারবেন!</span>
                        </div>
                      )}

                      {/* Action Button - Always visible and easily clickable */}
                      <button
                        type="button"
                        onClick={() => handleInitiateClaim(gift)}
                        disabled={!isEligible}
                        className={`w-full py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-xs ${
                          isEligible
                            ? "bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-emerald-700/20 hover:shadow-md active:scale-95"
                            : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-80"
                        }`}
                      >
                        <Gift className="w-4 h-4 shrink-0" />
                        <span>{isEligible ? "দাবি করুন / রিডিম করুন" : `আরও ${neededPoints} পয়েন্ট লাগবে`}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* My Claims History Tab */
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <div>
              <h4 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wider">
                আপনার পূর্বে দাবিকৃত উপহারসমূহ
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                অর্ডার ডেলিভারির মতো উপহারগুলোও আপনার ঠিকানায় সরাসরি পাঠিয়ে দেওয়া হবে।
              </p>
            </div>
            <button
              type="button"
              onClick={loadCustomerClaims}
              disabled={loadingClaims}
              className="text-xs text-purple-600 hover:underline font-bold flex items-center space-x-1 cursor-pointer bg-purple-50 px-3 py-1.5 rounded-xl border border-purple-100 shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingClaims ? "animate-spin" : ""}`} />
              <span>রিফ্রেশ</span>
            </button>
          </div>

          {loadingClaims ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 shadow-xs">
              <RefreshCw className="w-7 h-7 text-purple-600 animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-500 font-bold">দাবিকৃত উপহার লোড হচ্ছে...</p>
            </div>
          ) : myClaims.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200 p-8 shadow-xs">
              <Package className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <h5 className="text-sm font-black text-slate-700">কোনো উপহার দাবি করা হয়নি</h5>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                আপনার জমানো পয়েন্ট দিয়ে ক্যাটালগ থেকে আকর্ষণীয় উপহার রিডিম করুন।
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("catalog")}
                className="mt-4 px-4 py-2 bg-purple-600 text-white text-xs font-bold rounded-xl hover:bg-purple-700 transition cursor-pointer shadow-xs"
              >
                উপহার ক্যাটালগ দেখুন
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:gap-4">
              {myClaims.map((claim) => (
                <div
                  key={claim.id}
                  className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs hover:border-purple-200 transition"
                >
                  <div className="flex items-center space-x-4">
                    <img
                      src={claim.giftImage}
                      alt={claim.giftNameBn}
                      className="w-16 h-16 rounded-2xl object-cover border border-slate-100 shrink-0 shadow-xs"
                    />
                    <div>
                      <h5 className="text-xs sm:text-sm font-black text-slate-900">{claim.giftNameBn}</h5>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        আইডি: #{claim.id.slice(-8).toUpperCase()} • তারিখ: {new Date(claim.claimDate).toLocaleDateString("bn-BD")}
                      </p>
                      <p className="text-xs text-emerald-700 font-bold mt-1">
                        ব্যয়িত পয়েন্ট: {claim.pointsDeducted} pts
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <div className="text-right">
                      <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase border ${
                        claim.status === "delivered" 
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                          : claim.status === "dispatched"
                          ? "bg-blue-100 text-blue-800 border-blue-300"
                          : "bg-amber-100 text-amber-800 border-amber-300"
                      }`}>
                        {claim.status === "delivered" ? "ডেলিভারি সম্পন্ন ✓" : claim.status === "dispatched" ? "ডেলিভারিতে চলমান 🚚" : "প্রসেসিং হচ্ছে ⏳"}
                      </span>
                      <p className="text-[11px] text-slate-400 mt-1 max-w-[200px] truncate">
                        ঠিকানা: {claim.deliveryAddress}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Confirmation Sub-Dialog */}
      {isConfirming && selectedGift && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-purple-700 font-black text-sm">
                <Gift className="w-5 h-5 text-purple-600" />
                <span>উপহার দাবি নিশ্চিতকরণ</span>
              </div>
              <button
                type="button"
                onClick={() => setIsConfirming(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm font-black text-slate-800">
              আপনি কি এই উপহারটি দাবি করতে চান?
            </p>

            <div className="flex items-center space-x-3.5 bg-purple-50 p-3.5 rounded-2xl border border-purple-100">
              <img
                src={selectedGift.image}
                alt={selectedGift.nameBn}
                className="w-16 h-16 rounded-xl object-cover border border-purple-200 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-black text-slate-900 truncate">{selectedGift.nameBn}</h4>
                <p className="text-[10px] text-slate-500">{selectedGift.categoryBn}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-xs font-black text-purple-800 font-mono bg-purple-100/80 px-2 py-0.5 rounded-md">
                    -{selectedGift.pointsRequired} pts
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1 text-slate-600">
                <div className="flex justify-between">
                  <span>বর্তমান পয়েন্ট:</span>
                  <span className="font-mono font-bold text-slate-800">{currentPoints} pts</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>কাটা হবে:</span>
                  <span className="font-mono font-bold">-{selectedGift.pointsRequired} pts</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200 font-black text-emerald-700">
                  <span>অবশিষ্ট পয়েন্ট:</span>
                  <span className="font-mono">{(currentPoints - selectedGift.pointsRequired).toLocaleString()} pts</span>
                </div>
              </div>

              {/* Delivery info */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  ডেলিভারি মোবাইল নম্বর
                </label>
                <input
                  type="tel"
                  value={deliveryPhone}
                  onChange={(e) => setDeliveryPhone(e.target.value)}
                  placeholder="017XXXXXXXX"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:ring-1 focus:ring-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  ডেলিভারির ঠিকানা
                </label>
                <textarea
                  rows={2}
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="বাসা, রোড, এলাকা, জেলা"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:ring-1 focus:ring-purple-500 outline-none"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirming(false)}
                disabled={isProcessing}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
              >
                বাতিল করুন
              </button>
              <button
                type="button"
                onClick={handleConfirmRedemption}
                disabled={isProcessing}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-md disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>প্রসেসিং হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>হ্যাঁ, উপহারটি দাবি করুন</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Celebration Dialog */}
      {claimedSuccessGift && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl border border-slate-100 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-10 h-10 animate-bounce" />
            </div>

            <div>
              <span className="text-[10px] font-black uppercase text-purple-600 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-100">
                দাবি সফল হয়েছে!
              </span>
              <h3 className="text-base font-black text-slate-900 mt-2">
                🎉 অভিনন্দন!
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                আপনি সফলভাবে <strong>"{claimedSuccessGift.nameBn}"</strong> দাবি করেছেন।
              </p>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-[11px] text-slate-500 leading-relaxed text-left space-y-1">
              <p>• আপনার অ্যাকাউন্ট থেকে <strong>{claimedSuccessGift.pointsRequired}</strong> পয়েন্ট কাটা হয়েছে।</p>
              <p>• কাচা বাজার ডেলিভারি টিম দ্রুততম সময়ে উপহারটি আপনার ঠিকানায় পৌঁছে দেবে।</p>
            </div>

            <button
              type="button"
              onClick={() => {
                setClaimedSuccessGift(null);
                setActiveTab("my_claims");
              }}
              className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-md"
            >
              আমার দাবি ট্র্যাকিং দেখুন
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
