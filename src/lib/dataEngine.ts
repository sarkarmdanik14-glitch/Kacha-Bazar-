/**
 * Data Engine Switch Manager (Supabase <-> Firebase Toggle)
 * Allows seamlessly toggling between Pure Supabase (PostgreSQL + R2) and Legacy Firebase (Firestore + Storage)
 * with zero downtime, instant rollback, and real-time state synchronization.
 */

export type DataEngineMode = "supabase" | "firebase";

const STORAGE_KEY = "kb_data_engine_mode";
const EVENT_NAME = "kb-data-engine-changed";

// Default to Supabase as requested, with instant fallback to Firebase available via toggle
let currentMode: DataEngineMode = (() => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "supabase" || saved === "firebase") {
      return saved;
    }
  } catch {}
  return "supabase";
})();

/**
 * Get current active data engine mode ("supabase" | "firebase")
 */
export function getDataEngineMode(): DataEngineMode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "supabase" || saved === "firebase") {
      currentMode = saved;
    }
  } catch {}
  return currentMode;
}

/**
 * Set active data engine mode ("supabase" | "firebase")
 * Persists to localStorage and notifies all running components across tabs
 */
export function setDataEngineMode(mode: DataEngineMode): void {
  currentMode = mode;
  try {
    localStorage.setItem(STORAGE_KEY, mode);
    sessionStorage.setItem(STORAGE_KEY, mode);
  } catch {}

  // Dispatch custom event to notify all listening components
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { mode } }));
  }

  // Also notify server in background
  try {
    fetch("/api/engine/mode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode })
    }).catch(() => {});
  } catch {}
}

/**
 * Check if Supabase Engine is currently active
 */
export function isSupabaseEngineActive(): boolean {
  return getDataEngineMode() === "supabase";
}

/**
 * Check if Firebase Engine is currently active
 */
export function isFirebaseEngineActive(): boolean {
  return getDataEngineMode() === "firebase";
}

/**
 * Subscribe to data engine changes in real-time
 */
export function subscribeToEngineMode(callback: (mode: DataEngineMode) => void): () => void {
  const handler = (e: Event) => {
    const customEvent = e as CustomEvent<{ mode: DataEngineMode }>;
    if (customEvent?.detail?.mode) {
      callback(customEvent.detail.mode);
    } else {
      callback(getDataEngineMode());
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener(EVENT_NAME, handler);
    window.addEventListener("storage", (e) => {
      if (e.key === STORAGE_KEY) {
        callback(getDataEngineMode());
      }
    });
  }

  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener(EVENT_NAME, handler);
    }
  };
}
