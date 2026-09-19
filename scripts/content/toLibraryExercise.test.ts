import { describe, expect, it } from 'vitest'
import { normalizeExercise } from './normalizeExercise'
import { toLibraryExercise, UPSTREAM_MEDIA_BASE } from './toLibraryExercise'
import { validateContentPack } from '../../src/domain/content/schema'
import type { UpstreamExerciseRecord } from './upstreamTypes'

const SOURCE = { sourceRepo: 'yuhonas/free-exercise-db', sourceRevision: 'abc123', sourceLicense: 'Unlicense' }

function record(overrides: Partial<UpstreamExerciseRecord>): UpstreamExerciseRecord {
  return {
    id: 'Barbell_Squat',
    name: 'Barbell Squat',
    force: 'push',
    level: 'beginner',
    mechanic: 'compound',
    equipment: 'barbell',
    primaryMuscles: ['quadriceps'],
    secondaryMuscles: ['glutes'],
    instructions: ['Set up.', 'Squat.', 'Stand.'],
    category: 'strength',
    images: ['Barbell_Squat/0.jpg', 'Barbell_Squat/1.jpg'],
    ...overrides,
  }
}

describe('toLibraryExercise', () => {
  it('produces a schema-valid Exercise keyed by upstream id, with muscles/level/mechanic/force for filtering', () => {
    const exercise = toLibraryExercise(normalizeExercise(record({}), SOURCE))
    expect(exercise.id).toBe('lib.Barbell_Squat')
    expect(exercise.taxonomy.primaryMuscles).toEqual(['quadriceps'])
    expect(exercise.taxonomy.level).toBe('beginner')
    expect(exercise.taxonomy.mechanic).toBe('compound')
    expect(exercise.taxonomy.force).toBe('push')
    const result = validateContentPack(
      { id: 'p', version: 1, name: 'p', dependsOn: [], exerciseIds: [exercise.id], templateIds: [] },
      [exercise],
      []
    )
    expect(result.errors).toEqual([])
  })

  it('points media at the pinned upstream revision when no local media is registered', () => {
    const exercise = toLibraryExercise(normalizeExercise(record({}), SOURCE))
    expect(exercise.mediaManifest.start).toBe(`${UPSTREAM_MEDIA_BASE}/abc123/exercises/Barbell_Squat/0.jpg`)
    expect(exercise.mediaManifest.finish).toBe(`${UPSTREAM_MEDIA_BASE}/abc123/exercises/Barbell_Squat/1.jpg`)
  })

  it('prefers registered local media (bundled, offline) over upstream URLs', () => {
    const local = new Map([['Barbell_Squat', { start: '/exercise-media/Barbell_Squat/0.jpg', finish: '/exercise-media/Barbell_Squat/1.jpg' }]])
    const exercise = toLibraryExercise(normalizeExercise(record({}), SOURCE), local)
    expect(exercise.mediaManifest.start).toBe('/exercise-media/Barbell_Squat/0.jpg')
  })

  it('infers hold-based capability from a static force and time-based from cardio; reps otherwise', () => {
    const hold = toLibraryExercise(normalizeExercise(record({ id: 'Plank', force: 'static' }), SOURCE))
    const cardio = toLibraryExercise(normalizeExercise(record({ id: 'Bike', force: null, category: 'cardio', equipment: 'other' }), SOURCE))
    const reps = toLibraryExercise(normalizeExercise(record({}), SOURCE))
    expect(hold.prescriptionCapabilities).toEqual({ reps: false, time: true, hold: true })
    expect(cardio.prescriptionCapabilities).toEqual({ reps: false, time: true, hold: false })
    expect(reps.prescriptionCapabilities).toEqual({ reps: true, time: false, hold: false })
  })

  it('omits mechanic/force keys entirely when upstream has null, so the record stays schema-valid', () => {
    const exercise = toLibraryExercise(normalizeExercise(record({ mechanic: null, force: null }), SOURCE))
    expect('mechanic' in exercise.taxonomy).toBe(false)
    expect('force' in exercise.taxonomy).toBe(false)
  })
})
