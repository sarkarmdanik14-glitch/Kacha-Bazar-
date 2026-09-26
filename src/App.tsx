import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { 
  LayoutGrid, Salad, Apple, Beef, Egg, Wheat, Flame, Cookie, 
  Droplet, Heart, Baby, Candy, Snowflake, Coffee, Dog, Star, Search, 
  Mic, ShoppingCart, Truck, ShieldCheck, Banknote, RefreshCw, Sparkles, 
  ChevronLeft, ChevronRight, Share2, Eye, Plus, Minus, Trash2, X, 
  MapPin, Bell, User, Check, Send, Tag, Gift, Award, Smartphone, 
  QrCode, ArrowRight, ArrowLeft, ThumbsUp, Info, ChevronDown, ChevronUp, CheckCircle, Percent, Volume2,
  Phone, PhoneCall, Mail, ExternalLink, Navigation, Locate, Copy, Zap, Printer, Download, FileText, Loader2, Wifi, WifiOff, MessageSquare, Globe, Home, Utensils, Pill, Repeat
} from "lucide-react";
import BuySellMarketplace from "./components/buysell/BuySellMarketplace";
import OrderMemoModal from "./components/portal/OrderMemoModal";
import { downloadMemoPDF } from "./lib/pdfUtils";
import { printOrderMemo } from "./lib/printUtils";
import { Product, Category, Subcategory, CartItem, Review, ProductOption } from "./types";
import { CATEGORIES, ALL_PRODUCTS, RESTAURANT_MENU_SECTIONS, GROCERY_SECTIONS, isRiceOrGrainProduct, isDalOrPulseProduct, getResolvedGrocerySubcategory } from "./data";
import { resolveProductDisplayUnit } from "./lib/productWeightUtils";
import { subscribeToAllSubcategories } from "./lib/subcategoryService";

import PortalModal from "./components/portal/PortalModal";
import CheckoutModal from "./components/CheckoutModal";
import CustomerLiveChat from "./components/CustomerLiveChat";
import CustomerVoiceCallModal from "./components/CustomerVoiceCallModal";
import { seedDatabase, db, collection, onSnapshot, auth, onAuthStateChanged, doc, getDoc, setDoc, query, where, limit, orderBy, or, addDoc, deleteDoc, serverTimestamp } from "./lib/firebase";
import { calculateDeliveryFeeFromSettings } from "./lib/delivery";
import { visitorTracker } from "./lib/visitorTracker";
import { initVoiceWelcome } from "./lib/voiceWelcome";
import { matchesProductSearch } from "./lib/banglishSearch";

import { BannerSlider } from "./components/BannerSlider";
import { CartItemRow } from "./components/CartItemRow";
import { ProductCard } from "./components/ProductCard";
import { PWAInstallBanner } from "./components/PWAInstallBanner";
import { DailyAlarmBanner } from "./components/common/DailyAlarmBanner";
import { FloatingContactOverlay } from "./components/FloatingContactOverlay";
import { openPWAQRCodeModal, openPWAInstallModal } from "./utils/pwa";

import makkahImg from "./assets/images/makkah.jpg";
import madinaImg from "./assets/images/madina_dome_1784201787764.jpg";
import bismillahImg from "./assets/images/bismillah_glow_1784201804085.jpg";
import kalemaImg from "./assets/images/kalema_calligraphy_1784201818922.jpg";
import logoImg from "./assets/images/logo_1783882658678.jpg";
import founderImg from "./assets/images/founder_md_anik_1784735314684.jpg";
import chairmanImg from "./assets/images/chairman_hosne_ara_1784735275933.jpg";
import viceChairmanImg from "./assets/images/vice_chairman_abu_hanif_1784735297437.jpg";

// Import weight, unit, and product mapping helpers from productWeightUtils
import {
  toBnNum,
  mapDocToProduct,
  getProductWeightOptions,
  getOptionLabel,
  getWeightOnlyLabel,
  calculateProductPriceForWeight,
  validateWeightLimit
} from "./lib/productWeightUtils";
import { isCategoryMatch, normalizeCategoryId, mergeCategoryCards } from "./lib/categoryUtils";
import { SAFE_PRODUCT_PLACEHOLDER } from "./lib/masterImageRegistry";

