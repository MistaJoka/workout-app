import { db } from '../schema'
import { newId } from '../../../shared/id'
import type { WorkoutTemplate, WorkoutTemplateExercise } from '../../../domain/content/types'

export const CUSTOM_PACK_ID = 'custom'

export function isCustomTemplateId(id: string): boolean {
  return id.startsWith('custom.')
}

export function newCustomTemplateId(): string {
  return `custom.${newId()}`
}

export async function listCustomTemplates(): Promise<WorkoutTemplate[]> {
  const records = await db.customTemplates.orderBy('updatedAt').reverse().toArray()
  return records.map(({ createdAt: _c, updatedAt: _u, ...template }) => template)
}

export async function getCustomTemplate(id: string): Promise<WorkoutTemplate | undefined> {
  const record = await db.customTemplates.get(id)
  if (!record) return undefined
  const { createdAt: _c, updatedAt: _u, ...template } = record
  return template
}

export async function saveCustomTemplate(template: WorkoutTemplate): Promise<void> {
  const now = new Date().toISOString()
  const existing = await db.customTemplates.get(template.id)
  await db.customTemplates.put({
    ...template,
    packId: CUSTOM_PACK_ID,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  })
}

// "Add to a routine" from an exercise page: appends to an existing custom
// routine in one read-modify-write transaction. A move already in the
// routine is left as it is (a routine lists each exercise once).
export async function addExerciseToCustomTemplate(
  id: string,
  exerciseId: string,
  prescription: WorkoutTemplateExercise['prescription']
): Promise<'added' | 'already-in' | 'missing'> {
  return db.transaction('rw', db.customTemplates, async () => {
    const record = await db.customTemplates.get(id)
    if (!record) return 'missing'
    if (record.exercises.some((e) => e.exerciseId === exerciseId)) return 'already-in'
    const order = record.exercises.reduce((max, e) => Math.max(max, e.order), -1) + 1
    await db.customTemplates.put({
      ...record,
      exercises: [...record.exercises, { exerciseId, exerciseVersion: 1, prescription, order, optional: false }],
      updatedAt: new Date().toISOString(),
    })
    return 'added'
  })
}

export async function deleteCustomTemplate(id: string): Promise<void> {
  await db.customTemplates.delete(id)
}
