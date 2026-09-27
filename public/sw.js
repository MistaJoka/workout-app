// Two caches with different lifetimes:
//
// - CACHE_NAME holds the app shell (index.html, manifest, hashed chunks, the
//   precached curated photos). It is versioned and replaced wholesale on
//   activate. Bump CACHE_NAME whenever anything in SHELL_URLS changes
//   (including manifest.json) — an installed PWA only re-runs install when
//   the worker's own bytes change, so an unbumped edit is never picked up.
// - MEDIA_CACHE_NAME holds library photos fetched from the pinned upstream
//   revision as the user views them. It is long-lived: activate never
//   deletes it, so a routine built from the library keeps its photos
//   offline across app updates. The upstream revision is pinned, so the
//   entries never go stale.
const CACHE_NAME = 'workout-app-shell-v11'
const MEDIA_CACHE_NAME = 'workout-app-media-v1'

// Movement photos are precached so a workout works fully offline even if
// the user never opened every exercise while online. Keep in sync with
// src/domain/content/fixtures/foundationStrengthStarter.ts mediaManifest.
const MEDIA_IDS = [
  'Bodyweight_Squat',
  'Incline_Push-Up',
  'Single_Leg_Glute_Bridge',
  'Dead_Bug',
  'Plank',
  'Bodyweight_Walking_Lunge',
  'Butt_Lift_Bridge',
  'Crunches',
  'Superman',
]
const MEDIA_URLS = MEDIA_IDS.flatMap((id) => [`/exercise-media/${id}/0.jpg`, `/exercise-media/${id}/1.jpg`])
// Rae's images (scripts/assets/derive-rae-preview.py) show on Today, in the
// player and at the finish, so they must be there offline too.
const RAE_EXPRESSIONS = ['neutral', 'smile', 'happy', 'cheer', 'focused', 'determined', 'tired', 'surprised', 'laugh', 'wink']
const RAE_URLS = [
  ...RAE_EXPRESSIONS.map((e) => `/rae/expr-${e}.png`),
  '/rae/full-front.png',
  '/rae/full-3q.png',
  '/rae/ex-squat.webp',
  '/rae/ex-squat-0.png',
  '/rae/ex-squat-1.png',
  '/rae/ex-squat-2.png',
  '/rae/ex-squat-3.png',
]
const SHELL_URLS = ['/', '/manifest.json', ...MEDIA_URLS, ...RAE_URLS]

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME && k !== MEDIA_CACHE_NAME).map((k) => caches.delete(k)))
      )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Library exercise photos live at the pinned upstream revision and are
  // cached the first time they're viewed (cache-first afterwards) in the
  // long-lived media cache, so a routine built from the library keeps its
  // photos offline once seen — including across app updates.
  if (url.hostname === 'raw.githubusercontent.com' && url.pathname.includes('/free-exercise-db/')) {
    event.respondWith(
      caches.open(MEDIA_CACHE_NAME).then((cache) =>
        cache.match(request).then((cached) => {
          if (cached) return cached
          return fetch(request).then((response) => {
            if (response.ok || response.type === 'opaque') cache.put(request, response.clone())
            return response
          })
        })
      )
    )
    return
  }

  if (url.origin !== self.location.origin) return

  // Navigations (the HTML document): network-first so a new deploy is
  // picked up immediately, falling back to the cached shell when offline.
  // `cache: 'no-store'` bypasses the browser's HTTP cache, which otherwise
  // hands back a heuristically-cached index.html pointing at old asset
  // hashes — observed as "new deploy, old app" after a restart.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(new Request(request.url, { cache: 'no-store', credentials: 'same-origin' }))
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
          return response
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/')))
    )
    return
  }

  // Same-origin static assets: cache-on-fetch so each new build's hashed
  // chunks get cached as they're requested, with cache-first for speed.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
        }
        return response
      })
    })
  )
})
