/**
 * Supabase Buy & Sell Marketplace Service
 * High-performance, real-time marketplace service backed by Supabase PostgreSQL.
 * Provides resilient fallback to Firestore during migration phase.
 */

import { supabase } from "./supabase";
import { db, collection, query, onSnapshot, doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc, serverTimestamp } from "./firebase";
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
 * Maps BuySellListing to Supabase DB payload
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
  payload.updated_at = new Date().toISOString();
  return payload;
}

/**
 * Real-time subscription to Buy & Sell Listings.
 * Primary: Supabase Realtime + postgres_changes.
 * Resilient fallback: Firestore onSnapshot if Supabase table is not yet provisioned.
 */
export function subscribeToBuySellListings(
  onUpdate: (listings: BuySellListing[]) => void,
  onError?: (err: any) => void
): () => void {
  let isSupabaseActive = true;
  let firestoreUnsub: (() => void) | null = null;

  // 1. Initial fetch from Supabase
  const loadSupabaseData = async () => {
    try {
      const { data, error } = await supabase
        .from(TABLE_LISTINGS)
        .select("*")
        .order("created_at", { ascending: false });

      if (error || !data) {
        throw error || new Error("No data returned");
      }

      onUpdate(data.map(mapRowToListing));
    } catch (err) {
      console.warn("Supabase buy_sell_listings unavailable, falling back to Firestore listener:", err);
      isSupabaseActive = false;
      fallbackToFirestore();
    }
  };

  const fallbackToFirestore = () => {
    if (firestoreUnsub) return;
    try {
      const q = query(collection(db, "buy_sell_listings"));
      firestoreUnsub = onSnapshot(q, (snapshot) => {
        const items: BuySellListing[] = [];
        snapshot.forEach((d) => {
          items.push({ id: d.id, ...d.data() } as BuySellListing);
        });
        items.sort((a, b) => {
          const tA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
          const tB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
          return tB - tA;
        });
        onUpdate(items);
      }, (err) => {
        if (onError) onError(err);
      });
    } catch (e) {
      if (onError) onError(e);
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
        if (isSupabaseActive) {
          loadSupabaseData();
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
    if (firestoreUnsub) {
      firestoreUnsub();
    }
  };
}

/**
 * Create a new Buy & Sell listing (Supabase primary + Firestore mirror for smooth transition)
 */
export async function createBuySellListing(listing: Omit<BuySellListing, "id">): Promise<BuySellListing> {
  const id = "bs_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 6);
  const now = new Date().toISOString();

  const dbPayload = {
    id,
    ...mapListingToDb(listing),
    created_at: now
  };

  // 1. Supabase write
  try {
    const { error } = await supabase.from(TABLE_LISTINGS).insert(dbPayload);
    if (error) {
      console.warn("Supabase insert listing failed, falling back to Firestore:", error);
    }
  } catch (err) {
    console.warn("Supabase insert exception:", err);
  }

  // 2. Firestore mirror write so both stay 100% synced during migration
  try {
    const fsDocRef = doc(db, "buy_sell_listings", id);
    await setDoc(fsDocRef, {
      ...listing,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (fsErr) {
    console.warn("Firestore mirror write note:", fsErr);
  }

  return {
    id,
    ...listing,
    createdAt: now,
    updatedAt: now
  } as BuySellListing;
}

/**
 * Update an existing listing
 */
export async function updateBuySellListing(id: string, updates: Partial<BuySellListing>): Promise<void> {
  const dbPayload = mapListingToDb(updates);

  // 1. Supabase update
  try {
    await supabase.from(TABLE_LISTINGS).update(dbPayload).eq("id", id);
  } catch (err) {
    console.warn("Supabase update error:", err);
  }

  // 2. Firestore mirror update
  try {
    const fsDocRef = doc(db, "buy_sell_listings", id);
    await updateDoc(fsDocRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    console.warn("Firestore update error:", err);
  }
}

/**
 * Delete a listing
 */
export async function deleteBuySellListing(id: string): Promise<void> {
  // 1. Supabase delete
  try {
    await supabase.from(TABLE_LISTINGS).delete().eq("id", id);
  } catch (err) {
    console.warn("Supabase delete error:", err);
  }

  // 2. Firestore mirror delete
  try {
    const fsDocRef = doc(db, "buy_sell_listings", id);
    await deleteDoc(fsDocRef);
  } catch (err) {
    console.warn("Firestore delete error:", err);
  }
}

/**
 * Submit a report for a listing
 */
export async function reportBuySellListing(report: Omit<BuySellReport, "id" | "createdAt">): Promise<void> {
  const id = "rep_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 6);
  const now = new Date().toISOString();

  // 1. Supabase
  try {
    await supabase.from(TABLE_REPORTS).insert({
      id,
      listing_id: report.listingId,
      listing_title: report.listingTitle,
      seller_uid: report.sellerUid,
      reported_by_uid: report.reportedByUid,
      reported_by_name: report.reportedByName,
      reason: report.reason,
      details: report.details || "",
      status: report.status || "pending",
      created_at: now
    });
  } catch (e) {
    console.warn("Supabase report insert fallback:", e);
  }

  // 2. Firestore fallback
  try {
    await addDoc(collection(db, "buy_sell_reports"), {
      ...report,
      createdAt: serverTimestamp()
    });
  } catch (e) {
    console.warn("Firestore report fallback:", e);
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
  // 1. Supabase upsert
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
    console.warn("Supabase chat upsert fallback:", err);
  }

  // 2. Firestore mirror
  try {
    const chatDocRef = doc(db, "buy_sell_chats", chatId);
    const snap = await getDoc(chatDocRef);
    if (!snap.exists()) {
      await setDoc(chatDocRef, {
        ...meta,
        lastMessage: newMsg.text,
        lastMessageAt: serverTimestamp(),
        messages: [newMsg],
        createdAt: serverTimestamp()
      });
    } else {
      const data = snap.data();
      const msgs = Array.isArray(data.messages) ? data.messages : [];
      await updateDoc(chatDocRef, {
        lastMessage: newMsg.text,
        lastMessageAt: serverTimestamp(),
        messages: [...msgs, newMsg]
      });
    }
  } catch (fsErr) {
    console.warn("Firestore chat mirror fallback:", fsErr);
  }
}

/**
 * Buyer-Seller Chat: Subscribe to real-time chat updates
 */
export function subscribeToBuySellChat(
  chatId: string,
  onUpdate: (chat: BuySellChat | null) => void
): () => void {
  let isSupabaseActive = true;
  let firestoreUnsub: (() => void) | null = null;

  const loadSupabaseChat = async () => {
    try {
      const { data, error } = await supabase
        .from(TABLE_CHATS)
        .select("*")
        .eq("id", chatId)
        .single();

      if (error || !data) {
        throw error || new Error("No chat data");
      }

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
    } catch {
      isSupabaseActive = false;
      fallbackFirestoreChat();
    }
  };

  const fallbackFirestoreChat = () => {
    if (firestoreUnsub) return;
    try {
      const docRef = doc(db, "buy_sell_chats", chatId);
      firestoreUnsub = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          onUpdate({ id: docSnap.id, ...docSnap.data() } as BuySellChat);
        } else {
          onUpdate(null);
        }
      });
    } catch {}
  };

  loadSupabaseChat();

  const channel = supabase
    .channel(`buy_sell_chat_${chatId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: TABLE_CHATS, filter: `id=eq.${chatId}` },
      () => {
        if (isSupabaseActive) {
          loadSupabaseChat();
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
    if (firestoreUnsub) firestoreUnsub();
  };
}
