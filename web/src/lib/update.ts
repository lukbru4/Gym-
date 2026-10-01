// Update-Prüfung: Eine Home-Bildschirm-App (PWA) hat keinen Neuladen-Knopf und wird von
// iOS oft nur aus dem Speicher zurückgeholt. Deshalb fragt die App selbst nach, ob auf dem
// Server eine neuere Version liegt (version.json), und bietet ein Update an.

export async function fetchServerVersion(): Promise<string | null> {
  if (location.protocol === 'file:') return null;
  try {
    const res = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.version === 'string' ? data.version : null;
  } catch {
    return null; // offline
  }
}

/** Entfernt Service Worker und Cache und lädt die App frisch. Trainingsdaten bleiben unberührt. */
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
  url.searchParams.set('v', String(Date.now()));
  location.replace(url.toString());
}
