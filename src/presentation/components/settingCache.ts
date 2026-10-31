// A module-level cache for one Dexie setting, shared by every hook instance.
// Without it, each screen that reads e.g. the weight unit started at the
// default, issued its own IndexedDB read, then re-rendered — nine call sites
// meant nine reads and a visible lb→kg flash on every screen for kg users.
// Switching profiles reloads the page, so the cache never outlives a profile.
export type SettingCache<T> = {
  peek: () => T
  resolve: () => Promise<T>
  set: (value: T) => void
  reset: () => void
}

export function createSettingCache<T>(load: () => Promise<T | undefined>, defaultValue: T): SettingCache<T> {
  let value: T | null = null
  let inflight: Promise<T> | null = null

  return {
    peek: () => value ?? defaultValue,
    resolve: () => {
      if (value !== null) return Promise.resolve(value)
      if (!inflight) {
        // A failed read answers with the default for now and isn't cached,
        // so the next ask reads again, instead of rejecting into every
        // screen that asked.
        inflight = load()
          .then(
            (stored) => {
              if (value === null) value = stored ?? defaultValue
              return value
            },
            () => value ?? defaultValue,
          )
          .finally(() => {
            inflight = null
          })
      }
      return inflight
    },
    set: (next) => {
      value = next
    },
    reset: () => {
      value = null
      inflight = null
    },
  }
}
