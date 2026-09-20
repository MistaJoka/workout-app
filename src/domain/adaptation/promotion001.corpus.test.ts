// Runs ChatGPT's Promotion 001 acceptance corpus
// (support/fixtures/progression_candidate_cases.json) through the live
// engine. The corpus is written against an *edge-based* model (an authored,
// approved harder-variant edge gates every candidate). The live engine, by
// the owner's 2026-09-19 decision, has no edge data yet and instead emits a
// rep-bracket candidate at the top of the authored range. So each case is
// mapped to what the engine can honestly answer:
//
//   - `it`       : the corpus expectation maps cleanly and is asserted.
//   - `it.skip`  : the expectation depends on edge data/semantics the engine
//                  deliberately doesn't have (owner override) — documented.
//   - `it.fails` : a REAL discrepancy: the corpus asserts an invariant the
//                  engine violates and the owner override does not explain
//                  it. These are bugs to fix; vitest flags them the moment
//                  they start passing so the fix must also flip the marker.
//
// Mapping: with the corpus's repMin 8 / repMax 12,
// defaultBodyweightRepsPolicy(authoredReps = repMin) yields targetLow 8 /
// targetHigh 12, so "clean upper-range completion" in the corpus is exactly
// "all sets met at currentPrescribedReps >= targetHigh" in the engine.
// Observations become one single-exercise SessionPlan each; only sets the
// corpus marks completed with numeric actualReps produce SET_COMPLETED
// events (skipped / incomplete sets have no event, as in the real app).
import { describe, expect, it } from 'vitest'
import corpus from '../../../support/fixtures/progression_candidate_cases.json'
import { evaluateSessionProgression, type SessionProgressionOutcome } from './evaluateSessionProgression'
import type { SessionEvent, SessionPlan } from '../session/types'

type Observation = {
  sessionId: string
  exerciseId: string
  exerciseVersion: number
  completedAt: string
  sets: { setNumber: number; targetReps: number | null; actualReps: number | null; skipped: boolean; completed: boolean }[]
}

type Case = {
  id: string
  name: string
  edge?: string | null
  edgeOverride?: { status?: string; eligibility?: { repMin: number; repMax: number; requiredCleanCompletions: number } }
  history: Observation[]
  expected: { reasonCode: string; targetExerciseId?: string; cleanCompletions?: number; requiredCleanCompletions?: number }
}

const cases = corpus.cases as Case[]
const baseEdge = corpus.baseEdge
const byId = new Map(cases.map((c) => [c.id, c]))

function caseById(id: string): Case {
  const c = byId.get(id)
  if (!c) throw new Error(`corpus case ${id} missing — fixture changed?`)
  return c
}

function repMinFor(c: Case): number {
  return c.edgeOverride?.eligibility?.repMin ?? baseEdge.eligibility.repMin
}

// Threads one observation at a time through the engine the way sessionService
// does across real sessions: the previous outcome's failure streak carries
// forward; the session's own targetReps is its effective prescription.
function run(c: Case): SessionProgressionOutcome[] {
  const outcomes: SessionProgressionOutcome[] = []
  let streak = 0
  for (const obs of c.history) {
    const target = obs.sets[0].targetReps ?? repMinFor(c)
    const plan: SessionPlan = {
      id: `plan-${obs.sessionId}`,
      templateId: 't',
      templateVersion: 1,
      packId: 'p',
      ruleVersion: 'corpus',
      createdAt: obs.completedAt,
      exercises: [
        {
          exerciseId: obs.exerciseId,
          exerciseVersion: obs.exerciseVersion,
          name: obs.exerciseId,
          sets: obs.sets.length,
          reps: target,
          authoredReps: repMinFor(c),
          restSeconds: 60,
          order: 0,
        },
      ],
      adaptations: [],
      reproducibilityHash: 'h',
    }
    const events: SessionEvent[] = obs.sets
      .filter((s) => s.completed && !s.skipped && typeof s.actualReps === 'number')
      .map((s, i) => ({
        seq: i + 1,
        eventId: `${obs.sessionId}:set:${s.setNumber}`,
        sessionId: obs.sessionId,
        type: 'SET_COMPLETED',
        timestamp: obs.completedAt,
        payload: { exerciseId: obs.exerciseId, met: (s.actualReps as number) >= (s.targetReps ?? Infinity), reps: s.actualReps },
      }))
    const state = new Map([[obs.exerciseId, { currentPrescribedReps: target, consecutiveFailureStreak: streak }]])
    const [outcome] = evaluateSessionProgression(plan, events, state)
    if (outcome) {
      outcomes.push(outcome)
      streak = outcome.nextFailureStreak
    }
  }
  return outcomes
}

function last(c: Case): SessionProgressionOutcome | undefined {
  const outcomes = run(c)
  return outcomes[outcomes.length - 1]
}

