/* ClassBoard Service Worker */
const CACHE_NAME = 'classboard-pwa-v17';
const APP_SHELL = [
  './',
  './index.html',
  './login.html',
  './dashboard.html',
  './board.html',
  './account.html',
  './404.html',
  './manifest.webmanifest',
  './cloud.js',
  './config.js',
  './assets/icons/icon.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if(request.method !== 'GET') return;

  const url = new URL(request.url);
  const CDN = ['cdnjs.cloudflare.com','cdn.jsdelivr.net','fonts.googleapis.com','fonts.gstatic.com'];
  if(CDN.includes(url.hostname)){
    event.respondWith(caches.match(request).then((hit) => hit || fetch(request).then((res) => {
      if(res && (res.ok || res.type === 'opaque')){ const c = res.clone(); caches.open(CACHE_NAME).then((cache) => cache.put(request, c)).catch(() => {}); }
      return res;
    }).catch(() => hit)));
    return;
  }
  if(url.origin !== self.location.origin) return;

  const isPage = request.mode === 'navigate' || /\.(html?|js)$/.test(url.pathname) || url.pathname.endsWith('/');
  if(isPage){
    event.respondWith(
      fetch(request).then((response) => {
        if(response && response.ok){
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {});
        }
        return response;
      }).catch(() => caches.match(request).then((cached) => cached || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if(response && response.ok){
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {});
      }
      return response;
    }).catch(() => cached))
  );
});
