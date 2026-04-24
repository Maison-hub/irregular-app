const CACHE_NAME = 'irregular-app-shell-v1';
const scopeUrl = new URL(self.registration.scope);
const BASE_PATH = scopeUrl.pathname;
const FALLBACK_URLS = ['', 'index.html', 'irregular-verbs.csv'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        cache.addAll(FALLBACK_URLS.map((path) => new URL(path, scopeUrl).toString())),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

async function cacheUrls(urls) {
  const cache = await caches.open(CACHE_NAME);

  await Promise.all(
    urls.map(async (url) => {
      try {
        await cache.add(url);
      } catch {
        // Ignore resources that cannot be cached.
      }
    }),
  );
}

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'CACHE_URLS') {
    return;
  }

  const incomingUrls = Array.isArray(event.data.urls) ? event.data.urls : [];
  const safeUrls = [...new Set(incomingUrls)]
    .filter((url) => typeof url === 'string')
    .filter((url) => url.startsWith(self.location.origin));

  event.waitUntil(
    cacheUrls([...safeUrls, new URL('irregular-verbs.csv', scopeUrl).toString()]),
  );
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);

    if (response.ok) {
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    const cached = await cache.match(request);

    if (cached) {
      return cached;
    }

    const fallback =
      (await cache.match(new URL('', scopeUrl).toString())) ||
      (await cache.match(new URL('index.html', scopeUrl).toString()));

    if (fallback) {
      return fallback;
    }

    throw error;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }

      return response;
    })
    .catch(() => cached);

  return cached || networkPromise;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  if (url.pathname.startsWith(BASE_PATH)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

