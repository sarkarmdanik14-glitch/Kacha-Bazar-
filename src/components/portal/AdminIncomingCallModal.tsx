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
  Mic, 
  MicOff, 
  Headphones, 
  Sparkles, 
  X, 
  Volume2 
} from "lucide-react";
import { RTC_CONFIG, callAudioSynth, VoiceCallSession } from "../../lib/webrtcCall";
import { atomicallyAcceptCall } from "../../lib/callCenterManager";

interface AdminIncomingCallModalProps {
  lang: "bn" | "en";
  triggerToast?: (bn: string, en: string) => void;
  onNavigateToVoiceTab?: () => void;
}

export default function AdminIncomingCallModal({
  lang,
  triggerToast,
  onNavigateToVoiceTab
}: AdminIncomingCallModalProps) {
  const [incomingCall, setIncomingCall] = useState<VoiceCallSession | null>(null);
  const [callStatus, setCallStatus] = useState<"idle" | "ringing" | "connecting" | "connected" | "ended">("idle");
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

  // 1. Listen for any incoming call with status 'waiting' or 'ringing' or 'calling'
  useEffect(() => {
    const q = query(
      collection(db, "voice_calls"),
      where("status", "in", ["waiting", "calling", "ringing"]),
      orderBy("createdAt", "desc"),
      limit(1)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        const data = { id: docSnap.id, ...docSnap.data() } as VoiceCallSession;
        
        if (callStatus === "idle") {
          setIncomingCall(data);
          setCallStatus("ringing");
          callAudioSynth.playRingTone();
        }
      } else {
        if (callStatus === "ringing") {
          callAudioSynth.stopSounds();
          setIncomingCall(null);
          setCallStatus("idle");
        }
      }
    }, (err) => {
      console.warn("Global incoming call notice:", err.message);
    });

    return () => {
      unsub();
      callAudioSynth.stopSounds();
    };
  }, [callStatus]);

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
    setIncomingCall(null);
  };

  // Accept Call
  const handleAccept = async () => {
    if (!incomingCall) return;

    try {
      callAudioSynth.stopSounds();
      setCallStatus("connecting");
      setCallDuration(0);
      durationRef.current = 0;

      // 1. Atomic lock verification
      const lockResult = await atomicallyAcceptCall(incomingCall.id, "agent_01", "সেন্ট্রাল এডমিন ডেস্ক");
      if (!lockResult.success) {
        alert(lockResult.message || "কলটি গ্রহণ করা সম্ভব হয়নি।");
        cleanupCall();
        return;
      }

      // 2. Get Admin Microphone
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

      // Handle remote audio
      pc.ontrack = (event) => {
        if (event.streams && event.streams[0] && remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = event.streams[0];
          remoteAudioRef.current.play().catch(() => {});
        }
      };

      // Collect ICE candidates from Admin (callee)
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          addDoc(collection(db, "voice_calls", incomingCall.id, "calleeCandidates"), event.candidate.toJSON()).catch(() => {});
        }
      };

      // 4. Set remote description
      const callDocRef = doc(db, "voice_calls", incomingCall.id);
      const callSnap = await getDoc(callDocRef);
      const callData = callSnap.data();

      if (!callData || !callData.offer) {
        throw new Error("কলের ডেটা পাওয়া যায়নি।");
      }

      await pc.setRemoteDescription(new RTCSessionDescription(callData.offer));

      // 5. Create Answer
      const answerDescription = await pc.createAnswer();
      await pc.setLocalDescription(answerDescription);

      const answer = {
        type: answerDescription.type,
        sdp: answerDescription.sdp
      };

      // 6. Update Firestore
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

      // 7. Listen for caller candidates
      const callerCandidatesCol = collection(db, "voice_calls", incomingCall.id, "callerCandidates");
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
          cleanupCall();
        }
      });
      unsubscribeCallRef.current = unsubCall;

    } catch (err: any) {
      console.error("Accept call global notice:", err);
      callAudioSynth.stopSounds();
      alert(err.message || "Could not accept call. Please verify mic access.");
      cleanupCall();
    }
  };

  // Reject Call
  const handleReject = async () => {
    callAudioSynth.playDisconnectTone();
    if (incomingCall) {
      try {
        await updateDoc(doc(db, "voice_calls", incomingCall.id), {
          status: "rejected",
          endedAt: serverTimestamp(),
          endedBy: "admin"
        });
      } catch (err) {
        console.warn("Reject notice:", err);
      }
    }
    cleanupCall();
  };

  // End Active Call
  const handleEndCall = async () => {
    callAudioSynth.playDisconnectTone();
    if (incomingCall) {
      try {
        await updateDoc(doc(db, "voice_calls", incomingCall.id), {
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

  if (callStatus === "idle" || !incomingCall) return null;

  return (
    <>
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      {/* Floating Call Notification / Active Bar */}
      <div className="fixed top-4 right-4 z-[999] max-w-md w-[calc(100vw-2rem)] animate-bounce-short">
        <div className="bg-slate-900 text-white rounded-3xl p-5 shadow-2xl border-2 border-emerald-500 flex flex-col gap-3 relative overflow-hidden backdrop-blur-lg">
          
          {/* Top Pill */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span>
                {callStatus === "connected" 
                  ? getTranslation("ভয়েস কল চলছে", "Voice Call in Progress") 
                  : getTranslation("ইনকামিং কাস্টমার কল!", "Incoming Customer Call!")}
              </span>
            </div>
            {callStatus === "connected" && (
              <span className="bg-black/50 text-emerald-300 font-mono text-xs font-bold px-2 py-0.5 rounded-md border border-white/10">
                ⏱ {formatTime(callDuration)}
              </span>
            )}
          </div>

          {/* Caller Details */}
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 border border-emerald-400 flex items-center justify-center text-white shrink-0 shadow-lg">
              {callStatus === "connected" ? (
                <Headphones className="w-6 h-6 animate-pulse" />
              ) : (
                <Phone className="w-6 h-6 animate-bounce" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-black text-white text-sm sm:text-base truncate">
                {incomingCall.callerName}
              </h4>
              <p className="text-[11px] text-slate-400 font-medium truncate">
                {incomingCall.callerType === "guest" 
                  ? getTranslation("গেস্ট ভিজিটর কল", "Guest Visitor Web Call") 
                  : getTranslation("রেজিস্টার্ড গ্রাহক", "Registered Customer")}
              </p>
            </div>
          </div>

          {/* Connected audio visualizer */}
          {callStatus === "connected" && (
            <div className="flex items-center justify-center space-x-1 h-4">
              {[40, 80, 50, 90, 60, 85, 45].map((h, i) => (
                <span
                  key={i}
                  className="w-1 bg-emerald-400 rounded-full animate-pulse"
                  style={{ height: `${h}%`, animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-2 pt-1 border-t border-slate-800">
            {callStatus === "ringing" && (
              <>
                <button
                  onClick={handleReject}
                  className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-rose-400 font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer"
                >
                  <PhoneOff className="w-3.5 h-3.5" />
                  <span>{getTranslation("প্রত্যাখ্যান", "Reject")}</span>
                </button>
                <button
                  onClick={handleAccept}
                  className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black px-5 py-2 rounded-xl text-xs shadow-lg shadow-emerald-950 transition cursor-pointer"
                >
                  <PhoneCall className="w-4 h-4 animate-bounce" />
                  <span>{getTranslation("কল রিসিভ করুন", "Accept Call")}</span>
                </button>
              </>
            )}

            {callStatus === "connected" && (
              <>
                <button
                  onClick={handleToggleMute}
                  className={`p-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    isMuted ? "bg-amber-500 text-slate-950 font-bold" : "bg-slate-800 text-white hover:bg-slate-700"
                  }`}
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
                <button
                  onClick={handleEndCall}
                  className="flex items-center space-x-1.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black px-4 py-2 rounded-xl text-xs shadow-lg shadow-rose-950 transition cursor-pointer"
                >
                  <PhoneOff className="w-4 h-4" />
                  <span>{getTranslation("কল কাটুন", "End Call")}</span>
                </button>
              </>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
