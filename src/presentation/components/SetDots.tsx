// One dot per set of the current exercise: filled = done, ringed = the set
// being worked now, hollow = still to come. Decoration beside the
// "Set 2 of 3" caption, which carries the same information as text.
export function SetDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex justify-end gap-1.5" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => {
        const n = i + 1
        const state = n < current ? 'done' : n === current ? 'current' : 'left'
        return <span key={n} className={`set-dot set-dot--${state}`} />
      })}
    </div>
  )
}
