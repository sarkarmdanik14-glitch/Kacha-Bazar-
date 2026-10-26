import React, { useState, useEffect, useRef } from "react";
import { 
  Settings, Check, RefreshCw, MapPin, Building, Phone, Mail, 
  ToggleLeft, ToggleRight, ImageIcon, Plus, Trash2, Edit, Upload, Navigation, ShieldAlert, Info,
  QrCode, Smartphone, Download, Copy, ExternalLink, Sparkles, CheckCircle2, Globe, Printer,
  Megaphone, AlertCircle, Eye, EyeOff, Save, Bell, Play, Pause, CheckCircle, ArrowRight, RotateCcw,
  Search, Volume2, VolumeX, Mic, Music
} from "lucide-react";
import QRCode from "qrcode";
import { APP_LOGO_URL } from "../../constants/branding";
import { saveLiveNoticeToSupabase, subscribeToSupabaseLiveNotice } from "../../lib/supabaseLiveService";
import { supabase } from "../../lib/supabase";
import { DeliveryZone, DEFAULT_DELIVERY_ZONES, DEFAULT_STORE_LOCATION } from "../../lib/delivery";
import { LiveNoticeConfig, DEFAULT_LIVE_NOTICE } from "../../types";
import { createTranslator } from "../../lib/formatUtils";
import { apiClient } from "../../lib/apiClient";

interface AdminSettingsTabProps {
  settings: any;
  lang: "bn" | "en";
  triggerToast: (bn: string, en: string) => void;
}

