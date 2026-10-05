import type { Exercise } from '../domain/content/types'

// A Rae loop can cover a curated id and its library twin; the "Moves Rae
// shows you" row shows each move once.
export function uniqueByLoop(exercises: Exercise[], loopOf: (id: string) => string | undefined): Exercise[] {
  const seen = new Set<string>()
  return exercises.filter((e) => {
    const loop = loopOf(e.id)
    if (!loop) return true
    if (seen.has(loop)) return false
    seen.add(loop)
    return true
  })
}
