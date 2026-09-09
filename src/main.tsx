import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import './index.css';
import { registerServiceWorker } from './utils/pwa';
import ErrorBoundary from './components/ErrorBoundary';

// Filter out noisy third-party browser extension errors (e.g., MetaMask, ChromeTransport)
if (typeof window !== 'undefined') {
  const isExtensionNoise = (args: any[]) => {
    try {
      let fullStr = '';
      for (let i = 0; i < args.length; i++) {
        const a = args[i];
        if (a === null || a === undefined) continue;
        if (typeof a === 'string') {
          fullStr += ' ' + a;
        } else if (typeof a === 'object') {
          if (a.message) fullStr += ' ' + a.message;
          if (a.stack) fullStr += ' ' + a.stack;
          if (a.name) fullStr += ' ' + a.name;
          if (a.reason) fullStr += ' ' + (typeof a.reason === 'string' ? a.reason : (a.reason?.message || ''));
          try { fullStr += ' ' + JSON.stringify(a); } catch (e) {}
        } else {
          fullStr += ' ' + String(a);
        }
      }
      return /metamask|chrometransport|connectchrome|inpage\.js|chrome-extension|moz-extension|evmprovider|ethereum/i.test(fullStr);
    } catch {
      return false;
    }
  };

  const methods = ['error', 'warn'] as const;
  methods.forEach((method) => {
    const orig = console[method];
    if (orig) {
      console[method] = (...args: any[]) => {
        if (isExtensionNoise(args)) return;
        try {
          return orig.apply(console, args);
        } catch {}
      };
    }
  });

  window.addEventListener('error', (event) => {
    let msg = (event.message || '') + ' ' + (event.filename || '') + ' ';
    try {
      if (event.error) {
        msg += (event.error.message || '') + ' ' + (event.error.stack || '') + ' ' + String(event.error);
      }
    } catch {}
    if (/metamask|chrometransport|connectchrome|inpage\.js|chrome-extension|moz-extension|evmprovider|ethereum/i.test(msg)) {
      event.preventDefault();
      event.stopPropagation();
      if (typeof (event as any).stopImmediatePropagation === 'function') {
        (event as any).stopImmediatePropagation();
      }
      return true;
    }
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    let reason = '';
    try {
      if (event.reason) {
        reason = (event.reason.message || '') + ' ' + (event.reason.stack || '') + ' ' + String(event.reason);
      }
    } catch {}
    if (/metamask|chrometransport|connectchrome|inpage\.js|chrome-extension|moz-extension|evmprovider|ethereum/i.test(reason)) {
      event.preventDefault();
      event.stopPropagation();
      if (typeof (event as any).stopImmediatePropagation === 'function') {
        (event as any).stopImmediatePropagation();
      }
      return true;
    }
  }, true);
}

// Register PWA Service Worker
registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

