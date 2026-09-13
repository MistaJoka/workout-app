export type MachineExercise = {
  id: string
  name: string
  targetSets: number
  targetReps: number
  targetRestSeconds: number
}

export type SessionPlan = {
  exercises: MachineExercise[]
}

export type ActiveSetState = {
  phase: 'active_set'
  exerciseIndex: number
  setNumber: number
}

export type RestingState = {
  phase: 'resting'
  exerciseIndex: number
  setNumber: number
  restSeconds: number
  nextExerciseIndex: number
  nextSetNumber: number
}

export type SessionCompleteState = {
  phase: 'session_complete'
}

export type SessionState = ActiveSetState | RestingState | SessionCompleteState

export function initSession(plan: SessionPlan): SessionState {
  if (plan.exercises.length === 0) {
    return { phase: 'session_complete' }
  }
  return { phase: 'active_set', exerciseIndex: 0, setNumber: 1 }
}

function nextPointer(
  plan: SessionPlan,
  exerciseIndex: number,
  setNumber: number
): { exerciseIndex: number; setNumber: number } | null {
  const exercise = plan.exercises[exerciseIndex]
  if (setNumber < exercise.targetSets) {
    return { exerciseIndex, setNumber: setNumber + 1 }
  }
  if (exerciseIndex + 1 < plan.exercises.length) {
    return { exerciseIndex: exerciseIndex + 1, setNumber: 1 }
  }
  return null
}

export function completeSet(plan: SessionPlan, state: ActiveSetState): SessionState {
  const next = nextPointer(plan, state.exerciseIndex, state.setNumber)
  if (next === null) {
    return { phase: 'session_complete' }
  }
  const restSeconds = plan.exercises[state.exerciseIndex].targetRestSeconds
  return {
    phase: 'resting',
    exerciseIndex: state.exerciseIndex,
    setNumber: state.setNumber,
    restSeconds,
    nextExerciseIndex: next.exerciseIndex,
    nextSetNumber: next.setNumber,
  }
}

export function restComplete(state: RestingState): SessionState {
  return { phase: 'active_set', exerciseIndex: state.nextExerciseIndex, setNumber: state.nextSetNumber }
}

export function skipRest(state: RestingState): SessionState {
  return restComplete(state)
}

function prevPointer(exerciseIndex: number, setNumber: number): { exerciseIndex: number; setNumber: number } {
  if (setNumber > 1) {
    return { exerciseIndex, setNumber: setNumber - 1 }
  }
  if (exerciseIndex > 0) {
    return { exerciseIndex: exerciseIndex - 1, setNumber: 1 }
  }
  return { exerciseIndex: 0, setNumber: 1 }
}

export function goBack(state: SessionState): SessionState {
  if (state.phase === 'session_complete') {
    return state
  }
  const prev = prevPointer(state.exerciseIndex, state.setNumber)
  return { phase: 'active_set', exerciseIndex: prev.exerciseIndex, setNumber: prev.setNumber }
}
