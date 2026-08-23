import React, { useState, useEffect, useCallback, useMemo } from "react";
import { 
  LayoutGrid, Salad, Apple, Beef, Egg, Wheat, Flame, Cookie, 
  Droplet, Heart, Baby, Candy, Snowflake, Coffee, Dog, Star, Search, 
  Mic, ShoppingCart, Truck, ShieldCheck, Banknote, RefreshCw, Sparkles, 
  ChevronLeft, ChevronRight, Share2, Eye, Plus, Minus, Trash2, X, 
  MapPin, Bell, User, Check, Send, Tag, Gift, Award, Smartphone, 
  QrCode, ArrowRight, ArrowLeft, ThumbsUp, Info, ChevronDown, ChevronUp, CheckCircle, Percent, Volume2,
  Phone, Mail, ExternalLink, Navigation, Locate, Copy, Zap, Printer, Download, FileText, Loader2, Wifi, WifiOff
} from "lucide-react";
import OrderMemoModal from "./components/portal/OrderMemoModal";
import { downloadMemoPDF } from "./lib/pdfUtils";
import { PRODUCTS as initialProducts, CATEGORIES as initialCategories, PROMO_BANNERS, REVIEWS as initialReviews, RECIPES } from "./data";
import { Product, Category, CartItem, Review, ProductOption } from "./types";

const PortalModal = React.lazy(() => import("./components/portal/PortalModal"));
const CheckoutModal = React.lazy(() => import("./components/CheckoutModal"));
const CustomerLiveChat = React.lazy(() => import("./components/CustomerLiveChat"));
import { seedDatabase, db, collection, onSnapshot, auth, onAuthStateChanged, doc, getDoc, setDoc, query, where, limit, orderBy, or, addDoc, deleteDoc, serverTimestamp } from "./lib/firebase";
import { calculateDeliveryFeeFromSettings } from "./lib/delivery";
import { BannerSlider } from "./components/BannerSlider";
import { motion, AnimatePresence } from "motion/react";

import makkahImg from "./assets/images/makkah.jpg";
import madinaImg from "./assets/images/madina_dome_1784201787764.jpg";
import bismillahImg from "./assets/images/bismillah_glow_1784201804085.jpg";
import kalemaImg from "./assets/images/kalema_calligraphy_1784201818922.jpg";
import logoImg from "./assets/images/logo_1783882658678.jpg";
import founderImg from "./assets/images/founder_md_anik_1784735314684.jpg";
import chairmanImg from "./assets/images/chairman_hosne_ara_1784735275933.jpg";
import viceChairmanImg from "./assets/images/vice_chairman_abu_hanif_1784735297437.jpg";

// Helper to translate numbers to Bangla script (pure stateless helper moved outside to avoid re-creation)
const toBnNum = (num: number | string): string => {
  const digits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  return num.toString().split("").map(char => {
    const p = parseInt(char, 10);
    return isNaN(p) ? char : digits[p];
  }).join("");
};

// Helper to map Firestore doc data to Product type (stateless mapping moved outside)
const mapDocToProduct = (docId: string, data: any): Product => {
  return {
    id: data.id || docId,
    nameBn: data.nameBn,
    nameEn: data.nameEn,
    price: Number(data.price),
    originalPrice: data.originalPrice ? Number(data.originalPrice) : undefined,
    unitBn: data.unitBn,
    unitEn: data.unitEn,
    category: data.category,
    image: data.image,
    isFlashSale: !!data.isFlashSale,
    discount: Number(data.discount || 0),
    rating: Number(data.rating || 4.5),
    stock: typeof data.stock === "number" && !isNaN(data.stock)
      ? data.stock
      : (data.stock !== undefined && data.stock !== null && data.stock !== "" ? Number(data.stock) : 50),
    descriptionBn: data.descriptionBn || "",
    descriptionEn: data.descriptionEn || "",
    isBestSelling: !!data.isBestSelling,
    isNewArrival: !!data.isNewArrival,
    isPopular: !!data.isPopular,
    isSeasonal: !!data.isSeasonal,
    isCombo: !!data.isCombo,
    isBuyMoreSaveMore: !!data.isBuyMoreSaveMore,
    brand: data.brand || "Kacha Bazar",
    reviewCount: Number(data.reviewCount || 1),
    sellerId: data.sellerId || "admin",
    sku: data.sku || `KB-${data.category?.substring(0, 3).toUpperCase()}-${data.id}`,
    subcategory: data.subcategory || "General",
    options: data.options || [],
    isAvailable: data.isAvailable !== false,
    displayOrder: typeof data.displayOrder === "number" ? data.displayOrder : (typeof data.order === "number" ? data.order : undefined),
    order: typeof data.order === "number" ? data.order : (typeof data.displayOrder === "number" ? data.displayOrder : undefined)
  } as Product;
};

// Helper to extract or generate available weight/unit options for a product
export const getProductWeightOptions = (product: Product): ProductOption[] => {
  if (product.options && Array.isArray(product.options) && product.options.length > 0) {
    return product.options;
  }

  const basePrice = product.price || 0;
  const baseStock = typeof product.stock === "number" ? product.stock : 50;
  const unitEn = (product.unitEn || "").toLowerCase().trim();
  const unitBn = (product.unitBn || "").trim();

  const makeOpt = (value: number, unit: string, priceRatio: number, stock?: number): ProductOption => ({
    value,
    unit,
    price: Math.max(1, Math.round(basePrice * priceRatio)),
    stock: stock !== undefined ? stock : baseStock
  });

  const isKg = unitEn.includes("kg") || unitBn.includes("কেজি");
  const isG = unitEn.includes("g") || unitBn.includes("গ্রাম");

  if (isKg || isG) {
    let baseInKg = 1;
    if (unitEn.includes("500") || unitBn.includes("৫০০")) baseInKg = 0.5;
    else if (unitEn.includes("250") || unitBn.includes("২৫০")) baseInKg = 0.25;
    else if (unitEn.includes("1.5") || unitBn.includes("১.৫")) baseInKg = 1.5;
    else if (unitEn.includes("2") || unitBn.includes("২")) baseInKg = 2;
    else if (isG && !isKg) baseInKg = 0.5;

    return [
      makeOpt(250, "g", 0.25 / baseInKg),
      makeOpt(500, "g", 0.5 / baseInKg),
      makeOpt(1, "kg", 1 / baseInKg),
      makeOpt(1.5, "kg", 1.5 / baseInKg),
      makeOpt(2, "kg", 2 / baseInKg),
    ];
  }

  const isL = unitEn.includes("liter") || unitEn.includes("litre") || unitEn.includes(" l") || unitEn === "l" || unitBn.includes("লিটার");
  const isMl = unitEn.includes("ml") || unitBn.includes("মিলি");

  if (isL || isMl) {
    let baseInL = 1;
    if (unitEn.includes("500") || unitBn.includes("৫০০")) baseInL = 0.5;
    else if (unitEn.includes("250") || unitBn.includes("২৫০")) baseInL = 0.25;
    else if (unitEn.includes("2") || unitBn.includes("২")) baseInL = 2;

    return [
      makeOpt(250, "ml", 0.25 / baseInL),
      makeOpt(500, "ml", 0.5 / baseInL),
      makeOpt(1, "L", 1 / baseInL),
      makeOpt(2, "L", 2 / baseInL),
      makeOpt(5, "L", 5 / baseInL),
    ];
  }

  if (Array.isArray(product.weightSizeOptions) && product.weightSizeOptions.length > 1) {
    return product.weightSizeOptions.map((optStr) => {
      const match = optStr.match(/([\d.]+)\s*([a-zA-Z]+)/);
      if (match) {
        const val = parseFloat(match[1]);
        const u = match[2];
        return makeOpt(val, u, 1);
      }
      return makeOpt(1, optStr, 1);
    });
  }

  return [
    makeOpt(1, product.unitEn || "unit", 1, baseStock)
  ];
};

export const getOptionLabel = (opt: ProductOption, lang: "bn" | "en", fmtNum: (n: number | string) => string) => {
  let unitText = opt.unit;
  let valText = String(opt.value);
  if (lang === "bn") {
    valText = fmtNum(opt.value);
    if (opt.unit === "g") unitText = "গ্রাম";
    else if (opt.unit === "kg") unitText = "কেজি";
    else if (opt.unit === "ml") unitText = "মি.লি.";
    else if (opt.unit === "L") unitText = "লিটার";
    else if (opt.unit.toLowerCase() === "pc" || opt.unit.toLowerCase() === "pcs") unitText = "টি";
  }
  return `${valText} ${unitText} - ৳${fmtNum(opt.price)}`;
};

