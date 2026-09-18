# Source Deep Dive — Ischys

## Source

- Repository: `ischys-app/Ischys`
- Role: offline-first progress-domain and previous-performance reference
- License lane: permissive code; media/artwork must be checked separately
- Priority: **P0**

## Verified current domain paths

The current `main` branch exposes these high-value pure-domain files:

```text
frontend/src/domain/stats.ts
frontend/src/domain/stats.test.ts
frontend/src/domain/records.ts
frontend/src/domain/records.test.ts
frontend/src/domain/previous.ts
frontend/src/domain/previous.test.ts
frontend/src/domain/streak.ts
frontend/src/domain/streak.test.ts
frontend/src/domain/profileStats.ts
frontend/src/domain/profileStats.test.ts
frontend/src/domain/volumeByMuscle.ts
frontend/src/domain/volumeByMuscle.test.ts
```

This supersedes any stale earlier notes referring to differently named progression/strength files.

## Capability 1 — pure volume and strength statistics

`stats.ts` is especially compatible with the target architecture because its calculations are intentionally pure.

### Verified e1RM rule

It uses the Epley estimate:

```text
estimated 1RM = weight × (1 + reps / 30)
```

Special cases:

- missing weight => no estimate
- missing/non-positive reps => no estimate
- exactly one repetition => estimated 1RM equals the lifted weight
- output is rounded

### Verified volume rules

For a completed weighted set:

```text
volume = weight × reps
```

For a completed bodyweight movement when bodyweight is known:

```text
volume = (bodyweight + added load) × reps
```

where added load may also represent assistance when negative.

Observed controls:

- incomplete sets do not count
- warmup sets are excluded by default
- warmups can be explicitly included
- bodyweight sets contribute zero volume when user bodyweight is unknown
- non-positive effective bodyweight load contributes zero

### Verified session metrics

The source supports concepts equivalent to:

- `best_set` — heaviest working set
- `est_1rm` — maximum estimated 1RM across working sets
- `best_volume` — working volume for a session
- `max_reps` — highest working-set repetition count

Unknown/no-data cases return no metric instead of inventing a zero-valued achievement.

## Capability 2 — personal records

`records.ts` builds four record classes per exercise:

```text
best_set
est_1rm
best_volume
max_reps
```

Observed behavior:

- warmups are excluded from working-set PR calculations by default
- `best_set` resolves by highest weight, then repetitions as tiebreaker
- `est_1rm` compares Epley estimates
- `best_volume` compares total eligible volume at the session level
- `max_reps` allows bodyweight work
- first-ever records are explicitly distinguishable from improvements
- only strictly improved numeric values count as later PRs
- the source defines a headline priority: best set -> estimated 1RM -> max reps -> best volume

## Capability 3 — previous-session reference

`previous.ts` makes an important distinction:

> the reference used for progressive-overload autofill is the most recent prior session of that exercise, not its all-time personal record.

Its resolver selects the latest session strictly earlier than a supplied timestamp.

That separation should be preserved locally:

```text
PREVIOUS PERFORMANCE != PERSONAL RECORD
```

This prevents an all-time maximum from becoming an unsafe or misleading default for today's prescription.

## Capability 4 — streaks

`streak.ts` implements pure calendar streak logic with a one-period grace rule.

### Day streak

A streak can remain current when the latest workout was yesterday. A rest day today therefore does not immediately destroy the streak.

### Week streak

The same idea applies to ISO weeks: an empty current week can still display a streak that continued through the previous week.

### Calendar safety

The implementation uses calendar-date arithmetic rather than naive millisecond subtraction so daylight-saving transitions do not shift day/week boundaries.

This is a valuable invariant for a PWA used on phones across clock changes.

## Local target architecture

Create no new storage authority. Derive progress from existing persisted session history/events.

Preferred future shape:

```text
src/domain/progress/
├── calculateVolume.ts
├── estimate1RM.ts
├── detectPersonalRecords.ts
├── calculateStreak.ts
├── projectPreviousPerformance.ts
├── projectExerciseHistory.ts
├── projectMuscleVolume.ts
└── types.ts
```

Data flow:

```text
SessionEvent[] / SessionResult[]
             ↓
       pure projectors
             ↓
        ProgressData
          ↙       ↘
WorkoutPlayer   ProgressScreen
(previous)       (history/PRs)
```

## Target-independent tests

### I1 — Epley single rep

```text
weight: 100
reps: 1
expected e1RM: 100
```

### I2 — Epley multi-rep

```text
weight: 100
reps: 10
expected: deterministic Epley estimate, rounded according to local contract
```

### I3 — warmup exclusion

```text
warmup: 50 × 10, done
working: 100 × 5, done
countWarmups: false
expected volume: 500
```

### I4 — incomplete set exclusion

```text
100 × 5, done=false
expected volume contribution: 0
```

### I5 — bodyweight unknown

```text
kind: bodyweight
reps: 10
user bodyweight: unknown
expected volume contribution: 0
```

### I6 — bodyweight plus load

```text
bodyweight: 80 kg
added: 20 kg
reps: 10
expected volume: 1000 kg-reps
```

### I7 — previous session, not PR

```text
sessions:
A: older, very strong PR
B: latest prior session, lower performance
reference time: after B
expected previous-performance source: B
```

### I8 — strict PR improvement

```text
previous best: 100
current best: 100
expected: no new PR
```

### I9 — day-streak grace

```text
workout yesterday
no workout today
expected: yesterday-ending streak remains current
```

### I10 — DST boundary

```text
consecutive local calendar dates spanning DST transition
expected: streak counts calendar days correctly
```

## Data-model implications

The current local prescription/session model may eventually need explicit concepts for:

- set type (`normal`, `warmup`, etc.)
- movement/load kind (`weighted`, `bodyweight`)
- optional user bodyweight history

Do **not** add these fields solely because Ischys has them. Introduce them only when a promoted capability requires them and migrate/version deliberately.

## Implementation policy

**ADAPT the pure domain behavior.**

Strong candidates for local independent implementation:

- Epley e1RM
- workout volume
- working-set count
- session metric projection
- PR computation/detection
- previous-session lookup
- DST-safe day/week streaks

Do not couple calculations to React or Dexie. Keep domain functions pure and feed them normalized local history.

## Asset-license control

Code licensing and exercise artwork/media licensing are separate surfaces. No media should be copied as part of this source extraction without an independent asset-license check and provenance record.

## Recommended first promotion

Create the future `src/domain/progress/` seam with only two pure, heavily tested functions:

1. `estimate1RM`
2. `calculateVolume`

Then build PR detection and historical projectors on top of those primitives.
