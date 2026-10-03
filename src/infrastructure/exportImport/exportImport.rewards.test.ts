import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/schema'
import { exportAll, importAll, isValidExportBundle } from './exportImport'
import { addReward, DELETED_REWARDS_KEY, listRewards, removeReward, updateReward } from '../db/repositories/rewardsRepository'
import { listRedemptions, markDelivered, markThanked, redeemReward } from '../db/repositories/redemptionsRepository'

beforeEach(async () => {
  await db.rewards.clear()
  await db.redemptions.clear()
  await db.settings.delete(DELETED_REWARDS_KEY)
})

describe('export/import of Hubby Bunny\'s reward shop', () => {
  it('round-trips a reward and a redemption through export and import', async () => {
    const reward = await addReward({ title: 'Foot rub', cost: 30, emoji: '🦶' }, '2026-09-01T00:00:00.000Z')
    await redeemReward(reward, '2026-09-05T00:00:00.000Z')
    const bundle = await exportAll()
    expect(bundle.rewards?.map((r) => r.id)).toEqual([reward.id])
    expect(bundle.redemptions).toHaveLength(1)

    await db.rewards.clear()
    await db.redemptions.clear()
    await importAll(bundle)
    expect((await listRewards())[0]).toMatchObject({ title: 'Foot rub', cost: 30 })
    expect((await listRedemptions())[0]).toMatchObject({ rewardId: reward.id, title: 'Foot rub', cost: 30 })
  })

  it('merges rewards newest-wins by updatedAt', async () => {
    const reward = await addReward({ title: 'Movie night pick', cost: 20, emoji: '🎬' }, '2026-09-01T00:00:00.000Z')
    const bundle = await exportAll() // Carries the original (older) version.

    // Locally the title changes after the backup was taken.
    await updateReward(reward.id, { title: 'Movie night pick (any genre)' }, '2026-09-10T00:00:00.000Z')
    await importAll(bundle)
    expect((await listRewards())[0].title).toBe('Movie night pick (any genre)')

    // An even-newer incoming edit wins over the local copy.
    const newer = { ...bundle.rewards![0], title: 'Movie night, her pick', updatedAt: '2026-09-20T00:00:00.000Z' }
    await importAll({ ...bundle, rewards: [newer] })
    expect((await listRewards())[0].title).toBe('Movie night, her pick')
  })

  it('imports redemptions add-only by id: a duplicate id already present is skipped, not duplicated', async () => {
    const reward = await addReward({ title: 'Dinner date', cost: 40, emoji: '🍽️' })
    const redemption = await redeemReward(reward, '2026-09-05T00:00:00.000Z')
    const bundle = await exportAll()

    // Delivered locally after the backup; importing the same bundle again
    // must never revert or duplicate it.
    await markDelivered(redemption.id, '2026-09-06T00:00:00.000Z')
    await importAll(bundle)
    const all = await listRedemptions()
    expect(all).toHaveLength(1)
    expect(all[0].deliveredAt).toBe('2026-09-06T00:00:00.000Z')
  })

  it('an other-profile backup adds its redemptions as history but leaves the local reward catalog alone', async () => {
    const localReward = await addReward({ title: 'No-dishes pass', cost: 15, emoji: '🧼' })
    const theirsBundle = {
      exportedAt: '2026-09-01T00:00:00.000Z',
      version: 1,
      profile: { id: 'someone-else', name: 'Someone Else' },
      settings: [],
      checkIns: [],
      sessionPlans: [],
      sessionEvents: [],
      sessionResults: [],
      familiarity: [],
      progression: [],
      rewards: [{ id: 'their-reward', title: 'Their reward', cost: 99, emoji: '❓', active: true, createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-01T00:00:00.000Z' }],
      redemptions: [{ id: 'their-redemption', rewardId: 'their-reward', title: 'Their reward', cost: 99, redeemedAt: '2026-08-02T00:00:00.000Z', deliveredAt: null }],
    }
    expect(isValidExportBundle(theirsBundle)).toBe(true)
    const summary = await importAll(theirsBundle)
    expect(summary).toEqual({ state: 'skipped-other-profile' })

    // Their redemption is added as history...
    expect((await listRedemptions()).map((r) => r.id)).toContain('their-redemption')
    // ...but the local reward catalog (current state) is untouched.
    expect((await listRewards()).map((r) => r.id)).toEqual([localReward.id])
  })

  it('does not bring back a reward deleted after the backup was made', async () => {
    const reward = await addReward({ title: 'Movie night pick', cost: 20, emoji: '🎬' }, '2026-09-01T00:00:00.000Z')
    const old = await exportAll()
    await removeReward(reward.id, '2026-09-10T00:00:00.000Z')

    await importAll(old)

    expect(await listRewards()).toEqual([])
  })

  it('a reward deleted on this device stays deleted even if the incoming copy is newer', async () => {
    const reward = await addReward({ title: 'Dinner date', cost: 40, emoji: '🍽️' }, '2026-09-01T00:00:00.000Z')
    await removeReward(reward.id, '2026-09-05T00:00:00.000Z')
    const newerFromElsewhere = {
      ...reward,
      title: 'Dinner date (edited elsewhere)',
      updatedAt: '2026-09-20T00:00:00.000Z',
    }

    await importAll({ ...(await exportAll()), rewards: [newerFromElsewhere] })

    expect(await listRewards()).toEqual([])
  })

  it('still accepts a pre-v4 bundle that has no rewards/redemptions fields', async () => {
    const bundle = await exportAll()
    const { rewards: _r, redemptions: _red, ...legacy } = bundle
    expect(isValidExportBundle(legacy)).toBe(true)
    await expect(importAll(legacy)).resolves.toEqual({ state: 'merged' })
  })
})

describe('export/import of her wishlist', () => {
  it('unions wishes from both sides and keeps a dismissal from either', async () => {
    const { addWish, dismissWish, getWishBook, WISHES_KEY } = await import('../db/repositories/wishesRepository')
    await db.settings.delete(WISHES_KEY)
    const kept = await addWish({ title: 'Spa day', emoji: '🛁' }, '2026-10-01T00:00:00.000Z')
    const bundle = await exportAll()
    await dismissWish(kept.id, '2026-10-02T00:00:00.000Z')
    const local = await addWish({ title: 'Pizza night', emoji: '🍕' }, '2026-10-03T00:00:00.000Z')
    await importAll(bundle)
    const book = await getWishBook()
    expect(Object.keys(book).sort()).toEqual([kept.id, local.id].sort())
    expect(book[kept.id].dismissedAt).toBe('2026-10-02T00:00:00.000Z')
  })
})

describe('coupon status merges on import', () => {
  it('delivered and thanked marks from a backup stick on a coupon that already exists here', async () => {
    const reward = await addReward({ title: 'Foot rub', cost: 30, emoji: '🦶' }, '2026-09-01T00:00:00.000Z')
    const coupon = await redeemReward(reward, '2026-09-05T00:00:00.000Z', 'coupon-1')
    const pending = await exportAll() // this device's copy: still pending
    await markDelivered(coupon.id, '2026-09-06T00:00:00.000Z')
    await markThanked(coupon.id, '2026-09-07T00:00:00.000Z')
    const newer = await exportAll()

    // Back to the pending copy, then the newer backup arrives.
    await db.redemptions.clear()
    await importAll(pending)
    await importAll(newer)
    expect((await listRedemptions())[0]).toMatchObject({ deliveredAt: '2026-09-06T00:00:00.000Z', thankedAt: '2026-09-07T00:00:00.000Z' })

    // And an older, pending backup never un-delivers it.
    await importAll(pending)
    expect((await listRedemptions())[0].deliveredAt).toBe('2026-09-06T00:00:00.000Z')
  })
})

