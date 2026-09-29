import { useEffect, useState } from 'react'
import { db } from '../../infrastructure/db/schema'
import { getSetting } from '../../infrastructure/db/repositories/settingsRepository'
import { storageErrorMessage } from '../../infrastructure/storageErrors'
import { BACKUP_NUDGE_DAYS, LAST_EXPORT_KEY, exportAndRecord, needsBackupNudge } from '../backup'

// A small card asking for a backup once there's history to lose and no
// backup in BACKUP_NUDGE_DAYS days. Self-contained, so any screen can mount
// it. It renders nothing until it knows it's needed (no flash), and hides
// itself once a backup is saved. `onSaved` lets a host screen refresh its
// own "Last backup" line; a host that already tracks the last backup (and
// saves backups another way) passes `lastExportAt` so the card follows it.
export function BackupNudge({
  lastExportAt,
  onSaved,
}: {
  lastExportAt?: string | null
  onSaved?: (at: string) => void
}) {
  const [loaded, setLoaded] = useState<{ last: string | null; finished: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([getSetting<string>(LAST_EXPORT_KEY), db.sessionResults.count()])
      .then(([last, finished]) => {
        if (!cancelled) setLoaded({ last: last ?? null, finished })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  if (!loaded) return null
  const last = lastExportAt !== undefined ? lastExportAt : loaded.last
  if (!needsBackupNudge(last, loaded.finished)) return null

  async function handleBackup() {
    setBusy(true)
    setError(null)
    try {
      const at = await exportAndRecord()
      if (at) {
        setLoaded({ ...loaded!, last: at })
        onSaved?.(at)
      }
    } catch (e) {
      setError(storageErrorMessage(e, 'read'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="field-notice space-y-2 p-4" role="region" aria-label="Backup reminder">
      <p className="font-bold">Back up your workouts</p>
      <p className="text-sm">
        Everything lives on this phone. {last ? `No backup in ${BACKUP_NUDGE_DAYS} days.` : 'No backup yet.'}
      </p>
      <button type="button" className="btn-primary w-full" disabled={busy} onClick={() => void handleBackup()}>
        {busy ? 'Saving…' : 'Save a backup'}
      </button>
      {error && (
        <p className="text-sm" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
