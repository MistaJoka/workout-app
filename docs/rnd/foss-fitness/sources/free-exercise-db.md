# Source Deep Dive — free-exercise-db

## Source

- Repository: `yuhonas/free-exercise-db`
- Role: primary exercise taxonomy and seed-data source
- License lane: public-domain / Unlicense-style source; exact upstream license verified in `LICENSE.md`
- Priority: **P0**

## Verified source structure

The current `main` branch contains:

```text
LICENSE.md
README.md
schema.json
exercises/
dist/
```

The authoritative schema is explicit and machine-readable.

## Verified upstream exercise schema

Fields:

```text
id: string
name: string
force: static | pull | push | null
level: beginner | intermediate | expert
mechanic: isolation | compound | null
equipment: enumerated string | null
primaryMuscles: string[]
secondaryMuscles: string[]
instructions: string[]
category: enumerated string
images: string[]
```

### Verified equipment vocabulary

Includes:

```text
medicine ball
dumbbell
body only
bands
kettlebells
foam roll
cable
machine
barbell
exercise ball
e-z curl bar
other
null
```

### Verified muscle vocabulary

Includes:

```text
abdominals
abductors
adductors
biceps
calves
chest
forearms
glutes
hamstrings
lats
lower back
middle back
neck
quadriceps
shoulders
traps
triceps
```

### Verified categories

```text
powerlifting
strength
stretching
cardio
olympic weightlifting
strongman
plyometrics
```

## Local target

The upstream schema must **not** replace the local content schema.

Current local `Exercise` is richer in lifecycle/provenance and presentation fields:

```text
id
version
name
aliases[]
taxonomy.category
taxonomy.equipment[]
setup
executionPhases[]
cues[]
commonErrors[]
prescriptionCapabilities
mediaManifest
provenance
```

The correct architecture is an ingestion adapter:

```text
free-exercise-db source record
          ↓
parse upstream schema
          ↓
normalize vocabulary
          ↓
map to local draft Exercise
          ↓
manual/AI enrichment where required
          ↓
validateContentPack()
          ↓
approved versioned local content
```

## Proposed field mapping

| Upstream | Local destination | Policy |
|---|---|---|
| `id` | provenance source ID + candidate local ID | do not blindly make upstream IDs permanent local IDs |
| `name` | `name` | direct candidate |
| `category` | `taxonomy.category` | normalize to local vocabulary |
| `equipment` | `taxonomy.equipment[]` | convert nullable scalar to normalized array |
| `instructions[]` | `setup` + `executionPhases[]` | split semantically; do not concatenate blindly |
| `force` | future taxonomy metadata | preserve in staging even if local production schema does not yet expose it |
| `mechanic` | future taxonomy metadata | preserve in staging |
| `level` | future difficulty metadata | preserve in staging |
| `primaryMuscles[]` | future muscle taxonomy | preserve in staging |
| `secondaryMuscles[]` | future muscle taxonomy | preserve in staging |
| `images[]` | **HOLD** | independently verify media rights/provenance before use |

## Missing local fields

The source cannot directly provide all local fields with sufficient quality:

```text
aliases[]
cues[]
commonErrors[]
prescriptionCapabilities
reviewedAt/status
local media manifest
```

These must be derived/enriched under explicit review rather than fabricated during import.

## Staging model

Before changing the production `Exercise` type, use an import/staging shape capable of preserving all upstream information:

```text
ImportedExerciseCandidate
├── sourceRepo
├── sourceRevision
├── sourceRecordId
├── sourceLicense
├── sourceName
├── force
├── level
├── mechanic
├── equipment
├── primaryMuscles[]
├── secondaryMuscles[]
├── instructions[]
├── category
├── imageRefs[]
├── normalizedDraft
├── warnings[]
└── reviewStatus
```

This prevents information loss while keeping the production schema stable.

## Proposed tooling

Do not add until content ingestion work is explicitly promoted, but preferred structure is:

```text
scripts/content/
├── import-free-exercise-db.ts
├── normalize-exercises.ts
├── audit-exercises.ts
├── validate-pack.ts
└── generate-pack.ts
```

### `import-free-exercise-db.ts`

Responsibilities:

- read a pinned source snapshot
- validate against upstream assumptions
- retain exact source record ID
- create staging records
- never write directly into production content without validation

### `normalize-exercises.ts`

Responsibilities:

- normalize equipment labels
- normalize category names
- normalize whitespace/casing
- identify duplicates/near-duplicates
- preserve source values alongside normalized values

### `audit-exercises.ts`

Generate review queues for:

- missing instructions
- null force/mechanic/equipment
- unsupported local category/equipment mappings
- duplicate names/aliases
- suspiciously short/long instructions
- missing prescription capability decisions
- media references requiring license review

### `validate-pack.ts`

Run the existing local content-pack validation before promotion.

## Data-quality controls

### Identity

Do not assume exercise names are globally unique. Use source repo + source record ID + pinned revision for provenance.

### Taxonomy drift

Upstream enums can change. The importer should fail visibly on unknown values rather than silently collapse them into `other` unless an explicit mapping says so.

### Duplicates and variants

Near-duplicate exercise names may represent:

- true duplicates
- equipment variants
- stance/grip variants
- unilateral/bilateral variants
- legitimate technique variants

Do not deduplicate by normalized name alone.

### Instructions

Treat upstream instructions as source material, not guaranteed coaching truth. Local `setup`, `executionPhases`, `cues`, and `commonErrors` should be reviewed separately.

### Media

Do not automatically pull or ship referenced images merely because the structured dataset is permissively licensed. Media provenance is a separate gate.

## Import test vectors

### F1 — ordinary weighted exercise

```text
name: valid
category: strength
equipment: barbell
instructions: multiple lines
expected: normalized draft with equipment array and preserved instructions
```

### F2 — body-only exercise

```text
equipment: body only
expected: canonical local bodyweight-equipment mapping
```

### F3 — null equipment

```text
equipment: null
expected: explicit empty/unknown normalized value + audit warning; no crash
```

### F4 — null mechanic/force

```text
mechanic: null
force: null
expected: source values preserved; import remains valid
```

### F5 — unknown future enum

```text
upstream value not recognized by pinned importer
expected: fail/audit loudly rather than silently discard
```

### F6 — incomplete local enrichment

```text
upstream record valid but local cues/commonErrors absent
expected: draft/review state, not approved production content
```

### F7 — duplicate display name

```text
two upstream records normalize to same name
expected: both retained for review with distinct provenance IDs
```

## Schema-extension candidates

The upstream data suggests useful future taxonomy fields:

```text
force
mechanic
level
primaryMuscles[]
secondaryMuscles[]
```

Do **not** add them yet merely because the source contains them.

Promotion should require at least one concrete consumer, such as:

- Library filtering
- substitution/equivalence rules
- muscle-volume projections
- exercise generation
- difficulty-aware adaptation

## License/provenance control

The upstream license dedicates the software/data source to the public domain and points to the Unlicense. Still record:

```text
sourceRepo
sourceRevision
sourceRecordId
sourceLicense
transformedAt
```

This is useful for reproducibility, updates, corrections, and future data reconciliation even when attribution is not legally required.

## Recommended first promotion

Do **not** import hundreds of exercises first.

Build the importer against a deliberately small fixture set covering:

1. weighted compound
2. isolation movement
3. bodyweight movement
4. null-equipment record
5. stretching/cardio category
6. duplicate/variant naming

Once those pass local validation and provenance checks, scale the same pipeline to the full source snapshot.
