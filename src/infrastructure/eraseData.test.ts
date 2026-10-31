import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db/schema'
import { countResults, listResults, saveResult } from './db/repositories/sessionRepository'
import { setSetting } from './db/repositories/settingsRepository'
import { eraseActiveProfileData } from './eraseData'
import { activeDbName } from './profiles'
import { readWebReminderPlan, saveWebReminderPlan } from './webReminders'

beforeEach(async () => {
  await db.sessionResults.clear()
  await db.settings.clear()
})

describe('eraseActiveProfileData', () => {
  it('clears every table and the active profile web reminder plan', async () => {
    await saveResult({
      sessionId: 's1',
      planId: 's1',
      status: 'COMPLETED',
      startedAt: '2026-10-01T10:00:00.000Z',
      endedAt: '2026-10-01T10:30:00.000Z',
      totalSetsCompleted: 1,
      totalSetsPlanned: 1,
    })
    await setSetting('sound', false)
    await saveWebReminderPlan(activeDbName(), [{ day: '2026-11-01', at: '2026-11-01T09:00:00.000Z', title: 'Workout', body: 'Time' }])
    expect(await countResults()).toBe(1)
    expect(await listResults()).toHaveLength(1)

    await eraseActiveProfileData()

    expect(await countResults()).toBe(0)
    expect(await db.settings.count()).toBe(0)
    expect(await readWebReminderPlan(activeDbName())).toEqual([])
  })
})
