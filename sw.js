const CACHE = 'retroplan-v6';

const SHELL = [
  './',
  './index.html',
  './evenements.html',
  './evenement.html',
  './retours.html',
  './parametres.html',
  './css/app.css',
  './js/core.js',
  './js/store.js',
  './js/ui.js',
  './js/page-mine.js',
  './js/page-events.js',
  './js/page-event.js',
  './js/page-retex.js',
  './js/page-settings.js',
  './js/boot.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Installation : mise en cache du shell applicatif
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      // cache: 'reload' : on prend les fichiers sur le serveur, jamais une ancienne copie gardée par le navigateur
      .then((cache) => cache.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

// Activation : nettoyage des anciens caches et prise de contrôle immédiate
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Interception des requêtes réseau
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Filtrage : uniquement les requêtes GET et de même origine (ignore les API tierces)
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;

  // Navigation : Réseau d'abord avec repli sur le cache (ou index.html)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request, { cache: 'no-cache' })
        .then(async (response) => {
          if (response.ok) {
            const cache = await caches.open(CACHE);
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request, { ignoreSearch: true });
          return cached || caches.match('./index.html');
        })
    );
    return;
  }

  // Autres ressources : Stale-While-Revalidate
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      // no-cache : le navigateur redemande toujours au serveur (réponse légère si rien n'a changé)
      const networkFetch = fetch(request, { cache: 'no-cache' })
        .then((response) => {
          if (response.ok) {
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch((error) => {
          if (!cached) throw error;
        });

      return cached || networkFetch;
    })
  );
});
