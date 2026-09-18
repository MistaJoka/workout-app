// Staging shape from docs/rnd/foss-fitness/sources/free-exercise-db.md
// ("Staging model") — preserves all upstream information without changing
// the production Exercise schema. Never write these directly into
// production content; they require human review (support/REVIEW_QUEUE.md)
// before promotion.
import type { UpstreamForce, UpstreamLevel, UpstreamMechanic } from './upstreamTypes'

export type NormalizedExerciseDraft = {
  name: string
  taxonomy: {
    category: string
    equipment: string[]
  }
  setup: string
  executionPhases: string[]
}

export type ImportedExerciseCandidate = {
  sourceRepo: string
  sourceRevision: string
  sourceRecordId: string
  sourceLicense: string
  sourceName: string
  force: UpstreamForce
  level: UpstreamLevel
  mechanic: UpstreamMechanic
  equipment: string | null
  primaryMuscles: string[]
  secondaryMuscles: string[]
  instructions: string[]
  category: string
  imageRefs: string[]
  normalizedDraft: NormalizedExerciseDraft
  warnings: string[]
  reviewStatus: 'draft'
}
