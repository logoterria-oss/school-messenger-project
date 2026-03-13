import * as React from 'react';
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

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