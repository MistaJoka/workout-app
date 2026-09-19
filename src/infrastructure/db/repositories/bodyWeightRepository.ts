import { db } from '../schema'
import type { BodyWeightRecord } from '../schema'

export function localDayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// One entry per day: logging twice on the same day replaces the earlier
// value, which is what a bathroom-scale habit expects.
export async function logBodyWeight(kg: number, at: Date = new Date()): Promise<BodyWeightRecord> {
  const record: BodyWeightRecord = { day: localDayKey(at), kg, recordedAt: at.toISOString() }
  await db.bodyWeight.put(record)
  return record
}

export async function listBodyWeight(): Promise<BodyWeightRecord[]> {
  return db.bodyWeight.orderBy('day').toArray()
}

export async function deleteBodyWeight(day: string): Promise<void> {
  await db.bodyWeight.delete(day)
}
