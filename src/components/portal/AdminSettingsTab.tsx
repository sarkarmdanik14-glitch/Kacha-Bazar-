import React, { useState, useEffect } from "react";
import { 
  Settings, Check, RefreshCw, MapPin, Building, Phone, Mail, 
  ToggleLeft, ToggleRight, ImageIcon, Plus, Trash2, Edit, Upload, Navigation, ShieldAlert, Info,
  QrCode, Smartphone, Download, Copy, ExternalLink, Sparkles, CheckCircle2, Globe, Printer,
  Megaphone, AlertCircle, Eye, RotateCcw, Save, Bell, Database, Play, CheckCircle, ArrowRight
} from "lucide-react";
import QRCode from "qrcode";
import { APP_LOGO_URL } from "../../constants/branding";
import { db, doc, setDoc, deleteDoc, collection, serverTimestamp, onSnapshot, getDocs } from "../../lib/firebase";
import { DeliveryZone, DEFAULT_DELIVERY_ZONES, DEFAULT_STORE_LOCATION } from "../../lib/delivery";
import { LiveNoticeConfig, DEFAULT_LIVE_NOTICE } from "../../types";
import { createTranslator } from "../../lib/formatUtils";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../../lib/supabase";
import { checkSupabaseStatus, syncAllToSupabase, SyncProgress } from "../../lib/supabaseSync";
import { SUPABASE_SCHEMA_SQL } from "../../lib/supabaseSchemaCode";
import { CATEGORIES, ALL_PRODUCTS } from "../../data";

interface AdminSettingsTabProps {
  settings: any;
  banners: any[];
  lang: "bn" | "en";
  triggerToast: (bn: string, en: string) => void;
}

