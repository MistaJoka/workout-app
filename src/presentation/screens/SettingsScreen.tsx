import { Link } from 'react-router-dom'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { importAll, isOtherProfile, parseExportBundle, type ExportBundle } from '../../infrastructure/exportImport/exportImport'
import { getSetting } from '../../infrastructure/db/repositories/settingsRepository'
import { db } from '../../infrastructure/db/schema'
import { activeProfile, loadProfiles, setProfileEmblem } from '../../infrastructure/profiles'
import { storageErrorMessage } from '../../infrastructure/storageErrors'
import { ProfileSwitcher } from '../components/ProfileSwitcher'
import { EmblemSheet } from '../components/EmblemSheet'
import { PixelBloom } from '../components/PixelBloom'
import { useFeedbackSettings } from '../components/useFeedbackSettings'
import { useWeightUnit } from '../components/useWeightUnit'
import { RaeFace } from '../components/Rae'
import { BACKUP_NUDGE_DAYS, LAST_EXPORT_KEY, exportAndRecord, needsBackupNudge } from '../backup'
import { canVibrate } from '../../application/restFeedback'
import { GARDEN_SPECIES, buildGarden, type GardenSpecies } from '../../domain/progress/garden'

export function SettingsScreen() {
  const [feedback, updateFeedback] = useFeedbackSettings()
  const [unit, setUnit] = useWeightUnit()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<string | null>(null)
  // undefined until read, so the backup nudge doesn't flash before it knows.
  const [lastExportAt, setLastExportAt] = useState<string | null | undefined>(undefined)
  // Finished workouts, for the backup-due rule (nothing to lose, no ask).
  const [finished, setFinished] = useState<number | undefined>(undefined)
  const [saving, setSaving] = useState(false)
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
  // Emblem: a discovered garden species standing in for the initial
  // circle. Starts from the profile record; updates locally on pick so the
  // row (and anything else reading it this session) doesn't need a reload.
  const [emblem, setEmblemState] = useState<string | null>(() => profile.emblem ?? null)
  const [emblemOpen, setEmblemOpen] = useState(false)
  const [discoveredSpecies, setDiscoveredSpecies] = useState<GardenSpecies[] | null>(null)

  useEffect(() => {
    getSetting<string>(LAST_EXPORT_KEY)
      .then((value) => setLastExportAt(value ?? null))
      .catch(() => {})
    db.sessionResults
      .toArray()
      .then((results) => {
        setFinished(results.length)
        const garden = buildGarden(results)
        setDiscoveredSpecies(GARDEN_SPECIES.filter((s) => garden.counts.has(s.id)))
      })
      .catch(() => {})
  }, [])

  function handleEmblemSelect(next: string | null) {
    setProfileEmblem(profile.id, next)
    setEmblemState(next)
    setEmblemOpen(false)
  }

  const emblemSpecies = emblem ? GARDEN_SPECIES.find((s) => s.id === emblem) ?? null : null

  // Every failure below is local (IndexedDB or the file picker), never the
  // network, and the copy says so.
  async function handleExport() {
    setSaving(true)
    try {
      const at = await exportAndRecord()
      if (at) {
        setLastExportAt(at)
        setStatus('Backup saved.')
      } else {
        setStatus('Backup not saved.')
      }
    } catch (error) {
      setStatus(storageErrorMessage(error, 'read'))
    } finally {
      setSaving(false)
    }
  }

  async function handleImportFile(file: File) {
    let raw: unknown
    try {
      raw = JSON.parse(await file.text())
    } catch {
      setStatus("Import failed: that file isn't a backup. Nothing was changed.")
      return
    }
    // Every row is checked before anything is written.
    const parsed = parseExportBundle(raw)
    if (!parsed.ok) {
      console.warn('Backup rejected:', parsed.problem)
      setStatus("Import failed: this backup is damaged or from a different app. Nothing was changed.")
      return
    }
    setStatus(null)
    setPendingImport(parsed.bundle)
  }

  async function confirmImport() {
    if (!pendingImport) return
    setImporting(true)
    try {
      await importAll(pendingImport)
      // Reload so every screen and settings cache reads the merged data.
      location.reload()
    } catch (error) {
      setImporting(false)
      setPendingImport(null)
      setStatus(`${storageErrorMessage(error, 'save')} Nothing was changed.`)
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

  const backupDue = lastExportAt !== undefined && finished !== undefined && needsBackupNudge(lastExportAt, finished)

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl font-bold">Settings</h1>

      <SettingsGroup title="You">
        {/* ProfileSwitcher reads the profile list once at mount; remount it
            when this profile's emblem changes so its trigger row (shown
            right above the Emblem row below) reflects the new pick without
            a full reload. */}
        <ProfileSwitcher key={emblem ?? 'none'} />
        <button
          type="button"
          onClick={() => setEmblemOpen(true)}
          className="card flex min-h-14 w-full items-center gap-3 p-3 text-left"
        >
          <span
            aria-hidden="true"
            className="flex h-10 w-10 flex-none items-center justify-center rounded-control bg-field-primary"
          >
            {emblemSpecies ? (
              <PixelBloom size={28} animate={false} species={emblemSpecies} />
            ) : (
              <span className="text-sm font-extrabold text-ink-muted">—</span>
            )}
          </span>
          <span className="flex-1 font-semibold">Emblem</span>
          <span className="text-xl text-ink-muted" aria-hidden>
            ›
          </span>
        </button>
      </SettingsGroup>

      {emblemOpen && (
        <EmblemSheet
          species={discoveredSpecies ?? []}
          selected={emblem}
          onSelect={handleEmblemSelect}
          onCancel={() => setEmblemOpen(false)}
        />
      )}

      <SettingsGroup title="Workout">
        <div className="card divide-y-2 divide-[var(--color-border)]">
          <SettingsRow label="Weight unit">
            <ChoiceChip label="lb" active={unit === 'lb'} onClick={() => setUnit('lb')} />
            <ChoiceChip label="kg" active={unit === 'kg'} onClick={() => setUnit('kg')} />
          </SettingsRow>
          <SettingsRow label="Rest timer">
            <ChoiceChip
              label={`Sound ${feedback.sound ? 'on' : 'off'}`}
              active={feedback.sound}
              onClick={() => updateFeedback({ sound: !feedback.sound })}
            />
            {/* iPhone Safari has no navigator.vibrate, so the toggle would do
                nothing there. */}
            {canVibrate() && (
              <ChoiceChip
                label={`Vibration ${feedback.vibration ? 'on' : 'off'}`}
                active={feedback.vibration}
                onClick={() => updateFeedback({ vibration: !feedback.vibration })}
              />
            )}
          </SettingsRow>
        </div>
      </SettingsGroup>

      <SettingsGroup title="Backup">
        {/* One way to back up. When a backup is due (BackupNudge's rule) the
            card itself becomes the reminder instead of adding a second
            "save" button above the first. */}
        <section
          className={`${backupDue ? 'field-notice' : 'card'} space-y-3 p-4`}
          {...(backupDue ? { role: 'region', 'aria-label': 'Backup reminder' } : {})}
        >
          {backupDue && (
            <div>
              <p className="font-bold">Back up your workouts</p>
              <p className="text-sm">
                Everything lives on this phone. {lastExportAt ? `No backup in ${BACKUP_NUDGE_DAYS} days.` : 'No backup yet.'}
              </p>
            </div>
          )}
          <button type="button" className="btn-primary w-full" disabled={saving} onClick={() => void handleExport()}>
            {saving ? 'Saving…' : 'Save a backup'}
          </button>
          <button type="button" className="btn-secondary w-full" onClick={() => fileInputRef.current?.click()}>
            Import data
          </button>
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
            <p className="text-sm" role="status">
              {status}
            </p>
          )}
        </section>
      </SettingsGroup>

      {pendingImport && (
        <ImportSheet
          bundle={pendingImport}
          intoId={profile.id}
          intoName={profile.name}
          busy={importing}
          onConfirm={() => void confirmImport()}
          onCancel={() => setPendingImport(null)}
        />
      )}

      <SettingsGroup title="More">
        <div className="card divide-y-2 divide-[var(--color-border)]">
          <Link to="/rewards" state={{ openManage: true }} className="flex min-h-14 w-full items-center gap-3 px-3 py-2">
            <span aria-hidden="true" className="flex-none text-2xl">
              🥕
            </span>
            <span className="flex-1 font-semibold">Hubby's reward shop</span>
            <span className="text-xl text-ink-muted" aria-hidden>
              ›
            </span>
          </Link>
          <Link to="/rae" className="flex min-h-14 w-full items-center gap-3 px-3 py-2">
            <RaeFace expression="wink" size={40} motion="none" />
            <span className="flex-1 font-semibold">Meet Rae, your coach</span>
            <span className="text-xl text-ink-muted" aria-hidden>
              ›
            </span>
          </Link>
          <Link to="/about" className="flex min-h-14 w-full items-center gap-3 px-3 py-2">
            <span className="flex-1 font-semibold">About, animations, credits</span>
            <span className="text-xl text-ink-muted" aria-hidden>
              ›
            </span>
          </Link>
          <Link to="/privacy" className="flex min-h-14 w-full items-center gap-3 px-3 py-2">
            <span className="flex-1 font-semibold">Privacy</span>
            <span className="text-xl text-ink-muted" aria-hidden>
              ›
            </span>
          </Link>
          <Link to="/terms" className="flex min-h-14 w-full items-center gap-3 px-3 py-2">
            <span className="flex-1 font-semibold">Terms</span>
            <span className="text-xl text-ink-muted" aria-hidden>
              ›
            </span>
          </Link>
          <Link to="/licenses" className="flex min-h-14 w-full items-center gap-3 px-3 py-2">
            <span className="flex-1 font-semibold">Open-source licenses</span>
            <span className="text-xl text-ink-muted" aria-hidden>
              ›
            </span>
          </Link>
        </div>
      </SettingsGroup>

      {/* Collapsed and last: nobody should meet this on the way to
          something else. */}
      <details className="group card p-3 [&_summary]:cursor-pointer">
        <summary className="flex min-h-11 list-none items-center justify-between font-semibold [&::-webkit-details-marker]:hidden">
          Danger zone
          <span className="text-ink-muted transition-transform group-open:rotate-90" aria-hidden>
            ›
          </span>
        </summary>
        <div className="space-y-2 pt-3">
          <p className="font-semibold">Reset all data</p>
          <p className="text-sm text-ink-muted">
            Erases every workout, routine and setting for {profile.name}.
            {otherPeople ? ' Other people on this device keep their data.' : ''} Save a backup first.
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

function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2" aria-label={title}>
      <h2 className="px-1 text-sm font-semibold text-ink-muted">{title}</h2>
      {children}
    </section>
  )
}

