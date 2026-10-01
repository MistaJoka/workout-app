import { flowTier } from '../../domain/session/flow'

const MAX_SPARKLES = 4

// The player's small "flow" chip: appears once the run of clean sets hits
// its first milestone (flowTier > 0, from domain/session/flow.ts) and keeps
// showing the live count as it climbs. A miss just stops rendering it — no
// message, no color change (CLAUDE.md: celebrate, never shame).
//
// Motion: full gets a pop-in and a light twinkle on its sparkles; reduced
// gets only a fade (no bounce, no twinkle loop); off is a static chip with
// no animation at all. The run number itself is never gated by motion — the
// chip carries the same information at every setting, just dressed down.
export function FlowChip({ run }: { run: number }) {
  const tier = flowTier(run)
  if (tier === 0) return null
  const sparkles = Math.min(tier, MAX_SPARKLES)

  return (
    // Keyed by run in the caller so each new milestone/step replays the pop.
    <div className="flow-chip flow-chip--pop" data-tier={sparkles}>
      <style>{STYLE}</style>
      <span className="flow-chip__sparkles" aria-hidden="true">
        {Array.from({ length: sparkles }, (_, i) => (
          <span key={i} className="flow-chip__spark" style={{ ['--i' as string]: i }} />
        ))}
      </span>
      <span className="flow-chip__label">Flow x{run}</span>
    </div>
  )
}

const STYLE = `
.flow-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  background: linear-gradient(135deg, #ffe08a, #ff8fb8);
  color: #5a3a1a;
  font-size: 0.75rem;
  font-weight: 800;
  line-height: 1;
}
.flow-chip__label { white-space: nowrap; }
.flow-chip__sparkles { display: inline-flex; gap: 0.1rem; }
.flow-chip__spark {
  width: 5px;
  height: 5px;
  border-radius: 999px;
  background: #fff6d8;
  opacity: 0.55;
  transform: scale(0.85);
}
.flow-chip[data-tier='2'] .flow-chip__spark,
.flow-chip[data-tier='3'] .flow-chip__spark,
.flow-chip[data-tier='4'] .flow-chip__spark { opacity: 0.85; transform: scale(1); }
.flow-chip[data-tier='4'] { background: linear-gradient(135deg, #ffe08a, #ff8fb8, #c9a7ff); }

[data-motion='full'] .flow-chip--pop {
  animation: flow-chip-pop 380ms cubic-bezier(0.3, 1.6, 0.5, 1) both;
}
[data-motion='full'] .flow-chip__spark {
  animation: flow-chip-twinkle 1100ms ease-in-out calc(var(--i, 0) * 140ms) infinite;
}
[data-motion='reduced'] .flow-chip--pop {
  animation: flow-chip-fade 220ms ease-out both;
}
[data-motion='off'] .flow-chip--pop,
[data-motion='off'] .flow-chip__spark {
  animation: none;
}
@media (prefers-reduced-motion: reduce) {
  [data-motion='full'] .flow-chip--pop { animation: flow-chip-fade 220ms ease-out both; }
  [data-motion='full'] .flow-chip__spark { animation: none; }
}
@keyframes flow-chip-pop {
  0% { transform: scale(0.4); opacity: 0; }
  65% { transform: scale(1.12); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes flow-chip-fade {
  0% { opacity: 0; }
  100% { opacity: 1; }
}
@keyframes flow-chip-twinkle {
  0%, 100% { opacity: 0.4; transform: scale(0.85); }
  50% { opacity: 1; transform: scale(1.15); }
}
`
