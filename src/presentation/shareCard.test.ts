import { describe, expect, it } from 'vitest'
import { GARDEN_SPECIES, type Garden } from '../domain/progress/garden'
import type { LevelInfo } from '../domain/progress/xp'
import {
  badgeCardFilename,
  badgeIconPixels,
  buildBadgeCardModel,
  buildCardModel,
  buildGardenCardModel,
  buildLevelCardModel,
  cardFilename,
  flowerPixels,
  gardenCardFilename,
  levelCardFilename,
} from './shareCard'

const common = GARDEN_SPECIES.find((s) => s.rarity === 'common')!
const rare = GARDEN_SPECIES.find((s) => s.rarity === 'rare')!
const legendary = GARDEN_SPECIES.find((s) => s.rarity === 'legendary')!

const base = {
  workoutName: 'Full-Body A',
  endedAt: '2026-10-01T18:30:00.000Z',
  stats: { minutes: 15, sets: 10, moves: 5 },
  species: common,
}

describe('buildCardModel', () => {
  it('carries only the workout, its stats and the flower', () => {
    const model = buildCardModel(base)
    expect(model.header).toBe('Workout complete')
    expect(model.title).toBe('Full-Body A')
    expect(model.stats).toEqual([
      { value: '15', label: 'minutes' },
      { value: '10', label: 'sets' },
      { value: '5', label: 'moves' },
    ])
    expect(model.flowerName).toBe(common.name)
    expect(model.rarityLabel).toBeNull()
    expect(model.highlight).toBeNull()
  })

  it('uses the first name when one is set, and singular labels', () => {
    const model = buildCardModel({ ...base, name: 'Kay', stats: { minutes: 1, sets: 1, moves: 1 } })
    expect(model.header).toBe("Kay's workout")
    expect(model.stats.map((s) => s.label)).toEqual(['minute', 'set', 'move'])
  })

  it('names rarity above common and keeps a highlight', () => {
    expect(buildCardModel({ ...base, species: rare }).rarityLabel).toBe('Rare')
    expect(buildCardModel({ ...base, species: legendary, highlight: '10 workouts!' })).toMatchObject({
      rarityLabel: 'Legendary',
      highlight: '10 workouts!',
    })
  })

  it('never uses a middle dot (copy rule)', () => {
    const model = buildCardModel({ ...base, name: 'Kay', highlight: 'New best: Plank' })
    expect(JSON.stringify(model)).not.toContain('·')
  })
})

describe('flowerPixels', () => {
  it("draws the species' petals and center inside PixelBloom's 16x22 grid", () => {
    const pixels = flowerPixels(common)
    expect(pixels.some((p) => p.color === common.petal)).toBe(true)
    expect(pixels.some((p) => p.color === common.centerDark)).toBe(true)
    for (const p of pixels) {
      expect(p.x).toBeGreaterThanOrEqual(0)
      expect(p.y).toBeGreaterThanOrEqual(0)
      expect(p.x + p.w).toBeLessThanOrEqual(16)
      expect(p.y + p.h).toBeLessThanOrEqual(22)
    }
  })

  it('adds sparkles only for rare and legendary', () => {
    expect(flowerPixels(rare).length).toBe(flowerPixels(common).length + 4)
    expect(flowerPixels(legendary).some((p) => p.color === '#ffd23f')).toBe(true)
  })
})

describe('cardFilename', () => {
  it('names the file by the workout date', () => {
    expect(cardFilename('2026-10-01T18:30:00.000Z')).toBe('workout-2026-10-01.png')
  })
})

describe('buildBadgeCardModel', () => {
  const base = {
    id: 'first-workout',
    title: 'First bloom',
    description: 'Finish your first workout.',
    icon: 'sprout' as const,
    unlockedAt: '2026-10-01T18:30:00.000Z',
  }

  it('carries the badge title, description, icon and earned date', () => {
    const model = buildBadgeCardModel(base)
    expect(model.header).toBe('Badge earned')
    expect(model.title).toBe('First bloom')
    expect(model.description).toBe('Finish your first workout.')
    expect(model.icon).toBe('sprout')
    expect(model.date).toBe('Thursday, October 1')
  })

  it('uses the first name when one is set', () => {
    expect(buildBadgeCardModel({ ...base, name: 'Kay' }).header).toBe("Kay's badge")
  })
})

