import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../infrastructure/db/schema'
import { loadProgressionOffers } from './progressionOffers'
import type { SessionPlan } from '../domain/session/types'

const plan: SessionPlan = {
  id: 's1',
  templateId: 't',
  templateVersion: 1,
  packId: 'p',
  ruleVersion: 'v1',
  createdAt: '2026-10-01T10:00:00.000Z',
  exercises: [
    { exerciseId: 'squat', exerciseVersion: 1, name: 'Squat', sets: 1, reps: 10, restSeconds: 30, order: 0 },
    { exerciseId: 'row', exerciseVersion: 1, name: 'Row', sets: 1, reps: 10, restSeconds: 30, order: 1 },
  ],
  adaptations: [],
  reproducibilityHash: 'h',
}

const base = {
  level: 0,
  lastAdvancedAt: null,
  currentPrescribedReps: null,
  currentWeightKg: null,
  consecutiveFailureStreak: 0,
}

beforeEach(async () => {
  await db.sessionPlans.clear()
  await db.progression.clear()
})

describe('loadProgressionOffers', () => {
  it('is empty when the plan is missing or nothing is pending', async () => {
    expect(await loadProgressionOffers('nope')).toEqual([])
    await db.sessionPlans.add(plan)
    expect(await loadProgressionOffers('s1')).toEqual([])
  })

  it('lists only moves with a pending candidate, with the weight only when set', async () => {
    await db.sessionPlans.add(plan)
    await db.progression.put({ ...base, exerciseId: 'squat', pendingCandidate: { candidatePrescribedReps: 12, detail: 'x' } })
    await db.progression.put({ ...base, exerciseId: 'row', pendingCandidate: { candidatePrescribedReps: 8, candidateWeightKg: 22.5, detail: 'x' } })
    expect(await loadProgressionOffers('s1')).toEqual([
      { exerciseId: 'squat', exerciseName: 'Squat', candidatePrescribedReps: 12 },
      { exerciseId: 'row', exerciseName: 'Row', candidatePrescribedReps: 8, candidateWeightKg: 22.5 },
    ])
  })
})
