import { describe, expect, it } from 'vitest'
import { validateContentPack } from '../schema'
import {
  foundationStrengthStarterExercises,
  foundationStrengthStarterPack,
  foundationStrengthStarterTemplate,
} from './foundationStrengthStarter'

describe('foundationStrengthStarter', () => {
  it('validates as a referentially consistent, schema-valid content pack', () => {
    const result = validateContentPack(
      foundationStrengthStarterPack,
      foundationStrengthStarterExercises,
      [foundationStrengthStarterTemplate]
    )
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('never shows placeholder text in any user-facing exercise or template field', () => {
    const haystacks = [
      foundationStrengthStarterTemplate.name,
      foundationStrengthStarterPack.name,
      ...foundationStrengthStarterExercises.flatMap((e) => [e.name, e.setup, ...e.executionPhases]),
    ]
    for (const text of haystacks) {
      expect(text.toLowerCase()).not.toContain('placeholder')
    }
  })

  it('marks every imported exercise as draft, carrying its upstream source provenance', () => {
    for (const exercise of foundationStrengthStarterExercises) {
      expect(exercise.provenance.status).toBe('draft')
      expect(exercise.provenance.sourceRepo).toBe('yuhonas/free-exercise-db')
      expect(exercise.provenance.sourceRecordId).toBeTruthy()
    }
  })

  it('gives the static-hold exercise a time-based prescription, not reps', () => {
    const plankInTemplate = foundationStrengthStarterTemplate.exercises.find((e) => e.exerciseId === 'fs.plank')
    expect(plankInTemplate?.prescription.timeSeconds).toBeGreaterThan(0)
    expect(plankInTemplate?.prescription.reps).toBeUndefined()
  })
})
