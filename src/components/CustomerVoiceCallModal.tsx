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
  PhoneCall,
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

  const getTranslation = (bn: string, en: string) => (lang === "bn" ? bn : en);

  // Monitor Auth state
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      setCurrentUser(user || null);
    });
    return () => unsub();
  }, []);

  // Format seconds into MM:SS
  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Convert English number to Bengali digits
  const toBanglaDigits = (num: number) => {
    const bnDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
    return num.toString().split("").map((d) => bnDigits[parseInt(d, 10)] || d).join("");
  };

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

      // Pre-warm audio in the user click gesture stack
      banglaCallWelcome.prewarmAudio();

      // 1. Get Local Microphone Stream (Requested ONLY on call trigger)
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
        if (micErr.name === "NotAllowedError" || micErr.name === "PermissionDeniedError") {
          setIsPermissionDenied(true);
          throw new Error(getTranslation(
            "মাইক্রোফোন অ্যাক্সেস ডিনাই করা হয়েছে। অনুগ্রহ করে ব্রাউজার অ্যাড্রেস বার থেকে পারমিশন Allow করুন।",
            "Microphone permission was denied. Please allow microphone access from browser address bar or settings."
          ));
        }
        throw micErr;
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

      // Play Automated Bangla Welcome Voice Announcement
      setIsWelcomeSpeaking(true);
      banglaCallWelcome.playWelcomeGreeting(() => {
        setIsWelcomeSpeaking(false);
        // Once speech completes, play soft queue waiting chime if still waiting for agent
        callAudioSynth.playQueueWaitingChime();
      });

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
      console.error("Call initiation error:", err);
      cleanupCall();
      setCallStatus("error");
      setErrorMessage(err.message || getTranslation("কল শুরু করতে সমস্যা হয়েছে। দয়া করে মাইক্রোফোনের অনুমতি দিন।", "Could not start call. Please grant microphone access."));
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
    }, 1000);
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

  // Trigger call on open
  useEffect(() => {
    if (isOpen) {
      startCall();
    } else {
      cleanupCall();
    }
    return () => {
      cleanupCall();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
      {/* Hidden Remote Audio Element */}
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      {/* Main Call Modal */}
      <div className="bg-slate-900 text-white w-full max-w-sm rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-800 flex flex-col items-center text-center relative overflow-hidden animate-scale-up">
        
        {/* Background Ambient Glow */}
        <div className={`absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-3xl pointer-events-none transition-all duration-700 ${
          callStatus === "connected" 
            ? "bg-emerald-500/20" 
            : callStatus === "rejected" || callStatus === "error"
            ? "bg-rose-500/20"
            : callStatus === "waiting"
            ? "bg-amber-500/20"
            : "bg-teal-500/20 animate-pulse"
        }`} />

        {/* Close / Minimize Button */}
        <button 
          onClick={handleEndOrCancelCall}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          title={getTranslation("বন্ধ করুন", "Close")}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top Header Badge */}
        <div className="inline-flex items-center space-x-1.5 bg-slate-800/90 border border-slate-700/80 px-3 py-1 rounded-full text-[11px] font-bold text-emerald-400 mb-6">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>{getTranslation("ফ্রি সরাসরি ভয়েস কল সাপোর্ট", "Free Direct Voice Call Support")}</span>
        </div>

        {/* Center Avatar & Animated Rings */}
        <div className="relative mb-5 flex items-center justify-center">
          {callStatus === "ringing" || callStatus === "initiating" || callStatus === "waiting" ? (
            <div className="absolute w-28 h-28 rounded-full border-2 border-emerald-500/40 animate-ping" />
          ) : null}
          {callStatus === "connected" ? (
            <div className="absolute w-28 h-28 rounded-full border-2 border-emerald-400/50 animate-pulse" />
          ) : null}

          <div className={`w-20 h-20 rounded-full flex items-center justify-center shadow-xl border-2 transition-all duration-500 ${
            callStatus === "connected"
              ? "bg-emerald-600 border-emerald-400 text-white scale-105"
              : callStatus === "rejected" || callStatus === "error"
              ? "bg-rose-600 border-rose-400 text-white"
              : callStatus === "waiting"
              ? "bg-gradient-to-br from-amber-600 to-teal-700 border-amber-400/50 text-white"
              : "bg-gradient-to-br from-emerald-600 to-teal-700 border-emerald-400/50 text-white"
          }`}>
            {callStatus === "connected" ? (
              <Headphones className="w-9 h-9 animate-pulse" />
            ) : callStatus === "waiting" ? (
              <Users className="w-9 h-9 animate-pulse" />
            ) : (
              <Phone className={`w-9 h-9 ${callStatus === "ringing" ? "animate-bounce" : ""}`} />
            )}
          </div>
        </div>

        {/* Desk Title */}
        <h3 className="text-base sm:text-lg font-black text-white tracking-tight mb-1">
          {assignedAgentName || getTranslation("কাঁচা বাজার কাস্টমার কেয়ার", "Kacha Bazar Customer Care")}
        </h3>
        
        {/* Status / Live Queue / Timer Display */}
        <div className="mb-6 w-full">
          {/* Automated Voice Message Active Banner */}
          {(isWelcomeSpeaking || callStatus === "waiting" || callStatus === "ringing") && callStatus !== "connected" && (
            <div className="bg-emerald-950/80 border border-emerald-500/50 rounded-2xl p-3.5 mb-3 text-left shadow-inner">
              <div className="flex items-center justify-between text-emerald-400 text-xs font-bold mb-1.5">
                <div className="flex items-center space-x-1.5">
                  <Volume2 className="w-4 h-4 animate-bounce text-emerald-400" />
                  <span>{getTranslation("স্বয়ংক্রিয় বাংলা ভয়েস ও ব্যাকগ্রাউন্ড টিউন বাজছে", "Automated Voice & Soft Melody Active")}</span>
                </div>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>
              
              <p className="text-[11px] text-emerald-200/90 leading-relaxed font-medium">
                “আসসালামু আলাইকুম। কাঁচা বাজারে আপনাকে স্বাগতম। আমাদেরকে কল করার জন্য আপনাকে ধন্যবাদ। আমাদের প্রতিনিধি বর্তমানে একটু ব্যস্ত আছেন। অনুগ্রহ করে অপেক্ষা করুন। খুব শীঘ্রই একজন প্রতিনিধি আপনার কলটি গ্রহণ করবেন। ধন্যবাদ।”
              </p>

              {/* Sound wave bars */}
              <div className="flex items-center justify-center space-x-1.5 mt-2.5 h-4">
                {[30, 70, 45, 95, 60, 85, 40, 90, 55, 80, 35, 65].map((h, idx) => (
                  <span
                    key={idx}
                    className="w-1 bg-emerald-400 rounded-full animate-pulse"
                    style={{
                      height: `${h}%`,
                      animationDelay: `${idx * 0.07}s`,
                      animationDuration: "0.7s"
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {callStatus === "initiating" && (
            <p className="text-xs text-slate-400 font-medium flex items-center justify-center space-x-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
              <span>{getTranslation("কল সংযোগ স্থাপন করা হচ্ছে...", "Connecting to helpdesk...")}</span>
            </p>
          )}

          {callStatus === "waiting" && (
            <div className="space-y-3 bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 animate-in fade-in">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">{getTranslation("কল কিউ স্ট্যাটাস", "Queue Status")}:</span>
                <span className="bg-amber-500/20 text-amber-300 font-bold px-2.5 py-0.5 rounded-full border border-amber-500/30">
                  {getTranslation("অপেক্ষারত", "Waiting")}
                </span>
              </div>
              
              <div className="bg-slate-900/90 rounded-xl p-3 border border-slate-800">
                <p className="text-[11px] text-slate-400 font-medium mb-1">
                  {getTranslation("কিউতে আপনার সিরিয়াল অবস্থান", "Your Current Queue Position")}
                </p>
                <div className="text-2xl font-black text-emerald-400">
                  {lang === "bn" ? `অবস্থান: ${toBanglaDigits(queuePosition)}` : `Position: #${queuePosition}`}
                </div>
              </div>

              <p className="text-[11px] text-slate-300 leading-relaxed">
                {getTranslation(
                  "প্রতিনিধি ব্যস্ত থাকায় স্বাগতম ভয়েস বার্তা বাজছে। খুব শীঘ্রই প্রতিনিধি কলটি গ্রহণ করবেন।",
                  "Automated welcome voice is playing. An agent will accept your call shortly."
                )}
              </p>
            </div>
          )}

          {callStatus === "ringing" && (
            <div className="space-y-2 bg-slate-800/80 border border-emerald-500/30 rounded-2xl p-3.5">
              <p className="text-xs text-emerald-400 font-bold uppercase tracking-wider animate-pulse flex items-center justify-center space-x-1.5">
                <PhoneCall className="w-4 h-4 animate-bounce" />
                <span>{getTranslation("প্রতিনিধিকে কল পাঠানো হয়েছে...", "Call Dispatched to Support Agent...")}</span>
              </p>
              <p className="text-[11px] text-slate-300">
                {getTranslation("এজেন্ট রিসিভ করার সাথে সাথে লাইভ কথা শুরু হবে।", "Live conversation will start as soon as agent accepts.")}
              </p>
            </div>
          )}

          {callStatus === "connected" && (
            <div className="space-y-1.5">
              <span className="inline-block bg-emerald-500/20 text-emerald-300 font-mono text-sm font-black px-3.5 py-1 rounded-full border border-emerald-500/30">
                ⏱ {formatTime(callDuration)}
              </span>
              <p className="text-[11px] text-slate-300 font-medium">
                {getTranslation("কথা বলুন, প্রতিনিধি লাইনে আছেন", "Connected! You are speaking with support.")}
              </p>
            </div>
          )}

          {callStatus === "rejected" && (
            <div className="space-y-1 text-rose-400">
              <p className="text-xs font-bold">
                {getTranslation("এই মুহূর্তে কলটি রিসিভ করা সম্ভব হয়নি।", "Could not connect at this moment.")}
              </p>
              <p className="text-[11px] text-slate-400">
                {getTranslation("অনুগ্রহ করে লাইভ চ্যাটে আপনার অর্ডার মেসেজ দিন।", "Please send your order via Live Chat.")}
              </p>
            </div>
          )}

          {callStatus === "ended" && (
            <p className="text-xs text-slate-300 font-bold">
              {getTranslation("কল সমাপ্ত হয়েছে", "Call Ended")} ({formatTime(callDuration)})
            </p>
          )}

          {callStatus === "cancelled" && (
            <p className="text-xs text-slate-400 font-bold">
              {getTranslation("কল বাতিল করা হয়েছে।", "Call was cancelled.")}
            </p>
          )}

          {callStatus === "error" && (
            <div className="space-y-3 max-w-xs mx-auto animate-in fade-in">
              <div className="text-rose-400 text-xs px-3.5 py-2.5 bg-rose-950/60 rounded-xl border border-rose-800/80 text-center">
                <AlertCircle className="w-5 h-5 mx-auto mb-1.5 text-rose-400" />
                <p className="font-semibold">{errorMessage}</p>
                {isPermissionDenied && (
                  <p className="text-[10px] text-slate-300 mt-2 bg-slate-800/80 p-2 rounded-lg border border-slate-700 leading-relaxed text-left">
                    💡 {getTranslation(
                      "টিপস: ব্রাউজারের অ্যাড্রেস বারের সাইট সেটিংস/লক আইকনে গিয়ে Microphone এক্সেস Allow করে নিচে 'পুনরায় চেষ্টা করুন' চাপুন।",
                      "Tip: Go to your browser address bar/site settings, set Microphone to Allow, then click 'Try Again' below."
                    )}
                  </p>
                )}
              </div>
              
              <button
                type="button"
                onClick={startCall}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-extrabold rounded-xl transition shadow flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>{getTranslation("পুনরায় চেষ্টা করুন", "Try Call Again")}</span>
              </button>
            </div>
          )}
        </div>

        {/* Audio Wave Visualizer (When Connected) */}
        {callStatus === "connected" && (
          <div className="flex items-center justify-center space-x-1.5 h-6 mb-6">
            {[40, 75, 50, 90, 60, 80, 45, 70, 55].map((h, i) => (
              <span
                key={i}
                className="w-1 bg-emerald-400 rounded-full animate-pulse"
                style={{
                  height: `${h}%`,
                  animationDelay: `${i * 0.1}s`,
                  animationDuration: "0.8s"
                }}
              />
            ))}
          </div>
        )}

        {/* Action Controls Bar */}
        <div className="flex items-center justify-center space-x-4 w-full pt-2 border-t border-slate-800/80">
          
          {/* Mute / Unmute Button */}
          {callStatus === "connected" && (
            <button
              onClick={handleToggleMute}
              className={`p-3.5 rounded-full transition-all cursor-pointer ${
                isMuted 
                  ? "bg-amber-500 text-slate-950 hover:bg-amber-400 font-bold" 
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
            className="flex items-center space-x-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-extrabold px-6 py-3.5 rounded-full shadow-lg shadow-rose-950 transition cursor-pointer"
          >
            <PhoneOff className="w-5 h-5" />
            <span className="text-xs uppercase tracking-wider">
              {callStatus === "connected" 
                ? getTranslation("কল কাটুন", "End Call") 
                : getTranslation("বাতিল করুন", "Cancel Call")}
            </span>
          </button>
        </div>

        {/* Privacy Note */}
        <p className="text-[10px] text-slate-500 font-medium mt-4">
          🔒 {getTranslation("ওয়েব-ভিত্তিক নিরাপদ কল • কোনো ফোন নম্বর প্রয়োজন নেই", "Web-based secure call • No phone number required")}
        </p>

      </div>
    </div>
  );
}
