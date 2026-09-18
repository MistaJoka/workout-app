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

function setCompleted(exerciseId: string, met: boolean, seq: number): SessionEvent {
  return {
    seq,
    eventId: `evt-${seq}`,
    sessionId: 'session-1',
    type: 'SET_COMPLETED',
    timestamp: '2026-09-18T00:00:00.000Z',
    payload: { exerciseId, met },
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

describe('evaluateSessionProgression', () => {
  it('evaluates a reps-based exercise from its SET_COMPLETED events', () => {
    const events = [setCompleted('fs.bodyweight-squat', true, 1), setCompleted('fs.bodyweight-squat', true, 2)]
    const results = evaluateSessionProgression(plan([squat]), events, new Map())
    expect(results).toHaveLength(1)
    expect(results[0].exerciseId).toBe('fs.bodyweight-squat')
    expect(results[0].reasonCode).toBe('ADJUSTED_WITHIN_BOUNDS')
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
    // 14 is already the top of a 10-authored-rep default range extended by
    // the policy's own +4 headroom, so clean completion at 14 should surface
    // as a progression candidate rather than a further reps bump.
    expect(results[0].reasonCode).toBe('PROGRESSION_CANDIDATE')
  })

  it('carries forward a persisted failure streak into the evaluation', () => {
    const events = [setCompleted('fs.bodyweight-squat', false, 1)]
    const progression = new Map([['fs.bodyweight-squat', { currentPrescribedReps: null, consecutiveFailureStreak: 1 }]])
    const results = evaluateSessionProgression(plan([squat]), events, progression)
    expect(results[0].reasonCode).toBe('REGRESSED')
  })
})
