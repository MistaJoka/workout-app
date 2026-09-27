import RAE_LOOPS from './raeLoops.generated.json'

// Rae's drawn-frame exercise loops (scripts/assets/build-rae-strips.py).
export type RaeLoop = (typeof RAE_LOOPS)[number]

export { RAE_LOOPS }

const byExercise = new Map<string, RaeLoop>()
for (const loop of RAE_LOOPS) {
  for (const exerciseId of loop.exerciseIds) byExercise.set(exerciseId, loop)
}

// The loop that replaces an exercise's photos, if Rae demonstrates it.
export function raeLoopForExercise(exerciseId: string | undefined): RaeLoop | undefined {
  return exerciseId ? byExercise.get(exerciseId) : undefined
}

// One representative still (the move's peak key frame) for list thumbnails,
// or null so the caller falls back to the exercise photo. The stills are
// precached by the service worker, so thumbnails work offline.
export function raeStillFor(exerciseId: string | undefined): { src: string; alt: string } | null {
  const loop = raeLoopForExercise(exerciseId)
  if (!loop) return null
  const frame = loop.stills[loop.stills.length - 1]
  return { src: `/rae/${loop.id}-${frame}.png`, alt: `Rae, ${loop.name.toLowerCase()}` }
}