describe('Promotion 001 corpus against the live progression engine', () => {
  it('fixture is the version this mapping was written for', () => {
    expect(corpus.fixtureVersion).toBe(1)
    expect(cases).toHaveLength(11)
    expect(baseEdge.eligibility).toMatchObject({ repMin: 8, repMax: 12 })
  })

  it('P001-01 clean upper range creates a candidate that leaves the current prescription untouched', () => {
    const c = caseById('P001-01')
    const outcome = last(c)!
    expect(outcome.reasonCode).toBe('PROGRESSION_CANDIDATE')
    expect(outcome.nextPrescribedReps).toBe(12)
    expect(outcome.candidatePrescribedReps).toBeDefined()
    expect(outcome.weighted).toBe(false)
  })

  it('P001-01 evaluation is deterministic across repeated calls (doc case 12)', () => {
    const c = caseById('P001-01')
    expect(run(c)).toEqual(run(c))
  })

  // Owner override, 2026-09-19: the engine emits a rep-bracket candidate
  // with no edge data at all, so "no edge" / "draft edge" cannot suppress it.
  // When authored edges land, these two should become live assertions.
  it.skip('P001-02 missing edge cannot create candidate (engine has no edge concept — owner override)', () => {
    expect(last(caseById('P001-02'))!.reasonCode).not.toBe('PROGRESSION_CANDIDATE')
  })
  it.skip('P001-03 draft edge cannot create production candidate (engine has no edge concept — owner override)', () => {
    expect(last(caseById('P001-03'))!.reasonCode).not.toBe('PROGRESSION_CANDIDATE')
  })

  it('P001-04 a target below the upper range never yields a candidate, only an in-range adjustment', () => {
    const outcome = last(caseById('P001-04'))!
    expect(outcome.reasonCode).not.toBe('PROGRESSION_CANDIDATE')
    expect(outcome.reasonCode).toBe('ADJUSTED_WITHIN_BOUNDS')
    expect(outcome.candidatePrescribedReps).toBeUndefined()
  })

  // These two cases first surfaced a real gap: the engine only saw the sets
  // that produced SET_COMPLETED events, so a session that ended after one
  // clean top-range set still proposed progression. Fixed in
  // evaluateSessionProgression: when fewer sets were logged than the plan
  // calls for, the exercise is RETAINED (and any pending candidate is left
  // untouched) — every planned working set must be logged before anything
  // changes.
  it('P001-05 an incomplete set invalidates clean completion', () => {
    expect(last(caseById('P001-05'))!.reasonCode).not.toBe('PROGRESSION_CANDIDATE')
  })
  it('P001-06 a skipped set invalidates clean completion', () => {
    expect(last(caseById('P001-06'))!.reasonCode).not.toBe('PROGRESSION_CANDIDATE')
  })

  it('P001-07 one set below the upper range invalidates clean completion', () => {
    const outcome = last(caseById('P001-07'))!
    expect(outcome.reasonCode).not.toBe('PROGRESSION_CANDIDATE')
    expect(outcome.reasonCode).toBe('RETAINED')
    expect(outcome.nextFailureStreak).toBe(1)
  })

  // requiredCleanCompletions is an authored-edge parameter. With no edges the
  // engine behaves as if it were 1 (its own T2 vector), so a count of 2
  // cannot be honored yet — design gap tied to edges, not a bug.
  it.skip('P001-08 required clean-completion count of 2 is honored (no edge data — owner override)', () => {
    expect(last(caseById('P001-08'))!.reasonCode).not.toBe('PROGRESSION_CANDIDATE')
  })

  it('P001-09 the second clean completion (the one that satisfies the count) is a candidate', () => {
    const outcomes = run(caseById('P001-09'))
    expect(outcomes).toHaveLength(2)
    expect(outcomes[1].reasonCode).toBe('PROGRESSION_CANDIDATE')
  })

  // The engine keys progression on exerciseId only; exerciseVersion is
  // carried on the plan but not compared, because there is no edge whose
  // source version it could mismatch. Becomes meaningful with authored edges.
  it.skip('P001-10 exercise version mismatch cannot count (no edge data — owner override)', () => {
    expect(last(caseById('P001-10'))!.reasonCode).not.toBe('PROGRESSION_CANDIDATE')
  })

  // Duplicate observations are prevented one layer up: sessionRepository
  // enforces a unique eventId and sessionService applies progression exactly
  // once per session result (see sessionService.test.ts "does not
  // double-apply progression on an idempotent replay"). The pure evaluator
  // has no session-level dedupe of its own, so the corpus case is covered
  // there, not here.
  it.skip('P001-11 duplicate session observation counts once (covered by sessionService idempotency test)', () => {
    expect(run(caseById('P001-11'))).toHaveLength(2)
  })
})
