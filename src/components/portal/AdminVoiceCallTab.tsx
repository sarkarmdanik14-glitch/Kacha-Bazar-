import React, { useState, useEffect, useRef } from "react";
import { 
  db, 
  collection, 
  doc, 
  getDoc, 
  getDocs,
  updateDoc, 
  addDoc, 
  setDoc,
  onSnapshot, 
  serverTimestamp, 
  query, 
  where, 
  orderBy, 
  limit 
} from "../../lib/firebase";
import { 
  Phone, 
  PhoneCall, 
  PhoneOff, 
  PhoneIncoming, 
  Mic, 
  MicOff, 
  Volume2, 
  X, 
  Sparkles, 
  User, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Headphones,
  History,
  Trash2,
  Users,
  Search,
  Filter,
  Check,
  FileText,
  Activity,
  Radio,
  UserCheck,
  UserX
} from "lucide-react";
import { RTC_CONFIG, callAudioSynth, VoiceCallSession } from "../../lib/webrtcCall";
import { 
  CallCenterAgent, 
  INITIAL_20_AGENTS, 
  ensureCallCenterAgentsSeeded, 
  updateAgentStatus, 
  atomicallyAcceptCall 
} from "../../lib/callCenterManager";

interface AdminVoiceCallTabProps {
  lang: "bn" | "en";
  triggerToast?: (bn: string, en: string) => void;
}

