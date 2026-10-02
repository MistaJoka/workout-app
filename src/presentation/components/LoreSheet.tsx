import { useRef } from 'react'
import { RARITY_LABEL, type GardenSpecies, type Rarity } from '../../domain/progress/garden'
import { loreFor } from '../../domain/progress/gardenLore'
import { PixelBloom } from './PixelBloom'
import { useSheetFocus } from './useSheetFocus'

// A species tile's own little card: tapping a found flower in the garden
// grid opens this instead of just a tooltip, so the lore line, the grown
// count and the first-grown date all get room to breathe. An undiscovered
// tile opens the same sheet shape with a gentle "not found yet" message and
// only the rarity as a hint — never the name or the art, which would spoil
// the surprise the grid is built around.
//
// The card reveals with a little flip under full motion; reduced motion
// keeps a plain fade so nothing spins, and off motion skips straight to the
// end state (`both` fill + a zeroed animation), same contract as every
// other Pixel Bloom entrance (see PixelBloom.tsx, BloomReveal.tsx).
const LORE_SHEET_STYLE = `
.lore-card { animation: lore-card-flip 420ms cubic-bezier(0.25, 1, 0.35, 1) both; }
@keyframes lore-card-flip { from { opacity: 0; transform: rotateX(-50deg) scale(0.94); } to { opacity: 1; transform: rotateX(0deg) scale(1); } }
[data-motion='reduced'] .lore-card { animation: lore-card-fade 180ms ease-out both; }
[data-motion='off'] .lore-card { animation: none; }
@keyframes lore-card-fade { from { opacity: 0; } to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { :root[data-motion='full'] .lore-card { animation: lore-card-fade 180ms ease-out both; } }
`

function formatFirstGrown(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function RarityChip({ rarity }: { rarity: Rarity }) {
  const special = rarity === 'rare' || rarity === 'legendary'
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${special ? 'bg-field-notice text-ink' : 'bg-field-info text-ink-muted'}`}>
      {RARITY_LABEL[rarity]}
    </span>
  )
}

// A small pixel star next to the lore card's "grown by goal" note -- the
// same honest marker Meadow.tsx puts on an individual goal bloom, here
// standing for the species card as a whole once any of its growings came
// from meeting a weekly goal. Same 7x7 grid/crispEdges convention as
// gardenDay.tsx/CritterIcons.tsx.
export function GoalRibbon({ size = 14 }: { size?: number }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 7 7" width={size} height={size} shapeRendering="crispEdges" className="inline-block">
      <rect x="3" y="0" width="1" height="1" fill="#ffc940" />
      <rect x="2" y="1" width="3" height="1" fill="#ffc940" />
      <rect x="1" y="2" width="5" height="1" fill="#ffd966" />
      <rect x="0" y="3" width="7" height="1" fill="#ffc940" />
      <rect x="1" y="4" width="2" height="1" fill="#f29e0c" />
      <rect x="4" y="4" width="2" height="1" fill="#f29e0c" />
      <rect x="0" y="5" width="2" height="1" fill="#f29e0c" />
      <rect x="5" y="5" width="2" height="1" fill="#f29e0c" />
      <rect x="0" y="6" width="1" height="1" fill="#f29e0c" />
      <rect x="6" y="6" width="1" height="1" fill="#f29e0c" />
    </svg>
  )
}

export type LoreSheetTarget =
  | {
      kind: 'discovered'
      species: GardenSpecies
      count: number
      firstGrownAt: string
      golden: boolean
      // At least one of this species' growings was a goal bloom
      // (garden.ts's GardenFlower `goal` flag) rather than an ordinary
      // per-workout flower.
      goalGrown?: boolean
    }
  | { kind: 'undiscovered'; rarity: Rarity }

export function LoreSheet({ target, onClose }: { target: LoreSheetTarget; onClose: () => void }) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  useSheetFocus(sheetRef, onClose, { initialFocus: closeRef })

  const title = target.kind === 'discovered' ? target.species.name : 'Not found yet'

  return (
    <div className="sheet-backdrop fixed inset-0 z-40 flex items-end bg-black/40" onClick={onClose}>
      <style>{LORE_SHEET_STYLE}</style>
      <div
        ref={sheetRef}
        className="lore-card w-full space-y-3 rounded-t-[var(--radius-panel)] bg-surface p-4 text-center"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-testid="lore-sheet"
      >
        <div className="flex justify-end">
          <button
            ref={closeRef}
            type="button"
            className="btn-ghost min-h-11 min-w-11 shrink-0"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {target.kind === 'discovered' ? (
          <div className="-mt-8 space-y-2">
            <div className="flex justify-center">
              <PixelBloom size={96} animate={false} species={target.species} golden={target.golden} />
            </div>
            <p className="text-xl font-extrabold">{target.species.name}</p>
            <div className="flex justify-center">
              <RarityChip rarity={target.species.rarity} />
            </div>
            <p className="text-ink-muted">{loreFor(target.species.id)}</p>
            <div className="flex items-center justify-center gap-3 text-sm text-ink-muted">
              <span>First grown {formatFirstGrown(target.firstGrownAt)}</span>
              <span aria-hidden="true">·</span>
              <span>
                Grown {target.count} {target.count === 1 ? 'time' : 'times'}
              </span>
            </div>
            {target.goalGrown && (
              <p className="flex items-center justify-center gap-1.5 text-sm font-semibold text-primary-ink">
                <GoalRibbon />
                Grown by meeting your weekly goal
              </p>
            )}
          </div>
        ) : (
          <div className="-mt-8 space-y-2">
            <div className="flex justify-center">
              <div
                aria-hidden="true"
                className="flex h-[132px] w-[96px] items-center justify-center rounded-control bg-field-info text-4xl font-bold text-ink-muted"
              >
                ?
              </div>
            </div>
            <p className="text-xl font-extrabold">Not found yet &mdash; keep growing</p>
            <div className="flex justify-center">
              <RarityChip rarity={target.rarity} />
            </div>
            <p className="text-ink-muted">Finish a workout and see what grows. This one's still waiting to be found.</p>
          </div>
        )}
      </div>
    </div>
  )
}
