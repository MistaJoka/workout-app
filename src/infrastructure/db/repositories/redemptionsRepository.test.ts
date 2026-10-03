import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../schema'
import { listRedemptions, markDelivered, markDeliveredByCode, markThanked, redeemReward, totalSpent } from './redemptionsRepository'
import { shortRedemptionCode } from '../../../domain/rewards/giftLink'

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

describe('redeemReward idempotency', () => {
  it('a retried redeem with the same id records one redemption and returns it', async () => {
    const reward = { id: 'r1', title: 'Foot rub', cost: 20 }
    const [a, b] = await Promise.all([
      redeemReward(reward, '2026-09-10T00:00:00.000Z', 'attempt-1'),
      redeemReward(reward, '2026-09-10T00:00:01.000Z', 'attempt-1'),
    ])
    expect(a.id).toBe('attempt-1')
    expect(b).toEqual(a)
    expect(await listRedemptions()).toHaveLength(1)
    expect(await totalSpent()).toBe(20)
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

describe('markDeliveredByCode', () => {
  it('marks every redemption whose own short code matches, leaving others untouched', async () => {
    const a = await redeemReward({ id: 'r1', title: 'A', cost: 10 }, '2026-09-10T00:00:00.000Z')
    const b = await redeemReward({ id: 'r2', title: 'B', cost: 10 }, '2026-09-11T00:00:00.000Z')
    const updated = await markDeliveredByCode([shortRedemptionCode(a.id)], '2026-10-01T00:00:00.000Z')
    expect(updated).toHaveLength(1)
    expect(updated[0]).toMatchObject({ id: a.id, deliveredAt: '2026-10-01T00:00:00.000Z' })
    const all = await listRedemptions()
    expect(all.find((r) => r.id === a.id)?.deliveredAt).toBe('2026-10-01T00:00:00.000Z')
    expect(all.find((r) => r.id === b.id)?.deliveredAt).toBeNull()
  })

  it('is a no-op (keeps the original delivery time) once already delivered', async () => {
    const a = await redeemReward({ id: 'r1', title: 'A', cost: 10 }, '2026-09-10T00:00:00.000Z')
    await markDeliveredByCode([shortRedemptionCode(a.id)], '2026-10-01T00:00:00.000Z')
    const again = await markDeliveredByCode([shortRedemptionCode(a.id)], '2026-10-05T00:00:00.000Z')
    expect(again[0].deliveredAt).toBe('2026-10-01T00:00:00.000Z')
  })

  it('matches case-insensitively and returns nothing for an unmatched code', async () => {
    const a = await redeemReward({ id: 'r1', title: 'A', cost: 10 })
    expect(await markDeliveredByCode([shortRedemptionCode(a.id).toLowerCase()])).toHaveLength(1)
    expect(await markDeliveredByCode(['zzzzzz'])).toHaveLength(0)
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

describe('markThanked', () => {
  it('records the first thank-you only', async () => {
    const r = await redeemReward({ id: 'r1', title: 'A', cost: 10 }, '2026-09-10T00:00:00.000Z')
    await markThanked(r.id, '2026-09-12T00:00:00.000Z')
    await markThanked(r.id, '2026-09-13T00:00:00.000Z')
    expect((await listRedemptions())[0].thankedAt).toBe('2026-09-12T00:00:00.000Z')
  })
})

