// src/infrastructure/db/repositories/familiarityProgressionRepository.test.ts
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../schema'
import {
  advanceProgression,
  applyProgressionOutcome,
  dismissProgressionCandidate,
  getFamiliarities,
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
  it('reads several exposure records at once, undefined for moves never done', async () => {
    await recordExposure('fam-a', '2026-09-28T00:00:00.000Z')
    await recordExposure('fam-a', '2026-09-28T01:00:00.000Z')
    const [a, missing] = await getFamiliarities(['fam-a', 'fam-never'])
    expect(a?.exposureCount).toBe(2)
    expect(missing).toBeUndefined()
  })

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
      currentWeightKg: null,
      consecutiveFailureStreak: 0,
      pendingCandidate: null,
    })
  })

  it('fills in currentWeightKg for records persisted before the field existed', async () => {
    await db.progression.put({
      exerciseId: 'ex1',
      level: 1,
      lastAdvancedAt: null,
      currentPrescribedReps: 12,
      consecutiveFailureStreak: 0,
      pendingCandidate: null,
    } as never)
    const progression = await getProgression('ex1')
    expect(progression.currentWeightKg).toBeNull()
    expect(progression.currentPrescribedReps).toBe(12)
  })

  it('auto-applies a RETAINED/ADJUSTED_WITHIN_BOUNDS/REGRESSED outcome directly, without confirmation', async () => {
    await applyProgressionOutcome('ex1', outcome({ reasonCode: 'ADJUSTED_WITHIN_BOUNDS', nextPrescribedReps: 12, nextFailureStreak: 0 }))
    const progression = await getProgression('ex1')
    expect(progression.currentPrescribedReps).toBe(12)
    expect(progression.currentWeightKg).toBeNull()
    expect(progression.consecutiveFailureStreak).toBe(0)
    expect(progression.pendingCandidate).toBeNull()
    expect(progression.level).toBe(0)
  })

  it('keeps an unanswered pending candidate when the outcome asks to preserve it (session ended early)', async () => {
    await applyProgressionOutcome(
      'ex1',
      outcome({ reasonCode: 'PROGRESSION_CANDIDATE', nextPrescribedReps: 10, candidatePrescribedReps: 12, detail: 'Ready.' })
    )
    // Next session: not every planned set was logged — no evidence either
    // way, so the offer the user never answered must still be there.
    await applyProgressionOutcome(
      'ex1',
      outcome({ reasonCode: 'RETAINED', nextPrescribedReps: 10, nextFailureStreak: 0 }),
      { preservePending: true }
    )
    const progression = await getProgression('ex1')
    expect(progression.pendingCandidate).toEqual({ candidatePrescribedReps: 12, detail: 'Ready.' })
    expect(progression.currentPrescribedReps).toBe(10)
  })

  it('persists the regressed load for a weighted exercise, and never touches load for a bodyweight one', async () => {
    await applyProgressionOutcome('w', outcome({ exerciseId: 'w', reasonCode: 'REGRESSED', nextLoad: 37.5 }), { weighted: true })
    await applyProgressionOutcome('b', outcome({ exerciseId: 'b', reasonCode: 'REGRESSED', nextLoad: 0 }))
    expect((await getProgression('w')).currentWeightKg).toBe(37.5)
    expect((await getProgression('b')).currentWeightKg).toBeNull()
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

  it('stages a weighted candidate with its proposed load, and confirming applies both reps and load', async () => {
    await applyProgressionOutcome(
      'w',
      outcome({ exerciseId: 'w', reasonCode: 'PROGRESSION_CANDIDATE', nextLoad: 40, candidatePrescribedReps: 8, candidateLoad: 42.5, detail: 'Up.' }),
      { weighted: true }
    )
    expect((await getProgression('w')).pendingCandidate).toEqual({ candidatePrescribedReps: 8, candidateWeightKg: 42.5, detail: 'Up.' })
    await advanceProgression('w', '2026-09-19T00:00:00.000Z')
    const progression = await getProgression('w')
    expect(progression.currentWeightKg).toBe(42.5)
    expect(progression.currentPrescribedReps).toBe(8)
    expect(progression.level).toBe(1)
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
