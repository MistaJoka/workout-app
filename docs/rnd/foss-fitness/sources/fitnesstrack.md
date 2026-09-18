# Source Deep Dive — FitnessTrack

## Source

- Repository: `Gman0909/FitnessTrack`
- Role: primary deterministic progression/adaptation reference
- License lane: permissive / MIT; re-verify exact upstream license at promotion time
- Priority: **P0**

## Why this source matters

`workout-app` already has an injected deterministic adaptation seam and reason-coded decisions, but its current rule table is intentionally placeholder-only. FitnessTrack contains a real progression engine with a substantial test suite, making it a strong behavioral donor without requiring its server/database/UI architecture.

## Verified high-value paths

- `shared/algorithm.js`
- `shared/algorithm.test.js`
- `shared/recap.js`
- `shared/recap.test.js`
- `shared/slotDone.js`
- `client/src/progressionHint.js`
- `client/src/progressionHint.test.js`

## Primary capability

Dynamic double progression with explicit handling for:

- rep progression inside a target range
- weight progression at the top of the range
- repeated underperformance
- rep regression versus load regression
- bodyweight exercises
- lower/floor bounds
- optional maximum load caps
- adaptive percentage increments
- per-set failure streak state

## Observed input model

The core algorithm accepts approximately:

```text
weights[]
repsPrescribed[]
repsDone[]
profile
```

The profile contains policy parameters rather than hidden model behavior. Verified parameters include concepts equivalent to:

```text
targetLow
targetHigh
startWeight
repsStep
minReps
downConsecutive
upMode = percent | fixed
upPercent
upFixed
downPercent
downFixed
lowerBoundMode
maxWeightCap
adaptiveUpEnabled
adaptiveFastSessions
adaptiveSlowSessions
adaptiveFastMultiplier
adaptiveSlowMultiplier
adaptiveMinPercent
adaptiveMaxPercent
```

## Observed decision behavior

### Rep progression

Progress prescribed repetitions only when all completed working sets meet the current prescription and there is no newly generated failure streak.

The next prescription is capped at the configured upper rep target.

### Load progression

A load increase becomes eligible when all relevant completed sets meet the upper target.

After increasing weight, the rep prescription resets toward the low end of the target range.

The increment may be fixed or percentage-based. An optional adaptive mode changes the percentage based on how quickly the previous progression was achieved, while still applying configured minimum/maximum bounds.

### Regression

For each under-target set, a failure streak is advanced. Once the configured consecutive-failure threshold is reached, the policy can either:

1. regress repetitions while retaining weight; or
2. reduce weight by a fixed or percentage amount.

A configured floor can prevent load from falling below the starting load.

### Bodyweight behavior

A zero-load/bodyweight set can progress through repetition targets but should not be treated as if adding external weight is always possible. When a downward adjustment is needed, rep regression is the natural fallback.

## Local target

Primary destination:

```text
src/domain/adaptation/
├── engine.ts
├── types.ts
└── engine.test.ts
```

Do **not** replace the existing engine interface.

Translate FitnessTrack behavior into small local `AdaptationRule` units that emit existing `workout-app` reason codes:

```text
RETAINED
ADJUSTED_WITHIN_BOUNDS
REGRESSED
PROGRESSION_CANDIDATE
```

Potential later rule files, only when implementation begins:

```text
src/domain/adaptation/rules/
├── doubleProgression.ts
├── repeatedFailureRegression.ts
├── bodyweightProgression.ts
└── loadBounds.ts
```

## State required locally

The algorithm requires enough persisted history to distinguish:

- current prescription
- actual completed repetitions
- current/previous load
- consecutive misses or equivalent failure state
- number of sessions since prior load change if adaptive increments are enabled

Do not smuggle this state into React component state. It must be derivable from persisted workout/session history or explicit progression state.

## Invariants to preserve

1. Same history + same policy version => same recommendation.
2. A progression decision must be explainable through a reason code/detail.
3. Missing history must not fabricate progression.
4. Bodyweight movements must not accidentally receive arbitrary external-load progression.
5. Regression cannot violate configured lower bounds.
6. Progression cannot exceed a configured load cap.
7. A failed set cannot simultaneously be treated as clean completion for progression.
8. Rule evaluation must remain independent of network access and runtime AI.

## Target-independent test vectors

These are behavioral specifications, not copied source tests.

### T1 — no progression before upper target

```text
range: 6-12
prescribed: 8,8,8
performed: 8,8,8
expected: reps may progress within range; no load increase yet
```

### T2 — clean top-range completion

```text
range: 6-12
prescribed: 12,12,12
performed: 12,12,12
load: 100
expected: PROGRESSION_CANDIDATE for higher load; next-cycle reps reset toward range floor
```

### T3 — one miss below lower bound

```text
lower target: 6
performed current set: 5
prior failure streak: 0
threshold: 2
expected: retain or bounded adjustment; do not regress load yet
```

### T4 — repeated miss reaches threshold

```text
lower target: 6
performed current set: 5
prior failure streak: 1
threshold: 2
expected: REGRESSED according to configured regression policy
```

### T5 — bodyweight success

```text
load: 0
upper target achieved
expected: rep progression/state progression; no automatic external-load increase
```

### T6 — floor protection

```text
current load near starting floor
regression requested
expected: resulting load >= configured floor
```

### T7 — maximum cap

```text
current load + calculated increment > maxWeightCap
expected: resulting recommendation <= cap
```

### T8 — malformed/incomplete history

```text
missing actual reps for required working set
expected: no confident progression recommendation
```

## Implementation policy

**ADAPT, do not transplant.**

Use the upstream engine as a behavior/reference source and the upstream tests as an edge-case inventory. Implement against the local `AdaptationRule` interface, local persisted history, local reason codes, and local tests.

Do not import:

- FitnessTrack's backend
- auth model
- database structure
- page state
- API layer

## Promotion gate

Before replacing the placeholder adaptation rules:

- [ ] define the local progression-state source
- [ ] decide whether V0.6 needs rep progression only, rep + load progression, or full failure-state regression
- [ ] encode policy constants/version explicitly
- [ ] add deterministic unit tests
- [ ] verify replay/reload produces the same recommendation
- [ ] map every changed recommendation to an existing or intentionally added reason code
- [ ] re-verify upstream license/revision

## Recommended first promotion

Implement the smallest useful rule first:

> clean upper-range completion -> `PROGRESSION_CANDIDATE`

Then add repeated-failure regression as a separate rule. This keeps successful progression and failure recovery independently testable.
