import { describe, expect, it } from 'vitest'
import { activityDayLabel } from './activityDays'

describe('activityDayLabel', () => {
  const now = new Date(2026, 9, 29, 15) // Thursday

  it('names today and yesterday, then short weekdays', () => {
    expect(activityDayLabel('2026-10-29', now).short).toBe('Today')
    expect(activityDayLabel('2026-10-28', now).short).toBe('Yesterday')
    const monday = activityDayLabel('2026-10-26', now)
    expect(monday.short).toBe(new Date(2026, 9, 26).toLocaleDateString(undefined, { weekday: 'short' }))
    expect(monday.long).toContain('26')
  })
})
