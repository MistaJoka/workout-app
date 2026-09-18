// src/infrastructure/db/repositories/familiarityProgressionRepository.test.ts
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../schema'
import {
  advanceProgression,
  applyProgressionOutcome,
  dismissProgressionCandidate,
  getFamiliarity,
  getProgression,
  recordExposure,
} from './familiarityProgressionRepository'
import type { DoubleProgressionResult } from '../../../domain/adaptation/rules/doubleProgression'

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

function outcome(overrides: Partial<DoubleProgressionResult>): DoubleProgressionResult {
  return {
    exerciseId: 'ex1',
    reasonCode: 'RETAINED',
    detail: 'test',
    nextPrescribedReps: 10,
    nextLoad: 0,
    nextFailureStreak: 0,
    ...overrides,
  }
}

describe('progression', () => {
  it('starts at level 0 with no override and no pending candidate for an exercise with no progression record', async () => {
    const progression = await getProgression('ex1')
    expect(progression).toEqual({
      exerciseId: 'ex1',
      level: 0,
      lastAdvancedAt: null,
      currentPrescribedReps: null,
      consecutiveFailureStreak: 0,
      pendingCandidate: null,
    })
  })

  it('auto-applies a RETAINED/ADJUSTED_WITHIN_BOUNDS/REGRESSED outcome directly, without confirmation', async () => {
    await applyProgressionOutcome('ex1', outcome({ reasonCode: 'ADJUSTED_WITHIN_BOUNDS', nextPrescribedReps: 12, nextFailureStreak: 0 }))
    const progression = await getProgression('ex1')
    expect(progression.currentPrescribedReps).toBe(12)
    expect(progression.consecutiveFailureStreak).toBe(0)
    expect(progression.pendingCandidate).toBeNull()
    expect(progression.level).toBe(0)
  })

  it('stages a PROGRESSION_CANDIDATE outcome as pending, without changing the current prescription', async () => {
    await applyProgressionOutcome(
      'ex1',
      outcome({
        reasonCode: 'PROGRESSION_CANDIDATE',
        nextPrescribedReps: 10,
        candidatePrescribedReps: 6,
        detail: 'Ready to try more.',
      })
    )
    const progression = await getProgression('ex1')
    expect(progression.currentPrescribedReps).toBeNull()
    expect(progression.pendingCandidate).toEqual({ candidatePrescribedReps: 6, detail: 'Ready to try more.' })
    expect(progression.level).toBe(0)
  })

  it('advancing progression requires an explicit prior confirmation call and applies the pending candidate', async () => {
    await applyProgressionOutcome(
      'ex1',
      outcome({ reasonCode: 'PROGRESSION_CANDIDATE', candidatePrescribedReps: 6, detail: 'Ready.' })
    )
    await advanceProgression('ex1', '2026-09-13T00:00:00.000Z')
    const progression = await getProgression('ex1')
    expect(progression.level).toBe(1)
    expect(progression.lastAdvancedAt).toBe('2026-09-13T00:00:00.000Z')
    expect(progression.currentPrescribedReps).toBe(6)
    expect(progression.pendingCandidate).toBeNull()
  })

  it('advancing progression with no pending candidate is a no-op', async () => {
    await advanceProgression('ex1', '2026-09-13T00:00:00.000Z')
    const progression = await getProgression('ex1')
    expect(progression.level).toBe(0)
    expect(progression.lastAdvancedAt).toBeNull()
  })

  it('dismissing a pending candidate clears it without changing the current prescription or level', async () => {
    await applyProgressionOutcome(
      'ex1',
      outcome({ reasonCode: 'PROGRESSION_CANDIDATE', candidatePrescribedReps: 6, detail: 'Ready.' })
    )
    await dismissProgressionCandidate('ex1')
    const progression = await getProgression('ex1')
    expect(progression.pendingCandidate).toBeNull()
    expect(progression.level).toBe(0)
    expect(progression.currentPrescribedReps).toBeNull()
  })
})
