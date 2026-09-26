// Supports the owner-curation workflow for the generated exercise library
// (docs/SOURCE_OF_TRUTH_V07.md §10): a visibility-only pre-filter narrows
// what the owner has to read, then a plain checkbox list is the actual,
// human-made inclusion decision. Nothing here decides safety/appropriateness
// on its own — see CLAUDE.md's ban on inventing safety rules.
import type { Exercise } from '../../src/domain/content/types'

export type ReviewFilterOptions = {
  level?: Exercise['taxonomy']['level']
  excludedCategories?: ReadonlySet<string>
  excludedEquipment?: ReadonlySet<string>
  excludedMechanics?: ReadonlySet<string>
}

export function filterForReview(exercises: Exercise[], options: ReviewFilterOptions): Exercise[] {
  return exercises.filter((e) => {
    if (options.level && e.taxonomy.level !== options.level) return false
    if (options.excludedCategories?.has(e.taxonomy.category)) return false
    if (options.excludedEquipment && e.taxonomy.equipment.some((eq) => options.excludedEquipment!.has(eq))) return false
    if (e.taxonomy.mechanic && options.excludedMechanics?.has(e.taxonomy.mechanic)) return false
    return true
  })
}

function equipmentGroup(exercise: Exercise): string {
  return exercise.taxonomy.equipment[0] ?? 'none'
}

export function renderChecklistMarkdown(
  exercises: Exercise[],
  meta: { totalCount: number; generatedAt?: string; sourceRevision?: string; filterDescription?: string }
): string {
  const byCategory = new Map<string, Map<string, Exercise[]>>()
  for (const exercise of exercises) {
    const category = exercise.taxonomy.category
    const equipment = equipmentGroup(exercise)
    if (!byCategory.has(category)) byCategory.set(category, new Map())
    const byEquipment = byCategory.get(category)!
    if (!byEquipment.has(equipment)) byEquipment.set(equipment, [])
    byEquipment.get(equipment)!.push(exercise)
  }

  const lines: string[] = [
    '# Exercise Library Curation Checklist',
    '',
    `Generated ${meta.generatedAt ?? new Date().toISOString().slice(0, 10)} by \`npm run library:review\`${meta.sourceRevision ? ` from \`${meta.sourceRevision}\`` : ''}.`,
    `${exercises.length} of ${meta.totalCount} upstream records shown.${meta.filterDescription ? ` Pre-filter: ${meta.filterDescription}.` : ''}`,
    '',
    'This filter only decides what you see here — checking a box is the actual safety/inclusion decision.',
    'To include something the pre-filter excluded, loosen the constants in `scripts/content/list-library-candidates.ts` and re-run.',
    '',
    'Check every exercise you want in the shipped app. Then run `npm run generate:library`.',
    '',
  ]

  for (const category of [...byCategory.keys()].sort()) {
    lines.push(`## ${category}`, '')
    const byEquipment = byCategory.get(category)!
    for (const equipment of [...byEquipment.keys()].sort()) {
      lines.push(`### ${equipment}`, '')
      const sorted = [...byEquipment.get(equipment)!].sort((a, b) => a.name.localeCompare(b.name))
      for (const exercise of sorted) {
        const muscles = exercise.taxonomy.primaryMuscles?.join(', ') ?? ''
        lines.push(`- [ ] ${exercise.id} — ${exercise.name} (${exercise.taxonomy.level ?? 'unknown'}${muscles ? `; ${muscles}` : ''})`)
      }
      lines.push('')
    }
  }

  return lines.join('\n')
}

export function parseCurationChecklist(markdown: string): Set<string> {
  const ids = new Set<string>()
  for (const line of markdown.split('\n')) {
    const match = line.match(/^-\s*\[[xX]\]\s*(lib\.\S+)/)
    if (match) ids.add(match[1])
  }
  return ids
}
