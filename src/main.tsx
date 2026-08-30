import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerServiceWorker } from './utils/pwa';
import ErrorBoundary from './components/ErrorBoundary';

// Filter out noisy third-party browser extension errors (e.g., MetaMask, ChromeTransport)
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    const msg = event.message || '';
    const src = event.filename || '';
    const errStr = event.error ? (event.error.message || String(event.error)) : '';
    if (
      msg.includes('MetaMask') ||
      msg.includes('ChromeTransport') ||
      msg.includes('connectChrome') ||
      errStr.includes('MetaMask') ||
      errStr.includes('ChromeTransport') ||
      errStr.includes('connectChrome') ||
      src.includes('chrome-extension://') ||
      src.includes('moz-extension://') ||
      src.includes('inpage.js')
    ) {
      event.preventDefault();
      event.stopPropagation();
      return true;
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason ? String(event.reason?.message || event.reason) : '';
    if (
      reason.includes('MetaMask') ||
      reason.includes('ChromeTransport') ||
      reason.includes('connectChrome') ||
      reason.includes('Extension context invalidated') ||
      reason.includes('inpage.js')
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
  });
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

