import { useEffect, useMemo, useState } from 'react'
import { loadLibrary } from '../../domain/content/catalog'
import { exerciseMeta, filterExercises } from '../../domain/content/library'
import type { Exercise } from '../../domain/content/types'
import { swapChoices } from '../../domain/session/swaps'
import { ExerciseThumb } from './ExerciseThumb'
import { raeLoopForExercise } from './raeLoops'
import { Skeleton, SkeletonList } from './Skeleton'
import { ThumbBar } from './ThumbBar'

const PAGE = 30

// Swap one move of this workout for another (Start screen; domain rules in
// domain/session/swaps.ts). Same layout as the routine builder's picker.
// Moves for the same muscle group come first; she decides what fits.
export function SwapPicker({
  slotName,
  original,
  originalName,
  isSwapped,
  inWorkout,
  onPick,
  onRestore,
  onClose,
}: {
  slotName: string
  original: Exercise | undefined
  originalName: string
  isSwapped: boolean
  inWorkout: readonly Exercise[]
  onPick: (exercise: Exercise) => void
  onRestore: () => void
  onClose: () => void
}) {
  const [library, setLibrary] = useState<Exercise[] | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(PAGE)

  useEffect(() => {
    let cancelled = false
    loadLibrary()
      .then((all) => {
        if (!cancelled) setLibrary(all)
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => setLimit(PAGE), [query])

  const choices = useMemo(() => {
    if (!library) return null
    const pool = query ? filterExercises(library, { query }) : library
    return swapChoices(pool, original, inWorkout, (id) => raeLoopForExercise(id) != null)
  }, [library, query, original, inWorkout])

  const sameGroup = choices?.sameGroup ?? []
  const others = choices?.others ?? []
  const shownSame = sameGroup.slice(0, limit)
  const shownOthers = others.slice(0, Math.max(0, limit - shownSame.length))
  const left = sameGroup.length + others.length - shownSame.length - shownOthers.length

  return (
    <div className="p-4 pb-24 space-y-3">
      <h1 className="text-lg font-bold">
        <span aria-hidden="true">⇄ </span>
        Swap {slotName}
      </h1>
      {isSwapped && (
        <button type="button" className="btn-secondary w-full" onClick={onRestore}>
          Back to {originalName}
        </button>
      )}
      <div className="sticky top-0 z-10 -mx-4 bg-bg px-4 py-2">
        <input
          type="search"
          placeholder="Search moves"
          aria-label="Search moves"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="input w-full"
        />
      </div>
      {library === null && !loadFailed && (
        <Skeleton label="Loading moves">
          <SkeletonList rows={6} thumb />
        </Skeleton>
      )}
      {loadFailed && <p className="text-ink-muted">Couldn't load moves. Try again when you're online.</p>}
      {choices && sameGroup.length + others.length === 0 && <p className="text-ink-muted">No moves match.</p>}
      {shownSame.length > 0 && (
        <MoveList label={choices?.group ?? 'Same muscles'} moves={shownSame} onPick={onPick} />
      )}
      {shownOthers.length > 0 && (
        <MoveList label={shownSame.length > 0 ? 'More moves' : 'Moves'} moves={shownOthers} onPick={onPick} />
      )}
      {left > 0 && (
        <button type="button" className="btn-secondary w-full" onClick={() => setLimit((n) => n + PAGE)}>
          Show more ({left} left)
        </button>
      )}
      <ThumbBar armKey="swap-picker">
        <button className="btn-secondary w-full" onClick={onClose}>
          Cancel
        </button>
      </ThumbBar>
    </div>
  )
}

function MoveList({ label, moves, onPick }: { label: string; moves: Exercise[]; onPick: (e: Exercise) => void }) {
  return (
    <section aria-label={label} className="space-y-2">
      <p className="text-sm font-semibold text-ink-muted">{label}</p>
      <ul className="space-y-2">
        {moves.map((exercise) => (
          <li key={exercise.id}>
            <button
              type="button"
              className="card flex w-full items-center gap-3 p-2 text-left"
              aria-label={`Swap in ${exercise.name}`}
              onClick={() => onPick(exercise)}
            >
              <ExerciseThumb exercise={exercise} className="h-12 w-16 rounded-panel" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{exercise.name}</span>
                <span className="block truncate text-xs text-ink-muted">{exerciseMeta(exercise).join(', ')}</span>
              </span>
              <span aria-hidden="true" className="flex-none text-primary-ink">
                ⇄
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
