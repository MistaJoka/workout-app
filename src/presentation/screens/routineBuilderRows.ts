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

// A new move's starting prescription, used by the builder and by "Add to a
// routine". Start unloaded: the library is home-friendly, and a made-up
// load (it used to be 20 kg) is worse than the lifter dialling in their own.
export function defaultPrescription(exercise: Exercise): WorkoutTemplate['exercises'][number]['prescription'] {
  const timed = !exercise.prescriptionCapabilities.reps
  const weighted = exercise.prescriptionCapabilities.weight === true
  return {
    sets: 3,
    ...(timed ? { timeSeconds: 30 } : { reps: 10 }),
    restSeconds: weighted ? 90 : 60,
    ...(weighted ? { weightKg: 0 } : {}),
  }
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
