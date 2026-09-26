// Generates the browsable exercise library from the pinned upstream
// snapshot, filtered down to the exercises the owner has checked off in the
// curation checklist. Output is committed (src/domain/content/generated/)
// because the app build needs it.
//
// Usage: npm run generate:library
// Prerequisite: npm run library:review, then check the boxes in
// content/staging/library-curation-checklist.md.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { buildLibraryCandidates } from './buildLibraryCandidates'
import { parseCurationChecklist } from './curationChecklist'
import { validateContentPack } from '../../src/domain/content/schema'

const OUTPUT_PATH = 'src/domain/content/generated/libraryExercises.json'
const CHECKLIST_PATH = 'content/staging/library-curation-checklist.md'

async function main() {
  const candidates = await buildLibraryCandidates()

  const checklist = readFileSync(CHECKLIST_PATH, 'utf8')
  const curatedIds = parseCurationChecklist(checklist)
  if (curatedIds.size === 0) {
    throw new Error(
      `No checked exercises found in ${CHECKLIST_PATH} — run npm run library:review and get owner sign-off before generating the library.`
    )
  }

  const exercises = candidates.filter((e) => curatedIds.has(e.id))

  const unmatched = [...curatedIds].filter((id) => !candidates.some((e) => e.id === id))
  if (unmatched.length > 0) {
    console.warn(`Checklist has ${unmatched.length} checked id(s) not found in the current upstream snapshot:`, unmatched)
  }

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

  console.log(`Wrote ${exercises.length} exercises -> ${OUTPUT_PATH} (${candidates.length} candidates, ${curatedIds.size} checked)`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
