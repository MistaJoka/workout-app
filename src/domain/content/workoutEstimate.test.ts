import { describe, expect, it } from 'vitest'
import { bookendsFor, estimateMinutes } from './workoutEstimate'
import { fullBodyA, quick10, templateById } from './fixtures/foundationStrengthStarter'
import type { WorkoutTemplate } from './types'

describe('estimateMinutes', () => {
  it('is 0 for no template', () => {
    expect(estimateMinutes(undefined)).toBe(0)
  })

  it('rounds up to 5 minutes, at least 5', () => {
    const tiny: WorkoutTemplate = {
      ...quick10,
      exercises: [{ ...quick10.exercises[0], prescription: { sets: 1, reps: 1, restSeconds: 0 } }],
    }
    expect(estimateMinutes(tiny)).toBe(5)
    expect(estimateMinutes(fullBodyA) % 5).toBe(0)
  })
})

describe('bookendsFor', () => {
  const lookup = (id: string) => templateById.get(id)

  it('offers a warm-up and a cool-down around a main workout', () => {
    const { warmUp, coolDown } = bookendsFor('fs.full-body-a', lookup)
    expect(warmUp?.id).toBe('draft.warm-up')
    expect(coolDown?.id).toBe('draft.cool-down')
  })

  it('offers neither around the warm-up or cool-down themselves', () => {
    expect(bookendsFor('draft.warm-up', lookup)).toEqual({})
    expect(bookendsFor('draft.cool-down', lookup)).toEqual({})
  })

  it('offers nothing when those workouts do not exist', () => {
    expect(bookendsFor('fs.full-body-a', () => undefined)).toEqual({})
  })
})
