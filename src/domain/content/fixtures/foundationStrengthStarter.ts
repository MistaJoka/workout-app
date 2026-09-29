// Foundation Strength — Starter pack.
//
// Real, licensed exercise content (names/instructions/photos), not
// placeholder text. Sourced from yuhonas/free-exercise-db (public
// domain/Unlicense), pinned at commit a859101d633a01c4a1a920d6a8ce41dabba0705f,
// via the tested importer in scripts/content/. See
// docs/rnd/foss-fitness/sources/free-exercise-db.md.
//
// Movement photos (start/finish frame per exercise) live under
// public/exercise-media/<upstream id>/{0,1}.jpg — copied verbatim from the
// same pinned revision. Upstream credits its imagery to wrkout/exercises.json.
//
// provenance.status is deliberately 'draft', not 'approved': cues and
// commonErrors are still empty pending human/ChatGPT review
// (support/REVIEW_QUEUE.md) — see REQ-20260913-001. Set/rep/rest
// prescriptions are conventional beginner-bodyweight defaults (2 sets,
// 8-12 reps or a 20s hold, 30-45s rest), not clinically tuned — subject to
// the same review.
import type { ContentPack, Exercise, WorkoutTemplate } from '../types'
import { raeDraftTemplates } from './raeDraftTemplates'

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

function media(sourceRecordId: string) {
  return {
    start: `/exercise-media/${sourceRecordId}/0.jpg`,
    finish: `/exercise-media/${sourceRecordId}/1.jpg`,
  }
}

const REPS = { reps: true, time: false, hold: false }
const HOLD = { reps: false, time: true, hold: true }

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
  prescriptionCapabilities: REPS,
  mediaManifest: media('Bodyweight_Squat'),
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
  prescriptionCapabilities: REPS,
  mediaManifest: media('Incline_Push-Up'),
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
  prescriptionCapabilities: REPS,
  mediaManifest: media('Single_Leg_Glute_Bridge'),
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
  prescriptionCapabilities: REPS,
  mediaManifest: media('Dead_Bug'),
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
  prescriptionCapabilities: HOLD,
  mediaManifest: media('Plank'),
  provenance: draftProvenance('Plank'),
}

export const walkingLunge: Exercise = {
  id: 'fs.walking-lunge',
  version: 1,
  name: 'Walking Lunge',
  aliases: ['Bodyweight Walking Lunge'],
  // Upstream leaves equipment null for this record; it is plainly a
  // bodyweight movement, so this normalizes rather than invents.
  taxonomy: { category: 'strength', equipment: ['bodyweight'] },
  setup: 'Begin standing with your feet shoulder width apart and your hands on your hips.',
  executionPhases: [
    'Step forward with one leg, flexing the knees to drop your hips. Descend until your rear knee nearly touches the ground. Your posture should remain upright, and your front knee should stay above the front foot.',
    'Drive through the heel of your lead foot and extend both knees to raise yourself back up.',
    'Step forward with your rear foot, repeating the lunge on the opposite leg.',
  ],
  cues: [],
  commonErrors: [],
  prescriptionCapabilities: REPS,
  mediaManifest: media('Bodyweight_Walking_Lunge'),
  provenance: draftProvenance('Bodyweight_Walking_Lunge'),
}

export const gluteBridge: Exercise = {
  id: 'fs.glute-bridge',
  version: 1,
  name: 'Glute Bridge',
  aliases: ['Butt Lift (Bridge)'],
  taxonomy: { category: 'strength', equipment: ['bodyweight'] },
  setup: 'Lie flat on the floor on your back with the hands by your side and your knees bent. Your feet should be placed around shoulder width. This will be your starting position.',
  executionPhases: [
    'Pushing mainly with your heels, lift your hips off the floor while keeping your back straight. Breathe out as you perform this part of the motion and hold at the top for a second.',
    'Slowly go back to the starting position as you breathe in.',
  ],
  cues: [],
  commonErrors: [],
  prescriptionCapabilities: REPS,
  mediaManifest: media('Butt_Lift_Bridge'),
  provenance: draftProvenance('Butt_Lift_Bridge'),
}

export const crunches: Exercise = {
  id: 'fs.crunches',
  version: 1,
  name: 'Crunches',
  aliases: [],
  taxonomy: { category: 'strength', equipment: ['bodyweight'] },
  setup: 'Lie flat on your back with your feet flat on the ground, or resting on a bench with your knees bent at a 90 degree angle. If you are resting your feet on a bench, place them three to four inches apart and point your toes inward so they touch.',
  executionPhases: [
    "Now place your hands lightly on either side of your head keeping your elbows in. Tip: Don't lock your fingers behind your head.",
    'While pushing the small of your back down in the floor to better isolate your abdominal muscles, begin to roll your shoulders off the floor.',
    "Continue to push down as hard as you can with your lower back as you contract your abdominals and exhale. Your shoulders should come up off the floor only about four inches, and your lower back should remain on the floor. At the top of the movement, contract your abdominals hard and keep the contraction for a second. Tip: Focus on slow, controlled movement - don't cheat yourself by using momentum.",
    'After the one second contraction, begin to come down slowly again to the starting position as you inhale.',
    'Repeat for the recommended amount of repetitions.',
  ],
  cues: [],
  commonErrors: [],
  prescriptionCapabilities: REPS,
  mediaManifest: media('Crunches'),
  provenance: draftProvenance('Crunches'),
}

