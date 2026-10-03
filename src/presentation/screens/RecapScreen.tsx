import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { loadWeekGoals } from '../../infrastructure/db/repositories/weekGoalsRepository'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  buildMonthRecap,
  buildWeekRecap,
  defaultRecapWeek,
  parseMonthParam,
  parseWeekParam,
  type MonthRecap,
  type RecapBadge,
  type WeekRecap,
} from '../../domain/progress/recap'
import { RARITY_LABEL, speciesFor } from '../../domain/progress/garden'
import { monthGrid } from '../../domain/progress/monthGrid'
import type { PersonalRecord } from '../../domain/progress/types'
import { getAllSessionHistory } from '../../infrastructure/db/repositories/sessionRepository'
import { AchievementBadge, loadAchievements } from '../components/AchievementUnlocks'
import { useCountUp } from '../components/CountUp'
import { effectiveMotion, usePrefersReducedMotion } from '../components/MovementMedia'
import { PixelBloom } from '../components/PixelBloom'
import { RaeFace } from '../components/Rae'
import { Skeleton, SkeletonBlock, SkeletonHeading } from '../components/Skeleton'
import { useWeightUnit } from '../components/useWeightUnit'
import { useTheme } from '../theme/ThemeContext'
import { formatWeight, type WeightUnit } from '../units'
import { markRecapSeen, markRecapSeenMonth } from '../recapSeen'

// "Your week in bloom" (and its month-flavored sibling, "Your month in
// bloom"): a week or calendar month told back as a few full-screen story
// slides. Tap the right side for next, the left for back; press and hold to
// pause. Under full motion each slide advances on its own (~4s); reduced or
// off motion never auto-advances, so it is always the reader's pace.

const SLIDE_MS = 4000
const HOLD_MS = 250

type Slide = { id: string; label: string; body: ReactNode }

async function loadRecap(week: Date): Promise<WeekRecap> {
  const [history, achievements] = await Promise.all([getAllSessionHistory(), loadAchievements().catch(() => [])])
  const goals = await loadWeekGoals(history)
  return buildWeekRecap(history, achievements, goals, week)
}

async function loadMonthRecap(month: Date): Promise<MonthRecap> {
  const [history, achievements] = await Promise.all([getAllSessionHistory(), loadAchievements().catch(() => [])])
  return buildMonthRecap(history, achievements, month)
}

function rangeLabel(recap: WeekRecap): string {
  const fmt = (key: string) => {
    const [y, m, d] = key.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }
  return `${fmt(recap.weekStart)} – ${fmt(recap.weekEnd)}`
}

function monthLabel(recap: MonthRecap): string {
  return new Date(recap.year, recap.month, 1).toLocaleDateString(undefined, { month: 'long' })
}

function bestLabel(best: PersonalRecord, unit: WeightUnit): string {
  if (best.unit === 'seconds') return `${best.value}s`
  if (best.unit === 'kg') return `${best.reps ?? ''} × ${formatWeight(best.value, unit)}`.trim()
  return `${best.value} reps`
}

function BigNumber({ value, label }: { value: number; label: string }) {
  const shown = useCountUp(value, 900)
  return (
    <div className="text-center">
      <p className="hud-num text-7xl font-extrabold leading-none tabular-nums text-primary">{shown}</p>
      <p className="mt-1 text-lg font-semibold">{label}</p>
    </div>
  )
}

function WeekPips({ done, goal }: { done: number; goal: number }) {
  const total = Math.max(done, goal)
  return (
    <div className="flex flex-wrap justify-center gap-2" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`h-4 w-4 rounded-full border-2 ${
            i < done ? 'border-primary bg-primary' : 'border-[var(--color-border)] bg-surface'
          }`}
        />
      ))}
    </div>
  )
}

