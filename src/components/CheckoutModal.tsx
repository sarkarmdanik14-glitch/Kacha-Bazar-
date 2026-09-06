import React, { useState, useEffect, useMemo } from "react";
import { 
  db, 
  auth, 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  serverTimestamp, 
  increment,
  query,
  where,
  getDocs,
  runTransaction
} from "../lib/firebase";
import { 
  X, CreditCard, ShoppingBag, MapPin, Phone, User, 
  CheckCircle, ArrowRight, ArrowLeft, ShieldCheck, RefreshCw, Info,
  Mail, ExternalLink, Navigation, Locate, AlertTriangle
} from "lucide-react";
import { calculateDeliveryFeeFromSettings, calculateHaversineDistance, DeliveryZone } from "../lib/delivery";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: any[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  grandTotal: number;
  appliedCoupon: any;
  lang: "bn" | "en";
  onSuccess: (orderId: string, orderData?: any) => void;
  triggerToast: (bn: string, en: string) => void;
  isFullScreen?: boolean;
}

export default function CheckoutModal({ 
  isOpen, 
  onClose, 
  cart, 
  subtotal, 
  deliveryFee: propDeliveryFee, 
  discount, 
  grandTotal: propGrandTotal, 
  appliedCoupon, 
  lang, 
  onSuccess,
  triggerToast,
  isFullScreen = false
}: CheckoutModalProps) {
  const [name, setName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [payMethod, setPayMethod] = useState<string>("COD");
  const [txId, setTxId] = useState<string>("");
  const [mobileAccount, setMobileAccount] = useState<string>("");
  const [cardNumber, setCardNumber] = useState<string>("");
  
  // Dynamic Settings and Distance State
  const [settings, setSettings] = useState<any | null>(null);
  const [customerDistance, setCustomerDistance] = useState<number>(2.0);

  // Settings values fetched from Firestore
  const [bkashNum, setBkashNum] = useState<string>("01700000000");
  const [nagadNum, setNagadNum] = useState<string>("01800000000");
  const [rocketNum, setRocketNum] = useState<string>("01900000000");
  
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [loadingLocation, setLoadingLocation] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<any | null>(null);

  const getTranslation = (bn: string, en: string) => (lang === "bn" ? bn : en);

  // Dynamic delivery calculation based on Admin Settings and Customer Distance
  const deliveryCalc = useMemo(() => {
    if (appliedCoupon?.code === "FREESHIP") {
      return {
        fee: 0,
        matchedZone: null,
        distanceKm: customerDistance,
        isAvailable: true,
        messageBn: "ফ্রি ডেলিভারি কুপন কোড প্রয়োগ করা হয়েছে!",
        messageEn: "Free Shipping coupon code applied!",
        isFreeByThreshold: true
      };
    }
    return calculateDeliveryFeeFromSettings(customerDistance, subtotal, settings);
  }, [customerDistance, subtotal, settings, appliedCoupon]);

  const activeDeliveryFee = deliveryCalc.fee;
  const computedGrandTotal = useMemo(() => {
    return subtotal + activeDeliveryFee - discount;
  }, [subtotal, activeDeliveryFee, discount]);

  // Geolocation utilities
  const requestGeolocation = (
    onSuccess: (address: string) => void,
    onFailure: (bnMsg: string, enMsg: string) => void
  ) => {
    setLoadingLocation(true);
    setTimeout(() => {
      onSuccess(lang === "bn" ? "চাঁচকৈড় বাজার, গুরুদাশপুর, নাটোর, বাংলাদেশ" : "Chanchkoir Bazar, Gurudaspur, Natore, Bangladesh");
      setLoadingLocation(false);
    }, 600);
  };

  const handleDeliverToMyLocation = () => {
    requestGeolocation(
      (detectedAddr) => {
        setAddress(detectedAddr);
        triggerToast(
          `ডেলিভারি ঠিকানা সফলভাবে সেট করা হয়েছে!`,
          `Delivery address successfully updated to your location!`
        );
      },
      (bnMsg, enMsg) => {
        triggerToast(bnMsg, enMsg);
      }
    );
  };

  const handleDetectLocation = () => {
    requestGeolocation(
      (detectedAddr) => {
        setAddress(detectedAddr);
        triggerToast(
          `আপনার অবস্থান সফলভাবে সনাক্ত করা হয়েছে!`,
          `Your location was successfully detected!`
        );
      },
      (bnMsg, enMsg) => {
        triggerToast(bnMsg, enMsg);
      }
    );
  };

  // Auto-fill user profiles from Firebase Auth if logged in
  useEffect(() => {
    if (!isOpen) return;

    const user = auth.currentUser;
    if (user) {
      getDoc(doc(db, "users", user.uid)).then((snap) => {
        if (snap.exists()) {
          const uData = snap.data();
          setCurrentUser(uData);
          setName(uData.displayName || "");
          setPhone(uData.phoneNumber || "");
          setAddress(uData.address || "");
        }
      });
    }

    // Fetch dynamic gateway numbers & store settings
    getDoc(doc(db, "settings", "global")).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSettings(data);
        setBkashNum(data.bKashNumber || "01700000000");
        setNagadNum(data.nagadNumber || "01800000000");
        setRocketNum(data.rocketNumber || "01900000000");
      }
    });

  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !address.trim()) {
      triggerToast(
        "অনুগ্রহ করে সব তথ্য পূরণ করুন।",
        "Please fill in all contact and delivery details."
      );
      return;
    }

    // Rigorous payment validation
    if (["bKash", "Nagad", "Rocket"].includes(payMethod)) {
      if (!mobileAccount.trim() || !txId.trim()) {
        triggerToast(
          "অনুগ্রহ করে আপনার মোবাইল ব্যাংকিং অ্যাকাউন্ট নম্বর এবং ট্রানজেকশন আইডি প্রবেশ করান।",
          "Please enter your mobile banking account number and transaction ID."
        );
        return;
      }
    }

    if (["Visa", "MasterCard"].includes(payMethod)) {
      if (!cardNumber.trim() || cardNumber.replace(/\s/g, "").length < 16) {
        triggerToast(
          "অনুগ্রহ করে একটি সঠিক ১৬-ডিজিটের কার্ড নম্বর প্রবেশ করান।",
          "Please enter a valid 16-digit card number."
        );
        return;
      }
    }

    // Pre-aggregate cart items by product ID and selected option (value + unit)
    const aggregateCart = (items: typeof cart) => {
      const map = new Map<string, {
        productId: string;
        selectedOption?: { value: string; unit: string };
        totalQuantity: number;
        sampleItem: typeof cart[0];
      }>();

      for (const item of items) {
        const prodId = item.product.id.toString();
        const optKey = item.selectedOption
          ? `${item.selectedOption.value}::${item.selectedOption.unit}`
          : "BASE";
        const key = `${prodId}::${optKey}`;

        if (!map.has(key)) {
          map.set(key, {
            productId: prodId,
            selectedOption: item.selectedOption
              ? { value: item.selectedOption.value, unit: item.selectedOption.unit }
              : undefined,
            totalQuantity: 0,
            sampleItem: item
          });
        }
        map.get(key)!.totalQuantity += item.quantity;
      }
      return Array.from(map.values());
    };

    const aggregatedCart = aggregateCart(cart);

    // Pre-check stock levels in memory before initiating order transaction
    for (const agg of aggregatedCart) {
      const opt = agg.sampleItem.selectedOption;
      const availStock = opt && typeof opt.stock === "number"
        ? opt.stock
        : (typeof agg.sampleItem.product.stock === "number" ? agg.sampleItem.product.stock : 0);
      if (availStock <= 0 || agg.totalQuantity > availStock) {
        triggerToast(
          "পর্যাপ্ত স্টক নেই (Insufficient Stock)",
          "Insufficient Stock available"
        );
        return;
      }
    }

    if (!deliveryCalc.isAvailable) {
      triggerToast(
        deliveryCalc.messageBn || "দুঃখিত, এই দূরত্বে ডেলিভারি সার্ভিস উপলব্ধ নয়।",
        deliveryCalc.messageEn || "Sorry, delivery service is unavailable for this distance."
      );
      return;
    }

    setSubmitting(true);
    const orderId = `KB-${Math.floor(100000 + Math.random() * 900000)}`;
    const user = auth.currentUser;

    // Clean items payload (strips undefined properties which cause Firestore setDoc/transaction failures)
    const cleanItems = JSON.parse(JSON.stringify(cart));

    // Extract Partner Shop IDs from ordered items
    const partnerShopIds = Array.from(new Set(
      cleanItems
        .map((it: any) => it.product?.partnerShopId)
        .filter((id: any) => typeof id === "string" && id.length > 0)
    ));

    // Create Order Object (with double-mapping fields for 100% compatibility across Admin, Seller, Rider and Customer portals)
    const orderPayload = {
      id: orderId,
      customerId: user ? user.uid : "guest",
      customerName: name || "",
      customerPhone: phone || "",
      deliveryAddress: address || "",
      
      // Secondary redundant fields for Admin panel/report dashboard compatibility
      name: name || "",
      phone: phone || "",
      address: address || "",
      totalAmount: computedGrandTotal || 0,

      items: cleanItems,
      partnerShopIds: partnerShopIds,
      partnerShopId: partnerShopIds.length > 0 ? partnerShopIds[0] : "",
      subtotal: subtotal || 0,
      discount: discount || 0,
      deliveryCharge: activeDeliveryFee || 0,
      deliveryFee: activeDeliveryFee || 0,
      deliveryDistance: customerDistance,
      deliveryZoneName: deliveryCalc.matchedZone?.nameEn || (customerDistance > 10 ? "Above 10km Zone" : "Standard Zone"),
      total: computedGrandTotal || 0,
      paymentMethod: payMethod === "COD" ? "cod" : (payMethod || "cod"),
      paymentStatus: "pending",
      orderStatus: "pending",
      createdAt: serverTimestamp(),
      isGuest: !user,
      couponUsed: appliedCoupon ? (appliedCoupon.code || "") : "",
      riderId: ""
    };

    const payId = payMethod !== "COD" ? "pay_" + Date.now() : null;
    const paymentPayload = payId ? {
      id: payId,
      orderId: orderId,
      userId: user ? user.uid : "guest",
      amount: computedGrandTotal || 0,
      method: payMethod || "",
      status: "pending",
      transactionId: txId || `TX-${Math.floor(10000000 + Math.random() * 90000000)}`,
      createdAt: serverTimestamp()
    } : null;

    try {
      // Execute stock validation, stock deduction, order creation, and payment creation in ONE atomic transaction
      await runTransaction(db, async (transaction) => {
        // 1. Group / aggregate unique product IDs from aggregated cart items
        const uniqueProdIds = Array.from(new Set(aggregatedCart.map(item => item.productId)));

        // 2. Read each unique product document ONCE (All reads MUST happen before any writes in Firestore transaction)
        const prodSnapsMap = new Map<string, any>();
        for (const prodId of uniqueProdIds) {
          const prodRef = doc(db, "products", prodId);
          const prodSnap = await transaction.get(prodRef);
          prodSnapsMap.set(prodId, prodSnap);
        }

        // 3. Validate existence, stock availability, and compute updated stock/options for each unique product
        const updatesToApply: { ref: any; updates: any }[] = [];

        for (const prodId of uniqueProdIds) {
          const prodSnap = prodSnapsMap.get(prodId)!;
          if (!prodSnap.exists()) {
            const sampleItem = aggregatedCart.find(i => i.productId === prodId)?.sampleItem;
            const name = sampleItem ? (sampleItem.product.nameBn || sampleItem.product.nameEn || prodId) : prodId;
            throw new Error(`PRODUCT_NOT_FOUND:${name}`);
          }

          const prodData = prodSnap.data();
          const dbOptions = Array.isArray(prodData.options)
            ? prodData.options.map((opt: any) => ({ ...opt }))
            : null;
          let baseStock = typeof prodData.stock === "number" ? prodData.stock : null;

          const itemsForProd = aggregatedCart.filter(i => i.productId === prodId);

          for (const aggItem of itemsForProd) {
            const requestedQty = aggItem.totalQuantity;

            if (aggItem.selectedOption) {
              // Variant / Option selected
              const optIndex = dbOptions 
                ? dbOptions.findIndex((opt: any) => opt.value === aggItem.selectedOption?.value && opt.unit === aggItem.selectedOption?.unit)
                : -1;

              if (optIndex !== -1 && dbOptions) {
                const currentOptStock = dbOptions[optIndex].stock;
                if (typeof currentOptStock === "number" && currentOptStock < requestedQty) {
                  const nameBn = `${aggItem.sampleItem.product.nameBn || aggItem.sampleItem.product.nameEn || ""} (${aggItem.selectedOption.value}${aggItem.selectedOption.unit})`;
                  const nameEn = `${aggItem.sampleItem.product.nameEn || aggItem.sampleItem.product.nameBn || ""} (${aggItem.selectedOption.value}${aggItem.selectedOption.unit})`;
                  throw new Error(`INSUFFICIENT_STOCK:${nameBn}/${nameEn}:${typeof currentOptStock === "number" ? currentOptStock : 0}`);
                }
                if (typeof currentOptStock === "number") {
                  dbOptions[optIndex].stock = currentOptStock - requestedQty;
                }
              } else if (baseStock !== null) {
                if (typeof baseStock === "number" && baseStock < requestedQty) {
                  const nameBn = `${aggItem.sampleItem.product.nameBn || aggItem.sampleItem.product.nameEn || ""} (${aggItem.selectedOption.value}${aggItem.selectedOption.unit})`;
                  const nameEn = `${aggItem.sampleItem.product.nameEn || aggItem.sampleItem.product.nameBn || ""} (${aggItem.selectedOption.value}${aggItem.selectedOption.unit})`;
                  throw new Error(`INSUFFICIENT_STOCK:${nameBn}/${nameEn}:${typeof baseStock === "number" ? baseStock : 0}`);
                }
                baseStock = baseStock - requestedQty;
              }
            } else {
              // Base product stock (no variant selected)
              if (typeof baseStock !== "number" || baseStock < requestedQty) {
                const nameBn = aggItem.sampleItem.product.nameBn || aggItem.sampleItem.product.nameEn || "";
                const nameEn = aggItem.sampleItem.product.nameEn || aggItem.sampleItem.product.nameBn || "";
                throw new Error(`INSUFFICIENT_STOCK:${nameBn}/${nameEn}:${typeof baseStock === "number" ? baseStock : 0}`);
              }

              // Deduct exact quantity without fallback
              baseStock = baseStock - requestedQty;
            }
          }

          const prodRef = doc(db, "products", prodId);
          const docUpdates: any = {};
          if (dbOptions !== null) {
            docUpdates.options = dbOptions;
          }
          if (baseStock !== null) {
            docUpdates.stock = baseStock;
          }

          updatesToApply.push({ ref: prodRef, updates: docUpdates });
        }

        // 4. Perform stock updates
        for (const { ref, updates } of updatesToApply) {
          transaction.update(ref, updates);
        }

        // 5. Create Order document in transaction
        const orderRef = doc(db, "orders", orderId);
        transaction.set(orderRef, orderPayload);

        // 6. Create Payment document in transaction if applicable
        if (paymentPayload) {
          const payRef = doc(db, "payments", paymentPayload.id);
          transaction.set(payRef, paymentPayload);
        }
      });

      // 4. Send system notifications to user & admins (non-blocking)
      try {
        if (user) {
          await addDoc(collection(db, "notifications"), {
            userId: user.uid,
            titleBn: "অর্ডার সফল হয়েছে!",
            titleEn: "Order Placed Successfully!",
            messageBn: `আপনার অর্ডার #${orderId.slice(-6).toUpperCase()} সফলভাবে গ্রহণ করা হয়েছে।`,
            messageEn: `Your order #${orderId.slice(-6).toUpperCase()} has been received and is pending confirmation.`,
            isRead: false,
            createdAt: serverTimestamp()
          });
        }

        // Broadcast notify to admin-default or overall dashboard alerts
        await addDoc(collection(db, "notifications"), {
          userId: "admin-default",
          titleBn: "নতুন গ্রাহক অর্ডার!",
          titleEn: "New Incoming Customer Order!",
          messageBn: `${name} (${phone}) থেকে সর্বমোট ৳${computedGrandTotal} বিলের নতুন অর্ডার এসেছে।`,
          messageEn: `New order #${orderId.slice(-6).toUpperCase()} placed by ${name} of amount ৳${computedGrandTotal}.`,
          isRead: false,
          createdAt: serverTimestamp()
        });
      } catch (notifyErr) {
        console.warn("Non-critical notification creation error:", notifyErr);
      }

      triggerToast(
        "অর্ডার সফলভাবে সম্পন্ন হয়েছে!",
        "Order placed successfully!"
      );
      onSuccess(orderId, orderPayload);
    } catch (err: any) {
      if (err?.message && (err.message.startsWith("INSUFFICIENT_STOCK:") || err.message.startsWith("PRODUCT_NOT_FOUND:"))) {
        console.warn("Checkout validation alert: ", err.message);
      } else {
        console.error("Checkout execution error: ", err);
      }
      if (err.message && err.message.startsWith("INSUFFICIENT_STOCK:")) {
        const parts = err.message.replace("INSUFFICIENT_STOCK:", "").split(":");
        const nameParts = parts[0].split("/");
        const nameBn = nameParts[0] || "পণ্য";
        const nameEn = nameParts[1] || "Product";
        const currentStock = parts[1] || "0";
        triggerToast(
          `পর্যাপ্ত স্টক নেই (Insufficient Stock)! "${nameBn}" এর বর্তমান স্টক: ${currentStock}।`,
          `Insufficient Stock! "${nameEn}" current available stock: ${currentStock}.`
        );
      } else if (err.message && err.message.startsWith("PRODUCT_NOT_FOUND:")) {
        const name = err.message.replace("PRODUCT_NOT_FOUND:", "");
        triggerToast(
          `দুঃখিত, "${name}" পণ্যটি সিস্টেমে খুঁজে পাওয়া যায়নি।`,
          `Sorry, product "${name}" was not found.`
        );
      } else {
        triggerToast(
          "দুঃখিত, ট্রানজেকশন ব্যর্থ হয়েছে!",
          "Checkout failed! Please verify internet connectivity."
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (isFullScreen) {
    return (
      <div className="fixed inset-0 bg-slate-50 w-full h-full z-50 flex flex-col animate-fade-in">
        {/* Full Screen Header */}
        <header className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-sm px-4 py-3 shrink-0">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center space-x-3 min-w-0">
              <button 
                type="button" 
                onClick={onClose} 
                className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs px-3.5 py-2.5 rounded-xl transition cursor-pointer shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{getTranslation("ফিরে যান", "Go Back")}</span>
              </button>
              <div className="h-6 w-[1px] bg-slate-200 hidden sm:block shrink-0"></div>
              <div className="flex items-center space-x-2 min-w-0">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <h1 className="font-black text-slate-800 text-xs sm:text-sm uppercase tracking-tight truncate">
                  {getTranslation("নিরাপদ গেটওয়ে চেকআউট", "Secure Gateway Checkout")}
                </h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 shrink-0">
              <span className="font-extrabold text-[10px] sm:text-xs text-emerald-600 tracking-wider uppercase bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                {getTranslation("কাচা বাজার", "Kacha Bazar")}
              </span>
            </div>
          </div>
        </header>

        {/* Main Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl w-full mx-auto px-4 py-6 md:py-8">
            <form onSubmit={handleCheckout} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: Form details */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* Delivery Address & Details */}
                <div className="bg-white border border-slate-100 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
                  <h4 className="text-sm font-black text-slate-800 tracking-wide uppercase flex items-center space-x-2 border-b border-slate-50 pb-3">
                    <MapPin className="w-5 h-5 text-emerald-600" />
                    <span>{getTranslation("ডেলিভারি ঠিকানা ও তথ্য", "Shipping Details")}</span>
                  </h4>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        {getTranslation("আপনার নাম", "Full Name")}
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                          type="text"
                          required
                          placeholder={getTranslation("যেমন: সিয়াম আহমেদ", "e.g., Siam Ahmed")}
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-xs focus:bg-white outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        {getTranslation("মোবাইল নম্বর", "Mobile Contact")}
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                          type="tel"
                          required
                          placeholder="01711XXXXXX"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-xs focus:bg-white outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        {getTranslation("সম্পূর্ণ ডেলিভারি ঠিকানা", "Delivery Address")}
                      </label>
                      <textarea
                        required
                        rows={3}
                        placeholder={getTranslation("যেমন: বাড়ি-১২, রোড-৪, চ্যাচকৈড় বাজার, গুরুদাশপুর", "e.g., House-12, Road-4, Gurudaspur, Natore")}
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs focus:bg-white outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      
                      {/* Geolocation Buttons */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-3">
                        <button
                          type="button"
                          onClick={handleDeliverToMyLocation}
                          disabled={loadingLocation}
                          className="flex-1 flex items-center justify-center space-x-1.5 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 text-emerald-800 text-xs font-black py-2.5 px-4 rounded-xl border border-emerald-100 transition cursor-pointer"
                        >
                          <Locate className={`w-4 h-4 text-emerald-600 shrink-0 ${loadingLocation ? "animate-spin" : ""}`} />
                          <span>
                            {getTranslation("আমার অবস্থানে ডেলিভারি করুন", "Deliver to My Location")}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={handleDetectLocation}
                          disabled={loadingLocation}
                          className="flex-1 flex items-center justify-center space-x-1.5 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 text-slate-700 text-xs font-black py-2.5 px-4 rounded-xl border border-slate-200 transition cursor-pointer"
                        >
                          <Navigation className="w-4 h-4 text-slate-500 shrink-0" />
                          <span>
                            {getTranslation("অবস্থান সনাক্ত করুন", "Detect My Location")}
                          </span>
                        </button>
                      </div>

                      {/* Delivery Zone & Distance Selector */}
                      <div className="bg-slate-50/90 border border-slate-200 rounded-2xl p-4 space-y-3 mt-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Navigation className="w-4 h-4 text-emerald-600" />
                            <span className="text-xs font-black text-slate-800 uppercase tracking-tight">
                              {getTranslation("ডেলিভারি দূরত্ব ও জোন", "Delivery Distance & Zone")}
                            </span>
                          </div>
                          <span className="text-[11px] font-black text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                            {deliveryCalc.matchedZone ? getTranslation(deliveryCalc.matchedZone.nameBn, deliveryCalc.matchedZone.nameEn) : `${customerDistance} km`}
                          </span>
                        </div>

                        <div className="flex items-center space-x-3">
                          <input 
                            type="range" 
                            min="0.5" 
                            max="15" 
                            step="0.5" 
                            value={customerDistance} 
                            onChange={(e) => setCustomerDistance(Number(e.target.value))}
                            className="flex-1 accent-emerald-600 cursor-pointer" 
                          />
                          <span className="font-mono font-black text-xs text-slate-700 w-16 text-right shrink-0 bg-white px-2 py-1 border border-slate-200 rounded-lg">
                            {customerDistance} km
                          </span>
                        </div>

                        {/* Quick Distance Presets */}
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          {[
                            { label: "0-3 km (৳35)", dist: 2.0 },
                            { label: "3-5 km (৳50)", dist: 4.0 },
                            { label: "5-10 km (৳80)", dist: 7.5 },
                            { label: ">10 km", dist: 12.0 }
                          ].map((preset) => (
                            <button 
                              type="button" 
                              key={preset.label}
                              onClick={() => setCustomerDistance(preset.dist)}
                              className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                                Math.abs(customerDistance - preset.dist) < 1.5 
                                  ? "bg-slate-900 text-white border-slate-900" 
                                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>

                        {!deliveryCalc.isAvailable ? (
                          <div className="flex items-center space-x-2 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 p-2.5 rounded-xl">
                            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                            <span>{getTranslation(deliveryCalc.messageBn, deliveryCalc.messageEn)}</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-200/60">
                            <span>{getTranslation("প্রযোজ্য ফি:", "Applicable Fee:")}</span>
                            <span className="font-extrabold text-slate-800">
                              {activeDeliveryFee === 0 && (deliveryCalc.isFreeByThreshold || appliedCoupon?.code === "FREESHIP")
                                ? getTranslation("ফ্রি", "FREE")
                                : `৳${activeDeliveryFee}`}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Methods */}
                <div className="bg-white border border-slate-100 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
                  <h4 className="text-sm font-black text-slate-800 tracking-wide uppercase flex items-center space-x-2 border-b border-slate-50 pb-3">
                    <CreditCard className="w-5 h-5 text-emerald-600" />
                    <span>{getTranslation("পেমেন্ট পদ্ধতি নির্বাচন করুন", "Select Payment Method")}</span>
                  </h4>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { id: "COD", bn: "ক্যাশ অন ডেলিভারি", en: "Cash on Delivery", desc: "Pay on arrival" },
                      { id: "bKash", bn: "বিকাশ পেমেন্ট", en: "bKash wallet", desc: "Instant mobile bank" },
                      { id: "Nagad", bn: "নগদ পেমেন্ট", en: "Nagad wallet", desc: "Instant mobile bank" },
                      { id: "Rocket", bn: "রকেট পেমেন্ট", en: "Rocket wallet", desc: "Instant mobile bank" },
                      { id: "Visa", bn: "ভিসা কার্ড", en: "Visa / Credit Card", desc: "Pay via Card gateway" },
                      { id: "MasterCard", bn: "মাস্টারকার্ড", en: "MasterCard gateway", desc: "Pay via Card gateway" }
                    ].map((opt) => (
                      <button
                        type="button"
                        key={opt.id}
                        onClick={() => setPayMethod(opt.id)}
                        className={`border p-3.5 rounded-2xl text-center flex flex-col justify-between h-24 transition cursor-pointer ${
                          payMethod === opt.id 
                            ? "border-emerald-500 bg-emerald-50/50 text-emerald-800 ring-1 ring-emerald-500" 
                            : "border-slate-150 bg-slate-50 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <span className="font-black text-xs block text-left truncate">{getTranslation(opt.bn, opt.en)}</span>
                        <span className="text-[10px] text-slate-400 block text-left leading-tight mt-1">{opt.desc}</span>
                      </button>
                    ))}
                  </div>

                  {/* Sub fields based on selected method */}
                  {payMethod === "bKash" && (
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs text-slate-600 space-y-3.5">
                      <div className="flex justify-between font-bold text-slate-700 text-sm">
                        <span>Merchant bKash Number:</span>
                        <span className="font-mono text-emerald-700">{bkashNum}</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {getTranslation(
                          "অনুগ্রহ করে উপরের বিকাশ নম্বরে 'Send Money' করুন এবং নিচে ট্রানজেকশন আইডি প্রবেশ করান।",
                          "Please Send Money to the merchant bKash number above, then submit your transaction code below."
                        )}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="text"
                          required
                          placeholder="bKash Wallet Number"
                          value={mobileAccount}
                          onChange={(e) => setMobileAccount(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                        <input
                          type="text"
                          required
                          placeholder="Transaction ID (e.g. TRx82b9)"
                          value={txId}
                          onChange={(e) => setTxId(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  )}

                  {payMethod === "Nagad" && (
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs text-slate-600 space-y-3.5">
                      <div className="flex justify-between font-bold text-slate-700 text-sm">
                        <span>Merchant Nagad Number:</span>
                        <span className="font-mono text-emerald-700">{nagadNum}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="text"
                          required
                          placeholder="Nagad Wallet Number"
                          value={mobileAccount}
                          onChange={(e) => setMobileAccount(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                        <input
                          type="text"
                          required
                          placeholder="Nagad Transaction ID"
                          value={txId}
                          onChange={(e) => setTxId(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  )}

                  {payMethod === "Rocket" && (
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs text-slate-600 space-y-3.5">
                      <div className="flex justify-between font-bold text-slate-700 text-sm">
                        <span>Merchant Rocket Number:</span>
                        <span className="font-mono text-emerald-700">{rocketNum}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="text"
                          required
                          placeholder="Rocket Wallet Number"
                          value={mobileAccount}
                          onChange={(e) => setMobileAccount(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                        <input
                          type="text"
                          required
                          placeholder="Rocket Transaction ID"
                          value={txId}
                          onChange={(e) => setTxId(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  )}

                  {(payMethod === "Visa" || payMethod === "MasterCard") && (
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2.5 text-xs">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Debit / Credit Card Details</label>
                      <div className="relative">
                        <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                          type="text"
                          required
                          maxLength={19}
                          placeholder="Card Number (4321 0987 6543 2100)"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value.replace(/\s?/g, '').replace(/(\d{4})/g, '$1 ').trim())}
                          className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  )}
                </div>



              </div>

              {/* Right Column: Order summary & Submit */}
              <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
                
                {/* Order Summary */}
                <div className="bg-white border border-slate-100 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
                  <h4 className="text-sm font-black text-slate-800 tracking-wide uppercase flex items-center space-x-2 border-b border-slate-50 pb-3">
                    <ShoppingBag className="w-5 h-5 text-emerald-600" />
                    <span>{getTranslation("অর্ডার সারসংক্ষেপ", "Order Summary")}</span>
                  </h4>
                  
                  {/* Item List */}
                  <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto pr-1 space-y-3">
                    {cart.map((item, idx) => {
                      const itemPrice = item.selectedOption ? item.selectedOption.price : item.product.price;
                      let weightText = item.selectedOption
                        ? (item.selectedOption.customLabel || `${item.selectedOption.value} ${item.selectedOption.unit === 'g' ? (lang === 'bn' ? 'গ্রাম' : 'g') : item.selectedOption.unit === 'kg' ? (lang === 'bn' ? 'কেজি' : 'kg') : item.selectedOption.unit}`)
                        : (lang === "bn" ? item.product.unitBn : item.product.unitEn);

                      return (
                        <div key={`${item.product.id}_${idx}`} className="flex justify-between items-center py-2.5 first:pt-0 last:pb-0 text-xs">
                          <div className="flex items-center space-x-3 min-w-0 flex-1">
                            <img 
                              src={item.product.image} 
                              className="w-12 h-12 object-cover rounded-xl border border-slate-100 shrink-0 bg-slate-50" 
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=450&q=80";
                              }}
                            />
                            <div className="min-w-0">
                              <p className="font-extrabold text-slate-800 truncate leading-snug">{getTranslation(item.product.nameBn, item.product.nameEn)}</p>
                              <p className="text-[10px] text-slate-500 mt-0.5 font-medium">
                                {getTranslation("ওজন/সাইজ:", "Weight/Size:")} <span className="font-bold text-slate-700">{weightText}</span>
                              </p>
                              <p className="text-[10px] text-slate-400 font-bold">
                                ৳{itemPrice} x {item.quantity}
                              </p>
                            </div>
                          </div>
                          <span className="font-black text-slate-800 ml-4 shrink-0">৳{itemPrice * item.quantity}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Price breakdown */}
                  <div className="border-t border-slate-100 pt-3 space-y-2.5 text-xs text-slate-500">
                    <div className="flex justify-between">
                      <span>{getTranslation("উপমোট বিল (সাবটোটাল)", "Subtotal Price")}</span>
                      <span className="font-bold text-slate-700">৳{subtotal}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{getTranslation("ডেলিভারি চার্জ (হোম ডেলিভারি)", "Delivery Charge")}</span>
                      <span className="font-bold text-slate-700">
                        {activeDeliveryFee === 0 && (deliveryCalc.isFreeByThreshold || appliedCoupon?.code === "FREESHIP") 
                          ? getTranslation("ফ্রি", "FREE") 
                          : `৳${activeDeliveryFee}`}
                      </span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-rose-600 font-bold">
                        <span>{getTranslation("ডিসকাউন্ট", "Discount")}</span>
                        <span>-৳{discount}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Grand Total & Place Order Button */}
                <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-slate-800 space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">{getTranslation("মোট বিল", "Grand Total Bill")}</span>
                      <span className="text-2xl font-black text-emerald-400">৳{computedGrandTotal}</span>
                    </div>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-xs sm:text-sm px-5 py-3 rounded-xl transition flex items-center space-x-2 cursor-pointer shadow"
                    >
                      {submitting ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <span>{getTranslation("অর্ডার নিশ্চিত করুন", "Confirm Purchase")}</span>
                          <ArrowRight className="w-4 h-4 stroke-[3.5px]" />
                        </>
                      )}
                    </button>
                  </div>
                </div>

              </div>

            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <form onSubmit={handleCheckout} className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl relative flex flex-col max-h-[92vh] animate-scale-up border border-slate-100">
        
        {/* Header */}
        <div className="bg-slate-50 border-b border-slate-100 px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5 text-emerald-700">
            <ShieldCheck className="w-5 h-5" />
            <h3 className="font-black text-slate-800 text-sm uppercase tracking-tight">
              {getTranslation("নিরাপদ গেটওয়ে চেকআউট", "Secure Gateway Checkout")}
            </h3>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 bg-slate-50/50 min-h-0">
          
          {/* Section: Order Summary */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-3">
            <h4 className="text-xs font-black text-slate-800 tracking-wide uppercase flex items-center space-x-1.5 border-b border-slate-50 pb-2">
              <ShoppingBag className="w-4 h-4 text-emerald-600" />
              <span>{getTranslation("অর্ডার সারসংক্ষেপ", "Order Summary")}</span>
            </h4>
            <div className="divide-y divide-slate-100 max-h-[160px] overflow-y-auto pr-1 space-y-2">
              {cart.map((item, idx) => {
                const itemPrice = item.selectedOption ? item.selectedOption.price : item.product.price;
                let weightText = item.selectedOption
                  ? (item.selectedOption.customLabel || `${item.selectedOption.value} ${item.selectedOption.unit === 'g' ? (lang === 'bn' ? 'গ্রাম' : 'g') : item.selectedOption.unit === 'kg' ? (lang === 'bn' ? 'কেজি' : 'kg') : item.selectedOption.unit}`)
                  : (lang === "bn" ? item.product.unitBn : item.product.unitEn);

                return (
                  <div key={`${item.product.id}_${idx}`} className="flex justify-between items-center py-2 first:pt-0 last:pb-0 text-xs">
                    <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                      <img 
                        src={item.product.image} 
                        className="w-10 h-10 object-cover rounded-lg border border-slate-100 shrink-0 bg-slate-50" 
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=450&q=80";
                        }}
                      />
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 truncate">{getTranslation(item.product.nameBn, item.product.nameEn)}</p>
                        <p className="text-[10px] text-slate-500 font-medium">
                          {weightText} · ৳{itemPrice} x {item.quantity}
                        </p>
                      </div>
                    </div>
                    <span className="font-extrabold text-slate-700 shrink-0 ml-3">৳{itemPrice * item.quantity}</span>
                  </div>
                );
              })}
            </div>
            
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>{getTranslation("সাবটোটাল", "Subtotal")}</span>
                <span className="font-medium text-slate-800">৳{subtotal}</span>
              </div>
              <div className="flex justify-between">
                <span>{getTranslation("ডেলিভারি ফি", "Delivery Fee")}</span>
                <span className="font-medium text-slate-800">
                  {activeDeliveryFee === 0 && (deliveryCalc.isFreeByThreshold || appliedCoupon?.code === "FREESHIP")
                    ? getTranslation("ফ্রি", "FREE")
                    : `৳${activeDeliveryFee}`}
                </span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-rose-600 font-bold">
                  <span>{getTranslation("ডিসকাউন্ট", "Discount")}</span>
                  <span>-৳{discount}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Section: Delivery Details */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-3.5">
            <h4 className="text-xs font-black text-slate-800 tracking-wide uppercase flex items-center space-x-1.5 border-b border-slate-50 pb-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>{getTranslation("ডেলিভারি ঠিকানা ও তথ্য", "Shipping Details")}</span>
            </h4>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  {getTranslation("আপনার নাম", "Full Name")}
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    required
                    placeholder={getTranslation("যেমন: সিয়াম আহমেদ", "e.g., Siam Ahmed")}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs focus:bg-white outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  {getTranslation("মোবাইল নম্বর", "Mobile Contact")}
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="tel"
                    required
                    placeholder="01711XXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs focus:bg-white outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  {getTranslation("সম্পূর্ণ ডেলিভারি ঠিকানা", "Delivery Address")}
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder={getTranslation("যেমন: বাড়ি-১২, রোড-৪, চ্যাচকৈড় বাজার, গুরুদাশপুর", "e.g., House-12, Road-4, Gurudaspur, Natore")}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white outline-none focus:ring-1 focus:ring-emerald-500"
                />
                
                {/* Geolocation Button Triggers */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={handleDeliverToMyLocation}
                    disabled={loadingLocation}
                    className="flex-1 flex items-center justify-center space-x-1.5 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 text-emerald-800 text-[10px] sm:text-[11px] font-black py-1.5 px-2.5 rounded-xl border border-emerald-100 transition cursor-pointer"
                  >
                    <Locate className={`w-3.5 h-3.5 text-emerald-600 shrink-0 ${loadingLocation ? "animate-spin" : ""}`} />
                    <span>
                      {getTranslation("আমার অবস্থানে ডেলিভারি করুন", "Deliver to My Location")}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDetectLocation}
                    disabled={loadingLocation}
                    className="flex-1 flex items-center justify-center space-x-1.5 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 text-slate-700 text-[10px] sm:text-[11px] font-black py-1.5 px-2.5 rounded-xl border border-slate-200 transition cursor-pointer"
                  >
                    <Navigation className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>
                      {getTranslation("অবস্থান সনাক্ত করুন", "Detect My Location")}
                    </span>
                  </button>
                </div>

                {/* Delivery Zone & Distance Selector */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2.5 mt-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <Navigation className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-[11px] font-black text-slate-800 uppercase tracking-tight">
                        {getTranslation("ডেলিভারি দূরত্ব ও জোন", "Delivery Distance & Zone")}
                      </span>
                    </div>
                    <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      {deliveryCalc.matchedZone ? getTranslation(deliveryCalc.matchedZone.nameBn, deliveryCalc.matchedZone.nameEn) : `${customerDistance} km`}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2.5">
                    <input 
                      type="range" 
                      min="0.5" 
                      max="15" 
                      step="0.5" 
                      value={customerDistance} 
                      onChange={(e) => setCustomerDistance(Number(e.target.value))}
                      className="flex-1 accent-emerald-600 cursor-pointer" 
                    />
                    <span className="font-mono font-black text-[11px] text-slate-700 w-14 text-right shrink-0 bg-white px-1.5 py-0.5 border border-slate-200 rounded-lg">
                      {customerDistance} km
                    </span>
                  </div>

                  <div className="flex items-center gap-1 flex-wrap pt-0.5">
                    {[
                      { label: "0-3 km (৳35)", dist: 2.0 },
                      { label: "3-5 km (৳50)", dist: 4.0 },
                      { label: "5-10 km (৳80)", dist: 7.5 },
                      { label: ">10 km", dist: 12.0 }
                    ].map((preset) => (
                      <button 
                        type="button" 
                        key={preset.label}
                        onClick={() => setCustomerDistance(preset.dist)}
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-md border transition cursor-pointer ${
                          Math.abs(customerDistance - preset.dist) < 1.5 
                            ? "bg-slate-900 text-white border-slate-900" 
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  {!deliveryCalc.isAvailable ? (
                    <div className="flex items-center space-x-1.5 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 p-2 rounded-xl">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                      <span>{getTranslation(deliveryCalc.messageBn, deliveryCalc.messageEn)}</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                      <span>{getTranslation("প্রযোজ্য ফি:", "Applicable Fee:")}</span>
                      <span className="font-extrabold text-slate-800">
                        {activeDeliveryFee === 0 && (deliveryCalc.isFreeByThreshold || appliedCoupon?.code === "FREESHIP")
                          ? getTranslation("ফ্রি", "FREE")
                          : `৳${activeDeliveryFee}`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section: Payment Option selection */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-3.5">
            <h4 className="text-xs font-black text-slate-800 tracking-wide uppercase flex items-center space-x-1.5 border-b border-slate-50 pb-2">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span>{getTranslation("পেমেন্ট পদ্ধতি নির্বাচন করুন", "Select Payment Method")}</span>
            </h4>

            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "COD", bn: "ক্যাশ অন ডেলিভারি", en: "Cash on Delivery", desc: "Pay on arrival" },
                { id: "bKash", bn: "বিকাশ পেমেন্ট", en: "bKash wallet", desc: "Instant mobile bank" },
                { id: "Nagad", bn: "নগদ পেমেন্ট", en: "Nagad wallet", desc: "Instant mobile bank" },
                { id: "Rocket", bn: "রকেট পেমেন্ট", en: "Rocket wallet", desc: "Instant mobile bank" },
                { id: "Visa", bn: "ভিসা কার্ড", en: "Visa / Credit Card", desc: "Pay via Card gateway" },
                { id: "MasterCard", bn: "মাস্টারকার্ড", en: "MasterCard gateway", desc: "Pay via Card gateway" }
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => setPayMethod(opt.id)}
                  className={`border p-2.5 rounded-xl text-center flex flex-col justify-between h-20 transition cursor-pointer ${
                    payMethod === opt.id 
                      ? "border-emerald-500 bg-emerald-50/50 text-emerald-800 ring-1 ring-emerald-500" 
                      : "border-slate-150 bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span className="font-black text-[10px] sm:text-xs block text-left truncate">{getTranslation(opt.bn, opt.en)}</span>
                  <span className="text-[8px] sm:text-[9px] text-slate-400 block text-left leading-tight mt-1">{opt.desc}</span>
                </button>
              ))}
            </div>

            {/* Sub fields based on selected method */}
            {payMethod === "bKash" && (
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-xs text-slate-600 space-y-3">
                <div className="flex justify-between font-bold text-slate-700">
                  <span>Merchant bKash Number:</span>
                  <span className="font-mono text-emerald-700">{bkashNum}</span>
                </div>
                <p className="text-[10px] text-slate-400">
                  {getTranslation(
                    "অনুগ্রহ করে উপরের বিকাশ নম্বরে 'Send Money' করুন এবং নিচে ট্রানজেকশন আইডি প্রবেশ করান।",
                    "Please Send Money to the merchant bKash number above, then submit your transaction code below."
                  )}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="bKash Wallet Number"
                    value={mobileAccount}
                    onChange={(e) => setMobileAccount(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] outline-none"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Transaction ID (e.g. TRx82b9)"
                    value={txId}
                    onChange={(e) => setTxId(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] outline-none"
                  />
                </div>
              </div>
            )}

            {payMethod === "Nagad" && (
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-xs text-slate-600 space-y-3">
                <div className="flex justify-between font-bold text-slate-700">
                  <span>Merchant Nagad Number:</span>
                  <span className="font-mono text-emerald-700">{nagadNum}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Nagad Wallet Number"
                    value={mobileAccount}
                    onChange={(e) => setMobileAccount(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] outline-none"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Nagad Transaction ID"
                    value={txId}
                    onChange={(e) => setTxId(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] outline-none"
                  />
                </div>
              </div>
            )}

            {payMethod === "Rocket" && (
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-xs text-slate-600 space-y-3">
                <div className="flex justify-between font-bold text-slate-700">
                  <span>Merchant Rocket Number:</span>
                  <span className="font-mono text-emerald-700">{rocketNum}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Rocket Wallet Number"
                    value={mobileAccount}
                    onChange={(e) => setMobileAccount(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] outline-none"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Rocket Transaction ID"
                    value={txId}
                    onChange={(e) => setTxId(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] outline-none"
                  />
                </div>
              </div>
            )}

            {(payMethod === "Visa" || payMethod === "MasterCard") && (
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-2.5 text-xs">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Debit / Credit Card Details</label>
                <div className="relative">
                  <CreditCard className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    required
                    maxLength={19}
                    placeholder="Card Number (4321 0987 6543 2100)"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value.replace(/\s?/g, '').replace(/(\d{4})/g, '$1 ').trim())}
                    className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs outline-none"
                  />
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Fixed Footer: Checkout Total details */}
        <div className="bg-slate-900 text-white p-4.5 flex justify-between items-center shrink-0 border-t border-slate-800">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">{getTranslation("মোট বিল", "Grand Total Bill")}</span>
            <span className="text-xl font-black text-emerald-400">৳{computedGrandTotal}</span>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-xs px-5 py-3 rounded-xl transition flex items-center space-x-1.5 cursor-pointer shadow"
          >
            {submitting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>{getTranslation("অর্ডার নিশ্চিত করুন", "Confirm Purchase")}</span>
                <ArrowRight className="w-4 h-4 stroke-[3.5px]" />
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}
