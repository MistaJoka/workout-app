import { db } from '../schema'
import type { FamiliarityRecord, ProgressionRecord } from '../schema'
import type { DoubleProgressionResult } from '../../../domain/adaptation/rules/doubleProgression'

export async function getFamiliarity(exerciseId: string): Promise<FamiliarityRecord> {
  const existing = await db.familiarity.get(exerciseId)
  return existing ?? { exerciseId, exposureCount: 0, lastSeenAt: null }
}

export async function recordExposure(exerciseId: string, timestamp: string): Promise<void> {
  const existing = await db.familiarity.get(exerciseId)
  const next: FamiliarityRecord = {
    exerciseId,
    exposureCount: (existing?.exposureCount ?? 0) + 1,
    lastSeenAt: timestamp,
  }
  await db.familiarity.put(next)
}

export async function getProgression(exerciseId: string): Promise<ProgressionRecord> {
  const existing = await db.progression.get(exerciseId)
  return {
    exerciseId,
    level: 0,
    lastAdvancedAt: null,
    currentPrescribedReps: null,
    currentWeightKg: null,
    consecutiveFailureStreak: 0,
    pendingCandidate: null,
    // Records written before currentWeightKg existed lack the field; the
    // defaults above fill it in.
    ...(existing ?? {}),
  }
}

// Persists a deterministic adaptation outcome for one exercise, per
// SOURCE_OF_TRUTH_V06.md §7-8: RETAINED/ADJUSTED_WITHIN_BOUNDS/REGRESSED are
// engine-owned decisions and apply directly; PROGRESSION_CANDIDATE is staged
// as pending and requires a separate explicit confirmation (advanceProgression)
// before it takes effect. `weighted` says whether nextLoad/candidateLoad are
// meaningful for this exercise (bodyweight exercises always evaluate at load 0).
export async function applyProgressionOutcome(
  exerciseId: string,
  outcome: DoubleProgressionResult,
  options: { weighted?: boolean } = {}
): Promise<void> {
  const existing = await getProgression(exerciseId)

  if (outcome.reasonCode === 'PROGRESSION_CANDIDATE') {
    await db.progression.put({
      ...existing,
      consecutiveFailureStreak: outcome.nextFailureStreak,
      pendingCandidate: {
        candidatePrescribedReps: outcome.candidatePrescribedReps ?? outcome.nextPrescribedReps,
        ...(options.weighted && outcome.candidateLoad != null ? { candidateWeightKg: outcome.candidateLoad } : {}),
        detail: outcome.detail,
      },
    })
    return
  }

  await db.progression.put({
    ...existing,
    currentPrescribedReps: outcome.nextPrescribedReps,
    ...(options.weighted ? { currentWeightKg: outcome.nextLoad } : {}),
    consecutiveFailureStreak: outcome.nextFailureStreak,
    pendingCandidate: null,
  })
}

// Per SOURCE_OF_TRUTH_V06.md §8: progression requires explicit user
// confirmation. This function performs the state change only — the UI
// layer is responsible for gating the call behind an explicit "Try Next
// Level?" confirmation, never calling it automatically. A no-op if there is
// no pending candidate to confirm.
export async function advanceProgression(exerciseId: string, timestamp: string): Promise<void> {
  const existing = await getProgression(exerciseId)
  if (!existing.pendingCandidate) {
    return
  }
  const next: ProgressionRecord = {
    exerciseId,
    level: existing.level + 1,
    lastAdvancedAt: timestamp,
    currentPrescribedReps: existing.pendingCandidate.candidatePrescribedReps,
    currentWeightKg: existing.pendingCandidate.candidateWeightKg ?? existing.currentWeightKg,
    consecutiveFailureStreak: 0,
    pendingCandidate: null,
  }
  await db.progression.put(next)
}

export async function dismissProgressionCandidate(exerciseId: string): Promise<void> {
  const existing = await getProgression(exerciseId)
  await db.progression.put({ ...existing, pendingCandidate: null })
}
