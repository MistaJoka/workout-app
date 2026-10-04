import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { weekDayTarget, type DayMark, type WeekDay, type WeekDayTarget } from '../../domain/schedule/todayView'
import { WEEKDAY_LABELS } from '../../domain/schedule/weeklySchedule'
import { useSheetFocus } from './useSheetFocus'
import { goalGradientLine } from '../../domain/progress/stats'
import { MOMENTUM_STYLE, momentumProps } from './TodayMomentum'
import { GARDEN_DAY_STYLE, SpeciesHead, daySpecies, speciesSuffix } from './gardenDay'
import type { GardenSpecies } from '../../domain/progress/garden'

// This week as seven little pots on Rae's windowsill: a flower blooms on
// every day with a finished workout. Planned days hold a sprout, rest days
// a sleeping bud, empty days just soil. Nothing wilts: a day that passed
// without a workout is simply still a sprout. Pixel art on a 16px grid,
// drawn with the same crisp edges as the room above. Each pot opens that
// day (weekDayTarget); the header opens the week planner. A done day's
// flower is the garden species its workout grew (gardenDay).

const LEAF = '#5bbf8a'
const LEAF_DARK = '#3f9d6e'

function Pot() {
  return (
    <>
      <rect x="3" y="14" width="10" height="2" fill="#d4866a" />
      <rect x="4" y="16" width="8" height="3" fill="#e0906a" />
      <rect x="5" y="19" width="6" height="1" fill="#c9785d" />
      <rect x="4" y="14" width="8" height="1" fill="#8a5a44" />
    </>
  )
}

function Sprout() {
  return (
    <>
      <rect x="7" y="10" width="2" height="4" fill={LEAF_DARK} />
      <rect x="4" y="9" width="3" height="2" fill={LEAF} />
      <rect x="9" y="8" width="3" height="2" fill={LEAF} />
    </>
  )
}

function Bud() {
  return (
    <>
      <rect x="7" y="10" width="2" height="4" fill={LEAF_DARK} />
      <rect x="6" y="7" width="4" height="3" fill="#b8e0ff" />
      <rect x="7" y="6" width="2" height="1" fill="#b8e0ff" />
    </>
  )
}

function Flower({ species, x = 0, small = false }: { species: GardenSpecies; x?: number; small?: boolean }) {
  const o = small ? 2 : 0
  return (
    <g transform={`translate(${x} ${o})`}>
      <rect x="7" y="8" width="2" height="6" fill={LEAF_DARK} />
      <rect x="9" y="10" width="3" height="2" fill={LEAF} />
      <SpeciesHead species={species} />
    </g>
  )
}

// Two workouts on a day: the older one small behind, the newest in front.
function Plant({ mark, species }: { mark: DayMark; species: GardenSpecies[] }) {
  if (mark === 'done' && species.length > 0) {
    return species.length > 1 ? (
      <>
        <Flower species={species[1]} x={-3} small />
        <Flower species={species[0]} x={3} />
      </>
    ) : (
      <Flower species={species[0]} />
    )
  }
  if (mark === 'planned') return <Sprout />
  if (mark === 'rest') return <Bud />
  return <rect x="5" y="13" width="6" height="1" fill="#8a5a44" />
}

// Workout names for labels and the pick sheet, keyed by session id (what
// was done) and template id (what is planned). Missing names fall back to
// "workout", so a deleted routine never breaks the week.
export type WeekNames = { sessions: Record<string, string>; templates: Record<string, string> }

const NO_NAMES: WeekNames = { sessions: {}, templates: {} }

// What a screen reader hears for one day, e.g. "Wednesday, Full-Body A
// done" or "Thursday, today, Quick 10 planned".
export function dayLabel(day: WeekDay, names: WeekNames): string {
  const prefix = `${WEEKDAY_LABELS[day.weekday]}${day.isToday ? ', today' : ''}`
  if (day.mark === 'done') {
    const flowers = speciesSuffix(daySpecies(day.sessions.map((s) => s.sessionId)))
    if (day.sessions.length > 1) return `${prefix}, ${day.sessions.length} workouts done${flowers}`
    return `${prefix}, ${names.sessions[day.sessions[0]?.sessionId ?? ''] ?? 'workout'} done${flowers}`
  }
  if (day.mark === 'planned') return `${prefix}, ${names.templates[day.plannedTemplateId ?? ''] ?? 'workout'} planned`
  if (day.mark === 'rest') return `${prefix}, rest day`
  return `${prefix}, nothing planned`
}

// The header reads progress toward the week's goal (weeklyGoal), never a
// bare count: "1 of 2 this week", then a gentle "Goal met" once reached.
export function weekSummary(done: number, goal: number): string {
  if (done >= goal) return `Goal met, ${done} of ${goal}`
  if (done === 0) return `Goal: ${goal} this week`
  return `${done} of ${goal} this week`
}

function hrefFor(target: WeekDayTarget): string | null {
  if (target.kind === 'session') return `/history/${target.sessionId}`
  if (target.kind === 'start') return `/checkin/${target.templateId}`
  if (target.kind === 'schedule') return '/schedule'
  return null
}

