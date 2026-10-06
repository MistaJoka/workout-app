import { describe, expect, it } from 'vitest'
import { readableId, createSessionPlanFromTemplate } from './createSessionPlan'
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

  it('snapshots the weekly goal when given, and leaves it out otherwise', () => {
    const base = { id: 'session-g', createdAt: '2026-10-03T00:00:00.000Z', template, exercises, checkIn, ruleVersion: 'placeholder-v0' }
    expect(createSessionPlanFromTemplate({ ...base, weeklyGoal: 3 }).weeklyGoal).toBe(3)
    expect('weeklyGoal' in createSessionPlanFromTemplate(base)).toBe(false)
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

  it('carries a weighted prescription with effective and authored kg, applying a weight override', () => {
    const weighted: WorkoutTemplate = {
      ...template,
      exercises: [
        { exerciseId: 'ex1', exerciseVersion: 1, prescription: { sets: 3, reps: 8, restSeconds: 90, weightKg: 40 }, order: 0, optional: false },
      ],
    }
    const plan = createSessionPlanFromTemplate({
      id: 'session-9',
      createdAt: '2026-09-14T00:00:00.000Z',
      template: weighted,
      exercises,
      checkIn,
      ruleVersion: 'v1',
      weightOverridesByExerciseId: new Map([['ex1', 42.5]]),
    })
    expect(plan.exercises[0].weightKg).toBe(42.5)
    expect(plan.exercises[0].authoredWeightKg).toBe(40)
  })

  it('leaves weight fields absent for bodyweight prescriptions even if an override is supplied', () => {
    const plan = createSessionPlanFromTemplate({
      id: 'session-10',
      createdAt: '2026-09-14T00:00:00.000Z',
      template,
      exercises,
      checkIn,
      ruleVersion: 'v1',
      weightOverridesByExerciseId: new Map([['ex1', 20]]),
    })
    expect('weightKg' in plan.exercises[0]).toBe(false)
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

describe('readableId', () => {
  it('turns a removed library id into a readable name', () => {
    expect(readableId('lib.Barbell_Squat')).toBe('Barbell Squat')
    expect(readableId('lib.Close-Grip_Barbell_Bench_Press')).toBe('Close Grip Barbell Bench Press')
  })
})

describe('createSessionPlanFromTemplate without a check-in', () => {
  it('builds the same prescription when nobody was asked, labelled with the rules actually used', () => {
    const createdAt = '2026-09-28T00:00:00.000Z'
    const asked = createSessionPlanFromTemplate({ id: 's', createdAt, template, exercises, checkIn, ruleVersion: 'x' })
    const notAsked = createSessionPlanFromTemplate({ id: 's', createdAt, template, exercises })
    expect(notAsked.exercises).toEqual(asked.exercises)
    expect(notAsked.adaptations).toEqual(asked.adaptations)
    expect(notAsked.ruleVersion).toBe('placeholder.retain-all')
  })

  it('bakes the chosen length into the plan', () => {
    const plan = createSessionPlanFromTemplate({ id: 'p', createdAt: '2026-10-06T00:00:00.000Z', template, exercises, length: 'short' })
    expect(plan.length).toBe('short')
    expect(plan.exercises.map((e) => e.sets)).toEqual([1, 1])
    expect(plan.adaptations.filter((a) => a.reasonCode === 'LENGTH_SHORT')).toHaveLength(2)
  })

  it('a usual plan carries no length field, so older hashes are unchanged', () => {
    const plain = createSessionPlanFromTemplate({ id: 'p', createdAt: '2026-10-06T00:00:00.000Z', template, exercises })
    const usual = createSessionPlanFromTemplate({ id: 'p', createdAt: '2026-10-06T00:00:00.000Z', template, exercises, length: 'usual' })
    expect('length' in usual).toBe(false)
    expect(usual.reproducibilityHash).toBe(plain.reproducibilityHash)
  })
})
