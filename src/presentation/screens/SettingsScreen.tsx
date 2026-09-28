import { Link } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { exportAll, importAll, isValidExportBundle, type ExportBundle } from '../../infrastructure/exportImport/exportImport'
import { downloadBackup } from '../../infrastructure/exportImport/downloadBackup'
import { getSetting, setSetting } from '../../infrastructure/db/repositories/settingsRepository'
import { db } from '../../infrastructure/db/schema'
import { activeProfile, loadProfiles } from '../../infrastructure/profiles'
import { ProfileSwitcher } from '../components/ProfileSwitcher'
import { useFeedbackSettings } from '../components/useFeedbackSettings'
import { useWeightUnit } from '../components/useWeightUnit'
import { RaeFace } from '../components/Rae'

const LAST_EXPORT_KEY = 'lastExportAt'

export function SettingsScreen() {
  const [feedback, updateFeedback] = useFeedbackSettings()
  const [unit, setUnit] = useWeightUnit()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [lastExportAt, setLastExportAt] = useState<string | null>(null)
  const [resetText, setResetText] = useState('')
  const [resetting, setResetting] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)
  // A parsed backup waiting for the user to confirm where it goes.
  const [pendingImport, setPendingImport] = useState<ExportBundle | null>(null)
  const [importing, setImporting] = useState(false)
  // Reset clears the active profile's database only (one Dexie DB per
  // profile), so the copy names who it affects.
  const [profile] = useState(() => activeProfile())
  const [otherPeople] = useState(() => loadProfiles().profiles.length > 1)

  useEffect(() => {
    getSetting<string>(LAST_EXPORT_KEY).then((value) => setLastExportAt(value ?? null))
  }, [])

  // Every failure below is local (IndexedDB or the file picker), never the
  // network, and the copy says so.
  async function handleExport() {
    try {
      const bundle = await exportAll()
      downloadBackup(bundle)
      const now = new Date().toISOString()
      await setSetting(LAST_EXPORT_KEY, now)
      setLastExportAt(now)
      setStatus('Backup downloaded.')
    } catch {
      setStatus('Could not make a backup. The phone may be low on storage.')
    }
  }

  async function handleImportFile(file: File) {
    try {
      const bundle = JSON.parse(await file.text())
      if (!isValidExportBundle(bundle)) {
        setStatus('Import failed: this file is not a valid backup.')
        return
      }
      setStatus(null)
      setPendingImport(bundle)
    } catch {
      setStatus('Import failed: check the file and try again.')
    }
  }

  async function confirmImport() {
    if (!pendingImport) return
    setImporting(true)
    try {
      await importAll(pendingImport)
      // Reload so every screen and settings cache reads the merged data.
      location.reload()
    } catch {
      setImporting(false)
      setPendingImport(null)
      setStatus('Import failed. Nothing was changed.')
    }
  }

  async function handleReset() {
    setResetting(true)
    setResetError(null)
    try {
      await db.transaction('rw', db.tables, async () => {
        for (const table of db.tables) await table.clear()
      })
      location.reload()
    } catch {
      setResetting(false)
      setResetError('Could not erase. Nothing was changed. Close the app and try again.')
    }
  }

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl font-bold">Settings</h1>

      <section className="space-y-2">
        <p className="font-semibold">Who's working out</p>
        <ProfileSwitcher />
      </section>

      <section className="space-y-2">
        <p className="font-semibold">Weight unit</p>
        <div className="flex justify-end gap-2">
          <ChoiceChip label="lb" active={unit === 'lb'} onClick={() => setUnit('lb')} />
          <ChoiceChip label="kg" active={unit === 'kg'} onClick={() => setUnit('kg')} />
        </div>
      </section>

      <section className="space-y-2">
        <p className="font-semibold">Rest timer</p>
        <div className="flex justify-end gap-2">
          <ChoiceChip
            label={`Sound ${feedback.sound ? 'on' : 'off'}`}
            active={feedback.sound}
            onClick={() => updateFeedback({ sound: !feedback.sound })}
          />
          <ChoiceChip
            label={`Vibration ${feedback.vibration ? 'on' : 'off'}`}
            active={feedback.vibration}
            onClick={() => updateFeedback({ vibration: !feedback.vibration })}
          />
        </div>
      </section>

      <section className="space-y-2">
        <p className="font-semibold">Backup</p>
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" onClick={handleExport}>
            Export data
          </button>
          <button className="btn-secondary" onClick={() => fileInputRef.current?.click()}>
            Import data
          </button>
        </div>
        <p className="text-sm text-ink-muted">
          Last backup: {lastExportAt ? new Date(lastExportAt).toLocaleString() : 'never'}
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            // Clear it so picking the same file again still fires onChange.
            event.target.value = ''
            if (file) void handleImportFile(file)
          }}
        />
        {status && (
          <p className="text-sm text-ink-muted" role="status">
            {status}
          </p>
        )}
      </section>

      {pendingImport && (
        <ImportSheet
          bundle={pendingImport}
          intoName={profile.name}
          busy={importing}
          onConfirm={() => void confirmImport()}
          onCancel={() => setPendingImport(null)}
        />
      )}


      <section className="space-y-2">
        <Link to="/rae" className="card flex w-full items-center gap-3 p-3">
          <RaeFace expression="wink" size={44} motion="none" />
          <span className="flex-1 font-semibold">Meet Rae, your coach</span>
          <span className="text-xl text-ink-muted" aria-hidden>
            ›
          </span>
        </Link>
        <Link to="/about" className="btn-secondary w-full">
          About, animations, credits
        </Link>
      </section>

      {/* Collapsed and last: nobody should meet this on the way to
          something else. */}
      <details className="card p-3 [&_summary]:cursor-pointer">
        <summary className="font-semibold">Danger zone</summary>
        <div className="space-y-2 pt-3">
          <p className="font-semibold">Reset all data</p>
          <p className="text-sm text-ink-muted">
            Erases every workout, routine and setting for {profile.name}.
            {otherPeople ? ' Other people on this device keep their data.' : ''} Export a backup first.
          </p>
          <input
            type="text"
            inputMode="text"
            autoCapitalize="characters"
            placeholder="Type DELETE to enable"
            value={resetText}
            onChange={(e) => setResetText(e.target.value)}
            className="input"
            aria-label="Type DELETE to enable reset"
          />
          <button className="btn-danger w-full" disabled={resetText !== 'DELETE' || resetting} onClick={handleReset}>
            Erase everything
          </button>
          {resetError && (
            <p className="text-sm text-ink-muted" role="alert">
              {resetError}
            </p>
          )}
        </div>
      </details>
    </div>
  )
}

function ChoiceChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button className={`chip ${active ? 'chip-active' : ''}`} onClick={onClick}>
      {label}
    </button>
  )
}

function ImportSheet({
  bundle,
  intoName,
  busy,
  onConfirm,
  onCancel,
}: {
  bundle: ExportBundle
  intoName: string
  busy: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const fromName = bundle.profile?.name
  const madeOn = new Date(bundle.exportedAt).toLocaleDateString()
  const otherPerson = fromName !== undefined && fromName !== intoName
  return (
    <div className="fixed inset-0 z-30 flex items-end bg-ink/40" onClick={busy ? undefined : onCancel}>
      <div
        className="w-full space-y-3 rounded-t-[var(--radius-panel)] bg-surface p-4"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Import backup"
      >
        <p className="text-lg font-bold">Add this backup to {intoName}?</p>
        <p className="text-sm text-ink-muted">
          {fromName ? `${fromName}'s backup` : 'Backup'} from {madeOn}. Workouts already here are kept.
        </p>
        {otherPerson && (
          <p className="text-sm font-semibold" role="alert">
            This backup belongs to {fromName}, not {intoName}.
          </p>
        )}
        <button type="button" className="btn-primary btn-lg w-full" disabled={busy} onClick={onConfirm}>
          {busy ? 'Adding…' : `Add to ${intoName}`}
        </button>
        <button type="button" className="btn-ghost w-full" disabled={busy} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}
