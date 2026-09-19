import React, { useState, useEffect } from "react";
import { 
  db, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  addDoc, 
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
  increment
} from "../../lib/firebase";
import { 
  Store, Plus, Edit, Trash2, Layers, DollarSign, 
  ShoppingBag, Bell, RefreshCw, X, Check, Save, 
  ChevronRight, ArrowUpRight, FileText, PieChart
} from "lucide-react";
import DeleteProductConfirmModal from "./DeleteProductConfirmModal";

interface SellerPanelProps {
  user: any;
  onLogout: () => void;
  lang: "bn" | "en";
  triggerToast: (bn: string, en: string) => void;
}

export default function SellerPanel({ user, onLogout, lang, triggerToast }: SellerPanelProps) {
  if (user?.role !== "seller" && user?.role !== "admin" && user?.role !== "founder") {
    return (
      <div className="p-8 text-center bg-red-50 border border-red-200 rounded-2xl m-4 flex flex-col items-center justify-center space-y-3">
        <p className="text-red-750 font-black text-sm">
          Access Denied. You do not have permission to access this page.
        </p>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState<"dashboard" | "products" | "orders" | "withdraw" | "notifications">("dashboard");
  const [products, setProducts] = useState<any[]>([]);
  const [productPendingDelete, setProductPendingDelete] = useState<any | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [sellerProfile, setSellerProfile] = useState<any | null>(null);
  const [withdrawRequests, setWithdrawRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Form states for Add/Edit Product
  const [showProductForm, setShowProductForm] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [prodNameEn, setProdNameEn] = useState<string>("");
  const [prodNameBn, setProdNameBn] = useState<string>("");
  const [prodPrice, setProdPrice] = useState<number>(0);
  const [prodStock, setProdStock] = useState<number>(50);
  const [prodCategory, setProdCategory] = useState<string>("vegetables");
  const [prodUnitEn, setProdUnitEn] = useState<string>("kg");
  const [prodUnitBn, setProdUnitBn] = useState<string>("কেজি");
  const [prodImage, setProdImage] = useState<string>("https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=400&q=80");
  const [prodDescEn, setProdDescEn] = useState<string>("");
  const [prodDescBn, setProdDescBn] = useState<string>("");

  // Withdraw state
  const [withdrawAmount, setWithdrawAmount] = useState<number>(0);
  const [withdrawMethod, setWithdrawMethod] = useState<string>("bKash");
  const [withdrawAccount, setWithdrawAccount] = useState<string>("");

  const getTranslation = (bn: string, en: string) => (lang === "bn" ? bn : en);

  useEffect(() => {
    if (!user?.uid) return;

    // Listen to seller profile info
    const unsubSeller = onSnapshot(
      doc(db, "sellers", user.uid), 
      (docSnap) => {
        if (docSnap.exists()) {
          setSellerProfile(docSnap.data());
        }
      },
      (err) => console.warn("Seller profile sync notice:", err.message)
    );

    // Listen to products belonging to this seller
    const prodQuery = query(
      collection(db, "products"),
      where("sellerId", "==", user.uid)
    );
    const unsubProds = onSnapshot(
      prodQuery, 
      (snapshot) => {
        const prods: any[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.isDeleted === true || data.status === "deleted" || data.deleted === true) {
            return;
          }
          prods.push({ id: doc.id, ...data });
        });
        setProducts(prods);
        setLoading(false);
      },
      (err) => {
        console.warn("Seller prods sync notice:", err.message);
        setLoading(false);
      }
    );

    // Listen to orders containing this seller's products, or general orders as sandbox proxy
    const unsubOrders = onSnapshot(
      collection(db, "orders"), 
      (snapshot) => {
        const ords: any[] = [];
        snapshot.forEach((doc) => {
          const orderData = doc.data();
          // Check if any item belongs to this seller or show as sandbox delivery
          const hasSellerItem = orderData.items?.some((item: any) => item.product.sellerId === user.uid || item.product.sellerId === "admin");
          if (hasSellerItem) {
            ords.push({ id: doc.id, ...orderData });
          }
        });
        setOrders(ords);
      },
      (err) => console.warn("Seller orders sync notice:", err.message)
    );

    // Listen to withdraws
    const withdrawQuery = query(
      collection(db, "transactions"),
      where("userId", "==", user.uid),
      where("type", "==", "withdraw")
    );
    const unsubWithdraw = onSnapshot(
      withdrawQuery, 
      (snapshot) => {
        const reqs: any[] = [];
        snapshot.forEach((doc) => {
          reqs.push({ id: doc.id, ...doc.data() });
        });
        setWithdrawRequests(reqs);
      },
      (err) => console.warn("Seller withdraw sync notice:", err.message)
    );

    // Listen to notifications
    const notifyQuery = query(
      collection(db, "notifications"),
      where("userId", "in", [user.uid, "all"]),
      orderBy("createdAt", "desc")
    );
    const unsubNotify = onSnapshot(
      notifyQuery, 
      (snapshot) => {
        const notifs: any[] = [];
        snapshot.forEach((doc) => {
          notifs.push({ id: doc.id, ...doc.data() });
        });
        setNotifications(notifs);
      },
      (err) => console.warn("Seller notify sync notice:", err.message)
    );

    return () => {
      unsubSeller();
      unsubProds();
      unsubOrders();
      unsubWithdraw();
      unsubNotify();
    };
  }, [user]);

  const resetForm = () => {
    setEditingProduct(null);
    setProdNameEn("");
    setProdNameBn("");
    setProdPrice(0);
    setProdStock(50);
    setProdCategory("vegetables");
    setProdUnitEn("kg");
    setProdUnitBn("কেজি");
    setProdImage("https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=400&q=80");
    setProdDescEn("");
    setProdDescBn("");
  };

  const handleEditClick = (p: any) => {
    setEditingProduct(p);
    setProdNameEn(p.nameEn || "");
    setProdNameBn(p.nameBn || "");
    setProdPrice(p.price || 0);
    setProdStock(p.stock || 0);
    setProdCategory(p.category || "vegetables");
    setProdUnitEn(p.unitEn || "kg");
    setProdUnitBn(p.unitBn || "কেজি");
    setProdImage(p.image || "");
    setProdDescEn(p.descriptionEn || "");
    setProdDescBn(p.descriptionBn || "");
    setShowProductForm(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodNameEn || !prodNameBn || prodPrice <= 0) {
      triggerToast("সঠিক তথ্য প্রদান করুন!", "Please provide valid product details!");
      return;
    }

    try {
      const payload: any = {
        nameEn: prodNameEn,
        nameBn: prodNameBn,
        price: Number(prodPrice),
        stock: Number(prodStock),
        category: prodCategory,
        unitEn: prodUnitEn,
        unitBn: prodUnitBn,
        image: prodImage,
        descriptionEn: prodDescEn,
        descriptionBn: prodDescBn,
        sellerId: user.uid,
        rating: editingProduct?.rating || 4.5,
        reviewCount: editingProduct?.reviewCount || 1,
        isBestSelling: editingProduct?.isBestSelling || false,
        isNewArrival: editingProduct?.isNewArrival || true,
        options: editingProduct?.options || []
      };

      if (editingProduct) {
        // Edit existing
        await updateDoc(doc(db, "products", editingProduct.id), payload);
        triggerToast("পণ্য সফলভাবে আপডেট করা হয়েছে!", "Product updated successfully!");
      } else {
        // Add new
        const newRef = doc(collection(db, "products"));
        await setDoc(newRef, { id: newRef.id, ...payload });
        triggerToast("নতুন পণ্য যুক্ত করা হয়েছে!", "New product added successfully!");
      }

      setShowProductForm(false);
      resetForm();
    } catch (err) {
      console.error("Error saving product:", err);
    }
  };

  const handleDeleteProduct = (prodOrId: any) => {
    if (typeof prodOrId === "string") {
      const found = products.find(p => p.id === prodOrId);
      setProductPendingDelete(found || { id: prodOrId, nameBn: "পণ্য", nameEn: "Product" });
    } else if (prodOrId && typeof prodOrId === "object") {
      setProductPendingDelete(prodOrId);
    }
  };

  const handleCreateWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const balance = sellerProfile?.balance || 0;
    if (withdrawAmount <= 0 || withdrawAmount > balance) {
      triggerToast("ওয়ালেটে পর্যাপ্ত ব্যালেন্স নেই!", "Insufficient wallet balance!");
      return;
    }
    if (!withdrawAccount) {
      triggerToast("হিসাব নম্বর প্রবেশ করুন!", "Please enter your account details!");
      return;
    }

    try {
      // Deduct balance
      await updateDoc(doc(db, "sellers", user.uid), {
        balance: increment(-withdrawAmount)
      });

      // Add withdraw transaction (auto-approved for sandbox demo!)
      const txId = "wd_" + Date.now();
      await setDoc(doc(db, "transactions", txId), {
        id: txId,
        userId: user.uid,
        type: "withdraw",
        amount: withdrawAmount,
        description: getTranslation(
          `${withdrawMethod} (${withdrawAccount}) এর মাধ্যমে উত্তোলন সম্পন্ন হয়েছে।`,
          `Withdraw payout successful via ${withdrawMethod} (${withdrawAccount}).`
        ),
        createdAt: serverTimestamp(),
        status: "approved",
        referenceId: txId
      });

      triggerToast("টাকা উত্তোলন সফলভাবে সম্পন্ন হয়েছে!", "Earnings withdraw processed successfully!");
      setWithdrawAmount(0);
      setWithdrawAccount("");
    } catch (err) {
      console.error("Error creating withdraw request:", err);
    }
  };

  // Quick seed product helper for sellers to test instantly
  const handleQuickSeedProduct = async () => {
    try {
      const quickItems = [
        { nameEn: "Organic Deshi Rice", nameBn: "অর্গানিক বাসমতি চাল", price: 95, category: "groceries", unitEn: "kg", unitBn: "কেজি", image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=400&q=80" },
        { nameEn: "Fresh Chanchkoir Mangoes", nameBn: "গাছপাকা হিমসাগর আম", price: 120, category: "fruits", unitEn: "kg", unitBn: "কেজি", image: "https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=400&q=80" },
        { nameEn: "Pure Cow Milk", nameBn: "খাটি গরুর দুধ", price: 80, category: "dairy-eggs", unitEn: "ltr", unitBn: "লিটার", image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=400&q=80" }
      ];

      for (const item of quickItems) {
        const ref = doc(collection(db, "products"));
        await setDoc(ref, {
          id: ref.id,
          nameEn: item.nameEn,
          nameBn: item.nameBn,
          price: item.price,
          stock: 65,
          category: item.category,
          unitEn: item.unitEn,
          unitBn: item.unitBn,
          image: item.image,
          descriptionEn: `Premium source of ${item.nameEn}. Directly from local farmers.`,
          descriptionBn: `${item.nameBn} সরাসরি স্থানীয় খামারিদের থেকে সংগৃহীত। ভেজালমুক্ত শতভাগ খাঁটি।`,
          sellerId: user.uid,
          rating: 4.8,
          reviewCount: 3,
          isNewArrival: true
        });
      }

      triggerToast("৩টি পণ্য সফলভাবে সংযুক্ত করা হয়েছে!", "3 products quick-seeded for this seller shop!");
    } catch (err) {
      console.error("Quick seed error:", err);
    }
  };

  return (
    <div className="w-full h-full bg-slate-50 overflow-hidden flex flex-col md:flex-row">
      
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 lg:w-72 bg-slate-950 text-white shrink-0 flex flex-col h-auto md:h-full z-10 border-b md:border-b-0 md:border-r border-slate-850">
        {/* Seller shop branding */}
        <div className="p-4 sm:p-5 pb-3 sm:pb-4 border-b border-slate-850 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md shrink-0">
              <Store className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-black text-white text-sm leading-tight truncate">{sellerProfile?.shopName || "Seller Shop"}</h3>
              <p className="text-[10px] text-emerald-400 font-bold mt-0.5 uppercase tracking-wider truncate">
                {getTranslation("অনুমোদিত মার্চেন্ট", "Approved Merchant")}
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-1">
          {[
            { id: "dashboard", labelBn: "সেলস ড্যাশবোর্ড", labelEn: "Seller Dashboard", icon: <PieChart className="w-4 h-4" /> },
            { id: "products", labelBn: "পণ্য ব্যবস্থাপনা", labelEn: "Product Inventory", icon: <Layers className="w-4 h-4" /> },
            { id: "orders", labelBn: "অর্ডার রিকোয়েস্ট", labelEn: "Customer Orders", icon: <ShoppingBag className="w-4 h-4" /> },
            { id: "withdraw", labelBn: "আয় ও উত্তোলন", labelEn: "Earnings & Payout", icon: <DollarSign className="w-4 h-4" /> },
            { id: "notifications", labelBn: "বিজ্ঞপ্তি", labelEn: "Shop Alerts", icon: <Bell className="w-4 h-4" /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setShowProductForm(false);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer text-left ${
                activeTab === tab.id 
                  ? "bg-emerald-600 text-white shadow shadow-emerald-950 font-black" 
                  : "text-slate-400 hover:bg-slate-850 hover:text-white"
              }`}
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <span className="shrink-0">{tab.icon}</span>
                <span className="truncate">{getTranslation(tab.labelBn, tab.labelEn)}</span>
              </div>
            </button>
          ))}
        </nav>

        <div className="p-3 sm:p-4 border-t border-slate-850 shrink-0 bg-slate-950">
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center space-x-2 px-3.5 py-2.5 text-red-400 hover:bg-red-950/40 hover:text-red-300 rounded-xl text-xs font-bold transition cursor-pointer border border-red-900/30"
          >
            <X className="w-4 h-4" />
            <span>{getTranslation("লগআউট", "Logout")}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 h-full min-h-0 overflow-y-auto p-4 sm:p-6 lg:p-7 xl:p-8 bg-slate-50 focus:outline-none">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
          </div>
        ) : (
          <>
            {/* TAB: DASHBOARD */}
            {activeTab === "dashboard" && (
              <div className="space-y-6 animate-fade-in">
                {/* Promo Header banner */}
                <div className="bg-gradient-to-r from-teal-700 to-emerald-800 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
                  <h2 className="text-xl font-black">{sellerProfile?.ownerName || "Merchant Partner"}</h2>
                  <p className="text-xs text-emerald-200 mt-1">
                    {getTranslation(
                      `${sellerProfile?.shopName} স্টোরের সেলস হাব এবং মার্চেন্ট পোর্টাল।`,
                      `Merchant portal & active analytics for ${sellerProfile?.shopName}.`
                    )}
                  </p>
                  <div className="mt-4 flex space-x-2">
                    <button
                      onClick={handleQuickSeedProduct}
                      className="bg-white/10 hover:bg-white/20 text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-lg border border-white/10 tracking-wider transition cursor-pointer"
                    >
                      ⚡ Quick Sample Seed (3 Products)
                    </button>
                  </div>
                </div>

                {/* Grid stats cards */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center space-x-3 shadow-sm">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        {getTranslation("বকেয়া ব্যালেন্স", "Account Balance")}
                      </p>
                      <h4 className="text-lg font-black text-slate-800 mt-0.5">৳{sellerProfile?.balance || 0}</h4>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center space-x-3 shadow-sm">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        {getTranslation("আমার পণ্য সংখ্যা", "Your Products")}
                      </p>
                      <h4 className="text-lg font-black text-slate-800 mt-0.5">{products.length}</h4>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center space-x-3 shadow-sm">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        {getTranslation("আগত অর্ডার", "Active Orders")}
                      </p>
                      <h4 className="text-lg font-black text-slate-800 mt-0.5">{orders.length}</h4>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center space-x-3 shadow-sm">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                      <ArrowUpRight className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        {getTranslation("বিক্রয় রিভিউজ", "Seller Reviews")}
                      </p>
                      <h4 className="text-lg font-black text-slate-800 mt-0.5">4.8 ★</h4>
                    </div>
                  </div>
                </div>

                {/* Sales list */}
                <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
                  <h3 className="font-black text-sm text-slate-800">{getTranslation("দোকানের সাম্প্রতিক অর্ডার সমূহ", "Recent Shop Orders")}</h3>
                  {orders.length === 0 ? (
                    <p className="text-slate-400 text-xs text-center py-6">
                      {getTranslation("আপনার পণ্যের জন্য এখনও কোনো অর্ডার আসেনি!", "No customer orders received for your items yet!")}
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {orders.slice(0, 5).map((ord) => (
                        <div key={ord.id} className="py-3 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-black text-slate-800">#{ord.id.slice(-6).toUpperCase()}</span>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {ord.customerName} • {ord.customerPhone}
                            </p>
                          </div>
                          <div className="flex items-center space-x-4">
                            <span className="font-mono text-[10px] text-slate-400">{ord.paymentMethod}</span>
                            <span className="font-black text-slate-800">৳{ord.total}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: PRODUCTS CRUD */}
            {activeTab === "products" && (
              <div className="space-y-4 animate-fade-in">
                {!showProductForm ? (
                  <>
                    <div className="flex items-center justify-between">
                      <h2 className="text-base font-black text-slate-800">
                        {getTranslation("আপনার পণ্য সম্ভার", "Your Shop Products")}
                      </h2>
                      <button
                        onClick={() => {
                          resetForm();
                          setShowProductForm(true);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center space-x-1 transition shadow-sm cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>{getTranslation("নতুন পণ্য যোগ করুন", "Add Product")}</span>
                      </button>
                    </div>

                    {products.length === 0 ? (
                      <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center text-slate-400 text-xs">
                        <Layers className="w-12 h-12 mx-auto text-slate-200 mb-3" />
                        <p>{getTranslation("আপনার দোকানে কোনো পণ্য সাজানো নেই।", "No products uploaded in this shop yet.")}</p>
                      </div>
                    ) : (
                      <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-50 text-slate-400 font-bold uppercase text-[10px] border-b border-slate-100">
                                <th className="p-4">{getTranslation("পণ্য", "Product")}</th>
                                <th className="p-4">{getTranslation("ক্যাটাগরি", "Category")}</th>
                                <th className="p-4 text-center">{getTranslation("মূল্য", "Price")}</th>
                                <th className="p-4 text-center">{getTranslation("স্টক", "Stock")}</th>
                                <th className="p-4 text-center">{getTranslation("অ্যাকশন", "Action")}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {products.map((p) => (
                                <tr key={p.id} className="hover:bg-slate-50/50 transition">
                                  <td className="p-4 flex items-center space-x-3">
                                    <img 
                                      src={p.image} 
                                      className="w-9 h-9 object-cover rounded-lg border border-slate-100" 
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=450&q=80";
                                      }}
                                    />
                                    <div>
                                      <p className="font-bold text-slate-800">{getTranslation(p.nameBn, p.nameEn)}</p>
                                      <span className="text-[10px] text-slate-400">{getTranslation(`প্রতি ${p.unitBn}`, `per ${p.unitEn}`)}</span>
                                    </div>
                                  </td>
                                  <td className="p-4 capitalize text-slate-500 font-medium">{p.category}</td>
                                  <td className="p-4 text-center font-bold text-slate-800">৳{p.price}</td>
                                  <td className="p-4 text-center">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                      p.stock > 10 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
                                    }`}>
                                      {p.stock}
                                    </span>
                                  </td>
                                  <td className="p-4 text-center">
                                    <div className="flex items-center justify-center space-x-1.5">
                                      <button 
                                        onClick={() => handleEditClick(p)}
                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                      >
                                        <Edit className="w-4 h-4" />
                                      </button>
                                      <button 
                                        onClick={() => handleDeleteProduct(p.id)}
                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  // Create/Edit product form view
                  <div className="bg-white border border-slate-100 rounded-3xl p-5 sm:p-6 shadow-sm space-y-6">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <h3 className="font-black text-slate-800 text-sm">
                        {editingProduct 
                          ? getTranslation("পণ্য তথ্য এডিট করুন", "Edit Product Details") 
                          : getTranslation("নতুন পণ্য যুক্ত করুন", "Add New Product to Inventory")}
                      </h3>
                      <button onClick={() => setShowProductForm(false)} className="p-1.5 text-slate-400 hover:bg-slate-50 rounded-lg">
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <form onSubmit={handleSaveProduct} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Product Name (English)</label>
                          <input 
                            type="text" 
                            required
                            placeholder="e.g., Organic Red Apples"
                            value={prodNameEn}
                            onChange={(e) => setProdNameEn(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:bg-white outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">পণ্যের নাম (বাংলা)</label>
                          <input 
                            type="text" 
                            required
                            placeholder="যেমন: অর্গানিক লাল আপেল"
                            value={prodNameBn}
                            onChange={(e) => setProdNameBn(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:bg-white outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Price (৳)</label>
                          <input 
                            type="number" 
                            required
                            value={prodPrice}
                            onChange={(e) => setProdPrice(Number(e.target.value))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:bg-white outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Stock Quantity</label>
                          <input 
                            type="number" 
                            required
                            value={prodStock}
                            onChange={(e) => setProdStock(Number(e.target.value))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:bg-white outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Unit (English)</label>
                          <input 
                            type="text" 
                            required
                            value={prodUnitEn}
                            onChange={(e) => setProdUnitEn(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:bg-white outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">ইউনিট (বাংলা)</label>
                          <input 
                            type="text" 
                            required
                            value={prodUnitBn}
                            onChange={(e) => setProdUnitBn(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:bg-white outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Category</label>
                          <select 
                            value={prodCategory}
                            onChange={(e) => setProdCategory(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:bg-white outline-none focus:ring-1 focus:ring-emerald-500"
                          >
                            <option value="vegetables">Vegetables</option>
                            <option value="fruits">Fruits</option>
                            <option value="fish-meat">Fish & Meat</option>
                            <option value="dairy-eggs">Dairy & Eggs</option>
                            <option value="groceries">মুদি পণ্য (Groceries)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Product Image URL</label>
                          <input 
                            type="text" 
                            required
                            value={prodImage}
                            onChange={(e) => setProdImage(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:bg-white outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Description (English)</label>
                          <textarea 
                            value={prodDescEn}
                            onChange={(e) => setProdDescEn(e.target.value)}
                            rows={3}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs focus:bg-white outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">বর্ণনা (বাংলা)</label>
                          <textarea 
                            value={prodDescBn}
                            onChange={(e) => setProdDescBn(e.target.value)}
                            rows={3}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs focus:bg-white outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                        <button 
                          type="button"
                          onClick={() => {
                            setShowProductForm(false);
                            resetForm();
                          }}
                          className="text-slate-500 text-xs font-bold px-4 py-2"
                        >
                          {getTranslation("বাতিল করুন", "Cancel")}
                        </button>
                        <button 
                          type="submit"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-5 py-2 rounded-xl transition cursor-pointer"
                        >
                          {getTranslation("পণ্যটি সংরক্ষণ করুন", "Save Product")}
                        </button>
                      </div>

                    </form>
                  </div>
                )}
              </div>
            )}

            {/* TAB: ORDERS FOR SELLER */}
            {activeTab === "orders" && (
              <div className="space-y-4 animate-fade-in">
                <h2 className="text-base font-black text-slate-800">
                  {getTranslation("আপনার আগত ক্রেতার অর্ডারসমূহ", "Customer Purchase Orders")}
                </h2>
                {orders.length === 0 ? (
                  <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center text-slate-400 text-xs">
                    <ShoppingBag className="w-12 h-12 mx-auto text-slate-200 mb-3" />
                    <p>{getTranslation("কোনো অর্ডার রেকর্ড নেই।", "No purchase orders placed for your shop items yet.")}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {orders.map((ord) => (
                      <div key={ord.id} className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-black text-slate-800">#{ord.id.slice(-6).toUpperCase()}</span>
                            <span className="bg-slate-100 text-slate-600 text-[9px] px-2 py-0.5 rounded-lg font-bold uppercase">{ord.paymentMethod}</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1.5 font-medium">
                            {getTranslation("ক্রেতা:", "Customer:")} {ord.customerName} ({ord.customerPhone})
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {getTranslation("ঠিকানা:", "Address:")} {ord.deliveryAddress}
                          </p>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">{getTranslation("মোট বিল", "Total Bill")}</span>
                            <span className="font-black text-slate-800">৳{ord.total}</span>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                            ord.orderStatus === "delivered" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                          }`}>
                            {ord.orderStatus}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: WITHDRAW PAYOUTS */}
            {activeTab === "withdraw" && (
              <div className="space-y-6 animate-fade-in">
                {/* Balance box */}
                <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{getTranslation("উত্তোলনযোগ্য ব্যালেন্স", "Withdrawable Balance")}</span>
                    <h3 className="text-3xl font-black text-slate-800 mt-1">৳{sellerProfile?.balance || 0}</h3>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleCreateWithdraw} className="flex flex-col sm:flex-row gap-3 items-end sm:items-center">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Method</label>
                      <select 
                        value={withdrawMethod}
                        onChange={(e) => setWithdrawMethod(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs outline-none focus:bg-white"
                      >
                        <option value="bKash">bKash</option>
                        <option value="Nagad">Nagad</option>
                        <option value="Rocket">Rocket</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Account No</label>
                      <input 
                        type="text" 
                        required
                        placeholder="0171XXXXXXX"
                        value={withdrawAccount}
                        onChange={(e) => setWithdrawAccount(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:bg-white w-36"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Amount (৳)</label>
                      <input 
                        type="number" 
                        required
                        placeholder="৳ Amount"
                        value={withdrawAmount || ""}
                        onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:bg-white w-24"
                      />
                    </div>

                    <button 
                      type="submit"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-5 py-2.5 rounded-xl transition shadow-sm cursor-pointer"
                    >
                      {getTranslation("আয় উত্তোলন", "Withdraw Earnings")}
                    </button>
                  </form>
                </div>

                {/* Ledger */}
                <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
                  <h3 className="font-black text-sm text-slate-800">{getTranslation("উত্তোলন রিপোর্টসমূহ", "Shop Payout History")}</h3>
                  {withdrawRequests.length === 0 ? (
                    <p className="text-slate-400 text-xs text-center py-6">
                      {getTranslation("আপনি এখনও কোনো উত্তোলন করেননি!", "No earnings withdraw requested yet!")}
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {withdrawRequests.map((tx) => (
                        <div key={tx.id} className="py-3 flex items-center justify-between text-xs">
                          <div>
                            <p className="font-bold text-slate-800">{tx.description}</p>
                            <span className="text-[10px] text-slate-400 mt-0.5 inline-block">
                              {new Date(tx.createdAt?.seconds * 1000 || Date.now()).toLocaleString()}
                            </span>
                          </div>
                          <span className="font-black text-red-600">-৳{tx.amount}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: NOTIFICATIONS */}
            {activeTab === "notifications" && (
              <div className="space-y-4 animate-fade-in">
                <h2 className="text-base font-black text-slate-800">
                  {getTranslation("দোকানের নোটিফিকেশনস", "Merchant System Notifications")}
                </h2>
                {notifications.length === 0 ? (
                  <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center text-slate-400 text-xs">
                    <Bell className="w-12 h-12 mx-auto text-slate-200 mb-3" />
                    <p>{getTranslation("কোনো নোটিফিকেশন পাওয়া যায়নি।", "No system notifications found for this merchant.")}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {notifications.map((notif) => (
                      <div key={notif.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                        <h4 className="text-xs font-black text-slate-800">{getTranslation(notif.titleBn, notif.titleEn)}</h4>
                        <p className="text-xs text-slate-500 mt-1">{getTranslation(notif.messageBn, notif.messageEn)}</p>
                        <span className="text-[9px] text-slate-400 font-bold block mt-2 uppercase">
                          {new Date(notif.createdAt?.seconds * 1000 || Date.now()).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </>
        )}
      </main>

      {/* Product Delete Confirmation Modal */}
      <DeleteProductConfirmModal
        isOpen={!!productPendingDelete}
        product={productPendingDelete}
        orders={orders}
        user={user}
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
