export type ThemeName = 'pixel-bloom' | 'savage-core'
export type MotionPreference = 'full' | 'reduced' | 'off'

// A profile with no stored theme opens in the tactical HUD (owner call,
// 2026-09-26). A theme someone already picked is never overridden.
export const DEFAULT_THEME: ThemeName = 'savage-core'

export type ThemeTokens = {
  colorBackground: string
  colorSurface: string
  colorPrimary: string
  colorPrimaryShadow: string
  // Text/icon color placed on the primary color (white on pink, ink on cyan).
  colorOnPrimary: string
  colorAccent: string
  // Text/icon color placed on the accent color (destructive confirms).
  // Every on-color/fill pair must reach WCAG AA 4.5:1 — tokens.test.ts
  // checks it, since buttons are 16px bold ("normal" text).
  colorOnAccent: string
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
  // Theme signal color for "done/go" marks (Savage Core field edges,
  // progress fills). Never carries meaning on its own — text says it too.
  colorSignal: string
  // Glow halo for focus/active states; transparent where a theme has none.
  colorGlow: string
  radiusPanel: string
  radiusControl: string
  fontBody: string
  // Numerals (timers, reps, weights, stats) and headings.
  fontDisplay: string
}

// Pixel Bloom values are the v0 candidate creative tokens from
// docs/PIXEL_BLOOM_ASSET_SYSTEM.md §4 (Cloud / Blush / Mint / Sky /
// Lavender / Peach / Ink / Pink / Purple); colorTextMuted is Ink softened
// (#4f5268: the lighter #5f627a fell under AA on the Sky/Lavender fields).
// Pink and Purple are one shade darker than the §4 candidates (#ec4899 →
// #db2777, #8b5cf6 → #7c3aed): the candidates give white text only
// 3.5:1 / 4.1:1, under AA for button labels, and no on-color fixes that.
// Savage Core is the tactical HUD from SOURCE_OF_TRUTH_V07.md §13:
// graphite surfaces, electric cyan primary, hot red accent, volt signal.
// Owner-directed 2026-09-26 (the "Tactical build"); index.css carries its
// geometry (chamfers, brackets, grid) under [data-theme='savage-core'].
export const THEME_TOKENS: Record<ThemeName, ThemeTokens> = {
  'pixel-bloom': {
    colorBackground: '#f8faff',
    colorSurface: '#ffffff',
    colorPrimary: '#db2777',
    colorPrimaryShadow: '#b4286f',
    colorOnPrimary: '#ffffff',
    colorAccent: '#7c3aed',
    colorOnAccent: '#ffffff',
    colorText: '#2b2d42',
    colorTextMuted: '#4f5268',
    colorBorder: '#ffd6e7',
    colorFieldPrimary: '#ffd6e7',
    colorFieldCalm: '#b8e0ff',
    colorFieldSuccess: '#c8f7e1',
    colorFieldInfo: '#d9c8ff',
    colorFieldNotice: '#ffe1b8',
    colorSignal: '#10b981',
    colorGlow: 'transparent',
    radiusPanel: '18px',
    radiusControl: '999px',
    fontBody: "'Nunito Variable', ui-rounded, 'SF Pro Rounded', system-ui, sans-serif",
    fontDisplay: "'Nunito Variable', ui-rounded, 'SF Pro Rounded', system-ui, sans-serif",
  },
  'savage-core': {
    colorBackground: '#0a0c0f',
    colorSurface: '#12161b',
    colorPrimary: '#22d3ee',
    colorPrimaryShadow: '#0e7490',
    colorOnPrimary: '#05080a',
    colorAccent: '#ff3d6e',
    colorOnAccent: '#05080a',
    colorText: '#e6ebf0',
    colorTextMuted: '#8d97a3',
    colorBorder: '#26303a',
    colorFieldPrimary: '#0c2830',
    colorFieldCalm: '#0f1d2b',
    colorFieldSuccess: '#122a18',
    colorFieldInfo: '#1a1830',
    colorFieldNotice: '#2e210c',
    colorSignal: '#a3e635',
    colorGlow: 'rgba(34, 211, 238, 0.35)',
    radiusPanel: '3px',
    radiusControl: '3px',
    fontBody: "'Inter Variable', system-ui, sans-serif",
    fontDisplay: "'Chakra Petch', 'Inter Variable', system-ui, sans-serif",
  },
}

const TOKEN_CSS_VAR: Record<keyof ThemeTokens, string> = {
  colorBackground: '--color-background',
  colorSurface: '--color-surface',
  colorPrimary: '--color-primary',
  colorPrimaryShadow: '--color-primary-shadow',
  colorOnPrimary: '--color-on-primary',
  colorAccent: '--color-accent',
  colorOnAccent: '--color-on-accent',
  colorText: '--color-text',
  colorTextMuted: '--color-text-muted',
  colorBorder: '--color-border',
  colorFieldPrimary: '--color-field-primary',
  colorFieldCalm: '--color-field-calm',
  colorFieldSuccess: '--color-field-success',
  colorFieldInfo: '--color-field-info',
  colorFieldNotice: '--color-field-notice',
  colorSignal: '--color-signal',
  colorGlow: '--color-glow',
  radiusPanel: '--radius-panel',
  radiusControl: '--radius-control',
  fontBody: '--font-body',
  fontDisplay: '--font-display',
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
