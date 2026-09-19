import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../schema'
import { deleteBodyWeight, listBodyWeight, logBodyWeight } from './bodyWeightRepository'

beforeEach(async () => {
  await db.bodyWeight.clear()
})

describe('bodyWeightRepository', () => {
  it('keeps one entry per local day, replacing an earlier same-day value', async () => {
    await logBodyWeight(80, new Date(2026, 8, 19, 7, 0))
    await logBodyWeight(79.5, new Date(2026, 8, 19, 21, 0))
    const all = await listBodyWeight()
    expect(all).toHaveLength(1)
    expect(all[0]).toMatchObject({ day: '2026-09-19', kg: 79.5 })
  })

  it('lists entries oldest first', async () => {
    await logBodyWeight(81, new Date(2026, 8, 20))
    await logBodyWeight(80, new Date(2026, 8, 18))
    expect((await listBodyWeight()).map((r) => r.day)).toEqual(['2026-09-18', '2026-09-20'])
  })

  it('deletes an entry by day', async () => {
    await logBodyWeight(80, new Date(2026, 8, 18))
    await deleteBodyWeight('2026-09-18')
    expect(await listBodyWeight()).toEqual([])
  })
})
