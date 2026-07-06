// Service Worker — Bóveda Cuki PWA
// Estrategia:
//  - Recursos propios (HTML/CSS/JS/iconos): NETWORK-FIRST -> siempre la última
//    versión cuando hay internet; si no hay red, cae a la caché (offline).
//  - API de tasas (dolarapi.com): network-first + caché de respaldo.
//  - Sube el número de CACHE en cada publicación para invalidar lo viejo.
const CACHE = 'boveda-cuki-v3';
const SHELL = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // API de tasas: red primero, con respaldo de caché
  if (url.hostname.endsWith('dolarapi.com')) {
    event.respondWith(
      fetch(req)
        .then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {}); return res; })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Recursos propios: RED primero (siempre lo último), respaldo en caché si no hay internet
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.status === 200) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {}); }
          return res;
        })
        .catch(() => caches.match(req).then((c) => c || caches.match('./index.html')))
    );
  }
});
