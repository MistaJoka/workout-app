// Per-record normalization: upstream free-exercise-db record -> staging
// ImportedExerciseCandidate. See docs/rnd/foss-fitness/sources/free-exercise-db.md
// ("Proposed field mapping", "Data-quality controls"). This never writes
// production content directly — it only produces a draft for human review.
import type { UpstreamExerciseRecord } from './upstreamTypes'
import type { ImportedExerciseCandidate } from './importedExerciseCandidate'

export type SourceMeta = {
  sourceRepo: string
  sourceRevision: string
  sourceLicense: string
}

// Equipment vocabulary verified in free-exercise-db.md ("Verified equipment
// vocabulary") plus null. Fails loudly (per "Taxonomy drift") on anything
// else rather than silently collapsing an unrecognized value into "other".
const KNOWN_EQUIPMENT = new Set([
  'medicine ball',
  'dumbbell',
  'body only',
  'bands',
  'kettlebells',
  'foam roll',
  'cable',
  'machine',
  'barbell',
  'exercise ball',
  'e-z curl bar',
  'other',
])

function normalizeEquipment(equipment: string | null): { equipment: string[]; warning: string | null } {
  if (equipment === null) {
    return { equipment: [], warning: 'equipment: unknown/unspecified upstream — normalized to no equipment' }
  }
  if (!KNOWN_EQUIPMENT.has(equipment)) {
    throw new Error(`normalizeExercise: unrecognized equipment value "${equipment}" — extend KNOWN_EQUIPMENT or fix the source data`)
  }
  // Matches this app's bodyweight-exercise convention (see
  // src/domain/content/fixtures/foundationStrengthStarter.ts).
  const normalized = equipment === 'body only' ? 'bodyweight' : equipment
  return { equipment: [normalized], warning: null }
}

export function normalizeExercise(upstream: UpstreamExerciseRecord, source: SourceMeta): ImportedExerciseCandidate {
  const warnings: string[] = []

  const { equipment, warning } = normalizeEquipment(upstream.equipment)
  if (warning) warnings.push(warning)

  const [setup = '', ...executionPhases] = upstream.instructions

  return {
    sourceRepo: source.sourceRepo,
    sourceRevision: source.sourceRevision,
    sourceRecordId: upstream.id,
    sourceLicense: source.sourceLicense,
    sourceName: upstream.name,
    force: upstream.force,
    level: upstream.level,
    mechanic: upstream.mechanic,
    equipment: upstream.equipment,
    primaryMuscles: upstream.primaryMuscles,
    secondaryMuscles: upstream.secondaryMuscles,
    instructions: upstream.instructions,
    category: upstream.category,
    imageRefs: upstream.images,
    normalizedDraft: {
      name: upstream.name,
      taxonomy: {
        category: upstream.category,
        equipment,
      },
      setup,
      executionPhases,
    },
    warnings,
    reviewStatus: 'draft',
  }
}
