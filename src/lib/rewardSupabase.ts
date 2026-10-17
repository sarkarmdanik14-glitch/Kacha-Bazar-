/**
 * Supabase Rewards & Loyalty Points Service
 * Handles reward claims, gifts redemption, and user point balances on Supabase.
 */

import { supabase } from "./supabase";
import { RewardClaimRecord } from "./rewardPoints";

const TABLE_CLAIMS = "reward_claims";

export async function createSupabaseRewardClaim(
  claimData: Omit<RewardClaimRecord, "id" | "createdAt" | "claimDate">
): Promise<RewardClaimRecord> {
  const id = "claim_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 6);
  const now = new Date().toISOString();
  const today = new Date().toISOString().split("T")[0];

  const dbPayload = {
    id,
    user_id: claimData.userId,
    user_name: claimData.userName,
    customer_phone: claimData.customerPhone,
    delivery_address: claimData.deliveryAddress,
    notes: claimData.notes || "",
    gift_id: claimData.giftId,
    gift_name_bn: claimData.giftNameBn,
    gift_name_en: claimData.giftNameEn,
    gift_image: claimData.giftImage || "",
    points_deducted: claimData.pointsDeducted,
    market_value_taka: claimData.marketValueTaka,
    status: "pending",
    claim_date: today,
    created_at: now
  };

  // 1. Supabase write
  try {
    await supabase.from(TABLE_CLAIMS).insert(dbPayload);
  } catch (err) {
    console.warn("Supabase reward_claims insert note:", err);
  }

  // 2. Deduct points from user profile in Supabase
  try {
    const { data: uData } = await supabase.from("users").select("reward_points").eq("id", claimData.userId).single();
    if (uData) {
      const currentPoints = Number(uData.reward_points || 0);
      const newPoints = Math.max(0, currentPoints - claimData.pointsDeducted);
      await supabase.from("users").update({ reward_points: newPoints }).eq("id", claimData.userId);
    }
  } catch (ptsErr) {
    console.warn("Supabase points deduction note:", ptsErr);
  }

  return {
    ...claimData,
    id,
    status: "pending",
    claimDate: today,
    createdAt: now
  };
}

export function subscribeToSupabaseRewardClaims(
  userId: string | null, // null for admin (all claims), string for specific user
  onUpdate: (claims: RewardClaimRecord[]) => void
): () => void {
  const loadClaims = async () => {
    try {
      let query = supabase.from(TABLE_CLAIMS).select("*").order("created_at", { ascending: false });
      if (userId) {
        query = query.eq("user_id", userId);
      }
      const { data, error } = await query;
      if (error || !data) throw error;

      onUpdate(
        data.map((r: any) => ({
          id: r.id,
          userId: r.user_id,
          userName: r.user_name,
          customerPhone: r.customer_phone,
          deliveryAddress: r.delivery_address,
          notes: r.notes,
          giftId: r.gift_id,
          giftNameBn: r.gift_name_bn,
          giftNameEn: r.gift_name_en,
          giftImage: r.gift_image,
          pointsDeducted: r.points_deducted,
          marketValueTaka: Number(r.market_value_taka || 0),
          status: r.status,
          claimDate: r.claim_date,
          createdAt: r.created_at
        }))
      );
    } catch (err) {
      console.warn("Supabase reward claims fetch error:", err);
    }
  };

  loadClaims();

  try {
    const channelId = `reward_claims_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: TABLE_CLAIMS },
        () => loadClaims()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel).catch(() => {});
    };
  } catch {
    return () => {};
  }
}
