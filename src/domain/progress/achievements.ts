import type { SessionEvent, SessionPlan, SessionResult } from '../session/types'
import { goalForWeek, mondayKey as weekKey, type WeekGoal } from './weekGoals'
import { fullBodyA } from '../content/fixtures/foundationStrengthStarter'
import { projectSetRecords } from './history'
import { sessionHighlights } from './sessionHighlights'

// Achievements celebrate effort, never absence: nothing expires, nothing is
// lost by resting, and "welcome back" is a warm unlock, not a lapse. Each is
// earned once, on the first finished session that qualifies, and is derived
// from history every time (no stored unlock state to drift or import).

export type AchievementIcon =
  | 'sprout'
  | 'flower'
  | 'bouquet'
  | 'tree'
  | 'calendar'
  | 'target'
  | 'sun'
  | 'moon'
  | 'star'
  | 'heart'
  | 'compass'
  | 'hourglass'
  | 'door'
  | 'flame'
  | 'trophy'
  | 'medal'

export type AchievementDef = {
  id: string
  title: string
  // How it's earned, phrased as an invitation (shown on locked badges too).
  description: string
  icon: AchievementIcon
  // Tiered badges share a ladder; the wall shows only the next locked tier
  // of each, so a new player sees a few goals, not a wall of silhouettes.
  ladder?: string
}

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  { id: 'first-workout', title: 'First bloom', description: 'Finish your first workout.', icon: 'sprout' },
  { id: 'full-set', title: 'Full set', description: 'Finish every planned set in a workout.', icon: 'star', ladder: 'full-sets' },
  { id: 'three-in-a-week', title: 'Three in a week', description: 'Finish three workouts in one week.', icon: 'calendar' },
  { id: 'weekly-goal', title: 'Goal getter', description: "Meet your week's workout goal.", icon: 'target', ladder: 'goal-weeks' },
  { id: 'workouts-5', title: 'Five strong', description: 'Finish five workouts.', icon: 'flower', ladder: 'workouts' },
  { id: 'workouts-10', title: 'Ten and growing', description: 'Finish ten workouts.', icon: 'bouquet', ladder: 'workouts' },
  { id: 'workouts-25', title: 'Quarter century', description: 'Finish twenty-five workouts.', icon: 'tree', ladder: 'workouts' },
  { id: 'workouts-50', title: 'Fifty blooms', description: 'Finish fifty workouts.', icon: 'trophy', ladder: 'workouts' },
  { id: 'early-bird', title: 'Early bird', description: 'Finish a workout before 8 in the morning.', icon: 'sun' },
  { id: 'night-owl', title: 'Night owl', description: 'Finish a workout after 9 at night.', icon: 'moon' },
  {
    id: 'full-body-a-complete',
    title: 'Full-Body explorer',
    description: 'Do every move in Full-Body A at least once.',
    icon: 'compass',
  },
  { id: 'ten-moves', title: 'Curious mover', description: 'Try ten different moves.', icon: 'heart', ladder: 'moves' },
  { id: 'hold-strong', title: 'Hold strong', description: 'Hold for a minute in total in one workout.', icon: 'hourglass' },
  { id: 'welcome-back', title: 'Welcome back', description: 'Come back for a workout after a week or more away.', icon: 'door' },
  { id: 'warmed-up', title: 'Warmed up', description: 'Do the warm-up and a workout on the same day.', icon: 'flame' },
  { id: 'new-best', title: 'New best', description: 'Beat one of your own bests.', icon: 'medal' },

  // The long tail (2026-10-03): ladders that keep giving well past fifty
  // workouts. Totals only, never streaks -- a missed week resets nothing.
  { id: 'workouts-75', title: 'Seventy-five', description: 'Finish seventy-five workouts.', icon: 'medal', ladder: 'workouts' },
  { id: 'workouts-100', title: 'Hundred blooms', description: 'Finish a hundred workouts.', icon: 'trophy', ladder: 'workouts' },
  { id: 'workouts-150', title: 'Still blooming', description: 'Finish a hundred and fifty workouts.', icon: 'bouquet', ladder: 'workouts' },
  { id: 'workouts-200', title: 'Two hundred', description: 'Finish two hundred workouts.', icon: 'tree', ladder: 'workouts' },
  { id: 'workouts-300', title: 'Evergreen', description: 'Finish three hundred workouts.', icon: 'trophy', ladder: 'workouts' },
  { id: 'goal-weeks-4', title: 'Month of goals', description: 'Meet your weekly goal in four different weeks.', icon: 'target', ladder: 'goal-weeks' },
  { id: 'goal-weeks-12', title: 'Season of goals', description: 'Meet your weekly goal in twelve different weeks.', icon: 'calendar', ladder: 'goal-weeks' },
  { id: 'goal-weeks-26', title: 'Half a year of goals', description: 'Meet your weekly goal in twenty-six different weeks.', icon: 'target', ladder: 'goal-weeks' },
  { id: 'goal-weeks-52', title: 'A year of goals', description: 'Meet your weekly goal in fifty-two different weeks.', icon: 'sun', ladder: 'goal-weeks' },
  { id: 'moves-20', title: 'Explorer', description: 'Try twenty different moves.', icon: 'compass', ladder: 'moves' },
  { id: 'moves-40', title: 'Move collector', description: 'Try forty different moves.', icon: 'heart', ladder: 'moves' },
  { id: 'sets-100', title: 'Hundred sets', description: 'Finish a hundred sets in total.', icon: 'star', ladder: 'sets' },
  { id: 'sets-250', title: 'Set stacker', description: 'Finish two hundred and fifty sets in total.', icon: 'flame', ladder: 'sets' },
  { id: 'sets-500', title: 'Five hundred sets', description: 'Finish five hundred sets in total.', icon: 'star', ladder: 'sets' },
  { id: 'sets-1000', title: 'Thousand sets', description: 'Finish a thousand sets in total.', icon: 'trophy', ladder: 'sets' },
  { id: 'full-sets-10', title: 'Ten complete', description: 'Finish every planned set in ten workouts.', icon: 'star', ladder: 'full-sets' },
  { id: 'full-sets-25', title: 'Twenty-five complete', description: 'Finish every planned set in twenty-five workouts.', icon: 'medal', ladder: 'full-sets' },
  { id: 'hold-total-10', title: 'Ten-minute hold', description: 'Hold for ten minutes in total, across workouts.', icon: 'hourglass', ladder: 'hold-total' },
  { id: 'hold-total-30', title: 'Half-hour hold', description: 'Hold for thirty minutes in total, across workouts.', icon: 'hourglass', ladder: 'hold-total' },
]

