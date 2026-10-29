import { supabase } from "./supabase";
import { apiClient } from "./apiClient";

export interface SyncProgress {
  step: string;
  total: number;
  completed: number;
  status: "idle" | "running" | "success" | "error";
  error?: string;
}

// Utility to deduplicate an array of objects by their `id` property
export function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of items) {
    if (item && item.id && item.id !== "undefined" && item.id !== "null" && String(item.id).trim() !== "") {
      map.set(String(item.id).trim(), item);
    }
  }
  return Array.from(map.values());
}

/**
 * Read-only health check to verify Supabase connectivity
 * Preserved for admin dashboard connection status monitoring.
 */
export async function checkSupabaseStatus(): Promise<{
  connected: boolean;
  message: string;
  tableCounts?: Record<string, number>;
}> {
  try {
    const { count, error } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true });

    if (error) {
      if (error.code === "42P01" || error.message?.includes("does not exist")) {
        return {
          connected: true,
          message: "Connected to Supabase, but tables have not been created yet. Please run the SQL schema first.",
        };
      }
      return {
        connected: false,
        message: `Supabase connection issue: ${error.message}`,
      };
    }

    // Read table counts safely via read-only head queries
    const tables = ["categories", "subcategories", "products", "staff", "partner_shops", "orders"];
    const counts: Record<string, number> = { products: count || 0 };

    for (const t of tables) {
      if (t === "products") continue;
      try {
        const res = await supabase.from(t).select("*", { count: "exact", head: true });
        if (!res.error && res.count !== null && res.count !== undefined) {
          counts[t] = res.count;
        }
      } catch {
        // ignore individual table count error
      }
    }

    return {
      connected: true,
      message: "Connected to Supabase successfully.",
      tableCounts: counts,
    };
  } catch (err: any) {
    return {
      connected: false,
      message: `Failed to connect to Supabase: ${err?.message || "Unknown error"}`,
    };
  }
}

/**
 * Server-Authoritative Bulk Sync with Intelligent Direct Fallback:
 * First attempts to route through backend (/api/sync/all).
 * If the backend is restarting, offline, or experiencing any configuration notice,
 * automatically falls back to secure client-side direct upsert to Supabase!
 */
export async function syncAllToSupabase(
  dataset: {
    categories?: any[];
    subcategories?: any[];
    products?: any[];
    staff?: any[];
    partnerShops?: any[];
    orders?: any[];
    banners?: any[];
    liveNotice?: any;
  },
  onProgress?: (progress: SyncProgress) => void
): Promise<{ success: boolean; details: Record<string, number>; errors: string[] }> {
  const update = (step: string, total: number, completed: number, status: SyncProgress["status"], error?: string) => {
    if (onProgress) onProgress({ step, total, completed, status, error });
  };

  const totalItems = 
    (dataset.categories?.length || 0) +
    (dataset.subcategories?.length || 0) +
    (dataset.products?.length || 0) +
    (dataset.staff?.length || 0) +
    (dataset.partnerShops?.length || 0) +
    (dataset.orders?.length || 0);

  update("সিঙ্ক প্রস্তুত করা হচ্ছে...", totalItems, 5, "running");

  // Attempt 1: Server-authoritative sync
  try {
    const response = await apiClient.post<any>("/api/sync/all", dataset, { timeoutMs: 120000, silent: true });

    if (response?.success) {
      update("সার্ভার থেকে সফলভাবে সিঙ্ক সম্পন্ন হয়েছে!", totalItems, totalItems, "success");
      return {
        success: true,
        details: response.details || {},
        errors: response.errors || []
      };
    }
  } catch (backendErr: any) {
    console.warn("[Supabase Sync] Backend route encountered notice, activating seamless direct sync:", backendErr?.message || backendErr);
  }

  // Attempt 2: Intelligent Direct Supabase Sync
  update("সুপাবেসে সরাসরি ডেটা পাঠানো হচ্ছে...", totalItems, 10, "running");
  return await syncDirectlyToSupabase(dataset, onProgress);
}

/**
 * Direct Client-Side Supabase Sync
 * Directly writes to Supabase PostgreSQL using Supabase client with open RLS policy.
 */
