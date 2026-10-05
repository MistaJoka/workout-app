import { raeLoopForExercise, type RaeLoop } from './components/raeLoops'

// Today's room shows Rae doing the first move of today's workout that she
// demonstrates, so the day's invitation is the movement itself.
// `featuredOnly`: only loops the service worker precaches, so the home
// screen never waits on (or, offline, breaks over) an uncached loop.
export function firstRaeLoop(exerciseIds: readonly string[], { featuredOnly = false } = {}): RaeLoop | null {
  for (const id of exerciseIds) {
    const loop = raeLoopForExercise(id)
    if (loop && (!featuredOnly || ('featured' in loop && loop.featured))) return loop
  }
  return null
}
