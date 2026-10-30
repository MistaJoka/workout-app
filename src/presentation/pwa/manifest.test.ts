import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

// Home-screen shortcuts (long-press the app icon). Their URLs must stay
// relative to the manifest (any base path works) and land on a real route.
const root = path.resolve(__dirname, '../../..')
const manifest = JSON.parse(readFileSync(path.join(root, 'public/manifest.json'), 'utf8')) as {
  shortcuts?: { name: string; url: string; icons?: { src: string }[] }[]
  [key: string]: unknown
}
const routes = readFileSync(path.join(root, 'src/App.tsx'), 'utf8')

describe('manifest shortcuts', () => {
  it('are relative hash routes that the app defines, with icons that exist', () => {
    expect(manifest.shortcuts?.length).toBeGreaterThan(0)
    for (const s of manifest.shortcuts ?? []) {
      expect(s.url, s.name).toMatch(/^\.\/#\//)
      const route = s.url.slice(3).split('?')[0]
      expect(routes, s.name).toContain(`path="${route}"`)
      for (const icon of s.icons ?? []) expect(readFileSync(path.join(root, 'public', icon.src)).length).toBeGreaterThan(0)
    }
  })
})

// Chrome on Android shows its richer install sheet only with a description
// and screenshots; separate "any" and "maskable" icons keep the launcher
// icon from being cropped or shrunk.
describe('manifest installability', () => {
  it('has the fields the install sheet uses', () => {
    for (const key of ['id', 'name', 'short_name', 'description', 'start_url', 'display', 'orientation', 'lang']) {
      expect(manifest[key], key).toBeTruthy()
    }
  })

  it('declares any and maskable icons separately, at 192 and 512', () => {
    const icons = manifest.icons as { src: string; sizes: string; purpose: string }[]
    for (const purpose of ['any', 'maskable']) {
      expect(icons.filter((i) => i.purpose === purpose).map((i) => i.sizes).sort()).toEqual(['192x192', '512x512'])
    }
    for (const icon of icons) expect(readFileSync(path.join(root, 'public', icon.src)).length).toBeGreaterThan(0)
  })

  it('ships phone screenshots that exist', () => {
    const shots = manifest.screenshots as { src: string; form_factor: string; sizes: string }[]
    expect(shots.length).toBeGreaterThanOrEqual(1)
    for (const shot of shots) {
      expect(shot.form_factor).toBe('narrow')
      expect(shot.sizes).toBe('1080x2400')
      expect(readFileSync(path.join(root, 'public', shot.src)).length).toBeGreaterThan(1000)
    }
  })
})

