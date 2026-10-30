import { useEffect, useState } from 'react'
import {
  MEASUREMENT_SITES,
  summarizeMeasurements,
  type MeasurementDraft,
  type MeasurementSite,
  type SiteSummary,
} from '../../domain/progress/measurements'
import { localDayKey } from '../../domain/progress/activities'
import {
  clearMeasurements,
  listLiveMeasurements,
  saveMeasurements,
} from '../../infrastructure/db/repositories/measurementsRepository'
import type { MeasurementRecord } from '../../infrastructure/db/schema'
import { storageErrorMessage } from '../../infrastructure/storageErrors'
import { cmToUnit, formatLength, lengthUnitFor, unitToCm } from '../units'
import { useWeightUnit } from './useWeightUnit'
import { ConfirmSheet } from './ConfirmSheet'
import { Sparkline } from './BodyWeightCard'
import { shortDay } from '../activityDays'

const RECENT = 7

type Draft = Record<MeasurementSite, string>

// Body measurements, beside body weight (Progress > More > Body > Size):
// each site's latest value, its 30-day change and a sparkline; "Log today"
// opens all five sites at once, prefilled from today's entry or the latest
// values, and saving replaces today's entry. Inches when the unit is lb.
export function MeasurementsCard() {
  const [weightUnit] = useWeightUnit()
  const unit = lengthUnitFor(weightUnit)
  const [entries, setEntries] = useState<MeasurementRecord[] | null>(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Draft>(emptyDraft())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<MeasurementRecord | null>(null)

  async function refresh() {
    try {
      setEntries(await listLiveMeasurements())
    } catch (e) {
      setEntries([])
      setError(storageErrorMessage(e, 'read'))
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  const summary = entries ? summarizeMeasurements(entries, new Date()) : null

  function startEditing() {
    const today = entries?.find((e) => e.day === localDayKey(new Date()))
    const next = emptyDraft()
    for (const { id } of MEASUREMENT_SITES) {
      const cm = today ? today[id] : summary?.[id]?.latest.cm
      if (typeof cm === 'number') next[id] = String(Math.round(cmToUnit(cm, unit) * 10) / 10)
    }
    setDraft(next)
    setError(null)
    setEditing(true)
  }

  async function save() {
    const values: MeasurementDraft = {}
    for (const { id } of MEASUREMENT_SITES) {
      const raw = draft[id].trim().replace(',', '.')
      values[id] = raw === '' ? null : unitToCm(Number(raw), unit)
    }
    setBusy(true)
    setError(null)
    try {
      await saveMeasurements(values)
      setEditing(false)
      await refresh()
    } catch (e) {
      const invalid = e instanceof Error && e.message.startsWith('Invalid measurements')
      setError(invalid ? 'Check the numbers.' : storageErrorMessage(e, 'save'))
    } finally {
      setBusy(false)
    }
  }

  async function confirmDelete() {
    if (!deleting) return
    setBusy(true)
    setError(null)
    try {
      await clearMeasurements(deleting.day)
      setDeleting(null)
      await refresh()
    } catch (e) {
      setError(storageErrorMessage(e, 'save'))
    } finally {
      setBusy(false)
    }
  }

  if (editing) {
    return (
      <form
        className="space-y-2"
        aria-label="Log today's measurements"
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        {MEASUREMENT_SITES.map((site) => (
          <label key={site.id} className="flex items-center justify-between gap-2">
            <span className="font-semibold">{site.name}</span>
            <span className="flex items-center gap-1">
              <input
                className="input w-24 py-2 text-right tabular-nums"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                aria-label={`${site.name}, ${unit === 'in' ? 'inches' : 'centimeters'}`}
                value={draft[site.id]}
                onChange={(e) => setDraft((d) => ({ ...d, [site.id]: e.target.value }))}
              />
              <span aria-hidden className="w-6 text-sm text-ink-muted">
                {unit}
              </span>
            </span>
          </label>
        ))}
        {error && (
          <p className="text-sm text-accent" role="alert">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <button type="submit" className="btn-primary flex-1" disabled={busy}>
            Save today
          </button>
          <button type="button" className="btn-secondary" onClick={() => setEditing(false)}>
            Cancel
          </button>
        </div>
      </form>
    )
  }

  return (
    <div className="space-y-2">
      {entries === null ? (
        <div className="h-40" aria-hidden />
      ) : (
        <ul className="divide-y divide-edge" aria-label="Measurements" data-testid="measurements">
          {MEASUREMENT_SITES.map((site) => (
            <SiteRow key={site.id} name={site.name} summary={summary?.[site.id] ?? null} unit={unit} />
          ))}
        </ul>
      )}
      {error && (
        <p className="text-sm text-accent" role="alert">
          {error}
        </p>
      )}
      <button type="button" className="btn-secondary w-full" onClick={startEditing}>
        {entries && entries.length > 0 ? 'Log today' : 'Log measurements'}
      </button>

      {entries && entries.length > 0 && (
        <details className="text-sm">
          <summary className="flex min-h-11 cursor-pointer items-center text-ink-muted">Past entries</summary>
          <ul className="divide-y divide-edge">
            {[...entries]
              .reverse()
              .slice(0, RECENT)
              .map((entry) => (
                <li key={entry.day} className="flex items-center justify-between gap-2">
                  <span className="text-ink-muted">{shortDay(entry.day)}</span>
                  <span className="min-w-0 flex-1 truncate text-right tabular-nums">{entrySummary(entry, unit)}</span>
                  <button
                    type="button"
                    className="inline-flex h-11 w-11 flex-none items-center justify-center rounded-control text-ink-muted active:bg-field-primary"
                    aria-label={`Delete measurements from ${shortDay(entry.day)}`}
                    onClick={() => setDeleting(entry)}
                  >
                    ✕
                  </button>
                </li>
              ))}
          </ul>
        </details>
      )}

      {deleting && (
        <ConfirmSheet
          title="Delete these measurements?"
          confirmLabel="Delete"
          cancelLabel="Keep them"
          busy={busy}
          error={error}
          onConfirm={() => void confirmDelete()}
          onCancel={() => {
            setDeleting(null)
            setError(null)
          }}
        >
          {shortDay(deleting.day)}
        </ConfirmSheet>
      )}
    </div>
  )
}

function SiteRow({ name, summary, unit }: { name: string; summary: SiteSummary | null; unit: 'cm' | 'in' }) {
  const change =
    summary?.changeCm != null ? `${summary.changeCm > 0 ? '+' : summary.changeCm < 0 ? '−' : ''}${formatLength(Math.abs(summary.changeCm), unit)}` : null
  const label = summary
    ? `${name}: ${formatLength(summary.latest.cm, unit)}${change ? `, ${change} over 30 days` : ''}`
    : `${name}: not measured yet`
  return (
    <li className="flex min-h-11 items-center gap-2" aria-label={label}>
      <span aria-hidden className="w-20 flex-none text-sm font-semibold">
        {name}
      </span>
      <span aria-hidden className="hud-num flex-none font-bold tabular-nums">
        {summary ? formatLength(summary.latest.cm, unit) : '—'}
      </span>
      <span aria-hidden className="min-w-0 flex-1 truncate text-xs text-ink-muted">
        {change ?? ''}
      </span>
      {summary && summary.points.length > 1 && (
        <span aria-hidden className="flex-none">
          <Sparkline points={summary.points} label={`${name} trend`} className="h-6 w-16" />
        </span>
      )}
    </li>
  )
}

function emptyDraft(): Draft {
  return { waistCm: '', hipsCm: '', chestCm: '', upperArmCm: '', thighCm: '' }
}

function entrySummary(entry: MeasurementRecord, unit: 'cm' | 'in'): string {
  return MEASUREMENT_SITES.flatMap(({ id, name }) =>
    typeof entry[id] === 'number' ? [`${id === 'upperArmCm' ? 'Arm' : name} ${formatLength(entry[id] as number, unit)}`] : []
  ).join(' · ')
}
