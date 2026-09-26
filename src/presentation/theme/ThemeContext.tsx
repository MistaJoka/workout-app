import { createContext, useContext, useEffect, useLayoutEffect, useState, type ReactNode } from 'react'
import { applyMotionPreference, applyThemeTokens, type MotionPreference } from './tokens'
import { getSetting, setSetting } from '../../infrastructure/db/repositories/settingsRepository'

type ThemeContextValue = {
  motion: MotionPreference
  setMotion: (motion: MotionPreference) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [motion, setMotionState] = useState<MotionPreference>('full')

  useEffect(() => {
    let cancelled = false
    void getSetting<MotionPreference>('motion').then((stored) => {
      if (!cancelled && stored) setMotionState(stored)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Pixel Bloom is the only theme (owner call, 2026-09-26). A `theme`
  // setting left over from the retired Savage Core theme is ignored.
  // Layout effect, so the tokens are on <html> before the first paint.
  useLayoutEffect(() => {
    applyThemeTokens()
  }, [])

  useLayoutEffect(() => {
    applyMotionPreference(motion)
  }, [motion])

  function setMotion(next: MotionPreference) {
    setMotionState(next)
    void setSetting('motion', next)
  }

  return <ThemeContext.Provider value={{ motion, setMotion }}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return ctx
}
