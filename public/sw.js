// Two caches with different lifetimes:
//
// - CACHE_NAME holds the app shell (index.html, manifest, every built chunk,
//   the precached curated photos). It is named after the build, so each
//   deploy installs a fresh one and activate deletes the old one wholesale.
//   A new worker does NOT take over on its own: it waits until the app is
//   closed, or until the user taps Reload on the "Update ready" toast
//   (which posts SKIP_WAITING). A workout in progress keeps running on the
//   build it started with, whose lazy chunks are still in its cache.
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
//   putMedia drops the old version of the same file when it caches the new,
//   and activate drops files of versions/loops the build no longer lists.
//   Only real (CORS/same-origin, ok) responses are cached: an opaque
//   response can hide a 404 forever and counts ~7 MB against quota in
//   Chromium. Library photos are capped at MAX_LIBRARY_PHOTOS, oldest out.
const BUILD_ID = 'dev'
const BUILD_ASSETS = []
const CACHE_NAME = `workout-app-shell-${BUILD_ID}`
const MEDIA_CACHE_NAME = 'workout-app-media-v1'
const MAX_LIBRARY_PHOTOS = 300
const UPSTREAM_PHOTO = (url) => url.hostname === 'raw.githubusercontent.com' && url.pathname.includes('/free-exercise-db/')

// The registration scope's path is this worker's base: '/' locally and for
// Capacitor, '/workout-app/' for the GitHub Pages project build
// (vite.config.ts / registerServiceWorker.ts register it with `scope:
// BASE_URL`). Every path this file precaches, matches or falls back to is
// built from BASE so the same sw.js works unmodified under either base.
const BASE = new URL(self.registration.scope).pathname

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
const MEDIA_URLS = MEDIA_IDS.flatMap((id) => [`${BASE}exercise-media/${id}/0.jpg`, `${BASE}exercise-media/${id}/1.jpg`])
// Rae's images (scripts/assets/derive-rae-preview.py) show on Today, in the
// player and at the finish, so they must be there offline too.
const RAE_EXPRESSIONS = ['neutral', 'smile', 'happy', 'cheer', 'focused', 'determined', 'tired', 'surprised', 'laugh', 'wink']
const RAE_URLS = [
  ...RAE_EXPRESSIONS.map((e) => `${BASE}rae/expr-${e}.png`),
  `${BASE}rae/full-front.png`,
  `${BASE}rae/full-3q.png`,
  `${BASE}rae/loops.json`,
]
// The shop's pixel reward icons (src/domain/rewards/rewardIcons.ts, kept in
// step by swPrecacheLists.test.ts): sticker and tile for each.
const REWARD_ICON_IDS = ['nap-time', 'sleep-in', 'no-dishes', 'laundry-done', 'no-chores', 'tv-remote', 'movie-night', 'game-night', 'love-letter', 'reading-time', 'foot-rub', 'bubble-bath', 'spa-day', 'flowers', 'coffee-date', 'breakfast-in-bed', 'dinner-date', 'blanket-fort', 'picnic', 'sunset-drive', 'surprise-gift', 'takeout', 'pizza', 'sushi', 'ramen', 'tacos', 'burger', 'burrito', 'burrito-bowl', 'nachos', 'quesadilla', 'donut', 'sundae', 'boba']
const REWARD_ICON_URLS = REWARD_ICON_IDS.flatMap((id) => [`${BASE}rewards/${id}.webp`, `${BASE}rewards/${id}-tile.webp`])
// The shell must install whole (a half-installed build can't run offline);
// media is best-effort, so one flaky image fetch never costs the app its
// offline copy. Anything that missed is cached the first time it's shown.
const SHELL_URLS = [BASE, `${BASE}manifest.json`, `${BASE}rae/loops.json`, ...BUILD_ASSETS.map((f) => `${BASE}${f}`)]
const BEST_EFFORT_URLS = [...MEDIA_URLS, ...REWARD_ICON_URLS, ...RAE_URLS.filter((u) => u !== `${BASE}rae/loops.json`)]

