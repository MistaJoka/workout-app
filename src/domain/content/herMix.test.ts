import { describe, expect, it } from 'vitest'
import { buildHerMix, HER_MIX_ID, type Heart } from './herMix'
import { exerciseById } from './fixtures/foundationStrengthStarter'
import { isShownNow } from './library'
import type { Exercise } from './types'

const ids = [...exerciseById.keys()]
const lookup = (id: string) => exerciseById.get(id)
const heart = (exerciseId: string, minute: number): Heart => ({
  exerciseId,
  updatedAt: new Date(Date.UTC(2026, 9, 6, 10, minute)).toISOString(),
})

describe('buildHerMix', () => {
  it('needs at least 3 hearted moves', () => {
    expect(buildHerMix([heart(ids[0], 1), heart(ids[1], 2)], lookup)).toBeNull()
  })

  it('builds a routine in heart order with default prescriptions', () => {
    const mix = buildHerMix([heart(ids[2], 3), heart(ids[0], 1), heart(ids[1], 2)], lookup)!
    expect(mix.id).toBe(HER_MIX_ID)
    expect(mix.name).toBe('Her mix')
    expect(mix.exercises.map((e) => e.exerciseId)).toEqual([ids[0], ids[1], ids[2]])
    expect(mix.exercises.map((e) => e.order)).toEqual([0, 1, 2])
    expect(mix.exercises[0].prescription.sets).toBe(3)
  })

  it('keeps only the 8 most recent hearts', () => {
    expect(ids.length).toBeGreaterThanOrEqual(9)
    const many = ids.slice(0, 9).map((id, i) => heart(id, i))
    const mix = buildHerMix(many, lookup)!
    expect(mix.exercises).toHaveLength(8)
    expect(mix.exercises[0].exerciseId).toBe(ids[1])
  })

  it('skips moves that are unknown or hidden now, and they do not count toward 3', () => {
    const base = exerciseById.get(ids[0])!
    const hidden: Exercise = { ...base, id: 'lib.hidden', taxonomy: { ...base.taxonomy, equipment: ['barbell'] } }
    expect(isShownNow(hidden)).toBe(false)
    const withHidden = (id: string) => (id === 'lib.hidden' ? hidden : lookup(id))
    expect(
      buildHerMix([heart('lib.hidden', 1), heart('lib.gone', 2), heart(ids[0], 3), heart(ids[1], 4)], withHidden)
    ).toBeNull()
  })

  it('versions the mix by its moves, so a plan records which mix it ran', () => {
    const a = buildHerMix([heart(ids[0], 1), heart(ids[1], 2), heart(ids[2], 3)], lookup)!
    const b = buildHerMix([heart(ids[0], 1), heart(ids[1], 2), heart(ids[3], 3)], lookup)!
    expect(Number.isInteger(a.version)).toBe(true)
    expect(a.version).not.toBe(b.version)
  })
})
