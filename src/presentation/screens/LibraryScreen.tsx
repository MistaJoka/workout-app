import { TileRow, TodayTile } from '../components/TodayTiles'
import { uniqueByLoop } from '../libraryRows'
import { estimateMinutes } from '../../domain/content/workoutEstimate'
import { countLabel } from '../format'
import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getExercises, loadLibrary } from '../../domain/content/catalog'
import { listHearts } from '../../infrastructure/db/repositories/favoritesRepository'
import { EQUIPMENT_FILTER_OPTIONS, MUSCLE_GROUPS, exerciseMeta, filterExercises, isShownNow, orderForBrowsing, type LibraryFilters } from '../../domain/content/library'
import type { Exercise } from '../../domain/content/types'
import { foundationStrengthStarterTemplates } from '../../domain/content/fixtures/foundationStrengthStarter'
import { listCustomTemplates } from '../../infrastructure/db/repositories/customTemplateRepository'
import type { WorkoutTemplate } from '../../domain/content/types'
import { FilterSheet } from '../components/FilterSheet'
import { ExerciseThumb } from '../components/ExerciseThumb'
import { RaeNote } from '../components/RaeNote'
import { RAE_LOOPS, raeLoopForExercise, raeStillFor } from '../components/raeLoops'
import { DRAFT_TEMPLATE_IDS } from '../../domain/content/fixtures/raeDraftTemplates'
import { Skeleton, SkeletonList } from '../components/Skeleton'

const PAGE = 40
const LEVELS = ['beginner', 'intermediate', 'expert'] as const

function hasRaeLoop(exerciseId: string): boolean {
  return raeLoopForExercise(exerciseId) !== undefined
}

