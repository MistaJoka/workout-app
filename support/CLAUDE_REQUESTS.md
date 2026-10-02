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
**Need:** actual design tokens (color values, typography scale, spacing, motion durations/easing for full/reduced/off) for Pixel Bloom, the only theme (originally asked for both themes) — §11 only gives a narrative description ("pastel foundations," "near-black/graphite surfaces," "electric accents").
**Why it matters:** without concrete values I'd be inventing the visual design myself. That's acceptable as a placeholder (the human owner already said an ugly-but-functional app is fine for now) but not as the final "first-class theme" the source of truth describes.
**Requested output:** data (token set) — a design-tokens JSON/TS file per theme is ideal, referencing RND_BACKLOG.md P1 #5 and P0 #4 (theme component-state matrix)
**Constraints already known:** one shared component tree, themes control semantic tokens only, exercise content/behavior does not change by theme, must respect `prefers-reduced-motion`.
**Proposed fallback if unresolved:** ship both themes as minimal, clearly-placeholder token sets (e.g. two contrasting but unpolished palettes) so the theme-switching *architecture* can be built and tested now; explicitly not treating the placeholder visuals as the delivered "first-class" theme design.

## REQ-20260926-001 — Owner curation of the exercise Library allowlist

**Status:** RESOLVED 2026-09-26 by owner rule — the owner's instruction: "remove the non-avatar workouts, those using heavy weights or more advanced weighted exercises. Keep those that can still be replaced by the avatar and are able to be done easily, with body weight at low weight or at home." Encoded as `isHomeFriendly` in `scripts/content/curationChecklist.ts` (tested); `npm run library:review` now lists all 871 upstream records with the rule's matches pre-checked (304), and `npm run generate:library` shipped those 304. Every exercise Rae demonstrates is kept regardless. The owner can still tick or untick any single line in `content/staging/library-curation-checklist.md` and re-run `npm run generate:library`. Jump training (plyometrics) is unchecked by default as not "done easily"; a few strength-category jump variants (e.g. Freehand Jump Squat) remain checked — flagged to the owner.
**Blocking:** no (the app runs fine on the existing generated library until this is resolved; `npm run generate:library` will refuse to run once a checklist exists but has nothing checked, so this only blocks a *future* regeneration, not current behavior)
**Implementation context:** `scripts/content/list-library-candidates.ts` (generates `content/staging/library-curation-checklist.md`), `scripts/content/curationChecklist.ts` (parses it), `scripts/content/generate-library.ts` (consumes it, refuses to run on an empty checklist)
**Need:** a human to open `content/staging/library-curation-checklist.md` and check every exercise that's appropriate to ship, then run `npm run generate:library`.
**Why it matters:** the app's second real user is 300 lb, 36F, with right ankle pronation and occasional joint achiness, and wants an introductory/caring/supportive experience — not a wall of 871 exercises including barbell/olympic-lifting/plyometric content. `CLAUDE.md` explicitly forbids inventing exercise equivalence edges or safety rules, so deciding which upstream exercises are actually appropriate for her body is a real human judgment, not something to infer from metadata.
**This is specifically an owner task, not a ChatGPT support-agent task.** Per `CLAUDE.md`'s support-agent boundary, ChatGPT is the R&D/spec/data/asset layer — but this isn't a data-gathering gap, it's a safety judgment about a real person's actual body, so it should not be delegated to any AI, ChatGPT included.
**Requested output:** decision (checked boxes in the checklist file, committed)
**Constraints already known:** superseded by the owner rule in the status line — the checklist lists all 871 upstream records with no pre-filter (the earlier `level=beginner` pre-filter that showed 199 is gone). Checking a box is the only thing that adds an exercise to the shipped library.
**Proposed fallback if unresolved:** n/a — resolved; the 304-exercise home library ships.

## REQ-20260926-002 — Redraw two Rae exercise strips

