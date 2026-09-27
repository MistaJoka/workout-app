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

**Status:** PARTIALLY RESOLVED — progression is real and live in the app (2026-09-18/19); ChatGPT's Promotion 001 progression-candidate slice delivered in parallel; substitution remains open and out of V1 scope by decision
**Blocking:** no
**Live implementation (Claude Code):** `src/domain/adaptation/rules/doubleProgression.ts` (behaviorally derived from `Gman0909/FitnessTrack`, MIT) is wired end-to-end and browser-verified: the Workout Player captures "Did you complete all N reps?" per set (plus the load used, for weight-capable exercises) in the `SET_COMPLETED` payload; `evaluateSessionProgression` reconstructs each exercise's outcome on session completion; `ProgressionRecord` persists reps/load overrides, a failure streak and a pending candidate; the Session Complete screen surfaces confirm/dismiss for any "Try Next Level?" candidate. Two generic v1 policies — `defaultBodyweightRepsPolicy` (rep bracket) and `defaultWeightedPolicy` (+2.5 kg candidates, floor at the authored load) — not per-exercise tuning. **Substitution/regression-equivalence graph data is still untouched and, per the 2026-09-18 product decision, out of V1 scope**; do not build a placeholder mechanism for it.
**Implementation context:** reconciliation step 5 (pure domain engines), §7-8 of SOURCE_OF_TRUTH_V06.md

**Delivered for the first progression slice:**

- `docs/rnd/foss-fitness/PROMOTION_001_PROGRESSION_CANDIDATE.md`
- `support/schemas/progression_edge.schema.json`
- `support/fixtures/progression_candidate_cases.json`
- pinned/verified FitnessTrack reference in `docs/rnd/foss-fitness/sources/fitnesstrack.md`

**Resolved behavior:** a clean completion at an authored upper repetition bound may emit `PROGRESSION_CANDIDATE` only when an explicit approved harder-variant edge exists. The candidate never mutates the current immutable SessionPlan and never advances difficulty without explicit user confirmation.

**Important compatibility decision:** FitnessTrack's weighted double-progression behavior remains R&D only. The current product defines progression as an authored harder-variant choice and the current SessionPlan model has no first-class load prescription, so weight bumps/deloads must not be transplanted into the live domain by inference.

> **Superseded by the owner, 2026-09-19.** Andrae directed Claude Code to make the app contend with the open-source leaders ("uproot anything... full permission... all the best features"), which included weight logging. `prescription.weightKg` / `SessionPlanExercise.weightKg` are now first-class, and `defaultWeightedPolicy` applies +2.5 kg candidates (confirmation still required) and −2.5 kg deloads floored at the authored load. The bodyweight candidate is a higher rep bracket rather than a harder-variant edge, because no approved edges exist yet; when authored edges arrive, they should replace that fallback. Promotion 001's spec, schema and fixture corpus remain the reference for the edge-based path.

**Still open / must not be guessed:**

- actual production progression edges using reviewed canonical exercise IDs/versions;
- approved regression/substitution graph edges;
- concrete in-session authored set/rep/rest adjustment bounds beyond Promotion 001;
- session-compression priority/coverage rules;
- any future repeated-failure rule values not explicitly authored.

**Why it matters:** the engine may now implement and verify the deterministic candidate mechanism against fake support fixtures, but production difficulty changes still require real reviewed content relationships. Guessing those relationships would violate `CLAUDE.md`.

**Requested remaining output:** production data (progression/regression/substitution graph + authored adjustment bounds), then additional focused promotion specs as needed.

**Constraints already known:** every material decision carries a machine-readable reason code; the engine never invents a movement or fake equivalence; familiarity and progression remain separate; progression requires explicit user confirmation; production edges must be authored and approved.

**Safe implementation path now:** Claude may implement Promotion 001 as pure domain logic and tests using the support fixture corpus. With zero approved production edges loaded, the engine emits a rep-bracket candidate at the authored upper bound (owner override above, 2026-09-19) rather than a harder-variant edge; it must never infer an edge or a substitution.

## REQ-20260913-003 — Pixel Bloom / Savage Core design tokens

**Status:** PARTIALLY RESOLVED — Savage Core is out of scope: built 2026-09-26, then removed the same day by owner decision (Pixel Bloom is the only theme; no theme picker). Pixel Bloom tokens remain the v0 candidate palette; its art integration stays open.
**Blocking:** no
**Implementation context:** reconciliation step 12 (shared semantic theme engine), §11 of SOURCE_OF_TRUTH_V06.md
**Need:** actual design tokens (color values, typography scale, spacing, motion durations/easing for full/reduced/off) for both themes — §11 only gives a narrative description ("pastel foundations," "near-black/graphite surfaces," "electric accents").
**Why it matters:** without concrete values I'd be inventing the visual design myself. That's acceptable as a placeholder (the human owner already said an ugly-but-functional app is fine for now) but not as the final "first-class theme" the source of truth describes.
**Requested output:** data (token set) — a design-tokens JSON/TS file per theme is ideal, referencing RND_BACKLOG.md P1 #5 and P0 #4 (theme component-state matrix)
**Constraints already known:** one shared component tree, themes control semantic tokens only, exercise content/behavior does not change by theme, must respect `prefers-reduced-motion`.
**Proposed fallback if unresolved:** ship both themes as minimal, clearly-placeholder token sets (e.g. two contrasting but unpolished palettes) so the theme-switching *architecture* can be built and tested now; explicitly not treating the placeholder visuals as the delivered "first-class" theme design.

