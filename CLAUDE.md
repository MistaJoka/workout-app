# CLAUDE.md — Live Implementation Contract

You are implementing a **private, local-first, iPhone-first, offline-first fitness PWA** for two people (the owner and their spouse), used at home or at the gym. Product behavior is governed by this contract and `docs/SOURCE_OF_TRUTH_V07.md`.

## Read before changing application code

Start with the routing document:

1. `docs/CONTEXT_ENGINEERING_INDEX.md`
2. `docs/SOURCE_OF_TRUTH_V07.md`
3. `docs/ARCHITECTURE.md`
4. focused system doc(s) relevant to the task
5. `support/CLAUDE_REQUESTS.md` for unresolved truth

Focused docs include:
- `docs/TESTING_AND_RELIABILITY.md`
- `docs/IOS_PWA_RUNTIME.md`
- `docs/SECURITY_AND_PRIVACY.md`
- `docs/DEFINITION_OF_DONE.md`
- `docs/PIXEL_BLOOM_ASSET_SYSTEM.md`
- `docs/PIXEL_BLOOM_ANIMATION_SYSTEM.md`
- `docs/PIXEL_BLOOM_FRONTEND_CONTEXT.md`
- `docs/rnd/foss-fitness/LICENSE_REGISTER.md` — permissive sources may be adapted; GPL/AGPL are spec-only.

### Mandatory Rae context

Before generating, editing, integrating, exporting, testing, or reviewing **any Rae asset**, load:

1. `assets/pixel-bloom/db/rae-character-lock.v1.json`
2. `docs/RAE_CHARACTER_BIBLE_V1.md`
3. `docs/RAE_AI_GENERATION_CONTRACT.md`
4. `docs/RAE_ASSET_QA_GATE.md`
5. `docs/RAE_PRODUCTION_ASSET_PIPELINE.md`
6. `assets/pixel-bloom/db/asset-db.json`

Rae is a locked versioned production character, not a prompt concept. Explicit semantic fields in the lock/bible override ambiguous visual inference. The canonical raster controls visual likeness, proportions, silhouette, palette relationships, and pixel-art treatment where semantics are not explicit. Never use model defaults to invent anatomy, hair, jewelry, tattoo placement, colors, footwear, or accessories.

`docs/SOURCE_OF_TRUTH_V06.md` and old `docs/superpowers/` plans are historical context where v0.7 supersedes them.

The pre-reconciliation prototype remains preserved on branch `legacy-mvp-2026-09-13` at commit `03cc3a4a9190e29cb81c6ff8ed3b688a02a4d07c`.

## Commands

```bash
npm run check                 # tsc -b --force && vitest run && vite build — run before every commit
npm run e2e                   # Playwright: phone-viewport journeys against a production build (first time: npm run e2e:install)
npm run e2e:webkit            # same journeys in WebKit (iPhone 13 profile) inside Playwright's Ubuntu Docker image — WebKit can't run natively on this Arch host; CI runs it too (e2e-webkit job)
npm run apk                   # Android APK via Capacitor (android/, capacitor.config.ts) -> release/foundation-strength-<version>.apk; needs JDK 21 + Android SDK 36 (user-local at ~/Android/jdk21 and ~/Android/Sdk). Icons/launch screens: npm run generate:android-assets
npm run apk:release           # signed release APK; needs android/keystore.properties or FS_KEYSTORE* env vars (scripts/make-keystore.sh) -> release/foundation-strength-<version>-release.apk
npm run aab                   # signed release AAB for Play Store, same signing requirement -> release/foundation-strength-<version>.aab
npm run generate:library      # regenerate src/domain/content/generated/libraryExercises.json from the pinned free-exercise-db revision
npm run build && systemctl --user restart workout-app.service   # deploy: tailnet https://nomad.tailed9e33.ts.net:8443 (stable); LAN http://<this machine's DHCP IP>:4173 — `ip -4 -br addr`, was 192.168.1.130 on 2026-09-19
```

Always `git fetch origin` before pushing: the ChatGPT support agent commits directly to `origin/master` (under `support/`, `docs/`, `README.md`, `AGENTS.md`, and this file).

## Hard product constraints

