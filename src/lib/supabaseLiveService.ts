/**
 * Supabase Live Service
 * Real-time reactive data listener and database manager for Kacha Bazar on Supabase.
 * Powers Orders, Products, Categories, Users, Coupons, Banners, and Transactions
 * with zero-latency PostgreSQL subscriptions and instant local state synchronization.
 */

import { supabase } from "./supabase";
import { Product, Category, Subcategory } from "../types";
import { 
  mapSupabaseProductRow, 
  mapSupabaseCategoryRow, 
  mapSupabaseSubcategoryRow,
  saveCachedProducts,
  saveCachedCategories
} from "./supabaseDataService";

// =====================================================================
// 1. ORDERS REAL-TIME SUBSCRIPTION & OPERATIONS
// =====================================================================

export async function fetchAllOrdersFromSupabase(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      console.warn("[Supabase] Orders fetch notice:", error.message);
      return [];
    }

    return (data || []).map((o: any) => ({
      ...o,
      orderNumber: o.order_number || o.id,
      customerName: o.customer_name || "Customer",
      customerPhone: o.customer_phone || "",
      deliveryAddress: o.delivery_address || "",
      deliveryArea: o.delivery_area || "",
      orderStatus: o.order_status || "Pending",
      paymentStatus: o.payment_status || "Pending",
      paymentMethod: o.payment_method || "Cash on Delivery",
      deliveryCharge: Number(o.delivery_charge || 0),
      total: Number(o.total || 0),
      subtotal: Number(o.subtotal || 0),
      items: Array.isArray(o.items) ? o.items : [],
      partnerAssignments: Array.isArray(o.partner_assignments) ? o.partner_assignments : [],
      createdAt: o.created_at || new Date().toISOString()
    }));
  } catch (err: any) {
    console.warn("[Supabase] Orders exception:", err?.message || err);
    return [];
  }
}

export function subscribeToSupabaseOrders(
  onUpdate: (orders: any[]) => void,
  onError?: (err: any) => void
): () => void {
  let isMounted = true;
  let currentOrders: any[] = [];

  // Initial fetch
  fetchAllOrdersFromSupabase().then((ords) => {
    if (isMounted) {
      currentOrders = ords;
      onUpdate(ords);
    }
  }).catch((err) => {
    if (onError) onError(err);
  });

  // Supabase Realtime channel listener with unique channel name to prevent collision
  try {
    const channelId = `orders_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        (payload) => {
          if (!isMounted) return;
          const eventType = payload.eventType;

          if (eventType === "INSERT") {
            const rawNew = payload.new as any;
            const newOrder = {
              ...rawNew,
              id: rawNew.id,
              orderNumber: rawNew.order_number || rawNew.id,
              customerName: rawNew.customer_name || "Customer",
              customerPhone: rawNew.customer_phone || "",
              deliveryAddress: rawNew.delivery_address || "",
              orderStatus: rawNew.order_status || "Pending",
              paymentStatus: rawNew.payment_status || "Pending",
              total: Number(rawNew.total || 0),
              items: Array.isArray(rawNew.items) ? rawNew.items : [],
              createdAt: rawNew.created_at || new Date().toISOString()
            };
            currentOrders = [newOrder, ...currentOrders.filter(o => o.id !== newOrder.id)];
            onUpdate([...currentOrders]);
          } else if (eventType === "UPDATE") {
            const rawNew = payload.new as any;
            currentOrders = currentOrders.map((o) => {
              if (o.id === rawNew.id) {
                return {
                  ...o,
                  ...rawNew,
                  orderStatus: rawNew.order_status || o.orderStatus,
                  paymentStatus: rawNew.payment_status || o.paymentStatus,
                  riderId: rawNew.rider_id !== undefined ? rawNew.rider_id : o.riderId,
                  riderName: rawNew.rider_name !== undefined ? rawNew.rider_name : o.riderName
                };
              }
              return o;
            });
            onUpdate([...currentOrders]);
          } else if (eventType === "DELETE") {
            currentOrders = currentOrders.filter(o => o.id !== payload.old.id);
            onUpdate([...currentOrders]);
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel).catch(() => {});
    };
  } catch (channelErr) {
    console.warn("Orders realtime subscription note:", channelErr);
    return () => { isMounted = false; };
  }
}

export async function updateOrderStatusInSupabase(
  orderId: string, 
  status: string,
  field: "order_status" | "payment_status" = "order_status"
): Promise<boolean> {
  try {
    const cleanId = String(orderId).trim();
    const updateObj: Record<string, any> = {
      [field]: status,
      updated_at: new Date().toISOString()
    };
    const { error } = await supabase.from("orders").update(updateObj).eq("id", cleanId);
    return !error;
  } catch {
    return false;
  }
}

// =====================================================================
// 2. COUPONS REAL-TIME LISTENER & OPERATIONS
// =====================================================================

export async function fetchCouponsFromSupabase(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return [];
    return (data || []).map((c: any) => ({
      id: c.id,
      code: c.code,
      discount: Number(c.discount_percent || c.discount_amount || 0),
      discountPercent: Number(c.discount_percent || 0),
      discountAmount: Number(c.discount_amount || 0),
      minOrderAmount: Number(c.min_order_amount || 0),
      isActive: c.is_active !== false,
      expiryDate: c.expiry_date,
      createdAt: c.created_at
    }));
  } catch {
    return [];
  }
}

export function subscribeToSupabaseCoupons(onUpdate: (coupons: any[]) => void): () => void {
  let isMounted = true;
  fetchCouponsFromSupabase().then((c) => {
    if (isMounted) onUpdate(c);
  });

  try {
    const channelId = `coupons_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const channel = supabase
      .channel(channelId)
      .on("postgres_changes", { event: "*", schema: "public", table: "coupons" }, () => {
        fetchCouponsFromSupabase().then((c) => {
          if (isMounted) onUpdate(c);
        });
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel).catch(() => {});
    };
  } catch (err) {
    console.warn("Coupons realtime subscription note:", err);
    return () => { isMounted = false; };
  }
}

