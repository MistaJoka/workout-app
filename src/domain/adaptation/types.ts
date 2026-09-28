import type { AdaptationDecision } from '../session/types'

export type CheckInInput = {
  energy: number
  comfort: number
  availableMinutes: number
}

export type AdaptationRule = {
  id: string
  // undefined when nobody was asked: the start screen asks nothing while
  // no rule reads the answers (owner, 2026-09-28: one-tap Start).
  appliesWhen: (input: CheckInInput | undefined) => boolean
  decide: (exerciseId: string) => AdaptationDecision
}
