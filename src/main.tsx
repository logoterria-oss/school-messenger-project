import * as React from 'react';
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

window.addEventListener('vite:preloadError', () => {
  window.location.reload();
});

window.addEventListener('error', (e) => {
  if (
    e.message?.includes('Failed to fetch dynamically imported module') ||
    e.message?.includes('Importing a module script failed') ||
    e.message?.includes('error loading dynamically imported module')
  ) {
    window.location.reload();
  }
});

function setAppHeight() {
  const vv = window.visualViewport;
  const h = vv ? vv.height : window.innerHeight;
  document.documentElement.style.setProperty('--app-height', `${h}px`);
  if (vv) {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }
}

setAppHeight();

if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', setAppHeight);
  window.visualViewport.addEventListener('scroll', () => {
    setAppHeight();
    window.scrollTo(0, 0);
  });
} else {
  window.addEventListener('resize', setAppHeight);
}

createRoot(document.getElementById("root")!).render(<App />);

// Страховка: если сплэш не убрался за 8 секунд — убираем принудительно
setTimeout(() => {
  const el = document.querySelector('.splash-screen');
  if (el) (el as HTMLElement).remove();
}, 8000);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      reg.addEventListener('updatefound', () => {
        const newSW = reg.installing;
        if (!newSW) return;
        newSW.addEventListener('statechange', () => {
          if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
            // Активируем только если страница открыта — иначе Chrome на Android
            // показывает системное уведомление "сайт обновлён в фоновом режиме"
            if (!document.hidden) {
              newSW.postMessage({ type: 'SKIP_WAITING' });
            } else {
              const onVisible = () => {
                if (!document.hidden) {
                  document.removeEventListener('visibilitychange', onVisible);
                  newSW.postMessage({ type: 'SKIP_WAITING' });
                }
              };
              document.addEventListener('visibilitychange', onVisible);
            }
          }
        });
      });
    }).catch(() => {});
  });
}