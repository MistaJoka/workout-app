import { raeLoopForExercise, type RaeLoop } from './components/raeLoops'

// Today's room shows Rae doing the first move of today's workout that she
// demonstrates, so the day's invitation is the movement itself.
export function firstRaeLoop(exerciseIds: readonly string[]): RaeLoop | null {
  for (const id of exerciseIds) {
    const loop = raeLoopForExercise(id)
    if (loop) return loop
  }
  return null
}
