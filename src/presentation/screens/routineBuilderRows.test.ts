import { describe, expect, it } from 'vitest'
import { buildEditRows } from './routineBuilderRows'
import type { Exercise, WorkoutTemplate } from '../../domain/content/types'

const exercise = (id: string, name: string): Exercise => ({ id, name } as unknown as Exercise)

const template = (exercises: WorkoutTemplate['exercises']): WorkoutTemplate =>
  ({ id: 't1', version: 1, name: 'Template', packId: 'custom', exercises }) as unknown as WorkoutTemplate

const templateExercise = (exerciseId: string, sets: number): WorkoutTemplate['exercises'][number] =>
  ({
    exerciseId,
    exerciseVersion: 1,
    prescription: { sets, reps: 10, restSeconds: 60 },
    order: 0,
    optional: false,
  }) as unknown as WorkoutTemplate['exercises'][number]

describe('buildEditRows', () => {
  it('keeps a row for every template exercise, resolving each against the exercise map', () => {
    const t = template([templateExercise('lib.a', 3), templateExercise('lib.b', 4)])
    const exercises = new Map([
      ['lib.a', exercise('lib.a', 'A')],
      ['lib.b', exercise('lib.b', 'B')],
    ])

    const rows = buildEditRows(t, exercises)

    expect(rows.map((r) => [r.exerciseId, r.exercise?.name, r.sets])).toEqual([
      ['lib.a', 'A', 3],
      ['lib.b', 'B', 4],
    ])
  })

  it('keeps a row with exercise: null and its prescription intact when the id no longer resolves', () => {
    const t = template([templateExercise('lib.a', 3), templateExercise('lib.gone', 5)])
    const exercises = new Map([['lib.a', exercise('lib.a', 'A')]])

    const rows = buildEditRows(t, exercises)

    expect(rows).toHaveLength(2)
    expect(rows[1]).toMatchObject({ exerciseId: 'lib.gone', exercise: null, sets: 5, reps: 10, restSeconds: 60 })
  })

  it('preserves template order', () => {
    const t = template([templateExercise('lib.c', 1), templateExercise('lib.a', 2), templateExercise('lib.b', 3)])
    const exercises = new Map([
      ['lib.a', exercise('lib.a', 'A')],
      ['lib.b', exercise('lib.b', 'B')],
      ['lib.c', exercise('lib.c', 'C')],
    ])

    const rows = buildEditRows(t, exercises)

    expect(rows.map((r) => r.exerciseId)).toEqual(['lib.c', 'lib.a', 'lib.b'])
  })
})
