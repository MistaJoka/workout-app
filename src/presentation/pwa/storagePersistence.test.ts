import { describe, expect, it } from 'vitest'
import { storageUsageLabel } from './storagePersistence'

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
