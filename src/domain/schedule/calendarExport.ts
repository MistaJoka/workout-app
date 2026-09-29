import type { WeeklySchedule, Weekday } from './weeklySchedule'

// Reminders without a server: iOS has no local-scheduled-notification API for
// web apps and push needs a backend, so the weekly plan is exported as an
// .ics file and the phone's own Calendar does the reminding. One weekly
// repeating event per planned workout day, with an alert at start time.
// Times are floating (no time zone), so the event stays at the chosen local
// time wherever the phone is.

export type TimeOfDay = { hour: number; minute: number }

const BYDAY: Record<Weekday, string> = { 0: 'SU', 1: 'MO', 2: 'TU', 3: 'WE', 4: 'TH', 5: 'FR', 6: 'SA' }
const WEEKDAYS: Weekday[] = [1, 2, 3, 4, 5, 6, 0]

// The first moment on or after `now` that falls on `weekday` at `time`.
export function nextOccurrence(now: Date, weekday: Weekday, time: TimeOfDay): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), time.hour, time.minute, 0, 0)
  let ahead = (weekday - now.getDay() + 7) % 7
  if (ahead === 0 && d.getTime() <= now.getTime()) ahead = 7
  d.setDate(d.getDate() + ahead)
  return d
}

const pad = (n: number) => String(n).padStart(2, '0')

function floating(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`
}

function utcStamp(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
}

function escapeText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
}

// Pure. Returns null when no day holds a workout that still exists (nothing
// to remind about). `names` maps template id to the name to show.
export function buildScheduleIcs(
  schedule: WeeklySchedule,
  names: ReadonlyMap<string, string>,
  time: TimeOfDay,
  now: Date
): string | null {
  const events: string[][] = []
  for (const day of WEEKDAYS) {
    const plan = schedule[day]
    if (plan == null || plan === 'rest') continue
    const name = names.get(plan)
    if (!name) continue
    events.push([
      'BEGIN:VEVENT',
      `UID:workout-app-weekday-${day}@workout-app`,
      `DTSTAMP:${utcStamp(now)}`,
      `DTSTART:${floating(nextOccurrence(now, day, time))}`,
      'DURATION:PT30M',
      `RRULE:FREQ=WEEKLY;BYDAY=${BYDAY[day]}`,
      `SUMMARY:${escapeText(name)}`,
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeText(`Time for ${name}`)}`,
      'TRIGGER:PT0M',
      'END:VALARM',
      'END:VEVENT',
    ])
  }
  if (events.length === 0) return null
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//workout-app//weekly plan//EN', 'CALSCALE:GREGORIAN', ...events.flat(), 'END:VCALENDAR']
  return lines.join('\r\n') + '\r\n'
}
