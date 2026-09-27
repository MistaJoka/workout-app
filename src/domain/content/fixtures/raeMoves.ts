// Rae moves: beginner and low-impact exercises the owner had ChatGPT draw as
// Rae strips that have no free-exercise-db record. First the chair
// sit-to-stand set (2026-09-26, "yes add them"; the library's "Chair Squat"
// is a machine squat, a different exercise), then the low-impact set
// (2026-09-27, "use them for now"). All are standard beginner movements.
//
// Steps were drafted by Claude Code to describe what each drawing shows.
// They are not from a reviewed source, so provenance is 'draft' pending
// owner/ChatGPT review (support/CLAUDE_REQUESTS.md REQ-20260926-003 and -004).
// No cues, errors or safety rules are invented here. There are no photos;
// Rae's loops (assets/pixel-bloom/character/rae/source/exercise/strips.json)
// are the media.
import type { Exercise } from '../types'

const PROVENANCE = {
  author: 'owner-requested; steps drafted by Claude Code from the Rae strip art',
  reviewedAt: null,
  status: 'draft' as const,
}

const SETUP = 'Sit near the front of a sturdy chair, feet flat on the floor about hip-width apart.'

type Taxonomy = Pick<Exercise['taxonomy'], 'category' | 'equipment' | 'primaryMuscles'> & Partial<Exercise['taxonomy']>

const CHAIR: Taxonomy = { category: 'strength', equipment: ['other'], primaryMuscles: ['quadriceps'], secondaryMuscles: ['glutes'], mechanic: 'compound', force: 'push' }

function move(id: string, name: string, taxonomy: Taxonomy, setup: string, executionPhases: string[]): Exercise {
  return {
    id: `rae.${id}`,
    version: 1,
    name,
    aliases: [],
    taxonomy: { level: 'beginner', ...taxonomy },
    setup,
    executionPhases,
    cues: [],
    commonErrors: [],
    prescriptionCapabilities: { reps: true, time: false, hold: false },
    mediaManifest: {},
    provenance: PROVENANCE,
  }
}

