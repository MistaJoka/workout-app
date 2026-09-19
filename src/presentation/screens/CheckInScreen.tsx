import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getExercises, getTemplate } from '../../domain/content/catalog'
import type { WorkoutTemplate } from '../../domain/content/types'
import { createSessionPlanFromTemplate } from '../../domain/session/createSessionPlan'
import { getProgression } from '../../infrastructure/db/repositories/familiarityProgressionRepository'

export function CheckInScreen() {
  const { templateId } = useParams()
  const navigate = useNavigate()
  const [template, setTemplate] = useState<WorkoutTemplate | null | undefined>(undefined)
  const [energy, setEnergy] = useState(3)
  const [comfort, setComfort] = useState(3)
  const [availableMinutes, setAvailableMinutes] = useState(30)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!templateId) return
    getTemplate(templateId).then((t) => setTemplate(t ?? null))
  }, [templateId])

  if (template === undefined) return <div className="p-4">Loading…</div>
  if (template === null) {
    return (
      <div className="p-4 space-y-2">
        <p>That workout isn't available.</p>
        <button className="underline" onClick={() => navigate('/')}>
          Back to Today
        </button>
      </div>
    )
  }

  async function handleContinue() {
    if (!template) return
    setBusy(true)
    const ids = template.exercises.map((e) => e.exerciseId)
    const [exercises, progressionRecords] = await Promise.all([getExercises(ids), Promise.all(ids.map(getProgression))])
    const repsOverridesByExerciseId = new Map(
      progressionRecords
        .filter((r) => r.currentPrescribedReps != null)
        .map((r) => [r.exerciseId, r.currentPrescribedReps as number])
    )
    const plan = createSessionPlanFromTemplate({
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      template,
      exercises: [...exercises.values()],
      checkIn: { energy, comfort, availableMinutes },
      ruleVersion: 'foundation-strength-starter-v1',
      repsOverridesByExerciseId,
    })
    navigate('/preview', { state: { plan } })
  }

  return (
    <div className="p-4 space-y-6">
      <div>
        <p className="text-sm text-ink-muted">{template.name}</p>
        <h1 className="text-xl font-bold">How are you feeling?</h1>
      </div>
      <RangeField label="Energy" value={energy} onChange={setEnergy} low="Low" high="High" />
      <RangeField label="Comfort" value={comfort} onChange={setComfort} low="Sore" high="Great" />
      <RangeField
        label="Time available"
        value={availableMinutes}
        onChange={setAvailableMinutes}
        min={5}
        max={90}
        step={5}
        unit=" min"
      />
      <button
        className="w-full rounded-panel bg-primary px-4 py-3 text-lg text-white disabled:opacity-50"
        disabled={busy}
        onClick={handleContinue}
      >
        Continue
      </button>
    </div>
  )
}

function RangeField({
  label,
  value,
  onChange,
  min = 1,
  max = 5,
  step = 1,
  low,
  high,
  unit = '',
}: {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  low?: string
  high?: string
  unit?: string
}) {
  return (
    <label className="block space-y-1">
      <span className="flex justify-between text-sm">
        <span className="font-semibold">{label}</span>
        <span className="text-ink-muted">
          {value}
          {unit}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-[var(--color-primary)]"
      />
      {(low || high) && (
        <span className="flex justify-between text-xs text-ink-muted">
          <span>{low}</span>
          <span>{high}</span>
        </span>
      )}
    </label>
  )
}
