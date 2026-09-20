export type WakeLockSentinelLike = { release: () => Promise<void> }
export type WakeLockLike = { request: (type: 'screen') => Promise<WakeLockSentinelLike> }
export type VisibilityDocLike = {
  readonly visibilityState: string
  addEventListener: (type: 'visibilitychange', listener: () => void) => void
  removeEventListener: (type: 'visibilitychange', listener: () => void) => void
}

// Holds a screen wake lock while started. Browsers drop the lock whenever
// the page is hidden, so it is re-requested on return. Two races are
// handled explicitly: a request that resolves after stop() is released
// rather than leaked, and a re-acquire releases the previous sentinel first.
export function createWakeLockController(wakeLock: WakeLockLike, doc: VisibilityDocLike) {
  let sentinel: WakeLockSentinelLike | null = null
  let stopped = false

  async function acquire(): Promise<void> {
    if (stopped || doc.visibilityState !== 'visible') return
    let next: WakeLockSentinelLike
    try {
      next = await wakeLock.request('screen')
    } catch {
      return
    }
    if (stopped) {
      void next.release().catch(() => {})
      return
    }
    const previous = sentinel
    sentinel = next
    if (previous && previous !== next) void previous.release().catch(() => {})
  }

  function onVisibility() {
    if (doc.visibilityState === 'visible') void acquire()
  }

  return {
    start() {
      stopped = false
      doc.addEventListener('visibilitychange', onVisibility)
      void acquire()
    },
    async stop() {
      stopped = true
      doc.removeEventListener('visibilitychange', onVisibility)
      const current = sentinel
      sentinel = null
      await current?.release().catch(() => {})
    },
  }
}
