import { describe, expect, it } from 'vitest'
import {
  activeDbName,
  addProfile,
  BASE_DB_NAME,
  loadProfiles,
  removeProfile,
  renameProfile,
  setActiveProfile,
  type KeyValueStore,
} from './profiles'

function memoryStore(): KeyValueStore {
  const map = new Map<string, string>()
  return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v) }
}

describe('profiles', () => {
  it('starts with a single default profile whose database is the original name (pre-profile data stays theirs)', () => {
    const store = memoryStore()
    expect(loadProfiles(store)).toEqual({ profiles: [{ id: 'default', name: 'Me' }], activeId: 'default' })
    expect(activeDbName(store)).toBe(BASE_DB_NAME)
  })

  it('adds a second person with their own database name and switches to it', () => {
    const store = memoryStore()
    const wife = addProfile('Kay', store)
    expect(loadProfiles(store).profiles).toHaveLength(2)
    setActiveProfile(wife.id, store)
    expect(activeDbName(store)).toBe(`${BASE_DB_NAME}:${wife.id}`)
  })

  it('renames, and never removes the active or last profile', () => {
    const store = memoryStore()
    const wife = addProfile('Kay', store)
    renameProfile(wife.id, 'Kayla', store)
    expect(loadProfiles(store).profiles[1].name).toBe('Kayla')
    setActiveProfile(wife.id, store)
    expect(removeProfile(wife.id, store).profiles).toHaveLength(2) // active: refused
    setActiveProfile('default', store)
    expect(removeProfile(wife.id, store).profiles).toHaveLength(1)
    expect(removeProfile('default', store).profiles).toHaveLength(1) // last: refused
  })

  it('recovers from corrupt storage and a dangling active id', () => {
    const store = memoryStore()
    store.setItem('workout-app:profiles', 'not json')
    expect(loadProfiles(store).activeId).toBe('default')
    store.setItem('workout-app:profiles', JSON.stringify({ profiles: [{ id: 'a', name: 'A' }], activeId: 'zzz' }))
    expect(loadProfiles(store).activeId).toBe('a')
  })
})
