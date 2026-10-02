import { describe, expect, it } from 'vitest'
import { BOSS_ROSTER, bossDefeats, bossForWeek, bossState, damageFromSession, pastBossWeeks, type BossHistory } from './bosses'
import type { SessionEvent, SessionPlan, SessionResult } from '../session/types'

function plan(id: string, exercises: SessionPlan['exercises']): SessionPlan {
  return {
    id,
    templateId: 't',
    templateVersion: 1,
    packId: 'p',
    ruleVersion: 'v1',
    createdAt: '2026-09-28T10:00:00.000Z',
    exercises,
    adaptations: [],
    reproducibilityHash: 'h',
  }
}

const repExercise = { exerciseId: 'squat', exerciseVersion: 1, name: 'Squat', sets: 2, reps: 10, restSeconds: 45, order: 0 }
const holdExercise = { exerciseId: 'plank', exerciseVersion: 1, name: 'Plank', sets: 1, timeSeconds: 20, restSeconds: 45, order: 0 }

let seq = 0
function ev(sessionId: string, type: SessionEvent['type'], payload: Record<string, unknown> = {}): SessionEvent {
  seq += 1
  return {
    seq,
    eventId: `e${seq}`,
    sessionId,
    type,
    timestamp: `2026-09-28T10:00:${String(seq).padStart(2, '0')}.000Z`,
    payload,
  }
}

function result(sessionId: string, planId: string, endedAt: string): SessionResult {
  return { sessionId, planId, status: 'COMPLETED', startedAt: endedAt, endedAt, totalSetsCompleted: 1, totalSetsPlanned: 1 }
}

describe('BOSS_ROSTER', () => {
  it('has eight cute, uniquely-identified bosses', () => {
    expect(BOSS_ROSTER).toHaveLength(8)
    expect(new Set(BOSS_ROSTER.map((b) => b.id)).size).toBe(8)
    for (const boss of BOSS_ROSTER) {
      expect(boss.name.length).toBeGreaterThan(0)
      expect(boss.flavor.length).toBeGreaterThan(0)
    }
  })
})

describe('bossForWeek', () => {
  it('is the same boss for any day inside one Monday-start week', () => {
    const monday = bossForWeek(new Date(2026, 8, 28)) // Monday Sep 28 2026
    const wednesday = bossForWeek(new Date(2026, 8, 30))
    const sunday = bossForWeek(new Date(2026, 9, 4)) // tail end of the same week
    expect(wednesday).toEqual(monday)
    expect(sunday).toEqual(monday)
  })

  it('always returns a roster member, deterministically for the same week', () => {
    const a = bossForWeek(new Date(2026, 9, 5)) // next Monday
    const b = bossForWeek(new Date(2026, 9, 5))
    expect(BOSS_ROSTER).toContainEqual(a)
    expect(a).toEqual(b)
  })

  it('is not always the same boss week over week', () => {
    const weeks = Array.from({ length: 12 }, (_, i) => bossForWeek(new Date(2026, 0, 5 + i * 7)))
    const distinct = new Set(weeks.map((b) => b.id))
    expect(distinct.size).toBeGreaterThan(1)
  })
})

describe('damageFromSession', () => {
  it('deals flat damage for a met rep set, doubled as a crit', () => {
    const p = plan('s1', [repExercise])
    const events = [
      ev('s1', 'SESSION_STARTED'),
      ev('s1', 'SET_COMPLETED', { met: true }),
      ev('s1', 'REST_SKIPPED'),
      ev('s1', 'SET_COMPLETED', { met: true }),
    ]
    const dmg = damageFromSession(p, events)
    expect(dmg.hits).toBe(2)
    expect(dmg.crits).toBe(2)
    expect(dmg.damage).toBe(10 * 2 * 2 + 25) // two met sets, each crit-doubled, plus the perfect bonus
    expect(dmg.perfectBonus).toBe(true) // every planned set counted and met
  })

  it('a missed set still lands (no crit), never a penalty', () => {
    const p = plan('s1', [repExercise])
    const events = [
      ev('s1', 'SESSION_STARTED'),
      ev('s1', 'SET_COMPLETED', { met: false }),
      ev('s1', 'REST_SKIPPED'),
      ev('s1', 'SET_COMPLETED', { met: true }),
    ]
    const dmg = damageFromSession(p, events)
    expect(dmg.hits).toBe(2)
    expect(dmg.crits).toBe(1)
    expect(dmg.damage).toBe(10 + 10 * 2) // one flat hit, one crit
    expect(dmg.perfectBonus).toBe(false) // the miss breaks "perfect"
  })

  it('a timed hold deals damage per 10 seconds, crit-doubled when met', () => {
    // Two exercises so finishing the hold alone isn't also a "perfect"
    // workout -- this test is only about the hold's own damage.
    const p = plan('s1', [holdExercise, repExercise])
    const events = [ev('s1', 'SESSION_STARTED'), ev('s1', 'SET_COMPLETED', { met: true })]
    const dmg = damageFromSession(p, events)
    // 20s hold = 2 ticks * 5 damage = 10, doubled for the crit = 20.
    expect(dmg.damage).toBe(20)
    expect(dmg.hits).toBe(1)
    expect(dmg.crits).toBe(1)
    expect(dmg.perfectBonus).toBe(false)
  })

  it('an undone set never lands a hit', () => {
    const p = plan('s1', [repExercise])
    const events = [ev('s1', 'SESSION_STARTED'), ev('s1', 'SET_COMPLETED', { met: true }), ev('s1', 'SET_UNDONE')]
    expect(damageFromSession(p, events).hits).toBe(0)
  })

  it('an empty session (no sets at all) deals no damage and is not perfect', () => {
    const p = plan('s1', [repExercise])
    const dmg = damageFromSession(p, [ev('s1', 'SESSION_STARTED')])
    expect(dmg).toEqual({ damage: 0, hits: 0, crits: 0, perfectBonus: false })
  })
})

