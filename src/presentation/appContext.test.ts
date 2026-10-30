import { describe, expect, it } from 'vitest'
import { browserStorageIsSeparate, linkLocationFor } from './appContext'

const PUBLIC = 'https://nomad.tailed9e33.ts.net:10000/'

describe('linkLocationFor', () => {
  it('a page on the public address links to itself', () => {
    expect(linkLocationFor({ native: false, origin: 'https://nomad.tailed9e33.ts.net:10000', baseUrl: '/', publicUrl: PUBLIC })).toEqual({
      origin: 'https://nomad.tailed9e33.ts.net:10000',
      baseUrl: '/',
    })
  })

  it('the tailnet-only install and the LAN link to the public address she can reach', () => {
    for (const origin of ['https://nomad.tailed9e33.ts.net:8443', 'http://192.168.1.130:4173']) {
      expect(linkLocationFor({ native: false, origin, baseUrl: '/', publicUrl: PUBLIC })).toEqual({
        origin: 'https://nomad.tailed9e33.ts.net:10000',
        baseUrl: '/',
      })
    }
  })

  it('a localhost page (dev, tests) links to itself', () => {
    expect(linkLocationFor({ native: false, origin: 'http://localhost:4199', baseUrl: '/', publicUrl: PUBLIC })).toEqual({
      origin: 'http://localhost:4199',
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

describe('browserStorageIsSeparate', () => {
  it('is true on iPhone, false on her Android phone', () => {
    expect(browserStorageIsSeparate('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15')).toBe(true)
    expect(browserStorageIsSeparate('Mozilla/5.0 (Linux; Android 16; SM-F766U) AppleWebKit/537.36 Chrome/141 Mobile Safari/537.36')).toBe(false)
  })
})
