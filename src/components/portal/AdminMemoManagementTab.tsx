import React, { useState, useRef, useEffect } from "react";
import { 
  FileText, Upload, Printer, Download, Search, Trash2, 
  RefreshCw, CheckCircle2, Image as ImageIcon, UserCheck, Eye, 
  Award, Sparkles, ShieldCheck, Lock, History, ShieldAlert, CheckCircle, Clock,
  Users, Check, BadgeCheck, Plus, X, CreditCard, Save, Package
} from "lucide-react";
import { 
  db, doc, setDoc, updateDoc, addDoc, deleteDoc, collection, getDocs, query, orderBy, limit, serverTimestamp, onSnapshot 
} from "../../lib/firebase";
import { subscribeToStaffCollection } from "../../lib/staffManager";
import { StaffMember } from "../../types";
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
  const [supportPhone, setSupportPhone] = useState<string>(settings?.supportPhone || "+8801615581975");
  const [founderName, setFounderName] = useState<string>(settings?.founderName || "Md Anik Sarkar");
  const [founderDesignation, setFounderDesignation] = useState<string>(
    settings?.founderDesignation || (lang === "bn" ? "প্রতিষ্ঠাতা ও অনুমোদিত স্বাক্ষর" : "Founder & Authorized")
  );
  const [founderSignature, setFounderSignature] = useState<string>(settings?.founderSignature || "");
  
  // Seller Officer States (dynamically pulled from Staff Profile)
  const [sellerOfficerName, setSellerOfficerName] = useState<string>(
    settings?.sellerOfficerName || settings?.preparedBy || ""
  );
  const [sellerOfficerId, setSellerOfficerId] = useState<string>(settings?.sellerOfficerId || "");
  const [sellerOfficerSignature, setSellerOfficerSignature] = useState<string>(
    settings?.sellerOfficerSignature || ""
  );
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
  const [uploadingSellerSig, setUploadingSellerSig] = useState<boolean>(false);
  const [savingSettings, setSavingSettings] = useState<boolean>(false);

  // Staff members list for selecting Seller Officer
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loadingStaff, setLoadingStaff] = useState<boolean>(false);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAuditLogs, setLoadingAuditLogs] = useState<boolean>(false);
  const [showAuditLogs, setShowAuditLogs] = useState<boolean>(false);

  // Saved Memos & Invoices Collection State (Real-time Firestore)
  const [savedMemos, setSavedMemos] = useState<any[]>([]);
  const [loadingMemos, setLoadingMemos] = useState<boolean>(true);
  const [activeMemoSection, setActiveMemoSection] = useState<"orders" | "saved_memos" | "config">("orders");
  const [savingMemoId, setSavingMemoId] = useState<string | null>(null);
  const [deletingMemoId, setDeletingMemoId] = useState<string | null>(null);

  // Manual Memo Creation Modal
  const [showCreateMemoModal, setShowCreateMemoModal] = useState<boolean>(false);
  const [creatingMemo, setCreatingMemo] = useState<boolean>(false);
  const [manualMemoCustomerName, setManualMemoCustomerName] = useState<string>("");
  const [manualMemoCustomerPhone, setManualMemoCustomerPhone] = useState<string>("");
  const [manualMemoCustomerAddress, setManualMemoCustomerAddress] = useState<string>("");
  const [manualMemoItemName, setManualMemoItemName] = useState<string>("");
  const [manualMemoItemQty, setManualMemoItemQty] = useState<number>(1);
  const [manualMemoItemPrice, setManualMemoItemPrice] = useState<number>(0);
  const [manualMemoDeliveryCharge, setManualMemoDeliveryCharge] = useState<number>(40);
  const [manualMemoDiscount, setManualMemoDiscount] = useState<number>(0);
  const [manualMemoPaymentMethod, setManualMemoPaymentMethod] = useState<string>("Cash on Delivery");
  const [manualMemoPaymentStatus, setManualMemoPaymentStatus] = useState<string>("pending");
  const [manualMemoNotes, setManualMemoNotes] = useState<string>("");

  const logoInputRef = useRef<HTMLInputElement>(null);
  const sigInputRef = useRef<HTMLInputElement>(null);
  const sellerSigInputRef = useRef<HTMLInputElement>(null);

  // Real-time listener for Firestore memos collection
  useEffect(() => {
    setLoadingMemos(true);
    const unsub = onSnapshot(collection(db, "memos"), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      list.sort((a, b) => {
        const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return timeB - timeA;
      });
      setSavedMemos(list);
      setLoadingMemos(false);
    }, (err) => {
      console.warn("Firestore memos real-time listener notice:", err);
      setLoadingMemos(false);
    });

    return () => unsub();
  }, []);

  // Sync with incoming Firestore settings prop
  useEffect(() => {
    if (settings) {
      if (settings.storeLogo !== undefined) setStoreLogo(settings.storeLogo);
      if (settings.storeName) setStoreName(settings.storeName);
      if (settings.storeTagline) setStoreTagline(settings.storeTagline);
      if (settings.supportPhone) setSupportPhone(settings.supportPhone);
      if (settings.founderName) setFounderName(settings.founderName);
      if (settings.founderDesignation) setFounderDesignation(settings.founderDesignation);
      if (settings.founderSignature !== undefined) setFounderSignature(settings.founderSignature);
      if (settings.sellerOfficerName) setSellerOfficerName(settings.sellerOfficerName);
      if (settings.sellerOfficerId) setSellerOfficerId(settings.sellerOfficerId);
      if (settings.sellerOfficerSignature !== undefined) setSellerOfficerSignature(settings.sellerOfficerSignature);
      if (settings.preparedBy) setPreparedBy(settings.preparedBy);
      if (settings.thankYouMessage) setThankYouMessage(settings.thankYouMessage);
      if (settings.termsAndConditions) setTermsAndConditions(settings.termsAndConditions);
    }
  }, [settings]);

  // Subscribe to Staff collection for dynamic Seller Officer mapping
  useEffect(() => {
    setLoadingStaff(true);
    const unsubscribe = subscribeToStaffCollection((list) => {
      setStaffList(list);
      setLoadingStaff(false);
      if (list.length > 0) {
        if (sellerOfficerId) {
          const matched = list.find((s) => s.staffId === sellerOfficerId || s.id === sellerOfficerId);
          if (matched && !sellerOfficerSignature && matched.digitalSignature) {
            setSellerOfficerSignature(matched.digitalSignature);
          }
        } else if (!sellerOfficerName) {
          const defaultOfficer = list.find((s) => 
            s.role === "order_manager" || s.designation?.toLowerCase().includes("seller") || s.designation?.toLowerCase().includes("sales")
          ) || list[0];
          if (defaultOfficer) {
            setSellerOfficerId(defaultOfficer.staffId || defaultOfficer.id);
            setSellerOfficerName(defaultOfficer.fullName);
            setSellerOfficerSignature(defaultOfficer.digitalSignature || "");
            setPreparedBy(defaultOfficer.fullName);
          }
        }
      }
    });
    return () => unsubscribe();
  }, [sellerOfficerId, sellerOfficerName, sellerOfficerSignature]);

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
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "upvkzb3p";
      const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "k0x8mjmx";

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

  const handleSellerSigUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processImageFile(
      file,
      setUploadingSellerSig,
      (url) => {
        setSellerOfficerSignature(url);
        // Also update staff profile in Firestore if assigned
        if (sellerOfficerId) {
          const matched = staffList.find((s) => s.staffId === sellerOfficerId || s.id === sellerOfficerId);
          if (matched?.id) {
            updateDoc(doc(db, "staff", matched.id), {
              digitalSignature: url,
              updatedAt: serverTimestamp(),
            }).catch((err) => console.warn("Notice: Update staff signature error:", err));
          }
        }
      },
      "সেলস অফিসারের ডিজিটাল স্বাক্ষর আপলোড করা হয়েছে!",
      "Seller Officer digital signature uploaded successfully!"
    );
    if (sellerSigInputRef.current) sellerSigInputRef.current.value = "";
  };

  const handleSelectSellerOfficer = (chosenStaffId: string) => {
    setSellerOfficerId(chosenStaffId);
    const found = staffList.find((s) => s.staffId === chosenStaffId || s.id === chosenStaffId);
    if (found) {
      setSellerOfficerName(found.fullName);
      setSellerOfficerSignature(found.digitalSignature || (found as any).signature || "");
      setPreparedBy(found.fullName);
      triggerToast(
        `সেলস অফিসার '${found.fullName}' এর প্রোফাইল ও স্বাক্ষর লিঙ্ক করা হয়েছে`,
        `Seller Officer '${found.fullName}' profile and signature linked`
      );
    }
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
        founderDesignation: settings?.founderDesignation || "",
        founderSignature: settings?.founderSignature || "",
        sellerOfficerName: settings?.sellerOfficerName || "",
        sellerOfficerId: settings?.sellerOfficerId || "",
        sellerOfficerSignature: settings?.sellerOfficerSignature || "",
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
        founderDesignation,
        founderSignature,
        sellerOfficerName,
        sellerOfficerId,
        sellerOfficerSignature,
        preparedBy: sellerOfficerName || preparedBy,
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
        founderDesignation,
        founderSignature,
        sellerOfficerName,
        sellerOfficerPost: getTranslation("পদ: সেলস অফিসার", "Post: Seller Officer"),
        sellerOfficerSignature,
        preparedBy: sellerOfficerName || preparedBy,
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
    founderDesignation,
    founderSignature,
    sellerOfficerName,
    sellerOfficerId,
    sellerOfficerPost: getTranslation("পদ: সেলস অফিসার", "Post: Seller Officer"),
    sellerOfficerSignature,
    preparedBy: sellerOfficerName || preparedBy,
    thankYouMessage,
    termsAndConditions,
  };

  const sampleTemplateOrder = {
    id: "KB-SAMPLE-MEMO",
    orderId: "KB-SAMPLE-MEMO",
    customerName: lang === "bn" ? "কামরুল হাসান" : "Kamrul Hasan",
    customerPhone: "+8801712345678",
    customerAddress: lang === "bn" ? "চাঁচকৈড় বাজার, গুরুদাসপুর, নাটোর" : "Chanchkoir Bazar, Gurudaspur, Natore",
    orderStatus: "delivered",
    paymentMethod: "Cash on Delivery",
    paymentStatus: "paid",
    createdAt: new Date(),
    sellerOfficer: {
      fullName: sellerOfficerName || (lang === "bn" ? "সেলস অফিসার" : "Seller Officer"),
      staffId: sellerOfficerId,
      designation: getTranslation("পদ: সেলস অফিসার", "Post: Seller Officer"),
      digitalSignature: sellerOfficerSignature,
    },
    sellerOfficerName: sellerOfficerName || (lang === "bn" ? "সেলস অফিসার" : "Seller Officer"),
    sellerOfficerId: sellerOfficerId,
    sellerOfficerSignature: sellerOfficerSignature,
    items: [
      { id: "1", name: lang === "bn" ? "দেশি লাল আলু (নতুন)" : "Fresh Red Potato", quantity: 2, price: 55, unit: "কেজি" },
      { id: "2", name: lang === "bn" ? "তাজা ফুলকপি" : "Fresh Cauliflower", quantity: 1, price: 40, unit: "টি" },
      { id: "3", name: lang === "bn" ? "কাঁচা মরিচ" : "Fresh Green Chili", quantity: 1, price: 30, unit: "২৫০ গ্রাম" },
    ],
    subtotal: 180,
    deliveryCharge: 40,
    discount: 0,
    total: 220,
  };

  // Save Order as Official Memo to Firestore
  const handleSaveOrderAsOfficialMemo = async (o: any) => {
    setSavingMemoId(o.id);
    try {
      const memoId = `memo_${o.id || Date.now().toString(36)}`;
      const grandTotal = Number(o.total || o.totalAmount || 0);
      const deliveryFee = Number(o.deliveryFee || o.deliveryCharge || 0);
      const sub = Number(o.subtotal || (grandTotal - deliveryFee));
      const itemsList = Array.isArray(o.items) ? o.items : (Array.isArray(o.products) ? o.products : []);

      const memoPayload = {
        id: memoId,
        orderId: o.id,
        memoNumber: `MEMO-${o.id.slice(-6).toUpperCase()}`,
        customerName: o.customerName || o.name || o.userName || "Guest Customer",
        customerPhone: o.customerPhone || o.phone || o.userPhone || "",
        customerAddress: o.customerAddress || o.address || "",
        items: itemsList,
        subtotal: sub,
        deliveryCharge: deliveryFee,
        discount: Number(o.discount || 0),
        total: grandTotal,
        paymentMethod: o.paymentMethod || "Cash on Delivery",
        paymentStatus: o.paymentStatus || "pending",
        orderStatus: o.orderStatus || "pending",
        preparedBy: preparedBy || sellerOfficerName || "Official Staff",
        sellerOfficerName: sellerOfficerName || "Official Staff",
        sellerOfficerId: sellerOfficerId || "",
        sellerOfficerSignature: sellerOfficerSignature || "",
        founderSignature: founderSignature || "",
        notes: o.notes || "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(doc(db, "memos", memoId), memoPayload, { merge: true });

      // Mirror into invoices collection
      await setDoc(doc(db, "invoices", memoId), {
        id: memoId,
        invoiceNumber: memoPayload.memoNumber,
        orderId: o.id,
        customerName: memoPayload.customerName,
        customerPhone: memoPayload.customerPhone,
        total: grandTotal,
        items: itemsList,
        status: memoPayload.paymentStatus,
        createdAt: serverTimestamp()
      }, { merge: true });

      triggerToast("মেমো ক্লাউড ফায়ারস্টোরে সফলভাবে সংরক্ষিত হয়েছে!", "Official memo saved to Firestore database!");
    } catch (err: any) {
      console.error("Error saving memo to Firestore:", err);
      triggerToast("মেমো সংরক্ষণ ব্যর্থ হয়েছে।", "Failed to save memo to Firestore.");
    } finally {
      setSavingMemoId(null);
    }
  };

  // Delete saved memo permanently from Firestore
  const handleDeleteSavedMemo = async (memoId: string) => {
    if (!confirm(getTranslation("আপনি কি নিশ্চিতভাবে এই মেমোটি ডাটাবেজ থেকে মুছে ফেলতে চান?", "Are you sure you want to permanently delete this memo?"))) return;
    setDeletingMemoId(memoId);
    try {
      await deleteDoc(doc(db, "memos", memoId));
      try {
        await deleteDoc(doc(db, "invoices", memoId));
      } catch {
        // optional mirror delete
      }
      setSavedMemos(prev => prev.filter(m => m.id !== memoId));
      triggerToast("মেমো সফলভাবে মুছে ফেলা হয়েছে!", "Memo deleted permanently from database!");
    } catch (err: any) {
      console.error("Error deleting memo:", err);
      triggerToast("মেমো মুছতে ব্যর্থ হয়েছে।", "Failed to delete memo.");
    } finally {
      setDeletingMemoId(null);
    }
  };

  // Create manual offline memo / invoice directly in Firestore
  const handleSaveManualMemo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualMemoCustomerPhone.trim()) {
      triggerToast("গ্রাহকের ফোন নম্বর দিন।", "Customer phone is required.");
      return;
    }
    setCreatingMemo(true);
    try {
      const memoId = "memo_man_" + Date.now().toString(36);
      const sub = (Number(manualMemoItemPrice) || 0) * (Number(manualMemoItemQty) || 1);
      const tot = sub + (Number(manualMemoDeliveryCharge) || 0) - (Number(manualMemoDiscount) || 0);

      const payload = {
        id: memoId,
        orderId: `OFFLINE-${Date.now().toString(36).toUpperCase()}`,
        memoNumber: `MEMO-${Math.floor(100000 + Math.random() * 900000)}`,
        customerName: manualMemoCustomerName.trim() || (lang === "bn" ? "অফলাইন ক্রেতা" : "Walk-in Buyer"),
        customerPhone: manualMemoCustomerPhone.trim(),
        customerAddress: manualMemoCustomerAddress.trim() || (lang === "bn" ? "কাঁচা বাজার আউটলেট" : "Kacha Bazar Outlet"),
        items: manualMemoItemName.trim() ? [
          {
            product: {
              nameBn: manualMemoItemName.trim(),
              nameEn: manualMemoItemName.trim(),
              price: Number(manualMemoItemPrice) || 0,
              image: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=200&q=80"
            },
            quantity: Number(manualMemoItemQty) || 1,
            unit: "item"
          }
        ] : [],
        subtotal: sub,
        deliveryCharge: Number(manualMemoDeliveryCharge) || 0,
        discount: Number(manualMemoDiscount) || 0,
        total: tot,
        paymentMethod: manualMemoPaymentMethod,
        paymentStatus: manualMemoPaymentStatus,
        orderStatus: "delivered",
        preparedBy: preparedBy || sellerOfficerName || "Official Staff",
        sellerOfficerName: sellerOfficerName || "Official Staff",
        sellerOfficerId: sellerOfficerId || "",
        sellerOfficerSignature: sellerOfficerSignature || "",
        founderSignature: founderSignature || "",
        notes: manualMemoNotes.trim(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(doc(db, "memos", memoId), payload);
      await setDoc(doc(db, "invoices", memoId), {
        id: memoId,
        invoiceNumber: payload.memoNumber,
        orderId: payload.orderId,
        customerName: payload.customerName,
        customerPhone: payload.customerPhone,
        total: tot,
        items: payload.items,
        status: payload.paymentStatus,
        createdAt: serverTimestamp()
      });

      triggerToast("নতুন কাস্টম মেমো সফলভাবে ডাটাবেজে যুক্ত হয়েছে!", "Manual invoice created successfully in Firestore!");
      setShowCreateMemoModal(false);
      setManualMemoCustomerName("");
      setManualMemoCustomerPhone("");
      setManualMemoCustomerAddress("");
      setManualMemoItemName("");
      setManualMemoItemPrice(0);
      setManualMemoItemQty(1);
      setManualMemoNotes("");
    } catch (err: any) {
      console.error("Error creating manual memo:", err);
      triggerToast("মেমো তৈরিতে সমস্যা হয়েছে।", "Failed to create manual memo.");
    } finally {
      setCreatingMemo(false);
    }
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
              "স্টোর লোগো, নাম, ট্যাগলাইন, ফোন নম্বর, সেলার অফিসার ও প্রতিষ্ঠাতা স্বাক্ষর এবং ফুটনোট নিয়ন্ত্রণ করুন।",
              "Manage Store Logo, Name, Phone, Seller Officer & Founder Signature blocks and footnote."
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Live Memo Template Preview Button */}
          <button
            type="button"
            onClick={() => {
              setSelectedMemoOrder(sampleTemplateOrder);
              setShowMemoModal(true);
            }}
            className="bg-emerald-700/80 hover:bg-emerald-600 text-white font-bold px-4 py-3 rounded-2xl text-xs flex items-center gap-2 transition border border-emerald-400/30 cursor-pointer shrink-0 shadow-sm"
          >
            <Eye className="w-4 h-4 text-emerald-200" />
            <span>{getTranslation("মেমো টেমপ্লেট প্রিভিউ", "Preview Memo Template")}</span>
          </button>

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

      {/* Subtab Navigation Switcher */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/80 pb-3">
        <button
          type="button"
          onClick={() => setActiveMemoSection("orders")}
          className={`px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 cursor-pointer transition shadow-2xs ${
            activeMemoSection === "orders"
              ? "bg-emerald-600 text-white shadow-emerald-600/20"
              : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>{getTranslation("📋 কাস্টমার অর্ডার মেমো হাব", "Customer Order Desk")}</span>
          <span className="bg-emerald-950/20 px-2 py-0.5 rounded-full text-[10px] font-mono">{orders.length}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMemoSection("saved_memos")}
          className={`px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 cursor-pointer transition shadow-2xs ${
            activeMemoSection === "saved_memos"
              ? "bg-emerald-600 text-white shadow-emerald-600/20"
              : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>{getTranslation("📂 ক্লাউড সংরক্ষিত মেমো ও ইনভয়েস", "Saved Cloud Memos & Invoices")}</span>
          <span className="bg-emerald-950/20 px-2 py-0.5 rounded-full text-[10px] font-mono">{savedMemos.length}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMemoSection("config")}
          className={`px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 cursor-pointer transition shadow-2xs ${
            activeMemoSection === "config"
              ? "bg-emerald-600 text-white shadow-emerald-600/20"
              : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <BadgeCheck className="w-4 h-4" />
          <span>{getTranslation("⚙️ মেমো ব্র্যান্ডিং ও স্বাক্ষর কনফিগ", "Branding & Signatures Config")}</span>
        </button>
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
            <table className="w-full text-left text-xs border-collapse min-w-[500px]">
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
      {activeMemoSection === "config" && (
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
                placeholder="e.g. +8801615581975"
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100"
              />
            </div>
          </div>

          {/* Group B: Memo Dual Signature Management (Seller Officer & Authorized/Founder) */}
          <div className="md:col-span-2 space-y-5 bg-gradient-to-br from-emerald-50/40 via-white to-slate-50 border border-emerald-100 rounded-3xl p-5 sm:p-7 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-100 pb-3.5">
              <div>
                <h4 className="font-black text-sm text-emerald-800 uppercase tracking-wider flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <span>{getTranslation("২. মেমো সিগনেচার সেকশন কনফিগারেশন (পাশাপাশি ২টি স্বাক্ষর ব্লক)", "2. Memo Dual Signature Blocks Configuration")}</span>
                </h4>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  {getTranslation(
                    "মেমোর নিচে পাশাপাশি ২টি সমপরিমাণ ব্লক থাকবে: ১. সেলার অফিসার (স্টাফ প্রোফাইল থেকে স্বয়ংক্রিয়) এবং ২. অথরাইজড / ফাউন্ডার (এডমিন প্রোফাইল থেকে)।",
                    "Two equal-width horizontal signature blocks at memo footer: 1. Seller Officer (auto from Staff Profile) and 2. Authorized / Founder (Admin Profile)."
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
                  {getTranslation("ডাইনামিক ও লাইভ সিঙ্কড", "Dynamic & Live Synced")}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Block 1: Seller Officer Signature Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center">
                      ১
                    </span>
                    <h5 className="font-black text-xs text-slate-800 uppercase tracking-wider">
                      {getTranslation("Seller Officer (সেলস অফিসার)", "Seller Officer")}
                    </h5>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {getTranslation("পদ: সেলস অফিসার", "Post: Seller Officer")}
                  </span>
                </div>

                {/* Staff Profile Auto-Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-700 flex justify-between items-center">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-emerald-600" />
                      {getTranslation("স্টাফ প্রোফাইল নির্বাচন (স্বয়ংক্রিয় সিঙ্ক)", "Select Staff Profile (Auto-Sync)")}
                    </span>
                    {loadingStaff && (
                      <span className="text-[10px] text-emerald-600 flex items-center gap-1">
                        <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                        Loading...
                      </span>
                    )}
                  </label>
                  <select
                    disabled={!isSuperAdmin}
                    value={sellerOfficerId}
                    onChange={(e) => handleSelectSellerOfficer(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 cursor-pointer"
                  >
                    <option value="">{getTranslation("-- স্টাফ প্রোফাইল বাছাই করুন --", "-- Select Staff Member --")}</option>
                    {staffList.map((st) => (
                      <option key={st.id || st.staffId} value={st.staffId || st.id}>
                        {st.fullName} ({st.staffId || st.id}) {st.designation ? `• ${st.designation}` : ""} {st.digitalSignature ? "✓ Sig" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Seller Officer Full Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-700">
                    {getTranslation("সেলস অফিসারের নাম", "Seller Officer Full Name")}
                  </label>
                  <input
                    type="text"
                    disabled={!isSuperAdmin}
                    value={sellerOfficerName}
                    onChange={(e) => {
                      setSellerOfficerName(e.target.value);
                      setPreparedBy(e.target.value);
                    }}
                    placeholder={getTranslation("e.g. সেলস অফিসার নাম", "e.g. Seller Officer Name")}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100"
                  />
                </div>

                {/* Fixed Post Indicator */}
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-700">
                    {getTranslation("পদবী (মেমোতে নির্ধারিত)", "Designation (Fixed on Memo)")}
                  </label>
                  <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-700 font-bold font-mono">
                    {getTranslation("পদ: সেলস অফিসার", "Post: Seller Officer")}
                  </div>
                </div>

                {/* Seller Officer Digital Signature */}
                <div className="space-y-2">
                  <label className="text-xs font-extrabold text-slate-700 flex justify-between">
                    <span>{getTranslation("ডিজিটাল স্বাক্ষর ছবি (Digital Signature)", "Digital Signature Image")}</span>
                    <span className="text-[10px] text-slate-400 font-bold">(Transparent PNG)</span>
                  </label>

                  <div className="flex items-center gap-3">
                    <div className="w-24 h-14 rounded-xl border border-slate-200 bg-slate-50 p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                      {sellerOfficerSignature ? (
                        <img src={sellerOfficerSignature} alt="Seller Officer Signature" className="max-h-full max-w-full object-contain" />
                      ) : (
                        <span className="text-[9px] text-slate-400 font-bold italic text-center leading-tight">
                          {getTranslation("স্বাক্ষর নেই", "No Signature")}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        disabled={!isSuperAdmin}
                        value={sellerOfficerSignature}
                        onChange={(e) => setSellerOfficerSignature(e.target.value)}
                        placeholder="https://... or upload"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100"
                      />

                      {isSuperAdmin && (
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            ref={sellerSigInputRef}
                            onChange={handleSellerSigUpload}
                            accept="image/*"
                            className="hidden"
                          />

                          <button
                            type="button"
                            onClick={() => sellerSigInputRef.current?.click()}
                            disabled={uploadingSellerSig}
                            className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
                          >
                            {uploadingSellerSig ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                            ) : (
                              <Upload className="w-3.5 h-3.5 text-emerald-600" />
                            )}
                            <span>{uploadingSellerSig ? getTranslation("আপলোড হচ্ছে...", "Uploading...") : getTranslation("স্বাক্ষর আপলোড", "Upload Signature")}</span>
                          </button>

                          {sellerOfficerSignature && (
                            <button
                              type="button"
                              onClick={() => setSellerOfficerSignature("")}
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

                {/* Real-time Memo Box Preview for Seller Officer */}
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5">
                    {getTranslation("মেমোতে যেভাবে দেখাবে (Centered Preview)", "Footer Layout Preview")}
                  </span>
                  <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-3 flex flex-col items-center justify-center text-center">
                    <div className="h-8 flex items-end justify-center pb-0.5">
                      {sellerOfficerSignature ? (
                        <img src={sellerOfficerSignature} alt="Preview" className="h-7 max-h-7 max-w-[120px] object-contain" />
                      ) : (
                        <span className="text-[10px] text-slate-300 italic">({getTranslation("ডিজিটাল স্বাক্ষর", "Digital Signature")})</span>
                      )}
                    </div>
                    <div className="w-32 border-t border-slate-300 pt-1 text-center">
                      <div className="text-[11px] font-bold text-slate-800 leading-tight truncate">
                        {sellerOfficerName || getTranslation("সেলস অফিসার", "Seller Officer")}
                      </div>
                      <div className="text-[9px] text-slate-500 font-semibold leading-tight mt-0.5">
                        {getTranslation("পদ: সেলস অফিসার", "Post: Seller Officer")}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Block 2: Authorized / Founder Signature Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center">
                      ২
                    </span>
                    <h5 className="font-black text-xs text-slate-800 uppercase tracking-wider">
                      {getTranslation("Authorized / Founder (অনুমোদিত / প্রতিষ্ঠাতা)", "Authorized / Founder")}
                    </h5>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {getTranslation("এডমিন প্রোফাইল", "Admin Profile")}
                  </span>
                </div>

                {/* Founder Full Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-700">
                    {getTranslation("প্রতিষ্ঠাতা / অনুমোদিত ব্যক্তির নাম", "Founder / Authorized Name")}
                  </label>
                  <input
                    type="text"
                    disabled={!isSuperAdmin}
                    value={founderName}
                    onChange={(e) => setFounderName(e.target.value)}
                    placeholder="Md Anik Sarkar"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100"
                  />
                </div>

                {/* Founder Designation */}
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-700">
                    {getTranslation("পদবী / Designation", "Designation")}
                  </label>
                  <input
                    type="text"
                    disabled={!isSuperAdmin}
                    value={founderDesignation}
                    onChange={(e) => setFounderDesignation(e.target.value)}
                    placeholder={getTranslation("প্রতিষ্ঠাতা ও অনুমোদিত স্বাক্ষর", "Founder & Authorized")}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100"
                  />
                </div>

                {/* Founder Signature Image Upload & Preview */}
                <div className="space-y-2">
                  <label className="text-xs font-extrabold text-slate-700 flex justify-between">
                    <span>{getTranslation("ডিজিটাল স্বাক্ষর ছবি (Digital Signature)", "Digital Signature Image")}</span>
                    <span className="text-[10px] text-slate-400 font-bold">(Transparent PNG)</span>
                  </label>

                  <div className="flex items-center gap-3">
                    <div className="w-24 h-14 rounded-xl border border-slate-200 bg-slate-50 p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                      {founderSignature ? (
                        <img src={founderSignature} alt="Founder Signature" className="max-h-full max-w-full object-contain" />
                      ) : (
                        <span className="text-[9px] text-slate-400 font-bold italic text-center leading-tight">
                          {getTranslation("স্বাক্ষর নেই", "No Signature")}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        disabled={!isSuperAdmin}
                        value={founderSignature}
                        onChange={(e) => setFounderSignature(e.target.value)}
                        placeholder="https://... or upload"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100"
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

                {/* Real-time Memo Box Preview for Founder */}
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5">
                    {getTranslation("মেমোতে যেভাবে দেখাবে (Centered Preview)", "Footer Layout Preview")}
                  </span>
                  <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-3 flex flex-col items-center justify-center text-center">
                    <div className="h-8 flex items-end justify-center pb-0.5">
                      {founderSignature ? (
                        <img src={founderSignature} alt="Preview" className="h-7 max-h-7 max-w-[120px] object-contain" />
                      ) : (
                        <span className="text-[10px] text-slate-300 italic">({getTranslation("ডিজিটাল স্বাক্ষর", "Digital Signature")})</span>
                      )}
                    </div>
                    <div className="w-32 border-t border-slate-300 pt-1 text-center">
                      <div className="text-[11px] font-bold text-slate-800 leading-tight truncate uppercase font-mono">
                        {founderName || "Md Anik Sarkar"}
                      </div>
                      <div className="text-[9px] text-slate-500 font-semibold leading-tight mt-0.5">
                        {founderDesignation}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
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
      )}

      {/* SECTION 2: ORDER MEMO CENTRAL DESK */}
      {activeMemoSection === "orders" && (
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
          <table className="w-full text-left text-xs border-collapse min-w-[650px]">
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

                          <button
                            type="button"
                            onClick={() => handleSaveOrderAsOfficialMemo(o)}
                            disabled={savingMemoId === o.id}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                            title={getTranslation("ক্লাউড ফায়ারস্টোর মেমোতে সেভ করুন", "Save to Firestore Memos Collection")}
                          >
                            {savingMemoId === o.id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Save className="w-3.5 h-3.5" />
                            )}
                            <span>{getTranslation("সংরক্ষণ", "Save")}</span>
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
      )}

      {/* SECTION 3: SAVED FIRESTORE MEMOS & INVOICES DESK */}
      {activeMemoSection === "saved_memos" && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-800 text-sm sm:text-base flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>{getTranslation("ক্লাউড সংরক্ষিত মেমো ও ইনভয়েস", "Saved Cloud Memos & Invoices")}</span>
                </h3>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  {getTranslation("লাইভ সিঙ্ক", "Live Sync")}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {getTranslation(
                  "ফায়ারস্টোর ডাটাবেজে স্থায়ীভাবে সংরক্ষিত অফিসিয়াল মেমো ও ইনভয়েস রেকর্ডসমূহ।",
                  "Permanently stored official memos and audit invoices in Firestore."
                )}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowCreateMemoModal(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>{getTranslation("নতুন কাস্টম মেমো তৈরি", "Create Custom Memo")}</span>
              </button>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-2 rounded-xl">
                {getTranslation(`মোট ${savedMemos.length} টি সংরক্ষিত`, `Total ${savedMemos.length} Saved`)}
              </span>
            </div>
          </div>

          {/* Memos Table */}
          <div className="overflow-x-auto border border-slate-100 rounded-2xl">
            <table className="w-full text-left text-xs border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase text-[9px] font-black tracking-wider">
                  <th className="p-3.5">{getTranslation("মেমো নম্বর", "Memo No")}</th>
                  <th className="p-3.5">{getTranslation("তারিখ", "Date")}</th>
                  <th className="p-3.5">{getTranslation("গ্রাহকের নাম ও ফোন", "Customer Name & Phone")}</th>
                  <th className="p-3.5">{getTranslation("পণ্য সংখ্যা", "Items")}</th>
                  <th className="p-3.5">{getTranslation("মোট টাকা", "Total")}</th>
                  <th className="p-3.5">{getTranslation("পেমেন্ট অবস্থা", "Payment")}</th>
                  <th className="p-3.5 text-center">{getTranslation("অ্যাকশন", "Actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                {loadingMemos ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 font-bold">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto text-emerald-600 mb-2" />
                      {getTranslation("মেমো লোড হচ্ছে...", "Loading memos from database...")}
                    </td>
                  </tr>
                ) : savedMemos.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 font-bold">
                      {getTranslation("কোনো সংরক্ষিত মেমো পাওয়া যায়নি। উপরের 'অর্ডার মেমো হাব' থেকে মেমো সংরক্ষণ করুন অথবা নতুন মেমো তৈরি করুন।", "No saved memos found. Save memos from the Order Desk or create a custom memo above.")}
                    </td>
                  </tr>
                ) : (
                  savedMemos.map((m) => {
                    const itemCount = Array.isArray(m.items) ? m.items.length : 0;
                    const grandTotal = m.total || 0;

                    return (
                      <tr key={m.id} className="hover:bg-slate-50/50 transition">
                        <td className="p-3.5 font-bold font-mono text-emerald-700">
                          {m.memoNumber || `#${m.id.slice(-6).toUpperCase()}`}
                        </td>
                        <td className="p-3.5 text-slate-500">{formatDate(m.createdAt)}</td>
                        <td className="p-3.5">
                          <div className="font-bold text-slate-800">{m.customerName || "Customer"}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{m.customerPhone || "N/A"}</div>
                        </td>
                        <td className="p-3.5 font-bold">
                          {itemCount} {getTranslation("টি পণ্য", "items")}
                        </td>
                        <td className="p-3.5 font-black text-slate-900 font-mono">
                          ৳{Number(grandTotal).toLocaleString()}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              m.paymentStatus === "paid"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {m.paymentStatus || "pending"}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedMemoOrder(m);
                                setShowMemoModal(true);
                              }}
                              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-2.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 transition cursor-pointer"
                              title={getTranslation("মেমো দেখুন ও প্রিন্ট করুন", "View Memo")}
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>{getTranslation("দেখুন", "View")}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDirectDownloadPDF(m)}
                              disabled={downloadingOrderId === m.id}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-2.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
                              title={getTranslation("PDF চালান ডাউনলোড করুন", "Download PDF")}
                            >
                              {downloadingOrderId === m.id ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                              ) : (
                                <Download className="w-3.5 h-3.5 text-emerald-600" />
                              )}
                              <span>PDF</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteSavedMemo(m.id)}
                              disabled={deletingMemoId === m.id}
                              className="bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border border-red-200 hover:border-red-600 px-2.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
                              title={getTranslation("মেমো স্থায়ীভাবে মুছে ফেলুন", "Delete Memo")}
                            >
                              {deletingMemoId === m.id ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                              <span>{getTranslation("মুছুন", "Delete")}</span>
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
      )}

      {/* Manual Memo Creation Modal */}
      {showCreateMemoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-sm sm:text-base">
                    {getTranslation("নতুন কাস্টম মেমো / ইনভয়েস তৈরি", "Create Custom Memo / Invoice")}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {getTranslation("ফায়ারস্টোর ডাটাবেজে সরাসরি মেমো যুক্ত করুন", "Directly persist custom memo to Firestore")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateMemoModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveManualMemo} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">{getTranslation("গ্রাহকের নাম", "Customer Name")}</label>
                <input
                  type="text"
                  value={manualMemoCustomerName}
                  onChange={(e) => setManualMemoCustomerName(e.target.value)}
                  placeholder={getTranslation("যেমন: মোঃ ফারুক হোসেন", "e.g. Md. Faruk Hossain")}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">{getTranslation("গ্রাহকের ফোন নম্বর *", "Customer Phone *")}</label>
                  <input
                    type="tel"
                    required
                    value={manualMemoCustomerPhone}
                    onChange={(e) => setManualMemoCustomerPhone(e.target.value)}
                    placeholder="017XXXXXXXX"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">{getTranslation("ঠিকানা", "Address")}</label>
                  <input
                    type="text"
                    value={manualMemoCustomerAddress}
                    onChange={(e) => setManualMemoCustomerAddress(e.target.value)}
                    placeholder={getTranslation("যেমন: গুরুদাসপুর, নাটোর", "e.g. Gurudaspur, Natore")}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                <div className="font-black text-slate-700 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{getTranslation("পণ্যের বিবরণ", "Product Details")}</span>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-600">{getTranslation("পণ্য / সেবার নাম", "Product / Service")}</label>
                  <input
                    type="text"
                    value={manualMemoItemName}
                    onChange={(e) => setManualMemoItemName(e.target.value)}
                    placeholder={getTranslation("যেমন: খাঁটি গাওয়া ঘি ও সরিষার তেল", "e.g. Pure Ghee & Mustard Oil")}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">{getTranslation("পরিমাণ", "Quantity")}</label>
                    <input
                      type="number"
                      min={1}
                      value={manualMemoItemQty}
                      onChange={(e) => setManualMemoItemQty(Number(e.target.value) || 1)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">{getTranslation("একক দাম (৳)", "Unit Price (৳)")}</label>
                    <input
                      type="number"
                      min={0}
                      value={manualMemoItemPrice}
                      onChange={(e) => setManualMemoItemPrice(Number(e.target.value) || 0)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">{getTranslation("ডেলিভারি চার্জ (৳)", "Delivery Fee (৳)")}</label>
                  <input
                    type="number"
                    min={0}
                    value={manualMemoDeliveryCharge}
                    onChange={(e) => setManualMemoDeliveryCharge(Number(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">{getTranslation("পেমেন্ট মাধ্যম", "Payment Method")}</label>
                  <select
                    value={manualMemoPaymentMethod}
                    onChange={(e) => setManualMemoPaymentMethod(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Cash on Delivery">Cash on Delivery</option>
                    <option value="bKash">bKash</option>
                    <option value="Nagad">Nagad</option>
                    <option value="Counter Cash">Counter Cash</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">{getTranslation("পেমেন্ট স্ট্যাটাস", "Payment Status")}</label>
                  <select
                    value={manualMemoPaymentStatus}
                    onChange={(e) => setManualMemoPaymentStatus(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="paid">Paid (পরিশোধিত)</option>
                    <option value="pending">Pending (অপেক্ষমান)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">{getTranslation("বিশেষ মন্তব্য", "Notes")}</label>
                <input
                  type="text"
                  value={manualMemoNotes}
                  onChange={(e) => setManualMemoNotes(e.target.value)}
                  placeholder={getTranslation("যেমন: অফিসিয়াল মেমো কপি প্রদানকৃত", "e.g. Official memo issued")}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Summary */}
              <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-2xl flex items-center justify-between text-xs">
                <span className="font-extrabold text-emerald-900">{getTranslation("মোট মেমো বিল:", "Total Memo Bill:")}</span>
                <span className="font-black text-emerald-700 font-mono text-base">
                  ৳{((manualMemoItemPrice || 0) * (manualMemoItemQty || 1) + (manualMemoDeliveryCharge || 0) - (manualMemoDiscount || 0)).toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateMemoModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition cursor-pointer"
                >
                  {getTranslation("বাতিল", "Cancel")}
                </button>
                <button
                  type="submit"
                  disabled={creatingMemo}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-5 py-2 rounded-xl flex items-center gap-1.5 transition shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {creatingMemo ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>{creatingMemo ? getTranslation("তৈরি হচ্ছে...", "Creating...") : getTranslation("মেমো সেভ করুন", "Save Memo")}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
