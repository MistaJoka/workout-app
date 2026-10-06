import type { WorkoutTemplate } from '../content/types'
import type { AdaptationDecision } from './types'

export type WorkoutLength = 'short' | 'usual' | 'long'
export const LONG_MAX_SETS = 4

// The Start screen's Short / Usual / Long. Shortening cuts sets, never
// moves (owner, 2026-10-06): same variety, less time. Only sets change;
// Long never lowers a move that already has more than the cap.
export function scaleTemplate(template: WorkoutTemplate, length: WorkoutLength): WorkoutTemplate {
  if (length === 'usual') return template
  return {
    ...template,
    exercises: template.exercises.map((e) => ({
      ...e,
      prescription: {
        ...e.prescription,
        sets:
          length === 'short'
            ? 1
            : e.prescription.sets >= LONG_MAX_SETS
              ? e.prescription.sets
              : e.prescription.sets + 1,
      },
    })),
  }
}

export function lengthDecisions(template: WorkoutTemplate, length: WorkoutLength): AdaptationDecision[] {
  if (length === 'usual') return []
  return template.exercises.map((e) => ({
    exerciseId: e.exerciseId,
    reasonCode: length === 'short' ? 'LENGTH_SHORT' : 'LENGTH_LONG',
    detail: length === 'short' ? 'Short workout: one set of each move.' : 'Long workout: one more set of each move.',
  }))
}
