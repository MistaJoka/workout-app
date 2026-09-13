import { db } from '../schema'
import type { FamiliarityRecord, ProgressionRecord } from '../schema'

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
  return existing ?? { exerciseId, level: 0, lastAdvancedAt: null }
}

// Per SOURCE_OF_TRUTH_V06.md §8: progression requires explicit user
// confirmation. This function performs the state change only — the UI
// layer (a later phase) is responsible for gating the call behind an
// explicit "Try Next Level?" confirmation, never calling it automatically
// from exposure count alone.
export async function advanceProgression(exerciseId: string, timestamp: string): Promise<void> {
  const existing = await db.progression.get(exerciseId)
  const next: ProgressionRecord = {
    exerciseId,
    level: (existing?.level ?? 0) + 1,
    lastAdvancedAt: timestamp,
  }
  await db.progression.put(next)
}
