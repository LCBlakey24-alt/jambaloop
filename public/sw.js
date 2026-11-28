// Jambaloop's service worker: what lets a browser install Jambaloop as an app on a phone (Chrome's
// ⋮ menu → Install app; Safari's Share → Add to Home Screen) and shows a friendly page when there is
// no internet. It deliberately does nothing else: games are live, so pages, game files and the room
// API always come straight from the server, never from a cache.
const CACHE = 'jambaloop-offline-v1';
const OFFLINE = '/offline.html';
const KEEP = [OFFLINE, '/app-icons/icon-192.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(KEEP)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(key => key.startsWith('jambaloop-') && key !== CACHE).map(key => caches.delete(key))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const { request } = event;
  // Only page loads are handled, and only when the network fails. Everything else (scripts, pictures,
  // the room API and its live updates) is left to the browser as if there were no service worker.
  if (request.mode !== 'navigate' || request.method !== 'GET') return;
  event.respondWith(fetch(request).catch(async () => (await caches.match(OFFLINE)) ?? Response.error()));
});