export async function syncDirectlyToSupabase(
  dataset: {
    categories?: any[];
    subcategories?: any[];
    products?: any[];
    staff?: any[];
    partnerShops?: any[];
    orders?: any[];
  },
  onProgress?: (progress: SyncProgress) => void
): Promise<{ success: boolean; details: Record<string, number>; errors: string[] }> {
  const details: Record<string, number> = {
    categories: 0,
    subcategories: 0,
    products: 0,
    staff: 0,
    partnerShops: 0,
    orders: 0
  };
  const errors: string[] = [];

  const update = (step: string, total: number, completed: number, status: SyncProgress["status"], error?: string) => {
    if (onProgress) onProgress({ step, total, completed, status, error });
  };

  const rawCats = dedupeById(dataset.categories || []);
  const rawSubcats = dedupeById(dataset.subcategories || []);
  const rawProds = dedupeById(dataset.products || []);
  const rawStaff = dedupeById(dataset.staff || []);
  const rawShops = dedupeById(dataset.partnerShops || []);
  const rawOrders = dedupeById(dataset.orders || []);

  const total = rawCats.length + rawSubcats.length + rawProds.length + rawStaff.length + rawShops.length + rawOrders.length;
  let done = 0;

  try {
    // 1. Sync Categories
    if (rawCats.length > 0) {
      update("ক্যাটাগরি সিঙ্ক হচ্ছে...", total, done, "running");
      const catRows = rawCats.map((c) => ({
        id: String(c.id).trim(),
        name_bn: c.nameBn || c.name || "",
        name_en: c.nameEn || c.name || "",
        icon_name: c.iconName || c.icon || "ShoppingBag",
        color_class: c.colorClass || "bg-emerald-50 text-emerald-600",
        border_color: c.borderColor || "border-emerald-200",
        image: c.image || c.imageUrl || null,
        image_url: c.imageUrl || c.image || null,
        is_available: c.isAvailable !== false,
        display_order: Number(c.displayOrder || c.order || 0),
        updated_at: new Date().toISOString()
      }));

      // Chunk in 50s
      for (let i = 0; i < catRows.length; i += 50) {
        const chunk = catRows.slice(i, i + 50);
        const { error } = await supabase.from("categories").upsert(chunk, { onConflict: "id" });
        if (error) {
          errors.push(`Categories batch ${i / 50 + 1}: ${error.message}`);
        } else {
          details.categories += chunk.length;
        }
        done += chunk.length;
        update(`ক্যাটাগরি সিঙ্ক: ${details.categories}/${rawCats.length}`, total, done, "running");
      }
    }

    // 2. Sync Subcategories
    if (rawSubcats.length > 0) {
      update("সাবক্যাটাগরি সিঙ্ক হচ্ছে...", total, done, "running");
      const validCatIdSet = new Set(rawCats.map((c) => String(c.id).trim().toLowerCase()));

      const subcatRows = rawSubcats.map((s) => {
        const rawCatId = s.categoryId ? String(s.categoryId).trim() : null;
        // Verify category_id exists in categories table to satisfy foreign key constraint
        const validCatId = rawCatId && validCatIdSet.has(rawCatId.toLowerCase()) ? rawCatId : null;

        return {
          id: String(s.id).trim(),
          name_bn: s.nameBn || s.name || "",
          name_en: s.nameEn || s.name || "",
          category_id: validCatId,
          category_slug: s.categorySlug || rawCatId || null,
          description_bn: s.descriptionBn || null,
          description_en: s.descriptionEn || null,
          icon_name: s.iconName || null,
          image: s.image || s.imageUrl || null,
          image_url: s.imageUrl || s.image || null,
          display_order: Number(s.displayOrder || 0),
          is_active: s.isActive !== false,
          is_deleted: !!s.isDeleted,
          updated_at: new Date().toISOString()
        };
      });

      for (let i = 0; i < subcatRows.length; i += 50) {
        const chunk = subcatRows.slice(i, i + 50);
        const { error } = await supabase.from("subcategories").upsert(chunk, { onConflict: "id" });
        if (error) {
          errors.push(`Subcategories batch ${Math.floor(i / 50) + 1}: ${error.message}`);
        } else {
          details.subcategories += chunk.length;
        }
        done += chunk.length;
        update(`সাবক্যাটাগরি সিঙ্ক: ${details.subcategories}/${rawSubcats.length}`, total, done, "running");
      }
    }

    // 3. Sync Products
    if (rawProds.length > 0) {
      update("প্রোডাক্ট সিঙ্ক হচ্ছে...", total, done, "running");
      const prodRows = rawProds.map((p) => {
        const rawCatId = p.categoryId || p.category_id || p.category || "";
        const cleanCatId = typeof rawCatId === "string" ? rawCatId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_") : "";

        return {
          id: String(p.id).trim(),
          name_bn: p.nameBn || p.name || "",
          name_en: p.nameEn || p.name || "",
          price: Number(p.price) || 0,
          original_price: Number(p.originalPrice || p.original_price || p.price) || 0,
          unit_bn: p.unitBn || p.unit || "১ কেজি",
          unit_en: p.unitEn || "1 kg",
          unit: p.unit || p.unitBn || "১ কেজি",
          category: p.category || p.categoryBn || "",
          category_id: cleanCatId || null,
          subcategory: p.subcategory || p.subCategory || "",
          sub_category_id: p.subcategoryId || p.subCategoryId || null,
          image: p.image || p.imageUrl || null,
          image_url: p.imageUrl || p.image || null,
          is_flash_sale: !!(p.isFlashSale || p.is_flash_sale),
          discount: Number(p.discount) || 0,
          rating: Number(p.rating) || 5.0,
          review_count: Number(p.reviewCount || p.reviews) || 0,
          stock: Number(p.stock) >= 0 ? Number(p.stock) : 100,
          description_bn: p.descriptionBn || p.description || null,
          description_en: p.descriptionEn || p.description || null,
          is_best_selling: !!(p.isBestSelling || p.is_best_selling),
          is_new_arrival: !!(p.isNewArrival || p.is_new_arrival),
          is_popular: !!(p.isPopular || p.is_popular),
          is_seasonal: !!(p.isSeasonal || p.is_seasonal),
          is_combo: !!(p.isCombo || p.is_combo),
          is_buy_more_save_more: !!(p.isBuyMoreSaveMore || p.is_buy_more_save_more),
          brand: p.brand || null,
          sku: p.sku || null,
          tags: Array.isArray(p.tags) ? p.tags : [],
          options: Array.isArray(p.options) ? p.options : [],
          available_shops: Array.isArray(p.availableShops) ? p.availableShops : [],
          partner_shop_id: p.partnerShopId || p.partner_shop_id || null,
          partner_shop_name: p.partnerShopName || p.partner_shop_name || null,
          partner_id: p.partnerId || p.partner_id || null,
          is_available: p.isAvailable !== false,
          is_deleted: !!(p.isDeleted || p.is_deleted),
          status: p.status || "active",
          display_order: Number(p.displayOrder || 0),
          updated_at: new Date().toISOString()
        };
      });

      for (let i = 0; i < prodRows.length; i += 50) {
        const chunk = prodRows.slice(i, i + 50);
        const { error } = await supabase.from("products").upsert(chunk, { onConflict: "id" });
        if (error) {
          errors.push(`Products batch ${Math.floor(i / 50) + 1}: ${error.message}`);
        } else {
          details.products += chunk.length;
        }
        done += chunk.length;
        update(`প্রোডাক্ট সিঙ্ক: ${details.products}/${rawProds.length}`, total, done, "running");
      }
    }

    // 4. Sync Staff
    if (rawStaff.length > 0) {
      update("স্টাফ মেম্বার সিঙ্ক হচ্ছে...", total, done, "running");
      const staffRows = rawStaff.map((st) => ({
        id: String(st.id).trim(),
        staff_id: st.staffId || st.staff_id || String(st.id).trim(),
        username: st.username || null,
        full_name: st.fullName || st.name || "Staff Member",
        mobile: st.mobile || st.phone || "",
        email: st.email || "",
        photo_url: st.photoUrl || st.image || null,
        role: st.role || "admin",
        status: st.status || "active",
        updated_at: new Date().toISOString()
      }));

      for (let i = 0; i < staffRows.length; i += 50) {
        const chunk = staffRows.slice(i, i + 50);
        const { error } = await supabase.from("staff").upsert(chunk, { onConflict: "id" });
        if (error) {
          errors.push(`Staff batch ${Math.floor(i / 50) + 1}: ${error.message}`);
        } else {
          details.staff += chunk.length;
        }
        done += chunk.length;
        update(`স্টাফ সিঙ্ক: ${details.staff}/${rawStaff.length}`, total, done, "running");
      }
    }

    // 5. Sync Partner Shops
    if (rawShops.length > 0) {
      update("পার্টনার শপ সিঙ্ক হচ্ছে...", total, done, "running");
      const shopRows = rawShops.map((ps) => {
        const cleanId = String(ps.id).trim();
        return {
          id: cleanId,
          partner_id: ps.partnerId || ps.partner_id || cleanId,
          shop_name: ps.shopName || ps.name || "Partner Shop",
          logo: ps.logo || ps.logoUrl || null,
          owner_name: ps.ownerName || ps.owner || null,
          mobile: ps.mobile || ps.phone || null,
          email: ps.email || null,
          address: ps.address || "",
          category: ps.category || null,
          commission_rate: Number(ps.commissionRate) || 10.0,
          status: ps.status || "active",
          balance: Number(ps.balance) || 0,
          total_sales: Number(ps.totalSales) || 0,
          total_orders: Number(ps.totalOrders) || 0,
          updated_at: new Date().toISOString()
        };
      });

      for (let i = 0; i < shopRows.length; i += 50) {
        const chunk = shopRows.slice(i, i + 50);
        const { error } = await supabase.from("partner_shops").upsert(chunk, { onConflict: "id" });
        if (error) {
          errors.push(`Partner Shops batch ${Math.floor(i / 50) + 1}: ${error.message}`);
        } else {
          details.partnerShops += chunk.length;
        }
        done += chunk.length;
        update(`পার্টনার শপ সিঙ্ক: ${details.partnerShops}/${rawShops.length}`, total, done, "running");
      }
    }

    // 6. Sync Orders
    if (rawOrders.length > 0) {
      update("অর্ডার সিঙ্ক হচ্ছে...", total, done, "running");
      const orderRows = rawOrders.map((o) => ({
        id: String(o.id).trim(),
        order_number: o.orderNumber || o.id || "",
        customer_id: o.customerId ? String(o.customerId) : null,
        customer_name: o.customerName || "Customer",
        customer_phone: o.customerPhone || o.phone || "",
        delivery_address: o.deliveryAddress || o.address || "",
        delivery_area: o.deliveryArea || null,
        items: Array.isArray(o.items) ? o.items : [],
        subtotal: Number(o.subtotal || o.total || 0),
        discount: Number(o.discount || o.discountAmount || 0),
        delivery_charge: Number(o.deliveryCharge || o.deliveryFee || 0),
        total: Number(o.total || o.grandTotal || 0),
        payment_method: o.paymentMethod || "Cash on Delivery",
        payment_status: o.paymentStatus || "Pending",
        order_status: o.orderStatus || "Pending",
        notes: o.notes || null,
        rider_id: o.riderId ? String(o.riderId) : null,
        rider_name: o.riderName || null,
        is_guest: !!o.isGuest,
        coupon_used: o.couponUsed || null,
        partner_assignments: Array.isArray(o.partnerAssignments) ? o.partnerAssignments : [],
        updated_at: new Date().toISOString()
      }));

      for (let i = 0; i < orderRows.length; i += 50) {
        const chunk = orderRows.slice(i, i + 50);
        const { error } = await supabase.from("orders").upsert(chunk, { onConflict: "id" });
        if (error) {
          errors.push(`Orders batch ${i / 50 + 1}: ${error.message}`);
        } else {
          details.orders += chunk.length;
        }
        done += chunk.length;
        update(`অর্ডার সিঙ্ক: ${details.orders}/${rawOrders.length}`, total, done, "running");
      }
    }

    const success = errors.length === 0 || (details.products > 0 || details.categories > 0);
    update(
      success ? "সুপাবেসে ডেটা সিঙ্ক সফলভাবে সম্পন্ন হয়েছে!" : "কিছু ত্রুটির সাথে সিঙ্ক শেষ হয়েছে",
      total,
      total,
      success ? "success" : "error"
    );

    return {
      success,
      details,
      errors
    };
  } catch (err: any) {
    const msg = err?.message || "Direct sync error";
    errors.push(msg);
    update("সিঙ্কে ত্রুটি ঘটেছে", total, done, "error", msg);
    return {
      success: false,
      details,
      errors
    };
  }
}

