/* hiaOS — service worker. Caches the app shell for offline launch; never caches
   API calls (those go straight to the Ollama endpoint over the network). */
const CACHE = 'hiaos-ios-v4';
const ASSETS = [
  './', './index.html', './styles.css', './manifest.webmanifest',
  './js/icons.js', './js/store.js', './js/ollama.js', './js/apps.js', './js/shell.js',
  './icons/icon.svg', './icons/apple-touch-icon.png', './icons/icon-192.png', './icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => Promise.all(ASSETS.map((u) => c.add(u).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  // Only handle same-origin GETs from the cache; everything else (the Ollama API)
  // goes to the network untouched.
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith(
    caches.match(req).then((hit) => {
      if (hit) {
        // refresh in background
        fetch(req).then((res) => { if (res && res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone())); }).catch(() => {});
        return hit;
      }
      return fetch(req).then((res) => {
        if (res && res.ok && res.type === 'basic') caches.open(CACHE).then((c) => c.put(req, res.clone()));
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
