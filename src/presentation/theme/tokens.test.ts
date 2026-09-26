import { describe, expect, it } from 'vitest'
import { DEFAULT_THEME, THEME_TOKENS, type ThemeName } from './tokens'

// WCAG 2.x relative luminance and contrast ratio.
function channel(hex: string): number {
  const c = parseInt(hex, 16) / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

function luminance(color: string): number {
  const hex = color.replace('#', '')
  return 0.2126 * channel(hex.slice(0, 2)) + 0.7152 * channel(hex.slice(2, 4)) + 0.0722 * channel(hex.slice(4, 6))
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const AA_NORMAL_TEXT = 4.5
const THEMES: ThemeName[] = ['pixel-bloom', 'savage-core']

// Buttons are 16px bold (index.css .btn) — "normal" text under WCAG, so
// the 4.5:1 threshold applies, not the 3:1 large-text one.
describe('theme token contrast', () => {
  it.each(THEMES)('%s: on-primary text on the primary fill reaches AA', (theme) => {
    const t = THEME_TOKENS[theme]
    expect(contrastRatio(t.colorOnPrimary, t.colorPrimary)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT)
  })

  it.each(THEMES)('%s: on-accent text on the accent fill reaches AA', (theme) => {
    const t = THEME_TOKENS[theme]
    expect(contrastRatio(t.colorOnAccent, t.colorAccent)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT)
  })

  it.each(THEMES)('%s: body text on background and surface reaches AA', (theme) => {
    const t = THEME_TOKENS[theme]
    expect(contrastRatio(t.colorText, t.colorBackground)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT)
    expect(contrastRatio(t.colorText, t.colorSurface)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT)
    expect(contrastRatio(t.colorTextMuted, t.colorSurface)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT)
  })

  // Fields hold real copy (up next, rest timer, done, stats, notices).
  it.each(THEMES)('%s: body and muted text on every field reaches AA', (theme) => {
    const t = THEME_TOKENS[theme]
    for (const field of [t.colorFieldPrimary, t.colorFieldCalm, t.colorFieldSuccess, t.colorFieldInfo, t.colorFieldNotice]) {
      expect(contrastRatio(t.colorText, field)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT)
      expect(contrastRatio(t.colorTextMuted, field)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT)
    }
  })
})

describe('default theme', () => {
  it('is the Savage Core tactical HUD', () => {
    expect(DEFAULT_THEME).toBe('savage-core')
  })
})