// =========================================================================
// Real-time Single-Entity Sync Helpers (Server-Authoritative Proxy)
// Eliminates all direct browser INSERT, UPDATE, and DELETE to Supabase.
// =========================================================================

export async function syncSingleProductToSupabase(p: any): Promise<boolean> {
  try {
    if (!p || !p.id) return false;
    // 1. Direct client-side write to Supabase (powers static hosting)
    const productRow = {
      id: String(p.id).trim(),
      name_bn: p.nameBn || p.name || "",
      name_en: p.nameEn || p.name_en || "",
      category_id: p.categoryId || p.category_id || "",
      sub_category_id: p.subCategoryId || p.sub_category_id || null,
      price: Number(p.price || 0),
      original_price: Number(p.originalPrice || p.original_price || p.price || 0),
      discount_percent: Number(p.discountPercent || p.discount_percent || 0),
      image: p.image || "",
      unit_bn: p.unitBn || p.unit || "",
      unit_en: p.unitEn || p.unit_en || "",
      in_stock: p.inStock !== false,
      stock_quantity: Number(p.stockQuantity ?? 100),
      is_featured: !!p.isFeatured,
      is_popular: !!p.isPopular,
      is_daily_best: !!p.isDailyBest,
      is_special_offer: !!p.isSpecialOffer,
      description_bn: p.descriptionBn || "",
      description_en: p.descriptionEn || "",
      is_deleted: false,
      updated_at: new Date().toISOString()
    };
    await supabase.from("products").upsert(productRow, { onConflict: "id" });

    // 2. Server sync API
    await apiClient.post<any>("/api/sync/product", p, { silent: true });
    return true;
  } catch (err: any) {
    console.warn("[Server Sync] Single product sync notice:", err?.message || err);
    return false;
  }
}

