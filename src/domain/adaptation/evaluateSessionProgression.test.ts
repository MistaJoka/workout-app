import { describe, expect, it } from 'vitest'
import { evaluateSessionProgression } from './evaluateSessionProgression'
import type { SessionEvent, SessionPlan } from '../session/types'

function plan(exercises: SessionPlan['exercises']): SessionPlan {
  return {
    id: 'session-1',
    templateId: 'template-1',
    templateVersion: 1,
    packId: 'pack-1',
    ruleVersion: 'v1',
    createdAt: '2026-09-18T00:00:00.000Z',
    exercises,
    adaptations: [],
    reproducibilityHash: 'hash',
  }
}

function setCompleted(exerciseId: string, met: boolean, seq: number, extra: Record<string, unknown> = {}): SessionEvent {
  return {
    seq,
    eventId: `evt-${seq}`,
    sessionId: 'session-1',
    type: 'SET_COMPLETED',
    timestamp: '2026-09-18T00:00:00.000Z',
    payload: { exerciseId, met, ...extra },
  }
}

const squat: SessionPlan['exercises'][number] = {
  exerciseId: 'fs.bodyweight-squat',
  exerciseVersion: 1,
  name: 'Bodyweight Squat',
  sets: 2,
  reps: 10,
  restSeconds: 45,
  order: 0,
}

const plankExercise: SessionPlan['exercises'][number] = {
  exerciseId: 'fs.plank',
  exerciseVersion: 1,
  name: 'Plank',
  sets: 2,
  timeSeconds: 20,
  restSeconds: 45,
  order: 1,
}

const benchPress: SessionPlan['exercises'][number] = {
  exerciseId: 'lib.Barbell_Bench_Press',
  exerciseVersion: 1,
  name: 'Barbell Bench Press',
  sets: 3,
  reps: 8,
  authoredReps: 8,
  weightKg: 40,
  authoredWeightKg: 40,
  restSeconds: 90,
  order: 0,
}

