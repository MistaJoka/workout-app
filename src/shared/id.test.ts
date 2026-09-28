import { describe, expect, it } from 'vitest'
import { newId } from './id'

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe('newId', () => {
  it('returns a v4 UUID when crypto.randomUUID exists', () => {
    expect(newId()).toMatch(UUID_V4)
  })

  it('falls back to getRandomValues when randomUUID is missing (plain-HTTP pages)', () => {
    const fakeCrypto = { getRandomValues: <T extends ArrayBufferView>(a: T) => crypto.getRandomValues(a) }
    const ids = new Set(Array.from({ length: 50 }, () => newId(fakeCrypto)))
    expect(ids.size).toBe(50)
    for (const id of ids) expect(id).toMatch(UUID_V4)
  })

  it('still returns a unique v4-shaped id with no crypto at all', () => {
    const a = newId(null)
    const b = newId(null)
    expect(a).toMatch(UUID_V4)
    expect(a).not.toBe(b)
  })
})
