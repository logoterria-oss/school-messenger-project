import * as React from 'react';
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

document.addEventListener('touchmove', (e) => {
  const target = e.target as HTMLElement;
  const scrollable = target.closest('[data-scrollable]');
  if (!scrollable) {
    e.preventDefault();
  }
}, { passive: false });

createRoot(document.getElementById("root")!).render(<App />);