# AGENTS.md — Repository Context Entry Point

This file is for any AI coding/review agent working in this repository. Claude-specific instructions remain in `CLAUDE.md`.

## Read first

1. `docs/CONTEXT_ENGINEERING_INDEX.md`
2. `CLAUDE.md`
3. `docs/SOURCE_OF_TRUTH_V07.md`
4. `docs/ARCHITECTURE.md`
5. focused subsystem documentation for the task
6. exact code/tests being changed

Do not begin from historical plans or broad R&D dumps unless the current context index sends you there.

## Core invariants

- iPhone portrait-first local/offline-first PWA.
- Four persistent tabs only: Today, Library, Progress, Settings.
- Multiple local profiles are supported, but they are not authenticated users.
- IndexedDB/Dexie is durable local workout truth.
- Canonical authored content and started SessionPlans are immutable for their scope.
- Custom routines may change only future sessions.
- Session execution is event/replay based and must remain idempotent/recoverable.
- Progression is deterministic and requires explicit confirmation.
- Do not invent exercise substitutions, progression edges, safety rules or medical advice.
- Core workouts do not require backend/cloud/AI services.
- Pixel Bloom is the only theme (owner decision 2026-09-26; Savage Core retired).
- Full/Reduced/Off motion must preserve information.

## Ownership

- Claude Code: application implementation/integration/tests.
- ChatGPT: research/spec/data/fixtures/creative assets/audits.
- Human owner: product/creative approval and releases.

If implementation requires missing product truth, use `support/CLAUDE_REQUESTS.md` instead of guessing.

## Before calling work done

Read `docs/DEFINITION_OF_DONE.md`.

For platform/session changes also read:
- `docs/TESTING_AND_RELIABILITY.md`
- `docs/IOS_PWA_RUNTIME.md`
- `docs/SECURITY_AND_PRIVACY.md`

For visual/asset work also read:
- `docs/PIXEL_BLOOM_ASSET_SYSTEM.md`
- `docs/PIXEL_BLOOM_ANIMATION_SYSTEM.md`
- `docs/PIXEL_BLOOM_FRONTEND_CONTEXT.md`

## Historical context

`docs/SOURCE_OF_TRUTH_V06.md` and `docs/superpowers/` are retained for history. They do not override v0.7.