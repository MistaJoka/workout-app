import { speciesFor, type GardenSpecies } from '../../domain/progress/garden'

// A calendar day's flowers in the user's garden: the species each workout
// that day grew (speciesFor, fixed by session id), newest first. The week
// and month views show at most two heads, so at most two species.
export function daySpecies(sessionIdsNewestFirst: readonly string[]): GardenSpecies[] {
  return sessionIdsNewestFirst.slice(0, 2).map(speciesFor)
}

// Ends a day's screen-reader label with its flowers, e.g. ", Moon Lily" or
// ", Moon Lily and Pink Bloom". Appended last so labels keep their prefix.
export function speciesSuffix(species: readonly GardenSpecies[]): string {
  if (species.length === 0) return ''
  const names = [...new Set(species.map((s) => s.name))]
  return `, ${names.join(' and ')}`
}

// Rare and legendary heads keep a few pixel sparkles: they twinkle under
// full motion and simply stay lit when motion is reduced/off.
export const GARDEN_DAY_STYLE = `
.garden-day__shimmer { animation: garden-day-shimmer 1.6s ease-in-out infinite both; }
@keyframes garden-day-shimmer { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
[data-motion='reduced'] .garden-day__shimmer, [data-motion='off'] .garden-day__shimmer { animation: none; opacity: 1; }
@media (prefers-reduced-motion: reduce) { .garden-day__shimmer { animation: none; opacity: 1; } }
`

function isSparkly(species: GardenSpecies): boolean {
  return species.rarity === 'rare' || species.rarity === 'legendary'
}

// One flower head on the 16px grid (petals, corner shading, center), in the
// species' palette, offset by x. Shared by the week pots and month days.
export function SpeciesHead({ species, x = 0 }: { species: GardenSpecies; x?: number }) {
  const { petal, petalDark, center, centerDark } = species
  return (
    <g transform={`translate(${x} 0)`}>
      <rect x="6" y="1" width="4" height="2" fill={petal} />
      <rect x="4" y="3" width="2" height="4" fill={petal} />
      <rect x="10" y="3" width="2" height="4" fill={petal} />
      <rect x="6" y="7" width="4" height="1" fill={petal} />
      <rect x="5" y="2" width="1" height="1" fill={petalDark} />
      <rect x="10" y="2" width="1" height="1" fill={petalDark} />
      <rect x="6" y="3" width="4" height="4" fill={center} />
      <rect x="7" y="4" width="2" height="2" fill={centerDark} />
      {isSparkly(species) && (
        <g className="garden-day__shimmer" fill={species.rarity === 'legendary' ? '#ffd23f' : '#ffc58a'}>
          <rect x="2" y="1" width="1" height="1" />
          <rect x="13" y="2" width="1" height="1" />
          <rect x="3" y="7" width="1" height="1" />
        </g>
      )}
    </g>
  )
}