export type AchievementHistory = {
  plans: readonly SessionPlan[]
  results: readonly SessionResult[]
  events: readonly SessionEvent[]
}

export type AchievementProgress = { current: number; target: number; unit: string }

export type EvaluatedAchievement = AchievementDef & {
  unlockedAt: string | null
  sessionId: string | null
  // How far along a locked counting badge is (goal-gradient: a visible,
  // honest "64 / 100"). Null once earned, and for one-off badges.
  progress: AchievementProgress | null
}

const WORKOUT_COUNTS: Record<string, number> = {
  'workouts-5': 5,
  'workouts-10': 10,
  'workouts-25': 25,
  'workouts-50': 50,
  'workouts-75': 75,
  'workouts-100': 100,
  'workouts-150': 150,
  'workouts-200': 200,
  'workouts-300': 300,
}
const GOAL_WEEKS: Record<string, number> = { 'goal-weeks-4': 4, 'goal-weeks-12': 12, 'goal-weeks-26': 26, 'goal-weeks-52': 52 }
const MOVES: Record<string, number> = { 'moves-20': 20, 'moves-40': 40 }
const SETS: Record<string, number> = { 'sets-100': 100, 'sets-250': 250, 'sets-500': 500, 'sets-1000': 1000 }
const FULL_SETS: Record<string, number> = { 'full-sets-10': 10, 'full-sets-25': 25 }
const HOLD_TOTAL_SECONDS: Record<string, number> = { 'hold-total-10': 600, 'hold-total-30': 1800 }
const WARM_UP_ID = 'draft.warm-up'
const BOOKEND_IDS = new Set([WARM_UP_ID, 'draft.cool-down'])
const AWAY_MS = 7 * 24 * 60 * 60 * 1000
const HOLD_SECONDS = 60

