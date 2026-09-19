# Claude Requests

Use this mailbox when implementation reaches a product/data/spec/asset/test gap that should not be guessed.

## REQ-20260913-001 — Foundation Strength content pack (schema + data)

**Status:** OPEN — a real (but draft/starter) pack is live in the app; expanded 2026-09-18 to 9 exercises / 3 templates (Full-Body A, Full-Body B, Quick 10) with start/finish movement photos for every exercise (`public/exercise-media/`, animated as a two-frame loop in the Workout Player, static side-by-side under reduced/off motion). Still draft: cues/commonErrors empty, prescriptions are conventional defaults, media is upstream photography pending Pixel Bloom Batch 7.
**Progress:** `scripts/content/{upstreamTypes,importedExerciseCandidate,normalizeExercise,importFreeExerciseDb}.ts` (tested, `npm run import:free-exercise-db`) ingest real, pinned, public-domain records from `yuhonas/free-exercise-db` (Unlicense) per `docs/rnd/foss-fitness/sources/free-exercise-db.md`. Beyond the original 6-record demo fixture and its staged output in `content/staging/`, `src/domain/content/fixtures/foundationStrengthStarter.ts` now promotes 5 real, curated bodyweight-beginner exercises (Bodyweight Squat, Incline Push-Up, Single Leg Glute Bridge, Dead Bug, Plank) into an actual `ContentPack`/`WorkoutTemplate` — `provenance.status: 'draft'` on every exercise — and Today/Library/Check-In/Session Preview/Workout Player all render it live (replacing "Placeholder Exercise A/B" entirely, verified in the browser). Still open: `cues`/`commonErrors`/`prescriptionCapabilities` beyond a coarse heuristic, media, and aliases are unreviewed/empty; this 5-exercise starter is a fraction of the ~26-exercise/12-template program the R&D reservoir describes; the importer hasn't been scaled past this hand-picked set.
**Blocking:** no (schema validation and pure domain types can proceed against a placeholder/empty fixture; Today/Library/Workout Player screens are blocked without real content)
**Implementation context:** reconciliation steps 4 (content/schema validation), 9-11 (Today/check-in/preview, Workout Player, Library)
**Need:** the actual `foundation-strength` content pack — exercise records (identity/taxonomy/mechanics/setup/execution phases/cues/equipment/prescriptions/media manifest/provenance), the WorkoutTemplate(s) that compose them, and the pack manifest — in a concrete, versioned schema (JSON or TS), not prose.
**Why it matters:** RND_BACKLOG.md P0 #1 says this pack exists in the ChatGPT-side R&D reservoir (26 exercise drafts, 12 workout templates, 10 pack manifests) but nothing has been promoted into this repo yet. Without it there is no real data to validate a schema against or render in the app; anything I typed in myself would be invented exercise content, which CLAUDE.md explicitly forbids.
**Requested output:** schema + data (the actual pack, not just a description of one)
**Constraints already known:** stable exercise IDs with independent versioning; templates are immutable authored content; packs are versioned and declare dependencies; no runtime AI/asset generation — media is authored/reviewed externally.
**Proposed fallback if unresolved:** I will define the Exercise/WorkoutTemplate/Pack TypeScript types and a schema validator (e.g. zod) directly from SOURCE_OF_TRUTH_V06.md §5 and §9's structural description (this is establishing the announced shape, not inventing content), and validate against a single obviously-fake placeholder exercise (e.g. id `placeholder.test-exercise`) clearly marked as non-production, so the validation/domain-layer work in steps 4-8 isn't blocked waiting on real content.

## REQ-20260913-002 — Deterministic adaptation rule bundle + progression/substitution graph

**Status:** PARTIALLY RESOLVED — progression is real and live, 2026-09-18; substitution remains open and out of V1 scope by decision
**Progress:** `src/domain/adaptation/rules/doubleProgression.ts` (behaviorally derived from `Gman0909/FitnessTrack`, MIT) is now fully wired end-to-end and browser-verified: the Workout Player captures a simple "Did you complete all N reps?" Yes/No per set (`SET_COMPLETED` payload), `evaluateSessionProgression` reconstructs each exercise's outcome on session completion, `ProgressionRecord` persists a reps override/failure-streak/pending-candidate, and the Session Complete screen surfaces confirm/dismiss for any pending "Try Next Level?" candidate — confirming visibly changes next session's prescription, dismissing visibly doesn't. Policy is one generic v1 default (`defaultBodyweightRepsPolicy`) for all rep-based bodyweight content, not per-exercise tuning. **Substitution/regression-equivalence graph data is still untouched and, per 2026-09-18 product decision, is explicitly out of V1 scope** — "Adjust Exercise" stays deferred, matching the UI-shell plan's original Scope decision. Revisit only if/when real equivalence data arrives; do not build a placeholder mechanism for it.
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
