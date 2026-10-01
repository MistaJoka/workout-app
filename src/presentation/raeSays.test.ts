import { describe, expect, it } from 'vitest'
import { RAE_LINES, raeSays, type RaeSaysInput } from './raeSays'

const base: RaeSaysInput = {
  mode: 'ready',
  hasFinished: true,
  daysSinceLast: 1,
  goalMet: false,
  part: 'morning',
  dateKey: '2026-10-01',
}

describe('raeSays', () => {
  it('picks the same line all day, so it never flickers', () => {
    expect(raeSays(base)).toBe(raeSays({ ...base }))
  })

  it('varies by day within a state', () => {
    const lines = new Set(
      ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05'].map((dateKey) =>
        raeSays({ ...base, dateKey })
      )
    )
    expect(lines.size).toBeGreaterThan(1)
  })

  it('resume wins over everything', () => {
    expect(RAE_LINES.resume).toContain(raeSays({ ...base, mode: 'resume', hasFinished: false, daysSinceLast: 30 }))
  })

  it('greets a first-timer before any workout', () => {
    expect(RAE_LINES.first).toContain(raeSays({ ...base, hasFinished: false, daysSinceLast: null }))
  })

  it('welcomes back after 4+ days away, without guilt', () => {
    expect(RAE_LINES.welcomeBack).toContain(raeSays({ ...base, daysSinceLast: 4 }))
    expect(RAE_LINES.welcomeBack).toContain(raeSays({ ...base, mode: 'rest', daysSinceLast: 9 }))
    expect(RAE_LINES.welcomeBack).not.toContain(raeSays({ ...base, daysSinceLast: 3 }))
  })

  it('celebrates the weekly goal on a done day, otherwise just today', () => {
    expect(RAE_LINES.goalMet).toContain(raeSays({ ...base, mode: 'done', daysSinceLast: 0, goalMet: true }))
    expect(RAE_LINES.done).toContain(raeSays({ ...base, mode: 'done', daysSinceLast: 0 }))
  })

  it('keeps rest days restful', () => {
    expect(RAE_LINES.rest).toContain(raeSays({ ...base, mode: 'rest' }))
  })

  it('a ready day follows the time of day', () => {
    expect(RAE_LINES.readyMorning).toContain(raeSays(base))
    expect(RAE_LINES.readyAfternoon).toContain(raeSays({ ...base, part: 'afternoon' }))
    expect(RAE_LINES.readyEvening).toContain(raeSays({ ...base, part: 'evening' }))
    expect(RAE_LINES.readyEvening).toContain(raeSays({ ...base, part: 'night' }))
  })

  it('every line is short enough for the bubble, and never guilt-trips', () => {
    for (const line of Object.values(RAE_LINES).flat()) {
      expect(line.length).toBeLessThanOrEqual(40)
      expect(line).not.toMatch(/miss|should|lazy|skipped|behind|again\?/i)
    }
  })
})
