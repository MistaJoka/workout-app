# FOSS Fitness R&D Reservoir

This directory is a repository-native research corpus for mining open-source fitness software without allowing foreign architecture to dictate `workout-app`.

## Purpose

Convert external implementations into:

`source -> capability -> observed behavior -> invariants -> test vectors -> target interface -> implementation decision -> provenance`

The destination architecture remains authoritative. External repositories are knowledge donors, not architectural masters.

## Current target seams

- `src/domain/adaptation/` — deterministic adaptation rules and reason-coded decisions
- `src/domain/session/` — immutable session plans, state machine, timer, replay/reproducibility
- `src/domain/content/` — versioned exercise/template/content-pack schemas
- `src/infrastructure/db/` — Dexie persistence and repositories
- `src/infrastructure/exportImport/` — user-owned backup/restore
- `src/presentation/screens/WorkoutPlayerScreen.tsx` — workout execution UX
- `src/presentation/screens/ProgressScreen.tsx` — derived progress views
- `src/presentation/screens/LibraryScreen.tsx` — exercise/content discovery

## Rules for AI contributors

1. Do not copy an entire external architecture into this repository.
2. Do not add a backend, auth, cloud dependency, runtime LLM, MCP server, or global state library solely because a source project uses one.
3. For GPL/AGPL sources, treat implementation as specification/reference unless the project licensing strategy explicitly changes.
4. Track code license and asset/data license separately.
5. Prefer pure deterministic functions at the domain boundary.
6. Every promoted algorithm needs tests for nominal behavior, boundaries, repeated failures, malformed history, and replay determinism where relevant.
7. Every imported exercise/data record must pass the local content schema and carry provenance.
8. Existing `workout-app` interfaces win. Adapt the source concept to this codebase rather than reshaping this codebase around the source.

## Files

- `CAPABILITY_MATRIX.md` — 20-repository capability-to-target map
- `SOURCE_REGISTRY.md` — canonical source list and source roles
- `LICENSE_REGISTER.md` — conservative reuse lanes and asset-license warnings
- `sources/fitnesstrack.md` — deterministic progression engine extraction spec
- `sources/openworkout.md` — session/progression/stats extraction spec
- `sources/ischys.md` — offline progress/PR/e1RM extraction spec
- `sources/free-exercise-db.md` — exercise taxonomy/content import spec

## Promotion gate

A research item is ready to become application code only when it has:

- explicit target module
- required inputs/state
- deterministic outputs
- invariants
- edge cases
- test vectors
- license disposition
- provenance
- no hidden server/runtime-AI dependency

The current `src/domain/adaptation/engine.ts` intentionally contains placeholder rules. The first high-value promotion target is a tested deterministic progression ruleset behind that existing seam.
