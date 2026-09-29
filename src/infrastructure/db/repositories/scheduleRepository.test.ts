import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../schema'
import { EMPTY_SCHEDULE } from '../../../domain/schedule/weeklySchedule'
import { getWeeklySchedule, removeTemplateFromSchedule, saveWeeklySchedule } from './scheduleRepository'

beforeEach(async () => {
  await db.settings.clear()
})

describe('scheduleRepository', () => {
  it('round-trips the weekly schedule and reads null when never set', async () => {
    expect(await getWeeklySchedule()).toBeNull()
    await saveWeeklySchedule({ ...EMPTY_SCHEDULE, 1: 'fs.full-body-a', 3: 'rest' })
    expect(await getWeeklySchedule()).toEqual({ ...EMPTY_SCHEDULE, 1: 'fs.full-body-a', 3: 'rest' })
  })

  it('removes a deleted routine from every day it was planned on', async () => {
    await saveWeeklySchedule({ ...EMPTY_SCHEDULE, 1: 'custom.x', 2: 'rest', 4: 'custom.x', 5: 'fs.quick-10' })
    await removeTemplateFromSchedule('custom.x')
    expect(await getWeeklySchedule()).toEqual({ ...EMPTY_SCHEDULE, 2: 'rest', 5: 'fs.quick-10' })
  })

  it('does nothing when no schedule exists', async () => {
    await removeTemplateFromSchedule('custom.x')
    expect(await getWeeklySchedule()).toBeNull()
  })
})
