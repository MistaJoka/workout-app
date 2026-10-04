import { describe, expect, it } from 'vitest'
import { firstRaeLoop } from './todayPose'
import { RAE_LOOPS } from './components/raeLoops'

const withLoop = RAE_LOOPS[0].exerciseIds[0]

describe('firstRaeLoop', () => {
  it('returns the loop of the first move Rae demonstrates, in workout order', () => {
    expect(firstRaeLoop(['no-such-move', withLoop])?.id).toBe(RAE_LOOPS[0].id)
  })
  it('is null when Rae demonstrates none of the moves', () => {
    expect(firstRaeLoop(['no-such-move', 'another'])).toBeNull()
    expect(firstRaeLoop([])).toBeNull()
  })
})
