// Dependency-free PNG icon generator: a full-bleed Pixel Bloom pink square
// (maskable-safe, so Android/iOS apply their own corner shapes) with a
// simple white dumbbell glyph inside the 80% safe zone. No text.
//
// Usage: node scripts/generate-icons.mjs
import { writeFileSync, mkdirSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const PINK = [236, 72, 153]
const WHITE = [255, 255, 255]

function crc32(buf) {
  const table = []
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const lenBuf = Buffer.alloc(4)
  lenBuf.writeUInt32BE(data.length, 0)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf])
}

function encodePng(size, pixels) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // RGB
  const rows = []
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3)
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixels[y * size + x]
      row[1 + x * 3] = r
      row[1 + x * 3 + 1] = g
      row[1 + x * 3 + 2] = b
    }
    rows.push(row)
  }
  const idat = deflateSync(Buffer.concat(rows))
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
}

// Rounded-rectangle hit test in unit coordinates (0..1 of the icon size).
function inRoundedRect(px, py, x, y, w, h, r) {
  if (px < x || px > x + w || py < y || py > y + h) return false
  const cx = Math.max(x + r, Math.min(px, x + w - r))
  const cy = Math.max(y + r, Math.min(py, y + h - r))
  return (px - cx) ** 2 + (py - cy) ** 2 <= r * r
}

// Dumbbell: a bar, two inner plates, two outer plates — all rounded rects,
// centered, spanning ~64% of the width so it survives maskable cropping.
function isDumbbell(u, v) {
  const shapes = [
    [0.18, 0.455, 0.64, 0.09, 0.045], // bar
    [0.22, 0.32, 0.1, 0.36, 0.04], // outer plate L
    [0.68, 0.32, 0.1, 0.36, 0.04], // outer plate R
    [0.33, 0.26, 0.09, 0.48, 0.04], // inner plate L
    [0.58, 0.26, 0.09, 0.48, 0.04], // inner plate R
  ]
  return shapes.some(([x, y, w, h, r]) => inRoundedRect(u, v, x, y, w, h, r))
}

function renderIcon(size) {
  const pixels = new Array(size * size)
  const ss = 4 // supersampling per axis for smooth edges
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let hits = 0
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const u = (x + (sx + 0.5) / ss) / size
          const v = (y + (sy + 0.5) / ss) / size
          if (isDumbbell(u, v)) hits++
        }
      }
      const a = hits / (ss * ss)
      pixels[y * size + x] = PINK.map((c, i) => Math.round(c * (1 - a) + WHITE[i] * a))
    }
  }
  return encodePng(size, pixels)
}

mkdirSync('public/icons', { recursive: true })
writeFileSync('public/icons/icon-192.png', renderIcon(192))
writeFileSync('public/icons/icon-512.png', renderIcon(512))
writeFileSync('public/icons/apple-touch-icon.png', renderIcon(180))
console.log('Generated icons: 192, 512, apple-touch-icon 180')
