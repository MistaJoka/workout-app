import { getSetting, setSetting } from './settingsRepository'
import { withoutTemplate, type WeeklySchedule } from '../../../domain/schedule/weeklySchedule'

const KEY = 'weeklySchedule'

export async function getWeeklySchedule(): Promise<WeeklySchedule | null> {
  return (await getSetting<WeeklySchedule>(KEY)) ?? null
}

export async function saveWeeklySchedule(schedule: WeeklySchedule): Promise<void> {
  await setSetting(KEY, schedule)
}

// A deleted routine leaves every day it was planned on unplanned.
export async function removeTemplateFromSchedule(templateId: string): Promise<void> {
  const schedule = await getWeeklySchedule()
  if (!schedule) return
  const next = withoutTemplate(schedule, templateId)
  if (Object.values(next).some((plan, i) => plan !== Object.values(schedule)[i])) await saveWeeklySchedule(next)
}