export async function saveCouponToSupabase(coupon: {
  id?: string;
  code: string;
  discountAmount?: number;
  discountPercent?: number;
  minOrderAmount?: number;
  isActive?: boolean;
  expiryDate?: string | null;
}): Promise<boolean> {
  try {
    const codeUpper = coupon.code.trim().toUpperCase();
    const id = coupon.id || `coupon-${codeUpper.toLowerCase()}`;
    const payload = {
      id,
      code: codeUpper,
      discount_amount: coupon.discountAmount !== undefined ? Number(coupon.discountAmount) : 0,
      discount_percent: coupon.discountPercent !== undefined ? Number(coupon.discountPercent) : 0,
      min_order_amount: coupon.minOrderAmount !== undefined ? Number(coupon.minOrderAmount) : 0,
      is_active: coupon.isActive !== false,
      expiry_date: coupon.expiryDate || null
    };
    const { error } = await supabase.from("coupons").upsert(payload, { onConflict: "code" });
    if (error) {
      console.warn("[Supabase] Coupon save error:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[Supabase] Coupon save exception:", err);
    return false;
  }
}

export async function deleteCouponFromSupabase(couponIdOrCode: string): Promise<boolean> {
  try {
    const clean = couponIdOrCode.trim();
    const codeUpper = clean.toUpperCase();
    const { error } = await supabase
      .from("coupons")
      .delete()
      .or(`id.eq.${clean},code.eq.${codeUpper}`);
    if (error) {
      console.warn("[Supabase] Coupon delete error:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[Supabase] Coupon delete exception:", err);
    return false;
  }
}

// =====================================================================
// 3. BANNERS & ANNOUNCEMENTS REAL-TIME LISTENER
// =====================================================================

export async function fetchBannersFromSupabase(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from("banners")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) return [];
    return (data || []).map((b: any) => ({
      id: b.id,
      titleBn: b.title_bn,
      titleEn: b.title_en,
      subtitleBn: b.subtitle_bn,
      subtitleEn: b.subtitle_en,
      tagBn: b.tag_bn,
      tagEn: b.tag_en,
      discountBn: b.discount_bn,
      discountEn: b.discount_en,
      bgGradient: b.bg_gradient,
      image: b.image,
      imageUrl: b.image,
      targetUrl: b.target_url,
      isActive: b.is_active !== false,
      displayOrder: Number(b.display_order || 0)
    }));
  } catch {
    return [];
  }
}

