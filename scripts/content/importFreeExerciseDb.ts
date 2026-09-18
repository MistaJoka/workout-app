// Batch orchestration: normalize a set of upstream records and flag
// cross-record concerns that a single-record view can't see (duplicate
// display names — see free-exercise-db.md "Duplicates and variants": do not
// deduplicate by normalized name alone, retain both for review).
import { normalizeExercise, type SourceMeta } from './normalizeExercise'
import type { UpstreamExerciseRecord } from './upstreamTypes'
import type { ImportedExerciseCandidate } from './importedExerciseCandidate'

export function importFreeExerciseDb(
  records: UpstreamExerciseRecord[],
  source: SourceMeta
): ImportedExerciseCandidate[] {
  const candidates = records.map((record) => normalizeExercise(record, source))

  const nameCounts = new Map<string, number>()
  for (const candidate of candidates) {
    nameCounts.set(candidate.sourceName, (nameCounts.get(candidate.sourceName) ?? 0) + 1)
  }

  for (const candidate of candidates) {
    if ((nameCounts.get(candidate.sourceName) ?? 0) > 1) {
      candidate.warnings.push(
        'name: shares a display name with another imported record — review before treating as distinct/duplicate'
      )
    }
  }

  return candidates
}
