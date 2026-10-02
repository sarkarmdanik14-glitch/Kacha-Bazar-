import { db, doc, getDoc, updateDoc, setDoc, increment, serverTimestamp, collection, addDoc } from "./firebase";

export interface RewardGift {
  id: string;
  nameBn: string;
  nameEn: string;
  pointsRequired: number;
  categoryBn: string;
  categoryEn: string;
  image: string;
  descriptionBn: string;
  descriptionEn: string;
  inStock: boolean;
  marketValueTaka: number;
  tagBn?: string;
  tagEn?: string;
}

export interface RewardClaimRecord {
  id: string;
  userId: string;
  userName: string;
  customerPhone: string;
  deliveryAddress: string;
  notes?: string;
  giftId: string;
  giftNameBn: string;
  giftNameEn: string;
  giftImage: string;
  pointsDeducted: number;
  marketValueTaka: number;
  status: "pending" | "approved" | "dispatched" | "delivered" | "rejected";
  createdAt: any;
  claimDate: string;
}

/**
 * Standard redeemable gifts catalog with dynamic point requirements.
 */
export const REWARD_GIFTS_CATALOG: RewardGift[] = [
  {
    id: "gift-icecream-500",
    nameBn: "প্রিমিয়াম আইসক্রিম কাপ/বক্স",
    nameEn: "Premium Ice Cream Cup/Box",
    pointsRequired: 500,
    categoryBn: "ডেজার্ট ও কোল্ড ট্রিট",
    categoryEn: "Dessert & Cold Treat",
    image: "https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=600&auto=format&fit=crop&q=80",
    descriptionBn: "খাঁটি দুধ ও প্রাকৃতিক ক্রিমের তৈরি রিচ ও সুস্বাদু প্রিমিয়াম আইসক্রিম কাপ।",
    descriptionEn: "Delicious premium ice cream cup made from pure milk and natural cream.",
    inStock: true,
    marketValueTaka: 150,
    tagBn: "জনপ্রিয় পছন্দ",
    tagEn: "Popular Pick"
  },
  {
    id: "gift-chocolate-1000",
    nameBn: "স্পেশাল চকোলেট বার",
    nameEn: "Special Premium Chocolate Bar",
    pointsRequired: 1000,
    categoryBn: "কনফেকশনারি ও চকোলেট",
    categoryEn: "Confectionery & Chocolate",
    image: "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=600&auto=format&fit=crop&q=80",
    descriptionBn: "আমদানি করা এক্সক্লুসিভ রিচ ডার্ক ও মিল্ক চকোলেট বার।",
    descriptionEn: "Imported rich premium dark and milk chocolate bar.",
    inStock: true,
    marketValueTaka: 350,
    tagBn: "হট ডিল",
    tagEn: "Hot Deal"
  },
  {
    id: "gift-dryfruits-2500",
    nameBn: "প্রিমিয়াম ড্রাই ফ্রুটস কম্বো প্যাক",
    nameEn: "Premium Dry Fruits & Nuts Pack",
    pointsRequired: 2500,
    categoryBn: "হেলদি স্ন্যাকস ও বাদাম",
    categoryEn: "Healthy Snacks & Nuts",
    image: "https://images.unsplash.com/photo-1596560548464-f010549b84d7?w=600&auto=format&fit=crop&q=80",
    descriptionBn: "কাজুবাদাম, পেস্তা, কাঠবাদাম ও প্রিমিয়াম কিশমিশের পুষ্টিকর এক্সক্লুসিভ কম্বো বক্স।",
    descriptionEn: "Nutritious combo box containing cashews, almonds, pistachios and raisins.",
    inStock: true,
    marketValueTaka: 750,
    tagBn: "পুষ্টিকর",
    tagEn: "Nutritious"
  },
  {
    id: "gift-minifan-5000",
    nameBn: "রিচার্জেবল মিনি চায়না ফ্যান",
    nameEn: "China Quality Portable Mini Fan",
    pointsRequired: 5000,
    categoryBn: "স্মার্ট লাইফস্টাইল ও ইলেকট্রনিক্স",
    categoryEn: "Smart Lifestyle Electronics",
    image: "https://images.unsplash.com/photo-1618941716939-553df3c6c278?w=600&auto=format&fit=crop&q=80",
    descriptionBn: "হাই-স্পিড ৩-স্টেপ রিচার্জেবল পোর্টেবল ইউএসবি মিনি ফ্যান (লং ব্যাটারি ব্যাকআপ)।",
    descriptionEn: "High-speed 3-step rechargeable portable USB mini fan with long battery backup.",
    inStock: true,
    marketValueTaka: 1200,
    tagBn: "বেস্টসেলার",
    tagEn: "Bestseller"
  },
  {
    id: "gift-smartwatch-10000",
    nameBn: "স্মার্ট ওয়াচ / ডিজিটাল রিস্ট ওয়াচ",
    nameEn: "Smart Digital Wrist Watch",
    pointsRequired: 10000,
    categoryBn: "প্রিমিয়াম গ্যাজেট ও অ্যাক্সেসরিজ",
    categoryEn: "Premium Gadgets & Accessories",
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80",
    descriptionBn: "ফিটনেস ট্র্যাকার, কল নোটিফিকেশন ও ফুল টাচ এইচডি ডিসপ্লে সমৃদ্ধ স্টাইলিশ স্মার্টওয়াচ।",
    descriptionEn: "Stylish smartwatch with fitness tracking, notifications and HD display.",
    inStock: true,
    marketValueTaka: 2500,
    tagBn: "টপ রিওয়ার্ড",
    tagEn: "Top Reward"
  },
  {
    id: "gift-blender-15000",
    nameBn: "ইলেকট্রিক মাল্টি-ফাংশন ব্লেন্ডার",
    nameEn: "Electric Multi-Function Blender",
    pointsRequired: 15000,
    categoryBn: "কিচেন ও হোম অ্যাপ্লায়েন্সেস",
    categoryEn: "Kitchen & Home Appliances",
    image: "https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=600&auto=format&fit=crop&q=80",
    descriptionBn: "স্টেইনলেস স্টিল ব্লেডসহ শক্তিশালী জুসার, শেকার ও মসলা ব্লেন্ডার মেশিন।",
    descriptionEn: "Powerful multi-purpose juicer and spice grinder with stainless steel blades.",
    inStock: true,
    marketValueTaka: 3800,
    tagBn: "সুপার গিফট",
    tagEn: "Super Gift"
  }
];

