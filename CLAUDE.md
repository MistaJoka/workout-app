# CLAUDE.md — Live Implementation Contract

You are implementing a **private, single-user, iPhone-first, offline-first fitness PWA**. The repository contains a legacy prototype, but product behavior is governed by this file and `docs/SOURCE_OF_TRUTH_V06.md`.

## Read before changing application code

1. `docs/SOURCE_OF_TRUTH_V06.md`
2. `docs/AI_COLLABORATION_PROTOCOL.md`
3. `support/CLAUDE_REQUESTS.md`
4. `support/RND_BACKLOG.md`

The pre-reconciliation prototype is preserved on branch `legacy-mvp-2026-09-13` at commit `03cc3a4a9190e29cb81c6ff8ed3b688a02a4d07c`.

## Hard product constraints

- One private user.
- iPhone portrait-first responsive PWA.
- Normal workouts must work offline after installation/cache.
- No backend in V1.
- No Supabase/runtime database server in V1.
- No runtime AI/LLM/image generation.
- No camera tracking, microphone capture, voice coach, chatbot, or multimodal trainer.
- No account/auth system in V1.
- Local persistence uses IndexedDB; Dexie is the preferred wrapper.
- Curated/versioned exercise and workout content only.
- Deterministic adaptation and progression only.
- Progression requires explicit user confirmation.
- Exercise images/videos are authored externally, reviewed, then committed as static assets.
- Exactly two first-class themes: `pixel-bloom` and `savage-core`.
- Themes share the same routes, components, domain logic, exercise data, and media.
- Motion preference: `full`, `reduced`, `off`.

## Architecture rules

- Domain logic must be pure TypeScript and framework-independent.
- React components must not contain adaptation/progression/programming logic.
- Canonical workout templates are immutable authored content.
- Starting a workout creates an immutable `SessionPlan` snapshot.
- A started session must never be reconstructed from mutable canonical workout data.
- Session actions are persisted as durable events/results.
- Active workout state must survive refresh and close/reopen.
- Rest timers reconstruct from persisted timestamps, not an in-memory decrement counter.
- Double taps must not duplicate completed-set/session events.
- Every material adaptation decision carries machine-readable reason codes.
- Familiarity (how much guidance to show) is separate from progression (difficulty).
- Do not invent exercises, substitutions, equipment, progression edges, or safety rules.

## Required navigation

Exactly:

- Today
- Library
- Progress
- Settings

Primary flow:

`Today -> Check-In -> Session Preview -> Workout Player -> Rest/Adjust/Pause -> Complete -> Progress`

## Legacy prototype treatment

Salvage concepts, not authority.

Worth preserving/refactoring:

- pure session-state-machine approach,
- session-machine unit-test style,
- timestamp-based timer math,
- PWA manifest/service-worker concepts,
- mobile one-exercise-at-a-time execution,
- idempotency intent.

Must be migrated away from:

- Supabase,
- Next.js Server Actions as persistence,
- SQL-seeded gym routines,
- cloud/network-required workouts,
- server-rebuilt active SessionPlans,
- Programs-first navigation,
- generic weight-logger product assumptions.

## Support-agent boundary

Claude Code owns implementation. ChatGPT is the R&D/specification/data/asset/test-fixture support layer.

When implementation reaches a missing or ambiguous product rule, dataset, schema, fixture, asset, research question, edge case, or acceptance criterion, **do not guess**. Add a structured request to `support/CLAUDE_REQUESTS.md` and continue unrelated work when safe.

## Change discipline

Prefer the smallest correct diff. Do not broaden scope opportunistically. For material architecture changes, document the forcing constraint first. A rendered screen is not done unless its persistence, offline, state, accessibility, and error behavior match the source of truth.
