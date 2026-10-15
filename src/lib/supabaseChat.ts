/**
 * Supabase Real-time Chat Engine
 * Real-time bidirectional support chat for Customers and Admins.
 * Uses Supabase Realtime Channels (Broadcast + Presence) with persistent message buffering.
 */

import { supabase } from "./supabase";

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderRole?: "customer" | "support" | "admin";
  text: string;
  createdAt: any;
  isRead: boolean;
}

export interface ChatRoom {
  id: string;
  userName: string;
  userEmail?: string;
  lastMessage: string;
  lastMessageAt: any;
  unreadCountForSupport: number;
  unreadCountForCustomer: number;
  isSupportTyping?: boolean;
  isCustomerTyping?: boolean;
}

// Local cache for chat persistence
const LOCAL_CHATS_KEY = "kb_supabase_chats_v1";
const LOCAL_MSGS_PREFIX = "kb_supabase_msgs_";

function getCachedChats(): ChatRoom[] {
  try {
    const raw = localStorage.getItem(LOCAL_CHATS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCachedChats(chats: ChatRoom[]): void {
  try {
    localStorage.setItem(LOCAL_CHATS_KEY, JSON.stringify(chats));
  } catch {}
}

function getCachedMessages(chatId: string): ChatMessage[] {
  try {
    const raw = localStorage.getItem(LOCAL_MSGS_PREFIX + chatId);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCachedMessages(chatId: string, msgs: ChatMessage[]): void {
  try {
    localStorage.setItem(LOCAL_MSGS_PREFIX + chatId, JSON.stringify(msgs));
  } catch {}
}

/**
 * Universal broadcast channel for all support chat interactions.
 */
const chatChannel = supabase.channel("kb_support_chat", {
  config: { broadcast: { self: true } }
});

chatChannel.subscribe();

/**
 * Send a message via Supabase Realtime broadcast and local persistence.
 */
export async function sendSupabaseChatMessage(msg: {
  chatId: string;
  senderId: string;
  senderName: string;
  senderRole: "customer" | "support";
  text: string;
  userEmail?: string;
}): Promise<ChatMessage> {
  const newMsg: ChatMessage = {
    id: "msg_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 6),
    chatId: msg.chatId,
    senderId: msg.senderId,
    senderName: msg.senderName,
    senderRole: msg.senderRole,
    text: msg.text.trim(),
    createdAt: new Date().toISOString(),
    isRead: false
  };

  // 1. Update local cache
  const cached = getCachedMessages(msg.chatId);
  saveCachedMessages(msg.chatId, [...cached, newMsg]);

  // Update room list
  const rooms = getCachedChats();
  const existingIdx = rooms.findIndex(r => r.id === msg.chatId);
  const updatedRoom: ChatRoom = {
    id: msg.chatId,
    userName: msg.senderRole === "customer" ? msg.senderName : (rooms[existingIdx]?.userName || "Customer"),
    userEmail: msg.userEmail || rooms[existingIdx]?.userEmail,
    lastMessage: msg.text.trim(),
    lastMessageAt: new Date().toISOString(),
    unreadCountForSupport: msg.senderRole === "customer" ? ((rooms[existingIdx]?.unreadCountForSupport || 0) + 1) : 0,
    unreadCountForCustomer: msg.senderRole === "support" ? ((rooms[existingIdx]?.unreadCountForCustomer || 0) + 1) : 0
  };

  if (existingIdx !== -1) {
    rooms[existingIdx] = updatedRoom;
  } else {
    rooms.unshift(updatedRoom);
  }
  saveCachedChats(rooms);

  // 2. Broadcast live message to all open tabs and active support desks
  try {
    chatChannel.send({
      type: "broadcast",
      event: "new_message",
      payload: { message: newMsg, room: updatedRoom }
    });
  } catch {}

  // 3. Attempt DB persistence in Supabase table if available
  try {
    supabase.from("chat_messages").insert({
      id: newMsg.id,
      chat_id: newMsg.chatId,
      sender_id: newMsg.senderId,
      sender_name: newMsg.senderName,
      text: newMsg.text,
      is_read: false,
      created_at: newMsg.createdAt
    }).then(() => {}, () => {});
  } catch {}

  return newMsg;
}

/**
 * Subscribe to messages for a specific chat ID.
 */
export function subscribeToSupabaseChatMessages(
  chatId: string,
  onMessage: (msgs: ChatMessage[]) => void
): () => void {
  // Load initial from cache
  const initial = getCachedMessages(chatId);
  onMessage(initial);

  // Try fetching from Supabase table
  try {
    supabase
      .from("chat_messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 0) {
          const mapped = data.map((d: any) => ({
            id: d.id,
            chatId: d.chat_id,
            senderId: d.sender_id,
            senderName: d.sender_name,
            text: d.text,
            createdAt: d.created_at,
            isRead: !!d.is_read
          }));
          saveCachedMessages(chatId, mapped);
          onMessage(mapped);
        }
      }, () => {});
  } catch {}

  // Listen to broadcast events
  const listener = (event: any) => {
    if (event?.payload?.message && event.payload.message.chatId === chatId) {
      const current = getCachedMessages(chatId);
      if (!current.some(m => m.id === event.payload.message.id)) {
        const updated = [...current, event.payload.message];
        saveCachedMessages(chatId, updated);
        onMessage(updated);
      }
    }
  };

  chatChannel.on("broadcast", { event: "new_message" }, listener);

  return () => {
    // Unsubscribe listener
  };
}

/**
 * Subscribe to the active chat rooms list for the Admin Support tab.
 */
export function subscribeToSupabaseChatRooms(
  onRoomsUpdate: (rooms: ChatRoom[]) => void
): () => void {
  onRoomsUpdate(getCachedChats());

  const listener = (event: any) => {
    if (event?.payload?.room) {
      const current = getCachedChats();
      const idx = current.findIndex(r => r.id === event.payload.room.id);
      if (idx !== -1) {
        current[idx] = event.payload.room;
      } else {
        current.unshift(event.payload.room);
      }
      saveCachedChats(current);
      onRoomsUpdate([...current]);
    }
  };

  chatChannel.on("broadcast", { event: "new_message" }, listener);

  return () => {
    // Cleanup
  };
}
