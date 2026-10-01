// Rae's room on Today changes with the season: novelty, never FOMO -
// nothing here is "limited time" messaging, it just quietly looks like
// autumn/winter/spring/summer outside her window. A couple of gentle,
// neutral holiday accents (a pumpkin, a string of warm lights) layer on
// top for a short date window, kept few so they stay a nice surprise
// rather than a theme change.
//
// Everything here is pure and framework-free so it's a plain vitest
// target; RaeHero.tsx wires it to the real date, the URL and (dev-only)
// localStorage.

export type Season = 'winter' | 'spring' | 'summer' | 'autumn'

export type HolidayAccent = 'pumpkin' | 'lights'

const SEASONS: readonly Season[] = ['winter', 'spring', 'summer', 'autumn']

// Northern-hemisphere meteorological seasons: Dec-Feb winter, Mar-May
// spring, Jun-Aug summer, Sep-Nov autumn.
export function seasonForDate(date: Date): Season {
  const month = date.getMonth() // 0-11
  if (month === 11 || month <= 1) return 'winter'
  if (month <= 4) return 'spring'
  if (month <= 7) return 'summer'
  return 'autumn'
}

// Month/day compared as a single MMDD-shaped number, so a range never
// needs to reason about month lengths or wrap across New Year's (neither
// accent window below crosses it).
function inMonthDayRange(date: Date, startMonth: number, startDay: number, endMonth: number, endDay: number): boolean {
  const value = (date.getMonth() + 1) * 100 + date.getDate()
  const start = (startMonth + 1) * 100 + startDay
  const end = (endMonth + 1) * 100 + endDay
  return value >= start && value <= end
}

// A few gentle, neutral accents layered on top of the season - never more
// than one at a time, and never framed as time-limited to the viewer.
export function holidayAccentForDate(date: Date): HolidayAccent | null {
  if (inMonthDayRange(date, 9, 20, 9, 31)) return 'pumpkin' // Oct 20-31
  if (inMonthDayRange(date, 11, 10, 11, 31)) return 'lights' // Dec 10-31
  return null
}

export const SEASON_QUERY_PARAM = 'season'

// Dev-only escape hatch (no UI) for forcing a season without a URL, e.g.
// from the console while poking around a build.
export const SEASON_OVERRIDE_STORAGE_KEY = 'workout-app:dev-season-override'

export function isSeason(value: string | null | undefined): value is Season {
  return value != null && (SEASONS as readonly string[]).includes(value)
}

// `search` is a `location.search`-shaped string (leading "?" optional).
function seasonFromSearch(search: string): Season | null {
  const params = new URLSearchParams(search)
  const value = params.get(SEASON_QUERY_PARAM)
  return isSeason(value) ? value : null
}

function seasonFromStorage(storage: Pick<Storage, 'getItem'> | null | undefined): Season | null {
  if (!storage) return null
  try {
    const value = storage.getItem(SEASON_OVERRIDE_STORAGE_KEY)
    return isSeason(value) ? value : null
  } catch {
    // Storage blocked (private mode, etc.): fall through to the real season.
    return null
  }
}

// The season Rae's room actually shows: an explicit `?season=` query
// override wins first (screenshots/tests), then a dev-only localStorage
// override, then the real meteorological season for `date`.
export function resolveSeason(date: Date, search = '', storage?: Pick<Storage, 'getItem'> | null): Season {
  return seasonFromSearch(search) ?? seasonFromStorage(storage) ?? seasonForDate(date)
}

// Same override shape as the season, for forcing a holiday accent (or
// forcing none) while poking around a build/screenshots - `?seasonAccent=`
// or the matching dev-only localStorage key. "none" explicitly suppresses
// the real date's accent, distinct from leaving it unset.
export const SEASON_ACCENT_QUERY_PARAM = 'seasonAccent'
export const SEASON_ACCENT_OVERRIDE_STORAGE_KEY = 'workout-app:dev-season-accent-override'

function isAccentOverride(value: string | null | undefined): value is HolidayAccent | 'none' {
  return value === 'pumpkin' || value === 'lights' || value === 'none'
}

function accentOverrideFrom(value: string | null): HolidayAccent | null | undefined {
  if (!isAccentOverride(value)) return undefined
  return value === 'none' ? null : value
}

export function resolveHolidayAccent(
  date: Date,
  search = '',
  storage?: Pick<Storage, 'getItem'> | null,
): HolidayAccent | null {
  const fromQuery = accentOverrideFrom(new URLSearchParams(search).get(SEASON_ACCENT_QUERY_PARAM))
  if (fromQuery !== undefined) return fromQuery
  if (storage) {
    try {
      const fromStorage = accentOverrideFrom(storage.getItem(SEASON_ACCENT_OVERRIDE_STORAGE_KEY))
      if (fromStorage !== undefined) return fromStorage
    } catch {
      // Storage blocked: fall through to the real date.
    }
  }
  return holidayAccentForDate(date)
}