function buildSlides(recap: WeekRecap, unit: WeightUnit): Slide[] {
  const slides: Slide[] = []
  const workoutWord = recap.workouts === 1 ? 'workout' : 'workouts'

  slides.push({
    id: 'week',
    label: recap.quiet
      ? 'A quiet week. Rest weeks count too.'
      : `${recap.workouts} ${workoutWord} this week${recap.goalMet ? ', goal met' : ''}.`,
    body: (
      <div className="space-y-6 text-center">
        <p className="text-sm font-semibold text-ink-muted">{rangeLabel(recap)}</p>
        <h1 className="text-3xl font-extrabold">Your week in bloom</h1>
        {recap.quiet ? (
          <div className="space-y-3">
            <PixelBloom bloomed={false} size={96} animate={false} label="A sprout, resting" />
            <p className="text-xl font-bold">A quiet week</p>
            <p className="text-ink-muted">Rest weeks count too.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <BigNumber value={recap.workouts} label={workoutWord} />
            <WeekPips done={recap.workouts} goal={recap.goal} />
            <p className="text-lg font-bold">
              {recap.goalMet ? 'Goal met!' : `${recap.workouts} of ${recap.goal}. Every one counts.`}
            </p>
          </div>
        )}
      </div>
    ),
  })

  if (!recap.quiet) {
    slides.push({
      id: 'numbers',
      label: `${recap.sets} sets and ${recap.minutes} minutes of movement.`,
      body: (
        <div className="space-y-10">
          <BigNumber value={recap.sets} label={recap.sets === 1 ? 'set done' : 'sets done'} />
          <BigNumber value={recap.minutes} label={recap.minutes === 1 ? 'minute moving' : 'minutes moving'} />
        </div>
      ),
    })
  }

  if (recap.flowers.length > 0) {
    const rare = recap.flowers.filter((f) => f.species.rarity === 'rare' || f.species.rarity === 'legendary')
    slides.push({
      id: 'flowers',
      label: `${recap.flowers.length} flowers grew this week${
        recap.newSpecies.length ? `, new: ${recap.newSpecies.map((s) => s.name).join(', ')}` : ''
      }.`,
      body: (
        <div className="space-y-5 text-center">
          <h2 className="text-2xl font-extrabold">
            {recap.flowers.length} {recap.flowers.length === 1 ? 'flower' : 'flowers'} grew
          </h2>
          <ul className="flex flex-wrap justify-center gap-3">
            {recap.flowers.map((f) => (
              <li key={f.sessionId} className="flex w-20 flex-col items-center gap-1">
                <PixelBloom species={f.species} size={56} animate={false} label={f.species.name} />
                <span className="text-xs font-semibold leading-tight">{f.species.name}</span>
              </li>
            ))}
          </ul>
          {rare.length > 0 && (
            <p className="inline-block rounded-full bg-field-notice px-3 py-1 text-sm font-bold">
              {rare.length === 1 ? `A rare ${rare[0].species.name}!` : `${rare.length} rare flowers!`}
            </p>
          )}
          {recap.newSpecies.length > 0 && (
            <p className="font-semibold">New to your garden: {recap.newSpecies.map((s) => s.name).join(', ')}</p>
          )}
        </div>
      ),
    })
  }

  const wins = buildWinsSlide(recap.badges, recap.bests, unit, "This week's wins")
  if (wins) slides.push(wins)

  slides.push(signOffSlide(recap.signOff, recap.quiet, recap.flowers.length > 0))

  return slides
}

// Shared by both the week and month stories: the badges unlocked and new
// bests beaten, when there are any.
function buildWinsSlide(badges: RecapBadge[], bests: PersonalRecord[], unit: WeightUnit, heading: string): Slide | null {
  if (badges.length === 0 && bests.length === 0) return null
  return {
    id: 'wins',
    label: [
      badges.length ? `Badges: ${badges.map((b) => b.title).join(', ')}.` : '',
      bests.length ? `New bests: ${bests.map((b) => b.exerciseName).join(', ')}.` : '',
    ]
      .filter(Boolean)
      .join(' '),
    body: (
      <div className="space-y-6 text-center">
        <h2 className="text-2xl font-extrabold">{heading}</h2>
        {badges.length > 0 && (
          <ul className="flex flex-wrap justify-center gap-4">
            {badges.map((b) => (
              <li key={b.id} className="flex w-24 flex-col items-center gap-1">
                <AchievementBadge icon={b.icon} size={56} />
                <span className="text-sm font-bold leading-tight">{b.title}</span>
              </li>
            ))}
          </ul>
        )}
        {bests.length > 0 && (
          <ul className="space-y-2">
            {bests.map((b) => (
              <li key={b.exerciseId} className="rounded-panel bg-surface px-4 py-2 font-semibold">
                New best: {b.exerciseName}, {bestLabel(b, unit)}
              </li>
            ))}
          </ul>
        )}
      </div>
    ),
  }
}