export const raeMoves: Exercise[] = [
  move('chair-sit-to-stand-arms-forward', 'Chair Sit-to-Stand, Arms Forward', CHAIR, `${SETUP} Reach both arms straight out in front of you.`, [
    'Lean your chest forward over your feet and press through your heels to stand up tall, arms still reaching forward.',
    'Sit back down slowly and with control.',
  ]),
  move('chair-sit-to-stand-hands-on-thighs', 'Chair Sit-to-Stand, Hands on Thighs', CHAIR, `${SETUP} Rest your hands on your thighs.`, [
    'Lean forward and press through your heels to stand up tall, letting your hands slide along your thighs for support.',
    'Sit back down slowly and with control.',
  ]),
  move('chair-sit-to-stand-overhead-reach', 'Chair Sit-to-Stand with Overhead Reach', CHAIR, `${SETUP} Reach both arms straight out in front of you.`, [
    'Lean forward and press through your heels to stand up tall.',
    'At the top, reach both arms overhead.',
    'Bring your arms back in front of you and sit back down slowly.',
  ]),
  move('chair-sit-to-stand-hands-clasped', 'Chair Sit-to-Stand, Hands Clasped', CHAIR, `${SETUP} Clasp your hands in front of your chest.`, [
    'Lean forward and press through your heels to stand up tall, keeping your hands at your chest.',
    'Sit back down slowly and with control.',
  ]),
  move('chair-sit-to-stand-arms-crossed', 'Chair Sit-to-Stand, Arms Crossed', CHAIR, `${SETUP} Cross your arms over your chest.`, [
    'Lean forward and press through your heels to stand up tall, arms staying crossed.',
    'Sit back down slowly and with control.',
  ]),
  move('chair-sit-to-stand-push-off-knees', 'Chair Sit-to-Stand, Push Off Knees', CHAIR, `${SETUP} Place your hands on your knees.`, [
    'Lean forward and push down through your hands and heels to stand up tall.',
    'Sit back down slowly and with control.',
  ]),
  move('chair-squat-tap', 'Chair Squat Tap', CHAIR, 'Stand in front of a sturdy chair, feet about hip-width apart, hands clasped at your chest.', [
    'Sit your hips back and down until you lightly touch the chair.',
    'Press through your heels to stand back up tall.',
  ]),

  // Low-impact set (strips from rae-low-impact-batch-15.zip). Drawn off-model
  // (afro puff, headband ears); marked for redraw in strips.json.
  move('mini-squat', 'Mini Squat', { category: 'strength', equipment: ['bodyweight'], primaryMuscles: ['quadriceps'], secondaryMuscles: ['glutes'], mechanic: 'compound', force: 'push' },
    'Stand with your feet about hip-width apart.', [
      'Bend your knees and sit your hips back a little way, only part of the way down, reaching your arms forward.',
      'Press through your heels to stand back up tall.',
    ]),
  move('reverse-lunge', 'Reverse Lunge', { category: 'strength', equipment: ['bodyweight'], primaryMuscles: ['quadriceps'], secondaryMuscles: ['glutes'], mechanic: 'compound', force: 'push' },
    'Stand tall with your feet about hip-width apart.', [
      'Step one foot back and lower until both knees are bent.',
      'Push through your front heel to bring the back foot forward and stand tall.',
      'Repeat on the other side.',
    ]),
  move('seated-march', 'Seated March', { category: 'strength', equipment: ['other'], primaryMuscles: ['abdominals'], mechanic: 'compound' },
    'Sit tall near the front of a sturdy chair, feet flat on the floor.', [
      'Lift one knee up, then set that foot back down.',
      'Lift the other knee, then set it down. Keep alternating like a slow march.',
    ]),
  move('seated-ankle-pumps', 'Seated Ankle Pumps', { category: 'stretching', equipment: ['other'], primaryMuscles: ['calves'], mechanic: 'isolation' },
    'Sit tall in a sturdy chair with your feet on the floor in front of you.', [
      'Lift your toes up toward your shins, keeping your heels down.',
      'Then press your toes down and lift your heels. Keep rocking between the two.',
    ]),
  move('seated-knee-extension', 'Seated Knee Extension', { category: 'strength', equipment: ['other'], primaryMuscles: ['quadriceps'], mechanic: 'isolation', force: 'push' },
    'Sit tall in a sturdy chair, feet flat on the floor.', [
      'Straighten one knee to lift that foot until your leg is straight out in front of you.',
      'Lower it back down slowly, then repeat with the other leg.',
    ]),
  move('seated-forward-reach', 'Seated Forward Reach', { category: 'stretching', equipment: ['other'], primaryMuscles: ['hamstrings'], secondaryMuscles: ['lower back'] },
    'Sit tall near the front of a sturdy chair, feet flat on the floor.', [
      'Lean forward from your hips and reach your hands down toward your feet.',
      'Slowly sit back up tall.',
    ]),
  move('seated-torso-rotation', 'Seated Torso Rotation', { category: 'stretching', equipment: ['other'], primaryMuscles: ['abdominals'] },
    'Sit tall in a sturdy chair, feet flat on the floor, arms crossed over your chest.', [
      'Turn your upper body to one side, then come back to the middle.',
      'Turn to the other side, then come back to the middle.',
    ]),
  move('chair-supported-knee-lift', 'Chair-Supported Knee Lift', { category: 'strength', equipment: ['other'], primaryMuscles: ['abdominals'], secondaryMuscles: ['quadriceps'], mechanic: 'compound' },
    'Stand behind a sturdy chair and hold the top of the backrest with both hands.', [
      'Lift one knee up in front of you, then set that foot back down.',
      'Lift the other knee, then set it down. Keep alternating.',
    ]),
]

// Owner, 2026-09-26: drop one of each near-duplicate pair. They stay
// resolvable (a routine may already use them) but are not listed.
const RETIRED = new Set(['rae.chair-sit-to-stand-hands-clasped', 'rae.chair-sit-to-stand-hands-on-thighs'])

export const raeMoveById: ReadonlyMap<string, Exercise> = new Map(raeMoves.map((e) => [e.id, e]))

// What the Library lists and the routine builder offers.
export const listedRaeMoves: Exercise[] = raeMoves.filter((e) => !RETIRED.has(e.id))
