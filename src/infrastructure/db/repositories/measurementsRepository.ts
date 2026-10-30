import { db, type MeasurementRecord } from '../schema'
import { buildMeasurementEntry, hasAnyMeasurement, type MeasurementDraft } from '../../../domain/progress/measurements'

// One entry per local day: saving again the same day replaces it whole
// (the sheet always edits all five sites together).
export async function saveMeasurements(draft: MeasurementDraft, at: Date = new Date()): Promise<MeasurementRecord> {
  const built = buildMeasurementEntry(draft, at)
  if (!built.ok) throw new Error(`Invalid measurements: ${built.problem}`)
  await db.bodyMeasurements.put(built.entry)
  return built.entry
}

// Every row, cleared days included (backups carry them).
export async function listMeasurements(): Promise<MeasurementRecord[]> {
  return db.bodyMeasurements.orderBy('day').toArray()
}

export async function listLiveMeasurements(): Promise<MeasurementRecord[]> {
  return (await listMeasurements()).filter(hasAnyMeasurement)
}

// Deleting a day leaves it with no values and a newer recordedAt, so an
// older backup (newest-wins by recordedAt) can't bring the values back.
export async function clearMeasurements(day: string, at: Date = new Date()): Promise<void> {
  await db.bodyMeasurements.put({ day, recordedAt: at.toISOString() })
}
