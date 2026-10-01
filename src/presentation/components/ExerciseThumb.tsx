import { raeStillFor } from './raeLoops'

// Every thumbnail shares one frame (same rounding comes from the caller's
// className), so Rae tiles and photos line up in a list.
const TILE = 'flex-none overflow-hidden border border-[var(--color-border)]'

// One thumbnail for an exercise anywhere it's listed: Rae doing the move
// when she has a drawn loop for it (transparent pixel art, so it sits on a
// soft tile, contained and crisp rather than cropped), otherwise the
// exercise photo, otherwise an empty tile. Decorative: the name is always
// next to it.
export function ExerciseThumb({
  exercise,
  className,
}: {
  exercise: { id: string; mediaManifest: { start?: string } } | null | undefined
  className: string
}) {
  const rae = raeStillFor(exercise?.id)
  if (rae) {
    return (
      <img
        src={rae.src}
        alt=""
        loading="lazy"
        className={`${className} ${TILE} bg-field-primary object-contain p-0.5 pixelated`}
      />
    )
  }
  const photo = exercise?.mediaManifest.start
  // crossOrigin: the service worker only keeps readable (CORS) photo
  // responses offline; the pinned upstream host sends CORS headers.
  if (photo) return <img src={photo} alt="" loading="lazy" crossOrigin="anonymous" className={`${className} ${TILE} bg-bg object-cover`} />
  return <div className={`${className} ${TILE} bg-bg`} />
}
