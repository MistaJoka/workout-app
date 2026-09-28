import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { getExercises, getTemplate, loadLibrary } from '../../domain/content/catalog'
import { filterExercises, isShownNow, MUSCLE_GROUPS, EQUIPMENT_FILTER_OPTIONS } from '../../domain/content/library'
import type { Exercise, WorkoutTemplate, WorkoutTemplateExercise } from '../../domain/content/types'
import {
  isCustomTemplateId,
  newCustomTemplateId,
  saveCustomTemplate,
} from '../../infrastructure/db/repositories/customTemplateRepository'
import { Chip } from './LibraryScreen'
import { buildEditRows, type EditRow } from './routineBuilderRows'
import { FilterSheet } from '../components/FilterSheet'
import { kgToUnit, roundToStep, stepInUnit, unitToKg } from '../units'
import { useWeightUnit } from '../components/useWeightUnit'
import { BackButton } from '../components/BackButton'
import { RaeNote } from '../components/RaeNote'
import { ExerciseThumb } from '../components/ExerciseThumb'
import { ThumbBar } from '../components/ThumbBar'
import { ConfirmSheet } from '../components/ConfirmSheet'

type Row = EditRow

const PICKER_PAGE = 40
const UNDO_MS = 5_000
// Row control: a 44px square, the minimum comfortable tap target.
const ROW_BTN = 'inline-flex h-11 w-11 flex-none items-center justify-center rounded-control text-lg text-ink-muted active:bg-field-primary'

function snapshot(name: string, rows: Row[]): string {
  return JSON.stringify([name.trim(), rows.map(({ exercise: _exercise, ...rest }) => rest)])
}

function defaultRow(exercise: Exercise): Row {
  const timed = !exercise.prescriptionCapabilities.reps
  const weighted = exercise.prescriptionCapabilities.weight === true
  return {
    exerciseId: exercise.id,
    exercise,
    sets: 3,
    reps: timed ? undefined : 10,
    timeSeconds: timed ? 30 : undefined,
    restSeconds: weighted ? 90 : 60,
    // Start unloaded: the library is home-friendly, and a made-up load
    // (it used to be 20 kg) is worse than the lifter dialling in their own.
    ...(weighted ? { weightKg: 0 } : {}),
  }
}

