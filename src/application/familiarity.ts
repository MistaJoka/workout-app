import { familiarExerciseIds } from '../domain/session/familiarity'
import { getFamiliarities } from '../infrastructure/db/repositories/familiarityProgressionRepository'

// The moves in this list the user already knows (see FAMILIAR_AFTER_SESSIONS).
export async function getFamiliarExerciseIds(exerciseIds: readonly string[]): Promise<Set<string>> {
  return familiarExerciseIds(await getFamiliarities(exerciseIds))
}
