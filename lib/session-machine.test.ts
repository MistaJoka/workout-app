import { describe, expect, it } from 'vitest'
import { completeSet, goBack, initSession, restComplete, skipRest, type SessionPlan } from './session-machine'

const plan: SessionPlan = {
  exercises: [
    { id: 'ex1', name: 'Bench Press', targetSets: 2, targetReps: 8, targetRestSeconds: 90 },
    { id: 'ex2', name: 'Overhead Press', targetSets: 1, targetReps: 10, targetRestSeconds: 60 },
  ],
}

describe('session machine', () => {
  it('starts at set 1 of exercise 0', () => {
    expect(initSession(plan)).toEqual({ phase: 'active_set', exerciseIndex: 0, setNumber: 1 })
  })

  it('starts session_complete for an empty plan', () => {
    expect(initSession({ exercises: [] })).toEqual({ phase: 'session_complete' })
  })

  it('moves to resting after a non-final set, targeting the next set of the same exercise', () => {
    const state = completeSet(plan, { phase: 'active_set', exerciseIndex: 0, setNumber: 1 })
    expect(state).toEqual({
      phase: 'resting',
      exerciseIndex: 0,
      setNumber: 1,
      restSeconds: 90,
      nextExerciseIndex: 0,
      nextSetNumber: 2,
    })
  })

  it('restComplete advances to the targeted next set', () => {
    const resting = completeSet(plan, { phase: 'active_set', exerciseIndex: 0, setNumber: 1 })
    expect(resting.phase).toBe('resting')
    const next = restComplete(resting as Extract<typeof resting, { phase: 'resting' }>)
    expect(next).toEqual({ phase: 'active_set', exerciseIndex: 0, setNumber: 2 })
  })

  it('skipRest behaves the same as restComplete', () => {
    const resting = completeSet(plan, { phase: 'active_set', exerciseIndex: 0, setNumber: 1 })
    const viaSkip = skipRest(resting as Extract<typeof resting, { phase: 'resting' }>)
    const viaComplete = restComplete(resting as Extract<typeof resting, { phase: 'resting' }>)
    expect(viaSkip).toEqual(viaComplete)
  })

  it('moves to the next exercise after the last set of the current one', () => {
    const resting = completeSet(plan, { phase: 'active_set', exerciseIndex: 0, setNumber: 2 })
    expect(resting).toEqual({
      phase: 'resting',
      exerciseIndex: 0,
      setNumber: 2,
      restSeconds: 90,
      nextExerciseIndex: 1,
      nextSetNumber: 1,
    })
  })

  it('completes the session after the last set of the last exercise', () => {
    const state = completeSet(plan, { phase: 'active_set', exerciseIndex: 1, setNumber: 1 })
    expect(state).toEqual({ phase: 'session_complete' })
  })

  it('goBack moves to the previous set within an exercise', () => {
    expect(goBack({ phase: 'active_set', exerciseIndex: 0, setNumber: 2 })).toEqual({
      phase: 'active_set',
      exerciseIndex: 0,
      setNumber: 1,
    })
  })

  it('goBack from set 1 of a later exercise drops to set 1 of the previous exercise', () => {
    expect(goBack({ phase: 'active_set', exerciseIndex: 1, setNumber: 1 })).toEqual({
      phase: 'active_set',
      exerciseIndex: 0,
      setNumber: 1,
    })
  })

  it('goBack is a no-op at the very start', () => {
    expect(goBack({ phase: 'active_set', exerciseIndex: 0, setNumber: 1 })).toEqual({
      phase: 'active_set',
      exerciseIndex: 0,
      setNumber: 1,
    })
  })

  it('goBack is a no-op once the session is complete', () => {
    expect(goBack({ phase: 'session_complete' })).toEqual({ phase: 'session_complete' })
  })
})
