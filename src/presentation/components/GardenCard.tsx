import { Link } from 'react-router-dom'
import type { Garden } from '../../domain/progress/garden'
import { PixelBloom } from './PixelBloom'

// Progress's window onto the garden: how many flowers have grown, how many
// of the species have turned up, and the newest few, newest last. The whole
// card opens the collection.
//
// `compact` renders the same link (same accessible name, so e2e and
// screen readers see no difference) as a small square tile for Progress's
// "Your collection" grid: just the newest flower and the discovered count,
// in place of the full-width row of recent flowers.
export function GardenCard({ garden, compact = false }: { garden: Garden; compact?: boolean }) {
  const recent = garden.flowers.slice(-5)
  const ariaLabel = `Your garden: ${garden.flowers.length} ${garden.flowers.length === 1 ? 'flower' : 'flowers'}, ${garden.discovered} of ${garden.total} kinds found. Open your garden`

  if (compact) {
    const newest = garden.flowers[garden.flowers.length - 1]
    return (
      <Link to="/garden" className="card flex min-h-11 flex-col items-center gap-1 p-3 text-center active:bg-field-primary" aria-label={ariaLabel}>
        <div aria-hidden="true" className="flex h-9 items-center justify-center">
          {newest && <PixelBloom size={34} animate={false} species={newest.species} />}
        </div>
        <p className="font-bold">Your garden</p>
        <p className="text-xs text-ink-muted">
          {garden.discovered} of {garden.total} kinds
        </p>
      </Link>
    )
  }

  return (
    <Link to="/garden" className="card block p-3 active:bg-field-primary" aria-label={ariaLabel}>
      <div className="flex items-baseline justify-between">
        <p className="font-bold">Your garden</p>
        <p className="text-sm text-ink-muted">
          {garden.discovered} of {garden.total} kinds found <span aria-hidden="true">›</span>
        </p>
      </div>
      <div aria-hidden="true" className="mt-1 flex items-end gap-1">
        {recent.map((flower) => (
          <PixelBloom key={flower.sessionId} size={34} animate={false} species={flower.species} />
        ))}
        <p className="ml-auto self-center text-sm text-ink-muted">
          {garden.flowers.length} {garden.flowers.length === 1 ? 'flower' : 'flowers'}
        </p>
      </div>
    </Link>
  )
}
