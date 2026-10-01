import type { AchievementIcon } from '../domain/progress/achievements'
import { GARDEN_SPECIES } from '../domain/progress/garden'
import type { Garden, GardenSpecies, Rarity } from '../domain/progress/garden'
import type { LevelInfo } from '../domain/progress/xp'
import type { CompleteStats } from './screens/completeStats'

// Shareable cards: 1080x1350 (4:5, what Instagram and Messages show
// uncropped) PNGs. Each kind carries only what the user is choosing to
// share — a workout's stats, a badge, the garden collection, or a level —
// and, if they set one, their first name. Never body weight or history.
// Layout (and pixel art) is pure and tested; the draw*Card functions paint
// a built model onto a canvas.

export type CardKind = 'workout' | 'badge' | 'garden' | 'level'

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

function wordmark(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = COLORS.muted
  ctx.font = `700 30px ${FONT}`
  ctx.fillText('Foundation Strength', CARD_WIDTH / 2, CARD_HEIGHT - 32)
}

// ---------------------------------------------------------------------------
// Badge cards: a badge earned on Achievements, shared as its own card.

export type BadgeCardInput = {
  id: string
  title: string
  description: string
  icon: AchievementIcon
  unlockedAt: string
  name?: string
}

export type BadgeCardModel = {
  header: string
  title: string
  description: string
  date: string
  icon: AchievementIcon
}

export function buildBadgeCardModel(input: BadgeCardInput): BadgeCardModel {
  return {
    header: input.name ? `${input.name}'s badge` : 'Badge earned',
    title: input.title,
    description: input.description,
    date: new Date(input.unlockedAt).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }),
    icon: input.icon,
  }
}

export function badgeCardFilename(id: string, unlockedAt: string): string {
  return `badge-${id}-${unlockedAt.slice(0, 10)}.png`
}

// The same 8x8 pixel icons AchievementBadge draws as SVG rects, reproduced
// here as plain rectangles a canvas can paint. Letters map to the Pixel
// Bloom palette; '.' is empty. Keep in sync with
// components/AchievementUnlocks.tsx's ICONS/COLORS if either changes.
const BADGE_ICON_COLORS: Record<string, string> = {
  p: '#ff8fb8',
  P: '#f06a9e',
  g: '#5bbf8a',
  G: '#3f9d6e',
  y: '#ffe08a',
  Y: '#f5b942',
  b: '#8ec5ff',
  B: '#5a8fd6',
  l: '#c9b6ff',
  L: '#9a82e6',
  o: '#ffb27a',
  O: '#e0874e',
  w: '#ffffff',
}

const BADGE_ICON_ROWS: Record<AchievementIcon, string[]> = {
  sprout: ['........', '..g..g..', '.ggG.Gg.', '..GgGg..', '....G...', '...oOo..', '...oOo..', '....o...'],
  flower: ['...pp...', '..pPPp..', '.ppyYpp.', '..pYyp..', '...pp...', '....g...', '..gGg...', '....g...'],
  bouquet: ['.pp..ll.', 'pyyp.lyl', '.pp..ll.', '..g..g..', '..gggg..', '...GG...', '..oOOo..', '...oo...'],
  tree: ['..gggg..', '.gGgggG.', 'gggGgggg', '.gGggGg.', '..gggg..', '...OO...', '...OO...', '..oOOo..'],
  calendar: ['.P....P.', 'pppppppp', 'PPPPPPPP', 'pwwwwwwp', 'pwPwPwwp', 'pwwwPwwp', 'pwPwwwwp', 'pppppppp'],
  target: ['..pppp..', '.pwwwwp.', 'pwpppwwp', 'pwpyypwp', 'pwpyypwp', 'pwwpppwp', '.pwwwwp.', '..pppp..'],
  sun: ['...y....', '.y.y.y..', '..yYy...', 'yyYYYyy.', '..yYy...', '.y.y.y..', '...y....', '........'],
  moon: ['...lll..', '..lL....', '.lL.....', '.lL...y.', '.lL.....', '..lL....', '...lll..', '........'],
  star: ['...yy...', '...yy...', 'yyyYYyyy', '.yyYYyy.', '..yyyy..', '.yy..yy.', '.y....y.', '........'],
  heart: ['........', '.pp..pp.', 'pPPppPPp', 'pPPPPPPp', '.pPPPPp.', '..pPPp..', '...pp...', '........'],
  compass: ['..bbbb..', '.bwwwwb.', 'bwwPwwwb', 'bwwPPwwb', 'bwwBBwwb', 'bwwwBwwb', '.bwwwwb.', '..bbbb..'],
  hourglass: ['oOOOOOOo', '.oyyyyo.', '..oyyo..', '...oo...', '...oo...', '..oyyo..', '.oyyyyo.', 'oOOOOOOo'],
  door: ['.OOOOOO.', '.OooooO.', '.OooooO.', '.OoooyO.', '.OooooO.', '.OooooO.', '.OooooO.', 'gggggggg'],
  flame: ['...o....', '...oo...', '..oyo...', '..oyyo..', '.oyYyo..', '.oyYYyo.', '.oYYYYo.', '..oooo..'],
  trophy: ['yyyyyyyy', 'yYyyyyYy', '.yYyyYy.', '..yYYy..', '...yy...', '...yy...', '..YYYY..', '.yyyyyy.'],
  medal: ['.b....b.', '..b..b..', '...bb...', '..yyyy..', '.yYyyYy.', '.yyYYyy.', '.yYyyYy.', '..yyyy..'],
}

