// Foundation Strength — Starter pack.
//
// Real, licensed exercise content (names/instructions), not placeholder
// text. Sourced from yuhonas/free-exercise-db (public domain/Unlicense),
// pinned at commit a859101d633a01c4a1a920d6a8ce41dabba0705f, via the tested
// importer in scripts/content/. See docs/rnd/foss-fitness/sources/free-exercise-db.md.
//
// provenance.status is deliberately 'draft', not 'approved': cues,
// commonErrors, and media are still empty pending human/ChatGPT review
// (support/REVIEW_QUEUE.md) — see REQ-20260913-001 in support/CLAUDE_REQUESTS.md.
// Set/rep/rest prescriptions are conventional beginner-bodyweight defaults
// (2 sets, 8-10 reps or a 20s hold, 45s rest), not clinically tuned —
// intentionally conservative, subject to the same review.
import type { ContentPack, Exercise, WorkoutTemplate } from '../types'

const SOURCE = {
  sourceRepo: 'yuhonas/free-exercise-db',
  sourceRevision: 'a859101d633a01c4a1a920d6a8ce41dabba0705f',
  sourceLicense: 'Unlicense',
} as const

function draftProvenance(sourceRecordId: string) {
  return {
    author: 'imported:free-exercise-db',
    reviewedAt: null,
    status: 'draft' as const,
    ...SOURCE,
    sourceRecordId,
  }
}

export const bodyweightSquat: Exercise = {
  id: 'fs.bodyweight-squat',
  version: 1,
  name: 'Bodyweight Squat',
  aliases: [],
  taxonomy: { category: 'strength', equipment: ['bodyweight'] },
  setup: 'Stand with your feet shoulder width apart. You can place your hands behind your head. This will be your starting position.',
  executionPhases: [
    'Begin the movement by flexing your knees and hips, sitting back with your hips.',
    'Continue down to full depth if you are able, and quickly reverse the motion until you return to the starting position. As you squat, keep your head and chest up and push your knees out.',
  ],
  cues: [],
  commonErrors: [],
  prescriptionCapabilities: { reps: true, time: false, hold: false },
  mediaManifest: {},
  provenance: draftProvenance('Bodyweight_Squat'),
}

export const inclinePushUp: Exercise = {
  id: 'fs.incline-push-up',
  version: 1,
  name: 'Incline Push-Up',
  aliases: [],
  taxonomy: { category: 'strength', equipment: ['bodyweight'] },
  setup: 'Stand facing bench or sturdy elevated platform. Place hands on edge of bench or platform, slightly wider than shoulder width.',
  executionPhases: [
    'Position forefoot back from bench or platform with arms and body straight. Arms should be perpendicular to body. Keeping body straight, lower chest to edge of box or platform by bending arms.',
    'Push body up until arms are extended. Repeat.',
  ],
  cues: [],
  commonErrors: [],
  prescriptionCapabilities: { reps: true, time: false, hold: false },
  mediaManifest: {},
  provenance: draftProvenance('Incline_Push-Up'),
}

export const singleLegGluteBridge: Exercise = {
  id: 'fs.single-leg-glute-bridge',
  version: 1,
  name: 'Single Leg Glute Bridge',
  aliases: [],
  taxonomy: { category: 'strength', equipment: ['bodyweight'] },
  setup: 'Lay on the floor with your feet flat and knees bent.',
  executionPhases: [
    'Raise one leg off of the ground, pulling the knee to your chest. This will be your starting position.',
    'Execute the movement by driving through the heel, extending your hip upward and raising your glutes off of the ground.',
    'Extend as far as possible, pause and then return to the starting position.',
  ],
  cues: [],
  commonErrors: [],
  prescriptionCapabilities: { reps: true, time: false, hold: false },
  mediaManifest: {},
  provenance: draftProvenance('Single_Leg_Glute_Bridge'),
}

export const deadBug: Exercise = {
  id: 'fs.dead-bug',
  version: 1,
  name: 'Dead Bug',
  aliases: [],
  taxonomy: { category: 'strength', equipment: ['bodyweight'] },
  setup: 'Begin lying on your back with your hands extended above you toward the ceiling.',
  executionPhases: [
    'Bring your feet, knees, and hips up to 90 degrees.',
    'Exhale hard to bring your ribcage down and flatten your back onto the floor, rotating your pelvis up and squeezing your glutes. Hold this position throughout the movement. This will be your starting position.',
    'Initiate the exercise by extending one leg, straightening the knee and hip to bring the leg just above the ground.',
    'Maintain the position of your lumbar and pelvis as you perform the movement, as your back is going to want to arch.',
    'Stay tight and return the working leg to the starting position.',
    'Repeat on the opposite side, alternating until the set is complete.',
  ],
  cues: [],
  commonErrors: [],
  prescriptionCapabilities: { reps: true, time: false, hold: false },
  mediaManifest: {},
  provenance: draftProvenance('Dead_Bug'),
}

export const plank: Exercise = {
  id: 'fs.plank',
  version: 1,
  name: 'Plank',
  aliases: [],
  taxonomy: { category: 'strength', equipment: ['bodyweight'] },
  setup: 'Get into a prone position on the floor, supporting your weight on your toes and your forearms. Your arms are bent and directly below the shoulder.',
  executionPhases: [
    'Keep your body straight at all times, and hold this position as long as possible. To increase difficulty, an arm or leg can be raised.',
  ],
  cues: [],
  commonErrors: [],
  prescriptionCapabilities: { reps: false, time: true, hold: true },
  mediaManifest: {},
  provenance: draftProvenance('Plank'),
}

export const foundationStrengthStarterExercises: Exercise[] = [
  bodyweightSquat,
  inclinePushUp,
  singleLegGluteBridge,
  deadBug,
  plank,
]

export const foundationStrengthStarterTemplate: WorkoutTemplate = {
  id: 'fs.starter-fullbody',
  version: 1,
  name: 'Full-Body Starter',
  packId: 'foundation-strength-starter',
  exercises: [
    {
      exerciseId: 'fs.bodyweight-squat',
      exerciseVersion: 1,
      prescription: { sets: 2, reps: 10, restSeconds: 45 },
      order: 0,
      optional: false,
    },
    {
      exerciseId: 'fs.incline-push-up',
      exerciseVersion: 1,
      prescription: { sets: 2, reps: 8, restSeconds: 45 },
      order: 1,
      optional: false,
    },
    {
      exerciseId: 'fs.single-leg-glute-bridge',
      exerciseVersion: 1,
      prescription: { sets: 2, reps: 8, restSeconds: 45 },
      order: 2,
      optional: false,
    },
    {
      exerciseId: 'fs.dead-bug',
      exerciseVersion: 1,
      prescription: { sets: 2, reps: 10, restSeconds: 45 },
      order: 3,
      optional: false,
    },
    {
      exerciseId: 'fs.plank',
      exerciseVersion: 1,
      prescription: { sets: 2, timeSeconds: 20, restSeconds: 45 },
      order: 4,
      optional: false,
    },
  ],
}

export const foundationStrengthStarterPack: ContentPack = {
  id: 'foundation-strength-starter',
  version: 1,
  name: 'Foundation Strength (Starter)',
  dependsOn: [],
  exerciseIds: foundationStrengthStarterExercises.map((e) => e.id),
  templateIds: [foundationStrengthStarterTemplate.id],
}