export default function App() {
  // Localization: 'bn' (Bangla) or 'en' (English)
  const [lang, setLang] = useState<"bn" | "en">("bn");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [popularLimit, setPopularLimit] = useState<number>(4);
  const [newArrivalsLimit, setNewArrivalsLimit] = useState<number>(4);
  const [bestSellersLimit, setBestSellersLimit] = useState<number>(4);
  const [categoryLimit, setCategoryLimit] = useState<number>(8);
  const [showFlashSaleOnly, setShowFlashSaleOnly] = useState<boolean>(false);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("default");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeBanner, setActiveBanner] = useState<number>(0);
  const [showAllMobile, setShowAllMobile] = useState<boolean>(false);
  
  // Interactive E-commerce state
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem("kb_cart");
    return saved ? JSON.parse(saved) : [];
  });
  
  const [wishlist, setWishlist] = useState<string[]>(() => {
    const saved = localStorage.getItem("kb_wishlist");
    return saved ? JSON.parse(saved) : [];
  });

  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>(() => {
    // Seed with two default products so it doesn't start empty
    return [initialProducts[0], initialProducts[7]];
  });

  // UI Drawers & Modals
  const [showCart, setShowCart] = useState<boolean>(false);
  const [showWishlist, setShowWishlist] = useState<boolean>(false);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [voiceSearching, setVoiceSearching] = useState<boolean>(false);
  const [showLocationSelect, setShowLocationSelect] = useState<boolean>(false);
  const [currentLocation, setCurrentLocation] = useState<string>("চাঁচকৈড় বাজার, গুরুদাশপুর, নাটোর");
  const [loadingLocation, setLoadingLocation] = useState<boolean>(false);
  
  // Coupon and Checkout states
  const [couponCode, setCouponCode] = useState<string>("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [checkoutStatus, setCheckoutStatus] = useState<"idle" | "loading" | "success">("idle");
  const [completedOrder, setCompletedOrder] = useState<any | null>(null);
  const [showMemoModal, setShowMemoModal] = useState<boolean>(false);
  const [downloadingPDF, setDownloadingPDF] = useState<boolean>(false);

  const handleDownloadOrderPDF = async () => {
    if (downloadingPDF || !completedOrder) return;
    setDownloadingPDF(true);
    setShowMemoModal(true);
    setTimeout(async () => {
      const el = document.getElementById("printable-memo-card");
      try {
        await downloadMemoPDF(el, completedOrder);
        triggerToast("পিডিএফ মেমো ডাউনলোড সফল হয়েছে!", "PDF Memo downloaded successfully!");
      } catch (err) {
        console.error("PDF download error:", err);
        triggerToast(
          "মেমো ডাউনলোড করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।",
          "Failed to generate PDF memo. Please try again."
        );
      }
      setDownloadingPDF(false);
    }, 400);
  };

  // Portal and Checkout modals
  const [showPortalModal, setShowPortalModal] = useState<boolean>(false);
  const [portalInitialTab, setPortalInitialTab] = useState<"dashboard" | "orders" | "wallet" | "referral" | "notifications">("dashboard");
  const [forcedPortalRole, setForcedPortalRole] = useState<"customer" | "admin" | "seller" | "rider">("customer");
  const [loggedInUser, setLoggedInUser] = useState<any | null>(null);
  const [userRole, setUserRole] = useState<string>("customer");
  const [userReferralCode, setUserReferralCode] = useState<string>("");

  // Listen for URL panel routes (/admin, /seller, /rider, ?panel=admin, #admin, etc.)
  useEffect(() => {
    const checkPanelRoute = () => {
      const path = window.location.pathname.toLowerCase();
      const search = new URLSearchParams(window.location.search);
      const hash = window.location.hash.toLowerCase();

      let matchedRole: "admin" | "seller" | "rider" | null = null;

      if (path === "/admin" || path.startsWith("/admin/") || search.get("panel") === "admin" || search.get("portal") === "admin" || hash === "#admin" || hash.startsWith("#admin")) {
        matchedRole = "admin";
      } else if (path === "/seller" || path.startsWith("/seller/") || search.get("panel") === "seller" || search.get("portal") === "seller" || hash === "#seller" || hash.startsWith("#seller")) {
        matchedRole = "seller";
      } else if (path === "/rider" || path.startsWith("/rider/") || search.get("panel") === "rider" || search.get("portal") === "rider" || hash === "#rider" || hash.startsWith("#rider")) {
        matchedRole = "rider";
      }

      if (matchedRole) {
        setForcedPortalRole(matchedRole);
        setShowPortalModal(true);
      }
    };

    checkPanelRoute();
    window.addEventListener("popstate", checkPanelRoute);
    window.addEventListener("hashchange", checkPanelRoute);
    return () => {
      window.removeEventListener("popstate", checkPanelRoute);
      window.removeEventListener("hashchange", checkPanelRoute);
    };
  }, []);

  const [showCheckoutModal, setShowCheckoutModal] = useState<boolean>(false);
  const [showAboutModal, setShowAboutModal] = useState<boolean>(false);
  const [showContactModal, setShowContactModal] = useState<boolean>(false);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);

  // Dynamic image verification and safe loading status
  const [imagesLoaded, setImagesLoaded] = useState({
    makkah: true,
    madina: true,
    bismillah: true,
    kalema: true,
    logo: true,
  });

  // Global Admin Settings state
  const [globalSettings, setGlobalSettings] = useState<any | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "settings", "global"),
      (snap) => {
        if (snap.exists()) {
          setGlobalSettings(snap.data());
        }
      },
      (err) => console.warn("Firestore global settings sync notice:", err.message)
    );
    return () => unsub();
  }, []);

  // Pricing math (Memoized to prevent redundant array traversals and calculations on re-render)
  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => {
      const price = item.selectedOption ? item.selectedOption.price : item.product.price;
      return acc + price * item.quantity;
    }, 0);
  }, [cart]);

  const deliveryFee = useMemo(() => {
    if (cart.length === 0) return 0;
    if (appliedCoupon?.code === "FREESHIP") return 0;
    const calc = calculateDeliveryFeeFromSettings(2.0, subtotal, globalSettings);
    return calc.fee;
  }, [cart, appliedCoupon, subtotal, globalSettings]);

  const discountAmt = useMemo(() => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.code === "FREESHIP") return 0;
    return Math.round((subtotal * appliedCoupon.discount) / 100);
  }, [appliedCoupon, subtotal]);

  const grandTotal = useMemo(() => {
    return subtotal + deliveryFee - discountAmt;
  }, [subtotal, deliveryFee, discountAmt]);

  // Parse referral code from url if present
  useEffect(() => {
    let ref = new URLSearchParams(window.location.search).get("ref") ||
              new URLSearchParams(window.location.search).get("referredBy");
    
    if (!ref && window.location.hash) {
      const hashParts = window.location.hash.split("?");
      if (hashParts.length > 1) {
        const hashParams = new URLSearchParams(hashParts[1]);
        ref = hashParams.get("ref") || hashParams.get("referredBy");
      }
    }

    if (ref) {
      const cleanRef = ref.trim().toUpperCase();
      localStorage.setItem("referredBy", cleanRef);
      triggerToast(
        `রেফারেল কোড (${cleanRef}) সফলভাবে সংরক্ষণ করা হয়েছে! সাইন আপ করলেই পাবেন উপহার।`,
        `Referral code (${cleanRef}) successfully applied! Sign up to claim your reward.`
      );
    }
  }, []);

  // Listen to Auth State and Fetch Referral Code & Merge Cart
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setLoggedInUser(user);
        
        // Fetch role
        try {
          const adminSnap = await getDoc(doc(db, "admins", user.uid));
          if (adminSnap.exists()) {
            setUserRole("admin");
          } else {
            const userSnap = await getDoc(doc(db, "users", user.uid));
            if (userSnap.exists()) {
              const data = userSnap.data();
              setUserRole(data.role || "customer");
            } else {
              setUserRole("customer");
            }
          }
        } catch (err) {
          console.error("Error fetching user role:", err);
          setUserRole("customer");
        }

        try {
          const userSnap = await getDoc(doc(db, "users", user.uid));
          if (userSnap.exists()) {
            const data = userSnap.data();
            setUserReferralCode(data.referralCode || "REF" + user.uid.substring(0, 5).toUpperCase());
          } else {
            setUserReferralCode("REF" + user.uid.substring(0, 5).toUpperCase());
          }
        } catch (err) {
          console.error("Error loading referral code in App.tsx:", err);
          setUserReferralCode("REF" + user.uid.substring(0, 5).toUpperCase());
        }

        // Automatically load and merge the guest cart after login
        try {
          const cartDocRef = doc(db, "carts", user.uid);
          const cartSnap = await getDoc(cartDocRef);
          
          let dbCart: CartItem[] = [];
          if (cartSnap.exists()) {
            dbCart = cartSnap.data().items || [];
          }
          
          const guestCartJson = localStorage.getItem("kb_cart");
          const guestCart: CartItem[] = guestCartJson ? JSON.parse(guestCartJson) : [];
          
          if (guestCart.length > 0) {
            // Merge guest cart into db cart
            const merged = [...dbCart];
            guestCart.forEach((guestItem) => {
              const existingIdx = merged.findIndex(item => item.product.id === guestItem.product.id);
              if (existingIdx > -1) {
                merged[existingIdx].quantity += guestItem.quantity;
              } else {
                merged.push(guestItem);
              }
            });
            
            // Save merged cart to Firestore and update local state
            await setDoc(cartDocRef, { items: merged });
            setCart(merged);
            localStorage.setItem("kb_cart", JSON.stringify(merged));
            
            triggerToast(
              "আপনার পূর্ববর্তী কার্ট আইটেম সফলভাবে যোগ করা হয়েছে!",
              "Your guest cart items have been successfully merged!"
            );
          } else if (dbCart.length > 0) {
            // No guest cart, just load db cart
            setCart(dbCart);
            localStorage.setItem("kb_cart", JSON.stringify(dbCart));
          }
        } catch (e) {
          console.error("Error merging guest cart on login:", e);
        }
      } else {
        setLoggedInUser(null);
        setUserRole("customer");
        setUserReferralCode("");
      }
    });
    return () => unsub();
  }, []);

  // Sync cart to Firestore when modified while logged in
  useEffect(() => {
    if (loggedInUser) {
      const syncCart = async () => {
        try {
          const cartDocRef = doc(db, "carts", loggedInUser.uid);
          const cleanCart = JSON.parse(JSON.stringify(cart));
          await setDoc(cartDocRef, { items: cleanCart });
        } catch (e) {
          console.error("Error syncing cart to Firestore:", e);
        }
      };
      
      const timer = setTimeout(() => {
        syncCart();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [cart, loggedInUser]);

  const [products, setProducts] = useState<Product[]>(() => {
    // Only load homepage featured products initially to improve Home Page performance
    return initialProducts.filter(p => 
      p.isPopular || 
      p.isNewArrival || 
      p.isBestSelling || 
      p.isFlashSale || 
      p.isSeasonal
    );
  });
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [banners, setBanners] = useState<any[]>([]);
  const [leadership, setLeadership] = useState<any>({
    chairman: {
      nameEn: "MST HOSNE ARA BEGUM",
      nameBn: "এমএসটি হোসনে আরা বেগম",
      image: chairmanImg
    },
    viceChairman: {
      nameEn: "MD ABU HANIF SARKAR",
      nameBn: "মোঃ আবু হানিফ সরকার",
      image: viceChairmanImg
    },
    founder: {
      nameEn: "MD ANIK SARKAR",
      nameBn: "মোঃ অনিক সরকার",
      image: founderImg
    },
    additionalMembers: []
  });
  const [homeConfig, setHomeConfig] = useState<any>(null);

  const availableProducts = useMemo(() => {
    const filtered = products.filter(p => p.isAvailable !== false);
    return filtered.sort((a, b) => {
      const orderA = typeof (a as any).displayOrder === "number" ? (a as any).displayOrder : (typeof (a as any).order === "number" ? (a as any).order : 9999);
      const orderB = typeof (b as any).displayOrder === "number" ? (b as any).displayOrder : (typeof (b as any).order === "number" ? (b as any).order : 9999);
      return orderA - orderB;
    });
  }, [products]);

  useEffect(() => {
    seedDatabase(initialCategories, initialProducts);
  }, []);

  // Helper to merge newly fetched products to state by unique id
  const mergeProducts = useCallback((newItems: Product[]) => {
    setProducts(prev => {
      const map = new Map<string, Product>();
      prev.forEach(p => map.set(p.id.toString(), p));
      newItems.forEach(p => map.set(p.id.toString(), p));
      return Array.from(map.values());
    });
  }, []);

  // Real-time synchronization of categories, home products, reviews, and active categories from Firestore
  useEffect(() => {
    const unsubCategories = onSnapshot(
      collection(db, "categories"), 
      (snap) => {
        const cats: Category[] = [];
        const allCat = initialCategories.find(c => c.id === "all");
        if (allCat) {
          cats.push(allCat);
        }
        if (!snap.empty) {
          snap.forEach((doc) => {
            cats.push(doc.data() as Category);
          });
        }
        // Remove duplicates if any
        const uniqueCats = cats.filter((c, index, self) =>
          index === self.findIndex((t) => t.id === c.id)
        );
        // Sort categories according to displayOrder or initialCategories order
        uniqueCats.sort((a, b) => {
          if (a.id === "all") return -1;
          if (b.id === "all") return 1;
          const orderA = typeof (a as any).displayOrder === "number" ? (a as any).displayOrder : (typeof (a as any).order === "number" ? (a as any).order : undefined);
          const orderB = typeof (b as any).displayOrder === "number" ? (b as any).displayOrder : (typeof (b as any).order === "number" ? (b as any).order : undefined);
          if (orderA !== undefined && orderB !== undefined && orderA !== orderB) {
            return orderA - orderB;
          }
          if (orderA !== undefined && orderB === undefined) return -1;
          if (orderA === undefined && orderB !== undefined) return 1;
          const idxA = initialCategories.findIndex(x => x.id === a.id);
          const idxB = initialCategories.findIndex(x => x.id === b.id);
          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
          if (idxA !== -1) return -1;
          if (idxB !== -1) return 1;
          return (a.nameEn || "").localeCompare(b.nameEn || "");
        });
        setCategories(uniqueCats);
      },
      (err) => console.warn("Firestore categories sync notice:", err.message)
    );

    const unsubReviews = onSnapshot(
      collection(db, "reviews"), 
      (snap) => {
        if (!snap.empty) {
          const revs: Review[] = [];
          snap.forEach((doc) => {
            const data = doc.data();
            revs.push({
              id: doc.id,
              productId: data.productId,
              userId: data.userId,
              userName: data.userName,
              rating: Number(data.rating),
              commentBn: data.commentBn,
              commentEn: data.commentEn,
              date: data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleDateString() : "Today"
            });
          });
          setReviews(revs);
        } else {
          setReviews(initialReviews);
        }
      },
      (err) => console.warn("Firestore reviews sync notice:", err.message)
    );

    const unsubBanners = onSnapshot(
      collection(db, "banners"), 
      (snap) => {
        const bList: any[] = [];
        snap.forEach((doc) => {
          bList.push({ id: doc.id, ...doc.data() });
        });
        setBanners(bList);
      },
      (err) => console.warn("Firestore banners sync notice:", err.message)
    );

    const unsubLeadership = onSnapshot(
      doc(db, "settings", "leadership"), 
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setLeadership({
            chairman: {
              nameEn: data.chairman?.nameEn || "MST HOSNE ARA BEGUM",
              nameBn: data.chairman?.nameBn || "এমএসটি হোসনে আরা বেগম",
              image: data.chairman?.image || chairmanImg
            },
            viceChairman: {
              nameEn: data.viceChairman?.nameEn || "MD ABU HANIF SARKAR",
              nameBn: data.viceChairman?.nameBn || "মোঃ আবু হানিফ সরকার",
              image: data.viceChairman?.image || viceChairmanImg
            },
            founder: {
              nameEn: data.founder?.nameEn || "MD ANIK SARKAR",
              nameBn: data.founder?.nameBn || "মোঃ অনিক সরকার",
              image: data.founder?.image || founderImg
            },
            additionalMembers: Array.isArray(data.additionalMembers) ? data.additionalMembers : []
          });
        }
      },
      (err) => console.warn("Firestore leadership sync notice:", err.message)
    );

    const unsubHome = onSnapshot(
      doc(db, "settings", "home"), 
      (docSnap) => {
        if (docSnap.exists()) {
          setHomeConfig(docSnap.data());
        }
      },
      (err) => console.warn("Firestore home config sync notice:", err.message)
    );

    return () => {
      unsubCategories();
      unsubReviews();
      unsubBanners();
      unsubLeadership();
      unsubHome();
    };
  }, []);

  // Listen to Home Page section products dynamically
  useEffect(() => {
    const qHome = query(
      collection(db, "products"),
      or(
        where("isPopular", "==", true),
        where("isNewArrival", "==", true),
        where("isBestSelling", "==", true),
        where("isFlashSale", "==", true),
        where("isSeasonal", "==", true)
      )
    );

    const unsubHome = onSnapshot(
      qHome, 
      (snap) => {
        const items: Product[] = [];
        snap.forEach(doc => {
          items.push(mapDocToProduct(doc.id, doc.data()));
        });
        mergeProducts(items);
      },
      (err) => console.warn("Firestore home products sync notice:", err.message)
    );

    return () => {
      unsubHome();
    };
  }, []);

  // Listen to active category products dynamically when tapped
  useEffect(() => {
    if (selectedCategory === "all") return;

    // Immediately load/merge local fallback products for this category to ensure instant render
    const localCatProducts = initialProducts.filter(p => p.category === selectedCategory);
    if (localCatProducts.length > 0) {
      mergeProducts(localCatProducts);
    }

    const qCat = query(
      collection(db, "products"),
      where("category", "==", selectedCategory)
    );

    const unsubCat = onSnapshot(
      qCat, 
      (snap) => {
        const items: Product[] = [];
        snap.forEach((doc) => {
          items.push(mapDocToProduct(doc.id, doc.data()));
        });
        if (items.length > 0) {
          mergeProducts(items);
        }
      },
      (err) => console.warn("Firestore category products sync notice:", err.message)
    );

    return () => unsubCat();
  }, [selectedCategory]);

  // Load products matching search query dynamically to keep initial state small
  useEffect(() => {
    if (!searchQuery) return;
    const norm = searchQuery.toLowerCase();
    const matched = initialProducts.filter(p => 
      p.nameBn.toLowerCase().includes(norm) || 
      p.nameEn.toLowerCase().includes(norm) || 
      p.descriptionBn.toLowerCase().includes(norm) ||
      p.descriptionEn.toLowerCase().includes(norm) ||
      (p.brand && p.brand.toLowerCase().includes(norm))
    );
    if (matched.length > 0) {
      mergeProducts(matched);
    }
  }, [searchQuery]);

  const [newReview, setNewReview] = useState({ name: "", comment: "", rating: 5 });

  useEffect(() => {
    if (loggedInUser) {
      setNewReview(prev => ({ ...prev, name: loggedInUser.displayName || loggedInUser.email?.split("@")[0] || "" }));
    } else {
      setNewReview(prev => ({ ...prev, name: "" }));
    }
  }, [loggedInUser]);

  // Notifications State
  const [notificationList, setNotificationList] = useState([
    { id: 1, textBn: "১০% ছাড়ের বিশেষ কুপন আনলক হয়েছে: KACHA10", textEn: "10% special discount coupon unlocked: KACHA10", read: false },
    { id: 2, textBn: "ফ্রি ডেলিভারি কুপন ব্যবহার করুন: FREESHIP", textEn: "Apply free delivery coupon code: FREESHIP", read: false },
    { id: 3, textBn: "পদ্মার তাজা ইলিশ আজই কাচা বাজারে এসেছে!", textEn: "Fresh Padma Hilsha arrived at Kacha Bazar today!", read: true }
  ]);

  // Toast Notifications
  const [toast, setToast] = useState<{ textBn: string; textEn: string } | null>(null);

  // Network Online/Offline Status Tracking
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== "undefined" ? navigator.onLine : true);

  // Flash Sale Countdown Timer (Ticks down live)
  const [timeLeft, setTimeLeft] = useState({ hours: 4, minutes: 34, seconds: 12 });

  // Sync cart and wishlist to localStorage
  useEffect(() => {
    localStorage.setItem("kb_cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem("kb_wishlist", JSON.stringify(wishlist));
  }, [wishlist]);

  useEffect(() => {
    setSelectedSubcategory("all");
    setSortBy("default");
  }, [selectedCategory]);

  // Flash Sale Timer Tick
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        } else {
          return { hours: 4, minutes: 0, seconds: 0 }; // Loop back
        }
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);



  // Toast Auto-Dismiss
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Voice Search Simulation
  const handleVoiceSearchClick = () => {
    setVoiceSearching(true);
    setTimeout(() => {
      setVoiceSearching(false);
      const randomQuery = lang === "bn" ? "ইলিশ মাছ" : "Hilsha Fish";
      setSearchQuery(randomQuery);
      setToast({
        textBn: `কণ্ঠ অনুসন্ধান সফল: "${randomQuery}"`,
        textEn: `Voice Search Successful: "${randomQuery}"`
      });
    }, 2500);
  };

  const fmtNum = useCallback((num: number | string): string => {
    return lang === "bn" ? toBnNum(num) : num.toString();
  }, [lang]);

  const handleProductImgError = useCallback((e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=450&q=80";
  }, []);

  // Toast triggers
  const triggerToast = useCallback((textBn: string, textEn: string) => {
    setToast({ textBn, textEn });
  }, []);

  // Network Online/Offline Status Tracking
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      triggerToast("ইন্টারনেট সংযোগ পুনরায় যুক্ত হয়েছে!", "Internet connection restored!");
    };
    const handleOffline = () => {
      setIsOnline(false);
      triggerToast("আপনি অফলাইনে আছেন (সংরক্ষিত ডেটা প্রদর্শিত হচ্ছে)", "You are offline (showing cached data)");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [triggerToast]);

  // Geolocation utilities
  const requestGeolocation = (
    onSuccess: (address: string) => void,
    onFailure: (bnMsg: string, enMsg: string) => void
  ) => {
    setLoadingLocation(true);
    setTimeout(() => {
      onSuccess(lang === "bn" ? "চাঁচকৈড় বাজার, গুরুদাশপুর, নাটোর" : "Chanchkoir Bazar, Gurudaspur, Natore");
      setLoadingLocation(false);
    }, 600);
  };

  const handleDetectLocation = () => {
    requestGeolocation(
      (address) => {
        setCurrentLocation(address);
        setShowLocationSelect(false);
        triggerToast(
          `আপনার অবস্থান সফলভাবে সনাক্ত করা হয়েছে: ${address}`,
          `Your location was successfully detected: ${address}`
        );
      },
      (bnMsg, enMsg) => {
        triggerToast(bnMsg, enMsg);
      }
    );
  };

  const handleUseCurrentLocation = () => {
    requestGeolocation(
      (address) => {
        setCurrentLocation(address);
        setShowLocationSelect(false);
        triggerToast(
          `বর্তমান অবস্থান নিশ্চিত করা হয়েছে: ${address}`,
          `Current location confirmed: ${address}`
        );
      },
      (bnMsg, enMsg) => {
        triggerToast(bnMsg, enMsg);
      }
    );
  };

  // Cart operations
  const addToCart = (product: Product, quantity = 1, showFeedback = true, selectedOption?: ProductOption) => {
    const opt = selectedOption;
    const availableStock = opt && typeof opt.stock === "number"
      ? opt.stock
      : (typeof product.stock === "number" ? product.stock : 50);

    if (availableStock <= 0 || product.isAvailable === false) {
      triggerToast(
        "পর্যাপ্ত স্টক নেই (Insufficient Stock)",
        "Insufficient Stock"
      );
      return;
    }

    if (product.options && product.options.length > 0 && !selectedOption) {
      openQuickView(product);
      triggerToast(
        "দয়া করে আপনার পছন্দসই ওজন বা পরিমাণ সিলেক্ট করুন",
        "Please select your preferred quantity/weight option"
      );
      return;
    }

    const existingIdx = cart.findIndex(item => 
      item.product.id === product.id && 
      ((!item.selectedOption && !opt) || 
       (item.selectedOption && opt && item.selectedOption.value === opt.value && item.selectedOption.unit === opt.unit))
    );

    const currentQtyInCart = existingIdx > -1 ? cart[existingIdx].quantity : 0;
    if (currentQtyInCart + quantity > availableStock) {
      triggerToast(
        "পর্যাপ্ত স্টক নেই (Insufficient Stock)",
        "Insufficient Stock available"
      );
      return;
    }

    setCart((prev) => {
      if (existingIdx > -1) {
        return prev.map((item, idx) => 
          idx === existingIdx
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity, selectedOption: opt }];
    });
    
    if (showFeedback) {
      const optionLabel = opt ? ` (${opt.value}${opt.unit})` : "";
      triggerToast(
        `${product.nameBn}${optionLabel} কার্টে যোগ করা হয়েছে`,
        `${product.nameEn}${optionLabel} added to cart`
      );
    }
  };

  const updateCartQuantity = (productId: string, delta: number, selectedOption?: any) => {
    setCart((prev) => {
      let insufficientStock = false;
      const updated = prev.map(item => {
        const matchesOption = (!item.selectedOption && !selectedOption) || 
          (item.selectedOption && selectedOption && item.selectedOption.value === selectedOption.value && item.selectedOption.unit === selectedOption.unit);
        if (item.product.id === productId && matchesOption) {
          const newQty = item.quantity + delta;
          if (delta > 0) {
            const availStock = item.selectedOption && typeof item.selectedOption.stock === "number"
              ? item.selectedOption.stock
              : (typeof item.product.stock === "number" ? item.product.stock : 50);
            if (newQty > availStock) {
              insufficientStock = true;
              return item;
            }
          }
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      }).filter(Boolean) as CartItem[];

      if (insufficientStock) {
        triggerToast(
          "পর্যাপ্ত স্টক নেই (Insufficient Stock)",
          "Insufficient Stock available"
        );
      }

      return updated;
    });
  };

  const removeFromCart = (productId: string, selectedOption?: any) => {
    setCart((prev) => prev.filter(item => {
      const matchesOption = (!item.selectedOption && !selectedOption) || 
        (item.selectedOption && selectedOption && item.selectedOption.value === selectedOption.value && item.selectedOption.unit === selectedOption.unit);
      return !(item.product.id === productId && matchesOption);
    }));
    triggerToast("আইটেমটি কার্ট থেকে সরানো হয়েছে", "Item removed from cart");
  };

  const updateCartItemOption = (itemIndex: number, newOption: ProductOption) => {
    setCart((prev) => {
      const targetItem = prev[itemIndex];
      if (!targetItem) return prev;

      const existingIdx = prev.findIndex((item, idx) => 
        idx !== itemIndex && 
        item.product.id === targetItem.product.id && 
        item.selectedOption && 
        item.selectedOption.value === newOption.value && 
        item.selectedOption.unit === newOption.unit
      );

      if (existingIdx > -1) {
        const mergedQty = prev[existingIdx].quantity + targetItem.quantity;
        const availStock = typeof newOption.stock === "number" ? newOption.stock : (typeof targetItem.product.stock === "number" ? targetItem.product.stock : 50);
        const finalQty = Math.min(mergedQty, availStock > 0 ? availStock : mergedQty);

        return prev.map((item, idx) => {
          if (idx === existingIdx) {
            return { ...item, quantity: finalQty, selectedOption: newOption };
          }
          return item;
        }).filter((_, idx) => idx !== itemIndex);
      }

      return prev.map((item, idx) => {
        if (idx === itemIndex) {
          return { ...item, selectedOption: newOption };
        }
        return item;
      });
    });

    const optUnitText = lang === "bn" 
      ? (newOption.unit === "g" ? "গ্রাম" : newOption.unit === "kg" ? "কেজি" : newOption.unit === "ml" ? "মি.লি." : newOption.unit === "L" ? "লিটার" : newOption.unit)
      : newOption.unit;
    const optValText = lang === "bn" ? fmtNum(newOption.value) : newOption.value;

    triggerToast(
      `ওজন/সাইজ পরিবর্তন: ${optValText} ${optUnitText}`,
      `Weight/Size updated: ${optValText} ${optUnitText}`
    );
  };

  const hasInsufficientCartStock = useMemo(() => {
    return cart.some(item => {
      const availableOptions = getProductWeightOptions(item.product);
      const currentOpt = item.selectedOption || availableOptions.find(o => o.price === item.product.price) || availableOptions[0];
      const optStock = typeof currentOpt?.stock === "number" ? currentOpt.stock : (typeof item.product.stock === "number" ? item.product.stock : 50);
      const isItemOutOfStock = optStock <= 0 || item.product.isAvailable === false || (typeof item.product.stock === "number" && item.product.stock <= 0);
      return isItemOutOfStock || item.quantity > optStock;
    });
  }, [cart]);

  // Wishlist toggle
  const toggleWishlist = (productId: string) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;
    setWishlist((prev) => {
      const isExist = prev.includes(productId);
      if (isExist) {
        triggerToast(`${prod.nameBn} উইশলিস্ট থেকে সরানো হয়েছে`, `${prod.nameEn} removed from wishlist`);
        return prev.filter(id => id !== productId);
      } else {
        triggerToast(`${prod.nameBn} উইশলিস্টে যুক্ত করা হয়েছে`, `${prod.nameEn} saved to wishlist`);
        return [...prev, productId];
      }
    });
  };

  // Selected option state for Quick View
  const [selectedProductOption, setSelectedProductOption] = useState<ProductOption | null>(null);

  // Quick View triggers and tracks "Recently Viewed"
  const openQuickView = (product: Product) => {
    setSelectedProduct(product);
    if (product.options && product.options.length > 0) {
      setSelectedProductOption(product.options[0]);
    } else {
      setSelectedProductOption(null);
    }
    setRecentlyViewed((prev) => {
      const filtered = prev.filter(p => p.id !== product.id);
      return [product, ...filtered].slice(0, 8); // Keep last 8 items
    });
  };

  // Buy Now immediate flow
  const handleBuyNow = (product: Product, selectedOption?: ProductOption) => {
    if (product.options && product.options.length > 0 && !selectedOption) {
      openQuickView(product);
      triggerToast(
        "দয়া করে আপনার পছন্দসই ওজন বা পরিমাণ সিলেক্ট করুন",
        "Please select your preferred quantity/weight option"
      );
      return;
    }
    const opt = selectedOption;
    addToCart(product, 1, false, opt);
    setShowCart(false);
    setShowCheckoutModal(true);
    triggerToast("আইটেমটি কার্টে যুক্ত করে সরাসরি চেকআউট ওপেন করা হয়েছে", "Item added to cart & checkout opened directly");
  };

  // Category Icon Resolver
  const renderCatIcon = (iconName: string) => {
    switch (iconName) {
      case "LayoutGrid": return <LayoutGrid className="w-5 h-5 md:w-6 md:h-6" />;
      case "Salad": return <Salad className="w-5 h-5 md:w-6 md:h-6" />;
      case "Apple": return <Apple className="w-5 h-5 md:w-6 md:h-6" />;
      case "Beef": return <Beef className="w-5 h-5 md:w-6 md:h-6" />;
      case "Egg": return <Egg className="w-5 h-5 md:w-6 md:h-6" />;
      case "Wheat": return <Wheat className="w-5 h-5 md:w-6 md:h-6" />;
      case "Flame":
      case "FlameKindling": return <Flame className="w-5 h-5 md:w-6 md:h-6" />;
      case "Cookie": return <Cookie className="w-5 h-5 md:w-6 md:h-6" />;
      case "Droplet": return <Droplet className="w-5 h-5 md:w-6 md:h-6" />;
      case "Heart": return <Heart className="w-5 h-5 md:w-6 md:h-6" />;
      case "Baby": return <Baby className="w-5 h-5 md:w-6 md:h-6" />;
      case "Candy": return <Candy className="w-5 h-5 md:w-6 md:h-6" />;
      case "Snowflake": return <Snowflake className="w-5 h-5 md:w-6 md:h-6" />;
      case "Coffee": return <Coffee className="w-5 h-5 md:w-6 md:h-6" />;
      case "Dog": return <Dog className="w-5 h-5 md:w-6 md:h-6" />;
      case "Tag": return <Tag className="w-5 h-5 md:w-6 md:h-6" />;
      case "Sparkles": return <Sparkles className="w-5 h-5 md:w-6 md:h-6" />;
      default: return <LayoutGrid className="w-5 h-5 md:w-6 md:h-6" />;
    }
  };
  const handleApplyCoupon = () => {
    const code = couponCode.trim().toUpperCase();
    if (code === "KACHA10") {
      setAppliedCoupon({ code, discount: 10 });
      triggerToast("১০% ছাড় কুপন সফলভাবে প্রয়োগ করা হয়েছে!", "10% off coupon successfully applied!");
    } else if (code === "FREESHIP") {
      setAppliedCoupon({ code, discount: 40 }); // 40 BDT delivery fee covered
      triggerToast("ফ্রি ডেলিভারি কুপন প্রয়োগ করা হয়েছে!", "Free Delivery coupon successfully applied!");
    } else if (code === "BORSHE15") {
      setAppliedCoupon({ code, discount: 15 });
      triggerToast("১৫% বিশেষ রেসিপি ডিসকাউন্ট সফল!", "15% recipe bundle discount applied!");
    } else {
      triggerToast("দুঃখিত, কুপনটি সঠিক নয়!", "Invalid coupon code entered!");
    }
    setCouponCode("");
  };

  // Order checkout flow simulation
  const executeCheckout = useCallback(() => {
    if (cart.length === 0) return;
    if (hasInsufficientCartStock) {
      triggerToast(
        "পর্যাপ্ত স্টক নেই (Insufficient Stock)",
        "Some items in your cart have insufficient stock"
      );
      return;
    }
    setShowCart(false);
    setShowCheckoutModal(true);
  }, [cart, hasInsufficientCartStock]);

  const handleCheckoutSuccess = useCallback((orderId: string, orderData?: any) => {
    setCompletedOrder(orderData || {
      id: orderId,
      total: grandTotal,
      subtotal: subtotal,
      discount: discountAmt,
      deliveryCharge: deliveryFee,
      items: cart,
      paymentMethod: "COD",
      createdAt: new Date().toISOString()
    });
    setCart([]);
    setAppliedCoupon(null);
    setCheckoutStatus("success");
    setShowCheckoutModal(false);
  }, [cart, grandTotal, subtotal, discountAmt, deliveryFee]);

  // Reviews submission
  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReview.name || !newReview.comment) return;
    const review: Review = {
      id: `usr-${Date.now()}`,
      userName: newReview.name,
      rating: newReview.rating,
      commentBn: newReview.comment,
      commentEn: newReview.comment,
      date: "Today"
    };
    setReviews([review, ...reviews]);
    setNewReview({ name: "", comment: "", rating: 5 });
    triggerToast("রিভিউ প্রকাশের জন্য ধন্যবাদ!", "Thank you for submitting a review!");
  };

  // Product Filter Core (Memoized to avoid expensive filtering on unrelated state changes)
  const filteredProducts = useMemo(() => {
    const normSearch = searchQuery.toLowerCase();
    return availableProducts.filter((product) => {
      const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
      const matchesSearch = 
        product.nameBn.toLowerCase().includes(normSearch) || 
        product.nameEn.toLowerCase().includes(normSearch) || 
        product.descriptionBn.toLowerCase().includes(normSearch) ||
        product.descriptionEn.toLowerCase().includes(normSearch) ||
        (product.brand && product.brand.toLowerCase().includes(normSearch));
      return matchesCategory && matchesSearch;
    });
  }, [availableProducts, selectedCategory, searchQuery]);

  if (showCheckoutModal) {
    return (
      <div className="min-h-screen w-full overflow-x-hidden bg-slate-50 font-sans text-slate-800 antialiased selection:bg-emerald-500 selection:text-white flex flex-col" id="checkout-view-root">
        <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 font-bold">Loading Secure Checkout...</div>}>
          <CheckoutModal 
            isOpen={true} 
            onClose={() => {
              setShowCheckoutModal(false);
            }} 
            cart={cart} 
            subtotal={subtotal} 
            deliveryFee={deliveryFee} 
            discount={discountAmt} 
            grandTotal={grandTotal} 
            appliedCoupon={appliedCoupon} 
            lang={lang} 
            onSuccess={handleCheckoutSuccess} 
            triggerToast={triggerToast} 
            isFullScreen={true}
          />
        </React.Suspense>
        
        {/* ================= TOAST FLOATING BANNER ================= */}
        {toast && (
          <div className="fixed top-5 right-5 sm:top-6 sm:right-6 z-[2000] bg-slate-900/95 backdrop-blur text-white px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-2 border border-slate-800 text-xs font-bold animate-in fade-in slide-in-from-top duration-200 max-w-sm">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{lang === "bn" ? toast.textBn : toast.textEn}</span>
          </div>
        )}
      </div>
    );
  }

  if (checkoutStatus === "success" && completedOrder) {
    return (
      <div className="min-h-screen w-full bg-slate-50 font-sans text-slate-800 antialiased selection:bg-emerald-500 selection:text-white flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-6 text-center shadow-2xl border border-slate-100 relative animate-in zoom-in duration-300">
          
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 animate-bounce">
            <Check className="w-8 h-8" />
          </div>

          <h3 className="text-lg md:text-xl font-black text-slate-800">
            {lang === "bn" ? "অর্ডার সফলভাবে সম্পন্ন!" : "Order Placed Successfully!"}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {lang === "bn" 
              ? "আপনার তাজা অর্ডারের যাবতীয় বাজার প্রসেসিং ধাপে উন্নীত হয়েছে।" 
              : "Your fresh basket is now moving directly to packaging phase."}
          </p>

          <div className="my-5 p-4 bg-slate-50 rounded-xl text-left text-xs space-y-2">
            <div className="flex justify-between text-slate-500">
              <span>{lang === "bn" ? "অর্ডার আইডি:" : "Order Identifier:"}</span>
              <span className="font-mono font-bold text-slate-800">{completedOrder.id}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>{lang === "bn" ? "পেমেন্ট পদ্ধতি:" : "Payment System:"}</span>
              <span className="font-bold text-emerald-600">{lang === "bn" ? "ক্যাশ অন ডেলিভারি (COD)" : "Cash on Delivery"}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>{lang === "bn" ? "ডেলিভারি ঠিকানা:" : "Delivery Area:"}</span>
              <span className="font-bold text-slate-800">{currentLocation}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-black text-slate-800">
              <span>{lang === "bn" ? "পরিশোধিত মোট:" : "Grand Total Paid:"}</span>
              <span className="text-emerald-600">৳{fmtNum(completedOrder.total)}</span>
            </div>
          </div>

          {/* Simulated Live Order Tracker map layout */}
          <div className="mb-4 p-3 border border-emerald-100 rounded-lg bg-emerald-50/20 text-center text-[10px] font-bold uppercase tracking-wider text-emerald-800 animate-pulse">
            {lang === "bn" ? "✦ ⚡ ১ ঘণ্টার মধ্যে ডেলিভারি টিম আপনার দরজায় পৌঁছাবে!" : "✦ ⚡ Delivery within 1 hour to your doorstep!"}
          </div>

          {/* Order Memo section for Order Confirmation */}
          <div className="mb-6 p-4 border border-emerald-100 rounded-2xl bg-white text-left text-xs space-y-3 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-1.5 font-black text-slate-800 text-xs">
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>{lang === "bn" ? "অর্ডার মেমো" : "Order Memo"}</span>
              </div>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 font-mono font-bold px-2 py-0.5 rounded-md uppercase">
                #{completedOrder.id ? completedOrder.id.slice(-8).toUpperCase() : ""}
              </span>
            </div>

            {/* Order Info & Delivery Address */}
            <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">{lang === "bn" ? "অর্ডার আইডি:" : "Order ID:"}</span>
                <span className="font-mono font-bold text-slate-800">{completedOrder.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">{lang === "bn" ? "তারিখ ও সময়:" : "Date & Time:"}</span>
                <span className="font-medium text-slate-700">
                  {completedOrder.createdAt 
                    ? (completedOrder.createdAt.seconds 
                        ? new Date(completedOrder.createdAt.seconds * 1000).toLocaleString(lang === "bn" ? "bn-BD" : "en-US")
                        : new Date(completedOrder.createdAt).toLocaleString(lang === "bn" ? "bn-BD" : "en-US"))
                    : new Date().toLocaleString(lang === "bn" ? "bn-BD" : "en-US")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">{lang === "bn" ? "পেমেন্ট পদ্ধতি:" : "Payment Method:"}</span>
                <span className="font-bold text-emerald-600 uppercase">
                  {completedOrder.paymentMethod || "COD"}
                </span>
              </div>
              <div className="pt-1 border-t border-slate-200/60">
                <span className="text-slate-400 font-bold block">{lang === "bn" ? "ডেলিভারি ঠিকানা:" : "Delivery Address:"}</span>
                <span className="font-medium text-slate-800 block mt-0.5">
                  {completedOrder.deliveryAddress || completedOrder.address || currentLocation}
                </span>
              </div>
            </div>

            {/* Itemized List */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                {lang === "bn" ? "অর্ডারকৃত পণ্যসমূহ:" : "Ordered Products:"}
              </span>
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden bg-slate-50/50">
                {completedOrder.items && completedOrder.items.length > 0 ? (
                  completedOrder.items.map((item: any, idx: number) => {
                    const itemPrice = item.selectedOption ? item.selectedOption.price : (item.product?.price ?? item.price ?? 0);
                    const optionStr = item.selectedOption 
                      ? (typeof item.selectedOption === 'string' 
                          ? item.selectedOption 
                          : (item.selectedOption.labelBn || item.selectedOption.labelEn || `${item.selectedOption.value || ''}${item.selectedOption.unit || ''}`))
                      : "";
                    const pName = item.product 
                      ? (lang === "bn" ? (item.product.nameBn || item.product.titleBn) : (item.product.nameEn || item.product.titleEn))
                      : (item.nameBn || item.titleBn || item.name || item.title || "পণ্য");
                    const qty = item.quantity || item.qty || 1;

                    return (
                      <div key={idx} className="p-2 flex items-center justify-between text-[11px]">
                        <div className="flex-1 pr-2">
                          <span className="font-bold text-slate-800 block">{pName}</span>
                          {optionStr && (
                            <span className="text-[9px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded inline-block mt-0.5">
                              {lang === "bn" ? "অপশন/ওজন: " : "Option: "}{optionStr}
                            </span>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-slate-500 font-mono text-[10px]">{qty} x ৳{itemPrice}</span>
                          <span className="font-black text-slate-800 font-mono text-xs block">৳{qty * itemPrice}</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-2 text-slate-400 text-center text-[10px]">
                    {lang === "bn" ? "কোন পণ্য তথ্য পাওয়া যায়নি" : "No product items recorded"}
                  </div>
                )}
              </div>
            </div>

            {/* Calculations Breakdown */}
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[11px] space-y-1 font-medium">
              <div className="flex justify-between text-slate-500">
                <span>{lang === "bn" ? "পণ্য উপমোট (Subtotal):" : "Subtotal:"}</span>
                <span className="font-mono font-bold text-slate-700">৳{completedOrder.subtotal ?? completedOrder.total}</span>
              </div>
              {completedOrder.discount > 0 && (
                <div className="flex justify-between text-rose-500">
                  <span>{lang === "bn" ? "ডিসকাউন্ট:" : "Discount:"}</span>
                  <span className="font-mono font-bold">-৳{completedOrder.discount}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-500">
                <span>{lang === "bn" ? "ডেলিভারি ফি:" : "Delivery Fee:"}</span>
                <span className="font-mono font-bold text-slate-700">৳{completedOrder.deliveryCharge ?? completedOrder.deliveryFee ?? 0}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200 text-xs font-black text-slate-900">
                <span>{lang === "bn" ? "সর্বমোট মূল্য (Final Total):" : "Final Total:"}</span>
                <span className="text-emerald-600 font-mono text-sm">৳{completedOrder.total || completedOrder.totalAmount}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={handleDownloadOrderPDF}
                disabled={downloadingPDF}
                className="py-2 px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm disabled:opacity-50"
              >
                {downloadingPDF ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                <span>{downloadingPDF ? (lang === "bn" ? "তৈরি হচ্ছে..." : "Generating...") : (lang === "bn" ? "মেমো ডাউনলোড করুন (PDF)" : "Download Memo (PDF)")}</span>
              </button>
              <button
                onClick={() => {
                  setShowMemoModal(true);
                  setTimeout(() => window.print(), 300);
                }}
                className="py-2 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-[11px] rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600" />
                <span>{lang === "bn" ? "প্রিন্ট করুন" : "Print Memo"}</span>
              </button>
            </div>
          </div>

          <button 
            onClick={() => {
              setCheckoutStatus("idle");
              setCompletedOrder(null);
            }}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition cursor-pointer"
          >
            {lang === "bn" ? "বাজার করা চালিয়ে যান" : "Continue Shopping on App"}
          </button>

        </div>

        <OrderMemoModal 
          isOpen={showMemoModal} 
          onClose={() => setShowMemoModal(false)} 
          order={completedOrder} 
          lang={lang} 
          triggerToast={triggerToast}
        />

        {/* ================= TOAST FLOATING BANNER ================= */}
        {toast && (
          <div className="fixed top-5 right-5 sm:top-6 sm:right-6 z-[2000] bg-slate-900/95 backdrop-blur text-white px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-2 border border-slate-800 text-xs font-bold animate-in fade-in slide-in-from-top duration-200 max-w-sm">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{lang === "bn" ? toast.textBn : toast.textEn}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 font-sans text-slate-800 antialiased selection:bg-emerald-500 selection:text-white overflow-x-hidden">
      
      {/* Main Page Layout Wrapper */}
      <div>
      
      {/* ================= HEADER ================= */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md shadow-sm transition-shadow duration-300">
        
        {/* Brand-new Premium Islamic Header */}
        <div id="premium-islamic-header" className="bg-[#04060c] border-b border-amber-500/20 h-[50px] sm:h-[58px] w-full flex items-center justify-between px-3 sm:px-6 md:px-8 text-white relative select-none">
          {/* Left Side: Al-Masjid an-Nabawi (Madinah Green Dome) Image Only */}
          <div className="flex items-center justify-start w-1/4 sm:w-1/5 md:w-1/6 h-full">
            {madinaImg ? (
              <div className="h-[36px] w-[36px] sm:h-[42px] sm:w-[42px] rounded-lg overflow-hidden border border-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.15)] bg-slate-900 transition-all duration-300 hover:border-amber-500/40">
                <img 
                  src={madinaImg} 
                  alt="Al-Masjid an-Nabawi" 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : null}
          </div>

          {/* Center Calligraphy texts */}
          <div className="flex-1 flex flex-col items-center justify-center text-center px-2 py-1 h-full select-all">
            <div className="flex flex-col items-center justify-center space-y-0.5">
              {bismillahImg ? (
                <img 
                  src={bismillahImg} 
                  alt="Bismillah" 
                  referrerPolicy="no-referrer"
                  className="h-3 sm:h-3.5 md:h-4 object-contain drop-shadow-[0_1px_4px_rgba(245,158,11,0.15)]"
                />
              ) : null}
              {kalemaImg ? (
                <img 
                  src={kalemaImg} 
                  alt="Shahada" 
                  referrerPolicy="no-referrer"
                  className="h-5 sm:h-6 md:h-7 object-contain drop-shadow-[0_2px_8px_rgba(245,158,11,0.25)]"
                />
              ) : null}
            </div>
          </div>

          {/* Right Side: Holy Kaaba (Makkah) Image Only */}
          <div className="flex items-center justify-end w-1/4 sm:w-1/5 md:w-1/6 h-full">
            {makkahImg ? (
              <div className="h-[36px] w-[36px] sm:h-[42px] sm:w-[42px] rounded-lg overflow-hidden border border-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.15)] bg-slate-900 transition-all duration-300 hover:border-amber-500/40">
                <img 
                  src={makkahImg}
                  alt="Holy Kaaba" 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : null}
          </div>
        </div>

        {/* Offline Banner Indicator */}
        {!isOnline && (
          <div className="bg-amber-600 text-white px-4 py-1.5 text-xs font-semibold flex items-center justify-center space-x-2 shadow-inner z-50">
            <WifiOff className="w-4 h-4 shrink-0 animate-pulse" />
            <span>
              {lang === "bn"
                ? "আপনি বর্তমানে অফলাইনে আছেন। সংগৃহীত পণ্য ও ক্যাটাগরিগুলি প্রদর্শিত হচ্ছে।"
                : "You are currently offline. Displaying cached products & categories."}
            </span>
            <span className="bg-amber-800/80 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
              {lang === "bn" ? "অফলাইন মোড" : "Offline Mode"}
            </span>
          </div>
        )}

        {/* Top Mini Bar */}
        <div className="bg-emerald-800 text-white py-0.5 sm:py-1.5 px-2 sm:px-4 text-[10px] sm:text-xs">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <span className="bg-emerald-600 px-1 sm:px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold animate-pulse uppercase">
                {lang === "bn" ? "⚡ ১ ঘণ্টার মধ্যে ডেলিভারি" : "⚡ 1-Hour Delivery"}
              </span>
              <p className="hidden md:inline">
                {lang === "bn" 
                  ? `✓ ${currentLocation} এলাকায় নিশ্চিত সুপারফাস্ট ডেলিভারি!` 
                  : `✓ Superfast delivery ensured across ${currentLocation}!`}
              </p>
            </div>
            
            <div className="flex items-center space-x-1.5 sm:space-x-4">
              {/* Connection Status Indicator */}
              <div className="flex items-center space-x-1 sm:space-x-1.5 bg-emerald-900/60 px-1.5 sm:px-2 py-0.5 rounded border border-emerald-700/50">
                {isOnline ? (
                  <>
                    <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-emerald-400"></span>
                    </span>
                    <span className="text-[9px] sm:text-[10px] font-bold text-emerald-200">
                      {lang === "bn" ? "অনলাইন" : "Online"}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-amber-400 animate-pulse"></span>
                    </span>
                    <span className="text-[9px] sm:text-[10px] font-bold text-amber-300">
                      {lang === "bn" ? "অফলাইন" : "Offline"}
                    </span>
                  </>
                )}
              </div>
              {/* Delivery Location Selector */}
              <div className="relative">
                <button 
                  onClick={() => setShowLocationSelect(!showLocationSelect)}
                  className="flex items-center space-x-1 hover:text-emerald-200 transition cursor-pointer max-w-[130px] xs:max-w-[170px] sm:max-w-none"
                  id="header-location-selector"
                >
                  <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                  <span className="truncate text-[10px] sm:text-xs leading-none">{currentLocation}</span>
                  <ChevronDown className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />
                </button>
                {showLocationSelect && (
                  <div className="absolute right-0 mt-1 w-52 bg-white text-slate-800 rounded-lg shadow-lg border border-slate-100 z-50 p-2 py-1.5">
                    
                    {/* Location Permission & Detection Triggers */}
                    <div className="border-b border-slate-100 pb-1.5 mb-1.5 px-1">
                      <button
                        onClick={handleDetectLocation}
                        disabled={loadingLocation}
                        className="w-full flex items-center space-x-2 p-1.5 rounded text-xs text-left text-emerald-700 hover:bg-emerald-50 active:bg-emerald-100 font-bold transition disabled:opacity-50 cursor-pointer"
                      >
                        <Locate className={`w-3.5 h-3.5 text-emerald-600 shrink-0 ${loadingLocation ? "animate-spin" : ""}`} />
                        <span className="truncate">
                          {lang === "bn" ? "আমার অবস্থান সনাক্ত করুন" : "Detect My Location"}
                        </span>
                      </button>
                      
                      <button
                        onClick={handleUseCurrentLocation}
                        disabled={loadingLocation}
                        className="w-full flex items-center space-x-2 p-1.5 rounded text-xs text-left text-blue-700 hover:bg-blue-50 active:bg-blue-100 font-bold transition disabled:opacity-50 cursor-pointer mt-1"
                      >
                        <Navigation className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="truncate">
                          {lang === "bn" ? "বর্তমান অবস্থান ব্যবহার করুন" : "Use Current Location"}
                        </span>
                      </button>
                    </div>

                    <p className="text-[10px] text-slate-400 p-1.5 font-bold uppercase tracking-wider">
                      {lang === "bn" ? "ডেলিভারি এলাকা নির্বাচন করুন" : "Select Location"}
                    </p>
                    {["চাঁচকৈড় বাজার, গুরুদাশপুর, নাটোর", "ধানমন্ডি, ঢাকা", "গুলশান, ঢাকা", "বনানী, ঢাকা", "উত্তরা, ঢাকা", "মিরপুর, ঢাকা", "খুলশী, চট্টগ্রাম"].map((loc) => (
                      <button
                        key={loc}
                        onClick={() => {
                          setCurrentLocation(loc);
                          setShowLocationSelect(false);
                          triggerToast(`এলাকা পরিবর্তন করা হয়েছে: ${loc}`, `Location changed to: ${loc}`);
                        }}
                        className="w-full text-left p-1.5 text-xs hover:bg-emerald-50 hover:text-emerald-700 rounded transition"
                      >
                        {loc}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Language Toggle */}
              <button 
                onClick={() => setLang(lang === "bn" ? "en" : "bn")}
                className="font-bold border border-white/20 hover:bg-white/10 px-2 py-0.5 rounded transition uppercase tracking-wider text-[10px] cursor-pointer"
                id="header-lang-toggle"
              >
                {lang === "bn" ? "English" : "বাংলা"}
              </button>
            </div>
          </div>
        </div>

        {/* Main Header Bar */}
        <div className="max-w-7xl mx-auto px-2 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-1 sm:gap-4">
          
          {/* Logo */}
          <div className="flex items-center space-x-1 sm:space-x-2 min-w-0 shrink">
            {logoImg ? (
              <img 
                src={logoImg} 
                alt="Kacha Bazar Logo" 
                className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 object-contain rounded-full border border-emerald-100 bg-white shadow-md shadow-emerald-50 shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : null}
            <div className="min-w-0">
              <h1 className="text-xs sm:text-lg md:text-xl font-black text-emerald-700 tracking-tight leading-none truncate">
                {lang === "bn" ? "কাচা বাজার" : "Kacha Bazar"}
              </h1>
              <p className="text-[7px] sm:text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 truncate">
                {lang === "bn" ? "তাজা পণ্য, আপনার দরজায়।" : "Fresh Everyday"}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-3 shrink-0">
            
            {/* Notifications Panel */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-1 sm:p-2 text-slate-600 hover:text-emerald-600 hover:bg-slate-50 rounded-full relative transition cursor-pointer"
                id="header-notifications-btn"
              >
                <Bell className="w-5 h-5 sm:w-6 sm:h-6" />
                {notificationList.some(n => !n.read) && (
                  <span className="absolute top-1 right-1 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-red-500 border-2 border-white rounded-full animate-ping"></span>
                )}
              </button>
              
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-100 z-50 p-3">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100 mb-2">
                    <h4 className="text-xs font-bold text-slate-800">{lang === "bn" ? "বিজ্ঞপ্তি সমূহ" : "Notifications"}</h4>
                    <button 
                      onClick={() => {
                        setNotificationList(prev => prev.map(n => ({ ...n, read: true })));
                        triggerToast("সব বিজ্ঞপ্তি পঠিত মার্ক করা হয়েছে", "All notifications marked as read");
                      }}
                      className="text-[10px] text-emerald-600 hover:underline font-bold"
                    >
                      {lang === "bn" ? "সব পঠিত করুন" : "Mark all read"}
                    </button>
                  </div>
                  <div className="space-y-2">
                    {notificationList.map((notif) => (
                      <div 
                        key={notif.id} 
                        className={`p-2 rounded-lg text-xs transition ${notif.read ? "bg-slate-50 text-slate-500" : "bg-emerald-50/50 text-slate-800 font-medium"}`}
                      >
                        <p>{lang === "bn" ? notif.textBn : notif.textEn}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Wishlist Button */}
            <button 
              onClick={() => setShowWishlist(true)}
              className="p-1 sm:p-2 text-slate-600 hover:text-emerald-600 hover:bg-slate-50 rounded-full relative transition cursor-pointer"
              id="header-wishlist-btn"
            >
              <Heart className="w-5 h-5 sm:w-6 sm:h-6" />
              {wishlist.length > 0 && (
                <span className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 bg-rose-500 text-white text-[8px] sm:text-[9px] font-bold w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full flex items-center justify-center">
                  {fmtNum(wishlist.length)}
                </span>
              )}
            </button>

            {/* Shopping Cart Button */}
            <button 
              onClick={() => setShowCart(true)}
              className="flex items-center space-x-1 sm:space-x-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-1.5 sm:px-3 py-1 sm:py-2 rounded-full transition cursor-pointer"
              id="header-cart-btn"
            >
              <ShoppingCart className="w-5 h-5" />
              <div className="text-left hidden lg:block text-xs font-bold">
                <p className="text-[10px] leading-none text-emerald-600 uppercase">
                  {lang === "bn" ? "আমার কার্ট" : "My Cart"}
                </p>
                <p className="leading-none mt-0.5">৳{fmtNum(subtotal)}</p>
              </div>
              <span className="bg-emerald-600 text-white text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full">
                {fmtNum(cart.reduce((sum, item) => sum + item.quantity, 0))}
              </span>
            </button>

            {/* User Profile Info */}
            <button 
              onClick={() => {
                setForcedPortalRole("customer");
                setShowPortalModal(true);
              }}
              className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition shrink-0"
              id="header-user-btn"
            >
              <User className="w-5 h-5 text-slate-500" />
            </button>

          </div>
        </div>

      </header>

      {/* ================= 2. SEARCH BAR ================= */}
      <section className="max-w-7xl mx-auto px-4 mt-4">
        <div className="max-w-2xl mx-auto relative">
          <div className="w-full relative flex items-center">
            <Search className="absolute left-4 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder={lang === "bn" ? "তাজা সবজি, ইলিশ মাছ, আম খুঁজুন..." : "Search fresh veggies, Hilsha, sweet mango..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-12 py-3 bg-white border border-slate-200 rounded-full text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-sm transition-all duration-200"
              id="search-input"
            />
            <button 
              onClick={handleVoiceSearchClick}
              className="absolute right-4 p-1 text-slate-400 hover:text-emerald-600 rounded-full hover:bg-slate-100 transition cursor-pointer"
              title={lang === "bn" ? "ভয়েস সার্চ" : "Voice Search"}
              id="search-mic"
            >
              <Mic className="w-5 h-5" />
            </button>
          </div>

          {/* ================= CALL TO ORDER HOME BANNER ================= */}
          <div className="mt-2 sm:mt-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg sm:rounded-xl py-1.5 sm:py-3 px-2.5 sm:px-4 shadow-sm flex flex-row items-center justify-between gap-2 sm:gap-3 border border-amber-400 relative overflow-hidden">
            <div className="absolute inset-0 bg-white/5 pointer-events-none skew-x-12 transform translate-x-12"></div>
            <div className="flex items-center space-x-1.5 sm:space-x-2.5 text-left z-10 min-w-0">
              <div className="w-4.5 h-4.5 sm:w-6 sm:h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0 border border-white/10 shadow-inner">
                <Phone className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white animate-bounce" />
              </div>
              <div className="min-w-0">
                <h4 className="text-[11px] sm:text-base font-bold sm:font-black tracking-tight truncate">
                  {lang === "bn" ? "সরাসরি ফোন করে ঝটপট অর্ডার করুন" : "Place Your Order Directly via Call!"}
                </h4>
              </div>
            </div>
            <a 
              href="tel:+8801722638985"
              className="bg-white hover:bg-slate-50 text-amber-600 font-extrabold sm:font-black text-[10px] sm:text-[11px] px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-md sm:rounded-lg transition shadow-xs cursor-pointer uppercase tracking-wider flex items-center justify-center space-x-1 shrink-0"
            >
              <Phone className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
              <span>{lang === "bn" ? "কল করুন" : "Call Now"}</span>
            </a>
          </div>
          
          {/* Live Suggestion Box */}
          {searchQuery && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-xl shadow-xl z-50 max-h-80 overflow-y-auto p-2">
              <div className="flex justify-between items-center border-b border-slate-50 p-1.5 pb-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase">
                  {lang === "bn" ? `${filteredProducts.length}টি ফলাফল পাওয়া গেছে` : `Found ${filteredProducts.length} results`}
                </span>
                <button onClick={() => setSearchQuery("")} className="text-xs text-red-500 hover:underline">
                  {lang === "bn" ? "মুছে ফেলুন" : "Clear"}
                </button>
              </div>
              {filteredProducts.slice(0, 5).map((prod) => (
                <div 
                  key={prod.id} 
                  onClick={() => {
                    openQuickView(prod);
                    setSearchQuery("");
                  }}
                  className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition"
                >
                  <img src={prod.image} className="w-10 h-10 object-cover rounded" onError={handleProductImgError} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate text-slate-800">{lang === "bn" ? prod.nameBn : prod.nameEn}</p>
                    <p className="text-[10px] text-emerald-600 font-bold">৳{fmtNum(prod.price)} / {lang === "bn" ? prod.unitBn : prod.unitEn}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ================= PREMIUM BANNER SLIDER ================= */}
      {selectedCategory === "all" && (
        <BannerSlider
          lang={lang}
          loggedInUser={loggedInUser}
          userReferralCode={userReferralCode}
          timeLeft={timeLeft}
          onReferralClick={() => {
            setPortalInitialTab("referral");
            setShowPortalModal(true);
          }}
          onFlashSaleClick={() => {
            setShowFlashSaleOnly(true);
            const el = document.getElementById("flash-sale-dedicated-view");
            if (el) {
              el.scrollIntoView({ behavior: "smooth" });
            } else {
              window.scrollTo({ top: 350, behavior: "smooth" });
            }
          }}
          customBanners={homeConfig?.heroBanners || banners}
        />
      )}

      {/* ================= 4. CATEGORIES ================= */}
      <section className="max-w-7xl mx-auto px-4 mt-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg md:text-xl font-bold text-slate-800 flex items-center gap-1.5">
              <span className="w-2.5 h-6 bg-emerald-600 rounded-full inline-block"></span>
              {lang === "bn" ? "প্রয়োজনীয় ক্যাটাগরি সমূহ" : "Explore Beautiful Categories"}
            </h3>
            <p className="text-xs text-slate-400">{lang === "bn" ? "এক ক্লিকেই পছন্দমতো বাজার করুন" : "Browse items by department smoothly"}</p>
          </div>
          {selectedCategory !== "all" && (
            <button 
              onClick={() => {
                setSelectedCategory("all");
                setSelectedSubcategory("all");
              }}
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-emerald-200 shadow-xs"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>{lang === "bn" ? "সব ক্যাটাগরি" : "All Categories"}</span>
            </button>
          )}
        </div>
        
        {/* All Categories displayed directly in a premium, responsive grid */}
        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-10 xl:grid-cols-10 gap-3 md:gap-4">
          {categories.filter(c => c.id !== "all" && c.isAvailable !== false && (c as any).disabled !== true && !(homeConfig?.categoryConfig?.hiddenCategoryIds || []).includes(c.id)).map((cat, idx) => {
            const isHiddenOnMobile = idx >= 6 && !showAllMobile;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  if (selectedCategory === cat.id) {
                    setSelectedCategory("all");
                    setSelectedSubcategory("all");
                  } else {
                    setSelectedCategory(cat.id);
                    setSelectedSubcategory("all");
                    setShowFlashSaleOnly(false);
                  }
                }}
                className={`flex-col items-center p-3 rounded-2xl border cursor-pointer transition-all duration-300 shadow-xs hover:shadow-md hover:-translate-y-0.5 ${isHiddenOnMobile ? "hidden sm:flex" : "flex"} ${selectedCategory === cat.id ? "border-emerald-500 ring-2 ring-emerald-500/20 bg-white" : "border-slate-100 bg-white"}`}
              >
                <div className={`w-11 h-11 rounded-full flex items-center justify-center mb-1.5 transition overflow-hidden ${selectedCategory === cat.id ? "bg-emerald-600 text-white" : cat.colorClass}`}>
                  {(cat as any).image || (cat as any).imageUrl ? (
                    <img src={(cat as any).image || (cat as any).imageUrl} alt={cat.nameEn} className="w-full h-full object-cover" />
                  ) : (
                    renderCatIcon(cat.iconName)
                  )}
                </div>
                <p className="text-[10px] sm:text-xs font-bold text-slate-700 text-center leading-tight mt-1">
                  {lang === "bn" ? cat.nameBn : cat.nameEn}
                </p>
              </button>
            );
          })}
        </div>

        {/* Mobile Show All/Less Button placed at the very end of the category list, not as the 6th item */}
        <div className="flex justify-center mt-4 sm:hidden">
          {!showAllMobile ? (
            <button
              onClick={() => setShowAllMobile(true)}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-white border border-slate-200 hover:border-emerald-500 rounded-full text-xs font-bold text-slate-700 hover:text-emerald-600 shadow-sm transition cursor-pointer"
            >
              <span>{lang === "bn" ? "সব ক্যাটাগরি দেখুন" : "Show All Categories"}</span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>
          ) : (
            <button
              onClick={() => setShowAllMobile(false)}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-white border border-slate-200 hover:border-emerald-500 rounded-full text-xs font-bold text-slate-700 hover:text-emerald-600 shadow-sm transition cursor-pointer"
            >
              <span>{lang === "bn" ? "কম ক্যাটাগরি দেখুন" : "Show Less"}</span>
              <ChevronUp className="w-4 h-4 text-slate-400" />
            </button>
          )}
        </div>
      </section>

      {selectedCategory === "all" ? (
        showFlashSaleOnly ? (
          <div id="flash-sale-dedicated-view" className="max-w-7xl mx-auto px-4 mt-6 scroll-mt-24">
            {/* Beautiful Header with Back Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setShowFlashSaleOnly(false)}
                  className="p-2 bg-white rounded-xl hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 transition flex items-center justify-center cursor-pointer shadow-sm"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div>
                  <h3 className="text-lg md:text-xl font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="w-2.5 h-6 bg-rose-600 rounded-full inline-block"></span>
                    {lang === "bn" ? "⚡ ফ্ল্যাশ সেল অফারসমূহ" : "⚡ Flash Sale Event"}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {lang === "bn" ? "সীমাবদ্ধ সময়ের জন্য সরাসরি মাঠ থেকে সেরা অফারের সতেজ গ্রোসারি" : "Premium groceries at limited-time unbeatable prices"}
                  </p>
                </div>
              </div>

              {/* Live countdown timer */}
              <div className="flex items-center space-x-2 bg-rose-50 border border-rose-100 p-2 rounded-xl">
                <span className="text-[10px] uppercase font-black tracking-wider text-rose-600 block mr-1 animate-pulse">
                  {lang === "bn" ? "সময় বাকি:" : "ENDS IN:"}
                </span>
                <div className="flex items-center space-x-1 text-xs font-mono font-bold text-rose-700">
                  <span className="bg-rose-600 px-1.5 py-0.5 rounded text-white">{String(timeLeft.hours).padStart(2, '0')}</span>
                  <span>:</span>
                  <span className="bg-rose-600 px-1.5 py-0.5 rounded text-white">{String(timeLeft.minutes).padStart(2, '0')}</span>
                  <span>:</span>
                  <span className="bg-rose-600 px-1.5 py-0.5 rounded text-white">{String(timeLeft.seconds).padStart(2, '0')}</span>
                </div>
              </div>
            </div>

            {/* Grid of All Flash Sale Products with BOTH buttons */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {availableProducts.filter(p => p.isFlashSale).map((product) => (
                <div key={product.id} className="bg-white rounded-xl overflow-hidden border border-slate-100 flex flex-col justify-between hover:shadow-lg transition duration-300 relative group">
                  {/* Discount badge */}
                  {product.discount ? (
                    <span className="absolute top-2 left-2 z-10 bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow">
                      {fmtNum(product.discount)}% {lang === "bn" ? "ছাড়" : "OFF"}
                    </span>
                  ) : null}

                  {/* Wishlist toggle */}
                  <button 
                    onClick={() => toggleWishlist(product.id)}
                    className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-white/80 hover:bg-white text-slate-400 hover:text-rose-500 shadow transition cursor-pointer"
                  >
                    <Heart className={`w-3.5 h-3.5 ${wishlist.includes(product.id) ? "fill-rose-500 text-rose-500" : ""}`} />
                  </button>

                  {/* Image */}
                  <div className="relative overflow-hidden bg-slate-50 h-32 sm:h-36">
                    <img 
                      src={product.image} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                      alt={product.nameEn}
                      referrerPolicy="no-referrer"
                      onError={handleProductImgError}
                    />
                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition duration-300 flex items-center justify-center">
                      <button 
                        onClick={() => openQuickView(product)}
                        className="p-1.5 rounded-full bg-white hover:bg-emerald-500 text-slate-800 hover:text-white shadow-md transition-colors cursor-pointer hover:scale-105"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-3 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-800 line-clamp-1 group-hover:text-emerald-600 transition-colors">
                        {lang === "bn" ? product.nameBn : product.nameEn}
                      </h4>
                      <p className="text-[10px] text-slate-400 line-clamp-1">{lang === "bn" ? product.nameEn : product.nameBn}</p>
                      
                      <div className="flex items-center space-x-1 mt-1">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <span className="text-[10px] font-bold text-slate-500">
                          {fmtNum(product.rating)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-50">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-sm font-black text-emerald-600">৳{fmtNum(product.price)}</span>
                        {product.originalPrice && product.originalPrice > product.price ? (
                          <span className="text-[10px] text-slate-400 line-through">৳{fmtNum(product.originalPrice)}</span>
                        ) : null}
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 mt-2">
                        <button 
                          onClick={() => addToCart(product)}
                          className={`py-1.5 text-[10px] font-bold rounded-lg transition shadow-xs cursor-pointer flex items-center justify-center space-x-1 border ${cart.some(item => item.product.id === product.id) ? "bg-emerald-50 text-emerald-700 border border-emerald-600 hover:bg-emerald-100" : "bg-white text-emerald-600 border-emerald-500 hover:bg-emerald-50"}`}
                        >
                          {cart.some(item => item.product.id === product.id) ? (
                            <span>{lang === "bn" ? "✓ কার্ট" : "✓ Cart"}</span>
                          ) : (
                            <span>{lang === "bn" ? "🛒 কার্ট" : "🛒 Cart"}</span>
                          )}
                        </button>
                        <button 
                          onClick={() => handleBuyNow(product)}
                          className="py-1.5 text-[10px] font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 active:bg-emerald-800 transition shadow-xs cursor-pointer flex items-center justify-center space-x-1"
                        >
                          <span>{lang === "bn" ? "🛍️ অর্ডার" : "🛍️ Order"}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
          {/* ================= 5. FEATURED PRODUCTS ================= */}
          {homeConfig?.featuredProducts?.popularSectionVisible !== false && (
          <section className="max-w-7xl mx-auto px-4 mt-10">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg md:text-xl font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-2.5 h-6 bg-emerald-600 rounded-full inline-block"></span>
                  {lang === "bn" ? "জনপ্রিয় ও আকর্ষণীয় পণ্য" : "Featured Products"}
                </h3>
                <p className="text-xs text-slate-400">
                  {lang === "bn" ? "আমাদের সেরা এবং অত্যন্ত জনপ্রিয় পণ্যসমূহ" : "Our handpicked premium products for you"}
                </p>
              </div>
              <button
                onClick={() => setPopularLimit(prev => prev === 4 ? 50 : 4)}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-bold hover:underline cursor-pointer"
              >
                {popularLimit === 4 ? (lang === "bn" ? "সবগুলো দেখুন" : "See All") : (lang === "bn" ? "কম দেখুন" : "See Less")}
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {availableProducts.filter(p => p.isPopular || (homeConfig?.featuredProducts?.popularProductIds || []).includes(p.id)).slice(0, popularLimit).map((product) => (
                <div key={product.id} className="bg-white rounded-xl overflow-hidden border border-slate-100 flex flex-col justify-between hover:shadow-lg transition duration-300 relative group">
                  {/* Discount badge */}
                  {product.discount ? (
                    <span className="absolute top-2 left-2 z-10 bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow">
                      {fmtNum(product.discount)}% {lang === "bn" ? "ছাড়" : "OFF"}
                    </span>
                  ) : null}

                  {/* Wishlist toggle */}
                  <button 
                    onClick={() => toggleWishlist(product.id)}
                    className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-white/80 hover:bg-white text-slate-400 hover:text-rose-500 shadow transition cursor-pointer"
                  >
                    <Heart className={`w-3.5 h-3.5 ${wishlist.includes(product.id) ? "fill-rose-500 text-rose-500" : ""}`} />
                  </button>

                  {/* Image */}
                  <div className="relative overflow-hidden bg-slate-50 h-32 sm:h-36">
                    <img 
                      src={product.image} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                      alt={product.nameEn}
                      referrerPolicy="no-referrer"
                      onError={handleProductImgError}
                    />
                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition duration-300 flex items-center justify-center">
                      <button 
                        onClick={() => openQuickView(product)}
                        className="p-1.5 rounded-full bg-white hover:bg-emerald-500 text-slate-800 hover:text-white shadow-md transition-colors cursor-pointer hover:scale-105"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-3 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-800 line-clamp-1 group-hover:text-emerald-600 transition-colors">
                        {lang === "bn" ? product.nameBn : product.nameEn}
                      </h4>
                      <p className="text-[10px] text-slate-400 line-clamp-1">{lang === "bn" ? product.nameEn : product.nameBn}</p>
                      
                      <div className="flex items-center space-x-1 mt-1">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <span className="text-[10px] font-bold text-slate-500">
                          {fmtNum(product.rating)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-50">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-sm font-black text-emerald-600">৳{fmtNum(product.price)}</span>
                        {product.originalPrice && product.originalPrice > product.price ? (
                          <span className="text-[10px] text-slate-400 line-through">৳{fmtNum(product.originalPrice)}</span>
                        ) : null}
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 mt-2">
                        <button 
                          onClick={() => addToCart(product)}
                          className={`py-1.5 text-[10px] font-bold rounded-lg transition shadow-xs cursor-pointer flex items-center justify-center space-x-1 border ${cart.some(item => item.product.id === product.id) ? "bg-emerald-50 text-emerald-700 border border-emerald-600 hover:bg-emerald-100" : "bg-white text-emerald-600 border-emerald-500 hover:bg-emerald-50"}`}
                        >
                          {cart.some(item => item.product.id === product.id) ? (
                            <span>{lang === "bn" ? "✓ কার্ট" : "✓ Cart"}</span>
                          ) : (
                            <span>{lang === "bn" ? "🛒 কার্ট" : "🛒 Cart"}</span>
                          )}
                        </button>
                        <button 
                          onClick={() => handleBuyNow(product)}
                          className="py-1.5 text-[10px] font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 active:bg-emerald-800 transition shadow-xs cursor-pointer flex items-center justify-center space-x-1"
                        >
                          <span>{lang === "bn" ? "🛍️ অর্ডার" : "🛍️ Order"}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
          )}

          {/* ================= 7. NEW ARRIVALS ================= */}
          {homeConfig?.featuredProducts?.newArrivalSectionVisible !== false && (
          <section className="max-w-7xl mx-auto px-4 mt-10">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg md:text-xl font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-2.5 h-6 bg-emerald-500 rounded-full inline-block"></span>
                  {lang === "bn" ? "নতুন সংগৃহীত পণ্যসমূহ" : "New Arrivals"}
                </h3>
                <p className="text-xs text-slate-400">
                  {lang === "bn" ? "সরাসরি মাঠ থেকে আসা একদম সতেজ নতুন পণ্যসমূহ" : "Freshly harvested organic items added recently"}
                </p>
              </div>
              <button
                onClick={() => setNewArrivalsLimit(prev => prev === 4 ? 50 : 4)}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-bold hover:underline cursor-pointer"
              >
                {newArrivalsLimit === 4 ? (lang === "bn" ? "সবগুলো দেখুন" : "See All") : (lang === "bn" ? "কম দেখুন" : "See Less")}
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {availableProducts.filter(p => p.isNewArrival).slice(0, newArrivalsLimit).map((product) => (
                <div key={product.id} className="bg-white rounded-xl overflow-hidden border border-slate-100 flex flex-col justify-between hover:shadow-lg transition duration-300 relative group">
                  {/* Discount badge */}
                  {product.discount ? (
                    <span className="absolute top-2 left-2 z-10 bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow">
                      {fmtNum(product.discount)}% {lang === "bn" ? "ছাড়" : "OFF"}
                    </span>
                  ) : null}

                  {/* Wishlist toggle */}
                  <button 
                    onClick={() => toggleWishlist(product.id)}
                    className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-white/80 hover:bg-white text-slate-400 hover:text-rose-500 shadow transition cursor-pointer"
                  >
                    <Heart className={`w-3.5 h-3.5 ${wishlist.includes(product.id) ? "fill-rose-500 text-rose-500" : ""}`} />
                  </button>

                  {/* Image */}
                  <div className="relative overflow-hidden bg-slate-50 h-32 sm:h-36">
                    <img 
                      src={product.image} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                      alt={product.nameEn}
                      referrerPolicy="no-referrer"
                      onError={handleProductImgError}
                    />
                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition duration-300 flex items-center justify-center">
                      <button 
                        onClick={() => openQuickView(product)}
                        className="p-1.5 rounded-full bg-white hover:bg-emerald-500 text-slate-800 hover:text-white shadow-md transition-colors cursor-pointer hover:scale-105"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-3 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-800 line-clamp-1 group-hover:text-emerald-600 transition-colors">
                        {lang === "bn" ? product.nameBn : product.nameEn}
                      </h4>
                      <p className="text-[10px] text-slate-400 line-clamp-1">{lang === "bn" ? product.nameEn : product.nameBn}</p>
                      
                      <div className="flex items-center space-x-1 mt-1">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <span className="text-[10px] font-bold text-slate-500">
                          {fmtNum(product.rating)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-50">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-sm font-black text-emerald-600">৳{fmtNum(product.price)}</span>
                        {product.originalPrice && product.originalPrice > product.price ? (
                          <span className="text-[10px] text-slate-400 line-through">৳{fmtNum(product.originalPrice)}</span>
                        ) : null}
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 mt-2">
                        <button 
                          onClick={() => addToCart(product)}
                          className={`py-1.5 text-[10px] font-bold rounded-lg transition shadow-xs cursor-pointer flex items-center justify-center space-x-1 border ${cart.some(item => item.product.id === product.id) ? "bg-emerald-50 text-emerald-700 border border-emerald-600 hover:bg-emerald-100" : "bg-white text-emerald-600 border-emerald-500 hover:bg-emerald-50"}`}
                        >
                          {cart.some(item => item.product.id === product.id) ? (
                            <span>{lang === "bn" ? "✓ কার্ট" : "✓ Cart"}</span>
                          ) : (
                            <span>{lang === "bn" ? "🛒 কার্ট" : "🛒 Cart"}</span>
                          )}
                        </button>
                        <button 
                          onClick={() => handleBuyNow(product)}
                          className="py-1.5 text-[10px] font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 active:bg-emerald-800 transition shadow-xs cursor-pointer flex items-center justify-center space-x-1"
                        >
                          <span>{lang === "bn" ? "🛍️ অর্ডার" : "🛍️ Order"}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
          )}

          {/* ================= 8. BEST SELLERS ================= */}
          <section className="max-w-7xl mx-auto px-4 mt-10">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg md:text-xl font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-2.5 h-6 bg-amber-500 rounded-full inline-block"></span>
                  {lang === "bn" ? "সর্বোচ্চ বিক্রিত পণ্যসমূহ" : "Best Sellers"}
                </h3>
                <p className="text-xs text-slate-400">
                  {lang === "bn" ? "গ্রাহকদের সর্বোচ্চ পছন্দের তালিকায় থাকা পণ্যসমূহ" : "Our most popular and highest-selling groceries"}
                </p>
              </div>
              <button
                onClick={() => setBestSellersLimit(prev => prev === 4 ? 50 : 4)}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-bold hover:underline cursor-pointer"
              >
                {bestSellersLimit === 4 ? (lang === "bn" ? "সবগুলো দেখুন" : "See All") : (lang === "bn" ? "কম দেখুন" : "See Less")}
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {availableProducts.filter(p => p.isBestSelling).slice(0, bestSellersLimit).map((product) => (
                <div key={product.id} className="bg-white rounded-xl overflow-hidden border border-slate-100 flex flex-col justify-between hover:shadow-lg transition duration-300 relative group">
                  {/* Discount badge */}
                  {product.discount ? (
                    <span className="absolute top-2 left-2 z-10 bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow">
                      {fmtNum(product.discount)}% {lang === "bn" ? "ছাড়" : "OFF"}
                    </span>
                  ) : null}

                  {/* Wishlist toggle */}
                  <button 
                    onClick={() => toggleWishlist(product.id)}
                    className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-white/80 hover:bg-white text-slate-400 hover:text-rose-500 shadow transition cursor-pointer"
                  >
                    <Heart className={`w-3.5 h-3.5 ${wishlist.includes(product.id) ? "fill-rose-500 text-rose-500" : ""}`} />
                  </button>

                  {/* Image */}
                  <div className="relative overflow-hidden bg-slate-50 h-32 sm:h-36">
                    <img 
                      src={product.image} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                      alt={product.nameEn}
                      referrerPolicy="no-referrer"
                      onError={handleProductImgError}
                    />
                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition duration-300 flex items-center justify-center">
                      <button 
                        onClick={() => openQuickView(product)}
                        className="p-1.5 rounded-full bg-white hover:bg-emerald-500 text-slate-800 hover:text-white shadow-md transition-colors cursor-pointer hover:scale-105"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-3 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-800 line-clamp-1 group-hover:text-emerald-600 transition-colors">
                        {lang === "bn" ? product.nameBn : product.nameEn}
                      </h4>
                      <p className="text-[10px] text-slate-400 line-clamp-1">{lang === "bn" ? product.nameEn : product.nameBn}</p>
                      
                      <div className="flex items-center space-x-1 mt-1">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <span className="text-[10px] font-bold text-slate-500">
                          {fmtNum(product.rating)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-50">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-sm font-black text-emerald-600">৳{fmtNum(product.price)}</span>
                        {product.originalPrice && product.originalPrice > product.price ? (
                          <span className="text-[10px] text-slate-400 line-through">৳{fmtNum(product.originalPrice)}</span>
                        ) : null}
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 mt-2">
                        <button 
                          onClick={() => addToCart(product)}
                          className={`py-1.5 text-[10px] font-bold rounded-lg transition shadow-xs cursor-pointer flex items-center justify-center space-x-1 border ${cart.some(item => item.product.id === product.id) ? "bg-emerald-50 text-emerald-700 border border-emerald-600 hover:bg-emerald-100" : "bg-white text-emerald-600 border-emerald-500 hover:bg-emerald-50"}`}
                        >
                          {cart.some(item => item.product.id === product.id) ? (
                            <span>{lang === "bn" ? "✓ কার্ট" : "✓ Cart"}</span>
                          ) : (
                            <span>{lang === "bn" ? "🛒 কার্ট" : "🛒 Cart"}</span>
                          )}
                        </button>
                        <button 
                          onClick={() => handleBuyNow(product)}
                          className="py-1.5 text-[10px] font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 active:bg-emerald-800 transition shadow-xs cursor-pointer flex items-center justify-center space-x-1"
                        >
                          <span>{lang === "bn" ? "🛍️ অর্ডার" : "🛍️ Order"}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ================= 9. REMAINING PRODUCT SECTIONS ================= */}
          {/* ================= RECOMMENDED & SEASONAL SPECIAL ================= */}
      <section className="max-w-7xl mx-auto px-4 mt-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Recommended For You */}
          <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4">
            <h3 className="text-base font-bold text-slate-800 mb-3 flex items-center justify-between">
              <span>{lang === "bn" ? "আপনার জন্য স্পেশাল" : "Recommended For You"}</span>
              <Award className="w-4.5 h-4.5 text-emerald-600 animate-pulse" />
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {availableProducts.filter(p => p.rating >= 4.8 && !p.isCombo).slice(0, 2).map((product) => (
                <div key={product.id} className="bg-white p-3 rounded-xl border border-emerald-50/30 flex flex-col justify-between">
                  <img src={product.image} className="w-full h-24 object-cover rounded-lg mb-2" onError={handleProductImgError} />
                  <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{lang === "bn" ? product.nameBn : product.nameEn}</h4>
                  <div className="flex justify-between items-center mt-2.5">
                    <span className="text-xs font-black text-emerald-600">৳{fmtNum(product.price)}</span>
                    <button 
                      onClick={() => addToCart(product)}
                      className="bg-emerald-600 text-white p-1 rounded-full hover:bg-emerald-700 transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Seasonal Collection (Himsagar Mango, Jackfruit, etc) */}
          <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4">
            <h3 className="text-base font-bold text-slate-800 mb-3 flex items-center justify-between">
              <span>{lang === "bn" ? "মৌসুমী তাজা ফল মেলা" : "Seasonal Special Fruits"}</span>
              <Sparkles className="w-4.5 h-4.5 text-amber-500 animate-spin" />
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {availableProducts.filter(p => p.isSeasonal).slice(0, 2).map((product) => (
                <div key={product.id} className="bg-white p-3 rounded-xl border border-amber-50/30 flex flex-col justify-between">
                  <img src={product.image} className="w-full h-24 object-cover rounded-lg mb-2" onError={handleProductImgError} />
                  <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{lang === "bn" ? product.nameBn : product.nameEn}</h4>
                  <div className="flex justify-between items-center mt-2.5">
                    <span className="text-xs font-black text-emerald-600">৳{fmtNum(product.price)}</span>
                    <button 
                      onClick={() => addToCart(product)}
                      className="bg-amber-500 text-white p-1 rounded-full hover:bg-amber-600 transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>



      {/* ================= 10 DYNAMIC CATEGORY SHELVES ================= */}
      {/* 
        Sections 11 to 20: 
        Instead of copy-pasting 10 different layout sections which crashes on max tokens, 
        we map over the beautiful departments database dynamically. 
        Each shelf gets its own beautiful title, background accent, and filters perfectly!
      */}
      <section className="max-w-7xl mx-auto px-4 mt-10 space-y-12">
        {[].map((shelf: any) => {
          const shelfProducts = availableProducts.filter(p => 
            shelf.id === "fish-meat" 
              ? (p.category === "fish" || p.category === "meat") 
              : shelf.id === "snacks-beverages" 
                ? (p.category === "snacks-biscuits" || p.category === "beverages") 
                : p.category === shelf.id
          );
          if (shelfProducts.length === 0) return null;
          
          return (
            <div key={shelf.id} className={`p-4 sm:p-6 rounded-2xl bg-gradient-to-br ${shelf.color} border border-slate-100`}>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-1.5">
                    <span className={`w-2.5 h-5 rounded-md inline-block ${shelf.accent}`}></span>
                    {lang === "bn" ? shelf.nameBn : shelf.nameEn}
                  </h3>
                  <p className="text-xs text-slate-400">{lang === "bn" ? "স্বাস্থ্যসম্মত ও শতভাগ নিরাপদ" : "100% certified and safe"}</p>
                </div>
                <button 
                  onClick={() => {
                    setSelectedCategory(shelf.id);
                    triggerToast(`ক্যাটাগরি ফিল্টার: ${shelf.id}`, `Department filter active: ${shelf.id}`);
                  }}
                  className="text-xs font-bold text-emerald-600 hover:underline"
                >
                  {lang === "bn" ? "সবগুলো দেখুন" : "View All"}
                </button>
              </div>

              {/* Grid block */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {shelfProducts.slice(0, 4).map((product) => (
                  <div key={product.id} className="bg-white rounded-xl overflow-hidden border border-slate-100 flex flex-col justify-between hover:shadow-lg transition duration-300 relative group">
                    
                    {/* Discounts */}
                    {product.discount && (
                      <span className="absolute top-2 left-2 z-10 bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow">
                        {fmtNum(product.discount)}% {lang === "bn" ? "ছাড়" : "OFF"}
                      </span>
                    )}

                    {/* Wishlist toggle */}
                    <button 
                      onClick={() => toggleWishlist(product.id)}
                      className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-white/80 hover:bg-white text-slate-400 hover:text-rose-500 shadow transition cursor-pointer"
                    >
                      <Heart className={`w-3.5 h-3.5 ${wishlist.includes(product.id) ? "fill-rose-500 text-rose-500" : ""}`} />
                    </button>

                    {/* Image */}
                    <div className="relative overflow-hidden bg-slate-50 h-32 sm:h-36">
                      <img 
                        src={product.image} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                        alt={product.nameEn}
                        referrerPolicy="no-referrer"
                        onError={handleProductImgError}
                      />
                      <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition duration-300 flex items-center justify-center">
                        <button 
                          onClick={() => openQuickView(product)}
                          className="p-1.5 rounded-full bg-white hover:bg-emerald-500 text-slate-800 hover:text-white shadow-md transition-colors cursor-pointer hover:scale-105"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-3 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-800 line-clamp-1 group-hover:text-emerald-600 transition-colors">
                          {lang === "bn" ? product.nameBn : product.nameEn}
                        </h4>
                        <p className="text-[10px] text-slate-400 line-clamp-1">{lang === "bn" ? product.nameEn : product.nameBn}</p>
                        
                        <div className="flex items-center space-x-1 mt-1">
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                          <span className="text-[10px] font-bold text-slate-500">
                            {fmtNum(product.rating)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-50">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-sm font-black text-emerald-600">৳{fmtNum(product.price)}</span>
                          {product.originalPrice && product.originalPrice > product.price ? (
                            <span className="text-[10px] text-slate-400 line-through">৳{fmtNum(product.originalPrice)}</span>
                          ) : null}
                        </div>

                        <div className="grid grid-cols-2 gap-1.5 mt-2">
                          <button 
                            onClick={() => addToCart(product)}
                            className={`py-1.5 text-[10px] font-bold rounded-lg transition shadow-xs cursor-pointer flex items-center justify-center space-x-1 border ${cart.some(item => item.product.id === product.id) ? "bg-emerald-50 text-emerald-700 border border-emerald-600 hover:bg-emerald-100" : "bg-white text-emerald-600 border-emerald-500 hover:bg-emerald-50"}`}
                          >
                            {cart.some(item => item.product.id === product.id) ? (
                              <span>{lang === "bn" ? "✓ কার্ট" : "✓ Cart"}</span>
                            ) : (
                              <span>{lang === "bn" ? "🛒 কার্ট" : "🛒 Cart"}</span>
                            )}
                          </button>
                          <button 
                            onClick={() => handleBuyNow(product)}
                            className="py-1.5 text-[10px] font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 active:bg-emerald-800 transition shadow-xs cursor-pointer flex items-center justify-center space-x-1"
                          >
                            <span>{lang === "bn" ? "🛍️ অর্ডার" : "🛍️ Order"}</span>
                          </button>
                        </div>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </section>


        </>
        )
      ) : (
        <div className="max-w-7xl mx-auto px-4 mt-6">
          {/* Category Page Header Banner */}
          {(() => {
            const cat = categories.find(c => c.id === selectedCategory);
            if (!cat) return null;

            // Filter products
            const catProducts = availableProducts.filter((product) => {
              const matchesCategory = product.category === selectedCategory;
              const matchesSubcategory = selectedSubcategory === "all" || product.subcategory === selectedSubcategory;
              const normSearch = searchQuery.toLowerCase();
              const matchesSearch = 
                product.nameBn.toLowerCase().includes(normSearch) || 
                product.nameEn.toLowerCase().includes(normSearch) || 
                product.descriptionBn.toLowerCase().includes(normSearch) ||
                product.descriptionEn.toLowerCase().includes(normSearch) ||
                (product.brand && product.brand.toLowerCase().includes(normSearch));
              return matchesCategory && matchesSubcategory && matchesSearch;
            });

            // Unique subcategories
            const allCatProducts = availableProducts.filter(p => p.category === selectedCategory);
            const subcategories = ["all", ...Array.from(new Set(allCatProducts.map(p => p.subcategory).filter(Boolean)))];

            // Sort products
            const sortedProducts = [...catProducts].sort((a, b) => {
              if (sortBy === "price-low") return a.price - b.price;
              if (sortBy === "price-high") return b.price - a.price;
              if (sortBy === "rating") return b.rating - a.rating;
              if (sortBy === "discount") return (b.discount || 0) - (a.discount || 0);
              // Default sorting respects displayOrder / order set by Admin
              const orderA = typeof (a as any).displayOrder === "number" ? (a as any).displayOrder : (typeof (a as any).order === "number" ? (a as any).order : 9999);
              const orderB = typeof (b as any).displayOrder === "number" ? (b as any).displayOrder : (typeof (b as any).order === "number" ? (b as any).order : 9999);
              return orderA - orderB;
            });

            return (
              <>
                <div className={`p-6 sm:p-8 rounded-2xl bg-gradient-to-br ${cat.colorClass.split(" ")[0]} border ${cat.borderColor} flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm`}>
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md shrink-0 animate-fade-in overflow-hidden">
                      {(cat as any).image || (cat as any).imageUrl ? (
                        <img src={(cat as any).image || (cat as any).imageUrl} alt={cat.nameEn} className="w-full h-full object-cover" />
                      ) : (
                        renderCatIcon(cat.iconName)
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                          {lang === "bn" ? "ডিপার্টমেন্ট" : "Department"}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          {allCatProducts.length} {lang === "bn" ? "টি পণ্য" : "products"}
                        </span>
                      </div>
                      <h2 className="text-xl sm:text-3xl font-black text-slate-800 mt-1">
                        {lang === "bn" ? cat.nameBn : cat.nameEn}
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {lang === "bn" 
                          ? "শতভাগ বিষমুক্ত, প্রাকৃতিকভাবে চাষকৃত সতেজ ও সরাসরি সোর্সড গ্রোসারি পণ্য" 
                          : "100% organic, naturally cultivated and direct-sourced fresh premium products"}
                      </p>
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      setSelectedCategory("all");
                      setSelectedSubcategory("all");
                    }}
                    className="bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 px-4 py-2 rounded-xl transition shadow-sm flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <ChevronLeft className="w-4 h-4 text-emerald-600" />
                    <span>{lang === "bn" ? "সব ক্যাটাগরি (হোম)" : "All Categories (Home)"}</span>
                  </button>
                </div>

                {/* Filtering, Subcategory, & Sorting Bar */}
                <div className="mt-6 flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
                  <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none max-w-full snap-x">
                    <span className="text-xs font-bold text-slate-400 shrink-0 uppercase tracking-wider mr-1">
                      {lang === "bn" ? "সাব-ক্যাটাগরি:" : "Sub-Category:"}
                    </span>
                    {subcategories.map((sub: string) => (
                      <button
                        key={sub}
                        onClick={() => {
                          setSelectedSubcategory(sub);
                          triggerToast(
                            `সাবক্যাটাগরি: ${sub === "all" ? (lang === "bn" ? "সব" : "All") : sub}`,
                            `Subcategory: ${sub === "all" ? "All" : sub}`
                          );
                        }}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer snap-start border ${
                          selectedSubcategory === sub
                            ? "bg-emerald-600 text-white border-emerald-600 shadow"
                            : "bg-white text-slate-600 border-slate-150 hover:bg-slate-50"
                        }`}
                      >
                        {sub === "all" ? (lang === "bn" ? "সব পণ্য" : "All Products") : sub}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center space-x-3 shrink-0 w-full lg:w-auto justify-between lg:justify-end">
                    <span className="text-xs font-bold text-slate-400 hidden sm:inline">
                      {lang === "bn" ? `${sortedProducts.length}টি পণ্য প্রদর্শিত হচ্ছে` : `Showing ${sortedProducts.length} items`}
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-slate-400 font-bold whitespace-nowrap">
                        {lang === "bn" ? "সাজান:" : "Sort:"}
                      </span>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="p-2 text-xs bg-white border border-slate-200 rounded-xl font-bold outline-none text-slate-700 cursor-pointer hover:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                      >
                        <option value="default">{lang === "bn" ? "ডিফল্ট / প্রাসঙ্গিকতা" : "Default / Relevance"}</option>
                        <option value="price-low">{lang === "bn" ? "মূল্য: কম থেকে বেশি" : "Price: Low to High"}</option>
                        <option value="price-high">{lang === "bn" ? "মূল্য: বেশি থেকে কম" : "Price: High to Low"}</option>
                        <option value="rating">{lang === "bn" ? "জনপ্রিয়তা / রেটিং" : "Popularity / Star Rating"}</option>
                        <option value="discount">{lang === "bn" ? "সেরা ছাড় / ডিসকাউন্ট" : "Biggest Savings / Discount"}</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Empty list search warning */}
                {sortedProducts.length === 0 && (
                  <div className="mt-10 p-10 bg-white border border-slate-100 rounded-2xl text-center shadow-sm flex flex-col items-center max-w-md mx-auto">
                    <Search className="w-12 h-12 text-slate-300 mb-3 animate-pulse" />
                    <h3 className="text-sm font-bold text-slate-800">{lang === "bn" ? "কোন পণ্য পাওয়া যায়নি!" : "No products found!"}</h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
                      {lang === "bn" 
                        ? "অনুগ্রহ করে বানান চেক করুন অথবা ক্লিয়ার সার্চ বাটন ক্লিক করে পুনরায় চেষ্টা করুন।" 
                        : "Please adjust your search terms or filter constraints and try again."}
                    </p>
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedSubcategory("all");
                      }}
                      className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                    >
                      {lang === "bn" ? "সব ফিল্টার রিসেট করুন" : "Reset All Filters"}
                    </button>
                  </div>
                )}

                {/* Grid */}
                {sortedProducts.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6 mt-6">
                    {sortedProducts.map((product) => (
                      <div 
                        key={product.id} 
                        className="bg-white rounded-2xl overflow-hidden border border-slate-100 flex flex-col justify-between hover:shadow-xl transition-all duration-300 relative group"
                      >
                        {product.discount && product.discount > 0 ? (
                          <span className="absolute top-2.5 left-2.5 z-10 bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-md">
                            {fmtNum(product.discount)}% {lang === "bn" ? "ছাড়" : "OFF"}
                          </span>
                        ) : null}

                        <button 
                          onClick={() => toggleWishlist(product.id)}
                          className="absolute top-2.5 right-2.5 z-10 p-1.5 rounded-full bg-white/90 hover:bg-white text-slate-400 hover:text-rose-500 shadow-md transition-all duration-200 cursor-pointer hover:scale-110"
                        >
                          <Heart className={`w-4 h-4 ${wishlist.includes(product.id) ? "fill-rose-500 text-rose-500" : ""}`} />
                        </button>

                        <div className="relative overflow-hidden bg-slate-50 h-36 sm:h-44">
                          <img 
                            src={product.image} 
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                            alt={product.nameEn}
                            referrerPolicy="no-referrer"
                            onError={handleProductImgError}
                          />
                          <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition duration-300 flex items-center justify-center">
                            <button 
                              onClick={() => openQuickView(product)}
                              className="p-2 rounded-full bg-white hover:bg-emerald-500 text-slate-800 hover:text-white shadow-lg transition-colors cursor-pointer hover:scale-105"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="p-3 flex-1 flex flex-col justify-between">
                          <div>
                            <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider">
                              {product.subcategory}
                            </span>
                            <h4 className="text-xs sm:text-sm font-bold text-slate-800 line-clamp-1 mt-0.5 group-hover:text-emerald-600 transition-colors">
                              {lang === "bn" ? product.nameBn : product.nameEn}
                            </h4>
                            <p className="text-[10px] text-slate-400 line-clamp-1">{lang === "bn" ? product.nameEn : product.nameBn}</p>
                            
                            <div className="flex items-center space-x-1.5 mt-1.5">
                              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                              <span className="text-[10px] font-bold text-slate-500">
                                {fmtNum(product.rating)} ({fmtNum(product.reviewCount || 10)})
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">
                              {lang === "bn" ? `ইউনিট: ${product.unitBn}` : `Unit: ${product.unitEn}`}
                            </p>
                          </div>

                          <div className="mt-3 pt-2 border-t border-slate-50">
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-sm sm:text-base font-black text-emerald-600">৳{fmtNum(product.price)}</span>
                              {product.originalPrice && product.originalPrice > product.price ? (
                                <span className="text-[10px] text-slate-400 line-through">৳{fmtNum(product.originalPrice)}</span>
                              ) : null}
                            </div>
                            
                            {product.stock <= 15 ? (
                              <p className="text-[9px] text-rose-500 font-bold mt-1 animate-pulse">
                                {lang === "bn" ? `মাত্র ${fmtNum(product.stock)}টি স্টক বাকি আছে!` : `Only ${product.stock} left in stock!`}
                              </p>
                            ) : (
                              <p className="text-[9px] text-emerald-600 font-bold mt-1">
                                {lang === "bn" ? "স্টক আছে" : "In Stock"}
                              </p>
                            )}

                            <div className="grid grid-cols-2 gap-1.5 mt-2.5">
                              <button 
                                onClick={() => addToCart(product)}
                                className={`py-1.5 text-[10px] font-bold rounded-lg transition shadow-xs cursor-pointer flex items-center justify-center space-x-1 border ${cart.some(item => item.product.id === product.id) ? "bg-emerald-50 text-emerald-700 border-emerald-600 hover:bg-emerald-100" : "bg-white text-emerald-600 border-emerald-500 hover:bg-emerald-50"}`}
                              >
                                {cart.some(item => item.product.id === product.id) ? (
                                  <span>{lang === "bn" ? "✓ কার্ট" : "✓ Cart"}</span>
                                ) : (
                                  <span>{lang === "bn" ? "🛒 কার্ট" : "🛒 Cart"}</span>
                                )}
                              </button>
                              <button 
                                onClick={() => handleBuyNow(product)}
                                className="py-1.5 text-[10px] font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 active:bg-emerald-800 transition shadow-xs cursor-pointer flex items-center justify-center space-x-1"
                              >
                                <span>{lang === "bn" ? "🛍️ অর্ডার" : "🛍️ Order"}</span>
                              </button>
                            </div>
                          </div>
                        </div>

                      </div>
                    ))}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* ================= RECENTLY VIEWED (DYNAMIC FEED) ================= */}
      {recentlyViewed.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 mt-10">
          <h3 className="text-base font-bold text-slate-800 mb-4 pb-1 border-b border-slate-100 flex items-center gap-1.5">
            <span className="w-2.5 h-4 bg-emerald-600 rounded"></span>
            {lang === "bn" ? "আপনার সমসাময়িক দেখা পণ্য" : "Recently Viewed Products"}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {recentlyViewed.map((product) => (
              <div 
                key={product.id}
                onClick={() => openQuickView(product)}
                className="bg-white p-2.5 rounded-xl border border-slate-100 flex items-center gap-3 hover:shadow-md cursor-pointer transition"
              >
                <img src={product.image} className="w-12 h-12 object-cover rounded-lg shrink-0" onError={handleProductImgError} />
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-800 truncate">{lang === "bn" ? product.nameBn : product.nameEn}</h4>
                  <p className="text-[10px] text-slate-400">{lang === "bn" ? `ইউনিট: ${product.unitBn}` : `Unit: ${product.unitEn}`}</p>
                  <p className="text-xs font-black text-emerald-600 mt-0.5">৳{fmtNum(product.price)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ================= WHY CHOOSE US ================= */}
      <section className="max-w-7xl mx-auto px-4 mt-3 sm:mt-6 md:mt-12 bg-white rounded-2xl border border-slate-100 py-2 px-3 sm:p-6 md:p-8">
        <div className="text-center max-w-xl mx-auto mb-1 md:mb-8">
          <h3 className="text-sm sm:text-lg md:text-2xl font-black text-slate-800 leading-tight">
            {lang === "bn" ? "কেন আমরাই সেরা অনলাইন কাচা বাজার?" : "Why Choose Kacha Bazar Grocery?"}
          </h3>
          <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 md:mt-1 leading-tight">
            {lang === "bn" ? "খাদ্য সচেতনতা ও বিশুদ্ধতার এক অনন্য নির্ভরযোগ্য ঠিকানা" : "Our commitment to transparency, quality and organic farming"}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-0.5 sm:gap-2 md:gap-6 text-center">
          {[
            { icon: <CheckCircle className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-emerald-600 mx-auto" />, titleBn: "রাসায়নিক ও ফরমালিন মুক্ত", titleEn: "100% Chemical Free", descBn: "শতভাগ সতেজ ও প্রাকৃতিকভাবে চাষকৃত পণ্য", descEn: "Strict standards ensuring absolute safety" },
            { icon: <Truck className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-emerald-600 mx-auto" />, titleBn: "⚡ ১ ঘণ্টার মধ্যে ডেলিভারি", titleEn: "⚡ 1-Hour Delivery", descBn: "বিশেষ রেফ্রিজারেটেড বাক্সে সতেজতা বজায় রাখা", descEn: "Preserving nutrients from fields to kitchens" },
            { icon: <Droplet className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-emerald-600 mx-auto" />, titleBn: "পরিবেশ বান্ধব বায়ো-প্যাকেজিং", titleEn: "Eco-Friendly Biodegradable Bags", descBn: "পচনশীল পাটের থলি ব্যবহার করে প্রকৃতির যত্ন", descEn: "Eliminating plastic waste entirely from logistics" },
            { icon: <User className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-emerald-600 mx-auto" />, titleBn: "সরাসরি কৃষকবান্ধব চাষ সোর্সিং", titleEn: "Direct Farmer-First Sourcing", descBn: "কৃষকদের ন্যায্যমূল্য প্রদান ও গ্রামীণ উন্নয়ন", descEn: "Sourcing ethically without middleman commissions" }
          ].map((item, idx) => (
            <div key={idx} className="py-0.5 px-2 sm:p-4 rounded-xl hover:bg-slate-50 transition">
              <div className="mb-0.5 md:mb-3">{item.icon}</div>
              <h4 className="text-[11px] sm:text-sm font-bold text-slate-800 leading-tight">{lang === "bn" ? item.titleBn : item.titleEn}</h4>
              <p className="text-[9.5px] sm:text-[11px] text-slate-400 mt-0 md:mt-1 leading-tight">{lang === "bn" ? item.descBn : item.descEn}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ================= DOWNLOAD APP BANNER ================= */}
      <section className="max-w-7xl mx-auto px-4 mt-5 md:mt-10 pb-8 md:pb-16">
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl md:rounded-3xl p-4 sm:p-5 md:p-10 text-white relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-3 md:gap-8 shadow-xl">
          <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl"></div>
          
          <div className="flex-1 max-w-lg z-10">
            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold tracking-widest uppercase inline-block mb-1 md:mb-2">
              {lang === "bn" ? "মোবাইল অ্যাপ্লিকেশন" : "Mobile App Launch"}
            </span>
            <h3 className="text-base sm:text-lg md:text-3xl font-extrabold leading-tight">
              {lang === "bn" ? "অর্ডার করুন কাচা বাজার মোবাইল অ্যাপে!" : "Order Smoother inside Mobile Application!"}
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-300 mt-1 md:mt-2">
              {lang === "bn" 
                ? "অ্যাপ ডাউনলোড করলেই প্রথম ৩টি অর্ডারে পাচ্ছেন ফ্রি হোম ডেলিভারি ও ২০০ টাকা ক্যাশব্যাক অফার! আজই ডাউনলোড করুন।" 
                : "Unlock exclusive deals, live delivery trackers, and instant cashbacks inside Kacha Bazar app."}
            </p>
            
            <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-3 md:mt-6">
              <button 
                onClick={() => triggerToast("গুগল প্লে স্টোর অ্যাপ ডাউনলোড লিংক কপি হয়েছে", "Google Play Store Link Copied")}
                className="bg-white/10 hover:bg-white/20 border border-white/15 px-2.5 py-1 md:px-3 md:py-1.5 rounded-lg text-left transition flex items-center space-x-1.5 md:space-x-2 cursor-pointer min-h-[40px] md:min-h-0"
              >
                <Smartphone className="w-4 h-4 md:w-5 md:h-5 text-emerald-400 shrink-0" />
                <div className="leading-tight">
                  <p className="text-[7px] md:text-[8px] text-slate-400 uppercase font-semibold">Get it on</p>
                  <p className="text-[11px] md:text-xs font-bold">Google Play</p>
                </div>
              </button>

              <button 
                onClick={() => triggerToast("অ্যাপল অ্যাপ স্টোর ডাউনলোড লিংক কপি হয়েছে", "Apple App Store Link Copied")}
                className="bg-white/10 hover:bg-white/20 border border-white/15 px-2.5 py-1 md:px-3 md:py-1.5 rounded-lg text-left transition flex items-center space-x-1.5 md:space-x-2 cursor-pointer min-h-[40px] md:min-h-0"
              >
                <Smartphone className="w-4 h-4 md:w-5 md:h-5 text-emerald-400 shrink-0" />
                <div className="leading-tight">
                  <p className="text-[7px] md:text-[8px] text-slate-400 uppercase font-semibold">Download on the</p>
                  <p className="text-[11px] md:text-xs font-bold">App Store</p>
                </div>
              </button>
            </div>
          </div>

          <div className="shrink-0 flex items-center space-x-2.5 md:space-x-4 bg-white/5 p-2.5 sm:p-3 md:p-4 rounded-xl md:rounded-2xl border border-white/10 z-10">
            <QrCode className="w-12 h-12 sm:w-14 sm:h-14 md:w-20 md:h-20 text-white shrink-0" />
            <div className="max-w-[110px] md:max-w-[120px]">
              <p className="text-[11px] md:text-xs font-bold leading-tight">{lang === "bn" ? "স্ক্যান করে ডাউনলোড করুন" : "Scan to Download Now"}</p>
              <p className="text-[8px] md:text-[9px] text-slate-400 mt-0.5 md:mt-1">{lang === "bn" ? "আইওএস এবং অ্যান্ড্রয়েড সংস্করণ সমর্থিত" : "iOS & Android app available"}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= BEAUTIFUL FOOTER ================= */}
      <footer className="bg-slate-900 text-slate-400 pt-12 pb-6 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-12 gap-8 mb-10 text-xs sm:text-sm items-start">
          
          {/* Leftmost Kacha Bazar Branding Area (KEPT UNCHANGED) */}
          <div className="md:col-span-6 lg:col-span-5">
            <div className="flex items-center space-x-2 mb-4 text-white">
              {logoImg ? (
                <img 
                  src={logoImg} 
                  alt="Kacha Bazar Logo" 
                  className="w-10 h-10 object-contain rounded-full border border-slate-700 bg-white"
                  referrerPolicy="no-referrer"
                />
              ) : null}
              <span className="text-lg font-black tracking-tight">{lang === "bn" ? "কাচা বাজার" : "Kacha Bazar"}</span>
            </div>
            <p className="leading-relaxed mb-4 text-slate-400 text-xs">
              {lang === "bn" 
                ? "আমাদের মিশন হলো সর্বোচ্চ তাজা ও বিষমুক্ত সবজি, তাজা মাছ, মাংস ও মুদি পণ্য সরাসরি কৃষকদের মাঠ থেকে তুলে গ্রাহকদের ঘরের দরজায় পৌঁছে দেওয়া।" 
                : "We are committed to delivering 100% formalin-free, organic, and daily harvested food items direct-from-farmers to your kitchen."}
            </p>
            <div className="space-y-1.5 text-xs">
              <p className="font-bold text-white text-xs flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-emerald-400" />
                <span>{lang === "bn" ? "ইমেইল:" : "Email:"}</span>
                <a href="mailto:sarkarmdanik14@gmail.com" className="hover:text-emerald-400 transition underline">sarkarmdanik14@gmail.com</a>
              </p>
              <p className="font-bold text-white text-xs flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span>{lang === "bn" ? "হটলাইন:" : "Hotline:"}</span>
                <a href="tel:+8801722638985" className="hover:text-emerald-400 transition underline">+8801722638985</a>
              </p>
              <div className="font-bold text-white text-xs flex items-start gap-1.5 leading-snug">
                <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span>{lang === "bn" ? "অফিস ঠিকানা:" : "Office Address:"}</span>
                  <span className="block font-medium text-slate-300 mt-0.5">{lang === "bn" ? "চাঁচকৈড় বাজার, গুরুদাশপুর, নাটোর, বাংলাদেশ" : "Chanchkoir Bazar, Gurudaspur, Natore, Bangladesh"}</span>
                  <a 
                    href="https://www.google.com/maps/search/?api=1&query=Chanchkoir+Bazar,+Gurudaspur,+Natore,+Bangladesh" 
                    target="_blank" 
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 bg-emerald-700/50 hover:bg-emerald-600 border border-emerald-600 text-white font-bold text-[9px] px-2 py-0.5 rounded mt-1.5 transition"
                  >
                    <ExternalLink className="w-2.5 h-2.5" />
                    <span>{lang === "bn" ? "গুগল ম্যাপে দেখুন" : "View on Google Maps"}</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Cleared Area: Leadership Section */}
          <div className="md:col-span-6 lg:col-span-7 bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-inner">
            <div className="flex items-center gap-2 mb-3.5 pb-2 border-b border-slate-700/60">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                {lang === "bn" ? "বোর্ড অফ ডিরেক্টর্স ও নেতৃত্ব" : "Board of Directors & Leadership"}
              </h3>
            </div>

            {(() => {
              const allMembers = [
                {
                  id: "chairman",
                  roleEn: "CHAIRMAN",
                  roleBn: "চেয়ারম্যান",
                  nameEn: leadership.chairman?.nameEn || "MST HOSNE ARA BEGUM",
                  nameBn: leadership.chairman?.nameBn || "এমএসটি হোসনে আরা বেগম",
                  image: leadership.chairman?.image || chairmanImg,
                  titleEn: "Chairman, Kacha Bazar",
                  titleBn: "চেয়ারম্যান, কাচা বাজার",
                  badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
                  borderColor: "border-amber-500/80",
                  iconBg: "bg-amber-600"
                },
                {
                  id: "viceChairman",
                  roleEn: "VICE CHAIRMAN",
                  roleBn: "ভাইস চেয়ারম্যান",
                  nameEn: leadership.viceChairman?.nameEn || "MD ABU HANIF SARKAR",
                  nameBn: leadership.viceChairman?.nameBn || "মোঃ আবু হানিফ সরকার",
                  image: leadership.viceChairman?.image || viceChairmanImg,
                  titleEn: "Vice Chairman, Kacha Bazar",
                  titleBn: "ভাইস চেয়ারম্যান, কাচা বাজার",
                  badgeColor: "bg-sky-500/10 text-sky-400 border-sky-500/20",
                  borderColor: "border-sky-500/80",
                  iconBg: "bg-sky-600"
                },
                {
                  id: "founder",
                  roleEn: "FOUNDER",
                  roleBn: "প্রতিষ্ঠাতা",
                  nameEn: leadership.founder?.nameEn || "MD ANIK SARKAR",
                  nameBn: leadership.founder?.nameBn || "মোঃ অনিক সরকার",
                  image: leadership.founder?.image || founderImg,
                  titleEn: "Founder & Creator",
                  titleBn: "প্রতিষ্ঠাতা ও উদ্ভাবক",
                  badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                  borderColor: "border-emerald-500/90",
                  iconBg: "bg-emerald-600"
                },
                ...(leadership.additionalMembers || []).map((m: any, idx: number) => ({
                  id: m.id || `custom_${idx}`,
                  roleEn: (m.roleEn || "MEMBER").toUpperCase(),
                  roleBn: m.roleBn || "সদস্য",
                  nameEn: (m.nameEn || "").toUpperCase(),
                  nameBn: m.nameBn || "",
                  image: m.image || chairmanImg,
                  titleEn: m.titleEn || `${m.roleEn || "Leadership"}, Kacha Bazar`,
                  titleBn: m.titleBn || `${m.roleBn || "নেতৃত্ব"}, কাচা বাজার`,
                  badgeColor: m.badgeColor || "bg-purple-500/10 text-purple-400 border-purple-500/20",
                  borderColor: m.borderColor || "border-purple-500/80",
                  iconBg: m.iconBg || "bg-purple-600"
                }))
              ];

              return (
                <div className={`grid grid-cols-3 ${allMembers.length <= 3 ? "sm:grid-cols-3" : "sm:grid-cols-3 md:grid-cols-4"} gap-1.5 sm:gap-3`}>
                  {allMembers.map((member) => (
                    <div key={member.id} className="bg-slate-900/70 border border-slate-700/60 hover:border-emerald-500/50 transition-all duration-200 rounded-xl p-1.5 sm:p-3 text-center flex flex-col items-center justify-between min-w-0">
                      <div className="relative mb-1 sm:mb-2">
                        <img 
                          src={member.image} 
                          alt={`${member.nameEn} - ${member.roleEn}`} 
                          className={`w-11 h-11 sm:w-20 sm:h-20 rounded-full object-cover border-2 ${member.borderColor} shadow-md`}
                          referrerPolicy="no-referrer"
                        />
                        <span className={`absolute bottom-0 right-0 ${member.iconBg} text-white p-0.5 sm:p-1 rounded-full border border-slate-900 shadow-sm`}>
                          <User className="w-1.5 sm:w-2.5 h-1.5 sm:h-2.5" />
                        </span>
                      </div>
                      <span className={`text-[7.5px] sm:text-[9px] font-bold uppercase tracking-wider px-1 sm:px-2 py-0.5 rounded-full border mb-0.5 sm:mb-1 max-w-full ${member.badgeColor}`}>
                        {lang === "bn" ? member.roleBn : member.roleEn}
                      </span>
                      <h4 className="text-[9.5px] sm:text-xs font-black text-white leading-tight uppercase">
                        {lang === "bn" ? member.nameBn : member.nameEn}
                      </h4>
                      <p className="text-[8px] sm:text-[10px] text-slate-400 mt-0.5 leading-tight">{lang === "bn" ? member.titleBn : member.titleEn}</p>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

        </div>

        <div className="max-w-7xl mx-auto px-4 pt-6 border-t border-slate-800 text-center text-xs text-slate-500 flex flex-col md:flex-row justify-between items-center gap-4">
          <p>© {new Date().getFullYear()} {lang === "bn" ? "কাচা বাজার লিমিটেড। সর্বস্বত্ব সংরক্ষিত।" : "Kacha Bazar Ltd. All rights reserved."}</p>
          <div className="flex items-center space-x-3 text-xs text-slate-400">
            <a 
              href="?panel=seller" 
              onClick={(e) => {
                e.preventDefault();
                setForcedPortalRole("seller");
                setShowPortalModal(true);
                window.history.pushState({}, "", "?panel=seller");
              }}
              className="hover:text-emerald-400 transition cursor-pointer"
            >
              {lang === "bn" ? "বিক্রেতা পোর্টাল" : "Seller Portal"}
            </a>
            <span>•</span>
            <a 
              href="?panel=rider" 
              onClick={(e) => {
                e.preventDefault();
                setForcedPortalRole("rider");
                setShowPortalModal(true);
                window.history.pushState({}, "", "?panel=rider");
              }}
              className="hover:text-emerald-400 transition cursor-pointer"
            >
              {lang === "bn" ? "রাইডার পোর্টাল" : "Rider Portal"}
            </a>
            <span>•</span>
            <a 
              href="?panel=admin" 
              onClick={(e) => {
                e.preventDefault();
                setForcedPortalRole("admin");
                setShowPortalModal(true);
                window.history.pushState({}, "", "?panel=admin");
              }}
              className="hover:text-emerald-400 transition cursor-pointer"
            >
              {lang === "bn" ? "এডমিন পোর্টাল" : "Admin Portal"}
            </a>
          </div>
          <p>{lang === "bn" ? `নেতৃত্বে: চেয়ারম্যান (${leadership.chairman?.nameBn || "এমএসটি হোসনে আরা বেগম"}), ভাইস চেয়ারম্যান (${leadership.viceChairman?.nameBn || "মোঃ আবু হানিফ সরকার"}) এবং প্রতিষ্ঠাতা (${leadership.founder?.nameBn || "মোঃ অনিক সরকার"})` : `Led by ${leadership.chairman?.nameEn || "MST HOSNE ARA BEGUM"} (Chairman), ${leadership.viceChairman?.nameEn || "MD ABU HANIF SARKAR"} (Vice Chairman) & ${leadership.founder?.nameEn || "MD ANIK SARKAR"} (Founder)`}</p>
        </div>
      </footer>

      {/* ================= CONTINUE SHOPPING MOBILE FLOAT CONTROLS ================= */}
      {cart.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-40 bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-2xl shadow-xl border border-slate-800 flex items-center justify-between transition-all duration-300 md:hidden">
          <div className="flex items-center space-x-3">
            <span className="bg-emerald-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center animate-bounce">
              {fmtNum(cart.reduce((s, i) => s + i.quantity, 0))}
            </span>
            <div>
              <p className="text-[10px] text-slate-400 uppercase leading-none">{lang === "bn" ? "মোট পেমেন্ট" : "Total Payment"}</p>
              <p className="text-sm font-black text-emerald-400 mt-0.5 leading-none">৳{fmtNum(subtotal)}</p>
            </div>
          </div>
          <button 
            onClick={() => setShowCart(true)}
            className="bg-emerald-500 hover:bg-emerald-600 font-bold text-xs px-4 py-2 rounded-lg cursor-pointer transition flex items-center space-x-1"
          >
            <span>{lang === "bn" ? "চেকআউট" : "Checkout"}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ================= VOICE SEARCH SIMULATION MODAL ================= */}
      {voiceSearching && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl border border-emerald-50 animate-in fade-in zoom-in duration-200">
            <Volume2 className="w-12 h-12 text-emerald-600 mx-auto animate-ping" />
            <h3 className="text-lg font-bold text-slate-800 mt-4">
              {lang === "bn" ? "আমরা শুনছি..." : "Listening closely..."}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {lang === "bn" ? "বলুন 'ইলিশ মাছ' অথবা 'তাজা মিষ্টি আম'" : "Say 'Hilsha Fish' or 'Sweet Mango' now"}
            </p>
            <div className="flex justify-center space-x-1 mt-6">
              {[...Array(5)].map((_, i) => (
                <div key={i} className={`w-1.5 bg-emerald-500 rounded-full animate-pulse`} style={{ height: `${20 + Math.random() * 30}px`, animationDelay: `${i * 150}ms` }}></div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= CART DRAWER SHEET ================= */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex justify-end">
          
          {/* Backing */}
          <div onClick={() => setShowCart(false)} className="flex-1 cursor-pointer"></div>
          
          {/* Drawer Panel */}
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col p-4 sm:p-6 animate-in slide-in-from-right duration-300">
            
            {/* Drawer Header */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center space-x-2">
                <ShoppingCart className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-800">{lang === "bn" ? "আমার শপিং কার্ট" : "My Shopping Cart"}</h3>
              </div>
              <button 
                onClick={() => setShowCart(false)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto my-4 space-y-3 pr-1 min-h-0">
              {cart.length === 0 ? (
                <div className="text-center py-10">
                  <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-500">{lang === "bn" ? "কার্টটি সম্পূর্ণ খালি!" : "Your cart is completely empty!"}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{lang === "bn" ? "পছন্দসই তাজা পণ্যগুলো কার্টে যুক্ত করুন" : "Browse fresh goods to add them"}</p>
                </div>
              ) : (
                  cart.map((item, idx) => {
                    const availableOptions = getProductWeightOptions(item.product);
                    const currentOpt = item.selectedOption || availableOptions.find(o => o.price === item.product.price) || availableOptions[0];
                    const itemPrice = currentOpt ? currentOpt.price : item.product.price;
                    const optStock = typeof currentOpt?.stock === "number" ? currentOpt.stock : (typeof item.product.stock === "number" ? item.product.stock : 50);
                    const isItemOutOfStock = optStock <= 0 || item.product.isAvailable === false || (typeof item.product.stock === "number" && item.product.stock <= 0);
                    const isInsufficientStock = isItemOutOfStock || (item.quantity > optStock);
                    const uniqueKey = `${item.product.id}_${currentOpt?.value || 'def'}_${currentOpt?.unit || 'def'}_${idx}`;

                    return (
                      <div key={uniqueKey} className="flex gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100 relative group">
                        <img src={item.product.image} className="w-12 h-12 object-cover rounded-lg shrink-0 bg-white" onError={handleProductImgError} />
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <h4 className="text-xs font-bold text-slate-800 truncate pr-4">
                              {lang === "bn" ? item.product.nameBn : item.product.nameEn}
                            </h4>
                            <button 
                              onClick={() => removeFromCart(item.product.id, item.selectedOption)}
                              className="text-slate-400 hover:text-red-500 transition shrink-0 ml-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Weight / Unit option selector */}
                          {availableOptions.length > 1 ? (
                            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] text-slate-500 font-bold shrink-0">
                                {lang === "bn" ? "ওজন/পরিমাণ:" : "Weight/Unit:"}
                              </span>
                              <select
                                value={currentOpt ? `${currentOpt.value}::${currentOpt.unit}` : ""}
                                onChange={(e) => {
                                  const [valStr, unitStr] = e.target.value.split("::");
                                  const selected = availableOptions.find(o => String(o.value) === valStr && o.unit === unitStr);
                                  if (selected) {
                                    updateCartItemOption(idx, selected);
                                  }
                                }}
                                className="bg-white border border-slate-200 text-slate-800 text-[10.5px] font-bold rounded-lg px-2 py-0.5 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 cursor-pointer shadow-2xs max-w-[150px] truncate"
                              >
                                {availableOptions.map((opt, oIdx) => (
                                  <option key={oIdx} value={`${opt.value}::${opt.unit}`}>
                                    {getOptionLabel(opt, lang, fmtNum)}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ) : (
                            <p className="text-[9px] text-slate-400">
                              {currentOpt 
                                ? (lang === "bn" ? `প্যাক: ${currentOpt.value} ${currentOpt.unit}` : `Pack: ${currentOpt.value} ${currentOpt.unit}`) 
                                : (lang === "bn" ? `ইউনিট: ${item.product.unitBn}` : `Unit: ${item.product.unitEn}`)}
                            </p>
                          )}

                          {/* Stock error alert */}
                          {isInsufficientStock && (
                            <div className="mt-1 text-[10px] font-extrabold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                              <span>⚠️</span>
                              <span>{lang === "bn" ? "পর্যাপ্ত স্টক নেই (Insufficient Stock)" : "Insufficient Stock"}</span>
                            </div>
                          )}

                          <p className="text-xs font-black text-emerald-600 mt-1">৳{fmtNum(itemPrice)}</p>
                          
                          <div className="flex justify-between items-center mt-2">
                            {/* Quantity selectors */}
                            <div className="flex items-center space-x-2 bg-white rounded-lg border border-slate-200 px-1.5 py-0.5">
                              <button 
                                onClick={() => updateCartQuantity(item.product.id, -1, item.selectedOption)}
                                className="p-0.5 text-slate-500 hover:text-emerald-600 transition cursor-pointer"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-xs font-mono font-bold text-slate-800">{fmtNum(item.quantity)}</span>
                              <button 
                                onClick={() => updateCartQuantity(item.product.id, 1, item.selectedOption)}
                                className="p-0.5 text-slate-500 hover:text-emerald-600 transition cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                            <span className="text-xs font-black text-slate-700">৳{fmtNum(itemPrice * item.quantity)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

            {/* Cart Footer Price Block */}
            {cart.length > 0 && (
              <div className="border-t border-slate-100 pt-4 mt-4 bg-white z-10">
                
                {/* Coupon Code interface */}
                <div className="flex gap-1.5 mb-3">
                  <input
                    type="text"
                    placeholder={lang === "bn" ? "কুপন কোড (যেমন KACHA10)" : "Coupon Code (e.g. KACHA10)"}
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 text-xs rounded-lg px-2.5 py-2 outline-none focus:bg-white focus:ring-1 focus:ring-emerald-500"
                  />
                  <button 
                    onClick={handleApplyCoupon}
                    className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer transition"
                  >
                    {lang === "bn" ? "প্রয়োগ" : "Apply"}
                  </button>
                </div>

                {appliedCoupon && (
                  <div className="bg-emerald-50 border border-emerald-100 p-2 rounded-lg flex justify-between items-center mb-3">
                    <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider">
                      ✓ কুপন সক্রিয়: {appliedCoupon.code}
                    </span>
                    <button 
                      onClick={() => setAppliedCoupon(null)}
                      className="text-slate-400 hover:text-slate-800 text-xs font-bold"
                    >
                      ✕
                    </button>
                  </div>
                )}

                <div className="space-y-1 text-xs mb-4">
                  <div className="flex justify-between">
                    <span className="text-slate-400">{lang === "bn" ? "সাবটোটাল" : "Subtotal"}</span>
                    <span className="font-bold text-slate-700">৳{fmtNum(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">{lang === "bn" ? "ডেলিভারি ফি" : "Delivery Fee"}</span>
                    <span className="font-bold text-slate-700">
                      {deliveryFee === 0 ? (
                        <span className="text-emerald-600 uppercase font-black text-[10px]">FREE</span>
                      ) : (
                        `৳${fmtNum(deliveryFee)}`
                      )}
                    </span>
                  </div>
                  {appliedCoupon && appliedCoupon.code !== "FREESHIP" && (
                    <div className="flex justify-between text-rose-500 font-bold">
                      <span>{lang === "bn" ? "কুপন ডিসকাউন্ট" : "Coupon Discount"}</span>
                      <span>-৳{fmtNum(discountAmt)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-black text-slate-800 pt-1.5 border-t border-slate-50 mt-1.5">
                    <span>{lang === "bn" ? "সর্বমোট পরিশোধ" : "Grand Total"}</span>
                    <span className="text-emerald-600">৳{fmtNum(grandTotal)}</span>
                  </div>
                </div>

                {hasInsufficientCartStock && (
                  <div className="mb-3 p-2 bg-rose-50 border border-rose-200 rounded-xl text-center">
                    <p className="text-xs font-bold text-rose-600">
                      ⚠️ {lang === "bn" ? "পর্যাপ্ত স্টক নেই (Insufficient Stock)" : "Insufficient Stock"}
                    </p>
                    <p className="text-[10px] text-rose-500 mt-0.5">
                      {lang === "bn" ? "কার্টের পণ্যের সঠিক ওজন বা পরিমাণ সিলেক্ট করুন।" : "Please adjust weight or quantity to proceed to checkout."}
                    </p>
                  </div>
                )}

                <button 
                  onClick={executeCheckout}
                  disabled={checkoutStatus === "loading" || hasInsufficientCartStock}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition shadow shadow-emerald-100 flex items-center justify-center space-x-2 cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed"
                >
                  {checkoutStatus === "loading" ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>{lang === "bn" ? "অর্ডার সম্পন্ন করুন (চেকআউট)" : "Place Order & Checkout Now"}</span>
                      <ArrowRight className="w-4.5 h-4.5" />
                    </>
                  )}
                </button>

                {/* Call to Order Button inside Cart Drawer */}
                <a 
                  href="tel:+8801722638985"
                  className="mt-2.5 w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-xl transition shadow flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <Phone className="w-4 h-4 animate-pulse shrink-0" />
                  <span>{lang === "bn" ? "কল করে অর্ডার করুন (+৮৮০১৭২২-৬৩৮৯৮৫)" : "Call to Order (+8801722638985)"}</span>
                </a>

              </div>
            )}

          </div>
        </div>
      )}

      {/* ================= WISHLIST DRAWER SHEET ================= */}
      {showWishlist && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs">
          <div onClick={() => setShowWishlist(false)} className="flex-1 cursor-pointer"></div>
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col p-4 sm:p-6 animate-in slide-in-from-right duration-300">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2 text-rose-500">
                <Heart className="w-5 h-5 fill-rose-500" />
                <h3 className="text-base font-bold text-slate-800">{lang === "bn" ? "আমার সংরক্ষিত তালিকা" : "My Saved Wishlist"}</h3>
              </div>
              <button onClick={() => setShowWishlist(false)} className="p-1 rounded-full hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 overflow-y-auto max-h-[80vh] pr-1">
              {wishlist.length === 0 ? (
                <div className="text-center py-12">
                  <Heart className="w-12 h-12 text-slate-200 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-500">{lang === "bn" ? "উইশলিস্ট খালি!" : "Wishlist is empty!"}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{lang === "bn" ? "পণ্য দেখার সময় হার্ট আইকনে ট্যাপ করুন" : "Tap the heart on any product"}</p>
                </div>
              ) : (
                wishlist.map((id) => {
                  const product = products.find(p => p.id === id);
                  if (!product) return null;
                  return (
                    <div key={product.id} className="flex gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100 relative">
                      <img src={product.image} className="w-12 h-12 object-cover rounded-lg shrink-0" onError={handleProductImgError} />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-slate-800 truncate">{lang === "bn" ? product.nameBn : product.nameEn}</h4>
                        <p className="text-[9px] text-slate-400">{lang === "bn" ? `ইউনিট: ${product.unitBn}` : `Unit: ${product.unitEn}`}</p>
                        <p className="text-xs font-black text-emerald-600 mt-1">৳{fmtNum(product.price)}</p>
                        
                        <div className="flex gap-2 mt-2.5">
                          <button 
                            onClick={() => {
                              addToCart(product);
                              toggleWishlist(product.id);
                            }}
                            className="bg-emerald-600 text-white text-[10px] font-bold px-3 py-1 rounded-lg hover:bg-emerald-700 transition"
                          >
                            {lang === "bn" ? "+ কার্ট" : "Add Cart"}
                          </button>
                          <button 
                            onClick={() => toggleWishlist(product.id)}
                            className="border border-slate-200 text-slate-400 hover:text-rose-500 hover:border-rose-100 text-[10px] font-bold px-2.5 py-1 rounded-lg transition"
                          >
                            {lang === "bn" ? "সরান" : "Remove"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= QUICK VIEW DETAIL MODAL ================= */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 shadow-2xl relative animate-in fade-in zoom-in duration-250">
            
            <button 
              onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition cursor-pointer z-10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              
              {/* Product Image Panel */}
              <div className="relative">
                <img src={selectedProduct.image} className="w-full h-56 sm:h-72 object-cover rounded-xl shadow-inner bg-slate-50" onError={handleProductImgError} />
                {selectedProduct.discount && (
                  <span className="absolute top-3 left-3 bg-rose-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow">
                    {fmtNum(selectedProduct.discount)}% {lang === "bn" ? "ছাড়" : "OFF"}
                  </span>
                )}
              </div>

              {/* Product Detail Panel */}
              <div className="flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{selectedProduct.brand}</span>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-800 leading-tight">
                    {lang === "bn" ? selectedProduct.nameBn : selectedProduct.nameEn}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">{lang === "bn" ? selectedProduct.nameEn : selectedProduct.nameBn}</p>
                  
                  {/* Rating Stars */}
                  <div className="flex items-center space-x-1 mt-2">
                    <div className="flex text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-3.5 h-3.5 ${i < Math.floor(selectedProduct.rating) ? "fill-amber-400" : ""}`} />
                      ))}
                    </div>
                    <span className="text-xs font-bold text-slate-500">{fmtNum(selectedProduct.rating)} ({fmtNum(selectedProduct.reviewCount || 10)} {lang === "bn" ? "রিভিউ" : "reviews"})</span>
                  </div>

                  <p className="text-xs text-slate-500 font-bold mt-2">
                    {lang === "bn" ? `পরিমাপ: ${selectedProduct.unitBn}` : `Measurement: ${selectedProduct.unitEn}`}
                  </p>

                  {selectedProduct.options && selectedProduct.options.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-xs font-bold text-slate-700 mb-2">
                        {lang === "bn" ? "ওজন বা পরিমাণ সিলেক্ট করুন:" : "Select Weight or Quantity:"}
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedProduct.options.map((opt, idx) => {
                          const isSelected = selectedProductOption && 
                            selectedProductOption.value === opt.value && 
                            selectedProductOption.unit === opt.unit;
                          return (
                            <button
                              key={idx}
                              onClick={() => setSelectedProductOption(opt)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all duration-200 cursor-pointer ${
                                isSelected
                                  ? "bg-emerald-600 border-emerald-600 text-white shadow-md scale-105"
                                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                              }`}
                            >
                              {opt.value}{opt.unit} - ৳{opt.price}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="mt-4 p-3 bg-slate-50 rounded-xl">
                    <h4 className="text-xs font-bold text-slate-700 mb-1">{lang === "bn" ? "পণ্য বিবরণী" : "Product Details"}</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {lang === "bn" ? selectedProduct.descriptionBn : selectedProduct.descriptionEn}
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-3 border-t border-slate-100">
                  <div className="flex items-baseline space-x-2 mb-4">
                    <span className="text-2xl font-black text-emerald-600">
                      ৳{fmtNum(selectedProductOption ? selectedProductOption.price : selectedProduct.price)}
                    </span>
                    {selectedProduct.originalPrice && !selectedProductOption && (
                      <span className="text-sm text-slate-400 line-through">৳{fmtNum(selectedProduct.originalPrice)}</span>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button 
                      onClick={() => {
                        addToCart(selectedProduct, 1, true, selectedProductOption || undefined);
                      }}
                      className={`flex-1 py-2.5 font-bold text-xs rounded-xl transition shadow flex items-center justify-center space-x-1 cursor-pointer ${
                        cart.some(item => 
                          item.product.id === selectedProduct.id && 
                          ((!item.selectedOption && !selectedProductOption) || 
                           (item.selectedOption && selectedProductOption && item.selectedOption.value === selectedProductOption.value && item.selectedOption.unit === selectedProductOption.unit))
                        ) 
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-600 hover:bg-emerald-100" 
                          : "bg-emerald-600 text-white hover:bg-emerald-700"
                      }`}
                    >
                      {cart.some(item => 
                        item.product.id === selectedProduct.id && 
                        ((!item.selectedOption && !selectedProductOption) || 
                         (item.selectedOption && selectedProductOption && item.selectedOption.value === selectedProductOption.value && item.selectedOption.unit === selectedProductOption.unit))
                      ) ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>{lang === "bn" ? "✓ কার্টে যোগ হয়েছে" : "✓ Added to Cart"}</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          <span>{lang === "bn" ? "কার্ট করুন" : "Add to Cart"}</span>
                        </>
                      )}
                    </button>
                    <button 
                      onClick={() => {
                        handleBuyNow(selectedProduct, selectedProductOption || undefined);
                        setSelectedProduct(null);
                      }}
                      className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                    >
                      {lang === "bn" ? "কিনুন এখনই" : "Buy Now"}
                    </button>
                  </div>

                  {/* Call to Order Button inside Product Details Quick View Modal */}
                  <a 
                    href="tel:+8801722638985"
                    className="mt-3 w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-xl transition shadow flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <Phone className="w-4 h-4 animate-pulse shrink-0" />
                    <span>{lang === "bn" ? "সরাসরি ফোন করে অর্ডার দিন: ০১৭২২-৬৩৮৯৮৫" : "Call to Order Now: +8801722638985"}</span>
                  </a>
                </div>

              </div>

            </div>

            {/* Reviews and Ratings Section */}
            <div className="mt-8 pt-6 border-t border-slate-100">
              <h4 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-1.5">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span>{lang === "bn" ? "ক্রেতাদের রিভিউ ও রেটিং" : "Customer Reviews & Ratings"}</span>
              </h4>

              {/* Grid with 2 columns: Column 1 is Reviews List, Column 2 is Add Review Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Reviews List */}
                <div className="space-y-4 max-h-[320px] overflow-y-auto pr-2">
                  {reviews.filter(r => r.productId === selectedProduct.id.toString()).length === 0 ? (
                    <div className="text-center py-8 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                      <p className="text-slate-400 text-xs">
                        {lang === "bn" ? "এই পণ্যে এখনও কোনো রিভিউ দেওয়া হয়নি।" : "No reviews for this product yet."}
                      </p>
                      <p className="text-emerald-600 text-[10px] font-bold mt-1">
                        {lang === "bn" ? "প্রথম রিভিউ দিয়ে আপনার মতামত জানান!" : "Be the first to share your experience!"}
                      </p>
                    </div>
                  ) : (
                    reviews.filter(r => r.productId === selectedProduct.id.toString()).map((rev) => {
                      const isOwnReview = loggedInUser && rev.userId === loggedInUser.uid;
                      const isAdmin = userRole === "admin" || userRole === "founder";
                      return (
                        <div key={rev.id} className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 relative group">
                          <div className="flex justify-between items-start">
                            <div>
                              <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold shrink-0 uppercase">
                                  {rev.userName.charAt(0)}
                                </span>
                                <span>{rev.userName}</span>
                              </h5>
                              <div className="flex text-amber-400 mt-1">
                                {[...Array(5)].map((_, idx) => (
                                  <Star key={idx} className={`w-3 h-3 ${idx < rev.rating ? "fill-amber-400" : ""}`} />
                                ))}
                              </div>
                            </div>
                            <span className="text-[10px] text-slate-400">{rev.date}</span>
                          </div>
                          
                          <p className="text-xs text-slate-600 mt-2 leading-relaxed bg-white p-2 rounded-lg border border-slate-100/50">
                            {lang === "bn" ? rev.commentBn : rev.commentEn}
                          </p>

                          {/* Delete Button for Admin or Creator */}
                          {(isAdmin || isOwnReview) && (
                            <button
                              onClick={async () => {
                                if (confirm(lang === "bn" ? "আপনি কি নিশ্চিতভাবে এই রিভিউটি মুছে ফেলতে চান?" : "Are you sure you want to delete this review?")) {
                                  try {
                                    await deleteDoc(doc(db, "reviews", rev.id));
                                    triggerToast("রিভিউ মুছে ফেলা হয়েছে।", "Review deleted successfully.");
                                  } catch (err) {
                                    console.error("Error deleting review:", err);
                                    triggerToast("রিভিউ মুছতে ব্যর্থ হয়েছে।", "Failed to delete review.");
                                  }
                                }
                              }}
                              className="absolute top-3.5 right-3.5 text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition duration-150 p-1 rounded hover:bg-rose-50 cursor-pointer"
                              title={lang === "bn" ? "রিভিউ মুছে ফেলুন" : "Delete Review"}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Add Review Form */}
                <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 flex flex-col justify-between">
                  <h5 className="text-xs font-bold text-slate-800 mb-3 uppercase tracking-wider">
                    {lang === "bn" ? "আপনার রিভিউ লিখুন" : "Write Your Review"}
                  </h5>
                  
                  <form 
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!newReview.name || !newReview.comment) {
                        triggerToast("অনুগ্রহ করে সব তথ্য প্রদান করুন", "Please provide all required fields");
                        return;
                      }
                      try {
                        const reviewId = `rev-${Date.now()}`;
                        const reviewDocData = {
                          productId: selectedProduct.id.toString(),
                          userName: newReview.name,
                          rating: Number(newReview.rating),
                          commentBn: newReview.comment,
                          commentEn: newReview.comment,
                          userId: loggedInUser ? loggedInUser.uid : "guest",
                          createdAt: serverTimestamp()
                        };
                        await setDoc(doc(db, "reviews", reviewId), reviewDocData);
                        setNewReview({ name: loggedInUser?.displayName || loggedInUser?.email?.split("@")[0] || "", comment: "", rating: 5 });
                        triggerToast("রিভিউ প্রকাশের জন্য ধন্যবাদ!", "Thank you for submitting a review!");
                      } catch (err) {
                        console.error("Error submitting review:", err);
                        triggerToast("রিভিউ সাবমিট করতে ব্যর্থ হয়েছে।", "Failed to submit review.");
                      }
                    }}
                    className="space-y-3"
                  >
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        {lang === "bn" ? "আপনার নাম" : "Your Name"}
                      </label>
                      <input 
                        type="text" 
                        required
                        disabled={!!loggedInUser}
                        value={newReview.name}
                        onChange={(e) => setNewReview(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full bg-white disabled:bg-slate-100 disabled:text-slate-500 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none" 
                        placeholder={lang === "bn" ? "যেমন: আব্দুর রহমান" : "e.g. John Doe"}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        {lang === "bn" ? "রেটিং স্কোর" : "Rating Score"}
                      </label>
                      <div className="flex items-center space-x-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setNewReview(prev => ({ ...prev, rating: star }))}
                            className="p-0.5 text-amber-400 focus:outline-none cursor-pointer hover:scale-110 transition"
                          >
                            <Star className={`w-5 h-5 ${star <= newReview.rating ? "fill-amber-400" : "text-slate-300"}`} />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        {lang === "bn" ? "রিভিউ মন্তব্য" : "Your Comment"}
                      </label>
                      <textarea 
                        required
                        rows={3}
                        value={newReview.comment}
                        onChange={(e) => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none" 
                        placeholder={lang === "bn" ? "পণ্যটি সম্পর্কে আপনার মতামত লিখুন..." : "Describe your experience with this product..."}
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                    >
                      {lang === "bn" ? "রিভিউ সাবমিট করুন" : "Submit Review"}
                    </button>
                  </form>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

      </div>

      {/* ================= TOAST FLOATING BANNER ================= */}
      {toast && (
        <div className="fixed top-5 right-5 sm:top-6 sm:right-6 z-[2000] bg-slate-900/95 backdrop-blur text-white px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-2 border border-slate-800 text-xs font-bold animate-in fade-in slide-in-from-top duration-200 max-w-sm">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{lang === "bn" ? toast.textBn : toast.textEn}</span>
        </div>
      )}

      {/* ================= CUSTOM PORTAL MODALS ================= */}
      <React.Suspense fallback={<div className="fixed inset-0 bg-slate-50 flex items-center justify-center text-slate-500 font-bold z-50 text-sm">Loading...</div>}>
        <PortalModal 
          isOpen={showPortalModal} 
          onClose={() => {
            setShowPortalModal(false);
            if (forcedPortalRole !== "customer") {
              setForcedPortalRole("customer");
              if (window.location.search.includes("panel") || window.location.hash || window.location.pathname !== "/") {
                window.history.pushState({}, "", window.location.pathname.startsWith("/admin") || window.location.pathname.startsWith("/seller") || window.location.pathname.startsWith("/rider") ? "/" : window.location.pathname);
              }
            }
          }} 
          lang={lang} 
          initialTab={portalInitialTab}
          forcedRole={forcedPortalRole}
        />

        {/* ================= REAL-TIME CUSTOMER LIVE SUPPORT CHAT ================= */}
        <CustomerLiveChat 
          lang={lang} 
          onOpenPortal={() => setShowPortalModal(true)} 
        />
      </React.Suspense>

      {/* ================= ABOUT US MODAL ================= */}
      {showAboutModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative animate-in zoom-in duration-250 flex flex-col max-h-[90vh]">
            <button 
              onClick={() => setShowAboutModal(false)} 
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-3 border-b border-slate-100 pb-3 mb-4 shrink-0">
              {logoImg ? (
                <img 
                  src={logoImg} 
                  alt="Kacha Bazar Logo" 
                  className="w-10 h-10 object-contain rounded-full border border-emerald-100 bg-white"
                  referrerPolicy="no-referrer"
                />
              ) : null}
              <div>
                <h3 className="text-base font-black text-slate-800">
                  {lang === "bn" ? "আমাদের সম্পর্কে" : "About Us"}
                </h3>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                  {lang === "bn" ? "কাচা বাজার — আপনার বিশ্বস্ত প্রতিষ্ঠান" : "Kacha Bazar — Your Trusted Brand"}
                </p>
              </div>
            </div>
            
            <div className="overflow-y-auto pr-1 space-y-4 text-xs text-slate-600 leading-relaxed">
              <p>
                {lang === "bn" 
                  ? "কাচা বাজার একটি সম্পূর্ণ আধুনিক, পরিবেশ-বান্ধব ও শতভাগ নিরাপদ ই-কমার্স প্ল্যাটফর্ম। আমাদের মূল লক্ষ্য হলো গ্রামীণ অঞ্চলের কৃষকদের কঠোর পরিশ্রমের ফসল কোনো মধ্যস্বত্বভোগী ছাড়া সরাসরি শহরের ভোক্তাদের কাছে পৌঁছে দেওয়া। এর মাধ্যমে আমরা যেমন কৃষকদের তাদের উৎপাদিত ফসলের সঠিক মূল্য নিশ্চিত করছি, তেমনি গ্রাহকদের জন্য নিশ্চিত করছি সম্পূর্ণ তাজা ও বিষমুক্ত খাদ্যের সংস্থান।"
                  : "Kacha Bazar is a fully modern, eco-friendly, and 100% safe e-commerce platform. Our primary goal is to deliver the hard-earned harvests of rural farmers directly to urban consumers without any intermediaries. Through this, we ensure fair prices for farmers while guaranteeing 100% fresh, organic, and toxin-free food for our valued customers."}
              </p>
              
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3">
                <h4 className="font-bold text-slate-800 border-b border-slate-200/60 pb-1.5 uppercase tracking-wider text-[10px]">
                  {lang === "bn" ? "ব্যবসায়িক তথ্য" : "Business Information"}
                </h4>
                <div className="space-y-2">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-700 block">{lang === "bn" ? "অফিস কার্যালয়:" : "Office Address:"}</span>
                      <span className="text-slate-500">{lang === "bn" ? "চাঁচকৈড় বাজার, গুরুদাশপুর, নাটোর, বাংলাদেশ" : "Chanchkoir Bazar, Gurudaspur, Natore, Bangladesh"}</span>
                      <div className="mt-1.5">
                        <a 
                          href="https://www.google.com/maps/search/?api=1&query=Chanchkoir+Bazar,+Gurudaspur,+Natore,+Bangladesh" 
                          target="_blank" 
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] px-2.5 py-1 rounded-lg shadow-sm transition"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>{lang === "bn" ? "গুগল ম্যাপে লোকেশন দেখুন" : "View Google Maps Location"}</span>
                        </a>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2.5">
                    <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-bold text-slate-700">{lang === "bn" ? "সাপোর্ট ফোন নম্বর:" : "Support Phone:"} </span>
                      <a href="tel:+8801722638985" className="text-emerald-600 hover:underline font-bold">+8801722638985</a>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2.5">
                    <Mail className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-bold text-slate-700">{lang === "bn" ? "সাপোর্ট ইমেইল:" : "Support Email:"} </span>
                      <a href="mailto:sarkarmdanik14@gmail.com" className="text-emerald-600 hover:underline font-bold">sarkarmdanik14@gmail.com</a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="border-t border-slate-100 pt-3 mt-4 shrink-0 flex justify-end">
              <button 
                onClick={() => setShowAboutModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition cursor-pointer"
              >
                {lang === "bn" ? "বন্ধ করুন" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= CONTACT US MODAL ================= */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative animate-in zoom-in duration-250 flex flex-col max-h-[90vh]">
            <button 
              onClick={() => setShowContactModal(false)} 
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-3 border-b border-slate-100 pb-3 mb-4 shrink-0">
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800">
                  {lang === "bn" ? "যোগাযোগ করুন" : "Contact Us"}
                </h3>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                  {lang === "bn" ? "কাচা বাজার কাস্টমার রিলেশন" : "Kacha Bazar Customer Relations"}
                </p>
              </div>
            </div>
            
            <div className="overflow-y-auto pr-1 space-y-4 text-xs text-slate-600">
              <p className="leading-relaxed">
                {lang === "bn" 
                  ? "আমাদের পণ্য বা সেবা সম্পর্কে জিজ্ঞাসা, পরামর্শ বা মতামত জানাতে নিচের কন্টাক্ট নাম্বারে সরাসরি ফোন করুন অথবা ইমেইল করুন। আমাদের কাস্টমার সার্ভিস টিম চব্বিশ ঘণ্টা আপনার সহায়তায় নিয়োজিত রয়েছে।"
                  : "For any inquiries, feedback, or concerns regarding our products or services, please call or email us directly. Our customer support representatives are available around the clock to assist you."}
              </p>

              {/* Call to Order Premium Banner inside Contact Modal */}
              <a 
                href="tel:+8801722638985"
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-sm rounded-xl transition shadow flex items-center justify-center space-x-2.5 cursor-pointer animate-pulse shrink-0"
              >
                <Phone className="w-5 h-5 animate-bounce shrink-0" />
                <span>{lang === "bn" ? "সরাসরি ফোন করে অর্ডার করতে কল করুন (+৮৮০১৭২২-৬৩৮৯৮৫)" : "Call Directly to Order Now (+8801722638985)"}</span>
              </a>
              
              <div className="bg-emerald-50/20 border border-emerald-100 rounded-xl p-4 space-y-3.5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 bg-white border border-slate-100 rounded-xl shadow-sm flex items-center space-x-3">
                    <Phone className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">{lang === "bn" ? "কল করুন" : "Call Support"}</p>
                      <a href="tel:+8801722638985" className="text-slate-800 font-extrabold hover:text-emerald-600 hover:underline text-xs">+8801722638985</a>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-white border border-slate-100 rounded-xl shadow-sm flex items-center space-x-3">
                    <Mail className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">{lang === "bn" ? "ইমেইল লিখুন" : "Email Us"}</p>
                      <a href="mailto:sarkarmdanik14@gmail.com" className="text-slate-800 font-extrabold hover:text-emerald-600 hover:underline text-xs block truncate">sarkarmdanik14@gmail.com</a>
                    </div>
                  </div>
                </div>
                
                <div className="p-3 bg-white border border-slate-100 rounded-xl shadow-sm flex items-start space-x-3">
                  <MapPin className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-[9px] text-slate-400 font-bold uppercase">{lang === "bn" ? "অফিস ঠিকানা" : "Main Office Address"}</p>
                    <p className="text-slate-800 font-bold text-xs mt-0.5 leading-snug">{lang === "bn" ? "কাচা বাজার" : "Kacha Bazar"}</p>
                    <p className="text-slate-650 text-[11px] mt-0.5 leading-snug">{lang === "bn" ? "চাঁচকৈড় বাজার, গুরুদাশপুর, নাটোর, বাংলাদেশ" : "Chanchkoir Bazar, Gurudaspur, Natore, Bangladesh"}</p>
                    
                    <div className="mt-2.5">
                      <a 
                        href="https://www.google.com/maps/search/?api=1&query=Chanchkoir+Bazar,+Gurudaspur,+Natore,+Bangladesh" 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] px-3 py-1 rounded-lg shadow-sm transition"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>{lang === "bn" ? "গুগল ম্যাপে দেখুন" : "View Google Maps Location"}</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="border-t border-slate-100 pt-3 mt-4 shrink-0 flex justify-end">
              <button 
                onClick={() => setShowContactModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition cursor-pointer"
              >
                {lang === "bn" ? "বন্ধ করুন" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= HELP & SUPPORT MODAL ================= */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative animate-in zoom-in duration-250 flex flex-col max-h-[90vh]">
            <button 
              onClick={() => setShowHelpModal(false)} 
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-3 border-b border-slate-100 pb-3 mb-4 shrink-0">
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Info className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800">
                  {lang === "bn" ? "সাহায্য ও সহযোগিতা" : "Help & Support"}
                </h3>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                  {lang === "bn" ? "কাচা বাজার কাস্টমার কেয়ার" : "Kacha Bazar Support Desk"}
                </p>
              </div>
            </div>
            
            <div className="overflow-y-auto pr-1 space-y-4 text-xs text-slate-600 leading-relaxed">
              <div className="space-y-2">
                <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide">
                  {lang === "bn" ? "কাস্টমার সাপোর্ট ডেস্ক" : "Customer Support Desk"}
                </h4>
                <p>
                  {lang === "bn" 
                    ? "কাচা বাজার-এর সম্মানিত গ্রাহকদের যেকোনো সেবা এবং অর্ডার ডেলিভারি সংক্রান্ত সমস্যায় আমরা সর্বদা পাশে আছি। আপনার সমস্যার দ্রুততম সমাধান পেতে সরাসরি হটলাইনে যোগাযোগ করুন।"
                    : "We are always here to assist our valued customers with any service or order delivery concerns. Reach out to us via hotline for instant assistance."}
                </p>
              </div>
              
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3.5">
                <div className="flex items-start gap-3">
                  <Phone className="w-4.5 h-4.5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-700 block">{lang === "bn" ? "সাপোর্ট ফোন নম্বর:" : "Support Phone:"}</span>
                    <a href="tel:+8801722638985" className="text-emerald-600 hover:underline font-extrabold text-sm block mt-0.5">+8801722638985</a>
                    <span className="text-[10px] text-slate-400 block mt-0.5">{lang === "bn" ? "✦ ২৪ ঘন্টা সচল" : "✦ 24/7 Available"}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 border-t border-slate-200/50 pt-3">
                  <Mail className="w-4.5 h-4.5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-700 block">{lang === "bn" ? "সাপোর্ট ইমেইল:" : "Support Email:"}</span>
                    <a href="mailto:sarkarmdanik14@gmail.com" className="text-emerald-600 hover:underline font-extrabold text-sm block mt-0.5">sarkarmdanik14@gmail.com</a>
                    <span className="text-[10px] text-slate-400 block mt-0.5">{lang === "bn" ? "✦ যেকোনো অভিযোগ বা মতামত দ্রুত ইমেইল করুন" : "✦ Send your queries or complains anytime"}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 border-t border-slate-200/50 pt-3">
                  <MapPin className="w-4.5 h-4.5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-bold text-slate-700 block">{lang === "bn" ? "অফিস কার্যালয়:" : "Office Address:"}</span>
                    <span className="text-slate-650 block mt-0.5 font-medium">{lang === "bn" ? "চাঁচকৈড় বাজার, গুরুদাশপুর, নাটোর, বাংলাদেশ" : "Chanchkoir Bazar, Gurudaspur, Natore, Bangladesh"}</span>
                    <div className="mt-2">
                      <a 
                        href="https://www.google.com/maps/search/?api=1&query=Chanchkoir+Bazar,+Gurudaspur,+Natore,+Bangladesh" 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] px-2.5 py-1 rounded-lg shadow-sm transition"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>{lang === "bn" ? "গুগল ম্যাপ লোকেশন" : "Google Maps Location"}</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="border-t border-slate-100 pt-3 mt-4 shrink-0 flex justify-end">
              <button 
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition cursor-pointer"
              >
                {lang === "bn" ? "বন্ধ করুন" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
