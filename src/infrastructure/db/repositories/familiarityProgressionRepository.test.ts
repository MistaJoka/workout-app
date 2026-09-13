// src/infrastructure/db/repositories/familiarityProgressionRepository.test.ts
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../schema'
import { advanceProgression, getFamiliarity, getProgression, recordExposure } from './familiarityProgressionRepository'

beforeEach(async () => {
  await db.familiarity.clear()
  await db.progression.clear()
})

describe('familiarity', () => {
  it('starts at zero exposures for an unseen exercise', async () => {
    const familiarity = await getFamiliarity('ex1')
    expect(familiarity).toEqual({ exerciseId: 'ex1', exposureCount: 0, lastSeenAt: null })
  })

  it('increments exposure count on each recorded exposure', async () => {
    await recordExposure('ex1', '2026-09-13T00:00:00.000Z')
    await recordExposure('ex1', '2026-09-13T01:00:00.000Z')
    const familiarity = await getFamiliarity('ex1')
    expect(familiarity.exposureCount).toBe(2)
    expect(familiarity.lastSeenAt).toBe('2026-09-13T01:00:00.000Z')
  })
})

describe('progression', () => {
  it('starts at level 0 for an exercise with no progression record', async () => {
    const progression = await getProgression('ex1')
    expect(progression).toEqual({ exerciseId: 'ex1', level: 0, lastAdvancedAt: null })
  })

  it('advancing progression increments the level and records the timestamp, requiring explicit confirmation to call', async () => {
    await advanceProgression('ex1', '2026-09-13T00:00:00.000Z')
    const progression = await getProgression('ex1')
    expect(progression.level).toBe(1)
    expect(progression.lastAdvancedAt).toBe('2026-09-13T00:00:00.000Z')
  })
})
