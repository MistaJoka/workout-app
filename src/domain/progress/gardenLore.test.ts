import { describe, expect, it } from 'vitest'
import { GARDEN_SPECIES } from './garden'
import { GARDEN_LORE, GARDEN_LORE_MAX_LENGTH, everySpeciesHasLore, loreFor } from './gardenLore'

describe('garden lore', () => {
  it('has a lore line for every species, within the length limit', () => {
    expect(everySpeciesHasLore()).toBe(true)
    for (const species of GARDEN_SPECIES) {
      const lore = GARDEN_LORE[species.id]
      expect(lore, `missing lore for ${species.id}`).toBeTruthy()
      expect(lore.length).toBeGreaterThan(0)
      expect(lore.length).toBeLessThanOrEqual(GARDEN_LORE_MAX_LENGTH)
    }
  })

  it('has no stray keys for species that no longer exist', () => {
    const ids = new Set(GARDEN_SPECIES.map((s) => s.id))
    for (const key of Object.keys(GARDEN_LORE)) {
      expect(ids.has(key), `lore key ${key} has no matching species`).toBe(true)
    }
  })

  it('loreFor returns the matching line, and a gentle fallback for an unknown id', () => {
    const first = GARDEN_SPECIES[0]
    expect(loreFor(first.id)).toBe(GARDEN_LORE[first.id])
    expect(loreFor('not-a-real-species')).toBeTruthy()
  })
})
