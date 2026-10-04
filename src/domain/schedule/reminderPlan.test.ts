import { describe, expect, it } from 'vitest'
import { planReminders, REMINDER_ID_BASE, REMINDER_WINDOW_DAYS } from './reminderPlan'
import { EMPTY_SCHEDULE, type WeeklySchedule } from './weeklySchedule'

// 2026-10-05 is a Monday.
const MONDAY_9AM = new Date(2026, 9, 5, 9, 0)
const SIX_PM = { hour: 18, minute: 0 }
const names = new Map([
  ['a', 'Full-Body A'],
  ['b', 'Full-Body B'],
])

function week(plans: Partial<WeeklySchedule>): WeeklySchedule {
  return { ...EMPTY_SCHEDULE, ...plans }
}

describe('planReminders', () => {
  it('reminds on each planned workout day in the window, at the chosen time', () => {
    const plan = planReminders({ schedule: week({ 1: 'a', 4: 'b' }), names, time: SIX_PM, now: MONDAY_9AM, doneToday: false })
    expect(plan.map((r) => r.at)).toEqual([
      new Date(2026, 9, 5, 18, 0),
      new Date(2026, 9, 8, 18, 0),
      new Date(2026, 9, 12, 18, 0),
      new Date(2026, 9, 15, 18, 0),
    ])
    expect(plan.map((r) => r.templateId)).toEqual(['a', 'b', 'a', 'b'])
  })

  it('names the workout in the body', () => {
    const [first] = planReminders({ schedule: week({ 1: 'a' }), names, time: SIX_PM, now: MONDAY_9AM, doneToday: false })
    expect(first.body).toBe('Full-Body A today. Tap to start.')
    expect(first.title.length).toBeGreaterThan(0)
  })

  it('skips rest days, unplanned days and routines that no longer exist', () => {
    const plan = planReminders({
      schedule: week({ 1: 'rest', 2: 'gone', 3: 'a' }),
      names,
      time: SIX_PM,
      now: MONDAY_9AM,
      doneToday: false,
    })
    expect(plan.map((r) => r.at.getDay())).toEqual([3, 3])
  })

  it("skips today once she's already finished a workout", () => {
    const plan = planReminders({ schedule: week({ 1: 'a' }), names, time: SIX_PM, now: MONDAY_9AM, doneToday: true })
    expect(plan.map((r) => r.at)).toEqual([new Date(2026, 9, 12, 18, 0)])
  })

  it("skips today's reminder once its time has passed", () => {
    const evening = new Date(2026, 9, 5, 19, 0)
    const plan = planReminders({ schedule: week({ 1: 'a' }), names, time: SIX_PM, now: evening, doneToday: false })
    expect(plan[0].at).toEqual(new Date(2026, 9, 12, 18, 0))
  })

  it(`never plans past the ${REMINDER_WINDOW_DAYS}-day window`, () => {
    const everyDay = week({ 0: 'a', 1: 'a', 2: 'a', 3: 'a', 4: 'a', 5: 'a', 6: 'a' })
    const plan = planReminders({ schedule: everyDay, names, time: SIX_PM, now: MONDAY_9AM, doneToday: false })
    expect(plan).toHaveLength(REMINDER_WINDOW_DAYS)
    const last = new Date(MONDAY_9AM)
    last.setDate(last.getDate() + REMINDER_WINDOW_DAYS - 1)
    expect(plan.at(-1)?.at.getDate()).toBe(last.getDate())
  })

  it('gives every reminder a distinct id in its own range', () => {
    const everyDay = week({ 0: 'a', 1: 'a', 2: 'a', 3: 'a', 4: 'a', 5: 'a', 6: 'a' })
    const ids = planReminders({ schedule: everyDay, names, time: SIX_PM, now: MONDAY_9AM, doneToday: false }).map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id - REMINDER_ID_BASE).toBeGreaterThanOrEqual(0)
    for (const id of ids) expect(id - REMINDER_ID_BASE).toBeLessThan(REMINDER_WINDOW_DAYS)
  })

  it('is empty with no schedule', () => {
    expect(planReminders({ schedule: null, names, time: SIX_PM, now: MONDAY_9AM, doneToday: false })).toEqual([])
  })

  it('keeps the local clock time across a daylight-saving change', () => {
    // US DST ends Sunday 2026-11-01.
    const friday = new Date(2026, 9, 30, 9, 0)
    const plan = planReminders({ schedule: week({ 1: 'a' }), names, time: SIX_PM, now: friday, doneToday: false })
    for (const r of plan) expect([r.at.getHours(), r.at.getMinutes()]).toEqual([18, 0])
  })

  it('picks the same title for the same day', () => {
    const args = { schedule: week({ 1: 'a' }), names, time: SIX_PM, now: MONDAY_9AM, doneToday: false }
    expect(planReminders(args)[0].title).toBe(planReminders(args)[0].title)
  })
})
