import { createContext, useContext, useEffect, useLayoutEffect, useState, type ReactNode } from 'react'
import { applyMotionPreference, applyThemeTokens, type MotionPreference, type ThemeName } from './tokens'
import { getSetting, setSetting } from '../../infrastructure/db/repositories/settingsRepository'
import { activeProfile } from '../../infrastructure/profiles'
import { readCachedTheme, writeCachedTheme } from './themeCache'

type ThemeContextValue = {
  theme: ThemeName
  setTheme: (theme: ThemeName) => void
  motion: MotionPreference
  setMotion: (motion: MotionPreference) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Seed from the synchronous localStorage mirror so the first paint is
  // already in the right theme; Dexie remains the source of truth and
  // corrects the state if the mirror is missing or stale.
  const [profileId] = useState(() => activeProfile().id)
  const [theme, setThemeState] = useState<ThemeName>(() => readCachedTheme(profileId) ?? 'pixel-bloom')
  const [motion, setMotionState] = useState<MotionPreference>('full')

  useEffect(() => {
    let cancelled = false
    async function loadPreferences() {
      const [storedTheme, storedMotion] = await Promise.all([
        getSetting<ThemeName>('theme'),
        getSetting<MotionPreference>('motion'),
      ])
      if (cancelled) return
      if (storedTheme) {
        setThemeState(storedTheme)
        writeCachedTheme(profileId, storedTheme)
      }
      if (storedMotion) setMotionState(storedMotion)
    }
    void loadPreferences()
    return () => {
      cancelled = true
    }
  }, [profileId])

  // Layout effects run before the browser paints, so the tokens for the
  // seeded theme are on <html> before anything is visible.
  useLayoutEffect(() => {
    applyThemeTokens(theme)
  }, [theme])

  useLayoutEffect(() => {
    applyMotionPreference(motion)
  }, [motion])

  function setTheme(next: ThemeName) {
    setThemeState(next)
    writeCachedTheme(profileId, next)
    void setSetting('theme', next)
  }

  function setMotion(next: MotionPreference) {
    setMotionState(next)
    void setSetting('motion', next)
  }

  return <ThemeContext.Provider value={{ theme, setTheme, motion, setMotion }}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return ctx
}
