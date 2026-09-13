'use client'

import { useState, useTransition } from 'react'
import { Timer } from '@/components/session/Timer'
import {
  completeSet,
  goBack,
  initSession,
  restComplete,
  skipRest,
  type SessionPlan,
  type SessionState,
} from '@/lib/session-machine'
import { logSet } from '@/lib/actions/sets'
import { endSession } from '@/lib/actions/sessions'

type Props = {
  sessionId: string
  plan: SessionPlan
}

export function ActiveSessionClient({ sessionId, plan }: Props) {
  const [state, setState] = useState<SessionState>(() => initSession(plan))
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')
  const [isPending, startTransition] = useTransition()

  if (state.phase === 'session_complete') {
    return (
      <div className="p-6 text-center space-y-4">
        <p className="text-xl font-semibold">Workout complete</p>
        <button
          className="rounded bg-black px-4 py-2 text-white"
          onClick={() => startTransition(() => endSession(sessionId))}
          disabled={isPending}
        >
          Finish
        </button>
      </div>
    )
  }

  if (state.phase === 'resting') {
    return (
      <div className="p-6 space-y-6 text-center">
        <p className="text-lg">Rest</p>
        <Timer durationSeconds={state.restSeconds} onComplete={() => setState(restComplete(state))} />
        <button className="rounded border px-4 py-2" onClick={() => setState(skipRest(state))}>
          Skip rest
        </button>
      </div>
    )
  }

  const exercise = plan.exercises[state.exerciseIndex]

  return (
    <div className="p-6 space-y-4">
      <p className="text-sm text-gray-500">
        Exercise {state.exerciseIndex + 1} of {plan.exercises.length}
      </p>
      <h2 className="text-2xl font-bold">{exercise.name}</h2>
      <p>
        Set {state.setNumber} of {exercise.targetSets} — target {exercise.targetReps} reps
      </p>
      <div className="flex gap-2">
        <input
          className="border rounded px-2 py-1 w-24"
          type="number"
          inputMode="decimal"
          placeholder="Weight"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
        />
        <input
          className="border rounded px-2 py-1 w-24"
          type="number"
          inputMode="numeric"
          placeholder="Reps"
          value={reps}
          onChange={(e) => setReps(e.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <button className="rounded border px-4 py-2" onClick={() => setState(goBack(state))} disabled={isPending}>
          Back
        </button>
        <button
          className="rounded bg-black px-4 py-2 text-white"
          disabled={isPending}
          onClick={() => {
            const actualWeight = weight === '' ? null : Number(weight)
            const actualReps = reps === '' ? null : Number(reps)
            const currentState = state
            startTransition(async () => {
              await logSet({
                sessionId,
                programExerciseId: exercise.id,
                setNumber: currentState.setNumber,
                actualWeight,
                actualReps,
              })
              setWeight('')
              setReps('')
              setState(completeSet(plan, currentState))
            })
          }}
        >
          Log set
        </button>
      </div>
    </div>
  )
}
