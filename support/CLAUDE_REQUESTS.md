# Claude Requests

Use this mailbox when implementation reaches a product/data/spec/asset/test gap that should not be guessed.

## REQ-20260913-001 — Foundation Strength content pack (schema + data)

**Status:** OPEN — importer pipeline built 2026-09-17
**Progress:** `scripts/content/{upstreamTypes,importedExerciseCandidate,normalizeExercise,importFreeExerciseDb}.ts` (tested, `npm run import:free-exercise-db`) now ingest real, pinned, public-domain records from `yuhonas/free-exercise-db` (Unlicense) into `ImportedExerciseCandidate` staging records per `docs/rnd/foss-fitness/sources/free-exercise-db.md`. A 6-record fixture (`scripts/content/fixtures/freeExerciseDbSample.ts`, pinned at commit `a859101d633a01c4a1a920d6a8ce41dabba0705f`) has been run end-to-end and written to `content/staging/free-exercise-db-sample.json` — DRAFT, not production content; added to `support/REVIEW_QUEUE.md`. This still does not produce a curated "Foundation Strength" program (name/aliases/cues/commonErrors/prescriptionCapabilities/media still need human/ChatGPT enrichment per the importer's own "Missing local fields" list), and the importer has not been scaled to the full ~800-record upstream snapshot — that's a deliberate next step, not done here.
**Blocking:** no (schema validation and pure domain types can proceed against a placeholder/empty fixture; Today/Library/Workout Player screens are blocked without real content)
**Implementation context:** reconciliation steps 4 (content/schema validation), 9-11 (Today/check-in/preview, Workout Player, Library)
**Need:** the actual `foundation-strength` content pack — exercise records (identity/taxonomy/mechanics/setup/execution phases/cues/equipment/prescriptions/media manifest/provenance), the WorkoutTemplate(s) that compose them, and the pack manifest — in a concrete, versioned schema (JSON or TS), not prose.
**Why it matters:** RND_BACKLOG.md P0 #1 says this pack exists in the ChatGPT-side R&D reservoir (26 exercise drafts, 12 workout templates, 10 pack manifests) but nothing has been promoted into this repo yet. Without it there is no real data to validate a schema against or render in the app; anything I typed in myself would be invented exercise content, which CLAUDE.md explicitly forbids.
**Requested output:** schema + data (the actual pack, not just a description of one)
**Constraints already known:** stable exercise IDs with independent versioning; templates are immutable authored content; packs are versioned and declare dependencies; no runtime AI/asset generation — media is authored/reviewed externally.
**Proposed fallback if unresolved:** I will define the Exercise/WorkoutTemplate/Pack TypeScript types and a schema validator (e.g. zod) directly from SOURCE_OF_TRUTH_V06.md §5 and §9's structural description (this is establishing the announced shape, not inventing content), and validate against a single obviously-fake placeholder exercise (e.g. id `placeholder.test-exercise`) clearly marked as non-production, so the validation/domain-layer work in steps 4-8 isn't blocked waiting on real content.

## REQ-20260913-002 — Deterministic adaptation rule bundle + progression/substitution graph

**Status:** OPEN — double-progression rule implemented and tested 2026-09-17, not yet wired live
**Progress:** `src/domain/adaptation/rules/doubleProgression.ts` is a real, fully tested (8/8 target-independent test vectors from `docs/rnd/foss-fitness/sources/fitnesstrack.md`) deterministic double-progression function, behaviorally derived from `Gman0909/FitnessTrack` (MIT) — ADAPT, not transplanted. It is **not called from `adaptTemplate`/the live app yet**, because it needs per-exercise performance history the app does not currently capture: `SET_COMPLETED` events persist an empty `payload: {}` (no performed-reps recorded), `WorkoutTemplateExercise.prescription.reps` is a single number rather than a target range, and `ProgressionRecord` only tracks a coarse `level`, not a failure-streak/current-target state. Wiring this live requires those capture/schema changes plus a Workout Player UX decision (how a user logs reps actually performed per set) — that's real product-shape scope, not something to invent silently; still substitution/regression-equivalence graph data is untouched.
**Blocking:** no (the adaptation engine's pure decision-making shape/reason-code enum can be scaffolded now; it cannot make real decisions without this)
**Implementation context:** reconciliation step 5 (pure domain engines), §7-8 of SOURCE_OF_TRUTH_V06.md
**Need:** concrete rule values — the actual bounds for adjusting authored set/rep/rest within a session, which substitutions/regressions are approved-equivalent to which exercises, and the specific conditions that make a progression candidate eligible for "Try Next Level?"
**Why it matters:** §7-8 describe the *categories* of allowed decisions (retain/remove-optional/adjust-within-bounds/regression-or-substitution/mark-progression-candidate/compress) but give no actual thresholds or graph edges. Guessing bounds or equivalence pairs would be inventing progression/substitution relationships, which CLAUDE.md explicitly forbids.
**Requested output:** data (rule bundle) + schema
**Constraints already known:** every material decision must carry a machine-readable reason code; the engine must never invent a movement or fake equivalence; familiarity and progression are separate systems; progression requires explicit user confirmation.
**Proposed fallback if unresolved:** implement the engine's function signatures, reason-code enum, and control flow against a stub rule table with 1-2 obviously-placeholder rules, so the pure-domain-engine architecture (step 5) isn't blocked, while flagging that no session will actually adapt correctly until real rule data lands.

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