- iPhone portrait-first responsive PWA; one-finger navigation; minimal text; movements shown step by step.
- Normal curated workouts must work offline after required app/media cache is established.
- No backend is required for core use. No Supabase/runtime database server for core use.
- No mandatory account/auth/cloud sync.
- Multiple **local profiles** may exist on one device (`src/infrastructure/profiles.ts`: one Dexie database per profile, switching reloads the page); they are not authenticated users and their local data must remain isolated.
- Local persistence uses IndexedDB/Dexie. Schema versions are additive only (`src/infrastructure/db/schema.ts`).
- Curated starter content (`src/domain/content/fixtures/`) and a discovery library (free-exercise-db, Unlicense, pinned revision in `scripts/content/`, imported by script, never hand-edited) coexist, with provenance/review status kept distinct. The discovery library is owner-curated, not the full upstream set: `npm run library:review` generates a pre-filtered candidate checklist (`content/staging/library-curation-checklist.md`), the owner hand-checks which exercises to include (this is a real safety/appropriateness judgment per the "never invent safety rules" rule above, not automatable), and `npm run generate:library` only ships checked exercises. The owner's standing rule (2026-09-26, `isHomeFriendly`) pre-checks home-friendly moves only — bodyweight/no equipment, bands, foam roller, exercise ball, chair/wall/floor stretches, beginner-level light dumbbell/kettlebell/medicine ball — and anything Rae demonstrates; no barbell/EZ bar/cable/machine, expert, heavy-lifting or jump work. See REQ-20260926-001. **For now (owner, 2026-09-28) the app browses no-equipment moves only**: `NO_EQUIPMENT_ONLY` + `isShownNow` in `src/domain/content/library.ts` hide library moves with any equipment or a prop listed in `src/domain/content/needsProp.json` (shared with `rae-prompts.py`). Lookup is unfiltered, so saved routines and history keep working. The weighted e2e journey is skipped while the flag is on.
- User-created local routines (`customTemplates`) and weekly scheduling are supported secondary flows. The streak is weekly against `weeklyGoal` (planned days, or 2). Reminders: the Android app schedules its own local notifications (`infrastructure/reminders.ts`, a rolling 14-day plan from `domain/schedule/reminderPlan.ts`, re-planned at launch/resume, on schedule or setting changes and on Complete; inexact alarms, since exact ones make the plugin open Android settings); a browser exports `.ics` instead. In the APK the service worker hands over silently (no Update toast): a new APK already is the update. Draft Rae workouts (Warm-up, Cool-down, Chair day) live in `fixtures/raeDraftTemplates.ts`, show a Draft tag, stay out of `ROTATION`, and await owner review (REQ-20260929-006).
- Weights: kg internally, lb/kg is a display setting (`src/presentation/units.ts`). Never store lb.
- Starting a workout creates an immutable SessionPlan snapshot.
- Deterministic adaptation/progression only. Progression requires explicit user confirmation.
- Never invent exercises, equipment, exercise equivalence/substitution edges, or safety rules.
- Exercise/character/media art is authored externally, reviewed, then consumed as static/runtime assets. Curated photos live in `public/exercise-media/`; library photos are fetched from the pinned upstream revision and cached by the service worker. No runtime image-generation API.
- No runtime LLM coach, camera pose tracking, microphone coach or required wearable integration.
- Exactly one theme: **Pixel Bloom** (owner decision 2026-09-26 — Savage Core was built, then retired; no theme picker). Styling stays token-driven (`src/presentation/theme/tokens.ts` → CSS vars). A leftover `theme` setting in an older profile is ignored. Components tagged `btn-*`/`field-*` via `@apply` do not carry the base `.btn`/`.field` class, so any selector scoping them must list them (`:is(...)`).
- Motion preference: `full`, `reduced`, `off`. A motion setting (app-level or OS `prefers-reduced-motion`) must never remove information.

## Architecture rules

