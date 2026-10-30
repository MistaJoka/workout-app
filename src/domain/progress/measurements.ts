import { summarizeBodyWeight } from './bodyWeight'
import { localDayKey } from './activities'

// Body measurements (owner decision 2026-10-29), next to body weight: tape
// measurements in centimeters internally (inches are a display setting that
// follows the lb/kg choice, presentation/units.ts). One entry per local day;
// saving again the same day replaces it. Every site is optional. A day with
// no values left is a deletion (a tombstone, newest-wins on import). Pure.

export type MeasurementSite = 'waistCm' | 'hipsCm' | 'chestCm' | 'upperArmCm' | 'thighCm'

export const MEASUREMENT_SITES: readonly { id: MeasurementSite; name: string }[] = [
  { id: 'waistCm', name: 'Waist' },
  { id: 'hipsCm', name: 'Hips' },
  { id: 'chestCm', name: 'Chest' },
  { id: 'upperArmCm', name: 'Upper arm' },
  { id: 'thighCm', name: 'Thigh' },
]

export type MeasurementEntry = { day: string; recordedAt: string } & Partial<Record<MeasurementSite, number>>

// Bounds that only catch typos and unit slips (a value in mm, a missing
// digit), not a judgment about anyone's body.
export const MIN_MEASUREMENT_CM = 10
export const MAX_MEASUREMENT_CM = 300

export type MeasurementDraft = Partial<Record<MeasurementSite, number | null>>

export type BuildResult =
  | { ok: true; entry: MeasurementEntry }
  | { ok: false; problem: 'empty' }
  | { ok: false; problem: 'range'; site: MeasurementSite }

export function buildMeasurementEntry(draft: MeasurementDraft, at: Date): BuildResult {
  const entry: MeasurementEntry = { day: localDayKey(at), recordedAt: at.toISOString() }
  for (const { id } of MEASUREMENT_SITES) {
    const value = draft[id]
    if (value == null) continue
    if (!Number.isFinite(value) || value < MIN_MEASUREMENT_CM || value > MAX_MEASUREMENT_CM) {
      return { ok: false, problem: 'range', site: id }
    }
    entry[id] = Math.round(value * 10) / 10
  }
  if (!hasAnyMeasurement(entry)) return { ok: false, problem: 'empty' }
  return { ok: true, entry }
}

export function hasAnyMeasurement(entry: Partial<Record<MeasurementSite, number>>): boolean {
  return MEASUREMENT_SITES.some(({ id }) => typeof entry[id] === 'number')
}

export type SiteSummary = {
  latest: { day: string; cm: number }
  // Versus the entry closest to 30 days ago (same rule as body weight).
  changeCm: number | null
  points: number[]
}

// Latest value and 30-day trend per site, over the entries that have that
// site, with the same baseline rule as body weight (bodyWeight.ts).
export function summarizeMeasurements(
  entries: readonly MeasurementEntry[],
  now: Date
): Record<MeasurementSite, SiteSummary | null> {
  const out = {} as Record<MeasurementSite, SiteSummary | null>
  for (const { id } of MEASUREMENT_SITES) {
    const series = entries.flatMap((e) => (typeof e[id] === 'number' ? [{ day: e.day, kg: e[id] as number }] : []))
    const summary = summarizeBodyWeight(series, now)
    out[id] = summary
      ? {
          latest: { day: summary.latest.day, cm: summary.latest.kg },
          changeCm: summary.changeKg,
          points: summary.points.map((p) => p.kg),
        }
      : null
  }
  return out
}
