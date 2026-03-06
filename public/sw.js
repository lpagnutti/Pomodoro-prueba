const CACHE_NAME = 'pomodoro-focus-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/src/main.tsx',
  '/src/index.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.text() : '¡Tu Pomodoro ha terminado!';
  event.waitUntil(
    self.registration.showNotification('Pomodoro Focus', {
      body: data,
      icon: '/icon.png',
    })
  );
});
