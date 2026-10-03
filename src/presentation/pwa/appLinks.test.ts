import { describe, expect, it } from 'vitest'
import { hashRouteFromUrl } from './appLinks'

describe('hashRouteFromUrl', () => {
  it('takes the app route from a shared link', () => {
    expect(hashRouteFromUrl('https://nomad.tailed9e33.ts.net:8443/#/gift?d=abc')).toBe('#/gift?d=abc')
    expect(hashRouteFromUrl('https://me.github.io/workout-app/#/rewards')).toBe('#/rewards')
  })

  it('ignores links without an app route, and junk', () => {
    expect(hashRouteFromUrl('https://nomad.tailed9e33.ts.net:8443/')).toBeNull()
    expect(hashRouteFromUrl('https://x/#section')).toBeNull()
    expect(hashRouteFromUrl('not a url')).toBeNull()
  })
})
