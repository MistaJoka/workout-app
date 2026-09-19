import { describe, expect, it } from 'vitest'
import { calculateVolume, detectPersonalRecords, estimateOneRepMax, perExerciseHistory } from './stats'
import type { SetRecord } from './types'

function rec(overrides: Partial<SetRecord>): SetRecord {
  return {
    exerciseId: 'bench',
    exerciseName: 'Bench',
    sessionId: 's1',
    sessionEndedAt: '2026-09-01T00:00:00.000Z',
    setNumber: 1,
    prescribedReps: 8,
    met: true,
    ...overrides,
  }
}

describe('weighted stats', () => {
  it('adds weight × reps to volume for met weighted sets, using logged reps when present', () => {
    const v = calculateVolume([rec({ weight: 40 }), rec({ weight: 40, performedReps: 10, setNumber: 2 }), rec({ weight: 40, met: false, setNumber: 3 })])
    expect(v.reps).toBe(18)
    expect(v.loadKg).toBe(40 * 8 + 40 * 10)
  })

  it('records the heaviest met load; equal load with more reps also improves', () => {
    const records = [
      rec({ weight: 40, sessionId: 's1', sessionEndedAt: '2026-09-01T00:00:00.000Z' }),
      rec({ weight: 42.5, sessionId: 's2', sessionEndedAt: '2026-09-03T00:00:00.000Z', met: false }),
      rec({ weight: 40, performedReps: 10, sessionId: 's3', sessionEndedAt: '2026-09-05T00:00:00.000Z' }),
    ]
    const pr = detectPersonalRecords(records).get('bench')!
    expect(pr.unit).toBe('kg')
    expect(pr.value).toBe(40)
    expect(pr.reps).toBe(10)
    expect(pr.sessionId).toBe('s3')
  })

  it('estimates a one-rep max with Epley', () => {
    expect(estimateOneRepMax(100, 1)).toBe(100)
    expect(estimateOneRepMax(60, 10)).toBe(80)
  })

  it('per-exercise history reports the load the session ended on with its reps', () => {
    const points = perExerciseHistory(
      [rec({ weight: 40, setNumber: 1 }), rec({ weight: 42.5, performedReps: 6, setNumber: 2 })],
      'bench'
    )
    expect(points).toHaveLength(1)
    expect(points[0]).toMatchObject({ unit: 'kg', prescribed: 42.5, reps: 6, metSets: 2, totalSets: 2 })
  })
})
