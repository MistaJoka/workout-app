import { describe, expect, it } from 'vitest'
import { summarizeExerciseForYou } from './exerciseYou'
import type { SetRecord } from './types'

const rec = (sessionId: string, endedAt: string, overrides: Partial<SetRecord> = {}): SetRecord => ({
  exerciseId: 'squat',
  exerciseName: 'Squat',
  sessionId,
  sessionEndedAt: endedAt,
  setNumber: 1,
  prescribedReps: 10,
  met: true,
  ...overrides,
})

describe('summarizeExerciseForYou', () => {
  it('is null when the move has never been done', () => {
    expect(summarizeExerciseForYou([rec('s1', '2026-09-01T10:00:00.000Z', { exerciseId: 'plank' })], 'squat')).toBeNull()
  })

  it('counts sessions, finds the best, and the last date', () => {
    const summary = summarizeExerciseForYou(
      [
        rec('s1', '2026-09-01T10:00:00.000Z'),
        rec('s1', '2026-09-01T10:00:00.000Z', { setNumber: 2 }),
        rec('s2', '2026-09-03T10:00:00.000Z', { prescribedReps: 12 }),
        rec('s3', '2026-09-05T10:00:00.000Z', { prescribedReps: 14, met: false }),
      ],
      'squat'
    )
    expect(summary).toMatchObject({ sessions: 3, lastEndedAt: '2026-09-05T10:00:00.000Z' })
    expect(summary?.best).toMatchObject({ unit: 'reps', value: 12 })
  })

  it('has no best when every set was missed', () => {
    const summary = summarizeExerciseForYou([rec('s1', '2026-09-01T10:00:00.000Z', { met: false })], 'squat')
    expect(summary).toMatchObject({ sessions: 1 })
    expect(summary?.best).toBeUndefined()
  })
})
