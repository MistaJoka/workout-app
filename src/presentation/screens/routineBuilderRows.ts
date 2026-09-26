import type { Exercise, WorkoutTemplate } from '../../domain/content/types'

export type EditRow = {
  exerciseId: string
  exercise: Exercise | null
  sets: number
  reps?: number
  timeSeconds?: number
  restSeconds: number
  weightKg?: number
}

// Every template exercise keeps its row even if the exercise no longer
// resolves (e.g. trimmed from the library) — dropping it here would silently
// delete that exercise from the user's routine the next time they hit Save.
export function buildEditRows(template: WorkoutTemplate, exercises: Map<string, Exercise>): EditRow[] {
  return template.exercises.map((te) => ({
    exerciseId: te.exerciseId,
    exercise: exercises.get(te.exerciseId) ?? null,
    ...te.prescription,
  }))
}