## REQ-20260926-001 — Owner curation of the exercise Library allowlist

**Status:** RESOLVED 2026-09-26 by owner rule — the owner's instruction: "remove the non-avatar workouts, those using heavy weights or more advanced weighted exercises. Keep those that can still be replaced by the avatar and are able to be done easily, with body weight at low weight or at home." Encoded as `isHomeFriendly` in `scripts/content/curationChecklist.ts` (tested); `npm run library:review` now lists all 871 upstream records with the rule's matches pre-checked (304), and `npm run generate:library` shipped those 304. Every exercise Rae demonstrates is kept regardless. The owner can still tick or untick any single line in `content/staging/library-curation-checklist.md` and re-run `npm run generate:library`. Jump training (plyometrics) is unchecked by default as not "done easily"; a few strength-category jump variants (e.g. Freehand Jump Squat) remain checked — flagged to the owner.
**Blocking:** no (the app runs fine on the existing generated library until this is resolved; `npm run generate:library` will refuse to run once a checklist exists but has nothing checked, so this only blocks a *future* regeneration, not current behavior)
**Implementation context:** `scripts/content/list-library-candidates.ts` (generates `content/staging/library-curation-checklist.md`), `scripts/content/curationChecklist.ts` (parses it), `scripts/content/generate-library.ts` (consumes it, refuses to run on an empty checklist)
**Need:** a human to open `content/staging/library-curation-checklist.md` and check every exercise that's appropriate to ship, then run `npm run generate:library`.
**Why it matters:** the app's second real user is 300 lb, 36F, with right ankle pronation and occasional joint achiness, and wants an introductory/caring/supportive experience — not a wall of 871 exercises including barbell/olympic-lifting/plyometric content. `CLAUDE.md` explicitly forbids inventing exercise equivalence edges or safety rules, so deciding which of the ~399 pre-filtered candidates are actually appropriate for her body is a real human judgment, not something to infer from metadata.
**This is specifically an owner task, not a ChatGPT support-agent task.** Per `CLAUDE.md`'s support-agent boundary, ChatGPT is the R&D/spec/data/asset layer — but this isn't a data-gathering gap, it's a safety judgment about a real person's actual body, so it should not be delegated to any AI, ChatGPT included.
**Requested output:** decision (checked boxes in the checklist file, committed)
**Constraints already known:** the pre-filter (`level=beginner`, excludes plyometrics/powerlifting/olympic weightlifting/strongman categories, barbell/e-z-curl-bar equipment, and isolation-mechanic exercises) only narrows what's shown for review (199 of 871 as of 2026-09-26) — loosen it and re-run `npm run library:review` if something outside it should be considered too. Checking a box is the only thing that adds an exercise to the shipped library.
**Proposed fallback if unresolved:** none — the previously-generated `libraryExercises.json` (871 exercises) keeps shipping until this is resolved; nothing regressed by leaving this open.

## REQ-20260926-002 — Redraw two Rae exercise strips

**Status:** OPEN
**Blocking:** no (both loops ship; one is trimmed, one barely moves)
**Implementation context:** `docs/RAE_EXERCISE_ANIMATION.md`, `assets/pixel-bloom/character/rae/source/exercise/strips.json`
**Need:** new drawn-frame strips from the Rae chat (same format as the existing strips: one row, flat #FF00FF, same camera and floor line):
- **Dead bug** (6 frames): frame 6 was drawn mirrored (head on the other side). Every frame must keep her head on the same side.
- **Split squat** (4 frames): the frames barely change. Draw a clear descent: standing split stance, halfway, back knee just above the floor, halfway up.
**Requested output:** the two PNGs. The owner downloads them, and Claude Code rebuilds with `npm run rae:build`.
**Constraints already known:** do not mirror strips to fix direction (the lotus tattoo is on her anatomical left).
**Proposed fallback if unresolved:** keep the current loops (dead bug plays frames 1-5).

## REQ-20260926-003 — Review the Rae chair-move steps (and a tattoo drift)

**Status:** OPEN
**Blocking:** no (the moves ship as provenance 'draft')
**Implementation context:** `src/domain/content/fixtures/raeChairMoves.ts`, strips in `assets/pixel-bloom/character/rae/source/exercise/strips.json` (batch `chair-moves`)
**Need:**
1. Review the setup and steps of the 7 chair sit-to-stand moves the owner added on 2026-09-26. Claude Code drafted them to describe the drawings; they are not from a reviewed source. Add cues and common errors if appropriate.
2. Two pairs are near-duplicates (Hands Clasped / Arms Crossed; Hands on Thighs / Push Off Knees). Should either be merged or redrawn to differ?
3. Identity drift in these strips: the lotus tattoo is drawn on her shoulder/upper arm, not under her anatomical-left collarbone. Redraw if the owner wants them canon-accurate.
**Requested output:** reviewed step text (a data change in the fixture) and a decision on the pairs and redraws.
**Constraints already known:** no invented safety rules; sit-to-stand is a standard beginner movement. The library's "Chair Squat" is a different (machine) exercise.
**Proposed fallback if unresolved:** ship as draft (current state).

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
