import { describe, expect, it } from 'vitest'
import { shortCues, stepsAddToCues } from './cues'
import { exerciseById } from './fixtures/foundationStrengthStarter'

const move = (id: string, setup: string, cues: string[] = []) => ({ id, setup, cues })

describe('shortCues', () => {
  it("uses the move's own cues first", () => {
    expect(shortCues(move('x', 'A long setup sentence.', ['Brace', 'Breathe']))).toEqual(['Brace', 'Breathe'])
  })

  it("uses the owner's Rae card cues for a library move she drew", () => {
    expect(shortCues(move('lib.Reverse_Crunch', 'Lie down on the floor with your legs fully extended and arms to the side.'))).toEqual([
      'Knees start over hips',
      'Lift with your core',
      'Small controlled motion',
      'Lower slowly',
    ])
  })

  it('falls back to the opening sentence when it is short', () => {
    const squat = exerciseById.get('fs.bodyweight-squat')!
    expect(shortCues(squat)).toEqual(['Stand with your feet shoulder width apart.'])
  })

  it('shows nothing rather than a long upstream sentence', () => {
    const plank = exerciseById.get('fs.plank')!
    expect(shortCues(plank)).toEqual([])
  })
})

describe('stepsAddToCues', () => {
  it("is false when the steps are just the cues (a Rae card move's steps)", () => {
    expect(stepsAddToCues(['Feet flat.', 'Lift your hips gently.'], ['Feet flat', 'Lift your hips gently'])).toBe(false)
  })

  it('is true when the steps say more', () => {
    expect(stepsAddToCues(['Stand tall.', 'Squat down.'], ['Stand tall.'])).toBe(true)
    expect(stepsAddToCues(['Stand tall.'], [])).toBe(true)
  })
})
