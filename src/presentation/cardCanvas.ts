// Canvas helpers and palette the shareable cards (shareCard.ts, rewardsCard.ts)
// paint with, kept in one place so the cards stay visually one family.

export const COLORS = {
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

export const FONT = "'Nunito Variable', ui-rounded, system-ui, sans-serif"

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, radius: number, fill: string) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, radius)
  ctx.fillStyle = fill
  ctx.fill()
}

// Shrinks the font until the text fits the width, for long workout names.
export function fitText(ctx: CanvasRenderingContext2D, text: string, weight: number, size: number, maxWidth: number): void {
  let px = size
  ctx.font = `${weight} ${px}px ${FONT}`
  while (px > 28 && ctx.measureText(text).width > maxWidth) {
    px -= 4
    ctx.font = `${weight} ${px}px ${FONT}`
  }
}
