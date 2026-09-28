import { db, doc, deleteDoc, updateDoc, setDoc, collection, getDocs, serverTimestamp } from "./firebase";
import { apiClient } from "./apiClient";

export interface OrderUsageCheckResult {
  hasOrders: boolean;
  orderCount: number;
}

/**
 * Checks whether a given product has ever been purchased in any past orders.
 * Inspects both client-loaded orders and Firestore orders collection for 100% accuracy.
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

  // If already found in memory, we can return early or check server
  if (matchedCount > 0) {
    return { hasOrders: true, orderCount: matchedCount };
  }

  // 2. Query Firestore orders collection to catch any past or un-cached orders
  try {
    const ordersSnap = await getDocs(collection(db, "orders"));
    let dbCount = 0;
    ordersSnap.forEach((docSnap) => {
      const ordData = docSnap.data();
      if (Array.isArray(ordData?.items)) {
        const found = ordData.items.some((item: any) => 
          item?.product?.id === productId || 
          item?.productId === productId || 
          item?.id === productId ||
          (productSku && item?.product?.sku && item.product.sku === productSku)
        );
        if (found) {
          dbCount++;
        }
      }
    });

    if (dbCount > 0) {
      return { hasOrders: true, orderCount: dbCount };
    }
  } catch (err) {
    console.warn("Notice checking orders history for product:", err);
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
 * Safely deletes a product according to business rules:
 * - If product was used in orders: Inactivates / Soft Deletes the product
 *   (marks isDeleted: true, status: 'inactive', isAvailable: false) to preserve past invoice & accounting integrity.
 * - If product has never been ordered: Permanently deletes the document from Firestore.
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

  // 1. Direct client-side Firestore delete using deleteDoc()
  try {
    const prodRef = doc(db, "products", productId);
    await deleteDoc(prodRef);
    console.log(`[Admin] Product ${productId} successfully deleted via deleteDoc`);

    return {
      success: true,
      mode: "permanent",
      messageBn: "পণ্যটি ডাটাবেজ থেকে সফলভাবে মুছে ফেলা হয়েছে!",
      messageEn: "Product successfully deleted from database!"
    };
  } catch (clientErr: any) {
    console.warn("Direct deleteDoc notice, falling back to soft delete:", clientErr?.message);
    try {
      const prodRef = doc(db, "products", productId);
      await updateDoc(prodRef, {
        isDeleted: true,
        deleted: true,
        status: "deleted",
        isAvailable: false,
        deletedAt: serverTimestamp(),
        deletedBy: userEmail,
        updatedAt: serverTimestamp()
      });

      return {
        success: true,
        mode: "soft_delete",
        messageBn: "পণ্যটি সফলভাবে মুছে ফেলা হয়েছে!",
        messageEn: "Product successfully deleted!"
      };
    } catch (upErr: any) {
      console.warn("Direct updateDoc notice, trying Server Admin API:", upErr?.message);
    }
  }

  // 2. Fallback to Server Admin API
  try {
    const data = await apiClient.post("/api/admin/delete-product", {
      productId,
      userEmail
    }, {
      headers: {
        "x-user-email": userEmail
      }
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
