import type { SessionEvent, SessionPlan, SessionResult } from '../session/types'
import type { AchievementIcon } from './achievements'
import { speciesFor, type GardenFlower, type GardenSpecies } from './garden'
import { projectSetRecords } from './history'
import { sessionHighlights } from './sessionHighlights'
import type { PersonalRecord } from './types'

// "Your week in bloom": one Monday-start week told back as a few story
// slides. It celebrates whatever happened; a quiet week gets a warm,
// shame-free recap ("rest weeks count too"). Pure: callers pass history.

export type RecapBadge = { id: string; title: string; icon: AchievementIcon }

export type WeekRecap = {
  weekStart: string // local Monday, YYYY-MM-DD
  weekEnd: string // local Sunday, YYYY-MM-DD
  workouts: number
  goal: number
  goalMet: boolean
  sets: number
  minutes: number
  flowers: GardenFlower[] // grown this week, oldest first
  newSpecies: GardenSpecies[] // first ever grown this week
  badges: RecapBadge[] // unlocked this week
  bests: PersonalRecord[] // new bests beaten this week, one per move
  quiet: boolean
  signOff: string
}

type History = {
  plans: readonly SessionPlan[]
  results: readonly SessionResult[]
  events: readonly SessionEvent[]
}

type BadgeLike = RecapBadge & { unlockedAt: string | null }

export function weekStartOf(date: Date): Date {
  const day = (date.getDay() + 6) % 7 // Monday = 0
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - day)
}

export function weekKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function shiftDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

// ?week=YYYY-MM-DD names any day in the week; the recap uses its Monday.
export function parseWeekParam(value: string | null): Date | null {
  const m = value ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) : null
  if (!m) return null
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return Number.isNaN(date.getTime()) ? null : weekStartOf(date)
}

// The week to tell by default: on Monday the week that just ended, any
// other day the week so far (Sunday's is the full week).
export function defaultRecapWeek(now: Date): Date {
  const start = weekStartOf(now)
  return now.getDay() === 1 ? shiftDays(start, -7) : start
}

const SIGN_OFFS = {
  met: ['What a week. I am so proud of you.', 'Goal met! Your garden is loving it.', 'You showed up for yourself. Beautiful.'],
  some: ['Every workout counts. See you this week!', 'Lovely work. Let us keep growing.', 'A little movement goes a long way.'],
  quiet: ['Rest weeks count too. I am here when you are ready.', 'A restful week. Your garden will wait for you.'],
} as const

function pick<T>(list: readonly T[], key: string): T {
  let hash = 0
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0
  return list[hash % list.length]
}

export function buildWeekRecap(history: History, badges: readonly BadgeLike[], goal: number, weekStart: Date): WeekRecap {
  const start = weekStartOf(weekStart)
  const end = shiftDays(start, 7)
  const inWeek = (iso: string) => {
    const t = new Date(iso).getTime()
    return t >= start.getTime() && t < end.getTime()
  }

  const ordered = [...history.results].sort((a, b) => a.endedAt.localeCompare(b.endedAt))
  const mine = ordered.filter((r) => inWeek(r.endedAt))
  const before = ordered.filter((r) => new Date(r.endedAt).getTime() < start.getTime())

  const flowers = mine.map((r) => ({ sessionId: r.sessionId, endedAt: r.endedAt, species: speciesFor(r.sessionId) }))
  const seen = new Set(before.map((r) => speciesFor(r.sessionId).id))
  const newSpecies: GardenSpecies[] = []
  for (const f of flowers) {
    if (seen.has(f.species.id)) continue
    seen.add(f.species.id)
    newSpecies.push(f.species)
  }

  const minutes = mine.reduce(
    (sum, r) => sum + Math.max(1, Math.round((new Date(r.endedAt).getTime() - new Date(r.startedAt).getTime()) / 60_000)),
    0
  )
  const sets = mine.reduce((sum, r) => sum + r.totalSetsCompleted, 0)

  // A move beaten twice this week shows once, at its latest best.
  const records = mine.length > 0 ? projectSetRecords(history.plans, history.results, history.events) : []
  const bestByMove = new Map<string, PersonalRecord>()
  for (const r of mine) {
    for (const best of sessionHighlights(records, history.results, r.sessionId).newBests) bestByMove.set(best.exerciseId, best)
  }

  const workouts = mine.length
  const goalMet = workouts >= goal && workouts > 0
  const tone = workouts === 0 ? 'quiet' : goalMet ? 'met' : 'some'

  return {
    weekStart: weekKey(start),
    weekEnd: weekKey(shiftDays(start, 6)),
    workouts,
    goal,
    goalMet,
    sets,
    minutes,
    flowers,
    newSpecies,
    badges: badges
      .filter((b) => b.unlockedAt && inWeek(b.unlockedAt))
      .map(({ id, title, icon }) => ({ id, title, icon })),
    bests: [...bestByMove.values()],
    quiet: workouts === 0,
    signOff: pick(SIGN_OFFS[tone], weekKey(start)),
  }
}

// Whether Today should offer a recap, and for which week. Sunday tells the
// week now ending (once there's any history); Monday to Saturday tell last
// week if it had a workout. Each week is offered until it has been opened.
export function recapOffer(
  now: Date,
  counts: { thisWeek: number; lastWeek: number; ever: number },
  seenWeek: string | null
): { weekStart: string } | null {
  const start = weekStartOf(now)
  if (now.getDay() === 0) {
    const key = weekKey(start)
    return counts.ever > 0 && seenWeek !== key ? { weekStart: key } : null
  }
  const key = weekKey(shiftDays(start, -7))
  return counts.lastWeek > 0 && seenWeek !== key ? { weekStart: key } : null
}
