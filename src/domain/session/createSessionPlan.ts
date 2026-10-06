import type { Exercise, WorkoutTemplate } from '../content/types'
import { adaptTemplate, PLACEHOLDER_RULE_VERSION } from '../adaptation/engine'
import type { AdaptationRule, CheckInInput } from '../adaptation/types'
import { computeReproducibilityHash } from './reproducibilityHash'
import type { SessionPlan, SessionPlanExercise } from './types'
import { lengthDecisions, scaleTemplate, type WorkoutLength } from './lengthDial'

export type CreateSessionPlanParams = {
  id: string
  createdAt: string
  template: WorkoutTemplate
  exercises: Exercise[]
  // Omitted when nobody was asked. ruleVersion defaults to the placeholder
  // rules' own name, since those are what run without injected rules.
  checkIn?: CheckInInput
  ruleVersion?: string
  rules?: AdaptationRule[]
  // Confirmed-progression overrides for the *effective* prescribed reps.
  // The template itself is never mutated by this — authoredReps below
  // always reflects the fixed template default, which the progression
  // policy anchors to (see SessionPlanExercise.authoredReps).
  repsOverridesByExerciseId?: Map<string, number>
  weightOverridesByExerciseId?: Map<string, number>
  // The weekly goal in effect at start, snapshotted onto the plan so a later
  // schedule change can't re-score this week (domain/progress/weekGoals.ts).
  weeklyGoal?: number
  // Short / Usual / Long from the Start screen; scales sets only.
  length?: WorkoutLength
}

// A routine can outlive an exercise (the library was cut to home-friendly
// moves on 2026-09-26): its plan still runs, under a readable name made
// from the id ("lib.Barbell_Squat" -> "Barbell Squat") instead of the raw id.
export function readableId(exerciseId: string): string {
  return exerciseId.replace(/^[a-z]+\./, '').replace(/[_-]+/g, ' ').trim()
}

export function createSessionPlanFromTemplate(params: CreateSessionPlanParams): SessionPlan {
  const {
    id,
    createdAt,
    template,
    exercises: exerciseRecords,
    checkIn,
    ruleVersion = PLACEHOLDER_RULE_VERSION,
    rules,
    repsOverridesByExerciseId,
    weightOverridesByExerciseId,
    weeklyGoal,
    length = 'usual',
  } = params
  const scaled = scaleTemplate(template, length)
  const adaptations = [...adaptTemplate(scaled, checkIn, rules), ...lengthDecisions(template, length)]
  const exerciseById = new Map(exerciseRecords.map((e) => [e.id, e]))
  const exercises: SessionPlanExercise[] = scaled.exercises.map((templateExercise) => {
    const authoredReps = templateExercise.prescription.reps
    const override = repsOverridesByExerciseId?.get(templateExercise.exerciseId)
    const reps = authoredReps != null && override != null ? override : authoredReps
    const authoredWeightKg = templateExercise.prescription.weightKg
    const weightOverride = weightOverridesByExerciseId?.get(templateExercise.exerciseId)
    const weightKg = authoredWeightKg != null && weightOverride != null ? weightOverride : authoredWeightKg
    return {
      exerciseId: templateExercise.exerciseId,
      exerciseVersion: templateExercise.exerciseVersion,
      name: exerciseById.get(templateExercise.exerciseId)?.name ?? readableId(templateExercise.exerciseId),
      sets: templateExercise.prescription.sets,
      reps,
      authoredReps,
      timeSeconds: templateExercise.prescription.timeSeconds,
      restSeconds: templateExercise.prescription.restSeconds,
      ...(weightKg != null ? { weightKg, authoredWeightKg } : {}),
      order: templateExercise.order,
    }
  })

  const base = {
    id,
    templateId: template.id,
    templateVersion: template.version,
    packId: template.packId,
    ruleVersion,
    createdAt,
    exercises,
    adaptations,
    ...(weeklyGoal != null ? { weeklyGoal } : {}),
    ...(length !== 'usual' ? { length } : {}),
  }

  return { ...base, reproducibilityHash: computeReproducibilityHash(base) }
}
