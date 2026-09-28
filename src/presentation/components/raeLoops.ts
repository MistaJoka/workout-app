import RAE_LOOPS from './raeLoops.generated.json'

// Rae's drawn-frame exercise loops (scripts/assets/build-rae-strips.py).
export type RaeLoop = (typeof RAE_LOOPS)[number]

export { RAE_LOOPS }

const byExercise = new Map<string, RaeLoop>()
const byId = new Map<string, RaeLoop>()
for (const loop of RAE_LOOPS) {
  byId.set(loop.id, loop)
  for (const exerciseId of loop.exerciseIds) byExercise.set(exerciseId, loop)
}

// Loop files keep their names across a redraw, so every URL carries the
// loop's content version (`v`, written by build-rae-strips.py). New art is
// a new URL, which the service worker's cache-first media cache has never
// seen, so installed phones fetch it instead of showing the old drawing.
function versioned(path: string, loopId: string): string {
  const v = byId.get(loopId)?.v
  return v ? `${path}?v=${v}` : path
}

export function raeLoopUrl(loopId: string): string {
  return versioned(`/rae/${loopId}.webp`, loopId)
}

export function raeStillUrl(loopId: string, frame: number): string {
  return versioned(`/rae/${loopId}-${frame}.png`, loopId)
}

// The loop that replaces an exercise's photos, if Rae demonstrates it.
export function raeLoopForExercise(exerciseId: string | undefined): RaeLoop | undefined {
  return exerciseId ? byExercise.get(exerciseId) : undefined
}

// One representative still (the move's peak key frame) for list thumbnails,
// or null so the caller falls back to the exercise photo. Featured loops are
// precached by the service worker; other loops and stills are cached once seen.
export function raeStillFor(exerciseId: string | undefined): { src: string; alt: string } | null {
  const loop = raeLoopForExercise(exerciseId)
  if (!loop) return null
  const frame = loop.stills[loop.stills.length - 1]
  return { src: raeStillUrl(loop.id, frame), alt: `Rae, ${loop.name.toLowerCase()}` }
}