export function evaluateAchievements(history: AchievementHistory, weeklyGoal: WeekGoal): EvaluatedAchievement[] {
  const planById = new Map(history.plans.map((p) => [p.id, p]))
  const results = [...history.results].sort((a, b) => a.endedAt.localeCompare(b.endedAt))
  const records = projectSetRecords(history.plans, history.results, history.events)
  const recordsBySession = new Map<string, typeof records>()
  for (const r of records) recordsBySession.set(r.sessionId, [...(recordsBySession.get(r.sessionId) ?? []), r])

  const earned = new Map<string, { unlockedAt: string; sessionId: string }>()
  const earn = (id: string, result: SessionResult) => {
    if (!earned.has(id)) earned.set(id, { unlockedAt: result.endedAt, sessionId: result.sessionId })
  }

  const fullBodyAMoves = new Set(fullBodyA.exercises.map((e) => e.exerciseId))
  const movesSeen = new Set<string>()
  const weekCounts = new Map<string, number>()
  const dayTemplates = new Map<string, Set<string>>()
  let previousEnd: number | null = null
  let goalWeeks = 0
  let setsTotal = 0
  let fullSets = 0
  let holdTotal = 0
  const reached = (table: Record<string, number>, value: number, result: SessionResult) => {
    for (const [id, need] of Object.entries(table)) if (value >= need) earn(id, result)
  }

  results.forEach((result, index) => {
    const ended = new Date(result.endedAt)
    const plan = planById.get(result.planId)
    const sessionRecords = recordsBySession.get(result.sessionId) ?? []

    earn('first-workout', result)
    for (const [id, count] of Object.entries(WORKOUT_COUNTS)) if (index + 1 === count) earn(id, result)

    if (result.status === 'COMPLETED' && result.totalSetsPlanned > 0 && result.totalSetsCompleted >= result.totalSetsPlanned) {
      earn('full-set', result)
      fullSets += 1
      reached(FULL_SETS, fullSets, result)
    }
    setsTotal += sessionRecords.length
    reached(SETS, setsTotal, result)

    const week = weekKey(ended)
    const inWeek = (weekCounts.get(week) ?? 0) + 1
    weekCounts.set(week, inWeek)
    if (inWeek >= 3) earn('three-in-a-week', result)
    const goal = goalForWeek(weeklyGoal, ended)
    if (inWeek >= goal) earn('weekly-goal', result)
    if (goal > 0 && inWeek === goal) {
      goalWeeks += 1
      reached(GOAL_WEEKS, goalWeeks, result)
    }

    const hour = ended.getHours()
    if (hour < 8) earn('early-bird', result)
    if (hour >= 21) earn('night-owl', result)

    for (const r of sessionRecords) movesSeen.add(r.exerciseId)
    if ([...fullBodyAMoves].every((id) => movesSeen.has(id))) earn('full-body-a-complete', result)
    if (movesSeen.size >= 10) earn('ten-moves', result)
    reached(MOVES, movesSeen.size, result)

    const heldSeconds = sessionRecords.reduce((sum, r) => sum + (r.prescribedSeconds ?? 0), 0)
    if (heldSeconds >= HOLD_SECONDS) earn('hold-strong', result)
    holdTotal += heldSeconds
    reached(HOLD_TOTAL_SECONDS, holdTotal, result)

    if (previousEnd !== null && ended.getTime() - previousEnd >= AWAY_MS) earn('welcome-back', result)
    previousEnd = ended.getTime()

    if (plan) {
      const day = dayKey(ended)
      const templates = dayTemplates.get(day) ?? new Set<string>()
      templates.add(plan.templateId)
      dayTemplates.set(day, templates)
      const mainWorkout = [...templates].some((t) => !BOOKEND_IDS.has(t))
      if (templates.has(WARM_UP_ID) && mainWorkout) earn('warmed-up', result)
    }

    // A one-time badge, and the costliest check: skip it once earned.
    if (!earned.has('new-best') && sessionHighlights(records, results, result.sessionId).newBests.length > 0) earn('new-best', result)
  })

  const counters: [Record<string, number>, number, string][] = [
    [WORKOUT_COUNTS, results.length, 'workouts'],
    [GOAL_WEEKS, goalWeeks, 'weeks'],
    [MOVES, movesSeen.size, 'moves'],
    [{ 'ten-moves': 10 }, movesSeen.size, 'moves'],
    [SETS, setsTotal, 'sets'],
    [FULL_SETS, fullSets, 'workouts'],
    [Object.fromEntries(Object.entries(HOLD_TOTAL_SECONDS).map(([id, s]) => [id, s / 60])), Math.floor(holdTotal / 60), 'min'],
  ]
  const progressFor = (id: string): AchievementProgress | null => {
    for (const [table, current, unit] of counters) if (id in table) return { current: Math.min(current, table[id]), target: table[id], unit }
    return null
  }

  return ACHIEVEMENTS.map((def) => {
    const hit = earned.get(def.id)
    return {
      ...def,
      unlockedAt: hit?.unlockedAt ?? null,
      sessionId: hit?.sessionId ?? null,
      progress: hit ? null : progressFor(def.id),
    }
  })
}

// What the badge wall shows: everything earned, every stand-alone badge,
// and for each ladder only its lowest locked tier (the next one to aim at).
// ACHIEVEMENTS lists each ladder's tiers in order, which this relies on.
export function visibleAchievements<T extends EvaluatedAchievement>(evaluated: readonly T[]): T[] {
  const nextShown = new Set<string>()
  return evaluated.filter((a) => {
    if (a.unlockedAt || !a.ladder) return true
    if (nextShown.has(a.ladder)) return false
    nextShown.add(a.ladder)
    return true
  })
}

// The achievements a just-finished session earned, for the Complete screen.
export function newlyUnlocked(evaluated: readonly EvaluatedAchievement[], sessionId: string): EvaluatedAchievement[] {
  return evaluated.filter((a) => a.sessionId === sessionId)
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}
