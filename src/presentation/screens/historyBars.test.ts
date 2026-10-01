import { describe, expect, it } from 'vitest'
import { CHART_WIDTH, layoutHistoryBars } from './historyBars'
import type { ExerciseHistoryPoint } from '../../domain/progress/types'

function point(i: number, prescribed: number, metSets = 2, totalSets = 2): ExerciseHistoryPoint {
  return {
    sessionId: `s${i}`,
    sessionEndedAt: `2026-09-${String(10 + i).padStart(2, '0')}T12:00:00.000Z`,
    unit: 'reps',
    prescribed,
    metSets,
    totalSets,
  }
}

describe('layoutHistoryBars', () => {
  it('draws one bar per session, scaled to the highest value', () => {
    const { bars, plotBottom, plotTop } = layoutHistoryBars([point(1, 8), point(2, 10), point(3, 12)])
    expect(bars).toHaveLength(3)
    expect(bars[2].height).toBeCloseTo(plotBottom - plotTop)
    expect(bars[0].height).toBeLessThan(bars[1].height)
    for (const bar of bars) expect(bar.y + bar.height).toBeCloseTo(plotBottom)
  })

  it('marks the best session, the most recent one on a tie', () => {
    const { bars } = layoutHistoryBars([point(1, 12), point(2, 10), point(3, 12)])
    expect(bars.map((b) => b.best)).toEqual([false, false, true])
  })

  it('flags sessions where every set was done', () => {
    const { bars } = layoutHistoryBars([point(1, 10, 2, 2), point(2, 10, 1, 2)])
    expect(bars.map((b) => b.full)).toEqual([true, false])
  })

  it('keeps a lone bar narrow and inside the chart', () => {
    const { bars } = layoutHistoryBars([point(1, 10)])
    expect(bars[0].width).toBeLessThanOrEqual(44)
    expect(bars[0].x).toBeGreaterThanOrEqual(0)
    expect(bars[0].x + bars[0].width).toBeLessThanOrEqual(CHART_WIDTH)
  })

  it('shows only the most recent sessions when there are many', () => {
    const points = Array.from({ length: 14 }, (_, i) => point(i, 10 + i))
    const { bars } = layoutHistoryBars(points, 10)
    expect(bars).toHaveLength(10)
    expect(bars[9].sessionId).toBe('s13')
    expect(bars[9].x + bars[9].width).toBeLessThanOrEqual(CHART_WIDTH + 0.001)
  })

  it('labels each bar with a short date', () => {
    const { bars } = layoutHistoryBars([point(1, 10)])
    expect(bars[0].date).toMatch(/^\d{1,2}\/\d{1,2}$/)
  })
})
