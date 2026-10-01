import { isScheduleSet, type WeeklySchedule } from './weeklySchedule'

// Today's "Plan your week" card. The weekly goal and Calendar reminders both
// follow the plan, so it is offered until any day is planned. It waits for
// the first finished workout: the first open belongs to the Welcome card
// (which retires on that same first workout), so the two never stack.
export function shouldOfferPlanWeek(hasFinished: boolean, schedule: WeeklySchedule | null): boolean {
  return hasFinished && !isScheduleSet(schedule)
}
