import type { GardenSpecies, Rarity } from '../domain/progress/garden'
import type { CompleteStats } from './screens/completeStats'

// The shareable "workout card": a 1080x1350 (4:5, what Instagram and
// Messages show uncropped) PNG of one finished workout. It carries only what
// the user is choosing to share: the workout's name and date, its three
// stats, the flower it grew and, if they set one, their first name. Never
// body weight or history. Layout and the flower's pixels are pure (tested);
// drawCard paints them onto a canvas.

export const CARD_WIDTH = 1080
export const CARD_HEIGHT = 1350

const COLORS = {
  background: '#f8faff',
  mint: '#c8f7e1',
  lavender: '#d9c8ff',
  notice: '#ffe1b8',
  text: '#2b2d42',
  muted: '#4f5268',
  ink: '#a3195b',
  leaf: '#5bbf8a',
  leafDark: '#3f9d6e',
  potTop: '#d4866a',
  potRim: '#8a5a44',
  pot: '#e0906a',
  potBase: '#c9785d',
  sparkle: '#ffc58a',
  gold: '#ffd23f',
} as const

export type CardInput = {
  workoutName: string
  endedAt: string
  stats: CompleteStats
  species: GardenSpecies
  name?: string // first name, only when the user set a real one
  highlight?: string // e.g. "New best: Bodyweight Squat" or "10 workouts!"
}

export type CardModel = {
  header: string
  title: string
  date: string
  stats: { value: string; label: string }[]
  flowerName: string
  rarityLabel: string | null
  highlight: string | null
}

const RARITY_LABEL: Record<Rarity, string | null> = { common: null, uncommon: 'Uncommon', rare: 'Rare', legendary: 'Legendary' }

export function buildCardModel(input: CardInput): CardModel {
  const { minutes, sets, moves } = input.stats
  return {
    header: input.name ? `${input.name}'s workout` : 'Workout complete',
    title: input.workoutName,
    date: new Date(input.endedAt).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }),
    stats: [
      { value: String(minutes), label: minutes === 1 ? 'minute' : 'minutes' },
      { value: String(sets), label: sets === 1 ? 'set' : 'sets' },
      { value: String(moves), label: moves === 1 ? 'move' : 'moves' },
    ],
    flowerName: input.species.name,
    rarityLabel: RARITY_LABEL[input.species.rarity],
    highlight: input.highlight ?? null,
  }
}

export function cardFilename(endedAt: string): string {
  return `workout-${endedAt.slice(0, 10)}.png`
}

export type PixelRect = { x: number; y: number; w: number; h: number; color: string }

// The grown flower in its pot on PixelBloom's 16x22 grid, same shapes and
// palette, as plain rectangles a canvas can paint.
export function flowerPixels(species: GardenSpecies): PixelRect[] {
  const r = (x: number, y: number, w: number, h: number, color: string): PixelRect => ({ x, y, w, h, color })
  const rects = [
    r(7, 7, 2, 9, COLORS.leafDark),
    r(3, 11, 4, 2, COLORS.leaf),
    r(4, 10, 2, 1, COLORS.leaf),
    r(9, 9, 4, 2, COLORS.leaf),
    r(10, 11, 2, 1, COLORS.leaf),
    r(6, 0, 4, 2, species.petal),
    r(4, 2, 2, 4, species.petal),
    r(10, 2, 2, 4, species.petal),
    r(6, 6, 4, 1, species.petal),
    r(5, 1, 1, 1, species.petalDark),
    r(10, 1, 1, 1, species.petalDark),
    r(5, 6, 1, 1, species.petalDark),
    r(10, 6, 1, 1, species.petalDark),
    r(6, 2, 4, 4, species.center),
    r(7, 3, 2, 2, species.centerDark),
    r(2, 16, 12, 2, COLORS.potTop),
    r(3, 16, 10, 1, COLORS.potRim),
    r(3, 18, 10, 3, COLORS.pot),
    r(4, 21, 8, 1, COLORS.potBase),
  ]
  if (species.rarity === 'rare' || species.rarity === 'legendary') {
    const glow = species.rarity === 'legendary' ? COLORS.gold : COLORS.sparkle
    rects.push(r(1, 2, 1, 1, glow), r(14, 4, 1, 1, glow), r(2, 8, 1, 1, glow), r(13, 0, 1, 1, glow))
  }
  return rects
}

