import { activeProfile } from '../infrastructure/profiles'

// The player's stage (Rae plus the big target) is a second, larger Complete
// Set: a sweaty thumb shouldn't have to find the bar. It only stands in for
// the bar's plain first action. A question in the bar (all reps? how many?)
// is never answered by a stray tap, and a running hold finishes itself.
// `armed` mirrors ThumbBar's re-arm window: a double tap on Skip rest must
// not fall through to the next set's stage.
export type StageTap = 'complete' | 'start-hold' | null

export function stageTapAction(state: {
  awaitingRepCheck: boolean
  askingReps: boolean
  timed: boolean
  holding: boolean
  busy: boolean
  armed: boolean
}): StageTap {
  if (state.busy || !state.armed) return null
  if (state.awaitingRepCheck || state.askingReps || state.holding) return null
  return state.timed ? 'start-hold' : 'complete'
}

// Rae pulses once per set until this profile has tapped her the first time:
// the gesture teaches itself, with no words. A convenience only: a blocked
// store just means the pulse shows again.
function key(): string {
  try {
    return `workout-app:stage-tap-learned:${activeProfile().id}`
  } catch {
    return 'workout-app:stage-tap-learned'
  }
}

export function hasLearnedStageTap(): boolean {
  try {
    return localStorage.getItem(key()) === '1'
  } catch {
    return false
  }
}

export function markStageTapLearned(): void {
  try {
    localStorage.setItem(key(), '1')
  } catch {
    // Storage blocked: the hint pulse just shows again.
  }
}
