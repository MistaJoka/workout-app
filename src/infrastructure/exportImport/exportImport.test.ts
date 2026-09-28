import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/schema'
import { exportAll, importAll, type ExportBundle } from './exportImport'
import type { SessionEvent, SessionPlan, SessionResult } from '../../domain/session/types'

const plan: SessionPlan = {
  id: 'session-1',
  templateId: 'placeholder.test-template',
  templateVersion: 1,
  packId: 'placeholder-pack',
  ruleVersion: 'v0',
  createdAt: '2026-09-13T00:00:00.000Z',
  exercises: [{ exerciseId: 'ex1', exerciseVersion: 1, name: 'Exercise One', sets: 1, reps: 10, restSeconds: 60, order: 0 }],
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

  it('names the profile the backup came from', async () => {
    const bundle = await exportAll()
    expect(bundle.profile).toEqual({ id: 'default', name: 'Me' })
  })
})

describe('importAll into a profile that already has data', () => {
  const event = (sessionId: string, n: number): SessionEvent => ({
    eventId: `${sessionId}:e${n}`,
    sessionId,
    type: n === 0 ? 'SESSION_STARTED' : 'SET_COMPLETED',
    timestamp: `2026-09-13T00:0${n}:00.000Z`,
    payload: {},
  })

  async function backupFromOtherDevice(): Promise<ExportBundle> {
    // Built on "another device": same auto-increment seq numbers as ours.
    await db.sessionPlans.add({ ...plan, id: 'theirs' })
    await db.sessionEvents.add(event('theirs', 0))
    await db.sessionEvents.add(event('theirs', 1))
    const bundle = await exportAll()
    await db.sessionPlans.clear()
    await db.sessionEvents.clear()
    return bundle
  }

  it('keeps every local event and adds the backup events alongside them', async () => {
    const bundle = await backupFromOtherDevice()
    const [seqA, seqB] = bundle.sessionEvents.map((e) => e.seq)
    await db.sessionPlans.add({ ...plan, id: 'mine' })
    await db.sessionEvents.add({ ...event('mine', 0), seq: seqA })
    await db.sessionEvents.add({ ...event('mine', 1), seq: seqB })

    await importAll(bundle)

    const events = await db.sessionEvents.toArray()
    expect(events.map((e) => e.eventId).sort()).toEqual(['mine:e0', 'mine:e1', 'theirs:e0', 'theirs:e1'])
    expect((await db.sessionPlans.toArray()).map((p) => p.id).sort()).toEqual(['mine', 'theirs'])
  })

  it('re-importing the same backup adds nothing and does not abort', async () => {
    const bundle = await backupFromOtherDevice()
    await importAll(bundle)
    await importAll(bundle)
    expect(await db.sessionEvents.count()).toBe(2)
    expect(await db.sessionPlans.count()).toBe(1)
  })

  it('never overwrites an existing plan or result, which are immutable history', async () => {
    const localResult: SessionResult = {
      sessionId: plan.id,
      planId: plan.id,
      status: 'COMPLETED',
      startedAt: '2026-09-13T00:00:00.000Z',
      endedAt: '2026-09-13T00:30:00.000Z',
      totalSetsCompleted: 1,
      totalSetsPlanned: 1,
    }
    await db.sessionPlans.add(plan)
    await db.sessionResults.add(localResult)
    const bundle = await exportAll()
    const tampered: ExportBundle = {
      ...bundle,
      sessionPlans: [{ ...plan, ruleVersion: 'changed' }],
      sessionResults: [{ ...localResult, totalSetsCompleted: 99 }],
    }

    await importAll(tampered)

    expect((await db.sessionPlans.get(plan.id))?.ruleVersion).toBe('v0')
    expect((await db.sessionResults.get(plan.id))?.totalSetsCompleted).toBe(1)
  })

  it('keeps this profile’s own "last backup" date', async () => {
    await db.settings.put({ key: 'lastExportAt', value: '2026-09-27T00:00:00.000Z' })
    const bundle = await exportAll()
    await db.settings.put({ key: 'lastExportAt', value: '2026-09-28T00:00:00.000Z' })
    await importAll(bundle)
    expect((await db.settings.get('lastExportAt'))?.value).toBe('2026-09-28T00:00:00.000Z')
  })
})