// `cache: 'reload'` skips the browser's HTTP cache, which can otherwise hand
// the new worker an old build's index.html.
const fresh = (url) => new Request(url, { cache: 'reload' })

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const shell = await caches.open(CACHE_NAME)
      await shell.addAll(SHELL_URLS.map(fresh))
      await Promise.all(
        BEST_EFFORT_URLS.map((url) =>
          fetch(fresh(url))
            .then((response) => (response.ok ? shell.put(url, response) : undefined))
            .catch(() => undefined)
        )
      )
      // Rae's featured loops (listed in /rae/loops.json by
      // scripts/assets/build-rae-strips.py) are precached into the media
      // cache, at the exact versioned URLs the app asks for. Only the ones
      // not already there are fetched, so a deploy that didn't redraw
      // anything downloads nothing. Library loops are cached on first view.
      const loops = await (await shell.match(`${BASE}rae/loops.json`)).json()
      const media = await caches.open(MEDIA_CACHE_NAME)
      const wanted = loops
        .filter((loop) => loop.featured)
        .flatMap((loop) => [`${BASE}rae/${loop.id}.webp`, ...loop.stills.map((f) => `${BASE}rae/${loop.id}-${f}.png`)].map((p) => `${p}?v=${loop.v}`))
      const missing = []
      for (const url of wanted) if (!(await media.match(url))) missing.push(url)
      for (const url of missing) {
        try {
          const response = await fetch(fresh(url))
          if (response.ok) await putMedia(media, new Request(url), response)
        } catch {
          // Best-effort: cached on first view instead.
        }
      }
    })()
  )
})

// The "Update ready" toast's Reload asks the waiting worker to take over.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => k !== CACHE_NAME && k !== MEDIA_CACHE_NAME).map((k) => caches.delete(k)))
      await pruneMedia()
    })()
  )
  self.clients.claim()
})

// Drops media the current build can never ask for again: Rae files of a
// version or loop loops.json no longer lists (or from before URLs were
// versioned), opaque library photos cached by older builds, and library
// photos beyond the cap (oldest first; Cache keys come back in insertion
// order).
async function pruneMedia() {
  const media = await caches.open(MEDIA_CACHE_NAME)
  const shell = await caches.open(CACHE_NAME)
  const loopsResponse = await shell.match(`${BASE}rae/loops.json`)
  const current = new Map()
  if (loopsResponse) {
    for (const loop of await loopsResponse.json()) {
      current.set(`${BASE}rae/${loop.id}.webp`, loop.v)
      for (const still of loop.stills) current.set(`${BASE}rae/${loop.id}-${still}.png`, loop.v)
      // The owner's exercise card ("How to" picture), when the loop has one.
      if (loop.card) current.set(`${BASE}${loop.card}`, loop.v)
    }
  }
  const photos = []
  for (const request of await media.keys()) {
    const url = new URL(request.url)
    if (url.pathname.startsWith(`${BASE}rae/`)) {
      if (!loopsResponse) continue
      if (current.get(url.pathname) !== url.searchParams.get('v')) await media.delete(request)
    } else if (UPSTREAM_PHOTO(url)) {
      const cached = await media.match(request)
      if (!cached || cached.type === 'opaque' || !cached.ok) await media.delete(request)
      else photos.push(request)
    }
  }
  for (const request of photos.slice(0, Math.max(0, photos.length - MAX_LIBRARY_PHOTOS))) await media.delete(request)
}

async function capLibraryPhotos(cache) {
  const photos = (await cache.keys()).filter((request) => UPSTREAM_PHOTO(new URL(request.url)))
  for (const request of photos.slice(0, Math.max(0, photos.length - MAX_LIBRARY_PHOTOS))) await cache.delete(request)
}

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
  // Photos are requested with crossOrigin="anonymous", so a good response is
  // readable (ok); an opaque one (an <img> without it) is served, not stored.
  if (UPSTREAM_PHOTO(url)) {
    event.respondWith(
      caches.open(MEDIA_CACHE_NAME).then((cache) =>
        cache.match(request, { ignoreVary: true }).then((cached) => {
          if (cached && cached.type !== 'opaque') return cached
          return fetch(request).then((response) => {
            if (response.ok && response.type !== 'opaque') {
              cache.put(request, response.clone()).then(() => capLibraryPhotos(cache))
            }
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
  if (url.pathname.startsWith(`${BASE}rae/ex-`)) {
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
        .catch(() => caches.match(request).then((cached) => cached || caches.match(BASE)))
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
