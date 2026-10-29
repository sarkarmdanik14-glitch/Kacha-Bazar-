/**
 * Supabase Data Service
 * Loads and real-time synchronizes all Products, Categories, and Subcategories directly from Supabase PostgreSQL.
 */

import { supabase } from "./supabase";
import { Product, Category, Subcategory } from "../types";
import { mapDocToProduct } from "./productWeightUtils";
import { shouldKeepProductGroceryFiltered, mergeCategoryCards } from "./categoryUtils";
import { OFFICIAL_MEDICINE_PRICES } from "../data";

/**
 * Normalizes a raw Supabase PostgreSQL row into the standard Product type.
 */
export function mapSupabaseProductRow(row: any): Product {
  const normalized = {
    ...row,
    id: String(row.id),
    nameBn: row.name_bn || row.nameBn,
    nameEn: row.name_en || row.nameEn,
    price: row.price !== undefined && row.price !== null ? Number(row.price) : 0,
    originalPrice: row.original_price !== undefined && row.original_price !== null ? Number(row.original_price) : row.originalPrice,
    unitBn: row.unit_bn || row.unitBn || row.unit || "১ পিস",
    unitEn: row.unit_en || row.unitEn || "1 pc",
    unit: row.unit || row.unit_bn || row.unitBn || "১ পিস",
    category: row.category || row.category_id || "groceries",
    categoryId: row.category_id || row.categoryId || "groceries",
    subcategory: row.subcategory || row.subCategory || "General",
    subCategory: row.subcategory || row.subCategory || "General",
    subcategoryId: row.sub_category_id || row.subcategoryId || row.subCategoryId || "",
    subCategoryId: row.sub_category_id || row.subcategoryId || row.subCategoryId || "",
    image: row.image || row.image_url || row.imageUrl || "",
    imageUrl: row.image_url || row.image || row.imageUrl || "",
    isFlashSale: !!(row.is_flash_sale ?? row.isFlashSale),
    discount: Number(row.discount || 0),
    rating: Number(row.rating || 4.8),
    reviewCount: Number(row.review_count ?? row.reviewCount ?? 1),
    stock: typeof row.stock === "number" ? row.stock : Number(row.stock || 50),
    descriptionBn: row.description_bn || row.descriptionBn || "",
    descriptionEn: row.description_en || row.descriptionEn || "",
    isBestSelling: !!(row.is_best_selling ?? row.isBestSelling),
    isNewArrival: !!(row.is_new_arrival ?? row.isNewArrival),
    isPopular: !!(row.is_popular ?? row.isPopular),
    isSeasonal: !!(row.is_seasonal ?? row.isSeasonal),
    isCombo: !!(row.is_combo ?? row.isCombo),
    isBuyMoreSaveMore: !!(row.is_buy_more_save_more ?? row.isBuyMoreSaveMore),
    brand: row.brand || "Mega Bazar",
    sku: row.sku || `MB-${row.id}`,
    tags: Array.isArray(row.tags) ? row.tags : [],
    options: Array.isArray(row.options) ? row.options : [],
    availableShops: Array.isArray(row.available_shops) ? row.available_shops : [],
    partnerShopId: row.partner_shop_id || row.partnerShopId || null,
    partnerShopName: row.partner_shop_name || row.partnerShopName || null,
    partnerId: row.partner_id || row.partnerId || null,
    isAvailable: row.is_available !== false && row.isAvailable !== false,
    isDeleted: !!(row.is_deleted || row.isDeleted || row.status === "deleted"),
    deleted: !!(row.is_deleted || row.isDeleted || row.status === "deleted"),
    status: row.status || (row.is_deleted ? "deleted" : "active"),
    displayOrder: Number(row.display_order ?? row.displayOrder ?? 0),
    createdAt: row.created_at || row.createdAt,
    updatedAt: row.updated_at || row.updatedAt,
  };

  const mapped = mapDocToProduct(row.id, normalized);

  // Guarantee official pharmacy pricing if 0 or missing
  if (row.id.startsWith("ph") || row.category === "pharmacy" || row.category_id === "pharmacy") {
    const officialPrice = (OFFICIAL_MEDICINE_PRICES as Record<string, number>)[row.id];
    if (officialPrice && officialPrice > 0) {
      if (!mapped.price || mapped.price <= 0) {
        mapped.price = officialPrice;
        mapped.originalPrice = mapped.originalPrice && mapped.originalPrice > 0 ? mapped.originalPrice : officialPrice;
      }
    }
  }

  // Guarantee valid restaurant pricing for rest5 (তেহেরী) & rest30 (স্পেশাল দই বড় সাইজ)
  if (row.id === "rest5" && (!mapped.price || mapped.price <= 0)) {
    mapped.price = 160;
    mapped.originalPrice = 180;
  }
  if (row.id === "rest30" && (!mapped.price || mapped.price <= 0)) {
    mapped.price = 450;
    mapped.originalPrice = 500;
  }

  // Normalize duplicate restaurant subcategory name to canonical "পানীয়, জুস ও মিষ্টি"
  if (mapped.subcategory === "পানীয়, জুস ও কফি") {
    mapped.subcategory = "পানীয়, জুস ও মিষ্টি";
    mapped.subCategory = "পানীয়, জুস ও মিষ্টি";
  }

  return mapped;
}

