# FOSS Fitness License Register

Engineering control for external code/data/media research. This is not legal advice.

## Policy

Treat **code**, **data**, and **media/assets** as independently licensed materials. A permissive repository license does not automatically grant identical rights to bundled or externally sourced images, videos, exercise illustrations, datasets, or fonts.

Before any direct reuse is promoted into application code or shipped content:

1. verify the source repository's current `LICENSE` at the exact revision used;
2. inspect file-level notices and third-party attribution files;
3. inspect asset/data-specific licensing statements;
4. record source revision and local transformed artifact;
5. preserve required copyright/license notices;
6. reject any source whose obligations conflict with the intended distribution model.

## Reuse lanes

### Lane A — permissive implementation reference

Working classification from the current R&D pass:

- `Gman0909/FitnessTrack` — MIT lane
- `open-workout/openworkout-mobile` — MIT lane for application code; exercise media must be checked separately
- `ischys-app/Ischys` — MIT lane for code; artwork/media must be checked separately
- `Snouzy/workout-cool` — MIT lane
- `Jollyhrothgar/github-fitness` — MIT lane
- `LakBud/Fitoras` — Apache-2.0 lane
- `guillermoscript/calistenia-app` — MIT lane
- `wifizak/CasettaFit` — MIT lane
- `agadrap/calisthenics-90-day-tracker` — MIT lane
- `Gabriel-Hollenbeck22/IronPath` — MIT lane
- `grossamos/weight_track_app` — MIT lane
- `brodeurlv/fastnfitness` — BSD-3-Clause lane
- `N-O-P-E/Ballast` — MIT lane
- `OpenTracksApp/OpenTracks` — Apache-2.0 lane
- `yuhonas/free-exercise-db` — Unlicense/public-domain style lane

**Control:** permissive does not mean copy indiscriminately. Prefer behavioral extraction and local reimplementation when that produces a cleaner fit. Preserve all notices required by the exact license.

### Lane B — specification / clean-room behavioral reference

Working classification:

- `astashov/liftosaur` — AGPL-3.0 lane
- `EnjoyingFOSS/feeel` — AGPL-3.0 lane
- `wger-project/wger` — AGPL-3.0+ lane
- `noahjutz/GymRoutines` — GPL-3.0+ lane
- `jonasoreland/runnerup` — GPL-3.0 lane

**Control:** do not copy implementation into this project under the current licensing posture. Extract capability descriptions, inputs, outputs, invariants, state transitions, edge cases, and black-box test vectors; then independently implement against local interfaces.

## Asset and dataset controls

### OpenWorkout

Application code and exercise media must be treated separately. Do not assume animation/image rights from the code license. Record every media source independently before importing any asset.

### Ischys

Treat exercise artwork/media as a separate licensing surface from code. Do not bundle source artwork into this project until its exact asset license and attribution/share-alike requirements are confirmed against the intended distribution model.

### free-exercise-db

Even when the dataset/code is in a public-domain/Unlicense-style lane, inspect any referenced image paths or externally sourced imagery separately. Prefer importing structured text/taxonomy data first; keep media out of the pipeline until independently verified.

## Provenance fields

When content is promoted, prefer extending local provenance to support:

```ts
{
  author: string
  reviewedAt: string | null
  status: 'draft' | 'reviewed' | 'approved'
  sourceRepo?: string
  sourceRevision?: string
  sourceRecordId?: string
  sourceLicense?: string
  assetLicense?: string
  transformedAt?: string
}
```

Do not change the production schema solely because this document proposes fields. Promote them through normal schema/version review when content ingestion begins.

## Promotion checklist

A source-derived capability is not ready for merge until:

- [ ] exact upstream revision recorded
- [ ] exact upstream license verified
- [ ] file-level/third-party notices checked
- [ ] asset/data license checked separately
- [ ] local implementation mode chosen: ADOPT / ADAPT / SPEC
- [ ] source paths recorded
- [ ] tests demonstrate intended behavior without importing unrelated architecture
- [ ] required attribution/notices prepared
- [ ] no new runtime/network dependency was introduced accidentally

## Conservative default

When uncertain, use the source only to understand **what behavior exists**, not as code to copy. A clean local implementation backed by independent tests is the default low-risk path.
