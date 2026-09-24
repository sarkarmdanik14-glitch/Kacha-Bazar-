import React, { useState, useEffect } from "react";
import { 
  StaffMember, 
  StaffRole, 
  StaffStatus, 
  StaffOnlineStatus, 
  StaffActivityLog, 
  PermissionModule, 
  PermissionAction,
  PermissionsMap 
} from "../../types";
import { 
  DEFAULT_ROLES, 
  PERMISSION_MODULES, 
  DEPARTMENTS,
  BLOOD_GROUPS,
  generateNextStaffId,
  hasPermission, 
  logStaffActivity,
  fetchStaffFromFirestore,
  subscribeToStaffCollection,
  subscribeToStaffLogsCollection,
  createStaffInFirestore,
  updateStaffInFirestore,
  deleteStaffFromFirestore,
  fetchStaffLogsFromFirestore,
  payStaffSalaryInFirestore,
  updateStaffSalaryBaseInFirestore,
  formatStaffUsername,
  getStaffAuthHeaders,
  findStaffMember,
  fetchSingleStaffById
} from "../../lib/staffManager";
import { 
  Users, UserPlus, Shield, ShieldCheck, History, 
  Search, Filter, Plus, Edit2, Trash2, Key, LogOut, 
  CheckCircle2, XCircle, Clock, AlertTriangle, Phone, 
  Mail, Eye, EyeOff, RefreshCw, Download, Check, 
  UserCheck, ShieldAlert, Laptop, PhoneCall, Sparkles,
  CreditCard, QrCode, Printer, Lock, DollarSign, Wallet,
  Calendar, Building, Building2
} from "lucide-react";
import StaffIdCardModal from "./StaffIdCardModal";

interface AdminStaffManagementTabProps {
  currentUser: any;
  lang: "bn" | "en";
  triggerToast: (bn: string, en: string) => void;
}

const PRESET_AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80"
];