export default function AdminSettingsTab({ settings, banners, lang, triggerToast }: AdminSettingsTabProps) {
  const getTranslation = createTranslator(lang);

  const [activeSettingsSubTab, setActiveSettingsSubTab] = useState<"global" | "notice" | "delivery" | "banners" | "pwa" | "supabase">("global");
  const [savingSettings, setSavingSettings] = useState<boolean>(false);

  // Supabase Migration & Test State
  const [checkingSupabase, setCheckingSupabase] = useState<boolean>(false);
  const [supabaseCheckInfo, setSupabaseCheckInfo] = useState<{ connected: boolean; message: string; tableCounts?: Record<string, number> } | null>(null);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);
  const [syncingSupabase, setSyncingSupabase] = useState<boolean>(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [syncResult, setSyncResult] = useState<{ success: boolean; details: Record<string, number>; errors: string[] } | null>(null);

  // Live Notice / Announcement State
  const [noticeActive, setNoticeActive] = useState<boolean>(DEFAULT_LIVE_NOTICE.isActive);
  const [noticeBadgeBn, setNoticeBadgeBn] = useState<string>(DEFAULT_LIVE_NOTICE.badgeBn || "🔴 LIVE UPDATE");
  const [noticeBadgeEn, setNoticeBadgeEn] = useState<string>(DEFAULT_LIVE_NOTICE.badgeEn || "🔴 LIVE UPDATE");
  const [noticeTitleBn, setNoticeTitleBn] = useState<string>(DEFAULT_LIVE_NOTICE.titleBn);
  const [noticeTitleEn, setNoticeTitleEn] = useState<string>(DEFAULT_LIVE_NOTICE.titleEn || "");
  const [noticeMsgBn, setNoticeMsgBn] = useState<string>(DEFAULT_LIVE_NOTICE.messageBn);
  const [noticeMsgEn, setNoticeMsgEn] = useState<string>(DEFAULT_LIVE_NOTICE.messageEn || "");
  const [noticeTheme, setNoticeTheme] = useState<"rose" | "amber" | "emerald" | "blue">(DEFAULT_LIVE_NOTICE.theme || "rose");
  const [noticePulse, setNoticePulse] = useState<boolean>(true);
  const [savingNotice, setSavingNotice] = useState<boolean>(false);

  // Global Config Form states
  const [supportPhone, setSupportPhone] = useState<string>(settings?.supportPhone || "+8801700000000");
  const [hotlinePhone, setHotlinePhone] = useState<string>(settings?.hotline || "01615581975");
  const [whatsappNumber, setWhatsappNumber] = useState<string>(settings?.whatsapp || "01615581975");
  const [facebookUrl, setFacebookUrl] = useState<string>(settings?.facebookUrl || "https://web.facebook.com/profile.php?id=61594593267528");
  const [supportEmail, setSupportEmail] = useState<string>(settings?.supportEmail || "support@kachabazar.com");
  const [officeAddress, setOfficeAddress] = useState<string>(settings?.officeAddress || "Chanchkoir Bazar, Gurudaspur, Natore");
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState<number>(settings?.freeDeliveryThreshold || 500);
  const [referralBonusAmount, setReferralBonusAmount] = useState<number>(settings?.referralBonusAmount || 50);

  // Gateway Toggles
  const [enableCOD, setEnableCOD] = useState<boolean>(settings?.enableCOD !== false);
  const [enableBkash, setEnableBkash] = useState<boolean>(settings?.enableBkash !== false);
  const [enableNagad, setEnableNagad] = useState<boolean>(settings?.enableNagad !== false);
  const [enableRocket, setEnableRocket] = useState<boolean>(settings?.enableRocket !== false);

  // Store Location & Delivery Zones State
  const [storeAddress, setStoreAddress] = useState<string>(
    settings?.storeLocation?.address || settings?.officeAddress || DEFAULT_STORE_LOCATION.address
  );
  const [storeLat, setStoreLat] = useState<number>(
    typeof settings?.storeLocation?.lat === "number" ? settings.storeLocation.lat : DEFAULT_STORE_LOCATION.lat
  );
  const [storeLng, setStoreLng] = useState<number>(
    typeof settings?.storeLocation?.lng === "number" ? settings.storeLocation.lng : DEFAULT_STORE_LOCATION.lng
  );
  const [savingStoreLoc, setSavingStoreLoc] = useState<boolean>(false);

  // Delivery Zones list
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>(
    Array.isArray(settings?.deliveryZones) && settings.deliveryZones.length > 0
      ? settings.deliveryZones
      : DEFAULT_DELIVERY_ZONES
  );

  const [aboveMaxDistanceFee, setAboveMaxDistanceFee] = useState<number>(
    typeof settings?.aboveMaxDistanceFee === "number" ? settings.aboveMaxDistanceFee : 120
  );
  const [deliveryUnavailableAboveMax, setDeliveryUnavailableAboveMax] = useState<boolean>(
    !!settings?.deliveryUnavailableAboveMax
  );

  // Zone Form State (Add / Edit)
  const [showZoneForm, setShowZoneForm] = useState<boolean>(false);
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [zoneNameBn, setZoneNameBn] = useState<string>("");
  const [zoneNameEn, setZoneNameEn] = useState<string>("");
  const [zoneMinDist, setZoneMinDist] = useState<number>(0);
  const [zoneMaxDist, setZoneMaxDist] = useState<number>(3);
  const [zoneFee, setZoneFee] = useState<number>(35);
  const [zoneIsActive, setZoneIsActive] = useState<boolean>(true);
  const [savingZone, setSavingZone] = useState<boolean>(false);

  // Legacy Location Delivery Charges state
  const [locationName, setLocationName] = useState<string>("");
  const [locationCharge, setLocationCharge] = useState<number>(0);
  const deliveryChargesMap = settings?.deliveryChargesByLocation || { "Dhaka": 60, "Natore": 45, "Chittagong": 100 };

  // Sync state with incoming props
  useEffect(() => {
    if (settings) {
      if (settings.storeLocation) {
        if (settings.storeLocation.address) setStoreAddress(settings.storeLocation.address);
        if (typeof settings.storeLocation.lat === "number") setStoreLat(settings.storeLocation.lat);
        if (typeof settings.storeLocation.lng === "number") setStoreLng(settings.storeLocation.lng);
      }
      if (Array.isArray(settings.deliveryZones) && settings.deliveryZones.length > 0) {
        setDeliveryZones(settings.deliveryZones);
      }
      if (settings.aboveMaxDistanceFee !== undefined) {
        setAboveMaxDistanceFee(settings.aboveMaxDistanceFee);
      }
      if (settings.deliveryUnavailableAboveMax !== undefined) {
        setDeliveryUnavailableAboveMax(settings.deliveryUnavailableAboveMax);
      }
    }
  }, [settings]);

  // Sync Live Notice config directly from Firestore
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "settings", "notice"),
      (docSnap) => {
        if (docSnap.exists()) {
          const d = docSnap.data();
          if (d.isActive !== undefined) setNoticeActive(d.isActive);
          if (d.badgeBn) setNoticeBadgeBn(d.badgeBn);
          if (d.badgeEn) setNoticeBadgeEn(d.badgeEn);
          if (d.titleBn) setNoticeTitleBn(d.titleBn);
          if (d.titleEn !== undefined) setNoticeTitleEn(d.titleEn);
          if (d.messageBn) setNoticeMsgBn(d.messageBn);
          if (d.messageEn !== undefined) setNoticeMsgEn(d.messageEn);
          if (d.theme) setNoticeTheme(d.theme);
          if (d.showDotPulse !== undefined) setNoticePulse(d.showDotPulse);
        } else if (settings?.notice) {
          const d = settings.notice;
          if (d.isActive !== undefined) setNoticeActive(d.isActive);
          if (d.badgeBn) setNoticeBadgeBn(d.badgeBn);
          if (d.badgeEn) setNoticeBadgeEn(d.badgeEn);
          if (d.titleBn) setNoticeTitleBn(d.titleBn);
          if (d.titleEn !== undefined) setNoticeTitleEn(d.titleEn);
          if (d.messageBn) setNoticeMsgBn(d.messageBn);
          if (d.messageEn !== undefined) setNoticeMsgEn(d.messageEn);
          if (d.theme) setNoticeTheme(d.theme);
          if (d.showDotPulse !== undefined) setNoticePulse(d.showDotPulse);
        }
      },
      (err) => console.warn("Notice doc sync notice:", err.message)
    );
    return () => unsub();
  }, []);

  // Save Live Notice handler
  const handleSaveNotice = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSavingNotice(true);
    try {
      const payload: LiveNoticeConfig = {
        isActive: noticeActive,
        badgeBn: noticeBadgeBn.trim() || "🔴 LIVE UPDATE",
        badgeEn: noticeBadgeEn.trim() || "🔴 LIVE UPDATE",
        titleBn: noticeTitleBn.trim() || DEFAULT_LIVE_NOTICE.titleBn,
        titleEn: noticeTitleEn.trim() || (DEFAULT_LIVE_NOTICE.titleEn || ""),
        messageBn: noticeMsgBn.trim() || DEFAULT_LIVE_NOTICE.messageBn,
        messageEn: noticeMsgEn.trim() || (DEFAULT_LIVE_NOTICE.messageEn || ""),
        theme: noticeTheme,
        showDotPulse: noticePulse,
        orderDisabled: true,
        updatedAt: serverTimestamp()
      };

      await setDoc(doc(db, "settings", "notice"), payload, { merge: true });
      await setDoc(doc(db, "settings", "global"), {
        notice: payload,
        updatedAt: serverTimestamp()
      }, { merge: true });

      triggerToast("লাইভ নোটিশ সফলভাবে সংরক্ষিত হয়েছে!", "Live notice updated successfully!");
    } catch (err) {
      console.error("Save notice error:", err);
      triggerToast("নোটিশ সেভ করতে সমস্যা হয়েছে।", "Failed to save live notice.");
    } finally {
      setSavingNotice(false);
    }
  };

  // Reset Notice to Default Template
  const handleResetNoticeTemplate = () => {
    setNoticeActive(DEFAULT_LIVE_NOTICE.isActive);
    setNoticeBadgeBn(DEFAULT_LIVE_NOTICE.badgeBn || "🔴 LIVE UPDATE");
    setNoticeBadgeEn(DEFAULT_LIVE_NOTICE.badgeEn || "🔴 LIVE UPDATE");
    setNoticeTitleBn(DEFAULT_LIVE_NOTICE.titleBn);
    setNoticeTitleEn(DEFAULT_LIVE_NOTICE.titleEn || "");
    setNoticeMsgBn(DEFAULT_LIVE_NOTICE.messageBn);
    setNoticeMsgEn(DEFAULT_LIVE_NOTICE.messageEn || "");
    setNoticeTheme(DEFAULT_LIVE_NOTICE.theme || "rose");
    setNoticePulse(true);
    triggerToast("ডিফল্ট নোটিশ টেমপ্লেট লোড করা হয়েছে!", "Default notice template loaded!");
  };

  // Banners state
  const [showBannerForm, setShowBannerForm] = useState<boolean>(false);
  const [editingBanner, setEditingBanner] = useState<any | null>(null);
  const [banId, setBanId] = useState<string>("");
  const [banTitleBn, setBanTitleBn] = useState<string>("");
  const [banTitleEn, setBanTitleEn] = useState<string>("");
  const [banTagBn, setBanTagBn] = useState<string>("");
  const [banTagEn, setBanTagEn] = useState<string>("");
  const [banGradient, setBanGradient] = useState<string>("from-emerald-600 to-teal-500");
  const [banImage, setBanImage] = useState<string>("");
  const [banActive, setBanActive] = useState<boolean>(true);
  const [savingBanner, setSavingBanner] = useState<boolean>(false);

  // PWA Subtab states
  const [adminPwaUrl, setAdminPwaUrl] = useState<string>(
    typeof window !== "undefined" ? `${window.location.origin}/?pwa_install=true` : ""
  );
  const [adminQrDataUrl, setAdminQrDataUrl] = useState<string>("");
  const [adminQrGenerating, setAdminQrGenerating] = useState<boolean>(false);

  useEffect(() => {
    if (!adminPwaUrl) return;
    setAdminQrGenerating(true);
    QRCode.toDataURL(adminPwaUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: "#064e3b",
        light: "#ffffff",
      },
      errorCorrectionLevel: "H",
    })
      .then((url) => {
        setAdminQrDataUrl(url);
        setAdminQrGenerating(false);
      })
      .catch((err) => {
        console.error("Failed to generate Admin QR:", err);
        setAdminQrGenerating(false);
      });
  }, [adminPwaUrl]);

  // Cloudinary refs/states
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "upvkzb3p";
      const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "k0x8mjmx";

      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", uploadPreset);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData
      });

      if (!res.ok) {
        throw new Error(`Cloudinary returned status ${res.status}`);
      }

      const data = await res.json();
      if (data.secure_url) {
        setBanImage(data.secure_url);
        triggerToast("ব্যানার ইমেজ ক্লাউডিনারি-তে আপলোড হয়েছে!", "Banner image uploaded successfully to Cloudinary!");
      } else {
        throw new Error("No secure_url returned");
      }
    } catch (err) {
      console.error("Cloudinary upload failed:", err);
      triggerToast("ছবি আপলোড ব্যর্থ হয়েছে! ক্লাউডিনারি কানেকশন অথবা ফাইলের ফরম্যাট চেক করুন।", "Image upload failed! Please check your Cloudinary connection or file format.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleToggleBannerActive = async (banner: any) => {
    try {
      const nextActive = !banner.isActive;
      await setDoc(doc(db, "banners", banner.id), { isActive: nextActive }, { merge: true });
      triggerToast(
        nextActive ? "ব্যানার সক্রিয় করা হয়েছে!" : "ব্যানার নিষ্ক্রিয় করা হয়েছে!",
        nextActive ? "Banner activated successfully!" : "Banner deactivated successfully!"
      );
    } catch (err) {
      console.error("Error toggling banner active state:", err);
      triggerToast("কার্যক্রম ব্যর্থ হয়েছে।", "Failed to toggle banner activity.");
    }
  };

  const handleOpenEditBanner = (b: any) => {
    setEditingBanner(b);
    setBanId(b.id);
    setBanTitleBn(b.titleBn || "");
    setBanTitleEn(b.titleEn || "");
    setBanTagBn(b.tagBn || "");
    setBanTagEn(b.tagEn || "");
    setBanGradient(b.bgGradient || "from-emerald-600 to-teal-500");
    setBanImage(b.image || "");
    setBanActive(b.isActive !== false);
    setShowBannerForm(true);
  };


  // Save global configurations
  const handleSaveGlobalConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const payload = {
        ...settings,
        supportPhone,
        hotline: hotlinePhone,
        whatsapp: whatsappNumber,
        facebookUrl,
        supportEmail,
        officeAddress,
        freeDeliveryThreshold: Number(freeDeliveryThreshold),
        referralBonusAmount: Number(referralBonusAmount),
        enableCOD,
        enableBkash,
        enableNagad,
        enableRocket,
        deliveryChargesByLocation: deliveryChargesMap,
        updatedAt: serverTimestamp()
      };

      await setDoc(doc(db, "settings", "global"), payload, { merge: true });
      triggerToast("সেটিংস সফলভাবে সংরক্ষিত!", "Global settings successfully updated!");
    } catch (err) {
      console.error(err);
      triggerToast("সংরক্ষণ ব্যর্থ হয়েছে।", "Failed to update global settings.");
    } finally {
      setSavingSettings(false);
    }
  };

  // Save Store Location
  const handleSaveStoreLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingStoreLoc(true);
    try {
      const storeLocation = {
        address: storeAddress,
        lat: Number(storeLat),
        lng: Number(storeLng)
      };
      await setDoc(doc(db, "settings", "global"), {
        storeLocation,
        updatedAt: serverTimestamp()
      }, { merge: true });
      triggerToast("স্টোর লোকেশন সফলভাবে আপডেট করা হয়েছে!", "Store location successfully updated!");
    } catch (err) {
      console.error(err);
      triggerToast("স্টোর লোকেশন সেভ করতে ব্যর্থ হয়েছে!", "Failed to update store location.");
    } finally {
      setSavingStoreLoc(false);
    }
  };

  // Open Zone Form
  const handleOpenAddZone = () => {
    setEditingZoneId(null);
    setZoneNameBn("");
    setZoneNameEn("");
    setZoneMinDist(0);
    setZoneMaxDist(5);
    setZoneFee(50);
    setZoneIsActive(true);
    setShowZoneForm(true);
  };

  const handleOpenEditZone = (z: DeliveryZone) => {
    setEditingZoneId(z.id);
    setZoneNameBn(z.nameBn || "");
    setZoneNameEn(z.nameEn || "");
    setZoneMinDist(z.minDistance || 0);
    setZoneMaxDist(z.maxDistance || 3);
    setZoneFee(z.fee || 35);
    setZoneIsActive(z.isActive !== false);
    setShowZoneForm(true);
  };

  // Save Delivery Zone (Add or Edit)
  const handleSaveZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zoneNameEn.trim() && !zoneNameBn.trim()) {
      triggerToast("জোনের নাম লিখুন।", "Please enter zone name.");
      return;
    }
    setSavingZone(true);
    try {
      const id = editingZoneId || "zone_" + Date.now().toString(36);
      const zonePayload: DeliveryZone = {
        id,
        nameBn: zoneNameBn || zoneNameEn,
        nameEn: zoneNameEn || zoneNameBn,
        minDistance: Number(zoneMinDist),
        maxDistance: Number(zoneMaxDist),
        fee: Number(zoneFee),
        isActive: zoneIsActive
      };

      let updatedZones = [...deliveryZones];
      if (editingZoneId) {
        updatedZones = updatedZones.map((z) => (z.id === editingZoneId ? zonePayload : z));
      } else {
        updatedZones.push(zonePayload);
      }

      await setDoc(doc(db, "settings", "global"), {
        deliveryZones: updatedZones
      }, { merge: true });

      setDeliveryZones(updatedZones);
      setShowZoneForm(false);
      triggerToast("ডেলিভারি জোন সংরক্ষিত হয়েছে!", "Delivery zone saved successfully!");
    } catch (err) {
      console.error(err);
      triggerToast("ডেলিভারি জোন সংরক্ষণে সমস্যা হয়েছে!", "Failed to save delivery zone.");
    } finally {
      setSavingZone(false);
    }
  };

  // Toggle Zone Active/Inactive
  const handleToggleZoneActive = async (zoneId: string) => {
    try {
      const updatedZones = deliveryZones.map((z) =>
        z.id === zoneId ? { ...z, isActive: !z.isActive } : z
      );
      await setDoc(doc(db, "settings", "global"), {
        deliveryZones: updatedZones
      }, { merge: true });
      setDeliveryZones(updatedZones);
      triggerToast("জোনের স্ট্যাটাস পরিবর্তিত হয়েছে!", "Zone status updated!");
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Delivery Zone
  const handleDeleteZone = async (zoneId: string) => {
    if (!confirm(getTranslation("আপনি কি এই ডেলিভারি জোনটি ডিলিট করতে চান?", "Delete this delivery zone?"))) return;
    try {
      const updatedZones = deliveryZones.filter((z) => z.id !== zoneId);
      await setDoc(doc(db, "settings", "global"), {
        deliveryZones: updatedZones
      }, { merge: true });
      setDeliveryZones(updatedZones);
      triggerToast("ডেলিভারি জোন ডিলিট করা হয়েছে!", "Delivery zone deleted!");
    } catch (err) {
      console.error(err);
    }
  };

  // Save Above Max Distance Policy
  const handleSaveAboveMaxPolicy = async () => {
    try {
      await setDoc(doc(db, "settings", "global"), {
        aboveMaxDistanceFee: Number(aboveMaxDistanceFee),
        deliveryUnavailableAboveMax: deliveryUnavailableAboveMax
      }, { merge: true });
      triggerToast("সর্বোচ্চ দূরত্বের পলিসি সংরক্ষিত!", "Above max distance delivery policy saved!");
    } catch (err) {
      console.error(err);
    }
  };

  // Add/Update location delivery tariffs
  const handleAddLocationCharge = async () => {
    if (!locationName.trim()) return;
    try {
      const nextMap = { ...deliveryChargesMap, [locationName.trim()]: Number(locationCharge) };
      await setDoc(doc(db, "settings", "global"), {
        deliveryChargesByLocation: nextMap
      }, { merge: true });
      setLocationName("");
      setLocationCharge(0);
      triggerToast("ডেলিভারি ট্যারিফ আপডেট করা হয়েছে!", "Location delivery tariff successfully saved!");
    } catch (err) {
      console.error(err);
    }
  };

  // Delete location delivery tariffs
  const handleDeleteLocationCharge = async (locName: string) => {
    try {
      const nextMap = { ...deliveryChargesMap };
      delete nextMap[locName];
      await setDoc(doc(db, "settings", "global"), {
        deliveryChargesByLocation: nextMap
      }, { merge: true });
      triggerToast("ট্যারিফ ডিলিট করা হয়েছে!", "Location delivery tariff deleted!");
    } catch (err) {
      console.error(err);
    }
  };

  // Save banner
  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!banId.trim() || !banTitleEn.trim()) {
      triggerToast("প্রয়োজনীয় তথ্য দিন।", "Please fill required banner details.");
      return;
    }

    setSavingBanner(true);
    try {
      const payload = {
        id: banId.trim(),
        titleBn: banTitleBn,
        titleEn: banTitleEn,
        tagBn: banTagBn,
        tagEn: banTagEn,
        bgGradient: banGradient,
        image: banImage || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=200&q=80",
        isActive: banActive,
        updatedAt: serverTimestamp()
      };

      await setDoc(doc(db, "banners", payload.id), payload, { merge: true });
      try {
        await setDoc(doc(db, "banner_management", payload.id), payload, { merge: true });
      } catch {
        // optional mirror sync
      }
      triggerToast("ব্যানার সংরক্ষিত হয়েছে!", "Banner configuration saved!");
      setShowBannerForm(false);
    } catch (err) {
      console.error(err);
      triggerToast("ব্যানার সংরক্ষণ করতে সমস্যা হয়েছে!", "Failed to save banner.");
    } finally {
      setSavingBanner(false);
    }
  };

  // Delete banner
  const handleDeleteBanner = async (id: string) => {
    if (!confirm(getTranslation("ব্যানার ডিলিট করতে চান?", "Delete this promotional banner?"))) return;
    try {
      await deleteDoc(doc(db, "banners", id));
      try {
        await deleteDoc(doc(db, "banner_management", id));
      } catch {
        // optional mirror delete
      }
      triggerToast("ব্যানার ডিলিট করা হয়েছে!", "Banner successfully removed!");
    } catch (err) {
      console.error(err);
      triggerToast("ব্যানার মুছতে সমস্যা হয়েছে!", "Failed to delete banner.");
    }
  };

  return (
    <div className="space-y-6 text-slate-700">
      
      {/* Settings Sub Navigation */}
      <div className="flex border-b border-slate-100 shrink-0 overflow-x-auto scrollbar-none">
        <button 
          onClick={() => setActiveSettingsSubTab("global")}
          className={`px-5 py-2.5 text-xs font-black cursor-pointer uppercase tracking-wider border-b-2 shrink-0 whitespace-nowrap ${
            activeSettingsSubTab === "global" ? "border-emerald-600 text-emerald-600" : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          {getTranslation("সাধারণ সেটিংস", "Global Profiles & Toggles")}
        </button>
        <button 
          onClick={() => setActiveSettingsSubTab("notice")}
          className={`px-5 py-2.5 text-xs font-black cursor-pointer uppercase tracking-wider border-b-2 flex items-center gap-2 shrink-0 whitespace-nowrap transition ${
            activeSettingsSubTab === "notice" ? "border-rose-600 text-rose-600 bg-rose-50/50" : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600"></span>
          </span>
          <span>{getTranslation("🔴 লাইভ নোটিশ", "🔴 Live Notice")}</span>
          {noticeActive ? (
            <span className="bg-rose-100 text-rose-700 text-[9px] px-1.5 py-0.5 rounded-full font-bold">
              {getTranslation("অন", "ON")}
            </span>
          ) : (
            <span className="bg-slate-100 text-slate-500 text-[9px] px-1.5 py-0.5 rounded-full font-bold">
              {getTranslation("বন্ধ", "OFF")}
            </span>
          )}
        </button>
        <button 
          onClick={() => setActiveSettingsSubTab("delivery")}
          className={`px-5 py-2.5 text-xs font-black cursor-pointer uppercase tracking-wider border-b-2 shrink-0 whitespace-nowrap ${
            activeSettingsSubTab === "delivery" ? "border-emerald-600 text-emerald-600" : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          {getTranslation("এলাকাভিত্তিক ডেলিভারি", "Location Delivery Tariffs")}
        </button>
        <button 
          onClick={() => setActiveSettingsSubTab("banners")}
          className={`px-5 py-2.5 text-xs font-black cursor-pointer uppercase tracking-wider border-b-2 shrink-0 whitespace-nowrap ${
            activeSettingsSubTab === "banners" ? "border-emerald-600 text-emerald-600" : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          {getTranslation("ব্যানার এডিটর", "Home Promo Banners")}
        </button>
        <button 
          onClick={() => setActiveSettingsSubTab("pwa")}
          className={`px-5 py-2.5 text-xs font-black cursor-pointer uppercase tracking-wider border-b-2 flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
            activeSettingsSubTab === "pwa" ? "border-emerald-600 text-emerald-600" : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <QrCode className="w-3.5 h-3.5" />
          <span>{getTranslation("PWA ও QR কোড", "PWA & QR Posters")}</span>
        </button>
        <button 
          onClick={() => setActiveSettingsSubTab("supabase")}
          className={`px-5 py-2.5 text-xs font-black cursor-pointer uppercase tracking-wider border-b-2 flex items-center gap-1.5 shrink-0 whitespace-nowrap transition ${
            activeSettingsSubTab === "supabase" ? "border-emerald-600 text-emerald-600 bg-emerald-50/50" : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <Database className="w-3.5 h-3.5 text-emerald-600" />
          <span>{getTranslation("⚡ সুপাবেস ডেটাবেস", "⚡ Supabase DB")}</span>
        </button>
      </div>

      {/* ================= LIVE NOTICE / ANNOUNCEMENT SUBTAB ================= */}
      {activeSettingsSubTab === "notice" && (
        <div className="space-y-6">
          
          {/* Header Description Card */}
          <div className="bg-gradient-to-r from-rose-500/10 via-red-500/5 to-amber-500/10 border border-rose-200 p-5 rounded-2xl shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-rose-200">
                  <Megaphone className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-800">
                      {getTranslation("লাইভ নোটিশ ও এনাউন্সমেন্ট সিস্টেম", "Live Notice & Announcement System")}
                    </h3>
                    <span className="bg-rose-100 text-rose-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                      Realtime Sync
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 max-w-2xl leading-relaxed">
                    {getTranslation(
                      "ওয়েবসাইটে ভিজিটরদের জন্য চলমান কাজ বা নোটিশ নিয়ন্ত্রণ করুন। এখান থেকে সরাসরি লেখা এডিট, অন/অফ এবং সেভ করতে পারবেন।",
                      "Manage live alerts and announcements shown to website visitors. Edit text, toggle show/hide, and save changes in real time."
                    )}
                  </p>
                </div>
              </div>

              {/* Quick Template Reset */}
              <button
                type="button"
                onClick={handleResetNoticeTemplate}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-2xs cursor-pointer self-start sm:self-auto shrink-0"
                title={getTranslation("অফিসিয়াল ডিফল্ট টেক্সট লোড করুন", "Reset to Default Template")}
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>{getTranslation("ডিফল্ট টেক্সট লোড", "Load Default")}</span>
              </button>
            </div>
          </div>

          {/* Interactive Live Preview Box */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-emerald-600" />
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                  {getTranslation("লাইভ প্রিভিউ (ওয়েবসাইটে কেমন দেখাবে)", "Live Website Preview")}
                </h4>
              </div>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                noticeActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"
              }`}>
                {noticeActive ? getTranslation("প্রদর্শিত হবে", "Will Be Visible") : getTranslation("লুকানো থাকবে", "Currently Hidden")}
              </span>
            </div>

            {/* Simulated Banner Container */}
            <div className={`p-4 rounded-2xl border transition-all ${
              noticeTheme === "rose" 
                ? "bg-gradient-to-r from-rose-50 via-red-50 to-amber-50 border-rose-200 text-rose-950" 
                : noticeTheme === "amber"
                ? "bg-gradient-to-r from-amber-50 via-orange-50 to-yellow-50 border-amber-200 text-amber-950"
                : noticeTheme === "emerald"
                ? "bg-gradient-to-r from-emerald-50 via-teal-50 to-green-50 border-emerald-200 text-emerald-950"
                : "bg-gradient-to-r from-blue-50 via-sky-50 to-indigo-50 border-blue-200 text-blue-950"
            }`}>
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white shadow-xs border border-rose-200/50 flex items-center justify-center shrink-0">
                  <div className="relative flex items-center justify-center">
                    <span className="animate-ping absolute inline-flex h-5 w-5 rounded-full bg-rose-400 opacity-60"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600"></span>
                  </div>
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase text-white shadow-2xs ${
                      noticeTheme === "rose" ? "bg-rose-600" :
                      noticeTheme === "amber" ? "bg-amber-600" :
                      noticeTheme === "emerald" ? "bg-emerald-600" : "bg-blue-600"
                    }`}>
                      {noticePulse && (
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-80"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
                        </span>
                      )}
                      <span>{noticeBadgeBn || "🔴 LIVE UPDATE"}</span>
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 bg-white/70 px-2 py-0.5 rounded-md border border-slate-200/50">
                      {getTranslation("জরুরি আপডেট", "Notice")}
                    </span>
                  </div>

                  <h3 className="text-sm sm:text-base font-black tracking-tight leading-snug">
                    {noticeTitleBn || DEFAULT_LIVE_NOTICE.titleBn}
                  </h3>

                  <p className="text-xs font-medium opacity-90 leading-relaxed">
                    {noticeMsgBn || DEFAULT_LIVE_NOTICE.messageBn}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Form Settings Editor */}
          <form onSubmit={handleSaveNotice} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-5">
            
            {/* Control Switches Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200/70">
              
              {/* Show / Hide Toggle */}
              <div>
                <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide block mb-1">
                  {getTranslation("নোটিশ প্রদর্শন (Show / Hide)", "Notice Visibility")}
                </label>
                <button
                  type="button"
                  onClick={() => setNoticeActive(!noticeActive)}
                  className={`w-full py-2 px-3 rounded-xl border flex items-center justify-between transition cursor-pointer font-bold text-xs ${
                    noticeActive 
                      ? "bg-emerald-50 border-emerald-300 text-emerald-800" 
                      : "bg-slate-100 border-slate-300 text-slate-600"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {noticeActive ? (
                      <ToggleRight className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <ToggleLeft className="w-5 h-5 text-slate-400" />
                    )}
                    <span>{noticeActive ? getTranslation("নোটিশ চালু আছে", "Notice Active (Shown)") : getTranslation("নোটিশ বন্ধ আছে", "Notice Hidden")}</span>
                  </span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    noticeActive ? "bg-emerald-600 text-white" : "bg-slate-300 text-slate-700"
                  }`}>
                    {noticeActive ? "ON" : "OFF"}
                  </span>
                </button>
              </div>

              {/* Pulsing Beacon Toggle */}
              <div>
                <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide block mb-1">
                  {getTranslation("পালসিং লাইভ আইকন", "Pulsing Live Beacon")}
                </label>
                <button
                  type="button"
                  onClick={() => setNoticePulse(!noticePulse)}
                  className={`w-full py-2 px-3 rounded-xl border flex items-center justify-between transition cursor-pointer font-bold text-xs ${
                    noticePulse 
                      ? "bg-rose-50 border-rose-300 text-rose-800" 
                      : "bg-slate-100 border-slate-300 text-slate-600"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {noticePulse ? (
                      <ToggleRight className="w-5 h-5 text-rose-600" />
                    ) : (
                      <ToggleLeft className="w-5 h-5 text-slate-400" />
                    )}
                    <span>{noticePulse ? getTranslation("পালসিং চালু", "Pulse Active") : getTranslation("পালসিং বন্ধ", "Pulse Disabled")}</span>
                  </span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    noticePulse ? "bg-rose-600 text-white" : "bg-slate-300 text-slate-700"
                  }`}>
                    {noticePulse ? "YES" : "NO"}
                  </span>
                </button>
              </div>

              {/* Color Theme Selector */}
              <div>
                <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide block mb-1">
                  {getTranslation("কালার থিম (Visual Style)", "Visual Color Theme")}
                </label>
                <div className="grid grid-cols-4 gap-1">
                  {[
                    { id: "rose", label: "লাল", colorClass: "bg-rose-500 text-white" },
                    { id: "amber", label: "হলুদ", colorClass: "bg-amber-500 text-white" },
                    { id: "emerald", label: "সবুজ", colorClass: "bg-emerald-600 text-white" },
                    { id: "blue", label: "নীল", colorClass: "bg-blue-600 text-white" }
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setNoticeTheme(t.id as any)}
                      className={`py-1.5 px-1 rounded-lg text-[11px] font-bold transition cursor-pointer border ${
                        noticeTheme === t.id 
                          ? `${t.colorClass} border-slate-800 shadow-xs ring-1 ring-slate-800` 
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Inputs: Badges and Titles */}
            <div className="space-y-4 pt-1">
              
              {/* Badge Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">
                    {getTranslation("ব্যাজ টেক্সট (বাংলা)", "Badge Label (Bangla)")}
                  </label>
                  <input
                    type="text"
                    value={noticeBadgeBn}
                    onChange={(e) => setNoticeBadgeBn(e.target.value)}
                    placeholder="🔴 LIVE UPDATE"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-rose-500 focus:bg-white transition"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">
                    {getTranslation("ব্যাজ টেক্সট (English)", "Badge Label (English)")}
                  </label>
                  <input
                    type="text"
                    value={noticeBadgeEn}
                    onChange={(e) => setNoticeBadgeEn(e.target.value)}
                    placeholder="🔴 LIVE UPDATE"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-rose-500 focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Title Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {getTranslation("নোটিশের মূল শিরোনাম (বাংলা) *", "Headline Title (Bangla) *")}
                  </label>
                  <input
                    type="text"
                    required
                    value={noticeTitleBn}
                    onChange={(e) => setNoticeTitleBn(e.target.value)}
                    placeholder="কাঁচা বাজার ওয়েবসাইটের কাজ এখনও চলমান।"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-black outline-none focus:border-rose-500 focus:bg-white transition text-slate-800"
                  />
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">
                    {getTranslation("ডিফল্ট: কাঁচা বাজার ওয়েবসাইটের কাজ এখনও চলমান।", "Default: Kacha Bazar website is currently under development.")}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {getTranslation("নোটিশের মূল শিরোনাম (English)", "Headline Title (English)")}
                  </label>
                  <input
                    type="text"
                    value={noticeTitleEn}
                    onChange={(e) => setNoticeTitleEn(e.target.value)}
                    placeholder="Kacha Bazar website is currently under development."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none focus:border-rose-500 focus:bg-white transition text-slate-800"
                  />
                </div>
              </div>

              {/* Message Details Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {getTranslation("বিস্তারিত বার্তা / এনাউন্সমেন্ট (বাংলা) *", "Detailed Announcement Message (Bangla) *")}
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={noticeMsgBn}
                    onChange={(e) => setNoticeMsgBn(e.target.value)}
                    placeholder="বর্তমানে অর্ডার গ্রহণ শুরু হয়নি। খুব শীঘ্রই অর্ডার নেওয়া শুরু হবে।"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium outline-none focus:border-rose-500 focus:bg-white transition text-slate-800"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                    {getTranslation("ডিফল্ট: বর্তমানে অর্ডার গ্রহণ শুরু হয়নি। খুব শীঘ্রই অর্ডার নেওয়া শুরু হবে।", "Default: Orders are not currently being accepted. We will start taking orders very soon.")}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {getTranslation("বিস্তারিত বার্তা / এনাউন্সমেন্ট (English)", "Detailed Announcement Message (English)")}
                  </label>
                  <textarea
                    rows={3}
                    value={noticeMsgEn}
                    onChange={(e) => setNoticeMsgEn(e.target.value)}
                    placeholder="Orders are not currently being accepted. We will start taking orders very soon."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium outline-none focus:border-rose-500 focus:bg-white transition text-slate-800"
                  />
                </div>
              </div>

            </div>

            {/* Submit / Save Button Bar */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-400 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>
                  {getTranslation("সেভ করার সাথে সাথে সকল ভিজিটরদের স্ক্রিনে রিয়েল-টাইম নোটিশটি হালনাগাদ হবে।", "Changes apply instantly to all active visitors in real-time.")}
                </span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="submit"
                  disabled={savingNotice}
                  className="w-full sm:w-auto px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow-md shadow-rose-200 hover:shadow-lg transition active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {savingNotice ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>
                    {savingNotice 
                      ? getTranslation("সংরক্ষণ করা হচ্ছে...", "Saving...") 
                      : getTranslation("নোটিশ সংরক্ষণ ও প্রকাশ করুন", "Save & Publish Notice")}
                  </span>
                </button>
              </div>
            </div>

          </form>

        </div>
      )}

      {activeSettingsSubTab === "global" && (
        <form onSubmit={handleSaveGlobalConfig} className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-6">
          
          {/* General Contacts */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">{getTranslation("যোগাযোগ ও শারীরিক ঠিকানা", "Support & HQ Coordinates")}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Hotline Phone Number (Dialer)</label>
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
                  <Phone className="w-4 h-4 text-rose-500 mr-2" />
                  <input type="text" value={hotlinePhone} onChange={(e) => setHotlinePhone(e.target.value)} placeholder="01615581975" className="bg-transparent flex-1 outline-none font-bold" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">WhatsApp Number (Chat Link)</label>
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
                  <span className="w-4 h-4 text-emerald-500 font-bold mr-2 text-center leading-none">🟢</span>
                  <input type="text" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} placeholder="01615581975" className="bg-transparent flex-1 outline-none font-bold" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Facebook Page URL</label>
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
                  <Globe className="w-4 h-4 text-blue-500 mr-2" />
                  <input type="text" value={facebookUrl} onChange={(e) => setFacebookUrl(e.target.value)} placeholder="https://web.facebook.com/profile.php?id=61594593267528" className="bg-transparent flex-1 outline-none font-bold" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Support Phone</label>
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
                  <Phone className="w-4 h-4 text-slate-400 mr-2" />
                  <input type="text" value={supportPhone} onChange={(e) => setSupportPhone(e.target.value)} className="bg-transparent flex-1 outline-none font-bold" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Support Email</label>
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
                  <Mail className="w-4 h-4 text-slate-400 mr-2" />
                  <input type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} className="bg-transparent flex-1 outline-none font-bold" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Office Physical Address</label>
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
                  <Building className="w-4 h-4 text-slate-400 mr-2" />
                  <input type="text" value={officeAddress} onChange={(e) => setOfficeAddress(e.target.value)} className="bg-transparent flex-1 outline-none font-bold" />
                </div>
              </div>
            </div>
          </div>

          {/* Business configurations */}
          <div className="border-t border-slate-55 pt-4 space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">{getTranslation("ব্যবসায়িক লজিক কনফিগারেশন", "Business Tariff Threshholds")}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Free Delivery Threshold (৳)</label>
                <input type="number" value={freeDeliveryThreshold} onChange={(e) => setFreeDeliveryThreshold(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-extrabold" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Referral Registration Bonus (৳)</label>
                <input type="number" value={referralBonusAmount} onChange={(e) => setReferralBonusAmount(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-extrabold" />
              </div>
            </div>
          </div>

          {/* Payment Gateways Switches */}
          <div className="border-t border-slate-55 pt-4 space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">{getTranslation("পেমেন্ট গেটওয়ে চ্যানেল সুইচেস", "Payment Channel Activations")}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-xs font-bold">COD</span>
                <button type="button" onClick={() => setEnableCOD(!enableCOD)} className="text-slate-600 hover:text-black cursor-pointer">
                  {enableCOD ? <ToggleRight className="w-8 h-8 text-emerald-600" /> : <ToggleLeft className="w-8 h-8 text-slate-350" />}
                </button>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-xs font-bold">bKash</span>
                <button type="button" onClick={() => setEnableBkash(!enableBkash)} className="text-slate-600 hover:text-black cursor-pointer">
                  {enableBkash ? <ToggleRight className="w-8 h-8 text-emerald-600" /> : <ToggleLeft className="w-8 h-8 text-slate-350" />}
                </button>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-xs font-bold">Nagad</span>
                <button type="button" onClick={() => setEnableNagad(!enableNagad)} className="text-slate-600 hover:text-black cursor-pointer">
                  {enableNagad ? <ToggleRight className="w-8 h-8 text-emerald-600" /> : <ToggleLeft className="w-8 h-8 text-slate-350" />}
                </button>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-xs font-bold">Rocket</span>
                <button type="button" onClick={() => setEnableRocket(!enableRocket)} className="text-slate-600 hover:text-black cursor-pointer">
                  {enableRocket ? <ToggleRight className="w-8 h-8 text-emerald-600" /> : <ToggleLeft className="w-8 h-8 text-slate-350" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button 
              type="submit" 
              disabled={savingSettings}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 cursor-pointer"
            >
              {savingSettings && <RefreshCw className="w-4 h-4 animate-spin" />}
              <span>{getTranslation("সব সেটিংস সংরক্ষণ করুন", "Publish Global Updates")}</span>
            </button>
          </div>
        </form>
      )}

      {activeSettingsSubTab === "delivery" && (
        <div className="space-y-6">
          
          {/* Section 1: Store Location Settings */}
          <form onSubmit={handleSaveStoreLocation} className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <span>{getTranslation("স্টোর সেন্ট্রাল লোকেশন", "Store Base Location Coordinates")}</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {getTranslation("গ্রাহকের ঠিকানা থেকে দূরত্ব নির্ণয় করার মূল সেন্ট্রাল স্টোর এড্রেস।", "Central warehouse/store location used to compute Haversine customer delivery distance.")}
                </p>
              </div>
              <button 
                type="submit" 
                disabled={savingStoreLoc}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                {savingStoreLoc ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>{getTranslation("লোকেশন সেভ করুন", "Save Store Location")}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Store Address / Landmark</label>
                <input 
                  type="text" 
                  value={storeAddress} 
                  onChange={(e) => setStoreAddress(e.target.value)} 
                  placeholder="e.g. Chanchkoir Bazar, Gurudaspur, Natore, Bangladesh"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold" 
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Latitude (অক্ষাংশ)</label>
                <input 
                  type="number" 
                  step="any" 
                  value={storeLat} 
                  onChange={(e) => setStoreLat(Number(e.target.value))} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold" 
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Longitude (দ্রাঘিমাংশ)</label>
                <input 
                  type="number" 
                  step="any" 
                  value={storeLng} 
                  onChange={(e) => setStoreLng(Number(e.target.value))} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold" 
                />
              </div>
              <div className="flex items-center text-xs text-slate-500 bg-emerald-50/60 border border-emerald-100 rounded-xl p-3">
                <Navigation className="w-4 h-4 text-emerald-600 mr-2 shrink-0" />
                <span>GPS lat/lng coordinate anchor: <strong className="text-slate-800">{storeLat}, {storeLng}</strong></span>
              </div>
            </div>
          </form>

          {/* Section 2: Configurable Distance Delivery Zones */}
          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-emerald-600" />
                  <span>{getTranslation("দূরত্বভিত্তিক ডেলিভারি জোন (Delivery Zones)", "Distance-Based Delivery Zones")}</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {getTranslation("গ্রাহকের দূরত্ব (কিমি) অনুযায়ী গতিশীল ডেলিভারি ফি কনফিগার করুন।", "Create, edit, and activate dynamic distance thresholds and corresponding delivery fees.")}
                </p>
              </div>
              <button 
                type="button" 
                onClick={handleOpenAddZone}
                className="bg-slate-900 hover:bg-black text-white px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{getTranslation("নতুন জোন যোগ করুন", "Add Delivery Zone")}</span>
              </button>
            </div>

            {/* Zone Form (Add / Edit Modal or Panel) */}
            {showZoneForm && (
              <form onSubmit={handleSaveZone} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-4 animate-fade-in">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wide">
                  {editingZoneId ? getTranslation("ডেলিভারি জোন এডিট করুন", "Edit Delivery Zone") : getTranslation("নতুন ডেলিভারি জোন তৈরি করুন", "Create New Delivery Zone")}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Zone Name (Bangla)</label>
                    <input 
                      type="text" 
                      required 
                      value={zoneNameBn} 
                      onChange={(e) => setZoneNameBn(e.target.value)} 
                      placeholder="e.g. লোকাল জোন (০-৩ কিমি)" 
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-medium" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Zone Name (English)</label>
                    <input 
                      type="text" 
                      required 
                      value={zoneNameEn} 
                      onChange={(e) => setZoneNameEn(e.target.value)} 
                      placeholder="e.g. Local Zone (0-3 km)" 
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-medium" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Max Distance (কিমি/km)</label>
                    <input 
                      type="number" 
                      step="0.1" 
                      min={0} 
                      required 
                      value={zoneMaxDist} 
                      onChange={(e) => setZoneMaxDist(Number(e.target.value))} 
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-bold" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Delivery Fee (৳)</label>
                    <input 
                      type="number" 
                      min={0} 
                      required 
                      value={zoneFee} 
                      onChange={(e) => setZoneFee(Number(e.target.value))} 
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-bold text-emerald-600" 
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-slate-700">
                    <input 
                      type="checkbox" 
                      checked={zoneIsActive} 
                      onChange={(e) => setZoneIsActive(e.target.checked)} 
                      className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4" 
                    />
                    <span>{getTranslation("জোনটি সক্রিয় রাখুন (Active)", "Keep zone active and enabled")}</span>
                  </label>
                  <div className="flex gap-2">
                    <button 
                      type="button" 
                      onClick={() => setShowZoneForm(false)} 
                      className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase"
                    >
                      {getTranslation("বাতিল", "Cancel")}
                    </button>
                    <button 
                      type="submit" 
                      disabled={savingZone} 
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-xl text-xs font-black uppercase flex items-center gap-1"
                    >
                      {savingZone && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                      <span>{getTranslation("সংরক্ষণ করুন", "Save Zone")}</span>
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Delivery Zones List */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {deliveryZones.map((z, idx) => {
                const prevDist = idx === 0 ? 0 : (deliveryZones[idx - 1]?.maxDistance || 0);
                return (
                  <div 
                    key={z.id} 
                    className={`border p-4 rounded-2xl shadow-xs transition flex flex-col justify-between ${
                      z.isActive !== false ? "bg-white border-slate-200" : "bg-slate-50 border-slate-200 opacity-60"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest">
                          {z.minDistance ?? prevDist} - {z.maxDistance} KM
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          z.isActive !== false ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"
                        }`}>
                          {z.isActive !== false ? getTranslation("সক্রিয়", "ACTIVE") : getTranslation("নিষ্ক্রিয়", "INACTIVE")}
                        </span>
                      </div>

                      <h4 className="font-extrabold text-sm text-slate-800">
                        {getTranslation(z.nameBn, z.nameEn)}
                      </h4>
                      
                      <div className="mt-3 flex items-baseline gap-1">
                        <span className="text-2xl font-black text-emerald-600">৳{z.fee}</span>
                        <span className="text-xs text-slate-400 font-bold">/ delivery run</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-4 text-xs">
                      <button 
                        onClick={() => handleToggleZoneActive(z.id)} 
                        className="text-slate-500 hover:text-slate-900 font-bold text-[11px]"
                      >
                        {z.isActive !== false ? getTranslation("নিষ্ক্রিয় করুন", "Deactivate") : getTranslation("সক্রিয় করুন", "Activate")}
                      </button>

                      <div className="flex items-center space-x-1">
                        <button 
                          onClick={() => handleOpenEditZone(z)} 
                          className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 transition"
                          title="Edit Zone"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteZone(z.id)} 
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
                          title="Delete Zone"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Policy for Distance Above Maximum Zone Limit (> 10 km) */}
          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-500" />
                  <span>{getTranslation("সর্বোচ্চ সীমা অতিক্রমকারী দূরত্ব পলিসি (>১০ কিমি)", "Above Max Zone Distance Policy (>10 km)")}</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {getTranslation("সর্বোচ্চ জোনের চেয়ে বেশি দূরত্বের অর্ডারের ক্ষেত্রে ডেলিভারি সার্ভিস বা স্পেশাল চার্জ সেট করুন।", "Define handling when delivery address exceeds the highest configured delivery zone distance.")}
                </p>
              </div>
              <button 
                type="button" 
                onClick={handleSaveAboveMaxPolicy}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-black uppercase shadow-xs cursor-pointer"
              >
                <span>{getTranslation("পলিসি সেভ করুন", "Save Distance Policy")}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Above Max Distance Delivery Fee (৳)</label>
                <input 
                  type="number" 
                  min={0} 
                  value={aboveMaxDistanceFee} 
                  onChange={(e) => setAboveMaxDistanceFee(Number(e.target.value))} 
                  disabled={deliveryUnavailableAboveMax}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-extrabold disabled:opacity-50" 
                />
              </div>

              <div className="flex items-center p-3 bg-slate-50 border border-slate-200 rounded-xl space-x-3">
                <input 
                  type="checkbox" 
                  id="deliveryUnavailableAboveMax"
                  checked={deliveryUnavailableAboveMax} 
                  onChange={(e) => setDeliveryUnavailableAboveMax(e.target.checked)} 
                  className="rounded text-rose-600 focus:ring-rose-500 h-4 w-4 cursor-pointer" 
                />
                <label htmlFor="deliveryUnavailableAboveMax" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                  {getTranslation("সর্বোচ্চ সীমার বাইরে ডেলিভারি অনুপলব্ধ রাখুন (Delivery Unavailable)", "Mark delivery as unavailable for addresses above max zone distance")}
                </label>
              </div>
            </div>
          </div>

        </div>
      )}

      {activeSettingsSubTab === "banners" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button 
              onClick={() => {
                setEditingBanner(null);
                setBanId("banner_" + Date.now().toString(36));
                setBanTitleBn("");
                setBanTitleEn("");
                setBanTagBn("");
                setBanTagEn("");
                setBanGradient("from-emerald-600 to-teal-500");
                setBanImage("");
                setShowBannerForm(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-4 py-2 text-xs font-black flex items-center gap-2 cursor-pointer transition uppercase"
            >
              <Plus className="w-4 h-4" />
              <span>{getTranslation("নতুন ব্যানার", "Add Promo Banner")}</span>
            </button>
          </div>

          {showBannerForm && (
            <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl animate-fade-in">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
                {getTranslation("ব্যানার কন্টেন্ট এডিটর", "Banner Asset Editor")}
              </h3>
              <form onSubmit={handleSaveBanner} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Banner Unique Key *</label>
                  <input type="text" required placeholder="e.g. referral_offer" value={banId} onChange={(e) => setBanId(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Tailwind Gradient Classes</label>
                  <input type="text" value={banGradient} onChange={(e) => setBanGradient(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Title (English) *</label>
                  <input type="text" required value={banTitleEn} onChange={(e) => setBanTitleEn(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Title (Bangla) *</label>
                  <input type="text" required value={banTitleBn} onChange={(e) => setBanTitleBn(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Tag / Promo Subtext (English)</label>
                  <input type="text" value={banTagEn} onChange={(e) => setBanTagEn(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Tag / Promo Subtext (Bangla)</label>
                  <input type="text" value={banTagBn} onChange={(e) => setBanTagBn(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs" />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Banner Graphic Image</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="text" 
                      placeholder="Paste Image URL or Upload File" 
                      value={banImage} 
                      onChange={(e) => setBanImage(e.target.value)}
                      className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"
                    />
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleImageFileChange} 
                      accept="image/*" 
                      className="hidden" 
                    />
                    <button 
                      type="button"
                      disabled={uploadingImage}
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer"
                    >
                      {uploadingImage ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      <span>{getTranslation("ফাইল আপলোড", "Upload Image")}</span>
                    </button>
                  </div>
                  {banImage && (
                    <div className="relative w-32 h-16 rounded-xl overflow-hidden border border-slate-200 mt-2 bg-white">
                      <img src={banImage} alt="Preview" className="w-full h-full object-cover" />
                      <button 
                        type="button" 
                        onClick={() => setBanImage("")} 
                        className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 hover:opacity-100 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="md:col-span-2 flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="banActive" 
                    checked={banActive} 
                    onChange={(e) => setBanActive(e.target.checked)} 
                    className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 cursor-pointer" 
                  />
                  <label htmlFor="banActive" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                    {getTranslation("সক্রিয় রাখুন (Active / Enabled)", "Keep active and show on home slider")}
                  </label>
                </div>

                <div className="md:col-span-2 flex justify-end gap-2 mt-2">
                  <button type="button" onClick={() => setShowBannerForm(false)} className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl text-xs font-black uppercase">{getTranslation("বাতিল", "Cancel")}</button>
                  <button type="submit" disabled={savingBanner} className="bg-emerald-600 text-white px-5 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-1">
                    {savingBanner && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>{getTranslation("সংরক্ষণ", "Save Banner")}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {banners.map((b) => (
              <div key={b.id} className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm flex flex-col justify-between">
                <div>
                  {b.image && (
                    <div className={`w-full h-24 rounded-xl mb-3 overflow-hidden bg-gradient-to-r ${b.bgGradient || "from-emerald-600 to-teal-500"} relative flex items-center justify-between p-4 text-white`}>
                      <div className="z-10 max-w-[60%]">
                        <span className="text-[8px] uppercase font-black tracking-wider opacity-85">{getTranslation(b.tagBn, b.tagEn)}</span>
                        <h4 className="text-xs font-black line-clamp-2 leading-tight mt-0.5">{getTranslation(b.titleBn, b.titleEn)}</h4>
                      </div>
                      <img src={b.image} alt={b.titleEn} className="absolute right-2 bottom-0 h-20 w-auto object-contain z-0 drop-shadow referrer-policy" referrerPolicy="no-referrer" />
                    </div>
                  )}
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase font-mono">{b.id}</span>
                      <h4 className="font-extrabold text-sm text-slate-800 mt-0.5">{getTranslation(b.titleBn, b.titleEn)}</h4>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">{getTranslation(b.tagBn, b.tagEn)}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-slate-50 pt-3 mt-4">
                  <button 
                    onClick={() => handleToggleBannerActive(b)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition cursor-pointer ${
                      b.isActive !== false 
                        ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                        : "bg-slate-50 text-slate-400 border border-slate-200"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${b.isActive !== false ? "bg-emerald-500" : "bg-slate-400"}`}></span>
                    <span>{b.isActive !== false ? getTranslation("সক্রিয়", "Active") : getTranslation("নিষ্ক্রিয়", "Inactive")}</span>
                  </button>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => handleOpenEditBanner(b)}
                      className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 transition cursor-pointer"
                      title="Edit Banner"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteBanner(b.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition cursor-pointer"
                      title="Delete Banner"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. PWA & Dynamic QR Code Management Subtab */}
      {activeSettingsSubTab === "pwa" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Header Card */}
          <div className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-700 rounded-2xl p-5 text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-emerald-200" />
                <h3 className="text-base sm:text-lg font-black tracking-tight">
                  {getTranslation("PWA ও ডাইনামিক QR কোড সিস্টেম", "PWA & Dynamic QR Code System")}
                </h3>
              </div>
              <p className="text-xs text-emerald-100 font-medium max-w-xl">
                {getTranslation(
                  "ক্রেতারা যেকোনো মোবাইল ক্যামেরা দিয়ে এই QR কোড স্ক্যান করলেই স্বয়ংক্রিয়ভাবে ওয়েবসাইট ওপেন হবে এবং ‘কাচা বাজার অ্যাপ’ ইনস্টল করার প্রম্পট পাবেন।",
                  "Customers can scan this QR code with any mobile camera to open the store and receive an instant 1-click app install prompt."
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.open(adminPwaUrl, "_blank")}
              className="px-4 py-2 bg-white text-emerald-800 hover:bg-emerald-50 active:scale-95 font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              <span>{getTranslation("ইনস্টল পেজ টেস্ট করুন", "Test Install Page")}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Printable QR Code Poster */}
            <div className="lg:col-span-5 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col items-center text-center space-y-4">
              <div className="w-full bg-gradient-to-b from-emerald-50 to-slate-50 border-2 border-emerald-200 rounded-2xl p-5 shadow-inner flex flex-col items-center">
                <div className="flex items-center space-x-2 mb-3">
                  <img src={APP_LOGO_URL} alt="কাঁচা বাজার" className="w-7 h-7 rounded-full border border-emerald-300 object-contain bg-white p-0.5" />
                  <span className="text-emerald-800 font-black text-sm">কাঁচা বাজার অনলাইন শপ</span>
                </div>
                
                <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-100 relative">
                  {adminQrGenerating ? (
                    <div className="w-48 h-48 flex items-center justify-center text-xs text-slate-400">
                      {getTranslation("QR তৈরি হচ্ছে...", "Generating QR...")}
                    </div>
                  ) : adminQrDataUrl ? (
                    <div className="relative">
                      <img src={adminQrDataUrl} alt="PWA QR Code" className="w-48 h-48 sm:w-52 sm:h-52 object-contain rounded-lg" />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-10 h-10 rounded-full bg-white p-0.5 shadow border border-emerald-500 flex items-center justify-center">
                          <img src={APP_LOGO_URL} alt="কাঁচা বাজার" className="w-full h-full rounded-full object-contain p-0.5" />
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>

                <p className="text-[11px] font-bold text-slate-600 mt-3 bg-white px-3 py-1 rounded-full border border-slate-100 shadow-2xs">
                  📱 {getTranslation("স্ক্যান করে অ্যাপ ইনস্টল করুন", "Scan to Install App")}
                </p>
              </div>

              {/* Download & Print Buttons */}
              <div className="w-full grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!adminQrDataUrl) return;
                    const a = document.createElement("a");
                    a.href = adminQrDataUrl;
                    a.download = "kacha-bazar-qr-code.png";
                    a.click();
                    triggerToast("QR কোড ডাউনলোড হয়েছে!", "QR Code downloaded!");
                  }}
                  className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>{getTranslation("ডাউনলোড QR", "Download QR")}</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 active:scale-98 text-slate-700 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>{getTranslation("প্রিন্ট পোস্টার", "Print Poster")}</span>
                </button>
              </div>
            </div>

            {/* Right Column: Configuration & Status */}
            <div className="lg:col-span-7 space-y-4">
              {/* Dynamic Target Link Customizer */}
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-3">
                <h4 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-emerald-600" />
                  <span>{getTranslation("QR কোডের টার্গেট লিংক (URL)", "Target QR Code URL")}</span>
                </h4>
                <p className="text-xs text-slate-500">
                  {getTranslation(
                    "আপনার কাস্টম ডোমেইন থাকলে এখানে লিংক আপডেট করতে পারেন। সাথে সাথেই QR কোড স্বয়ংক্রিয়ভাবে আপডেট হয়ে যাবে।",
                    "Update this URL if using a custom domain. The QR code updates automatically in real-time."
                  )}
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={adminPwaUrl}
                    onChange={(e) => setAdminPwaUrl(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono text-slate-700 bg-slate-50 focus:bg-white transition"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(adminPwaUrl);
                        triggerToast("লিংক কপি হয়েছে!", "URL copied to clipboard!");
                      } catch (e) {
                        console.error(e);
                      }
                    }}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer shrink-0"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{getTranslation("কপি", "Copy")}</span>
                  </button>
                </div>
              </div>

              {/* PWA Manifest Specifications Spec List */}
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-3">
                <h4 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>{getTranslation("PWA কনফিগারেশন স্ট্যাটাস", "PWA Configuration Status")}</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">App Name</span>
                    <span className="font-bold text-slate-800 truncate block">কাচা বাজার</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Theme Color</span>
                    <span className="font-bold text-emerald-600 block">#059669 (Emerald)</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Display Mode</span>
                    <span className="font-bold text-slate-800 block">Standalone</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Service Worker</span>
                    <span className="font-bold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Active (v1)
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Adaptive Icon</span>
                    <span className="font-bold text-slate-800 block">512x512 Maskable</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Platforms</span>
                    <span className="font-bold text-slate-800 block">Android, iOS, PC</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= SUPABASE DATABASE MIGRATION SUBTAB ================= */}
      {activeSettingsSubTab === "supabase" && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white rounded-3xl p-6 sm:p-8 shadow-lg shadow-emerald-900/10 relative overflow-hidden">
            <div className="absolute -right-6 -bottom-6 w-40 h-40 bg-white/10 rounded-full blur-xl pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-xs font-black uppercase tracking-wider text-emerald-100">
                  <Database className="w-3.5 h-3.5" />
                  <span>{getTranslation("সুপাবেস ক্লাউড ডেটাবেস", "Supabase Cloud Database")}</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black">
                  {getTranslation("সুপাবেস (PostgreSQL) মাইগ্রেশন হাব", "Supabase (PostgreSQL) Migration Hub")}
                </h3>
                <p className="text-emerald-100 text-xs sm:text-sm max-w-xl">
                  {getTranslation(
                    "আপনার কাঁচাবাজার প্রজেক্টটি এখন সরাসরি Supabase-এর সাথে সংযুক্ত। নিচে দেওয়া SQL কোডটি আপনার Supabase SQL Editor-এ রান করার পর যেকোনো সময় এক ক্লিকে ফায়ারবেস থেকে সব ডেটা ট্রান্সফার করতে পারবেন।",
                    "Your KachaBazar project is now integrated with Supabase. After running the SQL schema in your Supabase SQL Editor, you can sync all data with a single click."
                  )}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <button
                  type="button"
                  disabled={checkingSupabase}
                  onClick={async () => {
                    setCheckingSupabase(true);
                    try {
                      const res = await checkSupabaseStatus();
                      setSupabaseCheckInfo(res);
                      if (res.connected) {
                        triggerToast("Supabase কানেকশন সফল!", res.message);
                      } else {
                        triggerToast("কানেকশন চেক ব্যর্থ", res.message);
                      }
                    } catch (err: any) {
                      triggerToast("ত্রুটি", err?.message || "Check error");
                    } finally {
                      setCheckingSupabase(false);
                    }
                  }}
                  className="px-4 py-2.5 bg-white text-emerald-800 hover:bg-emerald-50 active:scale-95 font-black text-xs rounded-xl shadow transition flex items-center gap-2 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${checkingSupabase ? "animate-spin" : ""}`} />
                  <span>{checkingSupabase ? getTranslation("যাচাই হচ্ছে...", "Checking...") : getTranslation("কানেকশন টেস্ট করুন", "Test Connection")}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Connection Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Project URL</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700">Connected</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl font-mono text-xs text-slate-700 break-all border border-slate-100 select-all">
                {SUPABASE_URL}
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Anon Public Key</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700">sb_publishable</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl font-mono text-xs text-slate-700 truncate border border-slate-100 select-all" title={SUPABASE_ANON_KEY}>
                {SUPABASE_ANON_KEY}
              </div>
            </div>
          </div>

          {/* Status Result Display if available */}
          {supabaseCheckInfo && (
            <div className={`p-4 rounded-2xl border ${supabaseCheckInfo.connected ? "bg-emerald-50/70 border-emerald-200 text-emerald-900" : "bg-amber-50/70 border-amber-200 text-amber-900"}`}>
              <div className="flex items-start gap-3">
                {supabaseCheckInfo.connected ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1 text-xs">
                  <div className="font-black text-sm">{supabaseCheckInfo.message}</div>
                  {supabaseCheckInfo.tableCounts && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {Object.entries(supabaseCheckInfo.tableCounts).map(([tbl, cnt]) => (
                        <span key={tbl} className="px-2.5 py-1 bg-white rounded-lg border border-emerald-200 font-bold text-[11px] text-slate-700">
                          {tbl}: <strong className="text-emerald-700">{cnt}</strong>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 1: SQL Schema instructions and copy */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-slate-900 text-white font-black text-xs flex items-center justify-center shrink-0">
                  ১
                </div>
                <div>
                  <h4 className="font-black text-slate-800 text-sm">
                    {getTranslation("সুপাবেস এসকিউএল স্কিমা স্ক্রিপ্ট (SQL Schema)", "Supabase SQL Schema Script")}
                  </h4>
                  <p className="text-slate-500 text-xs">
                    {getTranslation("সুপাবেস SQL Editor-এ একবার রান করে সব টেবিল তৈরি করে নিন", "Run in Supabase SQL Editor once to create all database tables")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
                      setCopiedSql(true);
                      triggerToast("SQL স্ক্রিপ্ট কপি হয়েছে!", "SQL schema copied to clipboard!");
                      setTimeout(() => setCopiedSql(false), 3000);
                    } catch (e) {
                      triggerToast("কপি করা যায়নি", "Failed to copy");
                    }
                  }}
                  className={`px-4 py-2 text-xs font-black rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs ${
                    copiedSql ? "bg-emerald-600 text-white" : "bg-slate-900 hover:bg-black text-white"
                  }`}
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? getTranslation("কপি হয়েছে!", "Copied!") : getTranslation("সম্পূর্ণ SQL স্ক্রিপ্ট কপি করুন", "Copy SQL Schema")}</span>
                </button>
                <a
                  href="https://supabase.com/dashboard/project/syqiyurjeuibpprfrmwa/sql/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>{getTranslation("SQL Editor খুলুন", "Open SQL Editor")}</span>
                </a>
              </div>
            </div>

            {/* Quick How to run steps */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <div className="font-black text-slate-700 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-black">১</span>
                  <span>SQL Editor-এ যান</span>
                </div>
                <p className="text-slate-500 text-[11px]">
                  আপনার Supabase Dashboard-এর বাম পাশের মেনু থেকে <strong>SQL Editor</strong>-এ ক্লিক করে <strong>New query</strong> খুলুন।
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <div className="font-black text-slate-700 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-black">২</span>
                  <span>কোড পেস্ট করুন</span>
                </div>
                <p className="text-slate-500 text-[11px]">
                  উপরের <strong>"সম্পূর্ণ SQL স্ক্রিপ্ট কপি করুন"</strong> বাটনে ক্লিক করে কোডটি পেস্ট (Ctrl+V) করুন।
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <div className="font-black text-slate-700 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center text-[10px] font-black">৩</span>
                  <span>Run বাটনে চাপুন</span>
                </div>
                <p className="text-slate-500 text-[11px]">
                  ডানপাশের সবুজ <strong>Run</strong> বাটনে চাপ দিন। ২-৩ সেকেন্ডে Success মেসেজ চলে আসবে এবং সব টেবিল প্রস্তুত হবে!
                </p>
              </div>
            </div>

            {/* Code preview snippet */}
            <div className="relative rounded-2xl bg-slate-900 text-slate-200 p-4 font-mono text-[11px] max-h-56 overflow-y-auto scrollbar-thin">
              <pre className="whitespace-pre-wrap">{SUPABASE_SCHEMA_SQL.slice(0, 1400)}
{"\n-- ... [এবং আরও অন্যান্য টেবিল ও RLS পলিসি সহ সম্পূর্ণ স্ক্রিপ্ট কপি বাটনে রয়েছে] ..."}</pre>
            </div>
          </div>

          {/* Step 2: Live Sync from Firestore to Supabase */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                  ২
                </div>
                <div>
                  <h4 className="font-black text-slate-800 text-sm">
                    {getTranslation("ফায়ারবেস থেকে সুপাবেসে ডেটা সিঙ্ক করুন (Live Data Migration)", "Live Data Sync to Supabase")}
                  </h4>
                  <p className="text-slate-500 text-xs">
                    {getTranslation("বিদ্যমান ক্যাটাগরি, প্রোডাক্ট, স্টাফ, পার্টনার শপ ও অর্ডারগুলো সুপাবেসে কপি করুন", "Transfer current products, categories, staff, partner shops, and orders to Supabase")}
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={syncingSupabase}
                onClick={async () => {
                  setSyncingSupabase(true);
                  setSyncResult(null);
                  setSyncProgress({ step: "ডেটা লোড হচ্ছে...", total: 0, completed: 0, status: "running" });

                  try {
                    // Fetch from Firestore
                    const [catSnap, subcatSnap, prodSnap, staffSnap, shopSnap, ordSnap] = await Promise.all([
                      getDocs(collection(db, "categories")).catch(() => ({ docs: [] } as any)),
                      getDocs(collection(db, "subcategories")).catch(() => ({ docs: [] } as any)),
                      getDocs(collection(db, "products")).catch(() => ({ docs: [] } as any)),
                      getDocs(collection(db, "staff")).catch(() => ({ docs: [] } as any)),
                      getDocs(collection(db, "partner_shops")).catch(() => ({ docs: [] } as any)),
                      getDocs(collection(db, "orders")).catch(() => ({ docs: [] } as any)),
                    ]);

                    const firestoreCats = (catSnap.docs || []).map((d: any) => ({ ...d.data(), id: d.id }));
                    const firestoreSubcats = (subcatSnap.docs || []).map((d: any) => ({ ...d.data(), id: d.id }));
                    const firestoreProds = (prodSnap.docs || []).map((d: any) => ({ ...d.data(), id: d.id }));
                    const staff = (staffSnap.docs || []).map((d: any) => ({ ...d.data(), id: d.id }));
                    const partnerShops = (shopSnap.docs || []).map((d: any) => ({ ...d.data(), id: d.id }));
                    const orders = (ordSnap.docs || []).map((d: any) => ({ ...d.data(), id: d.id }));

                    // Merge baseline catalog categories and firestore categories
                    const categories = [...CATEGORIES, ...firestoreCats];

                    // Merge baseline products and firestore products
                    const products = [...ALL_PRODUCTS, ...firestoreProds];

                    // Build subcategories map from products and any from Firestore
                    const subcatMap = new Map<string, any>();
                    for (const s of firestoreSubcats) {
                      if (s && s.id) subcatMap.set(String(s.id), s);
                    }
                    for (const p of products) {
                      const subName = p.subcategory || p.subCategory;
                      const catId = p.categoryId || p.category;
                      if (subName && typeof subName === "string" && subName.trim() && catId) {
                        const slug = subName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\-]/g, "") || `sub_${subName.length}`;
                        const subId = p.subCategoryId || `sub_${catId}_${slug}`;
                        if (!subcatMap.has(subId)) {
                          subcatMap.set(subId, {
                            id: subId,
                            nameBn: subName,
                            nameEn: p.subcategoryEn || subName,
                            categoryId: String(catId),
                            categorySlug: String(catId),
                            displayOrder: 0,
                            isActive: true,
                          });
                        }
                      }
                    }
                    const subcategories = Array.from(subcatMap.values());

                    const res = await syncAllToSupabase(
                      { categories, subcategories, products, staff, partnerShops, orders },
                      (p) => setSyncProgress(p)
                    );

                    setSyncResult(res);

                    // Re-check Supabase status counts
                    const checkRes = await checkSupabaseStatus();
                    setSupabaseCheckInfo(checkRes);

                    if (res.success) {
                      triggerToast("সুপাবেস ডেটা সিঙ্ক সফল!", "All data successfully synced to Supabase!");
                    } else {
                      triggerToast("সিঙ্ক সম্পন্ন হয়েছে সতর্কতাসহ", "Sync finished with some issues");
                    }
                  } catch (err: any) {
                    console.error("Sync error:", err);
                    triggerToast("সিঙ্ক ব্যর্থ হয়েছে", err?.message || "Sync error");
                  } finally {
                    setSyncingSupabase(false);
                  }
                }}
                className={`px-5 py-3 text-xs font-black rounded-xl text-white transition flex items-center gap-2 cursor-pointer shadow-md ${
                  syncingSupabase ? "bg-emerald-400 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700 active:scale-95"
                }`}
              >
                <Play className={`w-3.5 h-3.5 fill-current ${syncingSupabase ? "animate-pulse" : ""}`} />
                <span>{syncingSupabase ? getTranslation("সিঙ্ক হচ্ছে...", "Syncing...") : getTranslation("১-ক্লিকে ডেটা সিঙ্ক শুরু করুন", "Start 1-Click Sync")}</span>
              </button>
            </div>

            {/* Sync Progress Indicator */}
            {syncProgress && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>{syncProgress.step}</span>
                  {syncProgress.total > 0 && (
                    <span className="text-emerald-700">
                      {syncProgress.completed} / {syncProgress.total}
                    </span>
                  )}
                </div>
                {syncingSupabase && (
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div className="bg-emerald-600 h-2 rounded-full animate-pulse w-full" />
                  </div>
                )}
              </div>
            )}

            {/* Sync Results Box */}
            {syncResult && (
              <div className={`p-4 rounded-2xl border ${syncResult.success ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"} space-y-2 text-xs`}>
                <div className="font-black text-slate-800 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>সিঙ্ক ফলাফল (Synced Records):</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(syncResult.details).map(([k, v]) => (
                    <div key={k} className="p-2.5 bg-white rounded-xl border border-slate-200/60 font-bold">
                      <span className="text-[10px] uppercase text-slate-400 block">{k}</span>
                      <span className="text-sm text-emerald-700">{v} টি রেকর্ড</span>
                    </div>
                  ))}
                </div>
                {syncResult.errors.length > 0 && (
                  <div className="pt-2 text-rose-600 font-medium text-[11px] space-y-1">
                    <div className="font-bold">সতর্কতা / ত্রুটি:</div>
                    {syncResult.errors.map((e, idx) => (
                      <div key={idx}>• {e}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
