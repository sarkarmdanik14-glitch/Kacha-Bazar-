import React, { useState, useEffect } from "react";
import { X, Upload, Plus, Trash2, MapPin, Tag, Phone, MessageSquare, AlertCircle, CheckCircle, Image as ImageIcon } from "lucide-react";
import { db, collection, addDoc, doc, updateDoc, serverTimestamp } from "../../lib/firebase";
import { BuySellListing, BUY_SELL_CATEGORIES, POPULAR_LOCATIONS } from "../../types/buySell";

interface SellItemModalProps {
  currentUser: any;
  listingToEdit?: BuySellListing | null;
  lang: "bn" | "en";
  onClose: () => void;
  onSuccess: (savedListing: BuySellListing) => void;
  triggerToast: (bn: string, en: string) => void;
  onOpenAuth: () => void;
}

export default function SellItemModal({
  currentUser,
  listingToEdit,
  lang,
  onClose,
  onSuccess,
  triggerToast,
  onOpenAuth
}: SellItemModalProps) {
  const isEditing = !!listingToEdit;

  const [title, setTitle] = useState(listingToEdit?.title || "");
  const [category, setCategory] = useState(listingToEdit?.category || "mobiles");
  const [condition, setCondition] = useState<"brand_new" | "like_new" | "used">(listingToEdit?.condition || "used");
  const [price, setPrice] = useState<string>(listingToEdit?.price?.toString() || "");
  const [isNegotiable, setIsNegotiable] = useState<boolean>(listingToEdit?.isNegotiable || false);
  const [location, setLocation] = useState(listingToEdit?.location || "চাঁচকৈড় বাজার, গুরুদাসপুর");
  const [description, setDescription] = useState(listingToEdit?.description || "");
  const [images, setImages] = useState<string[]>(listingToEdit?.images || []);
  const [imageUrlInput, setImageUrlInput] = useState("");
  
  const [sellerName, setSellerName] = useState(
    listingToEdit?.sellerName || currentUser?.displayName || ""
  );
  const [sellerPhone, setSellerPhone] = useState(
    listingToEdit?.sellerPhone || currentUser?.phoneNumber || ""
  );
  const [sellerWhatsApp, setSellerWhatsApp] = useState(
    listingToEdit?.sellerWhatsApp || listingToEdit?.sellerPhone || currentUser?.phoneNumber || ""
  );
  const [allowCall, setAllowCall] = useState<boolean>(listingToEdit?.allowCall !== false);
  const [allowWhatsApp, setAllowWhatsApp] = useState<boolean>(listingToEdit?.allowWhatsApp !== false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // If not logged in, prompt user to log in
  if (!currentUser?.uid) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto animate-fadeIn">
        <div className="max-h-[85vh] sm:max-h-[90vh] flex flex-col w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden text-center border border-slate-100 p-6 sm:p-8">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <Tag className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">
            {lang === "bn" ? "বিজ্ঞাপন দিতে লগইন করুন" : "Sign In to Post an Ad"}
          </h3>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            {lang === "bn"
              ? "বাই-সেল জোনে আপনার ব্যবহৃত বা নতুন যেকোনো পণ্য নিরাপদে বিক্রি করতে প্রথমে আপনার অ্যাকাউন্টে লগইন করুন।"
              : "Please sign in to post and manage your items securely on Kacha Bazar Buy & Sell Marketplace."}
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
            >
              {lang === "bn" ? "পরে করব" : "Cancel"}
            </button>
            <button
              onClick={() => {
                onClose();
                onOpenAuth();
              }}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 shadow-md hover:shadow-lg transition cursor-pointer"
            >
              {lang === "bn" ? "লগইন করুন" : "Sign In"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleAddImageUrl = () => {
    const url = imageUrlInput.trim();
    if (!url) return;
    if (images.length >= 5) {
      setErrorMsg(lang === "bn" ? "সর্বোচ্চ ৫টি ছবি যুক্ত করা যাবে।" : "Maximum 5 photos allowed.");
      return;
    }
    setImages(prev => [...prev, url]);
    setImageUrlInput("");
    setErrorMsg(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (images.length + files.length > 5) {
      setErrorMsg(lang === "bn" ? "সর্বোচ্চ ৫টি ছবি যুক্ত করা যাবে।" : "Maximum 5 photos allowed.");
      return;
    }

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImages(prev => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
    setErrorMsg(null);
  };

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const numericPrice = parseFloat(price);
    if (!title.trim()) {
      setErrorMsg(lang === "bn" ? "অনুগ্রহ করে পণ্যের নাম বা শিরোনাম দিন।" : "Please enter a title.");
      return;
    }
    if (isNaN(numericPrice) || numericPrice <= 0) {
      setErrorMsg(lang === "bn" ? "অনুগ্রহ করে সঠিক মূল্য প্রদান করুন।" : "Please enter a valid price.");
      return;
    }
    if (!location.trim()) {
      setErrorMsg(lang === "bn" ? "আপনার এলাকার নাম বা লোকেশন দিন।" : "Please enter your location.");
      return;
    }
    if (!sellerPhone.trim()) {
      setErrorMsg(lang === "bn" ? "যোগাযোগের ফোন নম্বর দিন।" : "Please enter your contact phone number.");
      return;
    }

    setSubmitting(true);
    try {
      const listingData: Partial<BuySellListing> = {
        title: title.trim(),
        titleBn: title.trim(),
        category,
        condition,
        price: numericPrice,
        isNegotiable,
        location: location.trim(),
        description: description.trim(),
        images: images.length > 0 ? images : [
          "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop&q=80"
        ],
        sellerUid: currentUser.uid,
        sellerName: sellerName.trim() || currentUser.displayName || (lang === "bn" ? "বিক্রেতা" : "Seller"),
        sellerPhone: sellerPhone.trim(),
        sellerEmail: currentUser.email || "",
        sellerWhatsApp: sellerWhatsApp.trim() || sellerPhone.trim(),
        allowCall,
        allowWhatsApp,
        status: listingToEdit?.status || "active",
        reportCount: listingToEdit?.reportCount || 0,
        views: listingToEdit?.views || 0,
        updatedAt: serverTimestamp()
      };

      if (isEditing && listingToEdit) {
        const docRef = doc(db, "buy_sell_listings", listingToEdit.id);
        await updateDoc(docRef, listingData);
        triggerToast("বিজ্ঞাপন সফলভাবে আপডেট হয়েছে!", "Listing updated successfully!");
        onSuccess({ ...(listingToEdit as BuySellListing), ...listingData } as BuySellListing);
      } else {
        listingData.createdAt = serverTimestamp();
        const docRef = await addDoc(collection(db, "buy_sell_listings"), listingData);
        triggerToast("আপনার বিজ্ঞাপন সফলভাবে প্রকাশিত হয়েছে!", "Your listing is now live!");
        onSuccess({ id: docRef.id, ...listingData } as BuySellListing);
      }
      onClose();
    } catch (err: any) {
      console.error("Error saving listing:", err);
      setErrorMsg(err.message || (lang === "bn" ? "বিজ্ঞাপন প্রকাশ করতে সমস্যা হয়েছে।" : "Failed to publish listing."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="max-h-[85vh] sm:max-h-[90vh] flex flex-col w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
        {/* Header */}
        <div className="flex-shrink-0 p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                {isEditing 
                  ? (lang === "bn" ? "বিজ্ঞাপন সম্পাদনা করুন" : "Edit Listing")
                  : (lang === "bn" ? "পণ্য বিক্রয়ের বিজ্ঞাপন দিন" : "Sell Your Item")}
              </h3>
              <p className="text-xs text-slate-500">
                {lang === "bn" ? "বাই-সেল জোন • কাঁচা বাজার পাবলিক মার্কেট" : "Buy & Sell Zone • Kacha Bazar Marketplace"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="m-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-700 text-xs shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="overflow-y-auto flex-1 p-6 space-y-4">
          {/* Photos Upload & URL */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {lang === "bn" ? "পণ্যের ছবি (সর্বোচ্চ ৫টি):" : "Item Photos (Max 5):"}
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5 mb-2.5">
              {images.map((img, idx) => (
                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100 group">
                  <img src={img} alt="Product" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-rose-600 text-white rounded-full transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {images.length < 5 && (
                <label className="aspect-square rounded-xl border-2 border-dashed border-slate-300 hover:border-emerald-500 flex flex-col items-center justify-center cursor-pointer bg-slate-50/50 hover:bg-emerald-50/40 transition">
                  <Upload className="w-5 h-5 text-slate-400 mb-1" />
                  <span className="text-[10px] text-slate-500 font-medium">{lang === "bn" ? "ছবি যোগ" : "Upload"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Direct Image URL input */}
            <div className="flex gap-2">
              <input
                type="url"
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
                placeholder={lang === "bn" ? "অথবা ছবির সরাসরি ওয়েব লিঙ্ক (URL) দিন..." : "Or paste image web URL..."}
                className="flex-1 text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={handleAddImageUrl}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                {lang === "bn" ? "যুক্ত করুন" : "Add URL"}
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {lang === "bn" ? "পণ্যের নাম বা শিরোনাম *" : "Item Title *"}
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={lang === "bn" ? "যেমন: Walton Primo R10 (6/128GB) বা সেগুন কাঠের আলমারি" : "e.g. Walton Primo R10 (6/128GB) or Bicycle"}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Category & Condition */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {lang === "bn" ? "ক্যাটাগরি *" : "Category *"}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                {BUY_SELL_CATEGORIES.filter(c => c.id !== "all").map(c => (
                  <option key={c.id} value={c.id}>
                    {lang === "bn" ? c.nameBn : c.nameEn}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {lang === "bn" ? "পণ্যের কন্ডিশন *" : "Condition *"}
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as any)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="brand_new">{lang === "bn" ? "একদম নতুন (Brand New)" : "Brand New"}</option>
                <option value="like_new">{lang === "bn" ? "নতুনের মতো (Like New)" : "Like New"}</option>
                <option value="used">{lang === "bn" ? "ব্যবহৃত (Used)" : "Used"}</option>
              </select>
            </div>
          </div>

          {/* Price & Negotiable */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 items-end">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {lang === "bn" ? "মূল্য (টাকা) *" : "Price (BDT) *"}
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-xs text-slate-400 font-bold">৳</span>
                <input
                  type="number"
                  min="1"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full text-xs pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
                />
              </div>
            </div>

            <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer">
              <input
                type="checkbox"
                checked={isNegotiable}
                onChange={(e) => setIsNegotiable(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
              />
              <span className="text-xs font-medium text-slate-700">
                {lang === "bn" ? "দাম আলোচনা সাপেক্ষে (Negotiable)" : "Price is Negotiable"}
              </span>
            </label>
          </div>

          {/* Location & Quick chips */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {lang === "bn" ? "আপনার লোকেশন / এলাকা *" : "Location / Area *"}
            </label>
            <div className="relative mb-2">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={lang === "bn" ? "যেমন: চাঁচকৈড় বাজার, গুরুদাসপুর, নাটোর" : "e.g. Chanchkoir Bazar, Gurudaspur, Natore"}
                className="w-full text-xs pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_LOCATIONS.slice(0, 5).map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setLocation(loc)}
                  className={`text-[10px] px-2.5 py-1 rounded-full border transition cursor-pointer ${
                    location === loc
                      ? "bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {loc}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {lang === "bn" ? "বিস্তারিত বিবরণ *" : "Detailed Description *"}
            </label>
            <textarea
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={lang === "bn" ? "পণ্যের বর্তমান অবস্থা, কতদিন ব্যবহার করেছেন, কোনো সমস্যা আছে কি না ইত্যাদি লিখুন..." : "Describe the item's condition, usage history, features, reason for selling..."}
              className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            ></textarea>
          </div>

          {/* Seller Contact Info */}
          <div className="bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
              <span>{lang === "bn" ? "বিক্রেতার যোগাযোগের তথ্য" : "Seller Contact Details"}</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  {lang === "bn" ? "আপনার নাম *" : "Your Name *"}
                </label>
                <input
                  type="text"
                  required
                  value={sellerName}
                  onChange={(e) => setSellerName(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  {lang === "bn" ? "মোবাইল নম্বর *" : "Phone Number *"}
                </label>
                <input
                  type="tel"
                  required
                  value={sellerPhone}
                  onChange={(e) => setSellerPhone(e.target.value)}
                  placeholder="017XXXXXXXX"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                {lang === "bn" ? "হোয়াটসঅ্যাপ নম্বর (ঐচ্ছিক)" : "WhatsApp Number (Optional)"}
              </label>
              <input
                type="tel"
                value={sellerWhatsApp}
                onChange={(e) => setSellerWhatsApp(e.target.value)}
                placeholder="01XXXXXXXXX"
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white font-mono"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={allowCall}
                  onChange={(e) => setAllowCall(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <span>{lang === "bn" ? "সরাসরি ফোন কল গ্রহণ করবেন" : "Allow Direct Calls"}</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={allowWhatsApp}
                  onChange={(e) => setAllowWhatsApp(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <span>{lang === "bn" ? "হোয়াটসঅ্যাপে চ্যাট গ্রহণ করবেন" : "Allow WhatsApp Messages"}</span>
              </label>
            </div>
          </div>
          </div>

          {/* Submit Buttons */}
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
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              <span>
                {submitting
                  ? (lang === "bn" ? "সংরক্ষণ হচ্ছে..." : "Saving...")
                  : isEditing
                    ? (lang === "bn" ? "আপডেট সংরক্ষণ করুন" : "Save Changes")
                    : (lang === "bn" ? "বিজ্ঞাপন প্রকাশ করুন" : "Publish Listing")}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
