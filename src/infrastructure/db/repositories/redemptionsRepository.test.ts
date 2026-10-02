import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../schema'
import { listRedemptions, markDelivered, redeemReward, totalSpent } from './redemptionsRepository'

beforeEach(async () => {
  await db.redemptions.clear()
})

const reward = { id: 'r1', title: 'Foot rub', cost: 30 }

describe('redeemReward / listRedemptions', () => {
  it('snapshots the reward title and cost, pending delivery', async () => {
    const redemption = await redeemReward(reward, '2026-09-10T00:00:00.000Z')
    expect(redemption).toMatchObject({ rewardId: 'r1', title: 'Foot rub', cost: 30, deliveredAt: null })
    expect(await listRedemptions()).toEqual([redemption])
  })

  it('lists newest redemption first', async () => {
    await redeemReward(reward, '2026-09-10T00:00:00.000Z')
    const second = await redeemReward(reward, '2026-09-11T00:00:00.000Z')
    const all = await listRedemptions()
    expect(all[0].id).toBe(second.id)
  })
})

describe('markDelivered', () => {
  it('sets deliveredAt once', async () => {
    const redemption = await redeemReward(reward, '2026-09-10T00:00:00.000Z')
    const delivered = await markDelivered(redemption.id, '2026-09-12T00:00:00.000Z')
    expect(delivered?.deliveredAt).toBe('2026-09-12T00:00:00.000Z')
  })

  it('is a no-op once already delivered (delivery time never moves)', async () => {
    const redemption = await redeemReward(reward, '2026-09-10T00:00:00.000Z')
    await markDelivered(redemption.id, '2026-09-12T00:00:00.000Z')
    const again = await markDelivered(redemption.id, '2026-09-20T00:00:00.000Z')
    expect(again?.deliveredAt).toBe('2026-09-12T00:00:00.000Z')
  })

  it('returns undefined for an unknown redemption id', async () => {
    expect(await markDelivered('nope')).toBeUndefined()
  })
})

describe('totalSpent', () => {
  it('sums every redemption ever made (delivered or not)', async () => {
    await redeemReward({ id: 'r1', title: 'A', cost: 10 })
    await redeemReward({ id: 'r2', title: 'B', cost: 25 })
    expect(await totalSpent()).toBe(35)
  })

  it('is zero with no redemptions', async () => {
    expect(await totalSpent()).toBe(0)
  })
})
