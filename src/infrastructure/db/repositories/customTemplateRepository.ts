import { db } from '../schema'
import type { WorkoutTemplate } from '../../../domain/content/types'

export const CUSTOM_PACK_ID = 'custom'

export function isCustomTemplateId(id: string): boolean {
  return id.startsWith('custom.')
}

export function newCustomTemplateId(): string {
  return `custom.${crypto.randomUUID()}`
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

export async function deleteCustomTemplate(id: string): Promise<void> {
  await db.customTemplates.delete(id)
}
