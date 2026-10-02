import { effectiveSetSlots } from '../session/appliedEvents'
import { flowStatus } from '../session/flow'
import type { SessionEvent, SessionPlan, SessionResult } from '../session/types'

// Weekly boss battles: a cute pixel boss "guards" each Monday-start week.
// Every counted set this week chips its HP; a full week's worth of normal
// effort beats it comfortably (the ethics bar, CLAUDE.md, is "celebrate,
// never shame, nothing lost"), and an undefeated boss simply leaves at
// week's end with a friendly goodbye -- there's no loss state here, only a
// win state or a quiet "escaped". A sibling feature (carrots) spends
// bossDefeats; this module owns no currency of its own.

export type Boss = {
  id: string
  name: string
  // One short, friendly line of flavor for the boss screen.
  flavor: string
}

// Eight bosses, cute not scary, roughly themed to common moves so a hit
// reads as "that's the squat boss" without this module knowing anything
// about exercise content.
export const BOSS_ROSTER: readonly Boss[] = [
  { id: 'plank-dragon', name: 'Plank Dragon', flavor: 'Holds very still. Breathes tiny sparkles.' },
  { id: 'squat-slime', name: 'Squat Slime', flavor: 'Wobbles low, bounces right back up.' },
  { id: 'lunge-golem', name: 'Lunge Golem', flavor: 'One careful step at a time, made of pebbles.' },
  { id: 'crunch-crab', name: 'Crunch Crab', flavor: 'All shell, soft ticklish centre.' },
  { id: 'burpee-bat', name: 'Burpee Bat', flavor: 'Flaps, flops, flies again, giggling.' },
  { id: 'stretch-serpent', name: 'Stretch Serpent', flavor: 'A little longer every time you look.' },
  { id: 'couch-kraken', name: 'Couch Kraken', flavor: 'Tentacles made entirely of cushions.' },
  { id: 'sleepy-sloth-king', name: 'Sleepy Sloth King', flavor: 'Naps on a tiny throne, snoring sparkles.' },
]

// --- Local-calendar date helpers (deliberately self-contained: see
// stats.ts's own localDayKey/isoWeekStart, which aren't exported) ---------

function localDayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function parseDayKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// Monday of the local-calendar week containing `date` (Sunday counts as the
// tail end of the previous week), matching stats.ts's weekly streak/goal.
function mondayStart(date: Date): Date {
  const day = date.getDay() // 0 = Sunday
  const offset = day === 0 ? -6 : 1 - day
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + offset)
}

// FNV-1a, folded to [0, 1). Same technique as garden.ts's speciesFor: fixed
// forever for a given key, but not predictable by counting.
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

// The boss on duty for the Monday-start week containing `weekStart` (any
// day in that week works; it's normalized here). Deterministic and
// seeded by the week's own date key, so last week's boss never changes and
// next week's can't be guessed early.
export function bossForWeek(weekStart: Date): Boss {
  const key = localDayKey(mondayStart(weekStart))
  const index = Math.floor(unit(`boss:${key}`) * BOSS_ROSTER.length)
  return BOSS_ROSTER[Math.min(index, BOSS_ROSTER.length - 1)]
}

// --- Damage ---------------------------------------------------------------

// Flat damage for an ordinary counted rep-based set.
const HIT_DAMAGE = 10
// Timed holds (plank, etc.) deal damage per 10 seconds held instead of one
// flat hit, so a longer hold lands harder.
const HOLD_TICK_SECONDS = 10
const HOLD_TICK_DAMAGE = 5
// A met set is a critical hit: double damage. A missed set still lands (an
// attempt always counts for something -- nothing here is ever a penalty).
const CRIT_MULTIPLIER = 2
// A fully perfect workout (session/flow.ts) lands one bonus hit.
const PERFECT_BONUS = 25
// Max HP scales with the week's own goal, so a bigger goal fields a
// tougher (but still beatable-by-a-normal-week) boss.
const HP_PER_GOAL_DAY = 20

export type SessionDamage = {
  damage: number
  hits: number
  crits: number
  perfectBonus: boolean
}

// Damage one session deals, from only the sets the session machine actually
// applied (effectiveSetSlots) -- a stray or undone tap never lands a hit,
// same source of truth as every other session tally (stats.ts, flow.ts).
export function damageFromSession(plan: SessionPlan, events: readonly SessionEvent[]): SessionDamage {
  let damage = 0
  let hits = 0
  let crits = 0
  for (const { event, exerciseIndex } of effectiveSetSlots(plan, events)) {
    const exercise = plan.exercises[exerciseIndex]
    if (!exercise) continue
    const met = event.payload.met !== false
    const base =
      exercise.timeSeconds != null ? Math.ceil(exercise.timeSeconds / HOLD_TICK_SECONDS) * HOLD_TICK_DAMAGE : HIT_DAMAGE
    damage += met ? base * CRIT_MULTIPLIER : base
    hits += 1
    if (met) crits += 1
  }
  const perfectBonus = plan.exercises.length > 0 && flowStatus(plan, events).perfect
  if (perfectBonus) damage += PERFECT_BONUS
  return { damage, hits, crits, perfectBonus }
}

// --- Weekly state ----------------------------------------------------------

export type BossHistory = {
  plans: readonly SessionPlan[]
  results: readonly SessionResult[]
  events: readonly SessionEvent[]
}

