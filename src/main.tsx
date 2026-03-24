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