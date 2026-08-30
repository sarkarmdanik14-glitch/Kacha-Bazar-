/**
 * Service Worker Registration, PWA Lifecycle, and Event Dispatchers
 */

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Global cached prompt
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e: Event) => {
    e.preventDefault();
    globalDeferredPrompt = e as BeforeInstallPromptEvent;
    window.dispatchEvent(new CustomEvent("pwa-prompt-available"));
    console.log("[PWA] beforeinstallprompt captured and ready");
  });

  window.addEventListener("appinstalled", () => {
    globalDeferredPrompt = null;
    window.dispatchEvent(new CustomEvent("pwa-installed-success"));
    console.log("[PWA] App installed successfully!");
  });
}

export function getGlobalDeferredPrompt(): BeforeInstallPromptEvent | null {
  return globalDeferredPrompt;
}

export function registerServiceWorker() {
  if (typeof window !== "undefined" && "serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((registration) => {
          console.log("[PWA] Service Worker registered with scope:", registration.scope);

          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === "installed") {
                  if (navigator.serviceWorker.controller) {
                    console.log("[PWA] New content is available; will update on reload.");
                  } else {
                    console.log("[PWA] Content is cached for offline use.");
                  }
                }
              };
            }
          };
        })
        .catch((error) => {
          console.warn("[PWA] Service Worker registration failed:", error);
        });
    });
  }
}

export function isPWAInstalled(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
    document.referrer.includes("android-app://")
  );
}

export function getClientPlatform() {
  if (typeof window === "undefined") {
    return { isMobile: false, isIOS: false, isAndroid: false, isDesktop: true, isChrome: false, isEdge: false, isSafari: false };
  }
  const ua = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua);
  const isAndroid = /android/.test(ua);
  const isMobile = isIOS || isAndroid || /mobile/.test(ua);
  const isDesktop = !isMobile;
  const isChrome = /chrome/.test(ua) && !/edg/.test(ua) && !/opr/.test(ua);
  const isEdge = /edg/.test(ua);
  const isSafari = /safari/.test(ua) && !/chrome/.test(ua);

  return { isMobile, isIOS, isAndroid, isDesktop, isChrome, isEdge, isSafari };
}

export function openPWAInstallModal() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("open-pwa-install-modal"));
  }
}

export function openPWAQRCodeModal() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("open-pwa-qrcode-modal"));
  }
}
