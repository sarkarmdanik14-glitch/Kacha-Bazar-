import React, { useState, useEffect, useRef } from "react";
import { 
  User, Award, Upload, RefreshCw, Check, Sparkles, 
  Image as ImageIcon, Camera, Save, RefreshCcw, Plus, Trash2, Edit, X, Link as LinkIcon
} from "lucide-react";
import { db, doc, getDoc, setDoc, onSnapshot } from "../../lib/firebase";

import chairmanDefaultImg from "../../assets/images/chairman_hosne_ara_1784735275933.jpg";
import viceChairmanDefaultImg from "../../assets/images/vice_chairman_abu_hanif_1784735297437.jpg";
import founderDefaultImg from "../../assets/images/founder_md_anik_1784735314684.jpg";

export interface LeadershipMember {
  id: string;
  roleEn: string;
  roleBn: string;
  nameEn: string;
  nameBn: string;
  image: string;
  titleEn?: string;
  titleBn?: string;
  badgeColor?: string;
  borderColor?: string;
  iconBg?: string;
  isDefault?: boolean;
}

interface AdminLeadershipTabProps {
  lang: "bn" | "en";
  triggerToast: (bn: string, en: string) => void;
}

export default function AdminLeadershipTab({ lang, triggerToast }: AdminLeadershipTabProps) {
  const getTranslation = (bn: string, en: string) => (lang === "bn" ? bn : en);

  // Default core members
  const defaultProfiles: Record<string, LeadershipMember> = {
    chairman: {
      id: "chairman",
      roleEn: "CHAIRMAN",
      roleBn: "চেয়ারম্যান",
      nameEn: "MST HOSNE ARA BEGUM",
      nameBn: "এমএসটি হোসনে আরা বেগম",
      image: chairmanDefaultImg,
      titleEn: "Chairman, Kacha Bazar",
      titleBn: "চেয়ারম্যান, কাচা বাজার",
      badgeColor: "bg-amber-500/10 text-amber-500 border-amber-500/30",
      borderColor: "border-amber-500/80",
      iconBg: "bg-amber-600",
      isDefault: true
    },
    viceChairman: {
      id: "viceChairman",
      roleEn: "VICE CHAIRMAN",
      roleBn: "ভাইস চেয়ারম্যান",
      nameEn: "MD ABU HANIF SARKAR",
      nameBn: "মোঃ আবু হানিফ সরকার",
      image: viceChairmanDefaultImg,
      titleEn: "Vice Chairman, Kacha Bazar",
      titleBn: "ভাইস চেয়ারম্যান, কাচা বাজার",
      badgeColor: "bg-sky-500/10 text-sky-500 border-sky-500/30",
      borderColor: "border-sky-500/80",
      iconBg: "bg-sky-600",
      isDefault: true
    },
    founder: {
      id: "founder",
      roleEn: "FOUNDER",
      roleBn: "প্রতিষ্ঠাতা",
      nameEn: "MD ANIK SARKAR",
      nameBn: "মোঃ অনিক সরকার",
      image: founderDefaultImg,
      titleEn: "Founder & Creator",
      titleBn: "প্রতিষ্ঠাতা ও উদ্ভাবক",
      badgeColor: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
      borderColor: "border-emerald-500/80",
      iconBg: "bg-emerald-600",
      isDefault: true
    }
  };

  const [defaults, setDefaults] = useState<Record<string, LeadershipMember>>(defaultProfiles);
  const [additionalMembers, setAdditionalMembers] = useState<LeadershipMember[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [uploadingImageId, setUploadingImageId] = useState<string | null>(null);

  // New Member Modal/Form state
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newRoleEn, setNewRoleEn] = useState<string>("");
  const [newRoleBn, setNewRoleBn] = useState<string>("");
  const [newNameEn, setNewNameEn] = useState<string>("");
  const [newNameBn, setNewNameBn] = useState<string>("");
  const [newTitleEn, setNewTitleEn] = useState<string>("");
  const [newTitleBn, setNewTitleBn] = useState<string>("");
  const [newImage, setNewImage] = useState<string>("");
  const [newUploading, setNewUploading] = useState<boolean>(false);

  // Input file refs
  const fileInputRefMap = useRef<Record<string, HTMLInputElement | null>>({});
  const newMemberFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Listen in real-time to doc settings/leadership
    const unsub = onSnapshot(doc(db, "settings", "leadership"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setDefaults({
          chairman: { ...defaultProfiles.chairman, ...(data.chairman || {}) },
          viceChairman: { ...defaultProfiles.viceChairman, ...(data.viceChairman || {}) },
          founder: { ...defaultProfiles.founder, ...(data.founder || {}) }
        });
        if (Array.isArray(data.additionalMembers)) {
          setAdditionalMembers(data.additionalMembers);
        } else {
          setAdditionalMembers([]);
        }
      }
      setLoading(false);
    }, (error) => {
      console.error("Leadership listener error:", error);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Product-management style image upload handler
  const processImageUpload = async (file: File): Promise<string> => {
    try {
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "demo";
      const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "unsigned_preset";

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
    } catch (err) {
      console.warn("Cloudinary upload failed, falling back to FileReader base64:", err);
    }

    // Fallback to FileReader Base64 string
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
        } else {
          reject(new Error("Failed to process image"));
        }
      };
      reader.onerror = () => reject(new Error("File reading error"));
      reader.readAsDataURL(file);
    });
  };

  // Handle image upload for default core member
  const handleDefaultImageUpload = async (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImageId(key);
    try {
      const imageUrl = await processImageUpload(file);
      setDefaults(prev => ({
        ...prev,
        [key]: { ...prev[key], image: imageUrl }
      }));
      triggerToast(
        "ছবি সফলভাবে নির্বাচন করা হয়েছে! সেভ/আপডেট বাটন চাপুন।",
        "Image selected successfully! Click Save/Update to submit."
      );
    } catch (err) {
      console.error("Image upload failed:", err);
      triggerToast("ছবি প্রসেস করতে ব্যর্থ হয়েছে!", "Failed to process image file.");
    } finally {
      setUploadingImageId(null);
    }
  };

  // Handle image upload for additional member
  const handleAdditionalMemberImageUpload = async (memberId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImageId(memberId);
    try {
      const imageUrl = await processImageUpload(file);
      setAdditionalMembers(prev => prev.map(m => m.id === memberId ? { ...m, image: imageUrl } : m));
      triggerToast(
        "ছবি সফলভাবে নির্বাচন করা হয়েছে! আপডেট করুন।",
        "Image selected successfully! Save to apply changes."
      );
    } catch (err) {
      console.error("Image upload failed:", err);
      triggerToast("ছবি প্রসেস করতে সমস্যা হয়েছে!", "Failed to process image file.");
    } finally {
      setUploadingImageId(null);
    }
  };

  // Handle image upload for New Member creation form
  const handleNewMemberImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setNewUploading(true);
    try {
      const imageUrl = await processImageUpload(file);
      setNewImage(imageUrl);
      triggerToast("নতুন সদস্যের ছবি আপলোড হয়েছে!", "New member image uploaded!");
    } catch (err) {
      console.error("Upload error:", err);
      triggerToast("ছবি আপলোড ব্যর্থ হয়েছে!", "Image upload failed!");
    } finally {
      setNewUploading(false);
    }
  };

  // Save changes for default member (Chairman, Vice Chairman, Founder)
  const handleSaveDefaultProfile = async (key: string) => {
    setSavingKey(key);
    try {
      const profile = defaults[key];
      const formatted = {
        ...profile,
        nameEn: profile.nameEn.trim().toUpperCase(),
        roleEn: profile.roleEn.trim().toUpperCase()
      };

      const docRef = doc(db, "settings", "leadership");
      const docSnap = await getDoc(docRef);
      const currentData = docSnap.exists() ? docSnap.data() : {};

      const nextData = {
        ...currentData,
        [key]: formatted,
        updatedAt: new Date().toISOString()
      };

      await setDoc(docRef, nextData, { merge: true });

      triggerToast(
        `${getTranslation(formatted.roleBn, formatted.roleEn)} প্রোফাইল আপডেট সম্পন্ন হয়েছে!`,
        `${formatted.roleEn} profile successfully updated!`
      );
    } catch (err) {
      console.error("Error saving default profile:", err);
      triggerToast("প্রোফাইল সেভ করতে সমস্যা হয়েছে!", "Failed to save profile.");
    } finally {
      setSavingKey(null);
    }
  };

  // Save changes for all additional members or update single additional member
  const handleSaveAdditionalMember = async (updatedMember: LeadershipMember) => {
    setSavingKey(updatedMember.id);
    try {
      const formattedMember = {
        ...updatedMember,
        nameEn: updatedMember.nameEn.trim().toUpperCase(),
        roleEn: updatedMember.roleEn.trim().toUpperCase()
      };

      const nextList = additionalMembers.map(m => m.id === updatedMember.id ? formattedMember : m);
      setAdditionalMembers(nextList);

      const docRef = doc(db, "settings", "leadership");
      const docSnap = await getDoc(docRef);
      const currentData = docSnap.exists() ? docSnap.data() : {};

      await setDoc(docRef, {
        ...currentData,
        additionalMembers: nextList,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      triggerToast(
        `${getTranslation(formattedMember.roleBn, formattedMember.roleEn)} তথ্য আপডেট হয়েছে!`,
        `${formattedMember.roleEn} details updated!`
      );
    } catch (err) {
      console.error("Error updating member:", err);
      triggerToast("আপডেট করতে ব্যর্থ হয়েছে!", "Failed to update member.");
    } finally {
      setSavingKey(null);
    }
  };

  // Delete an additional member
  const handleDeleteAdditionalMember = async (memberId: string) => {
    if (!confirm(getTranslation("আপনি কি নিশ্চিত যে এই সদস্য মুছে ফেলতে চান?", "Are you sure you want to delete this member?"))) return;

    setSavingKey(memberId);
    try {
      const nextList = additionalMembers.filter(m => m.id !== memberId);
      setAdditionalMembers(nextList);

      const docRef = doc(db, "settings", "leadership");
      const docSnap = await getDoc(docRef);
      const currentData = docSnap.exists() ? docSnap.data() : {};

      await setDoc(docRef, {
        ...currentData,
        additionalMembers: nextList,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      triggerToast(
        "সদস্য সফলভাবে মুছে ফেলা হয়েছে!",
        "Member deleted successfully!"
      );
    } catch (err) {
      console.error("Error deleting member:", err);
      triggerToast("সদস্য মুছতে সমস্যা হয়েছে!", "Failed to delete member.");
    } finally {
      setSavingKey(null);
    }
  };

  // Add new additional member
  const handleCreateNewMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNameEn.trim() || !newRoleEn.trim()) {
      triggerToast("দয়া করে নাম ও পদবী বাংলায়/ইংরেজিতে পূরণ করুন!", "Please enter role/position and name!");
      return;
    }

    setSavingKey("new_member");
    try {
      const memberId = "leader_" + Date.now().toString(36);
      const colorPalettes = [
        { badge: "bg-purple-500/10 text-purple-600 border-purple-500/30", border: "border-purple-500/80", icon: "bg-purple-600" },
        { badge: "bg-indigo-500/10 text-indigo-600 border-indigo-500/30", border: "border-indigo-500/80", icon: "bg-indigo-600" },
        { badge: "bg-rose-500/10 text-rose-600 border-rose-500/30", border: "border-rose-500/80", icon: "bg-rose-600" },
        { badge: "bg-teal-500/10 text-teal-600 border-teal-500/30", border: "border-teal-500/80", icon: "bg-teal-600" },
      ];
      const randomPalette = colorPalettes[additionalMembers.length % colorPalettes.length];

      const newMember: LeadershipMember = {
        id: memberId,
        roleEn: newRoleEn.trim().toUpperCase(),
        roleBn: newRoleBn.trim() || newRoleEn.trim(),
        nameEn: newNameEn.trim().toUpperCase(),
        nameBn: newNameBn.trim() || newNameEn.trim(),
        image: newImage.trim() || chairmanDefaultImg,
        titleEn: newTitleEn.trim() || `${newRoleEn.trim()}, Kacha Bazar`,
        titleBn: newTitleBn.trim() || `${newRoleBn.trim() || newRoleEn.trim()}, কাচা বাজার`,
        badgeColor: randomPalette.badge,
        borderColor: randomPalette.border,
        iconBg: randomPalette.icon,
        isDefault: false
      };

      const nextList = [...additionalMembers, newMember];

      const docRef = doc(db, "settings", "leadership");
      const docSnap = await getDoc(docRef);
      const currentData = docSnap.exists() ? docSnap.data() : {};

      await setDoc(docRef, {
        ...currentData,
        additionalMembers: nextList,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Reset form
      setNewRoleEn("");
      setNewRoleBn("");
      setNewNameEn("");
      setNewNameBn("");
      setNewTitleEn("");
      setNewTitleBn("");
      setNewImage("");
      setShowAddModal(false);

      triggerToast(
        "নতুন সদস্য সফলভাবে সংযুক্ত হয়েছে!",
        "New leadership member added successfully!"
      );
    } catch (err) {
      console.error("Error creating member:", err);
      triggerToast("নতুন সদস্য তৈরি করতে ব্যর্থ হয়েছে!", "Failed to add new member.");
    } finally {
      setSavingKey(null);
    }
  };

  const handleResetDefault = async (key: string) => {
    if (!confirm(getTranslation("ডিফল্ট তথ্যে ফিরে যেতে চান?", "Reset profile to default values?"))) return;

    setSavingKey(key);
    try {
      const defaultData = defaultProfiles[key];
      const docRef = doc(db, "settings", "leadership");
      const docSnap = await getDoc(docRef);
      const currentData = docSnap.exists() ? docSnap.data() : {};

      await setDoc(docRef, {
        ...currentData,
        [key]: defaultData,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      triggerToast(
        `${getTranslation(defaultData.roleBn, defaultData.roleEn)} ডিফল্ট হিসেবে রিসেট হয়েছে!`,
        `${defaultData.roleEn} reset to default!`
      );
    } catch (err) {
      console.error("Reset error:", err);
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  const defaultKeys = ["chairman", "viceChairman", "founder"] as const;

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-emerald-950 rounded-3xl p-6 text-white shadow-md relative overflow-hidden border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600/30 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black">
              {getTranslation("বোর্ড অফ ডিরেক্টর্স ও নেতৃত্ব ব্যবস্থাপনা", "Board of Directors & Leadership Management")}
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              {getTranslation(
                "চেয়ারম্যান, ভাইস চেয়ারম্যান, প্রতিষ্ঠাতা এবং অতিরিক্ত যেকোনো নতুন বোর্ড সদস্য যোগ ও তাদের তথ্য রিয়েল-টাইমে আপডেট করুন।",
                "Manage executive profiles or add unlimited new leadership board members displayed across the website footer."
              )}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs px-4 py-3 rounded-2xl shadow-lg transition flex items-center gap-2 cursor-pointer shrink-0 uppercase tracking-wider"
        >
          <Plus className="w-4 h-4" />
          <span>{getTranslation("নতুন সদস্য যোগ করুন", "Add New Member")}</span>
        </button>
      </div>

      {/* CORE DEFAULT MEMBERS SECTION */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
            {getTranslation("মূল পরিচালনা পর্ষদ (প্রধান ৩ পদ)", "Core Executive Board (Main 3 Positions)")}
          </h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {defaultKeys.map((key) => {
            const profile = defaults[key];
            const isSaving = savingKey === key;
            const isUploading = uploadingImageId === key;

            return (
              <div 
                key={key} 
                className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-5"
              >
                <div>
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                    <span className={`text-[10px] sm:text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full border ${profile.badgeColor}`}>
                      {profile.roleEn}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                      ID: {profile.id}
                    </span>
                  </div>

                  {/* Profile Photo Upload & Preview */}
                  <div className="flex flex-col items-center text-center my-4">
                    <div className="relative group">
                      <img
                        src={profile.image}
                        alt={`${profile.nameEn} - ${profile.roleEn}`}
                        className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full object-cover border-4 ${profile.borderColor} shadow-lg transition-transform group-hover:scale-105`}
                        referrerPolicy="no-referrer"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRefMap.current[key]?.click()}
                        className="absolute bottom-1 right-1 bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-full border-2 border-white shadow-md transition cursor-pointer"
                        title={getTranslation("ছবি পরিবর্তন করুন", "Change Photo")}
                      >
                        <Camera className="w-4 h-4" />
                      </button>

                      {isUploading && (
                        <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center text-white">
                          <RefreshCw className="w-6 h-6 animate-spin" />
                        </div>
                      )}
                    </div>

                    <input
                      type="file"
                      ref={(el) => { fileInputRefMap.current[key] = el; }}
                      accept="image/*"
                      onChange={(e) => handleDefaultImageUpload(key, e)}
                      className="hidden"
                    />

                    <div className="flex items-center gap-2 mt-3">
                      <button
                        type="button"
                        onClick={() => fileInputRefMap.current[key]?.click()}
                        className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200/60 transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{getTranslation("ছবি আপলোড করুন", "Upload Photo")}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleResetDefault(key)}
                        className="text-[11px] font-bold text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                        title={getTranslation("ডিফল্টে রিসেট করুন", "Reset to Default")}
                      >
                        <RefreshCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Form Inputs */}
                  <div className="space-y-3 text-left mt-4">
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                        {getTranslation("ছবি লিংক (Image URL)", "Image URL")}
                      </label>
                      <input
                        type="text"
                        value={profile.image}
                        onChange={(e) => setDefaults(prev => ({
                          ...prev,
                          [key]: { ...prev[key], image: e.target.value }
                        }))}
                        placeholder="https://..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 focus:bg-white focus:border-emerald-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                        {getTranslation("নাম (ইংরেজি)", "Name (English - Uppercase)")}
                      </label>
                      <input
                        type="text"
                        value={profile.nameEn}
                        onChange={(e) => setDefaults(prev => ({
                          ...prev,
                          [key]: { ...prev[key], nameEn: e.target.value.toUpperCase() }
                        }))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-slate-800 focus:bg-white focus:border-emerald-500 outline-none uppercase"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                        {getTranslation("নাম (বাংলা)", "Name (Bangla)")}
                      </label>
                      <input
                        type="text"
                        value={profile.nameBn}
                        onChange={(e) => setDefaults(prev => ({
                          ...prev,
                          [key]: { ...prev[key], nameBn: e.target.value }
                        }))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleSaveDefaultProfile(key)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-xs py-2.5 px-4 rounded-xl shadow-sm transition flex items-center justify-center space-x-2 cursor-pointer uppercase disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>{getTranslation("সংরক্ষণ হচ্ছে...", "Saving...")}</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>{getTranslation("সেভ / আপডেট করুন", "Save / Update")}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ADDITIONAL MEMBERS SECTION */}
      <div className="pt-6 border-t border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-purple-600" />
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
              {getTranslation("অতিরিক্ত বোর্ড সদস্যবৃন্দ", "Additional Board Members")} ({additionalMembers.length})
            </h3>
          </div>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 px-3.5 py-2 rounded-xl border border-purple-200/60 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{getTranslation("নতুন সদস্য যুক্ত করুন", "Add Member")}</span>
          </button>
        </div>

        {additionalMembers.length === 0 ? (
          <div className="bg-slate-50 border border-dashed border-slate-300 rounded-3xl p-8 text-center text-slate-500">
            <User className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-xs font-bold">
              {getTranslation(
                "এখনো কোনো অতিরিক্ত সদস্য যুক্ত করা হয়নি। 'নতুন সদস্য যোগ করুন' বাটনে ক্লিক করে যোগ করতে পারেন।",
                "No additional members added yet. Click 'Add New Member' to append more executive leaders."
              )}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {additionalMembers.map((member) => {
              const isSaving = savingKey === member.id;
              const isUploading = uploadingImageId === member.id;

              return (
                <div 
                  key={member.id} 
                  className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                        {member.roleEn || "MEMBER"}
                      </span>
                      
                      <button
                        type="button"
                        onClick={() => handleDeleteAdditionalMember(member.id)}
                        className="text-red-500 hover:text-red-700 p-1 rounded-lg hover:bg-red-50 transition cursor-pointer"
                        title={getTranslation("মুছে ফেলুন", "Delete Member")}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Member Image */}
                    <div className="flex flex-col items-center text-center my-3">
                      <div className="relative group">
                        <img
                          src={member.image}
                          alt={member.nameEn}
                          className="w-24 h-24 rounded-full object-cover border-4 border-purple-500/80 shadow-md transition-transform group-hover:scale-105"
                          referrerPolicy="no-referrer"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRefMap.current[member.id]?.click()}
                          className="absolute bottom-0 right-0 bg-purple-600 hover:bg-purple-700 text-white p-1.5 rounded-full border-2 border-white shadow transition cursor-pointer"
                        >
                          <Camera className="w-3.5 h-3.5" />
                        </button>

                        {isUploading && (
                          <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center text-white">
                            <RefreshCw className="w-5 h-5 animate-spin" />
                          </div>
                        )}
                      </div>

                      <input
                        type="file"
                        ref={(el) => { fileInputRefMap.current[member.id] = el; }}
                        accept="image/*"
                        onChange={(e) => handleAdditionalMemberImageUpload(member.id, e)}
                        className="hidden"
                      />

                      <button
                        type="button"
                        onClick={() => fileInputRefMap.current[member.id]?.click()}
                        className="text-[11px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 px-3 py-1 rounded-lg border border-purple-200/60 transition mt-2 flex items-center gap-1 cursor-pointer"
                      >
                        <Upload className="w-3 h-3" />
                        <span>{getTranslation("ছবি পরিবর্তন করুন", "Change Photo")}</span>
                      </button>
                    </div>

                    {/* Member Details Input */}
                    <div className="space-y-2 text-left mt-3">
                      <div>
                        <label className="block text-[9px] font-extrabold uppercase text-slate-400">
                          {getTranslation("পদবী (ইংরেজি)", "Position / Role (English)")}
                        </label>
                        <input
                          type="text"
                          value={member.roleEn}
                          onChange={(e) => {
                            const val = e.target.value.toUpperCase();
                            setAdditionalMembers(prev => prev.map(m => m.id === member.id ? { ...m, roleEn: val } : m));
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none uppercase"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-extrabold uppercase text-slate-400">
                          {getTranslation("পদবী (বাংলা)", "Position / Role (Bangla)")}
                        </label>
                        <input
                          type="text"
                          value={member.roleBn}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAdditionalMembers(prev => prev.map(m => m.id === member.id ? { ...m, roleBn: val } : m));
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-extrabold uppercase text-slate-400">
                          {getTranslation("নাম (ইংরেজি)", "Name (English)")}
                        </label>
                        <input
                          type="text"
                          value={member.nameEn}
                          onChange={(e) => {
                            const val = e.target.value.toUpperCase();
                            setAdditionalMembers(prev => prev.map(m => m.id === member.id ? { ...m, nameEn: val } : m));
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-black text-slate-800 outline-none uppercase"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-extrabold uppercase text-slate-400">
                          {getTranslation("নাম (বাংলা)", "Name (Bangla)")}
                        </label>
                        <input
                          type="text"
                          value={member.nameBn}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAdditionalMembers(prev => prev.map(m => m.id === member.id ? { ...m, nameBn: val } : m));
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-extrabold uppercase text-slate-400">
                          {getTranslation("ছবি লিংক (Image URL)", "Image URL")}
                        </label>
                        <input
                          type="text"
                          value={member.image}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAdditionalMembers(prev => prev.map(m => m.id === member.id ? { ...m, image: val } : m));
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-[11px] text-slate-600 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleSaveAdditionalMember(member)}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black text-xs py-2 px-3 rounded-xl shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer uppercase disabled:opacity-50"
                    >
                      {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      <span>{getTranslation("আপডেট সেভ করুন", "Save Updates")}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CREATE NEW MEMBER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="max-h-[85vh] sm:max-h-[90vh] flex flex-col w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden animate-scale-up">
            <div className="flex-shrink-0 bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Award className="w-5 h-5 text-emerald-400" />
                <h3 className="font-black text-base">
                  {getTranslation("নতুন বোর্ড সদস্য সংযুক্ত করুন", "Add New Board Member")}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewMember} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="overflow-y-auto flex-1 p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                    {getTranslation("পদবী (ইংরেজি)", "Position (English) *")}
                  </label>
                  <input
                    type="text"
                    required
                    value={newRoleEn}
                    onChange={(e) => setNewRoleEn(e.target.value)}
                    placeholder="e.g. DIRECTOR / CEO"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-500 outline-none uppercase"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                    {getTranslation("পদবী (বাংলা)", "Position (Bangla)")}
                  </label>
                  <input
                    type="text"
                    value={newRoleBn}
                    onChange={(e) => setNewRoleBn(e.target.value)}
                    placeholder="যেমনঃ পরিচালক"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                    {getTranslation("নাম (ইংরেজি)", "Name (English) *")}
                  </label>
                  <input
                    type="text"
                    required
                    value={newNameEn}
                    onChange={(e) => setNewNameEn(e.target.value)}
                    placeholder="e.g. KARIM RAHMAN"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-slate-800 focus:bg-white focus:border-emerald-500 outline-none uppercase"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                    {getTranslation("নাম (বাংলা)", "Name (Bangla)")}
                  </label>
                  <input
                    type="text"
                    value={newNameBn}
                    onChange={(e) => setNewNameBn(e.target.value)}
                    placeholder="যেমনঃ করিম রহমান"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              {/* Image Selection - File upload & Direct URL */}
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                  {getTranslation("প্রোফাইল ছবি (Image Upload / URL)", "Profile Image (Upload or URL)")}
                </label>

                <div className="flex items-center gap-3 mb-2">
                  <input
                    type="file"
                    ref={newMemberFileRef}
                    accept="image/*"
                    onChange={handleNewMemberImageUpload}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => newMemberFileRef.current?.click()}
                    disabled={newUploading}
                    className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs px-3.5 py-2 rounded-xl border border-emerald-200 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {newUploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    <span>{getTranslation("ছবি আপলোড করুন", "Upload Image File")}</span>
                  </button>

                  {newImage && (
                    <img 
                      src={newImage} 
                      alt="Preview" 
                      className="w-10 h-10 rounded-full object-cover border-2 border-emerald-500 shadow-sm"
                    />
                  )}
                </div>

                <input
                  type="text"
                  value={newImage}
                  onChange={(e) => setNewImage(e.target.value)}
                  placeholder="https://example.com/photo.jpg"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:bg-white focus:border-emerald-500 outline-none"
                />
              </div>
              </div>

              {/* Fixed Footer */}
              <div className="flex-shrink-0 p-4 border-t flex flex-wrap gap-2 justify-end bg-gray-50/50">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs transition cursor-pointer"
                >
                  {getTranslation("বাতিল", "Cancel")}
                </button>

                <button
                  type="submit"
                  disabled={savingKey === "new_member"}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50 uppercase"
                >
                  {savingKey === "new_member" ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{getTranslation("সংরক্ষণ হচ্ছে...", "Saving...")}</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>{getTranslation("সংরক্ষণ করুন", "Save Member")}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