export type BossDamageEntry = {
  // Local day key (YYYY-MM-DD) this damage landed on.
  date: string
  hits: number
  crits: number
  damage: number
}

export type BossState = {
  boss: Boss
  // Remaining HP, clamped at zero -- never negative.
  hp: number
  maxHp: number
  // One entry per day this week with any landed hit, oldest first.
  damageLog: BossDamageEntry[]
  // When the boss's HP first reached zero this week, or null if it's still
  // standing (or simply not fought yet).
  defeatedAt: string | null
}

type WeekProgress = BossState & { defeatedSessionId: string | null }

// Shared by bossState (one week, "now") and bossDefeats (every week in
// history): tallies every finished session that landed in the Monday-start
// week containing `weekStart`, in order, against that week's boss HP.
function weekProgress(history: BossHistory, weeklyGoal: number, weekStart: Date): WeekProgress {
  const boss = bossForWeek(weekStart)
  const maxHp = Math.max(1, weeklyGoal) * HP_PER_GOAL_DAY
  const weekKey = localDayKey(mondayStart(weekStart))

  const planById = new Map(history.plans.map((p) => [p.id, p]))
  const eventsBySession = new Map<string, SessionEvent[]>()
  for (const event of history.events) {
    const list = eventsBySession.get(event.sessionId) ?? []
    list.push(event)
    eventsBySession.set(event.sessionId, list)
  }

  const weekResults = history.results
    .filter((r) => localDayKey(mondayStart(new Date(r.endedAt))) === weekKey)
    .sort((a, b) => a.endedAt.localeCompare(b.endedAt))

  let cumulative = 0
  let defeatedAt: string | null = null
  let defeatedSessionId: string | null = null
  const byDay = new Map<string, BossDamageEntry>()
  const dayOrder: string[] = []

  for (const result of weekResults) {
    const plan = planById.get(result.planId)
    if (!plan) continue
    const { damage, hits, crits } = damageFromSession(plan, eventsBySession.get(result.sessionId) ?? [])
    if (hits === 0) continue

    const dayKey = localDayKey(new Date(result.endedAt))
    const entry = byDay.get(dayKey)
    if (entry) {
      entry.hits += hits
      entry.crits += crits
      entry.damage += damage
    } else {
      byDay.set(dayKey, { date: dayKey, hits, crits, damage })
      dayOrder.push(dayKey)
    }

    const wasDefeated = cumulative >= maxHp
    cumulative += damage
    if (!wasDefeated && cumulative >= maxHp && defeatedAt === null) {
      defeatedAt = result.endedAt
      defeatedSessionId = result.sessionId
    }
  }

  return {
    boss,
    hp: Math.max(0, maxHp - cumulative),
    maxHp,
    damageLog: dayOrder.map((d) => byDay.get(d)!),
    defeatedAt,
    defeatedSessionId,
  }
}

// This week's boss fight (the Monday-start week containing `now`): who it
// is, how much HP is left, the day-by-day hit log, and whether it's down.
export function bossState(history: BossHistory, weeklyGoal: number, now: Date): BossState {
  const { defeatedSessionId: _unused, ...state } = weekProgress(history, weeklyGoal, now)
  return state
}

export type BossDefeat = {
  weekStart: string
  bossId: string
  defeatedAt: string
  sessionId: string
}

// Every week in history that was actually defeated, oldest first -- the
// coordinator awards one carrot payout per entry here. `weeklyGoal` is
// applied to every past week alike (matching stats.ts's calculateWeekStreak,
// which does the same for the weekly streak), since history doesn't keep a
// per-week goal of its own.
export function bossDefeats(history: BossHistory, weeklyGoal: number): BossDefeat[] {
  const weekKeys = new Set(history.results.map((r) => localDayKey(mondayStart(new Date(r.endedAt)))))
  const defeats: BossDefeat[] = []
  for (const weekKey of weekKeys) {
    const progress = weekProgress(history, weeklyGoal, parseDayKey(weekKey))
    if (progress.defeatedAt && progress.defeatedSessionId) {
      defeats.push({ weekStart: weekKey, bossId: progress.boss.id, defeatedAt: progress.defeatedAt, sessionId: progress.defeatedSessionId })
    }
  }
  return defeats.sort((a, b) => a.weekStart.localeCompare(b.weekStart))
}

export type BossWeekSummary = {
  weekStart: string
  boss: Boss
  defeatedAt: string | null
}

// Every week before `now`'s own week with at least one finished session,
// newest first -- the Boss screen's "past bosses" gallery. A week that met
// the HP is defeated; the rest simply weren't -- shown as a gentle
// "escaped", never a loss (CLAUDE.md: an undefeated boss just leaves at
// week's end with a friendly goodbye, no penalty).
export function pastBossWeeks(history: BossHistory, weeklyGoal: number, now: Date): BossWeekSummary[] {
  const currentWeekKey = localDayKey(mondayStart(now))
  const weekKeys = new Set(
    history.results.map((r) => localDayKey(mondayStart(new Date(r.endedAt)))).filter((key) => key !== currentWeekKey)
  )
  const summaries = [...weekKeys].map((weekKey) => {
    const progress = weekProgress(history, weeklyGoal, parseDayKey(weekKey))
    return { weekStart: weekKey, boss: progress.boss, defeatedAt: progress.defeatedAt }
  })
  return summaries.sort((a, b) => b.weekStart.localeCompare(a.weekStart))
}
