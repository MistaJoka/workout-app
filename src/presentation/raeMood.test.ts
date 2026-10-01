import { describe, expect, it } from 'vitest'
import { CELEBRATE_MS, raeMood, type RaeMoodInput } from './raeMood'
import { RAE_EXPRESSIONS } from './components/Rae'

const base: RaeMoodInput = {
  phase: 'active',
  msSinceCompletedSet: null,
  isFlowMilestone: false,
  isLastSet: false,
  isLastMove: false,
  seed: '0:1',
}

describe('raeMood', () => {
  it('is focused during a plain active set', () => {
    expect(raeMood(base).expression).toBe('focused')
  })

  it('laughs right after a counted set, then settles back once the window passes', () => {
    expect(raeMood({ ...base, msSinceCompletedSet: 0 }).expression).toBe('laugh')
    expect(raeMood({ ...base, msSinceCompletedSet: CELEBRATE_MS - 1 }).expression).toBe('laugh')
    expect(raeMood({ ...base, msSinceCompletedSet: CELEBRATE_MS }).expression).toBe('focused')
    expect(raeMood({ ...base, msSinceCompletedSet: CELEBRATE_MS + 500 }).expression).toBe('focused')
  })

  it('is surprised instead of laughing when that set hit a flow milestone', () => {
    expect(raeMood({ ...base, msSinceCompletedSet: 10, isFlowMilestone: true }).expression).toBe('surprised')
  })

  it('cheers on the last set of the whole workout', () => {
    expect(raeMood({ ...base, isLastSet: true }).expression).toBe('cheer')
  })

  it('is determined on the last move once no other rule applies', () => {
    expect(raeMood({ ...base, isLastMove: true }).expression).toBe('determined')
  })

  it('the last set wins over merely being on the last move', () => {
    expect(raeMood({ ...base, isLastSet: true, isLastMove: true }).expression).toBe('cheer')
  })

  it('is determined while a timed hold runs', () => {
    expect(raeMood({ ...base, phase: 'holding' }).expression).toBe('determined')
  })

  it('breathes tired during rest', () => {
    expect(raeMood({ ...base, phase: 'resting' }).expression).toBe('tired')
  })

  it('smiles when paused', () => {
    expect(raeMood({ ...base, phase: 'paused' }).expression).toBe('smile')
  })

  it('a fresh celebration overrides rest, pause, and a running hold for its short window', () => {
    expect(raeMood({ ...base, phase: 'resting', msSinceCompletedSet: 0 }).expression).toBe('laugh')
    expect(raeMood({ ...base, phase: 'paused', msSinceCompletedSet: 0 }).expression).toBe('laugh')
    expect(raeMood({ ...base, phase: 'holding', msSinceCompletedSet: 0 }).expression).toBe('laugh')
  })

  it('only the celebratory/last-set moments carry a line; routine states stay quiet', () => {
    expect(raeMood(base).line).toBeUndefined()
    expect(raeMood({ ...base, phase: 'resting' }).line).toBeUndefined()
    expect(raeMood({ ...base, phase: 'paused' }).line).toBeUndefined()
    expect(raeMood({ ...base, phase: 'holding' }).line).toBeUndefined()
    expect(raeMood({ ...base, isLastMove: true }).line).toBeUndefined()
    expect(raeMood({ ...base, msSinceCompletedSet: 10 }).line).toBeDefined()
    expect(raeMood({ ...base, msSinceCompletedSet: 10, isFlowMilestone: true }).line).toBeDefined()
    expect(raeMood({ ...base, isLastSet: true }).line).toBeDefined()
  })

  it('picks the same line for the same seed, and varies across seeds', () => {
    const a = raeMood({ ...base, msSinceCompletedSet: 10, seed: 'x' })
    const b = raeMood({ ...base, msSinceCompletedSet: 10, seed: 'x' })
    expect(a.line).toBe(b.line)
    const lines = new Set(
      ['a', 'b', 'c', 'd', 'e'].map((seed) => raeMood({ ...base, msSinceCompletedSet: 10, seed }).line)
    )
    expect(lines.size).toBeGreaterThan(1)
  })

  it('only ever returns an expression that exists as Rae art', () => {
    const moods = [
      raeMood(base),
      raeMood({ ...base, msSinceCompletedSet: 10 }),
      raeMood({ ...base, msSinceCompletedSet: 10, isFlowMilestone: true }),
      raeMood({ ...base, isLastSet: true }),
      raeMood({ ...base, isLastMove: true }),
      raeMood({ ...base, phase: 'holding' }),
      raeMood({ ...base, phase: 'resting' }),
      raeMood({ ...base, phase: 'paused' }),
    ]
    for (const mood of moods) expect(RAE_EXPRESSIONS).toContain(mood.expression)
  })

  it('every line is short enough for a quick glance, and never guilt-trips', () => {
    const lines = [
      raeMood({ ...base, msSinceCompletedSet: 10 }).line,
      raeMood({ ...base, msSinceCompletedSet: 10, isFlowMilestone: true }).line,
      raeMood({ ...base, isLastSet: true }).line,
    ]
    for (const line of lines) {
      expect(line).toBeDefined()
      expect(line!.length).toBeLessThanOrEqual(40)
      expect(line).not.toMatch(/miss|should|lazy|skipped|behind|hurry/i)
    }
  })
})
