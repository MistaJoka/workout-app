import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// iOS shows an apple-touch-startup-image only when its media query matches
// the device exactly and the image is the device's pixel size; a missing
// file or a size off by one means a white launch screen again. The tags and
// files are written together by `npm run generate:splash`.
const root = resolve(__dirname, '../../..')
const html = readFileSync(resolve(root, 'index.html'), 'utf8')
const links = [...html.matchAll(/<link rel="apple-touch-startup-image" media="([^"]+)" href="([^"]+)" \/>/g)].map((m) => ({
  media: m[1],
  href: m[2],
}))

function pngSize(path: string): { width: number; height: number } {
  const buf = readFileSync(path)
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
}

describe('iOS launch screens', () => {
  it('covers current iPhones', () => {
    expect(links.length).toBeGreaterThanOrEqual(11)
  })

  it.each(links)('$href exists at the size its media query asks for', ({ media, href }) => {
    const file = resolve(root, 'public', href.replace(/^\//, ''))
    expect(existsSync(file)).toBe(true)
    const w = Number(/device-width: (\d+)px/.exec(media)?.[1])
    const h = Number(/device-height: (\d+)px/.exec(media)?.[1])
    const dpr = Number(/-webkit-device-pixel-ratio: (\d+)/.exec(media)?.[1])
    expect(media).toContain('(orientation: portrait)')
    expect(pngSize(file)).toEqual({ width: w * dpr, height: h * dpr })
  })
})
