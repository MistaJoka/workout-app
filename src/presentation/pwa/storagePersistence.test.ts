import { describe, expect, it } from 'vitest'
import { askPersist, storageUsageLabel } from './storagePersistence'

describe('askPersist', () => {
  it('is protected when already persisted, without asking again', async () => {
    let asked = 0
    const status = await askPersist({ persisted: async () => true, persist: async () => (asked++, true) })
    expect(status).toBe('protected')
    expect(asked).toBe(0)
  })

  it('asks when not yet persisted and reports the answer', async () => {
    expect(await askPersist({ persisted: async () => false, persist: async () => true })).toBe('protected')
    expect(await askPersist({ persisted: async () => false, persist: async () => false })).toBe('best-effort')
  })

  it('is unknown without the API or when it throws', async () => {
    expect(await askPersist(undefined)).toBe('unknown')
    expect(await askPersist({ persist: () => Promise.reject(new Error('nope')) })).toBe('unknown')
  })
})

describe('storageUsageLabel', () => {
  it('shows usage against the allowance', () => {
    expect(storageUsageLabel({ usage: 4_200_000, quota: 1_000_000_000 })).toBe('Using 4.2 MB of 1000 MB (0%)')
    expect(storageUsageLabel({ usage: 250_000_000, quota: 1_000_000_000 })).toBe('Using 250 MB of 1000 MB (25%)')
  })

  it('shows usage alone when the allowance is unknown, and nothing without usage', () => {
    expect(storageUsageLabel({ usage: 3_000_000 })).toBe('Using 3.0 MB')
    expect(storageUsageLabel(undefined)).toBeNull()
    expect(storageUsageLabel({})).toBeNull()
  })
})