export default function AdminSettingsTab({ settings, lang, triggerToast }: AdminSettingsTabProps) {
  const getTranslation = createTranslator(lang);

  const [activeSettingsSubTab, setActiveSettingsSubTab] = useState<"global" | "notice" | "delivery" | "pwa">("global");
  const [savingSettings, setSavingSettings] = useState<boolean>(false);

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

  // Welcome Voice Greeting States
  const [welcomeAudioUrl, setWelcomeAudioUrl] = useState<string>(settings?.welcomeAudioUrl || "");
  const [enableWelcomeVoice, setEnableWelcomeVoice] = useState<boolean>(
    typeof settings?.enableWelcomeVoice === "boolean"
      ? settings.enableWelcomeVoice
      : Boolean(settings?.welcomeAudioUrl)
  );
  const [uploadingAudio, setUploadingAudio] = useState<boolean>(false);
  const [isPlayingPreview, setIsPlayingPreview] = useState<boolean>(false);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

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
      if (settings.welcomeAudioUrl !== undefined) {
        setWelcomeAudioUrl(settings.welcomeAudioUrl);
      }
      if (settings.enableWelcomeVoice !== undefined) {
        setEnableWelcomeVoice(settings.enableWelcomeVoice);
      }
    }
  }, [settings]);

  // Sync Live Notice config directly from Supabase
  useEffect(() => {
    const unsub = subscribeToSupabaseLiveNotice((d) => {
      if (d) {
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
    });
    return () => unsub();
  }, []);

  // Save Live Notice handler to Supabase
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
        orderDisabled: true
      };

      await saveLiveNoticeToSupabase(payload);
      await apiClient.post("/api/settings/notice", { settings: payload }, { silent: true }).catch(() => {});

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

  // Handle Custom Welcome Voice Audio Upload
  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("audio/") && !file.name.match(/\.(mp3|wav|m4a|aac|ogg|webm)$/i)) {
      triggerToast("অনুগ্রহ করে একটি অডিও ফাইল (MP3, WAV, M4A) নির্বাচন করুন।", "Please select a valid audio file (MP3, WAV, M4A).");
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      triggerToast("অডিও ফাইলের সাইজ ২৫ মেগাবাইটের কম হতে হবে।", "Audio size must be under 25MB.");
      return;
    }

    setUploadingAudio(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const dataUrl = reader.result as string;
          const res = await apiClient.post("/api/upload-audio", {
            dataUrl,
            filename: file.name,
            folder: "audio",
          });

          if (res?.url) {
            setWelcomeAudioUrl(res.url);
            triggerToast("ভয়েস অডিও ফাইল সফলভাবে আপলোড হয়েছে! 'সেটিংস সেভ করুন'-এ চাপ দিন।", "Voice audio uploaded successfully! Click 'Save Global Settings'.");
          } else {
            throw new Error(res?.message || "Upload failed");
          }
        } catch (err: any) {
          console.error("Audio upload error:", err);
          triggerToast(err.message || "অডিও আপলোড ব্যর্থ হয়েছে।", "Failed to upload audio.");
        } finally {
          setUploadingAudio(false);
          if (audioInputRef.current) audioInputRef.current.value = "";
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setUploadingAudio(false);
      triggerToast("অডিও ফাইল পড়তে সমস্যা হয়েছে।", "Error reading audio file.");
    }
  };

  // Preview Welcome Voice Audio in Admin Panel
  const handleTogglePreviewAudio = () => {
    if (isPlayingPreview) {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
        audioPreviewRef.current.currentTime = 0;
      }
      setIsPlayingPreview(false);
    } else {
      const src = welcomeAudioUrl.trim();
      if (!src) {
        triggerToast("কোনো অডিও ইউআরএল দেওয়া নেই। প্রথমে একটি অডিও লিঙ্ক দিন বা ফাইল আপলোড করুন।", "No audio URL. Please enter an audio URL or upload an audio file first.");
        return;
      }
      if (!audioPreviewRef.current) {
        audioPreviewRef.current = new Audio(src);
        audioPreviewRef.current.onended = () => setIsPlayingPreview(false);
        audioPreviewRef.current.onerror = () => {
          setIsPlayingPreview(false);
          triggerToast("অডিও প্লে করতে সমস্যা হয়েছে। লিঙ্কটি সঠিক কি না পরীক্ষা করুন।", "Could not play audio. Please verify URL.");
        };
      } else {
        audioPreviewRef.current.src = src;
      }
      audioPreviewRef.current.play().then(() => {
        setIsPlayingPreview(true);
      }).catch((e) => {
        console.warn("Audio play error:", e);
        setIsPlayingPreview(false);
        triggerToast("অডিও প্লে করা সম্ভব হয়নি।", "Playback failed.");
      });
    }
  };

  // Resilient multi-tier persistence for static hosting & Supabase
  const persistGlobalSettingsPartial = async (partialSettings: Record<string, any>) => {
    // 1. LocalStorage instant cache & live event dispatch
    try {
      if (typeof window !== "undefined") {
        const existing = JSON.parse(window.localStorage.getItem("kachabazar_global_settings") || "{}");
        const merged = { ...existing, ...settings, ...partialSettings, updatedAt: new Date().toISOString() };
        window.localStorage.setItem("kachabazar_global_settings", JSON.stringify(merged));
        window.dispatchEvent(new CustomEvent("megabazar_settings_updated", { detail: merged }));
      }
    } catch {}

    // 2. Direct Supabase site_settings upsert (primary cloud database)
    try {
      const { data: currentData } = await supabase
        .from("site_settings")
        .select("settings")
        .eq("key", "global_settings")
        .maybeSingle();

      const mergedSettings = {
        ...(currentData?.settings || {}),
        ...settings,
        ...partialSettings,
        updatedAt: new Date().toISOString()
      };

      await supabase.from("site_settings").upsert({
        key: "global_settings",
        settings: mergedSettings,
        updated_at: new Date().toISOString()
      });
    } catch {
      // site_settings table may be created via SQL migration
    }

    // 3. Server API fallback for dev/fullstack environments
    try {
      await apiClient.post("/api/settings/global", { settings: partialSettings }, { silent: true });
    } catch {
      // Silent on static hosting
    }
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
        welcomeAudioUrl: welcomeAudioUrl.trim(),
        enableWelcomeVoice,
        deliveryChargesByLocation: deliveryChargesMap,
        updatedAt: new Date().toISOString()
      };

      await persistGlobalSettingsPartial(payload);

      if (typeof window !== "undefined") {
        window.localStorage.setItem("megabazar_welcome_audio_url", welcomeAudioUrl.trim());
        window.localStorage.setItem("megabazar_welcome_audio_enabled", enableWelcomeVoice ? "true" : "false");
      }

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
      await persistGlobalSettingsPartial({ storeLocation });
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

      await persistGlobalSettingsPartial({ deliveryZones: updatedZones });

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
      await persistGlobalSettingsPartial({ deliveryZones: updatedZones });
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
      await persistGlobalSettingsPartial({ deliveryZones: updatedZones });
      setDeliveryZones(updatedZones);
      triggerToast("ডেলিভারি জোন ডিলিট করা হয়েছে!", "Delivery zone deleted!");
    } catch (err) {
      console.error(err);
    }
  };

  // Save Above Max Distance Policy
  const handleSaveAboveMaxPolicy = async () => {
    try {
      await persistGlobalSettingsPartial({
        aboveMaxDistanceFee: Number(aboveMaxDistanceFee),
        deliveryUnavailableAboveMax: deliveryUnavailableAboveMax
      });
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
      await persistGlobalSettingsPartial({ deliveryChargesByLocation: nextMap });
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
      await persistGlobalSettingsPartial({ deliveryChargesByLocation: nextMap });
      triggerToast("ট্যারিফ ডিলিট করা হয়েছে!", "Location delivery tariff deleted!");
    } catch (err) {
      console.error(err);
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
          onClick={() => setActiveSettingsSubTab("pwa")}
          className={`px-5 py-2.5 text-xs font-black cursor-pointer uppercase tracking-wider border-b-2 flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
            activeSettingsSubTab === "pwa" ? "border-emerald-600 text-emerald-600" : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <QrCode className="w-3.5 h-3.5" />
          <span>{getTranslation("PWA ও QR কোড", "PWA & QR Posters")}</span>
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

            {/* Simulated Live Notice Box */}
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
                    placeholder="মেগা বাজার ওয়েবসাইটের কাজ এখনও চলমান।"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-black outline-none focus:border-rose-500 focus:bg-white transition text-slate-800"
                  />
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">
                    {getTranslation("ডিফল্ট: মেগা বাজার ওয়েবসাইটের কাজ এখনও চলমান।", "Default: Kacha Bazar website is currently under development.")}
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
          
          {/* Welcome Voice Greeting Card */}
          <div className="bg-gradient-to-r from-emerald-50/80 via-teal-50/60 to-slate-50 border-2 border-emerald-200/90 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
                  <Mic className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                    <span>{getTranslation("ওয়েলকাম ভয়েস বার্তা (Welcome Voice Greeting)", "Welcome Voice Greeting")}</span>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${enableWelcomeVoice ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"}`}>
                      {enableWelcomeVoice ? getTranslation("সচল", "ACTIVE") : getTranslation("বন্ধ", "OFF")}
                    </span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">
                    {getTranslation("ডিফল্ট ভয়েস বন্ধ রাখা হয়েছে। এখানে যে অডিও ইউআরএল (MP3/WAV) দেবেন, ওয়েবসাইট ওপেন করার পর শুধুমাত্র সেটাই বাজবে।", "Default voice is OFF. Only the audio URL configured here will play when visitors open the site.")}
                  </p>
                </div>
              </div>

              {/* On/Off Toggle Button */}
              <button
                type="button"
                onClick={() => setEnableWelcomeVoice(!enableWelcomeVoice)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                  enableWelcomeVoice 
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-sm" 
                    : "bg-slate-100 text-slate-600 border-slate-200"
                }`}
              >
                {enableWelcomeVoice ? (
                  <>
                    <Volume2 className="w-4 h-4" />
                    <span>{getTranslation("ভয়েস বার্তা সচল", "Voice Enabled")}</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="w-4 h-4 text-slate-400" />
                    <span>{getTranslation("ভয়েস বার্তা বন্ধ", "Voice Disabled")}</span>
                  </>
                )}
              </button>
            </div>

            {/* Audio Management Controls */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              <div className="md:col-span-7 space-y-2">
                <label className="text-[11px] font-extrabold text-slate-700 flex items-center justify-between">
                  <span>{getTranslation("অডিও ফাইলের লিঙ্ক বা আপলোড (URL)", "Audio File URL or Upload")}</span>
                  <span className="text-[10px] text-slate-400 font-semibold">(MP3, WAV, M4A, OGG)</span>
                </label>
                <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 shadow-2xs">
                  <Music className="w-4 h-4 text-emerald-600 mr-2 shrink-0" />
                  <input
                    type="text"
                    value={welcomeAudioUrl}
                    onChange={(e) => setWelcomeAudioUrl(e.target.value)}
                    placeholder="অডিও লিংক দিন অথবা ডানে আপলোড বাটনে ক্লিক করুন..."
                    className="bg-transparent flex-1 outline-none text-slate-800 font-medium text-xs placeholder:text-slate-400"
                  />
                  {welcomeAudioUrl && (
                    <button
                      type="button"
                      onClick={() => setWelcomeAudioUrl("")}
                      className="text-slate-400 hover:text-rose-500 text-xs px-1.5 font-bold cursor-pointer"
                      title="Clear audio URL"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div className="text-[11px] text-slate-600 flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-slate-500">বর্তমান স্ট্যাটাস:</span>
                  {welcomeAudioUrl.trim() ? (
                    <span className="text-emerald-700 font-bold bg-emerald-100/70 px-2 py-0.5 rounded-md border border-emerald-200">
                      ✨ কাস্টম অডিও ইউআরএল সক্রিয়
                    </span>
                  ) : (
                    <span className="text-rose-700 font-semibold bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                      🔕 ডিফল্ট ভয়েস বন্ধ রয়েছে (কোনো অডিও ইউআরএল দেওয়া নেই)
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons: Upload & Test Preview */}
              <div className="md:col-span-5 flex flex-wrap sm:flex-nowrap gap-2 items-center justify-start md:justify-end">
                <input
                  type="file"
                  ref={audioInputRef}
                  onChange={handleAudioUpload}
                  accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.webm"
                  className="hidden"
                />

                <button
                  type="button"
                  disabled={uploadingAudio}
                  onClick={() => audioInputRef.current?.click()}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white px-3.5 py-2.5 rounded-xl text-xs font-black shadow-sm transition cursor-pointer disabled:opacity-50"
                >
                  {uploadingAudio ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>{getTranslation("আপলোড হচ্ছে...", "Uploading...")}</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>{getTranslation("ভয়েস রেকর্ড আপলোড", "Upload Voice Record")}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleTogglePreviewAudio}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-black border transition cursor-pointer shadow-2xs ${
                    isPlayingPreview
                      ? "bg-rose-50 border-rose-300 text-rose-700 animate-pulse"
                      : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  {isPlayingPreview ? (
                    <>
                      <Pause className="w-3.5 h-3.5 text-rose-600" />
                      <span>{getTranslation("বন্ধ করুন", "Stop")}</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{getTranslation("টেস্ট শুনুন", "Listen Test")}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

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
                  "ক্রেতারা যেকোনো মোবাইল ক্যামেরা দিয়ে এই QR কোড স্ক্যান করলেই স্বয়ংক্রিয়ভাবে ওয়েবসাইট ওপেন হবে এবং ‘মেগা বাজার অ্যাপ’ ইনস্টল করার প্রম্পট পাবেন।",
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
                  <img src={APP_LOGO_URL} alt="মেগা বাজার" className="w-7 h-7 rounded-full border border-emerald-300 object-contain bg-white p-0.5" />
                  <span className="text-emerald-800 font-black text-sm">মেগা বাজার অনলাইন শপ</span>
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
                          <img src={APP_LOGO_URL} alt="মেগা বাজার" className="w-full h-full rounded-full object-contain p-0.5" />
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
                    <span className="font-bold text-slate-800 truncate block">মেগা বাজার</span>
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
    </div>
  );
}
