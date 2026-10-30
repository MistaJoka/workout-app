import { describe, expect, it } from 'vitest'
import type { Exercise, WorkoutTemplate } from '../content/types'
import { estimateMinutes } from '../content/workoutEstimate'
import { effectiveSetSlots } from './appliedEvents'
import { CIRCUIT_MOVE_REST_SECONDS, CIRCUIT_ROUND_REST_SECONDS } from './circuit'
import { createSessionPlanFromTemplate } from './createSessionPlan'
import { workoutOverview } from './overview'
import { replayEvents } from './sessionMachine'
import type { SessionEvent, SessionPlan } from './types'

const template: WorkoutTemplate = {
  id: 'custom.c',
  version: 1,
  name: 'Circuit',
  packId: 'custom',
  circuit: { rounds: 3 },
  exercises: ['a', 'b', 'c'].map((id, order) => ({
    exerciseId: id,
    exerciseVersion: 1,
    order,
    optional: false,
    prescription: { sets: order + 1, reps: 10, restSeconds: 90 },
  })),
}
const exercises = ['a', 'b', 'c'].map(
  (id) => ({ id, version: 1, name: id.toUpperCase(), taxonomy: { equipment: [] } }) as unknown as Exercise,
)

function plan(length: 'short' | 'usual' | 'long' = 'usual'): SessionPlan {
  return createSessionPlanFromTemplate({ id: 's', createdAt: '2026-10-29T00:00:00.000Z', template, exercises, length })
}

let n = 0
const at = (s: number) => new Date(Date.UTC(2026, 9, 29, 0, 0, s)).toISOString()
const ev = (type: SessionEvent['type'], second = n): SessionEvent => ({
  eventId: `e${++n}`,
  sessionId: 's',
  type,
  timestamp: at(second),
  payload: {},
})

// Complete a set, then end its rest.
function setAndRest(): SessionEvent[] {
  return [ev('SET_COMPLETED'), ev('REST_ENDED')]
}

describe('a circuit plan', () => {
  it('gives every move the same number of sets, one per round, and records the circuit', () => {
    const p = plan()
    expect(p.exercises.map((e) => e.sets)).toEqual([3, 3, 3])
    expect(p.circuit).toEqual({ rounds: 3, moveRestSeconds: CIRCUIT_MOVE_REST_SECONDS, roundRestSeconds: CIRCUIT_ROUND_REST_SECONDS })
  })

  it('Short is one round, Long one more', () => {
    expect(plan('short').exercises.map((e) => e.sets)).toEqual([1, 1, 1])
    expect(plan('short').circuit?.rounds).toBe(1)
    expect(plan('long').exercises.map((e) => e.sets)).toEqual([4, 4, 4])
    expect(plan('long').circuit?.rounds).toBe(4)
  })

  it('a routine that is not a circuit has no circuit on its plan', () => {
    const { circuit: _drop, ...plain } = template
    const p = createSessionPlanFromTemplate({ id: 's', createdAt: '2026-10-29T00:00:00.000Z', template: plain, exercises })
    expect(p.circuit).toBeUndefined()
    expect(p.exercises.map((e) => e.sets)).toEqual([1, 2, 3])
  })
})

