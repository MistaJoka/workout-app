import { describe, expect, it } from 'vitest'
import { validateContentPack } from './schema'
import type { ContentPack, Exercise, WorkoutTemplate } from './types'

const exercise: Exercise = {
  id: 'placeholder.test-exercise',
  version: 1,
  name: 'Placeholder Test Exercise',
  aliases: [],
  taxonomy: { category: 'placeholder', equipment: ['bodyweight'] },
  setup: 'Placeholder setup instructions.',
  executionPhases: ['Placeholder phase'],
  cues: [],
  commonErrors: [],
  prescriptionCapabilities: { reps: true, time: false, hold: false },
  mediaManifest: {},
  provenance: { author: 'placeholder', reviewedAt: null, status: 'draft' },
}

const template: WorkoutTemplate = {
  id: 'placeholder.test-template',
  version: 1,
  name: 'Placeholder Test Template',
  packId: 'placeholder-pack',
  exercises: [
    {
      exerciseId: 'placeholder.test-exercise',
      exerciseVersion: 1,
      prescription: { sets: 3, reps: 10, restSeconds: 60 },
      order: 0,
      optional: false,
    },
  ],
}

const pack: ContentPack = {
  id: 'placeholder-pack',
  version: 1,
  name: 'Placeholder Pack',
  dependsOn: [],
  exerciseIds: ['placeholder.test-exercise'],
  templateIds: ['placeholder.test-template'],
}

describe('validateContentPack', () => {
  it('accepts a pack whose templates/exercises are all present and referentially consistent', () => {
    const result = validateContentPack(pack, [exercise], [template])
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('accepts an exercise carrying optional source provenance for imported content', () => {
    const importedExercise: Exercise = {
      ...exercise,
      provenance: {
        author: 'imported:free-exercise-db',
        reviewedAt: null,
        status: 'draft',
        sourceRepo: 'yuhonas/free-exercise-db',
        sourceRevision: 'a859101d633a01c4a1a920d6a8ce41dabba0705f',
        sourceRecordId: 'Bodyweight_Squat',
        sourceLicense: 'Unlicense',
      },
    }
    const result = validateContentPack(pack, [importedExercise], [template])
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('rejects a pack referencing a template ID that is not provided', () => {
    const brokenPack: ContentPack = { ...pack, templateIds: ['missing.template'] }
    const result = validateContentPack(brokenPack, [exercise], [template])
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('missing.template'))).toBe(true)
  })

  it('rejects a template referencing an exercise ID/version that is not provided', () => {
    const brokenTemplate: WorkoutTemplate = {
      ...template,
      exercises: [{ ...template.exercises[0], exerciseId: 'missing.exercise' }],
    }
    const result = validateContentPack(pack, [exercise], [brokenTemplate])
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('missing.exercise'))).toBe(true)
  })

  it('rejects a pack referencing an exercise ID that is not provided', () => {
    const brokenPack: ContentPack = { ...pack, exerciseIds: ['missing.exercise'] }
    const result = validateContentPack(brokenPack, [exercise], [template])
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('missing.exercise'))).toBe(true)
  })
})