// One badge icon's 8x8 grid as rectangles (0..8 both axes), for drawBadgeCard.
export function badgeIconPixels(icon: AchievementIcon): PixelRect[] {
  const rows = BADGE_ICON_ROWS[icon]
  const rects: PixelRect[] = []
  rows.forEach((row, y) => {
    ;[...row].forEach((c, x) => {
      if (c === '.') return
      rects.push({ x, y, w: 1, h: 1, color: BADGE_ICON_COLORS[c] ?? '#000000' })
    })
  })
  return rects
}

export function drawBadgeCard(ctx: CanvasRenderingContext2D, model: BadgeCardModel, rae: CanvasImageSource | null): void {
  const W = CARD_WIDTH
  ctx.clearRect(0, 0, W, CARD_HEIGHT)
  ctx.fillStyle = COLORS.background
  ctx.fillRect(0, 0, W, CARD_HEIGHT)
  ctx.imageSmoothingEnabled = false
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'

  // Mint stage: Rae cheering beside the big badge icon.
  roundRect(ctx, 60, 60, W - 120, 640, 48, COLORS.mint)
  ctx.fillStyle = COLORS.text
  ctx.font = `800 52px ${FONT}`
  ctx.fillText(model.header, W / 2, 150)

  if (rae) ctx.drawImage(rae, 150, 280, 340, 340)

  const cell = 34
  const iconSize = 8 * cell
  const ix = 640
  const iy = 60 + (640 - iconSize) / 2
  roundRect(ctx, ix - 30, iy - 30, iconSize + 60, iconSize + 60, 40, '#ffffff')
  for (const p of badgeIconPixels(model.icon)) {
    ctx.fillStyle = p.color
    ctx.fillRect(ix + p.x * cell, iy + p.y * cell, p.w * cell, p.h * cell)
  }

  // Title and the day it was earned.
  ctx.fillStyle = COLORS.text
  fitText(ctx, model.title, 800, 84, W - 160)
  ctx.fillText(model.title, W / 2, 810)
  ctx.fillStyle = COLORS.muted
  ctx.font = `600 40px ${FONT}`
  ctx.fillText(`Earned ${model.date}`, W / 2, 870)

  // How it was earned, as a big chip.
  roundRect(ctx, 90, 960, W - 180, 250, 40, COLORS.lavender)
  ctx.fillStyle = COLORS.text
  fitText(ctx, model.description, 700, 44, W - 260)
  ctx.fillText(model.description, W / 2, 1100)

  wordmark(ctx)
}

// ---------------------------------------------------------------------------
// Garden cards: the species collection, shared as its own card.

const RARITY_RANK: Record<Rarity, number> = { common: 0, uncommon: 1, rare: 2, legendary: 3 }

export type GardenCardInput = {
  garden: Garden
  name?: string
}

export type GardenCardEntry = { species: GardenSpecies; count: number; discovered: boolean; highlighted: boolean }

export type GardenCardModel = {
  header: string
  summary: string
  entries: GardenCardEntry[]
}

export function buildGardenCardModel(input: GardenCardInput): GardenCardModel {
  const { garden, name } = input
  const rarestFound = GARDEN_SPECIES.filter((s) => garden.counts.has(s.id)).reduce<GardenSpecies | null>(
    (best, s) => (best === null || RARITY_RANK[s.rarity] > RARITY_RANK[best.rarity] ? s : best),
    null
  )
  const entries = GARDEN_SPECIES.map((species) => ({
    species,
    count: garden.counts.get(species.id) ?? 0,
    discovered: garden.counts.has(species.id),
    highlighted: rarestFound !== null && species.id === rarestFound.id,
  }))
  return {
    header: name ? `${name}'s garden` : 'My garden',
    summary: `${garden.discovered} of ${garden.total} kinds found`,
    entries,
  }
}

export function gardenCardFilename(date: Date = new Date()): string {
  return `garden-${date.toISOString().slice(0, 10)}.png`
}

