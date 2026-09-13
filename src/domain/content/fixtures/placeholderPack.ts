//
// PLACEHOLDER CONTENT — not real product data.
// Tracked in support/CLAUDE_REQUESTS.md as REQ-20260913-001.
// Exists only so the schema-validation and domain layers have something
// concrete to validate/exercise against before real exercise/workout
// content is promoted from the ChatGPT-side R&D reservoir into this repo.
import type { ContentPack, Exercise, WorkoutTemplate } from '../types'

export const placeholderExercise: Exercise = {
  id: 'placeholder.test-exercise',
  version: 1,
  name: 'Placeholder Test Exercise',
  aliases: [],
  taxonomy: { category: 'placeholder', equipment: ['bodyweight'] },
  setup: 'Placeholder setup instructions — not real product content.',
  executionPhases: ['Placeholder phase'],
  cues: [],
  commonErrors: [],
  prescriptionCapabilities: { reps: true, time: false, hold: false },
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
      exerciseId: 'placeholder.test-exercise',
      exerciseVersion: 1,
      prescription: { sets: 3, reps: 10, restSeconds: 60 },
      order: 0,
      optional: false,
    },
  ],
}

export const placeholderPack: ContentPack = {
  id: 'placeholder-pack',
  version: 1,
  name: 'Placeholder Pack',
  dependsOn: [],
  exerciseIds: ['placeholder.test-exercise'],
  templateIds: ['placeholder.test-template'],
}
