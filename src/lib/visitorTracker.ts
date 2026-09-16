import { 
  db, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  onSnapshot, 
  increment, 
  serverTimestamp 
} from "./firebase";

export interface VisitorAnalyticsData {
  todayViews: number;
  liveNow: number;
  todayUniqueVisitors: number;
  date: string;
  loading: boolean;
  error: string | null;
}

// Bangladesh Timezone: Asia/Dhaka (UTC+6)
export function getDhakaDateString(date: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Dhaka",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(date); // Formats as YYYY-MM-DD
  } catch (e) {
    // Fallback if Intl timeZone is unsupported
    const utc = date.getTime() + date.getTimezoneOffset() * 60000;
    const dhakaTime = new Date(utc + 6 * 3600000);
    return dhakaTime.toISOString().split("T")[0];
  }
}

// Generate or retrieve persistent anonymous visitor ID (safe, zero personal data)
export function getOrCreateVisitorId(): string {
  try {
    const storageKey = "kb_anonymous_visitor_id";
    let id = localStorage.getItem(storageKey);
    if (!id || id.length < 10) {
      const randPart = typeof crypto !== "undefined" && crypto.randomUUID 
        ? crypto.randomUUID().replace(/-/g, "").slice(0, 16) 
        : Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
      id = `vis_${randPart}`;
      localStorage.setItem(storageKey, id);
    }
    return id;
  } catch (e) {
    return "vis_guest_" + Math.random().toString(36).substring(2, 10);
  }
}

// Generate or retrieve current tab session ID
export function getOrCreateSessionId(): string {
  try {
    const sessionKey = "kb_visitor_session_id";
    let id = sessionStorage.getItem(sessionKey);
    if (!id) {
      id = "sess_" + Math.random().toString(36).substring(2, 10) + "_" + Date.now().toString(36);
      sessionStorage.setItem(sessionKey, id);
    }
    return id;
  } catch (e) {
    return "sess_" + Math.random().toString(36).substring(2, 10);
  }
}

// Tab coordination helper to prevent multiple open tabs from multiplying live users
const TAB_ID = Math.random().toString(36).substring(2, 10);
const TABS_STORAGE_KEY = "kb_active_tabs_registry";

function registerTab(): void {
  try {
    const raw = localStorage.getItem(TABS_STORAGE_KEY);
    const tabs: Record<string, number> = raw ? JSON.parse(raw) : {};
    tabs[TAB_ID] = Date.now();
    // Prune stale tabs older than 2 minutes
    const now = Date.now();
    for (const key of Object.keys(tabs)) {
      if (now - tabs[key] > 120000) {
        delete tabs[key];
      }
    }
    localStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(tabs));
  } catch (e) {
    // Ignore storage issues
  }
}

function unregisterTab(): boolean {
  try {
    const raw = localStorage.getItem(TABS_STORAGE_KEY);
    if (!raw) return true;
    const tabs: Record<string, number> = JSON.parse(raw);
    delete tabs[TAB_ID];
    localStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(tabs));
    return Object.keys(tabs).length === 0;
  } catch (e) {
    return true;
  }
}

// Live cutoff: consider user active within 3 minutes (180,000 ms)
export const LIVE_ACTIVITY_THRESHOLD_MS = 180000;

class VisitorTracker {
  private visitorId: string = "";
  private sessionId: string = "";
  private initialized: boolean = false;
  private heartbeatTimer: any = null;
  private lastActivityTime: number = Date.now();
  private isUserActive: boolean = true;
  private currentDhakaDate: string = "";

