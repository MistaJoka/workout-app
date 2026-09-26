export type MotionPreference = 'full' | 'reduced' | 'off'

export type ThemeTokens = {
  colorBackground: string
  colorSurface: string
  colorPrimary: string
  colorPrimaryShadow: string
  // Text/icon color placed on the primary color (white on pink).
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
  radiusPanel: string
  radiusControl: string
  fontBody: string
}

// Pixel Bloom values are the v0 candidate creative tokens from
// docs/PIXEL_BLOOM_ASSET_SYSTEM.md §4 (Cloud / Blush / Mint / Sky /
// Lavender / Peach / Ink / Pink / Purple); colorTextMuted is Ink softened
// (#4f5268: the lighter #5f627a fell under AA on the Sky/Lavender fields).
// Pink and Purple are one shade darker than the §4 candidates (#ec4899 →
// #db2777, #8b5cf6 → #7c3aed): the candidates give white text only
// 3.5:1 / 4.1:1, under AA for button labels, and no on-color fixes that.
export const PIXEL_BLOOM_TOKENS: ThemeTokens = {
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
  radiusPanel: '18px',
  radiusControl: '999px',
  fontBody: "'Nunito Variable', ui-rounded, 'SF Pro Rounded', system-ui, sans-serif",
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
  radiusPanel: '--radius-panel',
  radiusControl: '--radius-control',
  fontBody: '--font-body',
}

export function applyThemeTokens(): void {
  const tokens = PIXEL_BLOOM_TOKENS
  const root = document.documentElement
  root.dataset.theme = 'pixel-bloom'
  root.style.colorScheme = 'light'
  for (const key of Object.keys(tokens) as (keyof ThemeTokens)[]) {
    root.style.setProperty(TOKEN_CSS_VAR[key], tokens[key])
  }
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', tokens.colorBackground)
}

export function applyMotionPreference(motion: MotionPreference): void {
  document.documentElement.dataset.motion = motion
}
