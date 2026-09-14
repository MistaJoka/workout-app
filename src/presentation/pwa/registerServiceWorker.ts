export function registerServiceWorker(): void {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Non-fatal: the app still works without offline shell caching.
    })
  }
}
