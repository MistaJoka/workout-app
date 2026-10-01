// Pure helpers behind Rae's room on Today: which garden flowers sit on her
// windowsill, whether the newest one should bounce in, and which cheerful
// line she says when tapped. Kept framework-free so they're plain vitest
// targets; RaeHero.tsx wires them to state and localStorage.

import type { GardenFlower } from '../../domain/progress/garden'

// The newest few flowers, oldest of the bunch first (so the newest, the one
// that may bounce in, is always last/rightmost, closest to Rae).
export function newestFlowers(flowers: readonly GardenFlower[], max: number): readonly GardenFlower[] {
  return flowers.slice(-max)
}

const SEEN_KEY = 'workout-app:rae-garden-seen'

export function gardenSeenKey(): string {
  return SEEN_KEY
}

// True the first time Today opens after a session grew a flower nobody has
// been shown yet (a null newest, nothing grown, never reveals).
export function shouldRevealNewestFlower(lastSeenSessionId: string | null, newestSessionId: string | null): boolean {
  return newestSessionId != null && newestSessionId !== lastSeenSessionId
}

// ~10 warm, non-guilt lines Rae says when you tap her hello. Never about
// missed days or streaks - that's raeSays' job; this is just "hi".
export const RAE_TAP_LINES = [
  'Hi! Ready when you are.',
  'Love that energy!',
  "You've got this.",
  "So glad you're here.",
  "Let's make today good.",
  "I'm cheering for you.",
  'Hey there, friend.',
  'Proud of you already.',
  "Take your time, I'm here.",
  'Every bit counts.',
] as const

// A random line, skipping an immediate repeat of `avoid` when the pool
// allows it (so two taps in a row don't (usually) say the same thing).
export function pickTapLine(lines: readonly string[], rand: () => number = Math.random, avoid?: string): string {
  if (lines.length === 0) return ''
  let line = lines[Math.floor(rand() * lines.length) % lines.length]
  if (line === avoid && lines.length > 1) {
    line = lines[Math.floor(rand() * lines.length) % lines.length]
  }
  return line
}
