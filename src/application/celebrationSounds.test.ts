import { describe, expect, it } from 'vitest'
import {
  buildBadgeSparkle,
  buildBloomChime,
  buildCelebrationNotes,
  buildGoalMetChord,
  buildLevelUpFanfare,
  buildStartWhoosh,
  type Note,
} from './celebrationSounds'

function end(notes: Note[]): number {
  return Math.max(...notes.map((n) => n.start + n.duration))
}

function isPleasant(frequency: number): boolean {
  // C-major pentatonic (C D E G A) across octaves from C5, within a cent of
  // tolerance for floating point.
  const C5 = 523.25
  const semitonesFromC5 = Math.round(12 * Math.log2(frequency / C5))
  const inOctave = ((semitonesFromC5 % 12) + 12) % 12
  return [0, 2, 4, 7, 9].includes(inOctave)
}

describe('celebration note builders', () => {
  it('start: a short rising whoosh, under a second, all pleasant notes', () => {
    const notes = buildStartWhoosh()
    expect(notes.length).toBeGreaterThanOrEqual(2)
    expect(end(notes)).toBeLessThan(1)
    for (const n of notes) expect(isPleasant(n.frequency)).toBe(true)
    for (let i = 1; i < notes.length; i++) expect(notes[i].frequency).toBeGreaterThan(notes[i - 1].frequency)
  })

  it('bloom: brighter and longer for a rare/legendary species', () => {
    const common = buildBloomChime(false)
    const rare = buildBloomChime(true)
    expect(end(common)).toBeLessThan(1)
    expect(end(rare)).toBeLessThan(1)
    expect(rare.length).toBeGreaterThan(common.length)
    expect(end(rare)).toBeGreaterThan(end(common))
    expect(Math.max(...rare.map((n) => n.frequency))).toBeGreaterThan(Math.max(...common.map((n) => n.frequency)))
    for (const n of [...common, ...rare]) expect(isPleasant(n.frequency)).toBe(true)
  })

  it('badge: a two-note sparkle under a second', () => {
    const notes = buildBadgeSparkle()
    expect(notes).toHaveLength(2)
    expect(end(notes)).toBeLessThan(1)
    expect(notes[1].frequency).toBeGreaterThan(notes[0].frequency)
    for (const n of notes) expect(isPleasant(n.frequency)).toBe(true)
  })

  it('levelUp: a four-note fanfare under a second', () => {
    const notes = buildLevelUpFanfare()
    expect(notes).toHaveLength(4)
    expect(end(notes)).toBeLessThan(1)
    for (const n of notes) expect(isPleasant(n.frequency)).toBe(true)
  })

  it('goalMet: a simultaneous warm chord under a second', () => {
    const notes = buildGoalMetChord()
    expect(notes.length).toBeGreaterThanOrEqual(3)
    expect(end(notes)).toBeLessThan(1)
    // A chord: every note starts together.
    for (const n of notes) expect(n.start).toBe(0)
    for (const n of notes) expect(isPleasant(n.frequency)).toBe(true)
  })

  it('none of the sequences ever startle: no note peaks past a soft 0.3 gain', () => {
    for (const kind of ['start', 'bloom', 'badge', 'levelUp', 'goalMet'] as const) {
      for (const n of buildCelebrationNotes(kind)) expect(n.peak ?? 0.18).toBeLessThanOrEqual(0.3)
    }
  })

  it('buildCelebrationNotes dispatches by kind, including bloom rarity', () => {
    expect(buildCelebrationNotes('start')).toEqual(buildStartWhoosh())
    expect(buildCelebrationNotes('badge')).toEqual(buildBadgeSparkle())
    expect(buildCelebrationNotes('levelUp')).toEqual(buildLevelUpFanfare())
    expect(buildCelebrationNotes('goalMet')).toEqual(buildGoalMetChord())
    expect(buildCelebrationNotes('bloom', { rare: true })).toEqual(buildBloomChime(true))
    expect(buildCelebrationNotes('bloom')).toEqual(buildBloomChime(false))
  })
})
