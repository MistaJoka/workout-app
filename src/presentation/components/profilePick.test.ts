import { describe, expect, it } from 'vitest'
import { localDate, shouldShowProfilePick } from './profilePick'

describe('shouldShowProfilePick', () => {
  const base = { profileCount: 2, lastPickedDate: '2026-09-30', today: '2026-10-01', hash: '#/' }

  it('asks once a day when two or more people share the app', () => {
    expect(shouldShowProfilePick(base)).toBe(true)
  })

  it('never asks with one profile', () => {
    expect(shouldShowProfilePick({ ...base, profileCount: 1 })).toBe(false)
  })

  it('does not ask again the same day', () => {
    expect(shouldShowProfilePick({ ...base, lastPickedDate: '2026-10-01' })).toBe(false)
  })

  it('asks on the first open ever (never picked)', () => {
    expect(shouldShowProfilePick({ ...base, lastPickedDate: null })).toBe(true)
  })

  it('never interrupts a workout opened by a session link', () => {
    expect(shouldShowProfilePick({ ...base, hash: '#/session/abc' })).toBe(false)
    expect(shouldShowProfilePick({ ...base, hash: '#/session/abc/complete' })).toBe(false)
  })
})

describe('localDate', () => {
  it('formats the local calendar day as YYYY-MM-DD', () => {
    expect(localDate(new Date(2026, 9, 1, 23, 59))).toBe('2026-10-01')
    expect(localDate(new Date(2026, 0, 5, 0, 1))).toBe('2026-01-05')
  })
})
