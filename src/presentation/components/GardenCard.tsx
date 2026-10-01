import { Link } from 'react-router-dom'
import type { Garden } from '../../domain/progress/garden'
import { PixelBloom } from './PixelBloom'

// Progress's window onto the garden: how many flowers have grown, how many
// of the species have turned up, and the newest few, newest last. The whole
// card opens the collection.
export function GardenCard({ garden }: { garden: Garden }) {
  const recent = garden.flowers.slice(-5)
  return (
    <Link
      to="/garden"
      className="card block p-3 active:bg-field-primary"
      aria-label={`Your garden: ${garden.flowers.length} ${garden.flowers.length === 1 ? 'flower' : 'flowers'}, ${garden.discovered} of ${garden.total} kinds found. Open your garden`}
    >
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