export const superman: Exercise = {
  id: 'fs.superman',
  version: 1,
  name: 'Superman',
  aliases: [],
  taxonomy: { category: 'strength', equipment: ['bodyweight'] },
  setup: 'To begin, lie straight and face down on the floor or exercise mat. Your arms should be fully extended in front of you. This is the starting position.',
  executionPhases: [
    'Simultaneously raise your arms, legs, and chest off of the floor and hold this contraction for 2 seconds. Tip: Squeeze your lower back to get the best results from this exercise. Remember to exhale during this movement. Note: When holding the contracted position, you should look like superman when he is flying.',
    'Slowly begin to lower your arms, legs and chest back down to the starting position while inhaling.',
    'Repeat for the recommended amount of repetitions prescribed in your program.',
  ],
  cues: [],
  commonErrors: [],
  prescriptionCapabilities: REPS,
  mediaManifest: media('Superman'),
  provenance: draftProvenance('Superman'),
}

export const foundationStrengthStarterExercises: Exercise[] = [
  bodyweightSquat,
  inclinePushUp,
  singleLegGluteBridge,
  deadBug,
  plank,
  walkingLunge,
  gluteBridge,
  crunches,
  superman,
]

export const exerciseById: ReadonlyMap<string, Exercise> = new Map(
  foundationStrengthStarterExercises.map((e) => [e.id, e])
)

const PACK_ID = 'foundation-strength-starter'

function ex(exerciseId: string, order: number, prescription: WorkoutTemplate['exercises'][number]['prescription']) {
  return { exerciseId, exerciseVersion: 1, prescription, order, optional: false }
}

export const fullBodyA: WorkoutTemplate = {
  id: 'fs.full-body-a',
  version: 1,
  name: 'Full-Body A',
  packId: PACK_ID,
  exercises: [
    ex('fs.bodyweight-squat', 0, { sets: 2, reps: 10, restSeconds: 45 }),
    ex('fs.incline-push-up', 1, { sets: 2, reps: 8, restSeconds: 45 }),
    ex('fs.single-leg-glute-bridge', 2, { sets: 2, reps: 8, restSeconds: 45 }),
    ex('fs.dead-bug', 3, { sets: 2, reps: 10, restSeconds: 45 }),
    ex('fs.plank', 4, { sets: 2, timeSeconds: 20, restSeconds: 45 }),
  ],
}

export const fullBodyB: WorkoutTemplate = {
  id: 'fs.full-body-b',
  version: 1,
  name: 'Full-Body B',
  packId: PACK_ID,
  exercises: [
    ex('fs.walking-lunge', 0, { sets: 2, reps: 10, restSeconds: 45 }),
    ex('fs.incline-push-up', 1, { sets: 2, reps: 8, restSeconds: 45 }),
    ex('fs.glute-bridge', 2, { sets: 2, reps: 10, restSeconds: 45 }),
    ex('fs.crunches', 3, { sets: 2, reps: 10, restSeconds: 45 }),
    ex('fs.superman', 4, { sets: 2, reps: 8, restSeconds: 45 }),
  ],
}

// SOURCE_OF_TRUTH_V06.md §7: short sessions are native authored templates,
// not a long workout with the tail chopped off.
export const quick10: WorkoutTemplate = {
  id: 'fs.quick-10',
  version: 1,
  name: 'Quick 10',
  packId: PACK_ID,
  exercises: [
    ex('fs.bodyweight-squat', 0, { sets: 2, reps: 10, restSeconds: 30 }),
    ex('fs.incline-push-up', 1, { sets: 2, reps: 8, restSeconds: 30 }),
    ex('fs.plank', 2, { sets: 2, timeSeconds: 20, restSeconds: 30 }),
  ],
}

// The starter pack's own templates (what the pack validates against).
export const starterTemplates: WorkoutTemplate[] = [fullBodyA, fullBodyB, quick10]

// Every curated template the app lists: the starter pack plus the draft
// Rae workouts (warm-up, cool-down, chair day; raeDraftTemplates.ts).
export const foundationStrengthStarterTemplates: WorkoutTemplate[] = [...starterTemplates, ...raeDraftTemplates]

export const templateById: ReadonlyMap<string, WorkoutTemplate> = new Map(
  foundationStrengthStarterTemplates.map((t) => [t.id, t])
)

// The two full sessions alternate; Quick 10 is always available and never
// changes which full session is suggested next.
export const ROTATION: readonly string[] = [fullBodyA.id, fullBodyB.id]

// Kept as the "primary" template for callers that need a single default.
export const foundationStrengthStarterTemplate = fullBodyA

export const foundationStrengthStarterPack: ContentPack = {
  id: PACK_ID,
  version: 2,
  name: 'Foundation Strength (Starter)',
  dependsOn: [],
  exerciseIds: foundationStrengthStarterExercises.map((e) => e.id),
  templateIds: starterTemplates.map((t) => t.id),
}