const FONT = "'Nunito Variable', ui-rounded, system-ui, sans-serif"

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, radius: number, fill: string) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, radius)
  ctx.fillStyle = fill
  ctx.fill()
}

// Shrinks the font until the text fits the width, for long workout names.
function fitText(ctx: CanvasRenderingContext2D, text: string, weight: number, size: number, maxWidth: number): void {
  let px = size
  ctx.font = `${weight} ${px}px ${FONT}`
  while (px > 28 && ctx.measureText(text).width > maxWidth) {
    px -= 4
    ctx.font = `${weight} ${px}px ${FONT}`
  }
}

export function drawCard(ctx: CanvasRenderingContext2D, model: CardModel, species: GardenSpecies, rae: CanvasImageSource | null): void {
  const W = CARD_WIDTH
  ctx.clearRect(0, 0, W, CARD_HEIGHT)
  ctx.fillStyle = COLORS.background
  ctx.fillRect(0, 0, W, CARD_HEIGHT)
  ctx.imageSmoothingEnabled = false
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'

  // Mint stage with a windowsill line: Rae beside her flower, like Complete.
  roundRect(ctx, 60, 60, W - 120, 640, 48, COLORS.mint)
  ctx.fillStyle = COLORS.text
  ctx.font = `800 52px ${FONT}`
  ctx.fillText(model.header, W / 2, 150)

  if (rae) ctx.drawImage(rae, 150, 260, 380, 380) // bottom edge on the sill
  const cell = 19
  const fx = 600
  const fy = 640 - 22 * cell
  for (const p of flowerPixels(species)) {
    ctx.fillStyle = p.color
    ctx.fillRect(fx + p.x * cell, fy + p.y * cell, p.w * cell, p.h * cell)
  }
  roundRect(ctx, 130, 640, W - 260, 14, 7, '#f2c7a8')

  // Workout name and date.
  ctx.fillStyle = COLORS.text
  fitText(ctx, model.title, 800, 84, W - 160)
  ctx.fillText(model.title, W / 2, 810)
  ctx.fillStyle = COLORS.muted
  ctx.font = `600 40px ${FONT}`
  ctx.fillText(model.date, W / 2, 870)

  // Three stat tiles.
  const tileW = 280
  const gap = 30
  const left = (W - (tileW * 3 + gap * 2)) / 2
  model.stats.forEach((stat, i) => {
    const x = left + i * (tileW + gap)
    roundRect(ctx, x, 920, tileW, 190, 36, COLORS.lavender)
    ctx.fillStyle = COLORS.text
    ctx.font = `800 96px ${FONT}`
    ctx.fillText(stat.value, x + tileW / 2, 1030)
    ctx.fillStyle = COLORS.muted
    ctx.font = `600 34px ${FONT}`
    ctx.fillText(stat.label, x + tileW / 2, 1080)
  })

  // The flower it grew as a peach chip; a highlight, if any, on its own line.
  const chip = model.rarityLabel ? `Grew a ${model.flowerName}, ${model.rarityLabel.toLowerCase()}!` : `Grew a ${model.flowerName}`
  fitText(ctx, chip, 700, 38, W - 220)
  const chipW = Math.min(W - 120, ctx.measureText(chip).width + 80)
  roundRect(ctx, (W - chipW) / 2, 1140, chipW, 72, 36, COLORS.notice)
  ctx.fillStyle = COLORS.text
  ctx.fillText(chip, W / 2, 1189)
  if (model.highlight) {
    ctx.fillStyle = COLORS.ink
    fitText(ctx, model.highlight, 800, 38, W - 160)
    ctx.fillText(model.highlight, W / 2, 1262)
  }

  // Wordmark.
  ctx.fillStyle = COLORS.muted
  ctx.font = `700 30px ${FONT}`
  ctx.fillText('Foundation Strength', W / 2, 1318)
}
