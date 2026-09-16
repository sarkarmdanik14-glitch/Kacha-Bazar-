import React, { useState, useRef, useEffect } from "react";
import { 
  Plus, Edit, Trash2, Upload, Download, Check, X, RefreshCw, 
  Layers, ChevronRight, FileText, ImageIcon, ArrowUp, ArrowDown,
  Eye, EyeOff, Search, Filter, CheckCircle2, XCircle, Salad,
  Grid, Tag, Settings, Sparkles, Package, FolderPlus, Flame, Coffee, Apple, Milk, ShoppingBag, Sliders, Fish
} from "lucide-react";
import { db, doc, setDoc, updateDoc, deleteDoc, collection, addDoc } from "../../lib/firebase";
import { ProductOption } from "../../types";
import DeleteProductConfirmModal from "./DeleteProductConfirmModal";

interface AdminProductsTabProps {
  products: any[];
  categories: any[];
  orders?: any[];
  user?: any;
  lang: "bn" | "en";
  triggerToast: (bn: string, en: string) => void;
}

export default function AdminProductsTab({ products, categories, orders = [], user, lang, triggerToast }: AdminProductsTabProps) {
  const getTranslation = (bn: string, en: string) => (lang === "bn" ? bn : en);

  // Delete Confirmation Modal state & optimistically deleted products set
  const [productPendingDelete, setProductPendingDelete] = useState<any | null>(null);
  const [deletedProductIds, setDeletedProductIds] = useState<Set<string>>(new Set());

  const isProductDeleted = (p: any) => {
    return deletedProductIds.has(p.id) || p.isDeleted === true || p.status === "deleted" || p.status === "inactive_deleted" || p.deleted === true;
  };

  const handleDeleteSuccess = (deletedId: string) => {
    setDeletedProductIds(prev => new Set(prev).add(deletedId));
  };

  // Subtab navigation: "category_manager" is the default subtab for focused category & product management
  const [activeCatalogSubTab, setActiveCatalogSubTab] = useState<"category_manager" | "products" | "categories" | "bulk">("category_manager");

  // Selected Category ID for Category Manager view (defaults to "vegetables" - তাজা শাক ও সবজি)
  const [selectedCatId, setSelectedCatId] = useState<string>("vegetables");

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [catProductSearchTerm, setCatProductSearchTerm] = useState<string>("");
  const [catProductStatusFilter, setCatProductStatusFilter] = useState<"all" | "active" | "disabled" | "low_stock">("all");

  // Form states for Product
  const [showProductForm, setShowProductForm] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [prodId, setProdId] = useState<string>("");
  const [prodNameEn, setProdNameEn] = useState<string>("");
  const [prodNameBn, setProdNameBn] = useState<string>("");
  const [prodPrice, setProdPrice] = useState<number>(0);
  const [prodOrigPrice, setProdOrigPrice] = useState<number>(0);
  const [prodUnitEn, setProdUnitEn] = useState<string>("");
  const [prodUnitBn, setProdUnitBn] = useState<string>("");
  const [prodCategory, setProdCategory] = useState<string>("");
  const [prodStock, setProdStock] = useState<number>(10);
  const [prodImage, setProdImage] = useState<string>("");
  const [prodDescEn, setProdDescEn] = useState<string>("");
  const [prodDescBn, setProdDescBn] = useState<string>("");
  const [prodBrand, setProdBrand] = useState<string>("");
  const [prodSku, setProdSku] = useState<string>("");
  const [prodOptions, setProdOptions] = useState<ProductOption[]>([]);
  const [prodIsAvailable, setProdIsAvailable] = useState<boolean>(true);
  const [prodDisplayOrder, setProdDisplayOrder] = useState<number>(0);
  const [newOptValue, setNewOptValue] = useState<string>("");
  const [newOptUnit, setNewOptUnit] = useState<string>("g");
  const [newOptPrice, setNewOptPrice] = useState<string>("");
  const [newOptStock, setNewOptStock] = useState<string>("");
  const [savingProduct, setSavingProduct] = useState<boolean>(false);
  
  // Image Upload helper for Product
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Category Editor state
  const [catNameBn, setCatNameBn] = useState<string>("");
  const [catNameEn, setCatNameEn] = useState<string>("");
  const [catIcon, setCatIcon] = useState<string>("Salad");
  const [catImage, setCatImage] = useState<string>("");
  const [catColor, setCatColor] = useState<string>("bg-emerald-50 text-emerald-700");
  const [catBorder, setCatBorder] = useState<string>("border-emerald-100");
  const [savingCategory, setSavingCategory] = useState<boolean>(false);
  const [uploadingCatImage, setUploadingCatImage] = useState<boolean>(false);
  const catFileInputRef = useRef<HTMLInputElement>(null);

  // General Category Modal state (for creating/editing category in "categories" subtab)
  const [showCategoryModal, setShowCategoryModal] = useState<boolean>(false);
  const [editingCategoryModal, setEditingCategoryModal] = useState<any | null>(null);
  const [modalCatId, setModalCatId] = useState<string>("");
  const [modalCatNameBn, setModalCatNameBn] = useState<string>("");
  const [modalCatNameEn, setModalCatNameEn] = useState<string>("");
  const [modalCatIcon, setModalCatIcon] = useState<string>("Salad");
  const [modalCatImage, setModalCatImage] = useState<string>("");
  const [modalCatColor, setModalCatColor] = useState<string>("bg-emerald-50 text-emerald-700");
  const [modalCatBorder, setModalCatBorder] = useState<string>("border-emerald-100");
  const [modalCatIsAvailable, setModalCatIsAvailable] = useState<boolean>(true);
  const [modalCatDisplayOrder, setModalCatDisplayOrder] = useState<number>(0);
  const [savingCategoryModal, setSavingCategoryModal] = useState<boolean>(false);
  const [uploadingModalCatImage, setUploadingModalCatImage] = useState<boolean>(false);
  const modalCatFileInputRef = useRef<HTMLInputElement>(null);

  // Search & Filter for All Categories Subtab
  const [catSearchTerm, setCatSearchTerm] = useState<string>("");
  const [catStatusFilter, setCatStatusFilter] = useState<"all" | "active" | "disabled">("all");

  // Bulk CSV state
  const [bulkCsvText, setBulkCsvText] = useState<string>("");
  const [importingBulk, setImportingBulk] = useState<boolean>(false);

  // Load category information whenever selectedCatId changes
  useEffect(() => {
    const currentCat = categories.find(c => c.id === selectedCatId);
    if (currentCat) {
      setCatNameBn(currentCat.nameBn || "");
      setCatNameEn(currentCat.nameEn || "");
      setCatIcon(currentCat.iconName || "Salad");
      setCatImage(currentCat.image || currentCat.imageUrl || "");
      setCatColor(currentCat.colorClass || "bg-emerald-50 text-emerald-700");
      setCatBorder(currentCat.borderColor || "border-emerald-100");
    } else if (selectedCatId === "vegetables") {
      setCatNameBn("তাজা শাক-সবজি");
      setCatNameEn("Fresh Vegetables");
      setCatIcon("Salad");
      setCatImage("");
      setCatColor("bg-emerald-50 text-emerald-700");
      setCatBorder("border-emerald-100");
    }
  }, [selectedCatId, categories]);

  // Handle image upload for product via Cloudinary
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
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

      if (!res.ok) {
        throw new Error(`Cloudinary returned status ${res.status}`);
      }

      const data = await res.json();
      if (data.secure_url) {
        setProdImage(data.secure_url);
        triggerToast("ছবি সফলভাবে আপলোড হয়েছে!", "Image uploaded successfully!");
      } else {
        throw new Error("No secure_url returned");
      }
    } catch (err) {
      console.error("Cloudinary upload failed:", err);
      triggerToast("ছবি আপলোড ব্যর্থ হয়েছে!", "Image upload failed!");
    } finally {
      setUploadingImage(false);
    }
  };

  // Handle image upload for Category via Cloudinary
  const handleCatImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCatImage(true);
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

      if (!res.ok) {
        throw new Error(`Cloudinary returned status ${res.status}`);
      }

      const data = await res.json();
      if (data.secure_url) {
        setCatImage(data.secure_url);
        triggerToast("ক্যাটাগরি ছবি ক্লাউডিনারি-তে আপলোড হয়েছে!", "Category image uploaded successfully!");
      } else {
        throw new Error("No secure_url returned");
      }
    } catch (err) {
      console.error("Cloudinary category image upload failed:", err);
      triggerToast("ছবি আপলোড ব্যর্থ হয়েছে!", "Category image upload failed!");
    } finally {
      setUploadingCatImage(false);
    }
  };

  // Save Category Profile & Image Details
  const handleSaveCategoryDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCatId || !catNameBn.trim() || !catNameEn.trim()) {
      triggerToast("সব প্রয়োজনীয় তথ্য পূরণ করুন।", "Please fill all required category fields.");
      return;
    }

    setSavingCategory(true);
    try {
      const payload: any = {
        id: selectedCatId.trim().toLowerCase(),
        nameBn: catNameBn.trim(),
        nameEn: catNameEn.trim(),
        iconName: catIcon.trim() || "Salad",
        colorClass: catColor.trim() || "bg-emerald-50 text-emerald-700",
        borderColor: catBorder.trim() || "border-emerald-100",
        image: catImage.trim(),
        imageUrl: catImage.trim()
      };

      await setDoc(doc(db, "categories", payload.id), payload, { merge: true });
      triggerToast(
        `"${catNameBn}" ক্যাটাগরি তথ্য সফলভাবে সেভ হয়েছে!`,
        `Category "${catNameEn}" profile updated successfully!`
      );
    } catch (err) {
      console.error("Error updating category details:", err);
      triggerToast("ক্যাটাগরি সেভ করতে সমস্যা হয়েছে", "Failed to update category details");
    } finally {
      setSavingCategory(false);
    }
  };

  // Helper to render category Lucide icon
  const renderCategoryIcon = (iconName: string) => {
    switch (iconName?.toLowerCase()) {
      case "salad": return <Salad className="w-5 h-5" />;
      case "fish": return <Fish className="w-5 h-5" />;
      case "milk": return <Milk className="w-5 h-5" />;
      case "apple": return <Apple className="w-5 h-5" />;
      case "flame": return <Flame className="w-5 h-5" />;
      case "coffee": return <Coffee className="w-5 h-5" />;
      case "sparkles": return <Sparkles className="w-5 h-5" />;
      case "package": return <Package className="w-5 h-5" />;
      case "shoppingbag": return <ShoppingBag className="w-5 h-5" />;
      default: return <Salad className="w-5 h-5" />;
    }
  };

  // Open Modal to Add Category
  const handleOpenAddCategory = () => {
    setEditingCategoryModal(null);
    setModalCatId("");
    setModalCatNameBn("");
    setModalCatNameEn("");
    setModalCatIcon("Salad");
    setModalCatImage("");
    setModalCatColor("bg-emerald-50 text-emerald-700");
    setModalCatBorder("border-emerald-100");
    setModalCatIsAvailable(true);
    setModalCatDisplayOrder(categories.length + 1);
    setShowCategoryModal(true);
  };

  // Open Modal to Edit Category
  const handleOpenEditCategory = (c: any) => {
    setEditingCategoryModal(c);
    setModalCatId(c.id);
    setModalCatNameBn(c.nameBn || "");
    setModalCatNameEn(c.nameEn || "");
    setModalCatIcon(c.iconName || "Salad");
    setModalCatImage(c.image || c.imageUrl || "");
    setModalCatColor(c.colorClass || "bg-emerald-50 text-emerald-700");
    setModalCatBorder(c.borderColor || "border-emerald-100");
    setModalCatIsAvailable(c.isAvailable !== false && c.disabled !== true);
    setModalCatDisplayOrder(typeof c.displayOrder === "number" ? c.displayOrder : (typeof c.order === "number" ? c.order : 0));
    setShowCategoryModal(true);
  };

  // Modal Category Image Upload via Cloudinary
  const handleModalCatImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingModalCatImage(true);
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

      if (!res.ok) {
        throw new Error(`Cloudinary returned status ${res.status}`);
      }

      const data = await res.json();
      if (data.secure_url) {
        setModalCatImage(data.secure_url);
        triggerToast("ক্যাটাগরি ছবি ক্লাউডিনারি-তে আপলোড হয়েছে!", "Category image uploaded successfully!");
      } else {
        throw new Error("No secure_url returned");
      }
    } catch (err) {
      console.error("Cloudinary category image upload failed:", err);
      triggerToast("ছবি আপলোড ব্যর্থ হয়েছে!", "Category image upload failed!");
    } finally {
      setUploadingModalCatImage(false);
    }
  };

  // Save Modal Category
  const handleSaveCategoryModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalCatNameBn.trim() || !modalCatNameEn.trim()) {
      triggerToast("বাংলা ও ইংরেজি নাম প্রয়োজন", "Bangla & English names are required");
      return;
    }

    const finalId = editingCategoryModal 
      ? editingCategoryModal.id 
      : (modalCatId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_") || modalCatNameEn.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_"));

    if (!finalId) {
      triggerToast("ক্যাটাগরি আইডি প্রদান করুন", "Category ID is required");
      return;
    }

    setSavingCategoryModal(true);
    try {
      const payload: any = {
        id: finalId,
        nameBn: modalCatNameBn.trim(),
        nameEn: modalCatNameEn.trim(),
        iconName: modalCatIcon.trim() || "Salad",
        colorClass: modalCatColor.trim() || "bg-emerald-50 text-emerald-700",
        borderColor: modalCatBorder.trim() || "border-emerald-100",
        image: modalCatImage.trim(),
        imageUrl: modalCatImage.trim(),
        isAvailable: modalCatIsAvailable,
        disabled: !modalCatIsAvailable,
        displayOrder: Number(modalCatDisplayOrder) || 0,
        order: Number(modalCatDisplayOrder) || 0,
        updatedAt: new Date()
      };

      await setDoc(doc(db, "categories", finalId), payload, { merge: true });
      setSelectedCatId(finalId);
      triggerToast(
        `"${modalCatNameBn}" ক্যাটাগরি সফলভাবে সেভ করা হয়েছে!`,
        `Category "${modalCatNameEn}" saved successfully!`
      );
      setShowCategoryModal(false);
    } catch (err) {
      console.error("Error saving category modal:", err);
      triggerToast("ক্যাটাগরি সেভ করতে ব্যর্থ হয়েছে", "Failed to save category");
    } finally {
      setSavingCategoryModal(false);
    }
  };

  // Enable / Disable Category
  const handleToggleCategoryAvailability = async (catId: string, currentStatus: boolean) => {
    try {
      const newStatus = !currentStatus;
      await setDoc(doc(db, "categories", catId), {
        isAvailable: newStatus,
        disabled: !newStatus,
        updatedAt: new Date()
      }, { merge: true });

      triggerToast(
        newStatus ? "ক্যাটাগরি সক্রিয় করা হয়েছে" : "ক্যাটাগরি নিষ্ক্রিয় করা হয়েছে",
        newStatus ? "Category enabled" : "Category disabled"
      );
    } catch (err) {
      console.error("Error toggling category availability:", err);
      triggerToast("স্ট্যাটাস আপডেট ব্যর্থ হয়েছে", "Failed to update category status");
    }
  };

  // Reorder Category Position
  const handleReorderCategory = async (catId: string, direction: "up" | "down", sortedCats: any[]) => {
    const index = sortedCats.findIndex(c => c.id === catId);
    if (index === -1) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sortedCats.length) return;

    const currentCat = sortedCats[index];
    const targetCat = sortedCats[targetIndex];

    const currentOrder = typeof currentCat.displayOrder === "number" ? currentCat.displayOrder : (typeof currentCat.order === "number" ? currentCat.order : index);
    const targetOrder = typeof targetCat.displayOrder === "number" ? targetCat.displayOrder : (typeof targetCat.order === "number" ? targetCat.order : targetIndex);

    let newCurrentOrder = targetOrder;
    let newTargetOrder = currentOrder;

    if (newCurrentOrder === newTargetOrder) {
      newCurrentOrder = direction === "up" ? targetIndex : targetIndex;
      newTargetOrder = index;
    }

    try {
      await Promise.all([
        setDoc(doc(db, "categories", currentCat.id), { displayOrder: newCurrentOrder, order: newCurrentOrder }, { merge: true }),
        setDoc(doc(db, "categories", targetCat.id), { displayOrder: newTargetOrder, order: newTargetOrder }, { merge: true })
      ]);
      triggerToast("ক্যাটাগরি সিকোয়েন্স আপডেট করা হয়েছে", "Category order updated successfully");
    } catch (err) {
      console.error("Error reordering category:", err);
      triggerToast("রিঅর্ডার করতে সমস্যা হয়েছে", "Failed to reorder category");
    }
  };

  // Open product form for editing
  const handleOpenEditProduct = (p: any) => {
    setEditingProduct(p);
    setProdId(p.id);
    setProdNameEn(p.nameEn || "");
    setProdNameBn(p.nameBn || "");
    setProdPrice(p.price || 0);
    setProdOrigPrice(p.originalPrice || p.price || 0);
    setProdUnitEn(p.unitEn || "");
    setProdUnitBn(p.unitBn || "");
    setProdCategory(p.category || selectedCatId || "vegetables");
    setProdStock(p.stock || 0);
    setProdImage(p.image || "");
    setProdDescEn(p.descriptionEn || "");
    setProdDescBn(p.descriptionBn || "");
    setProdBrand(p.brand || "");
    setProdSku(p.sku || "");
    setProdOptions(p.options || []);
    setProdIsAvailable(p.isAvailable !== false);
    setProdDisplayOrder(typeof p.displayOrder === "number" ? p.displayOrder : 0);
    setNewOptValue("");
    setNewOptPrice("");
    setNewOptStock("");
    setShowProductForm(true);
  };

  // Open form for fresh product creation
  const handleOpenCreateProduct = (defaultCategory?: string) => {
    setEditingProduct(null);
    const targetCat = defaultCategory || selectedCatId || "vegetables";
    const nextId = "prod_" + Date.now().toString(36);
    setProdId(nextId);
    setProdNameEn("");
    setProdNameBn("");
    setProdPrice(0);
    setProdOrigPrice(0);
    setProdUnitEn("1 kg");
    setProdUnitBn("১ কেজি");
    setProdCategory(targetCat);
    setProdStock(50);
    setProdImage("");
    setProdDescEn("");
    setProdDescBn("");
    setProdBrand("Kacha Bazar");
    setProdSku("KB-" + targetCat.substring(0, 3).toUpperCase() + "-" + Math.floor(100 + Math.random() * 900));
    setProdOptions([]);
    setProdIsAvailable(true);
    setProdDisplayOrder(0);
    setNewOptValue("");
    setNewOptPrice("");
    setNewOptStock("");
    setShowProductForm(true);
  };

  // Save product (Insert / Update)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodNameEn.trim() || !prodNameBn.trim() || !prodCategory) {
      triggerToast("প্রয়োজনীয় ঘরগুলো পূরণ করুন!", "Please fill in all required fields!");
      return;
    }

    setSavingProduct(true);
    try {
      const payload: any = {
        id: prodId,
        nameEn: prodNameEn.trim(),
        nameBn: prodNameBn.trim(),
        price: Number(prodPrice) || 0,
        originalPrice: Number(prodOrigPrice) || Number(prodPrice) || 0,
        unitEn: prodUnitEn.trim() || "1 kg",
        unitBn: prodUnitBn.trim() || "১ কেজি",
        category: prodCategory,
        stock: Number(prodStock) || 0,
        image: prodImage.trim() || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80",
        descriptionEn: prodDescEn.trim(),
        descriptionBn: prodDescBn.trim(),
        brand: prodBrand.trim() || "Kacha Bazar",
        sku: prodSku.trim() || `KB-${prodCategory.substring(0, 3).toUpperCase()}-${prodId}`,
        options: prodOptions,
        isAvailable: prodIsAvailable,
        displayOrder: Number(prodDisplayOrder) || 0,
        order: Number(prodDisplayOrder) || 0,
        updatedAt: new Date()
      };

      await setDoc(doc(db, "products", prodId), payload, { merge: true });
      triggerToast(
        editingProduct ? "পণ্য আপডেট করা হয়েছে!" : "নতুন পণ্য যুক্ত করা হয়েছে!",
        editingProduct ? "Product details updated successfully!" : "New product added to catalog successfully!"
      );
      setShowProductForm(false);
    } catch (err) {
      console.error("Error saving product:", err);
      triggerToast("পণ্য সেভ করা যায়নি", "Failed to save product");
    } finally {
      setSavingProduct(false);
    }
  };

  // Quick enable/disable toggle
  const handleToggleProductAvailability = async (productId: string, currentStatus: boolean) => {
    try {
      const nextStatus = !currentStatus;
      await updateDoc(doc(db, "products", productId), {
        isAvailable: nextStatus
      });
      triggerToast(
        nextStatus ? "পণ্যটি এখন ক্যাটালগে সক্রিয়!" : "পণ্যটি ক্যাটালগে লুকানো/নিষ্ক্রিয় করা হয়েছে!",
        nextStatus ? "Product enabled and visible to shoppers!" : "Product disabled/hidden from catalog!"
      );
    } catch (err) {
      console.error("Error toggling product status:", err);
      triggerToast("স্ট্যাটাস পরিবর্তন ব্যর্থ হয়েছে", "Failed to update status");
    }
  };

  // Product reordering helper (move up / move down)
  const handleReorderProduct = async (prodId: string, direction: "up" | "down", catProducts: any[]) => {
    const currentIndex = catProducts.findIndex(p => p.id === prodId);
    if (currentIndex === -1) return;
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= catProducts.length) return;

    const currentItem = catProducts[currentIndex];
    const targetItem = catProducts[targetIndex];

    const currentOrder = typeof currentItem.displayOrder === "number" ? currentItem.displayOrder : currentIndex;
    const targetOrder = typeof targetItem.displayOrder === "number" ? targetItem.displayOrder : targetIndex;

    const newCurrentOrder = targetOrder;
    const newTargetOrder = currentOrder === targetOrder ? (direction === "up" ? targetOrder + 1 : Math.max(0, targetOrder - 1)) : currentOrder;

    try {
      await updateDoc(doc(db, "products", currentItem.id), { displayOrder: newCurrentOrder, order: newCurrentOrder });
      await updateDoc(doc(db, "products", targetItem.id), { displayOrder: newTargetOrder, order: newTargetOrder });
      triggerToast("পণ্যের পজিশন পরিবর্তন করা হয়েছে!", "Product reordered successfully!");
    } catch (err) {
      console.error("Error reordering product:", err);
      triggerToast("রিঅর্ডার সেভ করা যায়নি", "Failed to reorder product");
    }
  };

  // Delete product: Opens confirmation popup modal with order-usage analysis
  const handleDeleteProduct = (productIdOrProd: string | any) => {
    if (typeof productIdOrProd === "string") {
      const found = products.find(p => p.id === productIdOrProd);
      if (found) {
        setProductPendingDelete(found);
      } else {
        setProductPendingDelete({ id: productIdOrProd, nameBn: "পণ্য", nameEn: "Product" });
      }
    } else if (productIdOrProd && typeof productIdOrProd === "object") {
      setProductPendingDelete(productIdOrProd);
    }
  };

  // Add weight/pricing option
  const handleAddOption = () => {
    if (!newOptValue || !newOptPrice) return;
    const option: ProductOption = {
      id: "opt_" + Date.now(),
      value: Number(newOptValue),
      unit: newOptUnit,
      price: Number(newOptPrice),
      stock: newOptStock ? Number(newOptStock) : prodStock
    };
    setProdOptions([...prodOptions, option]);
    setNewOptValue("");
    setNewOptPrice("");
    setNewOptStock("");
  };

  // Delete option
  const handleRemoveOption = (id: string) => {
    setProdOptions(prodOptions.filter(o => o.id !== id));
  };

  // Delete Category with safe product check & confirmation
  const handleDeleteCategory = async (id: string) => {
    if (!id) return;
    const targetCat = categories.find(c => c.id === id);
    const catName = targetCat ? (lang === "bn" ? targetCat.nameBn : targetCat.nameEn) : id;
    
    // Count products belonging to this category
    const relatedProducts = products.filter(p => p.category === id);
    const prodCount = relatedProducts.length;

    let confirmMsg = "";
    if (prodCount > 0) {
      confirmMsg = getTranslation(
        `সতর্কতা: "${catName}" ক্যাটাগরিতে ${prodCount} টি পণ্য রয়েছে!\n\nক্যাটাগরি ডিলিট করলে উক্ত পণ্যগুলো ডাটাবেজে নিরাপদ ও অক্ষত থাকবে কিন্তু ক্যাটাগরি তালিকা থেকে ক্যাটাগরি সরে যাবে।\n\nআপনি কি নিশ্চিতভাবে "${catName}" ক্যাটাগরি ডিলিট করতে চান?`,
        `Warning: "${catName}" category currently contains ${prodCount} products!\n\nDeleting this category will keep all products safely intact in your database.\n\nAre you sure you want to delete the category "${catName}"?`
      );
    } else {
      confirmMsg = getTranslation(
        `আপনি কি নিশ্চিতভাবে "${catName}" ক্যাটাগরি ডিলিট করতে চান?`,
        `Are you sure you want to delete the category "${catName}"?`
      );
    }

    if (!confirm(confirmMsg)) return;

    try {
      await deleteDoc(doc(db, "categories", id));
      triggerToast(
        `"${catName}" ক্যাটাগরি সফলভাবে ডিলিট করা হয়েছে!`,
        `Category "${catName}" successfully deleted!`
      );
      
      const remaining = categories.filter(c => c.id !== id);
      if (selectedCatId === id) {
        if (remaining.length > 0) {
          setSelectedCatId(remaining[0].id);
        } else {
          setSelectedCatId("vegetables");
        }
      }
    } catch (err) {
      console.error("Error deleting category:", err);
      triggerToast("ক্যাটাগরি ডিলিট ব্যর্থ হয়েছে", "Failed to delete category");
    }
  };

  // Bulk CSV Export
  const handleExportCSV = () => {
    const headers = ["id", "nameEn", "nameBn", "price", "originalPrice", "unitEn", "unitBn", "category", "stock", "image", "descriptionEn", "descriptionBn", "isAvailable", "displayOrder"];
    const rows = products
      .filter(p => !isProductDeleted(p))
      .map(p => [
      p.id,
      `"${p.nameEn?.replace(/"/g, '""') || ''}"`,
      `"${p.nameBn?.replace(/"/g, '""') || ''}"`,
      p.price,
      p.originalPrice || "",
      p.unitEn || "1 kg",
      p.unitBn || "১ কেজি",
      p.category,
      p.stock,
      p.image,
      `"${p.descriptionEn?.replace(/"/g, '""') || ''}"`,
      `"${p.descriptionBn?.replace(/"/g, '""') || ''}"`,
      p.isAvailable !== false ? "true" : "false",
      p.displayOrder || 0
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "kachabazar_products_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast("সব ডাটা সফলভাবে ডাউনলোড করা হয়েছে!", "All products exported to CSV successfully!");
  };

  // Bulk CSV Import
  const handleImportCSV = async () => {
    if (!bulkCsvText.trim()) {
      triggerToast("পাস করা সিএসভি টেক্সট খালি!", "CSV payload text is empty!");
      return;
    }

    setImportingBulk(true);
    try {
      const lines = bulkCsvText.split("\n").map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        triggerToast("কমপক্ষে হেডার ও এক লাইন ডাটা আবশ্যক!", "Insufficient CSV lines parsed!");
        setImportingBulk(false);
        return;
      }

      const headers = lines[0].split(",").map(h => h.trim());
      let successCount = 0;

      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(",").map(p => p.trim());
        if (parts.length < headers.length) continue;

        const row: any = {};
        headers.forEach((h, idx) => {
          row[h] = parts[idx];
        });

        const newId = "prod_bulk_" + Math.random().toString(36).substr(2, 9);
        const payload = {
          id: newId,
          nameEn: row.nameEn || "Bulk Product",
          nameBn: row.nameBn || "বাল্ক প্রোডাক্ট",
          price: Number(row.price) || 0,
          originalPrice: Number(row.price) || 0,
          stock: Number(row.stock) || 10,
          category: row.category || selectedCatId || "vegetables",
          unitEn: row.unitEn || "1 kg",
          unitBn: row.unitBn || "১ কেজি",
          image: row.image || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80",
          descriptionEn: row.descriptionEn || "Bulk imported item",
          descriptionBn: row.descriptionBn || "বাল্ক আমদানিকৃত পণ্য",
          isAvailable: true,
          displayOrder: 0,
          rating: 4.5,
          reviewCount: 0
        };

        await setDoc(doc(db, "products", newId), payload);
        successCount++;
      }

      triggerToast(`${successCount} টি পণ্য বাল্ক ইম্পোর্ট করা হয়েছে!`, `Successfully imported ${successCount} items from CSV!`);
      setBulkCsvText("");
      setActiveCatalogSubTab("category_manager");
    } catch (err) {
      console.error("Bulk import failed:", err);
      triggerToast("ইম্পোর্ট করতে সমস্যা হয়েছে!", "Error encountered during CSV batch processing.");
    } finally {
      setImportingBulk(false);
    }
  };

  // Products belonging to currently selected category (e.g. "vegetables")
  const categoryProducts = products
    .filter(p => !isProductDeleted(p))
    .filter(p => p.category === selectedCatId);

  // Filtered products for Category Manager view
  const filteredCategoryProducts = categoryProducts
    .filter(p => {
      const matchSearch = 
        p.nameEn?.toLowerCase().includes(catProductSearchTerm.toLowerCase()) || 
        p.nameBn?.includes(catProductSearchTerm) || 
        p.sku?.toLowerCase().includes(catProductSearchTerm.toLowerCase());

      if (!matchSearch) return false;

      if (catProductStatusFilter === "active") return p.isAvailable !== false;
      if (catProductStatusFilter === "disabled") return p.isAvailable === false;
      if (catProductStatusFilter === "low_stock") return (p.stock || 0) <= 5;
      return true;
    })
    .sort((a, b) => {
      const orderA = typeof a.displayOrder === "number" ? a.displayOrder : (typeof a.order === "number" ? a.order : 9999);
      const orderB = typeof b.displayOrder === "number" ? b.displayOrder : (typeof b.order === "number" ? b.order : 9999);
      return orderA - orderB;
    });

  // Global search products list
  const globalFilteredProducts = products
    .filter(p => !isProductDeleted(p))
    .filter(p => 
      (p.nameEn?.toLowerCase().includes(searchTerm.toLowerCase()) || 
       p.nameBn?.includes(searchTerm) || 
       p.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       p.sku?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

  return (
    <div className="space-y-6 text-slate-700 font-sans">
      
      {/* Catalog Sub Navigation */}
      <div className="flex flex-wrap border-b border-slate-200 shrink-0 gap-1 sm:gap-2">
        <button 
          onClick={() => setActiveCatalogSubTab("category_manager")}
          className={`px-4 sm:px-5 py-2.5 text-xs font-black cursor-pointer uppercase tracking-wider border-b-2 transition flex items-center gap-2 ${
            activeCatalogSubTab === "category_manager" ? "border-emerald-600 text-emerald-600 bg-emerald-50/50" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Layers className="w-4 h-4 text-emerald-600" />
          <span>{getTranslation("ক্যাটাগরি ম্যানেজমেন্ট", "Category Management")}</span>
        </button>

        <button 
          onClick={() => setActiveCatalogSubTab("bulk")}
          className={`px-4 sm:px-5 py-2.5 text-xs font-black cursor-pointer uppercase tracking-wider border-b-2 transition ${
            activeCatalogSubTab === "bulk" ? "border-emerald-600 text-emerald-600 bg-emerald-50/50" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          {getTranslation("বাল্ক সিএসভি টুলস", "Bulk CSV Tools")}
        </button>
      </div>

      {/* ==================== SUBTAB 1: CATEGORY MANAGER ==================== */}
      {activeCatalogSubTab === "category_manager" && (
        <div className="space-y-6">
          
          {/* Category Switcher Header */}
          <div className="bg-white border border-slate-200 p-4 sm:p-5 rounded-2xl shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-100/80 px-2.5 py-1 rounded-full">
                  {getTranslation("ক্যাটাগরি হাব", "Category Hub")}
                </span>
                <h3 className="text-base sm:text-lg font-black text-slate-800 mt-1">
                  {getTranslation("ক্যাটাগরি ম্যানেজমেন্ট", "Category Management")}
                </h3>
              </div>

              {/* Prominent Add Category Button */}
              <button
                type="button"
                onClick={handleOpenAddCategory}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs transition uppercase tracking-wider shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>{getTranslation("নতুন ক্যাটাগরি যুক্ত করুন", "Add Category")}</span>
              </button>
            </div>

            {/* Category Selector Buttons */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
              {categories.map((c) => {
                const isSelected = selectedCatId === c.id;
                const catProdCount = products.filter(p => p.category === c.id).length;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCatId(c.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer border ${
                      isSelected 
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm" 
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span>{getTranslation(c.nameBn, c.nameEn)}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-black ${
                      isSelected ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
                    }`}>
                      {catProdCount}
                    </span>
                  </button>
                );
              })}

              {/* Add Category Pill Button */}
              <button
                type="button"
                onClick={handleOpenAddCategory}
                className="px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-dashed border-emerald-400 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{getTranslation("নতুন ক্যাটাগরি", "Add Category")}</span>
              </button>
            </div>
          </div>

          {/* Section 1: Category Name & Image Editor */}
          <div className="bg-white border border-slate-200 p-5 sm:p-6 rounded-2xl shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-sm sm:text-base font-black text-slate-800 flex items-center gap-2">
                  <Edit className="w-4 h-4 text-emerald-600" />
                  <span>{getTranslation("ক্যাটাগরি তথ্য ও হেডার ইমেজ এডিটর", "Category Profile & Image Editor")}</span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  {getTranslation("ক্যাটাগরির বাংলা/ইংরেজি নাম এবং ব্যানার/আইকন পরিবর্তন করুন।", "Update category names, image URL, and upload new media.")}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-mono font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">
                  ID: {selectedCatId}
                </span>

                {/* Delete Category Header Button */}
                <button
                  type="button"
                  onClick={() => handleDeleteCategory(selectedCatId)}
                  className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                  title={getTranslation("ক্যাটাগরি ডিলিট করুন", "Delete Category")}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{getTranslation("ডিলিট", "Delete")}</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveCategoryDetails} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-black text-slate-700 uppercase block mb-1">
                  {getTranslation("ক্যাটাগরি নাম (বাংলা) *", "Category Name (Bangla) *")}
                </label>
                <input 
                  type="text" 
                  required 
                  value={catNameBn} 
                  onChange={(e) => setCatNameBn(e.target.value)} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-700 uppercase block mb-1">
                  {getTranslation("ক্যাটাগরি নাম (ইংরেজি) *", "Category Name (English) *")}
                </label>
                <input 
                  type="text" 
                  required 
                  value={catNameEn} 
                  onChange={(e) => setCatNameEn(e.target.value)} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-700 uppercase block mb-1">
                  {getTranslation("আইকন নাম (Lucide Icon)", "Icon Name (Lucide)")}
                </label>
                <input 
                  type="text" 
                  value={catIcon} 
                  onChange={(e) => setCatIcon(e.target.value)} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {/* Category Image URL & File Upload */}
              <div className="md:col-span-2 space-y-2">
                <label className="text-xs font-black text-slate-700 uppercase block">
                  {getTranslation("ক্যাটাগরি ইমেজ URL অথবা আপলোড", "Category Image URL or Upload")}
                </label>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input 
                    type="url" 
                    placeholder="https://images.unsplash.com/..." 
                    value={catImage} 
                    onChange={(e) => setCatImage(e.target.value)} 
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />

                  <input 
                    type="file" 
                    ref={catFileInputRef} 
                    onChange={handleCatImageFileChange} 
                    accept="image/*" 
                    className="hidden" 
                  />

                  <button 
                    type="button" 
                    onClick={() => catFileInputRef.current?.click()} 
                    disabled={uploadingCatImage} 
                    className="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-4 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer transition shrink-0"
                  >
                    {uploadingCatImage ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    <span>{getTranslation("ছবি আপলোড", "Upload Image")}</span>
                  </button>
                </div>
              </div>

              {/* Category Image Live Preview */}
              <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <div className="w-12 h-12 rounded-xl bg-slate-200 border border-slate-300 flex items-center justify-center overflow-hidden shrink-0">
                  {catImage ? (
                    <img src={catImage} alt={catNameEn} className="w-full h-full object-cover" />
                  ) : (
                    <Salad className="w-6 h-6 text-emerald-600" />
                  )}
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">{getTranslation("লাইভ প্র প্রিভিউ", "Live Preview")}</div>
                  <div className="text-xs font-extrabold text-slate-800">{catNameBn || catNameEn || "Category"}</div>
                </div>
              </div>

              <div className="md:col-span-2 lg:col-span-3 flex justify-between items-center pt-3 border-t border-slate-100">
                {/* Delete Button */}
                <button 
                  type="button"
                  onClick={() => handleDeleteCategory(selectedCatId)}
                  className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{getTranslation("ক্যাটাগরি ডিলিট করুন", "Delete Category")}</span>
                </button>

                {/* Save Changes Button */}
                <button 
                  type="submit" 
                  disabled={savingCategory} 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer transition shadow-xs uppercase tracking-wider"
                >
                  {savingCategory ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{getTranslation("ক্যাটাগরি আপডেট সেভ করুন", "Save Category Changes")}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Section 2: Products List in Selected Category ("তাজা শাক ও সবজি") */}
          <div className="bg-white border border-slate-200 p-5 sm:p-6 rounded-2xl shadow-xs space-y-4">
            
            {/* Header & Stat Summary */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
              <div>
                <h4 className="text-base sm:text-lg font-black text-slate-800 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-emerald-600" />
                  <span>
                    {getTranslation(`"${catNameBn}" ক্যাটালগ প্রোডাক্টস`, `"${catNameEn}" Product Catalog`)}
                  </span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  {getTranslation("এই ক্যাটাগরির অন্তর্ভুক্ত সব পণ্যের রিওর্ডার, এডিট, ডিলিট ও এনাবল/ডিজেবল কন্ট্রোল।", "Reorder, edit, toggle availability, and add products to this category.")}
                </p>
              </div>

              {/* Stats badges */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5">
                  <span>মোট:</span>
                  <span className="text-emerald-700 font-mono font-black">{categoryProducts.length}</span>
                </div>
                <div className="bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>সক্রিয়:</span>
                  <span className="font-mono font-black">{categoryProducts.filter(p => p.isAvailable !== false).length}</span>
                </div>
                <div className="bg-amber-50 text-amber-800 px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span>নিষ্ক্রিয়:</span>
                  <span className="font-mono font-black">{categoryProducts.filter(p => p.isAvailable === false).length}</span>
                </div>
              </div>
            </div>

            {/* Action Toolbar: Search, Filter, Add Product */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="flex flex-1 flex-col sm:flex-row items-center gap-2 w-full">
                {/* Search in Category */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input 
                    type="text" 
                    placeholder={getTranslation("এই ক্যাটাগরির পণ্য খুঁজুন...", "Search in category...")} 
                    value={catProductSearchTerm}
                    onChange={(e) => setCatProductSearchTerm(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                  />
                </div>

                {/* Status Filter */}
                <select 
                  value={catProductStatusFilter} 
                  onChange={(e: any) => setCatProductStatusFilter(e.target.value)} 
                  className="w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none"
                >
                  <option value="all">{getTranslation("সব স্ট্যাটাস (All)", "All Status")}</option>
                  <option value="active">{getTranslation("শুধুমাত্র সক্রিয় (Active)", "Active Only")}</option>
                  <option value="disabled">{getTranslation("শুধুমাত্র নিষ্ক্রিয় (Disabled)", "Disabled Only")}</option>
                  <option value="low_stock">{getTranslation("স্টক কম (≤ 5)", "Low Stock (≤ 5)")}</option>
                </select>
              </div>

              {/* Add New Product to this category */}
              <button 
                onClick={() => handleOpenCreateProduct(selectedCatId)}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-4 py-2.5 text-xs font-black flex items-center justify-center gap-2 cursor-pointer transition uppercase tracking-wider shrink-0 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>{getTranslation(`+ নতুন পণ্য যুক্ত করুন`, `+ Add Product`)}</span>
              </button>
            </div>

            {/* Category Products Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-black uppercase tracking-wider border-b border-slate-200">
                      <th className="p-3 w-16 text-center">{getTranslation("ক্রম / বিন্যাস", "Order")}</th>
                      <th className="p-3 w-16">{getTranslation("ছবি", "Image")}</th>
                      <th className="p-3">{getTranslation("পণ্য ও SKU", "Product & SKU")}</th>
                      <th className="p-3">{getTranslation("মূল্য", "Price")}</th>
                      <th className="p-3">{getTranslation("স্টক", "Stock")}</th>
                      <th className="p-3 text-center">{getTranslation("স্ট্যাটাস (এনাবল)", "Status")}</th>
                      <th className="p-3 text-right">{getTranslation("অ্যাকশন", "Actions")}</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredCategoryProducts.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400 font-bold">
                          {getTranslation("কোনো পণ্য পাওয়া যায়নি।", "No products found in this category.")}
                        </td>
                      </tr>
                    ) : (
                      filteredCategoryProducts.map((p, idx) => {
                        const isAvailable = p.isAvailable !== false;
                        return (
                          <tr key={p.id} className={`hover:bg-slate-50/80 transition ${!isAvailable ? "bg-slate-50/50 opacity-75" : ""}`}>
                            
                            {/* Reorder Up/Down */}
                            <td className="p-3 text-center">
                              <div className="flex flex-col items-center justify-center gap-1">
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleReorderProduct(p.id, "up", filteredCategoryProducts)}
                                    disabled={idx === 0}
                                    title="Move Up"
                                    className="p-1 text-slate-400 hover:text-emerald-600 disabled:opacity-20 hover:bg-slate-100 rounded-md cursor-pointer"
                                  >
                                    <ArrowUp className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleReorderProduct(p.id, "down", filteredCategoryProducts)}
                                    disabled={idx === filteredCategoryProducts.length - 1}
                                    title="Move Down"
                                    className="p-1 text-slate-400 hover:text-emerald-600 disabled:opacity-20 hover:bg-slate-100 rounded-md cursor-pointer"
                                  >
                                    <ArrowDown className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <span className="text-[10px] font-mono font-bold text-slate-400">
                                  #{idx + 1}
                                </span>
                              </div>
                            </td>

                            {/* Image Thumbnail */}
                            <td className="p-3">
                              <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
                                {p.image ? (
                                  <img src={p.image} alt={p.nameEn} className="w-full h-full object-cover" />
                                ) : (
                                  <ImageIcon className="w-4 h-4 text-slate-300" />
                                )}
                              </div>
                            </td>

                            {/* Product Info & SKU */}
                            <td className="p-3">
                              <div className="font-bold text-slate-800 text-xs sm:text-sm">
                                {getTranslation(p.nameBn, p.nameEn)}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] font-mono text-slate-400">
                                  SKU: {p.sku || p.id}
                                </span>
                                <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.2 rounded">
                                  {getTranslation(p.unitBn, p.unitEn)}
                                </span>
                              </div>
                            </td>

                            {/* Price */}
                            <td className="p-3">
                              <div className="font-extrabold text-emerald-700">
                                ৳{p.price}
                              </div>
                              {p.originalPrice > p.price && (
                                <div className="text-[10px] line-through text-slate-400">
                                  ৳{p.originalPrice}
                                </div>
                              )}
                            </td>

                            {/* Stock */}
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                (p.stock || 0) <= 5 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-800"
                              }`}>
                                {p.stock || 0} {getTranslation("টি", "pcs")}
                              </span>
                            </td>

                            {/* Enable/Disable Switch Toggle */}
                            <td className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleToggleProductAvailability(p.id, isAvailable)}
                                className={`px-2.5 py-1 rounded-full text-[10px] font-black transition cursor-pointer flex items-center justify-center gap-1 mx-auto ${
                                  isAvailable 
                                    ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs" 
                                    : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                                }`}
                              >
                                {isAvailable ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                                <span>{isAvailable ? getTranslation("সক্রিয়", "Active") : getTranslation("নিষ্ক্রিয়", "Hidden")}</span>
                              </button>
                            </td>

                            {/* Edit / Delete Actions */}
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditProduct(p)}
                                  className="p-1.5 text-slate-600 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 transition cursor-pointer"
                                  title="Edit Product"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteProduct(p.id)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition cursor-pointer"
                                  title="Delete Product"
                                >
                                  <Trash2 className="w-4 h-4" />
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

          </div>

        </div>
      )}

      {/* ==================== SUBTAB 2: ALL PRODUCTS ==================== */}
      {activeCatalogSubTab === "products" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <input 
              type="text" 
              placeholder={getTranslation("সব পণ্য অনুসন্ধান করুন...", "Search all products...")} 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:max-w-xs bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
            />
            <button 
              onClick={() => handleOpenCreateProduct()}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-4 py-2 text-xs font-black flex items-center justify-center gap-2 cursor-pointer transition uppercase"
            >
              <Plus className="w-4 h-4" />
              <span>{getTranslation("নতুন পণ্য যুক্ত করুন", "Add Product")}</span>
            </button>
          </div>

          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-black uppercase tracking-wider border-b border-slate-200">
                    <th className="p-3 w-16">{getTranslation("ছবি", "Image")}</th>
                    <th className="p-3">{getTranslation("পণ্য নাম", "Product Name")}</th>
                    <th className="p-3">{getTranslation("ক্যাটাগরি", "Category")}</th>
                    <th className="p-3">{getTranslation("মূল্য", "Price")}</th>
                    <th className="p-3">{getTranslation("স্টক", "Stock")}</th>
                    <th className="p-3 text-center">{getTranslation("স্ট্যাটাস", "Status")}</th>
                    <th className="p-3 text-right">{getTranslation("অ্যাকশন", "Actions")}</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 bg-white">
                  {globalFilteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 font-bold">
                        {getTranslation("কোনো পণ্য পাওয়া যায়নি!", "No products found matching query!")}
                      </td>
                    </tr>
                  ) : (
                    globalFilteredProducts.map((p) => {
                      const isAvailable = p.isAvailable !== false;
                      const catInfo = categories.find(c => c.id === p.category);
                      return (
                        <tr key={p.id} className="hover:bg-slate-50 transition">
                          <td className="p-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
                              {p.image ? (
                                <img src={p.image} alt={p.nameEn} className="w-full h-full object-cover" />
                              ) : (
                                <ImageIcon className="w-4 h-4 text-slate-300" />
                              )}
                            </div>
                          </td>
                          <td className="p-3 font-bold text-slate-800">
                            <div>{getTranslation(p.nameBn, p.nameEn)}</div>
                            <div className="text-[10px] text-slate-400 font-mono font-normal">SKU: {p.sku || p.id}</div>
                          </td>
                          <td className="p-3 font-bold text-slate-600">
                            {catInfo ? getTranslation(catInfo.nameBn, catInfo.nameEn) : p.category}
                          </td>
                          <td className="p-3 font-extrabold text-emerald-700">
                            ৳{p.price}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                              (p.stock || 0) <= 5 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-800"
                            }`}>
                              {p.stock || 0}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleProductAvailability(p.id, isAvailable)}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-black transition cursor-pointer flex items-center justify-center gap-1 mx-auto ${
                                isAvailable ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600"
                              }`}
                            >
                              {isAvailable ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                              <span>{isAvailable ? getTranslation("সক্রিয়", "Active") : getTranslation("নিষ্ক্রিয়", "Hidden")}</span>
                            </button>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenEditProduct(p)}
                                className="p-1.5 text-slate-600 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 transition cursor-pointer"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteProduct(p.id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
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
        </div>
      )}

      {/* ==================== PRODUCT FORM OVERLAY ==================== */}
      {showProductForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 my-8 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-800">
                {editingProduct ? getTranslation("পণ্য তথ্য এডিট করুন", "Edit Product Details") : getTranslation("নতুন পণ্য যুক্ত করুন", "Create New Product")}
              </h3>
              <button 
                type="button"
                onClick={() => setShowProductForm(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">{getTranslation("ক্যাটাগরি *", "Category *")}</label>
                <select 
                  value={prodCategory} 
                  onChange={(e) => setProdCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{getTranslation(c.nameBn, c.nameEn)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">SKU Code</label>
                <input type="text" value={prodSku} onChange={(e) => setProdSku(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono" />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">{getTranslation("পণ্যের নাম (বাংলা) *", "Product Name (Bangla) *")}</label>
                <input type="text" required value={prodNameBn} onChange={(e) => setProdNameBn(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs" />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">{getTranslation("পণ্যের নাম (English) *", "Product Name (English) *")}</label>
                <input type="text" required value={prodNameEn} onChange={(e) => setProdNameEn(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs" />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">{getTranslation("মূল্য (৳) *", "Price (৳) *")}</label>
                <input type="number" required value={prodPrice} onChange={(e) => setProdPrice(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-emerald-700" />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">{getTranslation("পূর্ববর্তী মূল্য (৳)", "Original Price (৳)")}</label>
                <input type="number" value={prodOrigPrice} onChange={(e) => setProdOrigPrice(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs" />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">{getTranslation("একক (বাংলা)", "Unit (Bangla)")}</label>
                <input type="text" value={prodUnitBn} onChange={(e) => setProdUnitBn(e.target.value)} placeholder="১ কেজি" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs" />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">{getTranslation("একক (English)", "Unit (English)")}</label>
                <input type="text" value={prodUnitEn} onChange={(e) => setProdUnitEn(e.target.value)} placeholder="1 kg" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs" />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">{getTranslation("স্টক সংখ্যা *", "Stock Quantity *")}</label>
                <input type="number" required value={prodStock} onChange={(e) => setProdStock(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs" />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">{getTranslation("ব্র্যান্ড", "Brand")}</label>
                <input type="text" value={prodBrand} onChange={(e) => setProdBrand(e.target.value)} placeholder="Kacha Bazar" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs" />
              </div>

              {/* Product Image Field & Upload */}
              <div className="md:col-span-2 space-y-1">
                <label className="font-bold text-slate-700 block">{getTranslation("পণ্যের ছবি URL / ক্লাউডিনারি আপলোড", "Product Image URL / Cloudinary Upload")}</label>
                <div className="flex gap-2">
                  <input type="url" placeholder="https://images.unsplash.com/..." value={prodImage} onChange={(e) => setProdImage(e.target.value)} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs" />
                  <input type="file" ref={fileInputRef} onChange={handleImageFileChange} accept="image/*" className="hidden" />
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingImage} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 shrink-0">
                    {uploadingImage ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    <span>{getTranslation("আপলোড", "Upload")}</span>
                  </button>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">{getTranslation("বিবরণ (বাংলা)", "Description (Bangla)")}</label>
                <textarea rows={2} value={prodDescBn} onChange={(e) => setProdDescBn(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs"></textarea>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">{getTranslation("বিবরণ (English)", "Description (English)")}</label>
                <textarea rows={2} value={prodDescEn} onChange={(e) => setProdDescEn(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs"></textarea>
              </div>

              {/* Product Options (Weight/Size variations) */}
              <div className="md:col-span-2 bg-slate-50 p-3 rounded-2xl space-y-2 border border-slate-200">
                <div className="font-bold text-slate-800 text-xs">{getTranslation("ওজন ও মূল্য বৈচিত্র্য (Weight Options)", "Weight Options")}</div>
                <div className="flex flex-wrap gap-2 items-center">
                  <input type="number" placeholder="Value (250)" value={newOptValue} onChange={(e) => setNewOptValue(e.target.value)} className="w-24 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs" />
                  <select value={newOptUnit} onChange={(e) => setNewOptUnit(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs">
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                    <option value="ml">ml</option>
                    <option value="L">L</option>
                    <option value="pcs">pcs</option>
                  </select>
                  <input type="number" placeholder="Price (৳)" value={newOptPrice} onChange={(e) => setNewOptPrice(e.target.value)} className="w-24 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs" />
                  <button type="button" onClick={handleAddOption} className="bg-emerald-600 text-white px-3 py-1 rounded-lg text-xs font-bold cursor-pointer">{getTranslation("যোগ করুন", "Add Option")}</button>
                </div>

                {prodOptions.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {prodOptions.map((opt) => (
                      <div key={opt.id} className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-2">
                        <span>{opt.value} {opt.unit} - ৳{opt.price}</span>
                        <button type="button" onClick={() => handleRemoveOption(opt.id)} className="text-red-500 hover:text-red-700 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Availability Toggle */}
              <div className="md:col-span-2 flex items-center justify-between bg-emerald-50/60 p-3 rounded-xl border border-emerald-100">
                <label className="font-bold text-emerald-900 text-xs flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={prodIsAvailable} 
                    onChange={(e) => setProdIsAvailable(e.target.checked)} 
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                  <span>{getTranslation("পণ্যটি ক্যাটালগে সক্রিয় ও প্রদর্শনের জন্য উন্মুক্ত রাখুন", "Keep product active and visible to shoppers")}</span>
                </label>
              </div>

              <div className="md:col-span-2 flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowProductForm(false)} className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold uppercase">{getTranslation("বাতিল", "Cancel")}</button>
                <button type="submit" disabled={savingProduct} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 cursor-pointer">
                  {savingProduct && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{getTranslation("সংরক্ষণ করুন", "Save Product")}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== SUBTAB 3: ALL CATEGORIES MANAGEMENT ==================== */}
      {activeCatalogSubTab === "categories" && (() => {
        const PRIORITY_ORDER_MAP: Record<string, number> = {
          "vegetables": 1,
          "staples": 2,
          "fish": 3,
          "meat": 4,
          "spices-oils": 5,
          "fruits": 6,
          "dairy-eggs": 7,
          "snacks-biscuits": 8,
          "beverages": 9,
          "frozen": 10,
          "personal-care": 11,
          "household": 12,
          "baby-care": 13,
          "bakery-sweets": 14,
          "offers": 15,
          "organic-herbal": 16,
          "pet-care": 17,
          "home-appliances": 18
        };
        const sortedAllCats = categories.filter(c => c.id !== "all").sort((a, b) => {
          const orderA = typeof a.displayOrder === "number" ? a.displayOrder : (typeof a.order === "number" ? a.order : (PRIORITY_ORDER_MAP[a.id] ?? 9999));
          const orderB = typeof b.displayOrder === "number" ? b.displayOrder : (typeof b.order === "number" ? b.order : (PRIORITY_ORDER_MAP[b.id] ?? 9999));
          return orderA - orderB;
        });

        const filteredCats = sortedAllCats.filter(c => {
          const matchesSearch = 
            (c.nameBn || "").toLowerCase().includes(catSearchTerm.toLowerCase()) ||
            (c.nameEn || "").toLowerCase().includes(catSearchTerm.toLowerCase()) ||
            (c.id || "").toLowerCase().includes(catSearchTerm.toLowerCase());
          
          const isAvail = c.isAvailable !== false && c.disabled !== true;
          const matchesStatus = 
            catStatusFilter === "all" ? true :
            catStatusFilter === "active" ? isAvail :
            !isAvail;

          return matchesSearch && matchesStatus;
        });

        const totalCount = sortedAllCats.length;
        const activeCount = sortedAllCats.filter(c => c.isAvailable !== false && c.disabled !== true).length;
        const disabledCount = sortedAllCats.filter(c => c.isAvailable === false || c.disabled === true).length;

        return (
          <div className="space-y-5">
            {/* Summary Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-0.5">
                    {getTranslation("মোট ক্যাটাগরি", "Total Categories")}
                  </span>
                  <div className="text-xl font-black text-slate-800">{totalCount}</div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                  <Grid className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white border border-emerald-100 p-4 rounded-2xl shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider block mb-0.5">
                    {getTranslation("সক্রিয় ক্যাটাগরি", "Active Categories")}
                  </span>
                  <div className="text-xl font-black text-emerald-600">{activeCount}</div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-0.5">
                    {getTranslation("বন্ধ / হিডেন ক্যাটাগরি", "Disabled Categories")}
                  </span>
                  <div className="text-xl font-black text-slate-500">{disabledCount}</div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                  <XCircle className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Action Bar & Controls */}
            <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
                {/* Search input */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder={getTranslation("ক্যাটাগরি নাম বা আইডি সার্চ করুন...", "Search category by name or ID...")}
                    value={catSearchTerm}
                    onChange={(e) => setCatSearchTerm(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                  {catSearchTerm && (
                    <button onClick={() => setCatSearchTerm("")} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 p-1 rounded-xl shrink-0">
                  <button
                    onClick={() => setCatStatusFilter("all")}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${catStatusFilter === "all" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
                  >
                    {getTranslation("সব", "All")} ({totalCount})
                  </button>
                  <button
                    onClick={() => setCatStatusFilter("active")}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${catStatusFilter === "active" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
                  >
                    {getTranslation("সক্রিয়", "Active")} ({activeCount})
                  </button>
                  <button
                    onClick={() => setCatStatusFilter("disabled")}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${catStatusFilter === "disabled" ? "bg-slate-700 text-white shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
                  >
                    {getTranslation("বন্ধ", "Disabled")} ({disabledCount})
                  </button>
                </div>
              </div>

              {/* Add New Category Button */}
              <button
                onClick={handleOpenAddCategory}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer shadow-xs transition uppercase tracking-wider shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>{getTranslation("নতুন ক্যাটাগরি যুক্ত করুন", "Add New Category")}</span>
              </button>
            </div>

            {/* Category Table / Card Grid */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                      <th className="py-3 px-4 text-center w-20">{getTranslation("অর্ডার / রিঅর্ডার", "Reorder")}</th>
                      <th className="py-3 px-4">{getTranslation("ক্যাটাগরি ইমেজ ও আইকন", "Category Media")}</th>
                      <th className="py-3 px-4">{getTranslation("ক্যাটাগরি তথ্য (Bangla / English)", "Category Info")}</th>
                      <th className="py-3 px-4 text-center">{getTranslation("পণ্য সংখ্যা", "Products")}</th>
                      <th className="py-3 px-4 text-center">{getTranslation("স্ট্যাটাস (এনাবল / ডিসেবল)", "Status")}</th>
                      <th className="py-3 px-4 text-right">{getTranslation("অ্যাকশন", "Actions")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredCats.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-10 text-slate-400 font-medium">
                          {getTranslation("কোনো ক্যাটাগরি খুঁজে পাওয়া যায়নি।", "No categories found matching filter criteria.")}
                        </td>
                      </tr>
                    ) : (
                      filteredCats.map((c, idx) => {
                        const isAvail = c.isAvailable !== false && c.disabled !== true;
                        const catProductsCount = products.filter(p => p.category === c.id).length;
                        const displayIdx = typeof c.displayOrder === "number" ? c.displayOrder : idx + 1;

                        return (
                          <tr key={c.id} className={`hover:bg-slate-50/80 transition ${!isAvail ? "bg-slate-50/50 text-slate-400" : ""}`}>
                            {/* Reorder Buttons */}
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                  #{displayIdx}
                                </span>
                                <div className="flex flex-col gap-0.5">
                                  <button
                                    type="button"
                                    disabled={idx === 0}
                                    onClick={() => handleReorderCategory(c.id, "up", sortedAllCats)}
                                    className="p-1 hover:bg-slate-200 text-slate-600 rounded disabled:opacity-20 cursor-pointer"
                                    title="Move Up"
                                  >
                                    <ArrowUp className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={idx === sortedAllCats.length - 1}
                                    onClick={() => handleReorderCategory(c.id, "down", sortedAllCats)}
                                    className="p-1 hover:bg-slate-200 text-slate-600 rounded disabled:opacity-20 cursor-pointer"
                                    title="Move Down"
                                  >
                                    <ArrowDown className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </td>

                            {/* Image Thumbnail & Icon */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                                  {c.image || c.imageUrl ? (
                                    <img src={c.image || c.imageUrl} alt={c.nameEn} className="w-full h-full object-cover" />
                                  ) : (
                                    renderCategoryIcon(c.iconName)
                                  )}
                                </div>
                                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md border font-bold ${c.colorClass || "bg-slate-100 text-slate-600"} ${c.borderColor || "border-slate-200"}`}>
                                  {c.iconName || "Salad"}
                                </span>
                              </div>
                            </td>

                            {/* Category Info */}
                            <td className="py-3 px-4">
                              <div className="space-y-0.5">
                                <div className="font-extrabold text-slate-800 text-sm">{c.nameBn}</div>
                                <div className="text-xs text-slate-500 font-medium">{c.nameEn}</div>
                                <div className="text-[10px] font-mono text-slate-400 uppercase">Slug ID: {c.id}</div>
                              </div>
                            </td>

                            {/* Product Count */}
                            <td className="py-3 px-4 text-center">
                              <span className="bg-emerald-50 text-emerald-700 font-mono font-bold text-xs px-2.5 py-1 rounded-full border border-emerald-100 inline-block">
                                {catProductsCount} {getTranslation("পণ্য", "Items")}
                              </span>
                            </td>

                            {/* Availability Toggle */}
                            <td className="py-3 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => handleToggleCategoryAvailability(c.id, isAvail)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 mx-auto ${
                                  isAvail 
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" 
                                    : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                                }`}
                              >
                                {isAvail ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <XCircle className="w-3.5 h-3.5 text-slate-400" />}
                                <span>{isAvail ? getTranslation("সক্রিয় (Active)", "Enabled") : getTranslation("বন্ধ (Disabled)", "Disabled")}</span>
                              </button>
                            </td>

                            {/* Actions */}
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Manage products button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedCatId(c.id);
                                    setActiveCatalogSubTab("category_manager");
                                  }}
                                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition border border-emerald-200"
                                  title="Manage category products"
                                >
                                  <Layers className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">{getTranslation("ম্যানেজ", "Manage")}</span>
                                </button>

                                {/* Edit category modal button */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditCategory(c)}
                                  className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                                  title="Edit category info"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>

                                {/* Delete category button */}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCategory(c.id)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                                  title="Delete category"
                                >
                                  <Trash2 className="w-4 h-4" />
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
          </div>
        );
      })()}

      {/* ==================== SUBTAB 4: BULK CSV TOOLS ==================== */}
      {activeCatalogSubTab === "bulk" && (
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-4">
          <div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{getTranslation("বাল্ক ক্যাটালগ সিএসভি মডিউল", "Bulk Catalog CSV Module")}</h3>
            <p className="text-xs text-slate-400">{getTranslation("সিএসভি ডাটা ফরম্যাট দিয়ে ক্যাটালগে দ্রুত নতুন পণ্য যুক্ত করুন অথবা ডাউনলোড করুন।", "Instantly download current dataset or add bulk items to inventory with comma-separated values.")}</p>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={handleExportCSV}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer uppercase"
            >
              <Download className="w-4 h-4" />
              <span>{getTranslation("সব পণ্য ডাউনলোড (CSV)", "Export Products to CSV")}</span>
            </button>
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase block">{getTranslation("সিএসভি ডাটা পেস্ট করুন", "Paste CSV payload data")}</label>
            <div className="text-[10px] text-emerald-600 font-bold p-2 bg-emerald-50 rounded-lg font-mono">
              {getTranslation(
                "ফরম্যাটঃ nameEn,nameBn,price,stock,category,unitEn,unitBn",
                "Header format: nameEn,nameBn,price,stock,category,unitEn,unitBn"
              )}
            </div>
            <textarea 
              rows={6}
              placeholder="Fresh Tomato,দেশি টমেটো,60,100,vegetables,1 kg,১ কেজি"
              value={bulkCsvText}
              onChange={(e) => setBulkCsvText(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-mono outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            ></textarea>
            
            <button 
              onClick={handleImportCSV}
              disabled={importingBulk}
              className="bg-slate-900 hover:bg-black text-white px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer uppercase transition"
            >
              {importingBulk ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              <span>{getTranslation("পণ্য বাল্ক আপলোড করুন", "Execute Batch CSV Import")}</span>
            </button>
          </div>
        </div>
      )}

      {/* ==================== ADD / EDIT CATEGORY MODAL ==================== */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                  {editingCategoryModal ? getTranslation("ক্যাটাগরি আপডেট", "Edit Category") : getTranslation("নতুন ক্যাটাগরি", "New Category")}
                </span>
                <h3 className="text-base font-black text-slate-800 mt-1">
                  {editingCategoryModal 
                    ? getTranslation(`"${editingCategoryModal.nameBn}" এডিট করুন`, `Edit Category "${editingCategoryModal.nameEn}"`)
                    : getTranslation("নতুন ক্যাটাগরি তৈরি করুন", "Create New Category")
                  }
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setShowCategoryModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveCategoryModal} className="space-y-4">
              {/* Category ID (Slug) */}
              <div>
                <label className="text-xs font-black text-slate-700 uppercase block mb-1">
                  {getTranslation("ক্যাটাগরি ইউনিক আইডি (Slug ID) *", "Category Slug ID *")}
                </label>
                <input 
                  type="text" 
                  required 
                  disabled={!!editingCategoryModal}
                  placeholder="e.g. fresh_fruits, spices, snacks"
                  value={modalCatId} 
                  onChange={(e) => setModalCatId(e.target.value)} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:opacity-60"
                />
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {editingCategoryModal 
                    ? getTranslation("ক্যাটাগরি আইডি পরিবর্তনযোগ্য নয়", "System slug ID cannot be changed once created")
                    : getTranslation("ছোট হাতের ইংরেজি অক্ষর ও আন্ডারস্কোর ব্যবহার করুন (e.g. organic_honey)", "Use lowercase letters and underscores")
                  }
                </span>
              </div>

              {/* Bangla Name & English Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black text-slate-700 uppercase block mb-1">
                    {getTranslation("ক্যাটাগরি নাম (বাংলা) *", "Category Name (Bangla) *")}
                  </label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. তাজা ফলমূল"
                    value={modalCatNameBn} 
                    onChange={(e) => setModalCatNameBn(e.target.value)} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-slate-700 uppercase block mb-1">
                    {getTranslation("ক্যাটাগরি নাম (ইংরেজি) *", "Category Name (English) *")}
                  </label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. Fresh Fruits"
                    value={modalCatNameEn} 
                    onChange={(e) => setModalCatNameEn(e.target.value)} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Icon presets & Custom Icon */}
              <div>
                <label className="text-xs font-black text-slate-700 uppercase block mb-1">
                  {getTranslation("আইকন নির্বাচন করুন (Lucide Icon)", "Icon Selection")}
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {["Salad", "Milk", "Apple", "Fish", "Flame", "Coffee", "Sparkles", "Package", "ShoppingBag"].map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setModalCatIcon(ic)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 border cursor-pointer transition ${
                        modalCatIcon === ic ? "bg-emerald-600 text-white border-emerald-600 shadow-xs" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {renderCategoryIcon(ic)}
                      <span>{ic}</span>
                    </button>
                  ))}
                </div>
                <input 
                  type="text" 
                  placeholder="Custom icon name e.g. Sparkles"
                  value={modalCatIcon} 
                  onChange={(e) => setModalCatIcon(e.target.value)} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none"
                />
              </div>

              {/* Category Image URL & File Upload */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-700 uppercase block">
                  {getTranslation("ক্যাটাগরি ইমেজ URL অথবা ক্লাউড আপলোড", "Category Image URL or Cloud Upload")}
                </label>
                <div className="flex gap-2">
                  <input 
                    type="url" 
                    placeholder="https://images.unsplash.com/..." 
                    value={modalCatImage} 
                    onChange={(e) => setModalCatImage(e.target.value)} 
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                  <input 
                    type="file" 
                    ref={modalCatFileInputRef} 
                    onChange={handleModalCatImageFileChange} 
                    accept="image/*" 
                    className="hidden" 
                  />
                  <button 
                    type="button" 
                    onClick={() => modalCatFileInputRef.current?.click()} 
                    disabled={uploadingModalCatImage} 
                    className="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition shrink-0"
                  >
                    {uploadingModalCatImage ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    <span>{getTranslation("আপলোড", "Upload")}</span>
                  </button>
                </div>

                {/* Preview Box */}
                <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <div className="w-12 h-12 rounded-xl bg-slate-200 border border-slate-300 flex items-center justify-center overflow-hidden shrink-0">
                    {modalCatImage ? (
                      <img src={modalCatImage} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      renderCategoryIcon(modalCatIcon)
                    )}
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">{getTranslation("লাইভ প্র প্রিভিউ", "Image Preview")}</div>
                    <div className="text-xs font-extrabold text-slate-800">{modalCatNameBn || modalCatNameEn || "Category Name"}</div>
                  </div>
                </div>
              </div>

              {/* Display Order & Active Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="text-xs font-black text-slate-700 uppercase block mb-1">
                    {getTranslation("ডিসপ্লে পজিশন নম্বর", "Display Order Number")}
                  </label>
                  <input 
                    type="number" 
                    value={modalCatDisplayOrder} 
                    onChange={(e) => setModalCatDisplayOrder(Number(e.target.value))} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 outline-none"
                  />
                </div>

                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-slate-700">
                    <input 
                      type="checkbox" 
                      checked={modalCatIsAvailable} 
                      onChange={(e) => setModalCatIsAvailable(e.target.checked)} 
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                    <span>{getTranslation("স্টোরে সক্রিয় ও দৃশ্যমান রাখুন", "Enable in store front")}</span>
                  </label>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowCategoryModal(false)}
                  className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold uppercase cursor-pointer"
                >
                  {getTranslation("বাতিল", "Cancel")}
                </button>
                <button 
                  type="submit" 
                  disabled={savingCategoryModal}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {savingCategoryModal && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{getTranslation("সেভ করুন", "Save Category")}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Delete Confirmation Modal */}
      <DeleteProductConfirmModal
        isOpen={!!productPendingDelete}
        product={productPendingDelete}
        orders={orders}
        user={user}
        lang={lang}
        onClose={() => setProductPendingDelete(null)}
        onSuccess={handleDeleteSuccess}
        triggerToast={triggerToast}
      />

    </div>
  );
}
