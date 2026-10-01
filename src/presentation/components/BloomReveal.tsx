import { Link } from 'react-router-dom'
import { RARITY_LABEL, type GardenSpecies } from '../../domain/progress/garden'

// The species this workout grew, named once the flower has popped open on
// the Complete screen: a small chip with a dot in the species' own petal
// colour, its rarity, and a "new" note the first time it turns up. Taps
// through to the garden. The reveal waits for the bloom (delay) under full
// motion; reduced/off motion zeroes delays, so it is simply there.
const STYLE = `
.bloom-reveal { animation: bloom-reveal-in 0.4s cubic-bezier(0.2, 0.9, 0.3, 1.3) 1.45s both; }
@keyframes bloom-reveal-in { from { opacity: 0; transform: translateY(6px) scale(0.92); } to { opacity: 1; transform: none; } }
[data-motion='reduced'] .bloom-reveal, [data-motion='off'] .bloom-reveal { animation-delay: 0s !important; }
@media (prefers-reduced-motion: reduce) { .bloom-reveal { animation-delay: 0s !important; } }
`

export function BloomReveal({ species, isNew }: { species: GardenSpecies; isNew: boolean }) {
  const special = species.rarity === 'rare' || species.rarity === 'legendary'
  return (
    <Link
      to="/garden"
      className="bloom-reveal mx-auto flex w-fit max-w-full flex-col items-center gap-1"
      aria-label={`${species.name}, ${RARITY_LABEL[species.rarity].replace('!', '')}${isNew ? ', new to your garden' : ''}. Open your garden`}
    >
      <style>{STYLE}</style>
      <span className="flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full border-2 border-edge bg-surface px-4 py-1.5">
        <span aria-hidden="true" className="h-4 w-4 flex-none rounded-full border border-black/10" style={{ background: species.petal }} />
        <span className="font-bold">{species.name}</span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-bold ${special ? 'bg-field-notice text-ink' : 'bg-field-info text-ink-muted'}`}
        >
          {RARITY_LABEL[species.rarity]}
        </span>
      </span>
      {isNew && <span className="text-sm font-bold text-primary-ink">New to your garden!</span>}
    </Link>
  )
}
