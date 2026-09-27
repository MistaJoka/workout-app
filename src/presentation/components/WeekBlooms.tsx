import { Link } from 'react-router-dom'
import type { DayMark, WeekDay } from '../../domain/schedule/todayView'

// This week as seven little pots on Rae's windowsill: a flower blooms on
// every day with a finished workout. Planned days hold a sprout, rest days
// a sleeping bud, empty days just soil. Nothing wilts: a day that passed
// without a workout is simply still a sprout. Pixel art on a 16px grid,
// drawn with the same crisp edges as the room above. Taps through to the
// week planner.

const PETALS = ['#ff8fb8', '#c9b8ff', '#ffc58a']
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

function Flower({ petal, x = 0, small = false }: { petal: string; x?: number; small?: boolean }) {
  const o = small ? 2 : 0
  return (
    <g transform={`translate(${x} ${o})`}>
      <rect x="7" y="8" width="2" height="6" fill={LEAF_DARK} />
      <rect x="9" y="10" width="3" height="2" fill={LEAF} />
      <rect x="6" y="1" width="4" height="2" fill={petal} />
      <rect x="4" y="3" width="2" height="4" fill={petal} />
      <rect x="10" y="3" width="2" height="4" fill={petal} />
      <rect x="6" y="7" width="4" height="1" fill={petal} />
      <rect x="6" y="3" width="4" height="4" fill="#ffe08a" />
      <rect x="7" y="4" width="2" height="2" fill="#f5b942" />
    </g>
  )
}

function Plant({ mark, count, petal }: { mark: DayMark; count: number; petal: string }) {
  if (mark === 'done') {
    return count > 1 ? (
      <>
        <Flower petal={petal} x={-3} small />
        <Flower petal={PETALS[(PETALS.indexOf(petal) + 1) % PETALS.length]} x={3} />
      </>
    ) : (
      <Flower petal={petal} />
    )
  }
  if (mark === 'planned') return <Sprout />
  if (mark === 'rest') return <Bud />
  return <rect x="5" y="13" width="6" height="1" fill="#8a5a44" />
}

const MARK_WORDS: Record<DayMark, string> = {
  done: 'worked out',
  planned: 'planned',
  rest: 'rest day',
  open: 'nothing planned',
}

export function WeekBlooms({ week }: { week: WeekDay[] }) {
  const done = week.reduce((sum, d) => sum + d.count, 0)
  const summary =
    done === 0 ? 'Grow your first flower' : done === 1 ? '1 workout this week' : `${done} workouts this week`
  return (
    <Link
      to="/schedule"
      className="week-blooms block card px-3 pb-2 pt-3"
      aria-label={`${summary}. ${week.map((d) => `${d.letter}: ${MARK_WORDS[d.mark]}`).join(', ')}. Edit your week.`}
    >
      <div className="flex items-baseline justify-between px-1">
        <p className="font-bold">{summary}</p>
        <span className="text-sm font-semibold text-primary">Plan</span>
      </div>
      <ol className="mt-1 grid grid-cols-7">
        {week.map((day, i) => (
          <li key={day.weekday} className="flex flex-col items-center" aria-hidden>
            <svg
              viewBox="0 0 16 20"
              width="40"
              height="50"
              shapeRendering="crispEdges"
              className={day.mark === 'done' && day.isToday ? 'week-blooms__new' : ''}
            >
              <Plant mark={day.mark} count={day.count} petal={PETALS[i % PETALS.length]} />
              <Pot />
            </svg>
            <span
              className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                day.isToday ? 'bg-primary text-on-primary' : 'text-ink-muted'
              }`}
            >
              {day.letter}
            </span>
          </li>
        ))}
      </ol>
    </Link>
  )
}
