import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/schema'
import { exportAll, importAll } from './exportImport'
import type { SessionPlan } from '../../domain/session/types'

const plan: SessionPlan = {
  id: 'session-1',
  templateId: 'placeholder.test-template',
  templateVersion: 1,
  packId: 'placeholder-pack',
  ruleVersion: 'v0',
  createdAt: '2026-09-13T00:00:00.000Z',
  exercises: [{ exerciseId: 'ex1', exerciseVersion: 1, sets: 1, reps: 10, restSeconds: 60, order: 0 }],
  adaptations: [],
  reproducibilityHash: 'test-hash',
}

beforeEach(async () => {
  await db.settings.clear()
  await db.checkIns.clear()
  await db.sessionPlans.clear()
  await db.sessionEvents.clear()
  await db.sessionResults.clear()
  await db.familiarity.clear()
  await db.progression.clear()
})

describe('exportAll / importAll', () => {
  it('exports every table with a version and timestamp', async () => {
    await db.sessionPlans.put(plan)
    const bundle = await exportAll()
    expect(bundle.version).toBe(1)
    expect(bundle.exportedAt).toBeTruthy()
    expect(bundle.sessionPlans).toEqual([plan])
  })

  it('round-trips: exporting then importing into a cleared database restores the data', async () => {
    await db.sessionPlans.put(plan)
    await db.familiarity.put({ exerciseId: 'ex1', exposureCount: 3, lastSeenAt: '2026-09-13T00:00:00.000Z' })
    const bundle = await exportAll()

    await db.sessionPlans.clear()
    await db.familiarity.clear()

    await importAll(bundle)

    const restoredPlan = await db.sessionPlans.get(plan.id)
    const restoredFamiliarity = await db.familiarity.get('ex1')
    expect(restoredPlan).toEqual(plan)
    expect(restoredFamiliarity).toEqual({ exerciseId: 'ex1', exposureCount: 3, lastSeenAt: '2026-09-13T00:00:00.000Z' })
  })

  it('rejects an import bundle with an unsupported version', async () => {
    const bundle = await exportAll()
    await expect(importAll({ ...bundle, version: 999 })).rejects.toThrow('999')
  })

  it('isValidExportBundle rejects structurally malformed input without throwing', async () => {
    const { isValidExportBundle } = await import('./exportImport')
    expect(isValidExportBundle(null)).toBe(false)
    expect(isValidExportBundle('not an object')).toBe(false)
    expect(isValidExportBundle({})).toBe(false)
    expect(isValidExportBundle({ version: 1 })).toBe(false)
    const validShape = await exportAll()
    expect(isValidExportBundle(validShape)).toBe(true)
  })
})
