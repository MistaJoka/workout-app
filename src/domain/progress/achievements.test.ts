import { describe, expect, it } from 'vitest'
import { ACHIEVEMENTS, evaluateAchievements, newlyUnlocked, type AchievementHistory } from './achievements'
import type { SessionEvent, SessionPlan, SessionResult } from '../session/types'
import { fullBodyA } from '../content/fixtures/foundationStrengthStarter'

// A finished session built the way the player stores it: start, then one
// SET_COMPLETED per planned set (rests skipped in between).
type Move = { id: string; sets?: number; reps?: number; seconds?: number }

let seq = 0
function session(
  id: string,
  endedAt: string,
  moves: Move[],
  opts: { templateId?: string; doneSets?: number; status?: SessionResult['status'] } = {}
): AchievementHistory {
  const plan: SessionPlan = {
    id,
    templateId: opts.templateId ?? 't',
    templateVersion: 1,
    packId: 'p',
    ruleVersion: 'v1',
    createdAt: endedAt,
    exercises: moves.map((m, order) => ({
      exerciseId: m.id,
      exerciseVersion: 1,
      name: m.id,
      sets: m.sets ?? 1,
      ...(m.seconds != null ? { timeSeconds: m.seconds } : { reps: m.reps ?? 10 }),
      restSeconds: 30,
      order,
    })),
    adaptations: [],
    reproducibilityHash: 'h',
  }
  const ev = (type: SessionEvent['type'], payload: Record<string, unknown> = {}): SessionEvent => {
    seq += 1
    return { seq, eventId: `${id}-${seq}`, sessionId: id, type, timestamp: endedAt, payload }
  }
  const events: SessionEvent[] = [ev('SESSION_STARTED')]
  const planned = moves.reduce((n, m) => n + (m.sets ?? 1), 0)
  const done = opts.doneSets ?? planned
  let logged = 0
  for (const m of moves) {
    for (let s = 0; s < (m.sets ?? 1) && logged < done; s++) {
      events.push(ev('SET_COMPLETED', { exerciseId: m.id, met: true }))
      events.push(ev('REST_SKIPPED'))
      logged += 1
    }
  }
  const result: SessionResult = {
    sessionId: id,
    planId: id,
    status: opts.status ?? (done === planned ? 'COMPLETED' : 'COMPLETED_SHORTENED'),
    startedAt: endedAt,
    endedAt,
    totalSetsCompleted: done,
    totalSetsPlanned: planned,
  }
  return { plans: [plan], results: [result], events }
}

function merge(...parts: AchievementHistory[]): AchievementHistory {
  return {
    plans: parts.flatMap((p) => p.plans),
    results: parts.flatMap((p) => p.results),
    events: parts.flatMap((p) => p.events),
  }
}

const at = (iso: string) => new Date(iso).toISOString()
const local = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).toISOString()
const unlocked = (h: AchievementHistory, goal = 2) =>
  new Map(evaluateAchievements(h, goal).filter((a) => a.unlockedAt).map((a) => [a.id, a]))

