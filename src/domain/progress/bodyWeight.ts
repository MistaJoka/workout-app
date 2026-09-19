export type BodyWeightPoint = { day: string; kg: number }

export type BodyWeightSummary = {
  latest: BodyWeightPoint
  // Change versus the entry closest to `windowDays` ago (kg); null with
  // fewer than two entries.
  changeKg: number | null
  points: BodyWeightPoint[]
}

function dayToDate(day: string): Date {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// Behaviorally adapted from wger's weight history view (AGPL — behavior
// only, no code) and Ischys measurements: latest value, trend versus a
// baseline ~30 days back, points for a sparkline. Pure.
export function summarizeBodyWeight(
  entries: readonly BodyWeightPoint[],
  now: Date,
  windowDays = 30
): BodyWeightSummary | null {
  if (entries.length === 0) return null
  const points = [...entries].sort((a, b) => a.day.localeCompare(b.day))
  const latest = points[points.length - 1]
  if (points.length < 2) return { latest, changeKg: null, points }

  const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - windowDays)
  // Baseline: the newest entry at or before the cutoff; if none, the
  // oldest entry we have (short histories still get a trend).
  const atOrBefore = points.filter((p) => dayToDate(p.day) <= cutoff)
  const baseline = atOrBefore.length > 0 ? atOrBefore[atOrBefore.length - 1] : points[0]
  if (baseline.day === latest.day) return { latest, changeKg: null, points }
  return { latest, changeKg: Math.round((latest.kg - baseline.kg) * 10) / 10, points }
}
