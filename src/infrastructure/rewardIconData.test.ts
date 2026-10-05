import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db/schema'
import { exportAll, importAll } from './exportImport/exportImport'
import { addReward, DELETED_REWARDS_KEY, listRewards, updateReward, upsertRewardFromGift } from './db/repositories/rewardsRepository'
import { addWish, getWishBook } from './db/repositories/wishesRepository'
import { decodeGiftLinkPayload, encodeGiftPayload, GIFT_LINK_VERSION, type GiftLinkPayload } from '../domain/rewards/giftLink'

const AT = '2026-10-05T00:00:00.000Z'

beforeEach(async () => {
  await db.rewards.clear()
  await db.settings.clear()
  await db.settings.delete(DELETED_REWARDS_KEY)
})

describe('rewards and wishes carry an optional pixel icon', () => {
  it('stores an icon on a new, updated or gifted reward', async () => {
    const reward = await addReward({ title: 'Pizza night', cost: 40, emoji: '🍕', icon: 'pizza' }, AT)
    expect(reward.icon).toBe('pizza')
    await updateReward(reward.id, { icon: 'sushi', emoji: '🍣' }, AT)
    expect((await listRewards())[0]).toMatchObject({ icon: 'sushi', emoji: '🍣' })
    const gifted = await upsertRewardFromGift({ id: 'g1', title: 'Foot rub', cost: 30, emoji: '💆', icon: 'foot-rub' }, AT)
    expect(gifted.icon).toBe('foot-rub')
  })

  it('leaves an emoji-only reward without an icon', async () => {
    const reward = await addReward({ title: 'Tea', cost: 10, emoji: '🍵' }, AT)
    expect('icon' in reward).toBe(false)
  })

  it('stores an icon on a wish', async () => {
    const wish = await addWish({ title: 'Boba run', emoji: '🧋', icon: 'boba' }, AT)
    expect((await getWishBook())[wish.id].icon).toBe('boba')
  })

  it('keeps icons through gift, wish and thank-you links, and still reads an old link without one', () => {
    const gift: GiftLinkPayload = { v: GIFT_LINK_VERSION, kind: 'gift', from: 'Hubby', rewards: [{ id: 'r', title: 'Pizza night', cost: 40, emoji: '🍕', icon: 'pizza' }], notes: [], createdAt: AT }
    const decodedGift = decodeGiftLinkPayload(encodeGiftPayload(gift))
    expect(decodedGift.ok && decodedGift.payload.kind === 'gift' && decodedGift.payload.rewards[0].icon).toBe('pizza')

    const wish: GiftLinkPayload = { v: GIFT_LINK_VERSION, kind: 'wish', from: 'Her', wishes: [{ id: 'w', title: 'Boba run', emoji: '🧋', icon: 'boba' }], createdAt: AT }
    const decodedWish = decodeGiftLinkPayload(encodeGiftPayload(wish))
    expect(decodedWish.ok && decodedWish.payload.kind === 'wish' && decodedWish.payload.wishes[0].icon).toBe('boba')

    const thanks: GiftLinkPayload = { v: GIFT_LINK_VERSION, kind: 'thanks', from: 'Her', title: 'Foot rub', emoji: '💆', icon: 'foot-rub', message: 'Thank you!', createdAt: AT }
    const decodedThanks = decodeGiftLinkPayload(encodeGiftPayload(thanks))
    expect(decodedThanks.ok && decodedThanks.payload.kind === 'thanks' && decodedThanks.payload.icon).toBe('foot-rub')

    const old: GiftLinkPayload = { v: GIFT_LINK_VERSION, kind: 'gift', from: 'Hubby', rewards: [{ id: 'r', title: 'Tea', cost: 10, emoji: '🍵' }], notes: [], createdAt: AT }
    const decodedOld = decodeGiftLinkPayload(encodeGiftPayload(old))
    expect(decodedOld.ok).toBe(true)
  })

  it('keeps icons through a backup, and imports an old backup without them', async () => {
    await addReward({ title: 'Pizza night', cost: 40, emoji: '🍕', icon: 'pizza' }, AT)
    await addReward({ title: 'Tea', cost: 10, emoji: '🍵' }, AT)
    const bundle = await exportAll()
    await db.rewards.clear()
    await importAll(bundle)
    const byTitle = new Map((await listRewards()).map((r) => [r.title, r]))
    expect(byTitle.get('Pizza night')?.icon).toBe('pizza')
    expect(byTitle.get('Tea')?.icon).toBeUndefined()
  })
})
