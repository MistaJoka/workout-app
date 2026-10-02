import { describe, expect, it } from 'vitest'
import { createPinRecord, hashPin, isValidPin, verifyPin } from './pin'

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
