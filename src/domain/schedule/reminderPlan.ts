import type { TimeOfDay } from './calendarExport'
import type { WeeklySchedule, Weekday } from './weeklySchedule'

// Workout-day reminders for the Android app (infrastructure/reminders.ts
// hands this plan to the phone). Not a weekly repeat: a rolling window of
// one-off reminders, re-planned whenever the app opens, the week changes or
// a workout finishes. So a day she's already trained gets no ping, and if
// she stops opening the app the reminders simply run out instead of nagging.
// Rae's voice: warm, never guilt.

export const REMINDER_WINDOW_DAYS = 14
// Ids REMINDER_ID_BASE .. +REMINDER_WINDOW_DAYS-1 belong to these reminders.
export const REMINDER_ID_BASE = 4100

export type ReminderSettings = { enabled: boolean; time: TimeOfDay }
export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = { enabled: false, time: { hour: 18, minute: 0 } }

export type PlannedReminder = { id: number; at: Date; templateId: string; title: string; body: string }

const TITLES = [
  "Rae's ready when you are 🌸",
  'Your garden is waiting 🌱',
  "Rae's stretching already 🌸",
  'A little bloom today? 🌼',
]

export function planReminders(input: {
  schedule: WeeklySchedule | null
  // Template id -> name; a day whose routine is missing gets no reminder.
  names: ReadonlyMap<string, string>
  time: TimeOfDay
  now: Date
  doneToday: boolean
}): PlannedReminder[] {
  const { schedule, names, time, now, doneToday } = input
  if (!schedule) return []
  const out: PlannedReminder[] = []
  for (let offset = 0; offset < REMINDER_WINDOW_DAYS; offset++) {
    // Built from date parts, so the clock time holds across DST changes.
    const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, time.hour, time.minute, 0, 0)
    if (at.getTime() <= now.getTime()) continue
    if (offset === 0 && doneToday) continue
    const plan = schedule[at.getDay() as Weekday]
    if (plan == null || plan === 'rest') continue
    const name = names.get(plan)
    if (!name) continue
    out.push({
      id: REMINDER_ID_BASE + offset,
      at,
      templateId: plan,
      title: TITLES[dayNumber(at) % TITLES.length],
      body: `${name} today. Tap to start.`,
    })
  }
  return out
}

// Whole local days since the epoch, for a stable per-day pick.
function dayNumber(d: Date): number {
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000)
}
