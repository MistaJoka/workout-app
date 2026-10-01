// Tiny pixel critters that drift through the garden meadow: a deterministic,
// seeded accompaniment to the flowers themselves. Which critters appear is a
// pure function of how many flowers have grown (never which flowers, so two
// gardens with the same count always draw the same cast); each critter's own
// path is seeded by its own stable identity (kind + its index among same-kind
// critters), not by the flower count, so growing one more flower can only add
// a new critter at the end -- it never reshuffles one already on screen.

export type CritterKind = 'butterfly' | 'bee' | 'ladybug'

export type CritterPoint = { xPct: number; yPct: number }

export type Critter = {
  id: string
  kind: CritterKind
  // A short looping path (percent of whatever box the caller places it
  // in), visited in order and back to the first point.
  path: readonly CritterPoint[]
  // Full-cycle duration and a start offset, so same-kind critters (and a
  // garden's critters vs. the next one) don't move in lockstep.
  durationSec: number
  delaySec: number
}

// A safety ceiling: the rules below only ever produce 3, but nothing that
// reads this list should assume that stays true forever.
const MAX_CRITTERS = 4

// FNV-1a, folded to [0, 1) -- same construction as garden.ts/meadowLayout.ts,
// kept local so this stays a standalone pure helper.
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

// 0 flowers: an empty meadow has no visitors yet. 1-4: one butterfly stops
// by. 5-14: a bee joins. 15+: a ladybug too.
export function crittersForFlowerCount(flowerCount: number): readonly CritterKind[] {
  if (flowerCount <= 0) return []
  const kinds: CritterKind[] = ['butterfly']
  if (flowerCount >= 5) kinds.push('bee')
  if (flowerCount >= 15) kinds.push('ladybug')
  return kinds.slice(0, MAX_CRITTERS)
}

function pathFor(seed: string, points: number): CritterPoint[] {
  return Array.from({ length: points }, (_, i) => ({
    xPct: Math.round(unit(`${seed}:x:${i}`) * 1000) / 10, // 0..100, one decimal place
    yPct: Math.round(unit(`${seed}:y:${i}`) * 1000) / 10,
  }))
}

// The critters for a meadow holding this many flowers, each with its own
// seeded, stable flight path and timing.
export function layoutCritters(flowerCount: number): readonly Critter[] {
  return crittersForFlowerCount(flowerCount).map((kind, i) => {
    const seed = `critter:${kind}:${i}`
    const pointCount = kind === 'ladybug' ? 2 : 3
    return {
      id: seed,
      kind,
      path: pathFor(seed, pointCount),
      durationSec: Math.round((6 + unit(`${seed}:dur`) * 6) * 10) / 10, // 6..12s
      delaySec: Math.round(unit(`${seed}:delay`) * 30) / 10, // 0..3s
    }
  })
}
