import React, { useState, useRef, useEffect } from "react";
import { 
  Layout, Image, Plus, Edit, Trash2, Check, X, ArrowUp, ArrowDown, 
  Eye, EyeOff, Upload, PhoneCall, Grid, Star, Smartphone, QrCode, 
  MapPin, Mail, Phone, Sparkles, RefreshCw, Award, Zap, CheckCircle, 
  Truck, Droplet, User, ExternalLink, Sliders, LayoutTemplate, Info, Save
} from "lucide-react";
import { db, doc, setDoc, getDoc, collection, getDocs } from "../../lib/firebase";

interface AdminHomePageTabProps {
  products: any[];
  categories: any[];
  lang: "bn" | "en";
  triggerToast: (bn: string, en: string) => void;
}

const DEFAULT_HERO_BANNERS = [
  {
    id: "hero-mango-fest",
    titleBn: "রাজশাহী ও চাঁপাইনবাবগঞ্জের আসল ফরমালিনমুক্ত ল্যাংড়া ও খীরসাপাত আম",
    titleEn: "Fresh Formalin-Free Mangoes Direct From Rajshahi Orchards",
    tagBn: "আমের মৌসুমী মেলা 🥭",
    tagEn: "Seasonal Mango Fest 🥭",
    bgGradient: "from-amber-600 via-orange-500 to-yellow-600",
    image: "https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=800&q=80",
    linkUrl: "",
    isActive: true
  },
  {
    id: "hero-padma-hilsha",
    titleBn: "পদ্মা ও মেঘনার ১০০% তাজা ডিমওয়ালা ইলিশ মাছ",
    titleEn: "100% Fresh Padma Hilsha Direct Fish Harvest",
    tagBn: "পদ্মার তাজা ইলিশ 🐟",
    tagEn: "Padma River Hilsha 🐟",
    bgGradient: "from-blue-700 via-indigo-600 to-slate-800",
    image: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=800&q=80",
    linkUrl: "",
    isActive: true
  },
  {
    id: "hero-weekly-grocery",
    titleBn: "দৈনন্দিন দরকারি অরিজিনাল মুদি পণ্য সবচেয়ে কম দামে!",
    titleEn: "Daily Grocery Essentials Delivered in 30 Mins",
    tagBn: "সাপ্তাহিক বাজার অফার 🛒",
    tagEn: "Weekly Grocery Offer 🛒",
    bgGradient: "from-emerald-800 via-teal-700 to-emerald-950",
    image: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80",
    linkUrl: "",
    isActive: true
  }
];

const DEFAULT_PROMO_BANNERS = [
  {
    id: "promo-free-delivery",
    titleBn: "প্রথম ৩ অর্ডারে ফ্রি ডেলিভারি!",
    titleEn: "Free Delivery on First 3 Orders!",
    subtitleBn: "কুপন কোড: FREEDEL50 ব্যবহার করে যেকোনো অর্ডারে ফ্রি হোম ডেলিভারি নিন।",
    subtitleEn: "Use promo code FREEDEL50 to claim instant free delivery.",
    tagBn: "বিশেষ অফার 🔥",
    tagEn: "Special Offer 🔥",
    bgGradient: "from-emerald-600 to-teal-800",
    image: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=600&q=80",
    buttonTextBn: "অর্ডার করুন",
    buttonTextEn: "Shop Now",
    isActive: true
  },
  {
    id: "promo-pure-ghee",
    titleBn: "দেশি গাভীর খাঁটি ঘি ও সরিষার তেল",
    titleEn: "100% Pure Organic Ghee & Mustard Oil",
    subtitleBn: "কৃষকদের নিজস্ব খামার থেকে সংগৃহীত খাঁটি খাদ্যপণ্য।",
    subtitleEn: "Directly sourced organic essential cooking oils.",
    tagBn: "১০০% অর্গানিক 🌿",
    tagEn: "100% Organic 🌿",
    bgGradient: "from-amber-600 to-orange-700",
    image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80",
    buttonTextBn: "সংগ্রহ করুন",
    buttonTextEn: "Order Pure",
    isActive: true
  }
];