// Each pot is a door: the workout done that day, a planned workout still
// ahead, or the planner. The header ("1 of 2 this week ... Plan") is its own
// link to the planner.
export function WeekBlooms({
  week,
  goal,
  names = NO_NAMES,
  animate = false,
  footer,
}: {
  week: WeekDay[]
  goal: number
  names?: WeekNames
  // Momentum entrance (once a day, see useMomentumEntrance).
  animate?: boolean
  // Under the pots: the milestone bar and bloom chip (MomentumStrip).
  footer?: ReactNode
}) {
  const [picking, setPicking] = useState<WeekDay | null>(null)
  const done = week.reduce((sum, d) => sum + d.count, 0)
  const met = done >= goal
  const summary = weekSummary(done, goal)
  const line = momentumProps(animate, 0)
  const bounceId = useBounceOnce(week)
  return (
    <div className="week-blooms card px-3 pb-2 pt-1">
      <style>{MOMENTUM_STYLE}</style>
      <style>{GARDEN_DAY_STYLE}</style>
      <Link
        to="/schedule"
        className="flex min-h-11 items-center justify-between rounded-control px-1 active:bg-field-primary"
        aria-label={`${summary}. Plan your week.`}
      >
        <p className="flex items-center gap-2 font-bold">
          {met && (
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-field-success text-sm" aria-hidden>
              ✓
            </span>
          )}
          <span className="hud-num">
            {done}/{goal}
          </span>
        </p>
        <span className="text-sm font-semibold text-primary-ink">Plan</span>
      </Link>
      <div className="flex gap-1 px-1" aria-hidden>
        {Array.from({ length: goal }, (_, i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i < done ? 'bg-primary' : 'bg-[var(--color-border)]'}`}
          />
        ))}
      </div>
      {/* The pots and the bar above already show it; the sentence is for
          screen readers. */}
      <p className={`sr-only ${line.className}`} style={line.style}>
        {goalGradientLine(done, goal)}
      </p>
      <ol className="mt-1 grid grid-cols-7">
        {week.map((day) => {
          const target = weekDayTarget(day)
          const href = hrefFor(target)
          const cellClass =
            'flex min-h-11 w-full flex-col items-center rounded-control pb-0.5 active:bg-field-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-primary-ink)]'
          const face = (
            <>
              <svg
                viewBox="0 0 16 20"
                width="40"
                height="50"
                shapeRendering="crispEdges"
                aria-hidden
                className={day.isToday && bounceId !== null && day.sessions[0]?.sessionId === bounceId ? 'week-blooms__new' : ''}
              >
                <Plant mark={day.mark} species={daySpecies(day.sessions.map((s) => s.sessionId))} />
                <Pot />
              </svg>
              <span
                aria-hidden
                className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  day.isToday ? 'bg-primary text-on-primary' : 'text-ink-muted'
                }`}
              >
                {day.letter}
              </span>
            </>
          )
          return (
            <li key={day.weekday} className="flex justify-center">
              {href ? (
                <Link to={href} className={cellClass} aria-label={dayLabel(day, names)}>
                  {face}
                </Link>
              ) : (
                <button type="button" className={cellClass} aria-label={dayLabel(day, names)} onClick={() => setPicking(day)}>
                  {face}
                </button>
              )}
            </li>
          )
        })}
      </ol>
      {footer}
      {picking && <PickSheet day={picking} names={names} onClose={() => setPicking(null)} />}
    </div>
  )
}

// Today's newest flower bounces in once: the first time Today shows it
// after the workout, never again on later visits (the week-blooms__new
// animation is clamped by the motion settings like every other).
const BOUNCED_KEY = 'workout-app:bloom-bounced'

function useBounceOnce(week: WeekDay[]): string | null {
  const newest = week.find((d) => d.isToday)?.sessions[0]?.sessionId ?? null
  const [bounceId] = useState<string | null>(() => {
    if (!newest) return null
    try {
      return localStorage.getItem(BOUNCED_KEY) === newest ? null : newest
    } catch {
      return null
    }
  })
  useEffect(() => {
    if (!newest) return
    try {
      localStorage.setItem(BOUNCED_KEY, newest)
    } catch {
      // Storage unavailable: the flower just doesn't bounce.
    }
  }, [newest])
  return bounceId
}

// A day with more than one finished workout: pick which to open.
function PickSheet({ day, names, onClose }: { day: WeekDay; names: WeekNames; onClose: () => void }) {
  const sheetRef = useRef<HTMLDivElement>(null)
  useSheetFocus(sheetRef, onClose)
  const title = `${WEEKDAY_LABELS[day.weekday]}'s workouts`
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
          {day.sessions.map((s) => (
            <li key={s.sessionId}>
              <Link
                to={`/history/${s.sessionId}`}
                className="flex min-h-11 items-center justify-between card px-4 py-3 active:bg-field-primary"
              >
                <span className="font-semibold">{names.sessions[s.sessionId] ?? 'Workout'}</span>
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
