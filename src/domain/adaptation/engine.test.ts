import { describe, expect, it } from 'vitest'
import { adaptTemplate, PLACEHOLDER_RULES } from './engine'
import type { WorkoutTemplate } from '../content/types'

const template: WorkoutTemplate = {
  id: 'placeholder.test-template',
  version: 1,
  name: 'Placeholder Test Template',
  packId: 'placeholder-pack',
  exercises: [
    {
      exerciseId: 'ex1',
      exerciseVersion: 1,
      prescription: { sets: 3, reps: 10, restSeconds: 60 },
      order: 0,
      optional: false,
    },
    {
      exerciseId: 'ex2',
      exerciseVersion: 1,
      prescription: { sets: 2, reps: 12, restSeconds: 45 },
      order: 1,
      optional: true,
    },
  ],
}

describe('adaptTemplate', () => {
  it('produces exactly one decision per template exercise', () => {
    const decisions = adaptTemplate(template, { energy: 3, comfort: 3, availableMinutes: 30 })
    expect(decisions).toHaveLength(2)
    expect(decisions.map((d) => d.exerciseId)).toEqual(['ex1', 'ex2'])
  })

  it('every decision carries a machine-readable reason code', () => {
    const decisions = adaptTemplate(template, { energy: 3, comfort: 3, availableMinutes: 30 })
    for (const decision of decisions) {
      expect(decision.reasonCode).toBeTruthy()
      expect(decision.detail).toBeTruthy()
    }
  })

  it('uses the placeholder rule set by default, clearly not real adaptation logic', () => {
    const decisions = adaptTemplate(template, { energy: 3, comfort: 3, availableMinutes: 30 })
    expect(decisions.every((d) => d.reasonCode === 'RETAINED')).toBe(true)
  })

  it('accepts an injected rule set so real rules can be swapped in without changing the engine', () => {
    const customRules = [
      {
        id: 'custom.always-compress',
        appliesWhen: () => true,
        decide: (exerciseId: string) => ({
          exerciseId,
          reasonCode: 'SESSION_COMPRESSED' as const,
          detail: 'custom test rule',
        }),
      },
    ]
    const decisions = adaptTemplate(template, { energy: 3, comfort: 3, availableMinutes: 30 }, customRules)
    expect(decisions.every((d) => d.reasonCode === 'SESSION_COMPRESSED')).toBe(true)
  })

  it('exports PLACEHOLDER_RULES so callers can see this is not production rule data', () => {
    expect(PLACEHOLDER_RULES.length).toBeGreaterThan(0)
    expect(PLACEHOLDER_RULES[0].id).toContain('placeholder')
  })
})
