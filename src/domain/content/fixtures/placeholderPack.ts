//
// PLACEHOLDER CONTENT — not real product data.
// Tracked in support/CLAUDE_REQUESTS.md as REQ-20260913-001.
// Exists only so the schema-validation and domain layers — and now the
// UI screens built on top of them — have something concrete to
// validate/exercise against before real exercise/workout content is
// promoted from the ChatGPT-side R&D reservoir into this repo.
import type { ContentPack, Exercise, WorkoutTemplate } from '../types'

export const placeholderExerciseA: Exercise = {
  id: 'placeholder.exercise-a',
  version: 1,
  name: 'Placeholder Exercise A',
  aliases: [],
  taxonomy: { category: 'placeholder', equipment: ['bodyweight'] },
  setup: 'Placeholder setup instructions — not real product content.',
  executionPhases: ['Placeholder phase 1', 'Placeholder phase 2'],
  cues: ['Placeholder cue'],
  commonErrors: ['Placeholder common error'],
  prescriptionCapabilities: { reps: true, time: false, hold: false },
  mediaManifest: {},
  provenance: { author: 'placeholder', reviewedAt: null, status: 'draft' },
}

export const placeholderExerciseB: Exercise = {
  id: 'placeholder.exercise-b',
  version: 1,
  name: 'Placeholder Exercise B',
  aliases: [],
  taxonomy: { category: 'placeholder', equipment: ['bodyweight'] },
  setup: 'Placeholder setup instructions — not real product content.',
  executionPhases: ['Placeholder phase 1'],
  cues: ['Placeholder cue'],
  commonErrors: [],
  prescriptionCapabilities: { reps: false, time: true, hold: false },
  mediaManifest: {},
  provenance: { author: 'placeholder', reviewedAt: null, status: 'draft' },
}

export const placeholderTemplate: WorkoutTemplate = {
  id: 'placeholder.test-template',
  version: 1,
  name: 'Placeholder Test Template',
  packId: 'placeholder-pack',
  exercises: [
    {
      exerciseId: 'placeholder.exercise-a',
      exerciseVersion: 1,
      prescription: { sets: 3, reps: 10, restSeconds: 60 },
      order: 0,
      optional: false,
    },
    {
      exerciseId: 'placeholder.exercise-b',
      exerciseVersion: 1,
      prescription: { sets: 2, timeSeconds: 30, restSeconds: 45 },
      order: 1,
      optional: false,
    },
  ],
}

export const placeholderPack: ContentPack = {
  id: 'placeholder-pack',
  version: 1,
  name: 'Placeholder Pack',
  dependsOn: [],
  exerciseIds: ['placeholder.exercise-a', 'placeholder.exercise-b'],
  templateIds: ['placeholder.test-template'],
}
