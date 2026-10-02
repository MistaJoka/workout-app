import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../schema'
import { addReward, listActiveRewards, listRewards, removeReward, updateReward, upsertRewardFromGift } from './rewardsRepository'

beforeEach(async () => {
  await db.rewards.clear()
})

describe('rewardsRepository', () => {
  it('adds a reward, active by default, and lists it oldest first', async () => {
    const first = await addReward({ title: 'Foot rub', cost: 30, emoji: '🦶' }, '2026-09-01T00:00:00.000Z')
    const second = await addReward({ title: 'Movie night pick', cost: 20, emoji: '🎬' }, '2026-09-02T00:00:00.000Z')
    expect(first.active).toBe(true)
    const all = await listRewards()
    expect(all.map((r) => r.id)).toEqual([first.id, second.id])
  })

  it('trims the title and floors cost at zero, rounded', async () => {
    const reward = await addReward({ title: '  Dinner date  ', cost: 19.6, emoji: '🍽️' })
    expect(reward.title).toBe('Dinner date')
    expect(reward.cost).toBe(20)
  })

  it('updates a reward and bumps updatedAt', async () => {
    const reward = await addReward({ title: 'Breakfast in bed', cost: 25, emoji: '🍳' }, '2026-09-01T00:00:00.000Z')
    const updated = await updateReward(reward.id, { cost: 35 }, '2026-09-05T00:00:00.000Z')
    expect(updated).toMatchObject({ id: reward.id, title: 'Breakfast in bed', cost: 35, updatedAt: '2026-09-05T00:00:00.000Z' })
  })

  it('updateReward on a missing id returns undefined and writes nothing', async () => {
    expect(await updateReward('nope', { cost: 10 })).toBeUndefined()
    expect(await listRewards()).toEqual([])
  })

  it('listActiveRewards excludes rewards marked inactive', async () => {
    const a = await addReward({ title: 'A', cost: 10, emoji: '🅰️' })
    const b = await addReward({ title: 'B', cost: 10, emoji: '🅱️' })
    await updateReward(b.id, { active: false })
    expect((await listActiveRewards()).map((r) => r.id)).toEqual([a.id])
  })

  it('removeReward deletes the reward entirely', async () => {
    const reward = await addReward({ title: 'No-dishes pass', cost: 15, emoji: '🍽️' })
    await removeReward(reward.id)
    expect(await listRewards()).toEqual([])
  })
})

describe('upsertRewardFromGift', () => {
  it('creates an active reward with the given id, trimmed title and rounded cost', async () => {
    const created = await upsertRewardFromGift({ id: 'r1', title: '  Foot rub  ', cost: 19.6, emoji: '💆' }, '2026-10-01T00:00:00.000Z')
    expect(created).toEqual({
      id: 'r1',
      title: 'Foot rub',
      cost: 20,
      emoji: '💆',
      active: true,
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
    })
    expect(await listRewards()).toEqual([created])
  })

  it('is a no-op once a reward with that id already exists (re-accepting the same gift link)', async () => {
    const first = await upsertRewardFromGift({ id: 'r1', title: 'Foot rub', cost: 20, emoji: '💆' }, '2026-10-01T00:00:00.000Z')
    const second = await upsertRewardFromGift({ id: 'r1', title: 'Different title', cost: 99, emoji: '🙃' }, '2026-10-05T00:00:00.000Z')
    expect(second).toEqual(first)
    expect(await listRewards()).toHaveLength(1)
  })
})
