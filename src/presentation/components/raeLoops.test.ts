import { describe, expect, it } from 'vitest'
import { raeLoopForExercise, raeStillFor } from './raeLoops'

describe('raeLoopForExercise', () => {
  it('finds the loop for each of the 9 curated exercises', () => {
    for (const id of [
      'fs.bodyweight-squat',
      'fs.incline-push-up',
      'fs.single-leg-glute-bridge',
      'fs.dead-bug',
      'fs.plank',
      'fs.walking-lunge',
      'fs.glute-bridge',
      'fs.crunches',
      'fs.superman',
    ]) {
      expect(raeLoopForExercise(id), id).toBeDefined()
    }
    expect(raeLoopForExercise('fs.bodyweight-squat')?.id).toBe('ex-squat')
  })

  it('has no loop for exercises Rae does not demonstrate yet', () => {
    expect(raeLoopForExercise('lib.Romanian_Deadlift')).toBeUndefined()
    expect(raeLoopForExercise(undefined)).toBeUndefined()
  })
})

describe('raeStillFor', () => {
  it('returns the peak key frame for a move Rae demonstrates', () => {
    expect(raeStillFor('fs.bodyweight-squat')).toEqual({ src: '/rae/ex-squat-2.png', alt: 'Rae, squat' })
  })

  it('returns null when there is no Rae loop, so callers fall back to photos', () => {
    expect(raeStillFor('lib.Romanian_Deadlift')).toBeNull()
    expect(raeStillFor(undefined)).toBeNull()
  })
})
