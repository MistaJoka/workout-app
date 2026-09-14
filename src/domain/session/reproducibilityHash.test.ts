import { describe, expect, it } from 'vitest'
import { computeReproducibilityHash } from './reproducibilityHash'
import type { SessionPlan } from './types'

const basePlan: Omit<SessionPlan, 'reproducibilityHash'> = {
  id: 'session-1',
  templateId: 'placeholder.test-template',
  templateVersion: 1,
  packId: 'placeholder-pack',
  ruleVersion: 'v0',
  createdAt: '2026-09-13T00:00:00.000Z',
  exercises: [
    {
      exerciseId: 'placeholder.test-exercise',
      exerciseVersion: 1,
      sets: 3,
      reps: 10,
      restSeconds: 60,
      order: 0,
    },
  ],
  adaptations: [{ exerciseId: 'placeholder.test-exercise', reasonCode: 'RETAINED', detail: 'no adaptation' }],
}

describe('computeReproducibilityHash', () => {
  it('is deterministic for identical input', () => {
    const hash1 = computeReproducibilityHash(basePlan)
    const hash2 = computeReproducibilityHash(basePlan)
    expect(hash1).toBe(hash2)
  })

  it('changes when the exercise prescription changes', () => {
    const changedPlan = {
      ...basePlan,
      exercises: [{ ...basePlan.exercises[0], sets: 4 }],
    }
    expect(computeReproducibilityHash(changedPlan)).not.toBe(computeReproducibilityHash(basePlan))
  })

  it('changes when the adaptation decisions change', () => {
    const changedPlan = {
      ...basePlan,
      adaptations: [{ exerciseId: 'placeholder.test-exercise', reasonCode: 'ADJUSTED_WITHIN_BOUNDS' as const, detail: 'reduced volume' }],
    }
    expect(computeReproducibilityHash(changedPlan)).not.toBe(computeReproducibilityHash(basePlan))
  })

  it('is not affected by object key order', () => {
    // basePlan's own insertion order is: id, templateId, templateVersion, packId,
    // ruleVersion, createdAt, exercises, adaptations. Build a fresh object literal
    // with a genuinely different insertion order (reversed) so this test actually
    // exercises stableStringify's key-sorting rather than passing trivially because
    // both objects already enumerate keys identically.
    const reordered: Omit<SessionPlan, 'reproducibilityHash'> = {
      adaptations: basePlan.adaptations,
      exercises: basePlan.exercises,
      createdAt: basePlan.createdAt,
      ruleVersion: basePlan.ruleVersion,
      packId: basePlan.packId,
      templateVersion: basePlan.templateVersion,
      templateId: basePlan.templateId,
      id: basePlan.id,
    }
    expect(Object.keys(reordered)).not.toEqual(Object.keys(basePlan))
    expect(computeReproducibilityHash(reordered)).toBe(computeReproducibilityHash(basePlan))
  })
})
