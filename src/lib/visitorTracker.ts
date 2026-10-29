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
import { supabase } from "./supabase";
import { apiClient } from "./apiClient";
import { isPureSupabase } from "./dataEngine";

export interface VisitorAnalyticsData {
  todayViews: number;
  liveNow: number;
  todayUniqueVisitors: number;
  date: string;
  loading: boolean;
  error: string | null;
  devices?: {
    mobile: number;
    desktop: number;
  };
  activePages?: Record<string, number>;
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
  private presenceChannel: any = null;

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

    // Start periodic heartbeat (every 30 seconds)
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
    }, 30000);
  }

  private trackPresence() {
    try {
      const isMobile = typeof navigator !== "undefined" && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
      const page = typeof window !== "undefined" ? window.location.pathname || "/" : "/";

      if (!this.presenceChannel) {
        this.presenceChannel = supabase.channel("kb_live_presence", {
          config: { presence: { key: this.visitorId } },
        });
        this.presenceChannel.subscribe(async (status: string) => {
          if (status === "SUBSCRIBED") {
            await this.presenceChannel.track({
              device: isMobile ? "mobile" : "desktop",
              page,
              visitorId: this.visitorId,
              onlineAt: Date.now(),
            });
          }
        });
      } else {
        this.presenceChannel.track({
          device: isMobile ? "mobile" : "desktop",
          page,
          visitorId: this.visitorId,
          onlineAt: Date.now(),
        }).catch(() => {});
      }
    } catch (e) {
      // non-blocking
    }
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

    // 1. Authoritative Supabase Synchronize (Direct Client-Side, Works on Custom Domains)
    try {
      this.trackPresence();

      // Upsert into Supabase visitor_sessions table
      (async () => {
        try {
          await supabase
            .from("visitor_sessions")
            .upsert({
              id: this.visitorId,
              visitor_id: this.visitorId,
              user_agent: typeof navigator !== "undefined" ? (navigator.userAgent || "").slice(0, 150) : "",
              page_views: 1,
              country: "Bangladesh",
              last_seen_at: new Date().toISOString(),
            }, { onConflict: "id" });
        } catch {
          // ignore
        }
      })();

      // Upsert / Increment Supabase analytics_daily table
      (async () => {
        try {
          const { data: existingRow } = await supabase
            .from("analytics_daily")
            .select("*")
            .eq("date", today)
            .maybeSingle();

          if (existingRow) {
            const currentViews = Number(existingRow.total_page_views) || 0;
            const currentUnique = Number(existingRow.unique_visitors) || 0;
            const newViews = currentViews + (isNewView ? 1 : 0);
            const newUnique = currentUnique + (isNewUnique ? 1 : 0);
            if (isNewView || isNewUnique) {
              await supabase
                .from("analytics_daily")
                .update({
                  total_page_views: newViews,
                  unique_visitors: newUnique,
                  updated_at: new Date().toISOString(),
                })
                .eq("date", today);
            }
          } else {
            await supabase
              .from("analytics_daily")
              .insert({
                date: today,
                total_page_views: 1,
                unique_visitors: 1,
                updated_at: new Date().toISOString(),
              });
          }
        } catch {
          // ignore
        }
      })();
    } catch (e) {
      // Non-blocking
    }

    // 2. Secondary Backend Server API (for full-stack dev / Node environments)
    try {
      const page = typeof window !== "undefined" ? (window.location.pathname || "/") : "/";
      const device = typeof navigator !== "undefined" && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
        ? "mobile"
        : "desktop";

      apiClient.post("/api/analytics/heartbeat", {
        visitorId: this.visitorId,
        sessionId: this.sessionId,
        isNewView,
        isNewUnique,
        dhakaDate: today,
        page,
        device,
      }, { skipAuth: true, silent: true }).catch(() => {});
    } catch (e) {
      // ignore
    }
  }

  private sendHeartbeat() {
    const today = getDhakaDateString();

    // Check if day rolled over to 12:00 AM local time
    if (today !== this.currentDhakaDate) {
      this.currentDhakaDate = today;
      this.recordVisit();
      return;
    }

    // 1. Supabase visitor session heartbeat & presence
    try {
      this.trackPresence();
      (async () => {
        try {
          await supabase
            .from("visitor_sessions")
            .upsert({
              id: this.visitorId,
              visitor_id: this.visitorId,
              last_seen_at: new Date().toISOString(),
            }, { onConflict: "id" });
        } catch {
          // ignore
        }
      })();
    } catch (e) {
      // ignore
    }

    // 2. Secondary Server API heartbeat
    try {
      const page = typeof window !== "undefined" ? (window.location.pathname || "/") : "/";
      const device = typeof navigator !== "undefined" && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
        ? "mobile"
        : "desktop";

      apiClient.post("/api/analytics/heartbeat", {
        visitorId: this.visitorId,
        sessionId: this.sessionId,
        isNewView: false,
        isNewUnique: false,
        dhakaDate: today,
        page,
        device,
      }, { skipAuth: true, silent: true }).catch(() => {});
    } catch (e) {
      // ignore
    }
  }

  private notifyLeave() {
    if (this.presenceChannel) {
      try {
        this.presenceChannel.untrack().catch(() => {});
      } catch (e) {}
    }

    // Beacon to server if available
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
    if (this.presenceChannel) {
      try {
        this.presenceChannel.unsubscribe();
        this.presenceChannel = null;
      } catch (e) {}
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
  let latestViews = 1;
  let latestUnique = 1;
  let latestLive = 1;
  let latestDevices = { mobile: 0, desktop: 1 };
  let latestActivePages: Record<string, number> = { "/admin": 1 };
  let localFilterTimer: any = null;
  let serverPollingTimer: any = null;
  let presenceChannel: any = null;
  let realtimeTableChannel: any = null;

  // Track last emitted values to eliminate duplicate re-renders
  let lastEmitted = {
    todayViews: -1,
    liveNow: -1,
    todayUniqueVisitors: -1,
    date: "",
    loading: true,
  };

  const emit = () => {
    if (!isMounted) return;
    const views = Math.max(1, latestViews);
    const unique = Math.max(1, latestUnique);
    const live = Math.max(1, latestLive);

    if (
      lastEmitted.todayViews === views &&
      lastEmitted.liveNow === live &&
      lastEmitted.todayUniqueVisitors === unique &&
      lastEmitted.date === todayDate &&
      lastEmitted.loading === false
    ) {
      return;
    }

    lastEmitted = {
      todayViews: views,
      liveNow: live,
      todayUniqueVisitors: unique,
      date: todayDate,
      loading: false,
    };

    onUpdate({
      todayViews: views,
      liveNow: live,
      todayUniqueVisitors: unique,
      date: todayDate,
      loading: false,
      error: null,
      devices: latestDevices,
      activePages: latestActivePages,
    });
  };

  // Initial state immediately shows current active visitor (at least 1 - the admin viewing it)
  onUpdate({
    todayViews: 1,
    liveNow: 1,
    todayUniqueVisitors: 1,
    date: todayDate,
    loading: false,
    error: null,
    devices: { mobile: 0, desktop: 1 },
    activePages: { "/admin": 1 },
  });

  // 1. Authoritative Supabase Database Query (Pure client-side, zero server dependency)
  const fetchSupabaseStats = async () => {
    if (!isMounted) return;
    try {
      const today = getDhakaDateString();
      todayDate = today;

      // Query analytics_daily from Supabase
      const { data: dailyRow } = await supabase
        .from("analytics_daily")
        .select("*")
        .eq("date", today)
        .maybeSingle();

      if (dailyRow) {
        latestViews = Math.max(latestViews, Number(dailyRow.total_page_views) || 1);
        latestUnique = Math.max(latestUnique, Number(dailyRow.unique_visitors) || 1);
      }

      // Query active visitor sessions from Supabase (last 3 minutes)
      const cutoff = new Date(Date.now() - LIVE_ACTIVITY_THRESHOLD_MS).toISOString();
      const { count: activeCount } = await supabase
        .from("visitor_sessions")
        .select("*", { count: "exact", head: true })
        .gte("last_seen_at", cutoff);

      if (typeof activeCount === "number" && activeCount > 0) {
        latestLive = Math.max(latestLive, activeCount);
      } else {
        latestLive = Math.max(latestLive, 1);
      }

      emit();
    } catch (err) {
      emit();
    }
  };

  // 2. Realtime presence subscription via Supabase Channel
  try {
    presenceChannel = supabase.channel("kb_live_presence_admin", {
      config: { presence: { key: "admin_hub" } },
    });

    presenceChannel
      .on("presence", { event: "sync" }, () => {
        if (!isMounted) return;
        try {
          const state = presenceChannel.presenceState();
          const keys = Object.keys(state).filter((k) => k !== "admin_hub");
          let mobile = 0;
          let desktop = 0;
          for (const k of keys) {
            const list = (state[k] || []) as any[];
            const p = list[0];
            if (p?.device === "mobile") mobile++;
            else desktop++;
          }
          const liveCount = Math.max(keys.length, 1);
          latestLive = Math.max(latestLive, liveCount);
          latestDevices = {
            mobile,
            desktop: Math.max(1, desktop),
          };
          emit();
        } catch (e) {
          emit();
        }
      })
      .subscribe();
  } catch (e) {
    // ignore
  }

  // 3. Realtime table subscription on Supabase analytics_daily
  try {
    realtimeTableChannel = supabase
      .channel(`kb_analytics_changes_${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "analytics_daily" },
        (payload) => {
          if (!isMounted) return;
          const row = payload.new as any;
          if (row) {
            latestViews = Math.max(latestViews, Number(row.total_page_views) || 1);
            latestUnique = Math.max(latestUnique, Number(row.unique_visitors) || 1);
            emit();
          }
        }
      )
      .subscribe();
  } catch (e) {
    // ignore
  }

  // 4. Secondary Server API polling (for dev server / local environment)
  const fetchServerStats = async () => {
    try {
      const json = await apiClient.get<any>("/api/analytics/stats", { skipAuth: true, silent: true });
      if (!isMounted) return;
      if (json && typeof json === "object" && typeof json.todayViews === "number") {
        if (json.date) todayDate = json.date;
        latestViews = Math.max(latestViews, Number(json.todayViews) || 1);
        latestUnique = Math.max(latestUnique, Number(json.todayUniqueVisitors) || 1);
        const live = Math.max(1, Number(json.liveNow) || 1);
        latestLive = Math.max(latestLive, live);

        if (json.devices && typeof json.devices === "object") {
          latestDevices = json.devices;
        }
        if (json.activePages && typeof json.activePages === "object") {
          latestActivePages = json.activePages;
        }
        emit();
        return;
      }
    } catch (e) {
      // ignore
    }
    // If server API is not available (e.g. on custom domain / static hosting), rely on Supabase
    fetchSupabaseStats();
  };

  // Run initial fetch
  fetchSupabaseStats();
  fetchServerStats();

  // Periodic polling every 8 seconds to ensure data is always fresh
  serverPollingTimer = setInterval(() => {
    fetchSupabaseStats();
  }, 8000);

  return () => {
    isMounted = false;
    if (serverPollingTimer) clearInterval(serverPollingTimer);
    if (localFilterTimer) clearInterval(localFilterTimer);
    if (presenceChannel) {
      try {
        presenceChannel.unsubscribe();
      } catch (e) {}
    }
    if (realtimeTableChannel) {
      try {
        realtimeTableChannel.unsubscribe();
      } catch (e) {}
    }
  };
}

// Force a manual instant sync from Supabase & Server
export async function forceRefreshVisitorStats(): Promise<VisitorAnalyticsData | null> {
  const today = getDhakaDateString();
  try {
    // 1. Fetch from Supabase
    const { data: row } = await supabase
      .from("analytics_daily")
      .select("*")
      .eq("date", today)
      .maybeSingle();

    const cutoff = new Date(Date.now() - LIVE_ACTIVITY_THRESHOLD_MS).toISOString();
    const { count: activeCount } = await supabase
      .from("visitor_sessions")
      .select("*", { count: "exact", head: true })
      .gte("last_seen_at", cutoff);

    const views = Math.max(1, Number(row?.total_page_views) || 1);
    const unique = Math.max(1, Number(row?.unique_visitors) || 1);
    const live = Math.max(1, Number(activeCount) || 1);

    return {
      todayViews: views,
      liveNow: live,
      todayUniqueVisitors: unique,
      date: today,
      loading: false,
      error: null,
      devices: { mobile: 0, desktop: live },
      activePages: { "/admin": 1 },
    };
  } catch (e) {
    return {
      todayViews: 1,
      liveNow: 1,
      todayUniqueVisitors: 1,
      date: today,
      loading: false,
      error: null,
      devices: { mobile: 0, desktop: 1 },
      activePages: { "/admin": 1 },
    };
  }
}