// Shared by both the week and month stories: Rae's sign-off.
function signOffSlide(signOff: string, quiet: boolean, hasGardenLink: boolean): Slide {
  return {
    id: 'signoff',
    label: signOff,
    body: (
      <div className="space-y-5 text-center">
        <div className="flex justify-center">
          <RaeFace expression={quiet ? 'smile' : 'laugh'} size={120} />
        </div>
        <p className="text-2xl font-extrabold leading-snug">{signOff}</p>
        {hasGardenLink && (
          <Link to="/garden" className="pointer-events-auto btn-secondary inline-flex min-h-11 items-center">
            See your garden
          </Link>
        )}
      </div>
    ),
  }
}

// A small, non-interactive calendar of this month's flowers: one coloured
// dot per day with a finished workout, reusing the same monthGrid domain
// helper Progress's MonthBlooms is built on.
function MonthCalendar({ recap }: { recap: MonthRecap }) {
  const grid = useMemo(() => monthGrid({ year: recap.year, month: recap.month }, recap.flowers, new Date()), [recap])
  return (
    <div aria-hidden="true" className="mx-auto max-w-[240px]">
      <div className="grid grid-cols-7 gap-1.5">
        {grid.weeks.flat().map((cell) => {
          if (!cell.inMonth) return <span key={cell.key} />
          const done = cell.sessions.length > 0
          const species = done ? speciesFor(cell.sessions[0].sessionId) : null
          return (
            <span
              key={cell.key}
              className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold"
              style={species ? { backgroundColor: species.petal, color: species.centerDark } : undefined}
            >
              {species ? '' : cell.day}
            </span>
          )
        })}
      </div>
    </div>
  )
}

function buildMonthSlides(recap: MonthRecap, unit: WeightUnit): Slide[] {
  const slides: Slide[] = []
  const workoutWord = recap.workouts === 1 ? 'workout' : 'workouts'
  const title = monthLabel(recap)

  slides.push({
    id: 'month',
    label: recap.quiet ? `A quiet ${title}. Rest months count too.` : `${recap.workouts} ${workoutWord} in ${title}.`,
    body: (
      <div className="space-y-6 text-center">
        <p className="text-sm font-semibold text-ink-muted">{recap.year}</p>
        <h1 className="text-3xl font-extrabold">{title} in bloom</h1>
        {recap.quiet ? (
          <div className="space-y-3">
            <PixelBloom bloomed={false} size={96} animate={false} label="A sprout, resting" />
            <p className="text-xl font-bold">A quiet month</p>
            <p className="text-ink-muted">Rest months count too.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <BigNumber value={recap.workouts} label={workoutWord} />
            {recap.longestWeekStreak > 1 && <p className="text-lg font-bold">{recap.longestWeekStreak}-week streak</p>}
          </div>
        )}
      </div>
    ),
  })

  if (!recap.quiet) {
    slides.push({
      id: 'numbers',
      label: `${recap.sets} sets and ${recap.minutes} minutes of movement.`,
      body: (
        <div className="space-y-10">
          <BigNumber value={recap.sets} label={recap.sets === 1 ? 'set done' : 'sets done'} />
          <BigNumber value={recap.minutes} label={recap.minutes === 1 ? 'minute moving' : 'minutes moving'} />
        </div>
      ),
    })
  }

  if (recap.flowers.length > 0) {
    slides.push({
      id: 'calendar',
      label: `${recap.flowers.length} days in bloom this month${
        recap.newSpecies.length ? `, new: ${recap.newSpecies.map((s) => s.name).join(', ')}` : ''
      }.`,
      body: (
        <div className="space-y-5 text-center">
          <h2 className="text-2xl font-extrabold">{title} at a glance</h2>
          <MonthCalendar recap={recap} />
          <p className="font-semibold">
            {recap.flowers.length} {recap.flowers.length === 1 ? 'flower' : 'flowers'} grew
          </p>
          {recap.newSpecies.length > 0 && (
            <p className="font-semibold">New to your garden: {recap.newSpecies.map((s) => s.name).join(', ')}</p>
          )}
        </div>
      ),
    })
  }

  if (recap.topWeekday) {
    slides.push({
      id: 'topday',
      label: `Your top day: ${recap.topWeekday.label}.`,
      body: (
        <div className="space-y-4 text-center">
          <h2 className="text-2xl font-extrabold">Your top day</h2>
          <p className="text-4xl font-extrabold text-primary">{recap.topWeekday.label}</p>
          <p className="text-ink-muted">
            {recap.topWeekday.count} {recap.topWeekday.count === 1 ? 'workout' : 'workouts'}
          </p>
        </div>
      ),
    })
  }

  if (recap.rarestFlower) {
    const rarest = recap.rarestFlower
    slides.push({
      id: 'rarest',
      label: `Your rarest flower: ${rarest.species.name}.`,
      body: (
        <div className="space-y-4 text-center">
          <h2 className="text-2xl font-extrabold">Rarest bloom</h2>
          <div className="flex justify-center">
            <PixelBloom species={rarest.species} size={96} animate={false} label={rarest.species.name} />
          </div>
          <p className="text-xl font-bold">{rarest.species.name}</p>
          {rarest.species.rarity !== 'common' && (
            <p className="inline-block rounded-full bg-field-notice px-3 py-1 text-sm font-bold">{RARITY_LABEL[rarest.species.rarity]}</p>
          )}
        </div>
      ),
    })
  }

  const wins = buildWinsSlide(recap.badges, recap.bests, unit, "This month's wins")
  if (wins) slides.push(wins)

  slides.push(signOffSlide(recap.signOff, recap.quiet, recap.flowers.length > 0))

  return slides
}

