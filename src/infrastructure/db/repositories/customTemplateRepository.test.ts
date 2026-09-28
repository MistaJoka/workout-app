import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../schema'
import {
  addExerciseToCustomTemplate,
  deleteCustomTemplate,
  getCustomTemplate,
  listCustomTemplates,
  newCustomTemplateId,
  saveCustomTemplate,
} from './customTemplateRepository'
import type { WorkoutTemplate } from '../../../domain/content/types'

function template(id: string, name: string): WorkoutTemplate {
  return {
    id,
    version: 1,
    name,
    packId: 'custom',
    exercises: [
      { exerciseId: 'lib.Barbell_Squat', exerciseVersion: 1, prescription: { sets: 3, reps: 8, restSeconds: 60 }, order: 0, optional: false },
    ],
  }
}

beforeEach(async () => {
  await db.customTemplates.clear()
})

describe('customTemplateRepository', () => {
  it('round-trips a saved routine without leaking bookkeeping fields into the template shape', async () => {
    const id = newCustomTemplateId()
    await saveCustomTemplate(template(id, 'Leg day'))
    const loaded = await getCustomTemplate(id)
    expect(loaded).toEqual(template(id, 'Leg day'))
  })

  it('lists routines most-recently-updated first', async () => {
    const a = newCustomTemplateId()
    const b = newCustomTemplateId()
    await saveCustomTemplate(template(a, 'First'))
    await new Promise((r) => setTimeout(r, 5))
    await saveCustomTemplate(template(b, 'Second'))
    expect((await listCustomTemplates()).map((t) => t.name)).toEqual(['Second', 'First'])
  })

  it('preserves createdAt across edits and forces the custom pack id', async () => {
    const id = newCustomTemplateId()
    await saveCustomTemplate({ ...template(id, 'v1'), packId: 'something-else' })
    const created = (await db.customTemplates.get(id))!.createdAt
    await new Promise((r) => setTimeout(r, 5))
    await saveCustomTemplate(template(id, 'v2'))
    const record = (await db.customTemplates.get(id))!
    expect(record.createdAt).toBe(created)
    expect(record.updatedAt > created).toBe(true)
    expect(record.packId).toBe('custom')
    expect(record.name).toBe('v2')
  })

  it('deletes a routine', async () => {
    const id = newCustomTemplateId()
    await saveCustomTemplate(template(id, 'Gone'))
    await deleteCustomTemplate(id)
    expect(await getCustomTemplate(id)).toBeUndefined()
  })
})

describe('addExerciseToCustomTemplate', () => {
  const entry = { sets: 3, reps: 10, restSeconds: 60 }

  it('appends the exercise at the end with the next order', async () => {
    const id = newCustomTemplateId()
    await saveCustomTemplate(template(id, 'Leg day'))
    expect(await addExerciseToCustomTemplate(id, 'lib.Pushups', entry)).toBe('added')
    const loaded = await getCustomTemplate(id)
    expect(loaded?.exercises.map((e) => [e.exerciseId, e.order])).toEqual([
      ['lib.Barbell_Squat', 0],
      ['lib.Pushups', 1],
    ])
    expect(loaded?.exercises[1]).toEqual({ exerciseId: 'lib.Pushups', exerciseVersion: 1, prescription: entry, order: 1, optional: false })
  })

  it('leaves the routine alone when the exercise is already in it', async () => {
    const id = newCustomTemplateId()
    await saveCustomTemplate(template(id, 'Leg day'))
    expect(await addExerciseToCustomTemplate(id, 'lib.Barbell_Squat', entry)).toBe('already-in')
    expect((await getCustomTemplate(id))?.exercises).toHaveLength(1)
  })

  it('reports a routine that no longer exists instead of creating one', async () => {
    expect(await addExerciseToCustomTemplate('custom.gone', 'lib.Pushups', entry)).toBe('missing')
    expect(await getCustomTemplate('custom.gone')).toBeUndefined()
  })
})
