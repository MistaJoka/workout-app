import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/schema'
import { exportAll, importAll, parseExportBundle } from './exportImport'
import { isHearted, setHeart } from '../db/repositories/favoritesRepository'
import type { SessionPlan } from '../../domain/session/types'

beforeEach(async () => {
  await db.favorites.clear()
})

describe('export/import of hearted moves', () => {
  it('exports hearts and merges newest-wins, so a newer un-heart survives an older backup', async () => {
    await setHeart('fs.plank', true, new Date(2026, 9, 1))
    const old = await exportAll()
    expect(old.favorites).toEqual([expect.objectContaining({ exerciseId: 'fs.plank', hearted: true })])
    await setHeart('fs.plank', false, new Date(2026, 9, 5))
    await importAll(old)
    expect(await isHearted('fs.plank')).toBe(false)
  })

  it('restores hearts into a cleared database', async () => {
    await setHeart('fs.plank', true)
    const bundle = await exportAll()
    await db.favorites.clear()
    await importAll(bundle)
    expect(await isHearted('fs.plank')).toBe(true)
  })

  it('a backup from before hearts existed imports cleanly', async () => {
    const bundle = JSON.parse(JSON.stringify(await exportAll()))
    delete bundle.favorites
    const parsed = parseExportBundle(bundle)
    expect(parsed.ok).toBe(true)
    if (parsed.ok) await expect(importAll(parsed.bundle)).resolves.toEqual({ state: 'merged' })
  })

  it("another profile's backup never touches hearts", async () => {
    const theirs = {
      exportedAt: '2026-09-01T00:00:00.000Z',
      version: 1,
      profile: { id: 'someone-else', name: 'Someone Else' },
      settings: [],
      checkIns: [],
      sessionPlans: [],
      sessionEvents: [],
      sessionResults: [],
      familiarity: [],
      progression: [],
      favorites: [{ exerciseId: 'fs.plank', hearted: true, updatedAt: '2030-01-01T00:00:00.000Z' }],
    }
    const parsed = parseExportBundle(theirs)
    expect(parsed.ok).toBe(true)
    if (parsed.ok) await importAll(parsed.bundle)
    expect(await isHearted('fs.plank')).toBe(false)
  })

  it('rejects a malformed heart row', () => {
    expect(parseExportBundle({ exportedAt: '2026-09-01T00:00:00.000Z', version: 1, settings: [], checkIns: [], sessionPlans: [], sessionEvents: [], sessionResults: [], familiarity: [], progression: [], favorites: [{ exerciseId: '', hearted: 'yes' }] }).ok).toBe(false)
  })
})

describe('export/import of a plan with a length', () => {
  it('keeps the Start screen length on the plan through a backup', async () => {
    await db.sessionPlans.clear()
    const plan: SessionPlan = {
      id: 'short-1',
      templateId: 'fs.full-body-a',
      templateVersion: 1,
      packId: 'p',
      ruleVersion: 'v',
      createdAt: '2026-10-06T00:00:00.000Z',
      exercises: [{ exerciseId: 'fs.plank', exerciseVersion: 1, name: 'Plank', sets: 1, timeSeconds: 20, restSeconds: 45, order: 0 }],
      adaptations: [{ exerciseId: 'fs.plank', reasonCode: 'LENGTH_SHORT', detail: 'Short workout: one set of each move.' }],
      reproducibilityHash: 'h',
      length: 'short',
    }
    await db.sessionPlans.put(plan)
    const parsed = parseExportBundle(JSON.parse(JSON.stringify(await exportAll())))
    expect(parsed.ok).toBe(true)
    await db.sessionPlans.clear()
    if (parsed.ok) await importAll(parsed.bundle)
    expect((await db.sessionPlans.get('short-1'))?.length).toBe('short')
  })
})
