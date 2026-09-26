// Generates a reviewable checklist of candidate library exercises for the
// owner to hand-curate. This script only decides what the owner sees; it
// never decides what ships. Loosen/tighten the constants below and re-run to
// change the starting shortlist — the owner's checked boxes are the only
// thing generate-library.ts actually trusts.
//
// Usage: npm run library:review
import { writeFileSync } from 'node:fs'
import { buildLibraryCandidates, SNAPSHOT_URL } from './buildLibraryCandidates'
import { filterForReview, renderChecklistMarkdown } from './curationChecklist'
import { FREE_EXERCISE_DB_SOURCE } from './fixtures/freeExerciseDbSample'

const OUTPUT_PATH = 'content/staging/library-curation-checklist.md'

const level = 'beginner' as const
const excludedCategories = new Set(['plyometrics', 'powerlifting', 'olympic weightlifting', 'strongman'])
const excludedEquipment = new Set(['barbell', 'e-z curl bar'])
// Isolation (single-joint accessory) work is conventionally added later in a
// beginner program, after compound movements — a program-structure default,
// not a claim about any individual's specific condition.
const excludedMechanics = new Set(['isolation'])

async function main() {
  const candidates = await buildLibraryCandidates()
  const forReview = filterForReview(candidates, { level, excludedCategories, excludedEquipment, excludedMechanics })

  const markdown = renderChecklistMarkdown(forReview, {
    totalCount: candidates.length,
    sourceRevision: FREE_EXERCISE_DB_SOURCE.sourceRevision,
    filterDescription: `level=${level}, category not in {${[...excludedCategories].join(', ')}}, equipment not in {${[...excludedEquipment].join(', ')}}, mechanic not in {${[...excludedMechanics].join(', ')}}`,
  })

  writeFileSync(OUTPUT_PATH, markdown)
  console.log(`Wrote ${forReview.length} of ${candidates.length} candidates -> ${OUTPUT_PATH}`)
  console.log(`Source: ${SNAPSHOT_URL}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
