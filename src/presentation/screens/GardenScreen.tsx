import { useEffect, useState } from 'react'
import { BackButton } from '../components/BackButton'
import { Meadow } from '../components/Meadow'
import { PixelBloom } from '../components/PixelBloom'
import { RaeNote } from '../components/RaeNote'
import { Skeleton, SkeletonBlock, SkeletonHeading } from '../components/Skeleton'
import { GARDEN_SPECIES, RARITY_LABEL, buildGarden, type Garden } from '../../domain/progress/garden'
import { db } from '../../infrastructure/db/schema'

// The collection: every species a workout can grow. Found ones show their
// flower, name and how many have grown; the rest wait as a "?" tile, a
// little curiosity about what the next workout might bring. Nothing here
// can be lost: the garden only grows.
export function GardenScreen() {
  const [garden, setGarden] = useState<Garden | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    db.sessionResults
      .toArray()
      .then((results) => setGarden(buildGarden(results)))
      .catch(() => setFailed(true))
  }, [])

  return (
    <div className="p-4 pb-24 space-y-4">
      <BackButton />
      <div>
        <h1 className="text-2xl font-bold">Your garden</h1>
        {garden && (
          <p className="text-sm text-ink-muted">
            {garden.flowers.length} {garden.flowers.length === 1 ? 'flower' : 'flowers'} grown, {garden.discovered} of{' '}
            {garden.total} kinds found
          </p>
        )}
      </div>

      {failed && <p>Couldn't open your garden on this device.</p>}
      {!garden && !failed && (
        <Skeleton className="space-y-3">
          <SkeletonHeading />
          <SkeletonBlock className="h-64 rounded-panel" />
        </Skeleton>
      )}

      {garden && (
        <>
          <Meadow flowers={garden.flowers} />
          <RaeNote expression={garden.flowers.length === 0 ? 'smile' : 'laugh'}>
            {garden.flowers.length === 0
              ? 'Every workout grows a flower here. Which one will you get?'
              : 'Every workout grows a new flower. Some are rare!'}
          </RaeNote>
          <ul className="grid grid-cols-3 gap-2">
            {GARDEN_SPECIES.map((species) => {
              const count = garden.counts.get(species.id) ?? 0
              const found = count > 0
              const rarity = RARITY_LABEL[species.rarity].replace('!', '')
              return (
                <li
                  key={species.id}
                  className="card flex flex-col items-center p-2 text-center"
                  aria-label={found ? `${species.name}, ${rarity}, grown ${count} ${count === 1 ? 'time' : 'times'}` : `Not found yet, ${rarity}`}
                >
                  {found ? (
                    <PixelBloom size={52} animate={false} species={species} />
                  ) : (
                    <div
                      aria-hidden="true"
                      className="flex h-[71px] w-[52px] items-center justify-center rounded-control bg-field-info text-2xl font-bold text-ink-muted"
                    >
                      ?
                    </div>
                  )}
                  <p aria-hidden="true" className="mt-1 text-xs font-bold leading-tight">
                    {found ? species.name : '???'}
                  </p>
                  <p aria-hidden="true" className="text-[11px] text-ink-muted">
                    {found ? `x${count}` : rarity}
                  </p>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}
