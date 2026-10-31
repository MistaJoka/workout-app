// The next-level offers a finished session left pending, one per move, for
// the Complete screen to confirm or dismiss (progression always waits for an
// explicit tap).
import { getPlan } from '../infrastructure/db/repositories/sessionRepository'
import { getProgression } from '../infrastructure/db/repositories/familiarityProgressionRepository'

export type ProgressionOffer = {
  exerciseId: string
  exerciseName: string
  candidatePrescribedReps: number
  candidateWeightKg?: number
}

export async function loadProgressionOffers(sessionId: string): Promise<ProgressionOffer[]> {
  const plan = await getPlan(sessionId)
  if (!plan) return []
  const progressionRecords = await Promise.all(plan.exercises.map((e) => getProgression(e.exerciseId)))
  return progressionRecords
    .filter((r) => r.pendingCandidate)
    .map((r) => ({
      exerciseId: r.exerciseId,
      exerciseName: plan.exercises.find((e) => e.exerciseId === r.exerciseId)?.name ?? r.exerciseId,
      candidatePrescribedReps: r.pendingCandidate!.candidatePrescribedReps,
      ...(r.pendingCandidate!.candidateWeightKg != null ? { candidateWeightKg: r.pendingCandidate!.candidateWeightKg } : {}),
    }))
}
