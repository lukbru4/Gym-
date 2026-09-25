// Service Worker: hält die App-Dateien offline verfügbar.
// Trainingsdaten kommen immer live von Supabase (dafür ist Internet nötig).
const CACHE = 'gym-tracker-v4';
const SHELL = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/api.js',
  './js/backend-local.js',
  './js/backend-supabase.js',
  './js/stats.js',
  './js/muscles.js',
  './js/timer.js',
  './js/starter-templates.js',
  './js/config.js',
  './icon.svg',
  './manifest.webmanifest',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Netzwerk zuerst (damit Updates sofort ankommen), bei Offline aus dem Cache.
// cache: 'no-cache' umgeht den HTTP-Cache des Browsers (GitHub Pages erlaubt 10 Minuten),
// fragt also jedes Mal beim Server nach, ob sich die Datei geändert hat.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    fetch(new Request(e.request.url, { cache: 'no-cache', credentials: 'same-origin' }))
      .then((res) => {
        if (!res.ok) return res;
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