/**
 * Handles claiming/redeeming a reward gift:
 * 1. Checks that the user has sufficient reward points.
 * 2. Deducts the points from Firestore (`users/{userId}`).
 * 3. Records the claim in `reward_claims` and `redemptions` collection.
 * 4. Creates an in-app confirmation notification.
 */
export async function redeemRewardGift(
  userId: string,
  gift: RewardGift,
  shippingDetails?: {
    customerName?: string;
    phone?: string;
    address?: string;
    notes?: string;
  }
): Promise<{ success: boolean; newPoints?: number; claimId?: string; reason?: string }> {
  try {
    if (!userId || !gift) {
      return { success: false, reason: "গ্রাহক তথ্য বা উপহার নির্বাচন সঠিক নয়।" };
    }

    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return { success: false, reason: "গ্রাহক অ্যাকাউন্ট পাওয়া যায়নি।" };
    }

    const userData = userSnap.data() || {};
    const currentPoints = Number(userData.rewardPoints ?? userData.points ?? 0);

    if (currentPoints < gift.pointsRequired) {
      return { 
        success: false, 
        reason: `আপনার পর্যাপ্ত পয়েন্ট নেই! এই উপহারটির জন্য ${gift.pointsRequired} পয়েন্ট প্রয়োজন, আপনার আছে ${currentPoints} পয়েন্ট।` 
      };
    }

    const newPoints = Math.max(0, currentPoints - gift.pointsRequired);

    // Atomically deduct points
    await updateDoc(userRef, {
      rewardPoints: increment(-gift.pointsRequired),
      points: increment(-gift.pointsRequired),
      updatedAt: serverTimestamp()
    });

    const claimId = `claim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    const claimRecord: RewardClaimRecord = {
      id: claimId,
      userId,
      userName: shippingDetails?.customerName || userData.displayName || userData.fullName || "সম্মানিত গ্রাহক",
      customerPhone: shippingDetails?.phone || userData.phone || userData.phoneNumber || "",
      deliveryAddress: shippingDetails?.address || userData.address || "চাঁচকৈড় বাজার, গুরুদাশপুর, নাটোর",
      notes: shippingDetails?.notes || "",
      giftId: gift.id,
      giftNameBn: gift.nameBn,
      giftNameEn: gift.nameEn,
      giftImage: gift.image,
      pointsDeducted: gift.pointsRequired,
      marketValueTaka: gift.marketValueTaka,
      status: "pending",
      createdAt: serverTimestamp(),
      claimDate: nowIso
    };

    // Save claim in both reward_claims and redemptions collections for dispatching
    await setDoc(doc(db, "reward_claims", claimId), claimRecord);
    await setDoc(doc(db, "redemptions", claimId), claimRecord).catch(() => {});

    // Notify customer
    await addDoc(collection(db, "notifications"), {
      userId,
      titleBn: "🎁 উপহার দাবি সফল হয়েছে!",
      titleEn: "🎁 Gift Redemption Successful!",
      messageBn: `অভিনন্দন! আপনি "${gift.nameBn}" দাবি করেছেন (${gift.pointsRequired} পয়েন্ট কাটা হয়েছে)। আমাদের ডেলিভারি টিম শীঘ্রই উপহারটি পৌঁছে দেবে।`,
      messageEn: `Congratulations! You claimed "${gift.nameEn}" (${gift.pointsRequired} pts deducted). Our team will dispatch it soon.`,
      isRead: false,
      createdAt: nowIso
    }).catch(() => {});

    // Notify Admin
    await addDoc(collection(db, "notifications"), {
      userId: "admin-default",
      titleBn: "নতুন রিওয়ার্ড উপহার দাবি!",
      titleEn: "New Reward Gift Claim Request!",
      messageBn: `গ্রাহক ${claimRecord.userName} (${claimRecord.customerPhone}) "${gift.nameBn}" উপহার দাবি করেছেন। ডেলিভারি প্রস্তুত করুন।`,
      messageEn: `Customer ${claimRecord.userName} (${claimRecord.customerPhone}) claimed "${gift.nameEn}". Please prepare delivery.`,
      isRead: false,
      createdAt: nowIso
    }).catch(() => {});

    return {
      success: true,
      newPoints,
      claimId
    };
  } catch (err: any) {
    console.error("[Reward Points] Error redeeming gift:", err);
    return {
      success: false,
      reason: err?.message || "উপহার দাবি প্রক্রিয়াকরণে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।"
    };
  }
}

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
