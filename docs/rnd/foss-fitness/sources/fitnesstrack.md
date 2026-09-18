# Source Deep Dive — FitnessTrack

## Source

- Repository: `Gman0909/FitnessTrack`
- Role: deterministic progression/adaptation reference
- Pinned revision: `f627429623756aebe93e15bada6f698e8385f6ed`
- License: MIT at the pinned revision
- Priority: **P0**
- First local promotion: `docs/rnd/foss-fitness/PROMOTION_001_PROGRESSION_CANDIDATE.md`

## Why this source matters

`workout-app` already has an injected deterministic adaptation seam and reason-coded decisions, but its current default rule table is intentionally placeholder-only. FitnessTrack contains a real progression engine with a substantial test suite, making it a strong behavioral donor without requiring its backend/database/UI architecture.

The source is a **reference**, not local product authority. `workout-app` defines progression differently: the live product treats progression as eligibility for an authored harder exercise variant that requires explicit user confirmation. FitnessTrack is more weight-centric. Promotion must therefore adapt only compatible behaviors.

## Verified high-value paths

At the pinned revision:

- `shared/algorithm.js`
- `shared/algorithm.test.js`
- `shared/recap.js`
- `shared/recap.test.js`
- `shared/slotDone.js`
- `client/src/progressionHint.js`
- `client/src/progressionHint.test.js`

## Verified core algorithm behavior

FitnessTrack's `shared/algorithm.js` implements dynamic double progression on a per-set basis.

### Weighted path

For each logged set:

```text
actual reps >= repMax
  -> increase weight, reset reps to repMin

actual reps in range and performance meets/beats target
  -> keep weight, increase reps

actual reps in range but performance is below target
  -> keep actual weight and hold at logged reps

actual reps < repMin first time
  -> keep weight, reset/re-attempt at repMin

actual reps < repMin second consecutive time
  -> reduce weight, reps -> repMin

skipped or not logged
  -> carry target forward unchanged
```

The implementation also applies a descending-weight clamp so a later set is not prescribed heavier than the set before it.

### Weight deviation handling

`WEIGHT_BAND = 0.15`.

When actual load is within ±15% of target load, the comparison rep target is re-derived approximately to preserve target volume (`weight × reps`). Beyond that band, the source treats the target as non-comparable and progresses from actual performance rather than pretending the original target is equivalent.

### Increment behavior

The source does **not** expose arbitrary percentage/fixed modes as previously summarized. At the pinned revision:

- an exercise has a default increment;
- adaptive tempo scales that increment (`fast` 1.5×, `normal` 1×, `slow` 0.5×);
- the effective increment is capped by `max(weight × 10%, 1.25)`;
- resulting loads are rounded to the nearest 0.5;
- an optional weight cap prevents progression beyond the authored ceiling.

### Adaptive tempo

- `fast`: +2 reps on rep progression and larger scaled load changes;
- `normal`: +1 rep and standard increment;
- `slow`: +1 rep and smaller load change.

This tempo system is source-specific research. It is not promoted into `workout-app` by Promotion 001.

### Bodyweight / reps-only path

Bodyweight or explicitly weight-paused exercises use a reps-only axis:

- meeting target below ceiling advances reps;
- ceiling holds at `repMax`;
- short performance holds near actual performance within the configured range;
- no automatic external-load bump is created by this path;
- excess reps can overflow into the next set in the source implementation.

## Local compatibility finding

The current `workout-app` product model is not a generic weight logger:

- `SessionPlanExercise` has no load prescription field;
- the source of truth says progression means eligibility to try an authored harder variant;
- explicit user confirmation is mandatory;
- progression edges cannot be invented.

Therefore FitnessTrack's weighted bump/deload rules must **not** be transplanted into the live domain until the product deliberately adds load as a first-class authored/persisted concept.

## First promoted capability

Promotion 001 adopts only this compatible deterministic concept:

> clean authored upper-range completion -> `PROGRESSION_CANDIDATE`, but only when an explicit approved authored harder-variant edge exists.

The candidate is informational/actionable metadata. It does not mutate the current SessionPlan and cannot advance difficulty without explicit user confirmation.

See:

- `docs/rnd/foss-fitness/PROMOTION_001_PROGRESSION_CANDIDATE.md`
- `support/schemas/progression_edge.schema.json`
- `support/fixtures/progression_candidate_cases.json`

## State required locally for Promotion 001

Eligibility must be derivable from persisted truth sufficient to establish:

- exact source exercise ID/version;
- planned target reps for every relevant set;
- actual completed reps;
- skipped/incomplete state;
- unique session identity;
- approved progression edge/revision;
- prior qualifying clean completions when the authored edge requires more than one.

Do not smuggle this state into React component state.

## Invariants to preserve

1. Same history + same rule/edge revision => same recommendation.
2. Missing history must not fabricate progression.
3. Draft/unapproved edges do not create production candidates.
4. A failed, skipped, or incomplete set cannot count as clean completion.
5. Exercise/version mismatches cannot satisfy another edge.
6. Duplicate event replay cannot inflate eligibility.
7. Progression never invents the destination movement.
8. Rule evaluation remains independent of network access and runtime AI.
9. A progression candidate never silently mutates an immutable started SessionPlan.
10. User confirmation is required before future difficulty changes.

## Target-independent promotion tests

The canonical support corpus now lives at:

`support/fixtures/progression_candidate_cases.json`

It covers:

- clean upper-range success;
- missing edge;
- draft edge;
- target below ceiling;
- incomplete set;
- skipped set;
- one set below ceiling;
- required clean-completion count;
- exercise version mismatch;
- duplicate observation deduplication.

## Deferred FitnessTrack capabilities

Keep as R&D until the local product model explicitly supports them:

- weighted load progression;
- weight caps;
- repeated-failure load deloads;
- ±15% weight deviation retargeting;
- adaptive fast/normal/slow tempo;
- descending-weight set-profile clamp;
- bodyweight overflow/add-set behavior.

Repeated-failure **rep-target** regression may be considered next only if authored local bounds are made explicit.

## Implementation policy

**ADAPT, do not transplant.**

Do not import FitnessTrack's:

- backend;
- auth model;
- database structure;
- API layer;
- page state;
- UI components.

Claude Code remains implementation owner. ChatGPT supplies source-backed rules, schemas, fixtures, acceptance criteria, and promotion packs.

## Promotion status

Completed support-side for Promotion 001:

- [x] upstream revision pinned
- [x] MIT license verified at pinned revision
- [x] local product-model mismatch documented
- [x] first compatible progression behavior selected
- [x] explicit edge schema supplied
- [x] deterministic acceptance corpus supplied
- [x] user-confirmation requirement preserved

Still required before production behavior exists:

- [ ] Claude implements the pure-domain rule
- [ ] production progression edges are authored/reviewed/approved
- [ ] persisted performance/progression state is wired as the evidence source
- [ ] `npm test` passes
- [ ] `npm run build` passes
- [ ] replay/reload determinism is verified
