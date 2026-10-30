import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

// Home-screen shortcuts (long-press the app icon). Their URLs must stay
// relative to the manifest (any base path works) and land on a real route.
const root = path.resolve(__dirname, '../../..')
const manifest = JSON.parse(readFileSync(path.join(root, 'public/manifest.json'), 'utf8')) as {
  shortcuts?: { name: string; url: string; icons?: { src: string }[] }[]
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
