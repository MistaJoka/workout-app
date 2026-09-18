# Claude Requests

Use this mailbox when implementation reaches a product/data/spec/asset/test gap that should not be guessed.

## REQ-20260913-001 — Foundation Strength content pack (schema + data)

**Status:** OPEN
**Blocking:** no (schema validation and pure domain types can proceed against a placeholder/empty fixture; Today/Library/Workout Player screens are blocked without real content)
**Implementation context:** reconciliation steps 4 (content/schema validation), 9-11 (Today/check-in/preview, Workout Player, Library)
**Need:** the actual `foundation-strength` content pack — exercise records (identity/taxonomy/mechanics/setup/execution phases/cues/equipment/prescriptions/media manifest/provenance), the WorkoutTemplate(s) that compose them, and the pack manifest — in a concrete, versioned schema (JSON or TS), not prose.
**Why it matters:** RND_BACKLOG.md P0 #1 says this pack exists in the ChatGPT-side R&D reservoir (26 exercise drafts, 12 workout templates, 10 pack manifests) but nothing has been promoted into this repo yet. Without it there is no real data to validate a schema against or render in the app; anything I typed in myself would be invented exercise content, which CLAUDE.md explicitly forbids.
**Requested output:** schema + data (the actual pack, not just a description of one)
**Constraints already known:** stable exercise IDs with independent versioning; templates are immutable authored content; packs are versioned and declare dependencies; no runtime AI/asset generation — media is authored/reviewed externally.
**Proposed fallback if unresolved:** I will define the Exercise/WorkoutTemplate/Pack TypeScript types and a schema validator (e.g. zod) directly from SOURCE_OF_TRUTH_V06.md §5 and §9's structural description (this is establishing the announced shape, not inventing content), and validate against a single obviously-fake placeholder exercise (e.g. id `placeholder.test-exercise`) clearly marked as non-production, so the validation/domain-layer work in steps 4-8 isn't blocked waiting on real content.

## REQ-20260913-002 — Deterministic adaptation rule bundle + progression/substitution graph

**Status:** PARTIALLY RESOLVED — Promotion 001 progression-candidate slice delivered
**Blocking:** no
**Implementation context:** reconciliation step 5 (pure domain engines), §7-8 of SOURCE_OF_TRUTH_V06.md

**Delivered for the first progression slice:**

- `docs/rnd/foss-fitness/PROMOTION_001_PROGRESSION_CANDIDATE.md`
- `support/schemas/progression_edge.schema.json`
- `support/fixtures/progression_candidate_cases.json`
- pinned/verified FitnessTrack reference in `docs/rnd/foss-fitness/sources/fitnesstrack.md`

**Resolved behavior:** a clean completion at an authored upper repetition bound may emit `PROGRESSION_CANDIDATE` only when an explicit approved harder-variant edge exists. The candidate never mutates the current immutable SessionPlan and never advances difficulty without explicit user confirmation.

**Important compatibility decision:** FitnessTrack's weighted double-progression behavior remains R&D only. The current product defines progression as an authored harder-variant choice and the current SessionPlan model has no first-class load prescription, so weight bumps/deloads must not be transplanted into the live domain by inference.

**Still open / must not be guessed:**

- actual production progression edges using reviewed canonical exercise IDs/versions;
- approved regression/substitution graph edges;
- concrete in-session authored set/rep/rest adjustment bounds beyond Promotion 001;
- session-compression priority/coverage rules;
- any future repeated-failure rule values not explicitly authored.

**Why it matters:** the engine may now implement and verify the deterministic candidate mechanism against fake support fixtures, but production difficulty changes still require real reviewed content relationships. Guessing those relationships would violate `CLAUDE.md`.

**Requested remaining output:** production data (progression/regression/substitution graph + authored adjustment bounds), then additional focused promotion specs as needed.

**Constraints already known:** every material decision carries a machine-readable reason code; the engine never invents a movement or fake equivalence; familiarity and progression remain separate; progression requires explicit user confirmation; production edges must be authored and approved.

**Safe implementation path now:** Claude may implement Promotion 001 as pure domain logic and tests using the support fixture corpus. With zero approved production edges loaded, production behavior must safely produce no progression candidate rather than infer one.

## REQ-20260913-003 — Pixel Bloom / Savage Core design tokens

**Status:** OPEN
**Blocking:** no
**Implementation context:** reconciliation step 12 (shared semantic theme engine), §11 of SOURCE_OF_TRUTH_V06.md
**Need:** actual design tokens (color values, typography scale, spacing, motion durations/easing for full/reduced/off) for both themes — §11 only gives a narrative description ("pastel foundations," "near-black/graphite surfaces," "electric accents").
**Why it matters:** without concrete values I'd be inventing the visual design myself. That's acceptable as a placeholder (the human owner already said an ugly-but-functional app is fine for now) but not as the final "first-class theme" the source of truth describes.
**Requested output:** data (token set) — a design-tokens JSON/TS file per theme is ideal, referencing RND_BACKLOG.md P1 #5 and P0 #4 (theme component-state matrix)
**Constraints already known:** one shared component tree, themes control semantic tokens only, exercise content/behavior does not change by theme, must respect `prefers-reduced-motion`.
**Proposed fallback if unresolved:** ship both themes as minimal, clearly-placeholder token sets (e.g. two contrasting but unpolished palettes) so the theme-switching *architecture* can be built and tested now; explicitly not treating the placeholder visuals as the delivered "first-class" theme design.

## Template

```md
## REQ-YYYYMMDD-NNN — Short title

**Status:** OPEN
**Blocking:** yes | no
**Implementation context:**
**Need:**
**Why it matters:**
**Requested output:** spec | data | schema | fixture | research | asset | acceptance test | decision
**Constraints already known:**
**Proposed fallback if unresolved:**
```
