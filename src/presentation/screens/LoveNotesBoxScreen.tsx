import { useEffect, useState } from 'react'
import { BackButton } from '../components/BackButton'
import { RaeNote } from '../components/RaeNote'
import type { LoveNoteRecord } from '../../infrastructure/db/schema'
import {
  addLoveNote,
  listLoveNotes,
  markLoveNoteRead,
  removeLoveNote,
  updateLoveNote,
} from '../../infrastructure/db/repositories/loveNotesRepository'
import { getSetting, setSetting } from '../../infrastructure/db/repositories/settingsRepository'
import {
  DEFAULT_GIVER_NAME,
  INITIAL_PIN_ATTEMPT_STATE,
  createPinRecord,
  isInPinCooldown,
  pinCooldownMessage,
  recordCorrectPinAttempt,
  recordWrongPinAttempt,
  remainingCooldownMs,
  verifyPin,
  type PinAttemptState,
  type PinRecord,
} from '../../domain/rewards/pin'
import { generateSalt, hasSubtleCrypto, sha256Hex } from '../../infrastructure/pinCrypto'
import { PinEntrySheet, PinSetupSheet } from '../components/RewardsSheets'
import { LoveNotesEditorSheet, type LoveNoteDraft } from '../components/LoveNotesEditorSheet'
import { LoveNoteEnvelope } from '../components/LoveNoteEnvelope'
import { Skeleton, SkeletonList } from '../components/Skeleton'
import { HubbyModePill, isHubbyUnlocked, touchHubbySession, unlockHubbySession, useHubbySession } from '../components/hubbySession'

// The notes box: opened love notes (reread any), and -- behind the same PIN
// as the reward shop -- Hubby Bunny's queue editor. Locked notes are never
// listed individually here; only a sealed count, mystery preserved.

const GIVER_NAME_KEY = 'rewardsGiverName'
const PIN_KEY = 'rewardsHubbyPin'
// Same shared key RewardsScreen.tsx uses -- one PIN, one guess-cooldown
// counter and one Hubby-mode session for both screens.
const PIN_ATTEMPTS_KEY = 'rewardsHubbyPinAttempts'

type Sheet = { kind: 'none' } | { kind: 'pinSetup' } | { kind: 'pinEntry' } | { kind: 'editor' }

type Data = { notes: LoveNoteRecord[]; giverName: string; pin: PinRecord | null; pinAttempts: PinAttemptState }

async function load(): Promise<Data> {
  const [notes, giverName, pin, pinAttempts] = await Promise.all([
    listLoveNotes(),
    getSetting<string>(GIVER_NAME_KEY),
    getSetting<PinRecord>(PIN_KEY),
    getSetting<PinAttemptState>(PIN_ATTEMPTS_KEY),
  ])
  return {
    notes,
    giverName: giverName ?? DEFAULT_GIVER_NAME,
    pin: pin ?? null,
    pinAttempts: pinAttempts ?? INITIAL_PIN_ATTEMPT_STATE,
  }
}

