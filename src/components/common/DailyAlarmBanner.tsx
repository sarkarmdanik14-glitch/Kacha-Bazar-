import React, { useState, useEffect } from "react";
import { Bell, Volume2, X, Sparkles, Check, Clock } from "lucide-react";
import { 
  subscribeToDailyAlarms, 
  AlarmPayload, 
  playNotificationChime, 
  initDailyAlarmSystem 
} from "../../lib/dailyAlarmSystem";

interface DailyAlarmBannerProps {
  lang?: "bn" | "en";
}

export const DailyAlarmBanner: React.FC<DailyAlarmBannerProps> = ({ lang = "bn" }) => {
  const [activeAlarm, setActiveAlarm] = useState<AlarmPayload | null>(null);
  const [isPlayingSound, setIsPlayingSound] = useState(false);

  // Initialize the daily alarm engine once on mount
  useEffect(() => {
    const cleanup = initDailyAlarmSystem();
    const unsubscribe = subscribeToDailyAlarms((payload) => {
      setActiveAlarm(payload);
    });

    // Also expose to window for testing in console if needed
    (window as any).testKachaBazarAlarm = (type: "morning" | "night") => {
      import("../../lib/dailyAlarmSystem").then(({ triggerDailyAlarm }) => {
        triggerDailyAlarm(type, true);
      });
    };

    return () => {
      cleanup();
      unsubscribe();
    };
  }, []);

  // Auto-dismiss after 45 seconds if left open
  useEffect(() => {
    if (!activeAlarm) return;
    const timer = setTimeout(() => {
      setActiveAlarm(null);
    }, 45000);
    return () => clearTimeout(timer);
  }, [activeAlarm]);

  const handleReplayChime = () => {
    setIsPlayingSound(true);
    playNotificationChime();
    setTimeout(() => setIsPlayingSound(false), 1200);
  };

  if (!activeAlarm) return null;

  const isMorning = activeAlarm.type === "morning";

  return (
    <div
      id="daily-alarm-notification-banner"
      className="fixed top-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-9999 animate-in slide-in-from-top duration-300 pointer-events-auto"
    >
      <div 
        className={`rounded-3xl p-5 shadow-2xl border backdrop-blur-xl transition-all ${
          isMorning 
            ? "bg-gradient-to-br from-amber-500/95 via-orange-600/95 to-amber-700/95 text-white border-amber-300/40 shadow-orange-500/30"
            : "bg-gradient-to-br from-indigo-900/95 via-slate-900/95 to-purple-950/95 text-white border-indigo-400/40 shadow-indigo-950/40"
        }`}
      >
        <div className="flex items-start space-x-3.5">
          {/* Animated Glowing Alarm Bell */}
          <div 
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
              isMorning 
                ? "bg-white/20 text-white border border-white/30 animate-pulse"
                : "bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 animate-pulse"
            }`}
          >
            <Bell className="w-6 h-6 animate-bounce" />
          </div>

          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center space-x-2 mb-1">
              <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full inline-flex items-center space-x-1 ${
                isMorning 
                  ? "bg-white/25 text-white font-bold"
                  : "bg-indigo-400/20 text-indigo-200 border border-indigo-400/30 font-bold"
              }`}>
                <Clock className="w-3 h-3 mr-1 inline" />
                {activeAlarm.timeLabel} • {isMorning ? "সকালের অ্যালার্ম" : "রাতের অ্যালার্ম"}
              </span>
              <span className="text-[10px] text-white/75 font-mono">
                {new Date(activeAlarm.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <h4 className="font-extrabold text-sm md:text-base leading-snug tracking-tight text-white mb-1.5 drop-shadow-xs">
              {activeAlarm.title}
            </h4>

            <p className="text-xs md:text-sm text-white/95 leading-relaxed font-medium bg-black/15 p-2.5 rounded-xl border border-white/10">
              “{activeAlarm.message}”
            </p>

            {/* Interactive Actions */}
            <div className="flex items-center space-x-2 mt-3 pt-1">
              <button
                type="button"
                id="alarm-replay-sound-btn"
                onClick={handleReplayChime}
                disabled={isPlayingSound}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/20 hover:bg-white/30 text-white transition active:scale-95 cursor-pointer disabled:opacity-50"
                title="শব্দ পুনরায় শুনুন"
              >
                <Volume2 className={`w-3.5 h-3.5 ${isPlayingSound ? "animate-spin" : ""}`} />
                <span>{lang === "bn" ? "শব্দ শুনুন" : "Play Sound"}</span>
              </button>

              <button
                type="button"
                id="alarm-dismiss-confirm-btn"
                onClick={() => setActiveAlarm(null)}
                className="inline-flex items-center space-x-1 px-3.5 py-1.5 rounded-xl text-xs font-black bg-white text-slate-900 hover:bg-slate-100 transition shadow-md active:scale-95 cursor-pointer ml-auto"
              >
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>{lang === "bn" ? "বুঝেছি" : "Dismiss"}</span>
              </button>
            </div>
          </div>

          {/* Close button */}
          <button
            type="button"
            id="alarm-close-top-btn"
            onClick={() => setActiveAlarm(null)}
            className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer shrink-0 -mt-1 -mr-1"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
