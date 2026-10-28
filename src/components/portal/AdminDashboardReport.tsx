import React, { useState, useEffect, useMemo } from "react";
import { 
  TrendingUp, ShoppingBag, User, Store, Bike, DollarSign, 
  CheckCircle, Clock, X, ChevronRight, Award, FileText,
  Activity, Users, RefreshCw, AlertCircle, ShieldCheck,
  Smartphone, Monitor, Globe, Radio, Eye
} from "lucide-react";
import { subscribeToVisitorAnalytics, forceRefreshVisitorStats, VisitorAnalyticsData } from "../../lib/visitorTracker";
import { normalizeCategoryId } from "../../lib/categoryUtils";
import { createTranslator } from "../../lib/formatUtils";

interface AdminDashboardReportProps {
  orders: any[];
  products: any[];
  users: any[];
  lang: "bn" | "en";
}

// Helpers for robust cross-database field normalization (Supabase & Firestore)
const getNormalizedStatus = (o: any): string => {
  return String(o?.orderStatus || o?.order_status || o?.status || "").toLowerCase().trim();
};

const getOrderAmount = (o: any): number => {
  return Number(
    o?.grandTotal ??
    o?.grand_total ??
    o?.totalAmount ??
    o?.total_amount ??
    o?.total ??
    o?.subtotal ??
    0
  ) || 0;
};

