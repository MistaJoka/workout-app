import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { validateContentPack } from '../schema'
import {
  ROTATION,
  foundationStrengthStarterExercises,
  foundationStrengthStarterPack,
  foundationStrengthStarterTemplates,
  quick10,
  starterTemplates,
  templateById,
} from './foundationStrengthStarter'

describe('foundationStrengthStarter', () => {
  it('validates as a referentially consistent, schema-valid content pack across all templates', () => {
    const result = validateContentPack(
      foundationStrengthStarterPack,
      foundationStrengthStarterExercises,
      starterTemplates
    )
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('never shows placeholder text in any user-facing exercise or template field', () => {
    const haystacks = [
      foundationStrengthStarterPack.name,
      ...foundationStrengthStarterTemplates.map((t) => t.name),
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

  it('gives every exercise real setup + execution steps (no empty instruction sets)', () => {
    for (const exercise of foundationStrengthStarterExercises) {
      expect(exercise.setup.length).toBeGreaterThan(0)
      expect(exercise.executionPhases.length).toBeGreaterThan(0)
    }
  })

  it('references start/finish movement photos that actually exist as static assets', () => {
    for (const exercise of foundationStrengthStarterExercises) {
      const { start, finish } = exercise.mediaManifest
      expect(start).toBeTruthy()
      expect(finish).toBeTruthy()
      for (const path of [start!, finish!]) {
        expect(existsSync(join(process.cwd(), 'public', path)), `${exercise.id}: ${path}`).toBe(true)
      }
    }
  })

  it('prescribes hold-based exercises by time, never reps, in every template', () => {
    for (const template of starterTemplates) {
      for (const te of template.exercises) {
        const exercise = foundationStrengthStarterExercises.find((e) => e.id === te.exerciseId)!
        if (exercise.prescriptionCapabilities.hold) {
          expect(te.prescription.timeSeconds).toBeGreaterThan(0)
          expect(te.prescription.reps).toBeUndefined()
        } else {
          expect(te.prescription.reps).toBeGreaterThan(0)
          expect(te.prescription.timeSeconds).toBeUndefined()
        }
      }
    }
  })

  it('rotates between the two full sessions and keeps Quick 10 out of the rotation', () => {
    expect(ROTATION).toHaveLength(2)
    expect(ROTATION).not.toContain(quick10.id)
    for (const id of ROTATION) {
      expect(templateById.has(id)).toBe(true)
    }
  })
})
