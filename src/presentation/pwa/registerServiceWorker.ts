import { notifyUpdateReady } from './updateSignal'

export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return

  // On the very first install the new worker claims the page and fires
  // controllerchange too; that's not an update, so remember whether a
  // controller existed before we registered.
  const hadController = navigator.serviceWorker.controller != null

  navigator.serviceWorker
    .register('/sw.js')
    .then((registration) => {
      // A worker already waiting means a newer build was fetched on a
      // previous visit.
      if (registration.waiting && navigator.serviceWorker.controller) notifyUpdateReady()

      registration.addEventListener('updatefound', () => {
        const installing = registration.installing
        if (!installing) return
        installing.addEventListener('statechange', () => {
          // "installed" while a controller exists = update, not first install.
          if (installing.state === 'installed' && navigator.serviceWorker.controller) notifyUpdateReady()
        })
      })
    })
    .catch(() => {
      // Non-fatal: the app still works without offline shell caching.
    })

  // sw.js calls skipWaiting()/clients.claim(), so the new worker takes over
  // on its own; surfacing it lets the user reload for the new assets.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) notifyUpdateReady()
  })
}
