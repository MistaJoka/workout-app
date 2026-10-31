import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../infrastructure/db/schema'
import { getSetting } from '../infrastructure/db/repositories/settingsRepository'
import { GIVER_NAME, HUBBY_PIN, HUBBY_PIN_ATTEMPTS, readSetting } from '../infrastructure/settingsKeys'
import { PIN_COOLDOWN_RULES } from '../domain/rewards/pin'
import { checkPin, checkPinDetailed, hasPin, setupPin } from './hubbyPin'

beforeEach(async () => {
  await db.settings.clear()
})

describe('setupPin', () => {
  it('stores the hash, the name and a clean guess counter, and never the PIN itself', async () => {
    await setupPin('1234', 'Wifey Bunny')
    expect(await hasPin()).toBe(true)
    expect(await readSetting(GIVER_NAME)).toBe('Wifey Bunny')
    expect(await readSetting(HUBBY_PIN_ATTEMPTS)).toEqual({ failCount: 0, cooldownUntil: null })
    expect(JSON.stringify(await getSetting('rewardsHubbyPin'))).not.toContain('1234')
  })

  it('resets an old guess counter when the PIN is set again', async () => {
    await setupPin('1234', 'Hubby Bunny')
    await checkPin('0000')
    await setupPin('4321', 'Hubby Bunny')
    expect((await readSetting(HUBBY_PIN_ATTEMPTS)).failCount).toBe(0)
    expect(await checkPin('4321')).toBe('ok')
  })

  it('writes nothing when a write inside it fails', async () => {
    const real = db.settings.put.bind(db.settings)
    let calls = 0
    db.settings.put = ((...args: Parameters<typeof real>) => {
      calls += 1
      if (calls === 3) return Promise.reject(new Error('boom'))
      return real(...args)
    }) as typeof db.settings.put
    try {
      await expect(setupPin('1234', 'Hubby Bunny')).rejects.toThrow()
    } finally {
      db.settings.put = real
    }
    expect(await readSetting(HUBBY_PIN)).toBeNull()
    expect(await getSetting('rewardsGiverName')).toBeUndefined()
  })
})

describe('checkPin', () => {
  it('answers ok for the right PIN and wrong for another', async () => {
    await setupPin('1234', 'Hubby Bunny')
    expect(await checkPin('0000')).toBe('wrong')
    expect(await checkPin('1234')).toBe('ok')
  })

  it('a right guess wipes the failure count', async () => {
    await setupPin('1234', 'Hubby Bunny')
    await checkPin('0000')
    await checkPin('0000')
    await checkPin('1234')
    expect((await readSetting(HUBBY_PIN_ATTEMPTS)).failCount).toBe(0)
  })

  it('goes into cooldown after the free attempts, even for the right PIN, then recovers', async () => {
    await setupPin('1234', 'Hubby Bunny')
    const now = new Date('2026-10-30T12:00:00Z')
    for (let i = 0; i < PIN_COOLDOWN_RULES.freeAttempts; i++) expect((await checkPinDetailed('0000', now)).result).toBe('wrong')
    const sixth = await checkPinDetailed('0000', now)
    expect(sixth).toEqual({ result: 'wrong', remainingMs: PIN_COOLDOWN_RULES.baseCooldownMs })
    expect(await checkPin('1234', now)).toBe('cooldown')
    const later = new Date(now.getTime() + PIN_COOLDOWN_RULES.baseCooldownMs + 1)
    expect(await checkPin('1234', later)).toBe('ok')
  })

  it('is wrong when no PIN has been set', async () => {
    expect(await hasPin()).toBe(false)
    expect(await checkPin('1234')).toBe('wrong')
  })
})
