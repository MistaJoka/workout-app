import type { SessionResult } from '../session/types'
import { goalBlooms } from './goalBloom'

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

// `goal: true` marks a bonus flower grown by meeting a week's goal
// (goalBloom.ts), never by a workout of its own -- it carries the sessionId
// of the workout that earned it (so it still opens a real history page),
// but that session already has its own ordinary flower too.
export type GardenFlower = { sessionId: string; endedAt: string; species: GardenSpecies; goal?: true }

export type Garden = {
  flowers: GardenFlower[] // oldest first
  counts: Map<string, number> // species id -> how many grown
  discovered: number
  total: number
}

// `weeklyGoal` is optional (default 0, meaning "never met"): callers that
// don't pass it keep the garden exactly as it was before goal blooms
// existed. Callers that do pass the real weekly goal get one bonus flower
// per week it was met, slotted in right after the workout that earned it so
// the meadow and "every flower" list still read oldest-first.
export function buildGarden(results: readonly SessionResult[], weeklyGoal = 0): Garden {
  const sessionFlowers = [...results]
    .sort((a, b) => a.endedAt.localeCompare(b.endedAt))
    .map((r) => ({ sessionId: r.sessionId, endedAt: r.endedAt, species: speciesFor(r.sessionId) }))

  const bonusByTrigger = new Map<string, GardenSpecies[]>()
  for (const bloom of goalBlooms(results, weeklyGoal)) {
    const list = bonusByTrigger.get(bloom.sessionId) ?? []
    list.push(bloom.species)
    bonusByTrigger.set(bloom.sessionId, list)
  }

  const flowers: GardenFlower[] = []
  for (const f of sessionFlowers) {
    flowers.push(f)
    for (const species of bonusByTrigger.get(f.sessionId) ?? []) {
      flowers.push({ sessionId: f.sessionId, endedAt: f.endedAt, species, goal: true })
    }
  }

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

// Sets: a full tier of species is its own small collection to complete,
// separate from the overall garden. A tier is "complete" once every one of
// its species has grown at least once; its completedAt is the endedAt of
// the session that grew the last species the tier needed — whichever
// session that turns out to be, found by looking at when each species in
// the tier was first seen and taking the latest of those.

export const TIER_ORDER: readonly Rarity[] = ['common', 'uncommon', 'rare', 'legendary']

export const TIER_LABEL: Record<Rarity, string> = {
  common: 'Commons',
  uncommon: 'Uncommons',
  rare: 'Rares',
  legendary: 'Legendary',
}

export type TierProgress = {
  rarity: Rarity
  label: string
  discovered: number
  total: number
  complete: boolean
  // endedAt of the session that completed the tier, or null while incomplete.
  completedAt: string | null
}

export type GardenSets = {
  tiers: TierProgress[]
  overallComplete: boolean
}

export function buildGardenSets(garden: Garden): GardenSets {
  // Earliest endedAt each species was grown (flowers are oldest-first).
  const firstSeenAt = new Map<string, string>()
  for (const flower of garden.flowers) {
    if (!firstSeenAt.has(flower.species.id)) firstSeenAt.set(flower.species.id, flower.endedAt)
  }

  const tiers = TIER_ORDER.map((rarity): TierProgress => {
    const species = GARDEN_SPECIES.filter((s) => s.rarity === rarity)
    const discovered = species.filter((s) => garden.counts.has(s.id)).length
    const total = species.length
    const complete = discovered === total
    const completedAt = complete
      ? species.reduce<string | null>((latest, s) => {
          const seenAt = firstSeenAt.get(s.id)!
          return latest === null || seenAt > latest ? seenAt : latest
        }, null)
      : null
    return { rarity, label: TIER_LABEL[rarity], discovered, total, complete, completedAt }
  })

  return { tiers, overallComplete: tiers.every((t) => t.complete) }
}
