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
  Headphones
} from "lucide-react";
import { RTC_CONFIG, callAudioSynth } from "../lib/webrtcCall";

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
  const [callStatus, setCallStatus] = useState<"initiating" | "ringing" | "connected" | "ended" | "rejected" | "error">("initiating");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [callDuration, setCallDuration] = useState<number>(0);
  const [callId, setCallId] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<any>(null);
  const durationRef = useRef<number>(0);
  const unsubscribeCallRef = useRef<(() => void) | null>(null);
  const unsubscribeCandidatesRef = useRef<(() => void) | null>(null);

  const getTranslation = (bn: string, en: string) => (lang === "bn" ? bn : en);

  // Monitor auth state
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

  // Start Call Flow
  const startCall = async () => {
    try {
      setCallStatus("initiating");
      setErrorMessage("");
      setCallDuration(0);
      durationRef.current = 0;

      // 1. Get Local Microphone Stream
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(getTranslation("আপনার ব্রাউজারে মাইক্রোফোন সাপোর্ট নেই।", "Microphone not supported on this browser."));
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true, 
          noiseSuppression: true, 
          autoGainControl: true 
        }, 
        video: false 
      });
      localStreamRef.current = stream;

      // 2. Initialize RTCPeerConnection
      const pc = new RTCPeerConnection(RTC_CONFIG);
      pcRef.current = pc;

      // Add local audio tracks to PC
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Handle incoming remote audio stream
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

      // 4. Create Firestore Call Document
      const callDocRef = doc(collection(db, "voice_calls"));
      const newCallId = callDocRef.id;
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

      await setDoc(callDocRef, {
        id: newCallId,
        callerId: callerId,
        callerName: callerName,
        callerType: callerType,
        status: "calling",
        offer: offer,
        createdAt: serverTimestamp(),
        durationSeconds: 0
      });

      // Play ringing sound
      setCallStatus("ringing");
      callAudioSynth.playRingTone();

      // 6. Listen to Firestore Call Document updates
      const unsubCall = onSnapshot(callDocRef, (snapshot) => {
        const data = snapshot.data();
        if (!data) return;

        if (data.status === "connected" && data.answer && !pc.currentRemoteDescription) {
          const answerDescription = new RTCSessionDescription(data.answer);
          pc.setRemoteDescription(answerDescription).then(() => {
            setCallStatus("connected");
            callAudioSynth.playConnectChime();
            // Start Call Timer
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

        if (data.status === "rejected") {
          callAudioSynth.playDisconnectTone();
          setCallStatus("rejected");
          cleanupCall();
        }

        if (data.status === "ended") {
          callAudioSynth.playDisconnectTone();
          setCallStatus("ended");
          cleanupCall();
        }
      });
      unsubscribeCallRef.current = unsubCall;

      // 7. Listen for Remote ICE candidates from Admin (callee)
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
      callAudioSynth.stopSounds();
      setCallStatus("error");
      setErrorMessage(err.message || getTranslation("কল শুরু করতে সমস্যা হয়েছে। দয়া করে মাইক্রোফোনের অনুমতি দিন।", "Could not start call. Please grant microphone access."));
      cleanupCall();
    }
  };

  // Cleanup WebRTC & Streams
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
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
  };

  // Hang Up / End Call
  const handleEndCall = async () => {
    callAudioSynth.playDisconnectTone();
    if (callId) {
      try {
        await updateDoc(doc(db, "voice_calls", callId), {
          status: "ended",
          endedAt: serverTimestamp(),
          durationSeconds: durationRef.current,
          endedBy: "caller"
        });
      } catch (err) {
        console.warn("End call notice:", err);
      }
    }
    setCallStatus("ended");
    cleanupCall();
    setTimeout(() => {
      onClose();
    }, 1200);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
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
            : "bg-teal-500/20 animate-pulse"
        }`} />

        {/* Close / Minimize Button */}
        <button 
          onClick={handleEndCall}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          title={getTranslation("বন্ধ করুন", "Close")}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top Header Badge */}
        <div className="inline-flex items-center space-x-1.5 bg-slate-800/90 border border-slate-700/80 px-3 py-1 rounded-full text-[11px] font-bold text-emerald-400 mb-6">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>{getTranslation("ফ্রি সরাসরি ভয়েস কল", "Free Direct Voice Call")}</span>
        </div>

        {/* Center Avatar & Animated Rings */}
        <div className="relative mb-5 flex items-center justify-center">
          {callStatus === "ringing" || callStatus === "initiating" ? (
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
              : "bg-gradient-to-br from-emerald-600 to-teal-700 border-emerald-400/50 text-white"
          }`}>
            {callStatus === "connected" ? (
              <Headphones className="w-9 h-9 animate-pulse" />
            ) : (
              <Phone className={`w-9 h-9 ${callStatus === "ringing" ? "animate-bounce" : ""}`} />
            )}
          </div>
        </div>

        {/* Store Representative Name */}
        <h3 className="text-base sm:text-lg font-black text-white tracking-tight mb-1">
          {getTranslation("কাচা বাজার কাস্টমার সাপোর্ট", "Kacha Bazar Support Desk")}
        </h3>
        
        {/* Status Text / Live Timer */}
        <div className="mb-6">
          {callStatus === "initiating" && (
            <p className="text-xs text-slate-400 font-medium flex items-center justify-center space-x-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
              <span>{getTranslation("কল শুরু হচ্ছে...", "Initiating call...")}</span>
            </p>
          )}

          {callStatus === "ringing" && (
            <div className="space-y-1">
              <p className="text-xs text-emerald-400 font-bold uppercase tracking-wider animate-pulse">
                {getTranslation("এডমিনকে কল করা হচ্ছে...", "Ringing Admin Desk...")}
              </p>
              <p className="text-[11px] text-slate-400">
                {getTranslation("দয়া করে কিছুক্ষণ অপেক্ষা করুন", "Please hold while agent connects")}
              </p>
            </div>
          )}

          {callStatus === "connected" && (
            <div className="space-y-1">
              <span className="inline-block bg-emerald-500/20 text-emerald-300 font-mono text-sm font-black px-3 py-0.5 rounded-full border border-emerald-500/30">
                {formatTime(callDuration)}
              </span>
              <p className="text-[11px] text-slate-300 font-medium">
                {getTranslation("কথা বলুন, প্রতিনিধি লাইনে আছেন", "Connected, you can talk now")}
              </p>
            </div>
          )}

          {callStatus === "rejected" && (
            <div className="space-y-1 text-rose-400">
              <p className="text-xs font-bold">
                {getTranslation("এডমিন এই মুহূর্তে ব্যস্ত আছেন।", "Representative is currently busy.")}
              </p>
              <p className="text-[11px] text-slate-400">
                {getTranslation("অনুগ্রহ করে লাইভ চ্যাটে বার্তা পাঠান।", "Please leave a message on Live Chat.")}
              </p>
            </div>
          )}

          {callStatus === "ended" && (
            <p className="text-xs text-slate-300 font-bold">
              {getTranslation("কল সমাপ্ত হয়েছে", "Call Ended")} ({formatTime(callDuration)})
            </p>
          )}

          {callStatus === "error" && (
            <div className="text-rose-400 text-xs px-3 py-2 bg-rose-950/50 rounded-xl border border-rose-900/60 max-w-xs mx-auto">
              <AlertCircle className="w-4 h-4 mx-auto mb-1" />
              <p>{errorMessage}</p>
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
            onClick={handleEndCall}
            className="flex items-center space-x-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-extrabold px-6 py-3.5 rounded-full shadow-lg shadow-rose-950 transition cursor-pointer"
          >
            <PhoneOff className="w-5 h-5" />
            <span className="text-xs uppercase tracking-wider">
              {callStatus === "connected" 
                ? getTranslation("কল কাটুন", "End Call") 
                : getTranslation("বাতিল করুন", "Cancel")}
            </span>
          </button>
        </div>

        {/* Privacy Note */}
        <p className="text-[10px] text-slate-500 font-medium mt-4">
          🔒 {getTranslation("ওয়েব-ভিত্তিক নিরাপদ কল • কোনো ফোন নম্বর ব্যবহার হয় না", "Web-based secure call • No phone number used")}
        </p>

      </div>
    </div>
  );
}