export default function AdminVoiceCallTab({ lang, triggerToast }: AdminVoiceCallTabProps) {
  // Call sessions & Agent rosters
  const [activeCalls, setActiveCalls] = useState<VoiceCallSession[]>([]);
  const [callHistory, setCallHistory] = useState<VoiceCallSession[]>([]);
  const [agents, setAgents] = useState<CallCenterAgent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("agent_01");
  
  // Current Connected Call state
  const [currentCall, setCurrentCall] = useState<VoiceCallSession | null>(null);
  const [callStatus, setCallStatus] = useState<"idle" | "connecting" | "connected" | "ended">("idle");
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [callDuration, setCallDuration] = useState<number>(0);
  const [callNotes, setCallNotes] = useState<string>("");
  const [isSavingNotes, setIsSavingNotes] = useState<boolean>(false);

  // Filter & Search states for Call History
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [agentFilter, setAgentFilter] = useState<string>("all");

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<any>(null);
  const durationRef = useRef<number>(0);
  const unsubscribeCallRef = useRef<(() => void) | null>(null);
  const unsubscribeCandidatesRef = useRef<(() => void) | null>(null);

  const getTranslation = (bn: string, en: string) => (lang === "bn" ? bn : en);

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Convert number to Bengali digits
  const toBanglaDigits = (num: number) => {
    const bnDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
    return num.toString().split("").map((d) => bnDigits[parseInt(d, 10)] || d).join("");
  };

  // 1. Ensure 20 agent roster is seeded & listen to agents collection
  useEffect(() => {
    ensureCallCenterAgentsSeeded();

    const unsub = onSnapshot(collection(db, "call_center_agents"), (snapshot) => {
      const list: CallCenterAgent[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as CallCenterAgent);
      });
      list.sort((a, b) => a.agentNumber - b.agentNumber);
      setAgents(list);
    }, (err) => {
      console.warn("Agents stream notice:", err.message);
    });

    return () => unsub();
  }, []);

  // 2. Listen for active incoming / waiting / ringing / in-call sessions
  useEffect(() => {
    const q = query(
      collection(db, "voice_calls"),
      where("status", "in", ["waiting", "calling", "ringing", "connected", "in_call"]),
      orderBy("createdAt", "asc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const calls: VoiceCallSession[] = [];
      snapshot.forEach((d) => {
        calls.push({ id: d.id, ...d.data() } as VoiceCallSession);
      });
      setActiveCalls(calls);
    }, (err) => {
      console.warn("Active calls stream notice:", err.message);
    });

    return () => unsub();
  }, []);

  // 3. Listen for historical logs (ended, rejected, missed, cancelled)
  useEffect(() => {
    const q = query(
      collection(db, "voice_calls"),
      where("status", "in", ["ended", "completed", "rejected", "missed", "cancelled"]),
      orderBy("createdAt", "desc"),
      limit(100)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const logs: VoiceCallSession[] = [];
      snapshot.forEach((d) => {
        logs.push({ id: d.id, ...d.data() } as VoiceCallSession);
      });
      setCallHistory(logs);
    }, (err) => {
      console.warn("Call history stream notice:", err.message);
    });

    return () => unsub();
  }, []);

  // Cleanup WebRTC & Call state
  const cleanupCall = () => {
    callAudioSynth.stopSounds();

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (unsubscribeCallRef.current) {
      unsubscribeCallRef.current();
      unsubscribeCallRef.current = null;
    }

    if (unsubscribeCandidatesRef.current) {
      unsubscribeCandidatesRef.current();
      unsubscribeCandidatesRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    setCallStatus("idle");
    setCurrentCall(null);
    setCallNotes("");
  };

  // Selected agent details
  const activeAgent = agents.find(a => a.id === selectedAgentId) || agents[0];

  // Accept incoming call with atomic locking
  const handleAcceptCall = async (call: VoiceCallSession) => {
    try {
      callAudioSynth.stopSounds();
      setCallStatus("connecting");
      setCallDuration(0);
      durationRef.current = 0;
      setCurrentCall(call);

      const agentName = activeAgent ? activeAgent.nameBn : "এডমিন সাপোর্ট";

      // 1. Atomic lock to ensure no other agent accepts this same call
      const lockResult = await atomicallyAcceptCall(call.id, selectedAgentId, agentName);
      if (!lockResult.success) {
        alert(lockResult.message || "কলটি গ্রহণ করা সম্ভব হয়নি।");
        cleanupCall();
        return;
      }

      // 2. Get Admin Microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { 
          echoCancellation: true, 
          noiseSuppression: true, 
          autoGainControl: true 
        },
        video: false
      });
      localStreamRef.current = stream;

      // 3. Setup RTCPeerConnection
      const pc = new RTCPeerConnection(RTC_CONFIG);
      pcRef.current = pc;

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Handle remote audio from customer
      pc.ontrack = (event) => {
        if (event.streams && event.streams[0] && remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = event.streams[0];
          remoteAudioRef.current.play().catch(() => {});
        }
      };

      // Collect ICE candidates from Admin (callee)
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          addDoc(collection(db, "voice_calls", call.id, "calleeCandidates"), event.candidate.toJSON()).catch(() => {});
        }
      };

      // 4. Set remote description from caller's offer
      const callDocRef = doc(db, "voice_calls", call.id);
      const callSnap = await getDoc(callDocRef);
      const callData = callSnap.data();

      if (!callData || !callData.offer) {
        throw new Error("কলের তথ্য পাওয়া যায়নি বা অফার পাওয়া যায়নি।");
      }

      await pc.setRemoteDescription(new RTCSessionDescription(callData.offer));

      // 5. Create Answer
      const answerDescription = await pc.createAnswer();
      await pc.setLocalDescription(answerDescription);

      const answer = {
        type: answerDescription.type,
        sdp: answerDescription.sdp
      };

      // 6. Update Firestore with Answer
      await updateDoc(callDocRef, {
        answer: answer,
        status: "connected",
        connectedAt: serverTimestamp(),
        assignedAgentId: selectedAgentId,
        assignedAgentName: agentName
      });

      setCallStatus("connected");
      callAudioSynth.playConnectChime();

      // Start timer
      if (!timerRef.current) {
        timerRef.current = setInterval(() => {
          durationRef.current += 1;
          setCallDuration(durationRef.current);
        }, 1000);
      }

      // 7. Listen for caller ICE candidates
      const callerCandidatesCol = collection(db, "voice_calls", call.id, "callerCandidates");
      const unsubCandidates = onSnapshot(callerCandidatesCol, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const candidate = new RTCIceCandidate(change.doc.data());
            pc.addIceCandidate(candidate).catch(() => {});
          }
        });
      });
      unsubscribeCandidatesRef.current = unsubCandidates;

      // 8. Listen for remote hangup
      const unsubCall = onSnapshot(callDocRef, (snap) => {
        const data = snap.data();
        if (!data) return;
        if ((data.status === "ended" || data.status === "cancelled") && callStatus === "connected") {
          callAudioSynth.playDisconnectTone();
          if (triggerToast) triggerToast("গ্রাহক কলটি শেষ করেছেন।", "Customer ended the call.");
          
          // Free agent
          updateDoc(doc(db, "call_center_agents", selectedAgentId), {
            status: "available",
            currentCallId: null,
            activeCallerName: null
          }).catch(() => {});

          cleanupCall();
        }
      });
      unsubscribeCallRef.current = unsubCall;

      if (triggerToast) triggerToast("কল সংযুক্ত হয়েছে!", "Call connected successfully!");

    } catch (err: any) {
      console.error("Accept call error:", err);
      callAudioSynth.stopSounds();
      alert(err.message || "কল গ্রহণ করতে সমস্যা হয়েছে। অনুগ্রহ করে মাইক্রোফোন চেক করুন।");
      
      // Free agent on error
      updateDoc(doc(db, "call_center_agents", selectedAgentId), {
        status: "available",
        currentCallId: null,
        activeCallerName: null
      }).catch(() => {});

      cleanupCall();
    }
  };

  // Reject Call
  const handleRejectCall = async (callId: string) => {
    callAudioSynth.playDisconnectTone();
    try {
      await updateDoc(doc(db, "voice_calls", callId), {
        status: "rejected",
        endedAt: serverTimestamp(),
        endedBy: "agent"
      });
      if (triggerToast) triggerToast("কলটি প্রত্যাখ্যান করা হয়েছে।", "Call rejected.");
    } catch (err) {
      console.warn("Reject call notice:", err);
    }
  };

  // End Active Call
  const handleEndCall = async () => {
    callAudioSynth.playDisconnectTone();
    if (currentCall) {
      try {
        await updateDoc(doc(db, "voice_calls", currentCall.id), {
          status: "ended",
          endedAt: serverTimestamp(),
          durationSeconds: durationRef.current,
          endedBy: "agent",
          notes: callNotes.trim() || "অর্ডার আলোচনা সম্পন্ন"
        });

        // Set agent back to available and increment calls count
        const agentRef = doc(db, "call_center_agents", selectedAgentId);
        const agentSnap = await getDoc(agentRef);
        const prevCount = agentSnap.exists() ? (agentSnap.data().totalCallsHandled || 0) : 0;

        await updateDoc(agentRef, {
          status: "available",
          currentCallId: null,
          activeCallerName: null,
          totalCallsHandled: prevCount + 1,
          lastActiveAt: serverTimestamp()
        });
      } catch (err) {
        console.warn("End call notice:", err);
      }
    }
    cleanupCall();
    if (triggerToast) triggerToast("কল সমাপ্ত হয়েছে ও লগ সংরক্ষিত হয়েছে।", "Call ended and logged.");
  };

  // Save in-call notes
  const handleSaveNotes = async () => {
    if (!currentCall || !callNotes.trim()) return;
    setIsSavingNotes(true);
    try {
      await updateDoc(doc(db, "voice_calls", currentCall.id), {
        notes: callNotes.trim()
      });
      if (triggerToast) triggerToast("নোট সংরক্ষিত হয়েছে!", "Call notes saved!");
    } catch (err) {
      console.warn("Save notes notice:", err);
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Toggle Mute
  const handleToggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  // Toggle Agent Status between Available and Offline
  const handleToggleAgentStatus = async (agentId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "available" ? "offline" : "available";
    await updateAgentStatus(agentId, nextStatus);
    if (triggerToast) {
      triggerToast(
        `প্রতিনিধি স্ট্যাটাস: ${nextStatus === "available" ? "ফ্রি / একটিভ" : "অফলাইন"}`,
        `Agent status: ${nextStatus}`
      );
    }
  };

  // Filtered Call History
  const filteredHistory = callHistory.filter((log) => {
    const matchSearch = searchTerm === "" || 
      (log.callerName && log.callerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.id && log.id.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.callNumber && log.callNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.assignedAgentName && log.assignedAgentName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchStatus = statusFilter === "all" || log.status === statusFilter;
    const matchAgent = agentFilter === "all" || log.assignedAgentId === agentFilter;

    return matchSearch && matchStatus && matchAgent;
  });

  // Calculate live statistics
  const totalIncoming = activeCalls.length + callHistory.length;
  const waitingCalls = activeCalls.filter(c => c.status === "waiting" || c.status === "calling");
  const liveInCalls = activeCalls.filter(c => c.status === "connected" || c.status === "in_call");
  const availableAgentsCount = agents.filter(a => a.status === "available").length;
  const busyAgentsCount = agents.filter(a => a.status === "in_call" || a.status === "ringing").length;
  const completedCallsCount = callHistory.filter(c => c.status === "ended" || c.status === "completed").length;
  const missedCallsCount = callHistory.filter(c => c.status === "missed" || c.status === "cancelled" || c.status === "rejected").length;

  return (
    <div className="space-y-6">
      {/* Remote Audio output */}
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-xl border border-emerald-500/20 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full text-xs font-black mb-2 border border-emerald-500/30">
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>{getTranslation("২০ প্রতিনিধি সেন্ট্রাল কল সেন্টার ড্যাশবোর্ড", "20-Agent Central Call Center System")}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight flex items-center space-x-2">
              <span>{getTranslation("কল সেন্টার ও কাস্টমার কেয়ার ম্যানেজমেন্ট", "Call Center & Queue Operations")}</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl mt-1 leading-relaxed">
              {getTranslation(
                "স্বয়ংক্রিয় বাংলা ভয়েস গ্রিটিং, FIFO কিউ সিস্টেম, ২০ জন প্রতিনিধির রোস্টার এবং লাইভ কল কানেক্টিভিটি।",
                "Automated Bangla voice greeting, FIFO queue engine, 20-agent live roster, and atomic call assignment."
              )}
            </p>
          </div>

          {/* Current Active Desk Selector */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 shrink-0 flex flex-col gap-1.5 min-w-[240px]">
            <span className="text-[10px] text-emerald-300 font-black uppercase tracking-wider">
              {getTranslation("আমার বর্তমান ডেস্ক (Active Desk):", "My Active Agent Desk:")}
            </span>
            <select
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              className="bg-slate-900 text-white text-xs font-bold rounded-xl px-3 py-2 border border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              {agents.map((ag) => (
                <option key={ag.id} value={ag.id}>
                  {ag.agentNumber}. {ag.nameBn} ({ag.status === "available" ? "🟢 ফ্রি" : ag.status === "in_call" ? "🟡 ব্যস্ত" : "⚫ অফলাইন"})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* TOP LIVE METRICS DASHBOARD */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-500">{getTranslation("মোট আগত কল", "Total Calls")}</span>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-2xl font-black text-slate-900">{totalIncoming}</span>
            <Phone className="w-4 h-4 text-slate-400" />
          </div>
        </div>

        <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-bold text-amber-800">{getTranslation("অপেক্ষারত কিউ", "Queue Waiting")}</span>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-2xl font-black text-amber-900">{waitingCalls.length}</span>
            <Clock className="w-4 h-4 text-amber-600 animate-spin" />
          </div>
        </div>

        <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-200 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-bold text-emerald-800">{getTranslation("চলমান লাইভ কল", "Active In-Call")}</span>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-2xl font-black text-emerald-900">{liveInCalls.length}</span>
            <Activity className="w-4 h-4 text-emerald-600 animate-pulse" />
          </div>
        </div>

        <div className="bg-teal-50 rounded-2xl p-4 border border-teal-200 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-bold text-teal-800">{getTranslation("ফ্রি প্রতিনিধি", "Available Agents")}</span>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-2xl font-black text-teal-900">{availableAgentsCount}</span>
            <span className="text-[10px] text-teal-600 font-bold">/ 20</span>
          </div>
        </div>

        <div className="bg-orange-50 rounded-2xl p-4 border border-orange-200 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-bold text-orange-800">{getTranslation("ব্যস্ত প্রতিনিধি", "Busy Agents")}</span>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-2xl font-black text-orange-900">{busyAgentsCount}</span>
            <Headphones className="w-4 h-4 text-orange-600" />
          </div>
        </div>

        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-600">{getTranslation("সম্পন্ন কল", "Completed")}</span>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-2xl font-black text-emerald-700">{completedCallsCount}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
        </div>

        <div className="bg-rose-50 rounded-2xl p-4 border border-rose-200 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-bold text-rose-800">{getTranslation("মিসড / বাতিল", "Missed/Cancelled")}</span>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-2xl font-black text-rose-900">{missedCallsCount}</span>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
        </div>

      </div>

      {/* ACTIVE CALL WORKSPACE (WHEN CONNECTED) */}
      {currentCall && callStatus === "connected" && (
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 border-2 border-emerald-400 text-white rounded-3xl p-6 shadow-2xl animate-scale-up">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            
            {/* Caller details */}
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-600 border-2 border-emerald-300 flex items-center justify-center shadow-lg shrink-0">
                <Headphones className="w-8 h-8 text-white animate-pulse" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                  <h3 className="text-lg font-black text-white">{currentCall.callerName}</h3>
                  <span className="bg-emerald-500/30 text-emerald-200 text-xs font-black px-2.5 py-0.5 rounded-full border border-emerald-400/40">
                    {currentCall.callerType === "guest" ? getTranslation("গেস্ট ভিজিটর", "Guest Visitor") : getTranslation("নিবন্ধিত ক্রেতা", "Registered Customer")}
                  </span>
                </div>
                <div className="flex items-center space-x-3 mt-1.5">
                  <span className="bg-black/50 text-emerald-300 font-mono text-sm font-black px-3 py-1 rounded-xl border border-white/10">
                    ⏱ {formatTime(callDuration)}
                  </span>
                  <span className="text-xs text-slate-300 font-medium">
                    {getTranslation(`ডেস্ক: ${activeAgent?.nameBn}`, `Desk: ${activeAgent?.nameEn}`)}
                  </span>
                </div>
              </div>
            </div>

            {/* Audio Wave Visualizer */}
            <div className="flex items-center space-x-1.5 h-6">
              {[40, 75, 50, 90, 60, 80, 45, 70, 55, 85].map((h, i) => (
                <span
                  key={i}
                  className="w-1.5 bg-emerald-400 rounded-full animate-pulse"
                  style={{
                    height: `${h}%`,
                    animationDelay: `${i * 0.08}s`,
                    animationDuration: "0.7s"
                  }}
                />
              ))}
            </div>

            {/* In-Call Actions */}
            <div className="flex items-center space-x-3">
              <button
                onClick={handleToggleMute}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                  isMuted 
                    ? "bg-amber-500 text-slate-950 font-black hover:bg-amber-400" 
                    : "bg-emerald-800/80 text-white hover:bg-emerald-700 border border-emerald-600"
                }`}
              >
                {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                <span>{isMuted ? getTranslation("আনমিউট", "Unmute") : getTranslation("মিউট", "Mute")}</span>
              </button>

              <button
                onClick={handleEndCall}
                className="flex items-center space-x-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black px-5 py-2.5 rounded-xl shadow-lg shadow-rose-950 transition cursor-pointer"
              >
                <PhoneOff className="w-4 h-4" />
                <span className="text-xs uppercase tracking-wider">{getTranslation("কল সমাপ্ত করুন", "End Call")}</span>
              </button>
            </div>
          </div>

          {/* Quick Notes & Order Info taker */}
          <div className="mt-5 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center gap-3">
            <input
              type="text"
              value={callNotes}
              onChange={(e) => setCallNotes(e.target.value)}
              placeholder={getTranslation(
                "কল চলাকালীন গ্রাহকের তথ্য বা অর্ডার নোট লিখুন (যেমন: ২ কেজি আলু ও ১ লিটার তেল অর্ডার)...",
                "Take notes or order requests during the call (e.g. 2kg Potato, 1L Oil)..."
              )}
              className="w-full bg-slate-950/70 text-white text-xs px-4 py-2.5 rounded-xl border border-white/15 focus:outline-none focus:ring-2 focus:ring-emerald-400 placeholder:text-slate-500"
            />
            <button
              onClick={handleSaveNotes}
              disabled={isSavingNotes}
              className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shrink-0 cursor-pointer disabled:opacity-50"
            >
              {isSavingNotes ? getTranslation("সংরক্ষণ হচ্ছে...", "Saving...") : getTranslation("নোট সংরক্ষণ", "Save Note")}
            </button>
          </div>
        </div>
      )}

      {/* REAL-TIME INCOMING & WAITING QUEUE (FIFO) */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <PhoneIncoming className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-sm sm:text-base">
                {getTranslation("আগত কল কিউ ও অপেক্ষারত তালিকা (FIFO Queue)", "Live Incoming & Waiting Call Queue")}
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                {getTranslation("স্বয়ংক্রিয়ভাবে সিরিয়াল অনুযায়ী অপেক্ষারত কলের তালিকা সাজানো হয়।", "Calls are ordered strictly first-in, first-out (FIFO).")}
              </p>
            </div>
          </div>
          <span className="bg-emerald-100 text-emerald-800 text-xs font-black px-3 py-1 rounded-full self-start sm:self-auto">
            {waitingCalls.length} {getTranslation("টি কল অপেক্ষারত", "in queue")}
          </span>
        </div>

        {waitingCalls.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2">
              <Phone className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-slate-600">
              {getTranslation("বর্তমানে কোনো অপেক্ষারত কল নেই।", "No callers in queue right now.")}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {getTranslation("গ্রাহক ফ্রি কল বাটন চাপলে এখানে সাথে সাথে কল রিং হবে।", "When a customer calls, it rings here with automatic queue assignment.")}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="pb-3 px-3">{getTranslation("কিউ পজিশন", "Position")}</th>
                  <th className="pb-3 px-3">{getTranslation("কলার / গ্রাহক", "Caller")}</th>
                  <th className="pb-3 px-3">{getTranslation("কল আইডি", "Call ID")}</th>
                  <th className="pb-3 px-3">{getTranslation("স্ট্যাটাস", "Status")}</th>
                  <th className="pb-3 px-3">{getTranslation("বরাদ্দকৃত প্রতিনিধি", "Assigned Agent")}</th>
                  <th className="pb-3 px-3 text-right">{getTranslation("অ্যাকশন", "Action")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {waitingCalls.map((call, index) => (
                  <tr key={call.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-3">
                      <span className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 font-black flex items-center justify-center text-xs">
                        #{index + 1}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-bold text-slate-800">
                      <div className="flex items-center space-x-2">
                        <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="leading-tight">{call.callerName}</p>
                          <span className="text-[10px] text-slate-400 font-normal">
                            {call.callerType === "guest" ? getTranslation("গেস্ট", "Guest") : getTranslation("ইউজার", "Customer")}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 font-mono font-bold text-slate-600 text-[11px]">
                      {call.callNumber || call.id.slice(0, 10)}
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2.5 py-0.5 rounded-md animate-pulse">
                        {call.status === "ringing" ? getTranslation("🔔 রিং হচ্ছে", "Ringing") : getTranslation("⏳ কিউতে অপেক্ষারত", "In Queue")}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-bold text-slate-700 text-xs">
                      {call.assignedAgentName || getTranslation("অটোমেটিক কিউ", "FIFO Auto Queue")}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleAcceptCall(call)}
                          className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold px-3.5 py-1.5 rounded-xl text-xs flex items-center space-x-1.5 shadow transition cursor-pointer"
                        >
                          <PhoneCall className="w-3.5 h-3.5" />
                          <span>{getTranslation("কল ধরুন", "Accept")}</span>
                        </button>
                        <button
                          onClick={() => handleRejectCall(call.id)}
                          className="bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold p-1.5 rounded-xl text-xs transition cursor-pointer"
                          title={getTranslation("প্রত্যাখ্যান করুন", "Reject")}
                        >
                          <PhoneOff className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 20 CALL CENTER AGENTS ROSTER GRID */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-sm sm:text-base">
                {getTranslation("কল সেন্টার ২০ প্রতিনিধি রোস্টার ও লাইভ স্ট্যাটাস", "20 Call Center Agent Desks Roster")}
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                {getTranslation("প্রতিনিধিদের লাইভ স্ট্যাটাস মনিটর ও পরিবর্তন করুন।", "Monitor desk activity, toggle statuses, or claim an active desk.")}
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-slate-500">
            {agents.length} / 20 {getTranslation("ডেস্ক কনফিগার করা", "desks")}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {agents.map((ag) => {
            const isMe = selectedAgentId === ag.id;
            const isAvailable = ag.status === "available";
            const isInCall = ag.status === "in_call";
            const isRinging = ag.status === "ringing";
            const isOffline = ag.status === "offline";

            return (
              <div 
                key={ag.id} 
                className={`rounded-2xl p-3.5 border transition-all flex flex-col justify-between ${
                  isMe 
                    ? "bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-400/30 shadow-md" 
                    : "bg-slate-50/70 border-slate-200 hover:border-slate-300"
                }`}
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase text-slate-400">
                      DESK #{ag.agentNumber.toString().padStart(2, "0")}
                    </span>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md flex items-center space-x-1 ${
                      isAvailable ? "bg-emerald-100 text-emerald-800" :
                      isInCall ? "bg-amber-100 text-amber-800 animate-pulse" :
                      isRinging ? "bg-teal-100 text-teal-800 animate-bounce" :
                      "bg-slate-200 text-slate-600"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        isAvailable ? "bg-emerald-500" : isInCall ? "bg-amber-500" : isRinging ? "bg-teal-500" : "bg-slate-400"
                      }`} />
                      <span>
                        {isAvailable ? getTranslation("ফ্রি", "Available") :
                         isInCall ? getTranslation("ব্যস্ত", "In Call") :
                         isRinging ? getTranslation("রিং হচ্ছে", "Ringing") :
                         getTranslation("অফলাইন", "Offline")}
                      </span>
                    </span>
                  </div>

                  {/* Agent Name */}
                  <h4 className="font-black text-slate-800 text-xs truncate">
                    {ag.nameBn}
                  </h4>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">
                    {ag.roleTitleBn}
                  </p>

                  {/* Active caller notice if in call */}
                  {isInCall && ag.activeCallerName && (
                    <div className="mt-2 bg-amber-500/10 border border-amber-500/30 rounded-lg p-1.5 text-[10px] text-amber-900 font-bold truncate">
                      📞 {ag.activeCallerName}
                    </div>
                  )}
                </div>

                {/* Desk Control Footer */}
                <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                  <span className="text-[10px] text-slate-400 font-bold">
                    {ag.totalCallsHandled || 0} {getTranslation("কল", "calls")}
                  </span>
                  
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleToggleAgentStatus(ag.id, ag.status)}
                      className={`text-[10px] font-extrabold px-2 py-1 rounded-lg transition cursor-pointer ${
                        isAvailable 
                          ? "bg-slate-200 hover:bg-slate-300 text-slate-700" 
                          : "bg-emerald-600 hover:bg-emerald-700 text-white"
                      }`}
                      title={isAvailable ? "Set Offline" : "Set Available"}
                    >
                      {isAvailable ? getTranslation("অফলাইন", "Offline") : getTranslation("এক্টিভ", "Active")}
                    </button>
                    
                    {!isMe && (
                      <button
                        onClick={() => setSelectedAgentId(ag.id)}
                        className="text-[10px] font-bold text-slate-600 hover:text-emerald-700 px-1.5 py-1 rounded cursor-pointer"
                        title="Take this desk"
                      >
                        {getTranslation("ডেস্ক ধরুন", "Claim")}
                      </button>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* CALL HISTORY & AUDIT LOGS */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200">
        
        {/* Search & Filter Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-sm sm:text-base">
                {getTranslation("ভয়েস কল রেকর্ড ও হিস্ট্রি লগ", "Voice Call History & Audit Logs")}
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                {callHistory.length} {getTranslation("টি সর্বমোট সম্পন্ন বা রেকর্ডকৃত কল", "total logged calls")}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={getTranslation("নাম, কল আইডি দিয়ে খুঁজুন...", "Search name, call ID...")}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 w-44"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="all">{getTranslation("সকল স্ট্যাটাস", "All Statuses")}</option>
              <option value="ended">{getTranslation("সম্পন্ন (Ended)", "Completed")}</option>
              <option value="rejected">{getTranslation("প্রত্যাখ্যাত (Rejected)", "Rejected")}</option>
              <option value="missed">{getTranslation("মিসড কল (Missed)", "Missed")}</option>
              <option value="cancelled">{getTranslation("বাতিলকৃত (Cancelled)", "Cancelled")}</option>
            </select>

            {/* Agent Filter */}
            <select
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="all">{getTranslation("সকল প্রতিনিধি", "All Agents")}</option>
              {agents.map((ag) => (
                <option key={ag.id} value={ag.id}>{ag.nameBn}</option>
              ))}
            </select>
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">
            {getTranslation("কোনো রেকর্ড পাওয়া যায়নি।", "No call history records found matching criteria.")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="pb-3 px-3">{getTranslation("কল আইডি", "Call ID")}</th>
                  <th className="pb-3 px-3">{getTranslation("কলার / গ্রাহক", "Caller")}</th>
                  <th className="pb-3 px-3">{getTranslation("প্রতিনিধি", "Agent")}</th>
                  <th className="pb-3 px-3">{getTranslation("স্ট্যাটাস", "Status")}</th>
                  <th className="pb-3 px-3">{getTranslation("স্থায়িত্ব (Duration)", "Duration")}</th>
                  <th className="pb-3 px-3">{getTranslation("নোট", "Notes")}</th>
                  <th className="pb-3 px-3">{getTranslation("তারিখ ও সময়", "Date & Time")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredHistory.map((log) => {
                  const dateStr = log.createdAt 
                    ? new Date(log.createdAt.seconds * 1000).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) 
                    : "N/A";
                  
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-3 font-mono font-bold text-slate-600 text-[11px]">
                        {log.callNumber || log.id.slice(0, 10)}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-800 flex items-center space-x-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[10px]">
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <span>{log.callerName}</span>
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-700">
                        {log.assignedAgentName || "N/A"}
                      </td>
                      <td className="py-3 px-3">
                        {(log.status === "ended" || log.status === "completed") && (
                          <span className="inline-flex items-center space-x-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>{getTranslation("সম্পন্ন", "Completed")}</span>
                          </span>
                        )}
                        {log.status === "rejected" && (
                          <span className="inline-flex items-center space-x-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md text-[10px] font-bold">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            <span>{getTranslation("প্রত্যাখ্যাত", "Rejected")}</span>
                          </span>
                        )}
                        {log.status === "missed" && (
                          <span className="inline-flex items-center space-x-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md text-[10px] font-bold">
                            <AlertCircle className="w-3 h-3 text-amber-600" />
                            <span>{getTranslation("মিসড কল", "Missed")}</span>
                          </span>
                        )}
                        {log.status === "cancelled" && (
                          <span className="inline-flex items-center space-x-1 text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md text-[10px] font-bold">
                            <X className="w-3 h-3 text-slate-500" />
                            <span>{getTranslation("বাতিলকৃত", "Cancelled")}</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-800">
                        {formatTime(log.durationSeconds || 0)}
                      </td>
                      <td className="py-3 px-3 text-slate-500 text-[11px] max-w-xs truncate">
                        {log.notes || "-"}
                      </td>
                      <td className="py-3 px-3 text-slate-400 text-[11px]">
                        {dateStr}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
