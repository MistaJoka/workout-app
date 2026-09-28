import { useEffect, useState } from 'react'
import { deleteBodyWeight, listBodyWeight, logBodyWeight } from '../../infrastructure/db/repositories/bodyWeightRepository'
import type { BodyWeightRecord } from '../../infrastructure/db/schema'
import { summarizeBodyWeight, type BodyWeightSummary } from '../../domain/progress/bodyWeight'
import { formatWeight, kgToUnit, unitToKg } from '../units'
import { useWeightUnit } from './useWeightUnit'
import { ConfirmSheet } from './ConfirmSheet'

// Newest entries listed under "Past entries", each deletable (a mistyped
// weigh-in otherwise skews the trend forever).
const RECENT = 7

// Body weight: latest value, 30-day trend, sparkline, and a one-tap log
// with a +/- stepper (0.5 kg or 1 lb) pre-filled from the last entry.
export function BodyWeightCard() {
  const [unit] = useWeightUnit()
  const [summary, setSummary] = useState<BodyWeightSummary | null | undefined>(undefined)
  const [logging, setLogging] = useState(false)
  const [draftKg, setDraftKg] = useState<number>(70)
  const [entries, setEntries] = useState<BodyWeightRecord[]>([])
  const [deleting, setDeleting] = useState<BodyWeightRecord | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    const all = await listBodyWeight()
    const next = summarizeBodyWeight(all, new Date())
    setEntries(all)
    setSummary(next)
    if (next) setDraftKg(next.latest.kg)
  }

  async function confirmDelete() {
    if (!deleting) return
    setBusy(true)
    setError(null)
    try {
      await deleteBodyWeight(deleting.day)
      setDeleting(null)
      await refresh()
    } catch {
      setError("Couldn't delete on this device. Try again.")
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  const step = unit === 'kg' ? 0.5 : 1
  const draftInUnit = Math.round(kgToUnit(draftKg, unit) / step) * step

  async function save() {
    await logBodyWeight(draftKg)
    setLogging(false)
    await refresh()
  }

  return (
    <section className="card p-3 space-y-2">
      <div className="flex items-baseline justify-between">
        <p className="text-xs text-ink-muted">Body weight</p>
        {summary && summary.changeKg != null && (
          <p className="text-xs text-ink-muted">
            {summary.changeKg > 0 ? '+' : ''}
            {formatWeight(summary.changeKg, unit)}, 30 days
          </p>
        )}
      </div>

      {summary === undefined && <p className="text-sm text-ink-muted">Loading…</p>}

      {summary === null && !logging && <p className="text-sm text-ink-muted">Not logged yet.</p>}

      {summary && !logging && (
        <div className="flex items-end justify-between gap-3">
          <p className="text-2xl font-bold">{formatWeight(summary.latest.kg, unit)}</p>
          {summary.points.length > 1 && <BodyWeightSparkline points={summary.points.map((p) => p.kg)} />}
        </div>
      )}

      {logging ? (
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-6 rounded-panel bg-bg p-2">
            <button
              type="button"
              className="stepper-btn"
              aria-label="Lower body weight"
              onClick={() => setDraftKg(unitToKg(Math.max(0, draftInUnit - step), unit))}
            >
              −
            </button>
            <span className="hud-num font-semibold tabular-nums">{formatWeight(draftKg, unit)}</span>
            <button
              type="button"
              className="stepper-btn"
              aria-label="Raise body weight"
              onClick={() => setDraftKg(unitToKg(draftInUnit + step, unit))}
            >
              +
            </button>
          </div>
          <div className="flex gap-2">
            <button className="btn-primary flex-1" onClick={save}>
              Save today
            </button>
            <button className="btn-secondary" onClick={() => setLogging(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button className="btn-secondary w-full" onClick={() => setLogging(true)}>
          {summary ? 'Log today' : 'Log body weight'}
        </button>
      )}

      {entries.length > 0 && !logging && (
        <details className="text-sm">
          <summary className="flex min-h-11 cursor-pointer items-center text-ink-muted">Past entries</summary>
          <ul className="divide-y divide-edge">
            {[...entries]
              .reverse()
              .slice(0, RECENT)
              .map((entry) => (
                <li key={entry.day} className="flex items-center justify-between gap-2">
                  <span className="text-ink-muted">{formatDay(entry.day)}</span>
                  <span className="flex items-center gap-1">
                    <span className="font-semibold tabular-nums">{formatWeight(entry.kg, unit)}</span>
                    <button
                      type="button"
                      className="inline-flex h-11 w-11 items-center justify-center rounded-control text-ink-muted active:bg-field-primary"
                      aria-label={`Delete ${formatDay(entry.day)}`}
                      onClick={() => setDeleting(entry)}
                    >
                      ✕
                    </button>
                  </span>
                </li>
              ))}
          </ul>
        </details>
      )}

      {deleting && (
        <ConfirmSheet
          title="Delete this weigh-in?"
          confirmLabel="Delete"
          cancelLabel="Keep it"
          busy={busy}
          error={error}
          onConfirm={confirmDelete}
          onCancel={() => {
            setDeleting(null)
            setError(null)
          }}
        >
          {formatWeight(deleting.kg, unit)} on {formatDay(deleting.day)}
        </ConfirmSheet>
      )}
    </section>
  )
}

function BodyWeightSparkline({ points }: { points: number[] }) {
  const width = 140
  const height = 36
  const pad = 3
  const min = Math.min(...points)
  const max = Math.max(...points)
  const span = max - min || 1
  const stepX = (width - pad * 2) / (points.length - 1)
  const path = points
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${(pad + i * stepX).toFixed(1)},${(pad + (1 - (v - min) / span) * (height - pad * 2)).toFixed(1)}`)
    .join(' ')
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-9 w-36" role="img" aria-label="Body weight trend">
      <path d={path} fill="none" stroke="var(--color-primary)" strokeWidth="2" />
    </svg>
  )
}

// 'YYYY-MM-DD' as a short local date, without the UTC shift new Date(day) has.
function formatDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
