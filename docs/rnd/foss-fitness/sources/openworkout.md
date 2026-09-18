# Source Deep Dive — OpenWorkout

## Source

- Repository: `open-workout/openworkout-mobile`
- Role: TypeScript workout-flow, progression, statistics, and local-data reference
- License lane: permissive / MIT for application code; exercise media must be treated separately
- Priority: **P0**

## Verified high-value paths

```text
lib/progressiveOverload.ts
lib/generateWorkout.ts
lib/pendingWorkout.ts
lib/splitRotation.ts
lib/statsPeriod.ts
lib/streak.ts
lib/muscleMapping.ts

db/exerciseHistory.ts
db/exerciseStats.ts
db/muscleStats.ts
db/routines.ts
db/sets.ts
db/splits.ts
db/workouts.ts

__tests__/db/workout-flow.test.ts
__tests__/db/exerciseHistory.test.ts
__tests__/db/muscleStats.test.ts
__tests__/lib/generateWorkout.test.ts
```

Useful presentation references also exist for set rows, overload hints, exercise-history charts, trained-days calendars, body/muscle statistics, and workout cards.

## Primary capability — simple progressive overload

The verified `lib/progressiveOverload.ts` implementation provides an intentionally simple deterministic benchmark.

Observed behavior:

1. Obtain recent completed sets for the exercise.
2. If no completed history exists, return no suggestion.
3. Determine the highest weight used in that history.
4. Require at least two completed sets at that maximum weight before recommending a change.
5. Evaluate the minimum repetitions among those max-weight sets.
6. If the minimum is at least 10 reps, recommend `+2` weight units.
7. If the minimum is below 8 reps, recommend `-1` weight unit.
8. If the minimum is 8-9 reps, retain the same weight.
9. Never recommend a negative weight.

This should be treated as a **benchmark policy**, not universal training doctrine.

## Target-independent benchmark tests

### O1 — no history

```text
recent completed sets: []
expected: no load suggestion
```

### O2 — insufficient evidence

```text
max-weight sets: one set only
expected: no load suggestion
```

### O3 — strong completion

```text
max-weight sets: 100x10, 100x12
expected: recommend 102
```

### O4 — middle band

```text
max-weight sets: 100x8, 100x9
expected: recommend 100
```

### O5 — weak completion

```text
max-weight sets: 100x7, 100x9
expected: recommend 99 because minimum max-weight reps < 8
```

### O6 — floor

```text
current max: 0
weak completion condition
expected: recommendation never below 0
```

## Why it fits `workout-app`

This source is especially useful because its key domain logic is TypeScript and relatively separable from UI. Its local modules map cleanly to existing seams:

| OpenWorkout | `workout-app` |
|---|---|
| `progressiveOverload.ts` | `src/domain/adaptation/` |
| `generateWorkout.ts` | `src/domain/session/createSessionPlan.ts` |
| `pendingWorkout.ts` | `src/domain/session/sessionMachine.ts` + persistence |
| `splitRotation.ts` | future program scheduler |
| `exerciseHistory.ts` | future progress projector |
| `exerciseStats.ts` | future progress projector |
| `muscleStats.ts` | future progress projector |
| `sets.ts` | event-derived set/history projections |
| `workout-flow.test.ts` | session-machine scenario inventory |
| `streak.ts` | future `src/domain/progress/` |

## Architectural boundary

Do not port OpenWorkout's storage/session model wholesale.

`workout-app` already uses:

- immutable session plans
- event-sourced session execution
- replay/reproducibility controls
- Dexie repositories

Those constraints remain authoritative.

The useful conversion is:

```text
OpenWorkout database-oriented behavior
        ↓
behavior specification
        ↓
pure local projector/rule
        ↓
SessionEvent[] / persisted history
        ↓
local result
```

## Session-generation R&D questions

When mining `generateWorkout.ts`, extract:

- inputs needed to generate a workout
- deterministic vs random choices
- muscle/equipment filters
- ordering rules
- preference handling
- fallback behavior when insufficient exercises match
- duplicate avoidance
- test cases for empty/sparse exercise sets

**Control:** generated session plans in this app must remain reproducible. If an upstream algorithm uses randomness, introduce an explicit seed or deterministic ordering before promotion.

## Pending/resume R&D questions

When mining `pendingWorkout.ts` and workout-flow tests, capture:

- what constitutes a resumable session
- how partially completed sets are represented
- when a session becomes abandoned versus pending
- how current exercise/set position is restored
- how stale timestamps/timers are handled

Map the answers into existing event replay rather than creating a second session-state source.

## Statistics R&D questions

Extract pure calculations from:

- exercise history
- exercise stats
- muscle stats
- streaks
- period/date selection

Prefer a future shape like:

```text
SessionEvent[] / SessionResult[]
          ↓
      pure projectors
          ↓
 ProgressSnapshot / history series
          ↓
    ProgressScreen
```

## Media licensing control

Do not infer exercise-image/video permission from the application-code license. OpenWorkout's exercise media must be independently verified and tracked before import.

For current work, mine:

```text
code      ✅
behavior  ✅
tests     ✅
media     HOLD until separately verified
```

## Implementation policy

**ADOPT/ADAPT selectively.**

Good direct behavioral donors:

- simple overload benchmark
- statistics algorithms
- streak rules
- filtering/generation invariants
- workout-flow test scenarios

Reject architecture changes that would create:

- a second persistence authority
- mutable session state that bypasses events
- hidden randomness
- media-license ambiguity

## Recommended promotions

1. Add the simple overload policy as a benchmark test suite beside the more flexible FitnessTrack-inspired rules.
2. Extract workout-generation invariants into `createSessionPlan` tests.
3. Use exercise-history/stats modules to define the first `src/domain/progress/` projector contract.
