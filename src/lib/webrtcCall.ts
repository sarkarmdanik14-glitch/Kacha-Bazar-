/**
 * WebRTC Voice Calling Service, Audio Synthesizer & Bangla Automated Voice System
 * Handles real-time peer-to-peer audio calling via Firestore signaling and STUN servers.
 * Pure Web Audio API tone synthesis for ringing, connect, waiting, and disconnect sounds.
 */

import { 
  db, 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  onSnapshot, 
  serverTimestamp, 
  getDocs,
  query,
  where,
  orderBy
} from "./firebase";

// WebRTC ICE servers configuration
export const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" }
  ]
};

// Web Audio sound effects synthesizer
class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private ringInterval: any = null;
  private queueToneInterval: any = null;

  private getContext(): AudioContext | null {
    try {
      if (!this.ctx || this.ctx.state === "closed") {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  // Play continuous telephone ring tone (outgoing/incoming)
  playRingTone() {
    this.stopSounds();
    const playBurst = () => {
      const ctx = this.getContext();
      if (!ctx) return;
      try {
        const now = ctx.currentTime;
        // Dual tones standard (440Hz + 480Hz)
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.frequency.setValueAtTime(440, now);
        osc2.frequency.setValueAtTime(480, now);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.14, now + 0.05);
        gain.gain.setValueAtTime(0.14, now + 1.2);
        gain.gain.linearRampToValueAtTime(0, now + 1.3);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.35);
        osc2.stop(now + 1.35);
      } catch (err) {
        console.warn("Sound synth error:", err);
      }
    };

    playBurst();
    this.ringInterval = setInterval(playBurst, 2800);
  }

  // Play soft soothing waiting chime while customer is in queue
  playQueueWaitingChime() {
    this.stopSounds();
    const playSoftChime = () => {
      const ctx = this.getContext();
      if (!ctx) return;
      try {
        const now = ctx.currentTime;
        const notes = [587.33, 659.25, 783.99]; // D5, E5, G5
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, now + idx * 0.15);
          gain.gain.setValueAtTime(0, now + idx * 0.15);
          gain.gain.linearRampToValueAtTime(0.06, now + idx * 0.15 + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 0.5);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.15);
          osc.stop(now + idx * 0.15 + 0.52);
        });
      } catch {}
    };

    playSoftChime();
    this.queueToneInterval = setInterval(playSoftChime, 6000);
  }

  // Play pleasant upward connected chime
  playConnectChime() {
    this.stopSounds();
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.09);
        gain.gain.setValueAtTime(0, now + idx * 0.09);
        gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.09 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.09);
        osc.stop(now + idx * 0.09 + 0.36);
      });
    } catch {}
  }

  // Play disconnect tone
  playDisconnectTone() {
    this.stopSounds();
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const notes = [440, 330, 220];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);
        gain.gain.setValueAtTime(0, now + idx * 0.12);
        gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.12 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.26);
      });
    } catch {}
  }

  stopSounds() {
    if (this.ringInterval) {
      clearInterval(this.ringInterval);
      this.ringInterval = null;
    }
    if (this.queueToneInterval) {
      clearInterval(this.queueToneInterval);
      this.queueToneInterval = null;
    }
  }
}

export const callAudioSynth = new SoundSynthesizer();

/**
 * Professional Soft Call Background Music Player
 * Plays warm, soothing, low-volume ambient chords & harp background music
 * - Ducked (low volume ~0.12) while automated voice is speaking
 * - Soft waiting music (~0.18) when voice finishes and customer is in queue
 * - Immediately stops on call accept/end/cancel
 */
class CallBackgroundMusicPlayer {
  private audioElement: HTMLAudioElement | null = null;
  private isPlaying: boolean = false;
  private synthInterval: any = null;
  private audioCtx: AudioContext | null = null;