/**
 * Normalizes a raw Supabase PostgreSQL row into the standard Category type.
 */
export function mapSupabaseCategoryRow(row: any): Category {
  return {
    id: row.id,
    nameBn: row.name_bn || row.nameBn || row.name || "",
    nameEn: row.name_en || row.nameEn || row.name || "",
    iconName: row.icon_name || row.iconName || "ShoppingBag",
    colorClass: row.color_class || row.colorClass || "bg-emerald-50 text-emerald-600",
    borderColor: row.border_color || row.borderColor || "border-emerald-200",
    image: row.image || row.image_url || row.imageUrl || undefined,
    imageUrl: row.image_url || row.image || row.imageUrl || undefined,
    isAvailable: row.is_available !== false && row.isAvailable !== false,
    displayOrder: Number(row.display_order ?? row.displayOrder ?? 0),
    order: Number(row.display_order ?? row.displayOrder ?? 0),
  };
}

/**
 * Normalizes a raw Supabase PostgreSQL row into the standard Subcategory type.
 */
export function mapSupabaseSubcategoryRow(row: any): Subcategory {
  return {
    id: row.id,
    nameBn: row.name_bn || row.nameBn || "",
    nameEn: row.name_en || row.nameEn || "",
    categoryId: row.category_id || row.categoryId || "",
    categorySlug: row.category_slug || row.categorySlug || "",
    descriptionBn: row.description_bn || row.descriptionBn || "",
    descriptionEn: row.description_en || row.descriptionEn || "",
    iconName: row.icon_name || row.iconName || "",
    image: row.image || row.image_url || "",
    imageUrl: row.image_url || row.image || "",
    order: Number(row.display_order ?? row.order ?? 0),
    isActive: row.is_active !== false && row.isActive !== false,
    isDeleted: !!(row.is_deleted || row.isDeleted),
  };
}

export const RESTAURANT_UNSPLASH_DUPLICATE_IDS = new Set([
  "rest_item_basmati_mutton_kacchi_egg",
  "rest_item_shahi_morog_polao_egg",
  "rest_item_chicken_biryani_half",
  "rest_item_chicken_biryani_full",
  "rest_item_basmati_chicken_dum_biryani",
  "rest_item_mutton_tehari_full",
  "rest_item_mutton_tehari_half",
  "rest_item_egg_polao_half",
  "rest_item_egg_polao_full",
  "rest_item_bhuna_khichuri_half_egg",
  "rest_item_borhani_1_liter",
  "rest_item_borhani_500ml",
  "rest_item_borhani_glass"
]);

const PRODUCTS_CACHE_KEY = "kb_products_cache_v6";
const CATEGORIES_CACHE_KEY = "kb_categories_cache_v6";

/**
 * Retrieves cached products from local storage for instant 0ms hydration.
 */
