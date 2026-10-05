import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { speciesFor, type GardenSpecies } from '../../domain/progress/garden'
import { monthKey, monthRecapOffer, monthStartOf, recapOffer, weekKey, weekStartOf } from '../../domain/progress/recap'
import { db } from '../../infrastructure/db/schema'
import { readRecapSeen, readRecapSeenMonth } from '../recapSeen'
import { PixelBloom } from './PixelBloom'
import { TodayTile } from './TodayTiles'

type WeekOffer = { kind: 'week'; weekStart: string; workouts: number; species: GardenSpecies | null }
type MonthOffer = { kind: 'month'; monthKey: string; label: string; workouts: number; species: GardenSpecies | null }
type Offer = WeekOffer | MonthOffer

function monthLabelOf(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long' })
}

// Today's "Your week/month in bloom" card. On the first three days of a new
// month, a month card ("September in bloom") is offered once if last month
// had any finished workout and its recap hasn't been opened yet; that takes
// priority over the week card. Otherwise: Sunday tells the week now ending,
// Monday to Saturday the week just past (if it had a workout), each week
// until its recap has been opened. Renders nothing otherwise.
// `tile` renders it as one of Today's square swipe tiles instead.
export function RecapEntry({ tile = false }: { tile?: boolean } = {}) {
  const [offer, setOffer] = useState<Offer | null>(null)

  useEffect(() => {
    let cancelled = false
    db.sessionResults
      .toArray()
      .then((results) => {
        const now = new Date()

        const prevMonthStart = monthStartOf(new Date(now.getFullYear(), now.getMonth() - 1, 1))
        const prevMonthEnd = monthStartOf(now)
        const monthOf = (iso: string) => monthKey(monthStartOf(new Date(iso)))
        const previousMonthCount = results.filter((r) => {
          const t = new Date(r.endedAt).getTime()
          return t >= prevMonthStart.getTime() && t < prevMonthEnd.getTime()
        }).length
        const monthFound = monthRecapOffer(now, { previousMonth: previousMonthCount }, readRecapSeenMonth())
        if (monthFound && !cancelled) {
          const mine = results
            .filter((r) => monthOf(r.endedAt) === monthFound.monthKey)
            .sort((a, b) => a.endedAt.localeCompare(b.endedAt))
          const latest = mine[mine.length - 1]
          setOffer({
            kind: 'month',
            monthKey: monthFound.monthKey,
            label: monthLabelOf(monthFound.monthKey),
            workouts: mine.length,
            species: latest ? speciesFor(latest.sessionId) : null,
          })
          return
        }

        const thisWeek = weekStartOf(now)
        const lastWeek = new Date(thisWeek.getFullYear(), thisWeek.getMonth(), thisWeek.getDate() - 7)
        const weekOf = (iso: string) => weekKey(weekStartOf(new Date(iso)))
        const counts = {
          thisWeek: results.filter((r) => weekOf(r.endedAt) === weekKey(thisWeek)).length,
          lastWeek: results.filter((r) => weekOf(r.endedAt) === weekKey(lastWeek)).length,
          ever: results.length,
        }
        const found = recapOffer(now, counts, readRecapSeen())
        if (!found || cancelled) return
        const mine = results
          .filter((r) => weekOf(r.endedAt) === found.weekStart)
          .sort((a, b) => a.endedAt.localeCompare(b.endedAt))
        const latest = mine[mine.length - 1]
        setOffer({ kind: 'week', weekStart: found.weekStart, workouts: mine.length, species: latest ? speciesFor(latest.sessionId) : null })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  if (!offer) return null

  if (offer.kind === 'month') {
    const summary =
      offer.workouts === 0
        ? 'A restful month. Take a look back.'
        : `${offer.workouts} ${offer.workouts === 1 ? 'workout' : 'workouts'}, ${offer.workouts} ${
            offer.workouts === 1 ? 'flower' : 'flowers'
          } grown`
    if (tile)
      return (
        <TodayTile
          to={`/recap?month=${offer.monthKey}`}
          name={`${offer.label} in bloom. ${summary}`}
          short={offer.label}
          art={<PixelBloom species={offer.species ?? undefined} bloomed={offer.species != null} size={36} animate={false} />}
          value={`${offer.workouts}🌸`}
        />
      )
    return (
      <Link
        to={`/recap?month=${offer.monthKey}`}
        className="field-info flex min-h-11 items-center gap-3 px-4 py-3"
        aria-label={`${offer.label} in bloom. ${summary}`}
      >
        <PixelBloom species={offer.species ?? undefined} bloomed={offer.species != null} size={36} animate={false} />
        <span className="min-w-0 flex-1">
          <span className="block font-bold">{offer.label} in bloom</span>
          <span className="block text-sm text-ink-muted">{summary}</span>
        </span>
        <span aria-hidden="true" className="text-xl text-ink-muted">
          ›
        </span>
      </Link>
    )
  }

  const summary =
    offer.workouts === 0
      ? 'A restful week. Take a look back.'
      : `${offer.workouts} ${offer.workouts === 1 ? 'workout' : 'workouts'}, ${offer.workouts} ${
          offer.workouts === 1 ? 'flower' : 'flowers'
        } grown`
  if (tile)
    return (
      <TodayTile
        to={`/recap?week=${offer.weekStart}`}
        name={`Your week in bloom. ${summary}`}
        short="Your week"
        art={<PixelBloom species={offer.species ?? undefined} bloomed={offer.species != null} size={36} animate={false} />}
        value={`${offer.workouts}🌸`}
      />
    )
  return (
    <Link
      to={`/recap?week=${offer.weekStart}`}
      className="field-info flex min-h-11 items-center gap-3 px-4 py-3"
      aria-label={`Your week in bloom. ${summary}`}
    >
      <PixelBloom species={offer.species ?? undefined} bloomed={offer.species != null} size={36} animate={false} />
      <span className="min-w-0 flex-1">
        <span className="block font-bold">Your week in bloom</span>
        <span className="block text-sm text-ink-muted">{summary}</span>
      </span>
      <span aria-hidden="true" className="text-xl text-ink-muted">
        ›
      </span>
    </Link>
  )
}

// For Progress: the recap of the week so far (Monday shows last week), plus
// a second link to the month story. `compact` renders both as small square
// tiles (same accessible names) for the "Your collection" grid instead of
// two full-width rows.
export function RecapLink({ compact = false }: { compact?: boolean } = {}) {
  if (compact) {
    return (
      <>
        <Link
          to="/recap"
          aria-label="Your week in bloom"
          className="card flex min-h-11 flex-col items-center gap-1 p-3 text-center active:bg-field-primary"
        >
          <RecapGlyph />
          <span aria-hidden className="block font-bold">
            Week
          </span>
        </Link>
        <Link
          to={`/recap?month=${monthKey(monthStartOf(new Date()))}`}
          aria-label="Monthly recap"
          className="card flex min-h-11 flex-col items-center gap-1 p-3 text-center active:bg-field-primary"
        >
          <RecapGlyph />
          <span aria-hidden className="block font-bold">
            Month
          </span>
        </Link>
      </>
    )
  }

  return (
    <>
      <Link to="/recap" className="card flex min-h-11 items-center justify-between px-4 py-3">
        <span>
          <span className="block font-semibold">Your week in bloom</span>
          <span className="block text-sm text-ink-muted">Your week, story style</span>
        </span>
        <span aria-hidden="true" className="text-ink-muted">
          ›
        </span>
      </Link>
      <Link to={`/recap?month=${monthKey(monthStartOf(new Date()))}`} className="card flex min-h-11 items-center justify-between px-4 py-3">
        <span>
          <span className="block font-semibold">Monthly recap</span>
          <span className="block text-sm text-ink-muted">Your month, story style</span>
        </span>
        <span aria-hidden="true" className="text-ink-muted">
          ›
        </span>
      </Link>
    </>
  )
}

// A tiny book-like glyph for the compact recap tiles — just enough visual
// weight to tell the two tiles apart from plain text links, on the same
// pixel palette as the rest of Progress.
function RecapGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" width="28" height="28" shapeRendering="crispEdges">
      <rect x="2" y="3" width="12" height="10" rx="1" fill="var(--color-accent)" />
      <rect x="2" y="3" width="12" height="2" fill="var(--color-primary)" />
      <rect x="4" y="7" width="8" height="1" fill="var(--color-on-accent)" opacity="0.6" />
      <rect x="4" y="9" width="6" height="1" fill="var(--color-on-accent)" opacity="0.6" />
    </svg>
  )
}