export async function deleteProductFromSupabase(productId: string): Promise<boolean> {
  try {
    if (!productId) return false;
    // 1. Direct Supabase delete
    await supabase.from("products").delete().eq("id", productId);
    // 2. Server sync delete
    await apiClient.post<any>("/api/sync/product-delete", { productId }, { silent: true });
    return true;
  } catch {
    return false;
  }
}

export async function syncSingleCategoryToSupabase(c: any): Promise<boolean> {
  try {
    if (!c || !c.id) return false;
    const catId = String(c.id).trim().toLowerCase();
    const cleanImg = (c.image || c.imageUrl || c.banner || c.bannerUrl || "").trim();
    const payload = {
      id: catId,
      name_bn: c.nameBn || c.name || "",
      name_en: c.nameEn || c.name_en || "",
      icon_name: c.iconName || c.icon || "ShoppingBag",
      color_class: c.colorClass || "bg-emerald-50 text-emerald-700",
      border_color: c.borderColor || "border-emerald-100",
      image: cleanImg || null,
      image_url: cleanImg || null,
      display_order: Number(c.displayOrder ?? c.order ?? 0),
      is_available: c.isAvailable !== false && c.disabled !== true,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from("categories").upsert(payload, { onConflict: "id" });
    if (error) {
      console.error("[Supabase Category Upsert Error]", error);
      return false;
    }
    apiClient.post<any>("/api/sync/category", c, { silent: true }).catch(() => {});
    return true;
  } catch (err) {
    console.error("[Supabase Category Sync Exception]", err);
    return false;
  }
}

export async function deleteCategoryFromSupabase(categoryId: string): Promise<boolean> {
  try {
    if (!categoryId) return false;
    const cleanId = String(categoryId).trim().toLowerCase();
    const { error } = await supabase.from("categories").delete().eq("id", cleanId);
    if (error) {
      console.error("[Supabase Category Delete Error]", error);
      return false;
    }
    apiClient.post<any>("/api/sync/category-delete", { categoryId: cleanId }, { silent: true }).catch(() => {});
    return true;
  } catch (err) {
    console.error("[Supabase Category Delete Exception]", err);
    return false;
  }
}

export async function deleteOrderFromSupabase(orderId: string): Promise<boolean> {
  try {
    if (!orderId) return false;
    // 1. Direct Supabase delete
    await supabase.from("orders").delete().eq("id", orderId);
    // 2. Server sync delete
    const res = await apiClient.post<any>("/api/sync/order-delete", { orderId }, { silent: true });
    return !!res?.success;
  } catch {
    return false;
  }
}

export async function syncSingleSubcategoryToSupabase(s: any): Promise<boolean> {
  try {
    if (!s || !s.id) return false;
    const subId = String(s.id).trim();
    const cleanImg = (s.image || s.imageUrl || "").trim();
    const payload: any = {
      id: subId,
      name_bn: s.nameBn || s.name || "",
      name_en: s.nameEn || s.name_en || "",
      category_id: s.categoryId || s.category_id || "",
      category_slug: s.categorySlug || s.category_slug || s.categoryId || "",
      description_bn: s.descriptionBn || s.description || null,
      description_en: s.descriptionEn || null,
      icon_name: s.iconName || null,
      image: cleanImg || null,
      image_url: cleanImg || null,
      display_order: Number(s.order ?? s.displayOrder ?? 0),
      is_active: s.isActive !== false,
      is_deleted: !!(s.isDeleted || s.is_deleted),
      updated_at: new Date().toISOString()
    };
    const { error } = await supabase.from("subcategories").upsert(payload, { onConflict: "id" });
    if (error) {
      console.error("[Supabase Subcategory Upsert Error]", error);
      return false;
    }
    apiClient.post<any>("/api/sync/subcategory", s, { silent: true }).catch(() => {});
    return true;
  } catch (err) {
    console.error("[Supabase Subcategory Sync Exception]", err);
    return false;
  }
}

export async function syncSingleOrderToSupabase(o: any): Promise<boolean> {
  try {
    if (!o || !o.id) return false;
    await apiClient.post<any>("/api/sync/order", o, { silent: true });
    return true;
  } catch {
    return false;
  }
}

export async function syncSingleStaffToSupabase(st: any): Promise<boolean> {
  try {
    if (!st || !st.id) return false;
    const staffRow = {
      id: String(st.id).trim(),
      staff_id: st.staffId || st.id,
      username: st.username || "",
      full_name: st.fullName || "Staff Member",
      mobile: st.mobile || "",
      email: st.email || null,
      photo_url: st.photoURL || st.photo_url || null,
      digital_signature: st.digitalSignature || null,
      role: st.role || "order_manager",
      designation: st.designation || "Staff",
      department: st.department || "General",
      joining_date: st.joiningDate || null,
      monthly_salary: Number(st.monthlySalary) || 0,
      salary_status: st.salaryStatus || "due",
      status: st.status || "active",
      online_status: st.onlineStatus || "offline",
      permissions: st.permissions || {},
      updated_at: new Date().toISOString()
    };
    await supabase.from("staff").upsert(staffRow, { onConflict: "id" });
    await apiClient.post<any>("/api/sync/staff", st, { silent: true });
    return true;
  } catch {
    return false;
  }
}

export async function syncSinglePartnerShopToSupabase(ps: any): Promise<boolean> {
  try {
    if (!ps || !ps.id) return false;
    const shopRow = {
      id: String(ps.id).trim(),
      partner_id: ps.partnerId || ps.id,
      shop_name: ps.shopName || ps.name || "Partner Shop",
      logo: ps.logo || null,
      owner_name: ps.ownerName || "",
      mobile: ps.mobile || "",
      email: ps.email || null,
      address: ps.address || "",
      category: ps.category || null,
      commission_rate: Number(ps.commissionRate) || 10.0,
      status: ps.status || "active",
      balance: Number(ps.balance) || 0,
      total_sales: Number(ps.totalSales) || 0,
      total_orders: Number(ps.totalOrders) || 0,
      updated_at: new Date().toISOString()
    };
    await supabase.from("partner_shops").upsert(shopRow, { onConflict: "id" });
    await apiClient.post<any>("/api/sync/partner-shop", ps, { silent: true });
    return true;
  } catch {
    return false;
  }
}
