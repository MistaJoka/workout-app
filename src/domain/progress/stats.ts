import type { SessionResult } from '../session/types'
import type { ExerciseHistoryPoint, PersonalRecord, SetRecord, WeekTotal } from './types'

// Behaviorally adapted from ischys-app/Ischys (MIT) stats/records/streak
// modules and open-workout/openworkout-mobile (MIT) streak/stats —
// independent implementation against local SetRecord/SessionResult shapes.
// Bodyweight sets: volume is met reps / met seconds and a "record" is the
// best met prescription. Weighted sets: volume adds weight×reps (kg), the
// record is the heaviest met load, and estimateOneRepMax uses Epley.

export function calculateVolume(records: readonly SetRecord[]): { reps: number; seconds: number; loadKg: number } {
  let reps = 0
  let seconds = 0
  let loadKg = 0
  for (const record of records) {
    if (!record.met) continue
    const done = record.performedReps ?? record.prescribedReps
    if (done != null) {
      reps += done
      if (record.weight != null) loadKg += record.weight * done
    } else if (record.prescribedSeconds != null) seconds += record.prescribedSeconds
  }
  return { reps, seconds, loadKg }
}

// Epley: 1RM ≈ w × (1 + reps/30). Standard across Ischys/github-fitness.
export function estimateOneRepMax(weightKg: number, reps: number): number {
  if (reps <= 0) return 0
  if (reps === 1) return weightKg
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10
}

function metric(record: SetRecord): { unit: 'reps' | 'seconds' | 'kg'; value: number; reps?: number } | null {
  if (record.weight != null && (record.performedReps ?? record.prescribedReps) != null) {
    return { unit: 'kg', value: record.weight, reps: record.performedReps ?? record.prescribedReps }
  }
  if (record.prescribedReps != null) return { unit: 'reps', value: record.performedReps ?? record.prescribedReps }
  if (record.prescribedSeconds != null) return { unit: 'seconds', value: record.prescribedSeconds }
  return null
}

// Only strictly improved values move a record (Ischys I8), so on a tie the
// earlier session keeps it. Missed sets never set a record. For weighted
// work the record is the heaviest met load; equal loads with more reps
// also count as an improvement.
export function detectPersonalRecords(records: readonly SetRecord[]): Map<string, PersonalRecord> {
  const best = new Map<string, PersonalRecord>()
  const ordered = [...records].sort((a, b) => a.sessionEndedAt.localeCompare(b.sessionEndedAt))
  for (const record of ordered) {
    if (!record.met) continue
    const m = metric(record)
    if (!m) continue
    const current = best.get(record.exerciseId)
    if (current) {
      const better =
        m.unit === 'kg' && current.unit === 'kg'
          ? m.value > current.value || (m.value === current.value && (m.reps ?? 0) > (current.reps ?? 0))
          : m.value > current.value
      if (!better) continue
    }
    best.set(record.exerciseId, {
      exerciseId: record.exerciseId,
      exerciseName: record.exerciseName,
      unit: m.unit,
      value: m.value,
      ...(m.reps != null ? { reps: m.reps } : {}),
      sessionId: record.sessionId,
      sessionEndedAt: record.sessionEndedAt,
    })
  }
  return best
}

// Calendar-date arithmetic, never millisecond subtraction, so DST shifts
// can't move a day boundary (Ischys I10).
function localDayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function shiftDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

// Consecutive local days with at least one completed session, ending today
// or — grace rule, Ischys I9 — yesterday. A rest day today keeps the streak.
export function calculateStreak(results: readonly SessionResult[], now: Date): number {
  const days = new Set(results.map((r) => localDayKey(new Date(r.endedAt))))
  if (days.size === 0) return 0
  let cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (!days.has(localDayKey(cursor))) {
    cursor = shiftDays(cursor, -1)
    if (!days.has(localDayKey(cursor))) return 0
  }
  let streak = 0
  while (days.has(localDayKey(cursor))) {
    streak += 1
    cursor = shiftDays(cursor, -1)
  }
  return streak
}

function isoWeekStart(date: Date): Date {
  const day = date.getDay() // 0 = Sunday
  const offset = day === 0 ? -6 : 1 - day
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + offset)
}

export function weeklyTotals(results: readonly SessionResult[], now: Date, weeks = 8): WeekTotal[] {
  const thisWeek = isoWeekStart(now)
  const buckets: WeekTotal[] = Array.from({ length: weeks }, (_, i) => ({
    weekStart: localDayKey(shiftDays(thisWeek, -7 * (weeks - 1 - i))),
    sessions: 0,
  }))
  const index = new Map(buckets.map((b, i) => [b.weekStart, i]))
  for (const result of results) {
    const key = localDayKey(isoWeekStart(new Date(result.endedAt)))
    const i = index.get(key)
    if (i != null) buckets[i].sessions += 1
  }
  return buckets
}

export function perExerciseHistory(records: readonly SetRecord[], exerciseId: string): ExerciseHistoryPoint[] {
  const bySession = new Map<string, ExerciseHistoryPoint>()
  for (const record of records) {
    if (record.exerciseId !== exerciseId) continue
    const m = metric(record)
    if (!m) continue
    const point = bySession.get(record.sessionId) ?? {
      sessionId: record.sessionId,
      sessionEndedAt: record.sessionEndedAt,
      unit: m.unit,
      prescribed: m.value,
      ...(m.reps != null ? { reps: m.reps } : {}),
      metSets: 0,
      totalSets: 0,
    }
    // Later sets win so the point reflects the load/reps the session ended on.
    point.prescribed = m.value
    if (m.reps != null) point.reps = m.reps
    point.totalSets += 1
    if (record.met) point.metSets += 1
    bySession.set(record.sessionId, point)
  }
  return [...bySession.values()].sort((a, b) => a.sessionEndedAt.localeCompare(b.sessionEndedAt))
}
