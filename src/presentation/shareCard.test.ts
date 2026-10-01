import { describe, expect, it } from 'vitest'
import { GARDEN_SPECIES } from '../domain/progress/garden'
import { buildCardModel, cardFilename, flowerPixels } from './shareCard'

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
