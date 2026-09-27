import { raeStillFor } from './raeLoops'

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
        className={`${className} flex-none bg-field-primary object-contain p-0.5 pixelated`}
      />
    )
  }
  const photo = exercise?.mediaManifest.start
  if (photo) return <img src={photo} alt="" loading="lazy" className={`${className} flex-none object-cover`} />
  return <div className={`${className} flex-none bg-bg`} />
}
