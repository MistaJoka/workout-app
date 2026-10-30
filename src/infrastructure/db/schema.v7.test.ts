import { describe, expect, it } from 'vitest'
import Dexie from 'dexie'
import { WorkoutDb } from './schema'

describe('schema v7 (activities, measurements, photos)', () => {
  it('upgrades a v6 database in place, keeping existing history', async () => {
    const name = 'schema-v7-upgrade-test'
    const old = new Dexie(name)
    old.version(6).stores({
      settings: 'key',
      sessionResults: 'sessionId, planId, endedAt',
      bodyWeight: 'day',
      favorites: 'exerciseId, updatedAt',
    })
    await old.table('bodyWeight').put({ day: '2026-10-01', kg: 60, recordedAt: '2026-10-01T08:00:00.000Z' })
    await old.table('favorites').put({ exerciseId: 'fs.plank', hearted: true, updatedAt: '2026-10-01T08:00:00.000Z' })
    old.close()

    const upgraded = new WorkoutDb(name)
    await upgraded.open()
    expect(upgraded.verno).toBe(7)
    expect(await upgraded.bodyWeight.get('2026-10-01')).toMatchObject({ kg: 60 })
    expect(await upgraded.favorites.get('fs.plank')).toMatchObject({ hearted: true })
    expect(await upgraded.activities.count()).toBe(0)
    expect(await upgraded.bodyMeasurements.count()).toBe(0)
    expect(await upgraded.progressPhotos.count()).toBe(0)
    upgraded.close()
    await Dexie.delete(name)
  })
})
