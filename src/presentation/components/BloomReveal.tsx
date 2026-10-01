import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { RARITY_LABEL, type GardenSpecies } from '../../domain/progress/garden'
import { playCelebration } from '../../application/celebrationSounds'
import { useFeedbackSettings } from './useFeedbackSettings'
import { useTheme } from '../theme/ThemeContext'
import { effectiveMotion, usePrefersReducedMotion } from './MovementMedia'
import { BeeIcon } from './CritterIcons'

// The chip pops in 1.45s after mount under full motion (see .bloom-reveal
// below); the chime is timed to land with it instead of firing silently
// into a still-hidden chip.
const REVEAL_DELAY_MS = 1450

// The species this workout grew, named once the flower has popped open on
// the Complete screen: a small chip with a dot in the species' own petal
// colour, its rarity, and a "new" note the first time it turns up. Taps
// through to the garden. The reveal waits for the bloom (delay) under full
// motion; reduced/off motion zeroes delays, so it is simply there.
//
// A bee visits the moment the chip appears: it flies in and settles beside
// the species dot -- the dot being this chip's own stand-in for the flower
// above, since the chip has no other way to reach that flower's actual
// pixels. It is purely decorative (aria-hidden, pointer-events-none) and
// never changes the chip's own timing, label, or layout: under reduced/off
// motion it skips the flight and simply sits beside the dot already landed.
const STYLE = `
.bloom-reveal { animation: bloom-reveal-in 0.4s cubic-bezier(0.2, 0.9, 0.3, 1.3) 1.45s both; }
@keyframes bloom-reveal-in { from { opacity: 0; transform: translateY(6px) scale(0.92); } to { opacity: 1; transform: none; } }
[data-motion='reduced'] .bloom-reveal, [data-motion='off'] .bloom-reveal { animation-delay: 0s !important; }
@media (prefers-reduced-motion: reduce) { .bloom-reveal { animation-delay: 0s !important; } }

.bloom-reveal__bee { position: absolute; left: 50%; top: 50%; opacity: 0; animation: bloom-reveal-bee-land 0.6s ease-out 1.65s both; }
@keyframes bloom-reveal-bee-land {
  0% { opacity: 0; transform: translate(calc(-50% + 16px), calc(-50% - 18px)) scale(0.85); }
  65% { opacity: 1; }
  100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}
.bloom-reveal__bee .critter__wings-closed { opacity: 0; }
[data-motion='reduced'] .bloom-reveal__bee, [data-motion='off'] .bloom-reveal__bee {
  animation: none !important;
  opacity: 1;
  transform: translate(-50%, -50%) scale(1);
}
@media (prefers-reduced-motion: reduce) {
  [data-motion='full'] .bloom-reveal__bee { animation: none !important; opacity: 1; transform: translate(-50%, -50%) scale(1); }
}
`

export function BloomReveal({ species, isNew }: { species: GardenSpecies; isNew: boolean }) {
  const special = species.rarity === 'rare' || species.rarity === 'legendary'
  const [feedback] = useFeedbackSettings()
  const { motion } = useTheme()
  const osPrefersReduced = usePrefersReducedMotion()
  const fullMotion = effectiveMotion(motion, osPrefersReduced) === 'full'
  const played = useRef(false)

  useEffect(() => {
    if (played.current) return
    played.current = true
    const delay = fullMotion ? REVEAL_DELAY_MS : 0
    const timer = window.setTimeout(() => playCelebration('bloom', feedback, { rare: special }), delay)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Link
      to="/garden"
      className="bloom-reveal mx-auto flex w-fit max-w-full flex-col items-center gap-1"
      aria-label={`${species.name}, ${RARITY_LABEL[species.rarity].replace('!', '')}${isNew ? ', new to your garden' : ''}. Open your garden`}
    >
      <style>{STYLE}</style>
      <span className="flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full border-2 border-edge bg-surface px-4 py-1.5">
        <span className="relative h-4 w-4 flex-none">
          <span aria-hidden="true" className="block h-4 w-4 rounded-full border border-black/10" style={{ background: species.petal }} />
          <span className="bloom-reveal__bee pointer-events-none" aria-hidden data-testid="bloom-reveal-bee">
            <BeeIcon size={7} />
          </span>
        </span>
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
