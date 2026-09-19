# Promotion 001 — Deterministic Progression Candidate

**Request:** `REQ-20260913-002`  
**Status:** promotion-ready support specification  
**Implementation owner:** Claude Code  
**Support owner:** ChatGPT  
**Product scope:** v0.6 first progression slice only

## Purpose

Promote the smallest compatible part of the FOSS fitness R&D reservoir into an implementation-ready rule contract without violating the live product model.

The first production behavior is:

> A clean completion at the authored upper repetition bound may emit `PROGRESSION_CANDIDATE` when an explicit authored harder-variant edge exists. The app must never advance difficulty automatically; the user must explicitly confirm the candidate.

This specification does **not** add weighted load progression, deloads, substitutions, clinical/safety logic, or runtime AI.

## Why this slice is first

`docs/SOURCE_OF_TRUTH_V06.md` defines progression as eligibility to try an authored harder variant and requires explicit user confirmation. The current `SessionPlanExercise` model also has no load/weight prescription field.

FitnessTrack is useful as a deterministic progression reference, but its weight-centric double-progression algorithm cannot be transplanted directly into the current product model without changing domain meaning. Therefore this promotion adapts only the completion-gated, deterministic progression concept.

## Upstream evidence pin

Reference repository: `Gman0909/FitnessTrack`  
Pinned upstream revision: `f627429623756aebe93e15bada6f698e8385f6ed`  
License at pinned revision: MIT  
Primary reference file: `shared/algorithm.js`

The upstream implementation demonstrates deterministic progression from persisted target-vs-actual performance, including top-range completion, misses, bodyweight handling, bounds, and repeated-failure logic. This promotion uses it as behavioral research only; implementation must remain native to `workout-app`.

## Domain decision

### Production meaning of `PROGRESSION_CANDIDATE`

`PROGRESSION_CANDIDATE` means:

- the current exercise has an explicit authored progression edge;
- the eligibility rule attached to that edge has been satisfied by persisted performance history;
- the user may be shown an action equivalent to `Try Next Level?`;
- no exercise substitution or difficulty advancement has happened yet.

A candidate is **not** permission for the engine to mutate the canonical template or silently replace the exercise.

## Required authored rule data

Every production progression edge must be explicit. No default edge may be inferred from names, ordering, muscle group, equipment, or AI.

Conceptual schema:

```ts
type ProgressionEdge = {
  id: string
  fromExerciseId: string
  fromExerciseVersion: number
  toExerciseId: string
  toExerciseVersion: number
  eligibility: {
    kind: 'clean-upper-rep-completion'
    repMin: number
    repMax: number
    requiredCleanCompletions: number
  }
  status: 'draft' | 'reviewed' | 'approved'
}
```

Rules:

1. `repMin` and `repMax` are authored data; the engine must not invent them.
2. `requiredCleanCompletions` is authored data and must be an integer >= 1; there is no production default.
3. Only `status: 'approved'` edges may create production candidates.
4. The `toExerciseId` / version pair must resolve to canonical reviewed content before the edge can be used.
5. A progression edge is directional. The reverse relationship must be authored separately if needed.

## Required observed performance data

Eligibility must be derivable from persisted workout truth, not React state.

Conceptual normalized observation:

```ts
type ExerciseCompletionObservation = {
  sessionId: string
  exerciseId: string
  exerciseVersion: number
  completedAt: string
  sets: Array<{
    setNumber: number
    targetReps: number | null
    actualReps: number | null
    skipped: boolean
    completed: boolean
  }>
}
```

An implementation may use different internal names, but it must preserve equivalent information.

## Clean upper-range completion

A single observation is a **clean upper-range completion** for an edge only when all of the following are true:

1. observation exercise ID/version matches the edge source ID/version;
2. at least one planned working set exists;
3. every planned working set is completed;
4. no planned working set is skipped;
5. every required set has a numeric `targetReps` and `actualReps`;
6. every required set's `targetReps` is exactly the authored `repMax` for the edge;
7. every required set's `actualReps >= repMax`.

If any required performance value is missing or malformed, the observation does **not** count as clean completion.

## Candidate rule

For an approved edge:

```text
cleanCount = number of qualifying clean upper-range completions

if cleanCount >= edge.eligibility.requiredCleanCompletions
  => PROGRESSION_CANDIDATE
else
  => no progression candidate
```

