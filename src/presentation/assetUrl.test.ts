import { describe, expect, it } from 'vitest'
import { asset } from './assetUrl'

// Default vitest/local/Capacitor BASE_URL is '/' (vite.config.ts's
// VITE_BASE_PATH is unset outside the GitHub Pages build), so these also
// double as a regression check: every existing root-absolute asset caller
// keeps getting the exact same string it hardcoded before this helper
// existed.
describe('asset', () => {
  it('joins a path without a leading slash onto BASE_URL', () => {
    expect(asset('rae/expr-smile.png')).toBe('/rae/expr-smile.png')
  })

  it('does not double a leading slash when the path already has one', () => {
    expect(asset('/rae/expr-smile.png')).toBe('/rae/expr-smile.png')
  })

  it('joins nested paths the same way', () => {
    expect(asset('exercise-media/Bodyweight_Squat/0.jpg')).toBe('/exercise-media/Bodyweight_Squat/0.jpg')
  })

  it('passes through an already-absolute URL unchanged (upstream library photos)', () => {
    const upstream = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Squat/0.jpg'
    expect(asset(upstream)).toBe(upstream)
  })
})
