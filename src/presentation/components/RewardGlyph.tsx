import { rewardIconById } from '../../domain/rewards/rewardIcons'
import { asset } from '../assetUrl'

// A reward's or wish's picture: its pixel icon when it has one this app
// knows, its emoji otherwise (rewards made before icons, or a gift link
// from a newer app naming an icon this one doesn't have). Decorative: the
// reward's title always names it. `sticker` is the cut-out for tiles and
// lists; `tile` is the rounded square for where it stands alone.

export type GlyphVariant = 'sticker' | 'tile'

export function glyphSource(icon: string | undefined, variant: GlyphVariant): string | null {
  const known = rewardIconById(icon)
  if (!known) return null
  return asset(`rewards/${known.id}${variant === 'tile' ? '-tile' : ''}.webp`)
}

export function RewardGlyph({
  emoji,
  icon,
  size,
  variant = 'sticker',
  className = '',
}: {
  emoji: string
  icon?: string
  size: number
  variant?: GlyphVariant
  className?: string
}) {
  const src = glyphSource(icon, variant)
  if (src) {
    return (
      <img
        src={src}
        alt=""
        aria-hidden="true"
        width={size}
        height={size}
        draggable={false}
        className={`inline-block flex-none object-contain pixelated ${className}`}
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <span aria-hidden="true" className={`inline-flex flex-none items-center justify-center leading-none ${className}`} style={{ fontSize: Math.round(size * 0.8), width: size, height: size }}>
      {emoji}
    </span>
  )
}
