import { describe, expect, it } from 'vitest'
import { buildMonthRecap, buildWeekRecap, monthKey, monthRecapOffer, parseMonthParam, parseWeekParam, recapOffer, weekKey, weekStartOf } from './recap'
import { speciesFor } from './garden'
import type { SessionEvent, SessionPlan, SessionResult } from '../session/types'

const squat = { exerciseId: 'squat', exerciseVersion: 1, name: 'Squat', sets: 2, reps: 10, restSeconds: 45, order: 0 }

function plan(id: string, reps = 10): SessionPlan {
  return {
    id,
    templateId: 't',
    templateVersion: 1,
    packId: 'p',
    ruleVersion: 'v1',
    createdAt: '2026-09-01T00:00:00.000Z',
    exercises: [{ ...squat, reps }],
    adaptations: [],
    reproducibilityHash: 'h',
  }
}

function result(id: string, startedAt: string, minutes: number, sets = 2): SessionResult {
  const endedAt = new Date(new Date(startedAt).getTime() + minutes * 60_000).toISOString()
  return { sessionId: id, planId: id, status: 'COMPLETED', startedAt, endedAt, totalSetsCompleted: sets, totalSetsPlanned: 2 }
}

function events(id: string, at: string): SessionEvent[] {
  return [
    { seq: 1, eventId: `${id}-1`, sessionId: id, type: 'SESSION_STARTED', timestamp: at, payload: {} },
    { seq: 2, eventId: `${id}-2`, sessionId: id, type: 'SET_COMPLETED', timestamp: at, payload: { exerciseId: 'squat', met: true } },
    { seq: 3, eventId: `${id}-3`, sessionId: id, type: 'REST_SKIPPED', timestamp: at, payload: {} },
    { seq: 4, eventId: `${id}-4`, sessionId: id, type: 'SET_COMPLETED', timestamp: at, payload: { exerciseId: 'squat', met: true } },
  ]
}

// Local-time instants so week boundaries match the user's calendar.
const local = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).toISOString()

describe('weekStartOf / weekKey / parseWeekParam', () => {
  it('starts weeks on Monday, local time', () => {
    expect(weekKey(weekStartOf(new Date(2026, 9, 4, 9)))).toBe('2026-09-28') // Sunday Oct 4 -> Mon Sep 28
    expect(weekKey(weekStartOf(new Date(2026, 8, 28, 0, 5)))).toBe('2026-09-28')
    expect(weekKey(weekStartOf(new Date(2026, 9, 1)))).toBe('2026-09-28')
  })

  it('reads ?week= as the Monday of that date, and rejects junk', () => {
    expect(weekKey(parseWeekParam('2026-10-01')!)).toBe('2026-09-28')
    expect(parseWeekParam('nope')).toBeNull()
    expect(parseWeekParam(null)).toBeNull()
  })
})

describe('buildWeekRecap', () => {
  const week = new Date(2026, 8, 28)

  it('counts only this week: workouts vs goal, sets, minutes, flowers', () => {
    const history = {
      plans: [plan('a'), plan('b'), plan('old')],
      results: [result('a', local(2026, 9, 29), 14), result('b', local(2026, 10, 2), 9, 1), result('old', local(2026, 9, 20), 30)],
      events: [...events('a', local(2026, 9, 29)), ...events('b', local(2026, 10, 2)), ...events('old', local(2026, 9, 20))],
    }
    const recap = buildWeekRecap(history, [], 2, week)
    expect(recap.weekStart).toBe('2026-09-28')
    expect(recap.workouts).toBe(2)
    expect(recap.goal).toBe(2)
    expect(recap.goalMet).toBe(true)
    expect(recap.sets).toBe(3)
    expect(recap.minutes).toBe(23)
    expect(recap.flowers.map((f) => f.sessionId)).toEqual(['a', 'b'])
    expect(recap.quiet).toBe(false)
  })

  it('a species seen before this week is not "new"; first sightings this week are', () => {
    const history = {
      plans: [plan('old'), plan('a')],
      results: [result('old', local(2026, 9, 20), 10), result('a', local(2026, 9, 29), 10)],
      events: [],
    }
    const recap = buildWeekRecap(history, [], 2, week)
    const oldId = speciesFor('old').id
    const aId = speciesFor('a').id
    expect(recap.newSpecies.map((s) => s.id)).toEqual(aId === oldId ? [] : [aId])
  })

  it('lists badges unlocked this week and new bests beaten this week', () => {
    const history = {
      plans: [plan('old', 10), plan('a', 12)],
      results: [result('old', local(2026, 9, 20), 10), result('a', local(2026, 9, 29), 10)],
      events: [...events('old', local(2026, 9, 20)), ...events('a', local(2026, 9, 29))],
    }
    const badges = [
      { id: 'first-workout', title: 'First bloom', description: '', icon: 'sprout' as const, unlockedAt: local(2026, 9, 20), sessionId: 'old' },
      { id: 'full-set', title: 'Full set', description: '', icon: 'star' as const, unlockedAt: local(2026, 9, 29), sessionId: 'a' },
      { id: 'night-owl', title: 'Night owl', description: '', icon: 'moon' as const, unlockedAt: null, sessionId: null },
    ]
    const recap = buildWeekRecap(history, badges, 2, week)
    expect(recap.badges.map((b) => b.id)).toEqual(['full-set'])
    expect(recap.bests.map((b) => [b.exerciseName, b.value])).toEqual([['Squat', 12]])
  })

  it('a quiet week is gentle: no workouts, warm sign-off, never shame', () => {
    const recap = buildWeekRecap({ plans: [], results: [], events: [] }, [], 3, week)
    expect(recap.quiet).toBe(true)
    expect(recap.signOff).toMatch(/rest/i)
    expect(recap.signOff).not.toMatch(/miss|fail|lost|behind|should/i)
  })

  it('the sign-off is stable for a week', () => {
    const h = { plans: [plan('a')], results: [result('a', local(2026, 9, 29), 10)], events: [] }
    expect(buildWeekRecap(h, [], 2, week).signOff).toBe(buildWeekRecap(h, [], 2, week).signOff)
  })
})

