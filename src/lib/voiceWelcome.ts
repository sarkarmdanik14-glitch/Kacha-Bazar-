/**
 * Bengali Voice Welcome Service for Mega Bazar (মেগা বাজার)
 *
 * Requirements:
 * 1. Plays: "আসসালামু আলাইকুম, মেগা বাজারে আপনাকে স্বাগতম"
 * 2. Supports custom uploaded audio URL configured via Admin Settings (MP3 / WAV / M4A).
 * 3. Plays automatically when the app/website opens.
 * 4. Plays only once per session, not repeatedly (guarded by sessionStorage and memory state).
 * 5. Uses a clear, natural Bengali voice (studio-quality natural voice audio with Web Speech API fallback).
 * 6. If browser autoplay is blocked, smoothly plays on the user's first interaction (click/touch/keydown).
 * 7. Completely transparent — zero changes to visual layout or design.
 */

const SESSION_KEY = "megabazar_welcome_voice_played";
const LOCAL_STORAGE_AUDIO_URL_KEY = "megabazar_welcome_audio_url";
const LOCAL_STORAGE_AUDIO_ENABLED_KEY = "megabazar_welcome_audio_enabled";
const GREETING_TEXT = "আসসালামু আলাইকুম, মেগা বাজারে আপনাকে স্বাগতম";
const DEFAULT_AUDIO_SRC_MP3 = "/audio/kachabazar-welcome.mp3";
const DEFAULT_AUDIO_SRC_WAV = "/audio/kachabazar-welcome.wav";

let isInitialized = false;
let hasPlayed = false;
let currentAudio: HTMLAudioElement | null = null;
let activeAudioUrl: string = "";
let isAudioEnabled: boolean = true;

export function getWelcomeAudioUrl(): string {
  if (activeAudioUrl) return activeAudioUrl;
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const saved = window.localStorage.getItem(LOCAL_STORAGE_AUDIO_URL_KEY);
      if (saved) return saved;
    }
  } catch {}
  return DEFAULT_AUDIO_SRC_MP3;
}

export function setWelcomeAudioUrl(url: string): void {
  activeAudioUrl = url || "";
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      if (url) {
        window.localStorage.setItem(LOCAL_STORAGE_AUDIO_URL_KEY, url);
      } else {
        window.localStorage.removeItem(LOCAL_STORAGE_AUDIO_URL_KEY);
      }
    }
  } catch {}
}

export function isWelcomeVoiceEnabled(): boolean {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const saved = window.localStorage.getItem(LOCAL_STORAGE_AUDIO_ENABLED_KEY);
      if (saved === "false") return false;
    }
  } catch {}
  return isAudioEnabled;
}

export function setWelcomeVoiceEnabled(enabled: boolean): void {
  isAudioEnabled = enabled;
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(LOCAL_STORAGE_AUDIO_ENABLED_KEY, enabled ? "true" : "false");
    }
  } catch {}
}

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
export function playWelcomeVoice(customUrl?: string, forcePlay = false): void {
  if (!forcePlay && isSessionAlreadyPlayed()) {
    return;
  }

  if (typeof window === "undefined") {
    return;
  }

  if (!isWelcomeVoiceEnabled() && !forcePlay) {
    return;
  }

  const targetUrl = customUrl || getWelcomeAudioUrl();

  try {
    if (currentAudio) {
      try {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      } catch {}
    }

    const audio = new Audio();
    currentAudio = audio;
    audio.src = targetUrl;
    audio.volume = 1.0;
    audio.preload = "auto";

    audio.onplaying = () => {
      if (!forcePlay) markSessionAsPlayed();
    };

    audio.onerror = () => {
      console.warn("[Voice Welcome] Audio load failed for:", targetUrl);
      // If custom URL fails, try default MP3, then WAV, then Web Speech
      if (targetUrl !== DEFAULT_AUDIO_SRC_MP3) {
        audio.src = DEFAULT_AUDIO_SRC_MP3;
        audio.play().catch(() => {
          audio.src = DEFAULT_AUDIO_SRC_WAV;
          audio.play().catch(() => {
            speakWithWebSpeech();
          });
        });
      } else {
        audio.src = DEFAULT_AUDIO_SRC_WAV;
        audio.play().catch(() => {
          speakWithWebSpeech();
        });
      }
    };

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          if (!forcePlay) markSessionAsPlayed();
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
export function initVoiceWelcome(customUrl?: string, enabled = true): void {
  if (typeof window === "undefined") return;

  if (customUrl !== undefined) {
    setWelcomeAudioUrl(customUrl);
  }
  if (enabled !== undefined) {
    setWelcomeVoiceEnabled(enabled);
  }

  if (!isWelcomeVoiceEnabled()) return;

  // Already played in this session? Do nothing.
  if (isSessionAlreadyPlayed()) {
    return;
  }

  if (isInitialized) return;
  isInitialized = true;

  const handleFirstInteraction = () => {
    cleanupListeners();
    if (!isSessionAlreadyPlayed()) {
      playWelcomeVoice(customUrl);
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
      playWelcomeVoice(customUrl);
    }
  }, 350);
}