export default function App() {
  // Localization: 'bn' (Bangla) or 'en' (English)
  const [lang, setLang] = useState<"bn" | "en">("bn");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [popularLimit, setPopularLimit] = useState<number>(8);
  const [newArrivalsLimit, setNewArrivalsLimit] = useState<number>(8);
  const [bestSellersLimit, setBestSellersLimit] = useState<number>(8);
  const [categoryLimit, setCategoryLimit] = useState<number>(8);
  const [showFlashSaleOnly, setShowFlashSaleOnly] = useState<boolean>(false);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("default");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeBanner, setActiveBanner] = useState<number>(0);
  const [showAllMobile, setShowAllMobile] = useState<boolean>(false);
  const [dbSubcategories, setDbSubcategories] = useState<Subcategory[]>([]);
  
  // Interactive E-commerce state
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem("kb_cart");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  
  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("kb_wishlist");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem("kb_recent_viewed");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // UI Drawers & Modals
  const [showCart, setShowCart] = useState<boolean>(false);
  const [showWishlist, setShowWishlist] = useState<boolean>(false);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [showLiveChat, setShowLiveChat] = useState<boolean>(false);
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

  const isDownloadingOrderPDFRef = useRef<boolean>(false);
  const isPrintingOrderRef = useRef<boolean>(false);

  const handlePrintOrder = async () => {
    if (isPrintingOrderRef.current || !completedOrder) return;
    isPrintingOrderRef.current = true;
    setShowMemoModal(true);

    try {
      let el = document.getElementById("printable-memo-card");
      if (!el) {
        for (let i = 0; i < 10; i++) {
          await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 25)));
          el = document.getElementById("printable-memo-card");
          if (el) break;
        }
      }
      if (el) {
        await printOrderMemo(el, {
          orderId: completedOrder.id,
          storeName: "KachaBazar Store",
          lang,
          onPopupBlocked: () => {
            triggerToast(
              "ব্রাউজারের পপ-আপ ব্লক করা আছে। অনুগ্রহ করে পপ-আপ অনুমোদন করুন।",
              "Pop-ups are blocked. Please allow pop-ups for direct printing."
            );
          },
        });
      }
    } catch (e) {
      console.error("Print error:", e);
    } finally {
      setTimeout(() => {
        isPrintingOrderRef.current = false;
      }, 500);
    }
  };

  const handleDownloadOrderPDF = async () => {
    if (downloadingPDF || isDownloadingOrderPDFRef.current || !completedOrder) return;
    isDownloadingOrderPDFRef.current = true;
    setDownloadingPDF(true);
    setShowMemoModal(true);

    try {
      // Find printable-memo-card quickly with minimal frame delay
      let el = document.getElementById("printable-memo-card");
      if (!el) {
        for (let i = 0; i < 10; i++) {
          await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 25)));
          el = document.getElementById("printable-memo-card");
          if (el) break;
        }
      }

      await downloadMemoPDF(el, completedOrder);
      triggerToast("পিডিএফ মেমো ডাউনলোড সফল হয়েছে!", "PDF Memo downloaded successfully!");
    } catch (err) {
      console.error("PDF download error:", err);
      triggerToast(
        "মেমো ডাউনলোড করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।",
        "Failed to generate PDF memo. Please try again."
      );
    } finally {
      isDownloadingOrderPDFRef.current = false;
      setDownloadingPDF(false);
    }
  };

  // Portal and Checkout modals
  const [showPortalModal, setShowPortalModal] = useState<boolean>(false);
  const [portalInitialTab, setPortalInitialTab] = useState<"dashboard" | "orders" | "wallet" | "referral" | "notifications">("dashboard");
  const [forcedPortalRole, setForcedPortalRole] = useState<"customer" | "admin" | "seller" | "rider" | "partner">("customer");
  const [loggedInUser, setLoggedInUser] = useState<any | null>(null);
  const [userRole, setUserRole] = useState<string>("customer");
  const [userReferralCode, setUserReferralCode] = useState<string>("");

  // Initialize Real-Time Anonymous App Visitor Tracking
  useEffect(() => {
    visitorTracker.init();
    return () => {
      visitorTracker.destroy();
    };
  }, []);

  // Initialize Bengali Voice Welcome Message (plays once per session with autoplay fallback)
  useEffect(() => {
    initVoiceWelcome();
  }, []);

  // Listen for URL panel routes (/admin, /partner, /seller, /rider, ?panel=admin, #admin, etc.)
  useEffect(() => {
    const checkPanelRoute = () => {
      const path = window.location.pathname.toLowerCase();
      const search = new URLSearchParams(window.location.search);
      const hash = window.location.hash.toLowerCase();

      let matchedRole: "admin" | "seller" | "rider" | "partner" | null = null;

      if (path === "/admin" || path.startsWith("/admin/") || search.get("panel") === "admin" || search.get("portal") === "admin" || hash === "#admin" || hash.startsWith("#admin")) {
        matchedRole = "admin";
      } else if (path === "/partner" || path.startsWith("/partner/") || search.get("panel") === "partner" || search.get("portal") === "partner" || hash === "#partner" || hash.startsWith("#partner")) {
        matchedRole = "partner";
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



  // Dynamic Category Navigation handler (1 Click -> Dedicated Category Page with browser history sync)
  const navigateToCategory = useCallback((catId: string) => {
    const resolvedCatId = normalizeCategoryId(catId);
    setSelectedCategory(resolvedCatId);
    setSelectedSubcategory("all");
    setShowFlashSaleOnly(false);

    // Sync URL search params without page reload
    const searchParams = new URLSearchParams(window.location.search);
    if (resolvedCatId === "all") {
      searchParams.delete("category");
    } else {
      searchParams.set("category", resolvedCatId);
    }
    const newQuery = searchParams.toString();
    const basePath = window.location.pathname.startsWith("/admin") || window.location.pathname.startsWith("/seller") || window.location.pathname.startsWith("/rider") 
      ? window.location.pathname 
      : "/";
    const newUrl = newQuery ? `?${newQuery}` : basePath;
    window.history.pushState({ category: resolvedCatId }, "", newUrl);

    // Smooth scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleBackToHome = useCallback(() => {
    navigateToCategory("all");
  }, [navigateToCategory]);

  // Category URL routing listener for browser back / forward buttons and direct links
  useEffect(() => {
    const checkCategoryRoute = () => {
      const search = new URLSearchParams(window.location.search);
      const catParam = search.get("category");
      if (catParam && catParam !== "all") {
        const resolved = normalizeCategoryId(catParam);
        setSelectedCategory(resolved);
        setSelectedSubcategory("all");
        setShowFlashSaleOnly(false);
      } else {
        setSelectedCategory("all");
      }
    };

    checkCategoryRoute();
    window.addEventListener("popstate", checkCategoryRoute);
    return () => {
      window.removeEventListener("popstate", checkCategoryRoute);
    };
  }, []);

  const [showCheckoutModal, setShowCheckoutModal] = useState<boolean>(false);
  const [showAboutModal, setShowAboutModal] = useState<boolean>(false);
  const [showContactModal, setShowContactModal] = useState<boolean>(false);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [showVoiceCall, setShowVoiceCall] = useState<boolean>(false);

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
        } catch (err: any) {
          if (!err?.message?.includes("offline")) {
            console.warn("Notice fetching user role:", err?.message || err);
          }
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
        } catch (err: any) {
          if (!err?.message?.includes("offline")) {
            console.warn("Notice loading referral code in App.tsx:", err?.message || err);
          }
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
        } catch (e: any) {
          if (!e?.message?.includes("offline")) {
            console.warn("Notice merging guest cart on login:", e?.message || e);
          }
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

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState<boolean>(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState<boolean>(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [loadingBanners, setLoadingBanners] = useState<boolean>(true);
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
    const filtered = products.filter(p => p.isAvailable !== false && !p.isDeleted && p.status !== "deleted" && !p.deleted);
    return filtered.sort((a, b) => {
      const orderA = typeof (a as any).displayOrder === "number" ? (a as any).displayOrder : (typeof (a as any).order === "number" ? (a as any).order : 9999);
      const orderB = typeof (b as any).displayOrder === "number" ? (b as any).displayOrder : (typeof (b as any).order === "number" ? (b as any).order : 9999);
      return orderA - orderB;
    });
  }, [products]);

  // Real-time synchronization of products, categories, reviews, banners, and home config from Firestore
  useEffect(() => {
    const productsQuery = query(
      collection(db, "products"),
      where("isDeleted", "==", false)
    );

    const unsubProducts = onSnapshot(
      productsQuery,
      (snap) => {
        const items: Product[] = [];
        snap.forEach((doc) => {
          const data = doc.data();
          if (data.isDeleted === true || data.status === "deleted" || data.deleted === true) {
            return;
          }
          // Completely remove ALL old products from the former "হিমায়িত খাদ্য" category
          if (/^fr\d+$/.test(doc.id) || (data.category === "frozen" && !doc.id.startsWith("df"))) {
            return;
          }
          items.push(mapDocToProduct(doc.id, data));
        });

        setProducts(items);
        setLoadingProducts(false);
      },
      (err) => {
        console.warn("Firestore products sync notice:", err.message);
        // Fallback to ALL_PRODUCTS on network or permission notice
        setProducts(ALL_PRODUCTS);
        setLoadingProducts(false);
      }
    );

    setLoadingCategories(true);
    const unsubCategories = onSnapshot(
      collection(db, "categories"), 
      (snap) => {
        const cats: Category[] = [];
        // Virtual "All Products" category tab for UI
        const allCat: Category = {
          id: "all",
          nameBn: "সকল পণ্য",
          nameEn: "All Products",
          iconName: "LayoutGrid",
          colorClass: "from-emerald-500 to-teal-600",
          borderColor: "border-emerald-200",
          displayOrder: 0
        };
        cats.push(allCat);

        if (!snap.empty) {
          snap.forEach((doc) => {
            const data = doc.data();
            const catId = doc.id || data.id;

            // Permanently ignore empty/obsolete home-appliances or duplicate mobile zone cards
            if (
              catId === "home-appliances" ||
              ((data.nameBn === "মোবাইল জোন" || data.nameEn === "Mobile Zone") &&
                catId !== "mobile-zone" &&
                catId !== "mobile" &&
                catId !== "mobiles")
            ) {
              return;
            }

            const isFrozenCat = catId === "frozen" || data.nameBn === "হিমায়িত খাদ্য";
            cats.push({
              id: catId,
              nameBn: isFrozenCat ? "ড্রাই ফুড" : data.nameBn,
              nameEn: isFrozenCat ? "Dry Food" : data.nameEn,
              iconName: isFrozenCat ? "Package" : (data.iconName || "Sparkles"),
              colorClass: data.colorClass || "from-emerald-500 to-teal-600",
              borderColor: data.borderColor || "border-slate-200",
              image: data.image || data.imageUrl,
              isAvailable: data.isAvailable !== false,
              displayOrder: typeof data.displayOrder === "number" ? data.displayOrder : (typeof data.order === "number" ? data.order : undefined),
              order: typeof data.order === "number" ? data.order : (typeof data.displayOrder === "number" ? data.displayOrder : undefined)
            } as Category);
          });
        }

        // Also add default categories if not already present
        CATEGORIES.forEach((defaultCat) => {
          if (!cats.some(c => c.id === defaultCat.id)) {
            cats.push(defaultCat);
          }
        });

        // Merge categories and enforce single Mobile Zone card
        const mergedCats = mergeCategoryCards(cats);

        // Priority order map for required categories
        const PRIORITY_ORDER_MAP: Record<string, number> = {
          "vegetables": 1,
          "groceries": 2,
          "staples": 2,
          "spices-oils": 2,
          "bakery-sweets": 3,
          "restaurant": 3,
          "bakery": 3,
          "fish": 4,
          "snacks-biscuits": 5,
          "confectionery": 5,
          "beverages": 5,
          "meat": 6,
          "fruits": 7,
          "dairy-eggs": 8,
          "frozen": 9,
          "personal-care": 10,
          "household": 11,
          "pharmacy": 12,
          "baby-care": 12,
          "offers": 13,
          "buy-sell": 14,
          "organic-herbal": 14,
          "buysell": 14,
          "pet-care": 15,
          "pet-food-care": 16,
          "vehicles": 17,
          "transport": 17,
          "car-rental": 17,
          "mobile-zone": 18,
          "mobile": 18,
          "mobiles": 18
        };

        // Remove duplicates strictly by ID and nameBn so only one "মোবাইল জোন" is ever rendered
        const uniqueCats = mergedCats.filter((c, index, self) =>
          index === self.findIndex((t) => t.id === c.id) &&
          index === self.findIndex((t) => t.nameBn === c.nameBn)
        );

        // Sort categories according to explicit displayOrder, PRIORITY_ORDER_MAP, or name
        uniqueCats.sort((a, b) => {
          if (a.id === "all") return -1;
          if (b.id === "all") return 1;

          const orderA = typeof (a as any).displayOrder === "number" 
            ? (a as any).displayOrder 
            : (typeof (a as any).order === "number" ? (a as any).order : (PRIORITY_ORDER_MAP[a.id] ?? 999));
          const orderB = typeof (b as any).displayOrder === "number" 
            ? (b as any).displayOrder 
            : (typeof (b as any).order === "number" ? (b as any).order : (PRIORITY_ORDER_MAP[b.id] ?? 999));

          if (orderA !== orderB) {
            return orderA - orderB;
          }
          return (a.nameEn || "").localeCompare(b.nameEn || "");
        });
        setCategories(uniqueCats);
        setLoadingCategories(false);
      },
      (err) => {
        console.warn("Firestore categories sync notice:", err.message);
        setLoadingCategories(false);
      }
    );

    const unsubReviews = onSnapshot(
      collection(db, "reviews"), 
      (snap) => {
        const revs: Review[] = [];
        if (!snap.empty) {
          snap.forEach((doc) => {
            const data = doc.data();
            revs.push({
              id: doc.id,
              productId: data.productId,
              userId: data.userId,
              userName: data.userName,
              rating: Number(data.rating || 5),
              commentBn: data.commentBn || "",
              commentEn: data.commentEn || "",
              date: data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleDateString() : "Today"
            });
          });
        }
        setReviews(revs);
      },
      (err) => console.warn("Firestore reviews sync notice:", err.message)
    );

    setLoadingBanners(true);
    const unsubBanners = onSnapshot(
      collection(db, "banners"), 
      (snap) => {
        const bList: any[] = [];
        snap.forEach((doc) => {
          bList.push({ id: doc.id, ...doc.data() });
        });
        setBanners(bList);
        setLoadingBanners(false);
      },
      (err) => {
        console.warn("Firestore banners sync notice:", err.message);
        setLoadingBanners(false);
      }
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

    const unsubSubcategories = subscribeToAllSubcategories((subs) => {
      setDbSubcategories(subs);
    });

    return () => {
      unsubProducts();
      unsubCategories();
      unsubSubcategories();
      unsubReviews();
      unsubBanners();
      unsubLeadership();
      unsubHome();
    };
  }, []);

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
    const target = (e.currentTarget || e.target) as HTMLImageElement;
    if (!target) return;
    target.onerror = null;
    if (target.dataset.triedFallback === "true") return;
    target.dataset.triedFallback = "true";
    target.src = SAFE_PRODUCT_PLACEHOLDER;
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

      return prev.map((item, idx) => {
        if (idx === itemIndex) {
          return { ...item, quantity: 1, selectedOption: newOption };
        }
        return item;
      });
    });

    if (!newOption.isCustom) {
      const optUnitText = lang === "bn" 
        ? (newOption.unit === "g" ? "গ্রাম" : newOption.unit === "kg" ? "কেজি" : newOption.unit === "ml" ? "মি.লি." : newOption.unit === "L" ? "লিটার" : newOption.unit)
        : newOption.unit;
      const optValText = lang === "bn" ? fmtNum(newOption.value) : newOption.value;

      triggerToast(
        `ওজন/সাইজ পরিবর্তন: ${optValText} ${optUnitText}`,
        `Weight/Size updated: ${optValText} ${optUnitText}`
      );
    }
  };

  const hasInvalidCustomWeight = useMemo(() => {
    return cart.some(item => {
      if (item.selectedOption?.isCustom) {
        const val = item.selectedOption.value;
        const unit = item.selectedOption.unit;
        const validCheck = validateWeightLimit(val, unit);
        return !validCheck.isValid;
      }
      return false;
    });
  }, [cart]);

  const hasInsufficientCartStock = useMemo(() => {
    return cart.some(item => {
      const availableOptions = getProductWeightOptions(item.product);
      const currentOpt = item.selectedOption || availableOptions.find(o => o.price === item.product.price) || availableOptions[0];
      const optStock = typeof currentOpt?.stock === "number" ? currentOpt.stock : (typeof item.product.stock === "number" ? item.product.stock : 50);
      const isItemOutOfStock = optStock <= 0 || item.product.isAvailable === false || (typeof item.product.stock === "number" && item.product.stock <= 0);
      return isItemOutOfStock;
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
      case "Pill":
      case "Cross":
      case "Medicine": return <Pill className="w-5 h-5 md:w-6 md:h-6" />;
      case "Baby": return <Pill className="w-5 h-5 md:w-6 md:h-6" />;
      case "Candy": return <Candy className="w-5 h-5 md:w-6 md:h-6" />;
      case "Snowflake": return <Snowflake className="w-5 h-5 md:w-6 md:h-6" />;
      case "Coffee": return <Coffee className="w-5 h-5 md:w-6 md:h-6" />;
      case "Dog": return <Dog className="w-5 h-5 md:w-6 md:h-6" />;
      case "Tag": return <Tag className="w-5 h-5 md:w-6 md:h-6" />;
      case "Sparkles": return <Sparkles className="w-5 h-5 md:w-6 md:h-6" />;
      case "Utensils": return <Utensils className="w-5 h-5 md:w-6 md:h-6" />;
      case "Repeat": return <Repeat className="w-5 h-5 md:w-6 md:h-6" />;
      case "Truck":
      case "Car": return <Truck className="w-5 h-5 md:w-6 md:h-6" />;
      case "Smartphone":
      case "Phone":
      case "Mobile": return <Smartphone className="w-5 h-5 md:w-6 md:h-6" />;
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
    return availableProducts.filter((product) => {
      const matchesCategory = isCategoryMatch(product.category, selectedCategory);
      const matchesSearch = matchesProductSearch(product, searchQuery);
      return matchesCategory && matchesSearch;
    });
  }, [availableProducts, selectedCategory, searchQuery]);

  if (showCheckoutModal) {
    return (
      <div className="min-h-screen w-full overflow-x-hidden bg-slate-50 font-sans text-slate-800 antialiased selection:bg-emerald-500 selection:text-white flex flex-col" id="checkout-view-root">
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
                onClick={handlePrintOrder}
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
        
        {/* Islamic Header taking 100% full space edge-to-edge with 4-sided White Border & Black Center Piping */}
        <div 
          id="premium-islamic-header" 
          className="w-full bg-[#04060c] h-[50px] sm:h-[58px] flex items-center justify-between px-3 sm:px-6 md:px-8 text-white relative select-none overflow-hidden"
        >
          {/* 4-Sided Elegant Frame: Outer Thin White + Center Black Piping + Inner Thin White */}
          <div className="absolute inset-0 border border-white pointer-events-none z-20" />
          <div className="absolute inset-[1.5px] border border-black pointer-events-none z-20" />
          <div className="absolute inset-[3px] border border-white pointer-events-none z-20" />

          {/* Left Side: Al-Masjid an-Nabawi (Madinah Green Dome) Image */}
          <div className="flex items-center justify-start w-1/4 sm:w-1/5 md:w-1/6 h-full relative z-10">
            {madinaImg ? (
              <div className="relative h-[36px] w-[36px] sm:h-[42px] sm:w-[42px] rounded-md overflow-hidden bg-slate-900 shadow-sm">
                <img 
                  src={madinaImg} 
                  alt="Al-Masjid an-Nabawi" 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                {/* 4-Sided Frame: Outer White + Center Black Piping + Inner White */}
                <div className="absolute inset-0 rounded-md border border-white pointer-events-none z-10" />
                <div className="absolute inset-[1px] rounded-[5px] border border-black pointer-events-none z-10" />
                <div className="absolute inset-[2px] rounded-[4px] border border-white pointer-events-none z-10" />
              </div>
            ) : null}
          </div>

          {/* Center Calligraphy texts */}
          <div className="flex-1 flex flex-col items-center justify-center text-center px-2 py-0.5 h-full select-all relative z-10">
            <div className="flex flex-col items-center justify-center space-y-0.5 sm:space-y-1">
              {bismillahImg ? (
                <div className="relative px-2.5 py-0.5 rounded-md overflow-hidden bg-slate-900/90 shadow-sm flex items-center justify-center border border-white">
                  <img 
                    src={bismillahImg} 
                    alt="Bismillah" 
                    referrerPolicy="no-referrer"
                    className="h-2.5 sm:h-3 md:h-3.5 object-contain drop-shadow-sm"
                  />
                </div>
              ) : null}
              {kalemaImg ? (
                <div className="relative px-3 py-0.5 rounded-md overflow-hidden bg-slate-900/90 shadow-sm flex items-center justify-center border border-white">
                  <img 
                    src={kalemaImg} 
                    alt="Shahada" 
                    referrerPolicy="no-referrer"
                    className="h-4 sm:h-4.5 md:h-5.5 object-contain drop-shadow-sm"
                  />
                </div>
              ) : null}
            </div>
          </div>

          {/* Right Side: Holy Kaaba (Makkah) Image */}
          <div className="flex items-center justify-end w-1/4 sm:w-1/5 md:w-1/6 h-full relative z-10">
            {makkahImg ? (
              <div className="relative h-[36px] w-[36px] sm:h-[42px] sm:w-[42px] rounded-md overflow-hidden bg-slate-900 shadow-sm">
                <img 
                  src={makkahImg}
                  alt="Holy Kaaba" 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                {/* 4-Sided Frame: Outer White + Center Black Piping + Inner White */}
                <div className="absolute inset-0 rounded-md border border-white pointer-events-none z-10" />
                <div className="absolute inset-[1px] rounded-[5px] border border-black pointer-events-none z-10" />
                <div className="absolute inset-[2px] rounded-[4px] border border-white pointer-events-none z-10" />
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

        {/* Main Header Bar */}
        <div className="max-w-7xl mx-auto px-2 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-1 sm:gap-4">
          
          {/* Logo */}
          <div 
            onClick={handleBackToHome}
            className="flex items-center space-x-1 sm:space-x-2 min-w-0 shrink cursor-pointer group"
          >
            {logoImg ? (
              <img 
                src={logoImg} 
                alt="Kacha Bazar Logo" 
                className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 object-contain rounded-full border border-emerald-100 bg-white shadow-md shadow-emerald-50 shrink-0 group-hover:scale-105 transition"
                referrerPolicy="no-referrer"
              />
            ) : null}
            <div className="min-w-0">
              <h1 className="text-xs sm:text-lg md:text-xl font-black text-emerald-700 tracking-tight leading-none truncate group-hover:text-emerald-800 transition">
                {lang === "bn" ? "কাচা বাজার" : "Kacha Bazar"}
              </h1>
              <p className="text-[7px] sm:text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 truncate">
                {lang === "bn" ? "তাজা পণ্য, আপনার দরজায়।" : "Fresh Everyday"}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-3 shrink-0">

            {/* PWA App Install & QR Code Trigger Button */}
            <button
              onClick={() => openPWAQRCodeModal()}
              className="flex items-center space-x-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 sm:px-2.5 py-1 sm:py-2 rounded-full transition cursor-pointer text-xs font-bold shrink-0 shadow-2xs"
              title={lang === "bn" ? "অ্যাপ ইনস্টল ও কিউআর কোড" : "Install App & QR Code"}
              id="header-pwa-btn"
            >
              <QrCode className="w-4 h-4 text-emerald-600 animate-pulse" />
              <span className="hidden sm:inline text-[11px] font-black">
                {lang === "bn" ? "অ্যাপ QR" : "App QR"}
              </span>
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

      {/* ================= 2. SEARCH BAR, LIVE CHAT & QUICK CALL TO ORDER ================= */}
      <section className="max-w-7xl mx-auto px-2 sm:px-4 mt-2 sm:mt-3" id="header-action-row-section">
        <div className="max-w-5xl mx-auto grid grid-cols-3 gap-1.5 sm:gap-2.5 md:gap-3 items-center">
          
          {/* 1. Search Bar with Mic Inside (1/3 Equal Column) */}
          <div className="w-full h-[36px] sm:h-[40px] md:h-[44px] relative flex items-center bg-white border border-slate-200 rounded-full shadow-xs hover:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 transition-all" id="header-search-container">
            <div className="w-full h-full relative flex items-center px-1.5 sm:px-2.5 md:px-3">
              <Search className="text-slate-400 w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 shrink-0 mr-1 sm:mr-1.5 pointer-events-none" />
              <input
                type="text"
                placeholder={lang === "bn" ? "পণ্য খুঁজুন..." : "Search..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-full bg-transparent text-[10.5px] xs:text-[11px] sm:text-xs md:text-sm text-slate-800 placeholder-slate-400 outline-none leading-none min-w-0"
                id="search-input"
              />
              <button 
                onClick={handleVoiceSearchClick}
                className="p-0.5 sm:p-1 text-slate-400 hover:text-emerald-600 rounded-full hover:bg-slate-100 transition cursor-pointer shrink-0 ml-0.5"
                title={lang === "bn" ? "ভয়েস সার্চ" : "Voice Search"}
                id="search-mic"
                type="button"
              >
                <Mic className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
              </button>
            </div>

            {/* Live Suggestion Box */}
            {searchQuery && (
              <div className="absolute top-full left-0 w-[88vw] sm:w-[320px] md:w-[380px] max-w-sm mt-2 bg-white border border-slate-100 rounded-xl shadow-xl z-50 max-h-80 overflow-y-auto p-2">
                <div className="flex justify-between items-center border-b border-slate-50 p-1.5 pb-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">
                    {lang === "bn" ? `${filteredProducts.length}টি ফলাফল পাওয়া গেছে` : `Found ${filteredProducts.length} results`}
                  </span>
                  <button onClick={() => setSearchQuery("")} className="text-xs text-red-500 hover:underline cursor-pointer">
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
                    <img src={prod.image || (prod as any).imageUrl || SAFE_PRODUCT_PLACEHOLDER} className="w-10 h-10 object-cover rounded bg-slate-50" onError={handleProductImgError} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate text-slate-800">{lang === "bn" ? prod.nameBn : prod.nameEn}</p>
                      <p className="text-[10px] text-emerald-600 font-bold">৳{fmtNum(prod.price)} / {lang === "bn" ? prod.unitBn : prod.unitEn}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. Live Chat Pill Button (1/3 Equal Column) */}
          <button 
            type="button"
            onClick={() => setShowLiveChat(prev => !prev)}
            className="w-full h-[36px] sm:h-[40px] md:h-[44px] px-1.5 sm:px-2.5 md:px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-full transition-all cursor-pointer shadow-xs border border-emerald-500 flex items-center justify-center gap-1 sm:gap-1.5 select-none"
            id="middle-live-chat-btn"
            title={lang === "bn" ? "চ্যাট করুন" : "Live Chat"}
          >
            <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-200 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-emerald-300"></span>
            </span>
            <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="text-[11px] xs:text-[12px] sm:text-[13px] md:text-[14px] font-bold tracking-tight whitespace-nowrap leading-none">
              {lang === "bn" ? "অর্ডার মেসেজ করুন" : "Message Order"}
            </span>
          </button>

          {/* 3. Call to Order Pill Button (1/3 Equal Column) */}
          <button 
            type="button"
            onClick={() => setShowVoiceCall(true)}
            className="w-full h-[36px] sm:h-[40px] md:h-[44px] px-1.5 sm:px-2.5 md:px-3 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-600 hover:to-orange-600 active:scale-98 text-white rounded-full transition-all cursor-pointer shadow-xs border border-amber-400 flex items-center justify-center gap-1 sm:gap-1.5 select-none group"
            id="call-to-order-bar"
            title={lang === "bn" ? "অর্ডার কল করুন" : "Call to Order"}
          >
            <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 rounded-full bg-white/25 flex items-center justify-center shrink-0 border border-white/20 shadow-inner group-hover:scale-110 transition-transform">
              <Phone className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 text-white animate-bounce" />
            </div>
            <span className="text-[11px] xs:text-[12px] sm:text-[13px] md:text-[14px] font-black tracking-tight whitespace-nowrap leading-none">
              {lang === "bn" ? "অর্ডার কল করুন" : "Call to Order"}
            </span>
          </button>

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
          onCategoryClick={navigateToCategory}
          customBanners={homeConfig?.heroBanners || banners}
          referralBanner={homeConfig?.referralBanner}
          loading={loadingBanners}
        />
      )}

      {/* ================= 4. CATEGORIES (HOME PAGE VIEW) ================= */}
      {selectedCategory === "all" && (
        <section className="max-w-7xl mx-auto px-4 mt-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg md:text-xl font-bold text-slate-800 flex items-center gap-1.5">
                <span className="w-2.5 h-6 bg-emerald-600 rounded-full inline-block"></span>
                {lang === "bn" ? "প্রয়োজনীয় ক্যাটাগরি সমূহ" : "Explore Beautiful Categories"}
              </h3>
              <p className="text-xs text-slate-400">{lang === "bn" ? "এক ক্লিকেই পছন্দমতো বাজার করুন" : "Browse items by department smoothly"}</p>
            </div>
          </div>
          
          {/* All Categories displayed directly in a compact, uniform, modern premium grid */}
          {loadingCategories ? (
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2 sm:gap-2.5 md:gap-3">
              {Array.from({ length: 10 }).map((_, idx) => (
                <div key={idx} className="flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-xl border border-slate-200/80 bg-white shadow-xs animate-pulse">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 md:w-13 md:h-13 rounded-full bg-slate-100 shrink-0" style={{ borderRadius: "50%" }}></div>
                  <div className="h-2 w-10 sm:w-12 bg-slate-100 rounded mt-1"></div>
                </div>
              ))}
            </div>
          ) : (
            (() => {
              const activeCats = categories.filter(
                c => c.id !== "all" && 
                     c.isAvailable !== false && 
                     (c as any).disabled !== true && 
                     !(homeConfig?.categoryConfig?.hiddenCategoryIds || []).includes(c.id)
              );

              return (
                <>
                  <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2 sm:gap-2.5 md:gap-3">
                    {activeCats.map((cat, idx) => {
                      const isHiddenOnMobile = idx >= 8 && !showAllMobile;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => navigateToCategory(cat.id)}
                          className={`group flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50/60 hover:border-emerald-500/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer text-center ${isHiddenOnMobile ? "hidden sm:flex" : "flex"}`}
                        >
                          {/* Circular Category Card (100% Round) */}
                          <div 
                            className="w-11 h-11 sm:w-12 sm:h-12 md:w-13 md:h-13 rounded-full bg-slate-50 flex items-center justify-center shrink-0 overflow-hidden transition-transform duration-200 group-hover:scale-105"
                            style={{ borderRadius: "50%" }}
                          >
                            {(cat as any).image || (cat as any).imageUrl ? (
                              <img
                                src={(cat as any).image || (cat as any).imageUrl}
                                alt={cat.nameEn}
                                className="w-full h-full object-cover rounded-full"
                                style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
                                loading="lazy"
                              />
                            ) : (
                              <div 
                                className={`w-full h-full rounded-full flex items-center justify-center text-slate-600 ${cat.colorClass || "bg-emerald-50 text-emerald-600"}`}
                                style={{ width: "100%", height: "100%", borderRadius: "50%" }}
                              >
                                {renderCatIcon(cat.iconName)}
                              </div>
                            )}
                          </div>

                          {/* Category Name - Tight, Balanced, Centered */}
                          <div className="w-full mt-1 flex items-center justify-center">
                            <p className="text-[10px] sm:text-[11px] md:text-xs font-semibold text-slate-700 group-hover:text-emerald-700 text-center leading-tight line-clamp-2 px-0.5 transition-colors duration-150">
                              {lang === "bn" ? cat.nameBn : cat.nameEn}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Mobile Show All/Less Button */}
                  {activeCats.length > 8 && (
                    <div className="flex justify-center mt-3.5 sm:hidden">
                      {!showAllMobile ? (
                        <button
                          onClick={() => setShowAllMobile(true)}
                          className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200/80 hover:border-emerald-500 rounded-full text-xs font-semibold text-slate-700 hover:text-emerald-600 shadow-xs transition cursor-pointer"
                        >
                          <span>{lang === "bn" ? "সব ক্যাটাগরি দেখুন" : "Show All Categories"}</span>
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                        </button>
                      ) : (
                        <button
                          onClick={() => setShowAllMobile(false)}
                          className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200/80 hover:border-emerald-500 rounded-full text-xs font-semibold text-slate-700 hover:text-emerald-600 shadow-xs transition cursor-pointer"
                        >
                          <span>{lang === "bn" ? "কম ক্যাটাগরি দেখুন" : "Show Less"}</span>
                          <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                        </button>
                      )}
                    </div>
                  )}
                </>
              );
            })()
          )}
        </section>
      )}

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
            {loadingProducts ? (
              <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className={`bg-white rounded-2xl border border-slate-100 p-2 sm:p-2.5 animate-pulse shadow-2xs ${i === 8 ? "md:hidden" : ""}`}>
                    <div className="w-full aspect-[4/3] bg-slate-100 rounded-xl mb-2"></div>
                    <div className="h-2.5 w-3/4 bg-slate-100 rounded mb-1"></div>
                    <div className="h-2 w-1/2 bg-slate-100 rounded mb-2"></div>
                    <div className="h-6 w-full bg-slate-100 rounded"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
                {availableProducts.filter(p => p.isFlashSale).map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    lang={lang}
                    fmtNum={fmtNum}
                    wishlist={wishlist}
                    toggleWishlist={toggleWishlist}
                    cart={cart}
                    addToCart={addToCart}
                    updateCartQuantity={updateCartQuantity}
                    removeFromCart={removeFromCart}
                    handleBuyNow={handleBuyNow}
                    openQuickView={openQuickView}
                    handleProductImgError={handleProductImgError}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
          {/* ================= 5. FEATURED PRODUCTS ================= */}
          {homeConfig?.featuredProducts?.popularSectionVisible !== false && (
          <section className="max-w-7xl mx-auto px-2 sm:px-4 mt-6 sm:mt-8">
            <div className="flex justify-between items-center mb-3 sm:mb-4">
              <div>
                <h3 className="text-sm sm:text-lg font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-2 h-4 sm:h-5 bg-emerald-600 rounded-full inline-block"></span>
                  {lang === "bn" ? "জনপ্রিয় ও আকর্ষণীয় পণ্য" : "Featured Products"}
                </h3>
                <p className="text-[10px] sm:text-xs text-slate-400">
                  {lang === "bn" ? "আমাদের সেরা এবং অত্যন্ত জনপ্রিয় পণ্যসমূহ" : "Our handpicked premium products for you"}
                </p>
              </div>
              <button
                onClick={() => setPopularLimit(prev => prev === 8 ? 50 : 8)}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-bold hover:underline cursor-pointer"
              >
                {popularLimit === 8 ? (lang === "bn" ? "সবগুলো দেখুন" : "See All") : (lang === "bn" ? "কম দেখুন" : "See Less")}
              </button>
            </div>
            {loadingProducts ? (
              <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className={`bg-white rounded-2xl border border-slate-100 p-2 sm:p-2.5 animate-pulse shadow-2xs ${i === 8 ? "md:hidden" : ""}`}>
                    <div className="w-full aspect-[4/3] bg-slate-100 rounded-xl mb-2"></div>
                    <div className="h-2.5 w-3/4 bg-slate-100 rounded mb-1"></div>
                    <div className="h-2 w-1/2 bg-slate-100 rounded mb-2"></div>
                    <div className="h-6 w-full bg-slate-100 rounded"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
                {availableProducts.filter(p => p.isPopular || (homeConfig?.featuredProducts?.popularProductIds || []).includes(p.id)).slice(0, popularLimit === 8 ? 9 : popularLimit).map((product, idx) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    lang={lang}
                    fmtNum={fmtNum}
                    wishlist={wishlist}
                    toggleWishlist={toggleWishlist}
                    cart={cart}
                    addToCart={addToCart}
                    updateCartQuantity={updateCartQuantity}
                    removeFromCart={removeFromCart}
                    handleBuyNow={handleBuyNow}
                    openQuickView={openQuickView}
                    handleProductImgError={handleProductImgError}
                    className={popularLimit === 8 && idx === 8 ? "md:hidden" : ""}
                  />
                ))}
              </div>
            )}
          </section>
          )}

          {/* ================= 7. NEW ARRIVALS ================= */}
          {homeConfig?.featuredProducts?.newArrivalSectionVisible !== false && (
          <section className="max-w-7xl mx-auto px-2 sm:px-4 mt-6 sm:mt-8">
            <div className="flex justify-between items-center mb-3 sm:mb-4">
              <div>
                <h3 className="text-sm sm:text-lg font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-2 h-4 sm:h-5 bg-emerald-500 rounded-full inline-block"></span>
                  {lang === "bn" ? "নতুন সংগৃহীত পণ্যসমূহ" : "New Arrivals"}
                </h3>
                <p className="text-[10px] sm:text-xs text-slate-400">
                  {lang === "bn" ? "সরাসরি মাঠ থেকে আসা একদম সতেজ নতুন পণ্যসমূহ" : "Freshly harvested organic items added recently"}
                </p>
              </div>
              <button
                onClick={() => setNewArrivalsLimit(prev => prev === 8 ? 50 : 8)}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-bold hover:underline cursor-pointer"
              >
                {newArrivalsLimit === 8 ? (lang === "bn" ? "সবগুলো দেখুন" : "See All") : (lang === "bn" ? "কম দেখুন" : "See Less")}
              </button>
            </div>

            {loadingProducts ? (
              <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className={`bg-white rounded-2xl border border-slate-100 p-2 sm:p-2.5 animate-pulse shadow-2xs ${i === 8 ? "md:hidden" : ""}`}>
                    <div className="w-full aspect-[4/3] bg-slate-100 rounded-xl mb-2"></div>
                    <div className="h-2.5 w-3/4 bg-slate-100 rounded mb-1"></div>
                    <div className="h-2 w-1/2 bg-slate-100 rounded mb-2"></div>
                    <div className="h-6 w-full bg-slate-100 rounded"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
                {availableProducts.filter(p => p.isNewArrival).slice(0, newArrivalsLimit === 8 ? 9 : newArrivalsLimit).map((product, idx) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    lang={lang}
                    fmtNum={fmtNum}
                    wishlist={wishlist}
                    toggleWishlist={toggleWishlist}
                    cart={cart}
                    addToCart={addToCart}
                    updateCartQuantity={updateCartQuantity}
                    removeFromCart={removeFromCart}
                    handleBuyNow={handleBuyNow}
                    openQuickView={openQuickView}
                    handleProductImgError={handleProductImgError}
                    className={newArrivalsLimit === 8 && idx === 8 ? "md:hidden" : ""}
                  />
                ))}
              </div>
            )}
          </section>
          )}

          {/* ================= 8. BEST SELLERS ================= */}
          <section className="max-w-7xl mx-auto px-2 sm:px-4 mt-6 sm:mt-8">
            <div className="flex justify-between items-center mb-3 sm:mb-4">
              <div>
                <h3 className="text-sm sm:text-lg font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-2 h-4 sm:h-5 bg-amber-500 rounded-full inline-block"></span>
                  {lang === "bn" ? "সর্বোচ্চ বিক্রিত পণ্যসমূহ" : "Best Sellers"}
                </h3>
                <p className="text-[10px] sm:text-xs text-slate-400">
                  {lang === "bn" ? "গ্রাহকদের সর্বোচ্চ পছন্দের তালিকায় থাকা পণ্যসমূহ" : "Our most popular and highest-selling groceries"}
                </p>
              </div>
              <button
                onClick={() => setBestSellersLimit(prev => prev === 8 ? 50 : 8)}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-bold hover:underline cursor-pointer"
              >
                {bestSellersLimit === 8 ? (lang === "bn" ? "সবগুলো দেখুন" : "See All") : (lang === "bn" ? "কম দেখুন" : "See Less")}
              </button>
            </div>

            {loadingProducts ? (
              <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className={`bg-white rounded-2xl border border-slate-100 p-2 sm:p-2.5 animate-pulse shadow-2xs ${i === 8 ? "md:hidden" : ""}`}>
                    <div className="w-full aspect-[4/3] bg-slate-100 rounded-xl mb-2"></div>
                    <div className="h-2.5 w-3/4 bg-slate-100 rounded mb-1"></div>
                    <div className="h-2 w-1/2 bg-slate-100 rounded mb-2"></div>
                    <div className="h-6 w-full bg-slate-100 rounded"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
                {availableProducts.filter(p => p.isBestSelling).slice(0, bestSellersLimit === 8 ? 9 : bestSellersLimit).map((product, idx) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    lang={lang}
                    fmtNum={fmtNum}
                    wishlist={wishlist}
                    toggleWishlist={toggleWishlist}
                    cart={cart}
                    addToCart={addToCart}
                    updateCartQuantity={updateCartQuantity}
                    removeFromCart={removeFromCart}
                    handleBuyNow={handleBuyNow}
                    openQuickView={openQuickView}
                    handleProductImgError={handleProductImgError}
                    className={bestSellersLimit === 8 && idx === 8 ? "md:hidden" : ""}
                  />
                ))}
              </div>
            )}
          </section>

          {/* ================= 9. REMAINING PRODUCT SECTIONS ================= */}
          {/* ================= RECOMMENDED & SEASONAL SPECIAL ================= */}
      <section className="max-w-7xl mx-auto px-2 sm:px-4 mt-8 sm:mt-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          
          {/* Recommended For You */}
          <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-3 sm:p-4">
            <h3 className="text-sm sm:text-base font-bold text-slate-800 mb-3 flex items-center justify-between">
              <span>{lang === "bn" ? "আপনার জন্য স্পেশাল" : "Recommended For You"}</span>
              <Award className="w-4 h-4 text-emerald-600 animate-pulse" />
            </h3>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {availableProducts.filter(p => p.rating >= 4.8 && !p.isCombo).slice(0, 3).map((product) => (
                <div key={product.id} className="bg-white p-2 sm:p-2.5 rounded-xl border border-emerald-50/50 shadow-2xs flex flex-col justify-between group hover:shadow-md transition">
                  <div className="w-full aspect-[4/3] overflow-hidden rounded-lg mb-1.5 bg-slate-50">
                    <img src={product.image || product.imageUrl || SAFE_PRODUCT_PLACEHOLDER} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onError={handleProductImgError} />
                  </div>
                  <h4 className="text-[10px] sm:text-xs font-bold text-slate-800 line-clamp-1">{lang === "bn" ? product.nameBn : product.nameEn}</h4>
                  <div className="flex justify-between items-center mt-1.5">
                    <span className="text-[11px] sm:text-xs font-black text-emerald-600">৳{fmtNum(product.price)}</span>
                    <button 
                      onClick={() => addToCart(product)}
                      className="bg-emerald-600 text-white p-1 rounded-full hover:bg-emerald-700 transition cursor-pointer"
                      title={lang === "bn" ? "কার্টে যোগ করুন" : "Add to cart"}
                    >
                      <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Seasonal Collection (Himsagar Mango, Jackfruit, etc) */}
          {homeConfig?.featuredProducts?.seasonalSectionVisible !== false && (
          <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-3 sm:p-4">
            <h3 className="text-sm sm:text-base font-bold text-slate-800 mb-3 flex items-center justify-between">
              <span>
                {lang === "bn" 
                  ? (homeConfig?.featuredProducts?.seasonalTitleBn || "মৌসুমী তাজা ফল মেলা") 
                  : (homeConfig?.featuredProducts?.seasonalTitleEn || "Seasonal Special Fruits")}
              </span>
              <Sparkles className="w-4 h-4 text-amber-500 animate-spin" />
            </h3>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {availableProducts.filter(p => p.isSeasonal || (homeConfig?.featuredProducts?.seasonalProductIds || []).includes(p.id)).slice(0, 3).map((product) => (
                <div key={product.id} className="bg-white p-2 sm:p-2.5 rounded-xl border border-amber-50/50 shadow-2xs flex flex-col justify-between group hover:shadow-md transition">
                  <div className="w-full aspect-[4/3] overflow-hidden rounded-lg mb-1.5 bg-slate-50">
                    <img src={product.image || product.imageUrl || SAFE_PRODUCT_PLACEHOLDER} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onError={handleProductImgError} />
                  </div>
                  <h4 className="text-[10px] sm:text-xs font-bold text-slate-800 line-clamp-1">{lang === "bn" ? product.nameBn : product.nameEn}</h4>
                  <div className="flex justify-between items-center mt-1.5">
                    <span className="text-[11px] sm:text-xs font-black text-emerald-600">৳{fmtNum(product.price)}</span>
                    <button 
                      onClick={() => addToCart(product)}
                      className="bg-amber-500 text-white p-1 rounded-full hover:bg-amber-600 transition cursor-pointer"
                      title={lang === "bn" ? "কার্টে যোগ করুন" : "Add to cart"}
                    >
                      <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          )}

        </div>
      </section>

          </>
        )
      ) : normalizeCategoryId(selectedCategory) === "buy-sell" ? (
        <BuySellMarketplace
          currentUser={loggedInUser}
          lang={lang}
          onBackToHome={handleBackToHome}
          triggerToast={triggerToast}
          onOpenAuth={() => setShowPortalModal(true)}
        />
      ) : (
        <div className="max-w-7xl mx-auto px-4 mt-6">
          {/* Category Page Header Banner */}
          {(() => {
            const resolvedCatId = normalizeCategoryId(selectedCategory);
            const cat = categories.find(c => c.id === resolvedCatId) || 
                        CATEGORIES.find(c => c.id === resolvedCatId) || 
                        categories.find(c => c.id === selectedCategory) || 
                        CATEGORIES.find(c => c.id === selectedCategory) || 
                        { id: selectedCategory, nameBn: "মুদি পণ্য", nameEn: "Groceries", colorClass: "bg-amber-50 text-amber-800", borderColor: "border-amber-100", iconName: "Wheat" };

            const isRestaurantCat = isCategoryMatch(selectedCategory, "bakery-sweets");
            const isGroceryCat = isCategoryMatch(selectedCategory, "groceries");
            const isVehicleCat = isCategoryMatch(selectedCategory, "vehicles");
            const isMobileZoneCat = isCategoryMatch(selectedCategory, "mobile-zone");
            const isSectionedCategory = isRestaurantCat || isGroceryCat || isMobileZoneCat;

            // Filter subcategories for the selected category from Firestore (sorted by order asc)
            const matchingDbSubs = dbSubcategories
              .filter(s => s.categoryId === selectedCategory && !s.isDeleted)
              .sort((a, b) => (a.order || 0) - (b.order || 0));

            // Filter products
            const catProducts = availableProducts.filter((product) => {
              const matchesCategory = isCategoryMatch(product.category, selectedCategory);
              const effectiveSubcategory = isGroceryCat 
                ? getResolvedGrocerySubcategory(product.id, product.nameBn, product.nameEn, product.subcategory, product.category)
                : (product.subcategory || "").toLowerCase();
              const targetSub = selectedSubcategory.toLowerCase();

              const matchedSubObj = matchingDbSubs.find(
                s => s.nameBn.toLowerCase() === targetSub || (s.nameEn && s.nameEn.toLowerCase() === targetSub)
              );

              const matchesSubcategory = targetSub === "all" || 
                effectiveSubcategory === targetSub || 
                (matchedSubObj && (product.subcategoryId === matchedSubObj.id || (product.subcategory && product.subcategory.toLowerCase() === matchedSubObj.nameBn.toLowerCase())));

              const matchesSearch = matchesProductSearch(product, searchQuery);
              return matchesCategory && matchesSubcategory && matchesSearch;
            });

            // Unique subcategories
            const allCatProducts = availableProducts.filter(p => isCategoryMatch(p.category, selectedCategory));

            let subcategories: string[] = [];
            if (matchingDbSubs.length > 0) {
              const dynamicSubs = matchingDbSubs.map(s => s.nameBn);
              subcategories = ["all", ...dynamicSubs];
            } else if (isRestaurantCat) {
              const existingSubs = Array.from(new Set(allCatProducts.map(p => p.subcategory).filter(Boolean)));
              const orderedSubs = [
                ...RESTAURANT_MENU_SECTIONS.filter(s => existingSubs.includes(s)),
                ...existingSubs.filter(s => !RESTAURANT_MENU_SECTIONS.includes(s))
              ];
              subcategories = ["all", ...orderedSubs];
            } else if (isGroceryCat) {
              const existingSubs = Array.from(new Set(allCatProducts.map(p => getResolvedGrocerySubcategory(p.id, p.nameBn, p.nameEn, p.subcategory, p.category)).filter(Boolean)));
              const orderedSubs = [
                ...GROCERY_SECTIONS.filter(s => existingSubs.includes(s)),
                ...existingSubs.filter(s => !GROCERY_SECTIONS.includes(s as any))
              ];
              subcategories = ["all", ...orderedSubs];
            } else if (isVehicleCat) {
              const VEHICLE_ORDERED_SUBS = ["ambulance", "microbus", "bus", "auto", "cng", "pickup", "van", "car"];
              const existingSubs = Array.from(new Set(allCatProducts.map(p => p.subcategory).filter(Boolean)));
              const orderedSubs = [
                ...VEHICLE_ORDERED_SUBS.filter(s => existingSubs.includes(s)),
                ...existingSubs.filter(s => !VEHICLE_ORDERED_SUBS.includes(s))
              ];
              subcategories = ["all", ...orderedSubs];
            } else if (isMobileZoneCat) {
              const MOBILE_ORDERED_SUBS = ["vivo", "redmi", "infinix"];
              const existingSubs = Array.from(new Set(allCatProducts.map(p => (p.subcategory || "").toLowerCase()).filter(Boolean)));
              const orderedSubs = [
                ...MOBILE_ORDERED_SUBS.filter(s => existingSubs.includes(s)),
                ...existingSubs.filter(s => !MOBILE_ORDERED_SUBS.includes(s))
              ];
              subcategories = ["all", ...orderedSubs];
            } else {
              subcategories = ["all", ...Array.from(new Set(allCatProducts.map(p => p.subcategory).filter(Boolean)))];
            }

            // Sort products
            const sortedProducts = [...catProducts].sort((a, b) => {
              if (sortBy === "price-low") return a.price - b.price;
              if (sortBy === "price-high") return b.price - a.price;
              if (sortBy === "rating") return b.rating - a.rating;
              if (sortBy === "discount") return (b.discount || 0) - (a.discount || 0);
              const orderA = typeof (a as any).displayOrder === "number" ? (a as any).displayOrder : (typeof (a as any).order === "number" ? (a as any).order : 9999);
              const orderB = typeof (b as any).displayOrder === "number" ? (b as any).displayOrder : (typeof (b as any).order === "number" ? (b as any).order : 9999);
              return orderA - orderB;
            });

            return (
              <>
                {/* Vehicle Rental Notice Banner */}
                {isVehicleCat && (
                  <div className="mb-4 p-3.5 bg-gradient-to-r from-blue-50 via-sky-50 to-indigo-50 border border-blue-200/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                        <Truck className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-black text-blue-900 leading-snug">
                          {lang === "bn" ? "যানবাহন ও গাড়ি ভাড়া সেবা (২৪/৭ চালু)" : "Vehicle & Transport Rental Services (24/7 Available)"}
                        </h4>
                        <p className="text-[11px] sm:text-xs text-blue-700 leading-snug mt-0.5">
                          {lang === "bn" 
                            ? "অ্যাম্বুলেন্স, মাইক্রোবাস, বাস, পিকআপ, অটো, সিএনজি ও ভ্যান সার্ভিস। দূরত্ব ও গন্তব্য অনুযায়ী ভাড়া আলোচনা সাপেক্ষে।" 
                            : "Ambulance, Microbus, Bus, Pickup, Auto, CNG & Van. Fare is negotiable based on trip."}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                      <a 
                        href="tel:+8801615581975"
                        className="flex-1 sm:flex-none px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                        <span>{lang === "bn" ? "কল করুন" : "Call Now"}</span>
                      </a>
                      <a 
                        href={`https://wa.me/8801615581975?text=${encodeURIComponent("আসসালামু আলাইকুম, আমি যানবাহন ভাড়ার জন্য অনুসন্ধান করতে চাই।")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 sm:flex-none px-3.5 py-2 bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>
                    </div>
                  </div>
                )}

                {/* Mobile Zone Official Showroom Notice Banner */}
                {isMobileZoneCat && (
                  <div className="mb-4 p-3.5 sm:p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl border border-indigo-500/30 shadow-md relative overflow-hidden">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative z-10">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-md">
                          <Smartphone className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-xs sm:text-sm font-black text-white leading-snug tracking-wide">
                              {lang === "bn" ? "অফিসিয়াল মোবাইল জোন (Vivo • Redmi • Infinix)" : "Official Mobile Zone (Vivo • Redmi • Infinix)"}
                            </h4>
                            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-[9px] sm:text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                              {lang === "bn" ? "✓ ১০০% অফিসিয়াল ওয়ারেন্টি" : "✓ 100% Official Warranty"}
                            </span>
                          </div>
                          <p className="text-[11px] sm:text-xs text-indigo-200/90 leading-snug mt-0.5">
                            {lang === "bn" 
                              ? "সিল প্যাক স্মার্টফোন, অরিজিনাল ক্যাশমেমো ও দ্রুততম হোম ডেলিভারি। চেক করে মূল্য পরিশোধ করুন।" 
                              : "Brand new factory sealed handsets with official invoice & fast doorstep delivery."}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                        <a 
                          href="tel:+8801615581975"
                          className="flex-1 sm:flex-none px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                        >
                          <PhoneCall className="w-3.5 h-3.5" />
                          <span>{lang === "bn" ? "হটলাইন" : "Hotline"}</span>
                        </a>
                        <a 
                          href={`https://wa.me/8801615581975?text=${encodeURIComponent("আসসালামু আলাইকুম, আমি মোবাইল জোন থেকে স্মার্টফোন কিনতে আগ্রহী।")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 sm:flex-none px-3.5 py-2 bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {/* Filtering, Subcategory, & Sorting Bar */}
                <div className="flex flex-col lg:flex-row gap-3 justify-between items-start lg:items-center">
                  <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none max-w-full snap-x">
                    <button
                      onClick={handleBackToHome}
                      title={lang === "bn" ? "সব ক্যাটাগরি (হোম)" : "All Categories (Home)"}
                      className="px-3 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer snap-start border bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs flex items-center gap-1.5 shrink-0 hover:border-emerald-500 hover:text-emerald-700"
                    >
                      <ArrowLeft className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{lang === "bn" ? "সব ক্যাটাগরি" : "All Categories"}</span>
                    </button>

                    <div className="h-4 w-[1px] bg-slate-200 shrink-0 mx-0.5"></div>

                    {subcategories.map((sub: string) => {
                      let label = sub === "all" 
                        ? (lang === "bn" 
                            ? (isVehicleCat ? "সব যানবাহন" : isMobileZoneCat ? "সব ব্র্যান্ড" : "সব পণ্য") 
                            : (isVehicleCat ? "All Vehicles" : isMobileZoneCat ? "All Brands" : "All Products")) 
                        : sub;
                      if (isVehicleCat) {
                        const VEHICLE_SUBCAT_LABELS: Record<string, { bn: string; en: string }> = {
                          ambulance: { bn: "🚑 অ্যাম্বুলেন্স", en: "🚑 Ambulance" },
                          microbus: { bn: "🚐 মাইক্রোবাস", en: "🚐 Microbus" },
                          bus: { bn: "🚌 বাস সার্ভিস", en: "🚌 Bus Service" },
                          auto: { bn: "🛺 অটো সার্ভিস", en: "🛺 Electric Auto" },
                          cng: { bn: "🛵 সিএনজি সার্ভিস", en: "🛵 CNG Service" },
                          pickup: { bn: "🚚 পিকআপ ট্রাক", en: "🚚 Pickup Truck" },
                          van: { bn: "🛞 ভ্যান সার্ভিস", en: "🛞 Van Service" },
                          car: { bn: "🚗 প্রাইভেট কার", en: "🚗 Private Car" }
                        };
                        if (VEHICLE_SUBCAT_LABELS[sub]) {
                          label = VEHICLE_SUBCAT_LABELS[sub][lang];
                        }
                      } else if (isMobileZoneCat) {
                        const MOBILE_SUBCAT_LABELS: Record<string, { bn: string; en: string }> = {
                          vivo: { bn: "🔵 Vivo (ভিভো)", en: "🔵 Vivo" },
                          redmi: { bn: "🟠 Redmi (রেডমি)", en: "🟠 Redmi" },
                          infinix: { bn: "🟢 Infinix (ইনফিনিক্স)", en: "🟢 Infinix" }
                        };
                        if (MOBILE_SUBCAT_LABELS[sub.toLowerCase()]) {
                          label = MOBILE_SUBCAT_LABELS[sub.toLowerCase()][lang];
                        }
                      }
                      return (
                        <button
                          key={sub}
                          onClick={() => {
                            setSelectedSubcategory(sub);
                            triggerToast(
                              `সাবক্যাটাগরি: ${label}`,
                              `Subcategory: ${label}`
                            );
                          }}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer snap-start border ${
                            selectedSubcategory.toLowerCase() === sub.toLowerCase()
                              ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center space-x-3 shrink-0 w-full lg:w-auto justify-between lg:justify-end">
                    <span className="text-xs font-bold text-slate-500 hidden sm:inline">
                      <span className="text-emerald-700 font-extrabold">{lang === "bn" ? cat.nameBn : cat.nameEn}: </span>
                      {lang === "bn" ? `${sortedProducts.length}টি পণ্য` : `${sortedProducts.length} items`}
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-slate-400 font-bold whitespace-nowrap">
                        {lang === "bn" ? "সাজান:" : "Sort:"}
                      </span>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="p-1.5 px-2.5 text-xs bg-white border border-slate-200 rounded-xl font-bold outline-none text-slate-700 cursor-pointer hover:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition shadow-2xs"
                      >
                        <option value="default">{lang === "bn" ? "ডিফল্ট / মেনু ক্রম" : "Default / Menu Order"}</option>
                        <option value="price-low">{lang === "bn" ? "মূল্য: কম থেকে বেশি" : "Price: Low to High"}</option>
                        <option value="price-high">{lang === "bn" ? "মূল্য: বেশি থেকে কম" : "Price: High to Low"}</option>
                        <option value="rating">{lang === "bn" ? "জনপ্রিয়তা / রেটিং" : "Popularity / Star Rating"}</option>
                        <option value="discount">{lang === "bn" ? "সেরা ছাড় / ডিসকাউন্ট" : "Biggest Savings / Discount"}</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Loading Skeleton */}
                {loadingProducts && (
                  <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mt-6">
                    {Array.from({ length: 9 }).map((_, i) => (
                      <div key={i} className={`bg-white rounded-2xl border border-slate-100 p-2 sm:p-2.5 animate-pulse shadow-2xs ${i === 8 ? "md:hidden" : ""}`}>
                        <div className="w-full aspect-[4/3] bg-slate-100 rounded-xl mb-2"></div>
                        <div className="h-2.5 w-3/4 bg-slate-100 rounded mb-1"></div>
                        <div className="h-2 w-1/2 bg-slate-100 rounded mb-2"></div>
                        <div className="h-6 w-full bg-slate-100 rounded"></div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Empty list search warning */}
                {!loadingProducts && sortedProducts.length === 0 && (
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

                {/* Products Display: Grouped by section headings for Restaurant and Groceries, or standard grid for other categories */}
                {!loadingProducts && sortedProducts.length > 0 && (
                  <>
                    {isSectionedCategory && sortBy === "default" && selectedSubcategory === "all" ? (
                      // Section-wise separated view for Restaurant, Grocery, & Mobile Zone categories
                      <div className="space-y-7 mt-3">
                        {subcategories
                          .filter(sub => sub !== "all")
                          .map((secName) => {
                            const secProducts = sortedProducts.filter(p => {
                              if (isGroceryCat) {
                                const effSub = getResolvedGrocerySubcategory(p.id, p.nameBn, p.nameEn, p.subcategory, p.category);
                                return effSub === secName;
                              }
                              if (isMobileZoneCat) {
                                return (p.subcategory || "").toLowerCase() === secName.toLowerCase();
                              }
                              return p.subcategory === secName;
                            });
                            if (secProducts.length === 0) return null;

                            const getMobileBrandHeader = (brandKey: string) => {
                              const k = brandKey.toLowerCase();
                              if (k === "vivo") {
                                return {
                                  title: lang === "bn" ? "Vivo (ভিভো) অফিসিয়াল স্মার্টফোন" : "Vivo Official Smartphones",
                                  tagline: lang === "bn" ? "অরা লাইট ক্যামেরা • স্লিম ডিজাইন • লং লাস্টিং ব্যাটারি" : "Aura Light Portrait • Ultra Slim • Long Battery",
                                  pill: "vivo",
                                  pillBg: "bg-blue-600 text-white",
                                  warranty: lang === "bn" ? "১ বছরের ব্র্যান্ড ওয়ারেন্টি" : "1-Year Official Warranty"
                                };
                              }
                              if (k === "redmi") {
                                return {
                                  title: lang === "bn" ? "Redmi (রেডমি / শাওমি) অফিসিয়াল স্মার্টফোন" : "Redmi / Xiaomi Official Smartphones",
                                  tagline: lang === "bn" ? "টার্বো চার্জিং • হাই-রেজোলিউশন ক্যামেরা • পাওয়ারফুল প্রসেসর" : "Turbo Fast Charging • Ultra Clear Camera • Power Engine",
                                  pill: "REDMI",
                                  pillBg: "bg-orange-600 text-white",
                                  warranty: lang === "bn" ? "১ বছরের ব্র্যান্ড ওয়ারেন্টি" : "1-Year Official Warranty"
                                };
                              }
                              if (k === "infinix") {
                                return {
                                  title: lang === "bn" ? "Infinix (ইনফিনিক্স) স্মার্টফোন ও ট্যাবলেট" : "Infinix Official Smartphones & Tablets",
                                  tagline: lang === "bn" ? "বিগ ডিসপ্লে • গেমিং পাওয়ার • বাজেট ফ্রেন্ডলি ফাস্ট চার্জিং" : "Huge Display • Extreme Gaming • Rapid Charge",
                                  pill: "Infinix",
                                  pillBg: "bg-emerald-600 text-white",
                                  warranty: lang === "bn" ? "১ বছরের ব্র্যান্ড ওয়ারেন্টি" : "1-Year Official Warranty"
                                };
                              }
                              return null;
                            };

                            const brandInfo = isMobileZoneCat ? getMobileBrandHeader(secName) : null;

                            return (
                              <div key={secName} className="bg-slate-50/40 rounded-2xl p-2.5 sm:p-3.5 border border-slate-100">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3 pb-2 border-b border-emerald-500/20 px-1">
                                  <div className="flex items-center gap-2.5 flex-wrap">
                                    {brandInfo ? (
                                      <span className={`px-2.5 py-0.5 rounded-lg text-xs font-black tracking-wider uppercase shadow-2xs ${brandInfo.pillBg}`}>
                                        {brandInfo.pill}
                                      </span>
                                    ) : (
                                      <span className="w-2 sm:w-2.5 h-4 sm:h-5 bg-emerald-600 rounded-xs"></span>
                                    )}
                                    <div>
                                      <h3 className="text-xs sm:text-sm md:text-base font-black text-slate-800 tracking-wide">
                                        {brandInfo ? brandInfo.title : secName}
                                      </h3>
                                      {brandInfo && (
                                        <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
                                          {brandInfo.tagline}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                                    {brandInfo && (
                                      <span className="text-[9.5px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-full">
                                        ✓ {brandInfo.warranty}
                                      </span>
                                    )}
                                    <span className="text-[10px] sm:text-[11px] font-extrabold text-emerald-800 bg-white border border-emerald-200/80 shadow-2xs px-2.5 py-0.5 rounded-full">
                                      {secProducts.length} {lang === "bn" ? (isMobileZoneCat ? "মডেল" : "আইটেম") : (isMobileZoneCat ? "models" : "items")}
                                    </span>
                                  </div>
                                </div>
                                <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
                                  {secProducts.map((product) => (
                                    <ProductCard
                                      key={product.id}
                                      product={product}
                                      lang={lang}
                                      fmtNum={fmtNum}
                                      wishlist={wishlist}
                                      toggleWishlist={toggleWishlist}
                                      cart={cart}
                                      addToCart={addToCart}
                                      updateCartQuantity={updateCartQuantity}
                                      removeFromCart={removeFromCart}
                                      handleBuyNow={handleBuyNow}
                                      openQuickView={openQuickView}
                                      handleProductImgError={handleProductImgError}
                                    />
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    ) : isSectionedCategory && sortBy === "default" && selectedSubcategory !== "all" ? (
                      // Single selected section view for Restaurant, Grocery, & Mobile Zone categories
                      (() => {
                        const getSingleBrandHeader = (brandKey: string) => {
                          const k = brandKey.toLowerCase();
                          if (k === "vivo") {
                            return {
                              title: lang === "bn" ? "Vivo (ভিভো) অফিসিয়াল স্মার্টফোন" : "Vivo Official Smartphones",
                              tagline: lang === "bn" ? "অরা লাইট ক্যামেরা • স্লিম ডিজাইন • লং লাস্টিং ব্যাটারি" : "Aura Light Portrait • Ultra Slim • Long Battery",
                              pill: "vivo",
                              pillBg: "bg-blue-600 text-white",
                              warranty: lang === "bn" ? "১ বছরের ব্র্যান্ড ওয়ারেন্টি" : "1-Year Official Warranty"
                            };
                          }
                          if (k === "redmi") {
                            return {
                              title: lang === "bn" ? "Redmi (রেডমি / শাওমি) অফিসিয়াল স্মার্টফোন" : "Redmi / Xiaomi Official Smartphones",
                              tagline: lang === "bn" ? "টার্বো চার্জিং • হাই-রেজোলিউশন ক্যামেরা • পাওয়ারফুল প্রসেসর" : "Turbo Fast Charging • Ultra Clear Camera • Power Engine",
                              pill: "REDMI",
                              pillBg: "bg-orange-600 text-white",
                              warranty: lang === "bn" ? "১ বছরের ব্র্যান্ড ওয়ারেন্টি" : "1-Year Official Warranty"
                            };
                          }
                          if (k === "infinix") {
                            return {
                              title: lang === "bn" ? "Infinix (ইনফিনিক্স) স্মার্টফোন ও ট্যাবলেট" : "Infinix Official Smartphones & Tablets",
                              tagline: lang === "bn" ? "বিগ ডিসপ্লে • গেমিং পাওয়ার • বাজেট ফ্রেন্ডলি ফাস্ট চার্জিং" : "Huge Display • Extreme Gaming • Rapid Charge",
                              pill: "Infinix",
                              pillBg: "bg-emerald-600 text-white",
                              warranty: lang === "bn" ? "১ বছরের ব্র্যান্ড ওয়ারেন্টি" : "1-Year Official Warranty"
                            };
                          }
                          return null;
                        };
                        const brandInfo = isMobileZoneCat ? getSingleBrandHeader(selectedSubcategory) : null;
                        return (
                          <div className="mt-3 bg-slate-50/40 rounded-2xl p-2.5 sm:p-3.5 border border-slate-100">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3 pb-2 border-b border-emerald-500/20 px-1">
                              <div className="flex items-center gap-2.5 flex-wrap">
                                {brandInfo ? (
                                  <span className={`px-2.5 py-0.5 rounded-lg text-xs font-black tracking-wider uppercase shadow-2xs ${brandInfo.pillBg}`}>
                                    {brandInfo.pill}
                                  </span>
                                ) : (
                                  <span className="w-2 sm:w-2.5 h-4 sm:h-5 bg-emerald-600 rounded-xs"></span>
                                )}
                                <div>
                                  <h3 className="text-xs sm:text-sm md:text-base font-black text-slate-800 tracking-wide">
                                    {brandInfo ? brandInfo.title : selectedSubcategory}
                                  </h3>
                                  {brandInfo && (
                                    <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
                                      {brandInfo.tagline}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                                {brandInfo && (
                                  <span className="text-[9.5px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-full">
                                    ✓ {brandInfo.warranty}
                                  </span>
                                )}
                                <span className="text-[10px] sm:text-[11px] font-extrabold text-emerald-800 bg-white border border-emerald-200/80 shadow-2xs px-2.5 py-0.5 rounded-full">
                                  {sortedProducts.length} {lang === "bn" ? (isMobileZoneCat ? "মডেল" : "আইটেম") : (isMobileZoneCat ? "models" : "items")}
                                </span>
                              </div>
                            </div>
                            <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
                              {sortedProducts.map((product) => (
                                <ProductCard
                                  key={product.id}
                                  product={product}
                                  lang={lang}
                                  fmtNum={fmtNum}
                                  wishlist={wishlist}
                                  toggleWishlist={toggleWishlist}
                                  cart={cart}
                                  addToCart={addToCart}
                                  updateCartQuantity={updateCartQuantity}
                                  removeFromCart={removeFromCart}
                                  handleBuyNow={handleBuyNow}
                                  openQuickView={openQuickView}
                                  handleProductImgError={handleProductImgError}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      // Standard grid view for other categories or sorted list
                      <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mt-5">
                        {sortedProducts.map((product) => (
                          <ProductCard
                            key={product.id}
                            product={product}
                            lang={lang}
                            fmtNum={fmtNum}
                            wishlist={wishlist}
                            toggleWishlist={toggleWishlist}
                            cart={cart}
                            addToCart={addToCart}
                            updateCartQuantity={updateCartQuantity}
                            removeFromCart={removeFromCart}
                            handleBuyNow={handleBuyNow}
                            openQuickView={openQuickView}
                            handleProductImgError={handleProductImgError}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* ================= RECENTLY VIEWED (DYNAMIC FEED) ================= */}
      {(homeConfig?.sectionVisibility?.showRecentlyViewed !== false && recentlyViewed.length > 0) && (
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
                <img src={product.image || product.imageUrl || SAFE_PRODUCT_PLACEHOLDER} className="w-12 h-12 object-cover rounded-lg shrink-0 bg-slate-50" onError={handleProductImgError} />
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-800 truncate">{lang === "bn" ? product.nameBn : product.nameEn}</h4>
                  <p className="text-[10px] font-bold text-slate-700 bg-slate-100 inline-block px-1.5 py-0.5 rounded border border-slate-200/80 mt-0.5">
                    {resolveProductDisplayUnit(product, lang)}
                  </p>
                  <p className="text-xs font-black text-emerald-600 mt-0.5">৳{fmtNum(product.price)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ================= WHY CHOOSE US (EXACT MATCH TO REFERENCE DESIGN - COMPACT 50% HEIGHT) ================= */}
      {homeConfig?.sectionVisibility?.showWhyChooseUs !== false && (
      <section className="max-w-7xl mx-auto px-3 sm:px-4 mt-1.5 sm:mt-2">
        <div className="bg-white rounded-xl md:rounded-2xl border border-slate-200/80 shadow-[0_1px_4px_rgba(0,0,0,0.02)] py-1.5 sm:py-2 px-2 sm:px-3">
          {/* Section Header with Leaf Accents */}
          <div className="flex items-center justify-center gap-1 sm:gap-1.5 mb-1">
            {/* Left Leaf Ornament */}
            <span className="flex items-center gap-0.5 text-emerald-500 select-none scale-75">
              <span className="w-1 h-2 bg-emerald-500 rounded-full rotate-[-45deg] inline-block"></span>
              <span className="w-1.5 h-1 bg-emerald-500 rounded-full inline-block"></span>
              <span className="w-1 h-2 bg-emerald-500 rounded-full rotate-[45deg] inline-block"></span>
            </span>

            <h3 className="text-xs sm:text-sm font-black text-[#132a45] tracking-tight text-center leading-none">
              {lang === "bn" 
                ? (homeConfig?.whyChooseUs?.titleBn || "কেন আমরাই সেরা অনলাইন কাচা বাজার?") 
                : (homeConfig?.whyChooseUs?.titleEn || "Why Choose Kacha Bazar Grocery?")}
            </h3>

            {/* Right Leaf Ornament */}
            <span className="flex items-center gap-0.5 text-emerald-500 select-none scale-75">
              <span className="w-1 h-2 bg-emerald-500 rounded-full rotate-[-45deg] inline-block"></span>
              <span className="w-1.5 h-1 bg-emerald-500 rounded-full inline-block"></span>
              <span className="w-1 h-2 bg-emerald-500 rounded-full rotate-[45deg] inline-block"></span>
            </span>
          </div>

          {/* 4 Feature Columns with Dashed Separators */}
          <div className="grid grid-cols-2 md:grid-cols-4 text-center">
            {/* Column 1: স্বাস্থ্যকর ও প্রাকৃতিক পণ্য */}
            <div className="flex flex-col items-center justify-start py-0.5 px-1 sm:px-1.5 border-r border-b md:border-b-0 border-dashed border-slate-200">
              <div className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 rounded-full bg-[#edf8f0] flex items-center justify-center mb-0.5 shrink-0">
                <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-emerald-600" viewBox="0 0 36 36" fill="currentColor">
                  <path d="M18 29V18M18 18C17.5 13 13 8.5 6 8c0 7 3.8 11.5 12 10zm0 0c.5-5 5-10 12-10 0 7-4.5 11.5-12 10z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
                </svg>
              </div>
              <h4 className="text-[10px] sm:text-[11px] md:text-xs font-bold text-[#132a45] leading-tight">
                {lang === "bn" ? "স্বাস্থ্যকর ও প্রাকৃতিক পণ্য" : "Healthy & Natural Products"}
              </h4>
              <p className="text-[8.5px] sm:text-[9.5px] md:text-[10px] text-slate-500 font-medium leading-tight max-w-[160px] mx-auto">
                {lang === "bn" ? "সতেজ পণ্য ও প্রাকৃতিজ উপাদান নিশ্চিত" : "Fresh products & natural ingredients guaranteed"}
              </p>
            </div>

            {/* Column 2: ⚡ ১ ঘণ্টার মধ্যে ডেলিভারি */}
            <div className="flex flex-col items-center justify-start py-0.5 px-1 sm:px-1.5 border-b md:border-b-0 md:border-r border-dashed border-slate-200">
              <div className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 rounded-full bg-[#fff8eb] flex items-center justify-center mb-0.5 shrink-0">
                <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-amber-500 fill-amber-500" />
              </div>
              <h4 className="text-[10px] sm:text-[11px] md:text-xs font-bold text-[#132a45] leading-tight">
                <span className="text-amber-500 mr-0.5">⚡</span>
                {lang === "bn" ? "১ ঘণ্টার মধ্যে ডেলিভারি" : "1-Hour Delivery"}
              </h4>
              <p className="text-[8.5px] sm:text-[9.5px] md:text-[10px] text-slate-500 font-medium leading-tight max-w-[160px] mx-auto">
                {lang === "bn" ? "দ্রুত ডেলিভারিতে সময় বাঁচান" : "Save time with fast express delivery"}
              </p>
            </div>

            {/* Column 3: পরিবেশবান্ধব প্যাকেজিং */}
            <div className="flex flex-col items-center justify-start py-0.5 px-1 sm:px-1.5 border-r border-dashed border-slate-200">
              <div className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 rounded-full bg-[#edf8f0] flex items-center justify-center mb-0.5 shrink-0">
                <Truck className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-emerald-600 fill-emerald-600" />
              </div>
              <h4 className="text-[10px] sm:text-[11px] md:text-xs font-bold text-[#132a45] leading-tight">
                {lang === "bn" ? "পরিবেশবান্ধব প্যাকেজিং" : "Eco-Friendly Packaging"}
              </h4>
              <p className="text-[8.5px] sm:text-[9.5px] md:text-[10px] text-slate-500 font-medium leading-tight max-w-[160px] mx-auto">
                {lang === "bn" ? "পরিবেশ সুরক্ষায় আমরা প্রতিশ্রুতিবদ্ধ" : "Committed to protecting our environment"}
              </p>
            </div>

            {/* Column 4: সরাসরি কৃষকের কাছ থেকে */}
            <div className="flex flex-col items-center justify-start py-0.5 px-1 sm:px-1.5">
              <div className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 rounded-full bg-[#edf8f0] flex items-center justify-center mb-0.5 shrink-0">
                <User className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-emerald-600 fill-emerald-600" />
              </div>
              <h4 className="text-[10px] sm:text-[11px] md:text-xs font-bold text-[#132a45] leading-tight">
                {lang === "bn" ? "সরাসরি কৃষকের কাছ থেকে" : "Directly From Farmers"}
              </h4>
              <p className="text-[8.5px] sm:text-[9.5px] md:text-[10px] text-slate-500 font-medium leading-tight max-w-[160px] mx-auto">
                {lang === "bn" ? "কৃষকের ন্যায্যমূল্যে পণ্য ও প্রাপ্তি নিশ্চিত" : "Ensuring fair farmer prices & authenticity"}
              </p>
            </div>
          </div>
        </div>
      </section>
      )}



      {/* ================= BEAUTIFUL FOOTER (COMPACT 40% REDUCED) ================= */}
      {homeConfig?.sectionVisibility?.showFooter !== false && (
      <footer className="bg-slate-950 text-slate-400 pt-3 pb-2 sm:pt-4 sm:pb-3 border-t border-slate-800 text-[10px] sm:text-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 mb-2.5 items-start">
          
          {/* Leftmost Kacha Bazar Branding Area */}
          <div className="md:col-span-5 lg:col-span-5 space-y-1">
            <div className="flex items-center space-x-1.5 text-white">
              {logoImg ? (
                <img 
                  src={logoImg} 
                  alt="Kacha Bazar Logo" 
                  className="w-5 h-5 sm:w-6 sm:h-6 object-contain rounded-full border border-slate-700 bg-white"
                  referrerPolicy="no-referrer"
                />
              ) : null}
              <span className="text-sm sm:text-base font-black tracking-tight">{lang === "bn" ? "কাচা বাজার" : "Kacha Bazar"}</span>
            </div>
            <p className="leading-snug text-slate-400 text-[9.5px] sm:text-[10.5px] line-clamp-2">
              {lang === "bn" 
                ? (homeConfig?.footerConfig?.aboutBn || "আমাদের মিশন হলো সর্বোচ্চ তাজা ও বিষমুক্ত সবজি, তাজা মাছ, মাংস ও মুদি পণ্য সরাসরি কৃষকদের মাঠ থেকে তুলে গ্রাহকদের ঘরের দরজায় পৌঁছে দেওয়া।") 
                : (homeConfig?.footerConfig?.aboutEn || "We are committed to delivering 100% formalin-free, organic, and daily harvested food items direct-from-farmers to your kitchen.")}
            </p>
            <div className="space-y-0.5 text-[9.5px] sm:text-[10.5px] pt-0.5">
              <p className="font-medium text-slate-300 flex items-center gap-1.5">
                <Mail className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="text-slate-400">{lang === "bn" ? "ইমেইল:" : "Email:"}</span>
                <a href={`mailto:${homeConfig?.footerConfig?.email || "sarkarmdanik14@gmail.com"}`} className="hover:text-emerald-400 transition truncate underline">
                  {homeConfig?.footerConfig?.email || "sarkarmdanik14@gmail.com"}
                </a>
              </p>
              <p className="font-medium text-slate-300 flex items-center gap-1.5">
                <Phone className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="text-slate-400">{lang === "bn" ? "হটলাইন:" : "Hotline:"}</span>
                <a href={`tel:${homeConfig?.footerConfig?.phone || "+8801615581975"}`} className="hover:text-emerald-400 transition font-bold text-white">
                  {homeConfig?.footerConfig?.phone || "+8801615581975"}
                </a>
              </p>
              <div className="font-medium text-slate-300 flex items-center gap-1.5 flex-wrap">
                <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="text-slate-400">{lang === "bn" ? "ঠিকানা:" : "Address:"}</span>
                <span>
                  {lang === "bn" 
                    ? (homeConfig?.footerConfig?.addressBn || "চাঁচকৈড় বাজার, গুরুদাশপুর, নাটোর") 
                    : (homeConfig?.footerConfig?.addressEn || "Chanchkoir Bazar, Gurudaspur, Natore")}
                </span>
                <a 
                  href={homeConfig?.footerConfig?.mapsUrl || "https://www.google.com/maps/search/?api=1&query=Chanchkoir+Bazar,+Gurudaspur,+Natore,+Bangladesh"} 
                  target="_blank" 
                  rel="noreferrer"
                  className="inline-flex items-center gap-0.5 bg-emerald-900/60 hover:bg-emerald-800 border border-emerald-600/60 text-emerald-300 hover:text-white font-bold text-[8.5px] px-1 py-0.2 rounded transition ml-0.5"
                >
                  <span>{lang === "bn" ? "ম্যাপ" : "Map"}</span>
                  <ExternalLink className="w-2 h-2" />
                </a>
              </div>
            </div>
          </div>

          {/* Leadership Section */}
          <div className="md:col-span-7 lg:col-span-7 bg-slate-900/70 border border-slate-800 rounded-lg p-1.5 sm:p-2">
            <div className="flex items-center gap-1 mb-1 pb-1 border-b border-slate-800/80">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <h3 className="text-[9.5px] sm:text-[10.5px] font-bold text-white uppercase tracking-wider">
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
                  badgeColor: "bg-amber-500/15 text-amber-300 border-amber-500/30",
                  borderColor: "border-amber-500/70",
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
                  badgeColor: "bg-sky-500/15 text-sky-300 border-sky-500/30",
                  borderColor: "border-sky-500/70",
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
                  badgeColor: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
                  borderColor: "border-emerald-500/80",
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
                  badgeColor: m.badgeColor || "bg-purple-500/15 text-purple-300 border-purple-500/30",
                  borderColor: m.borderColor || "border-purple-500/70",
                  iconBg: m.iconBg || "bg-purple-600"
                }))
              ];

              return (
                <div className={`grid grid-cols-3 ${allMembers.length <= 3 ? "sm:grid-cols-3" : "sm:grid-cols-3 md:grid-cols-4"} gap-1 sm:gap-1.5`}>
                  {allMembers.map((member) => (
                    <div key={member.id} className="bg-slate-950/70 border border-slate-800 hover:border-emerald-500/40 transition rounded-md p-1 sm:p-1.5 text-center flex flex-col items-center justify-between min-w-0">
                      <div className="relative mb-0.5">
                        <img 
                          src={member.image} 
                          alt={`${member.nameEn} - ${member.roleEn}`} 
                          className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full object-cover border ${member.borderColor} shadow-2xs`}
                          referrerPolicy="no-referrer"
                        />
                        <span className={`absolute -bottom-0.5 -right-0.5 ${member.iconBg} text-white p-0.5 rounded-full border border-slate-900 shadow-2xs`}>
                          <User className="w-1.5 h-1.5" />
                        </span>
                      </div>
                      <span className={`text-[6.5px] sm:text-[7.5px] font-bold uppercase tracking-wider px-1 py-0.2 rounded border mb-0.5 max-w-full truncate ${member.badgeColor}`}>
                        {lang === "bn" ? member.roleBn : member.roleEn}
                      </span>
                      <h4 className="text-[7.5px] sm:text-[9px] font-bold text-white leading-tight uppercase truncate w-full">
                        {lang === "bn" ? member.nameBn : member.nameEn}
                      </h4>
                      <p className="text-[6.5px] sm:text-[7.5px] text-slate-400 mt-0.5 leading-tight truncate w-full">{lang === "bn" ? member.titleBn : member.titleEn}</p>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

        </div>

        {/* Bottom Bar: Copyright, Language, Portals & Credits */}
        <div className="max-w-7xl mx-auto px-3 sm:px-4 pt-2 sm:pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-center text-[10px] sm:text-[11px]">
          {/* Copyright */}
          <span className="text-slate-500 font-medium">
            © {new Date().getFullYear()} {lang === "bn" ? "কাচা বাজার লিমিটেড।" : "Kacha Bazar Ltd."}
          </span>

          {/* Smart Language Switcher Pill */}
          <div className="inline-flex items-center bg-slate-900 border border-slate-800 rounded-full p-0.5 shadow-2xs" id="footer-lang-switcher">
            <span className="text-[9px] text-slate-400 pl-1.5 pr-0.5 flex items-center gap-0.5 font-semibold">
              <Globe className="w-2.5 h-2.5 text-emerald-400" />
              <span className="hidden xs:inline">{lang === "bn" ? "ভাষা" : "Lang"}</span>
            </span>
            <button 
              onClick={() => setLang("bn")}
              className={`px-1.5 py-0.2 rounded-full font-bold text-[9.5px] sm:text-[10px] transition-all cursor-pointer ${
                lang === "bn" 
                  ? "bg-emerald-600 text-white shadow-xs" 
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="বাংলা নির্বাচন করুন"
            >
              বাংলা
            </button>
            <button 
              onClick={() => setLang("en")}
              className={`px-1.5 py-0.2 rounded-full font-bold text-[9.5px] sm:text-[10px] transition-all cursor-pointer ${
                lang === "en" 
                  ? "bg-emerald-600 text-white shadow-xs" 
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Select English"
            >
              English
            </button>
          </div>

          {/* Portal Navigation Badges */}
          <div className="flex items-center gap-1 text-[9.5px] sm:text-[10px]">
            <a 
              href="?panel=partner" 
              onClick={(e) => {
                e.preventDefault();
                setForcedPortalRole("partner");
                setShowPortalModal(true);
                window.history.pushState({}, "", "?panel=partner");
              }}
              className="px-1.5 py-0.2 rounded-md bg-slate-900/90 hover:bg-emerald-950/70 border border-slate-800 hover:border-emerald-700/60 text-slate-400 hover:text-emerald-300 transition-all cursor-pointer flex items-center gap-1"
            >
              <span className="text-[10px]">🏪</span>
              <span>{lang === "bn" ? "পার্টনার শপ" : "Partner Shop"}</span>
            </a>
            <a 
              href="?panel=seller" 
              onClick={(e) => {
                e.preventDefault();
                setForcedPortalRole("seller");
                setShowPortalModal(true);
                window.history.pushState({}, "", "?panel=seller");
              }}
              className="px-1.5 py-0.2 rounded-md bg-slate-900/90 hover:bg-emerald-950/70 border border-slate-800 hover:border-emerald-700/60 text-slate-400 hover:text-emerald-300 transition-all cursor-pointer"
            >
              {lang === "bn" ? "বিক্রেতা" : "Seller"}
            </a>
            <a 
              href="?panel=rider" 
              onClick={(e) => {
                e.preventDefault();
                setForcedPortalRole("rider");
                setShowPortalModal(true);
                window.history.pushState({}, "", "?panel=rider");
              }}
              className="px-1.5 py-0.2 rounded-md bg-slate-900/90 hover:bg-emerald-950/70 border border-slate-800 hover:border-emerald-700/60 text-slate-400 hover:text-emerald-300 transition-all cursor-pointer"
            >
              {lang === "bn" ? "রাইডার" : "Rider"}
            </a>
            <a 
              href="?panel=admin" 
              onClick={(e) => {
                e.preventDefault();
                setForcedPortalRole("admin");
                setShowPortalModal(true);
                window.history.pushState({}, "", "?panel=admin");
              }}
              className="px-1.5 py-0.2 rounded-md bg-slate-900/90 hover:bg-emerald-950/70 border border-slate-800 hover:border-emerald-700/60 text-slate-400 hover:text-emerald-300 transition-all cursor-pointer"
            >
              {lang === "bn" ? "এডমিন" : "Admin"}
            </a>
            <button
              type="button"
              onClick={() => openPWAQRCodeModal()}
              className="px-1.5 py-0.2 rounded-md bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 hover:text-emerald-200 transition-all cursor-pointer flex items-center gap-0.5 font-bold"
            >
              <QrCode className="w-2.5 h-2.5" />
              <span>{lang === "bn" ? "অ্যাপ QR" : "App QR"}</span>
            </button>
          </div>
        </div>
      </footer>
      )}

      {/* ================= FIXED VERTICAL FLOATING CONTACT OVERLAY ================= */}
      {!showPortalModal && (
        <FloatingContactOverlay 
          hotlinePhone={
            globalSettings?.hotline || 
            "01615581975"
          }
          whatsappNumber={
            globalSettings?.whatsapp || 
            "01615581975"
          }
          facebookUrl={
            (globalSettings?.facebookUrl && globalSettings.facebookUrl !== "https://facebook.com")
              ? globalSettings.facebookUrl
              : "https://web.facebook.com/profile.php?id=61594593267528"
          }
          lang={lang}
        />
      )}

      {/* ================= COMPACT FLOATING CHECKOUT BUTTON ================= */}
      {cart.length > 0 && !showCart && !showPortalModal && !showLiveChat && (
        <button 
          onClick={() => setShowCart(true)}
          className="fixed bottom-3 right-3 sm:bottom-4 sm:right-4 z-40 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs sm:text-sm py-1.5 px-3 sm:py-2 sm:px-3.5 rounded-full shadow-lg shadow-slate-950/30 border border-emerald-400/40 flex items-center gap-1.5 sm:gap-2 cursor-pointer transition-all duration-200"
          title={lang === "bn" ? "কার্ট ও চেকআউট দেখুন" : "View Cart & Checkout"}
        >
          <span className="bg-emerald-900/80 text-emerald-200 text-[10px] sm:text-xs font-black px-1.5 py-0.5 rounded-full leading-none">
            {fmtNum(cart.reduce((s, i) => s + i.quantity, 0))}
          </span>
          <span className="text-xs sm:text-sm font-black text-emerald-100">
            ৳{fmtNum(subtotal)}
          </span>
          <span className="text-xs sm:text-sm font-bold text-white border-l border-emerald-500/50 pl-1.5 sm:pl-2">
            {lang === "bn" ? "চেকআউট" : "Checkout"}
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-white shrink-0" />
        </button>
      )}

      {/* ================= VOICE SEARCH SIMULATION MODAL ================= */}
      {voiceSearching && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="max-h-[85vh] sm:max-h-[90vh] flex flex-col w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden text-center p-6 border border-emerald-50">
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
            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-center">
              <button 
                onClick={() => setVoiceSearching(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                {lang === "bn" ? "বাতিল" : "Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= CART DRAWER SHEET ================= */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity duration-300">
          
          {/* Backing */}
          <div onClick={() => setShowCart(false)} className="flex-1 cursor-pointer"></div>
          
          {/* Drawer Panel */}
          <div className="w-full max-w-md bg-white h-full max-h-[100dvh] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
            
            {/* Drawer Header (Fixed top) */}
            <div className="flex justify-between items-center px-4 py-3 sm:px-5 sm:py-3.5 border-b border-slate-100 bg-white shrink-0">
              <div className="flex items-center space-x-2">
                <ShoppingCart className="w-4.5 h-4.5 text-emerald-600" />
                <h3 className="text-sm sm:text-base font-bold text-slate-800">{lang === "bn" ? "আমার শপিং কার্ট" : "My Shopping Cart"}</h3>
                <span className="bg-emerald-100 text-emerald-700 text-[10px] sm:text-xs font-extrabold px-2 py-0.5 rounded-full leading-none">
                  {fmtNum(cart.reduce((s, i) => s + i.quantity, 0))}
                </span>
              </div>
              <button 
                onClick={() => setShowCart(false)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Cart Items List (Dedicated Scrollable Area) */}
            <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-4 py-2 space-y-2 overscroll-contain">
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-500">{lang === "bn" ? "কার্টটি সম্পূর্ণ খালি!" : "Your cart is completely empty!"}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{lang === "bn" ? "পছন্দসই তাজা পণ্যগুলো কার্টে যুক্ত করুন" : "Browse fresh goods to add them"}</p>
                </div>
              ) : (
                cart.map((item, idx) => {
                  return (
                    <CartItemRow
                      key={`cart_item_${item.product.id}_${idx}`}
                      item={item}
                      itemIndex={idx}
                      lang={lang}
                      fmtNum={fmtNum}
                      onUpdateOption={updateCartItemOption}
                      onRemove={removeFromCart}
                      handleProductImgError={handleProductImgError}
                    />
                  );
                })
              )}
            </div>

            {/* Cart Footer Action Block with Bill Breakdown & Checkout (Fixed Bottom Section) */}
            {cart.length > 0 && (
              <div className="border-t border-slate-200 bg-white px-3 sm:px-4 py-2.5 shrink-0 shadow-[0_-4px_12px_rgba(0,0,0,0.03)] space-y-2">
                
                {/* Bill Breakdown Summary Box */}
                <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-2 sm:p-2.5 space-y-1 text-xs">
                  <div className="flex justify-between text-slate-600 text-[11px] sm:text-xs">
                    <span>{lang === "bn" ? "পণ্যের মোট মূল্য:" : "Subtotal:"}</span>
                    <span className="font-bold text-slate-800">৳{fmtNum(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 text-[11px] sm:text-xs">
                    <span>{lang === "bn" ? "ডেলিভারি চার্জ:" : "Delivery Fee:"}</span>
                    <span className="font-bold text-slate-800">
                      {deliveryFee === 0 ? (
                        <span className="text-emerald-600 font-bold">{lang === "bn" ? "ফ্রি" : "Free"}</span>
                      ) : (
                        `৳${fmtNum(deliveryFee)}`
                      )}
                    </span>
                  </div>
                  {discountAmt > 0 && (
                    <div className="flex justify-between text-emerald-600 font-bold text-[11px] sm:text-xs">
                      <span>{lang === "bn" ? "ডিসকাউন্ট:" : "Discount:"}</span>
                      <span>-৳{fmtNum(discountAmt)}</span>
                    </div>
                  )}
                  <div className="border-t border-slate-200 pt-1 flex justify-between items-center">
                    <span className="font-extrabold text-slate-800 text-xs sm:text-sm">{lang === "bn" ? "সর্বমোট বিল:" : "Grand Total:"}</span>
                    <span className="font-black text-sm sm:text-base text-emerald-600">৳{fmtNum(grandTotal)}</span>
                  </div>
                </div>

                {hasInsufficientCartStock && (
                  <div className="p-1.5 bg-rose-50 border border-rose-200 rounded-lg text-center">
                    <p className="text-xs font-bold text-rose-600">
                      ⚠️ {lang === "bn" ? "পর্যাপ্ত স্টক নেই" : "Insufficient Stock"}
                    </p>
                    <p className="text-[10px] text-rose-500">
                      {lang === "bn" ? "কার্টের পণ্যের সঠিক ওজন বা পরিমাণ সিলেক্ট করুন।" : "Please adjust weight or quantity to proceed to checkout."}
                    </p>
                  </div>
                )}

                {hasInvalidCustomWeight && (
                  <div className="p-1.5 bg-rose-50 border border-rose-200 rounded-lg text-center">
                    <p className="text-xs font-bold text-rose-600">
                      ⚠️ {lang === "bn" ? "কার্টের পণ্যের সঠিক ওজন দিন" : "Please enter a valid weight"}
                    </p>
                    <p className="text-[10px] text-rose-500">
                      {lang === "bn" ? "ওজন বা পরিমাণ অবশ্যই ০ এর বেশি হতে হবে।" : "Weight or quantity must be greater than 0."}
                    </p>
                  </div>
                )}

                {/* 1. Checkout Button */}
                <button 
                  onClick={executeCheckout}
                  disabled={checkoutStatus === "loading" || hasInsufficientCartStock || hasInvalidCustomWeight}
                  className="w-full py-2.5 sm:py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-md shadow-emerald-100 flex items-center justify-center space-x-2 cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed active:scale-[0.99]"
                >
                  {checkoutStatus === "loading" ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>{lang === "bn" ? "অর্ডার সম্পন্ন করুন (চেকআউট)" : "Place Order & Checkout"}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

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
                      <img src={product.image || product.imageUrl || SAFE_PRODUCT_PLACEHOLDER} className="w-12 h-12 object-cover rounded-lg shrink-0 bg-slate-50" onError={handleProductImgError} />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-slate-800 truncate">{lang === "bn" ? product.nameBn : product.nameEn}</h4>
                        <p className="text-[9.5px] font-bold text-slate-700 bg-slate-100 inline-block px-1.5 py-0.5 rounded border border-slate-200/80 mt-0.5">
                          {resolveProductDisplayUnit(product, lang)}
                        </p>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="max-h-[85vh] sm:max-h-[90vh] flex flex-col w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-250">
            
            {/* Header */}
            <div className="flex-shrink-0 p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="min-w-0 pr-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{selectedProduct.brand}</span>
                <h3 className="text-base sm:text-lg font-bold text-slate-800 leading-tight truncate">
                  {lang === "bn" ? selectedProduct.nameBn : selectedProduct.nameEn}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedProduct(null)}
                className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="overflow-y-auto flex-1 p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Product Image Panel */}
              <div className="relative">
                <img src={selectedProduct.image || (selectedProduct as any).imageUrl || SAFE_PRODUCT_PLACEHOLDER} className="w-full h-56 sm:h-72 object-cover rounded-xl shadow-inner bg-slate-50" onError={handleProductImgError} />
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

                  <div className="flex items-center gap-2 mt-2.5">
                    <span className="text-xs font-bold text-slate-500">
                      {lang === "bn" ? "পরিমাপ / ওজন:" : "Measurement / Weight:"}
                    </span>
                    <span className="inline-flex items-center text-xs font-black text-slate-800 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md shadow-2xs">
                      {resolveProductDisplayUnit(selectedProduct, lang)}
                    </span>
                  </div>

                  {/* Partner Shop Supplier Badge & Selection */}
                  {(selectedProduct.partnerShopName || (selectedProduct.availableShops && selectedProduct.availableShops.length > 0)) && (
                    <div className="mt-3 p-2.5 bg-emerald-50/80 border border-emerald-200/90 rounded-xl">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-2 min-w-0">
                          <span className="text-base shrink-0">🏪</span>
                          <div className="min-w-0">
                            <p className="text-[9.5px] text-slate-500 font-bold uppercase tracking-wider leading-none">
                              {lang === "bn" ? "সরবরাহকারী পার্টনার শপ" : "Partner Store Seller"}
                            </p>
                            <p className="text-xs font-black text-emerald-900 truncate mt-0.5">
                              {selectedProduct.partnerShopName || (lang === "bn" ? "কাচা বাজার সেন্ট্রাল শপ" : "Kacha Bazar Central Shop")}
                            </p>
                          </div>
                        </div>
                        <span className="inline-flex items-center gap-1 bg-emerald-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-xs shrink-0">
                          <span>✓</span>
                          <span>{lang === "bn" ? "ভেরিফাইড পার্টনার" : "Verified Partner"}</span>
                        </span>
                      </div>

                      {/* Multi-Partner Shop Selection Option */}
                      {selectedProduct.availableShops && selectedProduct.availableShops.length > 1 && (
                        <div className="mt-2.5 pt-2 border-t border-emerald-200/60">
                          <p className="text-[10.5px] font-bold text-slate-700 mb-1.5">
                            {lang === "bn" ? "পছন্দমতো পার্টনার শপ নির্বাচন করুন:" : "Choose your preferred Partner Shop:"}
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {selectedProduct.availableShops.map((shop) => (
                              <button
                                key={shop.shopId}
                                type="button"
                                onClick={() => {
                                  setSelectedProduct((prev) => prev ? {
                                    ...prev,
                                    partnerShopId: shop.shopId,
                                    partnerShopName: shop.shopName,
                                    price: shop.price || prev.price,
                                  } : null);
                                }}
                                className={`flex items-center justify-between p-2 rounded-lg text-xs font-semibold border transition cursor-pointer text-left ${
                                  selectedProduct.partnerShopId === shop.shopId
                                    ? "bg-white border-emerald-600 shadow-xs text-emerald-950 font-bold ring-1 ring-emerald-500"
                                    : "bg-emerald-50/40 border-emerald-200/60 hover:bg-white text-slate-700"
                                }`}
                              >
                                <div className="min-w-0 pr-1">
                                  <p className="truncate text-[11px] font-bold">{shop.shopName}</p>
                                  {shop.location && <p className="text-[9px] text-slate-400 truncate">{shop.location}</p>}
                                </div>
                                <span className="text-emerald-700 font-extrabold text-[11px] shrink-0">
                                  ৳{fmtNum(shop.price || selectedProduct.price)}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

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
                  {selectedProduct.category === "vehicles" || selectedProduct.unitBn?.includes("আলোচনা") ? (
                    <div>
                      <div className="bg-blue-50 border border-blue-200/90 p-3 rounded-xl mb-4">
                        <div className="flex items-center gap-2">
                          <Truck className="w-5 h-5 text-blue-600 shrink-0" />
                          <div>
                            <p className="text-sm font-black text-blue-900 leading-tight">
                              {lang === "bn" ? "ভাড়া: আলোচনা সাপেক্ষে" : "Fare: Negotiable on Discussion"}
                            </p>
                            <p className="text-[11px] text-blue-700 leading-tight mt-0.5">
                              {lang === "bn" 
                                ? "গন্তব্য, ভ্রমণের সময় এবং রোড ট্রিপ অনুযায়ী ভাড়া আলোচনা সাপেক্ষে নির্ধারিত হবে।" 
                                : "Fare is finalized based on distance, timing and destination."}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2.5">
                        <a 
                          href="tel:+8801615581975"
                          className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl transition shadow flex items-center justify-center space-x-2 cursor-pointer"
                        >
                          <PhoneCall className="w-4 h-4" />
                          <span>{lang === "bn" ? "সরাসরি কল করে বুকিং দিন" : "Call to Book Directly"}</span>
                        </a>
                        <a 
                          href={`https://wa.me/8801615581975?text=${encodeURIComponent(`আসসালামু আলাইকুম, আমি কাঁচা বাজার থেকে ${selectedProduct.nameBn} ভাড়ায় বুকিং করতে আগ্রহী। বিস্তারিত ও ভাড়া জানাবেন দয়া করে।`)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 py-3 px-4 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs sm:text-sm rounded-xl transition shadow flex items-center justify-center space-x-2 cursor-pointer"
                        >
                          <MessageSquare className="w-4 h-4" />
                          <span>{lang === "bn" ? "WhatsApp-এ বুকিং দিন" : "Book via WhatsApp"}</span>
                        </a>
                      </div>
                    </div>
                  ) : (
                    <>
                      {isCategoryMatch(selectedProduct.category, "mobile-zone") && (
                        <div className="mb-3.5 p-2.5 bg-indigo-50/90 border border-indigo-200/80 rounded-xl flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                            <div>
                              <p className="text-xs font-black text-indigo-900 leading-tight">
                                {lang === "bn" ? "১ বছরের অফিসিয়াল ব্র্যান্ড ওয়ারেন্টি" : "1-Year Official Brand Warranty"}
                              </p>
                              <p className="text-[10px] text-indigo-700 leading-tight mt-0.5">
                                {lang === "bn" ? "অরিজিনাল সিল প্যাক • হ্যান্ডসেট চেক করে পেমেন্ট" : "100% Factory Sealed Handset • Doorstep inspection"}
                              </p>
                            </div>
                          </div>
                          <span className="text-[9px] font-extrabold bg-indigo-600 text-white px-2 py-0.5 rounded-full shrink-0 shadow-2xs">
                            {selectedProduct.brand} Official
                          </span>
                        </div>
                      )}

                      <div className="flex items-baseline space-x-2 mb-4">
                        <span className="text-2xl font-black text-emerald-600">
                          ৳{fmtNum(typeof (selectedProductOption ? selectedProductOption.price : selectedProduct.price) === "number" ? (selectedProductOption ? selectedProductOption.price : selectedProduct.price).toLocaleString("en-IN") : (selectedProductOption ? selectedProductOption.price : selectedProduct.price))}
                        </span>
                        {selectedProduct.originalPrice && !selectedProductOption && (
                          <span className="text-sm text-slate-400 line-through">
                            ৳{fmtNum(typeof selectedProduct.originalPrice === "number" ? selectedProduct.originalPrice.toLocaleString("en-IN") : selectedProduct.originalPrice)}
                          </span>
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
                    </>
                  )}
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

            {/* Fixed Footer */}
            <div className="flex-shrink-0 p-4 border-t border-slate-100 flex flex-wrap gap-2 justify-end bg-gray-50/50">
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                {lang === "bn" ? "বন্ধ করুন" : "Close"}
              </button>
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
      {showPortalModal && (
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
      )}

      {/* ================= REAL-TIME CUSTOMER LIVE SUPPORT CHAT ================= */}
      <CustomerLiveChat 
        lang={lang} 
        onOpenPortal={() => setShowPortalModal(true)} 
        isOpen={showLiveChat}
        onToggleOpen={(open) => setShowLiveChat(open !== undefined ? open : !showLiveChat)}
      />

      {/* ================= REAL-TIME WEB VOICE CALL MODAL ================= */}
      {showVoiceCall && (
        <CustomerVoiceCallModal 
          lang={lang}
          isOpen={showVoiceCall}
          onClose={() => setShowVoiceCall(false)}
        />
      )}

      {/* ================= ABOUT US MODAL ================= */}
      {showAboutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="max-h-[85vh] sm:max-h-[90vh] flex flex-col w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden animate-in zoom-in duration-250">
            {/* Header */}
            <div className="flex-shrink-0 p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center space-x-3">
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
              <button 
                onClick={() => setShowAboutModal(false)} 
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Scrollable Body */}
            <div className="overflow-y-auto flex-1 p-6 space-y-4 text-xs text-slate-600 leading-relaxed">
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
                      <a href="tel:+8801615581975" className="text-emerald-600 hover:underline font-bold">+8801615581975</a>
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
            
            {/* Fixed Footer */}
            <div className="flex-shrink-0 p-4 border-t border-slate-100 flex flex-wrap gap-2 justify-end bg-gray-50/50">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="max-h-[85vh] sm:max-h-[90vh] flex flex-col w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden animate-in zoom-in duration-250">
            {/* Header */}
            <div className="flex-shrink-0 p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
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
              <button 
                onClick={() => setShowContactModal(false)} 
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Scrollable Body */}
            <div className="overflow-y-auto flex-1 p-6 space-y-4 text-xs text-slate-600">
              <p className="leading-relaxed">
                {lang === "bn" 
                  ? "আমাদের পণ্য বা সেবা সম্পর্কে জিজ্ঞাসা, পরামর্শ বা মতামত জানাতে নিচের কন্টাক্ট নাম্বারে সরাসরি ফোন করুন অথবা ইমেইল করুন। আমাদের কাস্টমার সার্ভিস টিম চব্বিশ ঘণ্টা আপনার সহায়তায় নিয়োজিত রয়েছে।"
                  : "For any inquiries, feedback, or concerns regarding our products or services, please call or email us directly. Our customer support representatives are available around the clock to assist you."}
              </p>
              
              <div className="bg-emerald-50/20 border border-emerald-100 rounded-xl p-4 space-y-3.5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 bg-white border border-slate-100 rounded-xl shadow-sm flex items-center space-x-3">
                    <Phone className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">{lang === "bn" ? "কল করুন" : "Call Support"}</p>
                      <a href="tel:+8801615581975" className="text-slate-800 font-extrabold hover:text-emerald-600 hover:underline text-xs">+8801615581975</a>
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
            
            {/* Fixed Footer */}
            <div className="flex-shrink-0 p-4 border-t border-slate-100 flex flex-wrap gap-2 justify-end bg-gray-50/50">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="max-h-[85vh] sm:max-h-[90vh] flex flex-col w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden animate-in zoom-in duration-250">
            {/* Header */}
            <div className="flex-shrink-0 p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
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
              <button 
                onClick={() => setShowHelpModal(false)} 
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Scrollable Body */}
            <div className="overflow-y-auto flex-1 p-6 space-y-4 text-xs text-slate-600 leading-relaxed">
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
                    <a href="tel:+8801615581975" className="text-emerald-600 hover:underline font-extrabold text-sm block mt-0.5">+8801615581975</a>
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
            
            {/* Fixed Footer */}
            <div className="flex-shrink-0 p-4 border-t border-slate-100 flex flex-wrap gap-2 justify-end bg-gray-50/50">
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

      {/* PWA App Install Banner & Prompt */}
      <PWAInstallBanner lang={lang} />

      {/* Daily Automatic Alarm & Notification System (9:00 AM & 9:00 PM) */}
      <DailyAlarmBanner lang={lang} />

    </div>
  );
}
