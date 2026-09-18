import React, { useState, useEffect, useRef } from "react";
import { StaffMember } from "../../types";
import { 
  DEFAULT_ROLES, 
  DEPARTMENTS, 
  BLOOD_GROUPS, 
  formatStaffJoiningDate, 
  updateStaffInFirestore, 
  getStaffAuthHeaders,
  findStaffMember,
  fetchSingleStaffById 
} from "../../lib/staffManager";
import { imageToDataUrl } from "../../lib/pdfUtils";
import logoImg from "../../assets/images/logo_1783882658678.jpg";
import { 
  X, Printer, Download, RefreshCw, Edit3, Check, Eye, 
  Phone, Calendar, Droplet, MapPin, AlertCircle, Sparkles, 
  QrCode as QrIcon, CheckCircle2, Lock, Copy, Building2, User,
  Shield, CheckCircle, Award, Upload, Camera, Loader2
} from "lucide-react";
import QRCode from "qrcode";
import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";

interface StaffIdCardModalProps {
  staff: StaffMember | null;
  staffId?: string | null;
  staffList?: StaffMember[];
  currentUser: any;
  lang: "bn" | "en";
  onClose: () => void;
  onStaffUpdated: (updatedStaff?: StaffMember) => void;
  triggerToast: (bn: string, en: string) => void;
}

// High-fidelity Barcode SVG matching the screenshot
const BarcodeSVG = ({ value }: { value: string }) => {
  const bars = [
    2, 1, 1, 3, 1, 2, 1, 1, 2, 3, 1, 2, 1, 1, 2, 2, 3, 1, 1, 2,
    1, 3, 2, 1, 2, 1, 1, 3, 1, 2, 2, 1, 1, 2, 3, 1, 2, 1, 1, 2,
    2, 3, 1, 1, 2, 1, 3, 2, 1, 2, 1, 1, 3, 1, 2, 2, 1, 1, 2, 3
  ];
  let currentX = 8;
  return (
    <div className="w-full flex flex-col items-center">
      <svg viewBox="0 0 240 32" className="w-full h-7" preserveAspectRatio="none">
        <rect width="240" height="32" fill="#ffffff" />
        {bars.map((width, idx) => {
          const isBar = idx % 2 === 0;
          const barWidth = width * 1.6;
          const x = currentX;
          currentX += barWidth + (isBar ? 0 : 0.8);
          if (!isBar || x > 232) return null;
          return (
            <rect
              key={idx}
              x={x}
              y={2}
              width={barWidth}
              height={28}
              fill="#056839"
            />
          );
        })}
      </svg>
    </div>
  );
};

// Official standard dates for all Staff ID cards as mandated by Kacha Bazar
export const OFFICIAL_STAFF_CARD_JOIN_DATE = "03/09/2026";
export const OFFICIAL_STAFF_CARD_ISSUE_DATE = "19/09/2026";
export const OFFICIAL_STAFF_CARD_VALID_THRU = "07/07/2027";

