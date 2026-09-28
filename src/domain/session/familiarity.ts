// Familiarity decides how much guidance the player shows (SoT §8), separate
// from progression. An exposure is one finished session in which at least
// one set of the move was done (sessionService records it at completion).
//
// Three sessions: the first shows how, the second confirms it, and by the
// third the move is known well enough that Rae plus the reps carry it. The
// steps stay one tap away ("Show steps"), so nothing is ever removed.
export const FAMILIAR_AFTER_SESSIONS = 3

export function isFamiliar(exposureCount: number): boolean {
  return exposureCount >= FAMILIAR_AFTER_SESSIONS
}

type ExposureRecord = { exerciseId: string; exposureCount: number }

export function familiarExerciseIds(records: readonly (ExposureRecord | undefined)[]): Set<string> {
  const ids = new Set<string>()
  for (const record of records) {
    if (record && isFamiliar(record.exposureCount)) ids.add(record.exerciseId)
  }
  return ids
}
