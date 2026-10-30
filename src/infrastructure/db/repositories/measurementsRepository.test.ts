import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../schema'
import { clearMeasurements, listLiveMeasurements, listMeasurements, saveMeasurements } from './measurementsRepository'

beforeEach(async () => {
  await db.bodyMeasurements.clear()
})

describe('measurementsRepository', () => {
  it('saving again the same day replaces the entry', async () => {
    await saveMeasurements({ waistCm: 80, hipsCm: 98 }, new Date(2026, 9, 29, 8))
    await saveMeasurements({ waistCm: 79.5 }, new Date(2026, 9, 29, 20))
    const all = await listLiveMeasurements()
    expect(all).toHaveLength(1)
    expect(all[0]).toMatchObject({ day: '2026-10-29', waistCm: 79.5 })
    expect(all[0].hipsCm).toBeUndefined()
  })

  it('rejects an empty or impossible entry', async () => {
    await expect(saveMeasurements({}, new Date())).rejects.toThrow()
    await expect(saveMeasurements({ thighCm: 1 }, new Date())).rejects.toThrow()
    expect(await listMeasurements()).toEqual([])
  })

  it('clearing a day keeps an empty row (a tombstone) that lists as nothing', async () => {
    await saveMeasurements({ chestCm: 90 }, new Date(2026, 9, 28, 8))
    await clearMeasurements('2026-10-28', new Date(2026, 9, 29, 8))
    expect(await listLiveMeasurements()).toEqual([])
    expect(await listMeasurements()).toEqual([{ day: '2026-10-28', recordedAt: new Date(2026, 9, 29, 8).toISOString() }])
  })

  it('lists oldest first', async () => {
    await saveMeasurements({ chestCm: 90 }, new Date(2026, 9, 28))
    await saveMeasurements({ chestCm: 91 }, new Date(2026, 9, 20))
    expect((await listLiveMeasurements()).map((m) => m.day)).toEqual(['2026-10-20', '2026-10-28'])
  })
})
