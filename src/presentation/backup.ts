import { exportAll } from '../infrastructure/exportImport/exportImport'
import { saveBackup } from '../infrastructure/exportImport/downloadBackup'
import { setSetting } from '../infrastructure/db/repositories/settingsRepository'

export const LAST_EXPORT_KEY = 'lastExportAt'

// All history lives on one phone, and iOS may clear a home-screen app's
// storage. After this many days without a backup (and once there is a
// finished workout to lose), the app asks for one.
export const BACKUP_NUDGE_DAYS = 14

export function needsBackupNudge(lastExportAt: string | null, finishedWorkouts: number, now: Date = new Date()): boolean {
  if (finishedWorkouts < 1) return false
  const last = lastExportAt ? Date.parse(lastExportAt) : NaN
  if (Number.isNaN(last)) return true
  return now.getTime() - last > BACKUP_NUDGE_DAYS * 86_400_000
}

// Makes a backup, hands it to the share sheet (or downloads it), and records
// when, unless the share sheet was dismissed. Returns the new lastExportAt,
// or null when nothing was saved.
export async function exportAndRecord(): Promise<string | null> {
  const outcome = await saveBackup(await exportAll())
  if (outcome === 'cancelled') return null
  const now = new Date().toISOString()
  await setSetting(LAST_EXPORT_KEY, now)
  return now
}
