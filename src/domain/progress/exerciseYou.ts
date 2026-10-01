import { detectPersonalRecords, perExerciseHistory } from './stats'
import type { PersonalRecord, SetRecord } from './types'

export type ExerciseYouSummary = {
  sessions: number
  // Undefined when no set of this move was ever met.
  best: PersonalRecord | undefined
  lastEndedAt: string
}

// The user's own history with one move, for the Exercise Detail "You"
// block. Built on the same projections Progress uses, so the numbers match
// the full history screen. Null when the move has never been done.
export function summarizeExerciseForYou(records: readonly SetRecord[], exerciseId: string): ExerciseYouSummary | null {
  const points = perExerciseHistory(records, exerciseId)
  if (points.length === 0) return null
  const own = records.filter((r) => r.exerciseId === exerciseId)
  return {
    sessions: points.length,
    best: detectPersonalRecords(own).get(exerciseId),
    lastEndedAt: points[points.length - 1].sessionEndedAt,
  }
}
