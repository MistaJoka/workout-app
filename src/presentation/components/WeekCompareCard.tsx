import { highlightLabel, type Highlight, type WeekCompare } from '../../domain/progress/weekCompare'
import { useCountUp } from './CountUp'

// "This week vs last": up to 3 positive highlights as chips, each counting
// up (useCountUp is already motion-aware: full/reduced/off all land on the
// true number, just with or without the climb). Every highlight here is a
// gain by construction (domain/progress/weekCompare.ts only ever returns
// positive ones), so every chip gets the same small up glyph; a quiet or
// unremarkable week shows one calm line instead and never a down arrow
// (CLAUDE.md ethics: a lower week reads as rest, not loss).
// `bare`: just this week's highlight chips (no heading, no fallback
// sentence), for Progress's numbers-first layout. Renders nothing on a
// week without a highlight.
export function WeekCompareCard({ compare, bare = false }: { compare: WeekCompare; bare?: boolean }) {
  if (bare)
    return compare.highlights.length > 0 ? (
      <ul className="flex flex-wrap gap-2" aria-label="This week's highlights" data-testid="week-compare">
        {compare.highlights.map((h, i) => (
          <li key={i}>
            <HighlightChip highlight={h} />
          </li>
        ))}
      </ul>
    ) : null
  return (
    <section className="card space-y-2 p-3" data-testid="week-compare">
      <p className="font-bold">This week vs last</p>
      {compare.highlights.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label="This week's highlights">
          {compare.highlights.map((h, i) => (
            <li key={i}>
              <HighlightChip highlight={h} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-muted" data-testid="week-compare-fallback">
          {compare.fallback}
        </p>
      )}
    </section>
  )
}

function HighlightChip({ highlight }: { highlight: Highlight }) {
  const shown = useCountUp(highlight.value ?? 0)
  return (
    // The true final number is the accessible name (same technique as
    // XpCelebration's XpGainChip), so a screen reader never reads a
    // mid-animation value while the visible digits are still counting up.
    <span
      className="chip gap-1.5 bg-field-success"
      data-testid="week-compare-chip"
      role="img"
      aria-label={highlightLabel(highlight)}
    >
      <UpGlyph />
      <span aria-hidden="true">
        {highlight.prefix}
        {highlight.value != null ? shown : ''}
        {highlight.text}
      </span>
    </span>
  )
}

// A small, calm up-chevron — the only directional glyph this card ever
// shows (gains only; a quieter week gets text, never a down arrow).
function UpGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 12 12" className="h-3 w-3 flex-none">
      <path d="M6 10V2.5M2.3 6.3 6 2l3.7 4.3" fill="none" stroke="#1f8f61" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