- Domain logic (`src/domain/`) is pure TypeScript and framework-independent. React components do not own adaptation/progression/programming rules.
- Canonical authored templates are immutable content. User-created routines may change, but only future SessionPlans see those changes.
- A started SessionPlan is immutable and must never be reconstructed from later mutable template data.
- Session actions persist as durable, idempotent events (`sessionEvents`/`sessionResults` use `add`; duplicates are ConstraintErrors). Active workout state survives refresh and close/reopen.
- Rest timers reconstruct from persisted timestamps, never decrement-only memory state. Anything that changes the rest end time (e.g. `REST_EXTENDED`) is an event. Timed holds start with `HOLD_STARTED` and auto-complete at zero; pausing freezes rest and hold clocks. `EXERCISE_SKIPPED` moves to the next move; `SET_UNDONE` takes back the set that started the running rest (the stored `SET_COMPLETED` stays, but `withoutIneffectiveSets`/`effectiveSetSlots` drop it, so it counts nowhere; the rep check's Undo is local, nothing is stored yet); history maps each set by the session's own position (`effectiveSetSlots`), never by order.
- A workout idle 12h (`ABANDON_AFTER_MS`, owner default 2026-09-29) is finished as ended-early at its last action. Today's Resume offers Finish and Discard; Discard (`deleteUnfinishedSession`, only for a session with no result) is the one deletion of session data. `endedAt` is the completing event's time.
- Double taps/retries must not duplicate completed-set/session/progression effects.
- Completed historical truth is immutable.
- Material deterministic decisions carry inspectable reason codes/details.
- Familiarity is separate from progression. It folds a move's steps behind "Show steps" in the player after `FAMILIAR_AFTER_SESSIONS` (3) finished sessions (`src/domain/session/familiarity.ts`). Check-in inputs aren't collected while no adaptation rule reads them (`checkIn` is optional on plans; `ruleVersion` is the rule that actually ran). Progression candidates are staged as `pendingCandidate` and confirmed on Session Complete; an early-ended session preserves a pending offer. Bodyweight candidates step the rep bracket (owner override, 2026-09-19 — no authored harder-variant edges exist yet).
- Cache Storage is for application/media resources; IndexedDB is the workout-data source of truth.

## Navigation

Exactly four persistent primary tabs: Today, Library, Progress, Settings.

Secondary routes such as Schedule, Routine Builder/Detail, Exercise Detail/History, About, the Start screen (`/checkin/:id`, the session preview; asks nothing), Session Detail (`/history/:sessionId`) and active-session screens do not become new persistent tabs without an explicit product decision.

Primary guided flow: `Today -> Start (preview, one tap) -> Workout Player -> Rest/Pause -> Complete -> Progress`

Placement rules (owner-approved button pass, 2026-09-26):
- Every screen outside the tab bar has a way out (`components/BackButton.tsx`, falls back to Today on a deep link) — a home-screen PWA has no browser back.
- Fixed bottom action bars use `components/ThumbBar.tsx`: it ignores taps for 700ms whenever its content changes, so a double tap can't land on the button that replaced the first one. Give it an `armKey` that changes with the bar's content. E2E helpers wait for `[data-armed="true"]`.
- Rare/destructive actions (Pause, End workout, Erase everything) stay out of the thumb bar. Profile switching lives in Settings, not a corner of every screen.
- A screen with unsaved edits registers `components/unsavedGuard.ts`; AppShell's tabs call `guardNavigation()` (HashRouter can't block routes).
- Screen transitions come from `layout/RouteFade.tsx` (fade + rise via margin). Page animations never use `transform`: it breaks the fixed bottom bars. Sheet backdrops get the `sheet-backdrop` class (older sheets are matched by `.fixed.inset-0.items-end`). Animation delays must also be zeroed under reduced/off motion, or delayed parts stay invisible.
- Bottom sheets use `components/useSheetFocus.ts` (focus in, trap, Escape, restore); ConfirmSheet focuses the safe choice. Backdrops use `bg-black/40` (`bg-ink/40` generates nothing: CSS-var colors take no opacity).
- Destructive or data-changing confirmations use `components/ConfirmSheet.tsx` (in-page, never `window.confirm`). Ending a workout early asks first, is also offered from Pause, and lands on Complete so a pending next-level offer still shows.

## Platform quality rules

- Phone-sized Chromium is not sufficient proof for an iPhone-first product; critical E2E must also cover WebKit/iPhone-like configuration. (`npm run e2e:webkit`). Playwright WebKit can't drive service-worker reloads, so the offline journey (`e2e/offline.spec.ts`, real network-off reload + full workout) is Chromium-only; real-iPhone offline stays a manual check.
- An Offline banner is not proof of offline function; test an actually network-disabled reload/execution path.
- Wake lock/audio/animation are progressive enhancement and must fail safely.
- Storage quota/eviction/write failures are real local failure modes; do not mislabel them as network failures.
- Pink used as small text is `text-primary-ink`, never `text-primary` (4.4:1 fails AA; large numerals are fine). Text on colored fills uses `--color-on-primary` / `--color-on-accent` (never hardcoded white); `tokens.test.ts` enforces ≥ 4.5:1, including body and muted text on every field.
- Follow `docs/DEFINITION_OF_DONE.md` before calling a feature complete.

