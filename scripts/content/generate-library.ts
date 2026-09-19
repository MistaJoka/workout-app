// Generates the browsable exercise library from the pinned upstream
// snapshot. Output is committed (src/domain/content/generated/) because the
// app build needs it; re-run only when bumping the pinned revision.
//
// Usage: npm run generate:library
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { importFreeExerciseDb } from './importFreeExerciseDb'
import { toLibraryExercise } from './toLibraryExercise'
import { FREE_EXERCISE_DB_SOURCE } from './fixtures/freeExerciseDbSample'
import type { UpstreamExerciseRecord } from './upstreamTypes'
import { validateContentPack } from '../../src/domain/content/schema'

const REV = FREE_EXERCISE_DB_SOURCE.sourceRevision
const SNAPSHOT_URL = `https://raw.githubusercontent.com/yuhonas/free-exercise-db/${REV}/dist/exercises.json`
const OUTPUT_PATH = 'src/domain/content/generated/libraryExercises.json'

// Exercises that also ship as curated Foundation Strength content have
// their photos bundled locally; the library reuses those so they work
// offline and don't double-download.
const LOCAL_MEDIA_IDS = [
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

async function main() {
  const response = await fetch(SNAPSHOT_URL)
  if (!response.ok) throw new Error(`Upstream fetch failed: ${response.status}`)
  const records = (await response.json()) as UpstreamExerciseRecord[]

  const candidates = importFreeExerciseDb(records, FREE_EXERCISE_DB_SOURCE)
  const localMedia = new Map(
    LOCAL_MEDIA_IDS.map((id) => [id, { start: `/exercise-media/${id}/0.jpg`, finish: `/exercise-media/${id}/1.jpg` }])
  )

  // Records with no instructions can't be coached; keep them out of the app.
  const usable = candidates.filter((c) => c.instructions.length > 0)
  const exercises = usable.map((c) => toLibraryExercise(c, localMedia))

  const validation = validateContentPack(
    { id: 'library', version: 1, name: 'library', dependsOn: [], exerciseIds: exercises.map((e) => e.id), templateIds: [] },
    exercises,
    []
  )
  if (!validation.valid) {
    throw new Error(`Library failed validation:\n${validation.errors.slice(0, 10).join('\n')}`)
  }

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true })
  writeFileSync(OUTPUT_PATH, JSON.stringify(exercises) + '\n')

  const warned = candidates.filter((c) => c.warnings.length > 0).length
  console.log(`Wrote ${exercises.length} exercises -> ${OUTPUT_PATH}`)
  console.log(`Skipped ${candidates.length - usable.length} with no instructions; ${warned} carried review warnings.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
