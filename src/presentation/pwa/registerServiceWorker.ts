import { notifyUpdateReady } from './updateSignal'
import { isNativeApp } from '../appContext'

// A newer build installs in the background and then waits (sw.js never
// calls skipWaiting on its own), so a workout in progress keeps running on
// the build it started with. The "Update ready" toast calls applyUpdate():
// the waiting worker takes over, and the page reloads onto the new build.
// Closing the app fully does the same without asking.
let waiting: ServiceWorker | null = null
let reloadWhenControlled = false

// In the Android app the update already happened: installing a new APK
// replaced the bundled files, and only the worker's old cache still holds
// the previous build. So it hands over at once, with no toast (any workout
// in progress is persisted and resumes after the reload).
function offer(worker: ServiceWorker | null): void {
  if (!worker) return
  waiting = worker
  if (isNativeApp()) applyUpdate()
  else notifyUpdateReady()
}

export function applyUpdate(): void {
  if (!waiting || !('serviceWorker' in navigator)) {
    location.reload()
    return
  }
  reloadWhenControlled = true
  waiting.postMessage({ type: 'SKIP_WAITING' })
  // If the handover never happens (the worker went redundant), reload anyway.
  setTimeout(() => location.reload(), 3000)
}

export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return

  // BASE_URL is '/' locally and for Capacitor, and the Pages build's
  // '/workout-app/' (vite.config.ts): the worker must register at (and be
  // scoped to) the base path, or it controls nothing under a project site
  // and the browser rejects a scope outside the registering script's own
  // directory.
  const base = import.meta.env.BASE_URL
  navigator.serviceWorker
    .register(`${base}sw.js`, { scope: base })
    .then((registration) => {
      // A worker already waiting means a newer build was fetched on a
      // previous visit.
      if (navigator.serviceWorker.controller) offer(registration.waiting)

      registration.addEventListener('updatefound', () => {
        const installing = registration.installing
        if (!installing) return
        installing.addEventListener('statechange', () => {
          // "installed" while a controller exists = an update waiting, not
          // the first install (which activates and claims the page itself).
          if (installing.state === 'installed' && navigator.serviceWorker.controller) offer(installing)
        })
      })
    })
    .catch(() => {
      // Non-fatal: the app still works without offline shell caching.
    })

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloadWhenControlled) location.reload()
  })
}
