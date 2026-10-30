import { defaultPrescription } from '../content/defaultPrescription'
import { isShownNow, MUSCLE_GROUPS, orderForBrowsing } from '../content/library'
import type { Exercise, WorkoutTemplate } from '../content/types'

// Swapping a move on the Start screen (owner decision 2026-10-29): she
// picks the replacement herself, for this one workout. The app never claims
// two moves are equivalent (CLAUDE.md: no invented substitution edges); it
// only lists moves for the same muscle group first, from the library's own
// muscle data. Routines are never changed by a swap.

// Swaps by slot order. The new move keeps the slot's sets, rest and place.
// Its target stays the slot's when the kind fits (reps for reps, seconds
// for a hold); otherwise it gets its own default (defaultPrescription).
// Load never carries over: a weight for one move means nothing for another.
export function applySwaps(template: WorkoutTemplate, swaps: ReadonlyMap<number, Exercise>): WorkoutTemplate {
  if (swaps.size === 0) return template
  return {
    ...template,
    exercises: template.exercises.map((slot) => {
      const next = swaps.get(slot.order)
      if (!next) return slot
      const fallback = defaultPrescription(next)
      const canReps = next.prescriptionCapabilities.reps
      const canHold = next.prescriptionCapabilities.time || next.prescriptionCapabilities.hold || !canReps
      const keepReps = slot.prescription.reps != null && canReps
      const keepTime = slot.prescription.timeSeconds != null && canHold
      const target = keepReps
        ? { reps: slot.prescription.reps }
        : keepTime
          ? { timeSeconds: slot.prescription.timeSeconds }
          : fallback.timeSeconds != null
            ? { timeSeconds: fallback.timeSeconds }
            : { reps: fallback.reps }
      return {
        ...slot,
        exerciseId: next.id,
        exerciseVersion: next.version,
        prescription: {
          sets: slot.prescription.sets,
          ...target,
          restSeconds: slot.prescription.restSeconds,
          ...(fallback.weightKg != null ? { weightKg: fallback.weightKg } : {}),
        },
      }
    }),
  }
}

function groupOf(e: Exercise | undefined) {
  const muscle = e?.taxonomy.primaryMuscles?.[0]
  return muscle ? (MUSCLE_GROUPS.find((g) => g.muscles.includes(muscle)) ?? null) : null
}

const sourceOf = (e: Exercise) => e.provenance.sourceRecordId ?? null
const nameKey = (e: Exercise) => e.name.trim().toLowerCase()

// Two records for one move: the curated starter moves were imported from
// the same upstream records the library holds (same sourceRecordId), or
// they simply share a name.
function sameMove(a: Exercise, b: Exercise): boolean {
  if (a.id === b.id) return true
  const sa = sourceOf(a)
  if (sa != null && sa === sourceOf(b)) return true
  return nameKey(a) === nameKey(b)
}

// What the swap sheet lists: moves shown in the library right now, minus
// the moves already in this workout and their library twins (a move twice
// would be scored twice), same muscle group first. Browse order as in the
// Library. A curated move without muscle data borrows its library twin's.
export function swapChoices(
  all: readonly Exercise[],
  original: Exercise | undefined,
  inWorkout: readonly Exercise[],
  hasRae: (id: string) => boolean,
): { group: string | null; sameGroup: Exercise[]; others: Exercise[] } {
  const muscleSource =
    original && !original.taxonomy.primaryMuscles?.length
      ? (all.find((e) => e.taxonomy.primaryMuscles?.length && sameMove(e, original)) ?? original)
      : original
  const group = groupOf(muscleSource)
  const taken = original ? [...inWorkout, original] : [...inWorkout]
  const pool = orderForBrowsing(
    all.filter((e) => isShownNow(e) && !taken.some((t) => sameMove(t, e))),
    hasRae,
  )
  const inGroup = (e: Exercise) => group != null && groupOf(e)?.id === group.id
  return {
    group: group?.label ?? null,
    sameGroup: pool.filter(inGroup),
    others: pool.filter((e) => !inGroup(e)),
  }
}
