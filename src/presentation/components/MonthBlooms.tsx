import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { monthGrid, monthOf, shiftMonth, type MonthCell, type MonthRef } from '../../domain/progress/monthGrid'
import { useSheetFocus } from './useSheetFocus'
import { GARDEN_DAY_STYLE, SpeciesHead, daySpecies, speciesSuffix } from './gardenDay'
import type { GardenSpecies } from '../../domain/progress/garden'

// Progress's month at a glance: a little pixel flower on every day with a
// finished workout, the garden species it grew (gardenDay), on the same
// crisp 16px grid as WeekBlooms. Monday-start, like the weekly streak. A
// done day opens that workout (a pick when there were several); other days
// are just dates.

const LEAF = '#5bbf8a'
const LEAF_DARK = '#3f9d6e'
const WEEKDAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export type MonthWorkout = { sessionId: string; endedAt: string; workoutName: string }

// Newest workout's species in front; an older second one behind it.
function TinyFlower({ species }: { species: GardenSpecies[] }) {
  return (
    <svg viewBox="0 0 16 16" width="24" height="24" shapeRendering="crispEdges" aria-hidden>
      <rect x="7" y="8" width="2" height="7" fill={LEAF_DARK} />
      <rect x="9" y="10" width="3" height="2" fill={LEAF} />
      {species.length > 1 ? (
        <>
          <SpeciesHead species={species[1]} x={-3} />
          <SpeciesHead species={species[0]} x={3} />
        </>
      ) : (
        <SpeciesHead species={species[0]} />
      )}
    </svg>
  )
}

function fullDate(cell: MonthCell): string {
  const [y, m, d] = cell.key.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })
}

// Names the day and how many workouts it holds, not which: Progress already
// lists each workout by name in History, and repeating names here would
// double every "Full-Body A" link on the screen.
export function dayCellLabel(cell: MonthCell): string {
  const date = fullDate(cell)
  if (cell.sessions.length === 0) return cell.isToday ? `${date}, today` : date
  const n = cell.sessions.length
  const flowers = speciesSuffix(daySpecies(cell.sessions.map((s) => s.sessionId)))
  return `${date}${cell.isToday ? ', today' : ''}, ${n} ${n === 1 ? 'workout' : 'workouts'} done${flowers}`
}

export function MonthBlooms({ workouts, now = new Date() }: { workouts: MonthWorkout[]; now?: Date }) {
  const current = monthOf(now)
  const earliest = workouts.length
    ? monthOf(new Date(workouts.reduce((min, w) => (w.endedAt < min ? w.endedAt : min), workouts[0].endedAt)))
    : current
  const [shown, setShown] = useState<MonthRef>(current)
  const [picking, setPicking] = useState<MonthCell | null>(null)
  const names = useMemo(() => Object.fromEntries(workouts.map((w) => [w.sessionId, w.workoutName])), [workouts])
  const grid = monthGrid(shown, workouts, now)
  const atCurrent = shown.year === current.year && shown.month === current.month
  const atEarliest = shown.year * 12 + shown.month <= earliest.year * 12 + earliest.month
  const title = new Date(shown.year, shown.month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  return (
    <section className="card p-3" aria-labelledby="month-blooms-title">
      <style>{GARDEN_DAY_STYLE}</style>
      <div className="flex items-center justify-between">
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-control text-xl font-bold text-primary-ink active:bg-field-primary disabled:opacity-30"
          onClick={() => setShown((m) => shiftMonth(m, -1))}
          disabled={atEarliest}
          aria-label="Previous month"
        >
          ‹
        </button>
        <div className="text-center">
          <h2 id="month-blooms-title" className="font-bold" aria-live="polite">
            {atCurrent ? 'This month' : title}
          </h2>
          <p className="text-xs text-ink-muted">
            {grid.doneDays === 0 ? (atCurrent ? 'Your first flower is waiting' : 'No workouts') : `${grid.doneDays} ${grid.doneDays === 1 ? 'day' : 'days'} in bloom`}
            {atCurrent && <span className="sr-only">, {title}</span>}
          </p>
        </div>
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-control text-xl font-bold text-primary-ink active:bg-field-primary disabled:opacity-30"
          onClick={() => setShown((m) => shiftMonth(m, 1))}
          disabled={atCurrent}
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="mt-1 grid grid-cols-7 text-center text-xs font-semibold text-ink-muted" aria-hidden>
        {WEEKDAY_LETTERS.map((l, i) => (
          <span key={i}>{l}</span>
        ))}
      </div>
      <ol className="mt-1 grid grid-cols-7 gap-y-1">
        {grid.weeks.flat().map((cell) => {
          if (!cell.inMonth) return <li key={cell.key} aria-hidden />
          const done = cell.sessions.length > 0
          const base = `flex min-h-12 w-full flex-col items-center justify-center rounded-control ${
            cell.isToday ? 'outline outline-2 -outline-offset-2 outline-[var(--color-primary-ink)]' : ''
          }`
          const face = (
            <>
              {done ? (
                <TinyFlower species={daySpecies(cell.sessions.map((s) => s.sessionId))} />
              ) : (
                <span className="h-6" aria-hidden />
              )}
              <span className={`text-xs ${cell.isFuture ? 'text-ink-muted opacity-50' : done ? 'font-bold' : 'text-ink-muted'}`}>
                {cell.day}
              </span>
            </>
          )
          const label = dayCellLabel(cell)
          return (
            <li key={cell.key} className="flex justify-center">
              {!done ? (
                <span className={base} aria-label={label} role="img">
                  {face}
                </span>
              ) : cell.sessions.length === 1 ? (
                <Link to={`/history/${cell.sessions[0].sessionId}`} className={`${base} active:bg-field-primary`} aria-label={label}>
                  {face}
                </Link>
              ) : (
                <button type="button" className={`${base} active:bg-field-primary`} aria-label={label} onClick={() => setPicking(cell)}>
                  {face}
                </button>
              )}
            </li>
          )
        })}
      </ol>
      {picking && <DaySheet cell={picking} names={names} onClose={() => setPicking(null)} />}
    </section>
  )
}

// A day with more than one finished workout: pick which to open.
function DaySheet({ cell, names, onClose }: { cell: MonthCell; names: Record<string, string>; onClose: () => void }) {
  const sheetRef = useRef<HTMLDivElement>(null)
  useSheetFocus(sheetRef, onClose)
  const title = `${fullDate(cell)} workouts`
  return (
    <div className="sheet-backdrop fixed inset-0 z-40 flex items-end bg-black/40" onClick={onClose}>
      <div
        ref={sheetRef}
        className="w-full space-y-3 rounded-t-[var(--radius-panel)] bg-surface p-4"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <p className="text-center text-lg font-bold">{title}</p>
        <ul className="space-y-2">
          {cell.sessions.map((s) => (
            <li key={s.sessionId}>
              <Link
                to={`/history/${s.sessionId}`}
                className="flex min-h-11 items-center justify-between card px-4 py-3 active:bg-field-primary"
              >
                <span className="font-semibold">{names[s.sessionId] ?? 'Workout'}</span>
                <span className="text-sm text-ink-muted">
                  {new Date(s.endedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <button type="button" className="btn-primary btn-lg w-full" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  )
}
