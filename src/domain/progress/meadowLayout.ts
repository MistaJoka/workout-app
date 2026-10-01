// Where each flower stands in the garden's meadow scene. A flower's place
// is a pure function of its position in the oldest-first history (never the
// total count), so growing one more flower in only ever adds a place — it
// never moves an earlier flower to a new row or spot. Within a row, a
// flower's tilt/lift/sway timing are seeded by its own session id, so the
// same history always draws the same meadow.
//
// Rows model depth: row 0 is furthest back (oldest flowers start here),
// higher rows are nearer the front. A row fills up to MEADOW_ROW_CAPACITY
// flowers before the next row starts; once MEADOW_ROWS rows exist, every
// later flower keeps joining the last (frontmost) row, which is how a very
// large garden grows wide (and scrollable) there instead of endlessly tall.

export const MEADOW_ROWS = 5
export const MEADOW_ROW_CAPACITY = 6

export type MeadowSpot = {
  sessionId: string
  // 0 = furthest back, MEADOW_ROWS - 1 = nearest front.
  row: number
  // A few degrees either way, so flowers don't all stand at attention.
  tiltDeg: number
  // A few px up/down within the row, same reason.
  liftPx: number
  // A few px left/right of its flex slot, so same-index flowers in
  // different rows don't line up into an unnatural grid of columns.
  driftPx: number
  swayDelaySec: number
  swayDurationSec: number
}

// Same FNV-1a-derived hash as garden.ts's speciesFor, folded to [0, 1), kept
// local so this stays a standalone pure helper.
function unit(text: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  hash ^= hash >>> 16
  hash = Math.imul(hash, 0x85ebca6b)
  hash ^= hash >>> 13
  return (hash >>> 0) / 0x100000000
}

export function layoutMeadow(sessionIdsOldestFirst: readonly string[]): MeadowSpot[] {
  return sessionIdsOldestFirst.map((sessionId, i) => {
    const row = Math.min(Math.floor(i / MEADOW_ROW_CAPACITY), MEADOW_ROWS - 1)
    const tiltDeg = (unit(`meadow-tilt:${sessionId}`) - 0.5) * 10 // -5..5
    const liftPx = (unit(`meadow-lift:${sessionId}`) - 0.5) * 10 // -5..5
    const driftPx = (unit(`meadow-drift:${sessionId}`) - 0.5) * 20 // -10..10
    const swayDelaySec = unit(`meadow-delay:${sessionId}`) * 2 // 0..2
    const swayDurationSec = 2.6 + unit(`meadow-dur:${sessionId}`) * 1.4 // 2.6..4
    return { sessionId, row, tiltDeg, liftPx, driftPx, swayDelaySec, swayDurationSec }
  })
}
