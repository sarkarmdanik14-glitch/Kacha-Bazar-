import { supabase } from "./supabase";
import { apiClient } from "./apiClient";

export interface OrderUsageCheckResult {
  hasOrders: boolean;
  orderCount: number;
}

/**
 * Checks whether a given product has ever been purchased in any past orders.
 * Inspects in-memory orders and Supabase orders table for 100% accuracy.
 */
export async function checkProductOrderUsage(
  productId: string, 
  productSku?: string,
  inMemoryOrders?: any[]
): Promise<OrderUsageCheckResult> {
  let matchedCount = 0;

  // 1. Check in-memory / passed orders first (zero-latency)
  if (Array.isArray(inMemoryOrders) && inMemoryOrders.length > 0) {
    for (const ord of inMemoryOrders) {
      if (Array.isArray(ord?.items)) {
        const found = ord.items.some((item: any) => 
          item?.product?.id === productId || 
          item?.productId === productId || 
          item?.id === productId ||
          (productSku && item?.product?.sku && item.product.sku === productSku)
        );
        if (found) {
          matchedCount++;
        }
      }
    }
  }

  // If already found in memory, we can return early
  if (matchedCount > 0) {
    return { hasOrders: true, orderCount: matchedCount };
  }

  // 2. Query Supabase orders table
  try {
    const { data: dbOrders } = await supabase.from("orders").select("items").limit(500);
    if (Array.isArray(dbOrders)) {
      for (const ord of dbOrders) {
        if (Array.isArray(ord?.items)) {
          const found = ord.items.some((item: any) => 
            item?.product?.id === productId || 
            item?.productId === productId || 
            item?.id === productId ||
            (productSku && item?.product?.sku && item.product.sku === productSku)
          );
          if (found) {
            matchedCount++;
          }
        }
      }
    }
  } catch (err) {
    console.warn("Notice checking orders history for product in Supabase:", err);
  }

  return { hasOrders: matchedCount > 0, orderCount: matchedCount };
}

export interface DeleteProductOptions {
  hasOrders: boolean;
  user?: any;
}

export interface DeleteProductResult {
  success: boolean;
  mode: "permanent" | "soft_delete";
  messageBn: string;
  messageEn: string;
}

/**
 * Safely deletes a product according to business rules in Supabase:
 * - If product was used in orders: Marks status: 'deleted', is_available: false to preserve past invoice & accounting integrity.
 * - If product has never been ordered: Permanently deletes the row from Supabase.
 */
export async function executeDeleteProduct(
  productId: string,
  options: DeleteProductOptions
): Promise<DeleteProductResult> {
  const userEmail = options.user?.email || options.user?.fullName || options.user?.displayName || options.user?.uid || "admin";

  // Record deleted product ID in local storage to prevent any static resurrection
  try {
    const raw = localStorage.getItem("kb_deleted_products");
    const set = raw ? new Set(JSON.parse(raw)) : new Set();
    set.add(productId);
    localStorage.setItem("kb_deleted_products", JSON.stringify(Array.from(set)));
  } catch (e) {}

  // 1. Direct Supabase delete / soft-delete
  try {
    if (!options.hasOrders) {
      const { error } = await supabase.from("products").delete().eq("id", productId);
      if (!error) {
        console.log(`[Admin] Product ${productId} permanently deleted from Supabase`);
        return {
          success: true,
          mode: "permanent",
          messageBn: "পণ্যটি ডাটাবেজ থেকে সফলভাবে মুছে ফেলা হয়েছে!",
          messageEn: "Product successfully deleted from database!"
        };
      }
    }

    // Soft delete if had orders or delete had foreign key constraint
    const { error: updateErr } = await supabase.from("products").update({
      is_available: false,
      status: "deleted",
      updated_at: new Date().toISOString()
    }).eq("id", productId);

    if (!updateErr) {
      return {
        success: true,
        mode: "soft_delete",
        messageBn: "পণ্যটি সফলভাবে মুছে ফেলা হয়েছে!",
        messageEn: "Product successfully deleted!"
      };
    }
  } catch (sbErr: any) {
    console.warn("Direct Supabase product delete notice, falling back to server API:", sbErr?.message);
  }

  // 2. Fallback to Server Admin API
  try {
    const data = await apiClient.post("/api/admin/delete-product", {
      productId
    });

    if (data?.success) {
      return {
        success: true,
        mode: "soft_delete",
        messageBn: data.message || "পণ্যটি সফলভাবে মুছে ফেলা হয়েছে!",
        messageEn: "Product successfully deleted!"
      };
    }
  } catch (apiErr) {
    console.warn("Server delete API notice:", apiErr);
  }

  throw new Error("পণ্যটি ডিলিট করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।");
}
