import type { SessionResult } from '../session/types'

// Every finished workout grows one flower in the user's garden. Which
// species is a small, fixed surprise: it is seeded by the session id, so a
// session's flower never changes, but nobody can predict the next one. Most
// are common; now and then a rare one turns up. Flowers only ever add up:
// nothing wilts, nothing is lost for a missed day.

export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary'

export type GardenSpecies = {
  id: string
  name: string
  rarity: Rarity
  petal: string
  petalDark: string
  center: string
  centerDark: string
}

const RARITY_WEIGHTS: ReadonlyArray<[Rarity, number]> = [
  ['common', 0.7],
  ['uncommon', 0.22],
  ['rare', 0.07],
  ['legendary', 0.01],
]

export const GARDEN_SPECIES: readonly GardenSpecies[] = [
  { id: 'pink-bloom', name: 'Pink Bloom', rarity: 'common', petal: '#ff8fb8', petalDark: '#f06a9e', center: '#ffe08a', centerDark: '#f5b942' },
  { id: 'sky-daisy', name: 'Sky Daisy', rarity: 'common', petal: '#9ccaff', petalDark: '#6fa8ec', center: '#fff2b0', centerDark: '#f5c94a' },
  { id: 'butter-cup', name: 'Buttercup', rarity: 'common', petal: '#ffd966', petalDark: '#f2b829', center: '#ffffff', centerDark: '#f4d9a0' },
  { id: 'lilac-puff', name: 'Lilac Puff', rarity: 'common', petal: '#c9a7ff', petalDark: '#a47ff0', center: '#ffe08a', centerDark: '#f5b942' },
  { id: 'peach-poppy', name: 'Peach Poppy', rarity: 'common', petal: '#ffb08a', petalDark: '#f08a5e', center: '#5a3d36', centerDark: '#3b2723' },
  { id: 'mint-star', name: 'Mint Star', rarity: 'common', petal: '#9ee6c4', petalDark: '#6cc9a0', center: '#ffffff', centerDark: '#d6f5e6' },
  { id: 'cherry-pop', name: 'Cherry Pop', rarity: 'common', petal: '#ff6b8a', petalDark: '#e04466', center: '#ffe08a', centerDark: '#f5b942' },
  { id: 'cloud-bell', name: 'Cloud Bell', rarity: 'common', petal: '#f4f1ff', petalDark: '#d6cff2', center: '#ffcf6b', centerDark: '#f0a83a' },
  { id: 'coral-twist', name: 'Coral Twist', rarity: 'uncommon', petal: '#ff7f6b', petalDark: '#e85a47', center: '#fff2b0', centerDark: '#ffd166' },
  { id: 'ocean-iris', name: 'Ocean Iris', rarity: 'uncommon', petal: '#5b8def', petalDark: '#3a68c9', center: '#ffe08a', centerDark: '#f5b942' },
  { id: 'plum-heart', name: 'Plum Heart', rarity: 'uncommon', petal: '#a35bd6', petalDark: '#7d3cb0', center: '#ffb8d9', centerDark: '#ff8fb8' },
  { id: 'lime-zest', name: 'Lime Zest', rarity: 'uncommon', petal: '#c4ec6b', petalDark: '#9ccc3a', center: '#ff9f4a', centerDark: '#e8782a' },
  { id: 'moon-lily', name: 'Moon Lily', rarity: 'rare', petal: '#e6ecff', petalDark: '#a9b8f0', center: '#7b6cf0', centerDark: '#5646c9' },
  { id: 'ember-rose', name: 'Ember Rose', rarity: 'rare', petal: '#ff4d4d', petalDark: '#c92a3a', center: '#ffd23f', centerDark: '#ff9f1a' },
  { id: 'golden-sun', name: 'Golden Sun', rarity: 'legendary', petal: '#ffc940', petalDark: '#f29e0c', center: '#ff6bb5', centerDark: '#e0408f' },
]

// FNV-1a, folded to [0, 1). Two independent draws per session: one picks
// the rarity tier, the other the species within it.
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

export function speciesFor(sessionId: string): GardenSpecies {
  const roll = unit(`rarity:${sessionId}`)
  let rarity: Rarity = 'common'
  let edge = 0
  for (const [tier, weight] of RARITY_WEIGHTS) {
    edge += weight
    if (roll < edge) {
      rarity = tier
      break
    }
  }
  const tier = GARDEN_SPECIES.filter((s) => s.rarity === rarity)
  return tier[Math.floor(unit(`species:${sessionId}`) * tier.length)]
}

export type GardenFlower = { sessionId: string; endedAt: string; species: GardenSpecies }

export type Garden = {
  flowers: GardenFlower[] // oldest first
  counts: Map<string, number> // species id -> how many grown
  discovered: number
  total: number
}

export function buildGarden(results: readonly SessionResult[]): Garden {
  const flowers = [...results]
    .sort((a, b) => a.endedAt.localeCompare(b.endedAt))
    .map((r) => ({ sessionId: r.sessionId, endedAt: r.endedAt, species: speciesFor(r.sessionId) }))
  const counts = new Map<string, number>()
  for (const f of flowers) counts.set(f.species.id, (counts.get(f.species.id) ?? 0) + 1)
  return { flowers, counts, discovered: counts.size, total: GARDEN_SPECIES.length }
}

// The flower one session grew, and whether it was the first of its species
// (no session that ended before it grew the same one).
export function sessionBloom(
  results: readonly SessionResult[],
  sessionId: string
): { species: GardenSpecies; isNew: boolean } {
  const species = speciesFor(sessionId)
  const mine = results.find((r) => r.sessionId === sessionId)
  const isNew = !results.some(
    (r) => r.sessionId !== sessionId && (!mine || r.endedAt < mine.endedAt) && speciesFor(r.sessionId).id === species.id
  )
  return { species, isNew }
}

export const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare!',
  legendary: 'Legendary!',
}
