/**
 * Supabase Memos & Invoices Management Service
 * Manages store memos, invoices, and accounting records in Supabase PostgreSQL.
 */

import { supabase } from "./supabase";

const TABLE_MEMOS = "memos";

export async function saveSupabaseMemo(memoId: string, payload: any): Promise<void> {
  try {
    await supabase.from(TABLE_MEMOS).upsert({
      id: memoId,
      memo_number: payload.memoNumber || payload.id,
      title: payload.storeName || "মেগা বাজার মেমো",
      date: payload.date || new Date().toISOString().split("T")[0],
      customer_name: payload.customerName || "",
      customer_phone: payload.customerPhone || "",
      customer_address: payload.customerAddress || "",
      order_id: payload.orderId || null,
      items: payload.items || [],
      subtotal: Number(payload.subtotal || 0),
      discount: Number(payload.discount || 0),
      delivery_charge: Number(payload.deliveryCharge || 0),
      total_amount: Number(payload.totalAmount || payload.grandTotal || 0),
      paid_amount: Number(payload.paidAmount || 0),
      due_amount: Number(payload.dueAmount || 0),
      payment_method: payload.paymentMethod || "cash_on_delivery",
      status: payload.paymentStatus || payload.status || "issued",
      prepared_by: payload.preparedBy || payload.sellerOfficerName || "",
      founder_name: payload.founderName || "",
      founder_designation: payload.founderDesignation || "",
      notes: payload.notes || "",
      updated_at: new Date().toISOString()
    });
  } catch (err) {
    console.warn("Supabase memo upsert note:", err);
  }
}

export async function deleteSupabaseMemo(memoId: string): Promise<void> {
  try {
    await supabase.from(TABLE_MEMOS).delete().eq("id", memoId);
  } catch (err) {
    console.warn("Supabase memo delete note:", err);
  }
}
