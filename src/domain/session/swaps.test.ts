import { describe, expect, it } from 'vitest'
import type { Exercise, WorkoutTemplate } from '../content/types'
import { createSessionPlanFromTemplate } from './createSessionPlan'
import { applySwaps, swapChoices } from './swaps'

function ex(id: string, opts: { reps?: boolean; time?: boolean; muscles?: string[]; equipment?: string[] } = {}): Exercise {
  return {
    id,
    version: 1,
    name: id.toUpperCase(),
    aliases: [],
    taxonomy: { category: 'strength', equipment: opts.equipment ?? ['bodyweight'], primaryMuscles: opts.muscles ?? ['chest'] },
    setup: '',
    executionPhases: [],
    cues: [],
    commonErrors: [],
    prescriptionCapabilities: { reps: opts.reps ?? true, time: opts.time ?? false, hold: false },
    mediaManifest: {},
    provenance: { author: 't', reviewedAt: null, status: 'approved' },
  }
}

const template: WorkoutTemplate = {
  id: 't1',
  version: 1,
  name: 'Routine',
  packId: 'p',
  exercises: [
    { exerciseId: 'pushup', exerciseVersion: 1, order: 0, optional: false, prescription: { sets: 3, reps: 12, restSeconds: 45 } },
    { exerciseId: 'plank', exerciseVersion: 1, order: 1, optional: false, prescription: { sets: 2, timeSeconds: 40, restSeconds: 30 } },
  ],
}

describe('applySwaps', () => {
  it('puts the chosen move in the slot, keeping sets, rest and the slot order', () => {
    const out = applySwaps(template, new Map([[0, ex('knee-pushup')]]))
    expect(out.exercises[0]).toEqual({
      exerciseId: 'knee-pushup',
      exerciseVersion: 1,
      order: 0,
      optional: false,
      prescription: { sets: 3, reps: 12, restSeconds: 45 },
    })
    expect(out.exercises[1]).toBe(template.exercises[1])
  })

  it('keeps a timed slot timed when the new move can be held', () => {
    const out = applySwaps(template, new Map([[1, ex('side-plank', { reps: false, time: true })]]))
    expect(out.exercises[1].prescription).toEqual({ sets: 2, timeSeconds: 40, restSeconds: 30 })
  })

  it("uses the new move's own default target when the kinds don't match", () => {
    // A reps slot swapped for a hold-only move: 30 s, not "12" of something.
    const out = applySwaps(template, new Map([[0, ex('wall-sit', { reps: false, time: true })]]))
    expect(out.exercises[0].prescription).toEqual({ sets: 3, timeSeconds: 30, restSeconds: 45 })
  })

  it('never mutates the routine it was given', () => {
    const before = JSON.stringify(template)
    applySwaps(template, new Map([[0, ex('knee-pushup')]]))
    expect(JSON.stringify(template)).toBe(before)
  })
})

describe('a plan with a swap', () => {
  it('runs the new move under its own name and records the swap', () => {
    const plan = createSessionPlanFromTemplate({
      id: 's',
      createdAt: '2026-10-29T00:00:00.000Z',
      template,
      exercises: [ex('pushup'), ex('plank', { reps: false, time: true }), ex('knee-pushup')],
      swaps: new Map([[0, ex('knee-pushup')]]),
    })
    expect(plan.exercises.map((e) => e.exerciseId)).toEqual(['knee-pushup', 'plank'])
    expect(plan.exercises[0].name).toBe('KNEE-PUSHUP')
    expect(plan.adaptations).toContainEqual({
      exerciseId: 'knee-pushup',
      reasonCode: 'SWAPPED_BY_USER',
      detail: 'Swapped in for PUSHUP.',
    })
    expect(plan.templateId).toBe('t1')
  })

  it('a swapped plan hashes differently from the routine as written', () => {
    const base = { id: 's', createdAt: '2026-10-29T00:00:00.000Z', template, exercises: [ex('pushup'), ex('knee-pushup')] }
    const a = createSessionPlanFromTemplate(base)
    const b = createSessionPlanFromTemplate({ ...base, swaps: new Map([[0, ex('knee-pushup')]]) })
    expect(a.reproducibilityHash).not.toBe(b.reproducibilityHash)
  })
})

describe('swapChoices', () => {
  const all = [
    ex('pushup', { muscles: ['chest'] }),
    ex('knee-pushup', { muscles: ['chest'] }),
    ex('dip', { muscles: ['triceps'] }),
    ex('squat', { muscles: ['quadriceps'] }),
    ex('plank', { muscles: ['abdominals'] }),
    ex('lib.db-press', { muscles: ['chest'], equipment: ['dumbbell'] }),
  ]

  it('leads with moves for the same muscle group, then everything else, never the moves already in the workout', () => {
    const { sameGroup, others, group } = swapChoices(all, all[0], [all[0], all[4]], () => false)
    expect(group).toBe('Chest')
    expect(sameGroup.map((e) => e.id)).toEqual(['knee-pushup'])
    expect(others.map((e) => e.id)).toEqual(['dip', 'squat'])
  })

  it('hides moves the library is hiding right now (equipment)', () => {
    const { sameGroup, others } = swapChoices(all, all[0], [all[0]], () => false)
    expect([...sameGroup, ...others].map((e) => e.id)).not.toContain('lib.db-press')
  })

  it('works for a move it knows nothing about', () => {
    const { sameGroup, others, group } = swapChoices(all, undefined, [], () => false)
    expect(group).toBeNull()
    expect(sameGroup).toEqual([])
    expect(others.length).toBeGreaterThan(0)
  })

  it("hides a curated move's library twin and borrows its muscle group", () => {
    const curated = { ...ex('fs.squat', { muscles: [] }), name: 'Bodyweight Squat' }
    curated.taxonomy = { category: 'strength', equipment: ['bodyweight'] }
    curated.provenance = { ...curated.provenance, sourceRecordId: 'Bodyweight_Squat' }
    const twin = { ...ex('lib.Bodyweight_Squat', { muscles: ['quadriceps'] }), name: 'Bodyweight Squat' }
    twin.provenance = { ...twin.provenance, sourceRecordId: 'Bodyweight_Squat' }
    const lunge = ex('lib.Lunge', { muscles: ['quadriceps'] })
    const { group, sameGroup } = swapChoices([twin, lunge, ...all], curated, [curated], () => false)
    expect(group).toBe('Legs')
    expect(sameGroup.map((e) => e.id)).toEqual(['lib.Lunge', 'squat'])
  })
})
