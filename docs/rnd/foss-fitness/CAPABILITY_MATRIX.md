# FOSS Fitness Capability Matrix

This matrix maps useful behavior from external FOSS projects into the existing `workout-app` architecture.

## Disposition legend

- **ADOPT** — permissive source; implementation concepts may be adapted with required notices/attribution.
- **ADAPT** — extract behavior and rewrite to local interfaces rather than transplanting architecture.
- **SPEC** — GPL/AGPL or otherwise unsuitable for direct code reuse; use as behavioral/specification reference and independently implement.
- **DEFER** — useful later, not part of the current core.

## Repository matrix

| # | Source | License lane | Primary useful capability | High-value source area | Target in `workout-app` | Disposition |
|---|---|---|---|---|---|---|
| 1 | `Gman0909/FitnessTrack` | Permissive | Double progression, stalls, regressions, load/repetition progression, recap | `shared/algorithm.js`, `shared/algorithm.test.js`, `client/src/progressionHint.js` | `src/domain/adaptation/` | **ADAPT — P0** |
| 2 | `open-workout/openworkout-mobile` | Permissive | Progressive overload, generated workouts, pending/resume flow, split rotation, streaks, history/stats | `lib/progressiveOverload.ts`, `lib/generateWorkout.ts`, `lib/pendingWorkout.ts`, `db/*`, tests | adaptation, session, progress | **ADOPT/ADAPT — P0** |
| 3 | `ischys-app/Ischys` | Permissive code; assets separate | PR detection, e1RM, volume, streaks, previous-session references, local-first data | `frontend/src/domain/`, `frontend/src/db/`, `frontend/src/data/` | new `src/domain/progress/`, player/history | **ADAPT — P0** |
| 4 | `yuhonas/free-exercise-db` | Public-domain/Unlicense lane | Large exercise taxonomy/data set: muscles, equipment, mechanics, force, difficulty, instructions | `exercises/*.json`, schema/data files | `src/domain/content/` via importer | **ADOPT — P0** |
| 5 | `Snouzy/workout-cool` | Permissive | Exercise metadata, import pipeline, attribute modeling, workout/program organization | exercise import/data tooling | `scripts/content/`, content packs | **ADAPT — P1** |
| 6 | `astashov/liftosaur` | AGPL | Programmable progression/deload rules, warmups, stateful training logic | Liftoscript docs, built-in programs, parser/models | adaptation rule specifications/tests | **SPEC — P0** |
| 7 | `Jollyhrothgar/github-fitness` | Permissive | 1RM calculations, rolling stats, confidence bands, plate loading, substitutions, RPE targets | `src/lib/calculations.ts`, plan schema/workout UI | `src/domain/progress/`, content/player | **ADAPT — P1** |
| 8 | `LakBud/Fitoras` | Permissive | Exercise search/filtering, split editing, calendar, IndexedDB/local UX | exercise filter/library and split modules | `LibraryScreen`, future program editor | **ADAPT — P1** |
| 9 | `guillermoscript/calistenia-app` | Permissive | Timed/isometric exercise, circuits, HIIT, skill progression, shared training core | `packages/core`, mobile/web workout flow | session/player | **ADAPT — P1** |
| 10 | `wifizak/CasettaFit` | Permissive | Previous-set display, RPE, supersets, suggested loads, equipment/gym mapping | workout/program/exercise modules | player + future prescription | **ADAPT — P1** |
| 11 | `agadrap/calisthenics-90-day-tracker` | Permissive | Phases, baselines, retests, milestones, rest-day streak semantics | tracker logic | progress/milestone projections | **ADAPT — P2** |
| 12 | `Gabriel-Hollenbeck22/IronPath` | Permissive | Simple overload heuristic, iPhone workout UX, rest/haptic patterns, volume | SwiftUI workout flow | benchmark tests + player UX | **ADAPT — P2** |
| 13 | `grossamos/weight_track_app` | Permissive | Statistical next-load recommendation | calculation/test modules | experimental adaptation strategy | **ADAPT — P2** |
| 14 | `brodeurlv/fastnfitness` | Permissive | Strength/cardio/isometric modality model, equipment, body metrics | app domain model | taxonomy + future progress | **ADAPT — P2** |
| 15 | `N-O-P-E/Ballast` | Permissive | Very small offline PWA/streak UX | PWA frontend | PWA/presentation reference | **ADAPT — P2** |
| 16 | `noahjutz/GymRoutines` | GPL | Training-plan creation and mobile logging UX | application UI/domain | Library/Player UX reference | **SPEC — P2** |
| 17 | `EnjoyingFOSS/feeel` | AGPL | Home-workout execution, exercise media, interval UX | app/library/assets | content/player reference | **SPEC — P2** |
| 18 | `wger-project/wger` | AGPL | Mature exercise/workout ontology, body measures, categories | domain/API models | taxonomy reference | **SPEC — P1** |
| 19 | `OpenTracksApp/OpenTracks` | Permissive | GPS/BLE/HR/cadence/power sensors, robust export/import, offline tracking | tracking/sensor/database modules | future sensor/activity domain | **DEFER — P3** |
| 20 | `jonasoreland/runnerup` | GPL | Intervals, target HR/pace, audio cues, sensor handling | app/common modules | future cardio engine | **DEFER/SPEC — P3** |

