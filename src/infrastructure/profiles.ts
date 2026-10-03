import { newId } from '../shared/id'

// Profiles: two people share this app (and sometimes a device). Each
// profile owns a separate IndexedDB database, so every repository keeps
// its single `db` import and nothing is keyed by user. The active profile
// is read synchronously from localStorage before Dexie is constructed;
// switching profiles reloads the app so every module sees the new db.
//
// The first profile maps onto the original database name, so data from
// before profiles existed is that profile's data, untouched.

// emblem: a chosen garden species id (domain/progress/garden.ts), shown in
// place of the initial circle once set. Additive/optional so old profile
// records (no emblem ever chosen) keep working unchanged.
export type Profile = { id: string; name: string; emblem?: string }
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

// Settings -> You -> Emblem: a discovered garden species id to represent
// this profile, or null to go back to the plain initial circle. The UI is
// responsible for only offering already-discovered species; this setter
// trusts its caller.
export function setProfileEmblem(id: string, emblem: string | null, store: KeyValueStore | null = browserStore()): void {
  const state = loadProfiles(store)
  saveProfiles(
    {
      ...state,
      profiles: state.profiles.map((p) => {
        if (p.id !== id) return p
        if (!emblem) {
          const { emblem: _drop, ...rest } = p
          return rest
        }
        return { ...p, emblem }
      }),
    },
    store
  )
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

// Deletes another person's data: their database first, then their entry, so
// a failed or blocked delete never leaves an orphaned database behind a
// removed profile. The active profile and the last profile are refused
// before anything is touched. A delete that stays blocked (the database is
// open in another tab or window) gives up after blockedAfterMs and keeps
// the entry, so it can be retried once that window closes.
export async function deleteProfile(
  id: string,
  {
    store = browserStore(),
    deleteDb,
    blockedAfterMs = 5_000,
  }: { store?: KeyValueStore | null; deleteDb: (dbName: string) => Promise<void>; blockedAfterMs?: number }
): Promise<'deleted' | 'refused' | 'blocked'> {
  const state = loadProfiles(store)
  if (state.profiles.length <= 1 || id === state.activeId || !state.profiles.some((p) => p.id === id)) {
    return 'refused'
  }
  let timer: ReturnType<typeof setTimeout> | undefined
  const blocked = new Promise<'blocked'>((resolve) => {
    timer = setTimeout(() => resolve('blocked'), blockedAfterMs)
  })
  try {
    const outcome = await Promise.race([deleteDb(dbNameFor(id)).then(() => 'done' as const), blocked])
    if (outcome === 'blocked') return 'blocked'
  } finally {
    clearTimeout(timer)
  }
  removeProfile(id, store)
  return 'deleted'
}

// Choosing a person (from the open-time picker or Settings) is remembered
// per device for the calendar day, so "Who's working out?" asks at most
// once a day. `today` is the local YYYY-MM-DD.
export function setActiveProfile(
  id: string,
  store: KeyValueStore | null = browserStore(),
  today: string = localDay(new Date())
): void {
  const state = loadProfiles(store)
  if (!state.profiles.some((p) => p.id === id)) return
  saveProfiles({ ...state, activeId: id }, store)
  markProfilePicked(today, store)
}

const PICKED_KEY = 'workout-app:profile-picked'

export function markProfilePicked(today: string, store: KeyValueStore | null = browserStore()): void {
  try {
    store?.setItem(PICKED_KEY, today)
  } catch {
    // Storage blocked: the picker just asks again next open.
  }
}

export function lastProfilePickDate(store: KeyValueStore | null = browserStore()): string | null {
  try {
    return store?.getItem(PICKED_KEY) ?? null
  } catch {
    return null
  }
}

export function localDay(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

// Restoring a same-profile backup (e.g. after a reinstall wiped this
// device's profile list): the profile's name and emblem live here, not in
// the database, so the backup carries them. Fill in only what this device
// still has at its defaults; anything already set here wins.
export function adoptBackupProfile(
  backup: { name?: string; emblem?: string },
  store: KeyValueStore | null = browserStore()
): void {
  const state = loadProfiles(store)
  const active = state.profiles.find((p) => p.id === state.activeId) ?? state.profiles[0]
  const backupName = backup.name?.trim() ?? ''
  const takeName = backupName !== '' && backupName.toLowerCase() !== 'me' && active.name.trim().toLowerCase() === 'me'
  const takeEmblem = !!backup.emblem && !active.emblem
  if (!takeName && !takeEmblem) return
  saveProfiles(
    {
      ...state,
      profiles: state.profiles.map((p) =>
        p.id !== active.id ? p : { ...p, ...(takeName ? { name: backupName } : {}), ...(takeEmblem ? { emblem: backup.emblem } : {}) }
      ),
    },
    store
  )
}