describe('running a circuit', () => {
  it('goes A B C, then round 2, with a short rest between moves and a longer one between rounds', () => {
    const p = plan()
    const events = [ev('SESSION_STARTED')]
    const pointer = () => {
      const s = replayEvents(p, events)
      return [s.currentExerciseIndex, s.currentSetNumber]
    }
    const restSeconds = () => {
      const s = replayEvents(p, events)
      return (Date.parse(s.restEndsAt!) - Date.parse(s.restStartedAt!)) / 1000
    }
    expect(pointer()).toEqual([0, 1])
    events.push(ev('SET_COMPLETED'))
    expect(pointer()).toEqual([1, 1])
    expect(restSeconds()).toBe(CIRCUIT_MOVE_REST_SECONDS)
    events.push(ev('REST_ENDED'), ev('SET_COMPLETED'))
    expect(pointer()).toEqual([2, 1])
    events.push(ev('REST_ENDED'), ev('SET_COMPLETED'))
    expect(pointer()).toEqual([0, 2])
    expect(restSeconds()).toBe(CIRCUIT_ROUND_REST_SECONDS)
  })

  it('finishes after the last move of the last round', () => {
    const p = plan()
    const events = [ev('SESSION_STARTED')]
    for (let i = 0; i < 8; i++) events.push(...setAndRest())
    events.push(ev('SET_COMPLETED'))
    expect(replayEvents(p, events).status).toBe('COMPLETED')
    // Every set lands on the right move and round.
    const slots = effectiveSetSlots(p, events).map((s) => [s.exerciseIndex, s.setNumber])
    expect(slots).toEqual([
      [0, 1], [1, 1], [2, 1],
      [0, 2], [1, 2], [2, 2],
      [0, 3], [1, 3], [2, 3],
    ])
  })

  it('skipping a move skips it for this round only, with no rest', () => {
    const p = plan()
    const events = [ev('SESSION_STARTED'), ev('EXERCISE_SKIPPED')]
    let s = replayEvents(p, events)
    expect([s.currentExerciseIndex, s.currentSetNumber, s.status]).toEqual([1, 1, 'ACTIVE'])
    events.push(ev('SET_COMPLETED'), ev('REST_ENDED'), ev('EXERCISE_SKIPPED'))
    s = replayEvents(p, events)
    expect([s.currentExerciseIndex, s.currentSetNumber, s.status]).toEqual([0, 2, 'ACTIVE'])
  })

  it('skipping the last move of the last round ends the workout', () => {
    const p = plan('short')
    const events = [ev('SESSION_STARTED'), ...setAndRest(), ...setAndRest(), ev('EXERCISE_SKIPPED')]
    expect(replayEvents(p, events).status).toBe('COMPLETED')
  })

  it('undo goes back to the move and round that started the rest', () => {
    const p = plan()
    const events = [ev('SESSION_STARTED'), ...setAndRest(), ...setAndRest(), ev('SET_COMPLETED'), ev('SET_UNDONE')]
    const s = replayEvents(p, events)
    expect([s.currentExerciseIndex, s.currentSetNumber, s.status]).toEqual([2, 1, 'ACTIVE'])
  })

  it('the overview shows earlier moves as still to come until their rounds are done', () => {
    const p = plan()
    const events = [ev('SESSION_STARTED'), ...setAndRest(), ...setAndRest(), ...setAndRest()]
    const s = replayEvents(p, events)
    const items = workoutOverview(p, events, s)
    expect(items.map((i) => [i.status, i.doneSets])).toEqual([
      ['current', 1],
      ['next', 1],
      ['later', 1],
    ])
  })
})

describe('circuit time estimate', () => {
  it('counts the short rests between moves', () => {
    const plain = estimateMinutes({ ...template, circuit: undefined, exercises: template.exercises.map((e) => ({ ...e, prescription: { ...e.prescription, sets: 3 } })) })
    expect(estimateMinutes(template)).toBeLessThan(plain)
  })
})

describe('player helpers', () => {
  it('count, name and look ahead in circuit order', async () => {
    const { setWord, setsDoneBefore, moveAfter, onLastMove } = await import('./circuit')
    const p = plan()
    expect(setWord(p)).toBe('Round')
    expect(setsDoneBefore(p, 1, 2)).toBe(4)
    expect(moveAfter(p, 2, 1)).toBe(0)
    expect(moveAfter(p, 2, 3)).toBeNull()
    expect(onLastMove(p, 2, 2)).toBe(false)
    expect(onLastMove(p, 2, 3)).toBe(true)
    const { circuit: _c, ...plainTemplate } = template
    const plain = createSessionPlanFromTemplate({ id: 's', createdAt: '2026-10-29T00:00:00.000Z', template: plainTemplate, exercises })
    expect(setWord(plain)).toBe('Set')
    expect(setsDoneBefore(plain, 1, 2)).toBe(2)
    expect(moveAfter(plain, 2, 1)).toBeNull()
    expect(onLastMove(plain, 2, 1)).toBe(true)
  })
})
