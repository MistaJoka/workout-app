import { describe, expect, it } from 'vitest'
import { BACKUP_NUDGE_DAYS, needsBackupNudge } from './backup'

const now = new Date('2026-09-29T12:00:00.000Z')
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000).toISOString()

describe('needsBackupNudge', () => {
  it('stays quiet until there is a finished workout to lose', () => {
    expect(needsBackupNudge(null, 0, now)).toBe(false)
  })

  it('asks when there has never been a backup', () => {
    expect(needsBackupNudge(null, 1, now)).toBe(true)
  })

  it(`asks once the last backup is older than ${BACKUP_NUDGE_DAYS} days`, () => {
    expect(needsBackupNudge(daysAgo(BACKUP_NUDGE_DAYS - 1), 5, now)).toBe(false)
    expect(needsBackupNudge(daysAgo(BACKUP_NUDGE_DAYS + 1), 5, now)).toBe(true)
  })

  it('treats an unreadable date as never backed up', () => {
    expect(needsBackupNudge('garbage', 1, now)).toBe(true)
  })

  it('can wait for more history before asking (Complete waits for the 3rd workout)', () => {
    expect(needsBackupNudge(null, 2, now, 3)).toBe(false)
    expect(needsBackupNudge(null, 3, now, 3)).toBe(true)
  })
})
