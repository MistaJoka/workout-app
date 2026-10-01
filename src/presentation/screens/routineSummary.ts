import { estimateMinutes } from '../../domain/content/workoutEstimate'
import type { WorkoutTemplate } from '../../domain/content/types'
import { WEEKDAY_LABELS, type Weekday, type WeeklySchedule } from '../../domain/schedule/weeklySchedule'

// "5 moves, 10 sets, about 15 min" — the same estimate Today and Start use.
export function routineSummary(template: WorkoutTemplate): string {
  const moves = template.exercises.length
  const sets = template.exercises.reduce((sum, e) => sum + e.prescription.sets, 0)
  return `${moves} ${moves === 1 ? 'move' : 'moves'}, ${sets} ${sets === 1 ? 'set' : 'sets'}, about ${estimateMinutes(template)} min`
}

const MONDAY_FIRST: Weekday[] = [1, 2, 3, 4, 5, 6, 0]

// The weekdays this routine is planned on, Monday first ("Mon, Thu"), or
// null when it isn't on the weekly plan.
export function plannedDaysLabel(schedule: WeeklySchedule | null, templateId: string): string | null {
  if (!schedule) return null
  const days = MONDAY_FIRST.filter((d) => schedule[d] === templateId).map((d) => WEEKDAY_LABELS[d].slice(0, 3))
  return days.length > 0 ? days.join(', ') : null
}
