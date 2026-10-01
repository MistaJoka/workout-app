// One dot per set of the current exercise: filled = done, ringed = the set
// being worked now, hollow = still to come. Decoration beside the
// "Set 2 of 3" caption, which carries the same information as text.
// With `animate`, the set just finished (the one before the current) pops
// as the player comes back from its rest.
export function SetDots({ total, current, animate = false }: { total: number; current: number; animate?: boolean }) {
  return (
    <div className="flex justify-end gap-1.5" aria-hidden="true">
      {animate && <style>{POP_CSS}</style>}
      {Array.from({ length: total }, (_, i) => {
        const n = i + 1
        const state = n < current ? 'done' : n === current ? 'current' : 'left'
        const fresh = animate && n === current - 1
        return <span key={n} className={`set-dot set-dot--${state}${fresh ? ' set-dot--fresh' : ''}`} />
      })}
    </div>
  )
}

const POP_CSS = `
.set-dot--fresh { animation: set-dot-pop 420ms cubic-bezier(0.3, 1.6, 0.5, 1) both; }
@keyframes set-dot-pop {
  0% { transform: scale(0.3); }
  60% { transform: scale(1.45); }
  100% { transform: scale(1); }
}
`
