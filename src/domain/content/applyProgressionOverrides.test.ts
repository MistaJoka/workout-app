import { describe, expect, it } from 'vitest'
import { applyProgressionOverrides } from './applyProgressionOverrides'
import type { WorkoutTemplate } from './types'

const template: WorkoutTemplate = {
  id: 'template-1',
  version: 1,
  name: 'Test Template',
  packId: 'pack-1',
  exercises: [
    { exerciseId: 'squat', exerciseVersion: 1, prescription: { sets: 2, reps: 10, restSeconds: 45 }, order: 0, optional: false },
    { exerciseId: 'plank', exerciseVersion: 1, prescription: { sets: 2, timeSeconds: 20, restSeconds: 45 }, order: 1, optional: false },
  ],
}

describe('applyProgressionOverrides', () => {
  it('overrides the authored reps for an exercise with a persisted progression override', () => {
    const result = applyProgressionOverrides(template, new Map([['squat', 12]]))
    expect(result.exercises[0].prescription.reps).toBe(12)
  })

  it('leaves exercises without an override at their authored value', () => {
    const result = applyProgressionOverrides(template, new Map())
    expect(result.exercises[0].prescription.reps).toBe(10)
  })

  it('never applies a reps override to a time-based exercise', () => {
    const result = applyProgressionOverrides(template, new Map([['plank', 30]]))
    expect(result.exercises[1].prescription.timeSeconds).toBe(20)
    expect(result.exercises[1].prescription.reps).toBeUndefined()
  })

  it('does not mutate the original template', () => {
    applyProgressionOverrides(template, new Map([['squat', 12]]))
    expect(template.exercises[0].prescription.reps).toBe(10)
  })
})
