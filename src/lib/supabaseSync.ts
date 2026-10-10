import { supabase } from "./supabase";

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

    // Try counting other tables
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
      message: "Connected successfully! Database tables are ready.",
      tableCounts: counts,
    };
  } catch (err: any) {
    return {
      connected: false,
      message: err?.message || "Failed to connect to Supabase",
    };
  }
}

// Bulk sync utility from current memory/firestore state into Supabase
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
  const details: Record<string, number> = {};
  const errors: string[] = [];

  const update = (step: string, total: number, completed: number, status: SyncProgress["status"], error?: string) => {
    if (onProgress) onProgress({ step, total, completed, status, error });
  };

  try {
    // =====================================================================
    // 1. Sync Categories
    // =====================================================================
    if (dataset.categories && dataset.categories.length > 0) {
      update("Syncing Categories...", dataset.categories.length, 0, "running");
      const mappedRaw = dataset.categories.map((c, index) => {
        const rawId = c.id || c.categoryId || c.slug || `cat_${index}`;
        return {
          id: String(rawId).trim(),
          name_bn: c.nameBn || c.name || "ক্যাটাগরি",
          name_en: c.nameEn || c.name || "Category",
          icon_name: c.iconName || "ShoppingBag",
          color_class: c.colorClass || "bg-emerald-50 text-emerald-600",
          border_color: c.borderColor || "border-emerald-200",
          image: c.image || null,
          image_url: c.imageUrl || c.image || null,
          is_available: c.isAvailable !== false,
          display_order: Number(c.displayOrder || 0),
        };
      });

      // Deduplicate to avoid PostgreSQL ON CONFLICT DO UPDATE batch collisions
      const mapped = dedupeById(mappedRaw);

      let catSynced = 0;
      for (let i = 0; i < mapped.length; i += 50) {
        const batch = mapped.slice(i, i + 50);
        const { error } = await supabase.from("categories").upsert(batch, { onConflict: "id" });
        if (error) {
          errors.push(`Categories error: ${error.message}`);
          break;
        } else {
          catSynced += batch.length;
        }
      }

      if (catSynced > 0) {
        details.categories = catSynced;
      }
    }

    // =====================================================================
    // 2. Sync Subcategories
    // =====================================================================
    if (dataset.subcategories && dataset.subcategories.length > 0) {
      update("Syncing Subcategories...", dataset.subcategories.length, 0, "running");

      // Retrieve valid category IDs in Supabase to protect against Foreign Key Violations
      let validCatIds = new Set<string>();
      try {
        const { data: existingCats } = await supabase.from("categories").select("id");
        if (existingCats && Array.isArray(existingCats)) {
          validCatIds = new Set(existingCats.map((c: any) => String(c.id).trim()));
        }
      } catch (err) {
        console.warn("Could not query existing categories:", err);
      }

      const mappedRaw = dataset.subcategories.map((s, index) => {
        const rawId = s.id || `sub_${index}_${Math.random().toString(36).substring(2, 6)}`;
        const rawCatId = s.categoryId ? String(s.categoryId).trim() : null;
        // Foreign key check: only use category_id if that category actually exists in categories table
        const safeCatId = rawCatId && validCatIds.has(rawCatId) ? rawCatId : null;

        return {
          id: String(rawId).trim(),
          name_bn: s.nameBn || s.name || "",
          name_en: s.nameEn || s.name || "",
          category_id: safeCatId,
          category_slug: s.categorySlug || null,
          description_bn: s.descriptionBn || null,
          description_en: s.descriptionEn || null,
          icon_name: s.iconName || null,
          image: s.image || null,
          image_url: s.imageUrl || s.image || null,
          display_order: Number(s.displayOrder || 0),
          is_active: s.isActive !== false,
          is_deleted: !!s.isDeleted,
        };
      });

      const mapped = dedupeById(mappedRaw);

      let subSynced = 0;
      for (let i = 0; i < mapped.length; i += 50) {
        const batch = mapped.slice(i, i + 50);
        const { error } = await supabase.from("subcategories").upsert(batch, { onConflict: "id" });
        if (error) {
          errors.push(`Subcategories error: ${error.message}`);
          break;
        } else {
          subSynced += batch.length;
        }
      }

      if (subSynced > 0) {
        details.subcategories = subSynced;
      }
    }

    // =====================================================================
    // 3. Sync Products
    // =====================================================================
    if (dataset.products && dataset.products.length > 0) {
      update("Syncing Products...", dataset.products.length, 0, "running");
      const mappedRaw = dataset.products.map((p, index) => {
        const rawId = p.id || `prod_${index}_${Math.random().toString(36).substring(2, 6)}`;
        return {
          id: String(rawId).trim(),
          name_bn: p.nameBn || p.name || "",
          name_en: p.nameEn || p.name || "",
          price: Number(p.price || 0),
          original_price: Number(p.originalPrice || p.price || 0),
          unit_bn: p.unitBn || p.unit || "কেজি",
          unit_en: p.unitEn || p.unit || "kg",
          unit: p.unit || "kg",
          category: p.category || "",
          category_id: p.categoryId ? String(p.categoryId).trim() : null,
          subcategory: p.subcategory || null,
          sub_category_id: p.subCategoryId ? String(p.subCategoryId).trim() : null,
          image: p.image || null,
          image_url: p.imageUrl || p.image || null,
          is_flash_sale: !!p.isFlashSale,
          discount: Number(p.discount || 0),
          rating: Number(p.rating || 5.0),
          review_count: Number(p.reviewCount || 0),
          stock: Number(p.stock || 100),
          description_bn: p.descriptionBn || null,
          description_en: p.descriptionEn || null,
          is_best_selling: !!p.isBestSelling,
          is_new_arrival: !!p.isNewArrival,
          is_popular: !!p.isPopular,
          is_seasonal: !!p.isSeasonal,
          is_combo: !!p.isCombo,
          is_buy_more_save_more: !!p.isBuyMoreSaveMore,
          brand: p.brand || null,
          sku: p.sku || null,
          tags: Array.isArray(p.tags) ? p.tags : [],
          options: Array.isArray(p.options) ? p.options : [],
          available_shops: Array.isArray(p.availableShops) ? p.availableShops : [],
          partner_shop_id: p.partnerShopId ? String(p.partnerShopId) : null,
          partner_shop_name: p.partnerShopName || null,
          partner_id: p.partnerId ? String(p.partnerId) : null,
          is_available: p.isAvailable !== false,
          is_deleted: !!p.isDeleted,
          status: p.status || "active",
          display_order: Number(p.displayOrder || 0),
        };
      });

      const mapped = dedupeById(mappedRaw);

      let prodSynced = 0;
      let prodHadError = false;
      for (let i = 0; i < mapped.length; i += 50) {
        const batch = mapped.slice(i, i + 50);
        const { error } = await supabase.from("products").upsert(batch, { onConflict: "id" });
        if (error) {
          errors.push(`Products error (batch ${Math.floor(i / 50) + 1}): ${error.message}`);
          prodHadError = true;
          break;
        } else {
          prodSynced += batch.length;
        }
      }

      if (prodSynced > 0) {
        details.products = prodSynced;
      }
    }

    // =====================================================================
    // 4. Sync Staff
    // =====================================================================
    if (dataset.staff && dataset.staff.length > 0) {
      update("Syncing Staff Members...", dataset.staff.length, 0, "running");
      const mappedRaw = dataset.staff.map((s, index) => {
        const rawId = s.id || s.uid || s.staffId || `staff_${index}`;
        return {
          id: String(rawId).trim(),
          staff_id: s.staffId || String(rawId).trim(),
          username: s.username || null,
          full_name: s.fullName || s.name || "",
          mobile: s.mobile || s.phone || "",
          email: s.email || "",
          photo_url: s.photoUrl || null,
          digital_signature: s.digitalSignature || null,
          role: s.role || "admin",
          designation: s.designation || "Staff Member",
          department: s.department || "Operations",
          joining_date: s.joiningDate || null,
          blood_group: s.bloodGroup || null,
          emergency_contact: s.emergencyContact || null,
          monthly_salary: Number(s.monthlySalary || 0),
          salary_status: s.salaryStatus || "unpaid",
          last_payment_date: s.lastPaymentDate || null,
          salary_history: Array.isArray(s.salaryHistory) ? s.salaryHistory : [],
          status: s.status || "active",
          online_status: s.onlineStatus || "offline",
          permissions: s.permissions && typeof s.permissions === "object" ? s.permissions : {},
          assigned_agent_desk: s.assignedAgentDesk || null,
          is_super_admin: !!s.isSuperAdmin,
        };
      });

      const mapped = dedupeById(mappedRaw);

      let staffSynced = 0;
      for (let i = 0; i < mapped.length; i += 50) {
        const batch = mapped.slice(i, i + 50);
        const { error } = await supabase.from("staff").upsert(batch, { onConflict: "id" });
        if (error) {
          errors.push(`Staff error: ${error.message}`);
          break;
        } else {
          staffSynced += batch.length;
        }
      }

      if (staffSynced > 0) {
        details.staff = staffSynced;
      }
    }

    // =====================================================================
    // 5. Sync Partner Shops
    // =====================================================================
    if (dataset.partnerShops && dataset.partnerShops.length > 0) {
      update("Syncing Partner Shops...", dataset.partnerShops.length, 0, "running");
      const mappedRaw = dataset.partnerShops.map((shop, index) => {
        const rawId = shop.id || shop.partnerId || `shop_${index}`;
        return {
          id: String(rawId).trim(),
          partner_id: shop.partnerId || String(rawId).trim(),
          shop_name: shop.shopName || shop.name || "",
          logo: shop.logo || null,
          owner_name: shop.ownerName || null,
          mobile: shop.mobile || shop.phone || null,
          email: shop.email || null,
          address: shop.address || null,
          category: shop.category || null,
          joining_date: shop.joiningDate || null,
          commission_rate: Number(shop.commissionRate || 10),
          status: shop.status || "active",
          plain_password: shop.plainPassword || null,
          balance: Number(shop.balance || 0),
          total_sales: Number(shop.totalSales || 0),
          total_orders: Number(shop.totalOrders || 0),
          total_commission: Number(shop.totalCommission || 0),
          net_earnings: Number(shop.netEarnings || 0),
        };
      });

      const mapped = dedupeById(mappedRaw);

      let shopSynced = 0;
      for (let i = 0; i < mapped.length; i += 50) {
        const batch = mapped.slice(i, i + 50);
        const { error } = await supabase.from("partner_shops").upsert(batch, { onConflict: "id" });
        if (error) {
          errors.push(`Partner shops error: ${error.message}`);
          break;
        } else {
          shopSynced += batch.length;
        }
      }

      if (shopSynced > 0) {
        details.partnerShops = shopSynced;
      }
    }

    // =====================================================================
    // 6. Sync Orders
    // =====================================================================
    if (dataset.orders && dataset.orders.length > 0) {
      update("Syncing Orders...", dataset.orders.length, 0, "running");
      const mappedRaw = dataset.orders.map((o, index) => {
        const rawId = o.id || o.orderNumber || `order_${index}`;
        return {
          id: String(rawId).trim(),
          order_number: o.orderNumber || String(rawId).trim(),
          customer_id: o.customerId ? String(o.customerId) : null,
          customer_name: o.customerName || "Customer",
          customer_phone: o.customerPhone || "",
          delivery_address: o.deliveryAddress || "",
          delivery_area: o.deliveryArea || null,
          items: Array.isArray(o.items) ? o.items : [],
          subtotal: Number(o.subtotal || 0),
          discount: Number(o.discount || 0),
          delivery_charge: Number(o.deliveryCharge || 0),
          total: Number(o.total || 0),
          payment_method: o.paymentMethod || "Cash on Delivery",
          payment_status: o.paymentStatus || "Pending",
          order_status: o.orderStatus || "Pending",
          notes: o.notes || null,
          rider_id: o.riderId ? String(o.riderId) : null,
          rider_name: o.riderName || null,
          is_guest: !!o.isGuest,
          coupon_used: o.couponUsed || null,
          partner_assignments: Array.isArray(o.partnerAssignments) ? o.partnerAssignments : [],
        };
      });

      const mapped = dedupeById(mappedRaw);

      let orderSynced = 0;
      for (let i = 0; i < mapped.length; i += 50) {
        const batch = mapped.slice(i, i + 50);
        const { error } = await supabase.from("orders").upsert(batch, { onConflict: "id" });
        if (error) {
          errors.push(`Orders error (batch ${Math.floor(i / 50) + 1}): ${error.message}`);
          break;
        } else {
          orderSynced += batch.length;
        }
      }

      if (orderSynced > 0) {
        details.orders = orderSynced;
      }
    }

    const totalSynced = Object.values(details).reduce((a, b) => a + b, 0);
    const isFullSuccess = errors.length === 0;

    update(
      isFullSuccess ? "Sync complete!" : "Sync completed with warnings",
      totalSynced,
      totalSynced,
      isFullSuccess ? "success" : "error"
    );

    return {
      success: isFullSuccess,
      details,
      errors,
    };
  } catch (err: any) {
    update("Failed", 0, 0, "error", err?.message);
    return {
      success: false,
      details,
      errors: [...errors, err?.message || "Sync failure"],
    };
  }
}