export function RecapScreen() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const month = useMemo(() => parseMonthParam(params.get('month')), [params])
  const week = useMemo(() => (month ? null : parseWeekParam(params.get('week')) ?? defaultRecapWeek(new Date())), [params, month])
  const [recap, setRecap] = useState<WeekRecap | null>(null)
  const [monthRecap, setMonthRecap] = useState<MonthRecap | null>(null)
  const [failed, setFailed] = useState(false)
  const [unit] = useWeightUnit()
  const { motion } = useTheme()
  const osReduced = usePrefersReducedMotion()
  const autoAdvance = effectiveMotion(motion, osReduced) === 'full'

  useEffect(() => {
    let cancelled = false
    if (month) {
      loadMonthRecap(month)
        .then((r) => {
          if (cancelled) return
          setMonthRecap(r)
          markRecapSeenMonth(r.monthKey)
        })
        .catch(() => !cancelled && setFailed(true))
    } else if (week) {
      loadRecap(week)
        .then((r) => {
          if (cancelled) return
          setRecap(r)
          markRecapSeen(r.weekStart)
        })
        .catch(() => !cancelled && setFailed(true))
    }
    return () => {
      cancelled = true
    }
  }, [month, week])

  const close = useCallback(() => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (idx > 0) navigate(-1)
    else navigate('/')
  }, [navigate])

  if (failed) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="font-bold">Couldn't load your {month ? 'month' : 'week'}.</p>
        <button type="button" className="btn-primary min-h-11" onClick={close}>
          Close
        </button>
      </div>
    )
  }
  const data = month ? monthRecap : recap
  if (!data) {
    return (
      <Skeleton className="space-y-6 p-6 pt-16">
        <SkeletonHeading />
        <SkeletonBlock className="mx-auto h-40 w-40 rounded-full" />
        <SkeletonBlock className="h-10 rounded-panel" />
      </Skeleton>
    )
  }
  const slides = month ? buildMonthSlides(monthRecap!, unit) : buildSlides(recap!, unit)
  return <Story slides={slides} autoAdvance={autoAdvance} onClose={close} closeLabel={month ? 'Close your month' : 'Close your week'} />
}

