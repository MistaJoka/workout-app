import { CARD_HEIGHT, CARD_WIDTH } from './shareCard'

// A cute pixel coupon card for a redeemed reward from Hubby Bunny's shop:
// "Send to {giverName}" (ShareCardButton's pattern, components/RedeemSheets.tsx)
// renders one of these and hands it to the share sheet, same as every other
// shareable card. Model-building is pure and tested; drawCouponCard paints
// it onto a canvas (shareCard.ts's drawBadgeCard is the template this
// follows).

export type CouponCardInput = {
  title: string
  emoji: string
  cost: number
  redeemedAt: string
  giverName: string
  name?: string // first name, only when the user set a real one
}

export type CouponCardModel = {
  header: string
  title: string
  emoji: string
  costLabel: string
  date: string
  giverLine: string
}

export function buildCouponCardModel(input: CouponCardInput): CouponCardModel {
  return {
    header: input.name ? `${input.name}'s coupon` : 'Redeemed!',
    title: input.title,
    emoji: input.emoji,
    costLabel: `${input.cost} 🥕`,
    date: new Date(input.redeemedAt).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }),
    giverLine: `Redeemable with ${input.giverName}`,
  }
}

export function couponCardFilename(redeemedAt: string): string {
  return `coupon-${redeemedAt.slice(0, 10)}.png`
}

const COLORS = {
  background: '#f8faff',
  notice: '#ffe1b8',
  lavender: '#d9c8ff',
  text: '#2b2d42',
  muted: '#4f5268',
} as const

const FONT = "'Nunito Variable', ui-rounded, system-ui, sans-serif"
const EMOJI_FONT = "'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif"

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, radius: number, fill: string) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, radius)
  ctx.fillStyle = fill
  ctx.fill()
}

function fitText(ctx: CanvasRenderingContext2D, text: string, weight: number, size: number, maxWidth: number): void {
  let px = size
  ctx.font = `${weight} ${px}px ${FONT}`
  while (px > 28 && ctx.measureText(text).width > maxWidth) {
    px -= 4
    ctx.font = `${weight} ${px}px ${FONT}`
  }
}

export function drawCouponCard(ctx: CanvasRenderingContext2D, model: CouponCardModel): void {
  const W = CARD_WIDTH
  ctx.clearRect(0, 0, W, CARD_HEIGHT)
  ctx.fillStyle = COLORS.background
  ctx.fillRect(0, 0, W, CARD_HEIGHT)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'

  // Notice-colored ticket body with a scalloped top, the reward's emoji big
  // and centered like a stamp.
  roundRect(ctx, 60, 60, W - 120, 640, 48, COLORS.notice)
  ctx.fillStyle = COLORS.text
  ctx.font = `800 52px ${FONT}`
  ctx.fillText(model.header, W / 2, 150)

  ctx.font = `400 300px ${EMOJI_FONT}`
  ctx.fillText(model.emoji, W / 2, 500)

  ctx.fillStyle = COLORS.text
  fitText(ctx, model.title, 800, 84, W - 160)
  ctx.fillText(model.title, W / 2, 810)
  ctx.fillStyle = COLORS.muted
  ctx.font = `600 40px ${FONT}`
  ctx.fillText(model.date, W / 2, 870)

  // Cost chip and the "redeemable with ___" line as a lavender ticket stub.
  roundRect(ctx, 90, 960, W - 180, 250, 40, COLORS.lavender)
  ctx.fillStyle = COLORS.text
  ctx.font = `800 64px ${FONT}`
  ctx.fillText(model.costLabel, W / 2, 1065)
  ctx.fillStyle = COLORS.muted
  fitText(ctx, model.giverLine, 700, 40, W - 260)
  ctx.fillText(model.giverLine, W / 2, 1150)

  ctx.fillStyle = COLORS.muted
  ctx.font = `700 30px ${FONT}`
  ctx.fillText('Foundation Strength', W / 2, CARD_HEIGHT - 32)
}
