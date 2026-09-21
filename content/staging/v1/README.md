# Content + Creative Staging Pack v1

Status: **DRAFT / STAGING — NOT CANONICAL COACHING CONTENT**

Generated: 2026-09-20

This pack intentionally adds high-value product content without modifying `src/` runtime implementation.

## Included

- 77 priority exercise editorial records with cues, common errors, safety boundary, and media filenames.
- 30 draft workout templates.
- 6 multi-week draft programs.
- 30 explicit exercise relationship edges.
- Reward layer: XP event proposals, 20 badges, 25 collectibles, 6 Pixel Bloom map zones.
- UI copy for workout, offline, failure, backup, profile and progression states.
- Creative-production manifest for 30 workout covers, P0 exercise media, mascot poses, badges and map zones.

## Integration rules

1. `editorial.*` exercise references are staging identities, not canonical runtime IDs.
2. Claude must map them to existing imported/canonical exercise IDs only when equivalence is explicit.
3. Imported provenance/license data must be preserved.
4. Do not silently promote any record from `draft` to `reviewed`/`approved`.
5. Progression edges do not authorize automatic progression; explicit confirmation remains required.
6. Rewards/collectibles/map state are presentation-only and must never modify workout prescriptions or durable session truth.
7. Stop/scale any exercise that causes sharp, sudden, or worsening pain; this pack is not medical or rehabilitation guidance.

## Files

- `exercise-editorial-v1.json`
- `workouts-programs-v1.json`
- `gameplay-copy-v1.json`
- `creative/creative-production-v1.json`

## Definition of useful

Claude can ingest this pack later without inventing content, filenames, progression relationships, reward vocabulary, or Pixel Bloom production scope.