function Story({
  slides,
  autoAdvance,
  onClose,
  closeLabel,
}: {
  slides: Slide[]
  autoAdvance: boolean
  onClose: () => void
  closeLabel: string
}) {
  const [index, setIndex] = useState(0)
  const [progress, setProgress] = useState(0) // 0..1 of the current slide
  const [paused, setPaused] = useState(false)
  const progressRef = useRef(0)
  const holdStart = useRef<number | null>(null)
  const suppressTap = useRef(false)
  const last = slides.length - 1

  const go = useCallback(
    (delta: number) => {
      setIndex((i) => Math.min(last, Math.max(0, i + delta)))
      progressRef.current = 0
      setProgress(0)
    },
    [last]
  )

  // Auto-advance with a frame clock that honours pause and a hidden tab.
  useEffect(() => {
    if (!autoAdvance || paused || index >= last) return
    let frame = 0
    let prev = performance.now()
    let p = progressRef.current
    const tick = (now: number) => {
      const dt = document.hidden ? 0 : now - prev
      prev = now
      p += dt / SLIDE_MS
      if (p >= 1) {
        progressRef.current = 0
        setProgress(0)
        setIndex((i) => Math.min(last, i + 1))
        return
      }
      progressRef.current = p
      setProgress(p)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [autoAdvance, paused, index, last])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
      else if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, onClose])

  const pressStart = () => {
    holdStart.current = performance.now()
    suppressTap.current = false
    setPaused(true)
  }
  const pressEnd = () => {
    if (holdStart.current != null && performance.now() - holdStart.current > HOLD_MS) suppressTap.current = true
    holdStart.current = null
    setPaused(false)
  }
  const tap = (delta: number) => {
    if (suppressTap.current) {
      suppressTap.current = false
      return
    }
    go(delta)
  }

  const slide = slides[index]
  return (
    <div className="recap-story relative flex min-h-[100dvh] flex-col overflow-hidden bg-gradient-to-b from-field-info to-field-primary">
      <style>{RECAP_CSS}</style>
      <div className="relative z-20 flex items-center gap-2 px-3 pt-3">
        <div className="flex flex-1 gap-1" aria-hidden="true">
          {slides.map((s, i) => (
            <span key={s.id} className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/60">
              <span
                className="block h-full rounded-full bg-primary"
                style={{ width: `${i < index ? 100 : i === index ? (autoAdvance ? progress * 100 : 100) : 0}%` }}
              />
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className="flex h-11 w-11 items-center justify-center rounded-full text-2xl font-bold"
        >
          ×
        </button>
      </div>
      <p className="sr-only" aria-live="polite">
        {`Slide ${index + 1} of ${slides.length}. ${slide.label}`}
      </p>

      {/* Tap zones sit under the content; only links/buttons in a slide take taps. */}
      <button
        type="button"
        aria-label="Previous"
        disabled={index === 0}
        className="absolute inset-y-0 left-0 z-0 w-1/3"
        onPointerDown={pressStart}
        onPointerUp={pressEnd}
        onPointerLeave={() => holdStart.current != null && pressEnd()}
        onClick={() => tap(-1)}
      />
      <button
        type="button"
        aria-label="Next"
        disabled={index === last}
        className="absolute inset-y-0 right-0 z-0 w-2/3"
        onPointerDown={pressStart}
        onPointerUp={pressEnd}
        onPointerLeave={() => holdStart.current != null && pressEnd()}
        onClick={() => tap(1)}
      />

      <div key={slide.id} className="recap-slide pointer-events-none relative z-10 flex flex-1 items-center justify-center px-6 pb-16">
        <div className="w-full max-w-sm">{slide.body}</div>
      </div>

      {index === last && (
        <div className="relative z-20 px-6 pb-8" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
          <button type="button" className="btn-primary btn-lg w-full" onClick={onClose}>
            Done
          </button>
        </div>
      )}
    </div>
  )
}

const RECAP_CSS = `
.recap-slide { animation: recap-in 320ms ease-out both; }
@keyframes recap-in { from { opacity: 0; margin-top: 16px; } to { opacity: 1; margin-top: 0; } }
:root[data-motion='reduced'] .recap-slide { animation: recap-fade 200ms ease-out both; }
:root[data-motion='off'] .recap-slide { animation: none; }
@keyframes recap-fade { from { opacity: 0; } to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .recap-slide { animation: recap-fade 200ms ease-out both; } }
`
