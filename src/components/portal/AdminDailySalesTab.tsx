import React, { useState, useMemo } from "react";
import { 
  TrendingUp, Calendar, DollarSign, Scale, Package, ShoppingBag, 
  Search, ArrowUpDown, Download, Printer, Filter, CheckCircle2, 
  Clock, Sparkles, RefreshCw, Layers, ChevronRight, BarChart3, 
  PieChart as PieChartIcon, Eye, ArrowUpRight, ArrowDownRight, Tag
} from "lucide-react";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from "recharts";
import { 
  extractItemWeight, 
  formatTotalWeight, 
  parseOrderDate, 
  isOrderDelivered, 
  isDateInRange,
  convertWesternDigitsToBengali,
  SoldProductAggregate,
  HourlySalesPoint,
  DailySalesPoint
} from "../../lib/salesAnalytics";

interface AdminDailySalesTabProps {
  orders: any[];
  products: any[];
  lang: "bn" | "en";
  triggerToast: (bn: string, en: string) => void;
}

type TimeFilterType = "today" | "yesterday" | "last7days" | "thismonth" | "custom";
type ChartMetricType = "revenue" | "orders" | "weight";

export default function AdminDailySalesTab({
  orders,
  products,
  lang,
  triggerToast
}: AdminDailySalesTabProps) {
  const getTranslation = (bn: string, en: string) => (lang === "bn" ? bn : en);

  // Filter states
  const [timeFilter, setTimeFilter] = useState<TimeFilterType>("today");
  const [customStartDate, setCustomStartDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [customEndDate, setCustomEndDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [chartMetric, setChartMetric] = useState<ChartMetricType>("revenue");
  
  // Table search & sort
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"sales" | "quantity" | "name">("sales");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  // Filtered delivered orders strictly for the selected time period
  const { 
    filteredDeliveredOrders, 
    allOrdersInPeriod, 
    periodStartDate, 
    periodEndDate 
  } = useMemo(() => {
    const sDate = customStartDate ? new Date(customStartDate) : undefined;
    const eDate = customEndDate ? new Date(customEndDate) : undefined;

    const inPeriod: any[] = [];
    const deliveredInPeriod: any[] = [];

    orders.forEach((o) => {
      const orderDate = parseOrderDate(o);
      if (!orderDate) return;

      if (isDateInRange(orderDate, timeFilter, sDate, eDate)) {
        inPeriod.push(o);
        if (isOrderDelivered(o)) {
          deliveredInPeriod.push(o);
        }
      }
    });

    return {
      filteredDeliveredOrders: deliveredInPeriod,
      allOrdersInPeriod: inPeriod,
      periodStartDate: sDate,
      periodEndDate: eDate
    };
  }, [orders, timeFilter, customStartDate, customEndDate]);

  // Aggregate Key Metrics (Sales ৳, Total Weight in kg/g, Completed Orders, Products Count)
  const metrics = useMemo(() => {
    let totalRevenue = 0;
    let totalGrams = 0;
    let totalItemsQuantitySold = 0;
    let cashOnDeliverySales = 0;
    let digitalPaymentSales = 0;

    // Map of sold products: productId -> aggregate
    const productMap = new Map<string, SoldProductAggregate>();

    filteredDeliveredOrders.forEach((o) => {
      // Order amount
      const orderAmount = Number(o.totalAmount || o.total || o.subtotal || 0);
      totalRevenue += orderAmount;

      const pMethod = String(o.paymentMethod || "").toLowerCase();
      if (pMethod === "cod" || pMethod.includes("cash")) {
        cashOnDeliverySales += orderAmount;
      } else {
        digitalPaymentSales += orderAmount;
      }

      // Items inside order
      if (Array.isArray(o.items)) {
        o.items.forEach((item: any) => {
          const qty = Math.max(1, Number(item.quantity) || 1);
          totalItemsQuantitySold += qty;

          // Weight calculation
          const weightInfo = extractItemWeight(item);
          totalGrams += weightInfo.totalGrams;

          // Product identification
          const prodId = item.productId || item.product?.id || item.id || (item.nameEn || item.nameBn || "unknown");
          const nameBn = item.nameBn || item.product?.nameBn || item.name || "পণ্য";
          const nameEn = item.nameEn || item.product?.nameEn || item.name || "Product";
          const img = item.image || item.product?.image || "";
          const cat = item.product?.category || item.category || "General";
          
          const unitPrice = Number(item.selectedOption?.price || item.price || item.product?.price || 0);
          const itemTotal = unitPrice * qty;

          const existing = productMap.get(prodId);
          if (existing) {
            existing.totalQuantity += qty;
            existing.totalSalesAmount += itemTotal;
            existing.totalWeightGrams += weightInfo.totalGrams;
            existing.ordersCount += 1;
            existing.avgPrice = existing.totalQuantity > 0 
              ? Math.round(existing.totalSalesAmount / existing.totalQuantity) 
              : unitPrice;
          } else {
            productMap.set(prodId, {
              productId: prodId,
              nameBn,
              nameEn,
              image: img,
              category: cat,
              unit: weightInfo.unitLabelBn || item.unit || "পিস",
              totalQuantity: qty,
              totalSalesAmount: itemTotal,
              totalWeightGrams: weightInfo.totalGrams,
              isWeightBased: weightInfo.isWeightBased,
              ordersCount: 1,
              avgPrice: unitPrice
            });
          }
        });
      }
    });

    const soldProductsList = Array.from(productMap.values());
    const deliveredCount = filteredDeliveredOrders.length;
    const avgOrderValue = deliveredCount > 0 ? Math.round(totalRevenue / deliveredCount) : 0;
    const weightFormatted = formatTotalWeight(totalGrams, lang);

    return {
      totalRevenue,
      deliveredCount,
      totalItemsQuantitySold,
      uniqueProductsCount: soldProductsList.length,
      soldProductsList,
      totalGrams,
      weightFormatted,
      avgOrderValue,
      cashOnDeliverySales,
      digitalPaymentSales
    };
  }, [filteredDeliveredOrders, lang]);

  // Generate Categories list from sold products
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    metrics.soldProductsList.forEach(p => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats);
  }, [metrics.soldProductsList]);

  // Filtered & Sorted Sold Products
  const displayedProducts = useMemo(() => {
    return metrics.soldProductsList
      .filter((p) => {
        // Category filter
        if (categoryFilter !== "all" && p.category !== categoryFilter) {
          return false;
        }
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchBn = p.nameBn.toLowerCase().includes(q);
          const matchEn = p.nameEn.toLowerCase().includes(q);
          const matchCat = p.category.toLowerCase().includes(q);
          return matchBn || matchEn || matchCat;
        }
        return true;
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortBy === "sales") {
          diff = b.totalSalesAmount - a.totalSalesAmount;
        } else if (sortBy === "quantity") {
          diff = b.totalQuantity - a.totalQuantity;
        } else {
          diff = a.nameBn.localeCompare(b.nameBn);
        }
        return sortOrder === "desc" ? diff : -diff;
      });
  }, [metrics.soldProductsList, categoryFilter, searchQuery, sortBy, sortOrder]);

  // Chart Data Generation
  const chartData = useMemo(() => {
    // 1. Single-day time window (Today or Yesterday): Show 24-hour timeline in 2-hour slots
    if (timeFilter === "today" || timeFilter === "yesterday") {
      const slots: HourlySalesPoint[] = [];
      const hourIntervals = [
        { start: 6, end: 8, labelBn: "সকাল ৬-৮টা", labelEn: "06:00 - 08:00" },
        { start: 8, end: 10, labelBn: "সকাল ৮-১০টা", labelEn: "08:00 - 10:00" },
        { start: 10, end: 12, labelBn: "সকাল ১০-১২টা", labelEn: "10:00 - 12:00" },
        { start: 12, end: 14, labelBn: "দুপুর ১২-২টা", labelEn: "12:00 - 14:00" },
        { start: 14, end: 16, labelBn: "দুপুর ২-৪টা", labelEn: "14:00 - 16:00" },
        { start: 16, end: 18, labelBn: "বিকেল ৪-৬টা", labelEn: "16:00 - 18:00" },
        { start: 18, end: 20, labelBn: "সন্ধ্যা ৬-৮টা", labelEn: "18:00 - 20:00" },
        { start: 20, end: 22, labelBn: "রাত ৮-১০টা", labelEn: "20:00 - 22:00" },
        { start: 22, end: 24, labelBn: "রাত ১০-১২টা", labelEn: "22:00 - 24:00" },
        { start: 0, end: 6, labelBn: "রাত ১২-সকাল ৬টা", labelEn: "00:00 - 06:00" }
      ];

      hourIntervals.forEach((slot) => {
        slots.push({
          hourLabelBn: slot.labelBn,
          hourLabelEn: slot.labelEn,
          hourNum: slot.start,
          salesAmount: 0,
          ordersCount: 0,
          weightKg: 0
        });
      });

      filteredDeliveredOrders.forEach((o) => {
        const orderDate = parseOrderDate(o);
        if (!orderDate) return;

        const hour = orderDate.getHours();
        const amount = Number(o.totalAmount || o.total || o.subtotal || 0);

        // Calculate order weight in kg
        let orderGrams = 0;
        if (Array.isArray(o.items)) {
          o.items.forEach((item: any) => {
            orderGrams += extractItemWeight(item).totalGrams;
          });
        }

        // Match slot
        const targetSlot = slots.find(s => {
          if (s.hourNum === 0) return hour >= 0 && hour < 6;
          return hour >= s.hourNum && hour < s.hourNum + 2;
        });

        if (targetSlot) {
          targetSlot.salesAmount += amount;
          targetSlot.ordersCount += 1;
          targetSlot.weightKg += orderGrams / 1000;
        }
      });

      return slots.map(s => ({
        label: lang === "bn" ? s.hourLabelBn : s.hourLabelEn,
        revenue: s.salesAmount,
        orders: s.ordersCount,
        weight: Number(s.weightKg.toFixed(2))
      }));
    }

    // 2. Multi-day window (Last 7 Days, This Month, or Custom range)
    const dayMap = new Map<string, { labelBn: string; labelEn: string; revenue: number; orders: number; weight: number }>();

    filteredDeliveredOrders.forEach((o) => {
      const orderDate = parseOrderDate(o);
      if (!orderDate) return;

      const dateKey = orderDate.toISOString().split("T")[0];
      const amount = Number(o.totalAmount || o.total || o.subtotal || 0);

      let orderGrams = 0;
      if (Array.isArray(o.items)) {
        o.items.forEach((item: any) => {
          orderGrams += extractItemWeight(item).totalGrams;
        });
      }

      const existing = dayMap.get(dateKey);
      if (existing) {
        existing.revenue += amount;
        existing.orders += 1;
        existing.weight += orderGrams / 1000;
      } else {
        const dayNum = orderDate.getDate();
        const monthBn = ["জানু", "ফেব্রু", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টে", "অক্টো", "নভে", "ডিসে"][orderDate.getMonth()];
        const monthEn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][orderDate.getMonth()];
        
        dayMap.set(dateKey, {
          labelBn: `${convertWesternDigitsToBengali(dayNum)} ${monthBn}`,
          labelEn: `${monthEn} ${dayNum}`,
          revenue: amount,
          orders: 1,
          weight: orderGrams / 1000
        });
      }
    });

    // If no orders yet, produce empty dates of last 7 days
    if (dayMap.size === 0 && timeFilter === "last7days") {
      const now = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateKey = d.toISOString().split("T")[0];
        const dayNum = d.getDate();
        const monthBn = ["জানু", "ফেব্রু", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টে", "অক্টো", "নভে", "ডিসে"][d.getMonth()];
        const monthEn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()];
        dayMap.set(dateKey, {
          labelBn: `${convertWesternDigitsToBengali(dayNum)} ${monthBn}`,
          labelEn: `${monthEn} ${dayNum}`,
          revenue: 0,
          orders: 0,
          weight: 0
        });
      }
    }

    const sortedEntries = Array.from(dayMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    return sortedEntries.map(([_, val]) => ({
      label: lang === "bn" ? val.labelBn : val.labelEn,
      revenue: val.revenue,
      orders: val.orders,
      weight: Number(val.weight.toFixed(2))
    }));
  }, [filteredDeliveredOrders, timeFilter, lang]);

  // Human-readable active date badge text
  const activeDateText = useMemo(() => {
    const today = new Date();
    const formatDateStr = (d: Date) => {
      const day = d.getDate();
      const monthsBn = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];
      const monthsEn = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      if (lang === "bn") {
        return `${convertWesternDigitsToBengali(day)} ${monthsBn[d.getMonth()]}, ${convertWesternDigitsToBengali(d.getFullYear())}`;
      }
      return `${monthsEn[d.getMonth()]} ${day}, ${d.getFullYear()}`;
    };

    if (timeFilter === "today") {
      return getTranslation(`আজ: ${formatDateStr(today)}`, `Today: ${formatDateStr(today)}`);
    }
    if (timeFilter === "yesterday") {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      return getTranslation(`গতকাল: ${formatDateStr(y)}`, `Yesterday: ${formatDateStr(y)}`);
    }
    if (timeFilter === "last7days") {
      return getTranslation("গত ৭ দিনের পরিসংখ্যান", "Last 7 Days Overview");
    }
    if (timeFilter === "thismonth") {
      const monthsBn = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];
      const monthsEn = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      return getTranslation(
        `চলতি মাস (${monthsBn[today.getMonth()]}, ${convertWesternDigitsToBengali(today.getFullYear())})`,
        `This Month (${monthsEn[today.getMonth()]}, ${today.getFullYear()})`
      );
    }
    if (timeFilter === "custom") {
      return getTranslation(
        `কাস্টম পরিধি (${customStartDate} থেকে ${customEndDate})`,
        `Custom Range (${customStartDate} to ${customEndDate})`
      );
    }
    return "";
  }, [timeFilter, customStartDate, customEndDate, lang]);

  // Export to CSV
  const handleExportCSV = () => {
    if (metrics.soldProductsList.length === 0) {
      triggerToast("এক্সপোর্ট করার মতো কোনো বিক্রিত পণ্যের ডাটা নেই!", "No sold products data to export for this period!");
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Serial,Product Name (BN),Product Name (EN),Category,Sold Quantity,Total Weight,Unit Price (BDT),Total Sales (BDT),Orders Count\n";

    metrics.soldProductsList.forEach((p, idx) => {
      const weightDisplay = p.isWeightBased ? `${(p.totalWeightGrams / 1000).toFixed(2)} kg` : "N/A";
      const cleanNameBn = `"${p.nameBn.replace(/"/g, '""')}"`;
      const cleanNameEn = `"${p.nameEn.replace(/"/g, '""')}"`;
      csvContent += `${idx + 1},${cleanNameBn},${cleanNameEn},${p.category},${p.totalQuantity} ${p.unit},${weightDisplay},${p.avgPrice},${p.totalSalesAmount},${p.ordersCount}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `daily_sales_${timeFilter}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    triggerToast("সেলস ডাটা সফলভাবে ডাউনলোড হয়েছে!", "Sales report exported successfully as CSV!");
  };

  // Print Summary
  const handlePrintSummary = () => {
    window.print();
  };

  return (
    <div className="w-full space-y-6 animate-fade-in text-slate-800">
      
      {/* 1. Header Banner & Live Status */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 rounded-3xl p-5 sm:p-7 text-white shadow-md border border-emerald-900/40 relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-emerald-500/30 shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                    {getTranslation("দৈনিক সেলস ওভারভিউ", "Daily Sales Overview")}
                  </h1>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    {getTranslation("লাইভ সিঙ্ক", "Live Synced")}
                  </span>
                </div>
                <p className="text-xs text-emerald-200/90 mt-1 max-w-2xl font-medium">
                  {getTranslation(
                    "শুধুমাত্র সম্পন্ন ও ডেলিভারড (Delivered/Completed) অর্ডারের সম্পূর্ণ বিক্রয় হিসাব, মোট কেজি/গ্রাম এবং সময়ভিত্তিক সেলস চার্ট।",
                    "Real-time completed/delivered sales ledger with accurate kg/gram quantity calculations and hourly performance charts."
                  )}
                </p>
              </div>
            </div>

            {/* Active Period Pill */}
            <div className="mt-3.5 inline-flex items-center gap-2 bg-slate-800/80 border border-slate-700/80 px-3 py-1 rounded-xl text-xs font-bold text-emerald-300 shadow-inner">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>{activeDateText}</span>
              <span className="text-slate-400 text-[10px] font-normal">|</span>
              <span className="text-[11px] text-slate-300">
                {getTranslation(
                  `${convertWesternDigitsToBengali(metrics.deliveredCount)}টি সফল ডেলিভারি`,
                  `${metrics.deliveredCount} Delivered Orders`
                )}
              </span>
            </div>
          </div>

          {/* Action Buttons: Export & Print */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              onClick={handleExportCSV}
              className="h-10 px-4 rounded-xl bg-slate-800/90 hover:bg-slate-750 text-white text-xs font-bold transition flex items-center gap-2 border border-slate-700 shadow-sm cursor-pointer hover:border-emerald-500/50"
              title={getTranslation("সিএসভি এক্সেল ডাউনলোড", "Export to CSV Excel")}
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>{getTranslation("এক্সপোর্ট CSV", "Export CSV")}</span>
            </button>

            <button
              onClick={handlePrintSummary}
              className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-black transition flex items-center gap-2 shadow-md shadow-emerald-950/40 cursor-pointer"
              title={getTranslation("প্রিন্ট করুন", "Print Sales Report")}
            >
              <Printer className="w-4 h-4 text-slate-950" />
              <span>{getTranslation("রিপোর্ট প্রিন্ট", "Print Report")}</span>
            </button>
          </div>
        </div>

        {/* Audit Filter Strip: Shows total orders received vs completed vs non-sales */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-300 gap-3">
          <div className="flex items-center gap-4 flex-wrap text-[11px]">
            <span className="text-slate-400 font-medium">
              {getTranslation("এই সময়ে মোট প্রাপ্ত অর্ডার:", "Total Orders in Period:")}{" "}
              <strong className="text-white font-mono">{allOrdersInPeriod.length}টি</strong>
            </span>
            <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {getTranslation("সেলস গণনায় অন্তর্ভুক্ত (Delivered):", "Included in Sales (Delivered):")}{" "}
              <span className="font-mono">{metrics.deliveredCount}টি</span>
            </span>
            <span className="text-amber-400/90 font-medium">
              {getTranslation("পেন্ডিং / বাতিল (বাদ রাখা হয়েছে):", "Pending/Cancelled (Excluded):")}{" "}
              <span className="font-mono">{allOrdersInPeriod.length - metrics.deliveredCount}টি</span>
            </span>
          </div>

          <span className="text-[10px] text-slate-400 italic">
            {getTranslation(
              "*নিয়ম অনুযায়ী শুধুমাত্র ডেলিভারড/কমপ্লিটেড অর্ডারই বিক্রয় হিসেবে গণনা করা হয়েছে",
              "*Only Completed & Delivered orders are counted towards verified sales revenue"
            )}
          </span>
        </div>
      </div>

      {/* 2. Filter Navigation Toolbar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Quick Date Presets Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl overflow-x-auto">
          <button
            onClick={() => setTimeFilter("today")}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition cursor-pointer whitespace-nowrap ${
              timeFilter === "today"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            {getTranslation("আজ (Today)", "Today")}
          </button>

          <button
            onClick={() => setTimeFilter("yesterday")}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition cursor-pointer whitespace-nowrap ${
              timeFilter === "yesterday"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            {getTranslation("গতকাল (Yesterday)", "Yesterday")}
          </button>

          <button
            onClick={() => setTimeFilter("last7days")}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition cursor-pointer whitespace-nowrap ${
              timeFilter === "last7days"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            {getTranslation("গত ৭ দিন (Last 7 Days)", "Last 7 Days")}
          </button>

          <button
            onClick={() => setTimeFilter("thismonth")}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition cursor-pointer whitespace-nowrap ${
              timeFilter === "thismonth"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            {getTranslation("এই মাস (This Month)", "This Month")}
          </button>

          <button
            onClick={() => setTimeFilter("custom")}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition cursor-pointer whitespace-nowrap ${
              timeFilter === "custom"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            {getTranslation("কাস্টম তারিখ (Custom Date)", "Custom Date")}
          </button>
        </div>

        {/* Custom Date Pickers (Shown when custom filter active or for quick custom adjustments) */}
        {timeFilter === "custom" && (
          <div className="flex items-center gap-2 flex-wrap bg-slate-50 border border-slate-200 p-2 rounded-2xl animate-fade-in">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase text-slate-500">{getTranslation("হতে:", "From:")}</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800 outline-none focus:border-emerald-500"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase text-slate-500">{getTranslation("পর্যন্ত:", "To:")}</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800 outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* 3. Primary KPI Cards Grid (Exact requested metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        
        {/* KPI 1: মোট Sales Amount (৳) */}
        <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-5 shadow-xs hover:border-emerald-300 transition group flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {timeFilter === "today" 
                ? getTranslation("আজকের মোট বিক্রি", "Today's Total Sales")
                : getTranslation("মোট বিক্রয় মূল্য", "Total Sales Amount")}
            </span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black group-hover:scale-105 transition">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
              ৳{metrics.totalRevenue.toLocaleString()}
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>{getTranslation("গড় অর্ডার:", "Avg Order:")} ৳{metrics.avgOrderValue.toLocaleString()}</span>
              <span className="text-emerald-600 font-bold">100% ডেলিভারড</span>
            </div>
          </div>
        </div>

        {/* KPI 2: মোট কত kg/gram পণ্য বিক্রি হয়েছে */}
        <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-5 shadow-xs hover:border-teal-300 transition group flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {timeFilter === "today"
                ? getTranslation("আজ মোট বিক্রি হওয়া ওজন", "Today's Total Weight Sold")
                : getTranslation("মোট বিক্রয় ওজন", "Total Weight Sold")}
            </span>
            <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center font-black group-hover:scale-105 transition">
              <Scale className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-black text-teal-900 tracking-tight flex items-baseline gap-1.5">
              <span>{metrics.weightFormatted.displayShort}</span>
            </div>
            <div className="mt-1.5 text-[11px] text-slate-500 font-medium truncate" title={metrics.weightFormatted.displayDetailed}>
              {metrics.weightFormatted.displayDetailed}
            </div>
          </div>
        </div>

        {/* KPI 3: মোট কতটি Order Completed/Delivered হয়েছে */}
        <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-5 shadow-xs hover:border-blue-300 transition group flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {timeFilter === "today"
                ? getTranslation("আজ সম্পন্ন অর্ডার", "Today's Completed Orders")
                : getTranslation("সম্পন্ন অর্ডার সংখ্যা", "Delivered Orders Count")}
            </span>
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black group-hover:scale-105 transition">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
              {convertWesternDigitsToBengali(metrics.deliveredCount)}টি
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>
                {allOrdersInPeriod.length > 0 ? `${allOrdersInPeriod.length}টি অর্ডারের মধ্যে` : "ডেলিভারি সম্পন্ন"}
              </span>
              <span className="text-blue-600 font-bold">
                {allOrdersInPeriod.length > 0 
                  ? `${Math.round((metrics.deliveredCount / allOrdersInPeriod.length) * 100)}% সফল`
                  : "১০০% সফল"}
              </span>
            </div>
          </div>
        </div>

        {/* KPI 4: আজ মোট কতটি Product বিক্রি হয়েছে */}
        <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-5 shadow-xs hover:border-amber-300 transition group flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {timeFilter === "today"
                ? getTranslation("আজ মোট বিক্রিত পণ্য", "Today's Products Sold")
                : getTranslation("মোট বিক্রিত পণ্য ইউনিট", "Products Units Sold")}
            </span>
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-black group-hover:scale-105 transition">
              <Package className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
              {convertWesternDigitsToBengali(metrics.totalItemsQuantitySold)}টি
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>{convertWesternDigitsToBengali(metrics.uniqueProductsCount)}টি ভিন্ন ক্যাটাগরি/পণ্য</span>
              <span className="text-amber-600 font-bold">ইউনিট বিক্রি</span>
            </div>
          </div>
        </div>

      </div>

      {/* 4. Daily Sales Chart (Interactive recharts timeline) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                {timeFilter === "today"
                  ? getTranslation("আজকের সেলস ট্রেন্ড ও সময়ভিত্তিক চার্ট", "Today's Hourly Sales Timeline Chart")
                  : getTranslation("সময়ভিত্তিক সেলস এনালাইসিস চার্ট", "Sales Timeline & Performance Chart")}
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">
              {timeFilter === "today" || timeFilter === "yesterday"
                ? getTranslation("আজকের বিভিন্ন সময়ে অর্ডারের বিক্রয় মূল্য (৳), ডেলিভারি সংখ্যা ও কেজি/গ্রামের লাইভ হিসাব।", "Hourly distribution of sales revenue, delivered orders, and total weight sold.")
                : getTranslation("প্রতিদিনের বিক্রয় মূল্য ও অর্ডারের পরিবর্তন প্রবণতা।", "Day-by-day sales trajectory and delivered orders overview.")}
            </p>
          </div>

          {/* Metric Selector for Chart */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
            <button
              onClick={() => setChartMetric("revenue")}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                chartMetric === "revenue"
                  ? "bg-white text-emerald-700 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {getTranslation("বিক্রয় টাকা (৳)", "Revenue (৳)")}
            </button>
            <button
              onClick={() => setChartMetric("orders")}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                chartMetric === "orders"
                  ? "bg-white text-blue-700 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {getTranslation("অর্ডার সংখ্যা", "Orders Count")}
            </button>
            <button
              onClick={() => setChartMetric("weight")}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                chartMetric === "weight"
                  ? "bg-white text-teal-700 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {getTranslation("ওজন (কেজি)", "Weight (kg)")}
            </button>
          </div>
        </div>

        {/* Chart Rendering Container */}
        <div className="w-full h-72 sm:h-80 pt-2">
          {chartData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs space-y-2">
              <Clock className="w-8 h-8 text-slate-300" />
              <p>{getTranslation("এই সময়ে কোনো ডেলিভারড অর্ডারের ডাটা নেই।", "No completed sales data available for this timeframe.")}</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="ordersGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis 
                  dataKey="label" 
                  tick={{ fontSize: 10, fill: "#64748b" }} 
                  axisLine={{ stroke: "#e2e8f0" }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: "#64748b" }} 
                  axisLine={{ stroke: "#e2e8f0" }}
                  tickLine={false}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white rounded-xl p-3 shadow-xl text-xs space-y-1 border border-slate-800 min-w-[150px]">
                          <div className="font-bold text-emerald-400 border-b border-slate-800 pb-1 mb-1">
                            {label}
                          </div>
                          <div className="flex items-center justify-between gap-3 text-slate-300">
                            <span>{getTranslation("মোট বিক্রি:", "Sales:")}</span>
                            <strong className="text-white font-mono">৳{(data.revenue || 0).toLocaleString()}</strong>
                          </div>
                          <div className="flex items-center justify-between gap-3 text-slate-300">
                            <span>{getTranslation("অর্ডার সংখ্যা:", "Orders:")}</span>
                            <strong className="text-blue-300 font-mono">{data.orders || 0}টি</strong>
                          </div>
                          <div className="flex items-center justify-between gap-3 text-slate-300">
                            <span>{getTranslation("মোট ওজন:", "Weight:")}</span>
                            <strong className="text-teal-300 font-mono">{data.weight || 0} kg</strong>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                {chartMetric === "revenue" && (
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name={getTranslation("মোট বিক্রয় (৳)", "Sales Revenue (৳)")}
                    stroke="#059669"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#salesGradient)"
                  />
                )}
                {chartMetric === "orders" && (
                  <Area
                    type="monotone"
                    dataKey="orders"
                    name={getTranslation("অর্ডার সংখ্যা", "Orders Count")}
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#ordersGradient)"
                  />
                )}
                {chartMetric === "weight" && (
                  <Area
                    type="monotone"
                    dataKey="weight"
                    name={getTranslation("মোট ওজন (কেজি)", "Weight (kg)")}
                    stroke="#0d9488"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#weightGradient)"
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 5. Product-wise Sold Breakdown Table (Requested Section) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl shadow-xs overflow-hidden">
        
        {/* Table Top Controls & Search Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-600" />
                <h3 className="font-black text-slate-900 text-sm sm:text-base">
                  {timeFilter === "today"
                    ? getTranslation("আজকে বিক্রি হওয়া পণ্যের তালিকা ও পরিমাণ", "Today's Sold Products & Quantities")
                    : getTranslation("বিক্রি হওয়া পণ্যের বিস্তারিত তালিকা", "Sold Products Breakdown Ledger")}
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">
                {getTranslation(
                  "প্রতিটি পণ্যের নাম, মোট বিক্রিত পরিমাণ (কেজি/গ্রাম/পিস) এবং সর্বমোট বিক্রয় মূল্য (৳)।",
                  "Detailed product name, sold quantity with units, and total sales amount."
                )}
              </p>
            </div>

            {/* Quick Count Badge */}
            <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200/80 px-3 py-1.5 rounded-xl text-xs font-black text-emerald-800 self-start sm:self-auto">
              <span>{getTranslation("মোট পণ্য প্রকার:", "Unique Products:")}</span>
              <span className="font-mono text-emerald-950">{displayedProducts.length}টি</span>
            </div>
          </div>

          {/* Search, Category Filter & Sorting Row */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-1">
            
            {/* Search Box */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={getTranslation(
                  "পণ্যের নাম বা ক্যাটাগরি দিয়ে খুঁজুন...",
                  "Search sold product by name or category..."
                )}
                className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 font-medium transition shadow-2xs"
              />
            </div>

            {/* Controls Right: Category Filter + Sort Selectors */}
            <div className="flex items-center gap-2 flex-wrap">
              
              {/* Category Filter */}
              {availableCategories.length > 0 && (
                <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-600 shadow-2xs">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer capitalize"
                  >
                    <option value="all">{getTranslation("সকল ক্যাটাগরি", "All Categories")}</option>
                    {availableCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Sort By Selector */}
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-600 shadow-2xs">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
                >
                  <option value="sales">{getTranslation("সর্বোচ্চ বিক্রি (৳)", "Highest Sales (৳)")}</option>
                  <option value="quantity">{getTranslation("সর্বাধিক পরিমাণ", "Highest Quantity")}</option>
                  <option value="name">{getTranslation("পণ্যের নাম (A-Z)", "Product Name (A-Z)")}</option>
                </select>
                
                <button
                  onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
                  className="p-0.5 text-slate-400 hover:text-slate-700 font-mono text-[10px]"
                  title={sortOrder === "desc" ? "Descending" : "Ascending"}
                >
                  {sortOrder === "desc" ? "▼" : "▲"}
                </button>
              </div>

            </div>
          </div>
        </div>

        {/* Product Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4 text-center w-12">#</th>
                <th className="py-3 px-4">{getTranslation("পণ্যের নাম ও বিবরণ", "Product Name & Category")}</th>
                <th className="py-3 px-4 text-center">{getTranslation("বিক্রিত পরিমাণ (Sold Quantity)", "Sold Quantity")}</th>
                <th className="py-3 px-4 text-center">{getTranslation("মোট ওজন (kg / gm)", "Total Weight")}</th>
                <th className="py-3 px-4 text-right">{getTranslation("গড় একক মূল্য", "Avg Unit Price")}</th>
                <th className="py-3 px-4 text-right">{getTranslation("মোট বিক্রয় মূল্য (Total Amount)", "Total Sales Amount")}</th>
                <th className="py-3 px-4 text-right w-24">{getTranslation("শেয়ার %", "% Share")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {displayedProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Package className="w-8 h-8 text-slate-300" />
                      <p className="font-bold text-slate-600">
                        {getTranslation(
                          "নির্বাচিত সময়ে কোনো ডেলিভারড পণ্যের বিক্রয় রেকর্ড পাওয়া যায়নি।",
                          "No delivered products sold in the selected time period."
                        )}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {getTranslation(
                          "নতুন অর্ডার ডেলিভারড (Delivered/Completed) স্ট্যাটাসে পৌঁছালে স্বয়ংক্রিয়ভাবে এখানে হিসাব দেখতে পাবেন।",
                          "When an order is marked as delivered, items will automatically populate here in real-time."
                        )}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                displayedProducts.map((prod, index) => {
                  const sharePercentage = metrics.totalRevenue > 0
                    ? ((prod.totalSalesAmount / metrics.totalRevenue) * 100).toFixed(1)
                    : "0.0";

                  const weightFormatted = prod.isWeightBased && prod.totalWeightGrams > 0
                    ? formatTotalWeight(prod.totalWeightGrams, lang).displayShort
                    : null;

                  return (
                    <tr 
                      key={prod.productId || index} 
                      className="hover:bg-slate-50/80 transition group"
                    >
                      {/* Serial */}
                      <td className="py-3.5 px-4 text-center font-mono text-slate-400 text-xs">
                        {index + 1}
                      </td>

                      {/* Product Name & Image */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {prod.image ? (
                            <img
                              src={prod.image}
                              alt={prod.nameBn}
                              className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0 shadow-2xs"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                              <Package className="w-5 h-5" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="font-extrabold text-slate-900 text-xs sm:text-[13px] leading-tight flex items-center gap-1.5">
                              <span className="truncate">{lang === "bn" ? prod.nameBn : prod.nameEn}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400 font-medium">
                              <span className="truncate">{lang === "bn" ? prod.nameEn : prod.nameBn}</span>
                              {prod.category && (
                                <>
                                  <span>•</span>
                                  <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-bold uppercase text-[9px]">
                                    {prod.category}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Sold Quantity */}
                      <td className="py-3.5 px-4 text-center align-middle">
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-black text-xs font-mono">
                          <span>{convertWesternDigitsToBengali(prod.totalQuantity)}</span>
                          <span className="text-[10px] font-normal text-slate-500">{prod.unit}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {convertWesternDigitsToBengali(prod.ordersCount)}টি অর্ডারে
                        </div>
                      </td>

                      {/* Total Weight Sold (kg / gm) */}
                      <td className="py-3.5 px-4 text-center align-middle">
                        {weightFormatted ? (
                          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 font-black text-xs border border-teal-200/60">
                            <Scale className="w-3 h-3 text-teal-600" />
                            <span>{weightFormatted}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px] font-medium">—</span>
                        )}
                      </td>

                      {/* Unit Price */}
                      <td className="py-3.5 px-4 text-right font-mono text-slate-600 font-medium align-middle">
                        ৳{prod.avgPrice.toLocaleString()}
                      </td>

                      {/* Total Sales Amount (৳) */}
                      <td className="py-3.5 px-4 text-right align-middle">
                        <div className="text-sm sm:text-base font-black text-slate-950 font-mono">
                          ৳{prod.totalSalesAmount.toLocaleString()}
                        </div>
                      </td>

                      {/* Revenue Share % */}
                      <td className="py-3.5 px-4 text-right align-middle">
                        <div className="space-y-1">
                          <span className="text-[11px] font-black text-emerald-700 font-mono">
                            {sharePercentage}%
                          </span>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(100, Number(sharePercentage))}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {displayedProducts.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 font-black text-xs text-slate-900 border-t-2 border-slate-200">
                  <td colSpan={2} className="py-3.5 px-4 text-right uppercase tracking-wider">
                    {getTranslation("সর্বমোট (Total):", "Total Aggregate:")}
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono">
                    {convertWesternDigitsToBengali(metrics.totalItemsQuantitySold)}টি
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono text-teal-800">
                    {metrics.weightFormatted.displayShort}
                  </td>
                  <td className="py-3.5 px-4 text-right text-slate-500">
                    —
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-emerald-800 text-sm sm:text-base">
                    ৳{metrics.totalRevenue.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-right text-emerald-700 font-mono">
                    100%
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

      </div>

    </div>
  );
}
