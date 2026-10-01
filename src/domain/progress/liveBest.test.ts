import { describe, expect, it } from 'vitest'
import { didSetBeatPriorBest, liveBestPreview, performedTarget, priorBestForExercise } from './liveBest'
import type { SetRecord } from './types'

function repRecord(overrides: Partial<SetRecord>): SetRecord {
  return {
    exerciseId: 'pushup',
    exerciseName: 'Push-up',
    sessionId: 's1',
    sessionEndedAt: '2026-01-01T00:00:00.000Z',
    setNumber: 1,
    met: true,
    ...overrides,
  }
}

describe('priorBestForExercise', () => {
  it('is null with no history', () => {
    expect(priorBestForExercise([], 'pushup', 'current')).toBeNull()
  })

  it('finds the best met rep count for the exercise, ignoring other exercises', () => {
    const records = [
      repRecord({ prescribedReps: 8, sessionId: 's1', sessionEndedAt: '2026-01-01T00:00:00.000Z' }),
      repRecord({ prescribedReps: 12, sessionId: 's2', sessionEndedAt: '2026-01-02T00:00:00.000Z' }),
      repRecord({ exerciseId: 'squat', prescribedReps: 50, sessionId: 's3', sessionEndedAt: '2026-01-03T00:00:00.000Z' }),
    ]
    const best = priorBestForExercise(records, 'pushup', 'current')
    expect(best).toMatchObject({ unit: 'reps', value: 12 })
  })

  it('excludes the current in-progress session even if records for it were passed in', () => {
    const records = [
      repRecord({ prescribedReps: 8, sessionId: 'current', sessionEndedAt: '2026-01-05T00:00:00.000Z' }),
      repRecord({ prescribedReps: 6, sessionId: 's1', sessionEndedAt: '2026-01-01T00:00:00.000Z' }),
    ]
    const best = priorBestForExercise(records, 'pushup', 'current')
    expect(best).toMatchObject({ unit: 'reps', value: 6 })
  })

  it('ignores missed sets', () => {
    const records = [repRecord({ prescribedReps: 20, met: false })]
    expect(priorBestForExercise(records, 'pushup', 'current')).toBeNull()
  })
})

describe('liveBestPreview', () => {
  it('has no prior best when there is no history', () => {
    const preview = liveBestPreview(null, { unit: 'reps', value: 10 })
    expect(preview).toEqual({ priorBest: null, beatsBestIfDone: false, gap: null })
  })

  it('reps: a bigger target already beats the prior best', () => {
    const prior = priorBestForExercise([repRecord({ prescribedReps: 10 })], 'pushup', 'current')!
    const preview = liveBestPreview(prior, { unit: 'reps', value: 12 })
    expect(preview).toEqual({ priorBest: 10, beatsBestIfDone: true, gap: 0 })
  })

  it('reps: a tie never beats the prior best, and gap says how much more is needed', () => {
    const prior = priorBestForExercise([repRecord({ prescribedReps: 10 })], 'pushup', 'current')!
    const preview = liveBestPreview(prior, { unit: 'reps', value: 10 })
    expect(preview).toEqual({ priorBest: 10, beatsBestIfDone: false, gap: 1 })
  })

  it('reps: a target short of the best reports the gap to beat it', () => {
    const prior = priorBestForExercise([repRecord({ prescribedReps: 10 })], 'pushup', 'current')!
    const preview = liveBestPreview(prior, { unit: 'reps', value: 8 })
    expect(preview).toEqual({ priorBest: 10, beatsBestIfDone: false, gap: 3 })
  })

  it('seconds: compares holds the same way as reps', () => {
    const prior = priorBestForExercise(
      [repRecord({ exerciseId: 'plank', prescribedSeconds: 30 })],
      'plank',
      'current'
    )!
    expect(liveBestPreview(prior, { unit: 'seconds', value: 35 })).toEqual({
      priorBest: 30,
      beatsBestIfDone: true,
      gap: 0,
    })
    expect(liveBestPreview(prior, { unit: 'seconds', value: 29 })).toEqual({
      priorBest: 30,
      beatsBestIfDone: false,
      gap: 2,
    })
  })

  it('weighted: compares reps only at the matching load, never inventing equivalence across weights', () => {
    const prior = priorBestForExercise(
      [repRecord({ exerciseId: 'row', prescribedReps: 8, weight: 20 })],
      'row',
      'current'
    )!
    expect(prior.unit).toBe('kg')
    expect(liveBestPreview(prior, { unit: 'kg', value: 20, reps: 10 })).toEqual({
      priorBest: 8,
      beatsBestIfDone: true,
      gap: 0,
    })
    // A different load isn't comparable: no invented best.
    expect(liveBestPreview(prior, { unit: 'kg', value: 22, reps: 10 })).toEqual({
      priorBest: null,
      beatsBestIfDone: false,
      gap: null,
    })
  })

  it('mismatched units (e.g. a hold compared against a rep record) are not comparable', () => {
    const prior = priorBestForExercise([repRecord({ prescribedReps: 10 })], 'pushup', 'current')!
    expect(liveBestPreview(prior, { unit: 'seconds', value: 30 })).toEqual({
      priorBest: null,
      beatsBestIfDone: false,
      gap: null,
    })
  })
})

describe('performedTarget', () => {
  it('seconds always stays at the prescribed value (holds auto-complete in full)', () => {
    expect(performedTarget({ unit: 'seconds', value: 30 }, {})).toEqual({ unit: 'seconds', value: 30 })
  })

  it('reps: uses the logged payload reps when present, else the prescribed target', () => {
    expect(performedTarget({ unit: 'reps', value: 10 }, {})).toEqual({ unit: 'reps', value: 10 })
    expect(performedTarget({ unit: 'reps', value: 10 }, { reps: 7 })).toEqual({ unit: 'reps', value: 7 })
  })

  it('weighted: uses the logged reps/weight when present, else the plan target', () => {
    expect(performedTarget({ unit: 'kg', value: 20, reps: 8 }, {})).toEqual({ unit: 'kg', value: 20, reps: 8 })
    expect(performedTarget({ unit: 'kg', value: 20, reps: 8 }, { reps: 6, weightKg: 22.5 })).toEqual({
      unit: 'kg',
      value: 22.5,
      reps: 6,
    })
  })
})

describe('didSetBeatPriorBest', () => {
  it('is false with no prior best', () => {
    expect(didSetBeatPriorBest(null, { unit: 'reps', value: 100 })).toBe(false)
  })

  it('is true when the performed amount strictly exceeds the prior best', () => {
    const prior = priorBestForExercise([repRecord({ prescribedReps: 10 })], 'pushup', 'current')!
    expect(didSetBeatPriorBest(prior, performedTarget({ unit: 'reps', value: 10 }, { reps: 11 }))).toBe(true)
  })

  it('is false on a tie or a short set', () => {
    const prior = priorBestForExercise([repRecord({ prescribedReps: 10 })], 'pushup', 'current')!
    expect(didSetBeatPriorBest(prior, performedTarget({ unit: 'reps', value: 10 }, {}))).toBe(false)
    expect(didSetBeatPriorBest(prior, performedTarget({ unit: 'reps', value: 10 }, { reps: 6 }))).toBe(false)
  })
})
