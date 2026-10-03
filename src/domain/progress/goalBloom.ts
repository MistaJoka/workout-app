import type { SessionResult } from '../session/types'
import { goalForWeek, type WeekGoal } from './weekGoals'
import { GARDEN_SPECIES, type GardenSpecies, type Rarity } from './garden'

// Goal bloom: a bonus flower for a week where the weekly goal was met, from
// its own pool -- weighted toward the garden's rarer species, so a goal met
// always feels like a real little reward. It's a bonus on top of the
// ordinary per-workout flower (garden.ts's speciesFor), never a replacement,
// and it is only ever earned, never lost: once a week has met its goal that
// week keeps its bloom even if the schedule or history is read again later.

// No common species in the goal pool: this bonus always reads as a step up
// from an everyday flower.
const GOAL_RARITY_WEIGHTS: ReadonlyArray<[Rarity, number]> = [
  ['uncommon', 0.7],
  ['rare', 0.25],
  ['legendary', 0.05],
]

// Same FNV-1a hash as garden.ts/meadowLayout.ts, kept local so this stays a
// standalone pure module.
function unit(text: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  hash ^= hash >>> 16
  hash = Math.imul(hash, 0x85ebca6b)
  hash ^= hash >>> 13
  return (hash >>> 0) / 0x100000000
}

// Local Monday of the week, as "YYYY-MM-DD" -- the same calendar-date
// arithmetic stats.ts/xp.ts use for weekly goal/streak bookkeeping, kept
// local here so goalBloom.ts stays a standalone pure module.
export function weekStartKey(date: Date): string {
  const day = date.getDay() // 0 = Sunday
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() + (day === 0 ? -6 : 1 - day))
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`
}

// Deterministic by weekStart alone (never by which session grew it), so
// replaying the same history always grows the same bonus flower for the
// same week, and the species a week will give never changes once decided.
export function goalSpeciesFor(weekStart: string): GardenSpecies {
  const roll = unit(`goal-rarity:${weekStart}`)
  let rarity: Rarity = 'uncommon'
  let edge = 0
  for (const [tier, weight] of GOAL_RARITY_WEIGHTS) {
    edge += weight
    if (roll < edge) {
      rarity = tier
      break
    }
  }
  const tier = GARDEN_SPECIES.filter((s) => s.rarity === rarity)
  return tier[Math.floor(unit(`goal-species:${weekStart}`) * tier.length)]
}

export type GoalBloom = {
  weekStart: string // local Monday, YYYY-MM-DD
  sessionId: string // the workout that reached the goal this week
  species: GardenSpecies
}

// One GoalBloom per Monday-start week in which `weeklyGoal` finished
// workouts were reached, attributed to the exact session that tipped the
// week over the goal (the weeklyGoal-th one, by endedAt) -- the same
// session xp.ts's computeXp marks `goalMet` for, so Complete can reveal the
// bonus bloom on exactly that screen. A non-positive goal never completes
// (there is nothing to "meet").
export function goalBlooms(results: readonly SessionResult[], weeklyGoal: WeekGoal): GoalBloom[] {
  const ordered = [...results].sort((a, b) => a.endedAt.localeCompare(b.endedAt))
  const counts = new Map<string, number>()
  const blooms: GoalBloom[] = []
  for (const r of ordered) {
    const weekStart = weekStartKey(new Date(r.endedAt))
    const count = (counts.get(weekStart) ?? 0) + 1
    counts.set(weekStart, count)
    const goal = goalForWeek(weeklyGoal, new Date(r.endedAt))
    if (goal > 0 && count === goal) blooms.push({ weekStart, sessionId: r.sessionId, species: goalSpeciesFor(weekStart) })
  }
  return blooms
}

// The goal bloom (if any) this exact session's finish earned -- for
// Complete's reveal, which only ever shows on the workout that actually
// crossed the goal, never on an earlier or later one.
export function goalBloomForSession(
  results: readonly SessionResult[],
  weeklyGoal: WeekGoal,
  sessionId: string
): GoalBloom | null {
  return goalBlooms(results, weeklyGoal).find((b) => b.sessionId === sessionId) ?? null
}
