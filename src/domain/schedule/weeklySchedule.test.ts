import { describe, expect, it } from 'vitest'
import { EMPTY_SCHEDULE, isScheduleSet, pruneSchedule, resolveToday, withoutTemplate, type WeeklySchedule } from './weeklySchedule'

// 2026-09-19 is a Saturday (getDay() === 6); 2026-09-21 is a Monday (1).
const saturday = new Date(2026, 8, 19, 9, 0)
const monday = new Date(2026, 8, 21, 9, 0)

describe('resolveToday', () => {
  it('returns the scheduled routine for today when one is set', () => {
    const schedule: WeeklySchedule = { ...EMPTY_SCHEDULE, 6: 'fs.full-body-a' }
    expect(resolveToday(schedule, saturday, 'fs.full-body-b')).toEqual({ kind: 'scheduled', templateId: 'fs.full-body-a' })
  })

  it('returns a rest day when today is marked rest', () => {
    const schedule: WeeklySchedule = { ...EMPTY_SCHEDULE, 1: 'rest' }
    expect(resolveToday(schedule, monday, 'fs.full-body-b')).toEqual({ kind: 'rest' })
  })

  it('falls back to the rotation suggestion when today is unset', () => {
    const schedule: WeeklySchedule = { ...EMPTY_SCHEDULE, 1: 'fs.full-body-a' }
    expect(resolveToday(schedule, saturday, 'fs.full-body-b')).toEqual({ kind: 'unscheduled', templateId: 'fs.full-body-b' })
  })

  it('treats a missing schedule as unscheduled', () => {
    expect(resolveToday(null, saturday, 'fs.quick-10')).toEqual({ kind: 'unscheduled', templateId: 'fs.quick-10' })
  })
})

describe('isScheduleSet', () => {
  it('is false for an empty or missing schedule and true once any day is set', () => {
    expect(isScheduleSet(null)).toBe(false)
    expect(isScheduleSet(EMPTY_SCHEDULE)).toBe(false)
    expect(isScheduleSet({ ...EMPTY_SCHEDULE, 3: 'rest' })).toBe(true)
  })
})

describe('pruneSchedule', () => {
  it('clears days holding a template id that no longer exists, keeping rest and known ids', () => {
    const schedule: WeeklySchedule = { ...EMPTY_SCHEDULE, 1: 'fs.full-body-a', 2: 'custom.deleted', 3: 'rest' }
    expect(pruneSchedule(schedule, new Set(['fs.full-body-a']))).toEqual({ ...EMPTY_SCHEDULE, 1: 'fs.full-body-a', 3: 'rest' })
  })

  it('returns the same object when nothing is stale', () => {
    const schedule: WeeklySchedule = { ...EMPTY_SCHEDULE, 1: 'fs.full-body-a' }
    expect(pruneSchedule(schedule, new Set(['fs.full-body-a']))).toBe(schedule)
  })

  it('clears one removed routine everywhere it was planned', () => {
    const schedule: WeeklySchedule = { ...EMPTY_SCHEDULE, 1: 'custom.x', 4: 'custom.x', 5: 'fs.quick-10' }
    expect(withoutTemplate(schedule, 'custom.x')).toEqual({ ...EMPTY_SCHEDULE, 5: 'fs.quick-10' })
  })
})
