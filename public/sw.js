/* UsineFlow service worker: app-shell cache for fast reloads and graceful offline navigation.
 * Data requests (Supabase, /api) are never cached; offline writes go through the Dexie queue in the app. */
const VERSION = 'v1'
const STATIC = `usineflow-static-${VERSION}`
const PAGES = `usineflow-pages-${VERSION}`

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(PAGES).then((c) => c.addAll(['/offline.html'])).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => ![STATIC, PAGES].includes(k)).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return

  // immutable build assets and icons: cache first
  if (url.pathname.startsWith('/_next/static/') || /\.(?:png|svg|ico|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      caches.open(STATIC).then(async (cache) => {
        const hit = await cache.match(req)
        if (hit) return hit
        const res = await fetch(req)
        if (res.ok) cache.put(req, res.clone())
        return res
      }),
    )
    return
  }

  // navigations: network first, fall back to the last copy, then to the offline page
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(PAGES).then((c) => c.put(req, copy)) }
          return res
        })
        .catch(async () => (await caches.match(req)) || (await caches.match('/offline.html')) || Response.error()),
    )
  }
})
