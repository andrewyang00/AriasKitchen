// Minimal offline cache so the game can be installed and opened without a
// network connection once it has been visited at least once.
const CACHE_NAME = 'aria-pancakes-v14';
const CORE_FILES = [
  './',
  './index.html',
  './styles.css',
  './assets.js',
  './audio.js',
  './app.js',
  './assets/images/scene_eggs_plate.png',
  './assets/images/scene_milk_idle_plate.png',
  './assets/images/scene_milk_active_plate.png',
  './assets/images/scene_stir_plate.png',
  './assets/images/scene_stir_active_plate.png',
  './assets/images/scene_batter_idle_plate.png',
  './assets/images/scene_batter_active_plate.png',
  './assets/images/scene_batter_plate.png',
  './assets/images/scene_flip_idle_plate.png',
  './assets/images/scene_flip_plate.png',
  './assets/images/scene_celebrate_plate.png',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => cached);
    })
  );
});
