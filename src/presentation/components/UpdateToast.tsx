import { useEffect, useState } from 'react'
import { subscribeUpdateReady } from '../pwa/updateSignal'

export function UpdateToast() {
  const [ready, setReady] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => subscribeUpdateReady(() => setReady(true)), [])

  if (!ready || dismissed) return null

  return (
    <div className="fixed left-4 right-4 top-4 z-20 card flex items-center justify-between gap-3 p-3" role="status">
      <span className="text-sm font-semibold">Update ready</span>
      <div className="flex gap-2">
        <button className="btn-ghost" onClick={() => setDismissed(true)}>
          Later
        </button>
        <button className="btn-primary btn-sm" onClick={() => location.reload()}>
          Reload
        </button>
      </div>
    </div>
  )
}
