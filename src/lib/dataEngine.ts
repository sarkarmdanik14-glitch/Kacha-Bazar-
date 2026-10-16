/**
 * Data Engine Switch Manager (Supabase <-> Firebase ON/OFF Toggle)
 * Allows seamlessly toggling between:
 *  1. Pure Supabase (PostgreSQL + Cloudflare R2) - 100% Supabase Test Mode
 *  2. Dual Sync (Hybrid Mode) - Supabase Primary with Live Firebase Dual-Sync & Fallback
 *  3. Pure Firebase (Firestore + Storage) - Legacy Fallback Mode
 * 
 * Provides zero downtime, 1-click instant rollback, and real-time state synchronization
 * across the entire application and dev server.
 */

export type DataEngineMode = "supabase" | "dual" | "firebase";

const STORAGE_KEY = "kb_data_engine_mode";
const EVENT_NAME = "kb-data-engine-changed";

// Default to "dual" or saved mode to guarantee zero disruption while testing
let currentMode: DataEngineMode = (() => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "supabase" || saved === "dual" || saved === "firebase") {
      return saved as DataEngineMode;
    }
  } catch {}
  return "dual";
})();

/**
 * Get current active data engine mode ("supabase" | "dual" | "firebase")
 */
export function getDataEngineMode(): DataEngineMode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "supabase" || saved === "dual" || saved === "firebase") {
      currentMode = saved as DataEngineMode;
    }
  } catch {}
  return currentMode;
}

/**
 * Set active data engine mode ("supabase" | "dual" | "firebase")
 * Persists to localStorage, notifies all running components across tabs, and synchronizes with server
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

  // Synchronize server-side engine mode in background
  try {
    fetch("/api/engine/mode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode })
    }).catch(() => {});
  } catch {}
}

/**
 * Check if Supabase is active (primary in "supabase" or "dual" modes)
 */
export function isSupabasePrimary(): boolean {
  const m = getDataEngineMode();
  return m === "supabase" || m === "dual";
}

/**
 * Check if Pure Supabase test mode is active (100% Supabase, zero Firebase)
 */
export function isPureSupabase(): boolean {
  return getDataEngineMode() === "supabase";
}

/**
 * Check if Dual Sync / Hybrid mode is active
 */
export function isDualMode(): boolean {
  return getDataEngineMode() === "dual";
}

/**
 * Check if Firebase fallback is enabled (active in "firebase" and "dual" modes)
 */
export function isFirebaseEnabled(): boolean {
  const m = getDataEngineMode();
  return m === "firebase" || m === "dual";
}

/**
 * Legacy compatibility aliases
 */
export const isSupabaseEngineActive = isSupabasePrimary;
export const isFirebaseEngineActive = () => getDataEngineMode() === "firebase";

/**
 * Subscribe to data engine mode changes in real-time
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

/**
 * Initialize engine mode from server on startup
 */
export async function initEngineModeFromServer(): Promise<DataEngineMode> {
  try {
    const res = await fetch("/api/engine/mode");
    if (res.ok) {
      const data = await res.json();
      if (data?.mode && (data.mode === "supabase" || data.mode === "dual" || data.mode === "firebase")) {
        const serverMode = data.mode as DataEngineMode;
        // Keep local if user explicitly set it, or sync with server
        const local = localStorage.getItem(STORAGE_KEY);
        if (!local) {
          setDataEngineMode(serverMode);
        }
        return getDataEngineMode();
      }
    }
  } catch {}
  return getDataEngineMode();
}
