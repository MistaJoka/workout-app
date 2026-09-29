import { describe, expect, it } from 'vitest'
import { buildScheduleIcs, nextOccurrence } from './calendarExport'
import { EMPTY_SCHEDULE, type WeeklySchedule } from './weeklySchedule'

const names = new Map([
  ['fs.full-body-a', 'Full-Body A'],
  ['fs.quick-10', 'Quick 10'],
  ['custom.x', 'Legs, Core; Day'],
])

// Monday, September 28 2026, 10:00 local.
const now = new Date(2026, 8, 28, 10, 0, 0)

function unfold(ics: string | null): string[] {
  expect(ics).not.toBeNull()
  return ics!.split('\r\n')
}

describe('nextOccurrence', () => {
  it('is today when the time is still ahead, else the next matching weekday', () => {
    expect(nextOccurrence(now, 1, { hour: 18, minute: 0 })).toEqual(new Date(2026, 8, 28, 18, 0))
    expect(nextOccurrence(now, 1, { hour: 7, minute: 0 })).toEqual(new Date(2026, 9, 5, 7, 0))
    expect(nextOccurrence(now, 3, { hour: 7, minute: 30 })).toEqual(new Date(2026, 8, 30, 7, 30))
    expect(nextOccurrence(now, 0, { hour: 9, minute: 0 })).toEqual(new Date(2026, 9, 4, 9, 0))
  })
})

describe('buildScheduleIcs', () => {
  const schedule: WeeklySchedule = { ...EMPTY_SCHEDULE, 1: 'fs.full-body-a', 3: 'rest', 5: 'custom.x', 6: 'gone.id' }

  it('writes one weekly repeating event with an on-time alert per planned workout day', () => {
    const lines = unfold(buildScheduleIcs(schedule, names, { hour: 18, minute: 0 }, now))
    expect(lines[0]).toBe('BEGIN:VCALENDAR')
    expect(lines).toContain('VERSION:2.0')
    expect(lines.filter((l) => l === 'BEGIN:VEVENT')).toHaveLength(2)
    expect(lines).toContain('RRULE:FREQ=WEEKLY;BYDAY=MO')
    expect(lines).toContain('RRULE:FREQ=WEEKLY;BYDAY=FR')
    expect(lines).toContain('DTSTART:20260928T180000')
    expect(lines).toContain('DTSTART:20261002T180000')
    expect(lines).toContain('SUMMARY:Full-Body A')
    expect(lines.filter((l) => l === 'TRIGGER:PT0M')).toHaveLength(2)
    expect(lines.filter((l) => l === 'ACTION:DISPLAY')).toHaveLength(2)
    expect(lines[lines.length - 2]).toBe('END:VCALENDAR')
    expect(lines[lines.length - 1]).toBe('')
  })

  it('skips rest days, unplanned days and routines that no longer exist', () => {
    const ics = buildScheduleIcs(schedule, names, { hour: 18, minute: 0 }, now)
    expect(ics).not.toContain('BYDAY=WE')
    expect(ics).not.toContain('BYDAY=SA')
    expect(ics).not.toContain('gone.id')
  })

  it('escapes commas and semicolons in names, and gives each day a stable id', () => {
    const lines = unfold(buildScheduleIcs(schedule, names, { hour: 7, minute: 5 }, now))
    expect(lines).toContain('SUMMARY:Legs\\, Core\\; Day')
    expect(lines).toContain('UID:workout-app-weekday-5@workout-app')
    expect(lines).toContain('DTSTART:20261002T070500')
  })

  it('returns null when no day holds a workout', () => {
    expect(buildScheduleIcs({ ...EMPTY_SCHEDULE, 2: 'rest' }, names, { hour: 18, minute: 0 }, now)).toBeNull()
  })
})
