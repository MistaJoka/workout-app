// Rae chair moves: sit-to-stand variations the owner had ChatGPT draw as Rae
// strips (2026-09-26, "yes add them"). Sit-to-stand is a standard beginner
// movement. These are not in the free-exercise-db library; its "Chair
// Squat" is a loaded-bar machine squat, a different exercise.
//
// Steps were drafted by Claude Code to describe what each drawing shows.
// They are not from a reviewed source, so provenance is 'draft' pending
// owner/ChatGPT review (support/CLAUDE_REQUESTS.md REQ-20260926-003).
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

function chairMove(id: string, name: string, setup: string, executionPhases: string[]): Exercise {
  return {
    id: `rae.${id}`,
    version: 1,
    name,
    aliases: [],
    taxonomy: {
      category: 'strength',
      equipment: ['other'],
      primaryMuscles: ['quadriceps'],
      secondaryMuscles: ['glutes'],
      level: 'beginner',
      mechanic: 'compound',
      force: 'push',
    },
    setup,
    executionPhases,
    cues: [],
    commonErrors: [],
    prescriptionCapabilities: { reps: true, time: false, hold: false },
    mediaManifest: {},
    provenance: PROVENANCE,
  }
}

export const raeChairMoves: Exercise[] = [
  chairMove('chair-sit-to-stand-arms-forward', 'Chair Sit-to-Stand, Arms Forward', `${SETUP} Reach both arms straight out in front of you.`, [
    'Lean your chest forward over your feet and press through your heels to stand up tall, arms still reaching forward.',
    'Sit back down slowly and with control.',
  ]),
  chairMove('chair-sit-to-stand-hands-on-thighs', 'Chair Sit-to-Stand, Hands on Thighs', `${SETUP} Rest your hands on your thighs.`, [
    'Lean forward and press through your heels to stand up tall, letting your hands slide along your thighs for support.',
    'Sit back down slowly and with control.',
  ]),
  chairMove('chair-sit-to-stand-overhead-reach', 'Chair Sit-to-Stand with Overhead Reach', `${SETUP} Reach both arms straight out in front of you.`, [
    'Lean forward and press through your heels to stand up tall.',
    'At the top, reach both arms overhead.',
    'Bring your arms back in front of you and sit back down slowly.',
  ]),
  chairMove('chair-sit-to-stand-hands-clasped', 'Chair Sit-to-Stand, Hands Clasped', `${SETUP} Clasp your hands in front of your chest.`, [
    'Lean forward and press through your heels to stand up tall, keeping your hands at your chest.',
    'Sit back down slowly and with control.',
  ]),
  chairMove('chair-sit-to-stand-arms-crossed', 'Chair Sit-to-Stand, Arms Crossed', `${SETUP} Cross your arms over your chest.`, [
    'Lean forward and press through your heels to stand up tall, arms staying crossed.',
    'Sit back down slowly and with control.',
  ]),
  chairMove('chair-sit-to-stand-push-off-knees', 'Chair Sit-to-Stand, Push Off Knees', `${SETUP} Place your hands on your knees.`, [
    'Lean forward and push down through your hands and heels to stand up tall.',
    'Sit back down slowly and with control.',
  ]),
  chairMove('chair-squat-tap', 'Chair Squat Tap', 'Stand in front of a sturdy chair, feet about hip-width apart, hands clasped at your chest.', [
    'Sit your hips back and down until you lightly touch the chair.',
    'Press through your heels to stand back up tall.',
  ]),
]

// Owner, 2026-09-26: drop one of each near-duplicate pair. They stay
// resolvable (a routine may already use them) but are not listed.
const RETIRED = new Set(['rae.chair-sit-to-stand-hands-clasped', 'rae.chair-sit-to-stand-hands-on-thighs'])

export const raeChairMoveById: ReadonlyMap<string, Exercise> = new Map(raeChairMoves.map((e) => [e.id, e]))

// What the Library lists and the routine builder offers.
export const listedRaeChairMoves: Exercise[] = raeChairMoves.filter((e) => !RETIRED.has(e.id))