export function LibraryScreen() {
  const [library, setLibrary] = useState<Exercise[] | null>(null)
  const [custom, setCustom] = useState<WorkoutTemplate[]>([])
  const [filters, setFilters] = useState<LibraryFilters>({})
  const [limit, setLimit] = useState(PAGE)
  const [loadFailed, setLoadFailed] = useState(false)
  const [heartedMoves, setHeartedMoves] = useState<Exercise[]>([])
  const [heartOnly, setHeartOnly] = useState(false)
  const hearted = useMemo(() => new Set(heartedMoves.map((e) => e.id)), [heartedMoves])

  useEffect(() => {
    loadLibrary()
      .then((all) => setLibrary(all.filter(isShownNow)))
      .catch(() => setLoadFailed(true))
    listCustomTemplates()
      .then(setCustom)
      .catch(() => setCustom([]))
    // Hearted moves resolve on their own: the starter moves (Plank, Squat...)
    // live outside the discovery library, and hearts can include them.
    listHearts()
      .then((hearts) => getExercises(hearts.map((h) => h.exerciseId)))
      .then((found) => setHeartedMoves([...found.values()].filter(isShownNow)))
      .catch(() => setHeartedMoves([]))
  }, [])

  // Only levels the library actually has: an empty chip is a dead end.
  const levels = useMemo(
    () => LEVELS.filter((l) => library?.some((e) => e.taxonomy.level === l)),
    [library]
  )

  // Filtering the library is deferred so the keystroke paints first and the
  // list catches up; the input itself stays bound to the live filters.
  const deferredFilters = useDeferredValue(filters)
  const [raeOnly, setRaeOnly] = useState(false)
  // Moves Rae demonstrates lead the list (orderForBrowsing); "Rae demos"
  // narrows to just those.
  const source = heartOnly ? heartedMoves : library
  const matched = useMemo(
    () => (source ? orderForBrowsing(filterExercises(source, deferredFilters), hasRaeLoop, deferredFilters.query) : []),
    [source, deferredFilters]
  )
  const raeCount = useMemo(() => matched.filter((e) => hasRaeLoop(e.id)).length, [matched])
  const results = useMemo(() => (raeOnly ? matched.filter((e) => hasRaeLoop(e.id)) : matched), [matched, raeOnly])
  const filtering = Boolean(filters.query || filters.muscle || filters.equipment || filters.level || raeOnly || heartOnly)
  // The moves Rae demonstrates herself (the curated starter set, which
  // lives outside the discovery library), leading the page when you're
  // browsing rather than searching.
  const [raeMoves, setRaeMoves] = useState<Exercise[]>([])
  useEffect(() => {
    // Featured loops only: the precached, workout-ready set. RAE_LOOPS
    // grows toward the whole library; those moves show Rae in the list
    // below instead of all crowding this row.
    const featured = RAE_LOOPS.filter((loop) => 'featured' in loop && loop.featured)
    getExercises(featured.flatMap((loop) => loop.exerciseIds)).then((found) =>
      setRaeMoves(uniqueByLoop([...found.values()], (id) => raeLoopForExercise(id)?.id))
    )
  }, [])

  function toggle<K extends keyof LibraryFilters>(key: K, value: LibraryFilters[K]) {
    setLimit(PAGE)
    setFilters((f) => ({ ...f, [key]: f[key] === value ? undefined : value }))
  }

  return (
    <div className="p-4 pb-20 space-y-4">
      <h1 className="text-xl font-bold">Library</h1>

      {!filtering && (
        <section className="space-y-2">
          <p className="text-sm font-semibold text-ink-muted">Routines</p>
          {/* Each routine is its moves, shown as Rae, not a count; "+ New"
              sits at the end of the row it adds to. */}
          <TileRow label="Routines">
            {[...foundationStrengthStarterTemplates, ...custom].map((template) => {
              const draft = DRAFT_TEMPLATE_IDS.has(template.id)
              const stills = template.exercises
                .map((e) => raeStillFor(e.exerciseId))
                .filter((still): still is { src: string; alt: string } => still !== null)
                .slice(0, 3)
              return (
                <TodayTile
                  key={template.id}
                  to={`/routines/${template.id}`}
                  name={`${template.name}, ${countLabel(template.exercises.length, 'exercise')}${draft ? ', draft' : ''}`}
                  short={template.name}
                  art={
                    stills.length > 0 ? (
                      <span className="flex -space-x-5">
                        {stills.map((still) => (
                          <img key={still.src} src={still.src} alt="" className="h-12 w-9 object-contain pixelated" />
                        ))}
                      </span>
                    ) : (
                      <span className="text-3xl">🌸</span>
                    )
                  }
                  value={draft ? 'Draft' : `⏱${estimateMinutes(template)}`}
                />
              )
            })}
            <TodayTile to="/routines/new" name="New routine" short="New" art={<span className="text-3xl">+</span>} />
          </TileRow>
        </section>
      )}

      {!filtering && raeMoves.length > 0 && (
        <section className="space-y-2" aria-label="Moves Rae shows you">
          <p className="text-sm font-semibold text-ink-muted" aria-hidden>
            Moves Rae shows you
          </p>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {raeMoves.map((exercise) => (
              <Link
                key={exercise.id}
                to={`/exercise/${exercise.id}`}
                className="card flex w-28 flex-none flex-col items-center gap-1 p-2 text-center"
              >
                <ExerciseThumb exercise={exercise} className="h-24 w-24 rounded-panel" />
                <span className="line-clamp-2 text-xs font-semibold leading-tight">{exercise.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-2">
        <p className="text-sm font-semibold text-ink-muted">Exercises</p>
        {/* Search and filters share one row that sticks while the list
            scrolls, so narrowing never needs a trip back to the top. */}
        <div className="sticky top-0 z-10 -mx-4 flex items-center gap-2 bg-bg px-4 py-2">
          <input
            type="search"
            inputMode="search"
            placeholder="Search exercises"
            value={filters.query ?? ''}
            onChange={(e) => {
              setLimit(PAGE)
              setFilters((f) => ({ ...f, query: e.target.value || undefined }))
            }}
            className="input min-w-0 flex-1"
          />
          <FilterSheet inline activeCount={[filters.muscle, filters.equipment, filters.level].filter(Boolean).length}>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-ink-muted">Muscle</p>
              <ChipRow>
                {MUSCLE_GROUPS.map((g) => (
                  <Chip key={g.id} active={filters.muscle === g.id} onClick={() => toggle('muscle', g.id)}>
                    {g.label}
                  </Chip>
                ))}
              </ChipRow>
            </div>
            {EQUIPMENT_FILTER_OPTIONS.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-ink-muted">Equipment</p>
                <ChipRow>
                  {EQUIPMENT_FILTER_OPTIONS.map((o) => (
                    <Chip key={o.id} active={filters.equipment === o.id} onClick={() => toggle('equipment', o.id)}>
                      {o.label}
                    </Chip>
                  ))}
                </ChipRow>
              </div>
            )}
            <div className="space-y-2">
              <p className="text-sm font-semibold text-ink-muted">Level</p>
              <ChipRow>
                {levels.map((l) => (
                  <Chip key={l} active={filters.level === l} onClick={() => toggle('level', l)}>
                    {l[0].toUpperCase() + l.slice(1)}
                  </Chip>
                ))}
              </ChipRow>
            </div>
          </FilterSheet>
        </div>

        {library === null && !loadFailed && (
          <Skeleton label="Loading library">
            <SkeletonList rows={6} thumb />
          </Skeleton>
        )}
        {loadFailed && (
          <RaeNote expression="surprised">The full library isn't saved on this phone yet. Open it once while online.</RaeNote>
        )}
        {library && (
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-ink-muted">{countLabel(results.length, 'exercise')}</p>
            <span className="flex gap-2">
            {hearted.size > 0 && (
              <button
                type="button"
                aria-pressed={heartOnly}
                aria-label={`Hearted moves only, ${hearted.size}`}
                onClick={() => {
                  setLimit(PAGE)
                  setHeartOnly((on) => !on)
                }}
                className={`chip ${heartOnly ? 'chip-active' : ''}`}
              >
                ♥ {hearted.size}
              </button>
            )}
            {raeCount > 0 && (
              <button
                type="button"
                aria-pressed={raeOnly}
                onClick={() => {
                  setLimit(PAGE)
                  setRaeOnly((on) => !on)
                }}
                className={`chip ${raeOnly ? 'chip-active' : ''}`}
              >
                Rae demos ({raeCount})
              </button>
            )}
            </span>
          </div>
        )}
        {library && results.length === 0 && (
          <RaeNote expression="surprised">Nothing matches that. Try a shorter search or fewer filters.</RaeNote>
        )}
        <ul className="space-y-2">
          {results.slice(0, limit).map((exercise) => (
            <li key={exercise.id} className="[content-visibility:auto] [contain-intrinsic-size:auto_76px]">
              <Link
                to={`/exercise/${exercise.id}`}
                className="flex items-center gap-3 card p-2"
              >
                <ExerciseThumb exercise={exercise} className="h-14 w-20 rounded-panel" />
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {exercise.name}
                    {hearted.has(exercise.id) && (
                      <span className="sr-only">, hearted</span>
                    )}
                    {hearted.has(exercise.id) && (
                      <span aria-hidden="true" className="ml-1 text-primary">
                        ♥
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-ink-muted">{exerciseMeta(exercise).join(', ')}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
        {results.length > limit && (
          <button
            className="btn-secondary w-full"
            onClick={() => setLimit((n) => n + PAGE)}
          >
            Show more
          </button>
        )}
      </section>
    </div>
  )
}

function ChipRow({ children }: { children: React.ReactNode }) {
  return <div className="flex gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">{children}</div>
}

export function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`chip ${active ? 'chip-active' : ''}`}
    >
      {children}
    </button>
  )
}
