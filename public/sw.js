const CACHE_NAME = 'workout-app-shell-v3'

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
const SHELL_URLS = ['/', '/manifest.json', ...MEDIA_URLS]

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Navigations (the HTML document): network-first so a new deploy is
  // picked up immediately, falling back to the cached shell when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
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