// Label left, controls right: every adjustable setting reads the same way.
function SettingsRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-14 flex-wrap items-center justify-between gap-2 px-3 py-2">
      <p className="font-semibold">{label}</p>
      <div className="flex flex-wrap justify-end gap-2">{children}</div>
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
  intoId,
  intoName,
  busy,
  onConfirm,
  onCancel,
}: {
  bundle: ExportBundle
  intoId: string
  intoName: string
  busy: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const fromName = bundle.profile?.name
  const madeOn = new Date(bundle.exportedAt).toLocaleDateString()
  // By profile id, not name: two people can share a name, and a renamed
  // profile is still the same person.
  const otherPerson = isOtherProfile(bundle, intoId)
  return (
    <div className="fixed inset-0 z-30 flex items-end bg-black/40" onClick={busy ? undefined : onCancel}>
      <div
        className="w-full space-y-3 rounded-t-[var(--radius-panel)] bg-surface p-4"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Import backup"
      >
        <p className="text-lg font-bold">Add this backup to {intoName}?</p>
        {otherPerson ? (
          <p className="text-sm" role="alert">
            <span className="font-semibold">This is {fromName}'s backup</span> from {madeOn}. Their workouts are added to{' '}
            {intoName}'s history. {intoName}'s progress, routines and settings stay as they are.
          </p>
        ) : (
          <p className="text-sm text-ink-muted">
            {fromName ? `${fromName}'s backup` : 'Backup'} from {madeOn}. Adds workouts that aren't here yet. Progress,
            routines and body weight keep whichever copy is newer; nothing here is rolled back.
          </p>
        )}
        <button type="button" className="btn-primary btn-lg w-full" autoFocus disabled={busy} onClick={onConfirm}>
          {busy ? 'Adding…' : otherPerson ? 'Add their workouts' : `Add to ${intoName}`}
        </button>
        <button type="button" className="btn-ghost w-full" disabled={busy} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}