export default function AdminDashboardReport({ orders, products, users, lang }: AdminDashboardReportProps) {
  const getTranslation = createTranslator(lang);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [showLiveViewModal, setShowLiveViewModal] = useState<boolean>(false);

  // Real-time Visitor Analytics State
  const [visitorData, setVisitorData] = useState<VisitorAnalyticsData>({
    todayViews: 0,
    liveNow: 0,
    todayUniqueVisitors: 0,
    date: "",
    loading: true,
    error: null,
  });

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      const refreshed = await forceRefreshVisitorStats();
      if (refreshed) {
        setVisitorData(refreshed);
      }
    } catch (e) {
      // ignore
    } finally {
      setTimeout(() => setIsRefreshing(false), 400);
    }
  };

  useEffect(() => {
    const unsubscribe = subscribeToVisitorAnalytics((data) => {
      setVisitorData(data);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Performance-optimized metrics calculation using useMemo
  const metrics = useMemo(() => {
    const totalOrders = orders.length;
    
    // Delivered sales (handles case-insensitive 'delivered', 'completed')
    const deliveredOrders = orders.filter(o => {
      const s = getNormalizedStatus(o);
      return s === "delivered" || s === "completed";
    });

    const totalSales = deliveredOrders.reduce((sum, o) => sum + getOrderAmount(o), 0);
    const totalCommission = Math.round(totalSales * 0.1); // 10% system fee
    
    // Order status counts with robust cross-platform variations
    const pendingOrdersCount = orders.filter(o => {
      const s = getNormalizedStatus(o);
      return !s || s === "pending";
    }).length;

    const confirmedOrdersCount = orders.filter(o => {
      const s = getNormalizedStatus(o);
      return s === "confirmed" || s === "approved" || s === "accepted";
    }).length;

    const pickedUpOrdersCount = orders.filter(o => {
      const s = getNormalizedStatus(o);
      return s === "picked up" || s === "picked_up" || s === "processing" || s === "shipped" || s === "on_the_way" || s === "in_transit";
    }).length;

    const deliveredOrdersCount = deliveredOrders.length;

    const cancelledOrdersCount = orders.filter(o => {
      const s = getNormalizedStatus(o);
      return s === "cancelled" || s === "canceled" || s === "refunded" || s === "rejected";
    }).length;

    // Category distribution (handles Supabase items, cart items, manual memo items)
    const categorySalesMap: { [key: string]: number } = {};
    deliveredOrders.forEach(o => {
      let items = o.items;
      if (typeof items === "string") {
        try {
          items = JSON.parse(items);
        } catch {
          items = [];
        }
      }
      if (Array.isArray(items)) {
        items.forEach((item: any) => {
          const rawCat = item.product?.category || item.category || item.categoryId || "groceries";
          const cat = normalizeCategoryId(rawCat);
          const price = item.selectedOption 
            ? item.selectedOption.price 
            : (item.product?.price || item.price || item.unitPrice || 0);
          const qty = Math.max(1, Number(item.quantity) || 1);
          const cost = (Number(price) || 0) * qty;
          categorySalesMap[cat] = (categorySalesMap[cat] || 0) + cost;
        });
      }
    });

    const categorySales = Object.entries(categorySalesMap)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);

    const maxCategorySales = categorySales.length > 0 && categorySales[0].amount > 0 ? categorySales[0].amount : 1;

    // Role groups with case-insensitive normalization & partner support
    const customers = users.filter(u => {
      const r = String(u?.role || "").toLowerCase().trim();
      return !r || r === "customer";
    });

    const sellers = users.filter(u => {
      const r = String(u?.role || "").toLowerCase().trim();
      return r === "seller" || r === "vendor" || r === "partner" || r === "shop_owner";
    });

    const riders = users.filter(u => {
      const r = String(u?.role || "").toLowerCase().trim();
      return r === "rider" || r === "delivery";
    });

    const staff = users.filter(u => {
      const r = String(u?.role || "").toLowerCase().trim();
      return r && r !== "customer" && r !== "seller" && r !== "vendor" && r !== "partner" && r !== "shop_owner" && r !== "rider" && r !== "delivery";
    });

    return {
      totalOrders,
      totalSales,
      totalCommission,
      pendingOrdersCount,
      confirmedOrdersCount,
      pickedUpOrdersCount,
      deliveredOrdersCount,
      cancelledOrdersCount,
      categorySales,
      maxCategorySales,
      customersCount: customers.length,
      sellersCount: sellers.length,
      ridersCount: riders.length,
      staffCount: staff.length,
    };
  }, [orders, users]);

  return (
    <div className="space-y-6 text-slate-700">
      
      {/* Real-time Monitor Header */}
      <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 p-4 rounded-2xl">
        <div>
          <h2 className="text-sm font-black text-emerald-800 uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600 animate-pulse" />
            <span>{getTranslation("রিয়েল-টাইম সিস্টেম মনিটর", "Real-Time System Monitor")}</span>
          </h2>
          <p className="text-xs text-emerald-600 mt-1">
            {getTranslation("লাইভ ক্লাউড ডাটাবেস সিঙ্ক সক্রিয় রয়েছে।", "Live cloud database synchronization is active.")}
          </p>
        </div>
        <span className="px-3 py-1 bg-emerald-600 text-white text-[10px] font-black rounded-full uppercase tracking-widest animate-pulse">
          {getTranslation("সক্রিয়", "Active")}
        </span>
      </div>

      {/* Real-time App Visitor Analytics Section */}
      <div id="app-visitor-analytics-section" className="space-y-2">
        <div className="flex flex-wrap items-center justify-between px-1 gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-500 uppercase tracking-wider">
              {getTranslation("অ্যাপ ভিজিটর লাইভ অ্যানালিটিক্স", "App Visitor Live Analytics")}
            </span>
            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              {getTranslation("রিয়েল-টাইম", "Real-Time")}
            </span>
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1 text-[10px] font-bold text-slate-600 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 px-2 py-0.5 rounded-full transition border border-slate-200"
              title={getTranslation("এখনই রিফ্রেশ করুন", "Refresh stats now")}
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? "animate-spin text-emerald-600" : ""}`} />
              <span>{isRefreshing ? getTranslation("আপডেট হচ্ছে...", "Syncing...") : getTranslation("রিফ্রেশ", "Refresh")}</span>
            </button>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">
            {getTranslation("বাংলাদেশ সময় (Asia/Dhaka) • রাত ১২:০০ টায় রিসেট", "Bangladesh Time (Asia/Dhaka) • Resets at 12:00 AM")}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Today's Views */}
          <div 
            id="visitor-card-today-views" 
            className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-blue-200 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                <span className="text-base">👁️</span>
                <span>{getTranslation("আজকের ভিউ", "Today's Views")}</span>
              </span>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                {getTranslation("আজকের মোট", "Today")}
              </span>
            </div>
            <div className="mt-4">
              {visitorData.loading ? (
                <div className="h-9 w-24 bg-slate-100 animate-pulse rounded-lg" />
              ) : (
                <h3 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
                  {visitorData.todayViews.toLocaleString()}
                </h3>
              )}
              <span className="text-[11px] text-slate-400 block mt-1">
                {getTranslation("আজ অ্যাপ ওপেন ও ব্যবহারের মোট সংখ্যা", "Total app opens & visits today")}
              </span>
            </div>
          </div>

          {/* Card 2: Live Now */}
          <div 
            id="visitor-card-live-now" 
            onClick={() => setShowLiveViewModal(true)}
            className="bg-white p-5 rounded-2xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/20 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer"
            title={getTranslation("লাইভ ভিউ বিস্তারিত দেখতে ক্লিক করুন", "Click to view Live View details")}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                <span className="relative flex h-3 w-3 items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-base">🟢</span>
                <span>{getTranslation("এখন Live", "Live Now")}</span>
              </span>
              <span className="flex items-center gap-1 text-[10px] font-extrabold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-200 uppercase tracking-wider animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                {getTranslation("লাইভ", "LIVE")}
              </span>
            </div>
            <div className="mt-4">
              {visitorData.loading ? (
                <div className="h-9 w-20 bg-slate-100 animate-pulse rounded-lg" />
              ) : (
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl sm:text-3xl font-black text-emerald-700 tracking-tight">
                    {visitorData.liveNow.toLocaleString()}
                  </h3>
                  <span className="text-xs font-bold text-emerald-600">
                    {getTranslation("জন সক্রিয়", "active now")}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-emerald-100/60 text-[11px]">
                <span className="text-slate-400">
                  {getTranslation("বিগত ৩ মিনিটে সক্রিয়", "Active last 3 mins")}
                </span>
                <span className="font-bold text-emerald-700 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                  <span>{getTranslation("বিস্তারিত", "Details")}</span>
                  <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Today's Unique Visitors */}
          <div 
            id="visitor-card-unique-visitors" 
            className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-indigo-200 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                <span className="text-base">👤</span>
                <span>{getTranslation("Unique Visitors", "Unique Visitors")}</span>
              </span>
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                {getTranslation("অনন্য ভিজিটর", "Unique")}
              </span>
            </div>
            <div className="mt-4">
              {visitorData.loading ? (
                <div className="h-9 w-24 bg-slate-100 animate-pulse rounded-lg" />
              ) : (
                <h3 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
                  {visitorData.todayUniqueVisitors.toLocaleString()}
                </h3>
              )}
              <span className="text-[11px] text-slate-400 block mt-1">
                {getTranslation("প্রতিটি অনন্য ভিজিটর দিনে ১ বার গণ্য", "Counted once per day per visitor")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Analytics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sales Card */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-bold uppercase">{getTranslation("মোট বিক্রি", "Total Sales")}</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-lg sm:text-2xl font-black text-slate-800">৳{metrics.totalSales.toLocaleString()}</h3>
            <span className="text-[10px] text-slate-400 block mt-1">{getTranslation("ডেলিভারি সম্পন্ন হওয়া অর্ডার", "Completed deliveries")}</span>
          </div>
        </div>

        {/* Total Orders Card */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-bold uppercase">{getTranslation("মোট অর্ডার", "Total Orders")}</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-lg sm:text-2xl font-black text-slate-800">{metrics.totalOrders}</h3>
            <span className="text-[10px] text-slate-400 block mt-1">{getTranslation("সিস্টেমের মোট অর্ডার", "Total system requests")}</span>
          </div>
        </div>

        {/* System Fee (Commission) Card */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-bold uppercase">{getTranslation("মোট কমিশন (১০%)", "Commission (10%)")}</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-lg sm:text-2xl font-black text-slate-800">৳{metrics.totalCommission.toLocaleString()}</h3>
            <span className="text-[10px] text-slate-400 block mt-1">{getTranslation("মেগা বাজার নিট আয়", "Kacha Bazar net earnings")}</span>
          </div>
        </div>

        {/* Total Products Card */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-bold uppercase">{getTranslation("মোট পণ্য", "Total Products")}</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-lg sm:text-2xl font-black text-slate-800">{products.length}</h3>
            <span className="text-[10px] text-slate-400 block mt-1">{getTranslation("সক্রিয় ক্যাটালগ পণ্য", "Active catalog items")}</span>
          </div>
        </div>
      </div>

      {/* Secondary Roster Statistics Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4 flex items-center justify-between">
          <span>{getTranslation("সিস্টেম ব্যবহারকারী ও অংশীদার প্রতিবেদন", "System User & Partner Report")}</span>
          {metrics.staffCount > 0 && (
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>{getTranslation(`${metrics.staffCount} জন স্টাফ/এডমিন`, `${metrics.staffCount} Staff/Admin`)}</span>
            </span>
          )}
        </h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <User className="w-5 h-5 text-indigo-500 mx-auto mb-1" />
            <div className="text-xl font-extrabold text-slate-800">{metrics.customersCount}</div>
            <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">{getTranslation("গ্রাহক", "Customers")}</div>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <Store className="w-5 h-5 text-amber-500 mx-auto mb-1" />
            <div className="text-xl font-extrabold text-slate-800">{metrics.sellersCount}</div>
            <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">{getTranslation("বিক্রেতা ও পার্টনার", "Sellers & Partners")}</div>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <Bike className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
            <div className="text-xl font-extrabold text-slate-800">{metrics.ridersCount}</div>
            <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">{getTranslation("রাইডার", "Riders")}</div>
          </div>
        </div>
      </div>

      {/* Reports and Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Order Reports & Status Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4">
              {getTranslation("অর্ডার স্থিতি ও পাইপলাইন", "Order Status & Pipeline")}
            </h3>
            <div className="space-y-3.5">
              {/* Pending */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span>{getTranslation("অপেক্ষমান অর্ডার (Pending)", "Pending Orders")}</span>
                  <span>{metrics.pendingOrdersCount} ({metrics.totalOrders > 0 ? Math.round((metrics.pendingOrdersCount / metrics.totalOrders) * 100) : 0}%)</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full animate-pulse" style={{ width: `${metrics.totalOrders > 0 ? (metrics.pendingOrdersCount / metrics.totalOrders) * 100 : 0}%` }}></div>
                </div>
              </div>

              {/* Confirmed */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span>{getTranslation("নিশ্চিতকৃত অর্ডার (Confirmed)", "Confirmed Orders")}</span>
                  <span>{metrics.confirmedOrdersCount} ({metrics.totalOrders > 0 ? Math.round((metrics.confirmedOrdersCount / metrics.totalOrders) * 100) : 0}%)</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full rounded-full" style={{ width: `${metrics.totalOrders > 0 ? (metrics.confirmedOrdersCount / metrics.totalOrders) * 100 : 0}%` }}></div>
                </div>
              </div>

              {/* Picked up */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span>{getTranslation("ডেলিভারির জন্য চলন্ত (Picked Up / Processing)", "Picked Up / Processing Orders")}</span>
                  <span>{metrics.pickedUpOrdersCount} ({metrics.totalOrders > 0 ? Math.round((metrics.pickedUpOrdersCount / metrics.totalOrders) * 100) : 0}%)</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${metrics.totalOrders > 0 ? (metrics.pickedUpOrdersCount / metrics.totalOrders) * 100 : 0}%` }}></div>
                </div>
              </div>

              {/* Delivered */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span>{getTranslation("ডেলিভারি সম্পন্ন (Delivered)", "Delivered Orders")}</span>
                  <span>{metrics.deliveredOrdersCount} ({metrics.totalOrders > 0 ? Math.round((metrics.deliveredOrdersCount / metrics.totalOrders) * 100) : 0}%)</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${metrics.totalOrders > 0 ? (metrics.deliveredOrdersCount / metrics.totalOrders) * 100 : 0}%` }}></div>
                </div>
              </div>

              {/* Cancelled/Refunded */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span>{getTranslation("বাতিল/ফেরতকৃত (Cancelled/Refunded)", "Cancelled / Refunded")}</span>
                  <span>{metrics.cancelledOrdersCount} ({metrics.totalOrders > 0 ? Math.round((metrics.cancelledOrdersCount / metrics.totalOrders) * 100) : 0}%)</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-red-500 h-full rounded-full" style={{ width: `${metrics.totalOrders > 0 ? (metrics.cancelledOrdersCount / metrics.totalOrders) * 100 : 0}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sales by Category Report */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4">
            {getTranslation("ক্যাটাগরি অনুযায়ী বিক্রয় বিশ্লেষণ (৳)", "Sales Distribution by Category (৳)")}
          </h3>
          {metrics.categorySales.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-350">
              <FileText className="w-10 h-10 mb-2 stroke-1" />
              <p className="text-xs font-bold">{getTranslation("কোন তথ্য পাওয়া যায়নি", "No sales distribution data available yet.")}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {metrics.categorySales.slice(0, 5).map((item) => (
                <div key={item.category}>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="capitalize">{item.category}</span>
                    <span>৳{item.amount.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full rounded-full" 
                      style={{ width: `${Math.min(100, Math.max(0, (item.amount / metrics.maxCategorySales) * 100))}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ================= LIVE VIEW DETAILS MODAL ================= */}
      {showLiveViewModal && (
        <div 
          id="admin-live-view-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowLiveViewModal(false)}
        >
          <div 
            className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 p-6 space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-3.5 w-3.5 items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <div>
                  <h3 className="text-base font-black text-slate-800 flex items-center gap-1.5">
                    <span>{getTranslation("লাইভ ভিউ সিস্টেম মনিটর", "Live View System Monitor")}</span>
                    <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {getTranslation("লাইভ", "LIVE")}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {getTranslation("অ্যাপের চলমান ভিজিটর ও রিয়েল-টাইম ট্রাফিক বিশ্লেষণ", "Real-time active visitors & traffic monitoring")}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowLiveViewModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Live Count Hero Banner */}
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-2xl p-6 shadow-md relative overflow-hidden text-center">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-emerald-100 mb-2">
                <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-200" />
                <span>{getTranslation("এখন সক্রিয় ভিজিটর (Active Right Now)", "Active Visitors Online Right Now")}</span>
              </span>
              <div className="text-5xl sm:text-6xl font-black tracking-tight my-2">
                {visitorData.liveNow.toLocaleString()}
              </div>
              <p className="text-xs text-emerald-100 font-medium">
                {getTranslation(
                  "বিগত ৩ মিনিটে অ্যাপে সক্রিয় আছেন এমন প্রকৃত গ্রাহক ও ব্যবহারকারী",
                  "Real visitors active on the app within the last 3-minute threshold"
                )}
              </p>
            </div>

            {/* Device Breakdown */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                <span className="flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  <span>{getTranslation("ডিভাইস অনুযায়ী সক্রিয় ভিজিটর", "Active Visitors by Device")}</span>
                </span>
                <span className="text-[11px] text-slate-400">
                  {getTranslation("রিয়েল-টাইম ব্রাউজার ডিটেকশন", "Live browser detection")}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-white p-3.5 rounded-xl border border-slate-150 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 font-bold block">{getTranslation("স্মার্টফোন / মোবাইল", "Mobile Devices")}</span>
                      <span className="text-lg font-black text-slate-800">
                        {visitorData.devices?.mobile ?? (visitorData.liveNow > 0 ? visitorData.liveNow : 0)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-150 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                      <Monitor className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 font-bold block">{getTranslation("কম্পিউটার / ডেস্কটপ", "Desktop / Laptop")}</span>
                      <span className="text-lg font-black text-slate-800">
                        {visitorData.devices?.desktop ?? 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Today's Cumulative Summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-4">
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-800 mb-1">
                  <Eye className="w-4 h-4 text-blue-600" />
                  <span>{getTranslation("আজকের মোট ভিউ", "Today's Total Views")}</span>
                </div>
                <div className="text-2xl font-black text-blue-900 mt-2">
                  {visitorData.todayViews.toLocaleString()}
                </div>
                <span className="text-[10px] text-blue-600 block mt-1">
                  {getTranslation("অ্যাপ ওপেন ও পেজ রিফ্রেশ সংখ্যা", "Total app opens and views today")}
                </span>
              </div>

              <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-4">
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-800 mb-1">
                  <User className="w-4 h-4 text-indigo-600" />
                  <span>{getTranslation("অনন্য ভিজিটর", "Unique Visitors")}</span>
                </div>
                <div className="text-2xl font-black text-indigo-900 mt-2">
                  {visitorData.todayUniqueVisitors.toLocaleString()}
                </div>
                <span className="text-[10px] text-indigo-600 block mt-1">
                  {getTranslation("প্রতি ডিভাইসে দিনে ১ বার হিসাব", "Deduplicated daily unique visitors")}
                </span>
              </div>
            </div>

            {/* Live System Specs & Operational Rules */}
            <div className="bg-slate-50 rounded-2xl p-4 text-xs text-slate-500 space-y-2 border border-slate-100">
              <div className="font-bold text-slate-700 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>{getTranslation("লাইভ ট্র্যাকিং সিস্টেম তথ্য", "Live Tracking Specifications")}</span>
              </div>
              <ul className="space-y-1 text-[11px] list-disc list-inside text-slate-500">
                <li>{getTranslation("অটো-সিঙ্ক: প্রতি ৬ সেকেন্ড পর পর ব্যাকগ্রাউন্ডে স্বয়ংক্রিয়ভাবে আপডেট হয়।", "Auto-sync: Refreshes continuously every 6 seconds in background.")}</li>
                <li>{getTranslation("সক্রিয় থাকার সময়সীমা: ৩ মিনিট কোনো ইন্টারঅ্যাকশন না থাকলে সেশন স্বয়ংক্রিয় নিষ্ক্রিয় হয়।", "Active window: Sessions go inactive after 3 minutes without user activity.")}</li>
                <li>{getTranslation("টাইমজোন: বাংলাদেশ সময় (Asia/Dhaka) অনুযায়ী প্রতিদিন রাত ১২:০০ টায় দৈনিক হিসাব রিসেট হয়।", "Timezone: Standard Asia/Dhaka time. Resets daily at 12:00 AM midnight.")}</li>
              </ul>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs rounded-xl transition border border-emerald-200"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-emerald-600" : ""}`} />
                <span>{isRefreshing ? getTranslation("আপডেট হচ্ছে...", "Syncing...") : getTranslation("এখনই রিফ্রেশ করুন", "Refresh Live Stats")}</span>
              </button>

              <button
                onClick={() => setShowLiveViewModal(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition shadow"
              >
                {getTranslation("বন্ধ করুন", "Close")}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
