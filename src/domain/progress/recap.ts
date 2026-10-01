import type { SessionEvent, SessionPlan, SessionResult } from '../session/types'
import type { AchievementIcon } from './achievements'
import { speciesFor, type GardenFlower, type GardenSpecies, type Rarity } from './garden'
import { projectSetRecords } from './history'
import { sessionHighlights } from './sessionHighlights'
import type { PersonalRecord } from './types'

// "Your week in bloom": one Monday-start week told back as a few story
// slides. It celebrates whatever happened; a quiet week gets a warm,
// shame-free recap ("rest weeks count too"). Pure: callers pass history.
//
// "Your month in bloom" is the same idea for a calendar month, and reuses
// buildWeekRecap itself to find the longest run of active weeks inside the
// month (see buildMonthRecap below).

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

// ---------------------------------------------------------------------------
// "Your month in bloom"

const WEEKDAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const

const RARITY_RANK: Record<Rarity, number> = { common: 0, uncommon: 1, rare: 2, legendary: 3 }

export type MonthRecap = {
  monthKey: string // YYYY-MM, local
  year: number
  month: number // 0-11
  workouts: number
  sets: number
  minutes: number
  flowers: GardenFlower[] // grown this month, oldest first
  newSpecies: GardenSpecies[] // first ever grown this month
  rarestFlower: GardenFlower | null // the rarest species grown this month
  badges: RecapBadge[] // unlocked this month
  bests: PersonalRecord[] // new bests beaten this month, one per move
  topWeekday: { label: string; count: number } | null // most active weekday
  longestWeekStreak: number // longest run of consecutive active weeks inside the month
  quiet: boolean
  signOff: string
}

const MONTH_SIGN_OFFS = {
  active: ['What a month. I am so proud of you.', 'Your garden bloomed all month long.', 'Look at everything you grew.'],
  quiet: ['A quiet month. I am here when you are ready.', 'Rest months count too. Your garden will wait for you.'],
} as const

export function monthStartOf(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

// ?month=YYYY-MM names a calendar month.
export function parseMonthParam(value: string | null): Date | null {
  const m = value ? /^(\d{4})-(\d{2})$/.exec(value) : null
  if (!m) return null
  const date = new Date(Number(m[1]), Number(m[2]) - 1, 1)
  return Number.isNaN(date.getTime()) ? null : date
}

// The Monday-start weeks whose Monday falls on or after a month's start and
// before its end, in order. Used only to measure the longest streak of
// active weeks "inside" the month; a boundary week whose Monday is in the
// previous month is not counted as belonging to this one.
function weekStartsInside(start: Date, end: Date): Date[] {
  const starts: Date[] = []
  let cursor = weekStartOf(start)
  if (cursor.getTime() < start.getTime()) cursor = shiftDays(cursor, 7)
  while (cursor.getTime() < end.getTime()) {
    starts.push(cursor)
    cursor = shiftDays(cursor, 7)
  }
  return starts
}

// Reuses buildWeekRecap for every week inside the month to find the longest
// run of consecutive weeks with at least one workout. The goal passed in
// doesn't matter here: only `.workouts` is read, never `.goalMet`.
function longestWeekStreakInside(history: History, badges: readonly BadgeLike[], start: Date, end: Date): number {
  let longest = 0
  let current = 0
  for (const weekStart of weekStartsInside(start, end)) {
    const active = buildWeekRecap(history, badges, 0, weekStart).workouts > 0
    current = active ? current + 1 : 0
    longest = Math.max(longest, current)
  }
  return longest
}

export function buildMonthRecap(history: History, badges: readonly BadgeLike[], month: Date): MonthRecap {
  const start = monthStartOf(month)
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 1)
  const inMonth = (iso: string) => {
    const t = new Date(iso).getTime()
    return t >= start.getTime() && t < end.getTime()
  }

  const ordered = [...history.results].sort((a, b) => a.endedAt.localeCompare(b.endedAt))
  const mine = ordered.filter((r) => inMonth(r.endedAt))
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

  const records = mine.length > 0 ? projectSetRecords(history.plans, history.results, history.events) : []
  const bestByMove = new Map<string, PersonalRecord>()
  for (const r of mine) {
    for (const best of sessionHighlights(records, history.results, r.sessionId).newBests) bestByMove.set(best.exerciseId, best)
  }

  let rarestFlower: GardenFlower | null = null
  for (const f of flowers) {
    if (!rarestFlower || RARITY_RANK[f.species.rarity] > RARITY_RANK[rarestFlower.species.rarity]) rarestFlower = f
  }

  let topWeekdayIdx = -1
  let topWeekdayCount = 0
  const weekdayCounts = new Map<number, number>()
  for (const f of flowers) {
    const day = (new Date(f.endedAt).getDay() + 6) % 7 // Monday = 0
    weekdayCounts.set(day, (weekdayCounts.get(day) ?? 0) + 1)
  }
  for (const [day, count] of weekdayCounts) {
    if (count > topWeekdayCount) {
      topWeekdayCount = count
      topWeekdayIdx = day
    }
  }
  const topWeekday = topWeekdayIdx >= 0 ? { label: WEEKDAY_LABELS[topWeekdayIdx], count: topWeekdayCount } : null

  const workouts = mine.length
  const tone = workouts === 0 ? 'quiet' : 'active'
  const key = monthKey(start)

  return {
    monthKey: key,
    year: start.getFullYear(),
    month: start.getMonth(),
    workouts,
    sets,
    minutes,
    flowers,
    newSpecies,
    rarestFlower,
    badges: badges
      .filter((b) => b.unlockedAt && inMonth(b.unlockedAt))
      .map(({ id, title, icon }) => ({ id, title, icon })),
    bests: [...bestByMove.values()],
    topWeekday,
    longestWeekStreak: longestWeekStreakInside(history, badges, start, end),
    quiet: workouts === 0,
    signOff: pick(MONTH_SIGN_OFFS[tone], key),
  }
}

// Whether Today should offer a month recap. Only on the first few days of a
// new month, so it reads as a wrap-up of the month that just ended rather
// than a stale notice later on; offered once per month until opened.
export function monthRecapOffer(
  now: Date,
  counts: { previousMonth: number },
  seenMonth: string | null
): { monthKey: string } | null {
  if (now.getDate() > 3) return null
  const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const key = monthKey(previous)
  return counts.previousMonth > 0 && seenMonth !== key ? { monthKey: key } : null
}
