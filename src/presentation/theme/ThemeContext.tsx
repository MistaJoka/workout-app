import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { applyMotionPreference, applyThemeTokens, type MotionPreference, type ThemeName } from './tokens'
import { getSetting, setSetting } from '../../infrastructure/db/repositories/settingsRepository'

type ThemeContextValue = {
  theme: ThemeName
  setTheme: (theme: ThemeName) => void
  motion: MotionPreference
  setMotion: (motion: MotionPreference) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>('pixel-bloom')
  const [motion, setMotionState] = useState<MotionPreference>('full')

  useEffect(() => {
    let cancelled = false
    async function loadPreferences() {
      const [storedTheme, storedMotion] = await Promise.all([
        getSetting<ThemeName>('theme'),
        getSetting<MotionPreference>('motion'),
      ])
      if (cancelled) return
      if (storedTheme) setThemeState(storedTheme)
      if (storedMotion) setMotionState(storedMotion)
    }
    void loadPreferences()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    applyThemeTokens(theme)
  }, [theme])

  useEffect(() => {
    applyMotionPreference(motion)
  }, [motion])

  function setTheme(next: ThemeName) {
    setThemeState(next)
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