export default function AdminStaffManagementTab({
  currentUser,
  lang,
  triggerToast
}: AdminStaffManagementTabProps) {
  const getTranslation = (bn: string, en: string) => (lang === "bn" ? bn : en);

  // Sub-tabs
  const [subTab, setSubTab] = useState<"list" | "add" | "roles" | "logs">("list");

  // Staff Data & Activity Logs state
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [activityLogs, setActivityLogs] = useState<StaffActivityLog[]>([]);
  const [loadingStaff, setLoadingStaff] = useState<boolean>(true);
  const [loadingLogs, setLoadingLogs] = useState<boolean>(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterOnline, setFilterOnline] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Activity Log filter
  const [logSearchQuery, setLogSearchQuery] = useState<string>("");
  const [logModuleFilter, setLogModuleFilter] = useState<string>("all");

  // Modals state
  const [selectedStaffForView, setSelectedStaffForView] = useState<StaffMember | null>(null);
  const [selectedStaffForEdit, setSelectedStaffForEdit] = useState<StaffMember | null>(null);
  const [selectedStaffForPerms, setSelectedStaffForPerms] = useState<StaffMember | null>(null);
  const [selectedStaffForPassword, setSelectedStaffForPassword] = useState<StaffMember | null>(null);
  const [selectedStaffForDelete, setSelectedStaffForDelete] = useState<StaffMember | null>(null);
  const [selectedStaffForIdCard, setSelectedStaffForIdCard] = useState<StaffMember | null>(null);
  const [selectedStaffForSalary, setSelectedStaffForSalary] = useState<StaffMember | null>(null);

  // Salary & Payment state
  const [salaryMonth, setSalaryMonth] = useState<string>(() => {
    return new Date().toLocaleString("en-US", { month: "long", year: "numeric" });
  });
  const [salaryAmount, setSalaryAmount] = useState<number>(0);
  const [salaryPaymentMethod, setSalaryPaymentMethod] = useState<string>("bKash");
  const [salaryTrxId, setSalaryTrxId] = useState<string>("");
  const [salaryNote, setSalaryNote] = useState<string>("Monthly Salary Disbursement");
  const [salaryLoading, setSalaryLoading] = useState<boolean>(false);
  const [newBaseSalary, setNewBaseSalary] = useState<number>(0);
  const [updatingBaseSalary, setUpdatingBaseSalary] = useState<boolean>(false);

  // Password reset state
  const [newPassword, setNewPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [passwordResetLoading, setPasswordResetLoading] = useState<boolean>(false);

  // Add Form state
  const [formFullName, setFormFullName] = useState<string>("");
  const [formUsername, setFormUsername] = useState<string>("");
  const [formMobile, setFormMobile] = useState<string>("");
  const [formEmail, setFormEmail] = useState<string>("");
  const [formStaffId, setFormStaffId] = useState<string>("");
  const [formDesignation, setFormDesignation] = useState<string>("");
  const [formDepartment, setFormDepartment] = useState<string>("Order Fulfillment & Logistics");
  const [formJoiningDate, setFormJoiningDate] = useState<string>("2026-09-03");
  const [formBloodGroup, setFormBloodGroup] = useState<string>("B (+ve)");
  const [formEmergencyContact, setFormEmergencyContact] = useState<string>("");
  const [formPassword, setFormPassword] = useState<string>("");
  const [formRole, setFormRole] = useState<StaffRole>("order_manager");
  const [formStatus, setFormStatus] = useState<StaffStatus>("active");
  const [formMonthlySalary, setFormMonthlySalary] = useState<number>(20000);
  const [formSalaryStatus, setFormSalaryStatus] = useState<"paid" | "due">("due");
  const [formPhotoURL, setFormPhotoURL] = useState<string>(PRESET_AVATARS[0]);
  const [formDesk, setFormDesk] = useState<number>(1);
  const [formPermissions, setFormPermissions] = useState<PermissionsMap>({});
  const [showFormPassword, setShowFormPassword] = useState<boolean>(false);
  const [submittingAdd, setSubmittingAdd] = useState<boolean>(false);

  // Edit Permissions Modal local state
  const [tempPermissions, setTempPermissions] = useState<PermissionsMap>({});

  // Fetch Staff List with Firebase Firestore as Primary Source of Truth
  const fetchStaff = async () => {
    setLoadingStaff(true);
    try {
      const list = await fetchStaffFromFirestore();
      if (Array.isArray(list)) {
        setStaffList(list);
      }
    } catch (err) {
      console.error("Error loading staff list from Firestore:", err);
    } finally {
      setLoadingStaff(false);
    }
  };

  // Fetch Activity Logs from Firestore
  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const logs = await fetchStaffLogsFromFirestore(150);
      if (Array.isArray(logs)) {
        setActivityLogs(logs);
      }
    } catch (err) {
      console.error("Error loading activity logs from Firestore:", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchStaff();
    fetchLogs();

    // Subscribe to real-time updates from Firebase Firestore for staff
    const unsubscribeStaff = subscribeToStaffCollection((updatedStaff) => {
      if (Array.isArray(updatedStaff)) {
        setStaffList(updatedStaff);
      }
    });

    // Subscribe to real-time updates from Firebase Firestore for activity logs
    const unsubscribeLogs = subscribeToStaffLogsCollection((updatedLogs) => {
      if (Array.isArray(updatedLogs)) {
        setActivityLogs(updatedLogs);
      }
    });

    return () => {
      unsubscribeStaff();
      unsubscribeLogs();
    };
  }, []);

  // Restore selected staff for ID card on page refresh or staffList load
  useEffect(() => {
    if (selectedStaffForIdCard) return;
    try {
      const savedStaffId = sessionStorage.getItem("kacha_selected_staff_id_card");
      if (savedStaffId) {
        if (staffList.length > 0) {
          const found = findStaffMember(staffList, savedStaffId);
          if (found) {
            setSelectedStaffForIdCard(found);
            return;
          }
        }
        fetchSingleStaffById(savedStaffId).then((loaded) => {
          if (loaded) {
            setSelectedStaffForIdCard(loaded);
          }
        }).catch(() => {});
      }
    } catch {}
  }, [staffList, selectedStaffForIdCard]);

  // Handlers for ID card modal with persistence
  const handleOpenIdCard = (staff: StaffMember) => {
    setSelectedStaffForIdCard(staff);
    try {
      const keyId = staff.staffId || staff.id;
      if (keyId) {
        sessionStorage.setItem("kacha_selected_staff_id_card", keyId);
      }
    } catch {}
  };

  const handleCloseIdCard = () => {
    setSelectedStaffForIdCard(null);
    try {
      sessionStorage.removeItem("kacha_selected_staff_id_card");
    } catch {}
  };

  // Update permissions when form role changes
  useEffect(() => {
    const roleDef = DEFAULT_ROLES.find(r => r.id === formRole);
    if (roleDef) {
      setFormPermissions({ ...roleDef.defaultPermissions });
    }
  }, [formRole]);

  // Handle Add Staff Submit with immediate Firestore synchronization
  const handleAddStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanFullName = formFullName.trim();
    const cleanPhone = formMobile.replace(/\s+/g, "");
    const cleanEmail = formEmail.trim().toLowerCase();

    if (!cleanFullName || !cleanPhone || !cleanEmail || !formPassword) {
      triggerToast("অনুগ্রহ করে সকল তথ্য পূরণ করুন!", "Please fill in all required fields!");
      return;
    }

    if (cleanPhone.length < 10) {
      triggerToast("সঠিক মোবাইল নম্বর প্রদান করুন!", "Please enter a valid mobile phone number!");
      return;
    }

    if (formPassword.length < 6) {
      triggerToast("পাসওয়ার্ড ন্যূনতম ৬ অক্ষরের হতে হবে!", "Password must be at least 6 characters long!");
      return;
    }

    setSubmittingAdd(true);
    try {
      const computedStaffId = formStaffId.trim() || generateNextStaffId(staffList);
      const safeDesk = formRole === "call_center_agent" ? (Number(formDesk) || 1) : null;
      const cleanUsername = formUsername.trim() 
        ? formatStaffUsername(formUsername) 
        : formatStaffUsername(computedStaffId);

      const createdStaff = await createStaffInFirestore({
        fullName: cleanFullName,
        username: cleanUsername,
        mobile: cleanPhone,
        email: cleanEmail,
        staffId: computedStaffId,
        designation: formDesignation.trim(),
        department: formDepartment.trim(),
        joiningDate: formJoiningDate || "2026-09-03",
        bloodGroup: formBloodGroup || "N/A",
        emergencyContact: (formEmergencyContact && formEmergencyContact.trim()) || cleanPhone,
        password: formPassword,
        role: formRole,
        status: formStatus || "active",
        monthlySalary: Number(formMonthlySalary) || 0,
        salaryStatus: formSalaryStatus || "due",
        photoURL: formPhotoURL || "",
        assignedAgentDesk: safeDesk,
        permissions: formPermissions,
        creatorUser: currentUser
      });

      triggerToast(
        `নতুন স্টাফ (${createdStaff.staffId || computedStaffId}) Firestore-এ সফলভাবে যুক্ত হয়েছে!`,
        `New staff (${createdStaff.staffId || computedStaffId}) created and synchronized with Firestore!`
      );
      // Reset form
      setFormFullName("");
      setFormUsername("");
      setFormMobile("");
      setFormEmail("");
      setFormStaffId("");
      setFormDesignation("");
      setFormEmergencyContact("");
      setFormPassword("");
      setFormRole("order_manager");
      setFormStatus("active");
      setFormMonthlySalary(20000);
      setFormSalaryStatus("due");
      
      // Refresh list & switch to list tab
      await fetchStaff();
      await fetchLogs();
      setSubTab("list");
    } catch (err: any) {
      triggerToast(err.message, err.message);
    } finally {
      setSubmittingAdd(false);
    }
  };

  // Handle Edit Staff info submit with immediate Firestore synchronization
  const handleEditStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffForEdit) return;

    // Validate required fields
    const cleanFullName = (selectedStaffForEdit.fullName || "").trim();
    const cleanPhone = (selectedStaffForEdit.mobile || "").replace(/\s+/g, "");
    const cleanEmail = (selectedStaffForEdit.email || "").trim().toLowerCase();

    if (!cleanFullName || !cleanPhone || !cleanEmail) {
      triggerToast(
        "অনুগ্রহ করে পূর্ণ নাম, মোবাইল ও ইমেইল সঠিকভাবে পূরণ করুন!",
        "Please provide full name, mobile, and email!"
      );
      return;
    }

    if (cleanPhone.length < 10) {
      triggerToast(
        "সঠিক মোবাইল নম্বর প্রদান করুন!",
        "Please enter a valid mobile phone number!"
      );
      return;
    }

    // Determine assignedAgentDesk safely: if call_center_agent, use desk number; else use null
    const safeDesk = selectedStaffForEdit.role === "call_center_agent"
      ? (Number(selectedStaffForEdit.assignedAgentDesk) || 1)
      : null;

    try {
      const updatedStaff = await updateStaffInFirestore(selectedStaffForEdit.id, {
        fullName: cleanFullName,
        username: (selectedStaffForEdit.username || "").trim().toLowerCase(),
        mobile: cleanPhone,
        email: cleanEmail,
        photoURL: selectedStaffForEdit.photoURL || "",
        role: selectedStaffForEdit.role,
        designation: (selectedStaffForEdit.designation || "").trim(),
        department: (selectedStaffForEdit.department || "").trim(),
        joiningDate: selectedStaffForEdit.joiningDate || new Date().toISOString().split("T")[0],
        bloodGroup: selectedStaffForEdit.bloodGroup || "N/A",
        emergencyContact: (selectedStaffForEdit.emergencyContact || "").trim() || cleanPhone,
        status: selectedStaffForEdit.status || "active",
        monthlySalary: Number(selectedStaffForEdit.monthlySalary) || 0,
        salaryStatus: selectedStaffForEdit.salaryStatus || "due",
        assignedAgentDesk: safeDesk,
        updaterUser: currentUser,
        updaterName: currentUser?.fullName || currentUser?.displayName || "Super Admin",
        updaterRole: currentUser?.role || "super_admin"
      });

      triggerToast(
        "স্টাফ তথ্য সফলভাবে Firestore-এ আপডেট ও সিঙ্ক হয়েছে!",
        "Staff information updated and synchronized with Firestore!"
      );
      if (selectedStaffForIdCard && (
        selectedStaffForIdCard.id === selectedStaffForEdit.id || 
        selectedStaffForIdCard.staffId === selectedStaffForEdit.staffId
      )) {
        setSelectedStaffForIdCard(updatedStaff);
        try {
          sessionStorage.setItem("kacha_selected_staff_id_card", updatedStaff.staffId || updatedStaff.id);
        } catch {}
      }
      setSelectedStaffForEdit(null);
      await fetchStaff();
      await fetchLogs();
    } catch (err: any) {
      triggerToast(err.message, err.message);
    }
  };

  // Handle Pay Salary submit
  const handlePaySalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffForSalary) return;
    setSalaryLoading(true);
    try {
      const payAmount = Number(salaryAmount) || Number(selectedStaffForSalary.monthlySalary) || 0;
      await payStaffSalaryInFirestore({
        staffId: selectedStaffForSalary.id,
        month: salaryMonth,
        amount: payAmount,
        paymentMethod: salaryPaymentMethod,
        transactionRef: salaryTrxId || `TRX-${Date.now().toString().slice(-6)}`,
        note: salaryNote,
        adminUser: currentUser
      });
      triggerToast(
        `${selectedStaffForSalary.fullName}-এর ${salaryMonth} মাসের বেতন (৳${payAmount.toLocaleString()}) সফলভাবে পরিশোধ ও রেকর্ড করা হয়েছে!`,
        `Salary for ${selectedStaffForSalary.fullName} (${salaryMonth}) recorded successfully!`
      );
      setSelectedStaffForSalary(null);
      await fetchStaff();
      await fetchLogs();
    } catch (err: any) {
      triggerToast(err.message, err.message);
    } finally {
      setSalaryLoading(false);
    }
  };

  // Handle Update Salary Base submit
  const handleUpdateSalaryBase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffForSalary) return;
    setUpdatingBaseSalary(true);
    try {
      const numBase = Number(newBaseSalary) || 0;
      await updateStaffSalaryBaseInFirestore({
        staffId: selectedStaffForSalary.id,
        monthlySalary: numBase,
        adminUser: currentUser
      });
      triggerToast(
        `মাসিক মূল বেতন সফলভাবে ৳${numBase.toLocaleString()} নির্ধারণ করা হয়েছে!`,
        `Monthly base salary updated to ৳${numBase.toLocaleString()} successfully!`
      );
      await fetchStaff();
      await fetchLogs();
      setSelectedStaffForSalary(prev => prev ? { ...prev, monthlySalary: numBase } : null);
    } catch (err: any) {
      triggerToast(err.message, err.message);
    } finally {
      setUpdatingBaseSalary(false);
    }
  };

  // Handle Save Custom Permissions with immediate Firestore synchronization
  const handleSavePermissions = async () => {
    if (!selectedStaffForPerms) return;

    try {
      await updateStaffInFirestore(selectedStaffForPerms.id, {
        permissions: tempPermissions,
        updaterUser: currentUser,
        updaterName: currentUser?.fullName || currentUser?.displayName || "Super Admin",
        updaterRole: currentUser?.role || "super_admin"
      });

      triggerToast(
        "পারমিশন সফলভাবে Firestore-এ সংরক্ষিত হয়েছে!",
        "Permissions updated and synchronized with Firestore!"
      );
      setSelectedStaffForPerms(null);
      await fetchStaff();
      await fetchLogs();
    } catch (err: any) {
      triggerToast(err.message, err.message);
    }
  };

  // Handle Status Toggle (Active / Inactive) with immediate Firestore synchronization
  const handleToggleStatus = async (staff: StaffMember) => {
    if (staff.isSuperAdmin || staff.role === "super_admin") {
      triggerToast("সুপার এডমিন অ্যাকাউন্ট নিষ্ক্রিয় করা যাবে না!", "Super Admin account cannot be deactivated!");
      return;
    }

    const nextStatus: StaffStatus = staff.status === "active" ? "inactive" : "active";
    try {
      await updateStaffInFirestore(staff.id, {
        status: nextStatus,
        updaterUser: currentUser,
        updaterName: currentUser?.fullName || currentUser?.displayName || "Super Admin",
        updaterRole: currentUser?.role || "super_admin"
      });

      triggerToast(
        `স্টাফ স্ট্যাটাস: ${nextStatus === "active" ? "সক্রিয়" : "নিষ্ক্রিয়"} করা হয়েছে (Firestore Sync)!`,
        `Staff status updated to ${nextStatus} and synchronized with Firestore!`
      );
      await fetchStaff();
      await fetchLogs();
    } catch (err: any) {
      triggerToast(err.message, err.message);
    }
  };

  // Handle Reset Password Submit
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffForPassword || !newPassword) return;

    if (newPassword.length < 6) {
      triggerToast("পাসওয়ার্ড ন্যূনতম ৬ অক্ষরের হতে হবে!", "Password must be at least 6 characters!");
      return;
    }

    setPasswordResetLoading(true);
    try {
      const res = await fetch("/api/staff/reset-password", {
        method: "POST",
        headers: getStaffAuthHeaders(currentUser),
        body: JSON.stringify({
          id: selectedStaffForPassword.id,
          newPassword: newPassword,
          adminName: currentUser?.fullName || currentUser?.displayName || "Super Admin"
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Sync update timestamp in Firestore
      await updateStaffInFirestore(selectedStaffForPassword.id, {
        updaterUser: currentUser,
        updaterName: currentUser?.fullName || currentUser?.displayName || "Super Admin",
        updaterRole: currentUser?.role || "super_admin"
      }).catch(() => {});

      triggerToast("পাসওয়ার্ড সফলভাবে রিসেট ও সিঙ্ক করা হয়েছে!", "Password reset and synced successfully!");
      setSelectedStaffForPassword(null);
      setNewPassword("");
      await fetchStaff();
      await fetchLogs();
    } catch (err: any) {
      triggerToast(err.message, err.message);
    } finally {
      setPasswordResetLoading(false);
    }
  };

  // Handle Revoke / Force Logout Session
  const handleRevokeSession = async (staff: StaffMember) => {
    if (!confirm(getTranslation(
      `আপনি কি নিশ্চিত যে ${staff.fullName}-এর একটিভ লগইন সেশন টার্মিনেট করতে চান?`,
      `Are you sure you want to force logout and terminate active session for ${staff.fullName}?`
    ))) return;

    try {
      const res = await fetch("/api/staff/logout-session", {
        method: "POST",
        headers: getStaffAuthHeaders(currentUser),
        body: JSON.stringify({
          staffId: staff.staffId,
          adminName: currentUser?.fullName || currentUser?.displayName || "Super Admin"
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Update Firestore onlineStatus to offline immediately
      await updateStaffInFirestore(staff.id, {
        onlineStatus: "offline",
        updaterUser: currentUser,
        updaterName: currentUser?.fullName || currentUser?.displayName || "Super Admin",
        updaterRole: currentUser?.role || "super_admin"
      }).catch(() => {});

      triggerToast("সেশন ফোর্স লগআউট ও সিঙ্ক করা হয়েছে!", "Staff active session terminated and synced with Firestore!");
      await fetchStaff();
      await fetchLogs();
    } catch (err: any) {
      triggerToast(err.message, err.message);
    }
  };

  // Handle Delete Staff with immediate Firestore synchronization
  const handleDeleteStaffConfirm = async () => {
    if (!selectedStaffForDelete) return;

    try {
      await deleteStaffFromFirestore(selectedStaffForDelete.id, currentUser);

      triggerToast(
        "স্টাফ সদস্য সফলভাবে Firestore থেকে মুছে ফেলা হয়েছে!",
        "Staff member deleted and synchronized from Firestore successfully!"
      );
      setSelectedStaffForDelete(null);
      await fetchStaff();
      await fetchLogs();
    } catch (err: any) {
      triggerToast(err.message, err.message);
    }
  };

  // Export Activity Logs to CSV
  const handleExportLogsCSV = () => {
    if (activityLogs.length === 0) {
      triggerToast("কোনো লগ রেকর্ড পাওয়া যায়নি!", "No log records found to export!");
      return;
    }

    const headers = ["ID", "Timestamp", "Staff Name", "Staff ID", "Role", "Module", "Action", "Details", "IP Address"];
    const rows = activityLogs.map(log => [
      log.id,
      new Date(log.createdAt).toLocaleString(),
      `"${(log.staffName || '').replace(/"/g, '""')}"`,
      log.staffId || '',
      log.staffRole || '',
      log.module || '',
      log.action || '',
      `"${(log.details || '').replace(/"/g, '""')}"`,
      log.ipAddress || ''
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `staff_activity_logs_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast("অ্যাক্টিভিটি লগ CSV এক্সপোর্ট সম্পন্ন হয়েছে!", "Activity logs exported to CSV successfully!");
  };

  // Filtered Staff
  const filteredStaff = staffList.filter(s => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      s.fullName.toLowerCase().includes(q) ||
      s.staffId.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.mobile.includes(q);

    const matchesRole = filterRole === "all" || s.role === filterRole;
    const matchesStatus = filterStatus === "all" || s.status === filterStatus;
    const matchesOnline = filterOnline === "all" || (s.onlineStatus || "offline") === filterOnline;

    return matchesSearch && matchesRole && matchesStatus && matchesOnline;
  });

  // Filtered Activity Logs
  const filteredLogs = activityLogs.filter(l => {
    const q = logSearchQuery.toLowerCase();
    const matchesQuery = 
      (l.staffName && l.staffName.toLowerCase().includes(q)) ||
      (l.details && l.details.toLowerCase().includes(q)) ||
      (l.action && l.action.toLowerCase().includes(q)) ||
      (l.staffId && l.staffId.toLowerCase().includes(q));

    const matchesModule = logModuleFilter === "all" || l.module === logModuleFilter;
    return matchesQuery && matchesModule;
  });

  // Helper for role details
  const getRoleDef = (roleId: StaffRole) => {
    return DEFAULT_ROLES.find(r => r.id === roleId) || DEFAULT_ROLES[DEFAULT_ROLES.length - 1];
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-950 to-emerald-950 rounded-3xl p-6 sm:p-7 text-white shadow-lg border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span className="uppercase tracking-wider">Enterprise RBAC & Security</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              {getTranslation("স্টাফ ম্যানেজমেন্ট ও রোল এক্সেস কন্ট্রোল", "Staff Management & Role-Based Access Control")}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              {getTranslation(
                "সুপার এডমিন প্যানেল থেকে সকল টিম মেম্বারদের রোল, গ্র্যানুলার পারমিশন, পাসওয়ার্ড ও রিয়েল-টাইম এক্টিভিটি ট্র্যাক করুন।",
                "Create team members, configure granular permissions, manage hashed credentials, and monitor audit trails."
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSubTab("add")}
              className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-2xl text-xs font-black shadow-md shadow-emerald-950 transition cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>{getTranslation("নতুন স্টাফ যুক্ত করুন", "Add New Staff")}</span>
            </button>
            <button
              onClick={() => { fetchStaff(); fetchLogs(); triggerToast("ডাটা রিফ্রেশ করা হয়েছে!", "Data refreshed!"); }}
              className="p-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-2xl transition cursor-pointer border border-slate-700"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800/80">
          <div className="bg-slate-850/60 rounded-2xl p-3 border border-slate-750">
            <p className="text-[11px] text-slate-400 font-bold">{getTranslation("মোট স্টাফ", "Total Staff")}</p>
            <p className="text-lg sm:text-xl font-black text-white mt-0.5">{staffList.length}</p>
          </div>
          <div className="bg-slate-850/60 rounded-2xl p-3 border border-slate-750">
            <p className="text-[11px] text-emerald-400 font-bold">{getTranslation("সক্রিয় স্টাফ", "Active Staff")}</p>
            <p className="text-lg sm:text-xl font-black text-emerald-400 mt-0.5">
              {staffList.filter(s => s.status === "active").length}
            </p>
          </div>
          <div className="bg-slate-850/60 rounded-2xl p-3 border border-slate-750">
            <p className="text-[11px] text-teal-400 font-bold">{getTranslation("অনলাইনে এখন", "Currently Online")}</p>
            <p className="text-lg sm:text-xl font-black text-teal-300 mt-0.5 flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-ping inline-block" />
              <span>{staffList.filter(s => s.onlineStatus === "online").length}</span>
            </p>
          </div>
          <div className="bg-slate-850/60 rounded-2xl p-3 border border-slate-750">
            <p className="text-[11px] text-amber-400 font-bold">{getTranslation("মোট অ্যাক্টিভিটি লগ", "Total Activity Logs")}</p>
            <p className="text-lg sm:text-xl font-black text-amber-300 mt-0.5">{activityLogs.length}</p>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        {[
          { id: "list", labelBn: "স্টাফ তালিকা", labelEn: "Staff List", icon: <Users className="w-4 h-4" />, count: staffList.length },
          { id: "add", labelBn: "নতুন স্টাফ যুক্ত করুন", labelEn: "Add New Staff", icon: <UserPlus className="w-4 h-4" /> },
          { id: "roles", labelBn: "রোল ও পারমিশন ম্যাট্রিক্স", labelEn: "Roles & Permissions", icon: <Shield className="w-4 h-4" />, count: DEFAULT_ROLES.length },
          { id: "logs", labelBn: "স্টাফ অ্যাক্টিভিটি লগ", labelEn: "Staff Activity Log", icon: <History className="w-4 h-4" />, count: activityLogs.length }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id as any)}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-black transition cursor-pointer ${
              subTab === tab.id
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/20"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            {tab.icon}
            <span>{getTranslation(tab.labelBn, tab.labelEn)}</span>
            {tab.count !== undefined && (
              <span className={`px-1.5 py-0.5 rounded-lg text-[10px] font-bold ${
                subTab === tab.id ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-700"
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* 1. SUB-TAB: STAFF LIST */}
      {/* ========================================================================= */}
      {subTab === "list" && (
        <div className="space-y-4">
          
          {/* Filter & Search Bar */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={getTranslation("নাম, স্টাফ আইডি, ইমেইল বা ফোন নম্বর দিয়ে খুঁজুন...", "Search by Name, Staff ID, Email, Phone...")}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Role Filter */}
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 text-xs text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">{getTranslation("সকল রোল", "All Roles")}</option>
                {DEFAULT_ROLES.map(r => (
                  <option key={r.id} value={r.id}>{getTranslation(r.nameBn, r.nameEn)}</option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 text-xs text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">{getTranslation("সকল স্ট্যাটাস", "All Status")}</option>
                <option value="active">{getTranslation("সক্রিয় (Active)", "Active")}</option>
                <option value="inactive">{getTranslation("নিষ্ক্রিয় (Inactive)", "Inactive")}</option>
              </select>

              {/* Online Presence Filter */}
              <select
                value={filterOnline}
                onChange={(e) => setFilterOnline(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 text-xs text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">{getTranslation("সকল উপস্থিতি", "All Presence")}</option>
                <option value="online">🟢 {getTranslation("অনলাইন", "Online")}</option>
                <option value="away">🟡 {getTranslation("অ্যাওয়ে / ব্যস্ত", "Away")}</option>
                <option value="offline">🔴 {getTranslation("অফলাইন", "Offline")}</option>
              </select>
            </div>
          </div>

          {/* Staff Grid/List Cards */}
          {loadingStaff ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
              <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
              <p className="text-xs text-slate-500 mt-3 font-bold">{getTranslation("স্টাফ তালিকা লোড হচ্ছে...", "Loading staff list...")}</p>
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
              <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Users className="w-7 h-7" />
              </div>
              <h4 className="font-black text-slate-700 text-sm">{getTranslation("কোনো স্টাফ পাওয়া যায়নি", "No Staff Members Found")}</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {getTranslation("অনুসন্ধানের সাথে কোনো রেকর্ড মেলেনি অথবা নতুন স্টাফ যুক্ত করা হয়নি।", "No records matched your search filters.")}
              </p>
              <button
                onClick={() => setSubTab("add")}
                className="inline-flex items-center space-x-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{getTranslation("নতুন স্টাফ তৈরি করুন", "Create New Staff")}</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 items-stretch">
              {filteredStaff.map((staff) => {
                const roleDef = getRoleDef(staff.role);
                const isSuper = staff.isSuperAdmin || staff.role === "super_admin";
                const isOnline = staff.onlineStatus === "online";
                const isAway = staff.onlineStatus === "away";

                return (
                  <div
                    key={staff.id}
                    className={`bg-white rounded-3xl p-5 border transition shadow-sm hover:shadow-md flex flex-col justify-between relative overflow-hidden h-full w-full min-w-0 ${
                      staff.status === "inactive" ? "border-red-200 bg-red-50/20 opacity-80" : "border-slate-200"
                    }`}
                  >
                    {/* Top Section */}
                    <div>
                      <div className="flex items-start justify-between gap-3 min-h-[52px]">
                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                          {/* Avatar with status indicator dot */}
                          <div className="relative shrink-0">
                            <img
                              src={staff.photoURL || PRESET_AVATARS[0]}
                              alt={staff.fullName}
                              className="w-12 h-12 rounded-2xl object-cover border-2 border-white shadow"
                            />
                            <span 
                              className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white shadow-sm flex items-center justify-center ${
                                isOnline ? "bg-emerald-500" : isAway ? "bg-amber-400" : "bg-slate-400"
                              }`}
                              title={isOnline ? "Online" : isAway ? "Away" : "Offline"}
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <h4 className="font-black text-slate-800 text-sm truncate flex items-center gap-1.5" title={staff.fullName}>
                              <span className="truncate">{staff.fullName}</span>
                              {isSuper && <span title="Super Admin" className="shrink-0">👑</span>}
                            </h4>
                            <p className="text-[11px] font-mono font-bold text-slate-600 truncate">
                              {formatStaffUsername(staff.username || staff.staffId)}
                            </p>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md shrink-0">
                                {staff.staffId}
                              </span>
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-md shrink-0 ${
                                staff.status === "active" 
                                  ? "bg-emerald-100 text-emerald-800" 
                                  : "bg-red-100 text-red-800"
                              }`}>
                                {staff.status === "active" ? getTranslation("সক্রিয়", "Active") : getTranslation("নিষ্ক্রিয়", "Inactive")}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Role Badge */}
                        <div className={`px-2.5 py-1 rounded-xl text-[10px] font-black shrink-0 whitespace-nowrap ${roleDef.badgeColor}`}>
                          <span>{roleDef.icon} {getTranslation(roleDef.nameBn, roleDef.nameEn)}</span>
                        </div>
                      </div>

                      {/* Salary Summary Badge */}
                      <div className="mt-3 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs h-10">
                        <div className="flex items-center space-x-1.5">
                          <Wallet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="text-[11px] text-slate-500 font-bold">{getTranslation("মূল বেতন:", "Salary:")}</span>
                          <span className="font-black text-slate-800">৳{(staff.monthlySalary || 0).toLocaleString()}</span>
                        </div>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md shrink-0 ${
                          staff.salaryStatus === "paid"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : "bg-amber-100 text-amber-800 border border-amber-200"
                        }`}>
                          {staff.salaryStatus === "paid" ? getTranslation("পরিশোধিত", "Paid") : getTranslation("বকেয়া", "Due")}
                        </span>
                      </div>

                      {/* Contact Info Details - Fixed uniform 4-row layout */}
                      <div className="mt-3.5 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600 min-h-[96px] flex flex-col justify-between">
                        <div className="flex items-center space-x-2 truncate">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-medium truncate">{staff.mobile}</span>
                        </div>
                        <div className="flex items-center space-x-2 truncate">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-medium truncate">{staff.email}</span>
                        </div>
                        {staff.assignedAgentDesk ? (
                          <div className="flex items-center space-x-2 text-teal-700 font-bold truncate">
                            <PhoneCall className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{getTranslation(`কল সেন্টার ডেস্ক: ${staff.assignedAgentDesk}`, `Call Center Desk #${staff.assignedAgentDesk}`)}</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2 text-slate-500 font-medium truncate">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{staff.department ? getTranslation(`বিভাগ: ${staff.department}`, `Dept: ${staff.department}`) : getTranslation(`পদবী: ${staff.designation || 'স্টাফ'}`, `Designation: ${staff.designation || 'Staff'}`)}</span>
                          </div>
                        )}
                        <div className="flex items-center space-x-2 text-[11px] text-slate-400 truncate">
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">
                            {getTranslation("সর্বশেষ সক্রিয়: ", "Last active: ")}
                            {staff.lastActiveAt ? new Date(staff.lastActiveAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "N/A"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons Toolbar - Uniform 2-tier fixed layout */}
                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                      {/* Tier 1: Primary Action Badges (Equal 3-column grid) */}
                      <div className="grid grid-cols-3 gap-2">
                        {/* ID Card Action Button */}
                        <button
                          onClick={() => handleOpenIdCard(staff)}
                          className="flex items-center justify-center space-x-1 py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-black transition shadow-2xs cursor-pointer"
                          title={getTranslation("স্টাফ আইডি কার্ড প্রিভিউ ও প্রিন্ট করুন", "Preview & Print Staff ID Card")}
                        >
                          <CreditCard className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                          <span className="truncate">{getTranslation("আইডি কার্ড", "ID Card")}</span>
                        </button>

                        {/* Salary Management Button */}
                        <button
                          onClick={() => {
                            setSelectedStaffForSalary(staff);
                            setSalaryAmount(staff.monthlySalary || 0);
                            setNewBaseSalary(staff.monthlySalary || 0);
                          }}
                          className="flex items-center justify-center space-x-1 py-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-black transition shadow-2xs cursor-pointer"
                          title={getTranslation("বেতন পরিশোধ ও ম্যানেজমেন্ট", "Manage & Pay Salary")}
                        >
                          <Wallet className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                          <span className="truncate">{getTranslation("বেতন", "Salary")}</span>
                        </button>

                        {/* Active / Inactive Toggle Switch */}
                        <button
                          onClick={() => handleToggleStatus(staff)}
                          disabled={isSuper}
                          className={`py-1.5 px-2 rounded-xl text-xs font-black transition cursor-pointer text-center truncate ${
                            isSuper 
                              ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200" 
                              : staff.status === "active"
                                ? "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                          }`}
                        >
                          {staff.status === "active" ? getTranslation("নিষ্ক্রিয়", "Deactivate") : getTranslation("সক্রিয়", "Activate")}
                        </button>
                      </div>

                      {/* Tier 2: Secondary Management Icons (Evenly spaced row) */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-slate-500">
                        {/* View Details */}
                        <button
                          onClick={() => setSelectedStaffForView(staff)}
                          className="p-1.5 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                          title={getTranslation("বিস্তারিত দেখুন", "View Details")}
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Edit Basic Info */}
                        <button
                          onClick={() => setSelectedStaffForEdit(staff)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                          title={getTranslation("তথ্য এডিট করুন", "Edit Staff")}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {/* Customize Role & Permissions */}
                        <button
                          onClick={() => {
                            setSelectedStaffForPerms(staff);
                            setTempPermissions({ ...(staff.permissions || roleDef.defaultPermissions) });
                          }}
                          className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition cursor-pointer"
                          title={getTranslation("রোল ও পারমিশন কাস্টমাইজ করুন", "Customize Permissions")}
                        >
                          <Shield className="w-4 h-4" />
                        </button>

                        {/* Reset Password */}
                        <button
                          onClick={() => {
                            setSelectedStaffForPassword(staff);
                            setNewPassword("");
                          }}
                          className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                          title={getTranslation("পাসওয়ার্ড রিসেট করুন", "Reset Password")}
                        >
                          <Key className="w-4 h-4" />
                        </button>

                        {/* Force Logout / Terminate Session */}
                        <button
                          onClick={() => handleRevokeSession(staff)}
                          className="p-1.5 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                          title={getTranslation("সেশন টার্মিনেট করুন (Logout Session)", "Terminate Active Session")}
                        >
                          <LogOut className="w-4 h-4" />
                        </button>

                        {/* Delete Staff Button (Disabled for Super Admin) */}
                        <button
                          onClick={() => setSelectedStaffForDelete(staff)}
                          disabled={isSuper}
                          className={`p-1.5 rounded-lg transition cursor-pointer ${
                            isSuper 
                              ? "text-slate-300 cursor-not-allowed opacity-40" 
                              : "text-red-600 hover:bg-red-50"
                          }`}
                          title={isSuper ? getTranslation("সুপার এডমিন ডিলিট করা নিষিদ্ধ", "Super Admin cannot be deleted") : getTranslation("স্টাফ ডিলিট করুন", "Delete Staff")}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. SUB-TAB: ADD NEW STAFF */}
      {/* ========================================================================= */}
      {subTab === "add" && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm max-w-4xl mx-auto">
          <div className="border-b border-slate-100 pb-4 mb-6">
            <h3 className="text-lg font-black text-slate-800 flex items-center space-x-2">
              <UserPlus className="w-5 h-5 text-emerald-600" />
              <span>{getTranslation("নতুন স্টাফ অ্যাকাউন্ট তৈরি করুন", "Create New Staff Account")}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {getTranslation(
                "সঠিক তথ্য প্রদান করুন। পাসওয়ার্ডটি সার্ভারে এনক্রিপ্ট ও হ্যাশ করে সংরক্ষিত হবে।",
                "Fill in staff credentials. Password will be securely hashed on server with PBKDF2."
              )}
            </p>
          </div>

          <form onSubmit={handleAddStaffSubmit} className="space-y-6">
            
            {/* Avatar Selector */}
            <div>
              <label className="block text-xs font-black text-slate-700 mb-2">
                {getTranslation("প্রোফাইল ছবি / অবতার নির্বাচন করুন", "Select Profile Avatar / Photo")}
              </label>
              <div className="flex flex-wrap items-center gap-3">
                {PRESET_AVATARS.map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setFormPhotoURL(url)}
                    className={`relative rounded-2xl overflow-hidden border-2 transition p-0.5 cursor-pointer ${
                      formPhotoURL === url ? "border-emerald-600 scale-105 shadow-md shadow-emerald-900/20" : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={url} alt="Avatar" className="w-12 h-12 rounded-xl object-cover" />
                    {formPhotoURL === url && (
                      <span className="absolute top-1 right-1 bg-emerald-600 text-white rounded-full p-0.5">
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Basic Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Full Name */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">
                  {getTranslation("পূর্ণ নাম *", "Full Name *")}
                </label>
                <input
                  type="text"
                  required
                  value={formFullName}
                  onChange={(e) => setFormFullName(e.target.value)}
                  placeholder="e.g. Md. Tariqul Islam"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              {/* Username / Login ID */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>{getTranslation("ইউজারনেম / লগইন আইডি *", "Username / Login ID *")}</span>
                  <span className="text-[10px] text-slate-400 font-normal">লগইনে ব্যবহার হবে</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formUsername}
                    onChange={(e) => setFormUsername(formatStaffUsername(e.target.value))}
                    placeholder={formatStaffUsername(formStaffId || generateNextStaffId(staffList))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-medium"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  {getTranslation("ফাঁকা রাখলে স্টাফ আইডি অনুযায়ী স্বয়ংক্রিয়ভাবে তৈরি হবে (যেমন: cfikb002)।", "Leave blank to auto-generate from Staff ID (e.g. cfikb002).")}
                </p>
              </div>

              {/* Sequential Staff ID (Auto Generated & Immutable) */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>{getTranslation("স্টাফ আইডি (স্বয়ংক্রিয় ইউনিক)", "Staff ID (Auto-Sequential)")}</span>
                  <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    {getTranslation("স্থায়ী ও অপরিবর্তনীয়", "Permanent")}
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formStaffId || generateNextStaffId(staffList)}
                    onChange={(e) => setFormStaffId(e.target.value)}
                    placeholder={generateNextStaffId(staffList)}
                    className="w-full px-4 py-2.5 bg-emerald-50/50 border border-emerald-200 rounded-2xl text-xs font-black text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-emerald-600 bg-white px-2 py-0.5 rounded border border-emerald-200">
                    CFI-KB-XXX
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  {getTranslation("ফাঁকা রাখলে পরবর্তী ক্রমানুযায়ী আইডি যেমন CFI-KB-001 স্বয়ংক্রিয়ভাবে তৈরি হবে।", "Leaves blank to auto-generate the next sequential ID (e.g. CFI-KB-001).")}
                </p>
              </div>

              {/* Designation / পদবী */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">
                  {getTranslation("পদবী (Designation) *", "Designation *")}
                </label>
                <input
                  type="text"
                  value={formDesignation}
                  onChange={(e) => setFormDesignation(e.target.value)}
                  placeholder={getTranslation("যেমন: Senior Executive, Delivery Lead, Order Manager", "e.g. Senior Executive, Delivery Lead")}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              {/* Department / বিভাগ */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">
                  {getTranslation("বিভাগ (Department)", "Department")}
                </label>
                <select
                  value={formDepartment}
                  onChange={(e) => setFormDepartment(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept.id} value={dept.nameEn}>
                      {getTranslation(dept.nameBn, dept.nameEn)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Joining Date & Blood Group */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">
                  {getTranslation("যোগদানের তারিখ (Joining Date)", "Joining Date")}
                </label>
                <input
                  type="date"
                  value={formJoiningDate}
                  onChange={(e) => setFormJoiningDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">
                  {getTranslation("রক্তের গ্রুপ (Blood Group)", "Blood Group")}
                </label>
                <select
                  value={formBloodGroup}
                  onChange={(e) => setFormBloodGroup(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {BLOOD_GROUPS.map((bg) => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>

              {/* Mobile Number */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">
                  {getTranslation("মোবাইল নম্বর *", "Mobile Number *")}
                </label>
                <input
                  type="tel"
                  required
                  value={formMobile}
                  onChange={(e) => setFormMobile(e.target.value)}
                  placeholder="017XXXXXXXX"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              {/* Emergency Contact */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">
                  {getTranslation("জরুরী যোগাযোগের নম্বর", "Emergency Contact")}
                </label>
                <input
                  type="tel"
                  value={formEmergencyContact}
                  onChange={(e) => setFormEmergencyContact(e.target.value)}
                  placeholder="018XXXXXXXX"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">
                  {getTranslation("ইমেইল অ্যাড্রেস *", "Email Address *")}
                </label>
                <input
                  type="email"
                  required
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="staff@kachabazar.com"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">
                  {getTranslation("লগইন পাসওয়ার্ড * (ন্যূনতম ৬ অক্ষর)", "Login Password * (Min 6 chars)")}
                </label>
                <div className="relative">
                  <input
                    type={showFormPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowFormPassword(!showFormPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showFormPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Monthly Salary */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">
                  {getTranslation("মাসিক মূল বেতন (৳ Monthly Base Salary)", "Monthly Base Salary (৳)")}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-black">৳</span>
                  <input
                    type="number"
                    min={0}
                    value={formMonthlySalary}
                    onChange={(e) => setFormMonthlySalary(Number(e.target.value) || 0)}
                    placeholder="20000"
                    className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-emerald-900 font-black focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Initial Status */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">
                  {getTranslation("অ্যাকাউন্ট স্ট্যাটাস", "Account Status")}
                </label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as any)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="active">{getTranslation("সক্রিয় (Active)", "Active")}</option>
                  <option value="inactive">{getTranslation("নিষ্ক্রিয় (Inactive)", "Inactive")}</option>
                </select>
              </div>

              {/* Role Selection */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-black text-slate-700 mb-1.5">
                  {getTranslation("স্টাফ রোল নির্বাচন করুন *", "Select Staff Role *")}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                  {DEFAULT_ROLES.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setFormRole(r.id)}
                      className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                        formRole === r.id
                          ? "border-emerald-600 bg-emerald-50/50 shadow-sm"
                          : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-base">{r.icon}</span>
                        {formRole === r.id && <Check className="w-4 h-4 text-emerald-600" />}
                      </div>
                      <div className="mt-2">
                        <p className="font-black text-xs text-slate-800">{getTranslation(r.nameBn, r.nameEn)}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{getTranslation(r.descriptionBn, r.descriptionEn)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Call Center Desk (if role is call_center_agent) */}
              {formRole === "call_center_agent" && (
                <div className="sm:col-span-2 bg-teal-50 border border-teal-200 rounded-2xl p-4">
                  <label className="block text-xs font-black text-teal-900 mb-1">
                    {getTranslation("নির্ধারিত কল সেন্টার ডেস্ক নম্বর (১ থেকে ২০)", "Assigned Call Center Desk Number (1 to 20)")}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={formDesk}
                    onChange={(e) => setFormDesk(parseInt(e.target.value) || 1)}
                    className="w-32 px-4 py-2 bg-white border border-teal-300 rounded-xl text-xs font-black text-teal-950 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <p className="text-[11px] text-teal-700 mt-1">
                    {getTranslation("এই এজেন্ট লগইন করলে স্বয়ংক্রিয়ভাবে উক্ত ডেস্কে সংযুক্ত হবেন।", "Agent will automatically route to this desk on login.")}
                  </p>
                </div>
              )}
            </div>

            {/* Granular Permission Checklist for this Role */}
            <div className="border-t border-slate-100 pt-5">
              <h4 className="font-black text-xs text-slate-800 mb-3 flex items-center space-x-1.5">
                <Shield className="w-4 h-4 text-emerald-600" />
                <span>{getTranslation("এই স্টাফের অনুমোদিত পারমিশন তালিকা", "Configured Permissions Matrix")}</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {PERMISSION_MODULES.map((m) => {
                  const hasView = !!formPermissions[`${m.id}.view`];
                  return (
                    <div key={m.id} className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-xs text-slate-800">{getTranslation(m.nameBn, m.nameEn)}</span>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-200/60">
                        {m.supportedActions.map((action) => {
                          const key = `${m.id}.${action}`;
                          const isChecked = !!formPermissions[key];
                          return (
                            <label key={action} className="flex items-center space-x-1.5 text-[11px] text-slate-700 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  setFormPermissions(prev => ({ ...prev, [key]: e.target.checked }));
                                }}
                                className="rounded text-emerald-600 focus:ring-emerald-500"
                              />
                              <span className="capitalize">{action}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSubTab("list")}
                className="px-5 py-2.5 rounded-2xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                {getTranslation("বাতিল", "Cancel")}
              </button>
              <button
                type="submit"
                disabled={submittingAdd}
                className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-2xl text-xs font-black shadow-md shadow-emerald-950 transition cursor-pointer disabled:opacity-50"
              >
                {submittingAdd ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{getTranslation("তৈরি হচ্ছে...", "Creating...")}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{getTranslation("স্টাফ অ্যাকাউন্ট নিশ্চিত করুন", "Confirm & Create Staff")}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. SUB-TAB: ROLES & PERMISSIONS MATRIX */}
      {/* ========================================================================= */}
      {subTab === "roles" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <h3 className="font-black text-slate-800 text-sm mb-1">
              {getTranslation("সিস্টেম রোল ও পারমিশন ওভারভিউ", "System Roles & Permissions Matrix")}
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              {getTranslation(
                "প্রত্যেকটি প্রি-ডিফাইনড রোলের জন্য অনুমোদিত মডিউলসমূহ নিচে দেওয়া হলো।",
                "Comprehensive overview of granular capabilities mapped to each system role."
              )}
            </p>

            {/* Role Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
              {DEFAULT_ROLES.map((r) => (
                <div key={r.id} className="bg-slate-50 rounded-3xl p-5 border border-slate-200 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">{r.icon}</span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${r.badgeColor}`}>
                        {r.id}
                      </span>
                    </div>
                    <h4 className="font-black text-slate-800 text-sm mt-3">{getTranslation(r.nameBn, r.nameEn)}</h4>
                    <p className="text-xs text-slate-500 mt-1">{getTranslation(r.descriptionBn, r.descriptionEn)}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200/80 text-[11px] font-bold text-slate-600 flex items-center justify-between">
                    <span>{getTranslation("অনুমোদিত পারমিশন সংখ্যা:", "Active Permissions:")}</span>
                    <span className="text-emerald-600 font-black">
                      {Object.values(r.defaultPermissions).filter(Boolean).length}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Side-by-Side Comparison Matrix Table */}
            <h4 className="font-black text-xs text-slate-800 uppercase tracking-wider mb-3">
              {getTranslation("বিস্তারিত মডিউল বনাম রোল ম্যাট্রিক্স", "Detailed Module vs Role Capability Grid")}
            </h4>
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse min-w-[720px]">
                <thead>
                  <tr className="bg-slate-900 text-white font-black text-[11px]">
                    <th className="p-3.5 sticky left-0 bg-slate-900 z-10">{getTranslation("মডিউল নাম", "Module Name")}</th>
                    {DEFAULT_ROLES.slice(0, 7).map(r => (
                      <th key={r.id} className="p-3.5 text-center whitespace-nowrap">
                        <span>{r.icon} {getTranslation(r.nameBn, r.nameEn)}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {PERMISSION_MODULES.map((m, idx) => (
                    <tr key={m.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                      <td className="p-3.5 font-bold text-slate-800 sticky left-0 bg-inherit z-10">
                        <div>
                          <p className="font-black">{getTranslation(m.nameBn, m.nameEn)}</p>
                          <p className="text-[10px] text-slate-400 font-normal">{m.id}</p>
                        </div>
                      </td>
                      {DEFAULT_ROLES.slice(0, 7).map(r => {
                        const hasView = r.defaultPermissions[`${m.id}.view`] || r.id === "super_admin";
                        const hasEdit = r.defaultPermissions[`${m.id}.edit`] || r.id === "super_admin";
                        return (
                          <td key={r.id} className="p-3.5 text-center">
                            {hasView ? (
                              <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg text-[10px] font-black ${
                                hasEdit ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"
                              }`}>
                                <Check className="w-3 h-3" />
                                <span>{hasEdit ? "Full" : "View"}</span>
                              </span>
                            ) : (
                              <span className="text-slate-300 font-bold">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. SUB-TAB: STAFF ACTIVITY LOG (AUDIT TRAIL) */}
      {/* ========================================================================= */}
      {subTab === "logs" && (
        <div className="space-y-4">
          
          {/* Filter Bar */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={logSearchQuery}
                onChange={(e) => setLogSearchQuery(e.target.value)}
                placeholder={getTranslation("স্টাফের নাম, অ্যাকশন বা বিবরণ দিয়ে ফিল্টার করুন...", "Search by Staff Name, Action, or Details...")}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Module Filter */}
              <select
                value={logModuleFilter}
                onChange={(e) => setLogModuleFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 text-xs text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">{getTranslation("সকল মডিউল", "All Modules")}</option>
                <option value="orders">Orders</option>
                <option value="products">Products</option>
                <option value="staff_management">Staff Management</option>
                <option value="auth">Authentication</option>
                <option value="settings">Settings</option>
              </select>

              {/* Export CSV Button */}
              <button
                onClick={handleExportLogsCSV}
                className="flex items-center space-x-1.5 bg-slate-850 hover:bg-slate-800 text-white px-3.5 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{getTranslation("CSV এক্সপোর্ট", "Export CSV")}</span>
              </button>

              <button
                onClick={fetchLogs}
                className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl transition cursor-pointer"
                title="Refresh Logs"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Activity Logs Timeline / Table */}
          {loadingLogs ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
              <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
              <p className="text-xs text-slate-500 mt-3 font-bold">{getTranslation("লগ ডাটা লোড হচ্ছে...", "Loading activity logs...")}</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
              <History className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500 mt-3 font-bold">{getTranslation("কোনো অ্যাক্টিভিটি লগ পাওয়া যায়নি", "No activity logs found")}</p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-black">
                      <th className="p-4">{getTranslation("তারিখ / সময়", "Timestamp")}</th>
                      <th className="p-4">{getTranslation("স্টাফ মেম্বার", "Staff Member")}</th>
                      <th className="p-4">{getTranslation("রোল", "Role")}</th>
                      <th className="p-4">{getTranslation("মডিউল", "Module")}</th>
                      <th className="p-4">{getTranslation("অ্যাকশন", "Action")}</th>
                      <th className="p-4">{getTranslation("বিবরণ", "Activity Details")}</th>
                      <th className="p-4 text-right">{getTranslation("আইপি অ্যাড্রেস", "IP Address")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/70 transition">
                        <td className="p-4 whitespace-nowrap text-slate-500 font-bold text-[11px]">
                          {new Date(log.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          <div className="font-black text-slate-800">{log.staffName || "System Admin"}</div>
                          <div className="text-[10px] text-slate-400">{log.staffId}</div>
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-100 text-slate-700">
                            {log.staffRole}
                          </span>
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {log.module}
                          </span>
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          <span className="font-bold text-slate-800 text-[11px]">{log.action}</span>
                        </td>
                        <td className="p-4 min-w-[280px]">
                          <p className="text-xs text-slate-700 leading-relaxed font-medium">{log.details}</p>
                          {log.targetId && (
                            <span className="inline-block text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded mt-1">
                              Ref: {log.targetId}
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right whitespace-nowrap text-[11px] font-mono text-slate-400">
                          {log.ipAddress || "127.0.0.1"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: COMPLETE STAFF PROFILE MODAL */}
      {/* ========================================================================= */}
      {selectedStaffForView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="max-h-[85vh] sm:max-h-[90vh] flex flex-col w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 animate-scale-up">
            {/* Modal Header */}
            <div className="flex-shrink-0 p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-sm">
                    {getTranslation("স্টাফ পূর্ণাঙ্গ প্রোফাইল (Staff Profile)", "Complete Staff Profile")}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    {selectedStaffForView.staffId} • {formatStaffUsername(selectedStaffForView.username || selectedStaffForView.staffId)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStaffForView(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="overflow-y-auto flex-1 p-6 space-y-4 divide-y divide-slate-100 text-xs text-slate-700">
              
              {/* Profile Card Summary Banner */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 pb-2">
                <div className="relative shrink-0">
                  <img
                    src={selectedStaffForView.photoURL || PRESET_AVATARS[0]}
                    alt={selectedStaffForView.fullName}
                    className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md ring-2 ring-emerald-500/30"
                  />
                  <span
                    className={`absolute bottom-0 right-0 w-5 h-5 rounded-full border-2 border-white shadow-sm flex items-center justify-center ${
                      selectedStaffForView.onlineStatus === "online"
                        ? "bg-emerald-500"
                        : selectedStaffForView.onlineStatus === "away"
                        ? "bg-amber-400"
                        : "bg-slate-400"
                    }`}
                    title={selectedStaffForView.onlineStatus}
                  />
                </div>

                <div className="flex-1 text-center sm:text-left min-w-0">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <h4 className="font-black text-slate-900 text-lg">{selectedStaffForView.fullName}</h4>
                    {selectedStaffForView.isSuperAdmin && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md text-[10px] font-black border border-amber-200">
                        👑 Super Admin
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-mono text-emerald-700 font-bold mt-0.5">
                    {formatStaffUsername(selectedStaffForView.username || selectedStaffForView.staffId)}
                  </p>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    {selectedStaffForView.designation || "Staff Member"} • {selectedStaffForView.department || "Kacha Bazar Ltd."}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <span className={`px-2.5 py-1 rounded-xl text-[11px] font-black ${getRoleDef(selectedStaffForView.role).badgeColor}`}>
                      {getRoleDef(selectedStaffForView.role).icon} {getTranslation(getRoleDef(selectedStaffForView.role).nameBn, getRoleDef(selectedStaffForView.role).nameEn)}
                    </span>
                    <span className={`px-2.5 py-1 rounded-xl text-[11px] font-black ${
                      selectedStaffForView.status === "active"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : "bg-red-100 text-red-800 border border-red-200"
                    }`}>
                      {selectedStaffForView.status === "active" ? getTranslation("সক্রিয় (Active)", "Active") : getTranslation("নিষ্ক্রিয় (Inactive)", "Inactive")}
                    </span>
                    <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-100 text-slate-700">
                      {selectedStaffForView.onlineStatus === "online" ? "🟢 Online" : selectedStaffForView.onlineStatus === "away" ? "🟡 Away" : "🔴 Offline"}
                    </span>
                  </div>
                </div>
              </div>

              {/* 1. PERSONAL / BASIC INFORMATION */}
              <div className="pt-4 space-y-3">
                <h5 className="font-black text-slate-800 text-xs uppercase tracking-wider flex items-center space-x-1.5 text-emerald-800">
                  <UserCheck className="w-4 h-4" />
                  <span>{getTranslation("১. ব্যক্তিগত ও সাধারণ তথ্য (Personal Info)", "1. Personal / Basic Information")}</span>
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold">{getTranslation("পূর্ণ নাম", "Full Name")}</span>
                    <span className="font-bold text-slate-800">{selectedStaffForView.fullName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold">{getTranslation("মোবাইল নম্বর", "Mobile Phone")}</span>
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {selectedStaffForView.mobile}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold">{getTranslation("ইমেইল অ্যাড্রেস", "Email Address")}</span>
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Mail className="w-3 h-3 text-slate-400" />
                      {selectedStaffForView.email}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold">{getTranslation("রক্তের গ্রুপ", "Blood Group")}</span>
                    <span className="font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded inline-block text-[11px]">
                      {selectedStaffForView.bloodGroup || "N/A"}
                    </span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-slate-400 block text-[10px] font-bold">{getTranslation("জরুরী যোগাযোগের নম্বর", "Emergency Contact")}</span>
                    <span className="font-bold text-slate-800">{selectedStaffForView.emergencyContact || selectedStaffForView.mobile}</span>
                  </div>
                </div>
              </div>

              {/* 2. JOB INFORMATION */}
              <div className="pt-4 space-y-3">
                <h5 className="font-black text-slate-800 text-xs uppercase tracking-wider flex items-center space-x-1.5 text-blue-800">
                  <Building className="w-4 h-4" />
                  <span>{getTranslation("২. চাকরির তথ্য (Job Information)", "2. Job Information")}</span>
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold">{getTranslation("স্টাফ আইডি", "Staff ID")}</span>
                    <span className="font-mono font-black text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 inline-block">
                      {selectedStaffForView.staffId}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold">{getTranslation("পদবী (Designation)", "Designation")}</span>
                    <span className="font-bold text-slate-800">{selectedStaffForView.designation || "Executive"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold">{getTranslation("বিভাগ (Department)", "Department")}</span>
                    <span className="font-bold text-slate-800">{selectedStaffForView.department || "General"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold">{getTranslation("যোগদানের তারিখ", "Joining Date")}</span>
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {selectedStaffForView.joiningDate || "N/A"}
                    </span>
                  </div>
                  {selectedStaffForView.assignedAgentDesk && (
                    <div className="sm:col-span-2">
                      <span className="text-slate-400 block text-[10px] font-bold">{getTranslation("কল সেন্টার ডেস্ক", "Call Center Desk")}</span>
                      <span className="font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-lg inline-flex items-center gap-1">
                        <PhoneCall className="w-3.5 h-3.5" />
                        Desk #{selectedStaffForView.assignedAgentDesk}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* 3. ACCOUNT & SECURITY INFORMATION */}
              <div className="pt-4 space-y-3">
                <h5 className="font-black text-slate-800 text-xs uppercase tracking-wider flex items-center space-x-1.5 text-purple-800">
                  <ShieldCheck className="w-4 h-4" />
                  <span>{getTranslation("৩. অ্যাকাউন্ট ও নিরাপত্তা তথ্য (Account & Security)", "3. Account & Security Information")}</span>
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold">{getTranslation("ইউজারনেম / লগইন আইডি", "Login Username")}</span>
                    <span className="font-mono font-black text-purple-900 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 inline-block">
                      {formatStaffUsername(selectedStaffForView.username || selectedStaffForView.staffId)}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-1">{getTranslation("এই আইডি বা স্টাফ আইডি এবং পাসওয়ার্ড দিয়ে লগইন সম্ভব।", "Used to login to Admin & Staff Portal.")}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold">{getTranslation("অ্যাকাউন্ট স্ট্যাটাস", "Account Status")}</span>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-black text-[11px] ${
                      selectedStaffForView.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                    }`}>
                      {selectedStaffForView.status === "active" ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold">{getTranslation("তৈরির সময়", "Account Created At")}</span>
                    <span className="font-medium text-slate-700">
                      {selectedStaffForView.createdAt ? new Date(selectedStaffForView.createdAt).toLocaleString() : "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold">{getTranslation("সর্বশেষ সক্রিয়তা", "Last Active At")}</span>
                    <span className="font-medium text-slate-700">
                      {selectedStaffForView.lastActiveAt ? new Date(selectedStaffForView.lastActiveAt).toLocaleString() : "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              {/* 4. SALARY & COMPENSATION */}
              <div className="pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="font-black text-slate-800 text-xs uppercase tracking-wider flex items-center space-x-1.5 text-amber-800">
                    <Wallet className="w-4 h-4" />
                    <span>{getTranslation("৪. বেতন ও পরিশোধ সংক্রান্ত হিসাব (Salary Information)", "4. Salary Information")}</span>
                  </h5>
                  <button
                    onClick={() => {
                      setSelectedStaffForSalary(selectedStaffForView);
                      setSalaryAmount(selectedStaffForView.monthlySalary || 0);
                      setNewBaseSalary(selectedStaffForView.monthlySalary || 0);
                    }}
                    className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-[11px] font-black shadow transition cursor-pointer flex items-center gap-1"
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>{getTranslation("বেতন পরিশোধ / আপডেট করুন", "Manage / Pay Salary")}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-amber-50/40 p-3.5 rounded-2xl border border-amber-200/60">
                  <div>
                    <span className="text-slate-500 block text-[10px] font-bold">{getTranslation("মাসিক মূল বেতন (Base Salary)", "Monthly Base Salary")}</span>
                    <span className="text-base font-black text-emerald-900">
                      ৳{(selectedStaffForView.monthlySalary || 0).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] font-bold">{getTranslation("চলতি মাসের বেতন স্ট্যাটাস", "Current Month Status")}</span>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-black text-[11px] mt-1 ${
                      selectedStaffForView.salaryStatus === "paid"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : "bg-amber-100 text-amber-800 border border-amber-200"
                    }`}>
                      {selectedStaffForView.salaryStatus === "paid" ? getTranslation("পরিশোধিত (Paid)", "Paid") : getTranslation("বকেয়া (Due)", "Due")}
                    </span>
                  </div>
                </div>

                {/* Recent Salary Disbursement Records */}
                {selectedStaffForView.salaryHistory && selectedStaffForView.salaryHistory.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    <span className="text-[11px] font-black text-slate-600 block">{getTranslation("পূর্ববর্তী পরিশোধের রেকর্ড (Payment Records):", "Payment Records:")}</span>
                    <div className="border border-slate-200 rounded-xl overflow-x-auto">
                      <table className="w-full text-left text-[11px] min-w-[400px]">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                          <tr>
                            <th className="p-2">মাস</th>
                            <th className="p-2">পরিমাণ</th>
                            <th className="p-2">পেমেন্ট মেথড</th>
                            <th className="p-2">Trx ID</th>
                            <th className="p-2">তারিখ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {selectedStaffForView.salaryHistory.slice(0, 4).map((rec) => (
                            <tr key={rec.id} className="hover:bg-slate-50">
                              <td className="p-2 font-bold text-slate-800">{rec.month}</td>
                              <td className="p-2 font-black text-emerald-800">৳{rec.amount?.toLocaleString()}</td>
                              <td className="p-2">{rec.paymentMethod}</td>
                              <td className="p-2 font-mono text-[10px] text-slate-500">{rec.transactionRef || "N/A"}</td>
                              <td className="p-2 text-slate-400">{new Date(rec.paymentDate || rec.paidAt || rec.createdAt || Date.now()).toLocaleDateString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* 5. PERMISSIONS SUMMARY */}
              <div className="pt-4 space-y-3">
                <h5 className="font-black text-slate-800 text-xs uppercase tracking-wider flex items-center space-x-1.5 text-slate-700">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  <span>{getTranslation("৫. অনুমোদিত পারমিশনসমূহ (Permissions)", "5. Configured Module Permissions")}</span>
                </h5>
                <div className="flex flex-wrap gap-1.5 bg-slate-50/70 p-3 rounded-2xl border border-slate-100">
                  {PERMISSION_MODULES.map((mod) => {
                    const hasView = hasPermission(selectedStaffForView, mod.id, "view");
                    const hasEdit = hasPermission(selectedStaffForView, mod.id, "edit");
                    if (!hasView) return null;
                    return (
                      <span
                        key={mod.id}
                        className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl text-[10px] font-black border ${
                          hasEdit
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-blue-50 text-blue-800 border-blue-200"
                        }`}
                      >
                        <Check className="w-3 h-3" />
                        <span>{getTranslation(mod.nameBn, mod.nameEn)}</span>
                        <span className="text-[9px] opacity-70">({hasEdit ? "Full" : "View"})</span>
                      </span>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    const st = selectedStaffForView;
                    setSelectedStaffForView(null);
                    setSelectedStaffForIdCard(st);
                  }}
                  className="flex items-center space-x-1 px-3 py-2 bg-emerald-700 text-white rounded-xl text-xs font-black shadow hover:bg-emerald-600 cursor-pointer"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>{getTranslation("আইডি কার্ড", "ID Card")}</span>
                </button>

                <button
                  onClick={() => {
                    const st = selectedStaffForView;
                    setSelectedStaffForView(null);
                    setSelectedStaffForEdit(st);
                  }}
                  className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded-xl text-xs font-black shadow hover:bg-blue-500 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>{getTranslation("তথ্য এডিট", "Edit Info")}</span>
                </button>

                <button
                  onClick={() => {
                    const st = selectedStaffForView;
                    setSelectedStaffForView(null);
                    setSelectedStaffForPerms(st);
                    setTempPermissions({ ...(st.permissions || getRoleDef(st.role).defaultPermissions) });
                  }}
                  className="flex items-center space-x-1 px-3 py-2 bg-purple-600 text-white rounded-xl text-xs font-black shadow hover:bg-purple-500 cursor-pointer"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>{getTranslation("পারমিশন", "Permissions")}</span>
                </button>

                <button
                  onClick={() => {
                    const st = selectedStaffForView;
                    setSelectedStaffForView(null);
                    setSelectedStaffForPassword(st);
                    setNewPassword("");
                  }}
                  className="flex items-center space-x-1 px-3 py-2 bg-amber-600 text-white rounded-xl text-xs font-black shadow hover:bg-amber-500 cursor-pointer"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>{getTranslation("পাসওয়ার্ড রিসেট", "Password")}</span>
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex-shrink-0 p-4 border-t border-slate-100 flex flex-wrap gap-2 justify-end bg-gray-50/50">
              <button
                type="button"
                onClick={() => setSelectedStaffForView(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                {getTranslation("বন্ধ করুন", "Close")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT STAFF BASIC INFO */}
      {/* ========================================================================= */}
      {selectedStaffForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="max-h-[85vh] sm:max-h-[90vh] flex flex-col w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 animate-scale-up">
            <div className="flex-shrink-0 p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-black text-slate-800 text-sm flex items-center space-x-2">
                <Edit2 className="w-4 h-4 text-blue-600" />
                <span>{getTranslation("স্টাফ তথ্য এডিট করুন", "Edit Staff Information")}</span>
              </h3>
              <button
                onClick={() => setSelectedStaffForEdit(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditStaffSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="overflow-y-auto flex-1 p-6 space-y-4">
                {/* Permanent Staff ID notice */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block">{getTranslation("স্টাফ আইডি (স্থায়ী)", "Staff ID (Permanent)")}</span>
                    <span className="text-xs font-black text-slate-800">{selectedStaffForEdit.staffId}</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    {getTranslation("অপরিবর্তনীয়", "Immutable")}
                  </span>
                </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">{getTranslation("পূর্ণ নাম", "Full Name")}</label>
                <input
                  type="text"
                  required
                  value={selectedStaffForEdit.fullName}
                  onChange={(e) => setSelectedStaffForEdit({ ...selectedStaffForEdit, fullName: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">{getTranslation("ইউজারনেম / লগইন আইডি", "Username / Login ID")}</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={selectedStaffForEdit.username || ""}
                      onChange={(e) => setSelectedStaffForEdit({ ...selectedStaffForEdit, username: formatStaffUsername(e.target.value) })}
                      placeholder="e.g. cfikb002"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-purple-900 focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">{getTranslation("মাসিক মূল বেতন (৳)", "Monthly Base Salary (৳)")}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-black">৳</span>
                    <input
                      type="number"
                      min={0}
                      value={selectedStaffForEdit.monthlySalary || 0}
                      onChange={(e) => setSelectedStaffForEdit({ ...selectedStaffForEdit, monthlySalary: Number(e.target.value) || 0 })}
                      className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-emerald-900 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">{getTranslation("পদবী (Designation)", "Designation")}</label>
                  <input
                    type="text"
                    value={selectedStaffForEdit.designation || ""}
                    onChange={(e) => setSelectedStaffForEdit({ ...selectedStaffForEdit, designation: e.target.value })}
                    placeholder="e.g. Senior Executive"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">{getTranslation("বিভাগ (Department)", "Department")}</label>
                  <select
                    value={selectedStaffForEdit.department || "Order Fulfillment & Logistics"}
                    onChange={(e) => setSelectedStaffForEdit({ ...selectedStaffForEdit, department: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept.id} value={dept.nameEn}>
                        {getTranslation(dept.nameBn, dept.nameEn)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">{getTranslation("যোগদানের তারিখ", "Joining Date")}</label>
                  <input
                    type="date"
                    value={selectedStaffForEdit.joiningDate || ""}
                    onChange={(e) => setSelectedStaffForEdit({ ...selectedStaffForEdit, joiningDate: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">{getTranslation("রক্তের গ্রুপ", "Blood Group")}</label>
                  <select
                    value={selectedStaffForEdit.bloodGroup || "B (+ve)"}
                    onChange={(e) => setSelectedStaffForEdit({ ...selectedStaffForEdit, bloodGroup: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    {BLOOD_GROUPS.map((bg) => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">{getTranslation("মোবাইল", "Mobile")}</label>
                  <input
                    type="tel"
                    required
                    value={selectedStaffForEdit.mobile}
                    onChange={(e) => setSelectedStaffForEdit({ ...selectedStaffForEdit, mobile: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">{getTranslation("জরুরী যোগাযোগ", "Emergency Contact")}</label>
                  <input
                    type="tel"
                    value={selectedStaffForEdit.emergencyContact || ""}
                    onChange={(e) => setSelectedStaffForEdit({ ...selectedStaffForEdit, emergencyContact: e.target.value })}
                    placeholder="018XXXXXXXX"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">{getTranslation("ইমেইল", "Email")}</label>
                <input
                  type="email"
                  required
                  value={selectedStaffForEdit.email}
                  onChange={(e) => setSelectedStaffForEdit({ ...selectedStaffForEdit, email: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">{getTranslation("রোল", "Role")}</label>
                  <select
                    value={selectedStaffForEdit.role}
                    disabled={selectedStaffForEdit.isSuperAdmin}
                    onChange={(e) => setSelectedStaffForEdit({ ...selectedStaffForEdit, role: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    {DEFAULT_ROLES.map(r => (
                      <option key={r.id} value={r.id}>{getTranslation(r.nameBn, r.nameEn)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">{getTranslation("স্ট্যাটাস", "Status")}</label>
                  <select
                    value={selectedStaffForEdit.status}
                    disabled={selectedStaffForEdit.isSuperAdmin}
                    onChange={(e) => setSelectedStaffForEdit({ ...selectedStaffForEdit, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">{getTranslation("বেতন স্ট্যাটাস", "Salary Status")}</label>
                  <select
                    value={selectedStaffForEdit.salaryStatus || "due"}
                    onChange={(e) => setSelectedStaffForEdit({ ...selectedStaffForEdit, salaryStatus: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  >
                    <option value="paid">{getTranslation("পরিশোধিত", "Paid")}</option>
                    <option value="due">{getTranslation("বকেয়া", "Due")}</option>
                  </select>
                </div>
              </div>

              {selectedStaffForEdit.role === "call_center_agent" && (
                <div>
                  <label className="block text-xs font-black text-teal-800 mb-1">
                    {getTranslation("কল সেন্টার ডেস্ক (১-২০)", "Call Center Desk (1-20)")}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={selectedStaffForEdit.assignedAgentDesk || 1}
                    onChange={(e) => setSelectedStaffForEdit({ ...selectedStaffForEdit, assignedAgentDesk: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-2 bg-teal-50 border border-teal-200 rounded-xl text-xs font-black"
                  />
                </div>
              )}

              </div>

              <div className="flex-shrink-0 p-4 border-t border-slate-100 flex flex-wrap gap-2 justify-end bg-gray-50/50">
                <button
                  type="button"
                  onClick={() => setSelectedStaffForEdit(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 cursor-pointer"
                >
                  {getTranslation("বাতিল", "Cancel")}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-black shadow hover:bg-blue-500 cursor-pointer"
                >
                  {getTranslation("আপডেট করুন", "Save Changes")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CUSTOMIZE GRANULAR PERMISSIONS */}
      {/* ========================================================================= */}
      {selectedStaffForPerms && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="max-h-[85vh] sm:max-h-[90vh] flex flex-col w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 animate-scale-up">
            <div className="flex-shrink-0 p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-black text-slate-800 text-sm flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-purple-600" />
                  <span>{getTranslation("গ্র্যানুলার পারমিশন কাস্টমাইজ করুন", "Customize Granular Permissions")}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedStaffForPerms.fullName} ({selectedStaffForPerms.staffId})
                </p>
              </div>
              <button
                onClick={() => setSelectedStaffForPerms(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PERMISSION_MODULES.map((m) => (
                  <div key={m.id} className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                    <span className="font-black text-xs text-slate-800 block">{getTranslation(m.nameBn, m.nameEn)}</span>
                    <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-200/60">
                      {m.supportedActions.map((action) => {
                        const key = `${m.id}.${action}`;
                        const isChecked = !!tempPermissions[key];
                        return (
                          <label key={action} className="flex items-center space-x-1.5 text-xs text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                setTempPermissions(prev => ({ ...prev, [key]: e.target.checked }));
                              }}
                              className="rounded text-purple-600 focus:ring-purple-500"
                            />
                            <span className="capitalize">{action}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-shrink-0 p-4 border-t border-slate-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    const allTrue: PermissionsMap = {};
                    PERMISSION_MODULES.forEach(m => m.supportedActions.forEach(a => { allTrue[`${m.id}.${a}`] = true; }));
                    setTempPermissions(allTrue);
                  }}
                  className="text-[11px] text-purple-600 font-bold hover:underline"
                >
                  Select All
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => setTempPermissions({})}
                  className="text-[11px] text-slate-500 font-bold hover:underline"
                >
                  Clear All
                </button>
              </div>

              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedStaffForPerms(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600"
                >
                  {getTranslation("বাতিল", "Cancel")}
                </button>
                <button
                  type="button"
                  onClick={handleSavePermissions}
                  className="px-5 py-2 rounded-xl bg-purple-600 text-white text-xs font-black shadow hover:bg-purple-500 cursor-pointer"
                >
                  {getTranslation("পারমিশন সেভ করুন", "Save Permissions")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: RESET STAFF PASSWORD */}
      {/* ========================================================================= */}
      {selectedStaffForPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="max-h-[85vh] sm:max-h-[90vh] flex flex-col w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 animate-scale-up">
            <div className="flex-shrink-0 p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-black text-slate-800 text-sm flex items-center space-x-2">
                <Key className="w-4 h-4 text-amber-600" />
                <span>{getTranslation("পাসওয়ার্ড রিসেট করুন", "Reset Password")}</span>
              </h3>
              <button
                onClick={() => setSelectedStaffForPassword(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="overflow-y-auto flex-1 p-6 space-y-4 text-xs text-slate-600">
                <p>
                  {getTranslation(
                    `স্টাফ ${selectedStaffForPassword.fullName} (${selectedStaffForPassword.staffId})-এর জন্য নতুন পাসওয়ার্ড দিন:`,
                    `Enter new secure password for ${selectedStaffForPassword.fullName}:`
                  )}
                </p>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    {getTranslation("নতুন পাসওয়ার্ড (ন্যূনতম ৬ অক্ষর)", "New Password (Min 6 chars)")}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex-shrink-0 p-4 border-t border-slate-100 flex flex-wrap gap-2 justify-end bg-gray-50/50">
                <button
                  type="button"
                  onClick={() => setSelectedStaffForPassword(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600"
                >
                  {getTranslation("বাতিল", "Cancel")}
                </button>
                <button
                  type="submit"
                  disabled={passwordResetLoading}
                  className="px-5 py-2 rounded-xl bg-amber-600 text-white text-xs font-black shadow hover:bg-amber-500 disabled:opacity-50 cursor-pointer"
                >
                  {passwordResetLoading ? getTranslation("রিসেট হচ্ছে...", "Resetting...") : getTranslation("রিসেট নিশ্চিত করুন", "Confirm Reset")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: DELETE STAFF CONFIRMATION */}
      {/* ========================================================================= */}
      {selectedStaffForDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="max-h-[85vh] sm:max-h-[90vh] flex flex-col w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 animate-scale-up text-center">
            <div className="overflow-y-auto flex-1 p-6 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <h4 className="font-black text-slate-800 text-base">
                {getTranslation("স্টাফ অ্যাকাউন্ট মুছে ফেলতে চান?", "Delete Staff Account?")}
              </h4>
              <p className="text-xs text-slate-500">
                {getTranslation(
                  `আপনি কি নিশ্চিত যে "${selectedStaffForDelete.fullName}" (${selectedStaffForDelete.staffId})-কে স্থায়ীভাবে মুছে ফেলতে চান?`,
                  `Are you sure you want to permanently delete "${selectedStaffForDelete.fullName}" (${selectedStaffForDelete.staffId})?`
                )}
              </p>
            </div>

            <div className="flex-shrink-0 p-4 border-t border-slate-100 flex flex-wrap gap-2 justify-center bg-gray-50/50">
              <button
                type="button"
                onClick={() => setSelectedStaffForDelete(null)}
                className="px-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                {getTranslation("না, ফিরে যান", "Cancel")}
              </button>
              <button
                type="button"
                onClick={handleDeleteStaffConfirm}
                className="px-5 py-2.5 rounded-2xl bg-red-600 text-white text-xs font-black shadow-md shadow-red-900/20 hover:bg-red-500 transition cursor-pointer"
              >
                {getTranslation("হ্যাঁ, মুছে ফেলুন", "Yes, Delete")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SALARY MANAGEMENT & DISBURSEMENT */}
      {/* ========================================================================= */}
      {selectedStaffForSalary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="max-h-[85vh] sm:max-h-[90vh] flex flex-col w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 animate-scale-up">
            {/* Modal Header */}
            <div className="flex-shrink-0 p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-amber-50/50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold shadow-xs">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-sm">
                    {getTranslation("স্টাফ বেতন ব্যবস্থাপনা ও পরিশোধ", "Staff Salary Management & Disbursement")}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {selectedStaffForSalary.fullName} • <span className="font-mono font-bold text-slate-700">{selectedStaffForSalary.staffId}</span> • {formatStaffUsername(selectedStaffForSalary.username || selectedStaffForSalary.staffId)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStaffForSalary(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto flex-1 p-6 space-y-4 text-xs text-slate-700">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 block">{getTranslation("মাসিক মূল বেতন", "Monthly Base Salary")}</span>
                  <span className="text-lg font-black text-emerald-800">৳{(selectedStaffForSalary.monthlySalary || 0).toLocaleString()}</span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 block">{getTranslation("বর্তমান স্ট্যাটাস", "Salary Status")}</span>
                  <span className={`inline-block mt-0.5 px-2.5 py-0.5 rounded-md text-[11px] font-black ${
                    selectedStaffForSalary.salaryStatus === "paid"
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      : "bg-amber-100 text-amber-800 border border-amber-200"
                  }`}>
                    {selectedStaffForSalary.salaryStatus === "paid" ? getTranslation("পরিশোধিত", "Paid") : getTranslation("বকেয়া", "Due")}
                  </span>
                </div>
              </div>

              {/* Form 1: Disburse / Record Payment */}
              <form onSubmit={handlePaySalary} className="bg-amber-50/40 p-4 rounded-2xl border border-amber-200/70 space-y-3">
                <h4 className="font-black text-amber-900 text-xs flex items-center space-x-1.5">
                  <DollarSign className="w-4 h-4 text-amber-600" />
                  <span>{getTranslation("বেতন পরিশোধ রেকর্ড করুন (Disburse Salary)", "Record Salary Payment")}</span>
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 mb-1">{getTranslation("বেতনের মাস ও বছর", "Salary Month")}</label>
                    <input
                      type="text"
                      required
                      value={salaryMonth}
                      onChange={(e) => setSalaryMonth(e.target.value)}
                      placeholder="e.g. September 2026"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 mb-1">{getTranslation("পরিশোধের পরিমাণ (৳)", "Amount (৳)")}</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={salaryAmount}
                      onChange={(e) => setSalaryAmount(Number(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-emerald-900 focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 mb-1">{getTranslation("পেমেন্ট মেথড", "Payment Method")}</label>
                    <select
                      value={salaryPaymentMethod}
                      onChange={(e) => setSalaryPaymentMethod(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="bKash">bKash (বিকাশ)</option>
                      <option value="Nagad">Nagad (নগদ)</option>
                      <option value="Rocket">Rocket (রকেট)</option>
                      <option value="Bank Transfer">Bank Transfer (ব্যাংক ট্রান্সফার)</option>
                      <option value="Cash">Cash in Hand (নগদ ক্যাশ)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 mb-1">{getTranslation("ট্রানজেকশন আইডি / রেফারেন্স", "Transaction Ref / TrxID")}</label>
                    <input
                      type="text"
                      value={salaryTrxId}
                      onChange={(e) => setSalaryTrxId(e.target.value)}
                      placeholder="e.g. TRX9928192"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-medium focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-700 mb-1">{getTranslation("নোট / বিবরণ", "Note")}</label>
                  <input
                    type="text"
                    value={salaryNote}
                    onChange={(e) => setSalaryNote(e.target.value)}
                    placeholder="Monthly salary disburse"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="pt-1 flex justify-end">
                  <button
                    type="submit"
                    disabled={salaryLoading}
                    className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-black shadow-md shadow-amber-900/10 transition cursor-pointer flex items-center space-x-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{salaryLoading ? getTranslation("প্রসেস হচ্ছে...", "Processing...") : getTranslation("বেতন পরিশোধ সম্পন্ন করুন", "Confirm Disbursement")}</span>
                  </button>
                </div>
              </form>

              {/* Form 2: Update Base Salary */}
              <form onSubmit={handleUpdateSalaryBase} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="font-black text-slate-800 text-xs flex items-center space-x-1.5">
                  <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>{getTranslation("মাসিক মূল বেতন আপডেট করুন", "Update Base Monthly Salary")}</span>
                </h4>

                <div className="flex gap-2 items-center">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-slate-400">৳</span>
                    <input
                      type="number"
                      min={0}
                      value={newBaseSalary}
                      onChange={(e) => setNewBaseSalary(Number(e.target.value) || 0)}
                      className="w-full pl-8 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-800 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={updatingBaseSalary}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition cursor-pointer shrink-0"
                  >
                    {updatingBaseSalary ? getTranslation("আপডেট হচ্ছে...", "Saving...") : getTranslation("মূল বেতন পরিবর্তন করুন", "Save Base Salary")}
                  </button>
                </div>
              </form>

              {/* Historical Salary Payments Table */}
              {selectedStaffForSalary.salaryHistory && selectedStaffForSalary.salaryHistory.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-black text-slate-800 text-xs">{getTranslation("পরিশোধের পূর্ববর্তী রেকর্ডসমূহ", "Previous Salary Records")}</h4>
                  <div className="border border-slate-200 rounded-2xl overflow-x-auto shadow-xs">
                    <table className="w-full text-left text-xs min-w-[480px]">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[10px]">
                        <tr>
                          <th className="p-2.5">মাস</th>
                          <th className="p-2.5">পরিমাণ</th>
                          <th className="p-2.5">মেথড</th>
                          <th className="p-2.5">Trx ID</th>
                          <th className="p-2.5">তারিখ</th>
                          <th className="p-2.5">অনুমোদনকারী</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {selectedStaffForSalary.salaryHistory.map((rec) => (
                          <tr key={rec.id} className="hover:bg-slate-50">
                            <td className="p-2.5 font-bold text-slate-800">{rec.month}</td>
                            <td className="p-2.5 font-black text-emerald-800">৳{rec.amount?.toLocaleString()}</td>
                            <td className="p-2.5">{rec.paymentMethod}</td>
                            <td className="p-2.5 font-mono text-[10px] text-slate-500">{rec.transactionRef || "N/A"}</td>
                            <td className="p-2.5 text-slate-400">{new Date(rec.paymentDate || rec.paidAt || rec.createdAt || Date.now()).toLocaleDateString()}</td>
                            <td className="p-2.5 text-slate-600 font-bold">{rec.paidBy}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="flex-shrink-0 p-4 border-t border-slate-100 flex flex-wrap gap-2 justify-end bg-gray-50/50">
              <button
                type="button"
                onClick={() => setSelectedStaffForSalary(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                {getTranslation("বন্ধ করুন", "Close")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: PROFESSIONAL STAFF ID CARD SYSTEM (PREVIEW, EDIT, PRINT, PDF, REPRINT) */}
      {/* ========================================================================= */}
      {selectedStaffForIdCard && (
        <StaffIdCardModal
          staff={selectedStaffForIdCard}
          staffId={selectedStaffForIdCard.staffId || selectedStaffForIdCard.id}
          staffList={staffList}
          currentUser={currentUser}
          lang={lang}
          onClose={handleCloseIdCard}
          onStaffUpdated={async (updatedStaff) => {
            setSelectedStaffForIdCard(updatedStaff);
            try {
              sessionStorage.setItem("kacha_selected_staff_id_card", updatedStaff.staffId || updatedStaff.id);
            } catch {}
            await fetchStaff();
            await fetchLogs();
          }}
          triggerToast={triggerToast}
        />
      )}

    </div>
  );
}