describe('bossState', () => {
  const monday = new Date(2026, 8, 28)

  it('starts at full HP, scaled by the weekly goal, with no history', () => {
    const history: BossHistory = { plans: [], results: [], events: [] }
    const state = bossState(history, 3, monday, 20)
    expect(state.maxHp).toBe(60)
    expect(state.hp).toBe(60)
    expect(state.damageLog).toEqual([])
    expect(state.defeatedAt).toBeNull()
    expect(state.boss).toEqual(bossForWeek(monday))
  })

  it('accumulates damage across the week and logs one entry per day', () => {
    const p = plan('plan1', [repExercise])
    const day1 = [ev('s1', 'SESSION_STARTED'), ev('s1', 'SET_COMPLETED', { met: true })]
    const day2 = [ev('s2', 'SESSION_STARTED'), ev('s2', 'SET_COMPLETED', { met: false })]
    const history: BossHistory = {
      plans: [p],
      results: [result('s1', 'plan1', '2026-09-29T09:00:00.000Z'), result('s2', 'plan1', '2026-09-30T09:00:00.000Z')],
      events: [...day1, ...day2],
    }
    const state = bossState(history, 2, monday, 20)
    expect(state.maxHp).toBe(40)
    // s1: one met set = 20 damage. s2: one missed set = 10 damage. Total 30.
    expect(state.hp).toBe(10)
    expect(state.damageLog).toEqual([
      { date: '2026-09-29', hits: 1, crits: 1, damage: 20 },
      { date: '2026-09-30', hits: 1, crits: 0, damage: 10 },
    ])
    expect(state.defeatedAt).toBeNull()
  })

  it('clamps HP at zero and marks the defeating session, never dipping below', () => {
    const p = plan('plan1', [repExercise])
    const history: BossHistory = {
      plans: [p],
      results: [result('s1', 'plan1', '2026-09-29T09:00:00.000Z')],
      events: [
        ev('s1', 'SESSION_STARTED'),
        ev('s1', 'SET_COMPLETED', { met: true }),
        ev('s1', 'REST_SKIPPED'),
        ev('s1', 'SET_COMPLETED', { met: true }),
      ],
    }
    // Goal 1 -> maxHp 20; this session alone deals 65 damage (2 crits + perfect bonus).
    const state = bossState(history, 1, monday, 20)
    expect(state.hp).toBe(0)
    expect(state.defeatedAt).toBe('2026-09-29T09:00:00.000Z')
  })

  it('ignores sessions outside the requested week', () => {
    const p = plan('plan1', [repExercise])
    const history: BossHistory = {
      plans: [p],
      results: [result('s1', 'plan1', '2026-10-06T09:00:00.000Z')], // next week
      events: [ev('s1', 'SESSION_STARTED'), ev('s1', 'SET_COMPLETED', { met: true })],
    }
    const state = bossState(history, 2, monday, 20)
    expect(state.hp).toBe(state.maxHp)
    expect(state.damageLog).toEqual([])
  })

  it('skips a result whose plan is missing, without crashing', () => {
    const history: BossHistory = {
      plans: [],
      results: [result('s1', 'missing-plan', '2026-09-29T09:00:00.000Z')],
      events: [ev('s1', 'SESSION_STARTED'), ev('s1', 'SET_COMPLETED', { met: true })],
    }
    const state = bossState(history, 2, monday, 20)
    expect(state.hp).toBe(state.maxHp)
  })
})

