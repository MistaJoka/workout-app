import type { SessionEvent, SessionPlan, SessionResult } from '../../session/types'
import type { ActivityEntry } from '../activities'
import { effectiveSetSlots } from '../../session/appliedEvents'
import { fullBodyA } from '../../content/fixtures/foundationStrengthStarter'

// A deterministic, varied history for perf guards and golden comparisons:
// about one workout every 2.4 days for `sessions` workouts, ending just
// before `now`. It mixes what real history holds: rep, timed and weighted
// moves, misses, logged reps and loads, undone and stray taps, skipped
// moves, shortened workouts, sessions stored without a start event, equal
// end times, long gaps, warm-ups, unfinished plans, week-goal snapshots and
// other activities (some deleted). Test-only: nothing in the app imports it.

export type SyntheticHistory = {
  plans: SessionPlan[]
  results: SessionResult[]
  events: SessionEvent[]
  activities: ActivityEntry[]
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Move = { id: string; kind: 'reps' | 'timed' | 'weighted' }

const MOVES: Move[] = [
  ...fullBodyA.exercises.map((e, i): Move => ({ id: e.exerciseId, kind: i === 2 ? 'timed' : 'reps' })),
  ...Array.from({ length: 30 }, (_, i): Move => ({
    id: `move-${String(i + 1).padStart(2, '0')}`,
    kind: i % 5 === 0 ? 'timed' : i % 4 === 0 ? 'weighted' : 'reps',
  })),
]

export const SYNTHETIC_MOVE_IDS: readonly string[] = MOVES.map((m) => m.id)

const TEMPLATES = ['fs.full-body-a', 'fs.full-body-b', 'fs.quick-10', 'custom-1', 'custom-2', 'draft.warm-up', 'draft.cool-down']

const DAY = 24 * 60 * 60 * 1000

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function syntheticHistory(opts: { sessions?: number; now: Date; seed?: number }): SyntheticHistory {
  const rand = mulberry32(opts.seed ?? 7)
  const pick = <T>(list: readonly T[]): T => list[Math.floor(rand() * list.length)]
  const count = opts.sessions ?? 300
  const plans: SessionPlan[] = []
  const results: SessionResult[] = []
  const events: SessionEvent[] = []
  let seq = 0

  // Walk back from now so the newest workout lands this week.
  const starts: number[] = []
  let t = opts.now.getTime() - 3 * 60 * 60 * 1000
  for (let i = 0; i < count; i++) {
    starts.push(t)
    const gap = i % 37 === 36 ? 10 * DAY : 1.4 * DAY + rand() * 2 * DAY
    t -= gap
  }
  starts.reverse()

  const build = (index: number, startMs: number, finished: boolean) => {
    const id = `s-${String(index).padStart(4, '0')}`
    // Early birds, night owls and ordinary afternoons.
    const hourShift = index % 11 === 0 ? -9 : index % 13 === 0 ? 6 : 0
    const start = new Date(startMs + hourShift * 60 * 60 * 1000)
    const templateId = index % 9 === 0 ? 'fs.full-body-a' : pick(TEMPLATES)
    const moves =
      templateId === 'fs.full-body-a'
        ? MOVES.slice(0, fullBodyA.exercises.length)
        : Array.from({ length: 3 + Math.floor(rand() * 4) }, () => pick(MOVES)).filter(
            (m, i, all) => all.findIndex((o) => o.id === m.id) === i
          )
    const level = Math.floor(index / 40)
    const plan: SessionPlan = {
      id,
      templateId,
      templateVersion: 1,
      packId: 'p',
      ruleVersion: 'v1',
      createdAt: start.toISOString(),
      exercises: moves.map((m, order) => ({
        exerciseId: m.id,
        exerciseVersion: 1,
        name: `Move ${m.id}`,
        sets: 1 + Math.floor(rand() * 4),
        ...(m.kind === 'timed'
          ? { timeSeconds: 20 + 10 * Math.floor(rand() * 4) + 5 * level }
          : { reps: 8 + level + Math.floor(rand() * 3) }),
        ...(m.kind === 'weighted' ? { weightKg: 5 + 2.5 * level + 2.5 * Math.floor(rand() * 2) } : {}),
        restSeconds: 30,
        order,
      })),
      adaptations: [],
      reproducibilityHash: 'h',
      ...(index % 3 === 0 ? {} : { weeklyGoal: index % 5 === 0 ? 3 : 2 }),
    }
    plans.push(plan)

    let clock = start.getTime()
    const sessionEvents: SessionEvent[] = []
    const ev = (type: SessionEvent['type'], payload: Record<string, unknown> = {}) => {
      seq += 1
      clock += 20_000 + Math.floor(rand() * 40_000)
      sessionEvents.push({ seq, eventId: `${id}-e${seq}`, sessionId: id, type, timestamp: new Date(clock).toISOString(), payload })
    }
    const startless = index % 33 === 5
    if (!startless) ev('SESSION_STARTED')
    let shortened = false
    outer: for (const [mi, exercise] of plan.exercises.entries()) {
      for (let s = 0; s < exercise.sets; s++) {
        if (rand() < 0.04) {
          ev('EXERCISE_SKIPPED', { exerciseId: exercise.exerciseId })
          break
        }
        if (exercise.timeSeconds != null) ev('HOLD_STARTED', { exerciseId: exercise.exerciseId })
        const payload: Record<string, unknown> = { exerciseId: exercise.exerciseId, setNumber: s + 1 }
        const roll = rand()
        if (roll < 0.15) payload.met = false
        else if (roll < 0.8) payload.met = true
        if (exercise.reps != null && rand() < 0.4) payload.reps = exercise.reps + Math.floor(rand() * 4) - 1
        if (exercise.weightKg != null && rand() < 0.3) payload.weightKg = exercise.weightKg + 2.5
        ev('SET_COMPLETED', payload)
        if (rand() < 0.05) {
          ev('SET_UNDONE')
          ev('SET_COMPLETED', { ...payload, met: true })
        }
        if (rand() < 0.03) ev('SET_COMPLETED', payload) // a stray tap mid-rest
        if (rand() < 0.1) ev('REST_EXTENDED', { byMs: 15_000 })
        ev(rand() < 0.5 ? 'REST_SKIPPED' : 'REST_ENDED')
        if (mi > 0 && rand() < 0.01) {
          shortened = true
          break outer
        }
      }
    }
    if (!finished) {
      events.push(...sessionEvents)
      return
    }
    ev(shortened ? 'SESSION_COMPLETED_SHORTENED' : 'SESSION_COMPLETED')
    const endedAt = new Date(clock).toISOString()
    if (rand() < 0.03) ev('SET_COMPLETED', { exerciseId: plan.exercises[0].exerciseId, met: true }) // after the end
    events.push(...sessionEvents)
    const done = effectiveSetSlots(plan, sessionEvents).length
    const planned = plan.exercises.reduce((n, e) => n + e.sets, 0)
    results.push({
      sessionId: id,
      planId: id,
      status: shortened || done < planned ? 'COMPLETED_SHORTENED' : 'COMPLETED',
      startedAt: start.toISOString(),
      endedAt,
      totalSetsCompleted: done,
      totalSetsPlanned: planned,
    })
  }

  starts.forEach((startMs, i) => build(i, startMs, true))
  // Equal end times: a few results share their neighbour's endedAt.
  for (let i = 50; i < results.length; i += 50) results[i] = { ...results[i], endedAt: results[i - 1].endedAt }
  // Plans that never finished (abandoned before the 12h rule, or open now).
  for (let i = 0; i < 4; i++) build(count + i, starts[Math.floor((i + 1) * (count / 5))] + DAY / 2, false)

  const activities: ActivityEntry[] = []
  for (let i = 0; i < 45; i++) {
    const at = new Date(starts[Math.floor(rand() * starts.length)] + DAY)
    activities.push({
      id: `a-${i}`,
      kind: pick(['walk', 'run', 'yoga', 'class'] as const),
      minutes: 30,
      day: dayKey(at),
      loggedAt: new Date(at.getTime() + 60 * 60 * 1000).toISOString(),
      updatedAt: at.toISOString(),
      deletedAt: i % 9 === 4 ? at.toISOString() : null,
      ...(i % 2 === 0 ? { weeklyGoal: 2 } : {}),
    })
  }

  // Storage order isn't time order: IndexedDB hands back plans and results
  // by key. Shuffle deterministically so nothing relies on input order.
  const shuffle = <T>(list: T[]) => {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1))
      ;[list[i], list[j]] = [list[j], list[i]]
    }
    return list
  }
  return { plans: shuffle(plans), results: shuffle(results), events, activities }
}

