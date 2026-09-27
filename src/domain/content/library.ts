import type { Exercise } from './types'

export type LibraryFilters = {
  query?: string
  muscle?: string
  equipment?: string
  level?: Exercise['taxonomy']['level']
}

export const MUSCLE_GROUPS: { id: string; label: string; muscles: string[] }[] = [
  { id: 'chest', label: 'Chest', muscles: ['chest'] },
  { id: 'back', label: 'Back', muscles: ['lats', 'middle back', 'lower back', 'traps'] },
  { id: 'shoulders', label: 'Shoulders', muscles: ['shoulders', 'neck'] },
  { id: 'arms', label: 'Arms', muscles: ['biceps', 'triceps', 'forearms'] },
  { id: 'core', label: 'Core', muscles: ['abdominals'] },
  { id: 'legs', label: 'Legs', muscles: ['quadriceps', 'hamstrings', 'calves', 'adductors', 'abductors'] },
  { id: 'glutes', label: 'Glutes', muscles: ['glutes'] },
]

export const EQUIPMENT_OPTIONS: { id: string; label: string }[] = [
  // Home-friendly equipment only: the library no longer ships barbell,
  // cable or machine work (owner rule, scripts/content/curationChecklist.ts).
  { id: 'bodyweight', label: 'No equipment' },
  { id: 'dumbbell', label: 'Dumbbells' },
  { id: 'kettlebells', label: 'Kettlebell' },
  { id: 'bands', label: 'Bands' },
  { id: 'exercise ball', label: 'Exercise ball' },
  { id: 'foam roll', label: 'Foam roller' },
]

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()
}

// The normalized search text for an exercise, computed once per exercise
// object: library records are immutable and search runs per keystroke, so
// re-normalizing every haystack each time was the cost.
const haystacks = new WeakMap<Exercise, string>()

export function searchHaystack(e: Exercise): string {
  let haystack = haystacks.get(e)
  if (haystack === undefined) {
    haystack = normalize([e.name, ...e.aliases, ...(e.taxonomy.primaryMuscles ?? [])].join(' '))
    haystacks.set(e, haystack)
  }
  return haystack
}

export function filterExercises(exercises: readonly Exercise[], filters: LibraryFilters): Exercise[] {
  const query = filters.query ? normalize(filters.query) : ''
  const terms = query ? query.split(' ') : []
  const group = filters.muscle ? MUSCLE_GROUPS.find((g) => g.id === filters.muscle) : undefined

  return exercises.filter((e) => {
    if (terms.length > 0) {
      const haystack = searchHaystack(e)
      if (!terms.every((t) => haystack.includes(t))) return false
    }
    if (group && !(e.taxonomy.primaryMuscles ?? []).some((m) => group.muscles.includes(m))) return false
    if (filters.equipment && !e.taxonomy.equipment.includes(filters.equipment)) return false
    if (filters.level && e.taxonomy.level !== filters.level) return false
    return true
  })
}

export function muscleGroupLabel(muscle: string): string {
  return MUSCLE_GROUPS.find((g) => g.muscles.includes(muscle))?.label ?? muscle
}
