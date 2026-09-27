// Generates a reviewable checklist of candidate library exercises for the
// owner to hand-curate. This script only decides what the owner sees; it
// never decides what ships. Loosen/tighten the constants below and re-run to
// change the starting shortlist — the owner's checked boxes are the only
// thing generate-library.ts actually trusts.
//
// Usage: npm run library:review
import { writeFileSync } from 'node:fs'
import { buildLibraryCandidates, SNAPSHOT_URL } from './buildLibraryCandidates'
import { readFileSync } from 'node:fs'
import { isHomeFriendly, renderChecklistMarkdown } from './curationChecklist'
import { FREE_EXERCISE_DB_SOURCE } from './fixtures/freeExerciseDbSample'

const OUTPUT_PATH = 'content/staging/library-curation-checklist.md'

// Every upstream exercise is listed, so the owner can check anything by
// hand; the owner's home-friendly rule (isHomeFriendly) decides which boxes
// start checked. Exercises Rae already demonstrates always stay.
const RAE_LOOPS_PATH = 'src/presentation/components/raeLoops.generated.json'

async function main() {
  const candidates = await buildLibraryCandidates()
  const loops = JSON.parse(readFileSync(RAE_LOOPS_PATH, 'utf8')) as { exerciseIds: string[] }[]
  const raeDemoIds = new Set(loops.flatMap((loop) => loop.exerciseIds))
  const preChecked = (e: (typeof candidates)[number]) => isHomeFriendly(e, raeDemoIds)

  const markdown = renderChecklistMarkdown(candidates, {
    totalCount: candidates.length,
    sourceRevision: FREE_EXERCISE_DB_SOURCE.sourceRevision,
    filterDescription:
      "none (all listed). Boxes start checked by the owner's home-friendly rule: bodyweight/no equipment, bands, foam roller, exercise ball and chair/wall/floor stretches below expert; light dumbbell/kettlebell/medicine ball at beginner only; no barbell, EZ bar, cable, machine, heavy-lifting categories or jump training; anything Rae already demonstrates stays",
    preChecked,
  })

  writeFileSync(OUTPUT_PATH, markdown)
  console.log(`Wrote ${candidates.length} candidates (${candidates.filter(preChecked).length} pre-checked) -> ${OUTPUT_PATH}`)
  console.log(`Source: ${SNAPSHOT_URL}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
