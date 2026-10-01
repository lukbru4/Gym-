import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { initTheme } from './lib/theme';
import { notifyThemeChanged } from './lib/themeStore';
import './styles.css';

// Kein Zoomen mit zwei Fingern: iOS Safari beachtet „user-scalable=no“ im Viewport nicht,
// deshalb die Zoom-Gesten zusätzlich abfangen.
function preventZoom() {
  const stop = (e: Event) => e.preventDefault();
  document.addEventListener('gesturestart', stop);
  document.addEventListener('gesturechange', stop);
  document.addEventListener(
    'touchmove',
    (e) => {
      const scale = (e as TouchEvent & { scale?: number }).scale;
      if (e.touches.length > 1 || (scale && scale !== 1)) e.preventDefault();
    },
    { passive: false },
  );
}

preventZoom();
initTheme(notifyThemeChanged);
createRoot(document.getElementById('root')!).render(<App />);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
