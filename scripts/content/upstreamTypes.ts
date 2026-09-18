// Upstream free-exercise-db record shape, verified against
// docs/rnd/foss-fitness/sources/free-exercise-db.md ("Verified upstream
// exercise schema"). This mirrors the source's schema.json, not this app's
// local Exercise type — see ImportedExerciseCandidate for the staging shape
// that bridges the two.
export type UpstreamForce = 'static' | 'pull' | 'push' | null
export type UpstreamLevel = 'beginner' | 'intermediate' | 'expert'
export type UpstreamMechanic = 'isolation' | 'compound' | null

export type UpstreamExerciseRecord = {
  id: string
  name: string
  force: UpstreamForce
  level: UpstreamLevel
  mechanic: UpstreamMechanic
  equipment: string | null
  primaryMuscles: string[]
  secondaryMuscles: string[]
  instructions: string[]
  category: string
  images: string[]
}
