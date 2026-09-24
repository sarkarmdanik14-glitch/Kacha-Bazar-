import React, { useState, useEffect } from "react";
import { 
  Tag, 
  Search, 
  Trash2, 
  Edit, 
  Eye, 
  AlertTriangle, 
  CheckCircle, 
  X, 
  ShieldAlert, 
  Phone, 
  MapPin, 
  RefreshCw,
  Clock,
  Filter
} from "lucide-react";
import { db, collection, query, onSnapshot, doc, updateDoc, deleteDoc, getDocs, where } from "../../lib/firebase";
import { BuySellListing, BuySellReport, BUY_SELL_CATEGORIES } from "../../types/buySell";
import BuySellDetailsModal from "../buysell/BuySellDetailsModal";
import SellItemModal from "../buysell/SellItemModal";

interface AdminBuySellTabProps {
  currentUser: any;
  lang: "bn" | "en";
  triggerToast: (bn: string, en: string) => void;
}

export default function AdminBuySellTab({
  currentUser,
  lang,
  triggerToast
}: AdminBuySellTabProps) {
  const [listings, setListings] = useState<BuySellListing[]>([]);
  const [reports, setReports] = useState<BuySellReport[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"listings" | "reports">("listings");

  // Selected modals
  const [viewingListing, setViewingListing] = useState<BuySellListing | null>(null);
  const [editingListing, setEditingListing] = useState<BuySellListing | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Real-time listener for listings
  useEffect(() => {
    setLoading(true);
    const qListings = query(collection(db, "buy_sell_listings"));
    const unsubListings = onSnapshot(qListings, (snap) => {
      const items: BuySellListing[] = [];
      snap.forEach((d) => {
        items.push({ id: d.id, ...d.data() } as BuySellListing);
      });
      items.sort((a, b) => {
        const tA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const tB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return tB - tA;
      });
      setListings(items);
      setLoading(false);
    }, (err) => {
      console.warn("Admin listings listener error:", err);
      setLoading(false);
    });

    // Real-time listener for reports
    const qReports = query(collection(db, "buy_sell_reports"));
    const unsubReports = onSnapshot(qReports, (snap) => {
      const items: BuySellReport[] = [];
      snap.forEach((d) => {
        items.push({ id: d.id, ...d.data() } as BuySellReport);
      });
      items.sort((a, b) => {
        const tA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const tB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return tB - tA;
      });
      setReports(items);
    }, (err) => {
      console.warn("Admin reports listener error:", err);
    });

    return () => {
      unsubListings();
      unsubReports();
    };
  }, []);

  // Filtered listings
  const filteredListings = listings.filter((item) => {
    if (statusFilter !== "all" && item.status !== statusFilter) return false;
    if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        item.title?.toLowerCase().includes(q) ||
        item.sellerName?.toLowerCase().includes(q) ||
        item.sellerPhone?.toLowerCase().includes(q) ||
        item.location?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const activeReports = reports.filter(r => r.status === "pending");

  // Actions
  const handleToggleStatus = async (listing: BuySellListing) => {
    try {
      const newStatus = listing.status === "active" ? "sold" : "active";
      await updateDoc(doc(db, "buy_sell_listings", listing.id), {
        status: newStatus
      });
      triggerToast("স্ট্যাটাস আপডেট করা হয়েছে!", "Listing status updated!");
    } catch (err) {
      console.error(err);
      triggerToast("আপডেট করতে সমস্যা হয়েছে।", "Failed to update status.");
    }
  };

  const handleDeleteListing = async (listingId: string) => {
    try {
      await deleteDoc(doc(db, "buy_sell_listings", listingId));
      triggerToast("বিজ্ঞাপনটি সফলভাবে মুছে ফেলা হয়েছে।", "Listing deleted permanently.");
      setDeletingId(null);
    } catch (err) {
      console.error(err);
      triggerToast("বিজ্ঞাপন মুছতে সমস্যা হয়েছে।", "Failed to delete listing.");
    }
  };

  const handleDismissReport = async (reportId: string) => {
    try {
      await updateDoc(doc(db, "buy_sell_reports", reportId), {
        status: "dismissed"
      });
      triggerToast("রিপোর্ট বাতিল করা হয়েছে।", "Report dismissed.");
    } catch (err) {
      console.error(err);
      triggerToast("ব্যর্থ হয়েছে।", "Failed to dismiss report.");
    }
  };

  const handleRemoveReportedListing = async (report: BuySellReport) => {
    try {
      // Delete listing
      await deleteDoc(doc(db, "buy_sell_listings", report.listingId));
      // Update report status
      await updateDoc(doc(db, "buy_sell_reports", report.id), {
        status: "removed"
      });
      triggerToast("বিজ্ঞাপন মুছে ফেলা হয়েছে এবং রিপোর্ট নিষ্পত্তি হয়েছে।", "Listing removed and report resolved.");
    } catch (err) {
      console.error(err);
      triggerToast("ব্যর্থ হয়েছে।", "Action failed.");
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header & Stats Cards */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Tag className="w-5 h-5 text-emerald-600" />
            <span>{lang === "bn" ? "বাই-সেল মার্কেটপ্লেস অ্যাডমিন প্যানেল" : "Buy & Sell Marketplace Admin"}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {lang === "bn" ? "ব্যবহারকারীদের সব পণ্য বিজ্ঞাপন, রিপোর্ট ও স্ট্যাটাস পরিচালনা করুন" : "Moderate user listings, manage reports and inspect ads"}
          </p>
        </div>

        {/* Tab switch */}
        <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab("listings")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === "listings"
                ? "bg-white text-emerald-700 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {lang === "bn" ? "সব বিজ্ঞাপন" : "All Listings"} ({listings.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("reports")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "reports"
                ? "bg-white text-rose-700 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
            <span>{lang === "bn" ? "রিপোর্টসমূহ" : "Reports"}</span>
            {activeReports.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] flex items-center justify-center font-bold">
                {activeReports.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Metric Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500 block">{lang === "bn" ? "মোট বিজ্ঞাপন" : "Total Ads"}</span>
          <span className="text-xl font-black text-slate-800">{listings.length}</span>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-emerald-100 bg-emerald-50/30 shadow-2xs">
          <span className="text-[11px] font-medium text-emerald-700 block">{lang === "bn" ? "সক্রিয় বিজ্ঞাপন" : "Active Ads"}</span>
          <span className="text-xl font-black text-emerald-700">{listings.filter(l => l.status === "active").length}</span>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-amber-100 bg-amber-50/30 shadow-2xs">
          <span className="text-[11px] font-medium text-amber-700 block">{lang === "bn" ? "বিক্রিত পণ্য" : "Sold Items"}</span>
          <span className="text-xl font-black text-amber-700">{listings.filter(l => l.status === "sold").length}</span>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-rose-100 bg-rose-50/30 shadow-2xs">
          <span className="text-[11px] font-medium text-rose-700 block">{lang === "bn" ? "রিপোর্টকৃত" : "Reported"}</span>
          <span className="text-xl font-black text-rose-700">{activeReports.length}</span>
        </div>
      </div>

      {activeTab === "reports" ? (
        /* Reports Management View */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-rose-50/40 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span>{lang === "bn" ? "বিজ্ঞাপন অভিযোগ ও রিপোর্টসমূহ" : "Listing Reports & Complaints"}</span>
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              {activeReports.length} {lang === "bn" ? "টি সক্রিয় রিপোর্ট বাকি" : "pending reports"}
            </span>
          </div>

          {activeReports.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700 mb-0.5">
                {lang === "bn" ? "কোনো পেন্ডিং রিপোর্ট নেই!" : "No pending reports!"}
              </p>
              <p className="text-[11px]">
                {lang === "bn" ? "সব বিজ্ঞাপন স্বাভাবিক ও নিরাপদ অবস্থায় রয়েছে।" : "All listings are clean and in good standing."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {activeReports.map((rep) => {
                const associatedListing = listings.find(l => l.id === rep.listingId);
                return (
                  <div key={rep.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                          {rep.reason}
                        </span>
                        <span className="text-xs font-bold text-slate-900">
                          {rep.listingTitle || "Unknown Listing"}
                        </span>
                      </div>
                      {rep.details && (
                        <p className="text-xs text-slate-600 italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                          "{rep.details}"
                        </p>
                      )}
                      <p className="text-[11px] text-slate-400">
                        {lang === "bn" ? "রিপোর্টকারী:" : "Reported by:"} <span className="font-semibold">{rep.reportedByName}</span> •{" "}
                        {rep.createdAt?.toDate ? rep.createdAt.toDate().toLocaleDateString("bn-BD") : "সম্প্রতি"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {associatedListing && (
                        <button
                          type="button"
                          onClick={() => setViewingListing(associatedListing)}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{lang === "bn" ? "বিজ্ঞাপন দেখুন" : "View"}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDismissReport(rep.id)}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                      >
                        {lang === "bn" ? "খারিজ করুন" : "Dismiss"}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveReportedListing(rep)}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{lang === "bn" ? "বিজ্ঞাপন মুছুন" : "Remove Ad"}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Listings Table View */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          {/* Table Filters */}
          <div className="p-3.5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-2 justify-between items-stretch sm:items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={lang === "bn" ? "বিজ্ঞাপন, সেলার বা এলাকা খুঁজুন..." : "Search listing, seller or location..."}
                className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white"
              >
                {BUY_SELL_CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>
                    {lang === "bn" ? c.nameBn : c.nameEn}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white"
              >
                <option value="all">{lang === "bn" ? "সব স্ট্যাটাস" : "All Status"}</option>
                <option value="active">{lang === "bn" ? "সক্রিয় (Active)" : "Active"}</option>
                <option value="sold">{lang === "bn" ? "বিক্রিত (Sold)" : "Sold"}</option>
              </select>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">
              {lang === "bn" ? "লোড হচ্ছে..." : "Loading listings..."}
            </div>
          ) : filteredListings.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              {lang === "bn" ? "কোনো বিজ্ঞাপন পাওয়া যায়নি।" : "No listings found."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-[11px] font-bold text-slate-600">
                    <th className="p-3">{lang === "bn" ? "পণ্য / ছবি" : "Item / Photo"}</th>
                    <th className="p-3">{lang === "bn" ? "মূল্য ও কন্ডিশন" : "Price & Condition"}</th>
                    <th className="p-3">{lang === "bn" ? "সেলার ও যোগাযোগ" : "Seller & Contact"}</th>
                    <th className="p-3">{lang === "bn" ? "লোকেশন" : "Location"}</th>
                    <th className="p-3">{lang === "bn" ? "স্ট্যাটাস" : "Status"}</th>
                    <th className="p-3 text-right">{lang === "bn" ? "অ্যাকশন" : "Actions"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredListings.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition">
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={item.images?.[0] || "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=100&auto=format&fit=crop&q=80"}
                            alt={item.title}
                            className="w-11 h-11 rounded-lg object-cover border border-slate-200 shrink-0"
                          />
                          <div className="min-w-0 max-w-[200px]">
                            <h5 className="font-bold text-slate-900 truncate">{item.title}</h5>
                            <span className="text-[10px] text-slate-400">
                              {BUY_SELL_CATEGORIES.find(c => c.id === item.category)?.nameBn || item.category}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="p-3">
                        <span className="font-black text-emerald-600 block">৳{item.price?.toLocaleString("bn-BD")}</span>
                        <span className="text-[10px] text-slate-500">
                          {item.condition === "brand_new" ? "নতুন" : item.condition === "like_new" ? "নতুনের মতো" : "ব্যবহৃত"}
                          {item.isNegotiable ? " (আলোচনা সাপেক্ষে)" : ""}
                        </span>
                      </td>

                      <td className="p-3">
                        <span className="font-semibold text-slate-800 block">{item.sellerName}</span>
                        <span className="text-[11px] font-mono text-slate-500">{item.sellerPhone}</span>
                      </td>

                      <td className="p-3">
                        <span className="text-slate-600 truncate block max-w-[140px]">{item.location}</span>
                      </td>

                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(item)}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md cursor-pointer transition ${
                            item.status === "sold"
                              ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                              : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                          }`}
                        >
                          {item.status === "sold" ? "বিক্রিত" : "সক্রিয়"}
                        </button>
                        {item.reportCount && item.reportCount > 0 ? (
                          <span className="ml-1 text-[9px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                            {item.reportCount}টি রিপোর্ট
                          </span>
                        ) : null}
                      </td>

                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setViewingListing(item)}
                            title={lang === "bn" ? "বিস্তারিত দেখুন" : "View Details"}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setEditingListing(item)}
                            title={lang === "bn" ? "এডিট করুন" : "Edit"}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {deletingId === item.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleDeleteListing(item.id)}
                                className="px-2 py-1 bg-rose-600 text-white rounded text-[10px] font-bold hover:bg-rose-700 cursor-pointer"
                              >
                                নিশ্চিত
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingId(null)}
                                className="px-2 py-1 bg-slate-200 text-slate-700 rounded text-[10px] font-bold hover:bg-slate-300 cursor-pointer"
                              >
                                বাতিল
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeletingId(item.id)}
                              title={lang === "bn" ? "মুছে ফেলুন" : "Delete"}
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Details Modal */}
      {viewingListing && (
        <BuySellDetailsModal
          listing={viewingListing}
          currentUser={currentUser}
          lang={lang}
          onClose={() => setViewingListing(null)}
          onEdit={(l) => {
            setViewingListing(null);
            setEditingListing(l);
          }}
          onDelete={(id) => {
            handleDeleteListing(id);
            setViewingListing(null);
          }}
          onOpenChat={() => {}}
          onReport={() => {}}
          triggerToast={triggerToast}
        />
      )}

      {/* Edit Modal */}
      {editingListing && (
        <SellItemModal
          currentUser={currentUser}
          listingToEdit={editingListing}
          lang={lang}
          onClose={() => setEditingListing(null)}
          onSuccess={() => {
            setEditingListing(null);
          }}
          triggerToast={triggerToast}
          onOpenAuth={() => {}}
        />
      )}
    </div>
  );
}