// =========================================================================
// Real-time Single-Entity Sync Helpers (Automatic Dual-Write to Supabase)
// =========================================================================

export async function syncSingleProductToSupabase(p: any): Promise<boolean> {
  try {
    const cleanId = String(p.id || "").trim();
    if (!cleanId) return false;

    const rawCatId = p.categoryId || p.category_id || p.category || "";
    const cleanCatId = typeof rawCatId === "string" ? rawCatId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_") : "";

    const row = {
      id: cleanId,
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
      review_count: Number(p.reviewsCount || p.reviewCount) || 0,
      stock: Number(p.stock) || 100,
      description_bn: p.descriptionBn || p.description || null,
      description_en: p.descriptionEn || null,
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
      partner_shop_id: p.partnerShopId || null,
      partner_shop_name: p.partnerShopName || null,
      partner_id: p.partnerId || null,
      is_available: p.isAvailable !== false,
      is_deleted: !!(p.isDeleted || p.deleted || p.status === "deleted"),
      status: p.status || "active",
      display_order: Number(p.displayOrder || p.order) || 0,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from("products").upsert(row, { onConflict: "id" });
    if (error) {
      console.warn("[Supabase Real-Time] Single product upsert notice:", error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn("[Supabase Real-Time] Single product upsert exception:", err?.message || err);
    return false;
  }
}

export async function deleteProductFromSupabase(productId: string): Promise<boolean> {
  try {
    const cleanId = String(productId).trim();
    if (!cleanId) return false;
    const { error } = await supabase.from("products").update({
      is_deleted: true,
      status: "deleted",
      is_available: false,
      updated_at: new Date().toISOString()
    }).eq("id", cleanId);
    return !error;
  } catch {
    return false;
  }
}

export async function syncSingleCategoryToSupabase(c: any): Promise<boolean> {
  try {
    const cleanId = String(c.id || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_");
    if (!cleanId) return false;
    const row = {
      id: cleanId,
      name_bn: c.nameBn || c.name || "",
      name_en: c.nameEn || c.name || "",
      icon_name: c.iconName || "ShoppingBag",
      color_class: c.colorClass || "bg-emerald-50 text-emerald-600",
      border_color: c.borderColor || "border-emerald-200",
      image: c.image || c.imageUrl || null,
      image_url: c.imageUrl || c.image || null,
      is_available: c.isAvailable !== false && !c.disabled,
      display_order: Number(c.displayOrder || c.order) || 0,
      updated_at: new Date().toISOString()
    };
    const { error } = await supabase.from("categories").upsert(row, { onConflict: "id" });
    return !error;
  } catch {
    return false;
  }
}

export async function syncSingleSubcategoryToSupabase(s: any): Promise<boolean> {
  try {
    const cleanId = String(s.id || "").trim();
    if (!cleanId) return false;
    const rawCatId = s.categoryId || s.category_id || "";
    const cleanCatId = rawCatId ? String(rawCatId).trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_") : null;
    const row = {
      id: cleanId,
      name_bn: s.nameBn || s.name || "",
      name_en: s.nameEn || s.name || "",
      category_id: cleanCatId,
      category_slug: cleanCatId,
      icon_name: s.iconName || null,
      image: s.image || s.imageUrl || null,
      image_url: s.imageUrl || s.image || null,
      display_order: Number(s.displayOrder || s.order) || 0,
      is_active: s.isActive !== false && !s.disabled,
      is_deleted: !!(s.isDeleted || s.deleted),
      updated_at: new Date().toISOString()
    };
    const { error } = await supabase.from("subcategories").upsert(row, { onConflict: "id" });
    return !error;
  } catch {
    return false;
  }
}

export async function syncSingleOrderToSupabase(o: any): Promise<boolean> {
  try {
    const cleanId = String(o.id || "").trim();
    if (!cleanId) return false;
    const row = {
      id: cleanId,
      order_number: o.orderNumber || o.id || "",
      customer_id: o.customerId ? String(o.customerId) : null,
      customer_name: o.customerName || "Customer",
      customer_phone: o.customerPhone || "",
      delivery_address: o.deliveryAddress || "",
      delivery_area: o.deliveryArea || null,
      items: Array.isArray(o.items) ? o.items : [],
      subtotal: Number(o.subtotal || 0),
      discount: Number(o.discount || 0),
      delivery_charge: Number(o.deliveryCharge || 0),
      total: Number(o.total || 0),
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
    };
    const { error } = await supabase.from("orders").upsert(row, { onConflict: "id" });
    return !error;
  } catch {
    return false;
  }
}

export async function syncSingleStaffToSupabase(st: any): Promise<boolean> {
  try {
    const cleanId = String(st.id || "").trim();
    if (!cleanId) return false;
    const row = {
      id: cleanId,
      staff_id: st.staffId || st.staff_id || cleanId,
      username: st.username || null,
      full_name: st.fullName || st.name || "Staff",
      mobile: st.mobile || st.phone || "",
      email: st.email || "",
      photo_url: st.photoURL || st.photoUrl || st.photo || null,
      role: st.role || "admin",
      designation: st.designation || "Staff Member",
      department: st.department || "Operations",
      monthly_salary: Number(st.monthlySalary) || 0,
      salary_status: st.salaryStatus || "unpaid",
      status: st.status || "active",
      updated_at: new Date().toISOString()
    };
    const { error } = await supabase.from("staff").upsert(row, { onConflict: "id" });
    return !error;
  } catch {
    return false;
  }
}

export async function syncSinglePartnerShopToSupabase(ps: any): Promise<boolean> {
  try {
    const cleanId = String(ps.id || "").trim();
    if (!cleanId) return false;
    const row = {
      id: cleanId,
      partner_id: ps.partnerId || ps.partner_id || cleanId,
      shop_name: ps.shopName || ps.name || "Partner Shop",
      logo: ps.logo || ps.logoUrl || null,
      owner_name: ps.ownerName || null,
      mobile: ps.mobile || ps.phone || null,
      email: ps.email || null,
      address: ps.address || null,
      category: ps.category || null,
      commission_rate: Number(ps.commissionRate) || 10.0,
      status: ps.status || "active",
      balance: Number(ps.balance) || 0,
      total_sales: Number(ps.totalSales) || 0,
      total_orders: Number(ps.totalOrders) || 0,
      updated_at: new Date().toISOString()
    };
    const { error } = await supabase.from("partner_shops").upsert(row, { onConflict: "id" });
    return !error;
  } catch {
    return false;
  }
}
