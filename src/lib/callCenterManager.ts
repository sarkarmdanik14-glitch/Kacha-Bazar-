/**
 * Call Center 20 Agents Roster & FIFO Queue Engine
 * Handles atomic call assignment, agent statuses, real-time metrics, and queue ordering.
 */

import { 
  db, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  serverTimestamp, 
  query, 
  where, 
  orderBy, 
  limit,
  runTransaction
} from "./firebase";
import { VoiceCallSession } from "./webrtcCall";

export interface CallCenterAgent {
  id: string; // e.g. "agent_01" to "agent_20"
  agentNumber: number;
  nameBn: string;
  nameEn: string;
  roleTitleBn: string;
  roleTitleEn: string;
  status: "available" | "ringing" | "in_call" | "offline";
  currentCallId: string | null;
  activeCallerName: string | null;
  totalCallsHandled: number;
  lastActiveAt?: any;
  currentAdminUid?: string | null;
  currentAdminName?: string | null;
}

export const INITIAL_20_AGENTS: Omit<CallCenterAgent, "status" | "currentCallId" | "activeCallerName" | "totalCallsHandled">[] = [
  { id: "agent_01", agentNumber: 1, nameBn: "প্রতিনিধি ১ - আনিস রহমান", nameEn: "Agent 01 - Anis Rahman", roleTitleBn: "সিনিয়র সাপোর্ট স্পেশালিস্ট", roleTitleEn: "Senior Support Specialist" },
  { id: "agent_02", agentNumber: 2, nameBn: "প্রতিনিধি ২ - সাদিয়া আফরিন", nameEn: "Agent 02 - Sadia Afrin", roleTitleBn: "অর্ডার হেল্পডেস্ক এক্সিকিউটিভ", roleTitleEn: "Order Helpdesk Executive" },
  { id: "agent_03", agentNumber: 3, nameBn: "প্রতিনিধি ৩ - তানভীর হাসান", nameEn: "Agent 03 - Tanvir Hasan", roleTitleBn: "কাস্টমার কেয়ার অফিসার", roleTitleEn: "Customer Care Officer" },
  { id: "agent_04", agentNumber: 4, nameBn: "প্রতিনিধি ৪ - নুসরাত জাহান", nameEn: "Agent 04 - Nusrat Jahan", roleTitleBn: "লাইভ সাপোর্ট প্রতিনিধি", roleTitleEn: "Live Support Agent" },
  { id: "agent_05", agentNumber: 5, nameBn: "প্রতিনিধি ৫ - মাহমুদুল হক", nameEn: "Agent 05 - Mahmudul Haque", roleTitleBn: "গ্রাহক সেবা কর্মকর্তা", roleTitleEn: "Client Relations Officer" },
  { id: "agent_06", agentNumber: 6, nameBn: "প্রতিনিধি ৬ - ফাতেমা আক্তার", nameEn: "Agent 06 - Fatema Akter", roleTitleBn: "অর্ডার ট্র্যাকিং ডেস্ক", roleTitleEn: "Order Tracking Desk" },
  { id: "agent_07", agentNumber: 7, nameBn: "প্রতিনিধি ৭ - সাব্বির আহমেদ", nameEn: "Agent 07 - Sabbir Ahmed", roleTitleBn: "ডেলিভারি সমন্বয়ক", roleTitleEn: "Delivery Coordinator" },
  { id: "agent_08", agentNumber: 8, nameBn: "প্রতিনিধি ৮ - রুমানা পারভীন", nameEn: "Agent 08 - Rumana Parvin", roleTitleBn: "সাপোর্ট কনসালট্যান্ট", roleTitleEn: "Support Consultant" },
  { id: "agent_09", agentNumber: 9, nameBn: "প্রতিনিধি ৯ - রাকিবুল ইসলাম", nameEn: "Agent 09 - Rakibul Islam", roleTitleBn: "কল সেন্টার প্রতিনিধি", roleTitleEn: "Call Center Representative" },
  { id: "agent_10", agentNumber: 10, nameBn: "প্রতিনিধি ১০ - সুমাইয়া কবীর", nameEn: "Agent 10 - Sumaiya Kabir", roleTitleBn: "কাস্টমার সাকসেস লিড", roleTitleEn: "Customer Success Lead" },
  { id: "agent_11", agentNumber: 11, nameBn: "প্রতিনিধি ১১ - হাসান জামিল", nameEn: "Agent 11 - Hasan Jamil", roleTitleBn: "জরুরি সেবা টিম", roleTitleEn: "Priority Helpline" },
  { id: "agent_12", agentNumber: 12, nameBn: "প্রতিনিধি ১২ - মেহজাবিন চৌধুরী", nameEn: "Agent 12 - Mehzabin Chowdhury", roleTitleBn: "অর্ডার সাপোর্ট ডেস্ক", roleTitleEn: "Order Support Desk" },
  { id: "agent_13", agentNumber: 13, nameBn: "প্রতিনিধি ১৩ - আশরাফুল আলম", nameEn: "Agent 13 - Ashraful Alam", roleTitleBn: "রিটার্ন ও রিফান্ড ডেস্ক", roleTitleEn: "Refund & Support Desk" },
  { id: "agent_14", agentNumber: 14, nameBn: "প্রতিনিধি ১৪ - জেরিন তাসনিম", nameEn: "Agent 14 - Jerin Tasnim", roleTitleBn: "কল অফিসার", roleTitleEn: "Call Officer" },
  { id: "agent_15", agentNumber: 15, nameBn: "প্রতিনিধি ১৫ - কামরুল হাসান", nameEn: "Agent 15 - Kamrul Hasan", roleTitleBn: "প্রডাক্ট কোয়ারি ডেস্ক", roleTitleEn: "Product Query Desk" },
  { id: "agent_16", agentNumber: 16, nameBn: "প্রতিনিধি ১৬ - শারমিন জাহান", nameEn: "Agent 16 - Sharmin Jahan", roleTitleBn: "গ্রাহক সন্তুষ্টি স্পেশালিস্ট", roleTitleEn: "Satisfaction Specialist" },
  { id: "agent_17", agentNumber: 17, nameBn: "প্রতিনিধি ১৭ - নাজমুল হোসেন", nameEn: "Agent 17 - Nazmul Hossain", roleTitleBn: "হেল্পডেস্ক অফিসার", roleTitleEn: "Helpdesk Officer" },
  { id: "agent_18", agentNumber: 18, nameBn: "প্রতিনিধি ১৮ - রেশমা খাতুন", nameEn: "Agent 18 - Reshma Khatun", roleTitleBn: "জরুরি সাপোর্ট টিম", roleTitleEn: "Urgent Support Desk" },
  { id: "agent_19", agentNumber: 19, nameBn: "প্রতিনিধি ১৯ - আরিফুল ইসলাম", nameEn: "Agent 19 - Ariful Islam", roleTitleBn: "সুপারভাইজার হেল্পলাইন", roleTitleEn: "Supervisor Helpline" },
  { id: "agent_20", agentNumber: 20, nameBn: "প্রতিনিধি ২০ - তৌহিদুল করিম", nameEn: "Agent 20 - Touhidul Karim", roleTitleBn: "প্রধান সমন্বয়ক ডেস্ক", roleTitleEn: "Chief Coordinator Desk" },
];

