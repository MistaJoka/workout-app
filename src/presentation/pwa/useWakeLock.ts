import { useEffect } from 'react'
import { createWakeLockController, type WakeLockLike } from './wakeLockController'

// Keeps the screen on while `active` (e.g. during a workout). Silent no-op
// where the Screen Wake Lock API is unavailable or refused. The race
// handling (unmount during an in-flight request, re-acquire on visibility
// return) lives in wakeLockController so it can be unit-tested.
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active) return
    const wakeLock = (navigator as Navigator & { wakeLock?: WakeLockLike }).wakeLock
    if (!wakeLock) return
    const controller = createWakeLockController(wakeLock, document)
    controller.start()
    return () => {
      void controller.stop()
    }
  }, [active])
}
