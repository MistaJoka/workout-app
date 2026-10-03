import { describe, expect, it } from 'vitest'
import {
  giverRole,
  cooldownMsFor,
  createPinRecord,
  hashPin,
  INITIAL_PIN_ATTEMPT_STATE,
  isInPinCooldown,
  isValidPin,
  pinCooldownMessage,
  recordCorrectPinAttempt,
  recordWrongPinAttempt,
  remainingCooldownMs,
  verifyPin,
  type PinAttemptState,
} from './pin'

// A deterministic stub digest: good enough to prove the hashing/verification
// *logic* (salting, comparison, format checks) without pulling in real
// SubtleCrypto here -- that seam is infrastructure/pinCrypto.test.ts's job.
const stubDigest = async (input: string): Promise<string> => `digest(${input})`

describe('isValidPin', () => {
  it('accepts exactly four digits', () => {
    expect(isValidPin('1234')).toBe(true)
    expect(isValidPin('0000')).toBe(true)
  })

  it('rejects anything else', () => {
    expect(isValidPin('123')).toBe(false)
    expect(isValidPin('12345')).toBe(false)
    expect(isValidPin('12a4')).toBe(false)
    expect(isValidPin('')).toBe(false)
    expect(isValidPin(' 1234')).toBe(false)
  })
})

describe('hashPin / createPinRecord / verifyPin', () => {
  it('the same PIN and salt hash the same way', async () => {
    expect(await hashPin('1234', 'salt-a', stubDigest)).toBe(await hashPin('1234', 'salt-a', stubDigest))
  })

  it('a different salt changes the hash for the same PIN (no shared rainbow table across profiles)', async () => {
    expect(await hashPin('1234', 'salt-a', stubDigest)).not.toBe(await hashPin('1234', 'salt-b', stubDigest))
  })

  it('a different PIN changes the hash for the same salt', async () => {
    expect(await hashPin('1234', 'salt-a', stubDigest)).not.toBe(await hashPin('5678', 'salt-a', stubDigest))
  })

  it('verifyPin accepts the PIN a record was created from', async () => {
    const record = await createPinRecord('4821', 'salt-x', stubDigest, 'sha256')
    expect(await verifyPin('4821', record, stubDigest)).toBe(true)
  })

  it('verifyPin rejects a wrong PIN', async () => {
    const record = await createPinRecord('4821', 'salt-x', stubDigest, 'sha256')
    expect(await verifyPin('0000', record, stubDigest)).toBe(false)
  })

  it('verifyPin rejects a malformed guess without calling the digest', async () => {
    const record = await createPinRecord('4821', 'salt-x', stubDigest, 'sha256')
    let calls = 0
    const counting: typeof stubDigest = async (input) => {
      calls += 1
      return stubDigest(input)
    }
    expect(await verifyPin('48213', record, counting)).toBe(false)
    expect(calls).toBe(0)
  })

  it('createPinRecord records which algorithm produced the hash', async () => {
    expect((await createPinRecord('1234', 's', stubDigest, 'fallback')).algorithm).toBe('fallback')
  })
})

describe('PIN guess cooldown', () => {
  const now = new Date('2026-10-02T00:00:00.000Z')

  it('the first 5 wrong guesses carry no cooldown', () => {
    let state: PinAttemptState = INITIAL_PIN_ATTEMPT_STATE
    for (let i = 1; i <= 5; i++) {
      state = recordWrongPinAttempt(state, now)
      expect(state.failCount).toBe(i)
      expect(isInPinCooldown(state, now)).toBe(false)
    }
  })

  it('the 6th wrong guess triggers a 30s cooldown, then doubles each time (60s, 120s, ...)', () => {
    let state: PinAttemptState = INITIAL_PIN_ATTEMPT_STATE
    for (let i = 0; i < 5; i++) state = recordWrongPinAttempt(state, now)

    state = recordWrongPinAttempt(state, now) // 6th
    expect(remainingCooldownMs(state, now)).toBe(30_000)

    state = recordWrongPinAttempt(state, now) // 7th
    expect(remainingCooldownMs(state, now)).toBe(60_000)

    state = recordWrongPinAttempt(state, now) // 8th
    expect(remainingCooldownMs(state, now)).toBe(120_000)
  })

  it('cooldownMsFor is 0 within the free attempts and doubles beyond them', () => {
    expect(cooldownMsFor(0)).toBe(0)
    expect(cooldownMsFor(5)).toBe(0)
    expect(cooldownMsFor(6)).toBe(30_000)
    expect(cooldownMsFor(7)).toBe(60_000)
    expect(cooldownMsFor(8)).toBe(120_000)
  })

  it('remainingCooldownMs counts down and reaches zero once the cooldown elapses', () => {
    let state: PinAttemptState = INITIAL_PIN_ATTEMPT_STATE
    for (let i = 0; i < 6; i++) state = recordWrongPinAttempt(state, now)
    expect(remainingCooldownMs(state, now)).toBe(30_000)
    const partway = new Date(now.getTime() + 10_000)
    expect(remainingCooldownMs(state, partway)).toBe(20_000)
    const after = new Date(now.getTime() + 30_000)
    expect(remainingCooldownMs(state, after)).toBe(0)
    expect(isInPinCooldown(state, after)).toBe(false)
  })

  it('a correct guess resets the counter and clears any cooldown', () => {
    let state: PinAttemptState = INITIAL_PIN_ATTEMPT_STATE
    for (let i = 0; i < 7; i++) state = recordWrongPinAttempt(state, now)
    expect(state.failCount).toBeGreaterThan(0)
    state = recordCorrectPinAttempt()
    expect(state).toEqual(INITIAL_PIN_ATTEMPT_STATE)
    expect(isInPinCooldown(state, now)).toBe(false)
  })

  it('pinCooldownMessage reports whole seconds remaining, rounded up, never below 1', () => {
    expect(pinCooldownMessage(30_000)).toContain('30s')
    expect(pinCooldownMessage(1_500)).toContain('2s')
    expect(pinCooldownMessage(0)).toContain('1s')
  })
})

describe('giverRole: the short word for whoever runs the shop', () => {
  it('is the first word of the giver name', () => {
    expect(giverRole('Hubby Bunny')).toBe('Hubby')
    expect(giverRole('Wifey Bunny')).toBe('Wifey')
    expect(giverRole('  dre  ')).toBe('Dre')
  })

  it('falls back to Hubby for a blank name', () => {
    expect(giverRole('')).toBe('Hubby')
    expect(giverRole(undefined)).toBe('Hubby')
  })
})

