import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { foundationStrengthStarterExercises } from '../../domain/content/fixtures/foundationStrengthStarter'

// public/sw.js hand-keeps the lists of media it precaches. A drifted list
// either precaches a file that doesn't exist or leaves a curated move's
// photos (or Rae's faces) missing offline, so they're checked against the
// starter pack and the files on disk.
const root = path.resolve(__dirname, '../../..')
const sw = readFileSync(path.join(root, 'public/sw.js'), 'utf8')

function stringArray(name: string): string[] {
  const match = sw.match(new RegExp(`const ${name} = \\[([^\\]]*)\\]`))
  if (!match) throw new Error(`${name} not found in public/sw.js`)
  return [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1])
}

describe('service worker precache lists', () => {
  it('MEDIA_IDS matches the starter pack photos, and each photo exists', () => {
    const ids = stringArray('MEDIA_IDS')
    const fromPack = foundationStrengthStarterExercises
      .map((e) => e.mediaManifest.start?.match(/^\/exercise-media\/([^/]+)\/0\.jpg$/)?.[1])
      .filter((id): id is string => id != null)
    expect([...ids].sort()).toEqual([...new Set(fromPack)].sort())
    for (const id of ids) {
      expect(existsSync(path.join(root, 'public/exercise-media', id, '0.jpg')), `${id}/0.jpg`).toBe(true)
      expect(existsSync(path.join(root, 'public/exercise-media', id, '1.jpg')), `${id}/1.jpg`).toBe(true)
    }
  })

  it("every Rae expression it precaches exists", () => {
    for (const e of stringArray('RAE_EXPRESSIONS')) {
      expect(existsSync(path.join(root, 'public/rae', `expr-${e}.png`)), `expr-${e}.png`).toBe(true)
    }
  })

  it("every loop file loops.json names exists (featured loops are precached)", () => {
    const loops = JSON.parse(readFileSync(path.join(root, 'public/rae/loops.json'), 'utf8')) as {
      id: string
      stills: number[]
    }[]
    for (const loop of loops) {
      expect(existsSync(path.join(root, 'public/rae', `${loop.id}.webp`)), `${loop.id}.webp`).toBe(true)
      for (const still of loop.stills) {
        expect(existsSync(path.join(root, 'public/rae', `${loop.id}-${still}.png`)), `${loop.id}-${still}.png`).toBe(true)
      }
    }
  })
})
