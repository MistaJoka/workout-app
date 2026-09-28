import { newId } from '../shared/id'

// Profiles: two people share this app (and sometimes a device). Each
// profile owns a separate IndexedDB database, so every repository keeps
// its single `db` import and nothing is keyed by user. The active profile
// is read synchronously from localStorage before Dexie is constructed;
// switching profiles reloads the app so every module sees the new db.
//
// The first profile maps onto the original database name, so data from
// before profiles existed is that profile's data, untouched.

export type Profile = { id: string; name: string }
export type ProfilesState = { profiles: Profile[]; activeId: string }

export const DEFAULT_PROFILE_ID = 'default'
export const BASE_DB_NAME = 'workout-app-v06'
const STORAGE_KEY = 'workout-app:profiles'

export type KeyValueStore = { getItem(key: string): string | null; setItem(key: string, value: string): void }

function defaultState(): ProfilesState {
  return { profiles: [{ id: DEFAULT_PROFILE_ID, name: 'Me' }], activeId: DEFAULT_PROFILE_ID }
}

function browserStore(): KeyValueStore | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null
  } catch {
    return null
  }
}

export function loadProfiles(store: KeyValueStore | null = browserStore()): ProfilesState {
  if (!store) return defaultState()
  try {
    const raw = store.getItem(STORAGE_KEY)
    if (!raw) return defaultState()
    const parsed = JSON.parse(raw) as ProfilesState
    if (!Array.isArray(parsed.profiles) || parsed.profiles.length === 0) return defaultState()
    const activeId = parsed.profiles.some((p) => p.id === parsed.activeId) ? parsed.activeId : parsed.profiles[0].id
    return { profiles: parsed.profiles, activeId }
  } catch {
    return defaultState()
  }
}

export function saveProfiles(state: ProfilesState, store: KeyValueStore | null = browserStore()): void {
  store?.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function dbNameFor(profileId: string): string {
  return profileId === DEFAULT_PROFILE_ID ? BASE_DB_NAME : `${BASE_DB_NAME}:${profileId}`
}

export function activeDbName(store: KeyValueStore | null = browserStore()): string {
  return dbNameFor(loadProfiles(store).activeId)
}

export function activeProfile(store: KeyValueStore | null = browserStore()): Profile {
  const state = loadProfiles(store)
  return state.profiles.find((p) => p.id === state.activeId) ?? state.profiles[0]
}

export function addProfile(name: string, store: KeyValueStore | null = browserStore()): Profile {
  const state = loadProfiles(store)
  const profile: Profile = { id: newId().slice(0, 8), name: name.trim() || 'New person' }
  saveProfiles({ ...state, profiles: [...state.profiles, profile] }, store)
  return profile
}

export function renameProfile(id: string, name: string, store: KeyValueStore | null = browserStore()): void {
  const state = loadProfiles(store)
  saveProfiles({ ...state, profiles: state.profiles.map((p) => (p.id === id ? { ...p, name: name.trim() || p.name } : p)) }, store)
}

// Removes the profile entry only; deleting its database is the caller's
// job (needs Dexie, and must never run on the active profile's open db).
export function removeProfile(id: string, store: KeyValueStore | null = browserStore()): ProfilesState {
  const state = loadProfiles(store)
  if (state.profiles.length <= 1 || id === state.activeId) return state
  const next = { ...state, profiles: state.profiles.filter((p) => p.id !== id) }
  saveProfiles(next, store)
  return next
}

export function setActiveProfile(id: string, store: KeyValueStore | null = browserStore()): void {
  const state = loadProfiles(store)
  if (!state.profiles.some((p) => p.id === id)) return
  saveProfiles({ ...state, activeId: id }, store)
}
