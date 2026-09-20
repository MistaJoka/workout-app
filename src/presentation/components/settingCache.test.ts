import { describe, expect, it, vi } from 'vitest'
import { createSettingCache } from './settingCache'

describe('createSettingCache', () => {
  it('peek() is the default until the first resolve', async () => {
    const load = vi.fn(async () => 'kg')
    const cache = createSettingCache(load, 'lb')
    expect(cache.peek()).toBe('lb')
    expect(await cache.resolve()).toBe('kg')
    expect(cache.peek()).toBe('kg')
  })

  it('loads from storage exactly once, even with concurrent resolves', async () => {
    const load = vi.fn(async () => 'kg')
    const cache = createSettingCache(load, 'lb')
    await Promise.all([cache.resolve(), cache.resolve(), cache.resolve()])
    await cache.resolve()
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('a missing stored value resolves to the default and is still cached', async () => {
    const load = vi.fn(async () => undefined)
    const cache = createSettingCache<string>(load, 'lb')
    expect(await cache.resolve()).toBe('lb')
    await cache.resolve()
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('set() updates the cache immediately so later readers skip storage', async () => {
    const load = vi.fn(async () => 'kg')
    const cache = createSettingCache(load, 'lb')
    cache.set('kg')
    expect(cache.peek()).toBe('kg')
    expect(await cache.resolve()).toBe('kg')
    expect(load).not.toHaveBeenCalled()
  })

  it('reset() forgets the value (test/profile-switch hook)', async () => {
    const load = vi.fn(async () => 'kg')
    const cache = createSettingCache(load, 'lb')
    await cache.resolve()
    cache.reset()
    expect(cache.peek()).toBe('lb')
    await cache.resolve()
    expect(load).toHaveBeenCalledTimes(2)
  })
})
