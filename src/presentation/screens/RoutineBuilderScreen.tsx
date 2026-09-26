import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { getExercises, getTemplate, loadLibrary } from '../../domain/content/catalog'
import { filterExercises, MUSCLE_GROUPS, EQUIPMENT_OPTIONS } from '../../domain/content/library'
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

type Row = EditRow

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
    ...(weighted ? { weightKg: 20 } : {}),
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
  const [unit] = useWeightUnit()

  useEffect(() => {
    let cancelled = false
    async function init() {
      if (editingId) {
        const template = await getTemplate(editingId)
        if (template && !cancelled) {
          const exercises = await getExercises(template.exercises.map((e) => e.exerciseId))
          setName(template.name)
          setRows(buildEditRows(template, exercises))
        }
      }
      const add = params.get('add')
      if (add) {
        const exercise = (await getExercises([add])).get(add)
        if (exercise && !cancelled) setRows((r) => (r.some((x) => x.exerciseId === add) ? r : [...r, defaultRow(exercise)]))
      }
      if (!cancelled) setLoaded(true)
    }
    void init()
    return () => {
      cancelled = true
    }
  }, [editingId, params])

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
    await saveCustomTemplate(template)
    navigate(`/routines/${id}`, { replace: true })
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
        <BackButton />
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

      {rows.length === 0 && <p className="text-sm text-ink-muted">Add an exercise to get started.</p>}

      <ul className="space-y-3">
        {rows.map((row, index) => (
          <li key={row.exerciseId} className="card p-3 space-y-3">
            <div className="flex items-center gap-2">
              {row.exercise?.mediaManifest.start && (
                <img src={row.exercise.mediaManifest.start} alt="" className="h-12 w-16 flex-none rounded-panel object-cover" />
              )}
              <p className="min-w-0 flex-1 truncate font-semibold">
                {row.exercise ? row.exercise.name : 'Exercise no longer available'}
              </p>
              <button className="px-2 text-ink-muted" aria-label="Move up" onClick={() => move(index, -1)}>
                ↑
              </button>
              <button className="px-2 text-ink-muted" aria-label="Move down" onClick={() => move(index, 1)}>
                ↓
              </button>
              <button
                className="px-2 text-ink-muted"
                aria-label="Remove"
                onClick={() => setRows((r) => r.filter((_, i) => i !== index))}
              >
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

      <div className="fixed bottom-16 left-0 right-0 border-t-2 border-edge bg-surface p-4">
        <button
          className="btn-primary btn-lg w-full"
          disabled={!canSave || saving}
          onClick={handleSave}
        >
          Save routine
        </button>
      </div>
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

  useEffect(() => {
    loadLibrary().then(setLibrary)
  }, [])

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
        <div className="space-y-2">
          <p className="text-sm font-semibold text-ink-muted">Equipment</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {EQUIPMENT_OPTIONS.map((o) => (
              <Chip key={o.id} active={equipment === o.id} onClick={() => setEquipment(equipment === o.id ? undefined : o.id)}>
                {o.label}
              </Chip>
            ))}
          </div>
        </div>
      </FilterSheet>
      {library === null && <p className="text-ink-muted">Loading library…</p>}
      <ul className="space-y-2">
        {results.slice(0, 40).map((exercise) => (
          <li key={exercise.id}>
            <button
              type="button"
              className="flex w-full items-center gap-3 card p-2 text-left"
              onClick={() => onPick(exercise)}
            >
              {exercise.mediaManifest.start ? (
                <img src={exercise.mediaManifest.start} alt="" loading="lazy" className="h-12 w-16 flex-none rounded-panel object-cover" />
              ) : (
                <div className="h-12 w-16 flex-none rounded-panel bg-bg" />
              )}
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

      {/* Fixed bottom Cancel replaces the old top-right text link, which
          required a top-corner reach. */}
      <div className="fixed bottom-16 left-0 right-0 border-t-2 border-edge bg-surface p-4">
        <button className="btn-secondary w-full" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  )
}
