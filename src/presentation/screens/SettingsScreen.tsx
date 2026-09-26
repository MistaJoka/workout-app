import { Link } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { useTheme } from '../theme/ThemeContext'
import { exportAll, importAll, isValidExportBundle } from '../../infrastructure/exportImport/exportImport'
import { downloadBackup } from '../../infrastructure/exportImport/downloadBackup'
import { getSetting, setSetting } from '../../infrastructure/db/repositories/settingsRepository'
import { db } from '../../infrastructure/db/schema'
import { activeProfile, loadProfiles } from '../../infrastructure/profiles'
import { useFeedbackSettings } from '../components/useFeedbackSettings'
import { useWeightUnit } from '../components/useWeightUnit'

const LAST_EXPORT_KEY = 'lastExportAt'

export function SettingsScreen() {
  const { motion, setMotion } = useTheme()
  const [feedback, updateFeedback] = useFeedbackSettings()
  const [unit, setUnit] = useWeightUnit()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [lastExportAt, setLastExportAt] = useState<string | null>(null)
  const [resetText, setResetText] = useState('')
  const [resetting, setResetting] = useState(false)
  // Reset clears the active profile's database only (one Dexie DB per
  // profile), so the copy names who it affects.
  const [profile] = useState(() => activeProfile())
  const [otherPeople] = useState(() => loadProfiles().profiles.length > 1)

  useEffect(() => {
    getSetting<string>(LAST_EXPORT_KEY).then((value) => setLastExportAt(value ?? null))
  }, [])

  async function handleExport() {
    const bundle = await exportAll()
    downloadBackup(bundle)
    const now = new Date().toISOString()
    await setSetting(LAST_EXPORT_KEY, now)
    setLastExportAt(now)
    setStatus('Backup downloaded.')
  }

  async function handleImportFile(file: File) {
    try {
      const text = await file.text()
      const bundle = JSON.parse(text)
      if (!isValidExportBundle(bundle)) {
        setStatus('Import failed: this file is not a valid backup.')
        return
      }
      await importAll(bundle)
      setStatus('Import complete.')
    } catch {
      setStatus('Import failed: check the file and try again.')
    }
  }

  async function handleReset() {
    setResetting(true)
    await db.transaction('rw', db.tables, async () => {
      for (const table of db.tables) await table.clear()
    })
    location.reload()
  }

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl font-bold">Settings</h1>

      <section className="space-y-2">
        <p className="font-semibold">Motion</p>
        <div className="flex justify-end gap-2">
          {(['full', 'reduced', 'off'] as const).map((option) => (
            <ThemeButton key={option} label={option} active={motion === option} onClick={() => setMotion(option)} capitalize />
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <p className="font-semibold">Weight unit</p>
        <div className="flex justify-end gap-2">
          <ThemeButton label="lb" active={unit === 'lb'} onClick={() => setUnit('lb')} />
          <ThemeButton label="kg" active={unit === 'kg'} onClick={() => setUnit('kg')} />
        </div>
      </section>

      <section className="space-y-2">
        <p className="font-semibold">Rest timer</p>
        <div className="flex justify-end gap-2">
          <ThemeButton
            label={`Sound ${feedback.sound ? 'on' : 'off'}`}
            active={feedback.sound}
            onClick={() => updateFeedback({ sound: !feedback.sound })}
          />
          <ThemeButton
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
            if (file) void handleImportFile(file)
          }}
        />
        {status && <p className="text-sm text-ink-muted">{status}</p>}
      </section>

      <section className="space-y-2">
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
      </section>

      <section>
        <Link to="/about" className="btn-secondary w-full">
          About this app, credits
        </Link>
      </section>
    </div>
  )
}

function ThemeButton({
  label,
  active,
  onClick,
  capitalize,
}: {
  label: string
  active: boolean
  onClick: () => void
  capitalize?: boolean
}) {
  return (
    <button className={`chip ${capitalize ? 'capitalize' : ''} ${active ? 'chip-active' : ''}`} onClick={onClick}>
      {label}
    </button>
  )
}
