/**
 * Supabase WebRTC Voice Signaling & Call Center Engine
 * Real-time peer-to-peer audio calling via Supabase Realtime Broadcast Channels (sub-millisecond latency)
 * backed by Supabase PostgreSQL persistence for 'voice_calls' and 'call_center_agents'.
 * Includes resilient dual-sync fallback to Firestore.
 */

import { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { 
  db, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  onSnapshot, 
  serverTimestamp, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  limit 
} from "./firebase";
import { VoiceCallSession } from "./webrtcCall";
import { CallCenterAgent, INITIAL_20_AGENTS } from "./callCenterManager";

const TABLE_CALLS = "voice_calls";
const TABLE_AGENTS = "call_center_agents";

export interface WebRTCSignalPayload {
  type: "offer" | "answer" | "ice_candidate" | "hangup" | "status_change";
  callId: string;
  sender: "caller" | "agent" | "system";
  offer?: any;
  answer?: any;
  candidate?: any;
  status?: string;
  agentId?: string;
  agentName?: string;
  endedBy?: string;
}

/**
 * Creates and manages a low-latency Supabase Realtime Broadcast Channel for WebRTC signaling.
 */
export class SupabaseCallSignalingChannel {
  private channel: RealtimeChannel;
  private callId: string;

  constructor(callId: string) {
    this.callId = callId;
    this.channel = supabase.channel(`webrtc_call_${callId}`, {
      config: { broadcast: { self: false } }
    });
  }

  public subscribe(onSignal: (signal: WebRTCSignalPayload) => void): () => void {
    this.channel
      .on("broadcast", { event: "webrtc_signal" }, (event) => {
        if (event.payload && event.payload.callId === this.callId) {
          onSignal(event.payload as WebRTCSignalPayload);
        }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log(`[Supabase WebRTC] Subscribed to signaling channel for call: ${this.callId}`);
        }
      });

    return () => {
      supabase.removeChannel(this.channel);
    };
  }

  public sendOffer(offer: any, callerName: string): void {
    this.channel.send({
      type: "broadcast",
      event: "webrtc_signal",
      payload: {
        type: "offer",
        callId: this.callId,
        sender: "caller",
        offer,
        callerName
      }
    });
  }

  public sendAnswer(answer: any, agentId: string, agentName: string): void {
    this.channel.send({
      type: "broadcast",
      event: "webrtc_signal",
      payload: {
        type: "answer",
        callId: this.callId,
        sender: "agent",
        answer,
        agentId,
        agentName
      }
    });
  }

  public sendIceCandidate(candidate: any, sender: "caller" | "agent"): void {
    this.channel.send({
      type: "broadcast",
      event: "webrtc_signal",
      payload: {
        type: "ice_candidate",
        callId: this.callId,
        sender,
        candidate
      }
    });
  }

  public sendHangup(endedBy: string = "user"): void {
    this.channel.send({
      type: "broadcast",
      event: "webrtc_signal",
      payload: {
        type: "hangup",
        callId: this.callId,
        sender: "caller",
        endedBy
      }
    });
  }

  public sendStatusChange(status: string, metadata?: any): void {
    this.channel.send({
      type: "broadcast",
      event: "webrtc_signal",
      payload: {
        type: "status_change",
        callId: this.callId,
        sender: "system",
        status,
        ...metadata
      }
    });
  }
}

/**
 * Initiates a new Voice Call session:
 * - Persists record in Supabase 'voice_calls'
 * - Mirrors to Firestore for zero-downtime compatibility
 */
export async function initiateSupabaseVoiceCall(callData: {
  id: string;
  callNumber: string;
  callerId: string;
  callerName: string;
  callerPhone?: string;
  callerType: "customer" | "guest";
  offer: any;
}): Promise<void> {
  const now = new Date().toISOString();

  // 1. Supabase write
  try {
    await supabase.from(TABLE_CALLS).insert({
      id: callData.id,
      call_number: callData.callNumber,
      caller_id: callData.callerId,
      caller_name: callData.callerName,
      caller_phone: callData.callerPhone || null,
      caller_type: callData.callerType,
      status: "waiting",
      queue_position: 1,
      offer: callData.offer,
      created_at: now
    });
  } catch (err) {
    console.warn("Supabase voice_calls insert note:", err);
  }

  // 2. Firestore mirror write
  try {
    const fsRef = doc(db, "voice_calls", callData.id);
    await setDoc(fsRef, {
      ...callData,
      status: "waiting",
      createdAt: serverTimestamp(),
      durationSeconds: 0
    });
  } catch (fsErr) {
    console.warn("Firestore voice_calls mirror note:", fsErr);
  }
}

/**
 * Updates call status and details in Supabase & Firestore
 */
