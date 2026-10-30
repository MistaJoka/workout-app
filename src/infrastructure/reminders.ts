import { App as CapacitorApp } from '@capacitor/app'
import { LocalNotifications } from '@capacitor/local-notifications'
import { isNativeApp } from '../presentation/appContext'
import { listAllTemplates } from '../domain/content/catalog'
import {
  DEFAULT_REMINDER_SETTINGS,
  planReminders,
  REMINDER_ID_BASE,
  REMINDER_WINDOW_DAYS,
  type ReminderSettings,
} from '../domain/schedule/reminderPlan'
import { workoutsToday } from '../domain/schedule/todayView'
import { db } from './db/schema'
import { activeDbName } from './profiles'
import {
  registerReminderWakeups,
  requestWebReminderPermission,
  saveWebReminderPlan,
  toStored,
  webReminderPermission,
  webRemindersSupported,
} from './webReminders'
import { getSetting, setSetting } from './db/repositories/settingsRepository'
import { getWeeklySchedule } from './db/repositories/scheduleRepository'

// Workout-day reminders. The Android app schedules local notifications; the
// installed PWA hands the same plan to its service worker (webReminders.ts,
// best-effort timing). Anywhere else the Schedule screen keeps its "Add to
// Calendar" file.
// syncReminders() throws away every pending reminder and schedules a fresh
// plan (domain/schedule/reminderPlan.ts). It runs at launch, on resume,
// when the week or the reminder setting changes, and after a finish.

const KEY = 'reminders'
const CHANNEL_ID = 'workout-reminders'

export type ReminderPermission = 'granted' | 'denied' | 'prompt'

export async function getReminderSettings(): Promise<ReminderSettings> {
  return (await getSetting<ReminderSettings>(KEY)) ?? DEFAULT_REMINDER_SETTINGS
}

export async function saveReminderSettings(settings: ReminderSettings): Promise<void> {
  await setSetting(KEY, settings)
}

export function remindersSupported(): boolean {
  return isNativeApp() || webRemindersSupported()
}

// Web reminders arrive when Chrome next wakes the app, not on the minute.
export function remindersAreBestEffort(): boolean {
  return !isNativeApp()
}

export async function reminderPermission(): Promise<ReminderPermission> {
  if (!isNativeApp()) return webReminderPermission()
  const { display } = await LocalNotifications.checkPermissions()
  return display === 'granted' ? 'granted' : display === 'denied' ? 'denied' : 'prompt'
}

export async function requestReminderPermission(): Promise<ReminderPermission> {
  if (!isNativeApp()) return requestWebReminderPermission()
  const { display } = await LocalNotifications.requestPermissions()
  return display === 'granted' ? 'granted' : display === 'denied' ? 'denied' : 'prompt'
}

// One sync at a time: a launch sync and a Schedule save can overlap, and two
// cancel-then-schedule runs interleaving could leave a stale plan behind.
let queue: Promise<void> = Promise.resolve()

export function syncReminders(now: () => Date = () => new Date()): Promise<SyncOutcome> {
  if (!remindersSupported()) return Promise.resolve('off')
  const run = queue.then(() => syncNow(now()))
  queue = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

// What the last web sync achieved, for the Reminders card: 'needs-install'
// means Chrome won't wake a browser tab, only the installed app.
export type SyncOutcome = 'ok' | 'off' | 'needs-install'

async function syncNow(now: Date): Promise<SyncOutcome> {
  if (!isNativeApp()) return syncWeb(now)
  const ours = Array.from({ length: REMINDER_WINDOW_DAYS }, (_, i) => ({ id: REMINDER_ID_BASE + i }))
  await LocalNotifications.cancel({ notifications: ours })

  const plan = await currentPlan(now)
  if (plan.length === 0) return 'off'


  await LocalNotifications.createChannel({
    id: CHANNEL_ID,
    name: 'Workout reminders',
    description: 'A nudge from Rae on your planned workout days',
    importance: 4,
  })
  await LocalNotifications.schedule({
    notifications: plan.map((r) => ({
      id: r.id,
      title: r.title,
      body: r.body,
      channelId: CHANNEL_ID,
      smallIcon: 'ic_stat_bloom',
      iconColor: '#db2777',
      schedule: { at: r.at, allowWhileIdle: true },
      // Exact would make the plugin open Android's "Alarms & reminders"
      // settings on every sync. A nudge a few minutes late is fine.
      isExactNotification: false,
    })),
  })
  return 'ok'
}

// The plan both platforms use; empty while reminders are off or not allowed.
async function currentPlan(now: Date) {
  const settings = await getReminderSettings()
  if (!settings.enabled) return []
  if ((await reminderPermission()) !== 'granted') return []
  const [schedule, { curated, custom, herMix }, results] = await Promise.all([
    getWeeklySchedule(),
    listAllTemplates(),
    db.sessionResults.toArray(),
  ])
  return planReminders({
    schedule,
    names: new Map([...curated, ...custom, ...(herMix ? [herMix] : [])].map((t) => [t.id, t.name])),
    time: settings.time,
    now,
    doneToday: workoutsToday(results, now).length > 0,
  })
}

async function syncWeb(now: Date): Promise<SyncOutcome> {
  const plan = await currentPlan(now)
  // Always rewritten, so turning reminders off (or finishing today's
  // workout) takes effect at the very next wake.
  await saveWebReminderPlan(activeDbName(), toStored(plan))
  if (plan.length === 0) return 'off'
  return registerReminderWakeups()
}

// Tapping a reminder opens Today. Coming back to the app re-plans, since
// the day may have changed while it sat in the background.
export async function listenForReminders(): Promise<void> {
  if (!remindersSupported()) return
  if (!isNativeApp()) {
    // Re-plan whenever she comes back to the app: the day may have changed.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void syncReminders().catch(() => undefined)
    })
    await syncReminders().catch(() => undefined)
    return
  }
  try {
    await LocalNotifications.addListener('localNotificationActionPerformed', () => {
      window.location.hash = '#/'
    })
    await CapacitorApp.addListener('resume', () => void syncReminders().catch(() => undefined))
    await syncReminders()
  } catch {
    // Plugin unavailable or storage unreadable: no reminders, nothing else breaks.
  }
}
