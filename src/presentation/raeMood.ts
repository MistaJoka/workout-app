import type { RaeExpression } from './components/Rae'

// Rae's face during the workout player — an immediate, textless reaction,
// not a sentence like raeSays.ts. Pure and deterministic: given the same
// player state the same expression (and, for a few moments, the same line)
// always comes back, so a re-render never flickers it to something else.
// It's flavor: WorkoutPlayerScreen already shows the numbers and timers
// that carry the real information (CLAUDE.md motion rule), so callers
// render the face and any line aria-hidden.

export type RaePlayerPhase = 'active' | 'resting' | 'paused' | 'holding'

export type RaeMoodInput = {
  // Where the player currently is.
  phase: RaePlayerPhase
  // Milliseconds since the last SET_COMPLETED landed, or null if none yet
  // this session (or it's gone stale). The caller clears this back to null
  // once CELEBRATE_MS has passed, so the face settles to its phase's
  // expression on its own — this function never looks at a clock itself.
  msSinceCompletedSet: number | null
  // That same just-completed set crossed a flow milestone
  // (domain/session/flow.ts's isFlowMilestone). Ignored once
  // msSinceCompletedSet is stale.
  isFlowMilestone: boolean
  // This active set is the last one left in the whole workout (the player's
  // own "Last set!" condition: one set remains across every exercise).
  isLastSet: boolean
  // The current exercise is the last move in the plan.
  isLastMove: boolean
  // Picks among a few equivalent lines so repeats don't feel scripted.
  // Pass something that changes with the moment (e.g. the exercise index
  // and set number) — there's no "day" here the way raeSays.ts has one.
  seed: string
}

export type RaeMood = { expression: RaeExpression; line?: string }

// How long the just-finished-a-set reaction holds before settling back to
// whatever the current phase shows on its own.
export const CELEBRATE_MS = 1500

const RAE_MOOD_LINES = {
  setDone: ['Nice!', 'Got it!', "That's one!", 'Clean set!'],
  milestone: ['Whoa, look at you!', "You're on a roll!", 'Flow like that!'],
  lastSet: ['Last one, make it count!', "Final set, let's go!", 'One more. You got this.'],
} as const satisfies Record<string, readonly string[]>

export function raeMood(input: RaeMoodInput): RaeMood {
  const { phase, msSinceCompletedSet, isFlowMilestone, isLastSet, isLastMove, seed } = input

  // A set just landed: a brief, bigger reaction wins over whatever the
  // phase would otherwise show (rest/pause arrive at the same instant a
  // set completes, and the reaction belongs to the set, not the phase).
  if (msSinceCompletedSet != null && msSinceCompletedSet >= 0 && msSinceCompletedSet < CELEBRATE_MS) {
    return isFlowMilestone
      ? { expression: 'surprised', line: pick(RAE_MOOD_LINES.milestone, seed) }
      : { expression: 'laugh', line: pick(RAE_MOOD_LINES.setDone, seed) }
  }
  if (phase === 'paused') return { expression: 'smile' }
  if (phase === 'resting') return { expression: 'tired' }
  if (phase === 'holding') return { expression: 'determined' }
  if (isLastSet) return { expression: 'cheer', line: pick(RAE_MOOD_LINES.lastSet, seed) }
  if (isLastMove) return { expression: 'determined' }
  return { expression: 'focused' }
}

// Same deterministic hash-pick idea as raeSays.ts, keyed by whatever the
// caller passes as seed (there's no calendar day to vary by here).
function pick(lines: readonly string[], seed: string): string {
  let hash = 0
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return lines[hash % lines.length]
}