export async function updateSupabaseVoiceCall(callId: string, updates: Partial<VoiceCallSession> & { answer?: any }): Promise<void> {
  const payload: any = {};
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.assignedAgentId !== undefined) payload.assigned_agent_id = updates.assignedAgentId;
  if (updates.assignedAgentName !== undefined) payload.assigned_agent_name = updates.assignedAgentName;
  if (updates.answer !== undefined) payload.answer = updates.answer;
  if (updates.durationSeconds !== undefined) payload.duration_seconds = updates.durationSeconds;
  if (updates.endedBy !== undefined) payload.ended_by = updates.endedBy;
  if (updates.notes !== undefined) payload.notes = updates.notes;
  if (updates.connectedAt !== undefined) payload.connected_at = updates.connectedAt;
  if (updates.endedAt !== undefined) payload.ended_at = updates.endedAt;

  // 1. Supabase update
  try {
    await supabase.from(TABLE_CALLS).update(payload).eq("id", callId);
  } catch (err) {
    console.warn("Supabase call update note:", err);
  }

  // 2. Firestore update
  try {
    const fsRef = doc(db, "voice_calls", callId);
    await updateDoc(fsRef, {
      ...updates,
      ...(updates.status === "connected" ? { connectedAt: serverTimestamp() } : {}),
      ...(updates.status === "ended" || updates.status === "cancelled" ? { endedAt: serverTimestamp() } : {})
    });
  } catch (fsErr) {
    console.warn("Firestore call update note:", fsErr);
  }
}

/**
 * Listens to active incoming / waiting / in-call sessions for Admin Voice Call Tab
 */
export function subscribeToSupabaseActiveCalls(
  onUpdate: (calls: VoiceCallSession[]) => void
): () => void {
  const loadCalls = async () => {
    try {
      const { data, error } = await supabase
        .from(TABLE_CALLS)
        .select("*")
        .in("status", ["waiting", "calling", "ringing", "connected", "in_call"])
        .order("created_at", { ascending: true });

      if (!error && data) {
        onUpdate(
          data.map((r: any) => ({
            id: r.id,
            callNumber: r.call_number,
            callerId: r.caller_id,
            callerName: r.caller_name,
            callerPhone: r.caller_phone,
            callerType: r.caller_type,
            status: r.status,
            queuePosition: r.queue_position,
            assignedAgentId: r.assigned_agent_id,
            assignedAgentName: r.assigned_agent_name,
            offer: r.offer,
            answer: r.answer,
            durationSeconds: r.duration_seconds,
            notes: r.notes,
            createdAt: r.created_at,
            connectedAt: r.connected_at,
            endedAt: r.ended_at
          }))
        );
      }
    } catch (err) {
      console.warn("Supabase active calls fetch note:", err);
    }
  };

  loadCalls();

  const channel = supabase
    .channel("active_calls_realtime")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: TABLE_CALLS },
      () => loadCalls()
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Listens to Call Center Agents roster in Supabase
 */
export function subscribeToSupabaseAgents(
  onUpdate: (agents: CallCenterAgent[]) => void
): () => void {
  const loadAgents = async () => {
    try {
      const { data, error } = await supabase
        .from(TABLE_AGENTS)
        .select("*")
        .order("agent_number", { ascending: true });

      if (!error && data && data.length > 0) {
        onUpdate(
          data.map((r: any) => ({
            id: r.id,
            agentNumber: r.agent_number,
            nameBn: r.name_bn,
            nameEn: r.name_en,
            roleTitleBn: r.role_title_bn,
            roleTitleEn: r.role_title_en,
            status: r.status,
            currentCallId: r.current_call_id,
            activeCallerName: r.active_caller_name,
            totalCallsHandled: r.total_calls_handled || 0,
            lastActiveAt: r.last_active_at,
            currentAdminUid: r.current_admin_uid,
            currentAdminName: r.current_admin_name
          }))
        );
      }
    } catch (err) {
      console.warn("Supabase agents fetch note:", err);
    }
  };

  loadAgents();

  const channel = supabase
    .channel("agents_realtime")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: TABLE_AGENTS },
      () => loadAgents()
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Update Agent Status in Supabase & Firestore
 */
export async function updateSupabaseAgentStatus(
  agentId: string,
  status: "available" | "ringing" | "in_call" | "offline",
  adminInfo?: { uid: string; name: string }
): Promise<void> {
  const now = new Date().toISOString();

  // 1. Supabase update
  try {
    await supabase.from(TABLE_AGENTS).update({
      status,
      last_active_at: now,
      ...(adminInfo ? { current_admin_uid: adminInfo.uid, current_admin_name: adminInfo.name } : {})
    }).eq("id", agentId);
  } catch (err) {
    console.warn("Supabase agent status update note:", err);
  }

  // 2. Firestore mirror update
  try {
    const agentRef = doc(db, "call_center_agents", agentId);
    await updateDoc(agentRef, {
      status,
      lastActiveAt: serverTimestamp(),
      ...(adminInfo ? { currentAdminUid: adminInfo.uid, currentAdminName: adminInfo.name } : {})
    });
  } catch (fsErr) {
    console.warn("Firestore agent status mirror note:", fsErr);
  }
}
