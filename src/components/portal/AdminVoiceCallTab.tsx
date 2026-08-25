import React, { useState, useEffect, useRef } from "react";
import { 
  db, 
  collection, 
  doc, 
  getDoc, 
  updateDoc, 
  addDoc, 
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
  Trash2
} from "lucide-react";
import { RTC_CONFIG, callAudioSynth, VoiceCallSession } from "../../lib/webrtcCall";

interface AdminVoiceCallTabProps {
  lang: "bn" | "en";
  triggerToast?: (bn: string, en: string) => void;
}

export default function AdminVoiceCallTab({ lang, triggerToast }: AdminVoiceCallTabProps) {
  const [activeCalls, setActiveCalls] = useState<VoiceCallSession[]>([]);
  const [callHistory, setCallHistory] = useState<VoiceCallSession[]>([]);
  const [currentCall, setCurrentCall] = useState<VoiceCallSession | null>(null);
  const [callStatus, setCallStatus] = useState<"idle" | "connecting" | "connected" | "ended">("idle");
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [callDuration, setCallDuration] = useState<number>(0);

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

  // 1. Listen for active incoming/ringing calls
  useEffect(() => {
    const q = query(
      collection(db, "voice_calls"),
      where("status", "in", ["calling", "ringing", "connected"]),
      orderBy("createdAt", "desc"),
      limit(10)
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

  // 2. Listen for call history / logs
  useEffect(() => {
    const q = query(
      collection(db, "voice_calls"),
      where("status", "in", ["ended", "rejected", "missed"]),
      orderBy("createdAt", "desc"),
      limit(50)
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

  // Cleanup WebRTC state
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
  };

  // Accept incoming call
  const handleAcceptCall = async (call: VoiceCallSession) => {
    try {
      callAudioSynth.stopSounds();
      setCurrentCall(call);
      setCallStatus("connecting");
      setCallDuration(0);
      durationRef.current = 0;

      // 1. Get Admin Microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { 
          echoCancellation: true, 
          noiseSuppression: true, 
          autoGainControl: true 
        },
        video: false
      });
      localStreamRef.current = stream;

      // 2. Setup RTCPeerConnection
      const pc = new RTCPeerConnection(RTC_CONFIG);
      pcRef.current = pc;

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Handle remote customer audio
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

      // 3. Set remote description from caller's offer
      const callDocRef = doc(db, "voice_calls", call.id);
      const callSnap = await getDoc(callDocRef);
      const callData = callSnap.data();

      if (!callData || !callData.offer) {
        throw new Error("কলের তথ্য পাওয়া যায়নি বা অফার পাওয়া যায়নি।");
      }

      await pc.setRemoteDescription(new RTCSessionDescription(callData.offer));

      // 4. Create Answer
      const answerDescription = await pc.createAnswer();
      await pc.setLocalDescription(answerDescription);

      const answer = {
        type: answerDescription.type,
        sdp: answerDescription.sdp
      };

      // 5. Update Firestore with Answer & Connected status
      await updateDoc(callDocRef, {
        answer: answer,
        status: "connected",
        connectedAt: serverTimestamp()
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

      // 6. Listen for caller candidates
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

      // 7. Listen for Call document updates (e.g. caller hangs up)
      const unsubCall = onSnapshot(callDocRef, (snap) => {
        const data = snap.data();
        if (!data) return;
        if (data.status === "ended" && callStatus === "connected") {
          callAudioSynth.playDisconnectTone();
          if (triggerToast) triggerToast("গ্রাহক কলটি শেষ করেছেন।", "Customer ended the call.");
          cleanupCall();
        }
      });
      unsubscribeCallRef.current = unsubCall;

    } catch (err: any) {
      console.error("Accept call error:", err);
      callAudioSynth.stopSounds();
      alert(err.message || "Could not accept call. Please check microphone access.");
      cleanupCall();
    }
  };

  // Reject incoming call
  const handleRejectCall = async (callId: string) => {
    callAudioSynth.playDisconnectTone();
    try {
      await updateDoc(doc(db, "voice_calls", callId), {
        status: "rejected",
        endedAt: serverTimestamp(),
        endedBy: "admin"
      });
      if (triggerToast) triggerToast("কল প্রত্যাখ্যান করা হয়েছে।", "Call rejected.");
    } catch (err) {
      console.warn("Reject call notice:", err);
    }
  };

  // End active call
  const handleEndCall = async () => {
    callAudioSynth.playDisconnectTone();
    if (currentCall) {
      try {
        await updateDoc(doc(db, "voice_calls", currentCall.id), {
          status: "ended",
          endedAt: serverTimestamp(),
          durationSeconds: durationRef.current,
          endedBy: "admin"
        });
      } catch (err) {
        console.warn("End call notice:", err);
      }
    }
    cleanupCall();
    if (triggerToast) triggerToast("কল সমাপ্ত হয়েছে।", "Call ended.");
  };

  // Toggle Admin Mute
  const handleToggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Remote Audio output */}
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      {/* Header Overview Card */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center space-x-1.5 bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full text-xs font-bold mb-2 border border-emerald-500/30">
            <PhoneCall className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>{getTranslation("সরাসরি ওয়েব ভয়েস কল সাপোর্ট", "Direct Web Voice Call Support")}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            {getTranslation("গ্রাহক ভয়েস কল হেল্পডেস্ক", "Customer Voice Calling Desk")}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mt-1">
            {getTranslation(
              "গ্রাহকরা ওয়েবসাইট থেকে সরাসরি ফ্রি কল করতে পারেন। মাইক্রোফোন ব্যবহার করে ব্রাউজার থেকেই কথা বলুন।",
              "Customers can initiate free web calls directly. Accept calls and speak directly through your browser microphone."
            )}
          </p>
        </div>

        <div className="flex items-center space-x-3 relative z-10">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/10 text-center min-w-[110px]">
            <p className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider">
              {getTranslation("চলমান কল", "Active Calls")}
            </p>
            <p className="text-xl font-black mt-0.5">{activeCalls.length}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/10 text-center min-w-[110px]">
            <p className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">
              {getTranslation("মোট কল লগ", "Total Logs")}
            </p>
            <p className="text-xl font-black mt-0.5">{callHistory.length}</p>
          </div>
        </div>
      </div>

      {/* ACTIVE CALL BAR (When Connected / In-Call) */}
      {currentCall && callStatus === "connected" && (
        <div className="bg-emerald-900 border-2 border-emerald-500 text-white rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4 animate-scale-up">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-600 border border-emerald-400 flex items-center justify-center shadow-inner shrink-0">
              <Headphones className="w-7 h-7 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <h4 className="text-base font-black text-white">{currentCall.callerName}</h4>
                {currentCall.callerType === "guest" ? (
                  <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-md border border-amber-500/30">
                    {getTranslation("গেস্ট", "Guest")}
                  </span>
                ) : (
                  <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-md border border-emerald-500/30">
                    {getTranslation("রেজিস্টার্ড ইউজার", "Registered User")}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-3 mt-1">
                <span className="bg-black/40 text-emerald-300 font-mono text-xs font-black px-2.5 py-0.5 rounded-md border border-white/10">
                  ⏱ {formatTime(callDuration)}
                </span>
                <span className="text-xs text-slate-300">
                  {getTranslation("কথা চলছে...", "Connected & Speaking...")}
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-3">
            <button
              onClick={handleToggleMute}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                isMuted 
                  ? "bg-amber-500 text-slate-950 hover:bg-amber-400" 
                  : "bg-emerald-800 text-white hover:bg-emerald-700 border border-emerald-600"
              }`}
            >
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              <span>{isMuted ? getTranslation("আনমিউট", "Unmute") : getTranslation("মিউট", "Mute")}</span>
            </button>

            <button
              onClick={handleEndCall}
              className="flex items-center space-x-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black px-5 py-2.5 rounded-xl shadow-md transition cursor-pointer"
            >
              <PhoneOff className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wider">{getTranslation("কল শেষ করুন", "End Call")}</span>
            </button>
          </div>
        </div>
      )}

      {/* INCOMING CALL QUEUE SECTION */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <PhoneIncoming className="w-5 h-5 text-emerald-600" />
            <h3 className="font-black text-slate-800 text-sm sm:text-base">
              {getTranslation("আগত কল কিউ ও অপেক্ষারত তালিকা", "Incoming Call Queue")}
            </h3>
          </div>
          <span className="bg-emerald-100 text-emerald-800 text-xs font-black px-2.5 py-1 rounded-full">
            {activeCalls.filter(c => c.status === "calling" || c.status === "ringing").length} {getTranslation("টি কল অপেক্ষারত", "Calls waiting")}
          </span>
        </div>

        {activeCalls.filter(c => c.status === "calling" || c.status === "ringing").length === 0 ? (
          <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2">
              <Phone className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-slate-600">
              {getTranslation("বর্তমানে কোনো অপেক্ষারত কল নেই।", "No incoming calls in queue right now.")}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {getTranslation("গ্রাহক কল করলে এখানে স্বয়ংক্রিয়ভাবে নোটিফিকেশন আসবে।", "When a customer calls, it will ring and appear here instantly.")}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeCalls
              .filter(c => c.status === "calling" || c.status === "ringing")
              .map((call) => (
                <div 
                  key={call.id} 
                  className="bg-emerald-50/70 border-2 border-emerald-500/50 rounded-2xl p-4 flex items-center justify-between shadow-sm animate-pulse"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <Phone className="w-5 h-5 animate-bounce" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-black text-slate-800 text-xs sm:text-sm truncate">
                        {call.callerName}
                      </h4>
                      <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                        {call.callerType === "guest" ? getTranslation("গেস্ট ভিজিটর", "Guest Visitor") : getTranslation("নিবন্ধিত ক্রেতা", "Registered Customer")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={() => handleAcceptCall(call)}
                      className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold px-3.5 py-2 rounded-xl text-xs flex items-center space-x-1.5 shadow cursor-pointer"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      <span>{getTranslation("কল ধরুন", "Accept")}</span>
                    </button>
                    <button
                      onClick={() => handleRejectCall(call.id)}
                      className="bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold p-2 rounded-xl text-xs transition cursor-pointer"
                      title={getTranslation("প্রত্যাখ্যান করুন", "Reject")}
                    >
                      <PhoneOff className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* CALL HISTORY / LOGS SECTION */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <History className="w-5 h-5 text-slate-700" />
            <h3 className="font-black text-slate-800 text-sm sm:text-base">
              {getTranslation("ভয়েস কল হিস্ট্রি ও রেকর্ড", "Voice Call Logs & History")}
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-bold">
            {callHistory.length} {getTranslation("টি সম্পন্ন/রেকর্ডকৃত কল", "records")}
          </span>
        </div>

        {callHistory.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">
            {getTranslation("এখনও কোনো পূর্ববর্তী কলের রেকর্ড নেই।", "No call history records found.")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="pb-3 px-3">{getTranslation("কলার / গ্রাহক", "Caller")}</th>
                  <th className="pb-3 px-3">{getTranslation("ধরন", "Type")}</th>
                  <th className="pb-3 px-3">{getTranslation("স্ট্যাটাস", "Status")}</th>
                  <th className="pb-3 px-3">{getTranslation("স্থায়িত্ব (Duration)", "Duration")}</th>
                  <th className="pb-3 px-3">{getTranslation("তারিখ ও সময়", "Date & Time")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {callHistory.map((log) => {
                  const dateStr = log.createdAt 
                    ? new Date(log.createdAt.seconds * 1000).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) 
                    : "N/A";
                  
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-3 font-bold text-slate-800 flex items-center space-x-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[10px]">
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <span>{log.callerName}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          log.callerType === "customer" 
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                            : "bg-slate-100 text-slate-600"
                        }`}>
                          {log.callerType === "customer" ? getTranslation("ইউজার", "User") : getTranslation("গেস্ট", "Guest")}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {log.status === "ended" && (
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
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-800">
                        {formatTime(log.durationSeconds || 0)}
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