export function LoveNotesBoxScreen() {
  const [data, setData] = useState<Data | null>(null)
  const [failed, setFailed] = useState(false)
  const [sheet, setSheet] = useState<Sheet>({ kind: 'none' })
  const [pinBusy, setPinBusy] = useState(false)
  const [pinError, setPinError] = useState<string | null>(null)
  const [editorError, setEditorError] = useState<string | null>(null)
  const [editorBusyId, setEditorBusyId] = useState<string | null>(null)
  const [reading, setReading] = useState<LoveNoteRecord | null>(null)
  // Shared with RewardsScreen.tsx: hubby mode stays unlocked across both
  // screens for the rest of this visit (see components/hubbySession.tsx).
  const hubby = useHubbySession()

  useEffect(() => {
    let cancelled = false
    load()
      .then((loaded) => {
        if (!cancelled) setData(loaded)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function refresh(): Promise<Data> {
    const loaded = await load()
    setData(loaded)
    return loaded
  }

  function openManage() {
    setPinError(null)
    if (!data?.pin) {
      setSheet({ kind: 'pinSetup' })
    } else if (isHubbyUnlocked()) {
      setSheet({ kind: 'editor' })
    } else {
      setSheet({ kind: 'pinEntry' })
    }
  }

  async function handleSetPin(pin: string, giverName: string) {
    setPinBusy(true)
    setPinError(null)
    try {
      const algorithm = hasSubtleCrypto() ? 'sha256' : 'fallback'
      const record = await createPinRecord(pin, generateSalt(), sha256Hex, algorithm)
      await setSetting(PIN_KEY, record)
      await setSetting(GIVER_NAME_KEY, giverName)
      await setSetting(PIN_ATTEMPTS_KEY, recordCorrectPinAttempt())
      unlockHubbySession()
      await refresh()
      setSheet({ kind: 'editor' })
    } catch {
      setPinError("Couldn't save on this device. Try again.")
    } finally {
      setPinBusy(false)
    }
  }

  async function handlePinSubmit(pin: string) {
    if (!data?.pin) return
    const now = new Date()
    const attempts = data.pinAttempts
    if (isInPinCooldown(attempts, now)) {
      setPinError(pinCooldownMessage(remainingCooldownMs(attempts, now)))
      return
    }
    setPinBusy(true)
    setPinError(null)
    try {
      const ok = await verifyPin(pin, data.pin, sha256Hex)
      if (!ok) {
        const next = recordWrongPinAttempt(attempts, now)
        await setSetting(PIN_ATTEMPTS_KEY, next)
        await refresh()
        setPinError(isInPinCooldown(next, now) ? pinCooldownMessage(remainingCooldownMs(next, now)) : 'Wrong PIN.')
        return
      }
      await setSetting(PIN_ATTEMPTS_KEY, recordCorrectPinAttempt())
      unlockHubbySession()
      setSheet({ kind: 'editor' })
    } catch {
      setPinError("Couldn't check that on this device. Try again.")
    } finally {
      setPinBusy(false)
    }
  }

  async function handleAdd(draft: LoveNoteDraft) {
    setEditorError(null)
    touchHubbySession()
    try {
      await addLoveNote(draft)
      await refresh()
    } catch {
      setEditorError("Couldn't save on this device. Try again.")
    }
  }

  async function handleUpdate(id: string, patch: Partial<Pick<LoveNoteRecord, 'text' | 'emoji'>>) {
    setEditorError(null)
    touchHubbySession()
    try {
      await updateLoveNote(id, patch)
      await refresh()
    } catch {
      setEditorError("Couldn't save on this device. Try again.")
    }
  }

  async function handleRemove(id: string) {
    setEditorError(null)
    setEditorBusyId(id)
    touchHubbySession()
    try {
      await removeLoveNote(id)
      await refresh()
    } catch {
      setEditorError("Couldn't remove it on this device. Try again.")
    } finally {
      setEditorBusyId(null)
    }
  }

  async function closeReading() {
    const note = reading
    setReading(null)
    if (note) {
      await markLoveNoteRead(note.id).catch(() => {})
      await refresh().catch(() => {})
    }
  }

  const opened = (data?.notes ?? [])
    .filter((n) => n.unlockedAt)
    .sort((a, b) => (b.unlockedAt ?? '').localeCompare(a.unlockedAt ?? ''))
  const sealedCount = (data?.notes.length ?? 0) - opened.length

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <BackButton />
        <h1 className="text-xl font-bold">Love notes</h1>
      </div>

      <HubbyModePill unlocked={hubby.unlocked} onLock={hubby.lock} />

      {data === null && !failed && (
        <Skeleton className="space-y-3">
          <SkeletonList rows={3} />
        </Skeleton>
      )}
      {data === null && failed && (
        <div className="card space-y-3 p-4 text-center">
          <p className="font-bold">Couldn't load your notes.</p>
          <button type="button" className="btn-primary w-full" onClick={() => void refresh().catch(() => setFailed(true))}>
            Try again
          </button>
        </div>
      )}

      {data && (
        <>
          <section className="card flex items-center justify-between gap-2 p-4">
            <span>
              <span className="block text-sm text-ink-muted">From {data.giverName}</span>
              <span className="font-bold" data-testid="love-notes-sealed">
                {sealedCount > 0
                  ? `${sealedCount} sealed ${sealedCount === 1 ? 'note' : 'notes'} waiting`
                  : opened.length > 0
                    ? 'All opened'
                    : 'No notes yet'}
              </span>
            </span>
            <button type="button" className="btn-secondary min-h-11 px-4" onClick={openManage}>
              {data.pin ? 'Manage' : 'Set up'}
            </button>
          </section>

          {opened.length === 0 ? (
            <RaeNote expression="smile">
              {sealedCount > 0
                ? 'A sealed note is waiting for a workout to unlock it. Mystery!'
                : `${data.giverName} hasn't written any notes yet.`}
            </RaeNote>
          ) : (
            <ul className="space-y-2">
              {opened.map((note) => (
                <li key={note.id}>
                  <button
                    type="button"
                    className="card flex w-full items-center gap-3 p-3 text-left"
                    onClick={() => setReading(note)}
                    data-testid="love-note-row"
                  >
                    <span aria-hidden="true" className="text-2xl">
                      {note.emoji}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{note.unlockedAt ? formatDate(note.unlockedAt) : ''}</span>
                      {!note.readAt && <span className="text-xs font-bold text-primary-ink">New</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {sheet.kind === 'pinSetup' && (
        <PinSetupSheet
          giverNameInitial={data?.giverName ?? DEFAULT_GIVER_NAME}
          busy={pinBusy}
          error={pinError}
          onSave={(pin, name) => void handleSetPin(pin, name)}
          onCancel={() => setSheet({ kind: 'none' })}
        />
      )}

      {sheet.kind === 'pinEntry' && (
        <PinEntrySheet busy={pinBusy} error={pinError} onSubmit={(pin) => void handlePinSubmit(pin)} onCancel={() => setSheet({ kind: 'none' })} />
      )}

      {sheet.kind === 'editor' && data && (
        <LoveNotesEditorSheet
          notes={data.notes}
          giverName={data.giverName}
          busyId={editorBusyId}
          error={editorError}
          onAdd={(draft) => void handleAdd(draft)}
          onUpdate={(id, patch) => void handleUpdate(id, patch)}
          onRemove={(id) => void handleRemove(id)}
          onClose={() => setSheet({ kind: 'none' })}
        />
      )}

      {reading && <LoveNoteEnvelope note={reading} giverName={data?.giverName ?? DEFAULT_GIVER_NAME} onClose={() => void closeReading()} />}
    </div>
  )
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