export function drawGardenCard(ctx: CanvasRenderingContext2D, model: GardenCardModel): void {
  const W = CARD_WIDTH
  ctx.clearRect(0, 0, W, CARD_HEIGHT)
  ctx.fillStyle = COLORS.background
  ctx.fillRect(0, 0, W, CARD_HEIGHT)
  ctx.imageSmoothingEnabled = false
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'

  ctx.fillStyle = COLORS.text
  ctx.font = `800 52px ${FONT}`
  ctx.fillText(model.header, W / 2, 110)
  ctx.fillStyle = COLORS.muted
  ctx.font = `600 40px ${FONT}`
  ctx.fillText(model.summary, W / 2, 165)

  const cols = 3
  const rows = Math.ceil(model.entries.length / cols)
  const cell = 6
  const flowerW = 16 * cell
  const flowerH = 22 * cell
  const top = 230
  const bottom = CARD_HEIGHT - 70
  const colW = (W - 120) / cols
  const rowH = (bottom - top) / rows

  model.entries.forEach((entry, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const cx = 60 + colW * col + colW / 2
    const cy = top + rowH * row

    if (entry.highlighted) {
      roundRect(ctx, cx - flowerW / 2 - 16, cy - 16, flowerW + 32, flowerH + 60, 20, COLORS.gold)
    }

    if (entry.discovered) {
      for (const p of flowerPixels(entry.species)) {
        ctx.fillStyle = p.color
        ctx.fillRect(cx - flowerW / 2 + p.x * cell, cy + p.y * cell, p.w * cell, p.h * cell)
      }
    } else {
      roundRect(ctx, cx - flowerW / 2, cy, flowerW, flowerH, 12, '#eef0fb')
      ctx.fillStyle = COLORS.muted
      ctx.font = `800 ${Math.round(flowerH * 0.5)}px ${FONT}`
      ctx.fillText('?', cx, cy + flowerH * 0.66)
    }

    ctx.fillStyle = COLORS.text
    ctx.font = `700 24px ${FONT}`
    const label = entry.discovered ? entry.species.name : '???'
    fitText(ctx, label, 700, 24, colW - 20)
    ctx.fillText(label, cx, cy + flowerH + 30)
    if (entry.discovered) {
      ctx.fillStyle = COLORS.muted
      ctx.font = `600 22px ${FONT}`
      ctx.fillText(`x${entry.count}`, cx, cy + flowerH + 56)
    }
  })

  wordmark(ctx)
}

// ---------------------------------------------------------------------------
// Level cards: Bloom XP level, shared as its own card.

export type LevelCardInput = {
  level: LevelInfo
  name?: string
}

export type LevelCardModel = {
  header: string
  levelNumber: number
  levelName: string
  into: number
  needed: number
  pct: number
}

export function buildLevelCardModel(input: LevelCardInput): LevelCardModel {
  const { level, name } = input
  return {
    header: name ? `${name}'s level` : 'Bloom level',
    levelNumber: level.level,
    levelName: level.name,
    into: level.into,
    needed: level.needed,
    pct: level.needed === 0 ? 0 : Math.min(100, Math.round((level.into / level.needed) * 100)),
  }
}

export function levelCardFilename(level: number): string {
  return `level-${level}.png`
}

export function drawLevelCard(ctx: CanvasRenderingContext2D, model: LevelCardModel, rae: CanvasImageSource | null): void {
  const W = CARD_WIDTH
  ctx.clearRect(0, 0, W, CARD_HEIGHT)
  ctx.fillStyle = COLORS.background
  ctx.fillRect(0, 0, W, CARD_HEIGHT)
  ctx.imageSmoothingEnabled = false
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'

  roundRect(ctx, 60, 60, W - 120, 640, 48, COLORS.lavender)
  ctx.fillStyle = COLORS.text
  ctx.font = `800 52px ${FONT}`
  ctx.fillText(model.header, W / 2, 150)

  if (rae) ctx.drawImage(rae, 150, 280, 340, 340)

  ctx.fillStyle = COLORS.muted
  ctx.font = `700 36px ${FONT}`
  ctx.fillText('LEVEL', 770, 320)
  ctx.fillStyle = COLORS.ink
  ctx.font = `800 170px ${FONT}`
  ctx.fillText(String(model.levelNumber), 770, 490)
  ctx.fillStyle = COLORS.text
  fitText(ctx, model.levelName, 800, 56, 380)
  ctx.fillText(model.levelName, 770, 570)

  // XP bar for the level in progress.
  ctx.fillStyle = COLORS.muted
  ctx.font = `600 40px ${FONT}`
  ctx.fillText(`${model.into} / ${model.needed} XP`, W / 2, 790)
  const barX = 140
  const barY = 830
  const barW = W - 280
  const barH = 56
  roundRect(ctx, barX, barY, barW, barH, 28, '#f2c7a8')
  const fillW = Math.max(barH, (barW * model.pct) / 100)
  roundRect(ctx, barX, barY, fillW, barH, 28, COLORS.ink)

  ctx.fillStyle = COLORS.muted
  ctx.font = `600 36px ${FONT}`
  const toGo = model.needed - model.into
  ctx.fillText(`${toGo} XP to level ${model.levelNumber + 1}`, W / 2, 950)

  roundRect(ctx, 150, 1040, W - 300, 150, 36, COLORS.mint)
  ctx.fillStyle = COLORS.text
  ctx.font = `700 40px ${FONT}`
  ctx.fillText('Growing stronger', W / 2, 1105)
  ctx.fillText('every workout.', W / 2, 1155)

  wordmark(ctx)
}
