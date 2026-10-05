import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { REWARD_ICONS, rewardIconById } from './rewardIcons'

describe('reward icon catalog', () => {
  it('has 40 unique reward ids, each priced', () => {
    expect(REWARD_ICONS).toHaveLength(40)
    expect(new Set(REWARD_ICONS.map((i) => i.id)).size).toBe(40)
    for (const icon of REWARD_ICONS) expect(icon.cost, icon.id).toBeGreaterThan(0)
  })

  it('marks 25 starter ideas, keeping the original five and the personal Hubby Bunny tier', () => {
    const ideas = REWARD_ICONS.filter((i) => i.idea)
    expect(ideas).toHaveLength(25)
    const byName = new Map(ideas.map((i) => [i.name, i.cost]))
    expect(byName.get('No-dishes pass')).toBe(20)
    expect(byName.get('Movie night pick')).toBe(25)
    expect(byName.get('Foot rub')).toBe(30)
    expect(byName.get('Breakfast in bed')).toBe(60)
    expect(byName.get('Dinner date')).toBe(150)
    expect(byName.get("Hubby's butter noodles")).toBe(40)
    expect(byName.get("Hubby's baked salmon & rice")).toBe(60)
    expect(byName.get('Chipotle night')).toBe(50)
    expect(byName.get('You pick, Hubby cooks')).toBe(60)
    expect(byName.get('Hubby favor')).toBe(35)
    expect(byName.get('Mandatory movie night')).toBe(35)
  })

  it('looks icons up by id, and an unknown id finds nothing', () => {
    expect(rewardIconById('foot-rub')?.emoji).toBe('💆')
    expect(rewardIconById('hubby-butter-noodles')?.artReady).toBe(false)
    expect(rewardIconById('not-a-real-icon')).toBeUndefined()
    expect(rewardIconById(undefined)).toBeUndefined()
  })

  it('has both pictures for every art-ready icon', () => {
    for (const icon of REWARD_ICONS.filter((i) => i.artReady !== false)) {
      expect(existsSync(`public/rewards/${icon.id}.webp`), `${icon.id} sticker`).toBe(true)
      expect(existsSync(`public/rewards/${icon.id}-tile.webp`), `${icon.id} tile`).toBe(true)
    }
  })
})
