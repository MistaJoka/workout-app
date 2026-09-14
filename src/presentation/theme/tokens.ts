export type ThemeName = 'pixel-bloom' | 'savage-core'
export type MotionPreference = 'full' | 'reduced' | 'off'

export type ThemeTokens = {
  colorBackground: string
  colorSurface: string
  colorPrimary: string
  colorAccent: string
  colorText: string
  colorTextMuted: string
  colorBorder: string
  radiusPanel: string
}

// PLACEHOLDER TOKEN VALUES — see support/CLAUDE_REQUESTS.md REQ-20260913-003.
// Not final product visual design. Exists so the theme-switching
// architecture (shared component tree, semantic tokens, no per-theme
// forking) can be built and verified before real design tokens land.
export const THEME_TOKENS: Record<ThemeName, ThemeTokens> = {
  'pixel-bloom': {
    colorBackground: '#fdf2f8',
    colorSurface: '#ffffff',
    colorPrimary: '#ec4899',
    colorAccent: '#8b5cf6',
    colorText: '#3f2a44',
    colorTextMuted: '#8b7a92',
    colorBorder: '#f3d9ea',
    radiusPanel: '16px',
  },
  'savage-core': {
    colorBackground: '#0a0a0c',
    colorSurface: '#18181b',
    colorPrimary: '#22d3ee',
    colorAccent: '#f43f5e',
    colorText: '#f4f4f5',
    colorTextMuted: '#8a8a92',
    colorBorder: '#2a2a2f',
    radiusPanel: '4px',
  },
}

const TOKEN_CSS_VAR: Record<keyof ThemeTokens, string> = {
  colorBackground: '--color-background',
  colorSurface: '--color-surface',
  colorPrimary: '--color-primary',
  colorAccent: '--color-accent',
  colorText: '--color-text',
  colorTextMuted: '--color-text-muted',
  colorBorder: '--color-border',
  radiusPanel: '--radius-panel',
}

export function applyThemeTokens(theme: ThemeName): void {
  const tokens = THEME_TOKENS[theme]
  const root = document.documentElement
  root.dataset.theme = theme
  for (const key of Object.keys(tokens) as (keyof ThemeTokens)[]) {
    root.style.setProperty(TOKEN_CSS_VAR[key], tokens[key])
  }
}

export function applyMotionPreference(motion: MotionPreference): void {
  document.documentElement.dataset.motion = motion
}
