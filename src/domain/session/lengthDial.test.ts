import { describe, expect, it } from 'vitest'
import { lengthDecisions, LONG_MAX_SETS, scaleTemplate } from './lengthDial'
import { ROTATION, templateById } from '../content/fixtures/foundationStrengthStarter'
import type { WorkoutTemplate } from '../content/types'

const fullBodyA = templateById.get(ROTATION[0])!
const withSets = (t: WorkoutTemplate, sets: number): WorkoutTemplate => ({
  ...t,
  exercises: t.exercises.map((e) => ({ ...e, prescription: { ...e.prescription, sets } })),
})

describe('scaleTemplate', () => {
  it('usual changes nothing', () => {
    expect(scaleTemplate(fullBodyA, 'usual')).toBe(fullBodyA)
  })

  it('short is one set of every move, nothing else touched', () => {
    const short = scaleTemplate(fullBodyA, 'short')
    expect(short.exercises.map((e) => e.prescription.sets)).toEqual(fullBodyA.exercises.map(() => 1))
    expect(short.exercises.map((e) => ({ ...e, prescription: { ...e.prescription, sets: 0 } }))).toEqual(
      fullBodyA.exercises.map((e) => ({ ...e, prescription: { ...e.prescription, sets: 0 } }))
    )
  })

  it('long adds one set, capped at 4, and never lowers a bigger count', () => {
    expect(scaleTemplate(fullBodyA, 'long').exercises[0].prescription.sets).toBe(fullBodyA.exercises[0].prescription.sets + 1)
    expect(scaleTemplate(withSets(fullBodyA, LONG_MAX_SETS), 'long').exercises.every((e) => e.prescription.sets === 4)).toBe(true)
    expect(scaleTemplate(withSets(fullBodyA, 5), 'long').exercises.every((e) => e.prescription.sets === 5)).toBe(true)
  })
})

describe('lengthDecisions', () => {
  it('records an inspectable reason per move', () => {
    expect(lengthDecisions(fullBodyA, 'usual')).toEqual([])
    expect(lengthDecisions(fullBodyA, 'short')[0]).toMatchObject({ reasonCode: 'LENGTH_SHORT' })
    expect(lengthDecisions(fullBodyA, 'long')).toHaveLength(fullBodyA.exercises.length)
    expect(lengthDecisions(fullBodyA, 'long')[0]).toMatchObject({ reasonCode: 'LENGTH_LONG' })
  })
})
