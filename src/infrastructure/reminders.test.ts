import { beforeEach, describe, expect, it, vi } from 'vitest'

const plugin = vi.hoisted(() => ({
  cancel: vi.fn(async () => undefined),
  schedule: vi.fn(async () => ({ notifications: [] })),
  createChannel: vi.fn(async () => undefined),
  checkPermissions: vi.fn(async () => ({ display: 'granted' })),
  requestPermissions: vi.fn(async () => ({ display: 'granted' })),
  addListener: vi.fn(async () => ({ remove: async () => undefined })),
}))
vi.mock('@capacitor/local-notifications', () => ({ LocalNotifications: plugin }))
vi.mock('../presentation/appContext', () => ({ isNativeApp: () => true }))

import { db } from './db/schema'
import { saveWeeklySchedule } from './db/repositories/scheduleRepository'
import { saveReminderSettings, syncReminders } from './reminders'
import { EMPTY_SCHEDULE } from '../domain/schedule/weeklySchedule'
import { REMINDER_ID_BASE, REMINDER_WINDOW_DAYS } from '../domain/schedule/reminderPlan'

// 2026-10-05 is a Monday.
const MONDAY_9AM = new Date(2026, 9, 5, 9, 0)
type Scheduled = { notifications: { id: number; body: string; schedule: { at: Date }; isExactNotification?: boolean }[] }
const scheduled = () => (plugin.schedule.mock.calls.at(-1) as unknown as [Scheduled] | undefined)?.[0].notifications ?? []

beforeEach(async () => {
  vi.clearAllMocks()
  plugin.checkPermissions.mockResolvedValue({ display: 'granted' })
  await db.settings.clear()
  await db.sessionResults.clear()
  await saveWeeklySchedule({ ...EMPTY_SCHEDULE, 1: 'fs.full-body-a', 3: 'rest' })
})

describe('syncReminders', () => {
  it('always clears every pending reminder first', async () => {
    await syncReminders(() => MONDAY_9AM)
    const ids = (plugin.cancel.mock.calls[0] as unknown as [{ notifications: { id: number }[] }])[0].notifications.map((n) => n.id)
    expect(ids).toEqual(Array.from({ length: REMINDER_WINDOW_DAYS }, (_, i) => REMINDER_ID_BASE + i))
  })

  it('schedules nothing while reminders are off', async () => {
    await syncReminders(() => MONDAY_9AM)
    expect(plugin.schedule).not.toHaveBeenCalled()
  })

  it('schedules the planned workout days when on', async () => {
    await saveReminderSettings({ enabled: true, time: { hour: 18, minute: 0 } })
    await syncReminders(() => MONDAY_9AM)
    expect(scheduled().map((n) => n.schedule.at)).toEqual([new Date(2026, 9, 5, 18, 0), new Date(2026, 9, 12, 18, 0)])
    expect(scheduled()[0].body).toBe('Full-Body A today. Tap to start.')
  })

  it("never asks for exact alarms (that opens Android's settings on every sync)", async () => {
    await saveReminderSettings({ enabled: true, time: { hour: 18, minute: 0 } })
    await syncReminders(() => MONDAY_9AM)
    expect(scheduled().every((n) => n.isExactNotification === false)).toBe(true)
  })

  it("drops today's reminder once a workout finished today", async () => {
    await saveReminderSettings({ enabled: true, time: { hour: 18, minute: 0 } })
    await db.sessionResults.add({
      sessionId: 's1',
      planId: 's1',
      status: 'COMPLETED',
      startedAt: new Date(2026, 9, 5, 8, 0).toISOString(),
      endedAt: new Date(2026, 9, 5, 8, 30).toISOString(),
      totalSetsCompleted: 6,
      totalSetsPlanned: 6,
    })
    await syncReminders(() => MONDAY_9AM)
    expect(scheduled().map((n) => n.schedule.at)).toEqual([new Date(2026, 9, 12, 18, 0)])
  })

  it('schedules nothing without notification permission', async () => {
    await saveReminderSettings({ enabled: true, time: { hour: 18, minute: 0 } })
    plugin.checkPermissions.mockResolvedValue({ display: 'denied' })
    await syncReminders(() => MONDAY_9AM)
    expect(plugin.cancel).toHaveBeenCalled()
    expect(plugin.schedule).not.toHaveBeenCalled()
  })
})
