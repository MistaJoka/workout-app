// Runs the free-exercise-db importer against the pinned small fixture set
// and writes staging output for human review (support/REVIEW_QUEUE.md).
// This output is DRAFT content — nothing here is production truth until
// reviewed and promoted per docs/AI_COLLABORATION_PROTOCOL.md.
//
// Usage: npx tsx scripts/content/run-import-free-exercise-db.ts
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { importFreeExerciseDb } from './importFreeExerciseDb'
import { freeExerciseDbSample, FREE_EXERCISE_DB_SOURCE } from './fixtures/freeExerciseDbSample'

const OUTPUT_PATH = 'content/staging/free-exercise-db-sample.json'

const candidates = importFreeExerciseDb(freeExerciseDbSample, FREE_EXERCISE_DB_SOURCE)

mkdirSync(dirname(OUTPUT_PATH), { recursive: true })
writeFileSync(OUTPUT_PATH, JSON.stringify(candidates, null, 2) + '\n')

const withWarnings = candidates.filter((c) => c.warnings.length > 0)
console.log(`Imported ${candidates.length} candidate(s) -> ${OUTPUT_PATH}`)
console.log(`${withWarnings.length} candidate(s) have review warnings:`)
for (const c of withWarnings) {
  console.log(`  - ${c.sourceRecordId}: ${c.warnings.join('; ')}`)
}
