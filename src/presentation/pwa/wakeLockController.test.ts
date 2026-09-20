import { describe, expect, it, vi } from 'vitest'
import { createWakeLockController } from './wakeLockController'

type Deferred<T> = { promise: Promise<T>; resolve: (v: T) => void }
function deferred<T>(): Deferred<T> {
  let resolve!: (v: T) => void
  const promise = new Promise<T>((r) => (resolve = r))
  return { promise, resolve }
}

function fakeSentinel() {
  return { release: vi.fn(async () => {}) }
}

function fakeDoc(visibility: 'visible' | 'hidden' = 'visible') {
  const listeners = new Set<() => void>()
  return {
    get visibilityState() {
      return visibility
    },
    setVisibility(v: 'visible' | 'hidden') {
      visibility = v
      for (const l of listeners) l()
    },
    addEventListener: (_: string, l: () => void) => void listeners.add(l),
    removeEventListener: (_: string, l: () => void) => void listeners.delete(l),
  }
}

describe('wake lock controller', () => {
  it('acquires on start and releases on stop', async () => {
    const sentinel = fakeSentinel()
    const wakeLock = { request: vi.fn(async () => sentinel) }
    const doc = fakeDoc()
    const ctl = createWakeLockController(wakeLock, doc)
    ctl.start()
    await Promise.resolve()
    expect(wakeLock.request).toHaveBeenCalledWith('screen')
    await ctl.stop()
    expect(sentinel.release).toHaveBeenCalledTimes(1)
  })

  it('releases a lock that resolves after stop() (unmount raced the request)', async () => {
    const sentinel = fakeSentinel()
    const pending = deferred<typeof sentinel>()
    const wakeLock = { request: vi.fn(() => pending.promise) }
    const ctl = createWakeLockController(wakeLock, fakeDoc())
    ctl.start()
    const stopped = ctl.stop() // request still in flight
    pending.resolve(sentinel)
    await stopped
    await Promise.resolve()
    expect(sentinel.release).toHaveBeenCalledTimes(1)
  })

  it('releases the previous sentinel before re-acquiring on visibility return', async () => {
    const first = fakeSentinel()
    const second = fakeSentinel()
    const wakeLock = { request: vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second) }
    const doc = fakeDoc()
    const ctl = createWakeLockController(wakeLock, doc)
    ctl.start()
    await Promise.resolve()
    doc.setVisibility('hidden')
    doc.setVisibility('visible')
    await Promise.resolve()
    await Promise.resolve()
    expect(first.release).toHaveBeenCalledTimes(1)
    await ctl.stop()
    expect(second.release).toHaveBeenCalledTimes(1)
  })

  it('does not request while hidden and swallows a refused request', async () => {
    const wakeLock = { request: vi.fn(async () => Promise.reject(new Error('NotAllowed'))) }
    const doc = fakeDoc('hidden')
    const ctl = createWakeLockController(wakeLock, doc)
    ctl.start()
    await Promise.resolve()
    expect(wakeLock.request).not.toHaveBeenCalled()
    doc.setVisibility('visible')
    await Promise.resolve()
    expect(wakeLock.request).toHaveBeenCalledTimes(1)
    await expect(ctl.stop()).resolves.toBeUndefined()
  })
})
