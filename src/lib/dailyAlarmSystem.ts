// Daily Automatic Alarm & Notification System for Kacha Bazar App
// Automatically triggers at 9:00 AM and 9:00 PM daily with custom chime sound and system notifications.

export interface AlarmPayload {
  id: string;
  type: "morning" | "night";
  timeLabel: string;
  title: string;
  message: string;
  timestamp: number;
}

export const ALARM_CONFIG = {
  morning: {
    id: "morning_9am",
    type: "morning" as const,
    targetHour: 9, // 9:00 AM
    targetMinute: 0,
    timeLabel: "9:00 AM",
    title: "কাঁচা বাজার • সকালের অ্যালার্ম (9:00 AM)",
    message: "সুপ্রভাত। কাঁচা বাজারের আজকের কার্যক্রম শুরু করার সময় হয়েছে। অনুগ্রহ করে আপনার দায়িত্বগুলো যাচাই করুন।",
    tag: "kacha-bazar-morning-alarm",
    icon: "/icons/icon-192x192.png",
    badge: "/favicon-32x32.png"
  },
  night: {
    id: "night_9pm",
    type: "night" as const,
    targetHour: 21, // 9:00 PM (21:00)
    targetMinute: 0,
    timeLabel: "9:00 PM",
    title: "কাঁচা বাজার • রাতের অ্যালার্ম (9:00 PM)",
    message: "কাঁচা বাজারের আজকের কার্যক্রম শেষ করার সময় হয়েছে। অনুগ্রহ করে দিনের কাজ ও রিপোর্টগুলো যাচাই করুন।",
    tag: "kacha-bazar-night-alarm",
    icon: "/icons/icon-192x192.png",
    badge: "/favicon-32x32.png"
  }
};

let audioCtxInstance: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (typeof window === "undefined") return null;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!audioCtxInstance || audioCtxInstance.state === "closed") {
      audioCtxInstance = new AudioContextClass();
    }
    if (audioCtxInstance.state === "suspended") {
      audioCtxInstance.resume().catch(() => {});
    }
    return audioCtxInstance;
  } catch (e) {
    console.warn("AudioContext init error:", e);
    return null;
  }
}

/**
 * Play a soothing, crystal-clear melodious notification chime (C5 -> E5 -> G5 -> C6).
 * Pure Web Audio API: 100% offline, zero network requests, ultra lightweight.
 */
export function playNotificationChime(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Harmonic arpeggio notes for a premium pleasant chime
    const notes = [
      { freq: 523.25, time: 0.00, dur: 0.65 }, // C5
      { freq: 659.25, time: 0.16, dur: 0.65 }, // E5
      { freq: 783.99, time: 0.32, dur: 0.70 }, // G5
      { freq: 1046.50, time: 0.48, dur: 1.10 } // C6
    ];

    notes.forEach((note) => {
      const startTime = now + note.time;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Soft blended sine + subtle triangle overtone
      osc.type = "sine";
      osc.frequency.setValueAtTime(note.freq, startTime);

      // Smooth attack and soft exponential release
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(0.25, startTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + note.dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + note.dur + 0.05);
    });
  } catch (err) {
    console.warn("Error playing notification chime:", err);
  }
}

/**
 * Requests notification permission from user only on the first visit.
 * Does not repeatedly prompt if already granted or denied.
 */
export async function requestNotificationPermissionOnce(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }

  // If already decided, return immediately
  if (Notification.permission === "granted" || Notification.permission === "denied") {
    return Notification.permission;
  }

  const hasAsked = localStorage.getItem("kb_daily_alarm_perm_asked");
  if (hasAsked) {
    return Notification.permission;
  }

  try {
    localStorage.setItem("kb_daily_alarm_perm_asked", "true");
    const permission = await Notification.requestPermission();
    return permission;
  } catch (e) {
    console.warn("Error requesting notification permission:", e);
    return "default";
  }
}

// Active listeners for in-app floating banner
type AlarmListener = (payload: AlarmPayload) => void;
const listeners = new Set<AlarmListener>();

export function subscribeToDailyAlarms(callback: AlarmListener): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

/**
 * Trigger an alarm immediately (used by schedule or manual testing)
 */
export async function triggerDailyAlarm(type: "morning" | "night", isManualTest = false): Promise<void> {
  const config = ALARM_CONFIG[type];
  if (!config) return;

  const payload: AlarmPayload = {
    id: `${config.id}_${Date.now()}`,
    type,
    timeLabel: config.timeLabel,
    title: config.title,
    message: config.message,
    timestamp: Date.now()
  };

  // 1. Play soothing chime sound
  playNotificationChime();

  // 2. Broadcast to all active in-app listeners (UI banner/modal)
  listeners.forEach((listener) => {
    try {
      listener(payload);
    } catch (err) {
      console.warn("Listener error:", err);
    }
  });

  // 3. Dispatch standard custom event for external components
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("kacha_bazar_alarm", { detail: payload }));
  }

  // 4. Trigger system / device notification if supported and permitted
  if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
    try {
      const notifOptions: any = {
        body: config.message,
        icon: config.icon,
        badge: config.badge,
        tag: config.tag,
        vibrate: [250, 100, 250, 100, 400],
        requireInteraction: true,
        data: {
          url: "/",
          type: config.type,
          timeLabel: config.timeLabel
        }
      };

      // Try Service Worker showNotification first (shows even when app is backgrounded or PWA)
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration && registration.showNotification) {
          await registration.showNotification(config.title, notifOptions);
        } else {
          new Notification(config.title, notifOptions);
        }
      } else {
        new Notification(config.title, notifOptions);
      }
    } catch (e) {
      console.warn("Could not dispatch system notification:", e);
    }
  }

  // 5. Store last triggered date to prevent double triggers for today
  if (!isManualTest && typeof window !== "undefined") {
    const today = new Date().toISOString().split("T")[0];
    localStorage.setItem(`kb_alarm_triggered_${type}`, today);
  }
}

