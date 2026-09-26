// Shared fetch -> import -> normalize -> map pipeline, used by both the
// production generator (generate-library.ts) and the review-checklist
// generator (list-library-candidates.ts) so they can never disagree on which
// exercises exist or what their ids are.
import { importFreeExerciseDb } from './importFreeExerciseDb'
import { toLibraryExercise } from './toLibraryExercise'
import { FREE_EXERCISE_DB_SOURCE } from './fixtures/freeExerciseDbSample'
import type { UpstreamExerciseRecord } from './upstreamTypes'
import type { Exercise } from '../../src/domain/content/types'

const REV = FREE_EXERCISE_DB_SOURCE.sourceRevision
export const SNAPSHOT_URL = `https://raw.githubusercontent.com/yuhonas/free-exercise-db/${REV}/dist/exercises.json`

// Exercises that also ship as curated Foundation Strength content have their
// photos bundled locally; the library reuses those so they work offline and
// don't double-download.
export const LOCAL_MEDIA_IDS = [
  'Bodyweight_Squat',
  'Incline_Push-Up',
  'Single_Leg_Glute_Bridge',
  'Dead_Bug',
  'Plank',
  'Bodyweight_Walking_Lunge',
  'Butt_Lift_Bridge',
  'Crunches',
  'Superman',
]

export async function buildLibraryCandidates(): Promise<Exercise[]> {
  const response = await fetch(SNAPSHOT_URL)
  if (!response.ok) throw new Error(`Upstream fetch failed: ${response.status}`)
  const records = (await response.json()) as UpstreamExerciseRecord[]

  const candidates = importFreeExerciseDb(records, FREE_EXERCISE_DB_SOURCE)
  const localMedia = new Map(
    LOCAL_MEDIA_IDS.map((id) => [id, { start: `/exercise-media/${id}/0.jpg`, finish: `/exercise-media/${id}/1.jpg` }])
  )

  // Records with no instructions can't be coached; keep them out of the app.
  const usable = candidates.filter((c) => c.instructions.length > 0)
  return usable.map((c) => toLibraryExercise(c, localMedia))
}
