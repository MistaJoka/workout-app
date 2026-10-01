// After "No, fell short": the likely counts as big one-tap choices, so most
// short sets are logged with a single tap. "Other" opens the stepper for
// anything further off. The pure helper is exported for tests.
export function quickRepPicks(target: number): number[] {
  return [target - 1, target - 2, target - 3].filter((n) => n >= 0)
}

export function RepPicks({
  target,
  busy,
  onPick,
  onOther,
}: {
  target: number
  busy: boolean
  onPick: (reps: number) => void
  onOther: () => void
}) {
  return (
    <div className="flex gap-2">
      {quickRepPicks(target).map((n) => (
        <button
          key={n}
          type="button"
          className="btn-primary min-h-14 flex-1 text-2xl font-extrabold tabular-nums"
          aria-label={`${n} ${n === 1 ? 'rep' : 'reps'}`}
          disabled={busy}
          onClick={() => onPick(n)}
        >
          {n}
        </button>
      ))}
      <button type="button" className="btn-secondary min-h-14 flex-1" disabled={busy} onClick={onOther}>
        Other
      </button>
    </div>
  )
}
