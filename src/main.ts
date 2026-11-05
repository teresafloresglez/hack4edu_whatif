import './style.css';
import { startApp } from './ui/app';

startApp(document.querySelector<HTMLElement>('#app')!);

// Modo sin conexión: registrar el service worker (solo en la versión compilada).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => undefined);
  });
}
