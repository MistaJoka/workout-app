import { describe, expect, it } from 'vitest'
import { linkLocationFor } from './appContext'

describe('linkLocationFor', () => {
  it('a browser or home-screen app links to its own address', () => {
    expect(linkLocationFor({ native: false, origin: 'https://x.ts.net:8443', baseUrl: '/', publicUrl: 'https://y/' })).toEqual({
      origin: 'https://x.ts.net:8443',
      baseUrl: '/',
    })
  })

  it("the APK links to the public web app, never its internal localhost", () => {
    expect(
      linkLocationFor({ native: true, origin: 'https://localhost', baseUrl: '/', publicUrl: 'https://nomad.tailed9e33.ts.net:8443/' })
    ).toEqual({ origin: 'https://nomad.tailed9e33.ts.net:8443', baseUrl: '/' })
    expect(linkLocationFor({ native: true, origin: 'https://localhost', baseUrl: '/', publicUrl: 'https://me.github.io/workout-app/' })).toEqual({
      origin: 'https://me.github.io',
      baseUrl: '/workout-app/',
    })
  })
})
