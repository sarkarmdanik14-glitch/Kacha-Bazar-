import React, { useState, useMemo } from "react";
import { 
  ShoppingBag, Search, Filter, RefreshCw, Bike, Clock, 
  CheckCircle2, XCircle, AlertCircle, Printer, User, Phone, 
  MapPin, DollarSign, CreditCard, ChevronDown, ChevronUp,
  Package, Check, X, ShieldAlert, Sparkles, Copy, ArrowUpDown
} from "lucide-react";

interface AdminOrdersTabProps {
  orders: any[];
  users: any[];
  lang: "bn" | "en";
  triggerToast: (bn: string, en: string) => void;
  onSelectMemoOrder: (order: any) => void;
  handleUpdateOrderStatus: (orderId: string, status: string) => Promise<void>;
  handleUpdatePaymentStatus: (orderId: string, status: string) => Promise<void>;
  handleAssignRider: (orderId: string, riderId: string) => Promise<void>;
}

export default function AdminOrdersTab({
  orders,
  users,
  lang,
  triggerToast,
  onSelectMemoOrder,
  handleUpdateOrderStatus,
  handleUpdatePaymentStatus,
  handleAssignRider
}: AdminOrdersTabProps) {
  const getTranslation = (bn: string, en: string) => (lang === "bn" ? bn : en);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // Active riders list
  const activeRidersList = useMemo(() => {
    return users.filter(u => u.role === "rider");
  }, [users]);

  // Copy order ID
  const handleCopyOrderId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    triggerToast("অর্ডার আইডি কপি করা হয়েছে!", "Order ID copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Status counts for quick filter tabs
  const counts = useMemo(() => {
    return {
      all: orders.length,
      pending: orders.filter(o => o.orderStatus === "pending" || !o.orderStatus).length,
      confirmed: orders.filter(o => o.orderStatus === "confirmed").length,
      picked_up: orders.filter(o => o.orderStatus === "picked up" || o.orderStatus === "processing").length,
      delivered: orders.filter(o => o.orderStatus === "delivered").length,
      cancelled: orders.filter(o => o.orderStatus === "cancelled").length
    };
  }, [orders]);

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      // 1. Status Filter
      if (statusFilter !== "all") {
        if (statusFilter === "pending" && o.orderStatus && o.orderStatus !== "pending") return false;
        if (statusFilter === "picked_up" && o.orderStatus !== "picked up" && o.orderStatus !== "processing") return false;
        if (statusFilter === "confirmed" && o.orderStatus !== "confirmed") return false;
        if (statusFilter === "delivered" && o.orderStatus !== "delivered") return false;
        if (statusFilter === "cancelled" && o.orderStatus !== "cancelled") return false;
      }

      // 2. Payment Status Filter
      if (paymentFilter !== "all") {
        const pStatus = o.paymentStatus || "pending";
        if (pStatus !== paymentFilter) return false;
      }

      // 3. Search Term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const idMatch = (o.id || "").toLowerCase().includes(term);
        const nameMatch = (o.name || o.customerName || "").toLowerCase().includes(term);
        const phoneMatch = (o.phone || o.customerPhone || "").toLowerCase().includes(term);
        const addressMatch = (o.address || o.deliveryAddress || "").toLowerCase().includes(term);
        const riderMatch = (o.riderName || "").toLowerCase().includes(term);
        return idMatch || nameMatch || phoneMatch || addressMatch || riderMatch;
      }

      return true;
    });
  }, [orders, statusFilter, paymentFilter, searchTerm]);

  // Format Date Helper
  const formatOrderDate = (createdAt: any) => {
    if (!createdAt) return getTranslation("লাইভ", "Live");
    try {
      const date = createdAt.seconds ? new Date(createdAt.seconds * 1000) : new Date(createdAt);
      if (isNaN(date.getTime())) return getTranslation("লাইভ", "Live");
      
      const formattedDate = date.toLocaleDateString(lang === "bn" ? "bn-BD" : "en-US", {
        day: "numeric",
        month: "short",
        year: "numeric"
      });
      const formattedTime = date.toLocaleTimeString(lang === "bn" ? "bn-BD" : "en-US", {
        hour: "2-digit",
        minute: "2-digit"
      });
      return { date: formattedDate, time: formattedTime };
    } catch {
      return { date: "Live", time: "" };
    }
  };

  const onStatusChange = async (orderId: string, status: string) => {
    setUpdatingOrderId(orderId);
    try {
      await handleUpdateOrderStatus(orderId, status);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  return (
    <div className="w-full space-y-4 sm:space-y-6">
      
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 rounded-2xl p-4 sm:p-6 text-white shadow-sm border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white leading-tight">
                {getTranslation("অর্ডার ট্র্যাকিং ও অ্যাকশন হাব", "Central Order Desk & Action Hub")}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {getTranslation(
                  "সকল লাইভ কাস্টমার অর্ডার পর্যবেক্ষণ, রাইডার নিয়োগ এবং স্ট্যাটাস পরিবর্তন করুন।",
                  "Monitor live orders, assign delivery riders, and manage order lifecycles in real time."
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Live Counters */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="bg-slate-800/80 border border-slate-700/80 px-3 py-1.5 rounded-xl text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">{getTranslation("মোট অর্ডার", "Total Orders")}</span>
            <span className="text-sm sm:text-base font-black text-emerald-400 font-mono">{orders.length}</span>
          </div>
          <div className="bg-amber-950/40 border border-amber-900/40 px-3 py-1.5 rounded-xl text-center">
            <span className="text-[10px] uppercase font-bold text-amber-400 block">{getTranslation("পেন্ডিং", "Pending")}</span>
            <span className="text-sm sm:text-base font-black text-amber-400 font-mono">{counts.pending}</span>
          </div>
          <div className="bg-blue-950/40 border border-blue-900/40 px-3 py-1.5 rounded-xl text-center">
            <span className="text-[10px] uppercase font-bold text-blue-400 block">{getTranslation("নিশ্চিত", "Confirmed")}</span>
            <span className="text-sm sm:text-base font-black text-blue-400 font-mono">{counts.confirmed}</span>
          </div>
        </div>
      </div>

      {/* Main Order Desk Container */}
      <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl shadow-xs overflow-hidden">
        
        {/* Search, Filter & Quick Tabs Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 space-y-3.5">
          
          {/* Top Row: Search input + Payment filter */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            
            {/* Search Box */}
            <div className="relative flex-1 max-w-xl">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={getTranslation(
                  "অর্ডার আইডি, গ্রাহকের নাম, ফোন বা ঠিকানা দিয়ে খুঁজুন...",
                  "Search by Order ID, customer name, phone, or address..."
                )}
                className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-9 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 font-medium transition shadow-2xs"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Payment Filter & Stats Info */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[11px] font-bold text-slate-500">{getTranslation("পেমেন্ট:", "Payment:")}</span>
                <select
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
                >
                  <option value="all">{getTranslation("সকল পেমেন্ট", "All Payments")}</option>
                  <option value="paid">{getTranslation("পরিশোধিত (Paid)", "Paid")}</option>
                  <option value="pending">{getTranslation("পেন্ডিং (Pending)", "Pending")}</option>
                  <option value="refunded">{getTranslation("রিফান্ড (Refunded)", "Refunded")}</option>
                  <option value="failed">{getTranslation("ব্যর্থ (Failed)", "Failed")}</option>
                </select>
              </div>

              {(searchTerm || statusFilter !== "all" || paymentFilter !== "all") && (
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                    setPaymentFilter("all");
                  }}
                  className="px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition border border-rose-200 cursor-pointer"
                >
                  {getTranslation("রিসেট", "Reset")}
                </button>
              )}
            </div>
          </div>

          {/* Bottom Row: Status Quick Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: "all", labelBn: "সব অর্ডার", labelEn: "All Orders", count: counts.all, color: "slate" },
              { id: "pending", labelBn: "পেন্ডিং", labelEn: "Pending", count: counts.pending, color: "amber" },
              { id: "confirmed", labelBn: "নিশ্চিত", labelEn: "Confirmed", count: counts.confirmed, color: "blue" },
              { id: "picked_up", labelBn: "ডেলিভারি চলছে", labelEn: "On Delivery", count: counts.picked_up, color: "indigo" },
              { id: "delivered", labelBn: "ডেলিভার্ড", labelEn: "Delivered", count: counts.delivered, color: "emerald" },
              { id: "cancelled", labelBn: "বাতিল", labelEn: "Cancelled", count: counts.cancelled, color: "rose" }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  statusFilter === tab.id
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
                }`}
              >
                <span>{getTranslation(tab.labelBn, tab.labelEn)}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  statusFilter === tab.id 
                    ? "bg-slate-800 text-emerald-400" 
                    : "bg-slate-100 text-slate-600"
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Responsive Table Enclosure with Dedicated Horizontal Scroll & Sticky Header */}
        <div className="relative w-full overflow-x-auto min-w-0">
          <table className="w-full text-left text-xs border-collapse min-w-[840px]">
            
            {/* Sticky Table Header */}
            <thead>
              <tr className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur-xs border-b border-slate-200 text-slate-600 uppercase text-[10px] font-black tracking-wider">
                <th className="py-2.5 px-2.5 w-[85px]">{getTranslation("অর্ডার আইডি", "Order ID")}</th>
                <th className="py-2.5 px-2 w-[95px]">{getTranslation("তারিখ / সময়", "Date & Time")}</th>
                <th className="py-2.5 px-2.5 min-w-[140px] max-w-[180px]">{getTranslation("গ্রাহক তথ্য", "Customer Info")}</th>
                <th className="py-2.5 px-2.5 w-[110px]">{getTranslation("মোট বিল ও পেমেন্ট", "Bill & Payment")}</th>
                <th className="py-2.5 px-2 w-[95px] text-center">{getTranslation("অর্ডার স্থিতি", "Status")}</th>
                <th className="py-2.5 px-2 w-[115px]">{getTranslation("রাইডার নিযুক্ত", "Rider")}</th>
                <th className="py-2.5 px-2.5 w-[215px] text-center">{getTranslation("অ্যাকশন / চালান", "Actions")}</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 px-4">
                    <div className="max-w-sm mx-auto flex flex-col items-center justify-center space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
                        <ShoppingBag className="w-6 h-6" />
                      </div>
                      <h4 className="font-black text-slate-700 text-xs sm:text-sm">
                        {getTranslation("কোনো অর্ডার পাওয়া যায়নি", "No Orders Found")}
                      </h4>
                      <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                        {searchTerm || statusFilter !== "all" || paymentFilter !== "all"
                          ? getTranslation(
                              "বর্তমান ফিল্টার বা সার্চ শব্দের সাথে কোনো অর্ডার মিলছে না। ফিল্টার রিসেট করে দেখুন।",
                              "No orders match your active filter or search criteria. Try resetting filters."
                            )
                          : getTranslation(
                              "গ্রাহকের কোনো নতুন অর্ডার এখনও জমা পড়েনি।",
                              "No customer orders have been logged yet."
                            )}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o) => {
                  const dateInfo = formatOrderDate(o.createdAt);
                  const isExpanded = expandedOrderId === o.id;
                  const isPending = !o.orderStatus || o.orderStatus === "pending";
                  const isConfirmed = o.orderStatus === "confirmed";
                  const isPickedUp = o.orderStatus === "picked up" || o.orderStatus === "processing";
                  const isDelivered = o.orderStatus === "delivered";
                  const isCancelled = o.orderStatus === "cancelled";
                  const isRefunded = o.orderStatus === "refunded";

                  return (
                    <React.Fragment key={o.id}>
                      <tr className="hover:bg-slate-50/80 transition-colors align-middle text-slate-700 group">
                        
                        {/* 1. ORDER ID */}
                        <td className="py-2.5 px-2.5 align-middle">
                          <div className="flex items-center gap-1">
                            <span className="font-mono font-black text-slate-900 text-[11px] tracking-tight bg-slate-100 border border-slate-200/80 px-1.5 py-0.5 rounded-md">
                              #{o.id.slice(-6).toUpperCase()}
                            </span>
                            <button
                              onClick={(e) => handleCopyOrderId(o.id, e)}
                              className="text-slate-400 hover:text-slate-700 p-0.5 rounded hover:bg-slate-200/50 transition cursor-pointer"
                              title={getTranslation("সম্পূর্ণ আইডি কপি করুন", "Copy full ID")}
                            >
                              {copiedId === o.id ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                          {o.items && o.items.length > 0 && (
                            <button
                              onClick={() => setExpandedOrderId(isExpanded ? null : o.id)}
                              className="mt-1 text-[9px] font-bold text-slate-500 hover:text-emerald-700 flex items-center gap-0.5 cursor-pointer whitespace-nowrap"
                            >
                              <span>{o.items.length} {getTranslation("টি পণ্য", "items")}</span>
                              {isExpanded ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                            </button>
                          )}
                        </td>

                        {/* 2. DATE / TIME */}
                        <td className="py-2.5 px-2 align-middle">
                          {typeof dateInfo === "object" ? (
                            <div className="space-y-0.5">
                              <div className="font-bold text-slate-800 text-[11px] flex items-center gap-1 whitespace-nowrap">
                                <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{dateInfo.date}</span>
                              </div>
                              <div className="text-[10px] text-slate-500 font-medium pl-4 whitespace-nowrap">
                                {dateInfo.time}
                              </div>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                              Live
                            </span>
                          )}
                        </td>

                        {/* 3. CUSTOMER INFO */}
                        <td className="py-2.5 px-2.5 align-middle">
                          <div className="space-y-0.5">
                            <div className="font-extrabold text-slate-900 text-xs leading-tight flex items-center gap-1">
                              <User className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[135px] sm:max-w-[165px]" title={o.name || o.customerName}>
                                {o.name || o.customerName || getTranslation("গেস্ট কাস্টমার", "Guest Customer")}
                              </span>
                            </div>
                            
                            {o.phone && (
                              <div className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50/90 border border-emerald-200/70 px-1.5 py-0.2 rounded">
                                <Phone className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                                <span>{o.phone}</span>
                              </div>
                            )}

                            {o.address && (
                              <div className="text-[10px] text-slate-500 font-medium flex items-start gap-1 leading-tight line-clamp-1 max-w-[155px]" title={o.address}>
                                <MapPin className="w-2.5 h-2.5 text-slate-400 shrink-0 mt-0.5" />
                                <span className="truncate">{o.address}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* 4. TOTAL BILL & PAYMENT */}
                        <td className="py-2.5 px-2.5 align-middle">
                          <div className="space-y-1">
                            <div className="text-xs sm:text-[13px] font-black text-slate-950 font-mono tracking-tight">
                              ৳{(o.totalAmount || o.total || 0).toLocaleString()}
                            </div>
                            
                            <div className="flex items-center gap-1">
                              <span className="px-1 py-0.2 rounded text-[9px] font-bold uppercase bg-slate-100 text-slate-600 border border-slate-200">
                                {o.paymentMethod || "COD"}
                              </span>

                              <span className={`px-1 py-0.2 rounded text-[9px] font-black uppercase border ${
                                o.paymentStatus === "paid"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : o.paymentStatus === "refunded"
                                  ? "bg-purple-50 text-purple-700 border-purple-200"
                                  : o.paymentStatus === "failed"
                                  ? "bg-rose-50 text-rose-700 border-rose-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                              }`}>
                                {o.paymentStatus === "paid" ? getTranslation("পরিশোধিত", "Paid") :
                                 o.paymentStatus === "refunded" ? getTranslation("রিফান্ড", "Refunded") :
                                 o.paymentStatus === "failed" ? getTranslation("ব্যর্থ", "Failed") :
                                 getTranslation("পেন্ডিং", "Pending")}
                              </span>
                            </div>

                            {/* Payment Status Dropdown Updater */}
                            <select
                              value={o.paymentStatus || "pending"}
                              onChange={(e) => handleUpdatePaymentStatus(o.id, e.target.value)}
                              className="w-full max-w-[100px] bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded px-1 py-0.5 text-[9px] font-bold text-slate-600 outline-none focus:border-emerald-500 transition cursor-pointer"
                            >
                              <option value="pending">{getTranslation("পেন্ডিং (Pending)", "Pending")}</option>
                              <option value="paid">{getTranslation("পরিশোধিত (Paid)", "Paid")}</option>
                              <option value="failed">{getTranslation("ব্যর্থ (Failed)", "Failed")}</option>
                              <option value="refunded">{getTranslation("ফেরত (Refunded)", "Refunded")}</option>
                            </select>
                          </div>
                        </td>

                        {/* 5. CURRENT STATUS */}
                        <td className="py-2.5 px-2 align-middle text-center">
                          <div className="flex flex-col items-center justify-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase border shadow-2xs ${
                              isDelivered ? "bg-emerald-50 text-emerald-800 border-emerald-300" :
                              isPickedUp ? "bg-indigo-50 text-indigo-800 border-indigo-300" :
                              isConfirmed ? "bg-blue-50 text-blue-800 border-blue-300" :
                              isPending ? "bg-amber-50 text-amber-800 border-amber-300" :
                              isRefunded ? "bg-purple-50 text-purple-800 border-purple-300" :
                              "bg-rose-50 text-rose-800 border-rose-300"
                            }`}>
                              {isPending && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>}
                              {isConfirmed && <CheckCircle2 className="w-3 h-3 text-blue-600" />}
                              {isPickedUp && <Bike className="w-3 h-3 text-indigo-600" />}
                              {isDelivered && <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />}
                              {isCancelled && <XCircle className="w-3 h-3 text-rose-600" />}

                              <span>
                                {isDelivered ? getTranslation("ডেলিভার্ড", "Delivered") :
                                 isPickedUp ? getTranslation("পিকড আপ", "Picked Up") :
                                 isConfirmed ? getTranslation("নিশ্চিত", "Confirmed") :
                                 isPending ? getTranslation("পেন্ডিং", "Pending") :
                                 isRefunded ? getTranslation("রিফান্ডেড", "Refunded") :
                                 getTranslation("বাতিল", "Cancelled")}
                              </span>
                            </span>
                          </div>
                        </td>

                        {/* 6. RIDER / DELIVERY */}
                        <td className="py-2.5 px-2 align-middle">
                          {o.riderId ? (
                            <div className="bg-slate-50 border border-slate-200/90 rounded-lg p-1 max-w-[110px] space-y-0.5">
                              <div className="flex items-center gap-1 text-emerald-700 font-extrabold text-[10px] truncate">
                                <Bike className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span className="truncate capitalize">{o.riderName || getTranslation("রাইডার", "Rider")}</span>
                              </div>
                              <select
                                onChange={(e) => handleAssignRider(o.id, e.target.value)}
                                defaultValue=""
                                className="w-full bg-white border border-slate-200 rounded px-1 py-0.5 text-[8.5px] font-bold text-slate-500 outline-none cursor-pointer truncate"
                              >
                                <option value="" disabled>{getTranslation("পরিবর্তন...", "Change...")}</option>
                                {activeRidersList.map(r => (
                                  <option key={r.id || r.uid} value={r.uid || r.id}>{r.displayName || r.name}</option>
                                ))}
                              </select>
                            </div>
                          ) : (
                            <select 
                              onChange={(e) => handleAssignRider(o.id, e.target.value)}
                              defaultValue=""
                              className="w-full max-w-[110px] bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-1.5 py-1 text-[10px] font-bold text-slate-700 outline-none focus:border-emerald-500 transition cursor-pointer shadow-2xs truncate"
                            >
                              <option value="" disabled>{getTranslation("🚴 রাইডার...", "🚴 Rider...")}</option>
                              {activeRidersList.map(r => (
                                <option key={r.id || r.uid} value={r.uid || r.id}>
                                  {r.displayName || r.name}
                                </option>
                              ))}
                            </select>
                          )}
                        </td>

                        {/* 7. ACTIONS (Fixed, compact, all 4 visible) */}
                        <td className="py-2.5 px-2.5 align-middle text-center">
                          <div className="flex items-center justify-center gap-1 min-w-[205px]">
                            
                            {/* Button: Confirm */}
                            <button
                              disabled={updatingOrderId === o.id}
                              onClick={() => onStatusChange(o.id, "confirmed")}
                              className={`h-7 px-1.5 rounded-md text-[10px] font-black uppercase transition flex items-center gap-0.5 cursor-pointer shadow-2xs border whitespace-nowrap ${
                                o.orderStatus === "confirmed"
                                  ? "bg-blue-600 text-white border-blue-700 shadow-xs"
                                  : "bg-blue-50/80 hover:bg-blue-100 text-blue-700 border-blue-200"
                              }`}
                              title={getTranslation("অর্ডার নিশ্চিত করুন", "Confirm Order")}
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{getTranslation("নিশ্চিত", "Confirm")}</span>
                            </button>

                            {/* Button: Deliver */}
                            <button
                              disabled={updatingOrderId === o.id}
                              onClick={() => onStatusChange(o.id, "delivered")}
                              className={`h-7 px-1.5 rounded-md text-[10px] font-black uppercase transition flex items-center gap-0.5 cursor-pointer shadow-2xs border whitespace-nowrap ${
                                o.orderStatus === "delivered"
                                  ? "bg-emerald-600 text-white border-emerald-700 shadow-xs"
                                  : "bg-emerald-50/80 hover:bg-emerald-100 text-emerald-700 border-emerald-200"
                              }`}
                              title={getTranslation("ডেলিভার সম্পন্ন করুন", "Mark as Delivered")}
                            >
                              <Check className="w-3 h-3 stroke-[2.5]" />
                              <span>{getTranslation("ডেলিভার", "Deliver")}</span>
                            </button>

                            {/* Button: Cancel */}
                            <button
                              disabled={updatingOrderId === o.id}
                              onClick={() => onStatusChange(o.id, "cancelled")}
                              className={`h-7 px-1.5 rounded-md text-[10px] font-black uppercase transition flex items-center gap-0.5 cursor-pointer shadow-2xs border whitespace-nowrap ${
                                o.orderStatus === "cancelled"
                                  ? "bg-rose-600 text-white border-rose-700 shadow-xs"
                                  : "bg-rose-50/80 hover:bg-rose-100 text-rose-700 border-rose-200"
                              }`}
                              title={getTranslation("অর্ডার বাতিল করুন", "Cancel Order")}
                            >
                              <X className="w-3 h-3" />
                              <span>{getTranslation("বাতিল", "Cancel")}</span>
                            </button>

                            {/* Button: View / Print Memo */}
                            <button
                              onClick={() => onSelectMemoOrder(o)}
                              className="h-7 px-1.5 rounded-md text-[10px] font-black uppercase transition flex items-center gap-0.5 cursor-pointer bg-slate-900 hover:bg-black text-white shadow-2xs border border-slate-800 whitespace-nowrap"
                              title={getTranslation("চালান ও মেমো প্রিন্ট করুন", "View / Print Memo")}
                            >
                              <Printer className="w-3 h-3 text-emerald-400" />
                              <span>{getTranslation("চালান", "Memo")}</span>
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Ordered Items Row */}
                      {isExpanded && o.items && (
                        <tr className="bg-slate-50/90 border-b border-slate-200/80 animate-fade-in">
                          <td colSpan={7} className="p-4 sm:p-5">
                            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs">
                              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                <div className="flex items-center gap-2">
                                  <Package className="w-4 h-4 text-emerald-600" />
                                  <h5 className="font-black text-slate-800 text-xs">
                                    {getTranslation("অর্ডারের পণ্যসমূহ (আইটেম লিস্ট)", "Ordered Products List")}
                                  </h5>
                                </div>
                                <span className="text-[11px] font-bold text-slate-500">
                                  {getTranslation("মোট পণ্য:", "Total Items:")} {o.items.length}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                                {o.items.map((item: any, idx: number) => (
                                  <div key={idx} className="flex items-center gap-2.5 bg-slate-50 border border-slate-100 rounded-lg p-2">
                                    {item.image && (
                                      <img
                                        src={item.image}
                                        alt={item.nameBn || item.name}
                                        className="w-9 h-9 rounded-md object-cover border border-slate-200 shrink-0"
                                        referrerPolicy="no-referrer"
                                      />
                                    )}
                                    <div className="min-w-0 flex-1">
                                      <div className="font-bold text-slate-800 text-xs truncate">
                                        {lang === "bn" ? (item.nameBn || item.name) : (item.name || item.nameBn)}
                                      </div>
                                      <div className="text-[10px] text-slate-500 flex items-center justify-between mt-0.5">
                                        <span>{item.quantity} {item.unit || "পিস"}</span>
                                        <span className="font-black text-slate-900 font-mono">৳{(item.price * item.quantity).toLocaleString()}</span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              {o.notes && (
                                <div className="bg-amber-50/60 border border-amber-200/60 rounded-lg p-2 text-xs text-amber-900 flex items-start gap-1.5 mt-2">
                                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                                  <div>
                                    <span className="font-bold">{getTranslation("অর্ডার নোট:", "Customer Note:")} </span>
                                    <span>{o.notes}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info & Count Summary */}
        <div className="p-3.5 sm:p-4 bg-slate-50/80 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div>
            {getTranslation(
              `মোট ${orders.length} টি অর্ডারের মধ্যে ${filteredOrders.length} টি দেখানো হচ্ছে`,
              `Showing ${filteredOrders.length} of ${orders.length} total orders`
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              {getTranslation("রিয়েল-টাইম ক্লাউড সিঙ্ক সক্রিয়", "Real-time Cloud Sync Active")}
            </span>
          </div>
        </div>

      </div>

    </div>
  );
}
