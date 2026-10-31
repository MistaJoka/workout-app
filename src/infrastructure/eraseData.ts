import { db } from './db/schema'
import { activeDbName } from './profiles'
import { saveWebReminderPlan } from './webReminders'

// "Erase everything" for the active profile: every table in one transaction
// (all or nothing), then its web reminder plan, so the service worker can't
// keep notifying about workouts that no longer exist. The data is already
// gone by then, so a failure clearing the plan never reports the erase as
// failed.
export async function eraseActiveProfileData(): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) await table.clear()
  })
  await saveWebReminderPlan(activeDbName(), []).catch(() => {})
}