/**
 * Initialize 20 Call Center Agent Desks in Firestore if not already seeded
 */
export async function ensureCallCenterAgentsSeeded(): Promise<void> {
  try {
    const agentsCol = collection(db, "call_center_agents");
    const snapshot = await getDocs(query(agentsCol, limit(1)));
    
    if (snapshot.empty) {
      console.log("Seeding 20 Call Center Agent desks...");
      for (const agent of INITIAL_20_AGENTS) {
        await setDoc(doc(db, "call_center_agents", agent.id), {
          ...agent,
          status: agent.agentNumber <= 3 ? "available" : "offline", // First 3 available by default
          currentCallId: null,
          activeCallerName: null,
          totalCallsHandled: 0,
          lastActiveAt: serverTimestamp()
        });
      }
    }
  } catch (err) {
    console.warn("Notice checking Call Center Agents:", err);
  }
}

/**
 * Update Agent Status (Available, Ringing, In Call, Offline)
 */
export async function updateAgentStatus(
  agentId: string, 
  status: "available" | "ringing" | "in_call" | "offline", 
  adminInfo?: { uid: string; name: string }
): Promise<void> {
  try {
    const agentRef = doc(db, "call_center_agents", agentId);
    await updateDoc(agentRef, {
      status,
      lastActiveAt: serverTimestamp(),
      ...(adminInfo ? {
        currentAdminUid: adminInfo.uid,
        currentAdminName: adminInfo.name
      } : {})
    });
  } catch (err) {
    console.warn("Update agent status notice:", err);
  }
}

