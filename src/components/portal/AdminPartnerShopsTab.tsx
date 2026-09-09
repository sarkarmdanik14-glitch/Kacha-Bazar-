import React, { useState, useEffect, useMemo } from "react";
import { PartnerShop, PartnerShopStatus } from "../../types";
import { db, collection, onSnapshot } from "../../lib/firebase";
import { 
  subscribeToPartnerShops, 
  createPartnerShop, 
  updatePartnerShop, 
  deletePartnerShop, 
  togglePartnerShopStatus,
  generateNextPartnerId,
  computePartnerMetricsFromOrders,
  PartnerFinancialMetrics
} from "../../lib/partnerManager";
import { 
  Store, Plus, Search, Filter, Edit, Trash2, CheckCircle2, 
  AlertTriangle, Ban, Power, DollarSign, Percent, User, Phone, 
  MapPin, Calendar, CreditCard, ShieldCheck, RefreshCw, X, 
  TrendingUp, ShoppingBag, Eye, EyeOff, FileText, Check, Award
} from "lucide-react";

interface AdminPartnerShopsTabProps {
  currentUser: any;
  lang: "bn" | "en";
  triggerToast: (bn: string, en: string) => void;
}

export default function AdminPartnerShopsTab({ currentUser, lang, triggerToast }: AdminPartnerShopsTabProps) {
  const getTranslation = (bn: string, en: string) => (lang === "bn" ? bn : en);

  const [shops, setShops] = useState<PartnerShop[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"all" | PartnerShopStatus>("all");
  const [activeSubTab, setActiveSubTab] = useState<"shops" | "reports">("shops");

  // Modal states
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingShop, setEditingShop] = useState<PartnerShop | null>(null);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Form states
  const [formShopName, setFormShopName] = useState<string>("");
  const [formOwnerName, setFormOwnerName] = useState<string>("");
  const [formMobile, setFormMobile] = useState<string>("");
  const [formEmail, setFormEmail] = useState<string>("");
  const [formAddress, setFormAddress] = useState<string>("");
  const [formCategory, setFormCategory] = useState<string>("শাক-সবজি ও তাজা ফলমূল");
  const [formCommissionRate, setFormCommissionRate] = useState<number>(10);
  const [formStatus, setFormStatus] = useState<PartnerShopStatus>("active");
  const [formPassword, setFormPassword] = useState<string>("");
  const [formLogo, setFormLogo] = useState<string>("");
  const [formPaymentMethod, setFormPaymentMethod] = useState<string>("bKash");
  const [formAccountNumber, setFormAccountNumber] = useState<string>("");

  // Real-time subscription to partner shops
  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToPartnerShops((updatedShops) => {
      setShops(updatedShops);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Real-time subscription to orders for dynamic sales & commission reporting
  const [allOrders, setAllOrders] = useState<any[]>([]);
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "orders"),
      (snap) => {
        const list: any[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
        setAllOrders(list);
      },
      (err) => {
        console.warn("Orders subscription in AdminPartnerShopsTab:", err);
      }
    );
    return () => unsub();
  }, []);

  const openAddModal = () => {
    setEditingShop(null);
    const nextId = generateNextPartnerId(shops);
    setFormShopName("");
    setFormOwnerName("");
    setFormMobile("");
    setFormEmail(`${nextId.toLowerCase()}@kachabazar.com`);
    setFormAddress("");
    setFormCategory("শাক-সবজি ও তাজা ফলমূল");
    setFormCommissionRate(10);
    setFormStatus("active");
    setFormPassword("partner123");
    setFormLogo("https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=300&q=80");
    setFormPaymentMethod("bKash");
    setFormAccountNumber("");
    setShowModal(true);
  };

  const openEditModal = (shop: PartnerShop) => {
    setEditingShop(shop);
    setFormShopName(shop.shopName);
    setFormOwnerName(shop.ownerName);
    setFormMobile(shop.mobile);
    setFormEmail(shop.email);
    setFormAddress(shop.address);
    setFormCategory(shop.category);
    setFormCommissionRate(shop.commissionRate);
    setFormStatus(shop.status);
    setFormPassword(shop.plainPassword || "partner123");
    setFormLogo(shop.logo);
    setFormPaymentMethod(shop.paymentMethod || "bKash");
    setFormAccountNumber(shop.accountNumber || "");
    setShowModal(true);
  };

  const handleSaveShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formShopName.trim() || !formOwnerName.trim() || !formMobile.trim()) {
      triggerToast("অনুগ্রহ করে সব প্রয়োজনীয় তথ্য পূরণ করুন।", "Please fill in all required fields.");
      return;
    }

    setSubmitting(true);
    try {
      if (editingShop) {
        // Update
        await updatePartnerShop(editingShop.id, {
          shopName: formShopName,
          ownerName: formOwnerName,
          mobile: formMobile,
          email: formEmail,
          address: formAddress,
          category: formCategory,
          commissionRate: Number(formCommissionRate),
          status: formStatus,
          plainPassword: formPassword,
          logo: formLogo,
          paymentMethod: formPaymentMethod,
          accountNumber: formAccountNumber
        });
        triggerToast("পার্টনার শপ সফলভাবে আপডেট করা হয়েছে!", "Partner shop successfully updated!");
      } else {
        // Create new
        const nextId = generateNextPartnerId(shops);
        await createPartnerShop({
          partnerId: nextId,
          shopName: formShopName,
          ownerName: formOwnerName,
          mobile: formMobile,
          email: formEmail,
          address: formAddress,
          category: formCategory,
          commissionRate: Number(formCommissionRate),
          status: formStatus,
          plainPassword: formPassword,
          logo: formLogo,
          paymentMethod: formPaymentMethod,
          accountNumber: formAccountNumber,
          joiningDate: new Date().toLocaleDateString("bn-BD", { year: "numeric", month: "long", day: "numeric" })
        });
        triggerToast("নতুন পার্টনার শপ সফলভাবে যোগ করা হয়েছে!", "New partner shop successfully added!");
      }
      setShowModal(false);
    } catch (err: any) {
      console.error("Save partner shop error:", err);
      triggerToast("সংরক্ষণে সমস্যা হয়েছে। পুনরায় চেষ্টা করুন।", "Failed to save partner shop.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (shop: PartnerShop) => {
    const newStatus: PartnerShopStatus = shop.status === "active" ? "suspended" : "active";
    const confirmMsg = newStatus === "suspended" 
      ? getTranslation(`আপনি কি নিশ্চিত "${shop.shopName}" এর কার্যক্রম স্থগিত (Suspend) করতে চান?`, `Are you sure you want to suspend "${shop.shopName}"?`)
      : getTranslation(`আপনি কি "${shop.shopName}" পুনরায় সক্রিয় (Activate) করতে চান?`, `Do you want to re-activate "${shop.shopName}"?`);
    
    if (window.confirm(confirmMsg)) {
      await togglePartnerShopStatus(shop.id, newStatus);
      triggerToast(
        newStatus === "active" ? "পার্টনার শপ সক্রিয় করা হয়েছে।" : "পার্টনার শপ স্থগিত করা হয়েছে।",
        newStatus === "active" ? "Partner shop activated." : "Partner shop suspended."
      );
    }
  };

  const handleDelete = async (shop: PartnerShop) => {
    const confirmMsg = getTranslation(
      `সতর্কতা! "${shop.shopName}" (${shop.partnerId}) স্থায়ীভাবে ডিলিট করতে চান?`,
      `Warning! Permanently delete "${shop.shopName}" (${shop.partnerId})?`
    );
    if (window.confirm(confirmMsg)) {
      await deletePartnerShop(shop.id);
      triggerToast("পার্টনার শপ ডিলিট করা হয়েছে।", "Partner shop deleted.");
    }
  };

  // Filtered shops
  const filteredShops = shops.filter(shop => {
    const matchesSearch = 
      shop.shopName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shop.partnerId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shop.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shop.mobile.includes(searchQuery);
    
    const matchesStatus = statusFilter === "all" || shop.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Compute real-time metrics strictly from database orders
  const shopMetricsMap = useMemo(() => {
    const map: Record<string, PartnerFinancialMetrics> = {};
    shops.forEach((shop) => {
      map[shop.id] = computePartnerMetricsFromOrders(shop, allOrders);
    });
    return map;
  }, [shops, allOrders]);

  // Calculate high-level financial summary
  const totalShopsCount = shops.length;
  const activeShopsCount = shops.filter(s => s.status === "active").length;
  const totalGrossSales = Object.values(shopMetricsMap).reduce((acc, m) => acc + m.totalSales, 0);
  const totalCommissionEarned = Object.values(shopMetricsMap).reduce((acc, m) => acc + m.totalCommission, 0);
  const totalPartnerEarnings = Object.values(shopMetricsMap).reduce((acc, m) => acc + m.netEarnings, 0);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Header & Metrics Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-black uppercase tracking-wider mb-2 border border-emerald-500/30">
              <Store className="w-3.5 h-3.5" />
              <span>{getTranslation("পার্টনার শপ ম্যানেজমেন্ট", "Partner Shop Management")}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              {getTranslation("অনবোর্ডেড পার্টনার ও কমিশন কন্ট্রোল", "Partner Shops & Commission Control")}
            </h2>
            <p className="text-xs text-emerald-100/80 mt-1 max-w-xl">
              {getTranslation(
                "কাঁচাবাজারের অনুমোদিত বিক্রেতা দোকান পরিচালনা করুন, কমিশন রেট কনফিগার করুন এবং স্বয়ংক্রিয় সেলস ও পে-আউট রিপোর্ট দেখুন।",
                "Manage verified merchant shops, configure custom commission rates, and track automated partner sales and payouts."
              )}
            </p>
          </div>

          <button
            onClick={openAddModal}
            className="inline-flex items-center justify-center space-x-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-5 py-3 rounded-2xl shadow-lg hover:shadow-emerald-500/30 transition-all cursor-pointer text-xs uppercase tracking-wider shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>{getTranslation("নতুন পার্টনার শপ যোগ করুন", "Add Partner Shop")}</span>
          </button>
        </div>

        {/* 4 Key Stat Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10">
            <span className="text-[10px] uppercase font-bold text-emerald-200 block">
              {getTranslation("মোট পার্টনার দোকান", "Total Partner Shops")}
            </span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-xl sm:text-2xl font-black">{totalShopsCount}</span>
              <span className="text-[10px] text-emerald-300 font-bold">({activeShopsCount} {getTranslation("সক্রিয়", "Active")})</span>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10">
            <span className="text-[10px] uppercase font-bold text-emerald-200 block">
              {getTranslation("পার্টনার মোট বিক্রয়", "Gross Partner Sales")}
            </span>
            <div className="flex items-baseline space-x-1 mt-1">
              <span className="text-xl sm:text-2xl font-black">৳{totalGrossSales.toLocaleString()}</span>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10">
            <span className="text-[10px] uppercase font-bold text-emerald-200 block">
              {getTranslation("এডমিন কমিশন (আয়)", "Admin Commission")}
            </span>
            <div className="flex items-baseline space-x-1 mt-1 text-emerald-300">
              <span className="text-xl sm:text-2xl font-black">৳{totalCommissionEarned.toLocaleString()}</span>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10">
            <span className="text-[10px] uppercase font-bold text-emerald-200 block">
              {getTranslation("পার্টনার প্রদেয় নিট আয়", "Net Partner Earnings")}
            </span>
            <div className="flex items-baseline space-x-1 mt-1 text-teal-200">
              <span className="text-xl sm:text-2xl font-black">৳{totalPartnerEarnings.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-tab Navigation (Shops List vs Financial Reports) */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveSubTab("shops")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center space-x-2 ${
              activeSubTab === "shops"
                ? "bg-slate-900 text-white shadow"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>{getTranslation("দোকান তালিকা ও কন্ট্রোল", "Partner Shops List")}</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-600 font-black">
              {filteredShops.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab("reports")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center space-x-2 ${
              activeSubTab === "reports"
                ? "bg-slate-900 text-white shadow"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{getTranslation("পার্টনার-ভিত্তিক সেলস ও পে-আউট রিপোর্ট", "Partner Sales & Commission Reports")}</span>
          </button>
        </div>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={getTranslation("শপ নাম, পার্টনার আইডি বা মোবাইল দিয়ে খুঁজুন...", "Search shop name, partner ID, phone...")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-emerald-500 outline-none font-medium"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{getTranslation("স্ট্যাটাস:", "Status:")}</span>
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {(["all", "active", "suspended"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  statusFilter === st
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {st === "all" && getTranslation("সকল", "All")}
                {st === "active" && getTranslation("সক্রিয়", "Active")}
                {st === "suspended" && getTranslation("স্থগিত", "Suspended")}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* VIEW 1: PARTNER SHOPS CARDS / LIST */}
      {activeSubTab === "shops" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
          {loading ? (
            <div className="col-span-full py-16 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                {getTranslation("পার্টনার শপ লোড হচ্ছে...", "Loading Partner Shops...")}
              </p>
            </div>
          ) : filteredShops.length === 0 ? (
            <div className="col-span-full py-16 text-center bg-white rounded-3xl border border-dashed border-slate-200 p-8">
              <Store className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-600">
                {getTranslation("কোনো পার্টনার শপ পাওয়া যায়নি।", "No partner shops found.")}
              </p>
              <button
                onClick={openAddModal}
                className="mt-4 inline-flex items-center space-x-2 bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-emerald-700 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{getTranslation("প্রথম পার্টনার শপ যোগ করুন", "Add First Partner Shop")}</span>
              </button>
            </div>
          ) : (
            filteredShops.map((shop) => (
              <div
                key={shop.id}
                className={`bg-white rounded-3xl border transition-all duration-200 overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-md ${
                  shop.status === "suspended"
                    ? "border-amber-200 bg-amber-50/20"
                    : "border-slate-100 hover:border-emerald-200"
                }`}
              >
                {/* Card Top */}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <img
                        src={shop.logo || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=300&q=80"}
                        alt={shop.shopName}
                        className="w-13 h-13 rounded-2xl object-cover border border-slate-100 shadow-sm shrink-0 bg-slate-50"
                        onError={(e: any) => {
                          e.target.src = "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=300&q=80";
                        }}
                      />
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-900 text-emerald-400 font-mono tracking-wide">
                            {shop.partnerId}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              shop.status === "active"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {shop.status === "active" ? getTranslation("সক্রিয়", "Active") : getTranslation("স্থগিত", "Suspended")}
                          </span>
                        </div>
                        <h3 className="font-black text-slate-800 text-sm mt-1 leading-tight line-clamp-1">
                          {shop.shopName}
                        </h3>
                        <p className="text-[11px] text-emerald-600 font-bold mt-0.5">
                          {shop.category}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="flex items-center space-x-1.5 text-slate-400">
                        <User className="w-3.5 h-3.5" />
                        <span>{getTranslation("মালিক:", "Owner:")}</span>
                      </span>
                      <span className="font-bold text-slate-800">{shop.ownerName}</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600">
                      <span className="flex items-center space-x-1.5 text-slate-400">
                        <Phone className="w-3.5 h-3.5" />
                        <span>{getTranslation("মোবাইল:", "Phone:")}</span>
                      </span>
                      <span className="font-bold font-mono text-slate-800">{shop.mobile}</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600">
                      <span className="flex items-center space-x-1.5 text-slate-400">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{getTranslation("ঠিকানা:", "Address:")}</span>
                      </span>
                      <span className="font-bold text-slate-700 max-w-[180px] truncate text-right">{shop.address}</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600">
                      <span className="flex items-center space-x-1.5 text-slate-400">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{getTranslation("যোগদান:", "Joined:")}</span>
                      </span>
                      <span className="text-slate-600 font-medium">{shop.joiningDate}</span>
                    </div>

                    {/* Commission Badge */}
                    <div className="bg-emerald-50 rounded-xl p-2.5 mt-2 flex items-center justify-between border border-emerald-100">
                      <div className="flex items-center space-x-1.5">
                        <Percent className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-[11px] font-bold text-emerald-900">{getTranslation("কমিশন রেট", "Commission Rate")}</span>
                      </div>
                      <span className="text-sm font-black text-emerald-700 bg-white px-2.5 py-0.5 rounded-lg border border-emerald-200 shadow-xs">
                        {shop.commissionRate}%
                      </span>
                    </div>

                    {/* Login Info Pill for Admin convenience */}
                    {shop.plainPassword && (
                      <div className="bg-slate-50 rounded-xl p-2 flex items-center justify-between text-[11px] font-mono border border-slate-200/70">
                        <span className="text-slate-400 font-bold">{getTranslation("লগইন পাসওয়ার্ড:", "Password:")}</span>
                        <span className="font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {shop.plainPassword}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="bg-slate-50/80 px-5 py-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleToggleStatus(shop)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 ${
                      shop.status === "active"
                        ? "bg-amber-100 hover:bg-amber-200 text-amber-800"
                        : "bg-emerald-100 hover:bg-emerald-200 text-emerald-800"
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>{shop.status === "active" ? getTranslation("স্থগিত করুন", "Suspend") : getTranslation("সক্রিয় করুন", "Activate")}</span>
                  </button>

                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => openEditModal(shop)}
                      className="p-2 rounded-xl bg-white hover:bg-slate-200 text-slate-600 transition border border-slate-200 cursor-pointer shadow-xs"
                      title={getTranslation("সম্পাদনা করুন", "Edit Shop")}
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(shop)}
                      className="p-2 rounded-xl bg-white hover:bg-red-50 text-red-500 transition border border-slate-200 hover:border-red-200 cursor-pointer shadow-xs"
                      title={getTranslation("ডিলিট করুন", "Delete Shop")}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* VIEW 2: PARTNER-WISE SALES, COMMISSION & PAYOUT REPORTS */}
      {activeSubTab === "reports" && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-black text-slate-800 text-base">
                {getTranslation("পার্টনার-ভিত্তিক বিক্রয়, কমিশন ও আয় রিপোর্ট", "Partner-wise Sales, Commission & Earnings Report")}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {getTranslation(
                  "প্রতিটি পার্টনারের মোট বিক্রয়, এডমিন কমিশন এবং প্রদেয় নিট আয়ের পুঙ্খানুপুঙ্খ বিবরণ। সূত্র: পার্টনার আয় = মোট বিক্রয় - কমিশন।",
                  "Financial breakdown of partner gross sales, admin commission and net earnings. Formula: Earnings = Sales - Commission."
                )}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-400 uppercase font-black text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3.5">{getTranslation("পার্টনার শপ", "Partner Shop")}</th>
                  <th className="px-5 py-3.5">{getTranslation("মালিক ও ফোন", "Owner & Mobile")}</th>
                  <th className="px-5 py-3.5 text-center">{getTranslation("মোট অর্ডার", "Orders")}</th>
                  <th className="px-5 py-3.5 text-right">{getTranslation("মোট বিক্রয় (৳)", "Gross Sales")}</th>
                  <th className="px-5 py-3.5 text-center">{getTranslation("কমিশন রেট", "Rate")}</th>
                  <th className="px-5 py-3.5 text-right text-emerald-700">{getTranslation("এডমিন কমিশন (৳)", "Commission")}</th>
                  <th className="px-5 py-3.5 text-right text-teal-700">{getTranslation("পার্টনার নিট আয় (৳)", "Net Earnings")}</th>
                  <th className="px-5 py-3.5 text-center">{getTranslation("স্ট্যাটাস", "Status")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredShops.map((shop) => {
                  const metrics = shopMetricsMap[shop.id] || { 
                    totalOrders: 0, 
                    totalSales: 0, 
                    totalCommission: 0, 
                    netEarnings: 0, 
                    balance: 0 
                  };
                  return (
                    <tr key={shop.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-5 py-4">
                        <div className="flex items-center space-x-3">
                          <img
                            src={shop.logo}
                            alt={shop.shopName}
                            className="w-9 h-9 rounded-xl object-cover border border-slate-100"
                            onError={(e: any) => {
                              e.target.src = "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=300&q=80";
                            }}
                          />
                          <div>
                            <div className="flex items-center space-x-1.5">
                              <span className="font-mono text-[10px] font-black text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                                {shop.partnerId}
                              </span>
                            </div>
                            <p className="font-bold text-slate-800 text-xs mt-0.5 line-clamp-1">{shop.shopName}</p>
                            <span className="text-[10px] text-slate-400">{shop.category}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-800">{shop.ownerName}</p>
                        <p className="font-mono text-slate-500 text-[11px]">{shop.mobile}</p>
                      </td>

                      <td className="px-5 py-4 text-center font-black text-slate-700">
                        {metrics.totalOrders}
                      </td>

                      <td className="px-5 py-4 text-right font-black text-slate-800">
                        ৳{metrics.totalSales.toLocaleString()}
                      </td>

                      <td className="px-5 py-4 text-center">
                        <span className="px-2 py-0.5 rounded-full font-black text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {shop.commissionRate}%
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right font-black text-emerald-700">
                        ৳{metrics.totalCommission.toLocaleString()}
                      </td>

                      <td className="px-5 py-4 text-right font-black text-teal-700">
                        ৳{metrics.netEarnings.toLocaleString()}
                      </td>

                      <td className="px-5 py-4 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            shop.status === "active"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {shop.status === "active" ? getTranslation("সক্রিয়", "Active") : getTranslation("স্থগিত", "Suspended")}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADD / EDIT PARTNER SHOP MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-100 my-8">
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Store className="w-5 h-5 text-emerald-400" />
                <h3 className="font-black text-base">
                  {editingShop 
                    ? getTranslation(`পার্টনার শপ সম্পাদনা (${editingShop.partnerId})`, `Edit Partner Shop (${editingShop.partnerId})`)
                    : getTranslation("নতুন পার্টনার শপ যোগ করুন", "Add New Partner Shop")
                  }
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-full hover:bg-slate-800 transition text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveShop} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Shop Name */}
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                    {getTranslation("দোকানের নাম (Shop Name) *", "Shop Name *")}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="যেমনঃ গ্রিন ভ্যালি এগ্রো স্টোর"
                    value={formShopName}
                    onChange={(e) => setFormShopName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:bg-white focus:border-emerald-500 outline-none font-bold"
                  />
                </div>

                {/* Owner Name */}
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                    {getTranslation("মালিকের নাম (Owner Name) *", "Owner Name *")}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="যেমনঃ মোঃ রফিকুল ইসলাম"
                    value={formOwnerName}
                    onChange={(e) => setFormOwnerName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:bg-white focus:border-emerald-500 outline-none font-bold"
                  />
                </div>

                {/* Mobile Phone */}
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                    {getTranslation("মোবাইল নম্বর (Phone) *", "Mobile Phone *")}
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="017XXXXXXXX"
                    value={formMobile}
                    onChange={(e) => setFormMobile(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:bg-white focus:border-emerald-500 outline-none font-mono"
                  />
                </div>

                {/* Email / Login Identifier */}
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                    {getTranslation("লগইন ইমেইল / ইউজারনেম *", "Login Email / Username *")}
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="partner@kachabazar.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:bg-white focus:border-emerald-500 outline-none font-mono"
                  />
                </div>

                {/* Secure Password */}
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                    {getTranslation("পার্টনার পাসওয়ার্ড (Password) *", "Partner Password *")}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Enter partner password"
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3.5 pr-10 py-2.5 text-xs focus:bg-white focus:border-emerald-500 outline-none font-mono font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Commission Rate (%) */}
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1 flex items-center justify-between">
                    <span>{getTranslation("এডমিন কমিশন রেট (%) *", "Admin Commission Rate (%) *")}</span>
                    <span className="text-emerald-600 font-black">{formCommissionRate}%</span>
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      required
                      min={0}
                      max={50}
                      step={0.5}
                      value={formCommissionRate}
                      onChange={(e) => setFormCommissionRate(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:bg-white focus:border-emerald-500 outline-none font-black text-emerald-700"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {getTranslation("যেমনঃ ৮% বা ১০%। প্রতিটি অর্ডারে স্বয়ংক্রিয়ভাবে এডমিনের কমিশন হিসেবে কর্তিত হবে।", "e.g., 8% or 10%. Deducted automatically on every order.")}
                  </p>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                    {getTranslation("শপ ক্যাটাগরি (Category)", "Shop Category")}
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:bg-white focus:border-emerald-500 outline-none font-bold"
                  >
                    <option value="শাক-সবজি ও তাজা ফলমূল">শাক-সবজি ও তাজা ফলমূল (Fresh Vegetables & Fruits)</option>
                    <option value="দুধ, ডিম ও পোল্ট্রি">দুধ, ডিম ও পোল্ট্রি (Dairy & Poultry)</option>
                    <option value="তাজা দেশি মাছ ও সামুদ্রিক মাছ">তাজা দেশি মাছ ও সামুদ্রিক মাছ (Fresh Fish)</option>
                    <option value="চাল, ডাল ও তেল-মসলা">চাল, ডাল ও তেল-মসলা (Staples & Spices)</option>
                    <option value="মাংস ও প্রক্রিয়াজাত খাদ্য">মাংস ও প্রক্রিয়াজাত খাদ্য (Meat & Frozen)</option>
                    <option value="বেকারি ও অন্যান্য গ্রোসারি">বেকারি ও অন্যান্য গ্রোসারি (Bakery & Snacks)</option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                    {getTranslation("অ্যাকাউন্ট স্ট্যাটাস", "Account Status")}
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as PartnerShopStatus)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:bg-white focus:border-emerald-500 outline-none font-bold"
                  >
                    <option value="active">Active (সক্রিয় - শপ লাইভ থাকবে)</option>
                    <option value="suspended">Suspended (স্থগিত - সাময়িক বন্ধ)</option>
                  </select>
                </div>
              </div>

              {/* Full Address */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                  {getTranslation("দোকানের পূর্ণ ঠিকানা (Address) *", "Shop Address *")}
                </label>
                <input
                  type="text"
                  required
                  placeholder="যেমনঃ দোকান #১২, মিরপুর-১ কাঁচাবাজার, ঢাকা"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:bg-white focus:border-emerald-500 outline-none"
                />
              </div>

              {/* Logo URL */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                  {getTranslation("দোকানের লোগো / ছবি URL", "Shop Logo / Image URL")}
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={formLogo}
                  onChange={(e) => setFormLogo(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:bg-white focus:border-emerald-500 outline-none font-mono"
                />
              </div>

              {/* Payment Settlement Information */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70 space-y-3">
                <span className="text-[11px] font-black uppercase text-slate-700 block flex items-center space-x-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{getTranslation("পে-আউট সেটেলমেন্ট তথ্য (Payout Details)", "Payout Settlement Details")}</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">পেমেন্ট মেথড</label>
                    <select
                      value={formPaymentMethod}
                      onChange={(e) => setFormPaymentMethod(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none font-bold"
                    >
                      <option value="bKash">bKash (বিকাশ)</option>
                      <option value="Nagad">Nagad (নগদ)</option>
                      <option value="Bank Transfer">Bank Transfer (ব্যাংক অ্যাকাউন্ট)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">অ্যাকাউন্ট নম্বর</label>
                    <input
                      type="text"
                      placeholder="01XXXXXXXXX / Bank Acc No"
                      value={formAccountNumber}
                      onChange={(e) => setFormAccountNumber(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
                >
                  {getTranslation("বাতিল", "Cancel")}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-6 py-2.5 rounded-xl transition shadow-md cursor-pointer flex items-center space-x-2"
                >
                  {submitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                  <span>{getTranslation("সংরক্ষণ করুন", "Save Partner Shop")}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
