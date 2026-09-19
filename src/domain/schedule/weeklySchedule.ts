// Weekly plan: which routine (template id) or rest each weekday holds.
// Keyed by JS getDay() (0 = Sunday). null = nothing chosen for that day.
export type DayPlan = string | 'rest' | null
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6
export type WeeklySchedule = Record<Weekday, DayPlan>

export const EMPTY_SCHEDULE: WeeklySchedule = { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null }

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
}

export type TodayResolution =
  | { kind: 'scheduled'; templateId: string }
  | { kind: 'rest' }
  | { kind: 'unscheduled'; templateId: string }

// Pure. A day that was never set falls back to whatever the A/B rotation
// would have suggested, so a partial schedule never blanks Today.
export function resolveToday(schedule: WeeklySchedule | null, now: Date, rotationSuggestion: string): TodayResolution {
  const plan = schedule?.[now.getDay() as Weekday] ?? null
  if (plan === 'rest') return { kind: 'rest' }
  if (plan) return { kind: 'scheduled', templateId: plan }
  return { kind: 'unscheduled', templateId: rotationSuggestion }
}

export function isScheduleSet(schedule: WeeklySchedule | null): boolean {
  return schedule != null && Object.values(schedule).some((plan) => plan != null)
}
