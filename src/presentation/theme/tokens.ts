export type ThemeName = 'pixel-bloom' | 'savage-core'
export type MotionPreference = 'full' | 'reduced' | 'off'

export type ThemeTokens = {
  colorBackground: string
  colorSurface: string
  colorPrimary: string
  colorPrimaryShadow: string
  colorAccent: string
  colorText: string
  colorTextMuted: string
  colorBorder: string
  // Pastel "fields": tinted surfaces that carry meaning (up next, rest,
  // done, progress, notice) instead of one white card everywhere.
  colorFieldPrimary: string
  colorFieldCalm: string
  colorFieldSuccess: string
  colorFieldInfo: string
  colorFieldNotice: string
  radiusPanel: string
  radiusControl: string
}

// Pixel Bloom values are the v0 candidate creative tokens from
// docs/PIXEL_BLOOM_ASSET_SYSTEM.md §4 (Cloud / Blush / Mint / Sky /
// Lavender / Peach / Ink / Pink / Purple); colorTextMuted is Ink softened.
// Savage Core has no delivered token set — still a placeholder pending
// REQ-20260913-003, kept structurally identical so nothing forks.
export const THEME_TOKENS: Record<ThemeName, ThemeTokens> = {
  'pixel-bloom': {
    colorBackground: '#f8faff',
    colorSurface: '#ffffff',
    colorPrimary: '#ec4899',
    colorPrimaryShadow: '#b4286f',
    colorAccent: '#8b5cf6',
    colorText: '#2b2d42',
    colorTextMuted: '#5f627a',
    colorBorder: '#ffd6e7',
    colorFieldPrimary: '#ffd6e7',
    colorFieldCalm: '#b8e0ff',
    colorFieldSuccess: '#c8f7e1',
    colorFieldInfo: '#d9c8ff',
    colorFieldNotice: '#ffe1b8',
    radiusPanel: '18px',
    radiusControl: '999px',
  },
  'savage-core': {
    colorBackground: '#0f0f13',
    colorSurface: '#1a1a21',
    colorPrimary: '#22d3ee',
    colorPrimaryShadow: '#0e7f90',
    colorAccent: '#f43f5e',
    colorText: '#f4f4f5',
    colorTextMuted: '#9a9aa6',
    colorBorder: '#2c2c36',
    colorFieldPrimary: '#12363c',
    colorFieldCalm: '#16283a',
    colorFieldSuccess: '#123a2c',
    colorFieldInfo: '#2a2440',
    colorFieldNotice: '#3a2a12',
    radiusPanel: '10px',
    radiusControl: '10px',
  },
}

const TOKEN_CSS_VAR: Record<keyof ThemeTokens, string> = {
  colorBackground: '--color-background',
  colorSurface: '--color-surface',
  colorPrimary: '--color-primary',
  colorPrimaryShadow: '--color-primary-shadow',
  colorAccent: '--color-accent',
  colorText: '--color-text',
  colorTextMuted: '--color-text-muted',
  colorBorder: '--color-border',
  colorFieldPrimary: '--color-field-primary',
  colorFieldCalm: '--color-field-calm',
  colorFieldSuccess: '--color-field-success',
  colorFieldInfo: '--color-field-info',
  colorFieldNotice: '--color-field-notice',
  radiusPanel: '--radius-panel',
  radiusControl: '--radius-control',
}

export function applyThemeTokens(theme: ThemeName): void {
  const tokens = THEME_TOKENS[theme]
  const root = document.documentElement
  root.dataset.theme = theme
  root.style.colorScheme = theme === 'savage-core' ? 'dark' : 'light'
  for (const key of Object.keys(tokens) as (keyof ThemeTokens)[]) {
    root.style.setProperty(TOKEN_CSS_VAR[key], tokens[key])
  }
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', tokens.colorBackground)
}

export function applyMotionPreference(motion: MotionPreference): void {
  document.documentElement.dataset.motion = motion
}
