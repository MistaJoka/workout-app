import { describe, expect, it } from 'vitest'
import { readCachedTheme, writeCachedTheme } from './themeCache'
import type { KeyValueStore } from '../../infrastructure/profiles'

function memoryStore(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
  }
}

describe('theme cache (cold-start mirror of the Dexie setting)', () => {
  it('returns null when nothing is cached', () => {
    expect(readCachedTheme('p1', memoryStore())).toBeNull()
  })

  it('round-trips a theme name per profile', () => {
    const store = memoryStore()
    writeCachedTheme('p1', 'savage-core', store)
    expect(readCachedTheme('p1', store)).toBe('savage-core')
    expect(readCachedTheme('p2', store)).toBeNull()
  })

  it('ignores values that are not a known theme', () => {
    const store = memoryStore()
    store.setItem('workout-app:theme:p1', 'neon')
    expect(readCachedTheme('p1', store)).toBeNull()
  })

  it('never throws when the store is missing or broken', () => {
    const broken: KeyValueStore = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    }
    expect(readCachedTheme('p1', null)).toBeNull()
    expect(readCachedTheme('p1', broken)).toBeNull()
    expect(() => writeCachedTheme('p1', 'pixel-bloom', broken)).not.toThrow()
    expect(() => writeCachedTheme('p1', 'pixel-bloom', null)).not.toThrow()
  })
})
