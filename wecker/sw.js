/* Service Worker für Dämmerung: Die App startet damit auch ohne Internet,
   etwa im Schlafzimmer mit schlechtem Empfang. Bei jeder Änderung an den
   Dateien unten VERSION erhöhen, damit Handys die neue Fassung laden. */
const VERSION = 'daemmerung-v1';
const SHELL = [
  './',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-192.png',
  './icons/maskable-512.png',
  './icons/apple-touch-icon.png',
  '../assets/fonts/montserrat-latin-wght-normal.woff2',
  '../assets/fonts/montserrat-latin-ext-wght-normal.woff2',
  '../assets/fonts/nunito-latin-wght-normal.woff2',
  '../assets/fonts/nunito-latin-ext-wght-normal.woff2'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('daemmerung-') && k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    event.respondWith(networkFirst(req));
  } else {
    event.respondWith(cacheFirst(req));
  }
});

/* Seite: erst das Netz fragen (so kommen Updates an), nach 4 Sekunden
   ohne Antwort oder ohne Netz die gespeicherte Fassung zeigen. */
async function networkFirst(req) {
  const cache = await caches.open(VERSION);
  try {
    const res = await Promise.race([
      fetch(req),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Zeitüberschreitung')), 4000))
    ]);
    if (res && res.ok) cache.put('./', res.clone());
    return res;
  } catch (err) {
    return (await cache.match('./')) || Response.error();
  }
}

/* Symbole und Schriften: aus dem Speicher, sonst laden und merken. */
async function cacheFirst(req) {
  const hit = await caches.match(req, { ignoreSearch: true });
  if (hit) return hit;
  const res = await fetch(req);
  if (res && res.ok) {
    const copy = res.clone();
    caches.open(VERSION).then(cache => cache.put(req, copy));
  }
  return res;
}
