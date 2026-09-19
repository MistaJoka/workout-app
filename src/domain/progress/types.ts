// One completed set, projected from persisted session history. This is the
// single input shape for every progress calculation, so adding weight later
// (see docs/rnd/foss-fitness/sources/ischys.md: volume = weight × reps,
// Epley e1RM) is an additive field, not a reshape.
export type SetRecord = {
  exerciseId: string
  exerciseName: string
  sessionId: string
  sessionEndedAt: string
  setNumber: number
  prescribedReps?: number
  prescribedSeconds?: number
  // Reps actually logged, when the player captured a count (weighted sets).
  performedReps?: number
  // Kilograms, when the exercise was loaded.
  weight?: number
  met: boolean
}

export type PersonalRecord = {
  exerciseId: string
  exerciseName: string
  // 'kg' records carry the reps done at that load; e1RM derives from both.
  unit: 'reps' | 'seconds' | 'kg'
  value: number
  reps?: number
  sessionId: string
  sessionEndedAt: string
}

export type ExerciseHistoryPoint = {
  sessionId: string
  sessionEndedAt: string
  unit: 'reps' | 'seconds' | 'kg'
  // For 'kg' this is the (last) load lifted that session; reps in `reps`.
  prescribed: number
  reps?: number
  metSets: number
  totalSets: number
}

export type WeekTotal = {
  // Local Monday of the ISO week, as YYYY-MM-DD.
  weekStart: string
  sessions: number
}
