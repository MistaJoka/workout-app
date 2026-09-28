import type { WorkoutTemplate } from '../content/types'
import type { AdaptationDecision } from '../session/types'
import type { AdaptationRule, CheckInInput } from './types'

// PLACEHOLDER RULE TABLE — not real adaptation logic.
// Tracked in support/CLAUDE_REQUESTS.md as REQ-20260913-002.
// This exists only to prove the engine's seam (inject rules, get
// reason-coded decisions back) works before real rule data is promoted
// from the ChatGPT-side R&D reservoir into this repo.
// The plan's ruleVersion names the rule set that produced it, so plans made
// by these placeholder rules say so rather than claiming a real rule set.
export const PLACEHOLDER_RULE_VERSION = 'placeholder.retain-all'

export const PLACEHOLDER_RULES: AdaptationRule[] = [
  {
    id: PLACEHOLDER_RULE_VERSION,
    appliesWhen: () => true,
    decide: (exerciseId) => ({
      exerciseId,
      reasonCode: 'RETAINED',
      detail: "Today's plan as written.",
    }),
  },
]

export function adaptTemplate(
  template: WorkoutTemplate,
  checkIn: CheckInInput | undefined,
  rules: AdaptationRule[] = PLACEHOLDER_RULES
): AdaptationDecision[] {
  return template.exercises.map((exercise) => {
    const rule = rules.find((r) => r.appliesWhen(checkIn)) ?? rules[0]
    return rule.decide(exercise.exerciseId)
  })
}
