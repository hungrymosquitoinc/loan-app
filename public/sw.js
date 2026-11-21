/*
 * JSR Lending service worker.
 *
 * BUILD_ID is stamped into dist/sw.js by the `stamp-service-worker` plugin in
 * vite.config.js on every build. That means each deploy produces a byte-different
 * file, browsers install the new worker, and src/main.jsx silently reloads open
 * tabs on `controllerchange`.
 *
 * Strategy:
 *   navigations      -> network first (always show the newest app), cache for offline
 *   /assets/*        -> cache first (content-hashed, never changes meaning)
 *   everything else  -> stale while revalidate
 *   /api/*           -> network only, cache only as an offline fallback
 */

const BUILD_ID = '__BUILD_ID__'
const CACHE_NAME = `jsr-lending-${BUILD_ID}`
const SHELL_ASSETS = ['/', '/index.html', '/manifest.json', '/logo.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // Never let one missing asset abort the whole install.
      Promise.all(
        SHELL_ASSETS.map((url) =>
          fetch(url, { cache: 'reload' })
            .then((response) => (response && response.ok ? cache.put(url, response) : undefined))
            .catch(() => undefined)
        )
      )
    )
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('jsr-lending-') && key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  let url
  try {
    url = new URL(request.url)
  } catch {
    return
  }
  // Leave cross-origin traffic (Supabase, CDNs) alone.
  if (url.origin !== self.location.origin) return

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => response)
        .catch(() => caches.match(request).then((cached) => cached || Response.error()))
    )
    return
  }

  // Navigations go to the network first so a fresh deploy is visible on the next visit.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy))
          }
          return response
        })
        .catch(() =>
          caches.match('/index.html').then((cached) => cached || Response.error())
        )
    )
    return
  }

  // Vite fingerprints these, so a cached copy is always the right file.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request))
    return
  }

  event.respondWith(staleWhileRevalidate(request))
})

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response && response.ok) {
    const cache = await caches.open(CACHE_NAME)
    await cache.put(request, response.clone())
  }
  return response
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME)
  const cached = await cache.match(request)
  const network = fetch(request)
    .then((response) => {
      if (response && response.ok) cache.put(request, response.clone())
      return response
    })
    .catch(() => cached)
  return cached || network
}
