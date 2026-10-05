import { describe, expect, it } from 'vitest'
import { rewardIconById } from '../domain/rewards/rewardIcons'
import { pickIcon, pickEmoji, STARTER_IDEAS, type IconDraft } from './rewardDraft'

const empty: IconDraft = { title: '', cost: 0, emoji: '🎁', touched: { title: false, cost: false } }
const pizza = rewardIconById('pizza')!

describe('picking a reward icon', () => {
  it('fills an untouched draft with the icon, its name, price and emoji', () => {
    expect(pickIcon(empty, pizza)).toMatchObject({ icon: 'pizza', emoji: '🍕', title: 'Pizza night', cost: 40 })
  })

  it('keeps a title or price she already changed', () => {
    const typed: IconDraft = { ...empty, title: 'Our pizza', cost: 35, touched: { title: true, cost: true } }
    expect(pickIcon(typed, pizza)).toMatchObject({ icon: 'pizza', emoji: '🍕', title: 'Our pizza', cost: 35 })
  })

  it('an emoji pick clears the icon, so the reward shows that emoji', () => {
    const withIcon = pickIcon(empty, pizza)
    const next = pickEmoji(withIcon, '🍵')
    expect(next.emoji).toBe('🍵')
    expect(next.icon).toBeUndefined()
  })

  it('offers the catalog starter ideas, the five originals included', () => {
    // 19 approved ideas, the 6 personal Hubby Bunny rewards, the Road trip.
    expect(STARTER_IDEAS).toHaveLength(26)
    expect(STARTER_IDEAS.map((i) => i.name)).toEqual(expect.arrayContaining(['No-dishes pass', 'Movie night pick', 'Foot rub', 'Breakfast in bed', 'Dinner date']))
  })
})
