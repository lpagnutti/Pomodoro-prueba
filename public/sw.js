const CACHE_NAME = 'pomodoro-focus-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  // Force the waiting service worker to become the active service worker.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Tell the active service worker to take control of the page immediately.
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Stale-While-Revalidate strategy
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          // Update the cache with the new response
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
             cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => {
           // Network failed, return cached response if available
           return cachedResponse;
        });
        // Return cached response immediately if available, otherwise wait for network
        return cachedResponse || fetchPromise;
      });
    })
  );
});

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Pomodoro Focus';
  const options = {
    body: data.body || '¡Es hora de revisar tus tareas!',
    icon: 'https://picsum.photos/seed/pomodoro/192/192',
    badge: 'https://picsum.photos/seed/pomodoro/192/192',
    vibrate: [100, 50, 100],
    data: {
      url: self.location.origin
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