  play(ducked: boolean = true) {
    if (typeof window === "undefined") return;
    this.isPlaying = true;

    const targetVolume = ducked ? 0.18 : 0.28;

    // 1. Primary Method: High quality ambient MP3 loop
    try {
      if (!this.audioElement) {
        const audio = new Audio();
        audio.src = "/audio/call-bg-music.mp3";
        audio.loop = true;
        audio.preload = "auto";
        audio.volume = targetVolume;

        audio.onerror = () => {
          console.warn("Background music MP3 fallback to Web Audio generator");
          this.startWebAudioAmbientLoop(ducked);
        };

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              this.audioElement = audio;
              if (this.audioElement) {
                this.audioElement.volume = targetVolume;
              }
            })
            .catch((err) => {
              console.warn("Autoplay promise notice for BG music:", err);
              this.startWebAudioAmbientLoop(ducked);
            });
        } else {
          this.audioElement = audio;
        }
      } else {
        this.audioElement.volume = targetVolume;
        if (this.audioElement.paused) {
          this.audioElement.play().catch(() => {});
        }
      }
    } catch (err) {
      console.warn("BG music audio player error:", err);
      this.startWebAudioAmbientLoop(ducked);
    }
  }

  setDucked(ducked: boolean) {
    const targetVolume = ducked ? 0.18 : 0.28;
    if (this.audioElement) {
      this.audioElement.volume = targetVolume;
    }
  }

  private startWebAudioAmbientLoop(ducked: boolean) {
    if (this.synthInterval) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      if (!this.audioCtx) {
        this.audioCtx = new AudioContextClass();
      }
      if (this.audioCtx.state === "suspended") {
        this.audioCtx.resume();
      }

      const chords = [
        [261.63, 329.63, 392.00, 493.88], // Cmaj7
        [220.00, 261.63, 329.63, 392.00], // Am7
        [174.61, 220.00, 261.63, 329.63], // Fmaj7
        [196.00, 246.94, 293.66, 392.00]  // G
      ];
      let chordIndex = 0;

      const playChord = () => {
        if (!this.isPlaying || !this.audioCtx) return;
        const now = this.audioCtx.currentTime;
        const currentChord = chords[chordIndex % chords.length];
        chordIndex++;
        const vol = ducked ? 0.035 : 0.060;

        currentChord.forEach((freq, idx) => {
          if (!this.audioCtx) return;
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, now + idx * 0.15);

          gain.gain.setValueAtTime(0, now + idx * 0.15);
          gain.gain.linearRampToValueAtTime(vol, now + idx * 0.15 + 0.4);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.15 + 3.2);

          osc.connect(gain);
          gain.connect(this.audioCtx.destination);
          osc.start(now + idx * 0.15);
          osc.stop(now + idx * 0.15 + 3.3);
        });
      };

      playChord();
      this.synthInterval = setInterval(playChord, 3500);
    } catch {}
  }

  stop() {
    this.isPlaying = false;
    if (this.synthInterval) {
      clearInterval(this.synthInterval);
      this.synthInterval = null;
    }
    if (this.audioElement) {
      try {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
      } catch {}
      this.audioElement = null;
    }
    if (this.audioCtx && this.audioCtx.state !== "closed") {
      try {
        this.audioCtx.close();
      } catch {}
      this.audioCtx = null;
    }
  }

  isCurrentlyPlaying(): boolean {
    return this.isPlaying;
  }
}

export const callBgMusic = new CallBackgroundMusicPlayer();

/**
 * Automated Bangla Welcome Speech & Background Music Player
 * Plays real Bengali voice recording with crystal clear voice + soft ambient background music:
 * "আসসালামু আলাইকুম। কাঁচা বাজারে আপনাকে স্বাগতম। আমাদেরকে কল করার জন্য আপনাকে ধন্যবাদ। আমাদের প্রতিনিধি বর্তমানে একটু ব্যস্ত আছেন। অনুগ্রহ করে অপেক্ষা করুন। খুব শীঘ্রই একজন প্রতিনিধি আপনার কলটি গ্রহণ করবেন। ধন্যবাদ।"
 * - Background music plays automatically under the voice (15-20% volume)
 * - Transitions smoothly into soft queue waiting music loop if customer is waiting
 * - Immediately stops on call accept/connect/end
 */
class BanglaCallWelcomePlayer {
  private audioElement: HTMLAudioElement | null = null;
  private waitingAudioElement: HTMLAudioElement | null = null;
  private utterance: SpeechSynthesisUtterance | null = null;
  private isSpeaking: boolean = false;
  private onEndCallback: (() => void) | null = null;

  private WELCOME_SPEECH = "আসসালামু আলাইকুম। কাঁচা বাজারে আপনাকে স্বাগতম। আমাদেরকে কল করার জন্য আপনাকে ধন্যবাদ। আমাদের প্রতিনিধি বর্তমানে একটু ব্যস্ত আছেন। অনুগ্রহ করে অপেক্ষা করুন। খুব শীঘ্রই একজন প্রতিনিধি আপনার কলটি গ্রহণ করবেন। ধন্যবাদ।";

  /**
   * Pre-warm and start audio immediately on direct user click to guarantee instant playback on all mobile/desktop browsers
   */
  startOnUserClick(onEnd?: () => void) {
    this.playWelcomeGreeting(onEnd);
  }