/**
 * Check if the alarm for the given type has already run today
 */
function hasAlarmRunToday(type: "morning" | "night"): boolean {
  if (typeof window === "undefined") return false;
  const today = new Date().toISOString().split("T")[0];
  const lastRun = localStorage.getItem(`kb_alarm_triggered_${type}`);
  return lastRun === today;
}

let isSystemInitialized = false;
let checkIntervalTimer: any = null;
let nextAlarmTimeout: any = null;

/**
 * Calculates milliseconds until the next 9:00 AM or 9:00 PM
 */
export function getNextAlarmDetails(): { type: "morning" | "night"; msUntil: number; date: Date } {
  const now = new Date();

  // Candidate 1: Today 9:00 AM
  const morningToday = new Date(now);
  morningToday.setHours(ALARM_CONFIG.morning.targetHour, ALARM_CONFIG.morning.targetMinute, 0, 0);

  // Candidate 2: Today 9:00 PM
  const nightToday = new Date(now);
  nightToday.setHours(ALARM_CONFIG.night.targetHour, ALARM_CONFIG.night.targetMinute, 0, 0);

  // Candidate 3: Tomorrow 9:00 AM
  const morningTomorrow = new Date(morningToday);
  morningTomorrow.setDate(morningTomorrow.getDate() + 1);

  if (now.getTime() < morningToday.getTime()) {
    return {
      type: "morning",
      msUntil: morningToday.getTime() - now.getTime(),
      date: morningToday
    };
  } else if (now.getTime() < nightToday.getTime()) {
    return {
      type: "night",
      msUntil: nightToday.getTime() - now.getTime(),
      date: nightToday
    };
  } else {
    return {
      type: "morning",
      msUntil: morningTomorrow.getTime() - now.getTime(),
      date: morningTomorrow
    };
  }
}

/**
 * Schedules the precise next timer and sets repeating heartbeat check.
 */
function scheduleNextAlarm(): void {
  if (nextAlarmTimeout) {
    clearTimeout(nextAlarmTimeout);
  }

  const next = getNextAlarmDetails();
  // Set timeout with safety cap of 24h
  const safeMs = Math.min(next.msUntil, 24 * 60 * 60 * 1000);

  nextAlarmTimeout = setTimeout(() => {
    if (!hasAlarmRunToday(next.type)) {
      triggerDailyAlarm(next.type);
    }
    // Re-schedule for next cycle
    scheduleNextAlarm();
  }, safeMs);
}

/**
 * 30-Second Heartbeat:
 * Handles cases where laptop lid opens, device wakes from sleep, or timezone shifts.
 */
function runHeartbeatCheck(): void {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  // Morning Window: 9:00 AM - 9:30 AM
  if (currentHour === ALARM_CONFIG.morning.targetHour && currentMinute >= 0 && currentMinute <= 30) {
    if (!hasAlarmRunToday("morning")) {
      triggerDailyAlarm("morning");
    }
  }

  // Night Window: 9:00 PM - 9:30 PM (21:00 - 21:30)
  if (currentHour === ALARM_CONFIG.night.targetHour && currentMinute >= 0 && currentMinute <= 30) {
    if (!hasAlarmRunToday("night")) {
      triggerDailyAlarm("night");
    }
  }
}

/**
 * Initializes the entire Daily Automatic Alarm & Notification System.
 * Call this once inside App root useEffect.
 */
export function initDailyAlarmSystem(): () => void {
  if (typeof window === "undefined" || isSystemInitialized) {
    return () => {};
  }
  isSystemInitialized = true;

  // 1. First-time permission prompt (with user gesture listener or fallback timeout)
  const askPermissionOnFirstInteraction = () => {
    requestNotificationPermissionOnce();
    window.removeEventListener("click", askPermissionOnFirstInteraction);
    window.removeEventListener("touchstart", askPermissionOnFirstInteraction);
  };

  window.addEventListener("click", askPermissionOnFirstInteraction, { once: true });
  window.addEventListener("touchstart", askPermissionOnFirstInteraction, { once: true });

  // In case user doesn't click immediately, check after 4s
  setTimeout(() => {
    requestNotificationPermissionOnce();
  }, 4000);

  // 2. Schedule exact next occurrence
  scheduleNextAlarm();

  // 3. Start 30-second heartbeat check
  runHeartbeatCheck();
  checkIntervalTimer = setInterval(runHeartbeatCheck, 30000);

  // Return cleanup function
  return () => {
    if (nextAlarmTimeout) clearTimeout(nextAlarmTimeout);
    if (checkIntervalTimer) clearInterval(checkIntervalTimer);
    isSystemInitialized = false;
  };
}
