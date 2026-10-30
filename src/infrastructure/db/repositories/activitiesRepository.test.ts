import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../schema'
import { deleteActivity, listActivities, listLiveActivities, logActivity } from './activitiesRepository'

beforeEach(async () => {
  await db.activities.clear()
  await db.settings.clear()
})

const NOW = new Date(2026, 9, 29, 15)

describe('activitiesRepository', () => {
  it('logs an activity with the weekly goal it was logged under', async () => {
    const saved = await logActivity({ kind: 'walk', minutes: 30, day: '2026-10-28' }, NOW)
    expect(saved).toMatchObject({ kind: 'walk', minutes: 30, day: '2026-10-28', deletedAt: null, weeklyGoal: 2 })
    expect(saved.loggedAt).toBe(NOW.toISOString())
    expect(await listLiveActivities()).toHaveLength(1)
  })

  it('refuses a day outside the window or a bad duration, writing nothing', async () => {
    await expect(logActivity({ kind: 'walk', minutes: 30, day: '2026-10-01' }, NOW)).rejects.toThrow()
    await expect(logActivity({ kind: 'walk', minutes: 0, day: '2026-10-29' }, NOW)).rejects.toThrow()
    expect(await listActivities()).toHaveLength(0)
  })

  it('deleting keeps a tombstone and hides the activity', async () => {
    const saved = await logActivity({ kind: 'yoga', minutes: 45, day: '2026-10-29' }, NOW)
    await deleteActivity(saved.id, new Date(2026, 9, 29, 16))
    expect(await listLiveActivities()).toEqual([])
    const [row] = await listActivities()
    expect(row.deletedAt).toBe(new Date(2026, 9, 29, 16).toISOString())
    expect(row.updatedAt).toBe(row.deletedAt)
  })
})
