// Deliberately small fixture set, per free-exercise-db.md's "Recommended
// first promotion": do not import hundreds of exercises first. These 6
// records are real upstream data, pinned at the commit below, chosen to
// cover the six categories that document names:
//
// 1. weighted compound      -> Barbell_Squat
// 2. isolation movement     -> Alternate_Hammer_Curl
// 3. bodyweight movement    -> Bodyweight_Squat
// 4. null-equipment record  -> Ankle_Circles
// 5. stretching/cardio      -> Bicycling
// 6. duplicate/variant name -> Barbell_Squat / Barbell_Full_Squat / Bodyweight_Squat
//    (all three are squat variants, verified as distinct upstream records)
//
// Source: yuhonas/free-exercise-db, public-domain/Unlicense.
// Pinned revision: a859101d633a01c4a1a920d6a8ce41dabba0705f
// Fetched: 2026-09-17, from
// https://raw.githubusercontent.com/yuhonas/free-exercise-db/a859101d633a01c4a1a920d6a8ce41dabba0705f/dist/exercises.json
import type { UpstreamExerciseRecord } from '../upstreamTypes'

export const FREE_EXERCISE_DB_SOURCE = {
  sourceRepo: 'yuhonas/free-exercise-db',
  sourceRevision: 'a859101d633a01c4a1a920d6a8ce41dabba0705f',
  sourceLicense: 'Unlicense',
} as const

export const freeExerciseDbSample: UpstreamExerciseRecord[] = [
  {
    id: 'Barbell_Squat',
    name: 'Barbell Squat',
    force: 'push',
    level: 'beginner',
    mechanic: 'compound',
    equipment: 'barbell',
    primaryMuscles: ['quadriceps'],
    secondaryMuscles: ['calves', 'glutes', 'hamstrings', 'lower back'],
    instructions: [
      'This exercise is best performed inside a squat rack for safety purposes. To begin, first set the bar on a rack to just below shoulder level. Once the correct height is chosen and the bar is loaded, step under the bar and place the back of your shoulders (slightly below the neck) across it.',
      'Hold on to the bar using both arms at each side and lift it off the rack by first pushing with your legs and at the same time straightening your torso.',
      'Step away from the rack and position your legs using a shoulder width medium stance with the toes slightly pointed out. Keep your head up at all times and also maintain a straight back. This will be your starting position.',
      'Begin to slowly lower the bar by bending the knees and hips as you maintain a straight posture with the head up. Continue down until the angle between the upper leg and the calves becomes slightly less than 90-degrees.',
      'Begin to raise the bar as you exhale by pushing the floor with the heel of your foot as you straighten the legs again and go back to the starting position.',
      'Repeat for the recommended amount of repetitions.',
    ],
    category: 'strength',
    images: ['Barbell_Squat/0.jpg', 'Barbell_Squat/1.jpg'],
  },
  {
    id: 'Barbell_Full_Squat',
    name: 'Barbell Full Squat',
    force: 'push',
    level: 'intermediate',
    mechanic: 'compound',
    equipment: 'barbell',
    primaryMuscles: ['quadriceps'],
    secondaryMuscles: ['calves', 'glutes', 'hamstrings', 'lower back'],
    instructions: [
      'This exercise is best performed inside a squat rack for safety purposes. To begin, first set the bar on a rack just above shoulder level. Once the correct height is chosen and the bar is loaded, step under the bar and place the back of your shoulders (slightly below the neck) across it.',
      'Hold on to the bar using both arms at each side and lift it off the rack by first pushing with your legs and at the same time straightening your torso.',
      'Step away from the rack and position your legs using a shoulder-width medium stance with the toes slightly pointed out. Keep your head up at all times and maintain a straight back. This will be your starting position.',
      'Begin to slowly lower the bar by bending the knees and sitting back with your hips as you maintain a straight posture with the head up. Continue down until your hamstrings are on your calves.',
      'Begin to raise the bar as you exhale by pushing the floor with the heel or middle of your foot as you straighten the legs and extend the hips to go back to the starting position.',
      'Repeat for the recommended amount of repetitions.',
    ],
    category: 'strength',
    images: ['Barbell_Full_Squat/0.jpg', 'Barbell_Full_Squat/1.jpg'],
  },
  {
    id: 'Bodyweight_Squat',
    name: 'Bodyweight Squat',
    force: 'push',
    level: 'beginner',
    mechanic: 'compound',
    equipment: 'body only',
    primaryMuscles: ['quadriceps'],
    secondaryMuscles: ['glutes', 'hamstrings'],
    instructions: [
      'Stand with your feet shoulder width apart. You can place your hands behind your head. This will be your starting position.',
      'Begin the movement by flexing your knees and hips, sitting back with your hips.',
      'Continue down to full depth if you are able, and quickly reverse the motion until you return to the starting position. As you squat, keep your head and chest up and push your knees out.',
    ],
    category: 'strength',
    images: ['Bodyweight_Squat/0.jpg', 'Bodyweight_Squat/1.jpg'],
  },
  {
    id: 'Alternate_Hammer_Curl',
    name: 'Alternate Hammer Curl',
    force: 'pull',
    level: 'beginner',
    mechanic: 'isolation',
    equipment: 'dumbbell',
    primaryMuscles: ['biceps'],
    secondaryMuscles: ['forearms'],
    instructions: [
      'Stand up with your torso upright and a dumbbell in each hand being held at arms length. The elbows should be close to the torso.',
      'The palms of the hands should be facing your torso. This will be your starting position.',
      'While holding the upper arm stationary, curl the right weight forward while contracting the biceps as you breathe out. Continue the movement until your biceps is fully contracted and the dumbbells are at shoulder level.',
      'Slowly begin to bring the dumbbells back to starting position as your breathe in.',
      'Repeat the movement with the left hand. This equals one repetition.',
      'Continue alternating in this manner for the recommended amount of repetitions.',
    ],
    category: 'strength',
    images: ['Alternate_Hammer_Curl/0.jpg', 'Alternate_Hammer_Curl/1.jpg'],
  },
  {
    id: 'Ankle_Circles',
    name: 'Ankle Circles',
    force: 'pull',
    level: 'beginner',
    mechanic: 'isolation',
    equipment: null,
    primaryMuscles: ['calves'],
    secondaryMuscles: [],
    instructions: [
      'Use a sturdy object like a squat rack to hold yourself.',
      'Lift the right leg in the air (just around 2 inches from the floor) and perform a circular motion with the big toe. Pretend that you are drawing a big circle with it.',
      'When you are done with the right foot, then repeat with the left leg.',
    ],
    category: 'stretching',
    images: ['Ankle_Circles/0.jpg', 'Ankle_Circles/1.jpg'],
  },
  {
    id: 'Bicycling',
    name: 'Bicycling',
    force: null,
    level: 'beginner',
    mechanic: null,
    equipment: 'other',
    primaryMuscles: ['quadriceps'],
    secondaryMuscles: ['calves', 'glutes', 'hamstrings'],
    instructions: ['To begin, seat yourself on the bike and adjust the seat to your height.'],
    category: 'cardio',
    images: ['Bicycling/0.jpg', 'Bicycling/1.jpg'],
  },
]
