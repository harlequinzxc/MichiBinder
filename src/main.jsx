import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import CardBinder from './CardBinder.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CardBinder />
  </StrictMode>,
);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
  });
}