## Capability -> target map

| Capability | Primary source | Secondary source | Local target |
|---|---|---|---|
| Deterministic adaptation decisions | FitnessTrack | Liftosaur | `src/domain/adaptation/` |
| Progressive overload | OpenWorkout | FitnessTrack | `src/domain/adaptation/engine.ts` |
| Deload/regression | Liftosaur | FitnessTrack | adaptation rules |
| Workout/session generation | OpenWorkout | Liftosaur | `src/domain/session/createSessionPlan.ts` |
| Session resume/state | OpenWorkout | Ischys | `src/domain/session/sessionMachine.ts` + persistence |
| Rest logic | OpenWorkout | Calistenia | `src/domain/session/restTimer.ts` |
| Previous performance lookup | Ischys | CasettaFit | progress projections + player |
| PR detection | Ischys | github-fitness | new `src/domain/progress/` |
| Estimated 1RM | Ischys | github-fitness | new `src/domain/progress/` |
| Volume/workload | Ischys | IronPath | new `src/domain/progress/` |
| Streaks | OpenWorkout | 90-Day Tracker | new `src/domain/progress/` |
| Exercise taxonomy | free-exercise-db | wger | `src/domain/content/` |
| Content importer | Workout.cool | free-exercise-db | proposed `scripts/content/` |
| Exercise filtering | Fitoras | Workout.cool | `LibraryScreen` |
| Equipment taxonomy | free-exercise-db | FastNFitness | content schema/data |
| Substitution groups | github-fitness | Liftosaur | content + adaptation |
| RPE | CasettaFit | github-fitness | future prescription extension |
| Set types | Ischys | OpenWorkout | future prescription/session extension |
| Supersets | CasettaFit | Calistenia | future session extension |
| Timed/isometric work | Calistenia | Feeel | session/player |
| Haptics | IronPath | Ischys | player/presentation |
| Charts/history | Ischys | OpenWorkout | `ProgressScreen` |
| Backup/export | Ischys | OpenWorkout | `src/infrastructure/exportImport/` |
| PWA offline patterns | Ballast | github-fitness | `public/sw.js`, PWA registration |
| GPS | OpenTracks | RunnerUp | deferred sensor domain |
| Heart-rate sensors | OpenTracks | RunnerUp | deferred sensor domain |
| Interval running | RunnerUp | OpenTracks | deferred cardio domain |

## Recommended local modules

Do not create these until promoted capabilities require them, but this is the preferred shape:

```text
src/domain/progress/
├── calculateVolume.ts
├── estimate1RM.ts
├── detectPersonalRecords.ts
├── calculateStreak.ts
├── aggregateTrainingWeek.ts
├── projectExerciseHistory.ts
├── projectMuscleVolume.ts
└── types.ts

scripts/content/
├── import-exercises.ts
├── normalize-exercises.ts
├── audit-exercises.ts
├── validate-pack.ts
└── generate-pack.ts
```

## Non-goals

Do not introduce any of the following merely because a source project uses them:

- backend/server-owned workout state
- authentication
- Firebase/PocketBase/Postgres
- runtime LLM dependency
- MCP dependency
- Redux/Zustand/global state library
- cloud sync as a prerequisite for core functionality
- `localStorage` as authoritative workout persistence

The local architecture remains event-sourced, Dexie-backed, deterministic, offline-first, and single-user unless a later product decision explicitly changes those constraints.
