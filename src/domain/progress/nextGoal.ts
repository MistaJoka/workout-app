import { nextMilestone } from './stats'
import { levelFor } from './xp'

export type NextGoalKind = 'milestone' | 'level'

export type NextGoal = {
  kind: NextGoalKind
  label: string
}

// English ordinal suffix, mirroring stats.ts's private `ordinal` (a trivial,
// stable formatting rule, not a product decision — duplicated here rather
// than parsed back out of nextMilestone's sentence).
function ordinal(n: number): string {
  const tens = n % 100
  if (tens >= 11 && tens <= 13) return `${n}th`
  return `${n}${({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'}`
}

// The closer of the two steady long-run goals every finished workout feeds:
// the next workout-count milestone (nextMilestone, stats.ts) and the next
// level (levelFor, xp.ts). Achievements aren't included on purpose:
// evaluateAchievements (achievements.ts) only reports whether one already
// unlocked, not how close an unearned one is, and recomputing that here
// would duplicate its private counting rules (moves seen, week counts, …)
// somewhere they could silently drift from the real unlock logic.
//
// "Closer" is the fraction of the goal still left (remaining over the
// goal's own size) — a level can need well over a hundred XP while a
// milestone needs two workouts, so only a normalized share is comparable.
// Every number actually shown stays in its own real, measured unit; nothing
// is converted or estimated to force the comparison.
export function nextGoal(finishedWorkouts: number, totalXp: number): NextGoal | null {
  const milestone = nextMilestone(finishedWorkouts)
  const level = levelFor(totalXp)
  const levelRemaining = Math.max(0, level.needed - level.into)

  const candidates: { kind: NextGoalKind; ratio: number; label: string }[] = []

  if (milestone) {
    const remaining = milestone.target - milestone.done
    if (remaining > 0) {
      candidates.push({
        kind: 'milestone',
        ratio: remaining / milestone.target,
        label: `${remaining} more ${remaining === 1 ? 'workout' : 'workouts'} to your ${ordinal(milestone.target)}`,
      })
    }
  }

  if (levelRemaining > 0 && level.needed > 0) {
    candidates.push({
      kind: 'level',
      ratio: levelRemaining / level.needed,
      label: `${levelRemaining} XP to your next level`,
    })
  }

  if (candidates.length === 0) return null
  const winner = candidates.reduce((best, c) => (c.ratio < best.ratio ? c : best))
  return { kind: winner.kind, label: winner.label }
}
