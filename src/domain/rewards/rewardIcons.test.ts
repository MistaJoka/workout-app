import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { REWARD_ICONS, rewardIconById } from './rewardIcons'

describe('reward icon catalog', () => {
  it('has the 34 unique icons the owner downloaded, each priced', () => {
    expect(REWARD_ICONS).toHaveLength(34)
    expect(new Set(REWARD_ICONS.map((i) => i.id)).size).toBe(34)
    for (const icon of REWARD_ICONS) expect(icon.cost, icon.id).toBeGreaterThan(0)
  })

  it('marks the 19 starter ideas from the spec, keeping the five original ideas and their prices', () => {
    const ideas = REWARD_ICONS.filter((i) => i.idea)
    expect(ideas).toHaveLength(19)
    const byName = new Map(ideas.map((i) => [i.name, i.cost]))
    expect(byName.get('No-dishes pass')).toBe(20)
    expect(byName.get('Movie night pick')).toBe(25)
    expect(byName.get('Foot rub')).toBe(30)
    expect(byName.get('Breakfast in bed')).toBe(60)
    expect(byName.get('Dinner date')).toBe(150)
  })

  it('looks icons up by id, and an unknown id finds nothing', () => {
    expect(rewardIconById('foot-rub')?.emoji).toBe('💆')
    expect(rewardIconById('not-a-real-icon')).toBeUndefined()
    expect(rewardIconById(undefined)).toBeUndefined()
  })

  it('has both pictures for every icon', () => {
    for (const icon of REWARD_ICONS) {
      expect(existsSync(`public/rewards/${icon.id}.webp`), `${icon.id} sticker`).toBe(true)
      expect(existsSync(`public/rewards/${icon.id}-tile.webp`), `${icon.id} tile`).toBe(true)
    }
  })
})
