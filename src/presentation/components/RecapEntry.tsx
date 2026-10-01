import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { speciesFor, type GardenSpecies } from '../../domain/progress/garden'
import { recapOffer, weekKey, weekStartOf } from '../../domain/progress/recap'
import { db } from '../../infrastructure/db/schema'
import { readRecapSeen } from '../recapSeen'
import { PixelBloom } from './PixelBloom'

type Offer = { weekStart: string; workouts: number; species: GardenSpecies | null }

// Today's "Your week in bloom" card: Sunday tells the week now ending,
// Monday to Saturday the week just past (if it had a workout), each week
// until its recap has been opened. Renders nothing otherwise.
export function RecapEntry() {
  const [offer, setOffer] = useState<Offer | null>(null)

  useEffect(() => {
    let cancelled = false
    db.sessionResults
      .toArray()
      .then((results) => {
        const now = new Date()
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
        setOffer({ weekStart: found.weekStart, workouts: mine.length, species: latest ? speciesFor(latest.sessionId) : null })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  if (!offer) return null
  const summary =
    offer.workouts === 0
      ? 'A restful week. Take a look back.'
      : `${offer.workouts} ${offer.workouts === 1 ? 'workout' : 'workouts'}, ${offer.workouts} ${
          offer.workouts === 1 ? 'flower' : 'flowers'
        } grown`
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

// For Progress: the recap of the week so far (Monday shows last week).
export function RecapLink() {
  return (
    <Link to="/recap" className="card flex min-h-11 items-center justify-between px-4 py-3">
      <span>
        <span className="block font-semibold">Your week in bloom</span>
        <span className="block text-sm text-ink-muted">Your week, story style</span>
      </span>
      <span aria-hidden="true" className="text-ink-muted">
        ›
      </span>
    </Link>
  )
}
