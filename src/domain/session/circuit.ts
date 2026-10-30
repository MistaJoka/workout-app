import type { WorkoutTemplate } from '../content/types'
import type { SessionPlan } from './types'

// Circuits (owner decision 2026-10-29): a custom routine can run as rounds,
// one set of each move in turn, the way home workouts are usually built.
// The plan keeps each move once with one set per round, so history, PRs,
// progression and familiarity read it exactly like a normal workout; only
// the order the player visits the sets changes (sessionMachine.ts).

export const CIRCUIT_MIN_ROUNDS = 2
export const CIRCUIT_MAX_ROUNDS = 5
export const CIRCUIT_DEFAULT_ROUNDS = 3
// A breath to get to the next move, and a real rest after each round.
export const CIRCUIT_MOVE_REST_SECONDS = 15
export const CIRCUIT_ROUND_REST_SECONDS = 60

// Every move gets one set per round. Applied before the length dial, so
// Short is one round and Long one more.
export function asRounds(template: WorkoutTemplate): WorkoutTemplate {
  if (!template.circuit) return template
  const rounds = template.circuit.rounds
  return {
    ...template,
    exercises: template.exercises.map((e) => ({ ...e, prescription: { ...e.prescription, sets: rounds } })),
  }
}

// Where a circuit goes after (exerciseIndex, round): the next move this
// round, else the first move next round, else done.
export function nextInCircuit(
  plan: SessionPlan,
  exerciseIndex: number,
  round: number,
): { exerciseIndex: number; setNumber: number } | null {
  if (exerciseIndex + 1 < plan.exercises.length) return { exerciseIndex: exerciseIndex + 1, setNumber: round }
  const rounds = plan.circuit?.rounds ?? 0
  if (round < rounds) return { exerciseIndex: 0, setNumber: round + 1 }
  return null
}

// What a set is called in the player: a circuit counts rounds.
export function setWord(plan: SessionPlan): 'Set' | 'Round' {
  return plan.circuit ? 'Round' : 'Set'
}

// Sets finished before (exerciseIndex, setNumber), in the order this plan
// runs them: a circuit has done every move of the earlier rounds plus the
// moves before this one in the current round.
export function setsDoneBefore(plan: SessionPlan, exerciseIndex: number, setNumber: number): number {
  if (plan.circuit) return (setNumber - 1) * plan.exercises.length + exerciseIndex
  return plan.exercises.slice(0, exerciseIndex).reduce((sum, e) => sum + e.sets, 0) + setNumber - 1
}

// The move the player goes to after this one, with no rest in between
// (what Skip leads to), or null when this is the end.
export function moveAfter(plan: SessionPlan, exerciseIndex: number, setNumber: number): number | null {
  if (plan.circuit) return nextInCircuit(plan, exerciseIndex, setNumber)?.exerciseIndex ?? null
  return exerciseIndex + 1 < plan.exercises.length ? exerciseIndex + 1 : null
}

// "Last move" means the final move the workout will visit.
export function onLastMove(plan: SessionPlan, exerciseIndex: number, setNumber: number): boolean {
  if (plan.exercises.length <= 1) return false
  if (plan.circuit) return exerciseIndex === plan.exercises.length - 1 && setNumber >= plan.circuit.rounds
  return exerciseIndex === plan.exercises.length - 1
}