describe('evaluateSessionProgression', () => {
  it('evaluates a reps-based exercise from its SET_COMPLETED events', () => {
    const events = [setCompleted('fs.bodyweight-squat', true, 1), setCompleted('fs.bodyweight-squat', true, 2)]
    const results = evaluateSessionProgression(plan([squat]), events, new Map())
    expect(results).toHaveLength(1)
    expect(results[0].exerciseId).toBe('fs.bodyweight-squat')
    expect(results[0].reasonCode).toBe('ADJUSTED_WITHIN_BOUNDS')
    expect(results[0].weighted).toBe(false)
  })

  it('skips a hold/time-based exercise entirely, even if it has completed-set events', () => {
    const events = [setCompleted('fs.plank', true, 1), setCompleted('fs.plank', true, 2)]
    const results = evaluateSessionProgression(plan([plankExercise]), events, new Map())
    expect(results).toHaveLength(0)
  })

  it('skips an exercise with no completed-set events (session ended before reaching it)', () => {
    const results = evaluateSessionProgression(plan([squat]), [], new Map())
    expect(results).toHaveLength(0)
  })

  it('uses a persisted progression override as the current prescription, not the authored template default', () => {
    const events = [setCompleted('fs.bodyweight-squat', true, 1), setCompleted('fs.bodyweight-squat', true, 2)]
    const progression = new Map([['fs.bodyweight-squat', { currentPrescribedReps: 14, consecutiveFailureStreak: 0 }]])
    const results = evaluateSessionProgression(plan([squat]), events, progression)
    expect(results[0].reasonCode).toBe('PROGRESSION_CANDIDATE')
  })

  it('carries forward a persisted failure streak into the evaluation', () => {
    const events = [setCompleted('fs.bodyweight-squat', false, 1), setCompleted('fs.bodyweight-squat', false, 2)]
    const progression = new Map([['fs.bodyweight-squat', { currentPrescribedReps: null, consecutiveFailureStreak: 1 }]])
    const results = evaluateSessionProgression(plan([squat]), events, progression)
    expect(results[0].reasonCode).toBe('REGRESSED')
  })

  it("anchors the policy to authoredReps, not the plan's already-overridden effective reps", () => {
    const overriddenSquat: SessionPlan['exercises'][number] = { ...squat, reps: 14, authoredReps: 10 }
    const events = [setCompleted('fs.bodyweight-squat', true, 1), setCompleted('fs.bodyweight-squat', true, 2)]
    const progression = new Map([['fs.bodyweight-squat', { currentPrescribedReps: 14, consecutiveFailureStreak: 0 }]])
    const results = evaluateSessionProgression(plan([overriddenSquat]), events, progression)
    expect(results[0].reasonCode).toBe('PROGRESSION_CANDIDATE')
  })

  it('retains without touching the streak when fewer sets were logged than planned (session ended early)', () => {
    // squat plans 2 sets; only one clean set at the ceiling was logged
    const events = [setCompleted('fs.bodyweight-squat', true, 1)]
    const progression = new Map([['fs.bodyweight-squat', { currentPrescribedReps: 14, consecutiveFailureStreak: 1 }]])
    const [result] = evaluateSessionProgression(plan([squat]), events, progression)
    expect(result.reasonCode).toBe('RETAINED')
    expect(result.nextPrescribedReps).toBe(14)
    expect(result.nextFailureStreak).toBe(1)
    expect(result.candidatePrescribedReps).toBeUndefined()
  })

  it('flags an early-ended exercise so a still-pending candidate is preserved, and never flags a full evaluation', () => {
    const partial = evaluateSessionProgression(plan([squat]), [setCompleted('fs.bodyweight-squat', true, 1)], new Map())
    expect(partial[0].preservePending).toBe(true)

    const full = evaluateSessionProgression(
      plan([squat]),
      [setCompleted('fs.bodyweight-squat', true, 1), setCompleted('fs.bodyweight-squat', true, 2)],
      new Map()
    )
    expect(full[0].preservePending).toBeUndefined()
  })

  it('evaluates a weighted exercise with the weighted policy, using the last logged load as the current load', () => {
    const events = [
      setCompleted('lib.Barbell_Bench_Press', true, 1, { weightKg: 42.5, reps: 10 }),
      setCompleted('lib.Barbell_Bench_Press', true, 2, { weightKg: 42.5, reps: 10 }),
      setCompleted('lib.Barbell_Bench_Press', true, 3, { weightKg: 42.5, reps: 10 }),
    ]
    const progression = new Map([['lib.Barbell_Bench_Press', { currentPrescribedReps: 10, currentWeightKg: 40, consecutiveFailureStreak: 0 }]])
    const [result] = evaluateSessionProgression(plan([benchPress]), events, progression)
    expect(result.weighted).toBe(true)
    // 10 reps tops the 8..10 band -> load candidate from the logged 42.5, not the stored 40
    expect(result.reasonCode).toBe('PROGRESSION_CANDIDATE')
    expect(result.candidateLoad).toBe(45)
    expect(result.candidatePrescribedReps).toBe(8)
  })

  it('treats a logged rep count below the prescription as a miss even if met was not sent', () => {
    const events = [1, 2, 3].map((seq) => setCompleted('lib.Barbell_Bench_Press', true, seq, { weightKg: 40, reps: 5 }))
    const progression = new Map([['lib.Barbell_Bench_Press', { currentPrescribedReps: 8, currentWeightKg: 40, consecutiveFailureStreak: 1 }]])
    const [result] = evaluateSessionProgression(plan([benchPress]), events, progression)
    expect(result.reasonCode).toBe('REGRESSED')
    expect(result.nextLoad).toBe(40) // floored at the authored load
  })

  it('a short workout is no evidence: no candidate, streak untouched', () => {
    const oneSet = { ...squat, sets: 1, reps: 14, authoredReps: 10 }
    const shortPlan = { ...plan([oneSet]), length: 'short' as const }
    const progression = new Map([['fs.bodyweight-squat', { currentPrescribedReps: 14, consecutiveFailureStreak: 1 }]])
    const met = evaluateSessionProgression(shortPlan, [setCompleted('fs.bodyweight-squat', true, 1)], progression)
    expect(met[0]).toMatchObject({ reasonCode: 'RETAINED', preservePending: true, nextFailureStreak: 1, nextPrescribedReps: 14 })
    const failed = evaluateSessionProgression(shortPlan, [setCompleted('fs.bodyweight-squat', false, 1)], progression)
    expect(failed[0]).toMatchObject({ reasonCode: 'RETAINED', nextFailureStreak: 1 })
    // The same set in a usual one-set plan does count, so the flag is what matters.
    const usual = evaluateSessionProgression(plan([oneSet]), [setCompleted('fs.bodyweight-squat', true, 1)], progression)
    expect(usual[0].reasonCode).toBe('PROGRESSION_CANDIDATE')
  })
})