describe('recapOffer', () => {
  const thisWeek = '2026-09-28'
  const lastWeek = '2026-09-21'

  it('on Sunday offers this week once the profile has any workout, until seen', () => {
    const sunday = new Date(2026, 9, 4, 18)
    expect(recapOffer(sunday, { thisWeek: 0, lastWeek: 0, ever: 0 }, null)).toBeNull()
    expect(recapOffer(sunday, { thisWeek: 0, lastWeek: 1, ever: 3 }, null)).toEqual({ weekStart: thisWeek })
    expect(recapOffer(sunday, { thisWeek: 2, lastWeek: 1, ever: 3 }, thisWeek)).toBeNull()
  })

  it('Monday to Saturday offers last week if it had a workout, until seen', () => {
    const monday = new Date(2026, 8, 28, 9)
    expect(recapOffer(monday, { thisWeek: 0, lastWeek: 1, ever: 1 }, null)).toEqual({ weekStart: lastWeek })
    expect(recapOffer(monday, { thisWeek: 0, lastWeek: 0, ever: 1 }, null)).toBeNull()
    expect(recapOffer(new Date(2026, 9, 1), { thisWeek: 0, lastWeek: 2, ever: 2 }, lastWeek)).toBeNull()
  })
})

describe('monthKey / parseMonthParam', () => {
  it('formats and parses YYYY-MM in local time', () => {
    expect(monthKey(new Date(2026, 8, 15))).toBe('2026-09')
    expect(monthKey(parseMonthParam('2026-09')!)).toBe('2026-09')
    expect(parseMonthParam('2026-09-01')).toBeNull()
    expect(parseMonthParam('nope')).toBeNull()
    expect(parseMonthParam(null)).toBeNull()
  })
})

