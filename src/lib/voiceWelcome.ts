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

let isInitialized = false;
let hasPlayed = false;
let currentAudio: HTMLAudioElement | null = null;
let activeAudioUrl: string = "";
let isAudioEnabled: boolean = false; // Default voice disabled unless explicit custom URL is provided

export function getWelcomeAudioUrl(): string {
  if (activeAudioUrl && activeAudioUrl.trim()) return activeAudioUrl.trim();
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const saved = window.localStorage.getItem(LOCAL_STORAGE_AUDIO_URL_KEY);
      if (saved && saved.trim()) return saved.trim();
    }
  } catch {}
  // Default welcome voice is completely disabled; returns empty string if no custom URL is configured
  return "";
}

export function setWelcomeAudioUrl(url: string): void {
  activeAudioUrl = (url || "").trim();
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      if (activeAudioUrl) {
        window.localStorage.setItem(LOCAL_STORAGE_AUDIO_URL_KEY, activeAudioUrl);
      } else {
        window.localStorage.removeItem(LOCAL_STORAGE_AUDIO_URL_KEY);
      }
    }
  } catch {}
}

export function isWelcomeVoiceEnabled(): boolean {
  // If no audio URL is provided, voice greeting is always inactive (default voice OFF)
  const url = getWelcomeAudioUrl();
  if (!url) return false;

  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const saved = window.localStorage.getItem(LOCAL_STORAGE_AUDIO_ENABLED_KEY);
      if (saved === "false") return false;
      if (saved === "true") return true;
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

export function stopWelcomeVoice(): void {
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch {}
  }
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
 * Attempt to play the welcome voice greeting
 * Only plays the user-configured custom audio URL. If no URL is provided, nothing is played.
 */
export function playWelcomeVoice(customUrl?: string, forcePlay = false): void {
  const targetUrl = (customUrl !== undefined ? customUrl : getWelcomeAudioUrl()).trim();

  // If no audio URL is configured, default voice is OFF - do nothing
  if (!targetUrl) {
    return;
  }

  if (!forcePlay && isSessionAlreadyPlayed()) {
    return;
  }

  if (typeof window === "undefined") {
    return;
  }

  if (!forcePlay && !isWelcomeVoiceEnabled()) {
    return;
  }

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
      console.warn("[Voice Welcome] Custom audio load failed for URL:", targetUrl);
      // Stay silent; do not play default audio or synthetic voices
    };

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          if (!forcePlay) markSessionAsPlayed();
        })
        .catch((err) => {
          // Autoplay blocked by browser policy; user interaction listeners will trigger it
          console.debug("Autoplay restricted by browser, waiting for user interaction:", err);
        });
    }
  } catch (err) {
    console.debug("Audio play attempt error:", err);
  }
}

/**
 * Initialize welcome voice on app startup.
 * Automatically tries to play the configured custom audio URL; if blocked by browser autoplay policy,
 * seamlessly plays on the user's first tap, click, or keypress.
 * If no custom audio URL is set, does nothing (default voice is OFF).
 */
export function initVoiceWelcome(customUrl?: string, enabled?: boolean): void {
  if (typeof window === "undefined") return;

  if (customUrl !== undefined) {
    setWelcomeAudioUrl(customUrl);
  }
  if (enabled !== undefined) {
    setWelcomeVoiceEnabled(enabled);
  }

  const targetUrl = getWelcomeAudioUrl();
  if (!targetUrl || !isWelcomeVoiceEnabled()) {
    // Default welcome voice is OFF; do not attach listeners or play anything
    return;
  }

  // Already played in this session? Do nothing.
  if (isSessionAlreadyPlayed()) {
    return;
  }

  if (isInitialized) return;
  isInitialized = true;

  const handleFirstInteraction = () => {
    cleanupListeners();
    if (!isSessionAlreadyPlayed()) {
      playWelcomeVoice(targetUrl);
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
      playWelcomeVoice(targetUrl);
    }
  }, 350);
}
