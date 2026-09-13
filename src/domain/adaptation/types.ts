import type { AdaptationDecision } from '../session/types'

export type CheckInInput = {
  energy: number
  comfort: number
  availableMinutes: number
}

export type AdaptationRule = {
  id: string
  appliesWhen: (input: CheckInInput) => boolean
  decide: (exerciseId: string) => AdaptationDecision
}
