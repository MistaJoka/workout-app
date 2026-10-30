import { describe, expect, it } from 'vitest'
import { createBackSentinels, type SentinelWindow } from './historySentinel'

// A browser-like history: push/replace are synchronous, go() is a queued
// traversal that fires popstate later (as in Chrome/Safari). Capture
// listeners run first and stopImmediatePropagation hides the event from
// the rest (the router's listener).
type Entry = { state: unknown; url: string }

class FakeWindow implements SentinelWindow {
  entries: Entry[]
  index = 0
  private traversals: number[] = []
  private timers: Array<{ id: number; fn: () => void; at: number }> = []
  private now = 0
  private nextTimer = 1
  private captures: Array<(e: Event) => void> = []
  routerSaw: unknown[] = []

  constructor(url: string, state: unknown = { idx: 0 }) {
    this.entries = [{ state, url }]
  }

  history = {
    get state() {
      return self().entries[self().index].state
    },
    pushState: (data: unknown, _u: string, url?: string | URL | null) => {
      const cur = this.entries[this.index]
      this.entries = this.entries.slice(0, this.index + 1)
      this.entries.push({ state: data, url: url == null ? cur.url : String(url) })
      this.index += 1
    },
    replaceState: (data: unknown, _u: string, url?: string | URL | null) => {
      const cur = this.entries[this.index]
      this.entries[this.index] = { state: data, url: url == null ? cur.url : String(url) }
    },
    go: (delta = 0) => {
      this.traversals.push(delta)
    },
    back: () => this.history.go(-1),
    forward: () => this.history.go(1),
  }

  addEventListener(_type: 'popstate', listener: (e: Event) => void) {
    this.captures.push(listener)
  }
  setTimeout(fn: () => void, ms: number) {
    const id = this.nextTimer++
    this.timers.push({ id, fn, at: this.now + ms })
    return id
  }
  clearTimeout(id: unknown) {
    this.timers = this.timers.filter((t) => t.id !== id)
  }

  // Run queued traversals (each fires popstate) and timers due by `ms`.
  flush(ms = 0, timers = true) {
    for (let guard = 0; guard < 50; guard++) {
      const delta = this.traversals.shift()
      if (delta !== undefined) {
        const target = this.index + delta
        if (target < 0 || target >= this.entries.length) continue
        this.index = target
        this.dispatchPop()
        continue
      }
      if (!timers) break
      const due = this.timers.filter((t) => t.at <= this.now + ms).sort((a, b) => a.at - b.at)[0]
      if (!due) break
      this.timers = this.timers.filter((t) => t !== due)
      due.fn()
    }
  }

  private dispatchPop() {
    let stopped = false
    const event = { stopImmediatePropagation: () => (stopped = true) } as unknown as Event
    for (const l of this.captures) {
      l(event)
      if (stopped) return
    }
    this.routerSaw.push(this.url)
  }

  // What the user does with the back gesture.
  userBack() {
    // The browser's own traversal, not the (patched) page API.
    this.traversals.push(-1)
    this.flush(0, false)
  }

  get url() {
    return this.entries[this.index].url
  }
  get urls() {
    return this.entries.map((e) => e.url)
  }
}

function self(): FakeWindow {
  return current
}
let current: FakeWindow

function setup() {
  current = new FakeWindow('#/a')
  const win = current
  // Patched methods are what the router calls; grab them after creation.
  const sentinels = createBackSentinels(win)
  const router = {
    push: (url: string) => win.history.pushState({ idx: 1 }, '', url),
    replace: (url: string) => win.history.replaceState({ idx: 0 }, '', url),
    go: (n: number) => win.history.go(n),
  }
  return { win, sentinels, router }
}

describe('back sentinels', () => {
  it('holding adds one entry on the same URL; releasing removes it', () => {
    const { win, sentinels } = setup()
    const release = sentinels.hold(() => {})
    expect(win.urls).toEqual(['#/a', '#/a'])
    release()
    win.flush()
    expect(win.index).toBe(0)
    expect(win.routerSaw).toEqual([])
  })

  it('back calls the holder instead of reaching the router, then re-arms', () => {
    const { win, sentinels } = setup()
    let backs = 0
    sentinels.hold(() => backs++)
    win.userBack()
    expect(backs).toBe(1)
    expect(win.routerSaw).toEqual([])
    win.flush()
    expect(win.index).toBe(1)
    win.userBack()
    expect(backs).toBe(2)
  })

  it('the newest holder hears back first, and many holders share one entry', () => {
    const { win, sentinels } = setup()
    const heard: string[] = []
    sentinels.hold(() => heard.push('guard'))
    const releaseSheet = sentinels.hold(() => heard.push('sheet'))
    expect(win.entries).toHaveLength(2)
    win.userBack()
    expect(heard).toEqual(['sheet'])
    releaseSheet()
    win.flush()
    expect(win.entries).toHaveLength(2)
    win.userBack()
    expect(heard).toEqual(['sheet', 'guard'])
  })

  it('a router push while held takes the sentinel place (no junk entry)', () => {
    const { win, sentinels, router } = setup()
    const release = sentinels.hold(() => {})
    router.push('#/b')
    release()
    win.flush()
    expect(win.urls).toEqual(['#/a', '#/b'])
    expect(win.index).toBe(1)
  })

  it('a router go(-1) while held skips the sentinel and reaches the router', () => {
    current = new FakeWindow('#/a')
    const win = current
    win.history.pushState({ idx: 1 }, '', '#/b')
    const sentinels = createBackSentinels(win)
    const release = sentinels.hold(() => {})
    win.history.go(-1)
    release()
    win.flush()
    expect(win.url).toBe('#/a')
    expect(win.routerSaw).toEqual(['#/a'])
  })

  it('a router replace while held replaces the real entry', () => {
    current = new FakeWindow('#/a')
    const win = current
    win.history.pushState({ idx: 1 }, '', '#/b')
    const sentinels = createBackSentinels(win)
    const release = sentinels.hold(() => {})
    win.history.replaceState({ idx: 1 }, '', '#/c')
    expect(win.url).toBe('#/c')
    release()
    win.flush()
    expect(win.url).toBe('#/c')
    expect(win.index).toBe(1)
    expect(win.routerSaw).toEqual([])
    win.userBack()
    expect(win.url).toBe('#/a')
  })

  it('a push racing the release pop still ends on the new page with nothing junk beneath', () => {
    const { win, sentinels, router } = setup()
    const release = sentinels.hold(() => {})
    release() // pop queued, not yet traversed
    router.push('#/b')
    expect(win.url).toBe('#/b')
    win.flush()
    expect(win.url).toBe('#/b')
    expect(win.routerSaw).toEqual([])
    win.userBack()
    expect(win.url).toBe('#/a')
  })

  it('releasing twice is harmless, and a reload on a stale sentinel pops it', () => {
    const { win, sentinels } = setup()
    const release = sentinels.hold(() => {})
    release()
    release()
    win.flush()
    expect(win.index).toBe(0)

    current = new FakeWindow('#/a')
    const stale = current
    stale.history.pushState({ idx: 0, __backSentinel: true }, '')
    createBackSentinels(stale)
    stale.flush()
    expect(stale.index).toBe(0)
    expect(stale.routerSaw).toEqual([])
  })

  it('a holder that stays (busy sheet ignores back) is re-armed', () => {
    const { win, sentinels } = setup()
    sentinels.hold(() => {})
    win.userBack()
    expect(win.index).toBe(0)
    win.flush()
    expect(win.index).toBe(1)
  })
})
