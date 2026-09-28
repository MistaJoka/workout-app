import { describe, expect, it } from 'vitest'
import { backupFileName } from './downloadBackup'

describe('backupFileName', () => {
  it('names the profile and the day', () => {
    expect(backupFileName({ exportedAt: '2026-09-28T10:00:00.000Z', profile: { id: 'x', name: 'Rae & Me' } })).toBe(
      'workout-app-backup-rae-me-2026-09-28.json'
    )
  })

  it('falls back to the date alone for bundles with no profile', () => {
    expect(backupFileName({ exportedAt: '2026-09-28T10:00:00.000Z' })).toBe('workout-app-backup-2026-09-28.json')
  })
})
