import { useEffect, useState } from 'react'
import { listBodyWeight, logBodyWeight } from '../../infrastructure/db/repositories/bodyWeightRepository'
import { summarizeBodyWeight, type BodyWeightSummary } from '../../domain/progress/bodyWeight'
import { formatWeight, kgToUnit, unitToKg } from '../units'
import { useWeightUnit } from './useWeightUnit'

// Body weight: latest value, 30-day trend, sparkline, and a one-tap log
// with a +/- stepper (0.5 kg or 1 lb) pre-filled from the last entry.
export function BodyWeightCard() {
  const [unit] = useWeightUnit()
  const [summary, setSummary] = useState<BodyWeightSummary | null | undefined>(undefined)
  const [logging, setLogging] = useState(false)
  const [draftKg, setDraftKg] = useState<number>(70)

  async function refresh() {
    const entries = await listBodyWeight()
    const next = summarizeBodyWeight(entries, new Date())
    setSummary(next)
    if (next) setDraftKg(next.latest.kg)
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
          <div className="flex items-center justify-between rounded-panel bg-bg p-2">
            <button
              type="button"
              className="stepper-btn"
              aria-label="Lower body weight"
              onClick={() => setDraftKg(unitToKg(Math.max(0, draftInUnit - step), unit))}
            >
              −
            </button>
            <span className="font-semibold tabular-nums">{formatWeight(draftKg, unit)}</span>
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
