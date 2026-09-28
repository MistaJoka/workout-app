import { afterEach, describe, expect, it, vi } from 'vitest'
import { guardNavigation, setUnsavedGuard } from './unsavedGuard'

afterEach(() => setUnsavedGuard(null))

describe('unsavedGuard', () => {
  it('lets navigation through when nothing is unsaved', () => {
    const go = vi.fn()
    guardNavigation(go)
    expect(go).toHaveBeenCalledOnce()
  })

  it('hands the navigation to the registered guard instead of running it', () => {
    const guard = vi.fn()
    const go = vi.fn()
    setUnsavedGuard(guard)
    guardNavigation(go)
    expect(go).not.toHaveBeenCalled()
    expect(guard).toHaveBeenCalledWith(go)
  })

  it('clearing the guard only clears it for the screen that set it', () => {
    const first = vi.fn()
    const second = vi.fn()
    const clearFirst = setUnsavedGuard(first)
    setUnsavedGuard(second)
    clearFirst()
    const go = vi.fn()
    guardNavigation(go)
    expect(second).toHaveBeenCalledWith(go)
  })
})
