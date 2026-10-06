import React, { useState, useEffect, useRef } from "react";
import { 
  db, 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  onSnapshot, 
  serverTimestamp, 
  query,
  where,
  orderBy,
  auth 
} from "../lib/firebase";
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Volume2, 
  X, 
  Sparkles, 
  ShieldCheck, 
  User, 
  Loader2, 
  AlertCircle,
  Headphones,
  Clock,
  Users
} from "lucide-react";
import { RTC_CONFIG, callAudioSynth, banglaCallWelcome, callBgMusic, VoiceCallSession } from "../lib/webrtcCall";
import { tryImmediateAgentRouting } from "../lib/callCenterManager";
import { createTranslator, formatTime, toBnNum } from "../lib/formatUtils";

interface CustomerVoiceCallModalProps {
  lang: "bn" | "en";
  isOpen: boolean;
  onClose: () => void;
}

export default function CustomerVoiceCallModal({
  lang,
  isOpen,
  onClose
}: CustomerVoiceCallModalProps) {
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [callStatus, setCallStatus] = useState<"initiating" | "waiting" | "ringing" | "connected" | "ended" | "rejected" | "cancelled" | "error">("initiating");
  const [isWelcomeSpeaking, setIsWelcomeSpeaking] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isPermissionDenied, setIsPermissionDenied] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [callDuration, setCallDuration] = useState<number>(0);
  const [callId, setCallId] = useState<string | null>(null);
  const [queuePosition, setQueuePosition] = useState<number>(1);
  const [assignedAgentName, setAssignedAgentName] = useState<string>("");

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<any>(null);
  const durationRef = useRef<number>(0);
  const unsubscribeCallRef = useRef<(() => void) | null>(null);
  const unsubscribeQueueRef = useRef<(() => void) | null>(null);
  const unsubscribeCandidatesRef = useRef<(() => void) | null>(null);

  const getTranslation = createTranslator(lang);

  // Monitor Auth state
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      setCurrentUser(user || null);
    });
    return () => unsub();
  }, []);

  const toBanglaDigits = (num: number) => toBnNum(num);

  // Cleanup WebRTC, Speech & Sounds
  const cleanupCall = () => {
    setIsWelcomeSpeaking(false);
    callAudioSynth.stopSounds();
    banglaCallWelcome.stop();
    callBgMusic.stop();

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (unsubscribeCallRef.current) {
      unsubscribeCallRef.current();
      unsubscribeCallRef.current = null;
    }

    if (unsubscribeQueueRef.current) {
      unsubscribeQueueRef.current();
      unsubscribeQueueRef.current = null;
    }

    if (unsubscribeCandidatesRef.current) {
      unsubscribeCandidatesRef.current();
      unsubscribeCandidatesRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
  };

  // Start Call Flow
  const startCall = async () => {
    try {
      cleanupCall();
      setCallStatus("initiating");
      setErrorMessage("");
      setIsPermissionDenied(false);
      setCallDuration(0);
      durationRef.current = 0;
      setAssignedAgentName("");
      setQueuePosition(1);

      // Start Bangla automated voice + soft ambient background music immediately inside user gesture
      setIsWelcomeSpeaking(true);
      banglaCallWelcome.playWelcomeGreeting(() => {
        setIsWelcomeSpeaking(false);
      });

      // 1. Acquire local microphone stream directly via native browser dialog
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(getTranslation("আপনার ব্রাউজারে মাইক্রোফোন সাপোর্ট নেই।", "Microphone not supported on this browser."));
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          audio: { 
            echoCancellation: true, 
            noiseSuppression: true, 
            autoGainControl: true 
          }, 
          video: false 
        });
      } catch (micErr: any) {
        console.warn("Microphone access pending/denied:", micErr);
        setIsPermissionDenied(true);
        setCallStatus("error");
        return;
      }
      localStreamRef.current = stream;

      // 2. Initialize RTCPeerConnection
      const pc = new RTCPeerConnection(RTC_CONFIG);
      pcRef.current = pc;

      // Add local audio tracks
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Handle incoming remote audio
      pc.ontrack = (event) => {
        if (event.streams && event.streams[0] && remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = event.streams[0];
          remoteAudioRef.current.play().catch(() => {});
        }
      };

      // 3. Determine Caller Identity
      let guestId = "";
      try {
        guestId = localStorage.getItem("kachabazar_guest_chat_id") || "";
        if (!guestId) {
          guestId = "guest_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 6);
          localStorage.setItem("kachabazar_guest_chat_id", guestId);
        }
      } catch {
        guestId = "guest_" + Date.now().toString(36);
      }

      let guestName = "";
      try {
        guestName = localStorage.getItem("kachabazar_guest_name") || "";
      } catch {}

      const callerId = currentUser ? currentUser.uid : guestId;
      const callerName = currentUser
        ? (currentUser.displayName || currentUser.email?.split("@")[0] || "সম্মানিত ক্রেতা")
        : (guestName.trim() || `অতিথি ক্রেতা #${guestId.slice(-4)}`);
      const callerType = currentUser ? "customer" : "guest";

      // 4. Generate unique Call ID (e.g. CALL-2026-XXXX)
      const callDocRef = doc(collection(db, "voice_calls"));
      const newCallId = callDocRef.id;
      const callNumber = `CALL-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;
      setCallId(newCallId);

      // Collect ICE candidates from caller
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          addDoc(collection(db, "voice_calls", newCallId, "callerCandidates"), event.candidate.toJSON()).catch(() => {});
        }
      };

      // 5. Create WebRTC Offer
      const offerDescription = await pc.createOffer();
      await pc.setLocalDescription(offerDescription);

      const offer = {
        sdp: offerDescription.sdp,
        type: offerDescription.type
      };

      // Save initial call record as 'waiting' in FIFO queue
      await setDoc(callDocRef, {
        id: newCallId,
        callNumber: callNumber,
        callerId: callerId,
        callerName: callerName,
        callerType: callerType,
        status: "waiting", // Initially in waiting queue
        offer: offer,
        createdAt: serverTimestamp(),
        durationSeconds: 0
      });

      setCallStatus("waiting");

      // Check if an agent is immediately available to route without unnecessary queue delay
      tryImmediateAgentRouting(newCallId, callerName).then((routed) => {
        if (routed) {
          console.log("Call fast-routed immediately to available agent desk");
        }
      }).catch((err) => {
        console.warn("Immediate routing check notice:", err);
      });

      // 6. Listen for FIFO Queue Position
      const queueQuery = query(
        collection(db, "voice_calls"),
        where("status", "==", "waiting"),
        orderBy("createdAt", "asc")
      );

      const unsubQueue = onSnapshot(queueQuery, (snapshot) => {
        let pos = 1;
        let found = false;
        snapshot.docs.forEach((docSnap, index) => {
          if (docSnap.id === newCallId) {
            pos = index + 1;
            found = true;
          }
        });
        if (found) {
          setQueuePosition(pos);
        }
      }, (err) => {
        console.warn("Queue position stream notice:", err);
      });
      unsubscribeQueueRef.current = unsubQueue;

      // 7. Listen to Firestore Call Document updates
      const unsubCall = onSnapshot(callDocRef, (snapshot) => {
        const data = snapshot.data();
        if (!data) return;

        if (data.assignedAgentName) {
          setAssignedAgentName(data.assignedAgentName);
        }

        // If assigned to an agent and ringing (do not cut off Bangla welcome speech or play harsh beep)
        if (data.status === "ringing") {
          setCallStatus("ringing");
        }

        // If connected / in call (Agent accepted the call)
        if (data.status === "connected" || data.status === "in_call") {
          if (data.answer && (!pc.currentRemoteDescription || pc.currentRemoteDescription.sdp !== data.answer.sdp)) {
            const answerDescription = new RTCSessionDescription(data.answer);
            pc.setRemoteDescription(answerDescription).then(() => {
              setCallStatus("connected");
              setIsWelcomeSpeaking(false);
              banglaCallWelcome.stop();
              callBgMusic.stop();
              callAudioSynth.stopSounds();
              callAudioSynth.playConnectChime();

              // Start live duration timer
              if (!timerRef.current) {
                timerRef.current = setInterval(() => {
                  durationRef.current += 1;
                  setCallDuration(durationRef.current);
                }, 1000);
              }
            }).catch((err) => {
              console.warn("Set remote description notice:", err);
            });
          }
        }

        if (data.status === "rejected") {
          setIsWelcomeSpeaking(false);
          banglaCallWelcome.stop();
          callAudioSynth.playDisconnectTone();
          setCallStatus("rejected");
          cleanupCall();
        }

        if (data.status === "ended") {
          setIsWelcomeSpeaking(false);
          banglaCallWelcome.stop();
          callAudioSynth.playDisconnectTone();
          setCallStatus("ended");
          cleanupCall();
        }

        if (data.status === "cancelled") {
          setIsWelcomeSpeaking(false);
          banglaCallWelcome.stop();
          callAudioSynth.stopSounds();
          setCallStatus("cancelled");
          cleanupCall();
        }
      });
      unsubscribeCallRef.current = unsubCall;

      // 8. Listen for Remote ICE candidates from callee agent
      const calleeCandidatesCol = collection(db, "voice_calls", newCallId, "calleeCandidates");
      const unsubCandidates = onSnapshot(calleeCandidatesCol, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const candidate = new RTCIceCandidate(change.doc.data());
            pc.addIceCandidate(candidate).catch(() => {});
          }
        });
      });
      unsubscribeCandidatesRef.current = unsubCandidates;

    } catch (err: any) {
      console.warn("Call initiation notice:", err?.message || err);
      cleanupCall();
      setCallStatus("error");
      setErrorMessage(err?.message || getTranslation("কল শুরু করতে সমস্যা হয়েছে। দয়া করে মাইক্রোফোনের অনুমতি দিন।", "Could not start call. Please grant microphone access."));
    }
  };

  // Hang Up / Cancel Call
  const handleEndOrCancelCall = async () => {
    banglaCallWelcome.stop();
    callAudioSynth.playDisconnectTone();

    if (callId) {
      try {
        const isLive = callStatus === "connected";
        await updateDoc(doc(db, "voice_calls", callId), {
          status: isLive ? "ended" : "cancelled",
          endedAt: serverTimestamp(),
          durationSeconds: durationRef.current,
          endedBy: "caller"
        });
      } catch (err) {
        console.warn("End/Cancel call notice:", err);
      }
    }

    setCallStatus(callStatus === "connected" ? "ended" : "cancelled");
    cleanupCall();
    setTimeout(() => {
      onClose();
    }, 400);
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

  // Auto-start call immediately when modal opens
  useEffect(() => {
    if (isOpen) {
      startCall();
    } else {
      cleanupCall();
      setErrorMessage("");
      setIsPermissionDenied(false);
    }
    return () => {
      cleanupCall();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fade-in">
      {/* Hidden Remote Audio Element for WebRTC Live Stream */}
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      {/* Main Clean Call Interface */}
      <div className="bg-slate-900 text-white w-full max-w-xs sm:max-w-sm rounded-[32px] p-6 sm:p-7 shadow-2xl border border-slate-800/90 flex flex-col items-center text-center relative overflow-hidden animate-scale-up">
        
        {/* Subtle Ambient Glow */}
        <div className={`absolute -top-24 left-1/2 -translate-x-1/2 w-60 h-60 rounded-full blur-3xl pointer-events-none transition-all duration-700 ${
          callStatus === "connected" 
            ? "bg-emerald-500/25" 
            : callStatus === "rejected" || callStatus === "error"
            ? "bg-rose-500/20"
            : "bg-teal-500/20 animate-pulse"
        }`} />

        {/* Close Button in top corner */}
        <button 
          onClick={handleEndOrCancelCall}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/80 transition cursor-pointer"
          title={getTranslation("বন্ধ করুন", "Close")}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top Clean Header */}
        <div className="mb-2">
          <h3 className="text-2xl sm:text-3xl font-black text-white tracking-wide">
            {callStatus === "connected" 
              ? getTranslation("কথা চলছে...", "Connected...")
              : callStatus === "ended" || callStatus === "rejected" || callStatus === "cancelled"
              ? getTranslation("কল সমাপ্ত", "Call Ended")
              : getTranslation("কলিং...", "Calling...")}
          </h3>
          <p className="text-xs text-emerald-400 font-medium mt-1">
            {callStatus === "connected"
              ? (assignedAgentName ? `${assignedAgentName}` : getTranslation("প্রতিনিধি যুক্ত আছেন", "Representative Connected"))
              : callStatus === "ended"
              ? getTranslation(`মোট সময়: ${formatTime(callDuration)}`, `Duration: ${formatTime(callDuration)}`)
              : getTranslation("কাঁচা বাজার কাস্টমার সাপোর্ট", "Kacha Bazar Customer Support")}
          </p>
        </div>

        {callStatus === "ended" || callStatus === "rejected" || callStatus === "cancelled" ? (
          /* Ended State */
          <div className="w-full space-y-4 px-2 py-4 mt-2">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto border-2 ${
              callStatus === "ended" 
                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400" 
                : "bg-rose-500/20 border-rose-500/40 text-rose-400"
            }`}>
              {callStatus === "ended" ? <Phone className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={startCall}
                className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-2xl transition shadow cursor-pointer flex items-center justify-center gap-1.5 active:scale-98"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>{getTranslation("পুনরায় কল করুন", "Call Again")}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-2xl transition cursor-pointer flex items-center justify-center gap-1 border border-slate-700"
              >
                <span>{getTranslation("বন্ধ করুন", "Close")}</span>
              </button>
            </div>
          </div>
        ) : (
          /* Active Call / Calling / Waiting State */
          <>
            {/* Center Animated Calling Visual */}
            <div className="relative mt-4 mb-4 flex items-center justify-center">
              {/* Animated Pulsing Concentric Rings while calling / waiting */}
              {callStatus !== "connected" && (
                <>
                  <div className="absolute w-32 h-32 rounded-full border border-emerald-500/20 animate-ping" style={{ animationDuration: "2s" }} />
                  <div className="absolute w-28 h-28 rounded-full border border-teal-400/30 animate-pulse" style={{ animationDuration: "1.5s" }} />
                </>
              )}

              {callStatus === "connected" && (
                <div className="absolute w-28 h-28 rounded-full border-2 border-emerald-400/40 animate-pulse" />
              )}

              {/* Central Call Icon Bubble */}
              <div className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl border-2 transition-all duration-500 z-10 ${
                callStatus === "connected"
                  ? "bg-emerald-600 border-emerald-400 text-white scale-105"
                  : "bg-gradient-to-br from-emerald-600 to-teal-700 border-emerald-400/40 text-white shadow-emerald-950/50"
              }`}>
                {callStatus === "connected" ? (
                  <Headphones className="w-9 h-9 animate-pulse" />
                ) : (
                  <Phone className="w-9 h-9 animate-bounce" />
                )}
              </div>
            </div>

            {/* If microphone permission is needed, show only a small clean button */}
            {callStatus === "error" && (
              <div className="mb-3 flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  onClick={startCall}
                  className="py-2 px-5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold rounded-full shadow-lg flex items-center justify-center gap-1.5 transition cursor-pointer border border-emerald-400"
                >
                  <Mic className="w-3.5 h-3.5 animate-pulse" />
                  <span>{getTranslation("মাইক্রোফোন চালু করুন", "Enable Microphone")}</span>
                </button>
                {isPermissionDenied && (
                  <span className="text-[11px] text-amber-300/90 font-medium">
                    {getTranslation("ব্রাউজারের লক (🔒) আইকন থেকে 'Allow' করুন", "Click lock (🔒) icon to Allow")}
                  </span>
                )}
              </div>
            )}

            {/* Timer (When Connected) or Dynamic Sound Wave Visualizer */}
            <div className="mb-6 w-full flex flex-col items-center justify-center">
              {callStatus === "connected" ? (
                <div className="space-y-3">
                  <span className="inline-block bg-emerald-500/20 text-emerald-300 font-mono text-base font-black px-4 py-1.5 rounded-full border border-emerald-500/30 tracking-wider">
                    {formatTime(callDuration)}
                  </span>

                  {/* Dynamic Sound Wave Indicator */}
                  <div className="flex items-center justify-center space-x-1.5 h-6">
                    {[35, 75, 45, 90, 60, 85, 40, 70, 50].map((h, i) => (
                      <span
                        key={i}
                        className="w-1 bg-emerald-400 rounded-full animate-pulse"
                        style={{
                          height: `${h}%`,
                          animationDelay: `${i * 0.08}s`,
                          animationDuration: "0.7s"
                        }}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                /* Gentle sound wave visualizer while calling */
                <div className="flex items-center justify-center space-x-1.5 h-6">
                  {[30, 65, 45, 85, 55, 75, 40, 80, 50].map((h, i) => (
                    <span
                      key={i}
                      className="w-1 bg-emerald-400/80 rounded-full animate-pulse"
                      style={{
                        height: `${h}%`,
                        animationDelay: `${i * 0.1}s`,
                        animationDuration: "0.8s"
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Action Controls */}
            <div className="flex items-center justify-center space-x-4 w-full pt-3 border-t border-slate-800/80">
              {/* Mute / Unmute Button (When Connected) */}
              {callStatus === "connected" && (
                <button
                  onClick={handleToggleMute}
                  className={`p-4 rounded-full transition-all cursor-pointer shadow-lg ${
                    isMuted 
                      ? "bg-amber-500 text-slate-950 hover:bg-amber-400" 
                      : "bg-slate-800 text-white hover:bg-slate-700"
                  }`}
                  title={isMuted ? getTranslation("আনমিউট করুন", "Unmute") : getTranslation("মিউট করুন", "Mute")}
                >
                  {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
              )}

              {/* End Call / Cancel Button */}
              <button
                onClick={handleEndOrCancelCall}
                className="flex items-center justify-center p-4 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-95 text-white shadow-xl shadow-rose-950/60 transition cursor-pointer w-14 h-14"
                title={callStatus === "connected" ? getTranslation("কল কাটুন", "End Call") : getTranslation("বাতিল করুন", "Cancel")}
              >
                <PhoneOff className="w-6 h-6" />
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
