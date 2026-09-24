import { db, doc, deleteDoc, updateDoc, setDoc, collection, getDocs, serverTimestamp } from "./firebase";

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
  const prodRef = doc(db, "products", productId);

  if (options.hasOrders) {
    // Perform Soft Delete (Inactivation)
    await setDoc(prodRef, {
      id: productId,
      isDeleted: true,
      deleted: true,
      isAvailable: false,
      status: "inactive",
      availabilityStatus: "deleted",
      deletedAt: serverTimestamp(),
      deletedBy: options.user?.email || options.user?.fullName || options.user?.displayName || options.user?.uid || "admin",
      updatedAt: serverTimestamp()
    }, { merge: true });

    return {
      success: true,
      mode: "soft_delete",
      messageBn: "অর্ডার হিস্ট্রির নির্ভুলতা রক্ষার্থে পণ্যটি সফট ডিলিট / নিষ্ক্রিয় করা হয়েছে এবং ইনভেন্টরি ও শপ থেকে সফলভাবে সরানো হয়েছে!",
      messageEn: "Product preserved as soft-deleted to protect order history, and successfully removed from inventory and store catalog!"
    };
  } else {
    // Perform Permanent Delete
    try {
      await deleteDoc(prodRef);
      return {
        success: true,
        mode: "permanent",
        messageBn: "পণ্যটি ডাটাবেজ ও ইনভেন্টরি থেকে সম্পূর্ণরূপে স্থায়ীভাবে ডিলিট করা হয়েছে!",
        messageEn: "Product permanently deleted from database and inventory successfully!"
      };
    } catch (err: any) {
      // If hard delete fails due to rules, fallback to soft-delete
      console.warn("Permanent delete failed, attempting soft-delete fallback:", err);
      await setDoc(prodRef, {
        id: productId,
        isDeleted: true,
        deleted: true,
        isAvailable: false,
        status: "inactive",
        availabilityStatus: "deleted",
        deletedAt: serverTimestamp(),
        deletedBy: options.user?.email || options.user?.uid || "admin",
        updatedAt: serverTimestamp()
      }, { merge: true });
      return {
        success: true,
        mode: "soft_delete",
        messageBn: "পণ্যটি ইনভেন্টরি ও শপ থেকে সফলভাবে সরানো হয়েছে (নিষ্ক্রিয়/সফট ডিলিট)!",
        messageEn: "Product successfully removed from active inventory and catalog (soft-deleted)!"
      };
    }
  }
}