export function subscribeToSupabaseBanners(onUpdate: (banners: any[]) => void): () => void {
  let isMounted = true;
  fetchBannersFromSupabase().then((b) => {
    if (isMounted) onUpdate(b);
  });

  try {
    const channelId = `banners_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const channel = supabase
      .channel(channelId)
      .on("postgres_changes", { event: "*", schema: "public", table: "banners" }, () => {
        fetchBannersFromSupabase().then((b) => {
          if (isMounted) onUpdate(b);
        });
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel).catch(() => {});
    };
  } catch (err) {
    console.warn("Banners realtime subscription note:", err);
    return () => { isMounted = false; };
  }
}

// =====================================================================
// 4. LIVE NOTICE REAL-TIME LISTENER
// =====================================================================

export async function fetchLiveNoticeFromSupabase(): Promise<any | null> {
  try {
    const { data, error } = await supabase
      .from("live_notices")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    return {
      id: data.id,
      isActive: data.is_active !== false,
      badgeBn: data.badge_bn,
      badgeEn: data.badge_en,
      titleBn: data.title_bn,
      titleEn: data.title_en,
      messageBn: data.message_bn,
      messageEn: data.message_en,
      theme: data.theme || "rose",
      showDotPulse: data.show_dot_pulse !== false,
      orderDisabled: !!data.order_disabled
    };
  } catch {
    return null;
  }
}

export function subscribeToSupabaseLiveNotice(onUpdate: (notice: any) => void): () => void {
  let isMounted = true;
  fetchLiveNoticeFromSupabase().then((n) => {
    if (isMounted && n) onUpdate(n);
  });

  try {
    const channelId = `live_notices_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const channel = supabase
      .channel(channelId)
      .on("postgres_changes", { event: "*", schema: "public", table: "live_notices" }, () => {
        fetchLiveNoticeFromSupabase().then((n) => {
          if (isMounted && n) onUpdate(n);
        });
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel).catch(() => {});
    };
  } catch (err) {
    console.warn("Live notices realtime subscription note:", err);
    return () => { isMounted = false; };
  }
}

export async function saveLiveNoticeToSupabase(notice: {
  isActive: boolean;
  badgeBn?: string;
  badgeEn?: string;
  titleBn: string;
  titleEn?: string;
  messageBn: string;
  messageEn?: string;
  theme?: string;
  showDotPulse?: boolean;
  orderDisabled?: boolean;
}): Promise<boolean> {
  try {
    const payload = {
      id: "default_notice",
      is_active: notice.isActive !== false,
      badge_bn: notice.badgeBn || "🔴 LIVE UPDATE",
      badge_en: notice.badgeEn || "🔴 LIVE UPDATE",
      title_bn: notice.titleBn,
      title_en: notice.titleEn || "",
      message_bn: notice.messageBn,
      message_en: notice.messageEn || "",
      theme: notice.theme || "rose",
      show_dot_pulse: notice.showDotPulse !== false,
      order_disabled: !!notice.orderDisabled,
      updated_at: new Date().toISOString()
    };
    const { error } = await supabase.from("live_notices").upsert(payload, { onConflict: "id" });
    if (error) {
      console.warn("[Supabase] Notice save notice:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[Supabase] Notice save exception:", err);
    return false;
  }
}

export async function saveBannerToSupabase(banner: {
  id: string;
  titleBn?: string;
  titleEn?: string;
  subtitleBn?: string;
  subtitleEn?: string;
  tagBn?: string;
  tagEn?: string;
  bgGradient?: string;
  image?: string;
  targetUrl?: string;
  linkUrl?: string;
  isActive?: boolean;
  displayOrder?: number;
}): Promise<boolean> {
  let ok = false;
  try {
    const payload = {
      id: banner.id,
      title_bn: banner.titleBn || "",
      title_en: banner.titleEn || "",
      subtitle_bn: banner.subtitleBn || "",
      subtitle_en: banner.subtitleEn || "",
      tag_bn: banner.tagBn || "",
      tag_en: banner.tagEn || "",
      bg_gradient: banner.bgGradient || "from-emerald-800 via-teal-900 to-slate-900",
      image: banner.image || "",
      target_url: banner.targetUrl || banner.linkUrl || "",
      is_active: banner.isActive !== false,
      display_order: Number(banner.displayOrder || 0),
      updated_at: new Date().toISOString()
    };
    const { error } = await supabase.from("banners").upsert(payload, { onConflict: "id" });
    if (!error) ok = true;
    else console.warn("[Supabase] Direct banner save notice:", error.message);
  } catch {}

  // Server endpoint fallback (runs with service_role if on dev/server)
  try {
    const res = await fetch("/api/banners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(banner)
    });
    if (res.ok) ok = true;
  } catch {}

  return ok;
}

