// Maps a normalized upstream record into a production-shaped Exercise for
// the browsable library. Unlike the curated Foundation Strength pack, these
// keep their upstream identity (`lib.<upstream id>`), stay 'draft', and
// point media at the pinned upstream revision (cached on demand by the
// service worker) rather than bundling ~1,700 photos into the PWA.
import type { Exercise } from '../../src/domain/content/types'
import type { ImportedExerciseCandidate } from './importedExerciseCandidate'

export const UPSTREAM_MEDIA_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db'

export function libraryExerciseId(sourceRecordId: string): string {
  return `lib.${sourceRecordId}`
}

// Static holds (planks, wall sits) are time-based; cardio is time-based;
// everything else is rep-counted. A structural inference from upstream
// `force`/`category`, not per-exercise coaching judgment.
const LOADABLE_EQUIPMENT = new Set(['barbell', 'dumbbell', 'kettlebells', 'cable', 'machine', 'e-z curl bar', 'medicine ball'])

function capabilities(c: ImportedExerciseCandidate): Exercise['prescriptionCapabilities'] {
  const weight = LOADABLE_EQUIPMENT.has(c.equipment ?? '') && c.category !== 'cardio' && c.category !== 'stretching'
  if (c.force === 'static') return { reps: false, time: true, hold: true, ...(weight ? { weight } : {}) }
  if (c.category === 'cardio') return { reps: false, time: true, hold: false }
  return { reps: true, time: false, hold: false, ...(weight ? { weight } : {}) }
}

export function toLibraryExercise(
  c: ImportedExerciseCandidate,
  localMediaById: ReadonlyMap<string, { start: string; finish: string }> = new Map()
): Exercise {
  const media =
    localMediaById.get(c.sourceRecordId) ??
    (c.imageRefs.length >= 2
      ? {
          start: `${UPSTREAM_MEDIA_BASE}/${c.sourceRevision}/exercises/${c.imageRefs[0]}`,
          finish: `${UPSTREAM_MEDIA_BASE}/${c.sourceRevision}/exercises/${c.imageRefs[1]}`,
        }
      : {})

  return {
    id: libraryExerciseId(c.sourceRecordId),
    version: 1,
    name: c.normalizedDraft.name,
    aliases: [],
    taxonomy: {
      category: c.normalizedDraft.taxonomy.category,
      equipment: c.normalizedDraft.taxonomy.equipment,
      primaryMuscles: c.primaryMuscles,
      secondaryMuscles: c.secondaryMuscles,
      level: c.level,
      ...(c.mechanic ? { mechanic: c.mechanic } : {}),
      ...(c.force ? { force: c.force } : {}),
    },
    setup: c.normalizedDraft.setup,
    executionPhases: c.normalizedDraft.executionPhases,
    cues: [],
    commonErrors: [],
    prescriptionCapabilities: capabilities(c),
    mediaManifest: media,
    provenance: {
      author: 'imported:free-exercise-db',
      reviewedAt: null,
      status: 'draft',
      sourceRepo: c.sourceRepo,
      sourceRevision: c.sourceRevision,
      sourceRecordId: c.sourceRecordId,
      sourceLicense: c.sourceLicense,
    },
  }
}
