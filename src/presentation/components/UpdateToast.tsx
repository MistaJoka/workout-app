import { useEffect, useState } from 'react'
import { subscribeUpdateReady } from '../pwa/updateSignal'
import { applyUpdate } from '../pwa/registerServiceWorker'

// Mid-workout (the player, or Start just before it) the toast waits: on the
// folded cover screen it covered the rep target, and a stray tap on Reload
// mid-set is jarring. It appears once she's back on any other screen. This
// lives outside the router (main.tsx), so it follows the hash itself.
export function hidesUpdateToast(hash: string): boolean {
  return hash.startsWith('#/session/') || hash.startsWith('#/checkin/')
}

// Sits just above the tab/thumb bars, never over a screen header.
export function UpdateToast() {
  const [ready, setReady] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [hidden, setHidden] = useState(() => hidesUpdateToast(window.location.hash))

  useEffect(() => subscribeUpdateReady(() => setReady(true)), [])
  useEffect(() => {
    const onHash = () => setHidden(hidesUpdateToast(window.location.hash))
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  if (!ready || dismissed || hidden) return null

  return (
    <div
      className="fixed left-4 right-4 z-30 card flex items-center justify-between gap-3 p-3 shadow-lg"
      style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
      role="status"
    >
      <span className="text-sm font-semibold">Update ready</span>
      <div className="flex gap-2">
        <button type="button" className="btn-ghost min-h-11" onClick={() => setDismissed(true)}>
          Later
        </button>
        <button type="button" className="btn-primary btn-sm min-h-11" onClick={applyUpdate}>
          Reload
        </button>
      </div>
    </div>
  )
}
