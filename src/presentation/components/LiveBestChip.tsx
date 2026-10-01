import type { LiveBestPreview } from '../../domain/progress/liveBest'

// Before a set: a one-line nudge toward the user's own prior best for this
// move, never a message about falling short (CLAUDE.md: celebrate, never
// shame) — so it only ever says "this would beat it" or, when close, how
// close. Nothing renders when there's no prior best to compare to.
export function LiveBestChip({ preview }: { preview: LiveBestPreview }) {
  if (preview.priorBest == null) return null
  if (preview.beatsBestIfDone) {
    return (
      <span className="live-best-chip live-best-chip--pop" data-testid="live-best-chip">
        <style>{STYLE}</style>
        New best if you finish!
      </span>
    )
  }
  // Only worth a line when it's genuinely close — further off says nothing.
  if (preview.gap != null && preview.gap > 0 && preview.gap <= 2) {
    return (
      <span className="live-best-chip live-best-chip--pop" data-testid="live-best-chip">
        <style>{STYLE}</style>
        {preview.gap} more than usual beats your best
      </span>
    )
  }
  return null
}

// Same goal-gradient pill as FlowChip, so the player's small badges read as
// one family.
const STYLE = `
.live-best-chip {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  background: linear-gradient(135deg, #ffe08a, #ff8fb8);
  color: #5a3a1a;
  font-size: 0.75rem;
  font-weight: 800;
  line-height: 1.1;
  text-align: right;
}
[data-motion='full'] .live-best-chip--pop { animation: live-best-chip-pop 380ms cubic-bezier(0.3, 1.6, 0.5, 1) both; }
[data-motion='reduced'] .live-best-chip--pop { animation: live-best-chip-fade 220ms ease-out both; }
[data-motion='off'] .live-best-chip--pop { animation: none; }
@media (prefers-reduced-motion: reduce) {
  [data-motion='full'] .live-best-chip--pop { animation: live-best-chip-fade 220ms ease-out both; }
}
@keyframes live-best-chip-pop {
  0% { transform: scale(0.4); opacity: 0; }
  65% { transform: scale(1.08); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes live-best-chip-fade {
  0% { opacity: 0; }
  100% { opacity: 1; }
}
`
