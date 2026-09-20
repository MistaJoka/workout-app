import type { KeyValueStore } from '../../infrastructure/profiles'
import type { ThemeName } from './tokens'

// Cold-start mirror of the `theme` setting. Dexie stays the source of truth,
// but reading it is async and lands after the first paint, which showed a
// frame of the default theme on every launch. localStorage is synchronous,
// so the provider can seed its initial state from here. Keyed by profile
// because each profile has its own settings table.
const PREFIX = 'workout-app:theme:'
const THEMES: readonly ThemeName[] = ['pixel-bloom', 'savage-core']

function browserStore(): KeyValueStore | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null
  } catch {
    return null
  }
}

export function readCachedTheme(profileId: string, store: KeyValueStore | null = browserStore()): ThemeName | null {
  try {
    const raw = store?.getItem(PREFIX + profileId)
    return (THEMES as readonly string[]).includes(raw ?? '') ? (raw as ThemeName) : null
  } catch {
    return null
  }
}

export function writeCachedTheme(profileId: string, theme: ThemeName, store: KeyValueStore | null = browserStore()): void {
  try {
    store?.setItem(PREFIX + profileId, theme)
  } catch {
    // storage blocked (private mode, quota) — the Dexie copy still wins on load
  }
}
