import { useEffect, useState } from 'react'
import { subscribeUpdateReady } from '../pwa/updateSignal'
import { applyUpdate } from '../pwa/registerServiceWorker'

// Sits at the bottom above the tab/thumb bars, never over a screen header
// (the player's Pause and End workout live up there). Nothing changes until
// Reload is tapped: the new build waits, so a workout isn't interrupted.
export function UpdateToast() {
  const [ready, setReady] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => subscribeUpdateReady(() => setReady(true)), [])

  if (!ready || dismissed) return null

  return (
    <div
      className="fixed bottom-40 left-4 right-4 z-30 card flex items-center justify-between gap-3 p-3 shadow-lg"
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
