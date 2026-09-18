import { describe, expect, it } from 'vitest'
import { createSessionPlanFromTemplate } from './createSessionPlan'
import { computeReproducibilityHash } from './reproducibilityHash'
import type { Exercise, WorkoutTemplate } from '../content/types'

const template: WorkoutTemplate = {
  id: 'placeholder.test-template',
  version: 1,
  name: 'Placeholder Test Template',
  packId: 'placeholder-pack',
  exercises: [
    { exerciseId: 'ex1', exerciseVersion: 1, prescription: { sets: 3, reps: 10, restSeconds: 60 }, order: 0, optional: false },
    { exerciseId: 'ex2', exerciseVersion: 1, prescription: { sets: 2, reps: 12, restSeconds: 45 }, order: 1, optional: true },
  ],
}

function stubExercise(id: string, name: string): Exercise {
  return {
    id,
    version: 1,
    name,
    aliases: [],
    taxonomy: { category: 'test', equipment: [] },
    setup: '',
    executionPhases: [],
    cues: [],
    commonErrors: [],
    prescriptionCapabilities: { reps: true, time: false, hold: false },
    mediaManifest: {},
    provenance: { author: 'test', reviewedAt: null, status: 'draft' },
  }
}

const exercises: Exercise[] = [stubExercise('ex1', 'Exercise One'), stubExercise('ex2', 'Exercise Two')]

const checkIn = { energy: 3, comfort: 3, availableMinutes: 30 }

describe('createSessionPlanFromTemplate', () => {
  it('maps template exercises into session-plan exercises with matching prescriptions', () => {
    const plan = createSessionPlanFromTemplate({
      id: 'session-1',
      createdAt: '2026-09-14T00:00:00.000Z',
      template,
      exercises,
      checkIn,
      ruleVersion: 'placeholder-v0',
    })
    expect(plan.id).toBe('session-1')
    expect(plan.templateId).toBe('placeholder.test-template')
    expect(plan.templateVersion).toBe(1)
    expect(plan.packId).toBe('placeholder-pack')
    expect(plan.exercises).toHaveLength(2)
    expect(plan.exercises[0]).toEqual({
      exerciseId: 'ex1',
      exerciseVersion: 1,
      name: 'Exercise One',
      sets: 3,
      reps: 10,
      authoredReps: 10,
      timeSeconds: undefined,
      restSeconds: 60,
      order: 0,
    })
  })

  it('applies a reps override for the effective prescription, while keeping authoredReps fixed at the template default', () => {
    const plan = createSessionPlanFromTemplate({
      id: 'session-8',
      createdAt: '2026-09-14T00:00:00.000Z',
      template,
      exercises,
      checkIn,
      ruleVersion: 'placeholder-v0',
      repsOverridesByExerciseId: new Map([['ex1', 14]]),
    })
    expect(plan.exercises[0].reps).toBe(14)
    expect(plan.exercises[0].authoredReps).toBe(10)
    // Unaffected exercise keeps its authored value for both fields.
    expect(plan.exercises[1].reps).toBe(12)
    expect(plan.exercises[1].authoredReps).toBe(12)
  })

  it('captures the exercise name into the immutable plan snapshot, not just its ID', () => {
    const plan = createSessionPlanFromTemplate({
      id: 'session-6',
      createdAt: '2026-09-14T00:00:00.000Z',
      template,
      exercises,
      checkIn,
      ruleVersion: 'placeholder-v0',
    })
    expect(plan.exercises.map((e) => e.name)).toEqual(['Exercise One', 'Exercise Two'])
  })

  it('falls back to the exercise ID as the name when no matching exercise record is supplied', () => {
    const plan = createSessionPlanFromTemplate({
      id: 'session-7',
      createdAt: '2026-09-14T00:00:00.000Z',
      template,
      exercises: [],
      checkIn,
      ruleVersion: 'placeholder-v0',
    })
    expect(plan.exercises.map((e) => e.name)).toEqual(['ex1', 'ex2'])
  })

  it('includes one adaptation decision per exercise, from the default placeholder rules', () => {
    const plan = createSessionPlanFromTemplate({
      id: 'session-2',
      createdAt: '2026-09-14T00:00:00.000Z',
      template,
      exercises,
      checkIn,
      ruleVersion: 'placeholder-v0',
    })
    expect(plan.adaptations).toHaveLength(2)
    expect(plan.adaptations.map((a) => a.exerciseId)).toEqual(['ex1', 'ex2'])
  })

  it('computes a reproducibility hash matching computeReproducibilityHash over the same fields', () => {
    const plan = createSessionPlanFromTemplate({
      id: 'session-3',
      createdAt: '2026-09-14T00:00:00.000Z',
      template,
      exercises,
      checkIn,
      ruleVersion: 'placeholder-v0',
    })
    const expected = computeReproducibilityHash({
      id: plan.id,
      templateId: plan.templateId,
      templateVersion: plan.templateVersion,
      packId: plan.packId,
      ruleVersion: plan.ruleVersion,
      createdAt: plan.createdAt,
      exercises: plan.exercises,
      adaptations: plan.adaptations,
    })
    expect(plan.reproducibilityHash).toBe(expected)
  })

  it('is deterministic for identical inputs', () => {
    const params = {
      id: 'session-4',
      createdAt: '2026-09-14T00:00:00.000Z',
      template,
      exercises,
      checkIn,
      ruleVersion: 'placeholder-v0',
    }
    expect(createSessionPlanFromTemplate(params)).toEqual(createSessionPlanFromTemplate(params))
  })

  it('accepts an injected rule set, passed straight through to adaptTemplate', () => {
    const customRules = [
      {
        id: 'test.always-compress',
        appliesWhen: () => true,
        decide: (exerciseId: string) => ({ exerciseId, reasonCode: 'SESSION_COMPRESSED' as const, detail: 'test' }),
      },
    ]
    const plan = createSessionPlanFromTemplate({
      id: 'session-5',
      createdAt: '2026-09-14T00:00:00.000Z',
      template,
      exercises,
      checkIn,
      ruleVersion: 'placeholder-v0',
      rules: customRules,
    })
    expect(plan.adaptations.every((a) => a.reasonCode === 'SESSION_COMPRESSED')).toBe(true)
  })
})
