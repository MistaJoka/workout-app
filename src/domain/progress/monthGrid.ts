// One calendar month as Monday-start weeks for Progress's month view
// (MonthBlooms). Pure: the caller passes the finished workouts and "now".
// Days come from each workout's local end date, like WeekBlooms and the
// weekly streak, so a late-evening workout lands on the day it was done.

export type MonthRef = { year: number; month: number } // month: 0-11

export type MonthSession = { sessionId: string; endedAt: string }

export type MonthCell = {
  key: string // local YYYY-MM-DD
  day: number
  inMonth: boolean
  isToday: boolean
  isFuture: boolean
  sessions: MonthSession[] // newest first; empty on padding days
}

export type MonthGrid = { month: MonthRef; weeks: MonthCell[][]; doneDays: number }

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function shiftMonth(month: MonthRef, by: number): MonthRef {
  const d = new Date(month.year, month.month + by, 1)
  return { year: d.getFullYear(), month: d.getMonth() }
}

export function monthOf(date: Date): MonthRef {
  return { year: date.getFullYear(), month: date.getMonth() }
}

export function monthGrid(month: MonthRef, results: readonly MonthSession[], now: Date): MonthGrid {
  const byDay = new Map<string, MonthSession[]>()
  for (const r of results) {
    const key = dayKey(new Date(r.endedAt))
    const list = byDay.get(key) ?? []
    list.push(r)
    byDay.set(key, list)
  }
  for (const list of byDay.values()) list.sort((a, b) => b.endedAt.localeCompare(a.endedAt))

  const todayKey = dayKey(now)
  const first = new Date(month.year, month.month, 1)
  const lead = (first.getDay() + 6) % 7 // Monday = 0
  const daysInMonth = new Date(month.year, month.month + 1, 0).getDate()
  const total = Math.ceil((lead + daysInMonth) / 7) * 7

  const cells: MonthCell[] = []
  let doneDays = 0
  for (let i = 0; i < total; i++) {
    const date = new Date(month.year, month.month, 1 - lead + i)
    const key = dayKey(date)
    const inMonth = date.getMonth() === month.month
    const sessions = inMonth ? (byDay.get(key) ?? []) : []
    if (sessions.length > 0) doneDays++
    cells.push({ key, day: date.getDate(), inMonth, isToday: key === todayKey, isFuture: key > todayKey, sessions })
  }
  const weeks: MonthCell[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return { month, weeks, doneDays }
}
