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

  // Edit Mode state
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editFullName, setEditFullName] = useState<string>(activeStaff?.fullName || staff?.fullName || "");
  const [editDesignation, setEditDesignation] = useState<string>(activeStaff?.designation || staff?.designation || "");
  const [editDepartment, setEditDepartment] = useState<string>(activeStaff?.department || staff?.department || "Order Fulfillment & Logistics");
  const [editMobile, setEditMobile] = useState<string>(activeStaff?.mobile || staff?.mobile || "");
  const [editEmail, setEditEmail] = useState<string>(activeStaff?.email || staff?.email || "");
  const [editPhotoURL, setEditPhotoURL] = useState<string>(activeStaff?.photoURL || staff?.photoURL || "");
  const [editJoiningDate, setEditJoiningDate] = useState<string>(activeStaff?.joiningDate || staff?.joiningDate || "2026-01-01");
  const [editBloodGroup, setEditBloodGroup] = useState<string>(activeStaff?.bloodGroup || staff?.bloodGroup || "B (+ve)");
  const [editEmergencyContact, setEditEmergencyContact] = useState<string>(activeStaff?.emergencyContact || activeStaff?.mobile || staff?.emergencyContact || staff?.mobile || "");
  const [savingEdit, setSavingEdit] = useState<boolean>(false);
  const [uploadingPhoto, setUploadingPhoto] = useState<boolean>(false);

  // PDF / Print Loading
  const [generatingPdf, setGeneratingPdf] = useState<boolean>(false);
  const [printing, setPrinting] = useState<boolean>(false);

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
      setEditJoiningDate(activeStaff.joiningDate || "2026-01-01");
      setEditBloodGroup(activeStaff.bloodGroup || "B (+ve)");
      setEditEmergencyContact(activeStaff.emergencyContact || activeStaff.mobile || "");
    }
  }, [activeStaff]);

  const roleDef = DEFAULT_ROLES.find(r => r.id === activeStaff?.role) || DEFAULT_ROLES[DEFAULT_ROLES.length - 1];

  // Default Fallbacks
  const displayDesignation = activeStaff?.designation || getTranslation(roleDef.nameBn, roleDef.nameEn);
  const displayDepartment = activeStaff?.department || "Order Fulfillment & Logistics";
  // Issue date formatted in English (e.g. 15 January, 2026)
  const displayJoiningDate = (() => {
    const rawInput = activeStaff?.joiningDate || "2026-01-01";
    const bnToEn: Record<string, string> = {
      "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4",
      "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9"
    };
    const raw = String(rawInput).replace(/[০-৯]/g, (d) => bnToEn[d] || d);

    try {
      const d = new Date(raw);
      if (!isNaN(d.getTime())) {
        const enMonths = [
          "January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December"
        ];
        const day = String(d.getDate()).padStart(2, "0");
        const month = enMonths[d.getMonth()];
        const year = d.getFullYear();
        return `${day} ${month}, ${year}`;
      }
    } catch {}
    return formatStaffJoiningDate(raw, "en");
  })();

  const displayBloodGroup = activeStaff?.bloodGroup || "B (+ve)";
  const displayEmergency = activeStaff?.emergencyContact || activeStaff?.mobile || "01719-469714";
  const activeLogo = logoDataUrl || logoImg;

  // Compact date (DD/MM/YYYY) in English for ID card front alignment
  const displayCompactDob = (() => {
    const rawInput = (activeStaff as any)?.dob || activeStaff?.joiningDate || "2026-01-01";
    const bnToEn: Record<string, string> = {
      "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4",
      "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9"
    };
    const raw = String(rawInput).replace(/[০-৯]/g, (d) => bnToEn[d] || d);

    try {
      const parts = raw.split("-");
      if (parts.length === 3) {
        const dd = parts[2].padStart(2, "0");
        const mm = parts[1].padStart(2, "0");
        const yyyy = parts[0];
        return `${dd}/${mm}/${yyyy}`;
      }
      const slashParts = raw.split("/");
      if (slashParts.length === 3) {
        const dd = slashParts[0].padStart(2, "0");
        const mm = slashParts[1].padStart(2, "0");
        const yyyy = slashParts[2];
        return `${dd}/${mm}/${yyyy}`;
      }
      const d = new Date(raw);
      if (!isNaN(d.getTime())) {
        const dd = String(d.getDate()).padStart(2, "0");
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const yyyy = d.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
      }
    } catch {}
    return raw;
  })();

  // Preload actual logo as Data URL
  useEffect(() => {
    imageToDataUrl(logoImg).then((dataUrl) => {
      setLogoDataUrl(dataUrl || logoImg);
    }).catch(() => {
      setLogoDataUrl(logoImg);
    });
  }, []);

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
          joiningDate: activeStaff.joiningDate || "2026-01-01",
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
  const handlePrint = (isReprint = false) => {
    if (!activeStaff) return;
    setPrinting(true);
    logCardAction(isReprint ? "reprint" : "print");

    const printWindow = window.open("", "_blank", "width=900,height=950");
    if (!printWindow) {
      triggerToast("পপ-আপ ব্লক করা হয়েছে! অনুগ্রহ করে অনুমতি দিন।", "Pop-up blocked! Please allow pop-ups to print.");
      setPrinting(false);
      return;
    }

    const frontHtml = frontCardRef.current ? frontCardRef.current.outerHTML : "";
    const backHtml = backCardRef.current ? backCardRef.current.outerHTML : "";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Staff ID Card - ${activeStaff.staffId} - ${activeStaff.fullName}</title>
          <meta charset="utf-8" />
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Hind+Siliguri:wght@400;500;600;700&display=swap" rel="stylesheet">
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @page {
              size: A4;
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
              background-color: #f1f5f9;
              margin: 0;
              padding: 24px;
              color: #0f172a;
            }
            .print-container {
              display: flex;
              flex-wrap: wrap;
              gap: 28px;
              justify-content: center;
              align-items: center;
              margin-top: 15px;
            }
            .card-wrapper {
              width: 53.98mm;
              height: 85.60mm;
              box-sizing: border-box;
              page-break-inside: avoid;
              position: relative;
              border: 1px dashed #94a3b8;
              border-radius: 3.5mm;
              overflow: hidden;
              background: #ffffff;
            }
            .card-wrapper > div {
              width: 100% !important;
              height: 100% !important;
              border: none !important;
              border-radius: 0 !important;
              box-shadow: none !important;
            }
            @media print {
              body {
                background: transparent;
                padding: 0;
              }
              .no-print {
                display: none !important;
              }
              .print-container {
                margin: 0;
                gap: 10mm;
              }
              .card-wrapper {
                border: 0.5pt dashed #cbd5e1;
              }
            }
          </style>
        </head>
        <body>
          <div class="no-print bg-slate-900 text-white p-4 rounded-2xl mb-6 flex items-center justify-between shadow-lg">
            <div>
              <h2 class="text-sm font-bold text-emerald-400">কাঁচা বাজার অফিসিয়াল স্টাফ আইডি কার্ড (CR80 Portrait Print)</h2>
              <p class="text-xs text-slate-300">Staff: ${activeStaff.fullName} | ID: ${activeStaff.staffId} | Size: 53.98mm × 85.60mm (Vertical / Portrait)</p>
            </div>
            <button onclick="window.print()" style="background:#059669;color:white;padding:9px 20px;border-radius:12px;font-weight:bold;font-size:13px;border:none;cursor:pointer;display:flex;align-items:center;gap:6px;">
              <span>🖨️ প্রিন্ট করুন (Print Now)</span>
            </button>
          </div>

          <div class="print-container">
            <!-- Front Card -->
            <div class="flex flex-col items-center">
              <span class="text-[11px] font-bold text-slate-500 mb-1.5 no-print uppercase tracking-wider">Front Side (সম্মুখভাগ)</span>
              <div class="card-wrapper shadow-md">
                ${frontHtml}
              </div>
            </div>

            <!-- Back Card -->
            <div class="flex flex-col items-center">
              <span class="text-[11px] font-bold text-slate-500 mb-1.5 no-print uppercase tracking-wider">Back Side (পেছনের ভাগ)</span>
              <div class="card-wrapper shadow-md">
                ${backHtml}
              </div>
            </div>
          </div>

          <div class="no-print mt-8 text-center text-xs text-slate-500 max-w-md mx-auto">
            <p class="font-medium">✂️ প্রিন্ট করার পর ড্যাশযুক্ত বর্ডার লাইন অনুযায়ী কেটে পিভিসি আইডি কার্ড বা লেমিনেশন পাউচে সহজে স্থাপন করুন।</p>
          </div>

          <script>
            window.onload = function() {
              setTimeout(() => {
                window.print();
              }, 400);
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
    setPrinting(false);
    triggerToast(
      isReprint ? "আইডি কার্ড রিপ্রিন্ট উইন্ডো খোলা হয়েছে!" : "আইডি কার্ড প্রিন্ট উইন্ডো খোলা হয়েছে!",
      isReprint ? "ID Card reprint window opened!" : "ID Card print window opened!"
    );
  };

  // Download PDF
  const handleDownloadPdf = async () => {
    if (!activeStaff || !frontCardRef.current || !backCardRef.current) return;
    setGeneratingPdf(true);
    logCardAction("pdf");

    try {
      const cardWidthMm = 53.98;
      const cardHeightMm = 85.60;

      // Render Front Canvas at 4x sharp print resolution
      const frontCanvas = await html2canvas(frontCardRef.current, {
        scale: 4,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff"
      });

      // Render Back Canvas at 4x sharp print resolution
      const backCanvas = await html2canvas(backCardRef.current, {
        scale: 4,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff"
      });

      // Initialize jsPDF with standard CR80 page size (Portrait)
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [cardWidthMm, cardHeightMm]
      });

      const frontImgData = frontCanvas.toDataURL("image/png", 1.0);
      const backImgData = backCanvas.toDataURL("image/png", 1.0);

      // Page 1: Front Side (Portrait)
      pdf.addImage(frontImgData, "PNG", 0, 0, cardWidthMm, cardHeightMm, undefined, "FAST");

      // Page 2: Back Side (Portrait)
      pdf.addPage([cardWidthMm, cardHeightMm], "portrait");
      pdf.addImage(backImgData, "PNG", 0, 0, cardWidthMm, cardHeightMm, undefined, "FAST");

      // Save PDF
      pdf.save(`KachaBazar_StaffID_${activeStaff.staffId}_${activeStaff.fullName.replace(/\s+/g, "_")}_Portrait.pdf`);

      triggerToast("আইডি কার্ড PDF সফলভাবে ডাউনলোড হয়েছে!", "Staff ID Card PDF downloaded successfully!");
    } catch (err) {
      console.error("PDF generation failed:", err);
      triggerToast("PDF তৈরি করতে ত্রুটি হয়েছে!", "Failed to generate ID Card PDF!");
    } finally {
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
        <div className="px-4 py-3 bg-slate-850 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Side view toggles */}
          <div className="flex items-center gap-2">
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
              onClick={handleDownloadPdf}
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
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-950 flex flex-col items-center justify-center min-h-[440px]">
          
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
            <div className="flex flex-wrap gap-8 items-center justify-center p-2">

              {/* ===================================================================== */}
              {/* FRONT SIDE (CR80 Standard Portrait: 53.98 × 85.60 mm -> 292px × 464px) */}
              {/* ===================================================================== */}
              {(activeSide === "dual" || activeSide === "front") && (
                <div className="flex flex-col items-center">
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
                      height: "464px",
                      boxSizing: "border-box"
                    }}
                    className="relative rounded-2xl overflow-hidden shadow-2xl bg-white text-slate-900 border border-slate-300 select-none flex flex-col justify-between"
                  >
                    {/* Top Angled Graphic (Green + Red Accent Diagonal) */}
                    <div className="absolute top-0 left-0 w-full h-[190px] overflow-hidden pointer-events-none z-0">
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
                          src={activeLogo} 
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
                    <div className="relative z-10 mx-auto mt-1 flex flex-col items-center">
                      <div className="relative w-[118px] h-[118px] rounded-full bg-white p-1 shadow-xl ring-2 ring-[#056839]/40 border-[3px] border-white flex items-center justify-center">
                        <div className="w-full h-full rounded-full overflow-hidden bg-slate-100 flex items-center justify-center relative border border-emerald-600/30">
                          {activeStaff.photoURL ? (
                            <img
                              src={activeStaff.photoURL}
                              alt={activeStaff.fullName}
                              className="w-full h-full object-cover object-center rounded-full"
                              crossOrigin="anonymous"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-200 text-slate-400 rounded-full">
                              <User className="w-12 h-12 text-slate-400" />
                              <span className="text-[7.5px] font-bold text-slate-400 mt-1">NO PHOTO</span>
                            </div>
                          )}
                        </div>
                        <div className="absolute bottom-0.5 right-1.5 bg-[#dc2626] text-white rounded-full p-0.5 shadow-md font-bold ring-2 ring-white z-20">
                          <CheckCircle2 className="w-3 h-3 text-white" />
                        </div>
                      </div>
                    </div>

                    {/* Staff Name & Position */}
                    <div className="relative z-10 text-center px-3 mt-1">
                      <h3 
                        className="font-black text-[16.5px] text-[#056839] uppercase tracking-wide leading-tight truncate"
                        title={activeStaff.fullName}
                      >
                        {activeStaff.fullName}
                      </h3>
                      <p 
                        className="font-bold text-[11px] text-slate-800 tracking-tight mt-0.5 truncate"
                        title={displayDesignation}
                      >
                        {displayDesignation}
                      </p>
                    </div>

                    {/* Key-Value Details Block - Clean, Table-Aligned & Compact */}
                    <div className="relative z-10 px-6 py-1 w-full">
                      <div className="space-y-1 text-[9.5px] font-mono">
                        {/* ID Row */}
                        <div className="flex items-center text-left">
                          <span className="w-[46px] font-black text-[#056839] shrink-0">ID</span>
                          <span className="font-bold text-[#056839] w-[10px] shrink-0 text-center">:</span>
                          <span className="font-black text-slate-900 truncate tracking-wide pl-1">{activeStaff.staffId}</span>
                        </div>

                        {/* DOB Row */}
                        <div className="flex items-center text-left">
                          <span className="w-[46px] font-black text-[#056839] shrink-0">DOB</span>
                          <span className="font-bold text-[#056839] w-[10px] shrink-0 text-center">:</span>
                          <span className="font-bold text-slate-800 truncate tracking-wide pl-1">{displayCompactDob}</span>
                        </div>

                        {/* Phone Row */}
                        <div className="flex items-center text-left">
                          <span className="w-[46px] font-black text-[#056839] shrink-0 flex items-center gap-1">
                            <Phone className="w-2.5 h-2.5 text-[#056839] shrink-0" />
                            <span>PHONE</span>
                          </span>
                          <span className="font-bold text-[#056839] w-[10px] shrink-0 text-center">:</span>
                          <span className="font-bold text-slate-900 truncate tracking-wide pl-1">{activeStaff.mobile || "01719-469714"}</span>
                        </div>

                        {/* Email Row */}
                        <div className="flex items-center text-left">
                          <span className="w-[46px] font-black text-[#056839] shrink-0">EMAIL</span>
                          <span className="font-bold text-[#056839] w-[10px] shrink-0 text-center">:</span>
                          <span className="font-semibold text-slate-700 truncate pl-1 text-[9px]" title={activeStaff.email || "support@kachabazar.com"}>
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
                          AUTHORISED BY
                        </div>
                        <div className="text-[6.5px] font-black text-[#056839] tracking-wider uppercase leading-tight">
                          MD ANIK SARKAR
                        </div>
                        <div className="text-[5px] font-bold text-slate-500 tracking-wide uppercase leading-tight">
                          FOUNDER, KACHA BAZAR
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ===================================================================== */}
              {/* BACK SIDE (CR80 Standard Portrait: 53.98 × 85.60 mm -> 292px × 464px) */}
              {/* ===================================================================== */}
              {(activeSide === "dual" || activeSide === "back") && (
                <div className="flex flex-col items-center">
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
                      height: "464px",
                      boxSizing: "border-box"
                    }}
                    className="relative rounded-2xl overflow-hidden shadow-2xl bg-white text-slate-900 border border-slate-300 select-none flex flex-col justify-between"
                  >
                    {/* Top Header: Centered Logo + Company + Tagline */}
                    <div className="pt-4 pb-2 px-4 flex flex-col items-center text-center">
                      <div className="w-10 h-10 rounded-2xl bg-white p-1 flex items-center justify-center shadow-md border-2 border-[#056839] shrink-0 overflow-hidden mb-1 ring-2 ring-emerald-100">
                        <img 
                          src={activeLogo} 
                          alt="Kacha Bazar Logo" 
                          className="w-full h-full object-contain"
                          crossOrigin="anonymous"
                        />
                      </div>
                      <h4 className="font-black text-[13.5px] text-[#056839] tracking-wide leading-tight">
                        {getTranslation("কাঁচা বাজার", "Kacha Bazar")}
                      </h4>
                      <p className="text-[7.5px] font-semibold text-slate-500 tracking-wider">
                        {getTranslation("অনলাইন গ্রোসারি ও পিওর ফুডস", "Online Grocery & Pure Foods")}
                      </p>
                    </div>

                    {/* Terms & Conditions Block */}
                    <div className="px-5 text-left my-auto">
                      <h5 className="font-bold text-[9.5px] text-[#056839] mb-2 leading-none">
                        Terms and conditions
                      </h5>
                      <div className="space-y-2.5 text-[8px] text-slate-700 leading-tight">
                        <div className="flex items-start space-x-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#056839] shrink-0 mt-0.5" />
                          <p>Employees are required to use the card while on duty</p>
                        </div>
                        <div className="flex items-start space-x-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#056839] shrink-0 mt-0.5" />
                          <p>If the card is lost or damaged, an additional fee will be charged according to regulations</p>
                        </div>
                        <div className="flex items-start space-x-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#056839] shrink-0 mt-0.5" />
                          <p>If you find this card, call the number listed below</p>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Angled Graphic (Green + Red Accent Matching Front) with Issue/Expire Date & QR */}
                    <div className="relative w-full h-[95px] overflow-hidden mt-auto">
                      {/* Green Accent Base Polygon */}
                      <div 
                        className="absolute bottom-0 left-0 w-full h-full bg-[#047857]"
                        style={{
                          clipPath: "polygon(0 68%, 26% 54%, 58% 66%, 100% 40%, 100% 100%, 0 100%)"
                        }}
                      />
                      {/* Red Accent Polygon */}
                      <div 
                        className="absolute bottom-0 left-0 w-full h-full bg-[#dc2626]"
                        style={{
                          clipPath: "polygon(0 76%, 26% 62%, 58% 74%, 100% 48%, 100% 100%, 0 100%)"
                        }}
                      />
                      {/* Deep Green Main Polygon */}
                      <div 
                        className="absolute bottom-0 left-0 w-full h-full bg-[#056839]"
                        style={{
                          clipPath: "polygon(0 88%, 28% 74%, 62% 84%, 100% 58%, 100% 100%, 0 100%)"
                        }}
                      />

                      {/* Content over bottom shape */}
                      <div className="absolute inset-0 px-4 pb-2.5 pt-3 flex items-end justify-between z-10">
                        <div className="text-white text-[8px] space-y-1 font-mono font-bold leading-tight drop-shadow-xs pb-0.5">
                          <div className="flex items-center space-x-1">
                            <span className="text-emerald-200">Issue date</span>
                            <span>: {displayJoiningDate}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <span className="text-emerald-200">Expire Date</span>
                            <span>: 31/12/2028</span>
                          </div>
                        </div>

                        {/* QR Code in crisp white box */}
                        <div className="bg-white p-1 rounded-sm shadow-md border border-emerald-300 ring-2 ring-emerald-600/30 shrink-0">
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
