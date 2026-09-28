import { describe, expect, it } from 'vitest'
import { EQUIPMENT_FILTER_OPTIONS, equipmentLabel, equipmentOf, exerciseMeta, filterExercises, isShownNow, searchHaystack } from './library'
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

  it('counts an exercise with no listed equipment (upstream stretches) as no equipment, but not "other"', () => {
    const stretch = exercise({ id: 's', name: "Child's Pose", taxonomy: { category: 'stretching', equipment: [], level: 'beginner' } })
    const chair = exercise({ id: 'o', name: 'Chair Stretch', taxonomy: { category: 'stretching', equipment: ['other'], level: 'beginner' } })
    expect(filterExercises([...all, stretch, chair], { equipment: 'bodyweight' }).map((e) => e.id)).toEqual(['a', 's'])
    expect(equipmentOf(stretch)).toEqual(['bodyweight'])
    expect(equipmentOf(chair)).toEqual(['other'])
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

describe('isShownNow (no equipment for now, owner 2026-09-28)', () => {
  it('shows bodyweight library moves and ones that list no equipment', () => {
    expect(isShownNow(exercise({ id: 'lib.Pushups', name: 'Pushups' }))).toBe(true)
    expect(isShownNow(exercise({ id: 'lib.Cat_Stretch', name: 'Cat Stretch', taxonomy: { category: 'stretching', equipment: [], primaryMuscles: [] } }))).toBe(true)
  })

  it('hides library moves that need equipment, including "other"', () => {
    for (const equipment of [['dumbbell'], ['bands'], ['exercise ball'], ['foam roll'], ['kettlebells'], ['other']]) {
      expect(isShownNow(exercise({ id: 'lib.X', name: 'X', taxonomy: { category: 'strength', equipment, primaryMuscles: [] } }))).toBe(false)
    }
  })

  it('hides bodyweight library moves whose steps need a prop', () => {
    expect(isShownNow(exercise({ id: 'lib.Chin-Up', name: 'Chin-Up' }))).toBe(false)
    expect(isShownNow(exercise({ id: 'lib.Decline_Push-Up', name: 'Decline Push-Up' }))).toBe(false)
  })

  it("always shows curated and Rae's own moves (a chair counts as home)", () => {
    expect(isShownNow(exercise({ id: 'fs.bodyweight-squat', name: 'Bodyweight Squat' }))).toBe(true)
    expect(isShownNow(exercise({ id: 'rae.seated-march', name: 'Seated March', taxonomy: { category: 'strength', equipment: ['other'], primaryMuscles: [] } }))).toBe(true)
  })

  it('offers no equipment filter while only no-equipment moves are shown', () => {
    expect(EQUIPMENT_FILTER_OPTIONS).toEqual([])
  })
})

describe('friendly exercise labels', () => {
  it('names the muscle group, not the raw muscle', () => {
    expect(exerciseMeta(exercise({ id: 'lib.A', name: 'A', taxonomy: { category: 'strength', equipment: ['bodyweight'], primaryMuscles: ['quadriceps'], level: 'beginner' } }))).toEqual(['Legs', 'No equipment'])
  })

  it('calls an empty equipment list "No equipment" and Rae\'s "other" moves "Chair"', () => {
    expect(equipmentLabel(exercise({ id: 'lib.B', name: 'B', taxonomy: { category: 'stretching', equipment: [], primaryMuscles: [] } }))).toBe('No equipment')
    expect(equipmentLabel(exercise({ id: 'rae.seated-march', name: 'Seated March', taxonomy: { category: 'strength', equipment: ['other'], primaryMuscles: [] } }))).toBe('Chair')
    expect(equipmentLabel(exercise({ id: 'lib.C', name: 'C', taxonomy: { category: 'strength', equipment: ['dumbbell'], primaryMuscles: [] } }))).toBe('Dumbbells')
  })

  it('shows the level only when it is not beginner, capitalized', () => {
    expect(exerciseMeta(exercise({ id: 'lib.D', name: 'D', taxonomy: { category: 'strength', equipment: ['bodyweight'], primaryMuscles: ['abdominals'], level: 'intermediate' } }))).toEqual(['Core', 'No equipment', 'Intermediate'])
  })

  it('skips a missing muscle and capitalizes an unmapped one', () => {
    expect(exerciseMeta(exercise({ id: 'lib.E', name: 'E', taxonomy: { category: 'strength', equipment: ['bodyweight'], primaryMuscles: [] } }))).toEqual(['No equipment'])
    expect(exerciseMeta(exercise({ id: 'lib.F', name: 'F', taxonomy: { category: 'strength', equipment: ['bodyweight'], primaryMuscles: ['wrists'] } }))).toEqual(['Wrists', 'No equipment'])
  })
})
