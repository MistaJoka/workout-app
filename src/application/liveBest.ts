import { getAllSessionHistory } from '../infrastructure/db/repositories/sessionRepository'
import { projectSetRecords } from '../domain/progress/history'
import { priorBestForExercise } from '../domain/progress/liveBest'
import type { PersonalRecord } from '../domain/progress/types'

// The player's "prior best" lookup: the same finished-session projection
// Progress/exerciseYou.ts use (getAllSessionHistory -> projectSetRecords),
// scoped to one exercise. The in-progress session being played has no
// SessionResult yet, so it's never among these records — a failed read
// just means no live-best moments show this set, same as lastTime.ts.
export async function getPriorBest(exerciseId: string, currentSessionId: string): Promise<PersonalRecord | null> {
  const { plans, results, events } = await getAllSessionHistory()
  return priorBestForExercise(projectSetRecords(plans, results, events), exerciseId, currentSessionId)
}