export const upsertBannerToSupabase = saveBannerToSupabase;

export async function deleteBannerFromSupabase(bannerId: string): Promise<boolean> {
  let ok = false;
  try {
    const { error } = await supabase.from("banners").delete().eq("id", bannerId);
    if (!error) ok = true;
    else console.warn("[Supabase] Direct banner delete notice:", error.message);
  } catch (err) {
    console.warn("[Supabase] Banner delete exception:", err);
  }

  // Server endpoint fallback (runs with service_role if on dev/server)
  try {
    const res = await fetch(`/api/banners/${encodeURIComponent(bannerId)}`, { method: "DELETE" });
    if (res.ok) ok = true;
  } catch {}

  return ok;
}

// =====================================================================
// 5. HOMEPAGE CONFIGURATION & SETTINGS
// =====================================================================

export async function fetchHomeConfigFromSupabase(): Promise<any | null> {
  try {
    const { data, error } = await supabase
      .from("site_settings")
      .select("settings")
      .or("key.eq.home,key.eq.home_config")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data?.settings) {
      try {
        const cached = localStorage.getItem("kachabazar_home_config");
        if (cached) return JSON.parse(cached);
      } catch {}
      return null;
    }

    try {
      localStorage.setItem("kachabazar_home_config", JSON.stringify(data.settings));
    } catch {}

    return data.settings;
  } catch {
    return null;
  }
}

export function subscribeToSupabaseHomeConfig(onUpdate: (config: any) => void): () => void {
  let isMounted = true;

  try {
    const cached = localStorage.getItem("kachabazar_home_config");
    if (cached) {
      onUpdate(JSON.parse(cached));
    }
  } catch {}

  fetchHomeConfigFromSupabase().then((cfg) => {
    if (isMounted && cfg) onUpdate(cfg);
  });

  try {
    const channelId = `home_config_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "site_settings" },
        (payload: any) => {
          const rowKey = payload?.new?.key || payload?.old?.key;
          if (rowKey === "home" || rowKey === "home_config") {
            if (payload?.new?.settings && isMounted) {
              onUpdate(payload.new.settings);
              try {
                localStorage.setItem("kachabazar_home_config", JSON.stringify(payload.new.settings));
              } catch {}
            }
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel).catch(() => {});
    };
  } catch (err) {
    console.warn("Home config realtime subscription notice:", err);
    return () => { isMounted = false; };
  }
}

export async function saveHomeConfigToSupabase(config: any): Promise<boolean> {
  try {
    try {
      localStorage.setItem("kachabazar_home_config", JSON.stringify(config));
    } catch {}

    const now = new Date().toISOString();
    const { error: err1 } = await supabase.from("site_settings").upsert({
      key: "home",
      settings: config,
      updated_at: now
    }, { onConflict: "key" });

    supabase.from("site_settings").upsert({
      key: "home_config",
      settings: config,
      updated_at: now
    }, { onConflict: "key" }).then(null, () => {});

    fetch("/api/settings/home_config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings: config })
    }).catch(() => {});

    return !err1;
  } catch (err) {
    console.warn("Error saving home config to Supabase:", err);
    return false;
  }
}

