import { dayKeyToDate, localDayKey } from '../domain/progress/activities'

// Day chips for logging an activity: "Today", "Yesterday", then the short
// weekday ("Mon"). The full date goes in `long` for the aria-label.
export function activityDayLabel(day: string, now: Date): { short: string; long: string } {
  const date = dayKeyToDate(day)
  const long = date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
  if (day === localDayKey(now)) return { short: 'Today', long: `Today, ${long}` }
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
  if (day === localDayKey(yesterday)) return { short: 'Yesterday', long: `Yesterday, ${long}` }
  return { short: date.toLocaleDateString(undefined, { weekday: 'short' }), long }
}

// 'YYYY-MM-DD' as "Oct 29", without the UTC shift new Date(day) has.
export function shortDay(day: string): string {
  return dayKeyToDate(day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