describe('bossDefeats', () => {
  it('reports only the weeks actually defeated, oldest first, with the tipping session', () => {
    const p = plan('plan1', [repExercise])
    const week1Monday = new Date(2026, 8, 7)
    const week2Monday = new Date(2026, 8, 14)
    const history: BossHistory = {
      plans: [p],
      results: [
        // Week 1: one big session, defeats a goal-1 boss (maxHp 20).
        result('s1', 'plan1', '2026-09-08T09:00:00.000Z'),
        // Week 2: a tiny session, nowhere near enough to defeat it.
        result('s2', 'plan1', '2026-09-15T09:00:00.000Z'),
      ],
      events: [
        ev('s1', 'SESSION_STARTED'),
        ev('s1', 'SET_COMPLETED', { met: true }),
        ev('s2', 'SESSION_STARTED'),
        ev('s2', 'SET_COMPLETED', { met: false }),
      ],
    }
    const defeats = bossDefeats(history, 1, 20)
    expect(defeats).toHaveLength(1)
    expect(defeats[0].sessionId).toBe('s1')
    expect(defeats[0].bossId).toBe(bossForWeek(week1Monday).id)
    expect(defeats[0].weekStart).toBe('2026-09-07')
    expect(defeats[0].defeatedAt).toBe('2026-09-08T09:00:00.000Z')
    void week2Monday
  })

  it('returns nothing when history is empty', () => {
    expect(bossDefeats({ plans: [], results: [], events: [] }, 2)).toEqual([])
  })

  it('never doubly reports the same week from two sessions', () => {
    const p = plan('plan1', [repExercise])
    const history: BossHistory = {
      plans: [p],
      results: [
        result('s1', 'plan1', '2026-09-08T09:00:00.000Z'),
        result('s2', 'plan1', '2026-09-09T09:00:00.000Z'),
      ],
      events: [
        ev('s1', 'SESSION_STARTED'),
        ev('s1', 'SET_COMPLETED', { met: true }),
        ev('s1', 'REST_SKIPPED'),
        ev('s1', 'SET_COMPLETED', { met: true }),
        ev('s2', 'SESSION_STARTED'),
        ev('s2', 'SET_COMPLETED', { met: true }),
      ],
    }
    const defeats = bossDefeats(history, 1, 20)
    expect(defeats).toHaveLength(1)
    expect(defeats[0].sessionId).toBe('s1') // the first session already defeated it
  })
})

describe('pastBossWeeks', () => {
  const now = new Date(2026, 8, 30) // Wednesday of the Sep 28 2026 week

  it('excludes the current week and lists past weeks newest first', () => {
    const p = plan('plan1', [repExercise])
    const history: BossHistory = {
      plans: [p],
      results: [
        result('current', 'plan1', '2026-09-29T09:00:00.000Z'), // this week
        result('older', 'plan1', '2026-09-08T09:00:00.000Z'),
        result('newer', 'plan1', '2026-09-22T09:00:00.000Z'),
      ],
      events: [
        ev('current', 'SESSION_STARTED'),
        ev('current', 'SET_COMPLETED', { met: true }),
        ev('older', 'SESSION_STARTED'),
        ev('older', 'SET_COMPLETED', { met: true }),
        ev('newer', 'SESSION_STARTED'),
        ev('newer', 'SET_COMPLETED', { met: false }),
      ],
    }
    const weeks = pastBossWeeks(history, 2, now, 20)
    expect(weeks.map((w) => w.weekStart)).toEqual(['2026-09-21', '2026-09-07'])
  })

  it('marks a week that met HP defeated, and a week that didn\'t as escaped (defeatedAt null)', () => {
    const p = plan('plan1', [repExercise])
    const history: BossHistory = {
      plans: [p],
      results: [
        result('won', 'plan1', '2026-09-08T09:00:00.000Z'),
        result('lost', 'plan1', '2026-09-15T09:00:00.000Z'),
      ],
      events: [
        ev('won', 'SESSION_STARTED'),
        ev('won', 'SET_COMPLETED', { met: true }),
        ev('lost', 'SESSION_STARTED'),
        ev('lost', 'SET_COMPLETED', { met: false }),
      ],
    }
    // goal 1 -> maxHp 20: a crit (20 dmg) defeats it, a miss (10 dmg) doesn't.
    const weeks = pastBossWeeks(history, 1, now, 20)
    const won = weeks.find((w) => w.weekStart === '2026-09-07')
    const lost = weeks.find((w) => w.weekStart === '2026-09-14')
    expect(won?.defeatedAt).toBe('2026-09-08T09:00:00.000Z')
    expect(lost?.defeatedAt).toBeNull()
  })

  it('returns nothing when there is no history before the current week', () => {
    const history: BossHistory = { plans: [], results: [], events: [] }
    expect(pastBossWeeks(history, 2, now, 20)).toEqual([])
  })
})
