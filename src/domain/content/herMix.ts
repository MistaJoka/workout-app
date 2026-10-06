import { defaultPrescription } from './defaultPrescription'
import { isShownNow } from './library'
import type { Exercise, WorkoutTemplate } from './types'
import { PACK_ID } from './fixtures/foundationStrengthStarter'

export const HER_MIX_ID = 'her-mix'
export const HER_MIX_NAME = 'Her mix'
export const HER_MIX_MIN = 3
export const HER_MIX_MAX = 8

export type Heart = { exerciseId: string; updatedAt: string }

// Her mix: a routine made from the moves she hearted, built on the fly
// (never stored). Oldest heart first, the 8 most recent kept; moves that
// are gone or hidden right now don't count. Its version is a hash of the
// move ids, so each plan records exactly which mix it ran.
export function buildHerMix(
  hearts: readonly Heart[],
  lookup: (id: string) => Exercise | undefined
): WorkoutTemplate | null {
  const shown = [...hearts]
    .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))
    .map((h) => lookup(h.exerciseId))
    .filter((e): e is Exercise => e !== undefined && isShownNow(e))
    .slice(-HER_MIX_MAX)
  if (shown.length < HER_MIX_MIN) return null
  return {
    id: HER_MIX_ID,
    packId: PACK_ID,
    name: HER_MIX_NAME,
    version: hashIds(shown.map((e) => e.id)),
    exercises: shown.map((e, order) => ({
      exerciseId: e.id,
      exerciseVersion: e.version,
      order,
      optional: false,
      prescription: defaultPrescription(e),
    })),
  }
}

function hashIds(ids: readonly string[]): number {
  let hash = 0x811c9dc5
  for (const ch of ids.join(',')) {
    hash ^= ch.charCodeAt(0)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}
