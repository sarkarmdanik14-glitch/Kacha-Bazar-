import React, { useState, useEffect, useMemo } from "react";
import { PartnerShop, Product } from "../../types";
import { 
  db, 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp, 
  onSnapshot 
} from "../../lib/firebase";
import { 
  updatePartnerShop, 
  calculateEarnings, 
  logoutPartnerSession,
  computePartnerMetricsFromOrders
} from "../../lib/partnerManager";
import { 
  Store, ShoppingBag, Layers, DollarSign, TrendingUp, 
  Plus, Edit, Trash2, CheckCircle2, AlertTriangle, 
  LogOut, RefreshCw, Search, Filter, Phone, MapPin, 
  Calendar, Check, X, CreditCard, ChevronRight, Eye, 
  Clock, ArrowUpRight, Percent, PackageCheck, AlertCircle
} from "lucide-react";
import DeleteProductConfirmModal from "./DeleteProductConfirmModal";

interface PartnerShopPanelProps {
  partner: PartnerShop;
  onLogout: () => void;
  lang: "bn" | "en";
  triggerToast: (bn: string, en: string) => void;
}

export default function PartnerShopPanel({ partner, onLogout, lang, triggerToast }: PartnerShopPanelProps) {
  const getTranslation = (bn: string, en: string) => (lang === "bn" ? bn : en);

  const [activeTab, setActiveTab] = useState<"overview" | "products" | "orders" | "ledger" | "settings">("overview");
  const [products, setProducts] = useState<Product[]>([]);
  const [productPendingDelete, setProductPendingDelete] = useState<Product | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [partnerData, setPartnerData] = useState<PartnerShop>(partner);

  // Search & Filter
  const [productSearch, setProductSearch] = useState<string>("");
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("all");

  // Product Add/Edit Modal
  const [showProductModal, setShowProductModal] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [prodNameBn, setProdNameBn] = useState<string>("");
  const [prodNameEn, setProdNameEn] = useState<string>("");
  const [prodPrice, setProdPrice] = useState<number>(0);
  const [prodStock, setProdStock] = useState<number>(50);
  const [prodCategory, setProdCategory] = useState<string>("vegetables");
  const [prodUnitBn, setProdUnitBn] = useState<string>("কেজি");
  const [prodUnitEn, setProdUnitEn] = useState<string>("kg");
  const [prodImage, setProdImage] = useState<string>("");
  const [prodDescBn, setProdDescBn] = useState<string>("");
  const [prodDescEn, setProdDescEn] = useState<string>("");
  const [prodIsAvailable, setProdIsAvailable] = useState<boolean>(true);
  const [submittingProduct, setSubmittingProduct] = useState<boolean>(false);

  // Payout request modal
  const [showPayoutModal, setShowPayoutModal] = useState<boolean>(false);
  const [payoutAmount, setPayoutAmount] = useState<number>(0);
  const [payoutMethod, setPayoutMethod] = useState<string>(partner.paymentMethod || "bKash");
  const [payoutAccount, setPayoutAccount] = useState<string>(partner.accountNumber || partner.mobile || "");

  // Real-time listener for partner's shop document
  useEffect(() => {
    if (!partner?.id) return;
    const unsub = onSnapshot(doc(db, "partner_shops", partner.id), (snap) => {
      if (snap.exists()) {
        setPartnerData({ id: snap.id, ...(snap.data() as any) });
      }
    });
    return () => unsub();
  }, [partner.id]);

  // Real-time listener for products belonging to this partner shop
  useEffect(() => {
    if (!partner?.id && !partner?.partnerId) return;

    setLoading(true);
    // Query products where partnerShopId or partnerId matches
    const prodQ = query(
      collection(db, "products"),
      where("partnerShopId", "in", [partner.id, partner.partnerId])
    );

    const unsubProds = onSnapshot(
      prodQ,
      (snapshot) => {
        const items: Product[] = [];
        snapshot.forEach((d) => {
          const data = d.data() as any;
          if (data.isDeleted === true || data.status === "deleted" || data.deleted === true) {
            return;
          }
          items.push({ id: d.id, ...data });
        });
        setProducts(items);
        setLoading(false);
      },
      (err) => {
        console.warn("Notice loading partner products from Firestore:", err.message);
        // Fallback: search client side products
        setLoading(false);
      }
    );

    return () => unsubProds();
  }, [partner.id, partner.partnerId]);

  // Real-time listener for orders assigned to this partner shop
  useEffect(() => {
    if (!partner?.id && !partner?.partnerId) return;

    const unsubOrders = onSnapshot(
      collection(db, "orders"),
      (snapshot) => {
        const assignedOrders: any[] = [];
        snapshot.forEach((docSnap) => {
          const ord = { id: docSnap.id, ...docSnap.data() } as any;
          
          // Check if order contains items from this partner shop
          const hasShopItems = (ord.items || []).some((item: any) => 
            item.product?.partnerShopId === partner.id || 
            item.product?.partnerShopId === partner.partnerId ||
            item.product?.partnerId === partner.partnerId ||
            ord.partnerShopId === partner.id ||
            ord.partnerShopId === partner.partnerId ||
            (ord.partnerShopIds && (ord.partnerShopIds.includes(partner.id) || ord.partnerShopIds.includes(partner.partnerId)))
          );

          if (hasShopItems) {
            assignedOrders.push(ord);
          }
        });
        setOrders(assignedOrders);
      },
      (err) => {
        console.warn("Notice loading partner orders:", err.message);
      }
    );

    return () => unsubOrders();
  }, [partner.id, partner.partnerId]);

  // Compute live partner shop metrics dynamically strictly from database orders
  const commissionRate = typeof partnerData.commissionRate === "number" ? partnerData.commissionRate : 10;
  
  const partnerMetrics = useMemo(() => {
    return computePartnerMetricsFromOrders(partnerData, orders);
  }, [partnerData, orders]);

  const displaySales = partnerMetrics.totalSales;
  const displayCommission = partnerMetrics.totalCommission;
  const displayEarnings = partnerMetrics.netEarnings;
  const displayOrdersCount = partnerMetrics.totalOrders;

  // Handle opening product modal
  const openAddProduct = () => {
    setEditingProduct(null);
    setProdNameBn("");
    setProdNameEn("");
    setProdPrice(50);
    setProdStock(40);
    setProdCategory("vegetables");
    setProdUnitBn("কেজি");
    setProdUnitEn("kg");
    setProdImage("https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=400&q=80");
    setProdDescBn("");
    setProdDescEn("");
    setProdIsAvailable(true);
    setShowProductModal(true);
  };

  const openEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setProdNameBn(prod.nameBn);
    setProdNameEn(prod.nameEn);
    setProdPrice(prod.price);
    setProdStock(prod.stock || 0);
    setProdCategory(prod.category);
    setProdUnitBn(prod.unitBn || "কেজি");
    setProdUnitEn(prod.unitEn || "kg");
    setProdImage(prod.image);
    setProdDescBn(prod.descriptionBn || "");
    setProdDescEn(prod.descriptionEn || "");
    setProdIsAvailable(prod.isAvailable !== false);
    setShowProductModal(true);
  };

  // Save Product (Add or Edit)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodNameBn.trim() || !prodNameEn.trim() || prodPrice <= 0) {
      triggerToast("পণ্যটির নাম এবং সঠিক মূল্য প্রদান করুন।", "Please provide product name and valid price.");
      return;
    }

    setSubmittingProduct(true);
    try {
      if (editingProduct) {
        // Update product in Firestore
        await updateDoc(doc(db, "products", editingProduct.id), {
          nameBn: prodNameBn,
          nameEn: prodNameEn,
          price: Number(prodPrice),
          stock: Number(prodStock),
          category: prodCategory,
          unitBn: prodUnitBn,
          unitEn: prodUnitEn,
          image: prodImage || "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=400&q=80",
          descriptionBn: prodDescBn,
          descriptionEn: prodDescEn,
          isAvailable: prodIsAvailable,
          updatedAt: serverTimestamp()
        });

        // Also update local state
        setProducts(prev => prev.map(p => p.id === editingProduct.id ? {
          ...p,
          nameBn: prodNameBn,
          nameEn: prodNameEn,
          price: Number(prodPrice),
          stock: Number(prodStock),
          category: prodCategory,
          unitBn: prodUnitBn,
          unitEn: prodUnitEn,
          image: prodImage,
          descriptionBn: prodDescBn,
          descriptionEn: prodDescEn,
          isAvailable: prodIsAvailable
        } : p));

        triggerToast("পণ্য সফলভাবে আপডেট করা হয়েছে!", "Product successfully updated!");
      } else {
        // Create new product
        const newProdId = `prod_${partnerData.partnerId.toLowerCase()}_${Date.now()}`;
        const newProductData: any = {
          id: newProdId,
          nameBn: prodNameBn,
          nameEn: prodNameEn,
          price: Number(prodPrice),
          stock: Number(prodStock),
          category: prodCategory,
          unitBn: prodUnitBn,
          unitEn: prodUnitEn,
          image: prodImage || "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=400&q=80",
          descriptionBn: prodDescBn,
          descriptionEn: prodDescEn,
          isAvailable: prodIsAvailable,
          rating: 4.8,
          reviewCount: 5,
          partnerShopId: partnerData.id,
          partnerId: partnerData.partnerId,
          partnerShopName: partnerData.shopName,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        await setDoc(doc(db, "products", newProdId), newProductData);
        setProducts(prev => [newProductData, ...prev]);
        triggerToast("নতুন পণ্য সফলভাবে যুক্ত হয়েছে!", "New product successfully added!");
      }
      setShowProductModal(false);
    } catch (err: any) {
      console.error("Error saving product:", err);
      triggerToast("পণ্য সংরক্ষণে সমস্যা হয়েছে।", "Failed to save product.");
    } finally {
      setSubmittingProduct(false);
    }
  };

  // Quick Stock Adjustment (+5 / -5)
  const handleAdjustStock = async (prod: Product, delta: number) => {
    const newStock = Math.max(0, (prod.stock || 0) + delta);
    try {
      await updateDoc(doc(db, "products", prod.id), { stock: newStock });
      setProducts(prev => prev.map(p => p.id === prod.id ? { ...p, stock: newStock } : p));
      triggerToast(`স্টক আপডেট: ${newStock} ${prod.unitBn}`, `Stock updated: ${newStock} ${prod.unitEn}`);
    } catch (err) {
      console.warn("Stock update error:", err);
    }
  };

  // Toggle In Stock / Out of Stock
  const handleToggleAvailability = async (prod: Product) => {
    const newAvail = prod.isAvailable === false ? true : false;
    try {
      await updateDoc(doc(db, "products", prod.id), { isAvailable: newAvail });
      setProducts(prev => prev.map(p => p.id === prod.id ? { ...p, isAvailable: newAvail } : p));
      triggerToast(
        newAvail ? "পণ্যটি ইন-স্টকে রাখা হয়েছে।" : "পণ্যটি আউট-অফ-স্টক করা হয়েছে।",
        newAvail ? "Product marked In-Stock." : "Product marked Out-of-Stock."
      );
    } catch (err) {
      console.warn("Availability update error:", err);
    }
  };

  // Delete Product
  const handleDeleteProduct = (prod: Product) => {
    setProductPendingDelete(prod);
  };

  // Handle Logout
  const handleLogoutClick = () => {
    logoutPartnerSession();
    onLogout();
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden font-sans">
      {/* Top Header Bar */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5 flex items-center justify-between shrink-0 shadow-xs z-10">
        <div className="flex items-center space-x-3 sm:space-x-4">
          <img
            src={partnerData.logo || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=300&q=80"}
            alt={partnerData.shopName}
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl object-cover border border-slate-100 shadow-sm shrink-0"
            onError={(e: any) => {
              e.target.src = "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=300&q=80";
            }}
          />
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-950 text-emerald-400 font-mono tracking-wide">
                {partnerData.partnerId}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 uppercase flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>{getTranslation("অনুমোদিত পার্টনার", "Verified Partner")}</span>
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                {commissionRate}% {getTranslation("কমিশন রেট", "Commission")}
              </span>
            </div>
            <h1 className="text-sm sm:text-base font-black text-slate-900 leading-tight mt-0.5 line-clamp-1">
              {partnerData.shopName}
            </h1>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              {partnerData.ownerName} • {partnerData.address}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3">
          <button
            onClick={openAddProduct}
            className="hidden sm:inline-flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-3.5 py-2 rounded-xl transition shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{getTranslation("নতুন পণ্য", "Add Product")}</span>
          </button>

          <button
            onClick={handleLogoutClick}
            className="flex items-center space-x-1.5 bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer border border-slate-200"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{getTranslation("লগআউট", "Logout")}</span>
          </button>
        </div>
      </header>

      {/* Navigation Tabs Bar */}
      <nav className="bg-white border-b border-slate-200 px-4 sm:px-6 py-2 flex items-center space-x-1 sm:space-x-2 shrink-0 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center space-x-1.5 shrink-0 ${
            activeTab === "overview"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>{getTranslation("ড্যাশবোর্ড ও রিপোর্ট", "Dashboard & Overview")}</span>
        </button>

        <button
          onClick={() => setActiveTab("products")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center space-x-1.5 shrink-0 ${
            activeTab === "products"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>{getTranslation("আমার পণ্য সম্ভার", "My Products & Stock")}</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold">
            {products.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("orders")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center space-x-1.5 shrink-0 ${
            activeTab === "orders"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>{getTranslation("দোকানের অর্ডারসমূহ", "Shop Orders")}</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold">
            {orders.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("ledger")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center space-x-1.5 shrink-0 ${
            activeTab === "ledger"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>{getTranslation("আয় ও কমিশন লেজার", "Earnings & Commission")}</span>
        </button>
      </nav>

      {/* Content Area */}
      <main className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-6">
        
        {/* 1. OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="space-y-6 animate-fade-in">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider">{getTranslation("মোট বিক্রয়", "Gross Sales")}</span>
                  <ShoppingBag className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-black text-slate-900">৳{displaySales.toLocaleString()}</div>
                <p className="text-[10px] text-slate-400 mt-1">{displayOrdersCount} {getTranslation("টি সম্পন্ন অর্ডার", "orders recorded")}</p>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider">{getTranslation("এডমিন কমিশন", "Admin Fee")}</span>
                  <Percent className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-2xl font-black text-amber-700">৳{displayCommission.toLocaleString()}</div>
                <p className="text-[10px] text-slate-400 mt-1">{commissionRate}% {getTranslation("চুক্তিবদ্ধ ফি", "agreed platform rate")}</p>
              </div>

              <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-5 rounded-3xl text-white shadow-md">
                <div className="flex items-center justify-between text-emerald-200 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider">{getTranslation("আমার নিট আয়", "Net Earnings")}</span>
                  <DollarSign className="w-4 h-4 text-white" />
                </div>
                <div className="text-2xl font-black text-white">৳{displayEarnings.toLocaleString()}</div>
                <p className="text-[10px] text-emerald-100 mt-1">{getTranslation("মোট বিক্রয় − কমিশন", "Sales − Commission")}</p>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider">{getTranslation("পণ্য ও স্টক সংখ্যা", "Products & Stock")}</span>
                  <Layers className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-2xl font-black text-slate-900">{products.length}</div>
                <p className="text-[10px] text-emerald-600 font-bold mt-1">
                  {products.filter(p => p.stock > 0 && p.isAvailable !== false).length} {getTranslation("টি পণ্য ইন-স্টক রয়েছে", "products in stock")}
                </p>
              </div>
            </div>

            {/* Quick Actions & Shop Info Card */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-black text-slate-800 text-sm">
                    {getTranslation("সাম্প্রতিক অর্ডারসমূহ", "Recent Shop Orders")}
                  </h3>
                  <button
                    onClick={() => setActiveTab("orders")}
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                  >
                    {getTranslation("সবগুলো দেখুন", "View All")}
                  </button>
                </div>

                {orders.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs font-bold">
                    {getTranslation("এখনো কোনো অর্ডার আসেনি। নতুন অর্ডার আসলে স্বয়ংক্রিয়ভাবে এখানে প্রদর্শিত হবে।", "No orders received yet. New incoming orders will appear here.")}
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {orders.slice(0, 5).map((ord) => (
                      <div key={ord.id} className="py-3 flex items-center justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-[10px] font-black text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
                              #{ord.id.slice(-6)}
                            </span>
                            <span className="text-xs font-bold text-slate-800">
                              {ord.customerName || ord.name || "Customer"}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {ord.items?.length || 1} items • {ord.deliveryAddress || ord.address}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-slate-900 block">
                            ৳{ord.total || ord.totalAmount}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-600 uppercase">
                            {ord.orderStatus || "Pending"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Shop Profile Summary */}
              <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-md flex flex-col justify-between">
                <div>
                  <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
                    <Store className="w-4 h-4" />
                    <span>{getTranslation("দোকান বিবরণী", "Shop Details")}</span>
                  </div>
                  <h4 className="text-lg font-black text-white">{partnerData.shopName}</h4>
                  <p className="text-xs text-slate-400 mt-1">{partnerData.category}</p>

                  <div className="mt-6 space-y-3 text-xs border-t border-slate-800 pt-4">
                    <div className="flex justify-between">
                      <span className="text-slate-400">{getTranslation("পার্টনার আইডি:", "Partner ID:")}</span>
                      <span className="font-mono font-bold text-emerald-400">{partnerData.partnerId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">{getTranslation("মালিক:", "Owner:")}</span>
                      <span className="font-bold">{partnerData.ownerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">{getTranslation("মোবাইল:", "Phone:")}</span>
                      <span className="font-mono font-bold">{partnerData.mobile}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">{getTranslation("কমিশন চুক্তি:", "Commission:")}</span>
                      <span className="font-black text-amber-400">{commissionRate}%</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800">
                  <button
                    onClick={openAddProduct}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black py-3 rounded-2xl transition cursor-pointer flex items-center justify-center space-x-2"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>{getTranslation("নতুন পণ্য আপলোড করুন", "Upload New Product")}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. PRODUCTS TAB */}
        {activeTab === "products" && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={getTranslation("পণ্য অনুসন্ধান করুন...", "Search products...")}
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none font-medium"
                />
              </div>

              <button
                onClick={openAddProduct}
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-4 py-2.5 rounded-xl transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{getTranslation("নতুন পণ্য যোগ করুন", "Add New Product")}</span>
              </button>
            </div>

            {/* Products Grid */}
            {products.length === 0 ? (
              <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-12 text-center">
                <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-600">
                  {getTranslation("এই দোকানে এখনো কোনো পণ্য যোগ করা হয়নি।", "No products found for this partner shop yet.")}
                </p>
                <button
                  onClick={openAddProduct}
                  className="mt-4 inline-flex items-center space-x-2 bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-emerald-700 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{getTranslation("প্রথম পণ্য যুক্ত করুন", "Add First Product")}</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {products
                  .filter(p => 
                    p.nameBn.toLowerCase().includes(productSearch.toLowerCase()) || 
                    p.nameEn.toLowerCase().includes(productSearch.toLowerCase())
                  )
                  .map((prod) => (
                    <div
                      key={prod.id}
                      className="bg-white rounded-2xl border border-slate-100 shadow-xs hover:shadow-md transition overflow-hidden flex flex-col justify-between"
                    >
                      <div className="p-4">
                        <div className="relative">
                          <img
                            src={prod.image}
                            alt={prod.nameBn}
                            className="w-full h-36 object-cover rounded-xl bg-slate-50 border border-slate-100"
                            onError={(e: any) => {
                              e.target.src = "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=400&q=80";
                            }}
                          />
                          <button
                            onClick={() => handleToggleAvailability(prod)}
                            className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-black uppercase shadow cursor-pointer transition ${
                              prod.isAvailable !== false && prod.stock > 0
                                ? "bg-emerald-600 text-white"
                                : "bg-rose-600 text-white"
                            }`}
                          >
                            {prod.isAvailable !== false && prod.stock > 0
                              ? getTranslation("ইন স্টক", "In Stock")
                              : getTranslation("আউট অফ স্টক", "Out of Stock")}
                          </button>
                        </div>

                        <div className="mt-3">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            {prod.category}
                          </span>
                          <h4 className="font-bold text-slate-800 text-sm mt-0.5 line-clamp-1">
                            {lang === "bn" ? prod.nameBn : prod.nameEn}
                          </h4>
                          <p className="text-xs text-slate-400">
                            {lang === "bn" ? prod.nameEn : prod.nameBn}
                          </p>

                          <div className="flex items-baseline space-x-1.5 mt-2">
                            <span className="text-base font-black text-emerald-700">৳{prod.price}</span>
                            <span className="text-[11px] text-slate-500 font-medium">/ {lang === "bn" ? prod.unitBn : prod.unitEn}</span>
                          </div>

                          {/* Quick Stock Controls */}
                          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-xs text-slate-500 font-bold">
                              {getTranslation("বর্তমান স্টক:", "Stock:")} <span className="font-mono text-slate-800">{prod.stock || 0}</span>
                            </span>
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => handleAdjustStock(prod, -5)}
                                className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs flex items-center justify-center cursor-pointer"
                                title="-5"
                              >
                                -
                              </button>
                              <button
                                onClick={() => handleAdjustStock(prod, 5)}
                                className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs flex items-center justify-center cursor-pointer"
                                title="+5"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-100 flex items-center justify-between">
                        <button
                          onClick={() => openEditProduct(prod)}
                          className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center space-x-1 cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>{getTranslation("এডিট করুন", "Edit")}</span>
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(prod)}
                          className="text-xs font-bold text-red-500 hover:text-red-700 flex items-center space-x-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{getTranslation("মুছুন", "Delete")}</span>
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* 3. ORDERS TAB */}
        {activeTab === "orders" && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-slate-800 text-base">
                    {getTranslation("পার্টনার শপ অ্যাসাইন্ড অর্ডারসমূহ", "Assigned Partner Shop Orders")}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {getTranslation(
                      "এই দোকানে গ্রাহকদের অর্ডারসমূহ। অর্ডার প্যাক করুন এবং ডেলিভারির জন্য প্রস্তুত করুন।",
                      "Orders placed by customers for your shop. Pack and dispatch items for timely delivery."
                    )}
                  </p>
                </div>
              </div>

              {orders.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs font-bold">
                  {getTranslation("এখনো কোনো অর্ডার পাওয়া যায়নি।", "No assigned orders found yet.")}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-slate-400 uppercase font-black text-[10px] tracking-wider border-b border-slate-100">
                      <tr>
                        <th className="px-5 py-3.5">{getTranslation("অর্ডার আইডি", "Order ID")}</th>
                        <th className="px-5 py-3.5">{getTranslation("গ্রাহকের নাম ও ঠিকানা", "Customer & Address")}</th>
                        <th className="px-5 py-3.5">{getTranslation("অর্ডারকৃত পণ্যসমূহ", "Ordered Items")}</th>
                        <th className="px-5 py-3.5 text-right">{getTranslation("মোট পরিমাণ", "Order Total")}</th>
                        <th className="px-5 py-3.5 text-right text-amber-700">{getTranslation(`কমিশন (${commissionRate}%)`, `Commission (${commissionRate}%)`)}</th>
                        <th className="px-5 py-3.5 text-right text-emerald-700">{getTranslation("আমার আয়", "My Earnings")}</th>
                        <th className="px-5 py-3.5 text-center">{getTranslation("স্ট্যাটাস", "Status")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {orders.map((ord) => {
                        const shopItems = (ord.items || []).filter((item: any) => 
                          item.product?.partnerShopId === partner.id || 
                          item.product?.partnerShopId === partner.partnerId ||
                          item.product?.partnerId === partner.partnerId ||
                          (!item.product?.partnerShopId && !item.product?.partnerId && (ord.partnerShopId === partner.id || ord.partnerShopId === partner.partnerId))
                        );

                        const orderAmt = shopItems.length > 0
                          ? shopItems.reduce((sum: number, it: any) => {
                              const price = it.selectedOption ? it.selectedOption.price : it.product?.price ?? 0;
                              return sum + (price * (it.quantity || 1));
                            }, 0)
                          : (ord.total || ord.totalAmount || 0);

                        const { commissionAmount, partnerEarnings } = calculateEarnings(orderAmt, commissionRate);
                        return (
                          <tr key={ord.id} className="hover:bg-slate-50/70 transition">
                            <td className="px-5 py-4 font-mono font-black text-slate-800">
                              #{ord.id.slice(-6)}
                            </td>
                            <td className="px-5 py-4">
                              <p className="font-bold text-slate-800">{ord.customerName || ord.name || "Guest"}</p>
                              <p className="text-[11px] text-slate-400">{ord.deliveryAddress || ord.address}</p>
                              <p className="text-[11px] font-mono text-slate-500">{ord.customerPhone || ord.phone}</p>
                            </td>
                            <td className="px-5 py-4">
                              <div className="space-y-1">
                                {(ord.items || []).slice(0, 3).map((it: any, idx: number) => (
                                  <div key={idx} className="text-[11px] font-medium text-slate-700">
                                    • {it.product?.nameBn || it.product?.nameEn || "Item"} ({it.quantity || 1} {it.selectedOption ? it.selectedOption.unit : it.product?.unitBn})
                                  </div>
                                ))}
                                {(ord.items || []).length > 3 && (
                                  <span className="text-[10px] text-slate-400 font-bold">+{(ord.items || []).length - 3} more</span>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-4 text-right font-black text-slate-900">
                              ৳{orderAmt}
                            </td>
                            <td className="px-5 py-4 text-right font-bold text-amber-700">
                              -৳{commissionAmount}
                            </td>
                            <td className="px-5 py-4 text-right font-black text-emerald-700">
                              ৳{partnerEarnings}
                            </td>
                            <td className="px-5 py-4 text-center">
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
                                {ord.orderStatus || "Pending"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. FINANCIAL LEDGER TAB */}
        {activeTab === "ledger" && (
          <div className="space-y-6 animate-fade-in">
            {/* Financial Summary Card */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-3xl p-6 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider block mb-1">
                  {getTranslation("আয় ও সেটেলমেন্ট স্টেটমেন্ট", "Earnings & Payout Statement")}
                </span>
                <h3 className="text-2xl font-black">
                  ৳{displayEarnings.toLocaleString()}{" "}
                  <span className="text-xs font-normal text-slate-400">
                    ({getTranslation("মোট অর্জিত নিট আয়", "Total Net Earnings Generated")})
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {getTranslation("প্রতিটি অর্ডারে", "Formula: Net Payout = Order Amount − Platform Fee (")} {commissionRate}%).
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowPayoutModal(true)}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black px-5 py-3 rounded-2xl transition shadow-lg cursor-pointer"
                >
                  {getTranslation("পে-আউট রিকোয়েস্ট করুন", "Request Payout")}
                </button>
              </div>
            </div>

            {/* Ledger Table */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100">
                <h4 className="font-black text-slate-800 text-sm">
                  {getTranslation("স্বয়ংক্রিয় অর্ডারভিত্তিক কমিশন ও আয়ের লেজার", "Automated Commission & Earnings Ledger")}
                </h4>
              </div>

              <div className="overflow-x-auto">
                {orders.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs font-bold">
                    {getTranslation("এখনো কোনো লেনদেন বা অর্ডার সম্পন্ন হয়নি। গ্রাহকের বাস্তব অর্ডার আসলে স্বয়ংক্রিয়ভাবে লেজারে হিসাব যুক্ত হবে।", "No transactions or orders recorded yet. Real transaction breakdown will appear here when orders are placed.")}
                  </div>
                ) : (
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-slate-400 uppercase font-black text-[10px] tracking-wider border-b border-slate-100">
                      <tr>
                        <th className="px-5 py-3.5">{getTranslation("অর্ডার আইডি", "Order Ref")}</th>
                        <th className="px-5 py-3.5 text-right">{getTranslation("অর্ডার মূল্য (৳)", "Order Amount")}</th>
                        <th className="px-5 py-3.5 text-center">{getTranslation("কমিশন রেট", "Rate")}</th>
                        <th className="px-5 py-3.5 text-right text-amber-700">{getTranslation("কর্তিত কমিশন (৳)", "Commission Deducted")}</th>
                        <th className="px-5 py-3.5 text-right text-emerald-700">{getTranslation("পার্টনার নিট আয় (৳)", "Net Partner Earnings")}</th>
                        <th className="px-5 py-3.5 text-center">{getTranslation("পেমেন্ট স্ট্যাটাস", "Status")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {orders.map((ord) => {
                        const shopItems = (ord.items || []).filter((item: any) => 
                          item.product?.partnerShopId === partner.id || 
                          item.product?.partnerShopId === partner.partnerId ||
                          item.product?.partnerId === partner.partnerId ||
                          (!item.product?.partnerShopId && !item.product?.partnerId && (ord.partnerShopId === partner.id || ord.partnerShopId === partner.partnerId))
                        );

                        const orderAmt = shopItems.length > 0
                          ? shopItems.reduce((sum: number, it: any) => {
                              const price = it.selectedOption ? it.selectedOption.price : it.product?.price ?? 0;
                              return sum + (price * (it.quantity || 1));
                            }, 0)
                          : (ord.total || ord.totalAmount || 0);

                        const { commissionAmount, partnerEarnings } = calculateEarnings(orderAmt, commissionRate);
                        return (
                          <tr key={ord.id} className="hover:bg-slate-50/70 transition">
                            <td className="px-5 py-3.5 font-mono font-black text-slate-800">
                              #{ord.id.slice(-6)}
                            </td>
                            <td className="px-5 py-3.5 text-right font-black text-slate-800">
                              ৳{orderAmt}
                            </td>
                            <td className="px-5 py-3.5 text-center font-bold text-slate-600">
                              {commissionRate}%
                            </td>
                            <td className="px-5 py-3.5 text-right font-bold text-amber-700">
                              -৳{commissionAmount}
                            </td>
                            <td className="px-5 py-3.5 text-right font-black text-emerald-700">
                              ৳{partnerEarnings}
                            </td>
                            <td className="px-5 py-3.5 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                {ord.paymentStatus === "paid" ? getTranslation("পরিশোধিত", "Paid") : getTranslation("অপেক্ষমান", "Pending")}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ADD / EDIT PRODUCT MODAL */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl border border-slate-100 my-8">
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
              <h3 className="font-black text-base">
                {editingProduct 
                  ? getTranslation("পণ্য সম্পাদনা করুন", "Edit Product")
                  : getTranslation("দোকানে নতুন পণ্য যুক্ত করুন", "Add New Product to Shop")
                }
              </h3>
              <button
                onClick={() => setShowProductModal(false)}
                className="p-1 rounded-full hover:bg-slate-800 transition text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                    {getTranslation("পণ্যের নাম (বাংলা) *", "Product Name (Bengali) *")}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="যেমনঃ তাজা লাল শাক"
                    value={prodNameBn}
                    onChange={(e) => setProdNameBn(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:bg-white focus:border-emerald-500 outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                    {getTranslation("Product Name (English) *", "Product Name (English) *")}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Fresh Red Spinach"
                    value={prodNameEn}
                    onChange={(e) => setProdNameEn(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:bg-white focus:border-emerald-500 outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                    {getTranslation("বিক্রয় মূল্য (টাকা ৳) *", "Price (BDT ৳) *")}
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={prodPrice}
                    onChange={(e) => setProdPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:bg-white focus:border-emerald-500 outline-none font-black text-emerald-700"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                    {getTranslation("স্টক পরিমাণ *", "Available Stock *")}
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={prodStock}
                    onChange={(e) => setProdStock(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:bg-white focus:border-emerald-500 outline-none font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                    {getTranslation("ক্যাটাগরি", "Category")}
                  </label>
                  <select
                    value={prodCategory}
                    onChange={(e) => setProdCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:bg-white focus:border-emerald-500 outline-none font-bold"
                  >
                    <option value="vegetables">শাক-সবজি (Vegetables)</option>
                    <option value="fruits">ফলমূল (Fruits)</option>
                    <option value="dairy">দুধ ও ডেইরি (Dairy)</option>
                    <option value="fish">মাছ (Fish)</option>
                    <option value="meat">মাংস (Meat)</option>
                    <option value="staples">চাল ও ডাল (Staples)</option>
                    <option value="spices">তেল ও মসলা (Spices & Oil)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                    {getTranslation("পরিমাপের একক", "Measurement Unit")}
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="কেজি / আঁটি / পিস"
                      value={prodUnitBn}
                      onChange={(e) => setProdUnitBn(e.target.value)}
                      className="w-1/2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white outline-none"
                    />
                    <input
                      type="text"
                      placeholder="kg / bunch / pcs"
                      value={prodUnitEn}
                      onChange={(e) => setProdUnitEn(e.target.value)}
                      className="w-1/2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Product Image URL */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                  {getTranslation("পণ্যের ছবি (Image URL)", "Product Image URL")}
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={prodImage}
                  onChange={(e) => setProdImage(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:bg-white focus:border-emerald-500 outline-none font-mono"
                />
              </div>

              {/* In-Stock Toggle */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-700">
                  {getTranslation("গ্রাহকদের জন্য পণ্যটি উপলব্ধ (In Stock) থাকবে?", "Is this product active and available for customers?")}
                </span>
                <input
                  type="checkbox"
                  checked={prodIsAvailable}
                  onChange={(e) => setProdIsAvailable(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
                >
                  {getTranslation("বাতিল", "Cancel")}
                </button>
                <button
                  type="submit"
                  disabled={submittingProduct}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-6 py-2.5 rounded-xl transition shadow-md cursor-pointer flex items-center space-x-2"
                >
                  {submittingProduct && <RefreshCw className="w-4 h-4 animate-spin" />}
                  <span>{getTranslation("সংরক্ষণ করুন", "Save Product")}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PAYOUT REQUEST MODAL */}
      {showPayoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-base text-slate-900">
                {getTranslation("উইথড্র / পে-আউট রিকোয়েস্ট", "Request Payout")}
              </h3>
              <button onClick={() => setShowPayoutModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              {getTranslation("আপনার বর্তমান ব্যালেন্স থেকে পে-আউট রিকোয়েস্ট এডমিনের কাছে পাঠানো হবে।", "Your payout request will be submitted to the admin for disbursement.")}
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                  {getTranslation("টাকার পরিমাণ (৳)", "Amount (BDT ৳)")}
                </label>
                <input
                  type="number"
                  placeholder="যেমনঃ ৫০০০"
                  value={payoutAmount || ""}
                  onChange={(e) => setPayoutAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-black outline-none focus:bg-white focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                  {getTranslation("পেমেন্ট মেথড", "Payment Method")}
                </label>
                <select
                  value={payoutMethod}
                  onChange={(e) => setPayoutMethod(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold outline-none"
                >
                  <option value="bKash">bKash (বিকাশ)</option>
                  <option value="Nagad">Nagad (নগদ)</option>
                  <option value="Bank Transfer">Bank Transfer (ব্যাংক অ্যাকাউন্ট)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                  {getTranslation("অ্যাকাউন্ট নম্বর / বিবরণ", "Account Number / Details")}
                </label>
                <input
                  type="text"
                  placeholder="01XXXXXXXXX"
                  value={payoutAccount}
                  onChange={(e) => setPayoutAccount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold outline-none"
                />
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowPayoutModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold cursor-pointer"
              >
                {getTranslation("বাতিল", "Cancel")}
              </button>
              <button
                onClick={() => {
                  if (payoutAmount <= 0) {
                    triggerToast("অনুগ্রহ করে একটি সঠিক পরিমাণ লিখুন।", "Please enter a valid amount.");
                    return;
                  }
                  triggerToast("পে-আউট রিকোয়েস্ট সফলভাবে এডমিনের কাছে পাঠানো হয়েছে!", "Payout request submitted to admin!");
                  setShowPayoutModal(false);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-5 py-2 rounded-xl transition cursor-pointer shadow"
              >
                {getTranslation("রিকোয়েস্ট পাঠান", "Submit Request")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Delete Confirmation Modal */}
      <DeleteProductConfirmModal
        isOpen={!!productPendingDelete}
        product={productPendingDelete}
        orders={orders}
        user={{ uid: partner.id, displayName: partner.shopName || partner.ownerName || "partner" }}
        lang={lang}
        onClose={() => setProductPendingDelete(null)}
        onSuccess={(deletedId) => {
          setProducts(prev => prev.filter(p => p.id !== deletedId));
        }}
        triggerToast={triggerToast}
      />
    </div>
  );
}
