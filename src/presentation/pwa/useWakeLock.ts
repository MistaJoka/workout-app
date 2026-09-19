import { useEffect } from 'react'

type WakeLockSentinelLike = { release: () => Promise<void>; addEventListener?: (t: string, l: () => void) => void }

// Keeps the screen on while `active` (e.g. during a workout). Browsers drop
// the lock whenever the page is hidden, so it is re-requested on return.
// Silent no-op where the Screen Wake Lock API is unavailable or refused.
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active) return
    const wakeLock = (navigator as Navigator & { wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> } })
      .wakeLock
    if (!wakeLock) return

    let sentinel: WakeLockSentinelLike | null = null
    let cancelled = false

    async function acquire() {
      if (cancelled || document.visibilityState !== 'visible') return
      try {
        sentinel = await wakeLock!.request('screen')
      } catch {
        sentinel = null
      }
    }

    function onVisibility() {
      if (document.visibilityState === 'visible') void acquire()
    }

    void acquire()
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibility)
      void sentinel?.release().catch(() => {})
      sentinel = null
    }
  }, [active])
}
