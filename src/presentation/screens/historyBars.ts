import type { ExerciseHistoryPoint } from '../../domain/progress/types'

// Layout for the exercise-history bar chart: one bar per session, newest on
// the right, at most `maxBars` (older sessions stay in the list below it).
// Pure, so the geometry is testable without a DOM.

export type HistoryBar = {
  sessionId: string
  x: number
  y: number
  width: number
  height: number
  value: number
  date: string
  // Every set that session was done.
  full: boolean
  // The highest value shown; ties mark the most recent one.
  best: boolean
}

export type HistoryBarsLayout = {
  width: number
  height: number
  plotTop: number
  plotBottom: number
  bars: HistoryBar[]
}

export const CHART_WIDTH = 320
export const CHART_HEIGHT = 120
const VALUE_LABEL_SPACE = 16
const DATE_LABEL_SPACE = 18
const GAP = 8
// A lone bar shouldn't stretch across the whole card.
const MAX_BAR_WIDTH = 44

export function layoutHistoryBars(points: readonly ExerciseHistoryPoint[], maxBars = 10): HistoryBarsLayout {
  const shown = points.slice(-maxBars)
  const plotTop = VALUE_LABEL_SPACE
  const plotBottom = CHART_HEIGHT - DATE_LABEL_SPACE
  const plotHeight = plotBottom - plotTop
  const max = Math.max(1, ...shown.map((p) => p.prescribed))
  const bestValue = Math.max(...shown.map((p) => p.prescribed))
  let bestIndex = -1
  shown.forEach((p, i) => {
    if (p.prescribed === bestValue) bestIndex = i
  })

  const slot = shown.length > 0 ? (CHART_WIDTH - GAP * (shown.length - 1)) / shown.length : 0
  const width = Math.min(slot, MAX_BAR_WIDTH)

  const bars = shown.map((point, i) => {
    const height = Math.max(4, (point.prescribed / max) * plotHeight)
    // Center each bar in its slot, so narrow capped bars stay evenly spread.
    const x = i * (slot + GAP) + (slot - width) / 2
    return {
      sessionId: point.sessionId,
      x,
      y: plotBottom - height,
      width,
      height,
      value: point.prescribed,
      date: shortDate(point.sessionEndedAt),
      full: point.totalSets > 0 && point.metSets === point.totalSets,
      best: i === bestIndex,
    }
  })

  return { width: CHART_WIDTH, height: CHART_HEIGHT, plotTop, plotBottom, bars }
}

// "9/30": short enough for ten bars across a phone.
export function shortDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}
