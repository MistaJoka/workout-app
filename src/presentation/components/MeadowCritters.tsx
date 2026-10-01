import type { CSSProperties } from 'react'
import { layoutCritters, type Critter } from '../critters'
import { ButterflyIcon, BeeIcon, LadybugIcon, CritterStem } from './CritterIcons'

// The meadow's small visitors: purely decorative (aria-hidden,
// pointer-events-none throughout) and placed where they can never sit over
// a flower's own 44px tap target. Butterflies and bees drift in a loose
// loop across the sky band above the grass -- no flower ever grows there --
// and a ladybug (once the garden is large enough) stays pinned crawling a
// little stem fixed in the grass's own top-right corner, outside the
// flowers' left-to-right, top-to-bottom flow. Full motion only: under
// reduced/off every critter simply holds at its path's first point.
const STYLE = `
.meadow-critter__fly { position: absolute; left: var(--p0x, 50%); top: var(--p0y, 50%); }
.meadow-critter__fly { animation: meadow-critter-drift var(--dur, 8s) ease-in-out var(--delay, 0s) infinite; }
@keyframes meadow-critter-drift {
  0%, 100% { left: var(--p0x); top: var(--p0y); }
  33% { left: var(--p1x); top: var(--p1y); }
  66% { left: var(--p2x); top: var(--p2y); }
}
[data-motion='reduced'] .meadow-critter__fly, [data-motion='off'] .meadow-critter__fly { animation: none !important; }
@media (prefers-reduced-motion: reduce) { [data-motion='full'] .meadow-critter__fly { animation: none !important; } }

.meadow-critter__fly .critter__wings-open { opacity: 1; animation: meadow-critter-flap 0.3s linear infinite; }
.meadow-critter__fly .critter__wings-closed { opacity: 0; animation: meadow-critter-flap 0.3s linear infinite reverse; }
@keyframes meadow-critter-flap { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
[data-motion='reduced'] .meadow-critter__fly .critter__wings-open, [data-motion='off'] .meadow-critter__fly .critter__wings-open { animation: none !important; opacity: 1; }
[data-motion='reduced'] .meadow-critter__fly .critter__wings-closed, [data-motion='off'] .meadow-critter__fly .critter__wings-closed { animation: none !important; opacity: 0; }
@media (prefers-reduced-motion: reduce) {
  [data-motion='full'] .meadow-critter__fly .critter__wings-open { animation: none !important; opacity: 1; }
  [data-motion='full'] .meadow-critter__fly .critter__wings-closed { animation: none !important; opacity: 0; }
}

.meadow-critter--bee .meadow-critter__bob { animation: meadow-critter-bob 0.5s ease-in-out infinite alternate; }
@keyframes meadow-critter-bob { from { transform: translateY(0); } to { transform: translateY(-2px); } }
[data-motion='reduced'] .meadow-critter--bee .meadow-critter__bob, [data-motion='off'] .meadow-critter--bee .meadow-critter__bob { animation: none !important; }
@media (prefers-reduced-motion: reduce) { [data-motion='full'] .meadow-critter--bee .meadow-critter__bob { animation: none !important; } }

.meadow-critter__crawl { position: absolute; top: var(--c0, 0px); left: -1px; }
.meadow-critter__crawl { animation: meadow-critter-crawl var(--dur, 4s) ease-in-out var(--delay, 0s) infinite alternate; }
@keyframes meadow-critter-crawl { from { top: var(--c0, 0px); } to { top: var(--c1, 10px); } }
[data-motion='reduced'] .meadow-critter__crawl, [data-motion='off'] .meadow-critter__crawl { animation: none !important; }
@media (prefers-reduced-motion: reduce) { [data-motion='full'] .meadow-critter__crawl { animation: none !important; } }
`

function FlyingCritter({ critter }: { critter: Critter }) {
  const [p0, p1, p2] = critter.path
  const style = {
    '--p0x': `${p0.xPct}%`,
    '--p0y': `${p0.yPct}%`,
    '--p1x': `${p1.xPct}%`,
    '--p1y': `${p1.yPct}%`,
    '--p2x': `${p2.xPct}%`,
    '--p2y': `${p2.yPct}%`,
    '--dur': `${critter.durationSec}s`,
    '--delay': `${critter.delaySec}s`,
  } as CSSProperties
  return (
    <div
      className={`meadow-critter__fly ${critter.kind === 'bee' ? 'meadow-critter--bee' : ''}`}
      style={style}
      data-testid="meadow-critter"
      data-kind={critter.kind}
    >
      <div className="meadow-critter__bob">{critter.kind === 'butterfly' ? <ButterflyIcon /> : <BeeIcon />}</div>
    </div>
  )
}

export function MeadowCritters({ flowerCount }: { flowerCount: number }) {
  const critters = layoutCritters(flowerCount)
  if (critters.length === 0) return null

  const flying = critters.filter((c) => c.kind !== 'ladybug')
  const ladybug = critters.find((c) => c.kind === 'ladybug')

  return (
    // z-10: Meadow's own sky/grass divs are each `relative` (z-index:auto),
    // and CSS paints same-bucket positioned siblings in tree order -- this
    // layer sits before them in the DOM, so without an explicit stacking
    // order it would paint underneath the sky's own background and vanish.
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden" aria-hidden>
      <style>{STYLE}</style>
      {/* Butterflies and bees drift across the sky band only (h-24, same
          as Meadow's own sky div): no flower ever grows there, so they can
          never sit over a flower's tap target. */}
      <div className="absolute inset-x-0 top-0 h-24">
        {flying.map((critter) => (
          <FlyingCritter key={critter.id} critter={critter} />
        ))}
      </div>
      {ladybug && (
        <div className="absolute right-2 top-[104px]" data-testid="meadow-critter" data-kind="ladybug">
          <CritterStem height={18} />
          <div
            className="meadow-critter__crawl"
            style={
              {
                '--c0': `${ladybug.path[0].yPct / 8}px`,
                '--c1': `${ladybug.path[1].yPct / 8}px`,
                '--dur': `${ladybug.durationSec}s`,
                '--delay': `${ladybug.delaySec}s`,
              } as CSSProperties
            }
          >
            <LadybugIcon size={7} />
          </div>
        </div>
      )}
    </div>
  )
}
