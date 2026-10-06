import type { Exercise, WorkoutTemplate } from './types'

// A new move's starting prescription, used by the routine builder, "Add to a
// routine" and Her mix. Start unloaded: the library is home-friendly, and a
// made-up load (it used to be 20 kg) is worse than the lifter dialling in
// their own.
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
