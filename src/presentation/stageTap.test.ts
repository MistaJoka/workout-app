import { describe, expect, it } from 'vitest'
import { stageTapAction } from './stageTap'

const idle = { awaitingRepCheck: false, askingReps: false, timed: false, holding: false, busy: false, armed: true }

describe('stageTapAction', () => {
  it('completes a reps set, like the Complete Set button', () => {
    expect(stageTapAction(idle)).toBe('complete')
  })

  it('starts a timed hold, like the Start button', () => {
    expect(stageTapAction({ ...idle, timed: true })).toBe('start-hold')
  })

  it('never answers the rep question for her', () => {
    expect(stageTapAction({ ...idle, awaitingRepCheck: true })).toBeNull()
    expect(stageTapAction({ ...idle, askingReps: true })).toBeNull()
  })

  it('does nothing while a hold counts down', () => {
    expect(stageTapAction({ ...idle, timed: true, holding: true })).toBeNull()
  })

  it('does nothing while an action saves or before the stage re-arms', () => {
    expect(stageTapAction({ ...idle, busy: true })).toBeNull()
    expect(stageTapAction({ ...idle, armed: false })).toBeNull()
  })
})
