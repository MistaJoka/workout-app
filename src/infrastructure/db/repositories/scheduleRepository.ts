import { getSetting, setSetting } from './settingsRepository'
import type { WeeklySchedule } from '../../../domain/schedule/weeklySchedule'

const KEY = 'weeklySchedule'

export async function getWeeklySchedule(): Promise<WeeklySchedule | null> {
  return (await getSetting<WeeklySchedule>(KEY)) ?? null
}

export async function saveWeeklySchedule(schedule: WeeklySchedule): Promise<void> {
  await setSetting(KEY, schedule)
}
