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

// Pixel Bloom values are the v0 candidate creative tokens from
// docs/PIXEL_BLOOM_ASSET_SYSTEM.md §4 (Cloud / Blush / Ink / Pink / Purple);
// colorTextMuted is Ink softened, since the candidate set has no muted
// text value yet. Savage Core has no delivered token set — still a
// placeholder pending REQ-20260913-003.
export const THEME_TOKENS: Record<ThemeName, ThemeTokens> = {
  'pixel-bloom': {
    colorBackground: '#f8faff',
    colorSurface: '#ffffff',
    colorPrimary: '#ec4899',
    colorAccent: '#8b5cf6',
    colorText: '#2b2d42',
    colorTextMuted: '#6b6f86',
    colorBorder: '#ffd6e7',
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
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', tokens.colorBackground)
}

export function applyMotionPreference(motion: MotionPreference): void {
  document.documentElement.dataset.motion = motion
}
