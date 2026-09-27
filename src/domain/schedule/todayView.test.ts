import { describe, expect, it } from 'vitest'
import { EMPTY_SCHEDULE, type WeeklySchedule } from './weeklySchedule'
import { buildWeek, setsDone, todayMode, workoutsToday } from './todayView'

// Saturday 26 Sep 2026, 18:00 local.
const NOW = new Date(2026, 8, 26, 18, 0)

function result(day: number, hour = 9) {
  const ended = new Date(2026, 8, day, hour, 30)
  const started = new Date(2026, 8, day, hour, 10)
  return {
    sessionId: `s${day}-${hour}`,
    planId: `p${day}-${hour}`,
    status: 'COMPLETED' as const,
    startedAt: started.toISOString(),
    endedAt: ended.toISOString(),
    totalSetsCompleted: 10,
    totalSetsPlanned: 10,
  }
}

describe('buildWeek', () => {
  it('is Monday-first, seven days, with today marked', () => {
    const week = buildWeek([], null, NOW)
    expect(week.map((d) => d.letter)).toEqual(['M', 'T', 'W', 'T', 'F', 'S', 'S'])
    expect(week.filter((d) => d.isToday).map((d) => d.weekday)).toEqual([6])
  })

  it('blooms every day with a finished workout, counting repeats', () => {
    const week = buildWeek([result(21), result(23), result(23, 18)], null, NOW)
    expect(week.map((d) => d.mark)).toEqual(['done', 'open', 'done', 'open', 'open', 'open', 'open'])
    expect(week[2].count).toBe(2)
  })

  it('ignores workouts from other weeks', () => {
    const week = buildWeek([result(20), result(28)], null, NOW)
    expect(week.every((d) => d.mark === 'open')).toBe(true)
  })

  it('shows the schedule for days without a workout; a done day wins over its plan', () => {
    const schedule: WeeklySchedule = { ...EMPTY_SCHEDULE, 1: 'fs.full-body-a', 3: 'rest', 5: 'fs.quick-10' }
    const week = buildWeek([result(21)], schedule, NOW)
    expect(week.map((d) => d.mark)).toEqual(['done', 'open', 'rest', 'open', 'planned', 'open', 'open'])
  })

  it('never marks a past planned-but-skipped day as failed — it stays planned (a sprout)', () => {
    const schedule: WeeklySchedule = { ...EMPTY_SCHEDULE, 2: 'fs.full-body-a' }
    expect(buildWeek([], schedule, NOW)[1].mark).toBe('planned')
  })
})

describe('workoutsToday', () => {
  it('returns only results that ended today, newest first', () => {
    const today = workoutsToday([result(25), result(26, 8), result(26, 12)], NOW)
    expect(today.map((r) => r.sessionId)).toEqual(['s26-12', 's26-8'])
  })
})

describe('todayMode', () => {
  it('prefers resume, then done, then rest, then ready', () => {
    expect(todayMode({ inProgress: true, doneToday: true, restToday: true })).toBe('resume')
    expect(todayMode({ inProgress: false, doneToday: true, restToday: true })).toBe('done')
    expect(todayMode({ inProgress: false, doneToday: false, restToday: true })).toBe('rest')
    expect(todayMode({ inProgress: false, doneToday: false, restToday: false })).toBe('ready')
  })
})

describe('setsDone', () => {
  const plan = { exercises: [{ sets: 2 }, { sets: 3 }, { sets: 2 }] }

  it('counts every set of earlier exercises plus the finished sets of the current one', () => {
    expect(setsDone(plan, { currentExerciseIndex: 0, currentSetNumber: 1 })).toEqual({ done: 0, total: 7 })
    expect(setsDone(plan, { currentExerciseIndex: 1, currentSetNumber: 2 })).toEqual({ done: 3, total: 7 })
  })

  it('never exceeds the total', () => {
    expect(setsDone(plan, { currentExerciseIndex: 5, currentSetNumber: 9 })).toEqual({ done: 7, total: 7 })
  })
})
