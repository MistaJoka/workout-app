import type { PlannedReminder } from '../domain/schedule/reminderPlan'

// Workout reminders for the installed PWA (Chrome on Android). A browser
// can't schedule a notification for an exact time without a push server,
// so the app saves its reminder plan where the service worker can read it
// (public/sw-reminders.js) and asks Chrome for Periodic Background Sync.
// Chrome wakes the worker on its own timetable (more often the more the app
// is used), and each wake shows whatever is due today. Reminders can come
// late; they never repeat. Browsers without Periodic Background Sync
// (Safari, Firefox, a plain browser tab) keep the Calendar export instead.

// Must match public/sw-reminders.js.
export const WEB_REMINDER_DB = 'workout-app-reminders'
const STORE = 'plans'
export const PERIODIC_SYNC_TAG = 'workout-reminders'
// Chrome treats this as a floor and usually waits longer.
const MIN_INTERVAL_MS = 60 * 60 * 1000

export type StoredReminder = { day: string; at: string; title: string; body: string }

type PeriodicSyncRegistration = ServiceWorkerRegistration & {
  periodicSync?: { register(tag: string, options: { minInterval: number }): Promise<void> }
}

export function webRemindersSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'Notification' in window &&
    'PeriodicSyncManager' in window
  )
}

export type WebPermission = 'granted' | 'denied' | 'prompt'

export function webReminderPermission(): WebPermission {
  const p = Notification.permission
  return p === 'granted' ? 'granted' : p === 'denied' ? 'denied' : 'prompt'
}

export async function requestWebReminderPermission(): Promise<WebPermission> {
  const p = await Notification.requestPermission()
  return p === 'granted' ? 'granted' : p === 'denied' ? 'denied' : 'prompt'
}

export function localDay(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function toStored(plan: readonly PlannedReminder[]): StoredReminder[] {
  return plan.map((r) => ({ day: localDay(r.at), at: r.at.toISOString(), title: r.title, body: r.body }))
}

function openDb(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = factory.open(WEB_REMINDER_DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'profile' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

// Replaces this profile's plan (an empty list turns its reminders off).
export async function saveWebReminderPlan(
  profile: string,
  reminders: StoredReminder[],
  factory: IDBFactory = indexedDB,
): Promise<void> {
  const db = await openDb(factory)
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put({ profile, reminders })
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

export async function readWebReminderPlan(profile: string, factory: IDBFactory = indexedDB): Promise<StoredReminder[]> {
  const db = await openDb(factory)
  try {
    return await new Promise((resolve, reject) => {
      const req = db.transaction(STORE).objectStore(STORE).get(profile)
      req.onsuccess = () => resolve((req.result?.reminders as StoredReminder[] | undefined) ?? [])
      req.onerror = () => reject(req.error)
    })
  } finally {
    db.close()
  }
}

// 'ok' once Chrome agreed to wake the app. Chrome only allows this for an
// installed app, so a browser tab gets 'needs-install'.
export async function registerReminderWakeups(): Promise<'ok' | 'needs-install'> {
  try {
    // `ready` never settles without an active worker (a dev server), so
    // don't wait on it forever.
    const reg = (await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('no service worker')), 5000)),
    ])) as PeriodicSyncRegistration
    if (!reg.periodicSync) return 'needs-install'
    await reg.periodicSync.register(PERIODIC_SYNC_TAG, { minInterval: MIN_INTERVAL_MS })
    return 'ok'
  } catch {
    return 'needs-install'
  }
}