The count must be based on persisted completed observations for the same source exercise ID/version and the same policy/edge revision used to evaluate eligibility.

The implementation must not count:

- incomplete sets;
- skipped sets;
- observations below the upper target;
- observations created for another exercise version;
- duplicate/retried completion events;
- missing actual-rep records.

## Decision payload requirement

The current `AdaptationDecision` shape contains only `exerciseId`, `reasonCode`, and `detail`. Claude may extend the decision shape in a backwards-compatible way so a candidate is machine-actionable rather than encoded only in prose.

Minimum structured candidate information:

```ts
type ProgressionCandidateMetadata = {
  ruleId: string
  edgeId: string
  targetExerciseId: string
  targetExerciseVersion: number
  cleanCompletions: number
  requiredCleanCompletions: number
}
```

Expected material decision:

```text
reasonCode: PROGRESSION_CANDIDATE
exerciseId: current/source exercise
metadata.targetExerciseId: authored destination exercise
```

The human-readable `detail` is explanatory only; application behavior must not parse it.

## Confirmation gate

`PROGRESSION_CANDIDATE` never changes the current immutable `SessionPlan`.

Required behavior:

1. candidate becomes visible to the user as an explicit next-level choice;
2. user can accept or decline;
3. acceptance is persisted as progression state/history;
4. only a future SessionPlan may consume the accepted progression state;
5. decline leaves the current progression position unchanged;
6. reloading the app must not lose an accepted/declined decision once persisted.

The exact UI copy is not part of this promotion.

## Determinism and replay invariants

1. Same persisted observations + same approved edge revision => same result.
2. Duplicate event replay must not increase clean-completion count.
3. Missing history must never fabricate a candidate.
4. An unapproved/draft edge must never create a production candidate.
5. No network access or runtime AI may be required.
6. Canonical WorkoutTemplates remain immutable.
7. Starting/replaying a session must preserve its original immutable SessionPlan.
8. Familiarity/exposure counts are not progression evidence unless explicitly added by a future authored rule.

## Non-goals for Promotion 001

Deferred on purpose:

- automatic exercise advancement;
- weighted load increments;
- load caps;
- deloads / repeated-failure load regression;
- FitnessTrack's ±15% weight-deviation retargeting;
- adaptive fast/normal/slow load tempo;
- adding sets at a bodyweight ceiling;
- regression/substitution graph edges;
- check-in-driven progression;
- medical/injury adaptation.

These remain R&D/reference material until the local product model explicitly supports them.

## Claude implementation target

Keep implementation inside the existing pure-domain boundary. Expected touch points are likely:

```text
src/domain/adaptation/
src/domain/session/types.ts
src/domain/session/createSessionPlan.ts
src/infrastructure/db/   # only if progression persistence is not already modeled
```

Do not put eligibility logic in React components.

Do not change navigation or UI architecture as part of this promotion.

## Required unit acceptance cases

Use `support/fixtures/progression_candidate_cases.json` as a target-independent corpus.

At minimum Claude's domain tests must prove:

1. clean upper-range completion with approved edge => candidate;
2. no edge => no candidate;
3. draft edge => no candidate;
4. current target below `repMax` => no candidate;
5. one incomplete or skipped set => no candidate;
6. one set below `repMax` => no candidate;
7. missing actual reps => no candidate;
8. required clean-completion count is honored exactly;
9. exercise/version mismatch => no candidate;
10. duplicate history cannot manufacture an extra clean completion;
11. candidate metadata points only to the authored destination edge;
12. evaluation is deterministic across repeated calls.

## Required application acceptance behavior

After implementation:

- `npm test` passes;
- `npm run build` passes;
- no existing session-machine/idempotency tests regress;
- a candidate does not mutate an already-created SessionPlan;
- no candidate appears without an approved authored edge;
- the implementation does not add a backend/network dependency.

## Promotion 002 trigger

Only after Promotion 001 is implemented and verified should the next FitnessTrack-derived slice be considered.

Recommended next investigation:

> repeated-failure regression for rep targets **only if** the product's authored prescription model explicitly defines those bounds.

Weighted load progression remains deferred until the product deliberately adds load as a first-class prescription/state concept.
