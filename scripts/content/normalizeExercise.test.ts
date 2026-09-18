import { describe, expect, it } from 'vitest'
import { normalizeExercise } from './normalizeExercise'
import type { UpstreamExerciseRecord } from './upstreamTypes'

// Test vectors F1-F6 from docs/rnd/foss-fitness/sources/free-exercise-db.md.
// Fixture records are real upstream data pinned at commit
// a859101d633a01c4a1a920d6a8ce41dabba0705f (see
// scripts/content/fixtures/freeExerciseDbSample.ts).
const SOURCE_META = {
  sourceRepo: 'yuhonas/free-exercise-db',
  sourceRevision: 'a859101d633a01c4a1a920d6a8ce41dabba0705f',
  sourceLicense: 'Unlicense',
}

describe('normalizeExercise', () => {
  // F1 — ordinary weighted exercise
  it('normalizes a weighted compound exercise with an equipment array and preserved instructions', () => {
    const upstream: UpstreamExerciseRecord = {
      id: 'Barbell_Squat',
      name: 'Barbell Squat',
      force: 'push',
      level: 'beginner',
      mechanic: 'compound',
      equipment: 'barbell',
      primaryMuscles: ['quadriceps'],
      secondaryMuscles: ['glutes'],
      instructions: ['Set up under the bar.', 'Lower until parallel.', 'Drive back up.'],
      category: 'strength',
      images: ['Barbell_Squat/0.jpg'],
    }

    const candidate = normalizeExercise(upstream, SOURCE_META)

    expect(candidate.normalizedDraft.taxonomy.equipment).toEqual(['barbell'])
    expect(candidate.normalizedDraft.setup).toBe('Set up under the bar.')
    expect(candidate.normalizedDraft.executionPhases).toEqual(['Lower until parallel.', 'Drive back up.'])
    expect(candidate.warnings).toEqual([])
    expect(candidate.reviewStatus).toBe('draft')
  })

  // F2 — body-only exercise
  it('maps "body only" equipment to the local bodyweight convention', () => {
    const upstream: UpstreamExerciseRecord = {
      id: 'Bodyweight_Squat',
      name: 'Bodyweight Squat',
      force: 'push',
      level: 'beginner',
      mechanic: 'compound',
      equipment: 'body only',
      primaryMuscles: ['quadriceps'],
      secondaryMuscles: [],
      instructions: ['Stand with feet shoulder width apart.', 'Squat down.', 'Stand back up.'],
      category: 'strength',
      images: [],
    }

    const candidate = normalizeExercise(upstream, SOURCE_META)

    expect(candidate.normalizedDraft.taxonomy.equipment).toEqual(['bodyweight'])
    expect(candidate.warnings).toEqual([])
  })

  // F3 — null equipment
  it('produces an explicit unknown-equipment marker and an audit warning for null equipment, without crashing', () => {
    const upstream: UpstreamExerciseRecord = {
      id: 'Ankle_Circles',
      name: 'Ankle Circles',
      force: 'pull',
      level: 'beginner',
      mechanic: 'isolation',
      equipment: null,
      primaryMuscles: ['calves'],
      secondaryMuscles: [],
      instructions: ['Lift the leg.', 'Circle the ankle.'],
      category: 'stretching',
      images: [],
    }

    const candidate = normalizeExercise(upstream, SOURCE_META)

    expect(candidate.normalizedDraft.taxonomy.equipment).toEqual([])
    expect(candidate.warnings).toContain('equipment: unknown/unspecified upstream — normalized to no equipment')
  })

  // F4 — null mechanic/force
  it('preserves null mechanic/force from the source and keeps the import valid', () => {
    const upstream: UpstreamExerciseRecord = {
      id: 'Bicycling',
      name: 'Bicycling',
      force: null,
      level: 'beginner',
      mechanic: null,
      equipment: 'other',
      primaryMuscles: ['quadriceps'],
      secondaryMuscles: [],
      instructions: ['Seat yourself on the bike.'],
      category: 'cardio',
      images: [],
    }

    const candidate = normalizeExercise(upstream, SOURCE_META)

    expect(candidate.force).toBeNull()
    expect(candidate.mechanic).toBeNull()
    expect(candidate.warnings).toEqual([])
  })

  // F5 — unknown future enum
  it('fails loudly on an equipment value the pinned importer does not recognize', () => {
    const upstream: UpstreamExerciseRecord = {
      id: 'Some_New_Exercise',
      name: 'Some New Exercise',
      force: 'push',
      level: 'beginner',
      mechanic: 'compound',
      equipment: 'anti-gravity boots',
      primaryMuscles: [],
      secondaryMuscles: [],
      instructions: ['Do the thing.'],
      category: 'strength',
      images: [],
    }

    expect(() => normalizeExercise(upstream, SOURCE_META)).toThrow(/unrecognized equipment/i)
  })

  // F6 — incomplete local enrichment
  it('always marks a fresh import as draft, never approved, regardless of data completeness', () => {
    const upstream: UpstreamExerciseRecord = {
      id: 'Barbell_Squat',
      name: 'Barbell Squat',
      force: 'push',
      level: 'beginner',
      mechanic: 'compound',
      equipment: 'barbell',
      primaryMuscles: ['quadriceps'],
      secondaryMuscles: [],
      instructions: ['Set up under the bar.', 'Squat down.'],
      category: 'strength',
      images: [],
    }

    const candidate = normalizeExercise(upstream, SOURCE_META)

    expect(candidate.reviewStatus).toBe('draft')
  })

  it('carries full source provenance on every candidate', () => {
    const upstream: UpstreamExerciseRecord = {
      id: 'Barbell_Squat',
      name: 'Barbell Squat',
      force: 'push',
      level: 'beginner',
      mechanic: 'compound',
      equipment: 'barbell',
      primaryMuscles: [],
      secondaryMuscles: [],
      instructions: ['Set up under the bar.'],
      category: 'strength',
      images: ['Barbell_Squat/0.jpg'],
    }

    const candidate = normalizeExercise(upstream, SOURCE_META)

    expect(candidate.sourceRepo).toBe('yuhonas/free-exercise-db')
    expect(candidate.sourceRevision).toBe('a859101d633a01c4a1a920d6a8ce41dabba0705f')
    expect(candidate.sourceRecordId).toBe('Barbell_Squat')
    expect(candidate.sourceLicense).toBe('Unlicense')
    expect(candidate.imageRefs).toEqual(['Barbell_Squat/0.jpg'])
  })
})
