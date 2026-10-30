// The Android back gesture (and a browser's Back) is a history traversal.
// HashRouter can't block one, so a screen with unsaved edits or an open
// bottom sheet would just be left. A "sentinel" fixes that: one extra
// history entry with the same URL sits on top of the real one while
// something wants first say on Back. Back pops the sentinel instead of
// the page; we swallow that popstate before react-router sees it and tell
// the newest holder (close the sheet, ask "Leave without saving?").
//
// Rules that keep history clean:
// - At most ONE sentinel entry exists, however many holders there are.
// - When the last holder lets go, the sentinel is popped again (swallowed).
// - The router's own push/replace/go always lands where it would have
//   without a sentinel: a push replaces the sentinel, a go skips it, a
//   replace lands on the real entry. A push can't wait (react-router reads
//   window.location right after it), so anything the router does while one
//   of our own pops is in flight is re-applied to wherever that pop lands.

const KEY = '__backSentinel'

type HistoryLike = {
  readonly state: unknown
  pushState(data: unknown, unused: string, url?: string | URL | null): void
  replaceState(data: unknown, unused: string, url?: string | URL | null): void
  go(delta?: number): void
  back(): void
  forward(): void
}

export type SentinelWindow = {
  history: HistoryLike
  addEventListener(type: 'popstate', listener: (event: Event) => void, capture: boolean): void
  setTimeout(handler: () => void, ms: number): unknown
  clearTimeout(id: unknown): void
}

export type BackSentinels = {
  // While held, Back calls `onBack` (the newest holder first) instead of
  // leaving. Returns the release function; releasing twice is harmless.
  hold(onBack: () => void): () => void
}

// How long to wait for our own pop's popstate before giving up on it.
const POP_TIMEOUT_MS = 1000

export function createBackSentinels(win: SentinelWindow): BackSentinels {
  const h = win.history
  const orig = {
    push: h.pushState.bind(h),
    replace: h.replaceState.bind(h),
    go: h.go.bind(h),
  }

  type Holder = { onBack: () => void }
  let holders: Holder[] = []
  // The sentinel entry is the current history entry.
  let armed = false
  // Our own pops (go(-1) over the sentinel) whose popstate hasn't arrived.
  let ownPops = 0
  let ownPopTimer: unknown = null
  // The router's latest push/replace while an own pop was in flight.
  let lateOp: { data: unknown; url?: string | URL | null } | null = null
  // The router's go() calls waiting for an own pop to finish, and ones
  // already sent whose popstate the router must still get.
  let queuedGos: number[] = []
  let routerPops = 0
  let routerPopTimer: unknown = null
  let rearmTimer: unknown = null

  const isSentinel = (state: unknown) => !!state && typeof state === 'object' && (state as Record<string, unknown>)[KEY] === true

  function arm() {
    if (armed || ownPops > 0 || routerPops > 0 || holders.length === 0) return
    const base = h.state && typeof h.state === 'object' ? h.state : {}
    orig.push({ ...base, [KEY]: true }, '')
    armed = true
  }

  function scheduleRearm() {
    if (rearmTimer !== null) win.clearTimeout(rearmTimer)
    rearmTimer = win.setTimeout(() => {
      rearmTimer = null
      arm()
    }, 0)
  }

  function popOwn() {
    armed = false
    ownPops += 1
    if (ownPopTimer !== null) win.clearTimeout(ownPopTimer)
    ownPopTimer = win.setTimeout(() => {
      ownPopTimer = null
      if (ownPops > 0) {
        ownPops = 0
        settle()
      }
    }, POP_TIMEOUT_MS)
    orig.go(-1)
  }

  // An own pop finished: re-apply what the router did meanwhile, then run
  // its waiting go() calls, then put the sentinel back if still held.
  function settle() {
    if (ownPops > 0) return
    if (ownPopTimer !== null) {
      win.clearTimeout(ownPopTimer)
      ownPopTimer = null
    }
    if (lateOp) {
      orig.replace(lateOp.data, '', lateOp.url)
      lateOp = null
    }
    const gos = queuedGos
    queuedGos = []
    for (const delta of gos) sendGo(delta)
    arm()
  }

  function sendGo(delta: number) {
    if (armed && delta < 0) {
      armed = false
      delta -= 1
    }
    routerPops += 1
    // An out-of-range go() never fires popstate: don't wait for it forever.
    if (routerPopTimer !== null) win.clearTimeout(routerPopTimer)
    routerPopTimer = win.setTimeout(() => {
      routerPopTimer = null
      if (routerPops > 0) {
        routerPops = 0
        arm()
      }
    }, POP_TIMEOUT_MS)
    orig.go(delta)
  }

  h.pushState = (data, unused, url) => {
    if (armed) {
      // Leaving while held (e.g. "Leave" in a sheet): the new page takes
      // the sentinel's place, so nothing junk stays under it.
      armed = false
      orig.replace(data, unused, url)
      scheduleRearm()
      return
    }
    orig.push(data, unused, url)
    if (ownPops > 0) lateOp = { data, url }
  }

  h.replaceState = (data, unused, url) => {
    if (armed && !isSentinel(data)) {
      // The real entry is under the sentinel: show the new URL now, pop the
      // sentinel, and replace the real entry when we land on it.
      orig.replace(data, unused, url)
      popOwn()
      lateOp = { data, url }
      return
    }
    orig.replace(data, unused, url)
    if (ownPops > 0) lateOp = { data, url }
  }

  h.go = (delta = 0) => {
    if (delta === 0) return orig.go(0)
    if (ownPops > 0) queuedGos.push(delta)
    else sendGo(delta)
  }
  h.back = () => h.go(-1)
  h.forward = () => h.go(1)

  win.addEventListener(
    'popstate',
    (event) => {
      if (ownPops > 0) {
        event.stopImmediatePropagation()
        ownPops -= 1
        settle()
        return
      }
      if (routerPops > 0) {
        routerPops -= 1
        if (routerPops === 0 && holders.length > 0) scheduleRearm()
        return
      }
      if (!armed) return
      // The user went Back over the sentinel: the page stays.
      event.stopImmediatePropagation()
      armed = false
      const top = holders[holders.length - 1]
      top?.onBack()
      scheduleRearm()
    },
    true
  )

  // A reload while a sentinel was on top leaves it as the current entry.
  if (isSentinel(h.state)) popOwn()

  return {
    hold(onBack) {
      const holder: Holder = { onBack }
      holders.push(holder)
      arm()
      return () => {
        const at = holders.indexOf(holder)
        if (at < 0) return
        holders.splice(at, 1)
        if (holders.length === 0) {
          if (rearmTimer !== null) {
            win.clearTimeout(rearmTimer)
            rearmTimer = null
          }
          if (armed) popOwn()
        }
      }
    },
  }
}

let shared: BackSentinels | null | undefined

// The app-wide instance on the real window (null outside a browser).
export function backSentinels(): BackSentinels | null {
  if (shared === undefined) {
    shared = typeof window !== 'undefined' && window.history ? createBackSentinels(window as unknown as SentinelWindow) : null
  }
  return shared
}
