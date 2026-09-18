import { describe, expect, it } from 'vitest'
import { importFreeExerciseDb } from './importFreeExerciseDb'
import type { UpstreamExerciseRecord } from './upstreamTypes'

const SOURCE_META = {
  sourceRepo: 'yuhonas/free-exercise-db',
  sourceRevision: 'a859101d633a01c4a1a920d6a8ce41dabba0705f',
  sourceLicense: 'Unlicense',
}

function record(overrides: Partial<UpstreamExerciseRecord>): UpstreamExerciseRecord {
  return {
    id: 'X',
    name: 'X',
    force: 'push',
    level: 'beginner',
    mechanic: 'compound',
    equipment: 'barbell',
    primaryMuscles: [],
    secondaryMuscles: [],
    instructions: ['Do it.'],
    category: 'strength',
    images: [],
    ...overrides,
  }
}

describe('importFreeExerciseDb', () => {
  it('produces one candidate per upstream record', () => {
    const candidates = importFreeExerciseDb(
      [record({ id: 'A', name: 'A' }), record({ id: 'B', name: 'B' })],
      SOURCE_META
    )
    expect(candidates).toHaveLength(2)
    expect(candidates.map((c) => c.sourceRecordId)).toEqual(['A', 'B'])
  })

  // F7 — duplicate display name
  it('retains both candidates for a duplicate display name, each with distinct provenance, and flags them', () => {
    const candidates = importFreeExerciseDb(
      [record({ id: 'Barbell_Squat', name: 'Barbell Squat' }), record({ id: 'Barbell_Squat_Variant', name: 'Barbell Squat' })],
      SOURCE_META
    )

    expect(candidates).toHaveLength(2)
    expect(candidates[0].sourceRecordId).toBe('Barbell_Squat')
    expect(candidates[1].sourceRecordId).toBe('Barbell_Squat_Variant')
    for (const candidate of candidates) {
      expect(candidate.warnings).toContain('name: shares a display name with another imported record — review before treating as distinct/duplicate')
    }
  })

  it('does not warn about names that are not duplicated in the batch', () => {
    const candidates = importFreeExerciseDb(
      [record({ id: 'A', name: 'A' }), record({ id: 'B', name: 'B' })],
      SOURCE_META
    )
    expect(candidates.every((c) => c.warnings.length === 0)).toBe(true)
  })

  it('imports the full pinned fixture set without any record failing normalization', async () => {
    const { freeExerciseDbSample, FREE_EXERCISE_DB_SOURCE } = await import('./fixtures/freeExerciseDbSample')
    const candidates = importFreeExerciseDb(freeExerciseDbSample, FREE_EXERCISE_DB_SOURCE)
    expect(candidates).toHaveLength(freeExerciseDbSample.length)
    expect(candidates.every((c) => c.reviewStatus === 'draft')).toBe(true)
  })
})
