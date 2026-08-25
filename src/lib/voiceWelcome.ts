/**
 * Voice Welcome Service for Kacha Bazar
 * Plays a polite, clear greeting: "আসসালামু আলাইকুম, কাঁচা বাজারে আপনাকে স্বাগতম।"
 * once per session. Handles browser autoplay restrictions gracefully with one-time user interaction fallback.
 */

const SESSION_KEY = "kachabazar_welcome_voice_played";
const GREETING_TEXT = "আসসালামু আলাইকুম, কাঁচা বাজারে আপনাকে স্বাগতম।";

let isInitialized = false;

export function initVoiceWelcome(): void {
  // Prevent duplicate execution
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return;
  }

  try {
    if (sessionStorage.getItem(SESSION_KEY) === "true") {
      return;
    }
  } catch (err) {
    console.warn("Session storage access notice in voice welcome:", err);
  }

  if (isInitialized) return;
  isInitialized = true;

  let hasSpoken = false;

  const playGreeting = () => {
    if (hasSpoken) return;

    try {
      if (sessionStorage.getItem(SESSION_KEY) === "true") {
        hasSpoken = true;
        cleanupListeners();
        return;
      }
    } catch {}

    const synth = window.speechSynthesis;
    if (!synth) return;

    // Cancel any stuck utterance
    try {
      synth.cancel();
    } catch {}

    const utterance = new SpeechSynthesisUtterance(GREETING_TEXT);
    utterance.lang = "bn-BD";
    utterance.rate = 0.92;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Pick best available Bengali or natural voice
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
      hasSpoken = true;
      try {
        sessionStorage.setItem(SESSION_KEY, "true");
      } catch {}
      cleanupListeners();
    };

    utterance.onerror = (e) => {
      // If error occurred because of autoplay restrictions, user interaction listeners will catch it
      if (e.error === "not-allowed" || e.error === "interrupted") {
        // Wait for user gesture
      } else {
        hasSpoken = true;
        try {
          sessionStorage.setItem(SESSION_KEY, "true");
        } catch {}
        cleanupListeners();
      }
    };

    utterance.onend = () => {
      hasSpoken = true;
      try {
        sessionStorage.setItem(SESSION_KEY, "true");
      } catch {}
      cleanupListeners();
    };

    try {
      synth.speak(utterance);
    } catch (err) {
      console.warn("Speech synthesis initial attempt notice:", err);
    }
  };

  const handleUserInteraction = () => {
    if (!hasSpoken) {
      playGreeting();
    }
  };

  const cleanupListeners = () => {
    window.removeEventListener("click", handleUserInteraction);
    window.removeEventListener("touchstart", handleUserInteraction);
    window.removeEventListener("keydown", handleUserInteraction);
    window.removeEventListener("pointerdown", handleUserInteraction);
  };

  // Add one-time user gesture listeners in case autoplay policy blocks initial speech
  window.addEventListener("click", handleUserInteraction, { passive: true });
  window.addEventListener("touchstart", handleUserInteraction, { passive: true });
  window.addEventListener("keydown", handleUserInteraction, { passive: true });
  window.addEventListener("pointerdown", handleUserInteraction, { passive: true });

  // Attempt speech synthesis as soon as voices are loaded or after a micro delay
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = () => {
      playGreeting();
    };
  }

  // Also attempt immediately after slight delay (300ms) to allow page hydration
  setTimeout(() => {
    playGreeting();
  }, 400);
}
