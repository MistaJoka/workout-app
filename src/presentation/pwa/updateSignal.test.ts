import { beforeEach, describe, expect, it, vi } from 'vitest'
import { notifyUpdateReady, resetUpdateSignalForTests, subscribeUpdateReady } from './updateSignal'

beforeEach(() => resetUpdateSignalForTests())

describe('updateSignal', () => {
  it('notifies current subscribers when an update is ready', () => {
    const listener = vi.fn()
    subscribeUpdateReady(listener)
    notifyUpdateReady()
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('replays the signal to a subscriber that arrives after the update was announced', () => {
    notifyUpdateReady()
    const listener = vi.fn()
    subscribeUpdateReady(listener)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('stops notifying after unsubscribe', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeUpdateReady(listener)
    unsubscribe()
    notifyUpdateReady()
    expect(listener).not.toHaveBeenCalled()
  })
})
