import React, { useState, useEffect } from "react";
import { 
  TrendingUp, ShoppingBag, User, Store, Bike, DollarSign, 
  CheckCircle, Clock, X, ChevronRight, Award, FileText,
  Activity, Users, RefreshCw, AlertCircle
} from "lucide-react";
import { subscribeToVisitorAnalytics, VisitorAnalyticsData } from "../../lib/visitorTracker";
import { normalizeCategoryId } from "../../lib/categoryUtils";

interface AdminDashboardReportProps {
  orders: any[];
  products: any[];
  users: any[];
  lang: "bn" | "en";
}

export default function AdminDashboardReport({ orders, products, users, lang }: AdminDashboardReportProps) {
  const getTranslation = (bn: string, en: string) => (lang === "bn" ? bn : en);

  // Real-time Visitor Analytics State
  const [visitorData, setVisitorData] = useState<VisitorAnalyticsData>({
    todayViews: 0,
    liveNow: 0,
    todayUniqueVisitors: 0,
    date: "",
    loading: true,
    error: null,
  });

  useEffect(() => {
    const unsubscribe = subscribeToVisitorAnalytics((data) => {
      setVisitorData(data);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Core stats calculation
  const totalOrders = orders.length;
  
  // Delivered sales
  const deliveredOrders = orders.filter(o => o.orderStatus === "delivered");
  const totalSales = deliveredOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
  const totalCommission = totalSales * 0.1; // 10% system fee
  
  // Role groups
  const customers = users.filter(u => u.role === "customer" || !u.role);
  const sellers = users.filter(u => u.role === "seller");
  const riders = users.filter(u => u.role === "rider");

  // Order status counts
  const pendingOrdersCount = orders.filter(o => o.orderStatus === "pending").length;
  const confirmedOrdersCount = orders.filter(o => o.orderStatus === "confirmed").length;
  const pickedUpOrdersCount = orders.filter(o => o.orderStatus === "picked up").length;
  const deliveredOrdersCount = deliveredOrders.length;
  const cancelledOrdersCount = orders.filter(o => o.orderStatus === "cancelled" || o.orderStatus === "refunded").length;

  // Category distribution
  const categorySalesMap: { [key: string]: number } = {};
  deliveredOrders.forEach(o => {
    if (Array.isArray(o.items)) {
      o.items.forEach((item: any) => {
        const rawCat = item.product?.category || "Other";
        const cat = normalizeCategoryId(rawCat);
        const price = item.selectedOption ? item.selectedOption.price : (item.product?.price || 0);
        const cost = (Number(price) || 0) * (Number(item.quantity) || 1);
        categorySalesMap[cat] = (categorySalesMap[cat] || 0) + cost;
      });
    }
  });

  const categorySales = Object.entries(categorySalesMap)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  const maxCategorySales = categorySales.length > 0 ? categorySales[0].amount : 1;

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
            className="bg-white p-5 rounded-2xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/20 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-emerald-300 transition-all"
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
              <span className="text-[11px] text-slate-400 block mt-1">
                {getTranslation("বিগত ২-৫ মিনিটে সক্রিয় ভিজিটর", "Active visitors in last 2–5 minutes")}
              </span>
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
            <h3 className="text-lg sm:text-2xl font-black text-slate-800">৳{totalSales.toLocaleString()}</h3>
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
            <h3 className="text-lg sm:text-2xl font-black text-slate-800">{totalOrders}</h3>
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
            <h3 className="text-lg sm:text-2xl font-black text-slate-800">৳{totalCommission.toLocaleString()}</h3>
            <span className="text-[10px] text-slate-400 block mt-1">{getTranslation("কাচা বাজার নিট আয়", "Kacha Bazar net earnings")}</span>
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
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4">
          {getTranslation("সিস্টেম ব্যবহারকারী ও অংশীদার প্রতিবেদন", "System User & Partner Report")}
        </h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <User className="w-5 h-5 text-indigo-500 mx-auto mb-1" />
            <div className="text-xl font-extrabold text-slate-800">{customers.length}</div>
            <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">{getTranslation("গ্রাহক", "Customers")}</div>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <Store className="w-5 h-5 text-amber-500 mx-auto mb-1" />
            <div className="text-xl font-extrabold text-slate-800">{sellers.length}</div>
            <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">{getTranslation("বিক্রেতা", "Sellers")}</div>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <Bike className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
            <div className="text-xl font-extrabold text-slate-800">{riders.length}</div>
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
                  <span>{pendingOrdersCount} ({totalOrders > 0 ? Math.round((pendingOrdersCount / totalOrders) * 100) : 0}%)</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full animate-pulse" style={{ width: `${totalOrders > 0 ? (pendingOrdersCount / totalOrders) * 100 : 0}%` }}></div>
                </div>
              </div>

              {/* Confirmed */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span>{getTranslation("নিশ্চিতকৃত অর্ডার (Confirmed)", "Confirmed Orders")}</span>
                  <span>{confirmedOrdersCount} ({totalOrders > 0 ? Math.round((confirmedOrdersCount / totalOrders) * 100) : 0}%)</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full rounded-full" style={{ width: `${totalOrders > 0 ? (confirmedOrdersCount / totalOrders) * 100 : 0}%` }}></div>
                </div>
              </div>

              {/* Picked up */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span>{getTranslation("ডেলিভারির জন্য চলন্ত (Picked Up)", "Picked Up Orders")}</span>
                  <span>{pickedUpOrdersCount} ({totalOrders > 0 ? Math.round((pickedUpOrdersCount / totalOrders) * 100) : 0}%)</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${totalOrders > 0 ? (pickedUpOrdersCount / totalOrders) * 100 : 0}%` }}></div>
                </div>
              </div>

              {/* Delivered */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span>{getTranslation("ডেলিভারি সম্পন্ন (Delivered)", "Delivered Orders")}</span>
                  <span>{deliveredOrdersCount} ({totalOrders > 0 ? Math.round((deliveredOrdersCount / totalOrders) * 100) : 0}%)</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${totalOrders > 0 ? (deliveredOrdersCount / totalOrders) * 100 : 0}%` }}></div>
                </div>
              </div>

              {/* Cancelled/Refunded */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span>{getTranslation("বাতিল/ফেরতকৃত (Cancelled/Refunded)", "Cancelled / Refunded")}</span>
                  <span>{cancelledOrdersCount} ({totalOrders > 0 ? Math.round((cancelledOrdersCount / totalOrders) * 100) : 0}%)</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-red-500 h-full rounded-full" style={{ width: `${totalOrders > 0 ? (cancelledOrdersCount / totalOrders) * 100 : 0}%` }}></div>
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
          {categorySales.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-350">
              <FileText className="w-10 h-10 mb-2 stroke-1" />
              <p className="text-xs font-bold">{getTranslation("কোন তথ্য পাওয়া যায়নি", "No sales distribution data available yet.")}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {categorySales.slice(0, 5).map((item, index) => (
                <div key={item.category}>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="capitalize">{item.category}</span>
                    <span>৳{item.amount.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full rounded-full" 
                      style={{ width: `${(item.amount / maxCategorySales) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
