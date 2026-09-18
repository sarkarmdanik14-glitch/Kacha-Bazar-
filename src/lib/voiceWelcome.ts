/**
 * Bengali Voice Welcome Service for Kacha Bazar
 *
 * Requirements:
 * 1. Plays: "আসসালামু আলাইকুম, কাঁচা বাজারে আপনাকে স্বাগতম"
 * 2. Plays automatically when the app/website opens.
 * 3. Plays only once per session, not repeatedly (guarded by sessionStorage and memory state).
 * 4. Uses a clear, natural Bengali voice (studio-quality natural voice audio with Web Speech API fallback).
 * 5. If browser autoplay is blocked, smoothly plays on the user's first interaction (click/touch/keydown).
 * 6. Completely transparent — zero changes to visual layout or design.
 */

const SESSION_KEY = "kachabazar_welcome_voice_played";
const GREETING_TEXT = "আসসালামু আলাইকুম, কাঁচা বাজারে আপনাকে স্বাগতম";
const AUDIO_SRC_MP3 = "/audio/kachabazar-welcome.mp3";
const AUDIO_SRC_WAV = "/audio/kachabazar-welcome.wav";

let isInitialized = false;
let hasPlayed = false;
let currentAudio: HTMLAudioElement | null = null;

function isSessionAlreadyPlayed(): boolean {
  if (hasPlayed) return true;
  try {
    if (typeof window !== "undefined" && window.sessionStorage) {
      return window.sessionStorage.getItem(SESSION_KEY) === "true";
    }
  } catch (err) {
    console.debug("Session storage check error:", err);
  }
  return false;
}

function markSessionAsPlayed(): void {
  hasPlayed = true;
  try {
    if (typeof window !== "undefined" && window.sessionStorage) {
      window.sessionStorage.setItem(SESSION_KEY, "true");
    }
  } catch (err) {
    console.debug("Session storage set error:", err);
  }
}

/**
 * Fallback to browser Web Speech API with Bengali voice if audio file fails
 */
function speakWithWebSpeech(): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return;
  }

  try {
    const synth = window.speechSynthesis;
    if (!synth) return;

    try {
      synth.cancel();
    } catch {}

    const utterance = new SpeechSynthesisUtterance(GREETING_TEXT);
    utterance.lang = "bn-BD";
    utterance.rate = 0.92;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    const voices = synth.getVoices ? synth.getVoices() : [];
    const bnVoice = voices.find(
      (v) =>
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
      markSessionAsPlayed();
    };

    synth.speak(utterance);
  } catch (err) {
    console.debug("Web Speech fallback error:", err);
  }
}

/**
 * Attempt to play the welcome voice greeting
 */
export function playWelcomeVoice(): void {
  if (isSessionAlreadyPlayed()) {
    return;
  }

  if (typeof window === "undefined") {
    return;
  }

  // Use natural Bengali voice audio file
  try {
    if (currentAudio) {
      try {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      } catch {}
    }

    const audio = new Audio();
    currentAudio = audio;
    audio.src = AUDIO_SRC_MP3;
    audio.volume = 1.0;
    audio.preload = "auto";

    audio.onplaying = () => {
      markSessionAsPlayed();
    };

    audio.onerror = () => {
      // If MP3 fails, try WAV fallback, then Web Speech
      if (audio.src.endsWith(".mp3")) {
        audio.src = AUDIO_SRC_WAV;
        audio.play().catch(() => {
          speakWithWebSpeech();
        });
      } else {
        speakWithWebSpeech();
      }
    };

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          markSessionAsPlayed();
        })
        .catch((err) => {
          // Autoplay blocked by browser policy; user interaction listeners will trigger it
          console.debug("Autoplay restricted by browser, queued for first user interaction:", err);
        });
    }
  } catch (err) {
    console.debug("Audio play attempt error, trying Web Speech:", err);
    speakWithWebSpeech();
  }
}

/**
 * Initialize welcome voice on app startup.
 * Automatically tries to play immediately; if blocked by browser autoplay policy,
 * seamlessly plays on the user's first tap, click, or keypress.
 */
export function initVoiceWelcome(): void {
  if (typeof window === "undefined") return;

  // Already played in this session? Do nothing.
  if (isSessionAlreadyPlayed()) {
    return;
  }

  if (isInitialized) return;
  isInitialized = true;

  const handleFirstInteraction = () => {
    cleanupListeners();
    if (!isSessionAlreadyPlayed()) {
      playWelcomeVoice();
    }
  };

  const cleanupListeners = () => {
    window.removeEventListener("click", handleFirstInteraction, true);
    window.removeEventListener("touchstart", handleFirstInteraction, true);
    window.removeEventListener("pointerdown", handleFirstInteraction, true);
    window.removeEventListener("keydown", handleFirstInteraction, true);
    document.removeEventListener("click", handleFirstInteraction, true);
  };

  // Listen for the first user interaction in case autoplay is blocked
  window.addEventListener("click", handleFirstInteraction, { once: true, capture: true });
  window.addEventListener("touchstart", handleFirstInteraction, { once: true, capture: true, passive: true });
  window.addEventListener("pointerdown", handleFirstInteraction, { once: true, capture: true, passive: true });
  window.addEventListener("keydown", handleFirstInteraction, { once: true, capture: true, passive: true });
  document.addEventListener("click", handleFirstInteraction, { once: true, capture: true });

  // Attempt to play automatically when the app loads (short 350ms delay for smooth DOM mount)
  setTimeout(() => {
    if (!isSessionAlreadyPlayed()) {
      playWelcomeVoice();
    }
  }, 350);
}
