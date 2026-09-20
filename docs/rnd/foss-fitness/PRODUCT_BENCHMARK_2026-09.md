# FOSS Fitness Product Benchmark — 2026-09

**Status:** R&D / PRODUCT BENCHMARK, NOT RUNTIME AUTHORITY  
**Purpose:** identify proven user capabilities worth matching or deliberately rejecting without transplanting incompatible architectures/licenses.

Use with `CAPABILITY_MATRIX.md` and `LICENSE_REGISTER.md`.

## Benchmark principle

The goal is not to clone one fitness app. It is to combine the strongest proven interaction patterns while preserving this product's advantages:

- local/offline-first core;
- deterministic/event-sourced workouts;
- iPhone-first execution;
- no account/backend requirement;
- curated content lane plus broad discovery library;
- strong visual identity and authored exercise media;
- game-like progression without runtime AI invention.

## 1. Liftosaur — flexibility / workout intelligence benchmark

Repo: https://github.com/astashov/liftosaur  
License: AGPL — specification/behavior reference, do not transplant source casually.

Current public feature set includes:
- PWA/mobile delivery;
- offline mode;
- customizable programs;
- programmable progression/deload logic;
- workout history;
- rest timers;
- graphs;
- exercise substitution;
- custom exercises;
- warm-up sets;
- previous-set/results context;
- body-weight/measurement tracking;
- shareable programs.

High-value lessons for this app:
- workouts become dramatically more useful when previous performance appears at execution time;
- progression logic should be explicit/testable rather than hidden magic;
- program definition and execution state should remain separate;
- local IndexedDB/offline execution is viable at substantial feature depth;
- a powerful product can keep complex logic out of the immediate set-completion UX.

Do **not** copy:
- Liftoscript/programmability merely for feature parity;
- cloud/account architecture;
- unrestricted complexity that makes a personal guided app feel like an IDE.

Source: https://github.com/astashov/liftosaur/blob/master/README.md

## 2. wger — ontology / mature data-model benchmark

Repo: https://github.com/wger-project/wger  
License lane: AGPL — specification/reference.

Useful benchmark areas:
- mature exercise taxonomy;
- workout/program organization;
- body measurements;
- categories/equipment/muscle data;
- long-lived project structure and internationalization concerns.

High-value lesson:
> exercise data becomes infrastructure. Stable IDs, taxonomy and provenance matter more over time than UI-specific shapes.

Our app should remain much smaller operationally; wger is a reference for data maturity, not deployment architecture.

## 3. OpenWorkout — practical mobile workflow benchmark

Existing local research: `docs/rnd/foss-fitness/sources/openworkout.md`

Useful behaviors:
- progressive overload;
- pending/resumable workout flow;
- split/rotation handling;
- streak/history patterns;
- practical mobile persistence.

High-value lesson:
> resume and "what do I do next?" UX should feel immediate. Durable state should disappear into the product rather than feel like a database feature.

## 4. Ischys — local progress intelligence benchmark

Existing local research: `docs/rnd/foss-fitness/sources/ischys.md`

Useful behaviors:
- personal records;
- estimated 1RM;
- volume/streak projections;
- previous-session references;
- local-first data patterns.

High-value lesson:
> keep raw workout history durable, then build multiple projections on top. Do not replace historical truth with the latest derived metric.

## 5. FitnessTrack — progression behavior benchmark

Existing local research: `docs/rnd/foss-fitness/sources/fitnesstrack.md`

Useful behavior:
- double progression;
- stalls/failures;
- load/repetition changes;
- testable progression algorithms.

This source already informed the local deterministic progression work. Continue to treat behavioral ideas separately from product-specific rules.

## 6. free-exercise-db — discovery content benchmark

Repo/source research: `docs/rnd/foss-fitness/sources/free-exercise-db.md`

Useful:
- broad exercise taxonomy;
- equipment/muscle/mechanics fields;
- instructions/media references;
- permissive/public-domain lane used by the current importer.

High-value lesson:
> a broad discovery catalog and a reviewed curated coaching pack are different trust levels. Keep them distinct.

## 7. Feeel / home-workout apps — execution/media benchmark

Existing matrix source: `EnjoyingFOSS/feeel`.

Useful concepts:
- movement-first home workout execution;
- interval/timed exercise UX;
- media-forward guidance.

High-value lesson:
> workout instruction should not collapse into text logging. The active screen must communicate motion quickly.

## 8. Product capability scorecard

Legend: **LIVE** = meaningful current implementation; **PARTIAL** = present but shallow/temporary; **NEXT** = high-value context-engineered target; **DEFER** = not current product goal.

| Capability | Status | Notes |
|---|---|---|
| offline local workout execution | LIVE/PARTIAL | architecture exists; true offline E2E still required |
| durable resume | LIVE | event/session persistence |
| previous performance | LIVE | `lastTime` path |
| custom routines | LIVE | local builder |
| weekly schedule | LIVE | secondary route/Today resolver |
| broad exercise discovery | LIVE | lazy generated library |
| weighted logging | LIVE | per-set adjustment supported |
| body weight | LIVE | local history |
| deterministic progression | LIVE | confirmation-gated candidates |
| rich exercise substitutions | NEXT | requires reviewed graph; do not infer |
| warm-up prescriptions | NEXT/optional | benchmark feature, must be authored |
| richer PR/e1RM/volume projections | PARTIAL/NEXT | domain foundation exists |
| high-fidelity exercise loops | NEXT | Pixel Bloom creative pipeline |
| mascot/reward game layer | NEXT | creative differentiator |
| progression map/collectibles | NEXT | presentation/progression visualization only |
| cloud account/sync | DEFER | core must remain local |
| social feed | DEFER | not product identity |
| runtime AI coach | DEFER | explicitly excluded |
| camera form analysis | DEFER | explicitly excluded |

## 9. Competitive direction

The strongest differentiation is not "more features than Liftosaur/wger."

It is:

```text
reliable local fitness engine
        +
frictionless guided workout UX
        +
reviewed rich movement media
        +
Pixel Bloom world/personality
        +
transparent progression
```

The product can borrow mature capabilities while remaining much easier to understand.

## 10. Feature-adoption rule

Before adopting a leader feature:
1. identify the user problem it solves;
2. verify it matches this product's identity;
3. check source license;
4. map behavior to existing local architecture;
5. define authoritative product rule/data;
6. write acceptance cases;
7. only then implement.

Popularity is not a reason to import complexity.