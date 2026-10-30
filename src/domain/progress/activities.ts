// Other activity (owner decision 2026-10-29): a workout done outside the app
// (a walk, a class, a swim). It counts as a workout day toward the weekly
// goal and the weekly streak, and nothing else: it is never progression
// evidence, familiarity, a personal record or exercise history, and it earns
// none of the per-workout rewards (XP, carrots, boss hits, badges, garden
// flowers), which stay tied to workouts done in the app. Pure.

export type ActivityKind = 'walk' | 'run' | 'bike' | 'swim' | 'yoga' | 'class' | 'sport' | 'other'

export const ACTIVITY_KINDS: readonly { id: ActivityKind; name: string; emoji: string }[] = [
  { id: 'walk', name: 'Walk', emoji: '🚶' },
  { id: 'run', name: 'Run', emoji: '🏃' },
  { id: 'bike', name: 'Bike', emoji: '🚴' },
  { id: 'swim', name: 'Swim', emoji: '🏊' },
  { id: 'yoga', name: 'Yoga', emoji: '🧘' },
  { id: 'class', name: 'Class', emoji: '🤸' },
  { id: 'sport', name: 'Sport', emoji: '⚽' },
  { id: 'other', name: 'Other', emoji: '✨' },
]

const KIND_IDS = new Set<string>(ACTIVITY_KINDS.map((k) => k.id))

export function isActivityKind(value: unknown): value is ActivityKind {
  return typeof value === 'string' && KIND_IDS.has(value)
}

export function activityKind(id: ActivityKind): { id: ActivityKind; name: string; emoji: string } {
  return ACTIVITY_KINDS.find((k) => k.id === id) ?? ACTIVITY_KINDS[ACTIVITY_KINDS.length - 1]
}

// One logged activity. `day` is the local calendar day it happened
// (YYYY-MM-DD), which may be up to ACTIVITY_BACK_DAYS before it was logged.
// Deleting keeps the row with `deletedAt` set (a tombstone), so importing
// an older backup can't bring it back. `weeklyGoal` is the goal at the time
// it was logged: like a SessionPlan's, it pins the goal for its week if it
// is that week's first entry (weekGoals.ts).
export type ActivityEntry = {
  id: string
  kind: ActivityKind
  minutes: number
  day: string
  loggedAt: string
  updatedAt: string
  deletedAt: string | null
  weeklyGoal?: number
}

export const ACTIVITY_MINUTE_CHOICES = [15, 30, 45, 60] as const
export const DEFAULT_ACTIVITY_MINUTES = 30
export const ACTIVITY_MINUTE_STEP = 5
export const MAX_ACTIVITY_MINUTES = 600
// Today plus this many days back.
export const ACTIVITY_BACK_DAYS = 7

export function localDayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function dayKeyToDate(day: string): Date {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// When an activity "happened" for week/day bucketing: local noon of its
// day, far from any midnight or DST edge.
export function activityDate(day: string): Date {
  const date = dayKeyToDate(day)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12)
}

// Today first, then each day back, as day keys.
export function activityDayChoices(now: Date): string[] {
  return Array.from({ length: ACTIVITY_BACK_DAYS + 1 }, (_, i) =>
    localDayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i))
  )
}

// -1/+1 by ACTIVITY_MINUTE_STEP, snapped to the step, within 5..MAX.
export function adjustMinutes(minutes: number, direction: 1 | -1): number {
  const snapped =
    direction > 0
      ? Math.floor(minutes / ACTIVITY_MINUTE_STEP) * ACTIVITY_MINUTE_STEP + ACTIVITY_MINUTE_STEP
      : Math.ceil(minutes / ACTIVITY_MINUTE_STEP) * ACTIVITY_MINUTE_STEP - ACTIVITY_MINUTE_STEP
  return Math.min(MAX_ACTIVITY_MINUTES, Math.max(ACTIVITY_MINUTE_STEP, snapped))
}

// The first problem with an activity about to be logged, or null.
export function validateActivityInput(
  input: { kind: ActivityKind; minutes: number; day: string },
  now: Date
): 'kind' | 'minutes' | 'day' | null {
  if (!isActivityKind(input.kind)) return 'kind'
  if (!Number.isInteger(input.minutes) || input.minutes < 1 || input.minutes > MAX_ACTIVITY_MINUTES) return 'minutes'
  if (!activityDayChoices(now).includes(input.day)) return 'day'
  return null
}

export function activityLabel(entry: Pick<ActivityEntry, 'kind' | 'minutes'>): string {
  return `${activityKind(entry.kind).name}, ${entry.minutes} min`
}

// The activities that count: tombstones dropped, newest day first (then
// newest logged).
export function liveActivities<T extends ActivityEntry>(entries: readonly T[]): T[] {
  return entries
    .filter((a) => a.deletedAt == null)
    .sort((a, b) => b.day.localeCompare(a.day) || b.loggedAt.localeCompare(a.loggedAt))
}

// Backup merge for one id: newest copy wins, but a deletion on either side
// sticks (and keeps the later updatedAt), so an import can never revive it.
export function mergeActivity(local: ActivityEntry | undefined, incoming: ActivityEntry): ActivityEntry {
  if (!local) return incoming
  const newer = incoming.updatedAt > local.updatedAt ? incoming : local
  const older = newer === incoming ? local : incoming
  const deletedAt = newer.deletedAt ?? older.deletedAt ?? null
  return { ...newer, deletedAt }
}