  playWelcomeGreeting(onEnd?: () => void) {
    this.stop();
    this.isSpeaking = true;
    this.onEndCallback = onEnd || null;

    if (typeof window === "undefined") {
      if (onEnd) onEnd();
      return;
    }

    // 1. Primary Method: Studio-Mixed Voice + Ambient Background Music Track
    try {
      const audio = new Audio();
      audio.src = "/audio/bangla-welcome-with-bg.mp3";
      audio.volume = 1.0; // Voice is master 100%, background music is harmonically mixed at clean audible 22%
      audio.preload = "auto";

      audio.onended = () => {
        this.isSpeaking = false;
        // Start continuous soft waiting music loop while customer is in queue
        this.playWaitingMusicLoop();
        if (this.onEndCallback) {
          const cb = this.onEndCallback;
          this.onEndCallback = null;
          cb();
        }
      };

      audio.onerror = (e) => {
        console.warn("Unified audio playback failed, falling back to separate layers:", e);
        this.fallbackToSeparateLayers();
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            this.audioElement = audio;
          })
          .catch((err) => {
            console.warn("Autoplay notice for unified track, trying separate layers:", err);
            this.fallbackToSeparateLayers();
          });
      } else {
        this.audioElement = audio;
      }
    } catch (err) {
      console.warn("Audio initialization error, trying separate layers:", err);
      this.fallbackToSeparateLayers();
    }
  }

  private fallbackToSeparateLayers() {
    // Start background music layer at pleasant audible volume (15%)
    callBgMusic.play(true);

    try {
      const voiceAudio = new Audio();
      voiceAudio.src = "/audio/bangla-call-welcome.mp3";
      voiceAudio.volume = 1.0;
      voiceAudio.preload = "auto";

      voiceAudio.onended = () => {
        this.isSpeaking = false;
        callBgMusic.setDucked(false);
        if (this.onEndCallback) {
          const cb = this.onEndCallback;
          this.onEndCallback = null;
          cb();
        }
      };

      voiceAudio.onerror = () => {
        this.fallbackToWebSpeech();
      };

      const playPromise = voiceAudio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            this.audioElement = voiceAudio;
          })
          .catch(() => {
            this.fallbackToWebSpeech();
          });
      } else {
        this.audioElement = voiceAudio;
      }
    } catch {
      this.fallbackToWebSpeech();
    }
  }

  playWaitingMusicLoop() {
    try {
      if (typeof window === "undefined") return;
      if (this.waitingAudioElement) {
        this.waitingAudioElement.play().catch(() => {});
        return;
      }

      const waitingAudio = new Audio();
      waitingAudio.src = "/audio/call-waiting-music-loop.mp3";
      waitingAudio.volume = 0.32; // clearly audible, soothing waiting melody
      waitingAudio.loop = true;
      waitingAudio.preload = "auto";

      const playPromise = waitingAudio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            this.waitingAudioElement = waitingAudio;
          })
          .catch((err) => {
            console.warn("Waiting music loop autoplay notice:", err);
            callBgMusic.play(false);
          });
      } else {
        this.waitingAudioElement = waitingAudio;
      }
    } catch (err) {
      console.warn("Waiting music loop init error:", err);
      callBgMusic.play(false);
    }
  }

  private fallbackToWebSpeech() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      this.isSpeaking = false;
      callBgMusic.setDucked(false);
      if (this.onEndCallback) {
        const cb = this.onEndCallback;
        this.onEndCallback = null;
        cb();
      }
      return;
    }

    try {
      window.speechSynthesis.cancel();
    } catch {}

    const utterance = new SpeechSynthesisUtterance(this.WELCOME_SPEECH);
    utterance.lang = "bn-BD";
    utterance.rate = 0.92;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    const synth = window.speechSynthesis;
    const voices = synth.getVoices ? synth.getVoices() : [];
    const bnVoice = voices.find(v => 
      v.lang === "bn-BD" || 
      v.lang === "bn-IN" || 
      v.lang?.toLowerCase().startsWith("bn") ||
      v.name?.toLowerCase().includes("bangla") ||
      v.name?.toLowerCase().includes("bengali")
    );

    if (bnVoice) {
      utterance.voice = bnVoice;
    }

    utterance.onstart = () => {
      this.isSpeaking = true;
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      callBgMusic.setDucked(false);
      if (this.onEndCallback) {
        const cb = this.onEndCallback;
        this.onEndCallback = null;
        cb();
      }
    };

    utterance.onerror = () => {
      this.isSpeaking = false;
      callBgMusic.setDucked(false);
      if (this.onEndCallback) {
        const cb = this.onEndCallback;
        this.onEndCallback = null;
        cb();
      }
    };

    this.utterance = utterance;
    try {
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      this.isSpeaking = false;
      callBgMusic.setDucked(false);
      if (this.onEndCallback) {
        const cb = this.onEndCallback;
        this.onEndCallback = null;
        cb();
      }
    }
  }

  stop() {
    this.isSpeaking = false;
    this.onEndCallback = null;

    if (this.audioElement) {
      try {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
      } catch {}
      this.audioElement = null;
    }

    if (this.waitingAudioElement) {
      try {
        this.waitingAudioElement.pause();
        this.waitingAudioElement.currentTime = 0;
      } catch {}
      this.waitingAudioElement = null;
    }

    callBgMusic.stop();

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    this.utterance = null;
  }

  isCurrentlyPlaying(): boolean {
    return this.isSpeaking;
  }
}

export const banglaCallWelcome = new BanglaCallWelcomePlayer();

export interface VoiceCallSession {
  id: string;
  callNumber?: string;
  callerId: string;
  callerName: string;
  callerPhone?: string;
  callerType: "customer" | "guest";
  status: "waiting" | "calling" | "ringing" | "connected" | "ended" | "rejected" | "missed" | "cancelled";
  queuePosition?: number;
  assignedAgentId?: string | null;
  assignedAgentName?: string | null;
  offer?: any;
  answer?: any;
  createdAt?: any;
  assignedAt?: any;
  connectedAt?: any;
  endedAt?: any;
  durationSeconds?: number;
  endedBy?: "caller" | "agent" | "admin" | "system";
  notes?: string;
  orderId?: string;
}
