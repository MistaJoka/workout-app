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
  weight?: number
  met: boolean
}

export type PersonalRecord = {
  exerciseId: string
  exerciseName: string
  unit: 'reps' | 'seconds'
  value: number
  sessionId: string
  sessionEndedAt: string
}

export type ExerciseHistoryPoint = {
  sessionId: string
  sessionEndedAt: string
  unit: 'reps' | 'seconds'
  prescribed: number
  metSets: number
  totalSets: number
}

export type WeekTotal = {
  // Local Monday of the ISO week, as YYYY-MM-DD.
  weekStart: string
  sessions: number
}