/**
 * Atomic Call Acceptance Locking
 * Prevents two agents from accepting the same call simultaneously.
 * Returns true if this agent won the race and successfully accepted, false otherwise.
 */
export async function atomicallyAcceptCall(
  callId: string, 
  agentId: string, 
  agentName: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const callRef = doc(db, "voice_calls", callId);
    const agentRef = doc(db, "call_center_agents", agentId);

    const result = await runTransaction(db, async (transaction) => {
      const callDoc = await transaction.get(callRef);
      if (!callDoc.exists()) {
        return { success: false, message: "কলটি আর বিদ্যমান নেই।" };
      }

      const callData = callDoc.data();
      // Only allowed if call is 'waiting' or 'ringing' (not already 'connected' or 'in_call' or 'ended')
      if (callData.status === "connected" || callData.status === "in_call") {
        return { 
          success: false, 
          message: `কলটি ইতোমধ্যে অন্য প্রতিনিধি (${callData.assignedAgentName || "অন্যান্য প্রতিনিধি"}) দ্বারা গৃহীত হয়েছে।` 
        };
      }

      if (callData.status === "ended" || callData.status === "rejected" || callData.status === "cancelled") {
        return { success: false, message: "কলটি ইতোমধ্যে শেষ বা বাতিল করা হয়েছে।" };
      }

      // Update call document atomically
      transaction.update(callRef, {
        status: "connected",
        assignedAgentId: agentId,
        assignedAgentName: agentName,
        connectedAt: serverTimestamp()
      });

      // Update agent document atomically
      transaction.update(agentRef, {
        status: "in_call",
        currentCallId: callId,
        activeCallerName: callData.callerName || "গ্রাহক",
        lastActiveAt: serverTimestamp()
      });

      return { success: true };
    });

    return result;
  } catch (err: any) {
    console.error("Atomic accept transaction error:", err);
    return { success: false, message: err.message || "কল গ্রহণ করতে ত্রুটি হয়েছে।" };
  }
}

/**
 * Automatically assign the next oldest waiting customer in FIFO queue to an available agent
 */
export async function assignNextWaitingCallToAgent(agentId: string, agentName: string): Promise<boolean> {
  try {
    const q = query(
      collection(db, "voice_calls"),
      where("status", "==", "waiting"),
      orderBy("createdAt", "asc"),
      limit(1)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return false;

    const oldestCall = snapshot.docs[0];
    const callRef = doc(db, "voice_calls", oldestCall.id);
    const agentRef = doc(db, "call_center_agents", agentId);

    await updateDoc(callRef, {
      status: "ringing",
      assignedAgentId: agentId,
      assignedAgentName: agentName,
      assignedAt: serverTimestamp()
    });

    await updateDoc(agentRef, {
      status: "ringing",
      currentCallId: oldestCall.id,
      activeCallerName: oldestCall.data().callerName || "গ্রাহক"
    });

    return true;
  } catch (err) {
    console.warn("Notice assigning waiting call:", err);
    return false;
  }
}

/**
 * Route a newly created call immediately to the first available agent (if any)
 * to avoid unnecessary waiting when agents are free.
 */
export async function tryImmediateAgentRouting(callId: string, callerName: string): Promise<boolean> {
  try {
    const agentsCol = collection(db, "call_center_agents");
    const q = query(
      agentsCol, 
      where("status", "==", "available"), 
      orderBy("agentNumber", "asc"), 
      limit(1)
    );

    const snap = await getDocs(q);
    if (snap.empty) {
      return false; // No immediate agent available -> stays in waiting queue with Bangla welcome & waiting tone
    }

    const availableAgentDoc = snap.docs[0];
    const agentData = availableAgentDoc.data();
    const agentId = availableAgentDoc.id;
    const agentName = agentData.nameBn || "কাস্টমার কেয়ার প্রতিনিধি";

    const callRef = doc(db, "voice_calls", callId);
    const agentRef = doc(db, "call_center_agents", agentId);

    await updateDoc(callRef, {
      status: "ringing",
      assignedAgentId: agentId,
      assignedAgentName: agentName,
      assignedAt: serverTimestamp()
    });

    await updateDoc(agentRef, {
      status: "ringing",
      currentCallId: callId,
      activeCallerName: callerName || "গ্রাহক"
    });

    return true;
  } catch (err) {
    console.warn("Immediate agent routing notice:", err);
    return false;
  }
}
