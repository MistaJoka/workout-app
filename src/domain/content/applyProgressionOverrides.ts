import type { WorkoutTemplate } from './types'

// Applies persisted per-exercise reps overrides (from confirmed progression)
// on top of a template's authored defaults, without mutating canonical
// content — CLAUDE.md: "Canonical workout templates are immutable authored
// content." Only reps-based prescriptions are ever overridden.
export function applyProgressionOverrides(
  template: WorkoutTemplate,
  overridesByExerciseId: Map<string, number>
): WorkoutTemplate {
  return {
    ...template,
    exercises: template.exercises.map((exercise) => {
      const override = overridesByExerciseId.get(exercise.exerciseId)
      if (override == null || exercise.prescription.reps == null) {
        return exercise
      }
      return {
        ...exercise,
        prescription: { ...exercise.prescription, reps: override },
      }
    }),
  }
}