## Gotchas

- A new service worker waits (no automatic `skipWaiting`): the Update toast's Reload sends SKIP_WAITING. Install downloads the shell strictly and media best-effort. Library photos need `crossOrigin="anonymous"`; only readable responses are cached (cap 300); activate prunes Rae files `loops.json` no longer lists.
- `public/sw.js` is stamped at build time (`sw-build-manifest` plugin in `vite.config.ts`): the shell cache is named per build and every built chunk is precached, so there is no manual `CACHE_NAME` bump. Rae loop and still URLs carry `?v=<content hash>` from `loops.json`, so a redraw is a new URL; long-lived media stays in the media cache, never the shell cache. After changing Rae art without the sources, `npm run rae:build -- --index-only` refreshes the versions.
- Backup import merges into the active profile (new eventIds only, never overwriting plans/results), after an in-page confirmation, then reloads. Current state (settings/familiarity/progression/routines/body weight) merges newest-wins by row timestamp; another profile's backup imports history only; rows are zod-validated (`exportImport/bundleSchema.ts`). Exports carry the profile and use the share sheet when available. Deleted routines leave a `deletedRoutines` marker so import can't revive them.
- Playwright: a hash-only `goto` does not reload the document; bounce via `about:blank` for a fresh load. Player buttons are briefly `disabled` while an action persists — drive workouts with short-timeout force clicks in a loop (`e2e/helpers.ts`).
- `.claude/` is gitignored and excluded from vitest. Never `git add -A` with a fork worktree present.
- Settings hooks (`useWeightUnit`, `useFeedbackSettings`) are seeded from module-level caches; a profile switch reloads the page, which is what makes those caches safe. The motion setting has no cache and starts as `full` until the stored value loads.
- Local/Capacitor builds are rooted at `/`; the GitHub Pages project site (`.github/workflows/pages.yml`) builds with `VITE_BASE_PATH=/workout-app/` (`vite.config.ts`'s `base`). Never hardcode a root-absolute asset/route URL in app code, `index.html` or `public/manifest.json` — use `src/presentation/assetUrl.ts`'s `asset()`, Vite's `%BASE_URL%` placeholder, or a manifest path relative to the manifest itself; `public/sw.js` derives its own base from `self.registration.scope` (registered with `scope: BASE_URL` in `registerServiceWorker.ts`) since it isn't processed by Vite. Proven by the opt-in `npm run e2e:base` (`e2e/base-path.spec.ts`).

## Creative/frontend boundary

ChatGPT + human approval own Pixel Bloom creative source material and visual specifications. Claude Code owns integration/optimization/playback/tests.

Do not regenerate or visually reinterpret a missing approved mascot/world asset merely to fill a slot. Use an explicit temporary placeholder/fallback until the approved asset exists.

Use `docs/PIXEL_BLOOM_FRONTEND_CONTEXT.md` for format/motion/integration rules.

For Rae specifically, the semantic lock and generation contract are mandatory. Never infer Rae from a screenshot alone.

## Support-agent boundary

Claude Code owns implementation. ChatGPT is the R&D/specification/data/asset/test-fixture support layer.

When implementation reaches a missing or ambiguous product rule, dataset, schema, fixture, asset, research question, edge case or acceptance criterion, **do not guess**. Add a structured request to `support/CLAUDE_REQUESTS.md` and continue unrelated safe work when possible.

## Change discipline

Prefer the smallest correct diff. Do not broaden scope opportunistically.

A behavior is not authoritative merely because an agent implemented it. If a proposed implementation materially changes product scope or an architecture invariant, document the forcing constraint/decision before treating the change as normal product behavior.

A rendered screen is not done unless its persistence, offline/recovery, accessibility, motion, error and target-phone behavior match the current source of truth. Tests first for domain and application changes; `npm run check` and `npm run e2e` green before pushing.
