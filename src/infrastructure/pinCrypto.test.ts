import { afterEach, describe, expect, it, vi } from 'vitest'
import { generateSalt, hasSubtleCrypto, sha256Hex } from './pinCrypto'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('generateSalt', () => {
  it('produces different salts each time', () => {
    expect(generateSalt()).not.toBe(generateSalt())
  })
})

describe('hasSubtleCrypto', () => {
  it('is true in this (Node) test environment', () => {
    expect(hasSubtleCrypto()).toBe(true)
  })
})

describe('sha256Hex', () => {
  it('matches a known SHA-256 digest', async () => {
    // echo -n "" | sha256sum
    expect(await sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
  })

  it('is deterministic for the same input', async () => {
    expect(await sha256Hex('fs-hubby-pin:salt:1234')).toBe(await sha256Hex('fs-hubby-pin:salt:1234'))
  })

  it('differs for different input', async () => {
    expect(await sha256Hex('a')).not.toBe(await sha256Hex('b'))
  })

  it('falls back to a deterministic non-crypto digest when SubtleCrypto is unavailable', async () => {
    vi.stubGlobal('crypto', { ...globalThis.crypto, subtle: undefined })
    expect(hasSubtleCrypto()).toBe(false)
    const a = await sha256Hex('same-input')
    const b = await sha256Hex('same-input')
    expect(a).toBe(b)
    expect(a).not.toBe(await sha256Hex('different-input'))
  })
})