export default function AdminHomePageTab({ products, categories, lang, triggerToast }: AdminHomePageTabProps) {
  const getTranslation = (bn: string, en: string) => (lang === "bn" ? bn : en);

  const [activeSubTab, setActiveSubTab] = useState<
    "hero" | "promo" | "call_to_order" | "categories" | "featured" | "sections" | "app_download" | "footer"
  >("hero");

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  // Home Page Settings State
  const [homeConfig, setHomeConfig] = useState<any>({
    heroBanners: DEFAULT_HERO_BANNERS,
    promoBanners: DEFAULT_PROMO_BANNERS,
    referralBanner: {
      enabled: true,
      titleBn: "🎉 বন্ধুদের আমন্ত্রণ জানান, ৳৫০ বোনাস জিতুন!",
      titleEn: "🎉 Refer Friends, Earn ৳50 Wallet Credit!",
      descBn: "বন্ধুরা প্রথম অর্ডারে পাবেন ফ্রি ডেলিভারি এবং আপনার ওয়ালেটে যোগ হবে ৳৫০ ক্যাশব্যাক।",
      descEn: "Friends get Free Delivery on first order. You earn BDT 50 wallet cashback.",
      bonusAmount: 50,
      buttonTextBn: "রেফার করুন",
      buttonTextEn: "Refer Now"
    },
    callToOrder: {
      enabled: true,
      phone: "+8801722638985",
      timeBn: "সকাল ৮:০০ - রাত ১০:০০",
      timeEn: "8:00 AM - 10:00 PM",
      instructionsBn: "ঝটপট কল করুন",
      instructionsEn: "Quick Call",
      buttonTextBn: "কল করুন",
      buttonTextEn: "Call Now"
    },
    categoryConfig: {
      hiddenCategoryIds: [],
      categoryOrder: []
    },
    featuredProducts: {
      popularSectionVisible: true,
      popularProductIds: [],
      newArrivalSectionVisible: true,
      newArrivalProductIds: [],
      seasonalSectionVisible: true,
      seasonalProductIds: [],
      seasonalTitleBn: "মৌসুমী তাজা ফল ও বিশেষ পণ্য",
      seasonalTitleEn: "Seasonal Special Fresh Harvest"
    },
    sectionVisibility: {
      showRecentlyViewed: true,
      showWhyChooseUs: true,
      showMobileApp: true,
      showCallToOrder: true,
      showFooter: true
    },
    mobileAppConfig: {
      enabled: true,
      titleBn: "অর্ডার করুন কাচা বাজার মোবাইল অ্যাপে!",
      titleEn: "Order Smoother inside Mobile Application!",
      subtitleBn: "অ্যাপ ডাউনলোড করলেই প্রথম ৩টি অর্ডারে পাচ্ছেন ফ্রি হোম ডেলিভারি ও ২০০ টাকা ক্যাশব্যাক অফার!",
      subtitleEn: "Unlock exclusive deals, live delivery trackers, and instant cashbacks inside Kacha Bazar app.",
      qrCodeImage: "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://kachabazar.app",
      playStoreUrl: "https://play.google.com/store/apps",
      appStoreUrl: "https://apps.apple.com"
    },
    footerConfig: {
      enabled: true,
      aboutBn: "আমাদের মিশন হলো সর্বোচ্চ তাজা ও বিষমুক্ত সবজি, তাজা মাছ, মাংস ও মুদি পণ্য সরাসরি কৃষকদের মাঠ থেকে তুলে গ্রাহকদের ঘরের দরজায় পৌঁছে দেওয়া।",
      aboutEn: "We are committed to delivering 100% formalin-free, organic, and daily harvested food items direct-from-farmers to your kitchen.",
      phone: "+8801722638985",
      email: "sarkarmdanik14@gmail.com",
      addressBn: "চাঁচকৈড় বাজার, গুরুদাশপুর, নাটোর, বাংলাদেশ",
      addressEn: "Chanchkoir Bazar, Gurudaspur, Natore, Bangladesh",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=Chanchkoir+Bazar,+Gurudaspur,+Natore,+Bangladesh",
      facebookUrl: "https://facebook.com",
      youtubeUrl: "https://youtube.com",
      instagramUrl: "https://instagram.com",
      copyrightBn: "কাচা বাজার লিমিটেড। সর্বস্বত্ব সংরক্ষিত।",
      copyrightEn: "Kacha Bazar Ltd. All rights reserved."
    }
  });

  // Modal / Form state for Hero Banners
  const [showHeroModal, setShowHeroModal] = useState<boolean>(false);
  const [editingHero, setEditingHero] = useState<any | null>(null);
  const [heroForm, setHeroForm] = useState({
    id: "",
    titleBn: "",
    titleEn: "",
    tagBn: "",
    tagEn: "",
    bgGradient: "from-emerald-800 via-teal-700 to-emerald-950",
    image: "",
    linkUrl: "",
    isActive: true
  });

  // Modal / Form state for Promo Banners
  const [showPromoModal, setShowPromoModal] = useState<boolean>(false);
  const [editingPromo, setEditingPromo] = useState<any | null>(null);
  const [promoForm, setPromoForm] = useState({
    id: "",
    titleBn: "",
    titleEn: "",
    subtitleBn: "",
    subtitleEn: "",
    tagBn: "",
    tagEn: "",
    bgGradient: "from-orange-600 via-amber-500 to-yellow-600",
    image: "",
    buttonTextBn: "কিনুন",
    buttonTextEn: "Shop Now",
    isActive: true
  });

  // Image upload reference & state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<string>(""); // 'hero' | 'promo' | 'qr'
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);

  // Load Home Settings on mount
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const docRef = doc(db, "settings", "home");
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          setHomeConfig((prev: any) => ({
            ...prev,
            ...data,
            heroBanners: (data.heroBanners && data.heroBanners.length > 0) ? data.heroBanners : DEFAULT_HERO_BANNERS,
            promoBanners: (data.promoBanners && data.promoBanners.length > 0) ? data.promoBanners : DEFAULT_PROMO_BANNERS,
            referralBanner: { ...prev.referralBanner, ...(data.referralBanner || {}) },
            callToOrder: { ...prev.callToOrder, ...(data.callToOrder || {}) },
            categoryConfig: { ...prev.categoryConfig, ...(data.categoryConfig || {}) },
            featuredProducts: { ...prev.featuredProducts, ...(data.featuredProducts || {}) },
            sectionVisibility: { ...prev.sectionVisibility, ...(data.sectionVisibility || {}) },
            mobileAppConfig: { ...prev.mobileAppConfig, ...(data.mobileAppConfig || {}) },
            footerConfig: { ...prev.footerConfig, ...(data.footerConfig || {}) }
          }));
        }
      } catch (err) {
        console.error("Error loading home settings:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Save Home Settings to Firestore
  const handleSaveHomeConfig = async (updatedConfig?: any) => {
    setSaving(true);
    try {
      const configToSave = updatedConfig || homeConfig;
      await setDoc(doc(db, "settings", "home"), configToSave, { merge: true });
      triggerToast(
        "হোম পেজ সেটিংস সফলভাবে সেভ করা হয়েছে!",
        "Home Page settings saved successfully!"
      );
    } catch (err) {
      console.error("Error saving home settings:", err);
      triggerToast("সেটিংস সেভ করতে ব্যর্থ হয়েছে!", "Failed to save settings!");
    } finally {
      setSaving(false);
    }
  };

  // Image Upload Workflow (Cloudinary + FileReader Fallback)
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    let uploadedUrl = "";

    try {
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

      if (cloudName && uploadPreset) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", uploadPreset);

        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: "POST",
          body: formData
        });

        if (res.ok) {
          const data = await res.json();
          if (data.secure_url) {
            uploadedUrl = data.secure_url;
          }
        }
      }
    } catch (err) {
      console.warn("Cloudinary upload failed, falling back to local reader:", err);
    }

    if (!uploadedUrl) {
      // FileReader Base64 fallback so uploads ALWAYS work even without external API
      uploadedUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    }

    setUploadingImage(false);

    if (uploadTarget === "hero") {
      setHeroForm(prev => ({ ...prev, image: uploadedUrl }));
    } else if (uploadTarget === "promo") {
      setPromoForm(prev => ({ ...prev, image: uploadedUrl }));
    } else if (uploadTarget === "qr") {
      setHomeConfig((prev: any) => ({
        ...prev,
        mobileAppConfig: { ...prev.mobileAppConfig, qrCodeImage: uploadedUrl }
      }));
    }

    triggerToast("ছবি সফলভাবে আপলোড হয়েছে!", "Image uploaded successfully!");
  };

  const triggerUploadClick = (target: string) => {
    setUploadTarget(target);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  /* ================= HERO BANNER HANDLERS ================= */
  const handleOpenHeroModal = (hero?: any) => {
    if (hero) {
      setEditingHero(hero);
      setHeroForm({ ...hero });
    } else {
      setEditingHero(null);
      setHeroForm({
        id: "hero_" + Date.now(),
        titleBn: "",
        titleEn: "",
        tagBn: "বিশেষ অফার",
        tagEn: "SPECIAL OFFER",
        bgGradient: "from-emerald-800 via-teal-700 to-emerald-950",
        image: "",
        linkUrl: "",
        isActive: true
      });
    }
    setShowHeroModal(true);
  };

  const handleSaveHeroBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    const updatedHeroBanners = [...(homeConfig.heroBanners || [])];
    if (editingHero) {
      const index = updatedHeroBanners.findIndex((h: any) => h.id === editingHero.id);
      if (index !== -1) {
        updatedHeroBanners[index] = { ...heroForm };
      }
    } else {
      updatedHeroBanners.push({ ...heroForm });
    }

    const nextConfig = { ...homeConfig, heroBanners: updatedHeroBanners };
    setHomeConfig(nextConfig);
    setShowHeroModal(false);
    await handleSaveHomeConfig(nextConfig);
  };

  const handleDeleteHeroBanner = async (id: string) => {
    if (!confirm(getTranslation("হিরো ব্যানার মুছে ফেলতে চান?", "Are you sure you want to delete this hero banner?"))) return;
    const updated = homeConfig.heroBanners.filter((h: any) => h.id !== id);
    const nextConfig = { ...homeConfig, heroBanners: updated };
    setHomeConfig(nextConfig);
    await handleSaveHomeConfig(nextConfig);
  };

  const handleToggleHeroActive = async (id: string) => {
    const updated = homeConfig.heroBanners.map((h: any) => 
      h.id === id ? { ...h, isActive: !h.isActive } : h
    );
    const nextConfig = { ...homeConfig, heroBanners: updated };
    setHomeConfig(nextConfig);
    await handleSaveHomeConfig(nextConfig);
  };

  const handleMoveHeroOrder = async (index: number, direction: "up" | "down") => {
    const list = [...(homeConfig.heroBanners || [])];
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;
    const nextConfig = { ...homeConfig, heroBanners: list };
    setHomeConfig(nextConfig);
    await handleSaveHomeConfig(nextConfig);
  };

  /* ================= PROMO BANNER HANDLERS ================= */
  const handleOpenPromoModal = (promo?: any) => {
    if (promo) {
      setEditingPromo(promo);
      setPromoForm({ ...promo });
    } else {
      setEditingPromo(null);
      setPromoForm({
        id: "promo_" + Date.now(),
        titleBn: "",
        titleEn: "",
        subtitleBn: "",
        subtitleEn: "",
        tagBn: "স্পেশাল অফার",
        tagEn: "SPECIAL DEAL",
        bgGradient: "from-orange-600 via-amber-500 to-yellow-600",
        image: "",
        buttonTextBn: "কিনুন",
        buttonTextEn: "Shop Now",
        isActive: true
      });
    }
    setShowPromoModal(true);
  };

  const handleSavePromoBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    const updatedList = [...(homeConfig.promoBanners || [])];
    if (editingPromo) {
      const idx = updatedList.findIndex((p: any) => p.id === editingPromo.id);
      if (idx !== -1) updatedList[idx] = { ...promoForm };
    } else {
      updatedList.push({ ...promoForm });
    }
    const nextConfig = { ...homeConfig, promoBanners: updatedList };
    setHomeConfig(nextConfig);
    setShowPromoModal(false);
    await handleSaveHomeConfig(nextConfig);
  };

  const handleDeletePromoBanner = async (id: string) => {
    if (!confirm(getTranslation("প্রোমো ব্যানার মুছে ফেলতে চান?", "Delete this promotional banner?"))) return;
    const updated = (homeConfig.promoBanners || []).filter((p: any) => p.id !== id);
    const nextConfig = { ...homeConfig, promoBanners: updated };
    setHomeConfig(nextConfig);
    await handleSaveHomeConfig(nextConfig);
  };

  const handleMovePromoOrder = async (index: number, direction: "up" | "down") => {
    const list = [...(homeConfig.promoBanners || [])];
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;
    const nextConfig = { ...homeConfig, promoBanners: list };
    setHomeConfig(nextConfig);
    await handleSaveHomeConfig(nextConfig);
  };

  /* ================= FEATURED PRODUCTS HANDLERS ================= */
  const toggleFeaturedProduct = (productId: string, sectionKey: "popularProductIds" | "newArrivalProductIds" | "seasonalProductIds") => {
    const currentList: string[] = homeConfig.featuredProducts?.[sectionKey] || [];
    const exists = currentList.includes(productId);
    const nextList = exists ? currentList.filter(id => id !== productId) : [...currentList, productId];

    const nextConfig = {
      ...homeConfig,
      featuredProducts: {
        ...homeConfig.featuredProducts,
        [sectionKey]: nextList
      }
    };
    setHomeConfig(nextConfig);
  };

  /* ================= CATEGORY VISIBILITY HANDLERS ================= */
  const toggleCategoryVisibility = (catId: string) => {
    const hidden: string[] = homeConfig.categoryConfig?.hiddenCategoryIds || [];
    const isHidden = hidden.includes(catId);
    const nextHidden = isHidden ? hidden.filter(id => id !== catId) : [...hidden, catId];

    const nextConfig = {
      ...homeConfig,
      categoryConfig: {
        ...homeConfig.categoryConfig,
        hiddenCategoryIds: nextHidden
      }
    };
    setHomeConfig(nextConfig);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Hidden File Input for Image Upload Workflow */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleImageFileChange} 
        accept="image/*" 
        className="hidden" 
      />

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 rounded-3xl p-6 text-white shadow relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              {getTranslation("হোম পেজ কন্ট্রোল সেন্টার", "Home Page Management")}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black">{getTranslation("হোম পেজের কনটেন্ট ও লেআউট পরিচালনা", "Manage Home Page Content & Layout")}</h2>
          <p className="text-xs text-emerald-200 mt-1 max-w-2xl">
            {getTranslation(
              "হিরো ব্যানার, অফার ব্যানার, ক্যাটালগ ক্যাটাগরি, ফিচার্ড প্রোডাক্ট, কল-টু-অর্ডার, অ্যাপ ডাউনলোড ও ফুটার কনটেন্ট কাস্টমাইজ করুন।",
              "Customize top hero carousel, offer banners, categories, featured shelves, call-to-order hotline, mobile app launch & footer."
            )}
          </p>
        </div>

        <button
          onClick={() => handleSaveHomeConfig()}
          disabled={saving}
          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-5 py-2.5 rounded-2xl text-xs flex items-center space-x-2 transition shadow-lg cursor-pointer shrink-0 disabled:opacity-50"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{getTranslation("পরিবর্তন সেভ করুন", "Save Changes")}</span>
        </button>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex items-center space-x-1 overflow-x-auto pb-2 scrollbar-none border-b border-slate-200">
        {[
          { id: "hero", nameBn: "হিরো ব্যানার ক্যারোসেল", nameEn: "Top Hero Banner", icon: <Image className="w-4 h-4" /> },
          { id: "promo", nameBn: "অফার ও রেফার ব্যানার", nameEn: "Offer & Promo Banners", icon: <Award className="w-4 h-4" /> },
          { id: "call_to_order", nameBn: "কল-টু-অর্ডার সেকশন", nameEn: "Call-to-Order", icon: <PhoneCall className="w-4 h-4" /> },
          { id: "categories", nameBn: "ক্যাটাগরি কাস্টমাইজেশন", nameEn: "Category Visibility", icon: <Grid className="w-4 h-4" /> },
          { id: "featured", nameBn: "ফিচার্ড প্রোডাক্ট শেলফ", nameEn: "Featured Products", icon: <Star className="w-4 h-4" /> },
          { id: "sections", nameBn: "অন্যান্য সেকশনস", nameEn: "Home Sections", icon: <Layout className="w-4 h-4" /> },
          { id: "app_download", nameBn: "মোবাইল অ্যাপ ডাউনলোড", nameEn: "Mobile App Section", icon: <Smartphone className="w-4 h-4" /> },
          { id: "footer", nameBn: "ফুটার কনটেন্ট", nameEn: "Footer Content", icon: <LayoutTemplate className="w-4 h-4" /> }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition whitespace-nowrap flex items-center space-x-2 cursor-pointer ${
              activeSubTab === tab.id 
                ? "bg-slate-900 text-white shadow" 
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            {tab.icon}
            <span>{getTranslation(tab.nameBn, tab.nameEn)}</span>
          </button>
        ))}
      </div>

      {/* ================= 1. SUB-TAB: HERO BANNER CAROUSEL ================= */}
      {activeSubTab === "hero" && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-black text-slate-800 text-sm">
                  {getTranslation("টপ হিরো ব্যানার স্লাইডার (Hero Banner Carousel)", "Top Hero Banner Carousel")}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {getTranslation("হোম পেজের সবার উপরে প্রদর্শিত স্লাইডার ব্যানারসমূহ পরিচালনা করুন।", "Manage top sliding promotional banners shown at the beginning of the home page.")}
                </p>
              </div>

              <button
                onClick={() => handleOpenHeroModal()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{getTranslation("নতুন হিরো ব্যানার যোগ করুন", "Add Hero Banner")}</span>
              </button>
            </div>

            {/* List of Hero Banners */}
            {(homeConfig.heroBanners || []).length === 0 ? (
              <div className="text-center p-8 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs">
                {getTranslation("কোন কাস্টম হিরো ব্যানার নেই। ডিফল্ট টেমপ্লেট ব্যানার প্রদর্শিত হচ্ছে।", "No custom hero banners found. Default template banners are being displayed.")}
              </div>
            ) : (
              <div className="space-y-3">
                {homeConfig.heroBanners.map((hero: any, index: number) => (
                  <div 
                    key={hero.id || index}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-emerald-500/50 transition"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      {/* Image preview or color card */}
                      <div className={`w-20 h-12 rounded-xl bg-gradient-to-r ${hero.bgGradient || "from-emerald-700 to-teal-800"} overflow-hidden shrink-0 relative flex items-center justify-center text-white border`}>
                        {hero.image ? (
                          <img src={hero.image} alt={hero.titleEn} className="w-full h-full object-cover" />
                        ) : (
                          <Image className="w-5 h-5 opacity-50" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${hero.isActive !== false ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"}`}>
                            {hero.isActive !== false ? (lang === "bn" ? "সক্রিয়" : "Active") : (lang === "bn" ? "নিষ্ক্রিয়" : "Disabled")}
                          </span>
                          {hero.tagBn && (
                            <span className="text-[9px] bg-yellow-100 text-yellow-800 font-bold px-2 py-0.5 rounded">
                              {lang === "bn" ? hero.tagBn : hero.tagEn}
                            </span>
                          )}
                        </div>

                        <h4 className="text-xs font-bold text-slate-800 truncate mt-1">
                          {lang === "bn" ? hero.titleBn || hero.titleEn : hero.titleEn || hero.titleBn}
                        </h4>
                        <p className="text-[10px] text-slate-400">ID: {hero.id}</p>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        onClick={() => handleMoveHeroOrder(index, "up")}
                        disabled={index === 0}
                        className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMoveHeroOrder(index, "down")}
                        disabled={index === homeConfig.heroBanners.length - 1}
                        className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggleHeroActive(hero.id)}
                        className={`p-1.5 rounded-lg border text-xs font-bold cursor-pointer ${hero.isActive !== false ? "bg-emerald-50 text-emerald-700 border-emerald-300" : "bg-slate-100 text-slate-500 border-slate-300"}`}
                      >
                        {hero.isActive !== false ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => handleOpenHeroModal(hero)}
                        className="p-1.5 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteHeroBanner(hero.id)}
                        className="p-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hero Modal */}
      {showHeroModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-black text-slate-800 text-sm">
                {editingHero ? getTranslation("হিরো ব্যানার এডিট করুন", "Edit Hero Banner") : getTranslation("নতুন হিরো ব্যানার যোগ করুন", "Add New Hero Banner")}
              </h3>
              <button onClick={() => setShowHeroModal(false)} className="p-1 rounded-full text-slate-400 hover:bg-slate-100 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveHeroBanner} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Title (Bengali) *</label>
                  <input type="text" required placeholder="যেমন: তাজা হিমসাগর আম মেলা" value={heroForm.titleBn} onChange={(e) => setHeroForm({ ...heroForm, titleBn: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white outline-none font-bold" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Title (English) *</label>
                  <input type="text" required placeholder="e.g. Sweet Himsagar Mango Fest" value={heroForm.titleEn} onChange={(e) => setHeroForm({ ...heroForm, titleEn: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white outline-none font-bold" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Tag / Badge (Bengali)</label>
                  <input type="text" placeholder="যেমন: সেরা অফার" value={heroForm.tagBn} onChange={(e) => setHeroForm({ ...heroForm, tagBn: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Tag / Badge (English)</label>
                  <input type="text" placeholder="e.g. MEGA DEAL" value={heroForm.tagEn} onChange={(e) => setHeroForm({ ...heroForm, tagEn: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white outline-none" />
                </div>
              </div>

              {/* Image Upload Workflow */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Banner Graphic / Photo URL</label>
                <div className="flex gap-2">
                  <input type="text" placeholder="https://..." value={heroForm.image} onChange={(e) => setHeroForm({ ...heroForm, image: e.target.value })} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white outline-none font-mono" />
                  <button type="button" onClick={() => triggerUploadClick("hero")} disabled={uploadingImage} className="bg-slate-900 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer hover:bg-black">
                    {uploadingImage ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    <span>Upload</span>
                  </button>
                </div>
              </div>

              {/* Background Gradient */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Background Gradient Class</label>
                <select value={heroForm.bgGradient} onChange={(e) => setHeroForm({ ...heroForm, bgGradient: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white outline-none font-medium">
                  <option value="from-emerald-800 via-teal-700 to-emerald-950">Emerald Teal (Default)</option>
                  <option value="from-orange-600 via-amber-500 to-yellow-600">Mango Orange Amber</option>
                  <option value="from-indigo-700 via-blue-600 to-cyan-700">Padma Blue Hilsha</option>
                  <option value="from-rose-800 via-red-600 to-orange-600">Flash Sale Red</option>
                  <option value="from-purple-800 via-indigo-700 to-slate-900">Luxury Purple Dark</option>
                </select>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input type="checkbox" id="heroActive" checked={heroForm.isActive !== false} onChange={(e) => setHeroForm({ ...heroForm, isActive: e.target.checked })} className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer" />
                <label htmlFor="heroActive" className="text-xs font-bold text-slate-700 cursor-pointer">
                  {getTranslation("হিরো ব্যানার সক্রিয় রাখুন", "Enable / Activate Hero Banner")}
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowHeroModal(false)} className="px-4 py-2 bg-slate-100 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-200 cursor-pointer">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 cursor-pointer shadow">Save Banner</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= 2. SUB-TAB: PROMO & REFERRAL BANNERS ================= */}
      {activeSubTab === "promo" && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Referral Banner Config */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div>
                <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-600" />
                  <span>{getTranslation("রেফারেল ও রিওয়ার্ড ব্যানার (Referral Banner)", "Referral & Reward Banner")}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {getTranslation("বন্ধুদের আমন্ত্রণ ও ক্যাশব্যাক ওয়ালেট রিওয়ার্ড ব্যানারের টেক্সট ও মূল্য পরিচালনা করুন।", "Manage text and cashback bonus amounts for referral reward banner.")}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setHomeConfig((prev: any) => ({
                  ...prev,
                  referralBanner: { ...prev.referralBanner, enabled: !prev.referralBanner?.enabled }
                }))}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${homeConfig.referralBanner?.enabled !== false ? "bg-emerald-50 text-emerald-700 border-emerald-300" : "bg-slate-100 text-slate-500 border-slate-300"}`}
              >
                {homeConfig.referralBanner?.enabled !== false ? (lang === "bn" ? "✓ সক্রিয়" : "✓ Active") : (lang === "bn" ? "✕ নিষ্ক্রিয়" : "✕ Disabled")}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Referral Title (Bengali)</label>
                <input type="text" value={homeConfig.referralBanner?.titleBn || ""} onChange={(e) => setHomeConfig((prev: any) => ({ ...prev, referralBanner: { ...prev.referralBanner, titleBn: e.target.value } }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:bg-white outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Referral Title (English)</label>
                <input type="text" value={homeConfig.referralBanner?.titleEn || ""} onChange={(e) => setHomeConfig((prev: any) => ({ ...prev, referralBanner: { ...prev.referralBanner, titleEn: e.target.value } }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:bg-white outline-none" />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Description (Bengali)</label>
                <input type="text" value={homeConfig.referralBanner?.descBn || ""} onChange={(e) => setHomeConfig((prev: any) => ({ ...prev, referralBanner: { ...prev.referralBanner, descBn: e.target.value } }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Description (English)</label>
                <input type="text" value={homeConfig.referralBanner?.descEn || ""} onChange={(e) => setHomeConfig((prev: any) => ({ ...prev, referralBanner: { ...prev.referralBanner, descEn: e.target.value } }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white outline-none" />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Cashback Bonus Amount (BDT ৳)</label>
                <input type="number" value={homeConfig.referralBanner?.bonusAmount || 50} onChange={(e) => setHomeConfig((prev: any) => ({ ...prev, referralBanner: { ...prev.referralBanner, bonusAmount: Number(e.target.value) } }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:bg-white outline-none" />
              </div>
            </div>
          </div>

          {/* Promotional Offers Banners */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-black text-slate-800 text-sm">
                  {getTranslation("অন্যান্য প্রোমো ও অফার ব্যানারসমূহ", "Promotional & Offer Banners")}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {getTranslation("হোম পেজে প্রদর্শিত অন্যান্য প্রমোশনাল অফার ব্যানারসমূহ যোগ ও এডিট করুন।", "Add and edit various promo cards across home page sections.")}
                </p>
              </div>

              <button
                onClick={() => handleOpenPromoModal()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{getTranslation("নতুন প্রোমো ব্যানার যোগ করুন", "Add Promo Banner")}</span>
              </button>
            </div>

            {(homeConfig.promoBanners || []).length === 0 ? (
              <div className="text-center p-8 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs">
                {getTranslation("কোন কাস্টম প্রোমো ব্যানার নেই।", "No custom promo banners created yet.")}
              </div>
            ) : (
              <div className="space-y-3">
                {homeConfig.promoBanners.map((promo: any, index: number) => (
                  <div key={promo.id || index} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded uppercase">
                          {lang === "bn" ? promo.tagBn : promo.tagEn}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-800 mt-1">{lang === "bn" ? promo.titleBn : promo.titleEn}</h4>
                      <p className="text-[10px] text-slate-500">{lang === "bn" ? promo.subtitleBn : promo.subtitleEn}</p>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <button onClick={() => handleMovePromoOrder(index, "up")} disabled={index === 0} className="p-1.5 rounded-lg bg-white border text-slate-600 disabled:opacity-30 cursor-pointer"><ArrowUp className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleMovePromoOrder(index, "down")} disabled={index === homeConfig.promoBanners.length - 1} className="p-1.5 rounded-lg bg-white border text-slate-600 disabled:opacity-30 cursor-pointer"><ArrowDown className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleOpenPromoModal(promo)} className="p-1.5 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 cursor-pointer"><Edit className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDeletePromoBanner(promo.id)} className="p-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Promo Modal */}
      {showPromoModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-black text-slate-800 text-sm">
                {editingPromo ? getTranslation("প্রোমো ব্যানার এডিট করুন", "Edit Promo Banner") : getTranslation("নতুন প্রোমো ব্যানার যোগ করুন", "Add Promo Banner")}
              </h3>
              <button onClick={() => setShowPromoModal(false)} className="p-1 rounded-full text-slate-400 hover:bg-slate-100 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePromoBanner} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Title (Bengali) *</label>
                  <input type="text" required value={promoForm.titleBn} onChange={(e) => setPromoForm({ ...promoForm, titleBn: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Title (English) *</label>
                  <input type="text" required value={promoForm.titleEn} onChange={(e) => setPromoForm({ ...promoForm, titleEn: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Subtitle (Bengali)</label>
                  <input type="text" value={promoForm.subtitleBn} onChange={(e) => setPromoForm({ ...promoForm, subtitleBn: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Subtitle (English)</label>
                  <input type="text" value={promoForm.subtitleEn} onChange={(e) => setPromoForm({ ...promoForm, subtitleEn: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Banner Graphic Image URL</label>
                <div className="flex gap-2">
                  <input type="text" value={promoForm.image} onChange={(e) => setPromoForm({ ...promoForm, image: e.target.value })} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono outline-none" />
                  <button type="button" onClick={() => triggerUploadClick("promo")} className="bg-slate-900 text-white px-3 py-2 rounded-xl text-xs font-bold cursor-pointer">Upload</button>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowPromoModal(false)} className="px-4 py-2 bg-slate-100 text-slate-600 text-xs font-bold rounded-xl cursor-pointer">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl cursor-pointer shadow">Save Promo</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= 3. SUB-TAB: CALL TO ORDER SECTION ================= */}
      {activeSubTab === "call_to_order" && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5 animate-fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-emerald-600" />
                <span>{getTranslation("কল-টু-অর্ডার হটলাইন সেকশন (Call-to-Order Section)", "Call-to-Order Hotline Section")}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {getTranslation("গ্রাহকদের সরাসরি ফোন কলের মাধ্যমে অর্ডার করার হটলাইন তথ্য ও ভিজিবিলিটি সেট করুন।", "Manage hotline phone numbers, hours, and text for instant telephone orders.")}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setHomeConfig((prev: any) => ({
                ...prev,
                callToOrder: { ...prev.callToOrder, enabled: !prev.callToOrder?.enabled }
              }))}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${homeConfig.callToOrder?.enabled !== false ? "bg-emerald-50 text-emerald-700 border-emerald-300" : "bg-slate-100 text-slate-500 border-slate-300"}`}
            >
              {homeConfig.callToOrder?.enabled !== false ? (lang === "bn" ? "✓ সেকশন সক্রিয়" : "✓ Section Active") : (lang === "bn" ? "✕ সেকশন বন্ধ" : "✕ Section Disabled")}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Hotline Phone Number *</label>
              <input type="text" value={homeConfig.callToOrder?.phone || "+8801722638985"} onChange={(e) => setHomeConfig((prev: any) => ({ ...prev, callToOrder: { ...prev.callToOrder, phone: e.target.value } }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold focus:bg-white outline-none" />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Working Hours (Bengali)</label>
              <input type="text" value={homeConfig.callToOrder?.timeBn || "সকাল ৮:০০ - রাত ১০:০০"} onChange={(e) => setHomeConfig((prev: any) => ({ ...prev, callToOrder: { ...prev.callToOrder, timeBn: e.target.value } }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:bg-white outline-none" />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Instructions / Headline (Bengali)</label>
              <input type="text" value={homeConfig.callToOrder?.instructionsBn || ""} onChange={(e) => setHomeConfig((prev: any) => ({ ...prev, callToOrder: { ...prev.callToOrder, instructionsBn: e.target.value } }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold focus:bg-white outline-none" />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Instructions / Headline (English)</label>
              <input type="text" value={homeConfig.callToOrder?.instructionsEn || ""} onChange={(e) => setHomeConfig((prev: any) => ({ ...prev, callToOrder: { ...prev.callToOrder, instructionsEn: e.target.value } }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold focus:bg-white outline-none" />
            </div>
          </div>
        </div>
      )}

      {/* ================= 4. SUB-TAB: CATEGORY VISIBILITY ================= */}
      {activeSubTab === "categories" && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4 animate-fade-in">
          <div>
            <h3 className="font-black text-slate-800 text-sm">
              {getTranslation("ক্যাটাগরি ভিজিবিলিটি ও ডিসপ্লে অর্ডার", "Category Visibility & Display Order")}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {getTranslation("হোম পেজে কোন কোন ক্যাটাগরি শেলফ প্রদর্শিত হবে তা নির্দিষ্ট করুন।", "Toggle visibility of individual category shelves on the home page.")}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
            {categories.map((cat: any) => {
              const hiddenList: string[] = homeConfig.categoryConfig?.hiddenCategoryIds || [];
              const isHidden = hiddenList.includes(cat.id);

              return (
                <div key={cat.id} className={`p-3.5 rounded-2xl border flex items-center justify-between transition ${isHidden ? "bg-slate-100 border-slate-200 opacity-60" : "bg-slate-50 border-emerald-100"}`}>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">{lang === "bn" ? cat.nameBn : cat.nameEn}</h4>
                    <span className="text-[9px] text-slate-400 font-mono">{cat.id}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleCategoryVisibility(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border cursor-pointer transition ${!isHidden ? "bg-emerald-600 text-white border-emerald-600 shadow-xs" : "bg-slate-200 text-slate-600 border-slate-300"}`}
                  >
                    {!isHidden ? (lang === "bn" ? "প্রদর্শিত" : "Visible") : (lang === "bn" ? "লুকানো" : "Hidden")}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= 5. SUB-TAB: FEATURED PRODUCTS ================= */}
      {activeSubTab === "featured" && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-6 animate-fade-in">
          <div>
            <h3 className="font-black text-slate-800 text-sm">
              {getTranslation("ফিচার্ড প্রোডাক্ট ও হোম পেজ শেলফ সিলেক্টর", "Popular, New Arrivals & Special Seasonal Products Selector")}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {getTranslation("পপুলার প্রোডাক্ট, নিউ অ্যারাইভালস এবং সিজনাল স্পেশাল সেকশনের দৃশ্যমানতা ও ফিচার্ড পণ্য নির্বাচন করুন।", "Select custom featured products to highlight inside Popular, New Arrivals & Seasonal Special home shelves.")}
            </p>
          </div>

          {/* Section Visibility Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">{getTranslation("জনপ্রিয় পণ্যসমূহ (Popular Products)", "Popular Products Section")}</span>
              <input
                type="checkbox"
                checked={homeConfig.featuredProducts?.popularSectionVisible !== false}
                onChange={(e) => setHomeConfig((prev: any) => ({ ...prev, featuredProducts: { ...prev.featuredProducts, popularSectionVisible: e.target.checked } }))}
                className="rounded text-emerald-600 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">{getTranslation("নতুন কালেকশন (New Arrivals)", "New Arrivals Section")}</span>
              <input
                type="checkbox"
                checked={homeConfig.featuredProducts?.newArrivalSectionVisible !== false}
                onChange={(e) => setHomeConfig((prev: any) => ({ ...prev, featuredProducts: { ...prev.featuredProducts, newArrivalSectionVisible: e.target.checked } }))}
                className="rounded text-emerald-600 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">{getTranslation("সিজনাল ফ্রুট মেলা (Seasonal Special)", "Seasonal Special Section")}</span>
              <input
                type="checkbox"
                checked={homeConfig.featuredProducts?.seasonalSectionVisible !== false}
                onChange={(e) => setHomeConfig((prev: any) => ({ ...prev, featuredProducts: { ...prev.featuredProducts, seasonalSectionVisible: e.target.checked } }))}
                className="rounded text-emerald-600 cursor-pointer"
              />
            </div>
          </div>

          {/* Product Picker Grid for Popular Products */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 mb-2 uppercase tracking-wider text-emerald-700">
              {getTranslation("পপুলার সেকশনে বিশেষ ভাবে ম্যানুয়ালি সংযুক্ত প্রোডাক্টসমূহ:", "Select Products for Popular Products Section:")}
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5 max-h-60 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-2xl">
              {products.map((p: any) => {
                const isSelected = (homeConfig.featuredProducts?.popularProductIds || []).includes(p.id) || p.isPopular;
                return (
                  <div 
                    key={p.id}
                    onClick={() => toggleFeaturedProduct(p.id, "popularProductIds")}
                    className={`p-2 rounded-xl border text-center cursor-pointer transition flex flex-col items-center justify-between ${isSelected ? "bg-emerald-50 border-emerald-500 shadow-xs" : "bg-white border-slate-200 hover:border-slate-300"}`}
                  >
                    <img src={p.image} className="w-10 h-10 object-cover rounded-lg mb-1" />
                    <p className="text-[10px] font-bold text-slate-800 line-clamp-1">{lang === "bn" ? p.nameBn : p.nameEn}</p>
                    <span className={`text-[8px] font-bold mt-1 px-1.5 py-0.2 rounded ${isSelected ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                      {isSelected ? "Selected" : "Select"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ================= 6. SUB-TAB: HOME SECTIONS (RECENTLY VIEWED & WHY CHOOSE US) ================= */}
      {activeSubTab === "sections" && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-6 animate-fade-in">
          <div>
            <h3 className="font-black text-slate-800 text-sm">
              {getTranslation("অন্যান্য হোম সেকশনস ভিজিবিলিটি (Sections Toggle)", "Home Sections Visibility")}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {getTranslation("রিসেন্টলি ভিউড এবং হোয়াই চুজ আস সেকশন অন বা অফ করুন।", "Enable or disable Recently Viewed and Why Choose Us blocks on the home page.")}
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-800">{getTranslation("আপনার সমসাময়িক দেখা পণ্য (Recently Viewed Products)", "Recently Viewed Products Section")}</h4>
                <p className="text-[10px] text-slate-400">{getTranslation("গ্রাহক পূর্বে যে যে পণ্য দেখেছেন তা স্বয়ংক্রিয়ভাবে দেখায়", "Automatically displays items recently viewed by the customer")}</p>
              </div>

              <button
                type="button"
                onClick={() => setHomeConfig((prev: any) => ({
                  ...prev,
                  sectionVisibility: { ...prev.sectionVisibility, showRecentlyViewed: !prev.sectionVisibility?.showRecentlyViewed }
                }))}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${homeConfig.sectionVisibility?.showRecentlyViewed !== false ? "bg-emerald-50 text-emerald-700 border-emerald-300" : "bg-slate-100 text-slate-500 border-slate-300"}`}
              >
                {homeConfig.sectionVisibility?.showRecentlyViewed !== false ? (lang === "bn" ? "✓ অন" : "✓ Enabled") : (lang === "bn" ? "✕ অফ" : "✕ Disabled")}
              </button>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-800">{getTranslation("কেন আমরাই সেরা? (Why Choose Us Section)", "Why Choose Us Section")}</h4>
                <p className="text-[10px] text-slate-400">{getTranslation("রাসায়নিক মুক্ত, ১ ঘণ্টার ডেলিভারি, ইকো প্যাকেজিং ও কৃষকবান্ধব চার স্তম্ভ", "4 trust pillars detailing chemical-free quality and 1-hour delivery")}</p>
              </div>

              <button
                type="button"
                onClick={() => setHomeConfig((prev: any) => ({
                  ...prev,
                  sectionVisibility: { ...prev.sectionVisibility, showWhyChooseUs: !prev.sectionVisibility?.showWhyChooseUs }
                }))}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${homeConfig.sectionVisibility?.showWhyChooseUs !== false ? "bg-emerald-50 text-emerald-700 border-emerald-300" : "bg-slate-100 text-slate-500 border-slate-300"}`}
              >
                {homeConfig.sectionVisibility?.showWhyChooseUs !== false ? (lang === "bn" ? "✓ অন" : "✓ Enabled") : (lang === "bn" ? "✕ অফ" : "✕ Disabled")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= 7. SUB-TAB: MOBILE APP DOWNLOAD SECTION ================= */}
      {activeSubTab === "app_download" && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5 animate-fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-600" />
                <span>{getTranslation("মোবাইল অ্যাপ ডাউনলোড সেকশন (Mobile App Download)", "Mobile App Download Section")}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {getTranslation("প্লে স্টোর, অ্যাপ স্টোর লিংক এবং কিউআর কোড ডাউনলোড ব্যানার কাস্টমাইজ করুন।", "Customize Play Store / App Store download links, QR code graphic, and launch banner texts.")}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setHomeConfig((prev: any) => ({
                ...prev,
                mobileAppConfig: { ...prev.mobileAppConfig, enabled: !prev.mobileAppConfig?.enabled }
              }))}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${homeConfig.mobileAppConfig?.enabled !== false ? "bg-emerald-50 text-emerald-700 border-emerald-300" : "bg-slate-100 text-slate-500 border-slate-300"}`}
            >
              {homeConfig.mobileAppConfig?.enabled !== false ? (lang === "bn" ? "✓ সেকশন অন" : "✓ Enabled") : (lang === "bn" ? "✕ সেকশন অফ" : "✕ Disabled")}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Banner Title (Bengali)</label>
              <input type="text" value={homeConfig.mobileAppConfig?.titleBn || ""} onChange={(e) => setHomeConfig((prev: any) => ({ ...prev, mobileAppConfig: { ...prev.mobileAppConfig, titleBn: e.target.value } }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold focus:bg-white outline-none" />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Banner Title (English)</label>
              <input type="text" value={homeConfig.mobileAppConfig?.titleEn || ""} onChange={(e) => setHomeConfig((prev: any) => ({ ...prev, mobileAppConfig: { ...prev.mobileAppConfig, titleEn: e.target.value } }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold focus:bg-white outline-none" />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Google Play Store URL</label>
              <input type="text" value={homeConfig.mobileAppConfig?.playStoreUrl || ""} onChange={(e) => setHomeConfig((prev: any) => ({ ...prev, mobileAppConfig: { ...prev.mobileAppConfig, playStoreUrl: e.target.value } }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono focus:bg-white outline-none" />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Apple App Store URL</label>
              <input type="text" value={homeConfig.mobileAppConfig?.appStoreUrl || ""} onChange={(e) => setHomeConfig((prev: any) => ({ ...prev, mobileAppConfig: { ...prev.mobileAppConfig, appStoreUrl: e.target.value } }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono focus:bg-white outline-none" />
            </div>

            {/* QR Code Upload Workflow */}
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">QR Code Graphic Image</label>
              <div className="flex gap-2 items-center">
                <input type="text" value={homeConfig.mobileAppConfig?.qrCodeImage || ""} onChange={(e) => setHomeConfig((prev: any) => ({ ...prev, mobileAppConfig: { ...prev.mobileAppConfig, qrCodeImage: e.target.value } }))} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono focus:bg-white outline-none" />
                <button type="button" onClick={() => triggerUploadClick("qr")} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer hover:bg-black">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload QR</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= 8. SUB-TAB: FOOTER CONTENT ================= */}
      {activeSubTab === "footer" && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5 animate-fade-in">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="font-black text-slate-800 text-sm">
              {getTranslation("ফুটার তথ্য ও কন্টাক্ট লিঙ্কস (Footer Content)", "Footer Content & Contact Links")}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {getTranslation("ফুটারের বর্ণনামূলক টেক্সট, যোগাযোগের তথ্য, সোশাল মিডিয়া ও কপিরাইট লাইন পরিচালনা করুন।", "Edit about text, email, helpline, office address, maps and social links in the footer.")}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">About Text (Bengali)</label>
              <textarea rows={2} value={homeConfig.footerConfig?.aboutBn || ""} onChange={(e) => setHomeConfig((prev: any) => ({ ...prev, footerConfig: { ...prev.footerConfig, aboutBn: e.target.value } }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:bg-white outline-none" />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">About Text (English)</label>
              <textarea rows={2} value={homeConfig.footerConfig?.aboutEn || ""} onChange={(e) => setHomeConfig((prev: any) => ({ ...prev, footerConfig: { ...prev.footerConfig, aboutEn: e.target.value } }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:bg-white outline-none" />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Helpline Phone Number</label>
              <input type="text" value={homeConfig.footerConfig?.phone || "+8801722638985"} onChange={(e) => setHomeConfig((prev: any) => ({ ...prev, footerConfig: { ...prev.footerConfig, phone: e.target.value } }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold focus:bg-white outline-none" />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Support Email Address</label>
              <input type="email" value={homeConfig.footerConfig?.email || "sarkarmdanik14@gmail.com"} onChange={(e) => setHomeConfig((prev: any) => ({ ...prev, footerConfig: { ...prev.footerConfig, email: e.target.value } }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold focus:bg-white outline-none" />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Office Address (Bengali)</label>
              <input type="text" value={homeConfig.footerConfig?.addressBn || "চাঁচকৈড় বাজার, গুরুদাশপুর, নাটোর, বাংলাদেশ"} onChange={(e) => setHomeConfig((prev: any) => ({ ...prev, footerConfig: { ...prev.footerConfig, addressBn: e.target.value } }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:bg-white outline-none" />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Office Address (English)</label>
              <input type="text" value={homeConfig.footerConfig?.addressEn || "Chanchkoir Bazar, Gurudaspur, Natore, Bangladesh"} onChange={(e) => setHomeConfig((prev: any) => ({ ...prev, footerConfig: { ...prev.footerConfig, addressEn: e.target.value } }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:bg-white outline-none" />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
