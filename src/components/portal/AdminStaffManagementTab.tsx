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
  hasPermission, 
  logStaffActivity 
} from "../../lib/staffManager";
import { 
  Users, UserPlus, Shield, ShieldCheck, History, 
  Search, Filter, Plus, Edit2, Trash2, Key, LogOut, 
  CheckCircle2, XCircle, Clock, AlertTriangle, Phone, 
  Mail, Eye, EyeOff, RefreshCw, Download, Check, 
  UserCheck, ShieldAlert, Laptop, PhoneCall, Sparkles
} from "lucide-react";

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

  // Password reset state
  const [newPassword, setNewPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [passwordResetLoading, setPasswordResetLoading] = useState<boolean>(false);

  // Add Form state
  const [formFullName, setFormFullName] = useState<string>("");
  const [formMobile, setFormMobile] = useState<string>("");
  const [formEmail, setFormEmail] = useState<string>("");
  const [formStaffId, setFormStaffId] = useState<string>("");
  const [formPassword, setFormPassword] = useState<string>("");
  const [formRole, setFormRole] = useState<StaffRole>("order_manager");
  const [formStatus, setFormStatus] = useState<StaffStatus>("active");
  const [formPhotoURL, setFormPhotoURL] = useState<string>(PRESET_AVATARS[0]);
  const [formDesk, setFormDesk] = useState<number>(1);
  const [formPermissions, setFormPermissions] = useState<PermissionsMap>({});
  const [showFormPassword, setShowFormPassword] = useState<boolean>(false);
  const [submittingAdd, setSubmittingAdd] = useState<boolean>(false);

  // Edit Permissions Modal local state
  const [tempPermissions, setTempPermissions] = useState<PermissionsMap>({});

  // Fetch Staff List from Server API
  const fetchStaff = async () => {
    setLoadingStaff(true);
    try {
      const res = await fetch("/api/staff/list");
      const data = await res.json();
      if (data.success && Array.isArray(data.staff)) {
        setStaffList(data.staff);
      }
    } catch (err) {
      console.error("Error loading staff list:", err);
    } finally {
      setLoadingStaff(false);
    }
  };

  // Fetch Activity Logs
  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch("/api/staff/activity-logs?limit=150");
      const data = await res.json();
      if (data.success && Array.isArray(data.logs)) {
        setActivityLogs(data.logs);
      }
    } catch (err) {
      console.error("Error loading activity logs:", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchStaff();
    fetchLogs();
  }, []);

  // Update permissions when form role changes
  useEffect(() => {
    const roleDef = DEFAULT_ROLES.find(r => r.id === formRole);
    if (roleDef) {
      setFormPermissions({ ...roleDef.defaultPermissions });
    }
  }, [formRole]);

  // Handle Add Staff Submit
  const handleAddStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFullName || !formMobile || !formEmail || !formPassword) {
      triggerToast("অনুগ্রহ করে সকল তথ্য পূরণ করুন!", "Please fill in all required fields!");
      return;
    }

    if (formPassword.length < 6) {
      triggerToast("পাসওয়ার্ড ন্যূনতম ৬ অক্ষরের হতে হবে!", "Password must be at least 6 characters long!");
      return;
    }

    setSubmittingAdd(true);
    try {
      const res = await fetch("/api/staff/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formFullName,
          mobile: formMobile,
          email: formEmail,
          staffId: formStaffId || `KB-STF-${String(staffList.length + 1).padStart(3, "0")}`,
          password: formPassword,
          role: formRole,
          status: formStatus,
          photoURL: formPhotoURL,
          assignedAgentDesk: formRole === "call_center_agent" ? formDesk : undefined,
          permissions: formPermissions,
          creatorName: currentUser?.fullName || currentUser?.displayName || "Super Admin"
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create staff");
      }

      triggerToast("নতুন স্টাফ সফলভাবে যুক্ত করা হয়েছে!", "New staff created successfully!");
      // Reset form
      setFormFullName("");
      setFormMobile("");
      setFormEmail("");
      setFormStaffId("");
      setFormPassword("");
      setFormRole("order_manager");
      setFormStatus("active");
      
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

  // Handle Edit Staff info submit
  const handleEditStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffForEdit) return;

    try {
      const res = await fetch("/api/staff/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedStaffForEdit.id,
          fullName: selectedStaffForEdit.fullName,
          mobile: selectedStaffForEdit.mobile,
          email: selectedStaffForEdit.email,
          photoURL: selectedStaffForEdit.photoURL,
          role: selectedStaffForEdit.role,
          status: selectedStaffForEdit.status,
          assignedAgentDesk: selectedStaffForEdit.assignedAgentDesk,
          updaterName: currentUser?.fullName || currentUser?.displayName || "Super Admin",
          updaterRole: currentUser?.role || "super_admin"
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update staff");
      }

      triggerToast("স্টাফ তথ্য সফলভাবে আপডেট হয়েছে!", "Staff information updated successfully!");
      setSelectedStaffForEdit(null);
      await fetchStaff();
      await fetchLogs();
    } catch (err: any) {
      triggerToast(err.message, err.message);
    }
  };

  // Handle Save Custom Permissions
  const handleSavePermissions = async () => {
    if (!selectedStaffForPerms) return;

    try {
      const res = await fetch("/api/staff/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedStaffForPerms.id,
          permissions: tempPermissions,
          updaterName: currentUser?.fullName || currentUser?.displayName || "Super Admin",
          updaterRole: currentUser?.role || "super_admin"
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update permissions");
      }

      triggerToast("পারমিশন সফলভাবে সেভ করা হয়েছে!", "Permissions customized and saved successfully!");
      setSelectedStaffForPerms(null);
      await fetchStaff();
      await fetchLogs();
    } catch (err: any) {
      triggerToast(err.message, err.message);
    }
  };

  // Handle Status Toggle (Active / Inactive)
  const handleToggleStatus = async (staff: StaffMember) => {
    if (staff.isSuperAdmin || staff.role === "super_admin") {
      triggerToast("সুপার এডমিন অ্যাকাউন্ট নিষ্ক্রিয় করা যাবে না!", "Super Admin account cannot be deactivated!");
      return;
    }

    const nextStatus: StaffStatus = staff.status === "active" ? "inactive" : "active";
    try {
      const res = await fetch("/api/staff/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: staff.id,
          status: nextStatus,
          updaterName: currentUser?.fullName || currentUser?.displayName || "Super Admin",
          updaterRole: currentUser?.role || "super_admin"
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      triggerToast(
        `স্টাফ স্ট্যাটাস: ${nextStatus === "active" ? "সক্রিয়" : "নিষ্ক্রিয়"} করা হয়েছে!`,
        `Staff status updated to ${nextStatus}!`
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedStaffForPassword.id,
          newPassword: newPassword,
          adminName: currentUser?.fullName || currentUser?.displayName || "Super Admin"
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      triggerToast("পাসওয়ার্ড সফলভাবে রিসেট করা হয়েছে!", "Password reset successfully!");
      setSelectedStaffForPassword(null);
      setNewPassword("");
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: staff.staffId,
          adminName: currentUser?.fullName || currentUser?.displayName || "Super Admin"
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      triggerToast("সেশন ফোর্স লগআউট করা হয়েছে!", "Staff active session terminated successfully!");
      await fetchStaff();
      await fetchLogs();
    } catch (err: any) {
      triggerToast(err.message, err.message);
    }
  };

  // Handle Delete Staff
  const handleDeleteStaffConfirm = async () => {
    if (!selectedStaffForDelete) return;

    try {
      const res = await fetch("/api/staff/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedStaffForDelete.id,
          deleterName: currentUser?.fullName || currentUser?.displayName || "Super Admin"
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      triggerToast("স্টাফ সফলভাবে ডিলিট করা হয়েছে!", "Staff deleted successfully!");
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
            <p className="text-[11px] text-teal-400 font-bold">{getTranslation("অনলাইন এখন", "Currently Online")}</p>
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
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredStaff.map((staff) => {
                const roleDef = getRoleDef(staff.role);
                const isSuper = staff.isSuperAdmin || staff.role === "super_admin";
                const isOnline = staff.onlineStatus === "online";
                const isAway = staff.onlineStatus === "away";

                return (
                  <div
                    key={staff.id}
                    className={`bg-white rounded-3xl p-5 border transition shadow-sm hover:shadow-md flex flex-col justify-between relative overflow-hidden ${
                      staff.status === "inactive" ? "border-red-200 bg-red-50/20 opacity-80" : "border-slate-200"
                    }`}
                  >
                    {/* Top Section */}
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center space-x-3">
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

                          <div className="min-w-0">
                            <h4 className="font-black text-slate-800 text-sm truncate flex items-center gap-1.5">
                              <span>{staff.fullName}</span>
                              {isSuper && <span title="Super Admin">👑</span>}
                            </h4>
                            <div className="flex items-center space-x-2 mt-0.5">
                              <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                {staff.staffId}
                              </span>
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
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
                        <div className={`px-2.5 py-1 rounded-xl text-[10px] font-black shrink-0 ${roleDef.badgeColor}`}>
                          <span>{roleDef.icon} {getTranslation(roleDef.nameBn, roleDef.nameEn)}</span>
                        </div>
                      </div>

                      {/* Contact Info Details */}
                      <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                        <div className="flex items-center space-x-2">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-medium truncate">{staff.mobile}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-medium truncate">{staff.email}</span>
                        </div>
                        {staff.assignedAgentDesk && (
                          <div className="flex items-center space-x-2 text-teal-700 font-bold">
                            <PhoneCall className="w-3.5 h-3.5 shrink-0" />
                            <span>{getTranslation(`কল সেন্টার ডেস্ক: ${staff.assignedAgentDesk}`, `Call Center Desk #${staff.assignedAgentDesk}`)}</span>
                          </div>
                        )}
                        <div className="flex items-center space-x-2 text-[11px] text-slate-400 pt-1">
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            {getTranslation("সর্বশেষ সক্রিয়: ", "Last active: ")}
                            {staff.lastActiveAt ? new Date(staff.lastActiveAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "N/A"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons Toolbar */}
                    <div className="mt-5 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-1.5">
                      <div className="flex items-center space-x-1">
                        {/* View Details */}
                        <button
                          onClick={() => setSelectedStaffForView(staff)}
                          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                          title={getTranslation("বিস্তারিত দেখুন", "View Details")}
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Edit Basic Info */}
                        <button
                          onClick={() => setSelectedStaffForEdit(staff)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition cursor-pointer"
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
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-xl transition cursor-pointer"
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
                          className="p-2 text-amber-600 hover:bg-amber-50 rounded-xl transition cursor-pointer"
                          title={getTranslation("পাসওয়ার্ড রিসেট করুন", "Reset Password")}
                        >
                          <Key className="w-4 h-4" />
                        </button>

                        {/* Force Logout / Terminate Session */}
                        <button
                          onClick={() => handleRevokeSession(staff)}
                          className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
                          title={getTranslation("সেশন টার্মিনেট করুন (Logout Session)", "Terminate Active Session")}
                        >
                          <LogOut className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center space-x-1">
                        {/* Active / Inactive Toggle Switch */}
                        <button
                          onClick={() => handleToggleStatus(staff)}
                          disabled={isSuper}
                          className={`px-2.5 py-1 rounded-xl text-[11px] font-black transition cursor-pointer ${
                            isSuper 
                              ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                              : staff.status === "active"
                                ? "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                          }`}
                        >
                          {staff.status === "active" ? getTranslation("নিষ্ক্রিয় করুন", "Deactivate") : getTranslation("সক্রিয় করুন", "Activate")}
                        </button>

                        {/* Delete Staff Button (Disabled for Super Admin) */}
                        <button
                          onClick={() => setSelectedStaffForDelete(staff)}
                          disabled={isSuper}
                          className={`p-2 rounded-xl transition cursor-pointer ${
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

              {/* Staff ID */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">
                  {getTranslation("স্টাফ আইডি (ঐচ্ছিক)", "Staff ID (Optional)")}
                </label>
                <input
                  type="text"
                  value={formStaffId}
                  onChange={(e) => setFormStaffId(e.target.value)}
                  placeholder={`e.g. KB-STF-${String(staffList.length + 1).padStart(3, "0")}`}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
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
              <table className="w-full text-left text-xs border-collapse">
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
                <table className="w-full text-left text-xs border-collapse">
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
      {/* MODAL 1: VIEW STAFF DETAILS */}
      {/* ========================================================================= */}
      {selectedStaffForView && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-xl animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-black text-slate-800 text-sm flex items-center space-x-2">
                <Users className="w-4 h-4 text-emerald-600" />
                <span>{getTranslation("স্টাফ প্রোফাইল বিবরণ", "Staff Profile Details")}</span>
              </h3>
              <button
                onClick={() => setSelectedStaffForView(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="text-center pb-4 border-b border-slate-100">
              <img
                src={selectedStaffForView.photoURL || PRESET_AVATARS[0]}
                alt={selectedStaffForView.fullName}
                className="w-20 h-20 rounded-3xl object-cover mx-auto border-4 border-emerald-100 shadow"
              />
              <h4 className="font-black text-slate-800 text-base mt-3">{selectedStaffForView.fullName}</h4>
              <p className="text-xs text-slate-400 font-bold">{selectedStaffForView.staffId}</p>
              <div className="mt-2 flex items-center justify-center gap-2">
                <span className={`px-2.5 py-1 rounded-xl text-xs font-black ${getRoleDef(selectedStaffForView.role).badgeColor}`}>
                  {getRoleDef(selectedStaffForView.role).icon} {getTranslation(getRoleDef(selectedStaffForView.role).nameBn, getRoleDef(selectedStaffForView.role).nameEn)}
                </span>
                <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${
                  selectedStaffForView.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                }`}>
                  {selectedStaffForView.status === "active" ? "Active" : "Inactive"}
                </span>
              </div>
            </div>

            <div className="py-4 space-y-2.5 text-xs text-slate-700">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">{getTranslation("মোবাইল:", "Mobile:")}</span>
                <span className="font-bold text-slate-800">{selectedStaffForView.mobile}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">{getTranslation("ইমেইল:", "Email:")}</span>
                <span className="font-bold text-slate-800">{selectedStaffForView.email}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">{getTranslation("উপস্থিতি স্ট্যাটাস:", "Online Presence:")}</span>
                <span className="font-bold text-slate-800">
                  {selectedStaffForView.onlineStatus === "online" ? "🟢 Online" : selectedStaffForView.onlineStatus === "away" ? "🟡 Away" : "🔴 Offline"}
                </span>
              </div>
              {selectedStaffForView.assignedAgentDesk && (
                <div className="flex justify-between py-1 border-b border-slate-50 text-teal-800 font-bold">
                  <span>{getTranslation("কল সেন্টার ডেস্ক:", "Call Center Desk:")}</span>
                  <span>Desk #{selectedStaffForView.assignedAgentDesk}</span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">{getTranslation("তৈরির তারিখ:", "Created At:")}</span>
                <span className="font-bold text-slate-800">
                  {selectedStaffForView.createdAt ? new Date(selectedStaffForView.createdAt).toLocaleDateString() : "N/A"}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-2">
              <button
                onClick={() => setSelectedStaffForView(null)}
                className="w-full py-2.5 bg-slate-900 text-white rounded-2xl text-xs font-black hover:bg-slate-800 transition cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-slate-200 shadow-xl animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-black text-slate-800 text-sm flex items-center space-x-2">
                <Edit2 className="w-4 h-4 text-blue-600" />
                <span>{getTranslation("স্টাফ তথ্য এডিট করুন", "Edit Staff Information")}</span>
              </h3>
              <button
                onClick={() => setSelectedStaffForEdit(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditStaffSubmit} className="space-y-4">
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
                  <label className="block text-xs font-black text-slate-700 mb-1">{getTranslation("ইমেইল", "Email")}</label>
                  <input
                    type="email"
                    required
                    value={selectedStaffForEdit.email}
                    onChange={(e) => setSelectedStaffForEdit({ ...selectedStaffForEdit, email: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
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

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedStaffForEdit(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600"
                >
                  {getTranslation("বাতিল", "Cancel")}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-black shadow hover:bg-blue-500"
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
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col border border-slate-200 shadow-xl animate-scale-up">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
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

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
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

            <div className="p-4 border-t border-slate-100 flex items-center justify-between shrink-0 bg-slate-50 rounded-b-3xl">
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
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 border border-slate-200 shadow-xl animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
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

            <p className="text-xs text-slate-600 mb-4">
              {getTranslation(
                `স্টাফ ${selectedStaffForPassword.fullName} (${selectedStaffForPassword.staffId})-এর জন্য নতুন পাসওয়ার্ড দিন:`,
                `Enter new secure password for ${selectedStaffForPassword.fullName}:`
              )}
            </p>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
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

              <div className="flex justify-end space-x-2 pt-2">
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
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 border border-slate-200 shadow-xl animate-scale-up text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h4 className="font-black text-slate-800 text-base">
              {getTranslation("স্টাফ অ্যাকাউন্ট মুছে ফেলতে চান?", "Delete Staff Account?")}
            </h4>
            <p className="text-xs text-slate-500 mt-2">
              {getTranslation(
                `আপনি কি নিশ্চিত যে "${selectedStaffForDelete.fullName}" (${selectedStaffForDelete.staffId})-কে স্থায়ীভাবে মুছে ফেলতে চান?`,
                `Are you sure you want to permanently delete "${selectedStaffForDelete.fullName}" (${selectedStaffForDelete.staffId})?`
              )}
            </p>

            <div className="flex items-center justify-center space-x-3 mt-6">
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

    </div>
  );
}
