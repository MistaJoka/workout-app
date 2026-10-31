import type { ReactNode } from 'react'
import { BODY_AREAS } from '../../domain/content/library'
import type { Exercise } from '../../domain/content/types'
import { ExerciseThumb } from './ExerciseThumb'

// Browsing moves, shared by Library and the routine builder's picker: one
// row of body-area chips that scrolls sideways, and a compact two-column
// grid of moves, so an area is a short list instead of a long page.

const AREA_KEY = 'workout-app:move-area'

// The area the last browse ended on, for this visit to the app; Legs first.
export function initialArea(): string {
  try {
    const saved = sessionStorage.getItem(AREA_KEY)
    return BODY_AREAS.some((a) => a.id === saved) ? saved! : BODY_AREAS[0].id
  } catch {
    return BODY_AREAS[0].id
  }
}

export function rememberArea(area: string): void {
  try {
    sessionStorage.setItem(AREA_KEY, area)
  } catch {
    // Private mode: the choice just isn't remembered.
  }
}

// `area` null while searching: a search looks at every area, so no chip
// is lit. Tapping one goes back to browsing it.
export function AreaChips({ area, onArea }: { area: string | null; onArea: (area: string) => void }) {
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [-webkit-overflow-scrolling:touch]" role="group" aria-label="Body area">
      {BODY_AREAS.map((a) => (
        <button
          key={a.id}
          type="button"
          aria-pressed={area === a.id}
          onClick={() => onArea(a.id)}
          className={`chip ${area === a.id ? 'chip-active' : ''}`}
        >
          {a.label}
        </button>
      ))}
    </div>
  )
}

export function MoveGrid({ children }: { children: ReactNode }) {
  return <ul className="grid grid-cols-2 gap-2">{children}</ul>
}

// One move: Rae (or the photo) and the name, nothing else. `trailing` is
// the small mark at the end (a heart, a picked tick).
export function MoveTileBody({ exercise, trailing }: { exercise: Exercise; trailing?: ReactNode }) {
  return (
    <>
      <ExerciseThumb exercise={exercise} className="h-12 w-12 rounded-control" />
      <span className="line-clamp-2 min-w-0 flex-1 text-left text-sm font-semibold leading-tight">{exercise.name}</span>
      {trailing}
    </>
  )
}

export const MOVE_TILE = 'card flex min-h-16 w-full items-center gap-2 p-1.5'
