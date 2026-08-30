import React, { useState, useRef, useEffect } from "react";
import { 
  FileText, Upload, Printer, Download, Search, Trash2, 
  RefreshCw, CheckCircle2, Image as ImageIcon, UserCheck, Eye, 
  Award, Sparkles, ShieldCheck, Lock, History, ShieldAlert, CheckCircle, Clock 
} from "lucide-react";
import { 
  db, doc, setDoc, addDoc, collection, getDocs, query, orderBy, limit, serverTimestamp 
} from "../../lib/firebase";
import OrderMemoModal from "./OrderMemoModal";
import { downloadMemoPDF } from "../../lib/pdfUtils";

interface AdminMemoManagementTabProps {
  orders?: any[];
  settings?: any | null;
  lang: "bn" | "en";
  triggerToast: (bn: string, en: string) => void;
  currentUser?: any;
}

export default function AdminMemoManagementTab({
  orders = [],
  settings = null,
  lang,
  triggerToast,
  currentUser,
}: AdminMemoManagementTabProps) {
  const getTranslation = (bn: string, en: string) => (lang === "bn" ? bn : en);

  // Check if user is Super Admin (Admin/Founder)
  const isSuperAdmin = currentUser?.role === "admin" || currentUser?.role === "founder";

  // Memo Configurations Form States
  const [storeLogo, setStoreLogo] = useState<string>(settings?.storeLogo || "");
  const [storeName, setStoreName] = useState<string>(settings?.storeName || "কাঁচা বাজার");
  const [storeTagline, setStoreTagline] = useState<string>(
    settings?.storeTagline || "বিশুদ্ধ ও নিরাপদ খাদ্যের প্রতিশ্রুতি"
  );
  const [supportPhone, setSupportPhone] = useState<string>(settings?.supportPhone || "+8801722638985");
  const [founderName, setFounderName] = useState<string>(settings?.founderName || "Md Anik Sarkar");
  const [founderSignature, setFounderSignature] = useState<string>(settings?.founderSignature || "");
  const [preparedBy, setPreparedBy] = useState<string>(
    settings?.preparedBy || (lang === "bn" ? "কাঁচা বাজার টিম" : "Kancha Bazar Team")
  );
  const [thankYouMessage, setThankYouMessage] = useState<string>(
    settings?.thankYouMessage ||
      "পণ্য সরবরাহ করার জন্য আপনাকে ধন্যবাদ। কোন জিজ্ঞাসা থাকলে যোগাযোগ করুন।"
  );
  const [termsAndConditions, setTermsAndConditions] = useState<string>(
    settings?.termsAndConditions ||
      "চাঁচকৈড় বাজার, বাংলাদেশ | বিশুদ্ধ পণ্য সরবরাহে আমরা দায়বদ্ধ।"
  );

  const [uploadingLogo, setUploadingLogo] = useState<boolean>(false);
  const [uploadingSig, setUploadingSig] = useState<boolean>(false);
  const [savingSettings, setSavingSettings] = useState<boolean>(false);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAuditLogs, setLoadingAuditLogs] = useState<boolean>(false);
  const [showAuditLogs, setShowAuditLogs] = useState<boolean>(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const sigInputRef = useRef<HTMLInputElement>(null);

  // Sync with incoming Firestore settings prop
  useEffect(() => {
    if (settings) {
      if (settings.storeLogo !== undefined) setStoreLogo(settings.storeLogo);
      if (settings.storeName) setStoreName(settings.storeName);
      if (settings.storeTagline) setStoreTagline(settings.storeTagline);
      if (settings.supportPhone) setSupportPhone(settings.supportPhone);
      if (settings.founderName) setFounderName(settings.founderName);
      if (settings.founderSignature !== undefined) setFounderSignature(settings.founderSignature);
      if (settings.preparedBy) setPreparedBy(settings.preparedBy);
      if (settings.thankYouMessage) setThankYouMessage(settings.thankYouMessage);
      if (settings.termsAndConditions) setTermsAndConditions(settings.termsAndConditions);
    }
  }, [settings]);

  // Fetch Audit Logs
  const fetchAuditLogs = async () => {
    setLoadingAuditLogs(true);
    try {
      const q = query(collection(db, "memo_audit_logs"), orderBy("timestamp", "desc"), limit(20));
      const snap = await getDocs(q);
      const logs: any[] = [];
      snap.forEach((docSnap) => {
        logs.push({ id: docSnap.id, ...docSnap.data() });
      });
      setAuditLogs(logs);
    } catch (err) {
      console.warn("Notice: Fetch audit logs:", err);
    } finally {
      setLoadingAuditLogs(false);
    }
  };

  useEffect(() => {
    if (showAuditLogs) {
      fetchAuditLogs();
    }
  }, [showAuditLogs]);

  // Order Search & Filter states
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Selected Order for Modal
  const [selectedMemoOrder, setSelectedMemoOrder] = useState<any | null>(null);
  const [showMemoModal, setShowMemoModal] = useState<boolean>(false);
  const [downloadingOrderId, setDownloadingOrderId] = useState<string | null>(null);

  // Generic Image Uploader (Product Management Image Upload → Image URL Workflow)
  const processImageFile = async (
    file: File,
    setUploadingState: (val: boolean) => void,
    setUrlState: (url: string) => void,
    successLabelBn: string,
    successLabelEn: string
  ) => {
    if (!isSuperAdmin) {
      triggerToast("শুধুমাত্র সুপার এডমিন ছবি পরিবর্তন করতে পারবেন!", "Only Super Admin can upload/edit signature!");
      return;
    }

    setUploadingState(true);
    let uploadedUrl = "";

    try {
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "unsigned_preset";

      if (cloudName && uploadPreset) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", uploadPreset);

        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          uploadedUrl = data.secure_url;
        }
      }
    } catch (err) {
      console.warn("Cloudinary upload failed, using fallback reader:", err);
    }

    if (!uploadedUrl) {
      // FileReader Base64 fallback so image upload ALWAYS works reliably
      uploadedUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    }

    if (uploadedUrl) {
      setUrlState(uploadedUrl);
      triggerToast(successLabelBn, successLabelEn);
    } else {
      triggerToast("ছবি আপলোড ব্যর্থ হয়েছে!", "Failed to upload image file.");
    }

    setUploadingState(false);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processImageFile(
      file,
      setUploadingLogo,
      setStoreLogo,
      "স্টোর লোগো আপলোড করা হয়েছে!",
      "Store logo uploaded successfully!"
    );
    if (logoInputRef.current) logoInputRef.current.value = "";
  };

  const handleSigUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processImageFile(
      file,
      setUploadingSig,
      setFounderSignature,
      "প্রতিষ্ঠাতার ডিজিটাল স্বাক্ষর আপলোড করা হয়েছে!",
      "Founder digital signature uploaded successfully!"
    );
    if (sigInputRef.current) sigInputRef.current.value = "";
  };

  // Save All Memo Configurations to Firestore with Audit Logging
  const handleSaveAllMemoSettings = async () => {
    if (!isSuperAdmin) {
      triggerToast("শুধুমাত্র সুপার এডমিন সেটিংস পরিবর্তন করতে পারবেন!", "Only Super Admin can save memo settings!");
      return;
    }

    setSavingSettings(true);
    try {
      const oldValues = {
        storeLogo: settings?.storeLogo || "",
        storeName: settings?.storeName || "",
        storeTagline: settings?.storeTagline || "",
        supportPhone: settings?.supportPhone || "",
        founderName: settings?.founderName || "",
        founderSignature: settings?.founderSignature || "",
        preparedBy: settings?.preparedBy || "",
        thankYouMessage: settings?.thankYouMessage || "",
        termsAndConditions: settings?.termsAndConditions || "",
      };

      const newValues = {
        storeLogo,
        storeName,
        storeTagline,
        supportPhone,
        founderName,
        founderSignature,
        preparedBy,
        thankYouMessage,
        termsAndConditions,
      };

      const payload = {
        ...newValues,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser?.email || currentUser?.uid || "Super Admin",
      };

      // 1. Save settings to settings/global
      await setDoc(doc(db, "settings", "global"), payload, { merge: true });

      // 2. Add Audit Log record to memo_audit_logs collection
      await addDoc(collection(db, "memo_audit_logs"), {
        changedBy: currentUser?.email || currentUser?.uid || "Super Admin",
        changedByName: currentUser?.displayName || currentUser?.name || founderName,
        oldValues,
        newValues,
        timestamp: serverTimestamp(),
        dateStr: new Date().toLocaleDateString(),
        timeStr: new Date().toLocaleTimeString(),
      });

      triggerToast(
        "মেমো ম্যানেজমেন্ট তথ্য ও স্বাক্ষর সফলভাবে সেভ ও অডিট লগ করা হয়েছে!",
        "Order memo management settings saved and audit log recorded!"
      );

      if (showAuditLogs) {
        fetchAuditLogs();
      }
    } catch (err) {
      console.error("Error saving memo settings:", err);
      triggerToast("তথ্য সেভ করতে সমস্যা হয়েছে!", "Failed to save memo settings.");
    } finally {
      setSavingSettings(false);
    }
  };

  // Direct PDF Download for an order
  const handleDirectDownloadPDF = async (order: any) => {
    if (downloadingOrderId) return;
    setDownloadingOrderId(order.id);
    try {
      setSelectedMemoOrder(order);
      setShowMemoModal(true);
      
      let el = document.getElementById("printable-memo-card");
      if (!el) {
        for (let i = 0; i < 8; i++) {
          await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 25)));
          el = document.getElementById("printable-memo-card");
          if (el) break;
        }
      }
      
      const currentConfig = {
        storeLogo,
        storeName,
        storeTagline,
        supportPhone,
        founderName,
        founderSignature,
        preparedBy,
        thankYouMessage,
        termsAndConditions,
      };

      await downloadMemoPDF(el, order, currentConfig);
      
      triggerToast("মেমো পিডিএফ ডাউনলোড সম্পন্ন হয়েছে!", "Order Memo PDF downloaded successfully!");
    } catch (err) {
      console.error("Direct PDF download failed:", err);
      triggerToast("পিডিএফ ডাউনলোড ব্যর্থ হয়েছে!", "Failed to generate PDF memo.");
    } finally {
      setDownloadingOrderId(null);
    }
  };

  // Filtered Orders
  const filteredOrders = orders.filter((o) => {
    const q = searchQuery.toLowerCase().trim();
    const idMatch = o.id?.toLowerCase().includes(q);
    const nameMatch = (o.customerName || o.name || o.userName || "").toLowerCase().includes(q);
    const phoneMatch = (o.customerPhone || o.phone || o.userPhone || "").toLowerCase().includes(q);
    const matchesSearch = !q || idMatch || nameMatch || phoneMatch;

    const matchesStatus = statusFilter === "all" || o.orderStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const formatDate = (createdAt: any) => {
    if (!createdAt) return "N/A";
    if (createdAt.seconds) return new Date(createdAt.seconds * 1000).toLocaleDateString();
    if (createdAt.toDate) return createdAt.toDate().toLocaleDateString();
    return new Date(createdAt).toLocaleDateString();
  };

  const currentMemoConfig = {
    storeLogo,
    storeName,
    storeTagline,
    supportPhone,
    founderName,
    founderSignature,
    preparedBy,
    thankYouMessage,
    termsAndConditions,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 rounded-3xl p-6 text-white shadow relative overflow-hidden flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-emerald-500/30 text-emerald-200 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-400/20">
              {getTranslation("অফিসিয়াল মেমো হাব", "Official Order Memo Hub")}
            </span>
            {isSuperAdmin ? (
              <span className="bg-emerald-400 text-slate-950 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase">
                Super Admin Authorized
              </span>
            ) : (
              <span className="bg-amber-400 text-slate-950 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Staff View Only
              </span>
            )}
          </div>

          <h2 className="text-xl font-black mt-1.5 flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-300" />
            <span>{getTranslation("মেমো ম্যানেজমেন্ট ও ডিজিটাল চালান ডেক্স", "Memo Management & Official Receipt Desk")}</span>
          </h2>

          <p className="text-xs text-emerald-100/80 mt-1 max-w-2xl leading-relaxed">
            {getTranslation(
              "স্টোর লোগো, নাম, ট্যাগলাইন, ফোন নম্বর, প্রতিষ্ঠাতা নাম ও স্বাক্ষর, প্রস্তুতকারী এবং ফুটনোট নিয়ন্ত্রণ করুন। সকল পরিবর্তনের পর স্বয়ংক্রিয়ভাবে মেমো আপডেট হয়ে যাবে।",
              "Manage Store Logo, Name, Tagline, Phone, Founder Signature, Staff Name, Thank You Message & Terms. All memo printouts update automatically."
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAuditLogs(!showAuditLogs)}
            className="bg-emerald-900/60 hover:bg-emerald-900 text-emerald-200 font-bold px-4 py-3 rounded-2xl text-xs flex items-center gap-2 transition border border-emerald-500/30 cursor-pointer shrink-0"
          >
            <History className="w-4 h-4 text-emerald-400" />
            <span>{showAuditLogs ? getTranslation("অডিট লগ বন্ধ করুন", "Hide Audit Logs") : getTranslation("অডিট লগ দেখুন", "View Audit Logs")}</span>
          </button>

          {isSuperAdmin && (
            <button
              type="button"
              onClick={handleSaveAllMemoSettings}
              disabled={savingSettings}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-6 py-3 rounded-2xl text-xs flex items-center gap-2 transition shadow-lg cursor-pointer disabled:opacity-50 shrink-0"
            >
              {savingSettings ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>{savingSettings ? getTranslation("সেভ হচ্ছে...", "Saving...") : getTranslation("মেমো সেটিংস সেভ করুন", "Save Memo Settings")}</span>
            </button>
          )}
        </div>
      </div>

      {/* Role Permission Notice for Staff */}
      {!isSuperAdmin && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-amber-800 text-xs">
          <Lock className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <p className="font-extrabold">{getTranslation("স্টাফ ভিউ মোড সক্রিয়", "Staff View Mode Active")}</p>
            <p className="text-[11px] text-amber-700">
              {getTranslation(
                "মেমো কনফিগারেশন ও প্রতিষ্ঠাতা স্বাক্ষর পরিবর্তনের অনুমতি শুধুমাত্র সুপার এডমিনের রয়েছে। আপনি গ্রাহকের অর্ডার মেমো দেখতে, ডাউনলোড এবং প্রিন্ট করতে পারবেন।",
                "Only Super Admin can modify memo branding and founder signature. You are authorized to generate, download and print order memos."
              )}
            </p>
          </div>
        </div>
      )}

      {/* Audit Logs Section */}
      {showAuditLogs && (
        <div className="bg-slate-900 text-white border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-emerald-400" />
              <h3 className="font-black text-sm text-emerald-400">
                {getTranslation("মেমো ম্যানেজমেন্ট নিরাপত্তা অডিট লগ", "Memo Management Security Audit Log")}
              </h3>
            </div>

            <button
              type="button"
              onClick={fetchAuditLogs}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingAuditLogs ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[9px] font-black">
                  <th className="p-2.5">Time</th>
                  <th className="p-2.5">Changed By</th>
                  <th className="p-2.5">Store Name</th>
                  <th className="p-2.5">Founder Name</th>
                  <th className="p-2.5">Prepared By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono text-slate-300">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-500 font-sans">
                      No security audit log entries recorded yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/50">
                      <td className="p-2.5 text-slate-400 text-[10px]">
                        {log.dateStr} {log.timeStr}
                      </td>
                      <td className="p-2.5 font-bold text-emerald-400">
                        {log.changedBy}
                      </td>
                      <td className="p-2.5">{log.newValues?.storeName || "-"}</td>
                      <td className="p-2.5">{log.newValues?.founderName || "-"}</td>
                      <td className="p-2.5">{log.newValues?.preparedBy || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 1: STORE BRANDING & MEMO CONFIGURATIONS FORM */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-sm sm:text-base">
                {getTranslation("মেমো ব্র্যান্ডিং ও স্বাক্ষর কনফিগারেশন", "Memo Branding & Signature Configurations")}
              </h3>
              <p className="text-xs text-slate-400">
                {getTranslation("চালান ও মেমোতে যে তথ্যগুলো প্রিন্ট বা ডাউনলোড হবে তা কাস্টমাইজ করুন।", "Customize the store brand details and signature displayed on all order memos.")}
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-xl text-xs font-black">
            <Award className="w-4 h-4 text-emerald-600" />
            <span>{getTranslation("প্রতিষ্ঠাতা: " + founderName, "Founder: " + founderName)}</span>
          </div>
        </div>

        <fieldset disabled={!isSuperAdmin} className="grid grid-cols-1 md:grid-cols-2 gap-6 disabled:opacity-75">
          {/* Group A: Store Branding */}
          <div className="space-y-4 bg-slate-50/50 border border-slate-100 rounded-2xl p-4 sm:p-5">
            <h4 className="font-black text-xs text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4" />
              <span>{getTranslation("১. স্টোর ব্রান্ডিং ও লোগো", "1. Store Branding & Logo")}</span>
            </h4>

            {/* Store Logo Picker & Preview */}
            <div className="space-y-2">
              <label className="text-xs font-extrabold text-slate-700 flex justify-between">
                <span>{getTranslation("স্টোর লোগো (ছবি বা ইউআরএল)", "Store Logo Image or URL")}</span>
                <span className="text-[10px] text-slate-400 font-bold">(PNG, JPG, WebP)</span>
              </label>

              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-2xl border border-slate-200 bg-white p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                  {storeLogo ? (
                    <img src={storeLogo} alt="Store Logo" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-slate-300" />
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    disabled={!isSuperAdmin}
                    value={storeLogo}
                    onChange={(e) => setStoreLogo(e.target.value)}
                    placeholder="https://... or upload image"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100"
                  />

                  {isSuperAdmin && (
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        ref={logoInputRef}
                        onChange={handleLogoUpload}
                        accept="image/*"
                        className="hidden"
                      />

                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={uploadingLogo}
                        className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
                      >
                        {uploadingLogo ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                        ) : (
                          <Upload className="w-3.5 h-3.5 text-emerald-600" />
                        )}
                        <span>{uploadingLogo ? getTranslation("আপলোড হচ্ছে...", "Uploading...") : getTranslation("লোগো আপলোড", "Upload Logo")}</span>
                      </button>

                      {storeLogo && (
                        <button
                          type="button"
                          onClick={() => setStoreLogo("")}
                          className="text-red-500 hover:text-red-700 text-xs font-bold px-2 py-1.5 cursor-pointer"
                        >
                          {getTranslation("রিমুভ", "Remove")}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Store Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-700">
                {getTranslation("স্টোরের নাম", "Store Name")}
              </label>
              <input
                type="text"
                disabled={!isSuperAdmin}
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="e.g. কাঁচা বাজার / Kancha Bazar"
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100"
              />
            </div>

            {/* Store Tagline */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-700">
                {getTranslation("স্টোর ট্যাগলাইন / স্লোগান", "Store Tagline / Slogan")}
              </label>
              <input
                type="text"
                disabled={!isSuperAdmin}
                value={storeTagline}
                onChange={(e) => setStoreTagline(e.target.value)}
                placeholder="e.g. বিশুদ্ধ ও নিরাপদ খাদ্যের প্রতিশ্রুতি"
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100"
              />
            </div>

            {/* Support Phone */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-700">
                {getTranslation("সাপোর্ট ফোন নম্বর", "Support Phone Number")}
              </label>
              <input
                type="text"
                disabled={!isSuperAdmin}
                value={supportPhone}
                onChange={(e) => setSupportPhone(e.target.value)}
                placeholder="e.g. +8801722638985"
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100"
              />
            </div>
          </div>

          {/* Group B: Founder & Staff Signature */}
          <div className="space-y-4 bg-slate-50/50 border border-slate-100 rounded-2xl p-4 sm:p-5">
            <h4 className="font-black text-xs text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
              <UserCheck className="w-4 h-4" />
              <span>{getTranslation("২. প্রতিষ্ঠাতা নাম ও ডিজিটাল স্বাক্ষর", "2. Founder Name & Digital Signature")}</span>
            </h4>

            {/* Founder Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-700">
                {getTranslation("প্রতিষ্ঠাতার নাম", "Founder Name")}
              </label>
              <input
                type="text"
                disabled={!isSuperAdmin}
                value={founderName}
                onChange={(e) => setFounderName(e.target.value)}
                placeholder="Md Anik Sarkar"
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100"
              />
            </div>

            {/* Founder Signature Image Upload & Preview */}
            <div className="space-y-2">
              <label className="text-xs font-extrabold text-slate-700 flex justify-between">
                <span>{getTranslation("প্রতিষ্ঠাতা স্বাক্ষর ছবি (ডিজিটাল)", "Founder Digital Signature Image")}</span>
                <span className="text-[10px] text-slate-400 font-bold">(Transparent PNG Preferred)</span>
              </label>

              <div className="flex items-center gap-3">
                <div className="w-24 h-16 rounded-2xl border border-slate-200 bg-white p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                  {founderSignature ? (
                    <img src={founderSignature} alt="Founder Signature" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <span className="text-[10px] text-slate-400 font-bold italic">No Signature</span>
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    disabled={!isSuperAdmin}
                    value={founderSignature}
                    onChange={(e) => setFounderSignature(e.target.value)}
                    placeholder="https://... or upload signature"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100"
                  />

                  {isSuperAdmin && (
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        ref={sigInputRef}
                        onChange={handleSigUpload}
                        accept="image/*"
                        className="hidden"
                      />

                      <button
                        type="button"
                        onClick={() => sigInputRef.current?.click()}
                        disabled={uploadingSig}
                        className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
                      >
                        {uploadingSig ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                        ) : (
                          <Upload className="w-3.5 h-3.5 text-emerald-600" />
                        )}
                        <span>{uploadingSig ? getTranslation("আপলোড হচ্ছে...", "Uploading...") : getTranslation("স্বাক্ষর আপলোড", "Upload Signature")}</span>
                      </button>

                      {founderSignature && (
                        <button
                          type="button"
                          onClick={() => setFounderSignature("")}
                          className="text-red-500 hover:text-red-700 text-xs font-bold px-2 py-1.5 cursor-pointer"
                        >
                          {getTranslation("রিমুভ", "Remove")}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Prepared By Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-700">
                {getTranslation("প্রস্তুতকারী (স্টাফ/অ্যাডমিন নাম)", "Prepared By (Staff / Admin Name)")}
              </label>
              <input
                type="text"
                disabled={!isSuperAdmin}
                value={preparedBy}
                onChange={(e) => setPreparedBy(e.target.value)}
                placeholder="e.g. কাঁচা বাজার টিম / Kancha Bazar Team"
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100"
              />
            </div>
          </div>

          {/* Group C: Thank You Message & Terms (Full Width) */}
          <div className="md:col-span-2 space-y-4 bg-slate-50/50 border border-slate-100 rounded-2xl p-4 sm:p-5">
            <h4 className="font-black text-xs text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-4 h-4" />
              <span>{getTranslation("৩. ধন্যবাদ বার্তা ও শর্তাবলী (ফুটনোট)", "3. Thank You Message & Terms (Footnote)")}</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700">
                  {getTranslation("ধন্যবাদ বার্তা (মেমোর নিচে থাকবে)", "Thank You Message")}
                </label>
                <textarea
                  rows={2}
                  disabled={!isSuperAdmin}
                  value={thankYouMessage}
                  onChange={(e) => setThankYouMessage(e.target.value)}
                  placeholder="পণ্য সরবরাহ করার জন্য আপনাকে ধন্যবাদ। কোন জিজ্ঞাসা থাকলে যোগাযোগ করুন।"
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700">
                  {getTranslation("ফুটনোট / শর্তাবলী", "Footer / Terms & Conditions")}
                </label>
                <textarea
                  rows={2}
                  disabled={!isSuperAdmin}
                  value={termsAndConditions}
                  onChange={(e) => setTermsAndConditions(e.target.value)}
                  placeholder="চাঁচকৈড় বাজার, বাংলাদেশ | বিশুদ্ধ পণ্য সরবরাহে আমরা দায়বদ্ধ।"
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100"
                />
              </div>
            </div>
          </div>
        </fieldset>

        {/* Save Bar */}
        {isSuperAdmin && (
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{getTranslation("সেভ বাটনে চাপলে সকল নতুন ও পুরাতন অর্ডারের মেমো আপডেট হবে", "Saving applies changes to all downloaded & printed order memos automatically")}</span>
            </div>

            <button
              type="button"
              onClick={handleSaveAllMemoSettings}
              disabled={savingSettings}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 transition cursor-pointer shadow-xs disabled:opacity-50"
            >
              {savingSettings ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>{savingSettings ? getTranslation("সেভ হচ্ছে...", "Saving...") : getTranslation("সকল তথ্য সেভ করুন", "Save All Settings")}</span>
            </button>
          </div>
        )}
      </div>

      {/* SECTION 2: ORDER MEMO CENTRAL DESK */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-black text-slate-800 text-sm sm:text-base flex items-center gap-2">
              <Printer className="w-4 h-4 text-emerald-600" />
              <span>{getTranslation("গ্রাহক অর্ডার মেমো হাব", "Customer Order Memo Desk")}</span>
            </h3>
            <p className="text-xs text-slate-400">
              {getTranslation("যেকোনো অর্ডারের সম্পূর্ণ মেমো দেখুন, পিডিএফে ডাউনলোড করুন অথবা সরাসরি প্রিন্ট করুন।", "View, download PDF, or print official order memos for all customer purchases.")}
            </p>
          </div>

          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            {getTranslation(`মোট ${orders.length} টি অর্ডার`, `Total ${orders.length} Orders`)}
          </span>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={getTranslation("আইডি, গ্রাহকের নাম বা ফোন খুঁজুন...", "Search order ID, name or phone...")}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Status Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
            {[
              { id: "all", bn: "সব অর্ডার", en: "All" },
              { id: "pending", bn: "পেন্ডিং", en: "Pending" },
              { id: "confirmed", bn: "কনফার্মড", en: "Confirmed" },
              { id: "picked up", bn: "রাইডার পিকড", en: "Picked Up" },
              { id: "delivered", bn: "ডেলিভার্ড", en: "Delivered" },
              { id: "cancelled", bn: "ক্যানসেলড", en: "Cancelled" },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStatusFilter(st.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                  statusFilter === st.id
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {getTranslation(st.bn, st.en)}
              </button>
            ))}
          </div>
        </div>

        {/* Orders Table */}
        <div className="overflow-x-auto border border-slate-100 rounded-2xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase text-[9px] font-black tracking-wider">
                <th className="p-3.5">{getTranslation("অর্ডার আইডি", "Order ID")}</th>
                <th className="p-3.5">{getTranslation("তারিখ", "Date")}</th>
                <th className="p-3.5">{getTranslation("গ্রাহকের নাম ও ফোন", "Customer Name & Phone")}</th>
                <th className="p-3.5">{getTranslation("পণ্য সংখ্যা", "Items")}</th>
                <th className="p-3.5">{getTranslation("মোট বিল", "Total Bill")}</th>
                <th className="p-3.5">{getTranslation("স্ট্যাটাস", "Status")}</th>
                <th className="p-3.5 text-center">{getTranslation("মেমো অ্যাকশন", "Memo Actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-bold">
                    {getTranslation("কোনো রেকর্ড মেমো খুঁজে পাওয়া যায়নি।", "No matching order records found.")}
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o) => {
                  const itemsArr = Array.isArray(o.items)
                    ? o.items
                    : Array.isArray(o.products)
                    ? o.products
                    : Array.isArray(o.cart)
                    ? o.cart
                    : [];
                  const itemCount = itemsArr.length;
                  const grandTotal = o.total || o.totalAmount || 0;

                  return (
                    <tr key={o.id} className="hover:bg-slate-50/50 transition">
                      <td className="p-3.5 font-bold font-mono text-slate-900">
                        #{o.id.slice(-8).toUpperCase()}
                      </td>
                      <td className="p-3.5 text-slate-500">{formatDate(o.createdAt)}</td>
                      <td className="p-3.5">
                        <div className="font-bold text-slate-800">
                          {o.customerName || o.name || o.userName || getTranslation("অজানা গ্রাহক", "Guest Customer")}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {o.customerPhone || o.phone || o.userPhone || "N/A"}
                        </div>
                      </td>
                      <td className="p-3.5 font-bold">{itemCount} items</td>
                      <td className="p-3.5 font-black text-emerald-700 font-mono text-sm">
                        ৳{grandTotal}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            o.orderStatus === "delivered"
                              ? "bg-emerald-100 text-emerald-700"
                              : o.orderStatus === "cancelled"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {o.orderStatus || "pending"}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedMemoOrder(o);
                              setShowMemoModal(true);
                            }}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>{getTranslation("মেমো দেখুন / প্রিন্ট", "View Memo / Print")}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDirectDownloadPDF(o)}
                            disabled={downloadingOrderId === o.id}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                          >
                            {downloadingOrderId === o.id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                            ) : (
                              <Download className="w-3.5 h-3.5 text-emerald-600" />
                            )}
                            <span>{getTranslation("PDF ডাউনলোড", "PDF Download")}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Overlay for Order Memo */}
      <OrderMemoModal
        isOpen={showMemoModal}
        onClose={() => {
          setShowMemoModal(false);
          setSelectedMemoOrder(null);
        }}
        order={selectedMemoOrder}
        lang={lang}
        triggerToast={triggerToast}
        founderSignature={founderSignature}
        memoSettings={currentMemoConfig}
      />
    </div>
  );
}
