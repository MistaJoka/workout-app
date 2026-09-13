import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('PWA manifest', () => {
  it('has the fields Android needs to offer install', () => {
    const manifest = JSON.parse(readFileSync('public/manifest.json', 'utf-8'))
    expect(manifest.name).toBe('Workout App')
    expect(manifest.display).toBe('standalone')
    expect(manifest.icons).toHaveLength(2)
    expect(manifest.icons.map((i: { sizes: string }) => i.sizes)).toEqual(
      expect.arrayContaining(['192x192', '512x512'])
    )
  })
})