export default function StaffIdCardModal({
  staff,
  staffId,
  staffList,
  currentUser,
  lang,
  onClose,
  onStaffUpdated,
  triggerToast
}: StaffIdCardModalProps) {
  const getTranslation = (bn: string, en: string) => (lang === "bn" ? bn : en);

  // Active Staff resolution (with fallback loading & persistence)
  const [activeStaff, setActiveStaff] = useState<StaffMember | null>(() => {
    if (staff) return staff;
    if (staffList && staffList.length > 0 && staffId) {
      return findStaffMember(staffList, staffId);
    }
    return null;
  });
  const [loadingStaff, setLoadingStaff] = useState<boolean>(() => !staff && !activeStaff);

  // Orientation & View modes (Horizontal CR80 is primary)
  const [activeSide, setActiveSide] = useState<"dual" | "front" | "back">("dual");

  // QR Code State
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [loadingQr, setLoadingQr] = useState<boolean>(true);

  // Logo Base64 Data URL for guaranteed cross-context rendering (Print/PDF)
  const [logoDataUrl, setLogoDataUrl] = useState<string>("");

  // Photo Base64 Data URL for guaranteed cross-context rendering without CORS issues
  const [photoDataUrl, setPhotoDataUrl] = useState<string>("");

  // Edit Mode state
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editFullName, setEditFullName] = useState<string>(activeStaff?.fullName || staff?.fullName || "");
  const [editDesignation, setEditDesignation] = useState<string>(activeStaff?.designation || staff?.designation || "");
  const [editDepartment, setEditDepartment] = useState<string>(activeStaff?.department || staff?.department || "Order Fulfillment & Logistics");
  const [editMobile, setEditMobile] = useState<string>(activeStaff?.mobile || staff?.mobile || "");
  const [editEmail, setEditEmail] = useState<string>(activeStaff?.email || staff?.email || "");
  const [editPhotoURL, setEditPhotoURL] = useState<string>(activeStaff?.photoURL || staff?.photoURL || "");
  const [editJoiningDate, setEditJoiningDate] = useState<string>(activeStaff?.joiningDate || staff?.joiningDate || "2026-09-03");
  const [editBloodGroup, setEditBloodGroup] = useState<string>(activeStaff?.bloodGroup || staff?.bloodGroup || "B (+ve)");
  const [editEmergencyContact, setEditEmergencyContact] = useState<string>(activeStaff?.emergencyContact || activeStaff?.mobile || staff?.emergencyContact || staff?.mobile || "");
  const [savingEdit, setSavingEdit] = useState<boolean>(false);
  const [uploadingPhoto, setUploadingPhoto] = useState<boolean>(false);

  // PDF / Print Loading
  const [generatingPdf, setGeneratingPdf] = useState<boolean>(false);
  const [printing, setPrinting] = useState<boolean>(false);

  // Responsive ID Card preview scaling for laptops & desktops (prevents cutoff while keeping physical CR80 size intact)
  const [scaleMode, setScaleMode] = useState<"auto" | "75" | "80" | "100">("auto");
  const [autoScale, setAutoScale] = useState<number>(0.78);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);

  // Responsive scale calculator: dynamically computes optimal preview scale for desktop and laptop screens
  useEffect(() => {
    const updateAutoScale = () => {
      if (typeof window === "undefined") return;
      const windowH = window.innerHeight;
      const windowW = window.innerWidth;

      if (windowW < 640) {
        // Keep mobile layout flexible and natural
        setAutoScale(1);
        return;
      }

      // Available vertical space in modal:
      // Modal max height: 92vh. Modal header ~64px, toolbar ~48px, footer ~40px, padding ~32px.
      const availH = Math.max(300, (windowH * 0.90) - 170);
      // Unscaled height of card (463px) + top label (~36px) = ~500px
      const targetHScale = (availH - 12) / 505;

      // Available horizontal space in modal:
      const availW = Math.max(480, Math.min(windowW - 48, 980));
      // In dual view, two cards need 292px * 2 + 28px gap = 612px
      const targetWScale = activeSide === "dual" ? (availW - 40) / 612 : (availW - 40) / 310;

      const fitted = Math.min(targetHScale, targetWScale);
      // Clamped between 0.65 and 0.85 for pristine laptop & desktop readability without cutoff
      const clamped = Math.min(0.85, Math.max(0.65, Math.round(fitted * 100) / 100));
      setAutoScale(clamped);
    };

    updateAutoScale();
    window.addEventListener("resize", updateAutoScale);
    return () => window.removeEventListener("resize", updateAutoScale);
  }, [activeSide]);

  // Effective preview scale applied to on-screen preview only (never print/PDF)
  const effectiveScale = isCapturing
    ? 1
    : scaleMode === "100"
      ? 1
      : scaleMode === "80"
        ? 0.80
        : scaleMode === "75"
          ? 0.75
          : autoScale;

  // Card element refs for capture
  const frontCardRef = useRef<HTMLDivElement>(null);
  const backCardRef = useRef<HTMLDivElement>(null);

  // Synchronize activeStaff when staff prop changes
  useEffect(() => {
    if (staff) {
      setActiveStaff(staff);
      setLoadingStaff(false);
    }
  }, [staff]);

  // Fallback: If activeStaff is missing (e.g. page refresh), resolve via staffId, staffList, or fetchSingleStaffById
  useEffect(() => {
    if (activeStaff) return;

    const targetId = staffId || (typeof window !== "undefined" 
      ? (sessionStorage.getItem("kacha_selected_staff_id_card") || localStorage.getItem("kb_selected_staff_id_card")) 
      : null);
    if (!targetId) {
      setLoadingStaff(false);
      return;
    }

    // 1. Try from staffList if provided
    if (staffList && staffList.length > 0) {
      const found = findStaffMember(staffList, targetId);
      if (found) {
        setActiveStaff(found);
        setLoadingStaff(false);
        return;
      }
    }

    // 2. Fetch directly from server/Firestore
    let isMounted = true;
    setLoadingStaff(true);
    fetchSingleStaffById(targetId)
      .then((foundStaff) => {
        if (!isMounted) return;
        if (foundStaff) {
          setActiveStaff(foundStaff);
        }
      })
      .catch((err) => {
        console.warn("Could not load staff for ID Card:", err);
      })
      .finally(() => {
        if (isMounted) setLoadingStaff(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeStaff, staffId, staffList]);

  // Synchronize form states whenever activeStaff updates
  useEffect(() => {
    if (activeStaff) {
      setEditFullName(activeStaff.fullName || "");
      setEditDesignation(activeStaff.designation || "");
      setEditDepartment(activeStaff.department || "Order Fulfillment & Logistics");
      setEditMobile(activeStaff.mobile || "");
      setEditEmail(activeStaff.email || "");
      setEditPhotoURL(activeStaff.photoURL || "");
      setEditJoiningDate(activeStaff.joiningDate || "2026-09-03");
      setEditBloodGroup(activeStaff.bloodGroup || "B (+ve)");
      setEditEmergencyContact(activeStaff.emergencyContact || activeStaff.mobile || "");
    }
  }, [activeStaff]);

  const roleDef = DEFAULT_ROLES.find(r => r.id === activeStaff?.role) || DEFAULT_ROLES[DEFAULT_ROLES.length - 1];

  // Default Fallbacks
  const displayDesignation = activeStaff?.designation || getTranslation(roleDef.nameBn, roleDef.nameEn);
  const displayDepartment = activeStaff?.department || "Order Fulfillment & Logistics";
  // Official standardized dates for all Staff ID cards as mandated:
  // JOIN DATE: 03/09/2026, ISSUE DATE: 19/09/2026, VALID THRU: 07/07/2027
  const displayCompactJoiningDate = OFFICIAL_STAFF_CARD_JOIN_DATE; // "03/09/2026"
  const displayIssueDate = OFFICIAL_STAFF_CARD_ISSUE_DATE; // "19/09/2026"
  const displayValidThru = OFFICIAL_STAFF_CARD_VALID_THRU; // "07/07/2027"
  const displayJoiningDate = OFFICIAL_STAFF_CARD_ISSUE_DATE; // Fallback alias

  const displayBloodGroup = activeStaff?.bloodGroup || "B (+ve)";
  const displayEmergency = activeStaff?.emergencyContact || activeStaff?.mobile || "01611181115";
  const activeLogo = logoDataUrl || logoImg;

  // Preload actual logo as Data URL
  useEffect(() => {
    imageToDataUrl(logoImg).then((dataUrl) => {
      setLogoDataUrl(dataUrl || logoImg);
    }).catch(() => {
      setLogoDataUrl(logoImg);
    });
  }, []);

  // Preload staff photo as Data URL for cross-origin canvas rendering
  useEffect(() => {
    if (activeStaff?.photoURL) {
      if (activeStaff.photoURL.startsWith("data:")) {
        setPhotoDataUrl(activeStaff.photoURL);
      } else {
        imageToDataUrl(activeStaff.photoURL)
          .then((dUrl) => {
            if (dUrl) setPhotoDataUrl(dUrl);
            else setPhotoDataUrl(activeStaff.photoURL || "");
          })
          .catch(() => {
            setPhotoDataUrl(activeStaff.photoURL || "");
          });
      }
    } else {
      setPhotoDataUrl("");
    }
  }, [activeStaff?.photoURL]);

  // Dynamic font sizing and line wrapping for staff full name so long names are never cut off
  const getStaffNameClasses = (name: string) => {
    const len = (name || "").trim().length;
    if (len <= 15) return "text-[16px] leading-tight";
    if (len <= 22) return "text-[13.5px] leading-snug";
    if (len <= 30) return "text-[11.5px] leading-snug";
    if (len <= 38) return "text-[10px] leading-tight";
    return "text-[9px] leading-tight";
  };

  // Dynamic font sizing for designation so long positions are never cut off
  const getDesignationClasses = (desig: string) => {
    const len = (desig || "").trim().length;
    if (len <= 20) return "text-[11px] leading-tight";
    if (len <= 30) return "text-[9.5px] leading-tight";
    return "text-[8.5px] leading-tight";
  };

  // Dynamic font sizing for email so complete email address is always visible
  const getStaffEmailClasses = (email: string) => {
    const len = (email || "").trim().length;
    if (len <= 18) return "text-[9.5px]";
    if (len <= 24) return "text-[8.5px]";
    if (len <= 30) return "text-[7.8px]";
    return "text-[7.2px]";
  };

  // Check if current card is the first staff ID card only
  const isFirstStaffCard = (() => {
    if (!activeStaff) return false;

    // Primary identifier check for the first staff member (CFI-KB-001 / staff-super-admin-01 / Founder Md Anik Sarkar)
    const cleanStaffId = String(activeStaff.staffId || "").trim().toUpperCase();
    const cleanEmail = String(activeStaff.email || "").trim().toLowerCase();
    const cleanName = String(activeStaff.fullName || "").trim().toLowerCase();

    if (
      cleanStaffId === "CFI-KB-001" ||
      cleanStaffId === "KB-STF-001" ||
      cleanStaffId === "001" ||
      activeStaff.id === "staff-super-admin-01" ||
      cleanEmail === "sarkarmdanik14@gmail.com" ||
      cleanName === "md anik sarkar"
    ) {
      return true;
    }

    return false;
  })();

  // Authorized signature metadata (First staff ID card signed by Vice-Chairman Md Abu Hanif Sarkar; all other cards signed by Founder Md Anik Sarkar)
  const authorizedSigner = isFirstStaffCard
    ? {
        title: "AUTHORISED BY",
        name: "MD ABU HANIF SARKAR",
        designation: "VICE-CHAIRMAN, KACHA BAZAR"
      }
    : {
        title: "AUTHORISED BY",
        name: "MD ANIK SARKAR",
        designation: "FOUNDER, KACHA BAZAR"
      };

  // Generate QR Code on mount or activeStaff change
  useEffect(() => {
    if (!activeStaff) return;
    const generateQr = async () => {
      setLoadingQr(true);
      try {
        const payload = {
          org: "KACHA BAZAR",
          company: "কাঁচা বাজার",
          staffId: activeStaff.staffId,
          name: activeStaff.fullName,
          role: activeStaff.role,
          designation: displayDesignation,
          department: displayDepartment,
          phone: activeStaff.mobile,
          emergency: displayEmergency,
          bloodGroup: displayBloodGroup,
          joiningDate: OFFICIAL_STAFF_CARD_JOIN_DATE,
          issueDate: OFFICIAL_STAFF_CARD_ISSUE_DATE,
          validThru: OFFICIAL_STAFF_CARD_VALID_THRU,
          status: "AUTHORIZED_STAFF",
          verified: true,
          verifyUrl: `https://kachabazar.com/verify?id=${encodeURIComponent(activeStaff.staffId)}`
        };

        const url = await QRCode.toDataURL(JSON.stringify(payload), {
          margin: 1,
          width: 320,
          color: {
            dark: "#064e3b",
            light: "#ffffff"
          },
          errorCorrectionLevel: "H"
        });
        setQrCodeUrl(url);
      } catch (err) {
        console.error("QR Code generate error:", err);
      } finally {
        setLoadingQr(false);
      }
    };

    generateQr();
  }, [activeStaff, displayDesignation, displayDepartment, displayBloodGroup, displayEmergency]);

  // Log Print / Reprint
  const logCardAction = async (actionType: "print" | "reprint" | "pdf") => {
    if (!activeStaff) return;
    try {
      await fetch("/api/staff/log-card-print", {
        method: "POST",
        headers: getStaffAuthHeaders(currentUser),
        body: JSON.stringify({
          staffId: activeStaff.staffId,
          staffName: activeStaff.fullName,
          actionType,
          adminName: currentUser?.fullName || currentUser?.displayName || "Super Admin"
        })
      });
    } catch (e) {
      console.warn("Log card action notice:", e);
    }
  };

  // Convert file to URL (Cloudinary upload or base64 Data URL)
  const processImageFileToUrl = async (file: File): Promise<string> => {
    if (!file.type.startsWith("image/")) {
      throw new Error(lang === "bn" ? "অনুগ্রহ করে একটি ছবি ফাইল নির্বাচন করুন!" : "Please select an image file!");
    }

    // 1. Try Cloudinary if environment configured
    try {
      const cloudName = (import.meta as any).env?.VITE_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = (import.meta as any).env?.VITE_CLOUDINARY_UPLOAD_PRESET;
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
            return data.secure_url;
          }
        }
      }
    } catch (uploadErr) {
      console.warn("Cloudinary upload notice, using local data URL:", uploadErr);
    }

    // 2. High-reliability fallback: Read file as Data URL
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
        } else {
          reject(new Error("Failed to process image"));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Direct upload and immediate save of photo from header
  const handleDirectPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeStaff) return;
    setUploadingPhoto(true);

    try {
      const photoUrl = await processImageFileToUrl(file);
      if (!photoUrl) throw new Error("Could not process image file");

      // Resolve true internal document ID
      let internalDocId = activeStaff.id;
      if (!internalDocId || internalDocId === activeStaff.staffId) {
        const canonical = await fetchSingleStaffById(activeStaff.staffId || internalDocId);
        if (canonical && canonical.id) {
          internalDocId = canonical.id;
        }
      }
      const targetRecordId = internalDocId || activeStaff.id || activeStaff.staffId;

      const updatedStaff = await updateStaffInFirestore(targetRecordId, {
        ...activeStaff,
        photoURL: photoUrl,
        staffId: activeStaff.staffId,
        updaterUser: currentUser,
        updaterName: currentUser?.fullName || currentUser?.displayName || "Super Admin",
        updaterRole: currentUser?.role || "super_admin"
      });

      if (updatedStaff) {
        setActiveStaff(updatedStaff);
        setEditPhotoURL(updatedStaff.photoURL || "");
        onStaffUpdated(updatedStaff);

        try {
          const keyId = updatedStaff.staffId || updatedStaff.id;
          if (keyId) {
            sessionStorage.setItem("kacha_selected_staff_id_card", keyId);
            localStorage.setItem("kb_selected_staff_id_card", keyId);
          }
        } catch {}
      }

      triggerToast("স্টাফের ছবি সফলভাবে আপলোড ও সংরক্ষিত হয়েছে!", "Staff photo uploaded and saved successfully!");
    } catch (err: any) {
      console.error("Direct photo upload error:", err);
      triggerToast(err.message || "ছবি আপলোড ব্যর্থ হয়েছে!", err.message || "Failed to upload photo!");
    } finally {
      setUploadingPhoto(false);
      e.target.value = "";
    }
  };

  // File upload in Edit Form
  const handlePhotoFileUploadInEditForm = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);

    try {
      const photoUrl = await processImageFileToUrl(file);
      setEditPhotoURL(photoUrl);
      triggerToast("ছবি সফলভাবে লোড হয়েছে! 'তথ্য আপডেট করুন' বাটনে চাপুন।", "Photo loaded successfully! Click 'Save Changes' to save.");
    } catch (err: any) {
      console.error("Edit form photo upload error:", err);
      triggerToast(err.message || "ছবি লোড ব্যর্থ হয়েছে!", err.message || "Failed to process photo!");
    } finally {
      setUploadingPhoto(false);
      e.target.value = "";
    }
  };

  // Handle Save In-Modal Edit
  const handleSaveStaffEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStaff) return;
    setSavingEdit(true);
    try {
      // Resolve the true internal document ID
      let internalDocId = activeStaff.id;
      if (!internalDocId || internalDocId === activeStaff.staffId) {
        const canonical = await fetchSingleStaffById(activeStaff.staffId || internalDocId);
        if (canonical && canonical.id) {
          internalDocId = canonical.id;
        }
      }
      const targetRecordId = internalDocId || activeStaff.id || activeStaff.staffId;

      const updatedStaff = await updateStaffInFirestore(targetRecordId, {
        ...activeStaff,
        photoURL: editPhotoURL,
        fullName: editFullName.trim() || activeStaff.fullName,
        mobile: editMobile.trim() || activeStaff.mobile,
        email: editEmail.trim() || activeStaff.email,
        designation: editDesignation.trim() || activeStaff.designation,
        department: editDepartment.trim() || activeStaff.department,
        joiningDate: editJoiningDate || activeStaff.joiningDate,
        bloodGroup: editBloodGroup || activeStaff.bloodGroup,
        emergencyContact: editEmergencyContact.trim() || activeStaff.emergencyContact,
        staffId: activeStaff.staffId,
        updaterUser: currentUser,
        updaterName: currentUser?.fullName || currentUser?.displayName || "Super Admin",
        updaterRole: currentUser?.role || "super_admin"
      });

      triggerToast("স্টাফ তথ্য ও ফটো সফলভাবে আপডেট হয়েছে!", "Staff details and photo updated successfully!");
      setIsEditing(false);
      if (updatedStaff) {
        setActiveStaff(updatedStaff);
        setEditPhotoURL(updatedStaff.photoURL || "");
        onStaffUpdated(updatedStaff);

        try {
          const keyId = updatedStaff.staffId || updatedStaff.id;
          if (keyId) {
            sessionStorage.setItem("kacha_selected_staff_id_card", keyId);
            localStorage.setItem("kb_selected_staff_id_card", keyId);
          }
        } catch {}
      }
    } catch (err: any) {
      console.error("Save staff edit error:", err);
      triggerToast(err.message || "Failed to update staff", err.message || "Failed to update staff");
    } finally {
      setSavingEdit(false);
    }
  };

  // Print ID Card
  const handlePrint = async (isReprint = false) => {
    if (!activeStaff || !frontCardRef.current || !backCardRef.current) return;
    setPrinting(true);
    setIsCapturing(true);
    logCardAction(isReprint ? "reprint" : "print");

    try {
      // Brief pause to ensure DOM renders unscaled at 100% natural resolution
      await new Promise((resolve) => setTimeout(resolve, 80));

      // Capture high-resolution images of both cards at ~343 DPI for fast, crisp print quality
      const frontCanvas = await html2canvas(frontCardRef.current, {
        scale: 2.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff"
      });

      const backCanvas = await html2canvas(backCardRef.current, {
        scale: 2.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff"
      });

      const frontImgData = frontCanvas.toDataURL("image/png", 1.0);
      const backImgData = backCanvas.toDataURL("image/png", 1.0);

      const printWindow = window.open("", "_blank", "width=900,height=950");
      if (!printWindow) {
        triggerToast("পপ-আপ ব্লক করা হয়েছে! অনুগ্রহ করে অনুমতি দিন।", "Pop-up blocked! Please allow pop-ups to print.");
        setPrinting(false);
        return;
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Staff ID Card - ${activeStaff.staffId} - ${activeStaff.fullName}</title>
            <meta charset="utf-8" />
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Hind+Siliguri:wght@400;500;600;700&display=swap" rel="stylesheet">
            <style>
              @page {
                size: A4 portrait;
                margin: 12mm;
              }
              * {
                box-sizing: border-box;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
              body {
                font-family: 'Plus Jakarta Sans', 'Hind Siliguri', sans-serif;
                background-color: #0f172a;
                margin: 0;
                padding: 20px;
                color: #0f172a;
                display: flex;
                flex-direction: column;
                align-items: center;
              }
              .no-print {
                width: 100%;
                max-width: 680px;
                background: #1e293b;
                color: white;
                padding: 16px 20px;
                border-radius: 16px;
                margin-bottom: 24px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3);
              }
              .print-btn {
                background: #059669;
                color: white;
                padding: 10px 24px;
                border-radius: 12px;
                font-weight: 800;
                font-size: 13px;
                border: none;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 8px;
                transition: background 0.2s;
              }
              .print-btn:hover {
                background: #047857;
              }
              .sheet-container {
                width: 100%;
                max-width: 680px;
                background: #ffffff;
                padding: 30px 24px;
                border-radius: 20px;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
              }
              .sheet-header {
                text-align: center;
                margin-bottom: 24px;
                padding-bottom: 14px;
                border-bottom: 1px dashed #cbd5e1;
              }
              .sheet-title {
                font-size: 16px;
                font-weight: 800;
                color: #056839;
                margin: 0 0 4px 0;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              .sheet-subtitle {
                font-size: 11px;
                color: #64748b;
                margin: 0;
              }
              .cards-wrapper {
                display: flex;
                flex-direction: row;
                justify-content: center;
                align-items: flex-start;
                gap: 16mm;
                margin: 20px auto;
              }
              .card-column {
                display: flex;
                flex-direction: column;
                align-items: center;
              }
              .card-label {
                font-size: 11px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.8px;
                color: #475569;
                margin-bottom: 8px;
              }
              .card-box {
                width: 53.98mm;
                height: 85.60mm;
                min-width: 53.98mm;
                max-width: 53.98mm;
                min-height: 85.60mm;
                max-height: 85.60mm;
                border-radius: 3.18mm;
                position: relative;
                overflow: hidden;
                box-shadow: 0 8px 20px rgba(0,0,0,0.12);
                border: 0.3mm dashed #94a3b8;
                background: #ffffff;
              }
              .card-box img {
                width: 100%;
                height: 100%;
                display: block;
                object-fit: fill;
              }
              .instructions-box {
                margin-top: 24px;
                padding: 12px 16px;
                background: #f8fafc;
                border-radius: 12px;
                border: 1px solid #e2e8f0;
                text-align: center;
                font-size: 11px;
                color: #64748b;
                line-height: 1.5;
              }
              @media print {
                body {
                  background: transparent !important;
                  padding: 0 !important;
                }
                .no-print {
                  display: none !important;
                }
                .sheet-container {
                  box-shadow: none !important;
                  border: none !important;
                  border-radius: 0 !important;
                  padding: 0 !important;
                  max-width: 100% !important;
                }
                .sheet-header {
                  display: none !important;
                }
                .instructions-box {
                  display: none !important;
                }
                .card-label {
                  display: none !important;
                }
                .cards-wrapper {
                  margin-top: 15mm !important;
                  gap: 12mm !important;
                }
                .card-box {
                  box-shadow: none !important;
                  border: 0.25pt dashed #cbd5e1 !important;
                  page-break-inside: avoid;
                }
              }
            </style>
          </head>
          <body>
            <div class="no-print">
              <div>
                <h2 style="font-size:14px;font-weight:800;color:#34d399;margin:0 0 2px 0;">কাঁচা বাজার অফিসিয়াল স্টাফ আইডি কার্ড (CR80 Portrait Print)</h2>
                <p style="font-size:11px;color:#94a3b8;margin:0;">Staff: ${activeStaff.fullName} | ID: ${activeStaff.staffId} | Physical Size: 53.98mm × 85.60mm</p>
              </div>
              <button onclick="window.print()" class="print-btn">
                <span>🖨️ এখনই প্রিন্ট করুন (Print Now)</span>
              </button>
            </div>

            <div class="sheet-container">
              <div class="sheet-header">
                <h3 class="sheet-title">Kacha Bazar Official Staff ID Card</h3>
                <p class="sheet-subtitle">CR80 Portrait Standard: 53.98mm × 85.60mm • 100% True Scale Print</p>
              </div>

              <div class="cards-wrapper">
                <div class="card-column">
                  <span class="card-label">Front Side (সম্মুখভাগ)</span>
                  <div class="card-box">
                    <img src="${frontImgData}" alt="Front Side" />
                  </div>
                </div>

                <div class="card-column">
                  <span class="card-label">Back Side (পেছনের ভাগ)</span>
                  <div class="card-box">
                    <img src="${backImgData}" alt="Back Side" />
                  </div>
                </div>
              </div>

              <div class="instructions-box">
                <p style="margin:0 0 4px 0;font-weight:700;color:#056839;">✂️ প্রিন্ট নির্দেশিকা:</p>
                <p style="margin:0;">প্রিন্ট করার সময় 'Scale: 100%' নির্বাচন করুন। প্রিন্ট শেষে ড্যাশযুক্ত বর্ডার লাইন অনুযায়ী কেটে পিভিসি আইডি কার্ড পাউচ বা লেমিনেশনে স্থাপন করুন।</p>
              </div>
            </div>

            <script>
              window.onload = function() {
                setTimeout(() => {
                  window.print();
                }, 300);
              };
            </script>
          </body>
        </html>
      `);

      printWindow.document.close();
      triggerToast(
        isReprint ? "আইডি কার্ড রিপ্রিন্ট উইন্ডো খোলা হয়েছে!" : "আইডি কার্ড প্রিন্ট উইন্ডো খোলা হয়েছে!",
        isReprint ? "ID Card reprint window opened!" : "ID Card print window opened!"
      );
    } catch (err) {
      console.error("Print card capture error:", err);
      triggerToast("প্রিন্ট করতে ত্রুটি হয়েছে!", "Failed to prepare card for printing!");
    } finally {
      setIsCapturing(false);
      setPrinting(false);
    }
  };

  // Download PDF
  const handleDownloadPdf = async (mode: "all" | "cr80" = "all") => {
    if (!activeStaff || !frontCardRef.current || !backCardRef.current) return;
    setGeneratingPdf(true);
    setIsCapturing(true);
    logCardAction("pdf");

    try {
      // Brief pause to ensure DOM renders unscaled at 100% natural resolution
      await new Promise((resolve) => setTimeout(resolve, 80));

      const cardWidthMm = 53.98;
      const cardHeightMm = 85.60;

      // Render Front Canvas at high-resolution (~343 DPI) for fast generation and crisp print
      const frontCanvas = await html2canvas(frontCardRef.current, {
        scale: 2.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff"
      });

      // Render Back Canvas at high-resolution (~343 DPI)
      const backCanvas = await html2canvas(backCardRef.current, {
        scale: 2.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff"
      });

      const frontImgData = frontCanvas.toDataURL("image/png", 1.0);
      const backImgData = backCanvas.toDataURL("image/png", 1.0);

      if (mode === "cr80") {
        // Individual CR80 Pages (53.98mm x 85.60mm) - for dedicated PVC card printers
        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: [cardWidthMm, cardHeightMm]
        });

        // Page 1: Front Side
        pdf.addImage(frontImgData, "PNG", 0, 0, cardWidthMm, cardHeightMm, undefined, "FAST");

        // Page 2: Back Side
        pdf.addPage([cardWidthMm, cardHeightMm], "portrait");
        pdf.addImage(backImgData, "PNG", 0, 0, cardWidthMm, cardHeightMm, undefined, "FAST");

        pdf.save(`KachaBazar_ID_${activeStaff.staffId}_${activeStaff.fullName.replace(/\s+/g, "_")}_CR80.pdf`);
      } else {
        // A4 Print Layout (True 100% Physical Scale, 53.98mm x 85.60mm Front & Back side-by-side)
        // A4 Dimensions: 210mm x 297mm
        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4"
        });

        const pageWidth = 210;
        const gap = 12; // 12mm gap between front and back cards
        const totalCardsWidth = cardWidthMm * 2 + gap; // 119.96mm
        const startX = (pageWidth - totalCardsWidth) / 2; // ~45.02mm (centered)
        const startY = 45; // 45mm from top

        // Page Title & Header
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(14);
        pdf.setTextColor(5, 104, 57); // #056839
        pdf.text("KACHA BAZAR - OFFICIAL STAFF ID CARD", pageWidth / 2, 22, { align: "center" });

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.setTextColor(100, 116, 139);
        pdf.text(
          `Staff: ${activeStaff.fullName}  |  ID: ${activeStaff.staffId}  |  CR80 Standard: 53.98 mm x 85.60 mm`,
          pageWidth / 2,
          28,
          { align: "center" }
        );

        // Header separator line
        pdf.setDrawColor(203, 213, 225);
        pdf.setLineWidth(0.3);
        pdf.line(25, 32, pageWidth - 25, 32);

        // Labels above cards
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8.5);
        pdf.setTextColor(71, 85, 105);
        pdf.text("FRONT SIDE (সম্মুখভাগ)", startX + cardWidthMm / 2, startY - 4, { align: "center" });
        pdf.text("BACK SIDE (পেছনের ভাগ)", startX + cardWidthMm + gap + cardWidthMm / 2, startY - 4, { align: "center" });

        // Front Card Image at exact 53.98 x 85.60 mm
        pdf.addImage(frontImgData, "PNG", startX, startY, cardWidthMm, cardHeightMm, undefined, "FAST");
        // Front Cut Guide Border
        pdf.setDrawColor(180, 190, 205);
        pdf.setLineWidth(0.2);
        pdf.setLineDashPattern([1.5, 1.5], 0);
        pdf.roundedRect(startX - 0.5, startY - 0.5, cardWidthMm + 1, cardHeightMm + 1, 3.2, 3.2, "S");

        // Back Card Image at exact 53.98 x 85.60 mm
        const backX = startX + cardWidthMm + gap;
        pdf.addImage(backImgData, "PNG", backX, startY, cardWidthMm, cardHeightMm, undefined, "FAST");
        // Back Cut Guide Border
        pdf.roundedRect(backX - 0.5, startY - 0.5, cardWidthMm + 1, cardHeightMm + 1, 3.2, 3.2, "S");

        // Reset Line Dash
        pdf.setLineDashPattern([], 0);

        // Center Fold / Cut marker between cards
        const midX = startX + cardWidthMm + gap / 2;
        pdf.setDrawColor(148, 163, 184);
        pdf.setLineWidth(0.2);
        pdf.setLineDashPattern([2, 2], 0);
        pdf.line(midX, startY - 2, midX, startY + cardHeightMm + 2);
        pdf.setLineDashPattern([], 0);

        // Print & Cutting Instructions Box below
        const instructY = startY + cardHeightMm + 16;
        pdf.setFillColor(248, 250, 252);
        pdf.setDrawColor(226, 232, 240);
        pdf.roundedRect(startX - 5, instructY, totalCardsWidth + 10, 36, 3, 3, "FD");

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8.5);
        pdf.setTextColor(5, 104, 57);
        pdf.text("প্রিন্ট ও কাটিং নির্দেশিকা (Printing & Cutting Guidelines):", startX, instructY + 7);

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7.5);
        pdf.setTextColor(71, 85, 105);
        pdf.text("1. A4 পেপারে প্রিন্ট করার সময় প্রিন্টার সেটিংসে অবশ্যই 'Actual Size' বা 100% স্কেল নির্বাচন করুন ('Fit to Page' দিবেন না)।", startX, instructY + 14);
        pdf.text("2. ড্যাশযুক্ত বর্ডার লাইন (Cut Marks) অনুযায়ী সাবধানে কেটে স্ট্যান্ডার্ড ৫৪ × ৮৬ মিমি পিভিসি পাউচ বা লেমিনেশন করুন।", startX, instructY + 20);
        pdf.text("3. কার্ড দুটির প্রস্থ ৫৩.৯৮ মিমি এবং উচ্চতা ৮৫.৬০ মিমি (আন্তর্জাতিক স্ট্যান্ডার্ড CR80 সাইজ)।", startX, instructY + 26);
        pdf.text("4. Verify online: https://kachabazar.com/verify?id=" + encodeURIComponent(activeStaff.staffId), startX, instructY + 32);

        // Page 2 & Page 3: Direct CR80 single card pages for direct PVC plastic card printers
        pdf.addPage([cardWidthMm, cardHeightMm], "portrait");
        pdf.addImage(frontImgData, "PNG", 0, 0, cardWidthMm, cardHeightMm, undefined, "FAST");

        pdf.addPage([cardWidthMm, cardHeightMm], "portrait");
        pdf.addImage(backImgData, "PNG", 0, 0, cardWidthMm, cardHeightMm, undefined, "FAST");

        pdf.save(`KachaBazar_StaffID_${activeStaff.staffId}_${activeStaff.fullName.replace(/\s+/g, "_")}.pdf`);
      }

      triggerToast("আইডি কার্ড PDF সফলভাবে ডাউনলোড হয়েছে!", "Staff ID Card PDF downloaded successfully!");
    } catch (err) {
      console.error("PDF generation failed:", err);
      triggerToast("PDF তৈরি করতে ত্রুটি হয়েছে!", "Failed to generate ID Card PDF!");
    } finally {
      setIsCapturing(false);
      setGeneratingPdf(false);
    }
  };

  // Copy Staff ID
  const handleCopyStaffId = () => {
    if (!activeStaff) return;
    navigator.clipboard.writeText(activeStaff.staffId);
    triggerToast(`স্টাফ আইডি ${activeStaff.staffId} কপি করা হয়েছে!`, `Staff ID ${activeStaff.staffId} copied!`);
  };

  if (loadingStaff) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 flex flex-col items-center justify-center shadow-2xl text-center">
          <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mb-3" />
          <p className="text-white text-sm font-bold">{getTranslation("স্টাফ আইডি কার্ড লোড হচ্ছে...", "Loading Staff ID Card...")}</p>
        </div>
      </div>
    );
  }

  if (!activeStaff) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <h4 className="text-white font-bold text-base mb-1">{getTranslation("স্টাফ তথ্য পাওয়া যায়নি", "Staff Record Not Found")}</h4>
          <p className="text-slate-400 text-xs mb-4">
            {getTranslation("স্টাফ সদস্যের তথ্য সিস্টেমে খুঁজে পাওয়া যায়নি।", "The staff record could not be loaded.")}
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition cursor-pointer w-full"
          >
            {getTranslation("বন্ধ করুন", "Close")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto">
        
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl overflow-hidden border border-slate-700 bg-white p-1 flex items-center justify-center shrink-0 shadow-sm">
              <img 
                src={activeLogo} 
                alt="Kacha Bazar Logo" 
                className="w-full h-full object-contain" 
              />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-black text-emerald-400 uppercase tracking-widest">
                  CR80 Corporate Staff ID Card
                </span>
                <span className="bg-emerald-950 text-emerald-300 text-[10px] font-mono font-black px-2 py-0.5 rounded-md border border-emerald-800">
                  {activeStaff.staffId}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white truncate">
                {activeStaff.fullName}
              </h3>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Quick Upload Staff Photo */}
            <label 
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 ${uploadingPhoto ? 'opacity-50 cursor-wait' : ''}`}
              title={getTranslation("স্টাফের ছবি আপলোড করুন", "Upload Staff Photo")}
            >
              {uploadingPhoto ? (
                <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span>{uploadingPhoto ? getTranslation("আপলোড হচ্ছে...", "Uploading...") : getTranslation("ছবি আপলোড", "Upload Photo")}</span>
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                disabled={uploadingPhoto || savingEdit}
                onChange={handleDirectPhotoUpload}
              />
            </label>

            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                isEditing 
                  ? "bg-amber-500 text-slate-950 font-bold" 
                  : "bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700"
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditing ? getTranslation("প্রিভিউ দেখুন", "View Preview") : getTranslation("তথ্য এডিট", "Edit Details")}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar & Controls */}
        <div className="px-4 py-2.5 bg-slate-850 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          {/* Side view toggles & Responsive Zoom */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-750">
              <button
                onClick={() => setActiveSide("dual")}
                className={`px-3 py-1 rounded-lg font-black transition cursor-pointer ${
                  activeSide === "dual" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {getTranslation("উভয় পাশ (Front & Back)", "Dual View")}
              </button>
              <button
                onClick={() => setActiveSide("front")}
                className={`px-3 py-1 rounded-lg font-black transition cursor-pointer ${
                  activeSide === "front" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {getTranslation("সামনে (Front)", "Front Only")}
              </button>
              <button
                onClick={() => setActiveSide("back")}
                className={`px-3 py-1 rounded-lg font-black transition cursor-pointer ${
                  activeSide === "back" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {getTranslation("পেছনে (Back)", "Back Only")}
              </button>
            </div>

            {/* Scale / Zoom selector for responsive preview */}
            <div className="hidden sm:flex items-center bg-slate-900 p-1 rounded-xl border border-slate-750 text-[11px]">
              <span className="px-2 text-slate-400 font-bold">{getTranslation("প্রিভিউ:", "Preview:")}</span>
              <button
                onClick={() => setScaleMode("auto")}
                className={`px-2.5 py-0.5 rounded-lg font-black transition cursor-pointer ${
                  scaleMode === "auto" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-400 hover:text-slate-200"
                }`}
                title={getTranslation("স্ক্রিনে মানানসই স্কেল", "Auto Fit to Screen")}
              >
                {getTranslation("মানানসই (Fit)", "Fit")}
              </button>
              <button
                onClick={() => setScaleMode("80")}
                className={`px-2 py-0.5 rounded-lg font-black transition cursor-pointer ${
                  scaleMode === "80" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                80%
              </button>
              <button
                onClick={() => setScaleMode("100")}
                className={`px-2 py-0.5 rounded-lg font-black transition cursor-pointer ${
                  scaleMode === "100" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-400 hover:text-slate-200"
                }`}
                title={getTranslation("আসল ফিজিক্যাল সাইজ", "100% Actual Physical Size")}
              >
                100%
              </button>
            </div>
          </div>

          {/* Action Buttons: Print, PDF, Reprint */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handlePrint(false)}
              disabled={printing}
              className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-xl font-black shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{getTranslation("প্রিন্ট করুন (Print)", "Print Card")}</span>
            </button>

            <button
              onClick={() => handleDownloadPdf("all")}
              disabled={generatingPdf}
              className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-1.5 rounded-xl font-black shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{generatingPdf ? getTranslation("PDF তৈরি হচ্ছে...", "Generating PDF...") : getTranslation("PDF ডাউনলোড", "Download PDF")}</span>
            </button>

            <button
              onClick={() => handlePrint(true)}
              disabled={printing}
              className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 px-3 py-1.5 rounded-xl font-black shadow-xs transition cursor-pointer"
              title={getTranslation("পুনরায় প্রিন্ট (Reprint)", "Reprint")}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{getTranslation("রিপ্রিন্ট (Reprint)", "Reprint")}</span>
            </button>
          </div>
        </div>

        {/* Modal Main Content Area */}
        <div className="p-3 sm:p-4 md:p-5 overflow-y-auto flex-1 bg-slate-950 flex flex-col items-center justify-center min-h-[380px]">
          
          {/* ========================================================================= */}
          {/* EDIT FORM MODE */}
          {/* ========================================================================= */}
          {isEditing ? (
            <form onSubmit={handleSaveStaffEdit} className="w-full max-w-2xl bg-slate-900 rounded-3xl p-6 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2 text-emerald-400">
                  <Edit3 className="w-4 h-4" />
                  <h4 className="font-black text-sm text-white">
                    {getTranslation("স্টাফ আইডি কার্ডের তথ্য এডিট করুন", "Edit Staff ID Card Information")}
                  </h4>
                </div>
                <div className="flex items-center space-x-2 text-xs text-slate-400">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-mono text-amber-400 font-bold">Staff ID: {activeStaff.staffId} (স্থায়ী ও অপরিবর্তনীয়)</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Full Name */}
                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    {getTranslation("স্টাফের পূর্ণ নাম *", "Full Name *")}
                  </label>
                  <input
                    type="text"
                    required
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Staff ID (Readonly) */}
                <div>
                  <label className="block text-slate-300 font-bold mb-1 flex items-center justify-between">
                    <span>{getTranslation("স্টাফ আইডি (Staff ID)", "Staff ID")}</span>
                    <span className="text-amber-400 text-[10px] font-bold">🔒 অপরিবর্তনীয় (Permanent)</span>
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      disabled
                      value={activeStaff.staffId}
                      className="w-full px-3 py-2 bg-slate-850 border border-slate-700 rounded-xl text-emerald-400 font-mono font-black cursor-not-allowed opacity-80"
                    />
                    <button
                      type="button"
                      onClick={handleCopyStaffId}
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition cursor-pointer border border-slate-700"
                      title="Copy Staff ID"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Designation */}
                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    {getTranslation("পদবী (Designation) *", "Designation *")}
                  </label>
                  <input
                    type="text"
                    required
                    value={editDesignation}
                    onChange={(e) => setEditDesignation(e.target.value)}
                    placeholder="e.g. Senior Executive, Delivery Lead"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Department */}
                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    {getTranslation("বিভাগ (Department) *", "Department *")}
                  </label>
                  <select
                    value={editDepartment}
                    onChange={(e) => setEditDepartment(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {DEPARTMENTS.map(d => (
                      <option key={d.id} value={d.nameEn}>
                        {getTranslation(d.nameBn, d.nameEn)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Mobile Phone */}
                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    {getTranslation("মোবাইল নম্বর *", "Phone Number *")}
                  </label>
                  <input
                    type="text"
                    required
                    value={editMobile}
                    onChange={(e) => setEditMobile(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Emergency Contact */}
                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    {getTranslation("জরুরি যোগাযোগ নম্বর", "Emergency Contact")}
                  </label>
                  <input
                    type="text"
                    value={editEmergencyContact}
                    onChange={(e) => setEditEmergencyContact(e.target.value)}
                    placeholder="017XXXXXXXX"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Joining Date */}
                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    {getTranslation("যোগদানের তারিখ (Joining Date)", "Joining Date")}
                  </label>
                  <input
                    type="date"
                    value={editJoiningDate}
                    onChange={(e) => setEditJoiningDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Blood Group */}
                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    {getTranslation("রক্তের গ্রুপ (Blood Group)", "Blood Group")}
                  </label>
                  <select
                    value={editBloodGroup}
                    onChange={(e) => setEditBloodGroup(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {BLOOD_GROUPS.map(bg => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>

                {/* Photo URL & Image Upload */}
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-slate-300 font-bold text-xs">
                      {getTranslation("স্টাফ ফটোর লিংক (Photo URL) বা ছবি আপলোড", "Staff Photo URL or Upload Image")}
                    </label>
                    <label className="flex items-center space-x-1.5 text-xs text-emerald-400 hover:text-emerald-300 cursor-pointer bg-emerald-950/70 hover:bg-emerald-900/80 px-2.5 py-1 rounded-lg border border-emerald-800 transition">
                      {uploadingPhoto ? (
                        <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                      <span>{uploadingPhoto ? getTranslation("আপলোড হচ্ছে...", "Uploading...") : getTranslation("ছবি আপলোড করুন", "Upload Photo")}</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        disabled={uploadingPhoto || savingEdit} 
                        onChange={handlePhotoFileUploadInEditForm}
                      />
                    </label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={editPhotoURL}
                      onChange={(e) => setEditPhotoURL(e.target.value)}
                      placeholder="https://..."
                      className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
                    />
                    {editPhotoURL && (
                      <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-emerald-500/80 bg-slate-800 shrink-0 shadow">
                        <img src={editPhotoURL} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  {getTranslation("বাতিল", "Cancel")}
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="flex items-center space-x-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{savingEdit ? getTranslation("সংরক্ষণ হচ্ছে...", "Saving...") : getTranslation("তথ্য আপডেট করুন", "Save Changes")}</span>
                </button>
              </div>
            </form>
          ) : (
            /* ========================================================================= */
            /* CARD PREVIEW DISPLAY - EXACT DESIGN FROM SCREENSHOT */
            /* ========================================================================= */
            <div className="flex flex-wrap gap-4 sm:gap-6 md:gap-8 items-center justify-center p-2 max-w-full">

              {/* ===================================================================== */}
              {/* FRONT SIDE (CR80 Standard Portrait: 53.98 × 85.60 mm -> 292px × 464px) */}
              {/* ===================================================================== */}
              {(activeSide === "dual" || activeSide === "front") && (
                <div
                  className="flex flex-col items-center transition-all duration-150"
                  style={{
                    width: isCapturing || effectiveScale === 1 ? "292px" : `${Math.round(292 * effectiveScale)}px`,
                    height: isCapturing || effectiveScale === 1 ? "505px" : `${Math.round(505 * effectiveScale)}px`,
                    overflow: "visible"
                  }}
                >
                  <div
                    style={{
                      width: "292px",
                      transform: isCapturing || effectiveScale === 1 ? "none" : `scale(${effectiveScale})`,
                      transformOrigin: "top left",
                      transition: "transform 0.15s ease-out"
                    }}
                  >
                    <div className="flex items-center justify-between w-full max-w-[292px] mb-2 px-1">
                      <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span>FRONT (সম্মুখভাগ)</span>
                      </span>
                      <span className="text-[10px] text-emerald-400 bg-emerald-950/90 px-2.5 py-0.5 rounded-full font-mono font-bold border border-emerald-800">
                        CR80 • 54 × 85.6 mm
                      </span>
                    </div>

                    {/* The Physical Card Container - Portrait */}
                    <div
                      ref={frontCardRef}
                      id="id-card-front"
                    style={{
                      width: "292px",
                      height: "463px",
                      boxSizing: "border-box"
                    }}
                    className="relative rounded-2xl overflow-hidden shadow-2xl bg-white text-slate-900 border border-slate-300 select-none flex flex-col justify-between"
                  >
                    {/* Top Angled Graphic (Green + Red Accent Diagonal) */}
                    <div className="absolute top-0 left-0 w-full h-[188px] overflow-hidden pointer-events-none z-0">
                      {/* Green Accent Layer below diagonal */}
                      <div 
                        className="absolute top-0 left-0 w-full h-full bg-[#047857]"
                        style={{
                          clipPath: "polygon(0 0, 100% 0, 100% 67%, 0 100%)"
                        }}
                      />
                      {/* Red Accent Diagonal Stripe */}
                      <div 
                        className="absolute top-0 left-0 w-full h-full bg-[#dc2626]"
                        style={{
                          clipPath: "polygon(0 0, 100% 0, 100% 62%, 0 94%)"
                        }}
                      />
                      {/* Main Green Layer above diagonal */}
                      <div 
                        className="absolute top-0 left-0 w-full h-full bg-[#056839]"
                        style={{
                          clipPath: "polygon(0 0, 100% 0, 100% 55%, 0 87%)"
                        }}
                      />
                    </div>

                    {/* Top Header: Logo + Company Name & Tagline */}
                    <div className="relative z-10 px-4 pt-3 flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-xl bg-white p-0.5 flex items-center justify-center shadow-md shrink-0 overflow-hidden border border-emerald-200 ring-2 ring-emerald-400/40">
                        <img 
                          src={logoDataUrl || activeLogo} 
                          alt="Kacha Bazar Logo" 
                          className="w-full h-full object-contain"
                          crossOrigin="anonymous"
                        />
                      </div>
                      <div className="text-white text-left leading-tight">
                        <h4 className="font-extrabold text-[14px] tracking-wide drop-shadow-xs">
                          {getTranslation("কাঁচা বাজার", "Kacha Bazar")}
                        </h4>
                        <p className="text-[7.5px] font-semibold text-emerald-100 tracking-wider">
                          {getTranslation("অনলাইন গ্রোসারি ও পিওর ফুডস", "Online Grocery & Pure Foods")}
                        </p>
                      </div>
                    </div>

                    {/* Circular Staff Photo Container (Perfect Circle) */}
                    <div className="relative z-10 mx-auto mt-0.5 flex flex-col items-center">
                      <div className="relative w-[114px] h-[114px] rounded-full bg-white p-1 shadow-xl ring-2 ring-[#056839]/40 border-[3px] border-white flex items-center justify-center">
                        <div className="w-full h-full rounded-full overflow-hidden bg-slate-100 flex items-center justify-center relative border border-emerald-600/30">
                          {(photoDataUrl || activeStaff.photoURL) ? (
                            <img
                              src={photoDataUrl || activeStaff.photoURL}
                              alt={activeStaff.fullName}
                              className="w-full h-full object-cover object-center rounded-full"
                              crossOrigin="anonymous"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-200 text-slate-400 rounded-full">
                              <User className="w-11 h-11 text-slate-400" />
                              <span className="text-[7px] font-bold text-slate-400 mt-0.5">NO PHOTO</span>
                            </div>
                          )}
                        </div>
                        <div className="absolute bottom-0.5 right-1 bg-[#dc2626] text-white rounded-full p-0.5 shadow-md font-bold ring-2 ring-white z-20">
                          <CheckCircle2 className="w-3 h-3 text-white" />
                        </div>
                      </div>
                    </div>

                    {/* Staff Name & Position - Dynamic Font Sizing & Wrapping (Never Cut Off) */}
                    <div className="relative z-10 text-center px-3 mt-0.5 min-h-[38px] flex flex-col justify-center">
                      <h3 
                        className={`font-black text-[#056839] uppercase tracking-wide break-words line-clamp-2 px-1 ${getStaffNameClasses(activeStaff.fullName)}`}
                        title={activeStaff.fullName}
                      >
                        {activeStaff.fullName}
                      </h3>
                      <p 
                        className={`font-bold text-slate-800 tracking-tight mt-0.5 break-words line-clamp-1 ${getDesignationClasses(displayDesignation)}`}
                        title={displayDesignation}
                      >
                        {displayDesignation}
                      </p>
                    </div>

                    {/* Key-Value Details Block - Complete Information & Fully Legible Email - Moved slightly upward for Authorized Signature */}
                    <div className="relative z-10 px-5 py-0.5 -mt-3.5 mb-1.5 w-full">
                      <div className="space-y-1 text-[9.5px] font-mono">
                        {/* ID Row */}
                        <div className="flex items-center text-left">
                          <span className="w-[58px] font-black text-[#056839] shrink-0">ID</span>
                          <span className="font-bold text-[#056839] w-[10px] shrink-0 text-center">:</span>
                          <span className="font-black text-slate-900 tracking-wide pl-1">{activeStaff.staffId}</span>
                        </div>

                        {/* JOIN DATE Row */}
                        <div className="flex items-center text-left">
                          <span className="w-[58px] font-black text-[#056839] shrink-0 text-[8.5px] whitespace-nowrap">JOIN DATE</span>
                          <span className="font-bold text-[#056839] w-[10px] shrink-0 text-center">:</span>
                          <span className="font-bold text-slate-800 tracking-wide pl-1">{OFFICIAL_STAFF_CARD_JOIN_DATE}</span>
                        </div>

                        {/* Phone Row */}
                        <div className="flex items-center text-left">
                          <span className="w-[58px] font-black text-[#056839] shrink-0">PHONE</span>
                          <span className="font-bold text-[#056839] w-[10px] shrink-0 text-center">:</span>
                          <span className="font-bold text-slate-900 tracking-wide pl-1">{activeStaff.mobile || "01719-469714"}</span>
                        </div>

                        {/* Email Row - Dynamic Font Size & Wrapping, Complete Email Always Visible */}
                        <div className="flex items-start text-left">
                          <span className="w-[58px] font-black text-[#056839] shrink-0 pt-0.5">EMAIL</span>
                          <span className="font-bold text-[#056839] w-[10px] shrink-0 text-center pt-0.5">:</span>
                          <span 
                            className={`font-semibold text-slate-800 pl-1 leading-tight break-all ${getStaffEmailClasses(activeStaff.email || "support@kachabazar.com")}`} 
                            title={activeStaff.email || "support@kachabazar.com"}
                          >
                            {activeStaff.email || "support@kachabazar.com"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Authorized Signature Section */}
                    <div className="relative z-10 px-5 pb-3 pt-1 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-16 border-t border-[#056839]/60 mb-0.5" />
                        <div className="text-[5.5px] font-bold text-slate-500 tracking-wider uppercase leading-tight">
                          {authorizedSigner.title}
                        </div>
                        <div className="text-[6.5px] font-black text-[#056839] tracking-wider uppercase leading-tight">
                          {authorizedSigner.name}
                        </div>
                        <div className="text-[5px] font-bold text-slate-500 tracking-wide uppercase leading-tight">
                          {authorizedSigner.designation}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ===================================================================== */}
            {/* BACK SIDE (CR80 Standard Portrait: 53.98 × 85.60 mm -> 292px × 463px) */}
            {/* ===================================================================== */}
            {(activeSide === "dual" || activeSide === "back") && (
              <div
                className="flex flex-col items-center transition-all duration-150"
                style={{
                  width: isCapturing || effectiveScale === 1 ? "292px" : `${Math.round(292 * effectiveScale)}px`,
                  height: isCapturing || effectiveScale === 1 ? "505px" : `${Math.round(505 * effectiveScale)}px`,
                  overflow: "visible"
                }}
              >
                <div
                  style={{
                    width: "292px",
                    transform: isCapturing || effectiveScale === 1 ? "none" : `scale(${effectiveScale})`,
                    transformOrigin: "top left",
                    transition: "transform 0.15s ease-out"
                  }}
                >
                  <div className="flex items-center justify-between w-full max-w-[292px] mb-2 px-1">
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span>BACK (পেছনের ভাগ)</span>
                    </span>
                    <span className="text-[10px] text-emerald-400 bg-slate-950/90 px-2.5 py-0.5 rounded-full font-mono font-bold border border-slate-700">
                      OFFICIAL VERIFICATION
                    </span>
                  </div>

                  {/* Physical Card Container - Portrait */}
                  <div
                    ref={backCardRef}
                    id="id-card-back"
                    style={{
                      width: "292px",
                      height: "463px",
                      boxSizing: "border-box"
                    }}
                    className="relative rounded-2xl overflow-hidden shadow-2xl bg-white text-slate-900 border border-slate-300 select-none flex flex-col justify-between"
                  >
                    {/* Top Header: Centered Logo + Company + Tagline + Security Badge */}
                    <div className="pt-3 pb-1.5 px-4 flex flex-col items-center text-center">
                      <div className="w-9 h-9 rounded-2xl bg-white p-1 flex items-center justify-center shadow-md border-2 border-[#056839] shrink-0 overflow-hidden mb-1 ring-2 ring-emerald-100">
                        <img 
                          src={logoDataUrl || activeLogo} 
                          alt="Kacha Bazar Logo" 
                          className="w-full h-full object-contain"
                          crossOrigin="anonymous"
                        />
                      </div>
                      <h4 className="font-black text-[13px] text-[#056839] tracking-wide leading-tight">
                        {getTranslation("কাঁচা বাজার", "Kacha Bazar")}
                      </h4>
                      <p className="text-[7.5px] font-semibold text-slate-500 tracking-wider">
                        {getTranslation("অনলাইন গ্রোসারি ও পিওর ফুডস", "Online Grocery & Pure Foods")}
                      </p>
                      <div className="mt-1 px-2 py-0.5 bg-emerald-50 rounded-full border border-emerald-200 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                        <span className="text-[7px] font-black text-[#056839] uppercase tracking-wider">
                          OFFICIAL STAFF IDENTITY PASS
                        </span>
                      </div>
                    </div>

                    {/* Terms & Conditions Block - Balanced, Neat, No Empty Space */}
                    <div className="px-4 text-left">
                      <div className="flex items-center justify-between mb-1.5 border-b border-emerald-100 pb-1">
                        <h5 className="font-black text-[9px] text-[#056839] uppercase tracking-wide leading-none">
                          Terms and conditions (শর্তাবলী)
                        </h5>
                        <span className="text-[7px] font-bold text-slate-400 font-mono">NON-TRANSFERABLE</span>
                      </div>
                      <div className="space-y-1.5 text-[7.5px] text-slate-700 leading-tight">
                        <div className="flex items-start space-x-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#056839] shrink-0 mt-0.5" />
                          <p>Employees are required to wear or display this card at all times while on duty.</p>
                        </div>
                        <div className="flex items-start space-x-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#056839] shrink-0 mt-0.5" />
                          <p>If the card is lost or damaged, notify management immediately for replacement.</p>
                        </div>
                        <div className="flex items-start space-x-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#056839] shrink-0 mt-0.5" />
                          <p>This card remains the property of Kacha Bazar and must be returned upon termination.</p>
                        </div>
                      </div>
                    </div>

                    {/* QR Code in crisp white box with Verification Tag - Moved Above the Red Horizontal Line */}
                    <div className="px-4 pb-2 pt-1 flex justify-end items-end w-full mt-auto">
                      <div className="flex flex-col items-center">
                        <div className="bg-white p-1 rounded-lg shadow-sm border border-emerald-300 ring-2 ring-emerald-600/20 shrink-0">
                          {loadingQr ? (
                            <div className="w-[52px] h-[52px] flex items-center justify-center">
                              <RefreshCw className="w-3.5 h-3.5 text-emerald-800 animate-spin" />
                            </div>
                          ) : qrCodeUrl ? (
                            <img
                              src={qrCodeUrl}
                              alt="Staff Verification QR"
                              className="w-[52px] h-[52px] object-contain rounded"
                            />
                          ) : (
                            <div className="w-[52px] h-[52px] bg-slate-100 flex items-center justify-center text-slate-400">
                              <QrIcon className="w-5 h-5" />
                            </div>
                          )}
                        </div>
                        <span className="text-[6.5px] font-mono font-black text-[#056839] uppercase tracking-wider mt-1 drop-shadow-xs">
                          SCAN TO VERIFY
                        </span>
                      </div>
                    </div>

                    {/* Bottom Section: Red Horizontal Line + Straight Level Green Info Block */}
                    <div className="w-full shrink-0">
                      {/* Red Accent Horizontal Line */}
                      <div className="w-full h-[2.5px] bg-[#dc2626]" />

                      {/* Straight Level Green Area with Verification & Staff Details */}
                      <div className="w-full bg-[#056839] px-4 py-2.5">
                        <div className="text-white text-[7.5px] space-y-1 font-mono font-bold leading-tight drop-shadow-xs">
                          <div className="flex items-center space-x-1">
                            <span className="text-emerald-200 w-16 shrink-0">Staff ID</span>
                            <span>: {activeStaff.staffId}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <span className="text-emerald-200 w-16 shrink-0">Blood Group</span>
                            <span className="text-amber-300">: {displayBloodGroup}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <span className="text-emerald-200 w-16 shrink-0">Issue Date</span>
                            <span>: {OFFICIAL_STAFF_CARD_ISSUE_DATE}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <span className="text-emerald-200 w-16 shrink-0">Valid Thru</span>
                            <span>: {OFFICIAL_STAFF_CARD_VALID_THRU}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            </div>
          )}

        </div>

        {/* Modal Footer Info */}
        <div className="px-5 py-3 bg-slate-900 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              {getTranslation(
                "CR80 পোর্ট্রেট স্ট্যান্ডার্ড সাইজ: ৫৩.৯৮ × ৮৫.৬০ মিমি (ভার্টিক্যাল পিভিসি ও লেমিনেশন কার্ড ফ্রেন্ডলি)",
                "Standard CR80 Portrait Size: 53.98 × 85.60 mm (Vertical PVC & Lamination print friendly)"
              )}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[11px] text-slate-500 font-mono">
              Staff: {activeStaff.fullName} ({activeStaff.staffId})
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
