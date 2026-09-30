import { 
  db, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  updateDoc, 
  serverTimestamp 
} from "./firebase";

/**
 * Kacha Bazar Premium Membership Rules & Qualification:
 * - Single-Day Minimum Order Threshold: ৳6,000 (ছয় হাজার টাকা)
 * - Exclusive Benefit: Flat 5% Discount on every subsequent order (পরবর্তী প্রত্যেক অর্ডারে ৫% ডিসকাউন্ট)
 * - Dedicated customer care & priority delivery
 */
export const PREMIUM_QUALIFICATION_THRESHOLD = 6000;
export const PREMIUM_DISCOUNT_PERCENT = 5;

/**
 * Checks whether a user qualifies as a Premium Member based on:
 * Having placed/completed orders of at least ৳6,000 within any single day.
 * If qualified, automatically upgrades the user profile in Firestore.
 */
export async function checkAndUpgradePremiumMembership(userId: string): Promise<boolean> {
  if (!userId) return false;

  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return false;

    const userData = userSnap.data();

    // Query customer orders
    const ordersQuery = query(
      collection(db, "orders"),
      where("customerId", "==", userId)
    );
    const snap = await getDocs(ordersQuery);

    if (snap.empty) {
      // Also try query by userId field if customerId didn't return
      const altQuery = query(
        collection(db, "orders"),
        where("userId", "==", userId)
      );
      const altSnap = await getDocs(altQuery);
      if (altSnap.empty) return false;
      return evaluateDailyOrders(altSnap.docs.map(d => ({ id: d.id, ...d.data() })), userRef, userData);
    }

    return evaluateDailyOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })), userRef, userData);
  } catch (error) {
    console.warn("Error evaluating premium membership eligibility:", error);
    return false;
  }
}

/**
 * Helper to aggregate daily order sums and check against the ৳6,000 threshold.
 */
async function evaluateDailyOrders(orders: any[], userRef: any, userData: any): Promise<boolean> {
  const dailyTotals: Record<string, number> = {};

  for (const order of orders) {
    // Skip cancelled or refunded orders
    const status = (order.orderStatus || order.status || "").toLowerCase();
    if (status === "cancelled" || status === "বাতিল" || status === "refunded") {
      continue;
    }

    let dateKey = "";
    if (order.createdAt?.seconds) {
      const d = new Date(order.createdAt.seconds * 1000);
      dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    } else if (order.createdAt?.toDate) {
      const d = order.createdAt.toDate();
      dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    } else if (typeof order.createdAt === "string") {
      const d = new Date(order.createdAt);
      if (!isNaN(d.getTime())) {
        dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      }
    }

    if (!dateKey) {
      dateKey = "current-period";
    }

    const amount = Number(order.total || order.subtotal || order.finalAmount || 0);
    dailyTotals[dateKey] = (dailyTotals[dateKey] || 0) + amount;
  }

  const qualifies = Object.values(dailyTotals).some(sum => sum >= PREMIUM_QUALIFICATION_THRESHOLD);

  if (qualifies) {
    if (userData.membershipTier !== "প্রিমিয়াম মেম্বার" || !userData.isPremiumMember) {
      await updateDoc(userRef, {
        membershipTier: "প্রিমিয়াম মেম্বার",
        isPremiumMember: true,
        premiumDiscountPercent: PREMIUM_DISCOUNT_PERCENT,
        premiumQualifiedAt: serverTimestamp()
      });
      console.log(`User ${userRef.id} successfully qualified for Premium Membership (≥ ৳${PREMIUM_QUALIFICATION_THRESHOLD} in a single day)!`);
    }
    return true;
  }

  return false;
}

/**
 * Returns true if the user has an active Premium Membership tier
 */
export function isUserPremiumMember(user: any): boolean {
  if (!user) return false;
  const tier = (user.membershipTier || user.tier || "").toString().trim();
  return (
    tier === "প্রিমিয়াম মেম্বার" ||
    tier === "প্রিমিয়াম মেম্বার" ||
    tier.toLowerCase() === "premium" ||
    user.isPremiumMember === true
  );
}

/**
 * Calculates 5% discount for verified Premium Members
 */
export function calculatePremiumDiscount(subtotal: number, isPremium: boolean): number {
  if (!isPremium || subtotal <= 0) return 0;
  return Math.round((subtotal * PREMIUM_DISCOUNT_PERCENT) / 100);
}