describe('badgeIconPixels', () => {
  it("draws every icon inside the 8x8 grid", () => {
    for (const icon of ['sprout', 'trophy', 'medal'] as const) {
      const pixels = badgeIconPixels(icon)
      expect(pixels.length).toBeGreaterThan(0)
      for (const p of pixels) {
        expect(p.x).toBeGreaterThanOrEqual(0)
        expect(p.y).toBeGreaterThanOrEqual(0)
        expect(p.x + p.w).toBeLessThanOrEqual(8)
        expect(p.y + p.h).toBeLessThanOrEqual(8)
      }
    }
  })
})

describe('badgeCardFilename', () => {
  it('names the file by the badge id and earned date', () => {
    expect(badgeCardFilename('first-workout', '2026-10-01T18:30:00.000Z')).toBe('badge-first-workout-2026-10-01.png')
  })
})

function fakeGarden(speciesIds: string[]): Garden {
  const counts = new Map(speciesIds.map((id, i) => [id, i + 1]))
  return {
    flowers: speciesIds.map((id, i) => ({
      sessionId: `s${i}`,
      endedAt: `2026-10-0${i + 1}T00:00:00.000Z`,
      species: GARDEN_SPECIES.find((s) => s.id === id)!,
    })),
    counts,
    discovered: counts.size,
    total: GARDEN_SPECIES.length,
  }
}

describe('buildGardenCardModel', () => {
  it('summarizes kinds found and marks every species as discovered or not', () => {
    const garden = fakeGarden(['pink-bloom', 'sky-daisy'])
    const model = buildGardenCardModel({ garden })
    expect(model.header).toBe('My garden')
    expect(model.summary).toBe(`2 of ${GARDEN_SPECIES.length} kinds found`)
    expect(model.entries).toHaveLength(GARDEN_SPECIES.length)
    expect(model.entries.find((e) => e.species.id === 'pink-bloom')).toMatchObject({ discovered: true, count: 1 })
    expect(model.entries.find((e) => e.species.id === 'moon-lily')).toMatchObject({ discovered: false, count: 0 })
  })

  it('highlights only the rarest discovered species', () => {
    const garden = fakeGarden(['pink-bloom', 'moon-lily', 'golden-sun'])
    const model = buildGardenCardModel({ garden })
    const highlighted = model.entries.filter((e) => e.highlighted)
    expect(highlighted).toHaveLength(1)
    expect(highlighted[0].species.id).toBe('golden-sun')
  })

  it('highlights nothing when nothing is discovered', () => {
    const model = buildGardenCardModel({ garden: fakeGarden([]) })
    expect(model.entries.some((e) => e.highlighted)).toBe(false)
  })

  it('uses the first name when one is set', () => {
    expect(buildGardenCardModel({ garden: fakeGarden([]), name: 'Kay' }).header).toBe("Kay's garden")
  })
})

describe('gardenCardFilename', () => {
  it('names the file by date', () => {
    expect(gardenCardFilename(new Date('2026-10-01T18:30:00.000Z'))).toBe('garden-2026-10-01.png')
  })
})

describe('buildLevelCardModel', () => {
  const level: LevelInfo = { level: 4, name: 'Blossom', into: 30, needed: 150, total: 430 }

  it('carries the level number, name and XP progress', () => {
    const model = buildLevelCardModel({ level })
    expect(model.header).toBe('Bloom level')
    expect(model.levelNumber).toBe(4)
    expect(model.levelName).toBe('Blossom')
    expect(model.into).toBe(30)
    expect(model.needed).toBe(150)
    expect(model.pct).toBe(20)
  })

  it('uses the first name when one is set', () => {
    expect(buildLevelCardModel({ level, name: 'Kay' }).header).toBe("Kay's level")
  })
})

describe('levelCardFilename', () => {
  it('names the file by level number', () => {
    expect(levelCardFilename(4)).toBe('level-4.png')
  })
})
