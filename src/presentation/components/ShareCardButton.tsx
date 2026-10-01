import { useState } from 'react'
import type { AchievementIcon } from '../../domain/progress/achievements'
import type { Garden } from '../../domain/progress/garden'
import type { LevelInfo } from '../../domain/progress/xp'
import { activeProfile } from '../../infrastructure/profiles'
import { hasRealName } from '../greeting'
import {
  CARD_HEIGHT,
  CARD_WIDTH,
  badgeCardFilename,
  buildBadgeCardModel,
  buildGardenCardModel,
  buildLevelCardModel,
  drawBadgeCard,
  drawGardenCard,
  drawLevelCard,
  gardenCardFilename,
  levelCardFilename,
} from '../shareCard'
import { shareOrDownload } from './shareOrDownload'

// The generalized share button behind ShareWorkoutButton: paints a
// badge/garden/level card (shareCard.ts) from data the caller already has in
// hand (no extra DB reads here) and hands it to the share sheet, same as a
// finished workout's card. Everything stays on the device until the user
// picks where it goes.

export type ShareCardData =
  | { kind: 'badge'; id: string; title: string; description: string; icon: AchievementIcon; unlockedAt: string }
  | { kind: 'garden'; garden: Garden }
  | { kind: 'level'; level: LevelInfo }

function currentName(): string | undefined {
  const name = activeProfile().name
  return hasRealName(name) ? name.trim() : undefined
}

async function renderShareCard(data: ShareCardData): Promise<{ blob: Blob; filename: string }> {
  const name = currentName()
  switch (data.kind) {
    case 'badge': {
      const model = buildBadgeCardModel({ ...data, name })
      const rae = await loadRaeCheer()
      const blob = await renderCardToBlob((ctx) => drawBadgeCard(ctx, model, rae))
      return { blob, filename: badgeCardFilename(data.id, data.unlockedAt) }
    }
    case 'garden': {
      const model = buildGardenCardModel({ garden: data.garden, name })
      const blob = await renderCardToBlob((ctx) => drawGardenCard(ctx, model))
      return { blob, filename: gardenCardFilename() }
    }
    case 'level': {
      const model = buildLevelCardModel({ level: data.level, name })
      const rae = await loadRaeCheer()
      const blob = await renderCardToBlob((ctx) => drawLevelCard(ctx, model, rae))
      return { blob, filename: levelCardFilename(data.level.level) }
    }
  }
}

// Shared by every share button (workout included, via ShareWorkoutButton):
// paints onto a fresh offscreen canvas at the card's fixed size and encodes
// it as a PNG blob.
export async function renderCardToBlob(draw: (ctx: CanvasRenderingContext2D) => void): Promise<Blob> {
  // The app's own font, if it's loaded; the canvas falls back otherwise.
  await document.fonts?.load(`800 64px 'Nunito Variable'`).catch(() => undefined)
  const canvas = document.createElement('canvas')
  canvas.width = CARD_WIDTH
  canvas.height = CARD_HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No canvas')
  draw(ctx)
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Encoding failed'))), 'image/png')
  )
}

export async function loadRaeCheer(): Promise<CanvasImageSource | null> {
  return loadImage('/rae/expr-cheer.png').catch(() => null)
}

// Same-origin art only, so the canvas stays exportable.
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Couldn't load ${src}`))
    img.src = src
  })
}

export function ShareIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3v12" />
      <path d="M7 8l5-5 5 5" />
      <path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
    </svg>
  )
}

// A 44px secondary share button for a badge, garden or level card. Pass
// `compact` for an icon-only button (e.g. one per earned badge tile); label
// defaults to "Share" and `aria-label` names the specific thing being shared.
export function ShareCardButton({
  data,
  label = 'Share',
  compact = false,
  'aria-label': ariaLabel,
}: {
  data: ShareCardData
  label?: string
  compact?: boolean
  'aria-label'?: string
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleShare(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation()
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const { blob, filename } = await renderShareCard(data)
      await shareOrDownload(blob, filename, 'image/png')
    } catch {
      setError("Couldn't make the card on this device. Try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        className={compact ? 'btn-secondary min-h-11 min-w-11 p-0' : 'btn-secondary min-h-11 gap-2 px-5'}
        onClick={handleShare}
        disabled={busy}
        aria-label={ariaLabel ?? (busy ? 'Making your card…' : label)}
        title={compact ? (ariaLabel ?? label) : undefined}
      >
        <ShareIcon />
        {!compact && (busy ? 'Making your card…' : label)}
      </button>
      {error && (
        <p role="alert" className="text-sm text-ink-muted">
          {error}
        </p>
      )}
    </div>
  )
}