// The UX audit's history: one finished workout cloned `sessions` times, one
// every 2.5 days back from the original. Nothing ever beats anything, which
// is the worst case for "new best" searches (a plateau).
export function clonedHistory(opts: { sessions?: number; now: Date }): SyntheticHistory {
  const one = syntheticHistory({ sessions: 1, now: opts.now, seed: 3 })
  const plan = one.plans.find((p) => one.results.some((r) => r.planId === p.id))!
  const result = one.results[0]
  const own = one.events.filter((e) => e.sessionId === result.sessionId)
  const shift = (iso: string, ms: number) => new Date(Date.parse(iso) - ms).toISOString()
  const plans: SessionPlan[] = []
  const results: SessionResult[] = []
  const events: SessionEvent[] = []
  let seq = 0
  for (let i = 0; i < (opts.sessions ?? 300); i++) {
    const ms = i * 2.5 * DAY
    const id = `c-${String(i).padStart(4, '0')}`
    plans.push({ ...plan, id, createdAt: shift(plan.createdAt, ms) })
    results.push({ ...result, sessionId: id, planId: id, startedAt: shift(result.startedAt, ms), endedAt: shift(result.endedAt, ms) })
    for (const e of own) events.push({ ...e, seq: ++seq, sessionId: id, eventId: `${id}-${e.eventId}`, timestamp: shift(e.timestamp, ms) })
  }
  return { plans, results, events, activities: [] }
}
