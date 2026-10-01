import { describe, expect, it } from 'vitest'
import { dayLabel, weekSummary } from './WeekBlooms'
import type { WeekDay } from '../../domain/schedule/todayView'
import { speciesFor } from '../../domain/progress/garden'

function day(overrides: Partial<WeekDay>): WeekDay {
  return {
    weekday: 3,
    letter: 'W',
    isToday: false,
    isPast: false,
    mark: 'open',
    count: 0,
    sessions: [],
    plannedTemplateId: null,
    ...overrides,
  }
}

const names = { sessions: { s1: 'Full-Body A', s2: 'Quick 10' }, templates: { 'fs.full-body-a': 'Full-Body A' } }

describe('dayLabel', () => {
  it('names the workout done that day', () => {
    const done = day({ mark: 'done', count: 1, sessions: [{ sessionId: 's1', planId: 'p1', endedAt: '' }] })
    expect(dayLabel(done, names)).toBe(`Wednesday, Full-Body A done, ${speciesFor('s1').name}`)
  })

  it('counts several workouts on one day', () => {
    const sessions = [
      { sessionId: 's2', planId: 'p2', endedAt: '' },
      { sessionId: 's1', planId: 'p1', endedAt: '' },
    ]
    const [a, b] = [speciesFor('s2').name, speciesFor('s1').name]
    expect(dayLabel(day({ mark: 'done', count: 2, sessions }), names)).toBe(
      `Wednesday, 2 workouts done, ${a === b ? a : `${a} and ${b}`}`
    )
  })

  it('names a planned workout, and says rest or nothing planned otherwise', () => {
    expect(dayLabel(day({ mark: 'planned', plannedTemplateId: 'fs.full-body-a' }), names)).toBe(
      'Wednesday, Full-Body A planned'
    )
    expect(dayLabel(day({ mark: 'rest' }), names)).toBe('Wednesday, rest day')
    expect(dayLabel(day({ mark: 'open' }), names)).toBe('Wednesday, nothing planned')
  })

  it('marks today, and falls back to a generic name', () => {
    expect(dayLabel(day({ isToday: true, mark: 'planned', plannedTemplateId: 'x' }), names)).toBe(
      'Wednesday, today, workout planned'
    )
  })
})

describe('weekSummary', () => {
  it('names the goal before the first workout of the week', () => {
    expect(weekSummary(0, 2)).toBe('Goal: 2 this week')
  })

  it('reads progress toward the goal, never a bare count', () => {
    expect(weekSummary(1, 2)).toBe('1 of 2 this week')
    expect(weekSummary(2, 3)).toBe('2 of 3 this week')
  })

  it('says the goal is met, and keeps counting past it', () => {
    expect(weekSummary(2, 2)).toBe('Goal met, 2 of 2')
    expect(weekSummary(3, 2)).toBe('Goal met, 3 of 2')
  })
})
