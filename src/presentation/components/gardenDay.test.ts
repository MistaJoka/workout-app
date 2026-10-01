import { describe, expect, it } from 'vitest'
import { daySpecies, speciesSuffix } from './gardenDay'
import { speciesFor } from '../../domain/progress/garden'

describe('daySpecies', () => {
  it("is the species each of the day's workouts grew, newest first, at most two", () => {
    expect(daySpecies([])).toEqual([])
    expect(daySpecies(['a'])).toEqual([speciesFor('a')])
    expect(daySpecies(['b', 'a', 'c'])).toEqual([speciesFor('b'), speciesFor('a')])
  })
})

describe('speciesSuffix', () => {
  it('names one or two species for screen readers', () => {
    const [x, y] = [speciesFor('a'), speciesFor('b')]
    expect(speciesSuffix([])).toBe('')
    expect(speciesSuffix([x])).toBe(`, ${x.name}`)
    expect(speciesSuffix([x, y])).toBe(x.id === y.id ? `, ${x.name}` : `, ${x.name} and ${y.name}`)
  })
})
