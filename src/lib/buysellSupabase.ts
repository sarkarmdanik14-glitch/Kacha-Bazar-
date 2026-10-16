/**
 * Supabase Buy & Sell Marketplace Service
 * High-performance, real-time marketplace service backed by Supabase PostgreSQL.
 * Fully decoupled from Firebase.
 */

import { supabase } from "./supabase";
import { BuySellListing, BuySellReport, BuySellChat, BuySellChatMessage } from "../types/buySell";

const TABLE_LISTINGS = "buy_sell_listings";
const TABLE_REPORTS = "buy_sell_reports";
const TABLE_CHATS = "buy_sell_chats";

/**
 * Maps raw Supabase row to BuySellListing
 */
export function mapRowToListing(row: any): BuySellListing {
  return {
    id: row.id,
    title: row.title,
    titleBn: row.title_bn || row.title,
    category: row.category,
    condition: row.condition,
    price: Number(row.price || 0),
    isNegotiable: Boolean(row.is_negotiable),
    location: row.location,
    description: row.description || "",
    images: Array.isArray(row.images) ? row.images : [],
    sellerUid: row.seller_uid,
    sellerName: row.seller_name,
    sellerPhone: row.seller_phone,
    sellerEmail: row.seller_email || undefined,
    sellerWhatsApp: row.seller_whatsapp || undefined,
    allowCall: Boolean(row.allow_call !== false),
    allowWhatsApp: Boolean(row.allow_whatsapp !== false),
    status: row.status || "active",
    views: Number(row.views || 0),
    reportCount: Number(row.report_count || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * Maps client BuySellListing to Supabase DB payload
 */
export function mapListingToDb(listing: Partial<BuySellListing>): any {
  const payload: any = {};
  if (listing.title !== undefined) payload.title = listing.title;
  if (listing.titleBn !== undefined) payload.title_bn = listing.titleBn;
  if (listing.category !== undefined) payload.category = listing.category;
  if (listing.condition !== undefined) payload.condition = listing.condition;
  if (listing.price !== undefined) payload.price = listing.price;
  if (listing.isNegotiable !== undefined) payload.is_negotiable = listing.isNegotiable;
  if (listing.location !== undefined) payload.location = listing.location;
  if (listing.description !== undefined) payload.description = listing.description;
  if (listing.images !== undefined) payload.images = listing.images;
  if (listing.sellerUid !== undefined) payload.seller_uid = listing.sellerUid;
  if (listing.sellerName !== undefined) payload.seller_name = listing.sellerName;
  if (listing.sellerPhone !== undefined) payload.seller_phone = listing.sellerPhone;
  if (listing.sellerEmail !== undefined) payload.seller_email = listing.sellerEmail;
  if (listing.sellerWhatsApp !== undefined) payload.seller_whatsapp = listing.sellerWhatsApp;
  if (listing.allowCall !== undefined) payload.allow_call = listing.allowCall;
  if (listing.allowWhatsApp !== undefined) payload.allow_whatsapp = listing.allowWhatsApp;
  if (listing.status !== undefined) payload.status = listing.status;
  if (listing.views !== undefined) payload.views = listing.views;
  if (listing.reportCount !== undefined) payload.report_count = listing.reportCount;
  return payload;
}

/**
 * Subscribe to listings in real time via Supabase
 */
export function subscribeToBuySellListings(
  categoryFilterOrCb?: string | ((listings: BuySellListing[]) => void),
  onUpdateOrError?: ((listings: BuySellListing[]) => void) | ((err: any) => void),
  onError?: (err: any) => void
): () => void {
  const categoryFilter = typeof categoryFilterOrCb === "string" ? categoryFilterOrCb : undefined;
  const onUpdate = typeof categoryFilterOrCb === "function" 
    ? categoryFilterOrCb 
    : (typeof onUpdateOrError === "function" ? onUpdateOrError : () => {});
  const errHandler = typeof categoryFilterOrCb === "function"
    ? (typeof onUpdateOrError === "function" ? (onUpdateOrError as (err: any) => void) : undefined)
    : onError;

  let isMounted = true;

  const loadSupabaseData = async () => {
    try {
      let queryBuilder = supabase
        .from(TABLE_LISTINGS)
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (categoryFilter && categoryFilter !== "all") {
        queryBuilder = queryBuilder.eq("category", categoryFilter);
      }

      const { data, error } = await queryBuilder;
      if (error) {
        throw error;
      }

      if (isMounted && data) {
        onUpdate(data.map(mapRowToListing));
      }
    } catch (err) {
      console.warn("Supabase buy_sell_listings query notice:", err);
      if ((errHandler || onError) && isMounted) (errHandler || onError)!(err);
    }
  };

  loadSupabaseData();

  // Supabase Realtime channel
  const channel = supabase
    .channel("buy_sell_realtime")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: TABLE_LISTINGS },
      () => {
        if (isMounted) {
          loadSupabaseData();
        }
      }
    )
    .subscribe();

  return () => {
    isMounted = false;
    supabase.removeChannel(channel);
  };
}

/**
 * Create a new listing in Supabase
 */
export async function createBuySellListing(listing: Omit<BuySellListing, "id">): Promise<BuySellListing> {
  const id = "bs_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 6);
  const now = new Date().toISOString();

  const dbPayload = {
    id,
    ...mapListingToDb(listing),
    created_at: now
  };

  try {
    const { error } = await supabase.from(TABLE_LISTINGS).insert(dbPayload);
    if (error) {
      console.warn("Supabase insert listing notice:", error);
    }
  } catch (err) {
    console.warn("Supabase insert exception:", err);
  }

  return {
    ...listing,
    id,
    createdAt: now,
    updatedAt: now
  };
}

/**
 * Update an existing listing in Supabase
 */
export async function updateBuySellListing(id: string, updates: Partial<BuySellListing>): Promise<void> {
  const dbPayload = mapListingToDb(updates);
  try {
    await supabase.from(TABLE_LISTINGS).update(dbPayload).eq("id", id);
  } catch (err) {
    console.warn("Supabase update error:", err);
  }
}

/**
 * Delete a listing from Supabase
 */
export async function deleteBuySellListing(id: string): Promise<void> {
  try {
    await supabase.from(TABLE_LISTINGS).delete().eq("id", id);
  } catch (err) {
    console.warn("Supabase delete error:", err);
  }
}

/**
 * Increment view count
 */
export async function incrementBuySellViews(id: string): Promise<void> {
  try {
    const { data: item } = await supabase.from(TABLE_LISTINGS).select("views").eq("id", id).single();
    const currentViews = item?.views || 0;
    await supabase.from(TABLE_LISTINGS).update({ views: currentViews + 1 }).eq("id", id);
  } catch (err) {
    console.warn("Supabase views update error:", err);
  }
}

/**
 * Report a listing
 */
export async function reportBuySellListing(report: Omit<BuySellReport, "id" | "createdAt">): Promise<void> {
  const now = new Date().toISOString();
  try {
    await supabase.from(TABLE_REPORTS).insert({
      listing_id: report.listingId,
      reported_by_uid: report.reportedByUid,
      reported_by_name: report.reportedByName,
      reason: report.reason,
      details: report.details || "",
      status: report.status || "pending",
      created_at: now
    });
  } catch (e) {
    console.warn("Supabase report insert error:", e);
  }
}

/**
 * Buyer-Seller Chat: Send message
 */
export async function sendBuySellMessage(
  chatId: string,
  meta: {
    listingId: string;
    listingTitle: string;
    listingPrice: number;
    listingImage?: string;
    sellerUid: string;
    sellerName: string;
    buyerUid: string;
    buyerName: string;
  },
  newMsg: BuySellChatMessage
): Promise<void> {
  try {
    const { data: existing } = await supabase
      .from(TABLE_CHATS)
      .select("messages")
      .eq("id", chatId)
      .single();

    const currentMsgs = existing?.messages || [];
    const updatedMsgs = [...currentMsgs, newMsg];

    await supabase.from(TABLE_CHATS).upsert({
      id: chatId,
      listing_id: meta.listingId,
      listing_title: meta.listingTitle,
      listing_price: meta.listingPrice,
      listing_image: meta.listingImage,
      seller_uid: meta.sellerUid,
      seller_name: meta.sellerName,
      buyer_uid: meta.buyerUid,
      buyer_name: meta.buyerName,
      last_message: newMsg.text,
      last_message_at: new Date().toISOString(),
      messages: updatedMsgs,
      updated_at: new Date().toISOString()
    });
  } catch (err) {
    console.warn("Supabase chat upsert notice:", err);
  }
}

/**
 * Buyer-Seller Chat: Subscribe to real-time chat updates via Supabase
 */
export function subscribeToBuySellChat(
  chatId: string,
  onUpdate: (chat: BuySellChat | null) => void
): () => void {
  let isMounted = true;

  const loadSupabaseChat = async () => {
    try {
      const { data, error } = await supabase
        .from(TABLE_CHATS)
        .select("*")
        .eq("id", chatId)
        .single();

      if (error || !data) {
        return;
      }

      if (isMounted) {
        onUpdate({
          id: data.id,
          listingId: data.listing_id,
          listingTitle: data.listing_title,
          listingPrice: Number(data.listing_price || 0),
          listingImage: data.listing_image,
          sellerUid: data.seller_uid,
          sellerName: data.seller_name,
          buyerUid: data.buyer_uid,
          buyerName: data.buyer_name,
          lastMessage: data.last_message,
          lastMessageAt: data.last_message_at,
          messages: data.messages || []
        });
      }
    } catch (err) {
      console.warn("Supabase chat load error:", err);
    }
  };

  loadSupabaseChat();

  const channel = supabase
    .channel(`buy_sell_chat_${chatId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: TABLE_CHATS, filter: `id=eq.${chatId}` },
      () => {
        if (isMounted) {
          loadSupabaseChat();
        }
      }
    )
    .subscribe();

  return () => {
    isMounted = false;
    supabase.removeChannel(channel);
  };
}
