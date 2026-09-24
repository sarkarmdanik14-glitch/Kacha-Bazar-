import React, { useState, useEffect, useMemo } from "react";
import { 
  ArrowLeft, 
  Search, 
  Plus, 
  Filter, 
  Tag, 
  MapPin, 
  SlidersHorizontal, 
  ShoppingBag, 
  Layers, 
  UserCheck, 
  Sparkles, 
  RefreshCw,
  X,
  CheckCircle2,
  ChevronDown
} from "lucide-react";
import { db, collection, query, onSnapshot, orderBy, where } from "../../lib/firebase";
import { BuySellListing, BUY_SELL_CATEGORIES, POPULAR_LOCATIONS } from "../../types/buySell";
import BuySellCard from "./BuySellCard";
import SellItemModal from "./SellItemModal";
import BuySellDetailsModal from "./BuySellDetailsModal";
import BuySellChatModal from "./BuySellChatModal";
import BuySellReportModal from "./BuySellReportModal";

interface BuySellMarketplaceProps {
  currentUser: any;
  lang: "bn" | "en";
  onBackToHome: () => void;
  triggerToast: (bn: string, en: string) => void;
  onOpenAuth: () => void;
}

export default function BuySellMarketplace({
  currentUser,
  lang,
  onBackToHome,
  triggerToast,
  onOpenAuth
}: BuySellMarketplaceProps) {
  const [listings, setListings] = useState<BuySellListing[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedCondition, setSelectedCondition] = useState<string>("all");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "price_asc" | "price_desc">("newest");
  const [viewTab, setViewTab] = useState<"browse" | "my_listings">("browse");

  // Modals
  const [showSellModal, setShowSellModal] = useState(false);
  const [editingListing, setEditingListing] = useState<BuySellListing | null>(null);
  const [selectedListingDetails, setSelectedListingDetails] = useState<BuySellListing | null>(null);
  const [chatListing, setChatListing] = useState<BuySellListing | null>(null);
  const [reportListing, setReportListing] = useState<BuySellListing | null>(null);

  // Firestore real-time listener
  useEffect(() => {
    setLoading(true);
    const listingsRef = collection(db, "buy_sell_listings");
    // Listen to all listings
    const q = query(listingsRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: BuySellListing[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        items.push({
          id: doc.id,
          ...data
        } as BuySellListing);
      });

      // Sort client-side by createdAt descending
      items.sort((a, b) => {
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return timeB - timeA;
      });

      setListings(items);
      setLoading(false);
    }, (err) => {
      console.warn("BuySell listings listener error:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filter listings
  const filteredListings = useMemo(() => {
    let result = [...listings];

    // Filter by view tab (Browse vs My Listings)
    if (viewTab === "my_listings") {
      if (!currentUser?.uid) return [];
      result = result.filter(item => item.sellerUid === currentUser.uid);
    } else {
      // In browse view, hide flagged items
      result = result.filter(item => item.status !== "flagged");
    }

    // Category filter
    if (selectedCategory !== "all") {
      result = result.filter(item => item.category === selectedCategory);
    }

    // Condition filter
    if (selectedCondition !== "all") {
      result = result.filter(item => item.condition === selectedCondition);
    }

    // Location filter
    if (selectedLocation !== "all") {
      result = result.filter(item => 
        item.location?.toLowerCase().includes(selectedLocation.toLowerCase())
      );
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(item => 
        item.title?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.location?.toLowerCase().includes(q) ||
        item.sellerName?.toLowerCase().includes(q)
      );
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === "price_asc") return a.price - b.price;
      if (sortBy === "price_desc") return b.price - a.price;
      const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
      const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
      return timeB - timeA;
    });

    return result;
  }, [listings, viewTab, currentUser?.uid, selectedCategory, selectedCondition, selectedLocation, searchQuery, sortBy]);

  const myListingsCount = useMemo(() => {
    if (!currentUser?.uid) return 0;
    return listings.filter(item => item.sellerUid === currentUser.uid).length;
  }, [listings, currentUser?.uid]);

  const handleOpenSell = () => {
    if (!currentUser?.uid) {
      onOpenAuth();
      triggerToast("বিজ্ঞাপন দিতে অনুগ্রহ করে প্রথমে লগইন করুন।", "Please sign in to post an ad.");
      return;
    }
    setEditingListing(null);
    setShowSellModal(true);
  };

  const handleEditListing = (listing: BuySellListing) => {
    setEditingListing(listing);
    setShowSellModal(true);
  };

  const handleDeleteSuccess = (listingId: string) => {
    setListings(prev => prev.filter(item => item.id !== listingId));
    if (selectedListingDetails?.id === listingId) {
      setSelectedListingDetails(null);
    }
  };

  const handleChatOpen = (listing: BuySellListing) => {
    if (!currentUser?.uid) {
      onOpenAuth();
      triggerToast("চ্যাট করতে অনুগ্রহ করে প্রথমে লগইন করুন।", "Please sign in to chat.");
      return;
    }
    setChatListing(listing);
  };

  const handleReportOpen = (listing: BuySellListing) => {
    setReportListing(listing);
  };

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-6 animate-fadeIn">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <button
          onClick={onBackToHome}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 transition cursor-pointer shadow-2xs w-fit"
        >
          <ArrowLeft className="w-4 h-4 text-emerald-600" />
          <span>{lang === "bn" ? "সব ক্যাটাগরি (হোম)" : "All Categories (Home)"}</span>
        </button>

        {/* View Switcher & Post Ad Button */}
        <div className="flex items-center gap-2">
          {currentUser?.uid && (
            <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200/60">
              <button
                type="button"
                onClick={() => setViewTab("browse")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  viewTab === "browse"
                    ? "bg-white text-emerald-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {lang === "bn" ? "সব বিজ্ঞাপন" : "Browse All"}
              </button>
              <button
                type="button"
                onClick={() => setViewTab("my_listings")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  viewTab === "my_listings"
                    ? "bg-white text-emerald-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>{lang === "bn" ? "আমার বিজ্ঞাপন" : "My Ads"}</span>
                {myListingsCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center font-bold">
                    {myListingsCount}
                  </span>
                )}
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleOpenSell}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md hover:shadow-lg transition flex items-center gap-1.5 cursor-pointer ml-auto sm:ml-0"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === "bn" ? "বিজ্ঞাপন দিন" : "Sell Your Item"}</span>
          </button>
        </div>
      </div>

      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white p-5 sm:p-8 mb-6 shadow-xl">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-xs text-[11px] font-semibold mb-3 text-emerald-200">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
            <span>{lang === "bn" ? "কাঁচা বাজার পাবলিক মার্কেটপ্লেস" : "Kacha Bazar Public Marketplace"}</span>
          </div>

          <h1 className="text-xl sm:text-3xl font-black mb-2 tracking-tight">
            {lang === "bn" ? "বাই-সেল জোন (Buy & Sell Zone)" : "Buy & Sell Marketplace"}
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed mb-4 sm:mb-5">
            {lang === "bn"
              ? "আপনার অপ্রয়োজনীয় মোবাইল, ইলেকট্রনিক্স, ফার্নিচার, সাইকেল বা যেকোনো পণ্য সহজে বিক্রি করুন অথবা সাশ্রয়ী মূল্যে সরাসরি সেলারের কাছ থেকে কিনুন।"
              : "Buy & sell used or new items directly from genuine local sellers in Gurudaspur, Natore and beyond."}
          </p>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              onClick={handleOpenSell}
              className="px-4 sm:px-5 py-2.5 rounded-xl bg-white text-emerald-800 font-bold text-xs hover:bg-emerald-50 transition shadow-md flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-emerald-600" />
              <span>{lang === "bn" ? "ফ্রি বিজ্ঞাপন দিন" : "Post Free Ad"}</span>
            </button>
            <span className="text-xs text-emerald-200 font-medium">
              {listings.length} {lang === "bn" ? "টি সক্রিয় বিজ্ঞাপন উপলব্ধ" : "active ads available"}
            </span>
          </div>
        </div>

        {/* Decorative background accent */}
        <div className="absolute right-[-40px] top-[-40px] w-80 h-80 rounded-full bg-white/5 blur-3xl pointer-events-none"></div>
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3 sm:p-4 mb-6 shadow-2xs space-y-3">
        {/* Main Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={lang === "bn" ? "পণ্য, মডেল, এলাকা বা সেলার খুঁজুন..." : "Search by item title, brand, location..."}
            className="w-full text-xs pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-2.5 p-1 rounded-full text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Horizontal Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none snap-x">
          {BUY_SELL_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer snap-start border ${
                selectedCategory === cat.id
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {lang === "bn" ? cat.nameBn : cat.nameEn}
            </button>
          ))}
        </div>

        {/* Secondary Filter Row: Condition, Location & Sort */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            {/* Condition Dropdown */}
            <select
              value={selectedCondition}
              onChange={(e) => setSelectedCondition(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">{lang === "bn" ? "সব কন্ডিশন" : "All Conditions"}</option>
              <option value="brand_new">{lang === "bn" ? "একদম নতুন" : "Brand New"}</option>
              <option value="like_new">{lang === "bn" ? "নতুনের মতো" : "Like New"}</option>
              <option value="used">{lang === "bn" ? "ব্যবহৃত" : "Used"}</option>
            </select>

            {/* Location Dropdown */}
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 max-w-[150px] truncate"
            >
              <option value="all">{lang === "bn" ? "সব এলাকা" : "All Locations"}</option>
              {POPULAR_LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>

            {/* Reset Filter Button if active */}
            {(selectedCategory !== "all" || selectedCondition !== "all" || selectedLocation !== "all" || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory("all");
                  setSelectedCondition("all");
                  setSelectedLocation("all");
                  setSearchQuery("");
                }}
                className="text-[11px] text-rose-600 hover:text-rose-700 font-bold underline cursor-pointer"
              >
                {lang === "bn" ? "ফিল্টার রিসেট" : "Reset"}
              </button>
            )}
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>{lang === "bn" ? "বাছাই:" : "Sort:"}</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 font-medium"
            >
              <option value="newest">{lang === "bn" ? "সবার নতুন (Newest)" : "Newest First"}</option>
              <option value="price_asc">{lang === "bn" ? "দাম: কম থেকে বেশি" : "Price: Low to High"}</option>
              <option value="price_desc">{lang === "bn" ? "দাম: বেশি থেকে কম" : "Price: High to Low"}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid of Listings */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-3 animate-pulse shadow-2xs">
              <div className="w-full aspect-[4/3] bg-slate-200 rounded-xl mb-3"></div>
              <div className="h-3 w-3/4 bg-slate-200 rounded mb-2"></div>
              <div className="h-2.5 w-1/2 bg-slate-200 rounded mb-3"></div>
              <div className="h-6 w-full bg-slate-200 rounded"></div>
            </div>
          ))}
        </div>
      ) : filteredListings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center shadow-2xs max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-1">
            {viewTab === "my_listings"
              ? (lang === "bn" ? "আপনার কোনো বিজ্ঞাপন নেই" : "You have no listings yet")
              : (lang === "bn" ? "কোনো বিজ্ঞাপন পাওয়া যায়নি" : "No listings found")}
          </h3>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            {viewTab === "my_listings"
              ? (lang === "bn" ? "বাই-সেল জোনে আপনার পণ্য বিক্রির জন্য এখনই বিজ্ঞাপন দিন।" : "Post your first item now to start selling.")
              : (lang === "bn" ? "অন্য কোনো ক্যাটাগরি বা এলাকা দিয়ে খুঁজে দেখতে পারেন অথবা প্রথম বিজ্ঞাপনটি আপনিই দিন।" : "Try adjusting filters or search term, or be the first to post an ad.")}
          </p>
          <button
            type="button"
            onClick={handleOpenSell}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition cursor-pointer inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === "bn" ? "নতুন বিজ্ঞাপন দিন" : "Post an Ad Now"}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {filteredListings.map((listing) => (
            <BuySellCard
              key={listing.id}
              listing={listing}
              currentUser={currentUser}
              lang={lang}
              onViewDetails={(item) => setSelectedListingDetails(item)}
              onEdit={handleEditListing}
              onDelete={(item) => {
                setSelectedListingDetails(item);
              }}
              onOpenChat={handleChatOpen}
            />
          ))}
        </div>
      )}

      {/* Sell / Edit Modal */}
      {showSellModal && (
        <SellItemModal
          currentUser={currentUser}
          listingToEdit={editingListing}
          lang={lang}
          onClose={() => {
            setShowSellModal(false);
            setEditingListing(null);
          }}
          onSuccess={(saved) => {
            // Updated item will sync automatically via Firestore snapshot
          }}
          triggerToast={triggerToast}
          onOpenAuth={onOpenAuth}
        />
      )}

      {/* Details Modal */}
      {selectedListingDetails && (
        <BuySellDetailsModal
          listing={selectedListingDetails}
          currentUser={currentUser}
          lang={lang}
          onClose={() => setSelectedListingDetails(null)}
          onEdit={handleEditListing}
          onDelete={handleDeleteSuccess}
          onOpenChat={handleChatOpen}
          onReport={handleReportOpen}
          triggerToast={triggerToast}
        />
      )}

      {/* Live Chat Modal */}
      {chatListing && (
        <BuySellChatModal
          listing={chatListing}
          currentUser={currentUser}
          lang={lang}
          onClose={() => setChatListing(null)}
          triggerToast={triggerToast}
        />
      )}

      {/* Report Modal */}
      {reportListing && (
        <BuySellReportModal
          listing={reportListing}
          currentUser={currentUser}
          lang={lang}
          onClose={() => setReportListing(null)}
          triggerToast={triggerToast}
        />
      )}
    </div>
  );
}
