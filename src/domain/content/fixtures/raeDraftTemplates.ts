// Draft workouts built only from moves Rae already demonstrates (owner, 2026-09-29:
// "Go for all" — a warm-up, a cool-down and a chair day, marked draft for owner
// review; support/CLAUDE_REQUESTS.md REQ-20260929-006). No new exercises: each
// entry is an existing Rae move (raeMoves.ts) or a library move with a Rae loop.
// Doses are the app's conservative defaults (10 reps; 30s rest for the gentle
// sessions, 45s and 2 sets for the chair day), not a reviewed program.
import type { WorkoutTemplate } from '../types'

const PACK_ID = 'rae-drafts'

function ex(exerciseId: string, order: number, prescription: WorkoutTemplate['exercises'][number]['prescription']) {
  return { exerciseId, exerciseVersion: 1, prescription, order, optional: false }
}

export const warmUp: WorkoutTemplate = {
  id: 'draft.warm-up',
  version: 1,
  name: 'Warm-up',
  packId: PACK_ID,
  exercises: [
    ex('rae.seated-march', 0, { sets: 1, reps: 10, restSeconds: 30 }),
    ex('rae.seated-ankle-pumps', 1, { sets: 1, reps: 10, restSeconds: 30 }),
    ex('lib.Hip_Circles_prone', 2, { sets: 1, reps: 10, restSeconds: 30 }),
    ex('rae.mini-squat', 3, { sets: 1, reps: 10, restSeconds: 30 }),
    ex('lib.Front_Leg_Raises', 4, { sets: 1, reps: 10, restSeconds: 30 }),
  ],
}

export const coolDown: WorkoutTemplate = {
  id: 'draft.cool-down',
  version: 1,
  name: 'Cool-down',
  packId: PACK_ID,
  exercises: [
    ex('rae.seated-forward-reach', 0, { sets: 1, reps: 10, restSeconds: 30 }),
    ex('rae.seated-torso-rotation', 1, { sets: 1, reps: 10, restSeconds: 30 }),
    ex('lib.90_90_Hamstring', 2, { sets: 1, reps: 10, restSeconds: 30 }),
  ],
}

export const chairDay: WorkoutTemplate = {
  id: 'draft.chair-day',
  version: 1,
  name: 'Chair day',
  packId: PACK_ID,
  exercises: [
    ex('rae.chair-sit-to-stand-arms-forward', 0, { sets: 2, reps: 10, restSeconds: 45 }),
    ex('rae.seated-knee-extension', 1, { sets: 2, reps: 10, restSeconds: 45 }),
    ex('rae.chair-squat-tap', 2, { sets: 2, reps: 10, restSeconds: 45 }),
    ex('rae.chair-supported-knee-lift', 3, { sets: 2, reps: 10, restSeconds: 45 }),
    ex('rae.seated-march', 4, { sets: 2, reps: 10, restSeconds: 45 }),
  ],
}

export const raeDraftTemplates: WorkoutTemplate[] = [warmUp, coolDown, chairDay]

// Draft (unreviewed) curated templates, for any screen that wants to say so.
export const DRAFT_TEMPLATE_IDS: ReadonlySet<string> = new Set(raeDraftTemplates.map((t) => t.id))
