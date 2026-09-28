// Sets done across the whole workout, as one bar in the player header.
export function WorkoutProgressBar({ done, total, label }: { done: number; total: number; label: string }) {
  const share = total > 0 ? Math.min(1, Math.max(0, done / total)) : 0
  return (
    <div
      className="workout-progress"
      role="progressbar"
      aria-label="Workout progress"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={done}
      aria-valuetext={`${label}, ${done} of ${total} sets done`}
    >
      <div className="workout-progress__fill" style={{ width: `${share * 100}%` }} />
    </div>
  )
}