  public init() {
    if (this.initialized || typeof window === "undefined") return;
    this.initialized = true;

    this.visitorId = getOrCreateVisitorId();
    this.sessionId = getOrCreateSessionId();
    this.currentDhakaDate = getDhakaDateString();
    this.lastActivityTime = Date.now();

    registerTab();

    // Attach user interaction listeners to track activity
    const recordActivity = () => {
      this.lastActivityTime = Date.now();
      if (!this.isUserActive) {
        this.isUserActive = true;
        this.sendHeartbeat();
      }
    };

    window.addEventListener("pointerdown", recordActivity, { passive: true });
    window.addEventListener("keydown", recordActivity, { passive: true });
    window.addEventListener("scroll", recordActivity, { passive: true });
    window.addEventListener("touchstart", recordActivity, { passive: true });

    // Handle visibility changes
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        this.isUserActive = true;
        this.lastActivityTime = Date.now();
        this.sendHeartbeat();
      }
    });

    // Handle tab closing/navigation
    const handleUnload = () => {
      const isLastTab = unregisterTab();
      if (isLastTab) {
        this.notifyLeave();
      }
    };

    window.addEventListener("pagehide", handleUnload);
    window.addEventListener("beforeunload", handleUnload);

    // Initial visit registration
    this.recordVisit();

    // Start periodic heartbeat (every 40 seconds)
    this.heartbeatTimer = setInterval(() => {
      const now = Date.now();
      const inactiveFor = now - this.lastActivityTime;

      // If inactive for more than threshold or page is hidden, mark inactive
      if (inactiveFor > LIVE_ACTIVITY_THRESHOLD_MS || document.visibilityState === "hidden") {
        this.isUserActive = false;
        return;
      }

      registerTab();
      this.sendHeartbeat();
    }, 40000);
  }

  private async recordVisit() {
    const today = getDhakaDateString();
    this.currentDhakaDate = today;

    // Check unique visitor for today
    const uniqueKey = `kb_unique_recorded_${today}`;
    let isNewUnique = false;
    try {
      if (!localStorage.getItem(uniqueKey)) {
        isNewUnique = true;
        localStorage.setItem(uniqueKey, "1");
      }
    } catch (e) {
      // localStorage disabled fallback
    }

    // Check today's view for this session
    const viewKey = `kb_view_recorded_${today}_${this.sessionId}`;
    let isNewView = false;
    try {
      if (!sessionStorage.getItem(viewKey)) {
        isNewView = true;
        sessionStorage.setItem(viewKey, "1");
      }
    } catch (e) {
      // sessionStorage fallback
    }

    // 1. Synchronize to Firestore
    try {
      const dailyRef = doc(db, "analytics_daily", today);
      const updates: any = {
        date: today,
        lastUpdated: serverTimestamp(),
      };
      if (isNewView) {
        updates.views = increment(1);
      }
      if (isNewUnique) {
        updates.uniqueVisitors = increment(1);
      }

      if (isNewView || isNewUnique) {
        setDoc(dailyRef, updates, { merge: true }).catch((err) => {
          console.warn("Firestore daily analytics sync notice:", err?.message || err);
        });
      }

      // Update visitor session
      const sessionRef = doc(db, "visitor_sessions", this.visitorId);
      setDoc(sessionRef, {
        visitorId: this.visitorId,
        lastActive: Date.now(),
        startedAt: Date.now(),
        isOnline: true,
        date: today,
      }, { merge: true }).catch((err) => {
        console.warn("Firestore visitor session sync notice:", err?.message || err);
      });
    } catch (e) {
      console.warn("Could not write visit to Firestore:", e);
    }

    // 2. Synchronize to Backend Server API for persistence & redundancy
    try {
      fetch("/api/analytics/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitorId: this.visitorId,
          sessionId: this.sessionId,
          isNewView,
          isNewUnique,
          dhakaDate: today,
        }),
      }).catch(() => {
        // Silently tolerate if offline
      });
    } catch (e) {
      // ignore
    }
  }

  private sendHeartbeat() {
    const now = Date.now();
    const today = getDhakaDateString();

    // Check if day rolled over to 12:00 AM local time
    if (today !== this.currentDhakaDate) {
      this.currentDhakaDate = today;
      this.recordVisit();
      return;
    }

    // Update Firestore session timestamp
    try {
      const sessionRef = doc(db, "visitor_sessions", this.visitorId);
      setDoc(sessionRef, {
        visitorId: this.visitorId,
        lastActive: now,
        isOnline: true,
        date: today,
      }, { merge: true }).catch(() => {});
    } catch (e) {
      // ignore
    }

    // Update Backend Server API
    try {
      fetch("/api/analytics/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitorId: this.visitorId,
          sessionId: this.sessionId,
          isNewView: false,
          isNewUnique: false,
          dhakaDate: today,
        }),
      }).catch(() => {});
    } catch (e) {
      // ignore
    }
  }

  private notifyLeave() {
    // 1. Direct Firestore session update
    try {
      const sessionRef = doc(db, "visitor_sessions", this.visitorId);
      setDoc(sessionRef, {
        isOnline: false,
        lastActive: Date.now() - LIVE_ACTIVITY_THRESHOLD_MS - 1000,
      }, { merge: true }).catch(() => {});
    } catch (e) {
      // ignore
    }

    // 2. Beacon to server
    try {
      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        const payload = JSON.stringify({ visitorId: this.visitorId });
        navigator.sendBeacon("/api/analytics/leave", new Blob([payload], { type: "application/json" }));
      }
    } catch (e) {
      // ignore
    }
  }

  public destroy() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this.initialized = false;
  }
}

export const visitorTracker = new VisitorTracker();

