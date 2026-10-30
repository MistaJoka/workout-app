import { readFileSync } from 'node:fs'
import path from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// The installed-PWA path: no Capacitor, Notification + Periodic Background
// Sync present. The plan goes to the small IndexedDB the service worker
// reads (public/sw-reminders.js), and that worker shows what's due.
vi.mock('../presentation/appContext', () => ({ isNativeApp: () => false }))

const register = vi.fn(async () => undefined)
const notification = { permission: 'granted' as NotificationPermission, requestPermission: vi.fn(async () => 'granted') }
vi.stubGlobal('Notification', notification)
const display = { standalone: true }
vi.stubGlobal('window', {
  Notification: notification,
  PeriodicSyncManager: function PeriodicSyncManager() {},
  matchMedia: (q: string) => ({ matches: q === '(display-mode: standalone)' && display.standalone }),
})
vi.stubGlobal('navigator', { serviceWorker: { ready: Promise.resolve({ periodicSync: { register } }) } })

import { db } from './db/schema'
import { saveWeeklySchedule } from './db/repositories/scheduleRepository'
import { remindersSupported, saveReminderSettings, syncReminders } from './reminders'
import { readWebReminderPlan, saveWebReminderPlan, toStored } from './webReminders'
import { activeDbName } from './profiles'
import { EMPTY_SCHEDULE } from '../domain/schedule/weeklySchedule'

// 2026-10-05 is a Monday.
const MONDAY_9AM = new Date(2026, 9, 5, 9, 0)
const profile = () => activeDbName()

beforeEach(async () => {
  register.mockClear()
  notification.permission = 'granted'
  await db.settings.clear()
  await db.sessionResults.clear()
  await saveWeeklySchedule({ ...EMPTY_SCHEDULE, 1: 'fs.full-body-a', 3: 'rest' })
  await saveWebReminderPlan(profile(), [])
})

describe('web reminders (installed PWA)', () => {
  it('counts as supported in the installed app where Periodic Background Sync exists', () => {
    expect(remindersSupported()).toBe(true)
  })

  it('is not offered in a plain browser tab (Calendar export stays there)', () => {
    display.standalone = false
    try {
      expect(remindersSupported()).toBe(false)
    } finally {
      display.standalone = true
    }
  })

  it('saves the planned days for the service worker and asks Chrome to wake the app', async () => {
    await saveReminderSettings({ enabled: true, time: { hour: 18, minute: 0 } })
    expect(await syncReminders(() => MONDAY_9AM)).toBe('ok')
    const stored = await readWebReminderPlan(profile())
    expect(stored.map((r) => r.day)).toEqual(['2026-10-05', '2026-10-12'])
    expect(stored[0].body).toBe('Full-Body A today. Tap to start.')
    expect(register).toHaveBeenCalledWith('workout-reminders', expect.objectContaining({ minInterval: expect.any(Number) }))
  })

  it('clears the saved plan when reminders are turned off', async () => {
    await saveReminderSettings({ enabled: true, time: { hour: 18, minute: 0 } })
    await syncReminders(() => MONDAY_9AM)
    await saveReminderSettings({ enabled: false, time: { hour: 18, minute: 0 } })
    expect(await syncReminders(() => MONDAY_9AM)).toBe('off')
    expect(await readWebReminderPlan(profile())).toEqual([])
  })

  it('saves nothing while notifications are blocked', async () => {
    await saveReminderSettings({ enabled: true, time: { hour: 18, minute: 0 } })
    notification.permission = 'denied'
    await syncReminders(() => MONDAY_9AM)
    expect(await readWebReminderPlan(profile())).toEqual([])
    expect(register).not.toHaveBeenCalled()
  })

  it("reports needs-install when Chrome won't wake a browser tab", async () => {
    await saveReminderSettings({ enabled: true, time: { hour: 18, minute: 0 } })
    register.mockRejectedValueOnce(new Error('NotAllowedError'))
    expect(await syncReminders(() => MONDAY_9AM)).toBe('needs-install')
    // The plan is still saved, so installing later only needs a re-sync.
    expect((await readWebReminderPlan(profile())).length).toBe(2)
  })
})

describe('service worker side (public/sw-reminders.js)', () => {
  type SwReminders = { showDueReminders(now: Date): Promise<void>; splitDue: (r: unknown[], now: Date) => { due: unknown[]; keep: unknown[] } }
  const showNotification = vi.fn(async () => undefined)
  function loadWorker(): SwReminders {
    const src = readFileSync(path.resolve(__dirname, '../../public/sw-reminders.js'), 'utf8')
    const fakeSelf: Record<string, unknown> = {
      indexedDB,
      registration: { scope: 'https://example.test/', showNotification },
    }
    new Function('self', src)(fakeSelf)
    return fakeSelf.workoutReminders as SwReminders
  }

  beforeEach(() => showNotification.mockClear())

  const plan = toStored([
    { id: 1, at: new Date(2026, 9, 4, 18, 0), templateId: 'a', title: 'Yesterday', body: 'old' },
    { id: 2, at: new Date(2026, 9, 5, 18, 0), templateId: 'a', title: 'Today', body: 'Full-Body A today. Tap to start.' },
    { id: 3, at: new Date(2026, 9, 12, 18, 0), templateId: 'a', title: 'Next week', body: 'later' },
  ])

  it('shows nothing before the time, the due one after, and never twice', async () => {
    const sw = loadWorker()
    await saveWebReminderPlan('p1', plan)

    await sw.showDueReminders(new Date(2026, 9, 5, 17, 0))
    expect(showNotification).not.toHaveBeenCalled()

    await sw.showDueReminders(new Date(2026, 9, 5, 19, 30))
    expect(showNotification).toHaveBeenCalledTimes(1)
    expect(showNotification).toHaveBeenCalledWith('Today', expect.objectContaining({ body: 'Full-Body A today. Tap to start.' }))

    await sw.showDueReminders(new Date(2026, 9, 5, 21, 0))
    expect(showNotification).toHaveBeenCalledTimes(1)
    expect((await readWebReminderPlan('p1')).map((r) => r.title)).toEqual(['Next week'])
  })

  it('drops a reminder whose day has passed without showing it', async () => {
    const sw = loadWorker()
    await saveWebReminderPlan('p2', plan)
    await sw.showDueReminders(new Date(2026, 9, 6, 8, 0))
    expect(showNotification).not.toHaveBeenCalled()
    expect((await readWebReminderPlan('p2')).map((r) => r.title)).toEqual(['Next week'])
  })

  it('agrees with the app on what a local day is', () => {
    const sw = loadWorker() as unknown as { localDay(d: Date): string }
    const at = new Date(2026, 0, 3, 23, 59)
    expect(sw.localDay(at)).toBe(toStored([{ id: 0, at, templateId: 'a', title: '', body: '' }])[0].day)
  })
})
