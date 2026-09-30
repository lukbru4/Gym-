// Update-Prüfung: Eine Home-Bildschirm-App (PWA) hat keinen Neuladen-Knopf und wird von
// iOS oft nur aus dem Speicher zurückgeholt. Deshalb fragt die App selbst nach, ob auf dem
// Server eine neuere Version liegt (version.json), und bietet ein Update an.

const CHECK_EVERY_MS = 5 * 60 * 1000;
let lastCheck = 0;

export async function fetchServerVersion() {
  if (location.protocol === 'file:') return null; // direkt geöffnete Datei: kein Server zum Fragen
  try {
    const res = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.version === 'string' ? data.version : null;
  } catch {
    return null; // offline oder Einzeldatei ohne version.json
  }
}

// Entfernt Service Worker und zwischengespeicherte Dateien und lädt die App frisch.
// Trainingsdaten (localStorage bzw. Supabase) bleiben unberührt.
export async function hardReload() {
  try {
    const regs = (await navigator.serviceWorker?.getRegistrations()) || [];
    await Promise.all(regs.map((r) => r.unregister()));
  } catch {
    /* ignorieren */
  }
  try {
    const keys = (await globalThis.caches?.keys()) || [];
    await Promise.all(keys.map((k) => caches.delete(k)));
  } catch {
    /* ignorieren */
  }
  const url = new URL(location.href);
  url.searchParams.set('v', Date.now());
  location.replace(url.toString());
}

export function initUpdateCheck(currentVersion, banner) {
  const check = async (force = false) => {
    if (!force && Date.now() - lastCheck < CHECK_EVERY_MS) return;
    lastCheck = Date.now();
    const server = await fetchServerVersion();
    if (server && server !== currentVersion) {
      banner.querySelector('.update-version').textContent = server;
      banner.hidden = false;
    }
  };
  banner.querySelector('button').onclick = hardReload;
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && check());
  window.addEventListener('pageshow', () => check());
  check(true);
}
