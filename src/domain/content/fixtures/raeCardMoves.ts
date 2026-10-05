// Rae card moves: the owner's own exercise cards (2026-10-04, owner:
// "These latest images are of the highest quality"), one card per move,
// listed in raeCards.json with the cues and target areas transcribed from
// the card itself. scripts/assets/rae-cards.py turns each card into Rae's
// loop and the exercise's "How to" picture.
//
// Nothing here is invented: the setup is the card's first cue and the
// steps are its other cues, word for word. Muscles come from the card's
// target areas; labels that aren't a muscle (Mobility, Balance, Cardio...)
// are left out. Provenance stays 'draft' like every other Rae move until
// the owner marks the set reviewed.
import type { Exercise } from '../types'
import RAE_CARDS from './raeCards.json'

const MUSCLE: Record<string, string> = {
  Glutes: 'glutes',
  Hips: 'glutes',
  Hamstrings: 'hamstrings',
  Legs: 'quadriceps',
  Calves: 'calves',
  'Inner Thighs': 'adductors',
  'Outer Hips': 'abductors',
  Core: 'abdominals',
  'Lower Core': 'abdominals',
  Abs: 'abdominals',
  Chest: 'chest',
  Shoulders: 'shoulders',
  Arms: 'triceps',
  'Upper Back': 'middle back',
  'Back Line': 'lower back',
  'Low Back': 'lower back',
}

// Held positions rather than reps (the card's last cue says hold/breathe).
const HOLDS = new Set(['bridge-hold', 'butterfly-stretch', 'figure-4-stretch', 'thread-the-needle', 'seated-forward-reach'])
const STRETCH = /stretch|thread|butterfly|reach|tilt|hug|fallout/i
const CARDIO = new Set(['low-impact-jack', 'standing-punches'])

const PROVENANCE = {
  author: "owner's Rae exercise card (2026-10-04); steps are the card's own cues",
  reviewedAt: null,
  status: 'draft' as const,
}

function muscles(targets: readonly string[]): string[] {
  return [...new Set(targets.flatMap((t) => (MUSCLE[t] ? [MUSCLE[t]] : [])))]
}

export const raeCardMoves: Exercise[] = RAE_CARDS.cards
  .filter((card) => card.newMove)
  .map((card) => {
    const [primary, ...secondary] = muscles(card.targets)
    const [setup, ...steps] = card.cues.map((cue) => `${cue}.`)
    const hold = HOLDS.has(card.slug)
    return {
      id: card.moveId!,
      version: 1,
      name: card.name,
      aliases: [],
      taxonomy: {
        category: CARDIO.has(card.slug) ? 'cardio' : STRETCH.test(card.name) ? 'stretching' : 'strength',
        equipment: ['bodyweight'],
        primaryMuscles: primary ? [primary] : [],
        ...(secondary.length > 0 ? { secondaryMuscles: secondary } : {}),
        level: 'beginner',
      },
      setup,
      executionPhases: steps,
      cues: [],
      commonErrors: [],
      prescriptionCapabilities: { reps: !hold, time: false, hold },
      mediaManifest: {},
      provenance: PROVENANCE,
    }
  })
