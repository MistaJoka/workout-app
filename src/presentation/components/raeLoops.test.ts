import { describe, expect, it } from 'vitest'
import { RAE_LOOPS, raeLoopForExercise, raeLoopUrl, raeStillFor, raeStillUrl, raeCardFor } from './raeLoops'

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
    const v = raeLoopForExercise('fs.bodyweight-squat')?.v
    expect(raeStillFor('fs.bodyweight-squat')).toEqual({ src: `/rae/ex-squat-2.png?v=${v}`, alt: 'Rae, squat' })
  })

  it('returns null when there is no Rae loop, so callers fall back to photos', () => {
    expect(raeStillFor('lib.Romanian_Deadlift')).toBeNull()
    expect(raeStillFor(undefined)).toBeNull()
  })
})

describe('library moves Rae demonstrates (owner-approved matches)', () => {
  it('maps the four matching extras to their library exercises', () => {
    expect(raeLoopForExercise('lib.Seated_Dumbbell_Press')?.id).toBe('ex-seated-dumbbell-press')
    expect(raeLoopForExercise('lib.One-Arm_Dumbbell_Row')?.id).toBe('ex-dumbbell-row')
    expect(raeLoopForExercise('lib.Split_Squats')?.id).toBe('ex-split-squat')
    expect(raeLoopForExercise('lib.Stiff-Legged_Dumbbell_Deadlift')?.id).toBe('ex-dumbbell-rdl')
  })
})

describe('Rae moves', () => {
  it('each bundled Rae exercise has its own loop', async () => {
    const { raeMoves } = await import('../../domain/content/fixtures/raeMoves')
    for (const move of raeMoves) {
      expect(raeLoopForExercise(move.id)?.id, move.id).toBe(`ex-${move.id.replace('rae.', '')}`)
    }
  })
})

describe('versioned loop URLs', () => {
  it('every loop carries a content version, so redrawn art gets a new URL', () => {
    for (const loop of RAE_LOOPS) expect(loop.v, loop.id).toMatch(/^[0-9a-f]{10}$/)
  })

  it('builds loop and still URLs with the version', () => {
    const loop = raeLoopForExercise('fs.bodyweight-squat')!
    expect(raeLoopUrl(loop.id)).toBe(`/rae/ex-squat.webp?v=${loop.v}`)
    expect(raeStillUrl(loop.id, 0)).toBe(`/rae/ex-squat-0.png?v=${loop.v}`)
  })

  it('falls back to a bare URL for an id it does not know', () => {
    expect(raeLoopUrl('ex-nope')).toBe('/rae/ex-nope.webp')
  })
})

describe('raeCardFor', () => {
  it("gives a card move's how-to card, versioned like its loop", () => {
    const card = raeCardFor('rae.clamshell')
    expect(card?.src).toMatch(/rae\/cards\/clamshell\.webp\?v=\w+$/)
    expect(card?.alt).toBe('Clamshell how-to card')
  })
  it('is null for a move without a card', () => {
    expect(raeCardFor('fs.bodyweight-squat')).toBeNull()
    expect(raeCardFor(undefined)).toBeNull()
  })
})
