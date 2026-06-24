import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Safe manual Service Worker registration for PWA under iframe/permissions constraints in production mode only
if (typeof window !== 'undefined' && 'serviceWorker' in navigator && window.self === window.top && (import.meta as any).env?.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then((reg) => {
        console.log('ServiceWorker registered successfully:', reg);
      })
      .catch((err) => {
        console.warn('ServiceWorker registration postponed or blocked by sandbox constraints:', err);
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
