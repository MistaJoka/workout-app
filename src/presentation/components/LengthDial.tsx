import type { WorkoutLength } from '../../domain/session/lengthDial'

const LABELS: Record<WorkoutLength, string> = { short: 'Short', usual: 'Usual', long: 'Long' }

// Short / Usual / Long, each with its own estimate. Always starts on Usual:
// the Start screen owns the choice and never remembers it, so a short
// workout is never applied silently.
export function LengthDial({
  value,
  minutes,
  onChange,
}: {
  value: WorkoutLength
  minutes: Record<WorkoutLength, number>
  onChange: (length: WorkoutLength) => void
}) {
  return (
    <div role="radiogroup" aria-label="Workout length" className="grid grid-cols-3 gap-2">
      {(['short', 'usual', 'long'] as const).map((length) => (
        <button
          key={length}
          type="button"
          role="radio"
          aria-checked={value === length}
          aria-label={`${LABELS[length]}, about ${minutes[length]} min`}
          onClick={() => onChange(length)}
          className={`chip min-h-11 flex-col justify-center gap-0 ${value === length ? 'chip-active' : ''}`}
        >
          <span aria-hidden="true" className="text-sm font-bold">
            {LABELS[length]}
          </span>
          <span aria-hidden="true" className="hud-num text-xs">
            ⏱{minutes[length]}
          </span>
        </button>
      ))}
    </div>
  )
}
