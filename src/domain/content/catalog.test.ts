import { describe, expect, it, vi } from 'vitest'
import { memoizeUntilRejected } from './catalog'

describe('memoizeUntilRejected (the library loader)', () => {
  it('loads once and shares the result', async () => {
    const load = vi.fn().mockResolvedValue(['a'])
    const get = memoizeUntilRejected(load)
    expect(await get()).toEqual(['a'])
    expect(await get()).toEqual(['a'])
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('forgets a failed load, so Retry tries again instead of replaying the failure', async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error('chunk gone')).mockResolvedValue(['b'])
    const get = memoizeUntilRejected(load)
    await expect(get()).rejects.toThrow('chunk gone')
    expect(await get()).toEqual(['b'])
    expect(load).toHaveBeenCalledTimes(2)
  })
})