**Status:** DEFERRED (owner)
**Owner decision 2026-09-28:** "lets continue past the redraws, we'll use them for now." Redraws are deferred, not cancelled: the flagged loops keep shipping, and `redraw-001/002` stay ready to paste. New library batches (002+) go first.
**Blocking:** no (both loops ship; one is trimmed, one barely moves)
**Implementation context:** `docs/RAE_EXERCISE_ANIMATION.md`, `assets/pixel-bloom/character/rae/source/exercise/strips.json`
**Need:** new drawn-frame strips from the Rae chat (same format as the existing strips: one row, flat #FF00FF, same camera and floor line):
- **Dead bug** (6 frames): frame 6 was drawn mirrored (head on the other side). Every frame must keep her head on the same side.
- **Split squat** (4 frames): the frames barely change. Draw a clear descent: standing split stance, halfway, back knee just above the floor, halfway up.
**Requested output:** the two PNGs. The owner downloads them, and Claude Code rebuilds with `npm run rae:build`.
**Constraints already known:** do not mirror strips to fix direction (the lotus tattoo is on her anatomical left).
**Proposed fallback if unresolved:** keep the current loops (dead bug plays frames 1-5).

## REQ-20260926-003 — Review the Rae chair-move steps (and a tattoo drift)

**Status:** DEFERRED (owner)
**Owner decision 2026-09-28:** "lets continue past the redraws, we'll use them for now." Redraws are deferred, not cancelled: the flagged loops keep shipping, and `redraw-001/002` stay ready to paste. New library batches (002+) go first.
**Blocking:** no (the moves ship as provenance 'draft')
**Implementation context:** `src/domain/content/fixtures/raeMoves.ts`, strips in `assets/pixel-bloom/character/rae/source/exercise/strips.json` (batch `chair-moves`)
**Need:**
1. Review the setup and steps of the 7 chair sit-to-stand moves the owner added on 2026-09-26. Claude Code drafted them to describe the drawings; they are not from a reviewed source. Add cues and common errors if appropriate.
2. ~~Near-duplicate pairs~~. Decided by the owner on 2026-09-26: Hands Clasped and Hands on Thighs are retired (unlisted but still resolvable); Arms Crossed and Push Off Knees stay.
3. Identity drift in these strips: the lotus tattoo is drawn on her shoulder/upper arm, not under her anatomical-left collarbone. The owner said to label these for a later redraw; see the `redraw` field in strips.json (which also lists dead bug and split squat).
**Requested output:** reviewed step text (a data change in the fixture) and a decision on the pairs and redraws.
**Constraints already known:** no invented safety rules; sit-to-stand is a standard beginner movement. The library's "Chair Squat" is a different (machine) exercise.
**Proposed fallback if unresolved:** ship as draft (current state).

## REQ-20260927-004 — Redraw the low-impact set in the bible style; review steps

**Status:** DEFERRED (owner)
**Owner decision 2026-09-28:** "lets continue past the redraws, we'll use them for now." Redraws are deferred, not cancelled: the flagged loops keep shipping, and `redraw-001/002` stay ready to paste. New library batches (002+) go first.
**Blocking:** no (the owner said "use them for now")
**Implementation context:** `src/domain/content/fixtures/raeMoves.ts` (low-impact section), strips.json batch `low-impact-15`
**Need:**
1. The owner's `rae-low-impact-batch-15.zip` drew Rae off-model (afro puff, ears on a headband, arm tattoos) at low resolution (~190px). Eight of its moves are in the app, marked `redraw`: mini squat, reverse lunge, seated march, seated ankle pumps, seated knee extension, seated forward reach, seated torso rotation, chair-supported knee lift. Redraw each as a full-size strip in the approved bible style (the batch-prompt format in `content/rae-prompts/`).
2. Its reverse crunch was unusable (frames overlap) and was dropped. `lib.Reverse_Crunch` stays in the normal batches. The seven moves it duplicated (incline push-up, dead bug, plank, glute bridge, crunch, superman) keep their existing bible-style strips.
3. The 14-move sheet `ChatGPT Image Sep 26, 2026, 11_42_00 PM.png` (bike, treadmill, cable, lat pulldown, dumbbell moves) has the same off-model look and was not imported. Most of its equipment is outside the 304-move home library.
4. Review the drafted step text for the 8 moves, as in REQ-20260926-003.
**Proposed fallback if unresolved:** keep the current off-model loops.

## REQ-20260928-005 — Rae prompt canon alignment (record) and three batch-002 moves

**Status:** RESOLVED (owner, 2026-09-28)
**Resolution:** "no equitment needed for now for the workouts." Rae batches were re-planned (`rae-prompts.py --from 2`) to no-equipment moves only: 002–014, 102 moves. 34 bodyweight moves whose steps need a prop (chin-up, pull-ups, dips, decline and bench moves, among others) are out for now (`NEEDS_PROP`). Equipment moves come back with `NO_EQUIPMENT_ONLY = False` and a re-plan.
**Follow-up (owner, same day):** "hide them for now. filtered out in the app. we'll focus on the no equipment and body weight stuff." The Library and routine picker now show only no-equipment moves (`NO_EQUIPMENT_ONLY` in `src/domain/content/library.ts`, same `needsProp.json` list); the equipment filter is hidden.
**Blocking:** no
**Implementation context:** `scripts/assets/rae_canon.py`, `scripts/assets/rae-prompts.py`, `scripts/assets/rae-redraw-prompts.py`, `content/rae-prompts/`
**Need:**
1. *Record.* The Rae prompts did not open with the contract's identity preamble (`docs/RAE_AI_GENERATION_CONTRACT.md` §2) and got canon wrong in two places: the redraw paste said "black 4C hair (NOT an afro puff)", but the lock's hair silhouette is `voluminous-natural-updo-puff-with-tight-coils-and-selected-tendrils`; both pastes asked for "white socks", which neither the lock nor the bible specifies. Both scripts now open with the §2 preamble (hair per the lock) plus a short §3 forbidden list, from `rae_canon.py`. Pending pastes (batch 002–037, redraw 001–002) were rewritten in place with the same numbers and exercises; batch 001 (taken in) was left alone. "Off-model" in REQ-20260927-004 means drift from the bible raster (a round afro silhouette, headband ears, arm tattoos), not the canonical updo/puff.
2. *Record.* Every Rae exercise loop in the app is `review` status in `asset-db.json`, not `approved`, and the 13 chair/low-impact loops carry known identity defects (tattoo location/count). They ship on the owner's explicit "use them for now" (REQ-20260926-003, REQ-20260927-004), pending the redraw pastes. This is an owner exception to the QA gate, not an approval.
3. *Decision.* Batch 002 includes `lib.Chin-Up` (needs a pull-up bar) and two `Decline_*` moves (need a decline bench). The home-friendly rule checks them because they're bodyweight. Keep them in the library and draw them, or untick them in the curation checklist before batch 002 is pasted?
**Requested output:** decision (item 3)
**Constraints already known:** the owner's home-friendly rule is equipment-based; bar/bench needs aren't in the upstream equipment field.
**Proposed fallback if unresolved:** keep them; batch 002 is drawn as written.

## REQ-20260929-006 — Review three draft workouts built from Rae's moves

**Status:** OPEN (shipped as draft on the owner's "Go for all", 2026-09-29)
**Blocking:** no
**Implementation context:** `src/domain/content/fixtures/raeDraftTemplates.ts` (`DRAFT_TEMPLATE_IDS`), listed with the curated templates via `foundationStrengthStarterTemplates`; never in the A/B `ROTATION`.
**Need:** confirm, change or drop each draft:
1. **Warm-up** (`draft.warm-up`), 1 set each, 10 reps, 30s rest: Seated March, Seated Ankle Pumps, Hip Circles (prone), Mini Squat, Front Leg Raises.
2. **Cool-down** (`draft.cool-down`), 1 set each, 10 reps, 30s rest: Seated Forward Reach, Seated Torso Rotation, 90/90 Hamstring.
3. **Chair day** (`draft.chair-day`), 2 sets each, 10 reps, 45s rest: Chair Sit-to-Stand (Arms Forward), Seated Knee Extension, Chair Squat Tap, Chair-Supported Knee Lift, Seated March.
**Why it matters:** SOURCE_OF_TRUTH_V07 §10 says curated program content must be reviewed. These use only existing exercises that Rae demonstrates (no invented moves) and the app's default doses, but which moves go together, their order and dose are programming decisions.
**Known limits:** no warm-up/main/cool-down sections exist in the template type, so the warm-up and cool-down are separate short workouts. Cat-cow (drawn) has no exercise record and could not be used (mapping it to `lib.Cat_Stretch` needs the owner's OK). The stretches are prescribed as reps because their records are rep-based (no hold capability). Hip Circles (prone) currently loops 2 frames (flagged redraw).
**Requested output:** decision per template
**Proposed fallback if unresolved:** keep shipping them as drafts.

## REQ-20261001-007 — Owner decisions needed before selling the app

**Status:** OPEN
**Blocking:** no (the app is fully usable without any of these; they block store listing/sale readiness, not local use)
**Implementation context:** `src/presentation/legal/contact.ts` (`SUPPORT_CONTACT` placeholder), `src/presentation/screens/{PrivacyScreen,TermsScreen,LicensesScreen}.tsx` (new in-app legal pages), `support/REVIEW_QUEUE.md` (stock photo re-verification item)
**Need:** the owner to decide each of the following before this app is listed/sold anywhere:
1. **Support email.** `SUPPORT_CONTACT` in `src/presentation/legal/contact.ts` is a placeholder (`support@example.com`) with a `TODO` comment. Replace it with the real address the owner will monitor.
2. **Privacy policy hosting URL.** Store listings (Apple App Store / Google Play) require a *URL* to the privacy policy, not just an in-app page. The new `/privacy` screen's text can be exported/copied as-is to wherever that gets hosted (a static page, a GitHub Pages doc, etc.) — the owner needs to pick where and set that URL in each store listing.
3. **Rae likeness commercial consent.** Rae is a locked, authored character (`docs/RAE_CHARACTER_BIBLE_V1.md`). Selling the app is a different distribution context than private personal use; confirm there's no additional consent/rights question before Rae ships in a paid or publicly-listed product.
4. **Stock/exercise photo licensing re-verification.** `support/REVIEW_QUEUE.md` already flags `public/exercise-media/*` (free-exercise-db imagery, credited upstream to `wrkout/exercises.json`) as "fine for this private home-only app; re-verify the `wrkout` origin before any public distribution." Selling the app is that public distribution; re-verify before listing.
5. **Signing key custody / Play Console.** Who holds the Android signing key and the Play Console account for a sold/listed app — the owner's own account, or something else? This has no fallback once an app is published under a key.
6. **`NO_EQUIPMENT_ONLY` for a general audience.** The current no-equipment-only library filter (REQ-20260928-005) was chosen for the owner's own household. Confirm whether a general-audience sale should keep that restriction, lift it, or make it a setting.
7. **The three Draft workouts.** REQ-20260929-006 (Warm-up, Cool-down, Chair day) is still open. Decide per-template before they ship to anyone outside the household.
8. **Dark mode.** Pixel Bloom is the only theme (no theme picker, owner decision 2026-09-26). Confirm whether a general-audience release needs a dark variant, or whether Pixel Bloom ships as the only look.
9. **Pricing.** Free, paid, one-time purchase, or subscription — affects store listing setup and whether any payment/receipt flow is needed (currently none exists, and none should be added without this decision).
**Why it matters:** these are product/business/legal decisions about a real sale, not implementation gaps Claude Code can infer or default. Guessing any of them would either misrepresent the app in a store listing or make a commitment (pricing, key custody, likeness rights) nobody but the owner can make.
**Requested output:** decision (per item above)
**Constraints already known:** the app's privacy/security posture (no account, no analytics, on-device storage, optional GitHub photo fetch) is accurate as of this REQ and documented in `docs/SECURITY_AND_PRIVACY.md`; the new /privacy, /terms, /licenses screens describe that posture as it exists today and must be revisited if any decision above changes it.
**Proposed fallback if unresolved:** ship with the placeholder support email clearly marked (not listed anywhere until replaced), keep the privacy text in-app only (no external URL) until a hosting decision is made, and do not submit to any store listing until items 1-5 are resolved.

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
