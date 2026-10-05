import { describe, expect, it } from 'vitest'
import { goalGainView } from './goalGainView'

describe('goalGainView: what Complete says about the goal', () => {
  it('shows the gain while the goal is still ahead', () => {
    expect(goalGainView(340, 365, 1000)).toEqual({ kind: 'gain', before: 340, after: 365 })
  })
  it('says ready once the goal is reached, never "1000 → 1000"', () => {
    expect(goalGainView(1000, 1000, 1000)).toEqual({ kind: 'ready' })
    expect(goalGainView(990, 1000, 1000)).toEqual({ kind: 'gain', before: 990, after: 1000 })
  })
})
