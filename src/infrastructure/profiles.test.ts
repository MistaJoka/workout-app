import { describe, expect, it } from 'vitest'
import {
  activeDbName,
  addProfile,
  BASE_DB_NAME,
  deleteProfile,
  lastProfilePickDate,
  loadProfiles,
  markProfilePicked,
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

describe('deleteProfile', () => {
  function twoPeople() {
    const store = memoryStore()
    const kay = addProfile('Kay', store)
    return { store, kay }
  }

  it('deletes the database first, then the entry', async () => {
    const { store, kay } = twoPeople()
    const deleted: string[] = []
    const result = await deleteProfile(kay.id, { store, deleteDb: async (name) => void deleted.push(name) })
    expect(result).toBe('deleted')
    expect(deleted).toEqual([`${BASE_DB_NAME}:${kay.id}`])
    expect(loadProfiles(store).profiles.map((p) => p.name)).toEqual(['Me'])
  })

  it('refuses the active profile and the last profile without touching any database', async () => {
    const { store } = twoPeople()
    let calls = 0
    const deleteDb = async () => void calls++
    expect(await deleteProfile('default', { store, deleteDb })).toBe('refused')
    expect(await deleteProfile('default', { store: memoryStore(), deleteDb })).toBe('refused')
    expect(calls).toBe(0)
  })

  it('keeps the entry when the database is open elsewhere and the delete is blocked', async () => {
    const { store, kay } = twoPeople()
    const never = () => new Promise<void>(() => {})
    expect(await deleteProfile(kay.id, { store, deleteDb: never, blockedAfterMs: 10 })).toBe('blocked')
    expect(loadProfiles(store).profiles).toHaveLength(2)
  })

  it('keeps the entry and rethrows when the delete fails', async () => {
    const { store, kay } = twoPeople()
    const failing = async () => {
      throw new Error('boom')
    }
    await expect(deleteProfile(kay.id, { store, deleteDb: failing })).rejects.toThrow('boom')
    expect(loadProfiles(store).profiles).toHaveLength(2)
  })
})

describe('daily profile pick', () => {
  it('remembers the day someone was picked', () => {
    const store = memoryStore()
    expect(lastProfilePickDate(store)).toBeNull()
    markProfilePicked('2026-10-01', store)
    expect(lastProfilePickDate(store)).toBe('2026-10-01')
  })

  it('switching profiles counts as picking today, so no picker right after the reload', () => {
    const store = memoryStore()
    const kay = addProfile('Kay', store)
    setActiveProfile(kay.id, store, '2026-10-01')
    expect(lastProfilePickDate(store)).toBe('2026-10-01')
  })
})
