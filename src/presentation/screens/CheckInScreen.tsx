import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  foundationStrengthStarterExercises,
  foundationStrengthStarterTemplate,
} from '../../domain/content/fixtures/foundationStrengthStarter'
import { createSessionPlanFromTemplate } from '../../domain/session/createSessionPlan'
import { getProgression } from '../../infrastructure/db/repositories/familiarityProgressionRepository'

export function CheckInScreen() {
  const { templateId } = useParams()
  const navigate = useNavigate()
  const [energy, setEnergy] = useState(3)
  const [comfort, setComfort] = useState(3)
  const [availableMinutes, setAvailableMinutes] = useState(30)

  async function handleContinue() {
    if (templateId !== foundationStrengthStarterTemplate.id) {
      return
    }
    const progressionRecords = await Promise.all(
      foundationStrengthStarterExercises.map((e) => getProgression(e.id))
    )
    const repsOverridesByExerciseId = new Map(
      progressionRecords
        .filter((r) => r.currentPrescribedReps != null)
        .map((r) => [r.exerciseId, r.currentPrescribedReps as number])
    )
    const plan = createSessionPlanFromTemplate({
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      template: foundationStrengthStarterTemplate,
      exercises: foundationStrengthStarterExercises,
      checkIn: { energy, comfort, availableMinutes },
      ruleVersion: 'foundation-strength-starter-v1',
      repsOverridesByExerciseId,
    })
    navigate('/preview', { state: { plan } })
  }

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl font-bold">Check-In</h1>
      <RangeField label="Energy" value={energy} onChange={setEnergy} />
      <RangeField label="Comfort" value={comfort} onChange={setComfort} />
      <RangeField label="Available minutes" value={availableMinutes} onChange={setAvailableMinutes} min={5} max={90} step={5} />
      <button className="rounded-panel bg-primary px-4 py-2 text-white" onClick={handleContinue}>
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
}: {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm text-ink-muted">
        {label}: {value}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full"
      />
    </label>
  )
}
