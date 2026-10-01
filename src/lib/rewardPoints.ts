import { db, doc, getDoc, updateDoc, setDoc, increment, serverTimestamp } from "./firebase";

/**
 * Calculates reward points earned from a completed order:
 * For every 100 Taka of completed order total, credit 10 points.
 * Formula: Math.floor((orderTotal / 100) * 10)
 */
export function calculateRewardPoints(orderTotal: number): number {
  if (!orderTotal || orderTotal <= 0 || isNaN(orderTotal)) return 0;
  return Math.floor((orderTotal / 100) * 10);
}

/**
 * Awards reward points when an order transitions to 'delivered' or 'completed'.
 * - Award points ONLY when an order's status transitions to 'delivered' or 'completed'.
 * - Prevents duplicate point credits if already awarded.
 * - Atomically increments user's `rewardPoints` and `points` in Firestore under `users/{userId}`.
 * - Flags the order as `rewardPointsAwarded` and records `rewardPointsEarned`.
 */
export async function awardOrderRewardPoints(
  orderId: string,
  cachedOrderData?: any
): Promise<{ success: boolean; pointsAwarded: number; reason?: string }> {
  try {
    if (!orderId) {
      return { success: false, pointsAwarded: 0, reason: "Missing order ID" };
    }

    let orderData = cachedOrderData;
    const orderRef = doc(db, "orders", orderId);

    if (!orderData) {
      const snap = await getDoc(orderRef);
      if (!snap.exists()) {
        return { success: false, pointsAwarded: 0, reason: "Order not found" };
      }
      orderData = snap.data();
    }

    const currentStatus = (orderData.orderStatus || orderData.status || "").toLowerCase();
    if (currentStatus !== "delivered" && currentStatus !== "completed") {
      return { 
        success: false, 
        pointsAwarded: 0, 
        reason: `Order status is '${currentStatus}'. Points are only awarded for delivered or completed orders.` 
      };
    }

    // Check if points were already awarded to prevent duplicate credits
    if (orderData.rewardPointsAwarded) {
      return { 
        success: false, 
        pointsAwarded: 0, 
        reason: "Reward points already awarded for this order." 
      };
    }

    const targetUserId = orderData.customerId || orderData.userId;
    if (!targetUserId || targetUserId === "guest" || targetUserId === "manual_admin") {
      return { 
        success: false, 
        pointsAwarded: 0, 
        reason: "Guest or non-registered order - no customer account to credit." 
      };
    }

    // Calculate points: for every 100 Taka, credit 10 points
    const rawTotal = Number(orderData.total ?? orderData.totalAmount ?? orderData.grandTotal ?? 0);
    const pointsToCredit = calculateRewardPoints(rawTotal);

    if (pointsToCredit <= 0) {
      // Mark as processed so it doesn't re-run
      await updateDoc(orderRef, {
        rewardPointsAwarded: true,
        rewardPointsEarned: 0,
        rewardPointsAwardedAt: serverTimestamp()
      }).catch(() => {});
      return { success: true, pointsAwarded: 0 };
    }

    const userRef = doc(db, "users", targetUserId);

    // Atomically increment user's points balance in Firestore
    try {
      await updateDoc(userRef, {
        rewardPoints: increment(pointsToCredit),
        points: increment(pointsToCredit),
        updatedAt: serverTimestamp()
      });
    } catch {
      // If user document didn't exist or updateDoc failed, use setDoc with merge: true
      await setDoc(userRef, {
        rewardPoints: pointsToCredit,
        points: pointsToCredit,
        updatedAt: serverTimestamp()
      }, { merge: true });
    }

    // Mark order as awarded
    await updateDoc(orderRef, {
      rewardPointsAwarded: true,
      rewardPointsEarned: pointsToCredit,
      rewardPointsAwardedAt: serverTimestamp()
    }).catch(() => {});

    console.log(`[Reward Points] Successfully awarded ${pointsToCredit} points to user ${targetUserId} for completed order ${orderId} (Total: ৳${rawTotal})`);
    return { success: true, pointsAwarded: pointsToCredit };
  } catch (err: any) {
    console.error(`[Reward Points] Error awarding points for order ${orderId}:`, err);
    return { success: false, pointsAwarded: 0, reason: err?.message || "Unknown error" };
  }
}
