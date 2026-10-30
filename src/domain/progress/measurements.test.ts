import { describe, expect, it } from 'vitest'
import {
  MEASUREMENT_SITES,
  buildMeasurementEntry,
  hasAnyMeasurement,
  summarizeMeasurements,
  type MeasurementEntry,
} from './measurements'

const NOW = new Date(2026, 9, 29, 12)

function entry(day: string, values: Partial<MeasurementEntry>): MeasurementEntry {
  return { day, recordedAt: `${day}T12:00:00.000Z`, ...values }
}

describe('measurement sites', () => {
  it('are the five owner sites, in order', () => {
    expect(MEASUREMENT_SITES.map((s) => s.id)).toEqual(['waistCm', 'hipsCm', 'chestCm', 'upperArmCm', 'thighCm'])
  })
})

describe('buildMeasurementEntry', () => {
  it('keeps only filled, sane values, rounded to 0.1 cm', () => {
    const result = buildMeasurementEntry({ waistCm: 80.04, hipsCm: null, thighCm: 55 }, NOW)
    expect(result).toEqual({ ok: true, entry: { day: '2026-10-29', recordedAt: NOW.toISOString(), waistCm: 80, thighCm: 55 } })
  })

  it('rejects an empty entry and impossible values', () => {
    expect(buildMeasurementEntry({}, NOW)).toEqual({ ok: false, problem: 'empty' })
    expect(buildMeasurementEntry({ waistCm: 2 }, NOW)).toEqual({ ok: false, problem: 'range', site: 'waistCm' })
    expect(buildMeasurementEntry({ chestCm: 400 }, NOW)).toEqual({ ok: false, problem: 'range', site: 'chestCm' })
    expect(buildMeasurementEntry({ chestCm: Number.NaN }, NOW)).toEqual({ ok: false, problem: 'range', site: 'chestCm' })
  })
})

describe('hasAnyMeasurement', () => {
  it('is false for a cleared (deleted) day', () => {
    expect(hasAnyMeasurement(entry('2026-10-01', {}))).toBe(false)
    expect(hasAnyMeasurement(entry('2026-10-01', { hipsCm: 90 }))).toBe(true)
  })
})

describe('summarizeMeasurements', () => {
  it('gives each site its latest value and a trend over the entries that have it', () => {
    const summary = summarizeMeasurements(
      [
        entry('2026-09-01', { waistCm: 82, hipsCm: 98 }),
        entry('2026-10-28', { waistCm: 80 }),
        entry('2026-10-10', {}),
      ],
      NOW
    )
    expect(summary.waistCm).toEqual({ latest: { day: '2026-10-28', cm: 80 }, changeCm: -2, points: [82, 80] })
    expect(summary.hipsCm).toEqual({ latest: { day: '2026-09-01', cm: 98 }, changeCm: null, points: [98] })
    expect(summary.chestCm).toBeNull()
  })
})
