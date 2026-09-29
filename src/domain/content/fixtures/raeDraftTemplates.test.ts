import { describe, expect, it } from 'vitest'
import library from '../generated/libraryExercises.json'
import loops from '../../../presentation/components/raeLoops.generated.json'
import { isShownNow } from '../library'
import type { Exercise } from '../types'
import { DRAFT_TEMPLATE_IDS, raeDraftTemplates } from './raeDraftTemplates'
import { ROTATION, foundationStrengthStarterTemplates, templateById } from './foundationStrengthStarter'
import { raeMoveById } from './raeMoves'

const libraryById = new Map((library as Exercise[]).map((e) => [e.id, e]))
const demoed = new Set((loops as { exerciseIds: string[] }[]).flatMap((l) => l.exerciseIds))

function resolve(id: string): Exercise | undefined {
  return raeMoveById.get(id) ?? libraryById.get(id)
}

describe('raeDraftTemplates', () => {
  it('uses only existing exercises (no invented moves), each demonstrated by Rae', () => {
    for (const template of raeDraftTemplates) {
      for (const te of template.exercises) {
        const exercise = resolve(te.exerciseId)
        expect(exercise, `${template.id}: ${te.exerciseId}`).toBeDefined()
        expect(te.exerciseVersion).toBe(exercise!.version)
        expect(demoed.has(te.exerciseId), `${te.exerciseId} has a Rae loop`).toBe(true)
      }
    }
  })

  it('needs no equipment (every library move is browsable under the no-equipment rule)', () => {
    for (const template of raeDraftTemplates) {
      for (const te of template.exercises) {
        expect(isShownNow(resolve(te.exerciseId)!), te.exerciseId).toBe(true)
      }
    }
  })

  it('prescribes reps for rep-based moves, with conservative doses', () => {
    for (const template of raeDraftTemplates) {
      for (const te of template.exercises) {
        expect(resolve(te.exerciseId)!.prescriptionCapabilities.reps).toBe(true)
        expect(te.prescription.reps).toBe(10)
        expect(te.prescription.sets).toBeLessThanOrEqual(2)
        expect(te.prescription.restSeconds).toBeGreaterThanOrEqual(30)
      }
    }
  })

  it('is listed with the curated templates and resolvable by id, but never in the A/B rotation', () => {
    for (const template of raeDraftTemplates) {
      expect(foundationStrengthStarterTemplates).toContain(template)
      expect(templateById.get(template.id)).toBe(template)
      expect(ROTATION).not.toContain(template.id)
      expect(DRAFT_TEMPLATE_IDS.has(template.id)).toBe(true)
    }
  })

  it('keeps exercise order dense and unique within each template', () => {
    for (const template of raeDraftTemplates) {
      expect(template.exercises.map((e) => e.order)).toEqual(template.exercises.map((_, i) => i))
      expect(new Set(template.exercises.map((e) => e.exerciseId)).size).toBe(template.exercises.length)
    }
  })
})