describe('evaluateAchievements', () => {
  it('has a stable, unique list of about fifteen', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.length).toBeGreaterThanOrEqual(15)
  })

  it('nothing is unlocked with no history', () => {
    expect(evaluateAchievements({ plans: [], results: [], events: [] }, 2).every((a) => a.unlockedAt === null)).toBe(true)
  })

  it('first workout unlocks on the first finished session, ended early or not', () => {
    const h = session('s1', local(2026, 9, 1), [{ id: 'sq', sets: 2 }], { doneSets: 1 })
    expect(unlocked(h).get('first-workout')).toMatchObject({ sessionId: 's1', unlockedAt: h.results[0].endedAt })
  })

  it('workout counts unlock at 5, 10, 25 and 50 on the session that reaches them', () => {
    const parts = Array.from({ length: 10 }, (_, i) => session(`c${i}`, local(2026, 8, i + 1), [{ id: 'sq' }]))
    const u = unlocked(merge(...parts))
    expect(u.get('workouts-5')?.sessionId).toBe('c4')
    expect(u.get('workouts-10')?.sessionId).toBe('c9')
    expect(u.has('workouts-25')).toBe(false)
  })

  it('three in one Monday-start week', () => {
    // Mon 2026-09-07, Wed 09, Sun 13: same week. The next Mon starts a new one.
    const h = merge(
      session('w1', local(2026, 9, 7), [{ id: 'sq' }]),
      session('w2', local(2026, 9, 9), [{ id: 'sq' }]),
      session('w3', local(2026, 9, 13), [{ id: 'sq' }])
    )
    expect(unlocked(h).get('three-in-a-week')?.sessionId).toBe('w3')
    const split = merge(
      session('x1', local(2026, 9, 12), [{ id: 'sq' }]),
      session('x2', local(2026, 9, 13), [{ id: 'sq' }]),
      session('x3', local(2026, 9, 14), [{ id: 'sq' }])
    )
    expect(unlocked(split).has('three-in-a-week')).toBe(false)
  })

  it('weekly goal met uses the goal passed in', () => {
    const h = merge(session('g1', local(2026, 9, 7), [{ id: 'sq' }]), session('g2', local(2026, 9, 8), [{ id: 'sq' }]))
    expect(unlocked(h, 2).get('weekly-goal')?.sessionId).toBe('g2')
    expect(unlocked(h, 3).has('weekly-goal')).toBe(false)
  })

  it('early bird before 8am, night owl from 9pm, local time', () => {
    const u = unlocked(
      merge(session('e', local(2026, 9, 1, 7), [{ id: 'sq' }]), session('n', local(2026, 9, 2, 21), [{ id: 'sq' }]))
    )
    expect(u.get('early-bird')?.sessionId).toBe('e')
    expect(u.get('night-owl')?.sessionId).toBe('n')
    expect(unlocked(session('m', local(2026, 9, 3, 12), [{ id: 'sq' }])).has('early-bird')).toBe(false)
  })

  it('full set needs every planned set done', () => {
    expect(unlocked(session('p', local(2026, 9, 1), [{ id: 'sq', sets: 2 }], { doneSets: 1 })).has('full-set')).toBe(false)
    expect(unlocked(session('f', local(2026, 9, 1), [{ id: 'sq', sets: 2 }])).get('full-set')?.sessionId).toBe('f')
  })

  it('every Full-Body A move done at least once, across sessions', () => {
    const ids = fullBodyA.exercises.map((e) => e.exerciseId)
    const h = merge(
      session('a1', local(2026, 9, 1), ids.slice(0, 2).map((id) => ({ id }))),
      session('a2', local(2026, 9, 2), ids.slice(2).map((id) => ({ id })))
    )
    expect(unlocked(h).get('full-body-a-complete')?.sessionId).toBe('a2')
  })

  it('ten different moves tried', () => {
    const nine = Array.from({ length: 9 }, (_, i) => ({ id: `m${i}` }))
    expect(unlocked(session('t1', local(2026, 9, 1), nine)).has('ten-moves')).toBe(false)
    const h = merge(session('t1', local(2026, 9, 1), nine), session('t2', local(2026, 9, 2), [{ id: 'm9' }]))
    expect(unlocked(h).get('ten-moves')?.sessionId).toBe('t2')
  })

  it('hold strong: 60 seconds of holds in one session', () => {
    expect(unlocked(session('h1', local(2026, 9, 1), [{ id: 'plank', sets: 2, seconds: 20 }])).has('hold-strong')).toBe(false)
    expect(unlocked(session('h2', local(2026, 9, 1), [{ id: 'plank', sets: 3, seconds: 20 }])).get('hold-strong')?.sessionId).toBe('h2')
  })

  it('welcome back after 7+ days away (never the first workout)', () => {
    const h = merge(session('b1', local(2026, 9, 1), [{ id: 'sq' }]), session('b2', local(2026, 9, 9), [{ id: 'sq' }]))
    expect(unlocked(h).get('welcome-back')?.sessionId).toBe('b2')
    const close = merge(session('c1', local(2026, 9, 1), [{ id: 'sq' }]), session('c2', local(2026, 9, 5), [{ id: 'sq' }]))
    expect(unlocked(close).has('welcome-back')).toBe(false)
  })

  it('warm-up plus a workout on the same day', () => {
    const h = merge(
      session('wu', local(2026, 9, 1, 9), [{ id: 'march' }], { templateId: 'draft.warm-up' }),
      session('wk', local(2026, 9, 1, 10), [{ id: 'sq' }], { templateId: 'fs.full-body-a' })
    )
    expect(unlocked(h).get('warmed-up')?.sessionId).toBe('wk')
    const otherDay = merge(
      session('wu', local(2026, 9, 1, 9), [{ id: 'march' }], { templateId: 'draft.warm-up' }),
      session('wk', local(2026, 9, 2, 10), [{ id: 'sq' }], { templateId: 'fs.full-body-a' })
    )
    expect(unlocked(otherDay).has('warmed-up')).toBe(false)
  })

  it('new best on the first session that beats an earlier one', () => {
    const h = merge(
      session('r1', local(2026, 9, 1), [{ id: 'sq', reps: 10 }]),
      session('r2', local(2026, 9, 3), [{ id: 'sq', reps: 12 }])
    )
    expect(unlocked(h).get('new-best')?.sessionId).toBe('r2')
  })

  it('newlyUnlocked lists only what that session unlocked', () => {
    const h = merge(session('s1', at('2026-09-01T07:00:00'), [{ id: 'sq' }]), session('s2', local(2026, 9, 3), [{ id: 'sq' }]))
    const evaluated = evaluateAchievements(h, 2)
    expect(newlyUnlocked(evaluated, 's1').map((a) => a.id)).toContain('first-workout')
    expect(newlyUnlocked(evaluated, 's2').map((a) => a.id)).not.toContain('first-workout')
  })
})
