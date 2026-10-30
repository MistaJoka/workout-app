// Workout reminders for the installed PWA (loaded by sw.js via importScripts).
//
// A browser can't schedule a notification for a set time without a push
// server, which this app doesn't have. Instead the app writes its rolling
// reminder plan (src/infrastructure/webReminders.ts, same planner as the
// Android app) into the small IndexedDB below, and Chrome's Periodic
// Background Sync wakes this worker now and then. Each wake shows the
// reminders that are due today and drops anything from an earlier day.
// Chrome decides how often it wakes us, so a reminder can come late. It is
// never shown twice: a shown reminder is removed from the plan.
//
// Kept free of sw.js globals so vitest can load it with a fake `self`.
;(function (root) {
  const DB_NAME = 'workout-app-reminders'
  const STORE = 'plans'

  function localDay(date) {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  // reminders: [{ day: 'YYYY-MM-DD' local, at: ISO string, title, body }]
  // -> { due, keep }: due = at or past its time today; keep = still ahead.
  // Reminders from an earlier day are dropped silently: a stale nudge
  // after midnight helps nobody.
  function splitDue(reminders, now) {
    const today = localDay(now)
    const due = []
    const keep = []
    for (const r of reminders) {
      if (r.day < today) continue
      if (r.day === today && new Date(r.at).getTime() <= now.getTime()) due.push(r)
      else keep.push(r)
    }
    return { due, keep }
  }

  function openDb() {
    return new Promise((resolve, reject) => {
      const req = root.indexedDB.open(DB_NAME, 1)
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'profile' })
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  }

  function txDone(tx) {
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  }

  async function showDueReminders(now = new Date()) {
    const db = await openDb()
    try {
      const plans = await new Promise((resolve, reject) => {
        const req = db.transaction(STORE).objectStore(STORE).getAll()
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      })
      for (const plan of plans) {
        const { due, keep } = splitDue(plan.reminders || [], now)
        if (due.length === 0 && keep.length === (plan.reminders || []).length) continue
        // Save first: if showing fails we lose one nudge, never repeat one.
        const tx = db.transaction(STORE, 'readwrite')
        tx.objectStore(STORE).put({ ...plan, reminders: keep })
        await txDone(tx)
        // Several due today (only possible for one day) collapse into one.
        const last = due[due.length - 1]
        if (last) {
          await root.registration.showNotification(last.title, {
            body: last.body,
            tag: `workout-reminder-${plan.profile}-${last.day}`,
            icon: `${root.registration.scope}icons/icon-192.png`,
            data: { url: `${root.registration.scope}#/` },
          })
        }
      }
    } finally {
      db.close()
    }
  }

  root.workoutReminders = { DB_NAME, STORE, localDay, splitDue, showDueReminders }
})(self)
