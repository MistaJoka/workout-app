# CLAUDE.md — Live Implementation Contract

You are implementing a **private, local-first, iPhone-first, offline-first fitness PWA**. Product behavior is governed by this contract and `docs/SOURCE_OF_TRUTH_V07.md`.

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

`docs/SOURCE_OF_TRUTH_V06.md` and old `docs/superpowers/` plans are historical context where v0.7 supersedes them.

The pre-reconciliation prototype remains preserved on branch `legacy-mvp-2026-09-13` at commit `03cc3a4a9190e29cb81c6ff8ed3b688a02a4d07c`.

## Hard product constraints

- iPhone portrait-first responsive PWA.
- Normal curated workouts must work offline after required app/media cache is established.
- No backend is required for core use.
- No Supabase/runtime database server for core use.
- No mandatory account/auth/cloud sync.
- Multiple **local profiles** may exist on one device; they are not authenticated users and their local data must remain isolated.
- Local persistence uses IndexedDB/Dexie.
- Curated starter content and a broad discovery library may coexist, with provenance/review status kept distinct.
- User-created local routines and weekly scheduling are supported secondary flows.
- Starting a workout creates an immutable SessionPlan snapshot.
- Deterministic adaptation/progression only.
- Progression requires explicit user confirmation.
- Never invent exercise equivalence/substitution/safety rules.
- Exercise/character/media art is authored externally, reviewed, then consumed as static/runtime assets. No runtime image-generation API.
- No runtime LLM coach, camera pose tracking, microphone coach or required wearable integration.
- Exactly two first-class themes: `pixel-bloom` and `savage-core`.
- Themes share the same routes, components, domain logic, exercise data and execution semantics.
- Motion preference: `full`, `reduced`, `off`.

## Architecture rules

- Domain logic is pure TypeScript and framework-independent.
- React components do not own adaptation/progression/programming rules.
- Canonical authored templates are immutable content.
- User-created routines may change, but only future SessionPlans see those changes.
- A started SessionPlan is immutable and must never be reconstructed from later mutable template data.
- Session actions persist as durable events/results.
- Active workout state survives refresh and close/reopen.
- Rest timers reconstruct from timestamps, not decrement-only memory state.
- Double taps/retries must not duplicate completed-set/session/progression effects.
- Completed historical truth is immutable.
- Material deterministic decisions carry inspectable reasons/details.
- Familiarity is separate from progression.
- Cache Storage is for application/media resources; IndexedDB is the workout-data source of truth.

## Navigation

Exactly four persistent primary tabs:

- Today
- Library
- Progress
- Settings

Secondary routes such as Schedule, Routine Builder/Detail, Exercise Detail/History, About, Check-In, Preview and active-session screens do not become new persistent tabs without an explicit product decision.

Primary guided flow:

`Today -> Check-In -> Session Preview -> Workout Player -> Rest/Pause -> Complete -> Progress`

## Platform quality rules

- Phone-sized Chromium is not sufficient proof for an iPhone-first product; critical E2E must also cover WebKit/iPhone-like configuration.
- An Offline banner is not proof of offline function; test an actually network-disabled reload/execution path.
- Wake lock/audio/animation are progressive enhancement and must fail safely.
- Storage quota/eviction/write failures are real local failure modes; do not mislabel them as network failures.
- Follow `docs/DEFINITION_OF_DONE.md` before calling a feature complete.

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

A rendered screen is not done unless its persistence, offline/recovery, accessibility, motion, error and target-phone behavior match the current source of truth.