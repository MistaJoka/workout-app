import { describe, expect, it } from 'vitest'
import { filterExercises, searchHaystack } from './library'
import type { Exercise } from './types'

function exercise(overrides: Partial<Exercise> & { id: string; name: string }): Exercise {
  return {
    version: 1,
    aliases: [],
    taxonomy: { category: 'strength', equipment: ['bodyweight'], primaryMuscles: ['chest'], level: 'beginner' },
    setup: '',
    executionPhases: [],
    cues: [],
    commonErrors: [],
    prescriptionCapabilities: { reps: true, time: false, hold: false },
    mediaManifest: {},
    provenance: { author: 't', reviewedAt: null, status: 'draft' },
    ...overrides,
  }
}

const all: Exercise[] = [
  exercise({ id: 'a', name: 'Incline Push-Up' }),
  exercise({ id: 'b', name: 'Barbell Squat', taxonomy: { category: 'strength', equipment: ['barbell'], primaryMuscles: ['quadriceps'], level: 'intermediate' } }),
  exercise({ id: 'c', name: 'Lat Pulldown', taxonomy: { category: 'strength', equipment: ['cable'], primaryMuscles: ['lats'], level: 'beginner' } }),
]

describe('filterExercises', () => {
  it('matches every query term against the name, ignoring case and punctuation', () => {
    expect(filterExercises(all, { query: 'push up' }).map((e) => e.id)).toEqual(['a'])
    expect(filterExercises(all, { query: 'PUSH-UP incline' }).map((e) => e.id)).toEqual(['a'])
    expect(filterExercises(all, { query: 'push squat' })).toEqual([])
  })

  it('filters by muscle group, mapping specific muscles into groups', () => {
    expect(filterExercises(all, { muscle: 'back' }).map((e) => e.id)).toEqual(['c'])
    expect(filterExercises(all, { muscle: 'legs' }).map((e) => e.id)).toEqual(['b'])
  })

  it('filters by equipment and level, and combines filters with AND', () => {
    expect(filterExercises(all, { equipment: 'barbell' }).map((e) => e.id)).toEqual(['b'])
    expect(filterExercises(all, { level: 'beginner' }).map((e) => e.id)).toEqual(['a', 'c'])
    expect(filterExercises(all, { level: 'beginner', equipment: 'cable' }).map((e) => e.id)).toEqual(['c'])
  })

  it('returns everything for empty filters', () => {
    expect(filterExercises(all, {})).toHaveLength(3)
  })
})

describe('searchHaystack', () => {
  it('normalizes name, aliases and primary muscles into one lowercase string', () => {
    const e = exercise({ id: 'h', name: 'Push-Up (Incline)', aliases: ['Incline Press Up'] })
    expect(searchHaystack(e)).toBe('push up incline incline press up chest')
  })

  it('is computed once per exercise object', () => {
    const e = exercise({ id: 'h2', name: 'Plank' })
    const first = searchHaystack(e)
    // Exercises are immutable records, so the cached string is reused even
    // if the object were mutated afterwards.
    e.aliases.push('Front Hold')
    expect(searchHaystack(e)).toBe(first)
  })
})