export function RoutineBuilderScreen() {
  const { templateId } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const editingId = templateId && isCustomTemplateId(templateId) ? templateId : null

  const [name, setName] = useState('')
  const [rows, setRows] = useState<Row[]>([])
  const [loaded, setLoaded] = useState(!editingId && !params.get('add'))
  const [picking, setPicking] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [removed, setRemoved] = useState<{ row: Row; index: number } | null>(null)
  const [confirmingLeave, setConfirmingLeave] = useState<(() => void) | null>(null)
  // What was on screen right after loading; anything else is unsaved.
  const [baseline, setBaseline] = useState<string | null>(null)
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [unit] = useWeightUnit()

  useEffect(() => {
    let cancelled = false
    async function init() {
      let loadedName = ''
      let loadedRows: Row[] = []
      if (editingId) {
        const template = await getTemplate(editingId)
        if (template && !cancelled) {
          const exercises = await getExercises(template.exercises.map((e) => e.exerciseId))
          loadedName = template.name
          loadedRows = buildEditRows(template, exercises)
          setName(loadedName)
          setRows(loadedRows)
        }
      }
      // The routine as stored is the baseline; an exercise added from the
      // library (?add=) is itself an unsaved change.
      if (!cancelled) setBaseline(snapshot(loadedName, loadedRows))
      const add = params.get('add')
      if (add) {
        const exercise = (await getExercises([add])).get(add)
        if (exercise && !cancelled) setRows((r) => (r.some((x) => x.exerciseId === add) ? r : [...r, defaultRow(exercise)]))
      }
    }
    init()
      .catch(() => {
        if (!cancelled) setError("Couldn't load this routine. Go back and try again.")
      })
      .finally(() => {
        if (!cancelled) setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [editingId, params])

  useEffect(() => () => {
    if (undoTimer.current) clearTimeout(undoTimer.current)
  }, [])

  function remove(index: number) {
    setRows((r) => {
      const row = r[index]
      if (row) setRemoved({ row, index })
      return r.filter((_, i) => i !== index)
    })
    if (undoTimer.current) clearTimeout(undoTimer.current)
    undoTimer.current = setTimeout(() => setRemoved(null), UNDO_MS)
  }

  function undoRemove() {
    if (!removed) return
    setRows((r) => [...r.slice(0, removed.index), removed.row, ...r.slice(removed.index)])
    setRemoved(null)
    if (undoTimer.current) clearTimeout(undoTimer.current)
  }

  const dirty = baseline !== null && snapshot(name, rows) !== baseline

  function update(index: number, patch: Partial<Row>) {
    setRows((r) => r.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  function move(index: number, delta: number) {
    setRows((r) => {
      const next = [...r]
      const target = index + delta
      if (target < 0 || target >= next.length) return r
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  async function handleSave() {
    if (!name.trim() || rows.length === 0) return
    setSaving(true)
    setError(null)
    const id = editingId ?? newCustomTemplateId()
    const template: WorkoutTemplate = {
      id,
      version: 1,
      name: name.trim(),
      packId: 'custom',
      exercises: rows.map<WorkoutTemplateExercise>((row, order) => ({
        exerciseId: row.exerciseId,
        exerciseVersion: 1,
        prescription: {
          sets: row.sets,
          ...(row.reps != null ? { reps: row.reps } : {}),
          ...(row.timeSeconds != null ? { timeSeconds: row.timeSeconds } : {}),
          restSeconds: row.restSeconds,
          ...(row.weightKg != null ? { weightKg: row.weightKg } : {}),
        },
        order,
        optional: false,
      })),
    }
    try {
      await saveCustomTemplate(template)
      navigate(`/routines/${id}`, { replace: true })
    } catch {
      setError("Couldn't save on this device. Try again.")
      setSaving(false)
    }
  }

  if (!loaded) return <div className="p-4">Loading…</div>

  if (picking) {
    return (
      <ExercisePicker
        excludeIds={rows.map((r) => r.exerciseId)}
        onPick={(exercise) => {
          setRows((r) => [...r, defaultRow(exercise)])
          setPicking(false)
        }}
        onClose={() => setPicking(false)}
      />
    )
  }

  const canSave = name.trim().length > 0 && rows.length > 0

  return (
    <div className="p-4 space-y-4 pb-44">
      <div className="flex items-center justify-between">
        <BackButton onBeforeBack={(goBack) => (dirty ? setConfirmingLeave(() => goBack) : goBack())} />
        <h1 className="text-lg font-bold">{editingId ? 'Edit routine' : 'New routine'}</h1>
        <span className="w-12" />
      </div>

      <input
        type="text"
        placeholder="Routine name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="input text-lg font-semibold"
      />

      {rows.length === 0 && <RaeNote expression="wink">Add your first exercise and we'll build this together.</RaeNote>}

      <ul className="space-y-3">
        {rows.map((row, index) => (
          <li key={row.exerciseId} className="card p-3 space-y-3">
            <div className="flex items-center gap-2">
              <ExerciseThumb exercise={row.exercise} className="h-12 w-16 rounded-panel" />
              <p className="min-w-0 flex-1 truncate font-semibold">
                {row.exercise ? row.exercise.name : 'Exercise no longer available'}
              </p>
              <button type="button" className={ROW_BTN} aria-label="Move up" onClick={() => move(index, -1)}>
                ↑
              </button>
              <button type="button" className={ROW_BTN} aria-label="Move down" onClick={() => move(index, 1)}>
                ↓
              </button>
              <button type="button" className={ROW_BTN} aria-label="Remove" onClick={() => remove(index)}>
                ✕
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Stepper label="Sets" value={row.sets} min={1} max={8} step={1} onChange={(v) => update(index, { sets: v })} />
              {row.reps != null ? (
                <Stepper label="Reps" value={row.reps} min={1} max={50} step={1} onChange={(v) => update(index, { reps: v })} />
              ) : (
                <Stepper
                  label="Seconds"
                  value={row.timeSeconds ?? 30}
                  min={5}
                  max={300}
                  step={5}
                  onChange={(v) => update(index, { timeSeconds: v })}
                />
              )}
              <Stepper
                label="Rest"
                value={row.restSeconds}
                min={0}
                max={300}
                step={15}
                unit="s"
                onChange={(v) => update(index, { restSeconds: v })}
              />
            </div>
            {row.weightKg != null && (
              <Stepper
                label={`Weight (${unit})`}
                value={roundToStep(kgToUnit(row.weightKg, unit), unit)}
                min={0}
                max={unit === 'kg' ? 300 : 660}
                step={stepInUnit(unit)}
                onChange={(v) => update(index, { weightKg: unitToKg(v, unit) })}
              />
            )}
          </li>
        ))}
      </ul>

      <button className="w-full rounded-panel border border-primary px-4 py-3 text-primary" onClick={() => setPicking(true)}>
        + Add exercise
      </button>

      {error && <p className="text-sm text-accent">{error}</p>}

      {removed && (
        <div
          className="fixed bottom-40 left-4 right-4 z-20 flex items-center gap-3 rounded-panel bg-ink px-4 py-2 text-bg"
          role="status"
        >
          <span className="min-w-0 flex-1 truncate text-sm">Removed {removed.row.exercise?.name ?? 'exercise'}</span>
          <button type="button" className="min-h-11 px-2 font-bold" onClick={undoRemove}>
            Undo
          </button>
        </div>
      )}

      {confirmingLeave && (
        <ConfirmSheet
          title="Leave without saving?"
          confirmLabel="Leave"
          cancelLabel="Keep editing"
          onConfirm={() => {
            const leave = confirmingLeave
            setConfirmingLeave(null)
            leave()
          }}
          onCancel={() => setConfirmingLeave(null)}
        >
          Your changes to this routine will be lost.
        </ConfirmSheet>
      )}

      <ThumbBar armKey="builder" aboveTabBar>
        <button
          className="btn-primary btn-lg w-full"
          disabled={!canSave || saving}
          onClick={handleSave}
        >
          Save routine
        </button>
      </ThumbBar>
    </div>
  )
}

function Stepper({
  label,
  value,
  min,
  max,
  step,
  unit = '',
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit?: string
  onChange: (value: number) => void
}) {
  return (
    <div className="rounded-panel bg-bg p-2 text-center">
      <p className="text-xs text-ink-muted">{label}</p>
      <div className="flex items-center justify-between">
        <button
          type="button"
          className="stepper-btn h-10 w-10 text-lg"
          aria-label={`Decrease ${label}`}
          onClick={() => onChange(Math.max(min, value - step))}
        >
          −
        </button>
        <span className="hud-num font-semibold tabular-nums">
          {value}
          {unit}
        </span>
        <button
          type="button"
          className="stepper-btn h-10 w-10 text-lg"
          aria-label={`Increase ${label}`}
          onClick={() => onChange(Math.min(max, value + step))}
        >
          +
        </button>
      </div>
    </div>
  )
}

function ExercisePicker({
  excludeIds,
  onPick,
  onClose,
}: {
  excludeIds: string[]
  onPick: (exercise: Exercise) => void
  onClose: () => void
}) {
  const [library, setLibrary] = useState<Exercise[] | null>(null)
  const [query, setQuery] = useState('')
  const [muscle, setMuscle] = useState<string | undefined>()
  const [equipment, setEquipment] = useState<string | undefined>()
  const [limit, setLimit] = useState(PICKER_PAGE)
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => {
    loadLibrary()
      .then((all) => setLibrary(all.filter(isShownNow)))
      .catch(() => setLoadFailed(true))
  }, [])

  // A new search starts back at the first page.
  useEffect(() => setLimit(PICKER_PAGE), [query, muscle, equipment])

  const results = useMemo(
    () => (library ? filterExercises(library, { query: query || undefined, muscle, equipment }) : []).filter((e) => !excludeIds.includes(e.id)),
    [library, query, muscle, equipment, excludeIds]
  )

  return (
    <div className="p-4 pb-24 space-y-3">
      <h1 className="text-lg font-bold">Add exercise</h1>
      <input
        type="search"
        autoFocus
        placeholder="Search exercises"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="input"
      />
      <FilterSheet activeCount={[muscle, equipment].filter(Boolean).length} triggerBottomClassName="bottom-40">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-ink-muted">Muscle</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {MUSCLE_GROUPS.map((g) => (
              <Chip key={g.id} active={muscle === g.id} onClick={() => setMuscle(muscle === g.id ? undefined : g.id)}>
                {g.label}
              </Chip>
            ))}
          </div>
        </div>
        {EQUIPMENT_FILTER_OPTIONS.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-ink-muted">Equipment</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {EQUIPMENT_FILTER_OPTIONS.map((o) => (
                <Chip key={o.id} active={equipment === o.id} onClick={() => setEquipment(equipment === o.id ? undefined : o.id)}>
                  {o.label}
                </Chip>
              ))}
            </div>
          </div>
        )}
      </FilterSheet>
      {library === null && !loadFailed && <p className="text-ink-muted">Loading library…</p>}
      {loadFailed && <p className="text-ink-muted">Couldn't load the library. Check back when you're online.</p>}
      <ul className="space-y-2">
        {results.slice(0, limit).map((exercise) => (
          <li key={exercise.id}>
            <button
              type="button"
              className="flex w-full items-center gap-3 card p-2 text-left"
              onClick={() => onPick(exercise)}
            >
              <ExerciseThumb exercise={exercise} className="h-12 w-16 rounded-panel" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{exercise.name}</span>
                <span className="block truncate text-xs text-ink-muted">
                  {[exercise.taxonomy.primaryMuscles?.[0], exercise.taxonomy.equipment[0]].filter(Boolean).join(', ')}
                </span>
              </span>
              <span className="flex-none text-primary">+</span>
            </button>
          </li>
        ))}
      </ul>
      {results.length > limit && (
        <button type="button" className="btn-secondary w-full" onClick={() => setLimit((n) => n + PICKER_PAGE)}>
          Show more ({results.length - limit} left)
        </button>
      )}

      {/* Fixed bottom Cancel replaces the old top-right text link, which
          required a top-corner reach. */}
      <ThumbBar armKey="picker" aboveTabBar>
        <button className="btn-secondary w-full" onClick={onClose}>
          Cancel
        </button>
      </ThumbBar>
    </div>
  )
}