// Subscribe to real-time analytics for the Admin Dashboard
export function subscribeToVisitorAnalytics(
  onUpdate: (data: VisitorAnalyticsData) => void
): () => void {
  let isMounted = true;
  let todayDate = getDhakaDateString();
  let latestViews = 0;
  let latestUnique = 0;
  let currentSessions: Record<string, { lastActive: number; isOnline: boolean }> = {};
  let unsubscribeDaily: (() => void) | null = null;
  let unsubscribeSessions: (() => void) | null = null;
  let localFilterTimer: any = null;
  let fallbackPollingTimer: any = null;

  const emit = () => {
    if (!isMounted) return;
    const now = Date.now();
    let liveCount = 0;
    for (const [_, s] of Object.entries(currentSessions)) {
      if (s.isOnline !== false && now - s.lastActive <= LIVE_ACTIVITY_THRESHOLD_MS) {
        liveCount++;
      }
    }

    onUpdate({
      todayViews: latestViews,
      liveNow: Math.max(0, liveCount),
      todayUniqueVisitors: latestUnique,
      date: todayDate,
      loading: false,
      error: null,
    });
  };

  // Initial loading state
  onUpdate({
    todayViews: 0,
    liveNow: 0,
    todayUniqueVisitors: 0,
    date: todayDate,
    loading: true,
    error: null,
  });

  const setupFirestoreListeners = () => {
    todayDate = getDhakaDateString();

    // 1. Listen to Today's Daily Stats document
    try {
      const dailyRef = doc(db, "analytics_daily", todayDate);
      unsubscribeDaily = onSnapshot(
        dailyRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            latestViews = Number(data.views) || 0;
            latestUnique = Number(data.uniqueVisitors) || 0;
          } else {
            latestViews = 0;
            latestUnique = 0;
          }
          emit();
        },
        (err) => {
          console.warn("Firestore analytics_daily notice:", err?.message || err);
          fetchServerStatsFallback();
        }
      );
    } catch (err) {
      fetchServerStatsFallback();
    }

    // 2. Listen to Visitor Sessions collection
    try {
      const sessionsColl = collection(db, "visitor_sessions");
      unsubscribeSessions = onSnapshot(
        sessionsColl,
        (snap) => {
          const sessionsMap: Record<string, { lastActive: number; isOnline: boolean }> = {};
          snap.forEach((docSnap) => {
            const d = docSnap.data();
            sessionsMap[docSnap.id] = {
              lastActive: Number(d.lastActive) || 0,
              isOnline: d.isOnline !== false,
            };
          });
          currentSessions = sessionsMap;
          emit();
        },
        (err) => {
          console.warn("Firestore visitor_sessions notice:", err?.message || err);
          fetchServerStatsFallback();
        }
      );
    } catch (err) {
      fetchServerStatsFallback();
    }
  };

  // Fallback / Synchronization with Backend Server API
  const fetchServerStatsFallback = async () => {
    try {
      const res = await fetch("/api/analytics/stats");
      if (res.ok) {
        const json = await res.json();
        if (json.date === todayDate) {
          latestViews = Math.max(latestViews, Number(json.todayViews) || 0);
          latestUnique = Math.max(latestUnique, Number(json.todayUniqueVisitors) || 0);
          if (typeof json.liveNow === "number" && Object.keys(currentSessions).length === 0) {
            onUpdate({
              todayViews: latestViews,
              liveNow: Number(json.liveNow) || 0,
              todayUniqueVisitors: latestUnique,
              date: todayDate,
              loading: false,
              error: null,
            });
            return;
          }
        }
        emit();
      }
    } catch (e) {
      // ignore
    }
  };

  setupFirestoreListeners();
  fetchServerStatsFallback();

  // Local tick timer every 4 seconds to drop expired live sessions automatically
  localFilterTimer = setInterval(() => {
    const currentDay = getDhakaDateString();
    if (currentDay !== todayDate) {
      // Midnight rollover! Reset and reconnect listeners
      todayDate = currentDay;
      latestViews = 0;
      latestUnique = 0;
      if (unsubscribeDaily) unsubscribeDaily();
      if (unsubscribeSessions) unsubscribeSessions();
      setupFirestoreListeners();
    }
    emit();
  }, 4000);

  // Background server sync every 15 seconds
  fallbackPollingTimer = setInterval(fetchServerStatsFallback, 15000);

  return () => {
    isMounted = false;
    if (unsubscribeDaily) unsubscribeDaily();
    if (unsubscribeSessions) unsubscribeSessions();
    if (localFilterTimer) clearInterval(localFilterTimer);
    if (fallbackPollingTimer) clearInterval(fallbackPollingTimer);
  };
}
