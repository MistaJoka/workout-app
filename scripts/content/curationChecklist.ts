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

// The owner's library rule (2026-09-26): "remove the non-avatar workouts,
// those using heavy weights or more advanced weighted exercises. Keep those
// that can still be replaced by the avatar and are able to be done easily,
// with body weight, at low weight, or at home." Applied as the checklist's
// pre-checked default; the checked boxes stay the shipping decision, so the
// owner can still add or drop any single exercise by hand.
const HOME_EQUIPMENT = new Set(['bodyweight', 'none', 'bands', 'foam roll', 'exercise ball'])
const LIGHT_WEIGHTS = new Set(['dumbbell', 'kettlebells', 'medicine ball'])
const HEAVY_CATEGORIES = new Set(['powerlifting', 'olympic weightlifting', 'strongman'])

export function isHomeFriendly(exercise: Exercise, raeDemoIds: ReadonlySet<string> = new Set()): boolean {
  // Anything Rae already demonstrates stays: she can replace it.
  if (raeDemoIds.has(exercise.id)) return true
  const { level, category } = exercise.taxonomy
  const equipment = exercise.taxonomy.equipment[0] ?? 'none'
  if (level === 'expert') return false
  if (HEAVY_CATEGORIES.has(category)) return false
  // Jump training isn't "done easily" (and the review pre-filter already
  // left it out); the owner can still check any of it by hand.
  if (category === 'plyometrics') return false
  if (HOME_EQUIPMENT.has(equipment)) return true
  if (LIGHT_WEIGHTS.has(equipment)) return level === 'beginner'
  // "Other" is mostly sleds, stones, tires and bars, but also chair/wall/floor
  // stretches, which are exactly the at-home kind.
  if (equipment === 'other') return category === 'stretching'
  // barbell, e-z curl bar, cable, machine
  return false
}

function equipmentGroup(exercise: Exercise): string {
  return exercise.taxonomy.equipment[0] ?? 'none'
}

export function renderChecklistMarkdown(
  exercises: Exercise[],
  meta: {
    totalCount: number
    generatedAt?: string
    sourceRevision?: string
    filterDescription?: string
    // Boxes that start checked (the owner's rule); the owner can untick.
    preChecked?: (exercise: Exercise) => boolean
  }
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
        const box = meta.preChecked?.(exercise) ? '[x]' : '[ ]'
        lines.push(`- ${box} ${exercise.id} — ${exercise.name} (${exercise.taxonomy.level ?? 'unknown'}${muscles ? `; ${muscles}` : ''})`)
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
