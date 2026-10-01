import { describe, expect, it } from 'vitest'
import { EMPTY_RAE_MEMORY, RAE_LINES, raeSays, type RaeMemory, type RaeSaysInput } from './raeSays'

const base: RaeSaysInput = {
  mode: 'ready',
  hasFinished: true,
  daysSinceLast: 1,
  goalMet: false,
  part: 'morning',
  dateKey: '2026-10-01',
}

// Memory lines only show up on roughly half of days (the hash gate), so
// tests that need one find a dateKey where it actually fires, instead of
// assuming a fixed date works. `probe-0`, `probe-1`, ... are opaque keys:
// raeSays only ever hashes them, never parses them as dates.
function dateKeyWhereMemoryFires(input: Omit<RaeSaysInput, 'dateKey'>): string {
  for (let i = 0; i < 200; i++) {
    const dateKey = `probe-${i}`
    const withMemory = raeSays({ ...input, dateKey })
    const without = raeSays({ ...input, dateKey, memory: undefined })
    if (withMemory !== without) return dateKey
  }
  throw new Error('no probe dateKey made a memory line fire within 200 tries')
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

describe('raeSays memory', () => {
  it('without a memory input, behaves exactly as before', () => {
    expect(raeSays(base)).toBe(raeSays({ ...base, memory: undefined }))
  })

  it('leads with the standout move from the last session', () => {
    const memory: RaeMemory = {
      ...EMPTY_RAE_MEMORY,
      lastSession: { templateName: null, standout: { exerciseName: 'Squats', isHold: false, isNewBest: false } },
    }
    const dateKey = dateKeyWhereMemoryFires({ ...base, memory })
    expect(raeSays({ ...base, memory, dateKey })).toBe('Squats looked strong yesterday!')
  })

  it('calls out a new best hold differently from a plain standout', () => {
    const memory: RaeMemory = {
      ...EMPTY_RAE_MEMORY,
      lastSession: { templateName: null, standout: { exerciseName: 'Plank', isHold: true, isNewBest: true } },
    }
    const dateKey = dateKeyWhereMemoryFires({ ...base, memory })
    expect(raeSays({ ...base, memory, dateKey })).toBe('You beat your Plank time!')
  })

  it('notices two sessions in a row on the same routine', () => {
    const memory: RaeMemory = {
      ...EMPTY_RAE_MEMORY,
      lastSession: { templateName: 'Full-Body A', standout: null },
      sameTemplateAsPrevious: true,
    }
    const dateKey = dateKeyWhereMemoryFires({ ...base, memory })
    expect(raeSays({ ...base, memory, dateKey })).toBe('Two days of Full-Body A, nice rhythm.')
  })

  it('never reports a streak without a template name to show', () => {
    const memory: RaeMemory = { ...EMPTY_RAE_MEMORY, lastSession: { templateName: null, standout: null }, sameTemplateAsPrevious: true }
    for (let i = 0; i < 50; i++) {
      expect(raeSays({ ...base, memory, dateKey: `probe-${i}` })).toBe(raeSays({ ...base, dateKey: `probe-${i}` }))
    }
  })

  it('mentions a rare flower still glowing from the last few days', () => {
    const memory: RaeMemory = { ...EMPTY_RAE_MEMORY, recentRareFlower: { speciesName: 'Moon Lily' } }
    const dateKey = dateKeyWhereMemoryFires({ ...base, memory })
    expect(raeSays({ ...base, memory, dateKey })).toBe('That Moon Lily is still glowing.')
  })

  it('recaps a just-beaten hold on a done day, but never on a rest or ready day', () => {
    const memory: RaeMemory = { ...EMPTY_RAE_MEMORY, justBeatHold: { exerciseName: 'Plank' } }
    const doneInput = { ...base, mode: 'done' as const, daysSinceLast: 0, goalMet: false }
    const dateKey = dateKeyWhereMemoryFires({ ...doneInput, memory })
    expect(raeSays({ ...doneInput, memory, dateKey })).toBe('You beat your Plank time!')
    // justBeatHold only ever feeds the 'done' recap, not ready/rest lines.
    for (let i = 0; i < 50; i++) {
      const probe = `probe-${i}`
      expect(raeSays({ ...base, memory, dateKey: probe })).toBe(raeSays({ ...base, dateKey: probe }))
    }
  })

  it('keeps resume, first-time, welcome-back and goal-met priority over any memory', () => {
    const memory: RaeMemory = {
      lastSession: { templateName: 'Full-Body A', standout: { exerciseName: 'Squats', isHold: false, isNewBest: true } },
      sameTemplateAsPrevious: true,
      recentRareFlower: { speciesName: 'Moon Lily' },
      justBeatHold: { exerciseName: 'Plank' },
    }
    for (let i = 0; i < 20; i++) {
      const dateKey = `probe-${i}`
      expect(RAE_LINES.resume).toContain(raeSays({ ...base, memory, mode: 'resume', dateKey }))
      expect(RAE_LINES.first).toContain(raeSays({ ...base, memory, hasFinished: false, daysSinceLast: null, dateKey }))
      expect(RAE_LINES.welcomeBack).toContain(raeSays({ ...base, memory, daysSinceLast: 9, dateKey }))
      expect(RAE_LINES.goalMet).toContain(raeSays({ ...base, memory, mode: 'done', daysSinceLast: 0, goalMet: true, dateKey }))
    }
  })

  it('falls back to a generic line when no shortening makes the name fit', () => {
    // A single word longer than the budget can't be shortened at all.
    const longName = 'Unbelievablylongexercisenamewithnospaces'
    const memory: RaeMemory = {
      ...EMPTY_RAE_MEMORY,
      lastSession: { templateName: null, standout: { exerciseName: longName, isHold: false, isNewBest: false } },
    }
    for (let i = 0; i < 50; i++) {
      const dateKey = `probe-${i}`
      // With nothing else to shorten the name to a sensible chunk under 40
      // chars, the line must never be built — generic lines only.
      expect(RAE_LINES.readyMorning).toContain(raeSays({ ...base, memory, dateKey }))
    }
  })

  it('shortens a long but word-breakable name to fit, and keeps every produced line within 40 chars', () => {
    const names = [
      'Squats',
      'Bodyweight Bulgarian Split Squat',
      'Standing Dumbbell Lateral Raise',
      'Plank',
      'Single-Leg Glute Bridge',
    ]
    for (const exerciseName of names) {
      const memory: RaeMemory = {
        ...EMPTY_RAE_MEMORY,
        lastSession: { templateName: null, standout: { exerciseName, isHold: false, isNewBest: false } },
      }
      for (let i = 0; i < 50; i++) {
        const line = raeSays({ ...base, memory, dateKey: `probe-${i}` })
        expect(line.length).toBeLessThanOrEqual(40)
        expect(line).not.toMatch(/miss|should|lazy|skipped|behind|again\?/i)
      }
    }
  })
})
