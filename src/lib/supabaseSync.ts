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
 * Server-Authoritative Bulk Sync:
 * Routes all sync requests through secure Node.js backend (/api/sync/all),
 * verifying Firebase ID tokens & Admin roles, and writing to Supabase via Service Role.
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

  try {
    const totalItems = 
      (dataset.categories?.length || 0) +
      (dataset.subcategories?.length || 0) +
      (dataset.products?.length || 0) +
      (dataset.staff?.length || 0) +
      (dataset.partnerShops?.length || 0) +
      (dataset.orders?.length || 0);

    update("Preparing server-authoritative sync...", totalItems, 10, "running");

    const response = await apiClient.post<any>("/api/sync/all", dataset, { timeoutMs: 120000 });

    if (response?.success) {
      update("Sync completed successfully via secure backend!", totalItems, totalItems, "success");
      return {
        success: true,
        details: response.details || {},
        errors: response.errors || []
      };
    } else {
      const errMsg = response?.error || "Server batch sync failed";
      update("Sync failed", totalItems, 0, "error", errMsg);
      return {
        success: false,
        details: response?.details || {},
        errors: [errMsg]
      };
    }
  } catch (err: any) {
    const errMsg = err?.message || "Failed to reach sync backend";
    update("Sync error", 100, 0, "error", errMsg);
    return {
      success: false,
      details: {},
      errors: [errMsg]
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
    const res = await apiClient.post<any>("/api/sync/product", p, { silent: true });
    return !!res?.success;
  } catch (err: any) {
    console.warn("[Server Sync] Single product sync notice:", err?.message || err);
    return false;
  }
}

export async function deleteProductFromSupabase(productId: string): Promise<boolean> {
  try {
    if (!productId) return false;
    const res = await apiClient.post<any>("/api/sync/product-delete", { productId }, { silent: true });
    return !!res?.success;
  } catch {
    return false;
  }
}

export async function syncSingleCategoryToSupabase(c: any): Promise<boolean> {
  try {
    if (!c || !c.id) return false;
    const res = await apiClient.post<any>("/api/sync/category", c, { silent: true });
    return !!res?.success;
  } catch {
    return false;
  }
}

export async function syncSingleSubcategoryToSupabase(s: any): Promise<boolean> {
  try {
    if (!s || !s.id) return false;
    const res = await apiClient.post<any>("/api/sync/subcategory", s, { silent: true });
    return !!res?.success;
  } catch {
    return false;
  }
}

export async function syncSingleOrderToSupabase(o: any): Promise<boolean> {
  try {
    if (!o || !o.id) return false;
    const res = await apiClient.post<any>("/api/sync/order", o, { silent: true });
    return !!res?.success;
  } catch {
    return false;
  }
}

export async function syncSingleStaffToSupabase(st: any): Promise<boolean> {
  try {
    if (!st || !st.id) return false;
    const res = await apiClient.post<any>("/api/sync/staff", st, { silent: true });
    return !!res?.success;
  } catch {
    return false;
  }
}

export async function syncSinglePartnerShopToSupabase(ps: any): Promise<boolean> {
  try {
    if (!ps || !ps.id) return false;
    const res = await apiClient.post<any>("/api/sync/partner-shop", ps, { silent: true });
    return !!res?.success;
  } catch {
    return false;
  }
}
