/**
 * Supabase In-App Notifications Engine
 * Real-time notifications for Customers, Riders, Sellers, and Admins.
 */

import { supabase } from "./supabase";

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type?: "order" | "promo" | "reward" | "alert" | "info";
  isRead: boolean;
  linkUrl?: string;
  metadata?: any;
  createdAt: string;
}

const TABLE_NOTIFICATIONS = "notifications";

/**
 * Send notification (Writes to Supabase)
 */
export async function sendNotification(notif: Omit<AppNotification, "id" | "createdAt" | "isRead">): Promise<void> {
  const id = "notif_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 6);
  const now = new Date().toISOString();

  // Supabase write
  try {
    await supabase.from(TABLE_NOTIFICATIONS).insert({
      id,
      user_id: notif.userId,
      title: notif.title,
      message: notif.message,
      type: notif.type || "info",
      is_read: false,
      link_url: notif.linkUrl || null,
      metadata: notif.metadata || {},
      created_at: now
    });
  } catch (err) {
    console.warn("Supabase notification insert note:", err);
  }
}

/**
 * Real-time subscription to notifications for a user or admin
 */
export function subscribeToNotifications(
  userId: string,
  onUpdate: (notifications: AppNotification[]) => void
): () => void {
  const loadNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from(TABLE_NOTIFICATIONS)
        .select("*")
        .or(`user_id.eq.${userId},user_id.eq.all`)
        .order("created_at", { ascending: false })
        .limit(30);

      if (!error && data) {
        onUpdate(
          data.map((r: any) => ({
            id: r.id,
            userId: r.user_id,
            title: r.title,
            message: r.message,
            type: r.type,
            isRead: Boolean(r.is_read),
            linkUrl: r.link_url,
            metadata: r.metadata,
            createdAt: r.created_at
          }))
        );
      }
    } catch (err) {
      console.warn("Supabase notifications fetch note:", err);
    }
  };

  loadNotifications();

  try {
    const channelId = `notifs_${userId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: TABLE_NOTIFICATIONS },
        () => loadNotifications()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel).catch(() => {});
    };
  } catch {
    return () => {};
  }
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(id: string): Promise<void> {
  try {
    await supabase.from(TABLE_NOTIFICATIONS).update({ is_read: true }).eq("id", id);
  } catch (err) {
    console.warn("Supabase notification update error:", err);
  }
}