export function getCachedProducts(): Product[] | null {
  try {
    // Purge legacy caches containing duplicate st, sp, gro_, and rest items
    try {
      localStorage.removeItem("kb_products_cache_v5");
      localStorage.removeItem("kb_products_cache_v4");
      localStorage.removeItem("kb_products_cache_v3");
      localStorage.removeItem("kb_products_cache_v2");
      localStorage.removeItem("kb_products_cache");
    } catch {}

    const raw = localStorage.getItem(PRODUCTS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed
        .filter((p: any) => p && !p.isDeleted && p.status !== "deleted" && !p.deleted && !/^st\d+$/i.test(p.id) && !/^sp\d+$/i.test(p.id) && !/^gro_\d+$/i.test(p.id) && !/^fr\d+$/i.test(p.id) && !RESTAURANT_UNSPLASH_DUPLICATE_IDS.has(p.id))
        .filter(shouldKeepProductGroceryFiltered);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Saves products to local storage safely.
 */
export function saveCachedProducts(products: Product[]): void {
  try {
    if (!products || products.length === 0) return;
    localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(products));
  } catch (e) {
    // If quota exceeds, safely ignore
    console.debug("[Cache] Products cache storage notice:", e);
  }
}

/**
 * Helper to apply resilient local category overrides to preserve user uploads/edits.
 */
export function applyCategoryOverrides(cats: Category[]): Category[] {
  try {
    if (typeof window === "undefined" || typeof localStorage === "undefined") return cats;
    const raw = localStorage.getItem("kb_categories_override");
    if (!raw) return cats;
    const overrides = JSON.parse(raw);
    if (!overrides || typeof overrides !== "object") return cats;

    const existingIds = new Set<string>();
    const mapped = cats.map((cat) => {
      existingIds.add(cat.id);
      const ov = overrides[cat.id];
      if (ov) {
        const cleanImg = (ov.image || ov.imageUrl || ov.banner || ov.bannerUrl || "").trim();
        return {
          ...cat,
          nameBn: ov.nameBn || cat.nameBn,
          nameEn: ov.nameEn || cat.nameEn,
          iconName: ov.iconName || cat.iconName,
          colorClass: ov.colorClass || cat.colorClass,
          borderColor: ov.borderColor || cat.borderColor,
          image: cleanImg || cat.image,
          imageUrl: cleanImg || cat.imageUrl,
          isAvailable: ov.isAvailable !== undefined ? ov.isAvailable : cat.isAvailable,
          displayOrder: typeof ov.displayOrder === "number" ? ov.displayOrder : cat.displayOrder,
          order: typeof ov.displayOrder === "number" ? ov.displayOrder : cat.order,
        };
      }
      return cat;
    });

    // Also include any standalone override categories not present in the base list
    for (const id of Object.keys(overrides)) {
      if (!existingIds.has(id)) {
        mapped.push(overrides[id]);
      }
    }

    return mapped;
  } catch {
    return cats;
  }
}

/**
 * Retrieves cached categories from local storage.
 */
export function getCachedCategories(): Category[] | null {
  try {
    if (typeof window === "undefined" || typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(CATEGORIES_CACHE_KEY);
    if (!raw) {
      // Check if overrides exist even without full cache
      const ovRaw = localStorage.getItem("kb_categories_override");
      if (ovRaw) {
        return applyCategoryOverrides([]);
      }
      return null;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return applyCategoryOverrides(mergeCategoryCards(parsed));
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Saves categories to local storage safely.
 */
export function saveCachedCategories(categories: Category[]): void {
  try {
    if (typeof window === "undefined" || typeof localStorage === "undefined") return;
    if (!categories || categories.length === 0) return;
    localStorage.setItem(CATEGORIES_CACHE_KEY, JSON.stringify(categories));
  } catch (e) {
    console.debug("[Cache] Categories cache storage notice:", e);
  }
}

/**
 * Fetches all products from Supabase PostgreSQL (handles 1000+ pagination).
 * Automatically updates cache and gracefully falls back to cached data on network drop.
 */
export async function fetchAllProductsFromSupabase(): Promise<Product[]> {
  try {
    const PAGE_SIZE = 1000;
    let allRows: any[] = [];
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false })
        .range(from, from + PAGE_SIZE - 1);

      if (error) {
        console.warn("[Supabase] Error fetching products batch:", error.message);
        break;
      }

      if (data && data.length > 0) {
        allRows = allRows.concat(data);
        if (data.length < PAGE_SIZE) {
          hasMore = false;
        } else {
          from += PAGE_SIZE;
        }
      } else {
        hasMore = false;
      }
    }

    if (allRows.length === 0) {
      // Fallback to cached products if available
      const cached = getCachedProducts();
      return cached && cached.length > 0 ? cached : [];
    }

    const products: Product[] = allRows
      .filter((r) => !r.is_deleted && r.status !== "deleted" && !/^st\d+$/i.test(r.id) && !/^sp\d+$/i.test(r.id) && !/^gro_\d+$/i.test(r.id) && !/^fr\d+$/i.test(r.id) && !RESTAURANT_UNSPLASH_DUPLICATE_IDS.has(r.id))
      .map(mapSupabaseProductRow)
      .filter(shouldKeepProductGroceryFiltered);

    if (products.length > 0) {
      saveCachedProducts(products);
    }

    return products;
  } catch (err: any) {
    console.warn("[Supabase] Exception fetching products:", err?.message || err);
    const cached = getCachedProducts();
    return cached && cached.length > 0 ? cached : [];
  }
}

/**
 * Fetches all categories from Supabase PostgreSQL.
 */
export async function fetchAllCategoriesFromSupabase(): Promise<Category[]> {
  try {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) {
      console.warn("[Supabase] Error fetching categories:", error.message);
      const cached = getCachedCategories();
      return cached && cached.length > 0 ? cached : [];
    }

    if (!data || data.length === 0) {
      const cached = getCachedCategories();
      return cached && cached.length > 0 ? cached : [];
    }

    const rawCategories = data
      .filter((r) => r.is_available !== false)
      .map(mapSupabaseCategoryRow);

    const allCat: Category = {
      id: "all",
      nameBn: "সকল পণ্য",
      nameEn: "All Products",
      iconName: "LayoutGrid",
      colorClass: "from-emerald-500 to-teal-600",
      borderColor: "border-emerald-200",
      displayOrder: 0
    };

    const categories = applyCategoryOverrides(mergeCategoryCards([allCat, ...rawCategories]));

    if (categories.length > 0) {
      saveCachedCategories(categories);
    }

    return categories;
  } catch (err: any) {
    console.warn("[Supabase] Exception fetching categories:", err?.message || err);
    const cached = getCachedCategories();
    return cached && cached.length > 0 ? cached : [];
  }
}

/**
 * Fetches all subcategories from Supabase PostgreSQL.
 */
export async function fetchAllSubcategoriesFromSupabase(): Promise<Subcategory[]> {
  try {
    const { data, error } = await supabase
      .from("subcategories")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) {
      console.warn("[Supabase] Error fetching subcategories:", error.message);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data
      .filter((r) => !r.is_deleted && r.is_active !== false)
      .map(mapSupabaseSubcategoryRow);
  } catch (err: any) {
    console.warn("[Supabase] Exception fetching subcategories:", err?.message || err);
    return [];
  }
}

/**
 * Subscribes to real-time changes on the Supabase products table with debouncing.
 */
export function subscribeToSupabaseProducts(onChange: () => void): () => void {
  try {
    let debounceTimer: any = null;
    const debouncedOnChange = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        onChange();
      }, 500);
    };

    const channelId = `products_feed_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        () => {
          debouncedOnChange();
        }
      )
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel).catch(() => {});
    };
  } catch {
    return () => {};
  }
}

/**
 * Subscribes to real-time changes on the Supabase categories table with debouncing.
 */
export function subscribeToSupabaseCategories(onChange: () => void): () => void {
  try {
    let debounceTimer: any = null;
    const debouncedOnChange = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        onChange();
      }, 500);
    };

    const channelId = `categories_feed_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "categories" },
        () => {
          debouncedOnChange();
        }
      )
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel).catch(() => {});
    };
  } catch {
    return () => {};
  }
}

