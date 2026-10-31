import type { Exercise } from './types'
import RAE_CARDS from './fixtures/raeCards.json'

// The short words the player shows under Rae, in place of the full steps
// (which stay one tap away). Curated cues first: the move's own, else the
// owner's Rae card cues, word for word. Else the opening sentence of its
// setup, when that is short enough to read mid-set. Nothing is invented,
// so a move with neither shows no cue at all.

const CUE_SENTENCE_MAX = 80

const cardCues = new Map<string, readonly string[]>()
for (const card of RAE_CARDS.cards) {
  for (const id of card.exerciseIds) cardCues.set(id, card.cues)
}

export function shortCues(exercise: Pick<Exercise, 'id' | 'cues' | 'setup'>): string[] {
  if (exercise.cues.length > 0) return [...exercise.cues]
  const card = cardCues.get(exercise.id)
  if (card && card.length > 0) return [...card]
  const first = exercise.setup.trim().split(/(?<=[.!?])\s+/)[0] ?? ''
  return first && first.length <= CUE_SENTENCE_MAX ? [first] : []
}

// Whether the full steps would only repeat the cues (a Rae card move's steps
// are its cues), so there's nothing more to show behind "Show steps".
export function stepsAddToCues(steps: readonly string[], cues: readonly string[]): boolean {
  const plain = (text: string) => text.trim().replace(/[.!]+$/, '').toLowerCase()
  if (steps.length !== cues.length) return steps.length > 0
  return steps.some((step, i) => plain(step) !== plain(cues[i]))
}
