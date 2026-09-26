import { countLabel } from '../format'
import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { loadLibrary } from '../../domain/content/catalog'
import { EQUIPMENT_OPTIONS, MUSCLE_GROUPS, filterExercises, type LibraryFilters } from '../../domain/content/library'
import type { Exercise } from '../../domain/content/types'
import { foundationStrengthStarterTemplates } from '../../domain/content/fixtures/foundationStrengthStarter'
import { listCustomTemplates } from '../../infrastructure/db/repositories/customTemplateRepository'
import type { WorkoutTemplate } from '../../domain/content/types'
import { FilterSheet } from '../components/FilterSheet'

const PAGE = 40

export function LibraryScreen() {
  const [library, setLibrary] = useState<Exercise[] | null>(null)
  const [custom, setCustom] = useState<WorkoutTemplate[]>([])
  const [filters, setFilters] = useState<LibraryFilters>({})
  const [limit, setLimit] = useState(PAGE)

  useEffect(() => {
    loadLibrary().then(setLibrary)
    listCustomTemplates().then(setCustom)
  }, [])

  // Filtering the library is deferred so the keystroke paints first and the
  // list catches up; the input itself stays bound to the live filters.
  const deferredFilters = useDeferredValue(filters)
  const results = useMemo(
    () => (library ? filterExercises(library, deferredFilters) : []),
    [library, deferredFilters]
  )
  const filtering = Boolean(filters.query || filters.muscle || filters.equipment || filters.level)

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
          {[...foundationStrengthStarterTemplates, ...custom].map((template) => (
            <Link
              key={template.id}
              to={`/routines/${template.id}`}
              className="flex items-center justify-between card px-4 py-3"
            >
              <span className="font-semibold">{template.name}</span>
              <span className="text-sm text-ink-muted">{countLabel(template.exercises.length, 'exercise')}</span>
            </Link>
          ))}
          {/* Sits with the routines it adds to, not in the header corner:
              the top right is the hardest reach, and this is rarely used. */}
          <Link to="/routines/new" className="btn-secondary w-full">
            + New routine
          </Link>
        </section>
      )}

      <section className="space-y-2">
        <p className="text-sm font-semibold text-ink-muted">Exercises</p>
        <input
          type="search"
          inputMode="search"
          placeholder="Search exercises"
          value={filters.query ?? ''}
          onChange={(e) => {
            setLimit(PAGE)
            setFilters((f) => ({ ...f, query: e.target.value || undefined }))
          }}
          className="input"
        />
        <FilterSheet activeCount={[filters.muscle, filters.equipment, filters.level].filter(Boolean).length}>
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
          <div className="space-y-2">
            <p className="text-sm font-semibold text-ink-muted">Equipment</p>
            <ChipRow>
              {EQUIPMENT_OPTIONS.map((o) => (
                <Chip key={o.id} active={filters.equipment === o.id} onClick={() => toggle('equipment', o.id)}>
                  {o.label}
                </Chip>
              ))}
            </ChipRow>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-ink-muted">Level</p>
            <ChipRow>
              {(['beginner', 'intermediate', 'expert'] as const).map((l) => (
                <Chip key={l} active={filters.level === l} onClick={() => toggle('level', l)}>
                  {l[0].toUpperCase() + l.slice(1)}
                </Chip>
              ))}
            </ChipRow>
          </div>
        </FilterSheet>

        {library === null && <p className="text-ink-muted">Loading library…</p>}
        {library && (
          <p className="text-xs text-ink-muted">
            {countLabel(results.length, 'exercise')}
          </p>
        )}
        <ul className="space-y-2">
          {results.slice(0, limit).map((exercise) => (
            <li key={exercise.id} className="[content-visibility:auto] [contain-intrinsic-size:auto_76px]">
              <Link
                to={`/exercise/${exercise.id}`}
                className="flex items-center gap-3 card p-2"
              >
                {exercise.mediaManifest.start ? (
                  <img
                    src={exercise.mediaManifest.start}
                    alt=""
                    loading="lazy"
                    className="h-14 w-20 flex-none rounded-panel object-cover"
                  />
                ) : (
                  <div className="h-14 w-20 flex-none rounded-panel bg-bg" />
                )}
                <div className="min-w-0">
                  <p className="truncate font-semibold">{exercise.name}</p>
                  <p className="truncate text-xs text-ink-muted">
                    {[exercise.taxonomy.primaryMuscles?.[0], exercise.taxonomy.equipment[0], exercise.taxonomy.level]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
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
