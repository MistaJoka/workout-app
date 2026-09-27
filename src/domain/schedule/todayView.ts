import type { SessionResult } from '../session/types'
import type { Weekday, WeeklySchedule } from './weeklySchedule'

// What Today shows, derived purely from history, the weekly plan and the
// clock. Nothing here is judgment: a planned day that passed without a
// workout stays "planned" (a sprout), never "missed".

export type DayMark = 'done' | 'planned' | 'rest' | 'open'

export type WeekDay = {
  weekday: Weekday
  letter: string
  isToday: boolean
  mark: DayMark
  count: number
}

export type TodayMode = 'resume' | 'done' | 'rest' | 'ready'

const MONDAY_FIRST: Weekday[] = [1, 2, 3, 4, 5, 6, 0]
const LETTERS: Record<Weekday, string> = { 0: 'S', 1: 'M', 2: 'T', 3: 'W', 4: 'T', 5: 'F', 6: 'S' }

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

function mondayOf(date: Date): Date {
  const offset = date.getDay() === 0 ? -6 : 1 - date.getDay()
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + offset)
}

export function buildWeek(results: readonly SessionResult[], schedule: WeeklySchedule | null, now: Date): WeekDay[] {
  const counts = new Map<string, number>()
  for (const r of results) {
    const key = dayKey(new Date(r.endedAt))
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const monday = mondayOf(now)
  const todayKey = dayKey(now)
  return MONDAY_FIRST.map((weekday, i) => {
    const date = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)
    const count = counts.get(dayKey(date)) ?? 0
    const plan = schedule?.[weekday] ?? null
    const mark: DayMark = count > 0 ? 'done' : plan === 'rest' ? 'rest' : plan ? 'planned' : 'open'
    return { weekday, letter: LETTERS[weekday], isToday: dayKey(date) === todayKey, mark, count }
  })
}

export function workoutsToday(results: readonly SessionResult[], now: Date): SessionResult[] {
  const key = dayKey(now)
  return results.filter((r) => dayKey(new Date(r.endedAt)) === key).sort((a, b) => b.endedAt.localeCompare(a.endedAt))
}

export function todayMode(input: { inProgress: boolean; doneToday: boolean; restToday: boolean }): TodayMode {
  if (input.inProgress) return 'resume'
  if (input.doneToday) return 'done'
  if (input.restToday) return 'rest'
  return 'ready'
}

export function setsDone(
  plan: { exercises: readonly { sets: number }[] },
  state: { currentExerciseIndex: number; currentSetNumber: number }
): { done: number; total: number } {
  const total = plan.exercises.reduce((sum, e) => sum + e.sets, 0)
  const before = plan.exercises.slice(0, state.currentExerciseIndex).reduce((sum, e) => sum + e.sets, 0)
  return { done: Math.min(total, before + Math.max(0, state.currentSetNumber - 1)), total }
}
