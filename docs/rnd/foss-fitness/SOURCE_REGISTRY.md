# FOSS Fitness Source Registry

Canonical external-source registry for `workout-app` R&D.

## Tier A — core sources

### `Gman0909/FitnessTrack`
- Role: deterministic progression/adaptation engine reference
- Primary capabilities: double progression, progression hints, regression/stall handling, workout recap
- High-value paths:
  - `shared/algorithm.js`
  - `shared/algorithm.test.js`
  - `client/src/progressionHint.js`
  - `client/src/progressionHint.test.js`
  - `shared/recap.js`
- Local destination: `src/domain/adaptation/`
- Rule: extract behavior and tests; reshape to `AdaptationRule` and local reason codes.

### `open-workout/openworkout-mobile`
- Role: TypeScript implementation donor for workout flow, progression, history, and offline local data
- Primary capabilities: progressive overload, generated workouts, pending/resume flow, split rotation, streaks, stats
- High-value paths:
  - `lib/progressiveOverload.ts`
  - `lib/generateWorkout.ts`
  - `lib/pendingWorkout.ts`
  - `lib/splitRotation.ts`
  - `lib/statsPeriod.ts`
  - `lib/streak.ts`
  - `db/exerciseHistory.ts`
  - `db/exerciseStats.ts`
  - `db/muscleStats.ts`
  - `db/sets.ts`
  - `db/workouts.ts`
  - `__tests__/db/workout-flow.test.ts`
  - `__tests__/lib/generateWorkout.test.ts`
- Local destination: adaptation, session, future progress projectors
- Rule: code can inform implementation, but preserve event-sourced local architecture.

### `ischys-app/Ischys`
- Role: offline-first architecture sibling and progress-domain reference
- Primary capabilities: PR detection, estimated 1RM, volume, streaks, previous-session references, export/import
- High-value areas:
  - `frontend/src/domain/`
  - `frontend/src/db/`
  - `frontend/src/data/`
- Local destination: proposed `src/domain/progress/`, Workout Player projections, export/import
- Rule: separate code reuse decisions from artwork/media licensing.

### `yuhonas/free-exercise-db`
- Role: exercise ontology and seed-data source
- Primary capabilities: exercise names, instructions, force, level, mechanic, equipment, primary/secondary muscles, categories
- High-value areas:
  - `exercises/*.json`
  - repository schema/data files
- Local destination: content adapter -> `src/domain/content/`
- Rule: never import raw records as authoritative local objects; normalize, version, validate, and attach provenance.

## Tier B — strong specialist sources

### `Snouzy/workout-cool`
- Role: exercise metadata and import-pipeline reference
- Mine for: attribute modeling, localized metadata, content import tooling
- Target: proposed `scripts/content/`

### `astashov/liftosaur`
- Role: progression/deload rule encyclopedia
- Mine for: stateful progression patterns, failure thresholds, deload behavior, warmup calculations, program-rule test cases
- Target: adaptation specifications/tests
- Restriction: specification lane; do not transplant AGPL implementation.

### `Jollyhrothgar/github-fitness`
- Role: calculations and equipment-aware training reference
- Mine for: 1RM, rolling statistics, plate loading, substitutions, RPE targets
- Target: progress, prescription, player

### `LakBud/Fitoras`
- Role: local exercise-library UX reference
- Mine for: filters, search, equipment/muscle/category browsing, split editing
- Target: `LibraryScreen`, future program editor

### `guillermoscript/calistenia-app`
- Role: timed/circuit/isometric training reference
- Mine for: interval flow, timed work, circuits, skill progression
- Target: session/player
- Reject: runtime AI/backend/MCP requirements if not independently justified.

### `wifizak/CasettaFit`
- Role: workout execution/prescription UX reference
- Mine for: previous-set display, RPE, supersets, suggested weight, equipment/gym mappings
- Target: Player + future prescription extensions

## Tier C — targeted references

### `agadrap/calisthenics-90-day-tracker`
- Milestones, phases, baseline/retest loops, streak semantics

### `Gabriel-Hollenbeck22/IronPath`
- Native iPhone workout UX, haptic/rest interaction, simple overload benchmark

### `grossamos/weight_track_app`
- Statistical next-load suggestion experiments

### `brodeurlv/fastnfitness`
- Exercise modality/equipment/body-metric taxonomy

### `N-O-P-E/Ballast`
- Minimal offline PWA/streak UX

### `noahjutz/GymRoutines`
- Training-plan and mobile logging UX; specification/reference lane

### `EnjoyingFOSS/feeel`
- Interval/home-workout presentation and media UX; specification/reference lane

### `wger-project/wger`
- Mature exercise/workout ontology; specification/reference lane

## Tier D — deferred sensor/cardio sources

### `OpenTracksApp/OpenTracks`
- GPS, BLE HR, cadence, power, offline tracking, export/import
- Target only after a dedicated sensor/activity domain exists.

### `jonasoreland/runnerup`
- Interval running, pace/HR targets, audio cues, sensor integration
- Target only after cardio becomes an explicit product scope.

## Source ranking by current value

1. FitnessTrack — adaptation rules
2. OpenWorkout — session/progression implementation patterns
3. Ischys — progress metrics/offline architecture
4. free-exercise-db — content scale
5. Workout.cool — content ingestion pipeline
6. Liftosaur — advanced progression specification
7. github-fitness — calculations/substitutions/RPE
8. Fitoras — Library UX
9. Calistenia — timed/circuit workouts
10. CasettaFit — workout-player ergonomics

## Extraction template

Every deep-dive note should capture:

```text
SOURCE
SOURCE LICENSE
SOURCE REVISION OR DATE CHECKED
CAPABILITY
SOURCE LOCATION
OBSERVED INPUTS
OBSERVED OUTPUTS
STATE REQUIRED
INVARIANTS
EDGE CASES
TEST VECTORS
LOCAL TARGET
IMPLEMENTATION POLICY
PROVENANCE REQUIREMENTS
OPEN QUESTIONS
```