describe('buildMonthRecap', () => {
  const september = new Date(2026, 8, 1)

  it('counts only this calendar month: workouts, sets, minutes, flowers', () => {
    const history = {
      plans: [plan('a'), plan('b'), plan('aug'), plan('oct')],
      results: [
        result('a', local(2026, 9, 3), 14),
        result('b', local(2026, 9, 29), 9, 1),
        result('aug', local(2026, 8, 31), 30),
        result('oct', local(2026, 10, 1), 10),
      ],
      events: [],
    }
    const recap = buildMonthRecap(history, [], september)
    expect(recap.monthKey).toBe('2026-09')
    expect(recap.year).toBe(2026)
    expect(recap.month).toBe(8)
    expect(recap.workouts).toBe(2)
    expect(recap.sets).toBe(3)
    expect(recap.minutes).toBe(23)
    expect(recap.flowers.map((f) => f.sessionId)).toEqual(['a', 'b'])
    expect(recap.quiet).toBe(false)
  })

  it('a species seen before this month is not "new"; first sightings this month are', () => {
    const history = {
      plans: [plan('aug'), plan('a')],
      results: [result('aug', local(2026, 8, 20), 10), result('a', local(2026, 9, 5), 10)],
      events: [],
    }
    const recap = buildMonthRecap(history, [], september)
    const augId = speciesFor('aug').id
    const aId = speciesFor('a').id
    expect(recap.newSpecies.map((s) => s.id)).toEqual(aId === augId ? [] : [aId])
  })

  it('lists badges unlocked this month and new bests beaten this month', () => {
    const history = {
      plans: [plan('aug', 10), plan('a', 12)],
      results: [result('aug', local(2026, 8, 20), 10), result('a', local(2026, 9, 5), 10)],
      events: [...events('aug', local(2026, 8, 20)), ...events('a', local(2026, 9, 5))],
    }
    const badges = [
      { id: 'first-workout', title: 'First bloom', description: '', icon: 'sprout' as const, unlockedAt: local(2026, 8, 20), sessionId: 'aug' },
      { id: 'full-set', title: 'Full set', description: '', icon: 'star' as const, unlockedAt: local(2026, 9, 5), sessionId: 'a' },
      { id: 'night-owl', title: 'Night owl', description: '', icon: 'moon' as const, unlockedAt: null, sessionId: null },
    ]
    const recap = buildMonthRecap(history, badges, september)
    expect(recap.badges.map((b) => b.id)).toEqual(['full-set'])
    expect(recap.bests.map((b) => [b.exerciseName, b.value])).toEqual([['Squat', 12]])
  })

  it('finds the rarest flower grown this month', () => {
    const ids = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8']
    const results = ids.map((id, i) => result(id, local(2026, 9, i + 1), 10))
    const history = { plans: ids.map((id) => plan(id)), results, events: [] }
    const recap = buildMonthRecap(history, [], september)
    const rank: Record<string, number> = { common: 0, uncommon: 1, rare: 2, legendary: 3 }
    const expected = ids.map(speciesFor).reduce((best, sp) => (rank[sp.rarity] > rank[best.rarity] ? sp : best))
    expect(recap.rarestFlower?.species.id).toBe(expected.id)
  })

  it('finds the most active weekday', () => {
    // Sep 2, 9, 16, 23, 2026 are all Wednesdays; Sep 4 is one Friday.
    const wednesdays = ['w1', 'w2', 'w3'].map((id, i) => result(id, local(2026, 9, 2 + i * 7), 10))
    const friday = result('f1', local(2026, 9, 4), 10)
    const history = { plans: [...['w1', 'w2', 'w3'], 'f1'].map((id) => plan(id)), results: [...wednesdays, friday], events: [] }
    const recap = buildMonthRecap(history, [], september)
    expect(recap.topWeekday).toEqual({ label: 'Wednesday', count: 3 })
  })

  it('finds the longest run of consecutive active weeks inside the month', () => {
    // September 2026: weeks inside the month start Mon Sep 7, 14, 21, 28.
    // Active on Sep 7 and Sep 14 (a 2-week streak), quiet on Sep 21, active again on Sep 28.
    const history = {
      plans: ['a', 'b', 'c'].map((id) => plan(id)),
      results: [result('a', local(2026, 9, 8), 10), result('b', local(2026, 9, 15), 10), result('c', local(2026, 9, 29), 10)],
      events: [],
    }
    const recap = buildMonthRecap(history, [], september)
    expect(recap.longestWeekStreak).toBe(2)
  })

  it('a quiet month is gentle: no workouts, warm sign-off, never shame', () => {
    const recap = buildMonthRecap({ plans: [], results: [], events: [] }, [], september)
    expect(recap.quiet).toBe(true)
    expect(recap.workouts).toBe(0)
    expect(recap.topWeekday).toBeNull()
    expect(recap.rarestFlower).toBeNull()
    expect(recap.signOff).toMatch(/rest|here when you/i)
    expect(recap.signOff).not.toMatch(/miss|fail|lost|behind|should/i)
  })

  it('the sign-off is stable for a month', () => {
    const h = { plans: [plan('a')], results: [result('a', local(2026, 9, 5), 10)], events: [] }
    expect(buildMonthRecap(h, [], september).signOff).toBe(buildMonthRecap(h, [], september).signOff)
  })
})

describe('monthRecapOffer', () => {
  it('only offers in the first three days of a month', () => {
    expect(monthRecapOffer(new Date(2026, 9, 1), { previousMonth: 1 }, null)).toEqual({ monthKey: '2026-09' })
    expect(monthRecapOffer(new Date(2026, 9, 3), { previousMonth: 1 }, null)).toEqual({ monthKey: '2026-09' })
    expect(monthRecapOffer(new Date(2026, 9, 4), { previousMonth: 1 }, null)).toBeNull()
  })

  it('only offers when the previous month had a finished workout, until seen', () => {
    expect(monthRecapOffer(new Date(2026, 9, 2), { previousMonth: 0 }, null)).toBeNull()
    expect(monthRecapOffer(new Date(2026, 9, 2), { previousMonth: 1 }, '2026-09')).toBeNull()
    expect(monthRecapOffer(new Date(2026, 9, 2), { previousMonth: 1 }, '2026-08')).toEqual({ monthKey: '2026-09' })
  })
})
