// Two caches with different lifetimes:
//
// - CACHE_NAME holds the app shell (index.html, manifest, every built chunk,
//   the precached curated photos). It is named after the build, so each
//   deploy installs a fresh one and activate deletes the old one wholesale.
//   BUILD_ID and BUILD_ASSETS are filled in by the `sw-build-manifest`
//   plugin in vite.config.ts when dist/ is written; in `vite dev` they keep
//   the placeholders below. Changing anything in SHELL_URLS needs no manual
//   bump: every build already changes this file's bytes.
// - MEDIA_CACHE_NAME holds media that outlives builds: library photos from
//   the pinned upstream revision, and Rae's loops. It is long-lived:
//   activate never deletes it, so a routine built from the library keeps
//   its photos offline across app updates. Upstream photos never go stale
//   (pinned revision). Rae's files are requested as `...?v=<content hash>`
//   (src/presentation/components/raeLoops.ts), so a redraw is a new URL;
//   putMedia drops the old version of the same file when it caches the new.
const BUILD_ID = 'dev'
const BUILD_ASSETS = []
const CACHE_NAME = `workout-app-shell-${BUILD_ID}`
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
  '/rae/loops.json',
]
const SHELL_URLS = ['/', '/manifest.json', ...MEDIA_URLS, ...RAE_URLS, ...BUILD_ASSETS.map((f) => `/${f}`)]

// `cache: 'reload'` skips the browser's HTTP cache, which can otherwise hand
// the new worker an old build's index.html.
const fresh = (url) => new Request(url, { cache: 'reload' })

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const shell = await caches.open(CACHE_NAME)
      await shell.addAll(SHELL_URLS.map(fresh))
      // Rae's featured loops (listed in /rae/loops.json by
      // scripts/assets/build-rae-strips.py) are precached into the media
      // cache, at the exact versioned URLs the app asks for. Only the ones
      // not already there are fetched, so a deploy that didn't redraw
      // anything downloads nothing. Library loops are cached on first view.
      const loops = await (await shell.match('/rae/loops.json')).json()
      const media = await caches.open(MEDIA_CACHE_NAME)
      const wanted = loops
        .filter((loop) => loop.featured)
        .flatMap((loop) => [`/rae/${loop.id}.webp`, ...loop.stills.map((f) => `/rae/${loop.id}-${f}.png`)].map((p) => `${p}?v=${loop.v}`))
      const missing = []
      for (const url of wanted) if (!(await media.match(url))) missing.push(url)
      for (const url of missing) {
        const response = await fetch(fresh(url))
        if (!response.ok) throw new Error(`precache ${url}: ${response.status}`)
        await putMedia(media, new Request(url), response)
      }
    })()
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => k !== CACHE_NAME && k !== MEDIA_CACHE_NAME).map((k) => caches.delete(k)))
      // Rae files cached before URLs were versioned can never be requested
      // again; drop them.
      const media = await caches.open(MEDIA_CACHE_NAME)
      for (const request of await media.keys()) {
        const url = new URL(request.url)
        if (url.pathname.startsWith('/rae/') && !url.searchParams.has('v')) await media.delete(request)
      }
    })()
  )
  self.clients.claim()
})

// Caches a Rae file and removes any other version of the same path.
async function putMedia(cache, request, response) {
  const path = new URL(request.url).pathname
  for (const old of await cache.keys()) {
    if (new URL(old.url).pathname === path && old.url !== request.url) await cache.delete(old)
  }
  await cache.put(request, response)
}

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

  // Rae's exercise loops and stills: cache-first in the long-lived media
  // cache, matched on the full versioned URL (never ignoreSearch — a new
  // version must miss), so a move she has demonstrated once keeps working
  // offline across app updates, and a redraw replaces the old art.
  if (url.pathname.startsWith('/rae/ex-')) {
    event.respondWith(
      caches.open(MEDIA_CACHE_NAME).then((cache) =>
        cache.match(request).then(
          (cached) =>
            cached ||
            fetch(request).then((response) => {
              if (response.ok && url.searchParams.has('v')) putMedia(cache, request, response.clone())
              return response
            })
        )
      )
    )
    return
  }

  // Navigations (the HTML document): network-first so a new deploy is
  // picked up immediately, falling back to the cached shell when offline.
  // `cache: 'no-store'` bypasses the browser's HTTP cache, which otherwise
  // hands back a heuristically-cached index.html pointing at old asset
  // hashes — observed as "new deploy, old app" after a restart. Only a good
  // response replaces the cached shell: a 502 while the server restarts
  // must not become the page the app opens to offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(new Request(request.url, { cache: 'no-store', credentials: 'same-origin' }))
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
          }
          return response
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/')))
    )
    return
  }

  // Same-origin static assets: every built chunk is precached at install;
  // anything else is cached as it's fetched, cache-first afterwards.
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
