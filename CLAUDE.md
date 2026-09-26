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

`docs/SOURCE_OF_TRUTH_V06.md` and old `docs/superpowers/` plans are historical context where v0.7 supersedes them.

The pre-reconciliation prototype remains preserved on branch `legacy-mvp-2026-09-13` at commit `03cc3a4a9190e29cb81c6ff8ed3b688a02a4d07c`.

## Commands

```bash
npm run check                 # tsc -b --force && vitest run && vite build — run before every commit
npm run e2e                   # Playwright: phone-viewport journeys against a production build (first time: npm run e2e:install)
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
- Curated starter content (`src/domain/content/fixtures/`) and a discovery library (free-exercise-db, Unlicense, pinned revision in `scripts/content/`, imported by script, never hand-edited) coexist, with provenance/review status kept distinct. The discovery library is owner-curated, not the full upstream set: `npm run library:review` generates a pre-filtered candidate checklist (`content/staging/library-curation-checklist.md`), the owner hand-checks which exercises to include (this is a real safety/appropriateness judgment per the "never invent safety rules" rule above, not automatable), and `npm run generate:library` only ships checked exercises. See REQ-20260926-001.
- User-created local routines (`customTemplates`) and weekly scheduling are supported secondary flows.
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
- Rest timers reconstruct from persisted timestamps, never decrement-only memory state. Anything that changes the rest end time (e.g. `REST_EXTENDED`) is an event.
- Double taps/retries must not duplicate completed-set/session/progression effects.
- Completed historical truth is immutable.
- Material deterministic decisions carry inspectable reason codes/details.
- Familiarity is separate from progression. Progression candidates are staged as `pendingCandidate` and confirmed on Session Complete; an early-ended session preserves a pending offer. Bodyweight candidates step the rep bracket (owner override, 2026-09-19 — no authored harder-variant edges exist yet).
- Cache Storage is for application/media resources; IndexedDB is the workout-data source of truth.

## Navigation

Exactly four persistent primary tabs: Today, Library, Progress, Settings.

Secondary routes such as Schedule, Routine Builder/Detail, Exercise Detail/History, About, Check-In, Preview and active-session screens do not become new persistent tabs without an explicit product decision.

Primary guided flow: `Today -> Check-In -> Session Preview -> Workout Player -> Rest/Pause -> Complete -> Progress`

## Platform quality rules

- Phone-sized Chromium is not sufficient proof for an iPhone-first product; critical E2E must also cover WebKit/iPhone-like configuration.
- An Offline banner is not proof of offline function; test an actually network-disabled reload/execution path.
- Wake lock/audio/animation are progressive enhancement and must fail safely.
- Storage quota/eviction/write failures are real local failure modes; do not mislabel them as network failures.
- Text on colored fills uses `--color-on-primary` / `--color-on-accent` (never hardcoded white); `tokens.test.ts` enforces ≥ 4.5:1, including body and muted text on every field.
- Follow `docs/DEFINITION_OF_DONE.md` before calling a feature complete.

## Gotchas

- `public/sw.js`: bump `CACHE_NAME` whenever anything in `SHELL_URLS` changes (including `manifest.json`). Library photos live in the separate long-lived `MEDIA_CACHE_NAME`; never put long-lived media in the versioned shell cache.
- Playwright: a hash-only `goto` does not reload the document; bounce via `about:blank` for a fresh load. Player buttons are briefly `disabled` while an action persists — drive workouts with short-timeout force clicks in a loop (`e2e/helpers.ts`).
- `.claude/` is gitignored and excluded from vitest. Never `git add -A` with a fork worktree present.
- Settings hooks (`useWeightUnit`, `useFeedbackSettings`, theme) are seeded from module/localStorage caches; a profile switch reloads the page, which is what makes those caches safe.

## Creative/frontend boundary

ChatGPT + human approval own Pixel Bloom creative source material and visual specifications. Claude Code owns integration/optimization/playback/tests.

Do not regenerate or visually reinterpret a missing approved mascot/world asset merely to fill a slot. Use an explicit temporary placeholder/fallback until the approved asset exists.

Use `docs/PIXEL_BLOOM_FRONTEND_CONTEXT.md` for format/motion/integration rules.

## Support-agent boundary

Claude Code owns implementation. ChatGPT is the R&D/specification/data/asset/test-fixture support layer.

When implementation reaches a missing or ambiguous product rule, dataset, schema, fixture, asset, research question, edge case or acceptance criterion, **do not guess**. Add a structured request to `support/CLAUDE_REQUESTS.md` and continue unrelated safe work when possible.

## Change discipline

Prefer the smallest correct diff. Do not broaden scope opportunistically.

A behavior is not authoritative merely because an agent implemented it. If a proposed implementation materially changes product scope or an architecture invariant, document the forcing constraint/decision before treating the change as normal product behavior.

A rendered screen is not done unless its persistence, offline/recovery, accessibility, motion, error and target-phone behavior match the current source of truth. Tests first for domain and application changes; `npm run check` and `npm run e2e` green before pushing.
