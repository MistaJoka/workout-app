# Bespoke Fitness PWA

A private, local-first, iPhone-first fitness PWA for guided workouts, exercise discovery, custom routines, durable history and deterministic progression.

## Current state

The repository is a functional v0.7 foundation/product, not a UI-less prototype. Current capabilities include:

- Today/check-in/session-preview/workout-complete flow;
- durable event-sourced Workout Player with rest/pause/resume;
- IndexedDB/Dexie local persistence;
- multiple isolated local profiles on one device;
- curated starter workouts plus a large lazy-loaded exercise library;
- exercise detail/history;
- local routine builder and weekly schedule;
- reps/timed/weighted prescriptions and per-set load logging;
- progress/body-weight history and deterministic progression candidates;
- export/import backup;
- PWA/service-worker infrastructure;
- Pixel Bloom theme (token-driven; the only theme since 2026-09-26);
- Full / Reduced / Off motion preferences;
- unit/infrastructure tests, phone-viewport Playwright E2E and GitHub Actions CI.

Pixel Bloom creative production is in progress. Rae, the Pixel Bloom avatar, demonstrates exercises as drawn-frame loops (`docs/RAE_EXERCISE_ANIMATION.md`); moves she doesn't demo yet fall back to free-exercise-db photos. More loops arrive in owner-pasted batches (`content/rae-prompts/`).

## Start here

Before changing application code:

1. `CLAUDE.md`
2. `docs/CONTEXT_ENGINEERING_INDEX.md`
3. `docs/SOURCE_OF_TRUTH_V07.md`
4. `docs/ARCHITECTURE.md`
5. the focused documentation for the subsystem being changed

Important focused docs:

- `docs/TESTING_AND_RELIABILITY.md`
- `docs/IOS_PWA_RUNTIME.md`
- `docs/SECURITY_AND_PRIVACY.md`
- `docs/DEFINITION_OF_DONE.md`
- `docs/PIXEL_BLOOM_ASSET_SYSTEM.md`
- `docs/PIXEL_BLOOM_ANIMATION_SYSTEM.md`
- `docs/PIXEL_BLOOM_FRONTEND_CONTEXT.md`
- `docs/RESEARCH_SOURCES.md`

`docs/SOURCE_OF_TRUTH_V06.md` and the older `docs/superpowers/` plans are retained as historical context. v0.7 is current authority.

## Tech stack

- Vite 6
- React 19
- TypeScript 5.7
- Dexie / IndexedDB
- Zod
- Tailwind CSS
- Vitest
- Playwright

## Setup

```bash
npm install
npm run dev
npm run build
npm test
npm run check
npm run e2e
```

Install Playwright browsers when needed:

```bash
npm run e2e:install
```

## Architecture

```text
presentation / React
      ↓
application use cases
      ↓
pure TypeScript domain
      ↓
infrastructure
  ├─ Dexie / IndexedDB
  ├─ profile-scoped repositories
  ├─ content/media loading
  ├─ service worker / PWA
  └─ export/import
```

See `docs/ARCHITECTURE.md` for the real module map and invariants.

## Development model

- **Claude Code:** implementation, migrations, refactors, tests/builds, integration.
- **ChatGPT:** R&D, specifications, structured data, research, fixtures, creative assets and audits.
- **Human owner:** product direction, approval and release decisions.

Missing product truth belongs in `support/CLAUDE_REQUESTS.md`; implementation agents should not silently invent it.

## Current high-value hardening work

- expand export/import corruption tests (row-level validation of backups);
- an old-shell -> new-shell service-worker update during an active workout (no E2E yet);
- integrate approved Pixel Bloom assets/animation in controlled batches.

Done since this list was written: WebKit journeys run in CI (`e2e-webkit` job, Playwright's Ubuntu image; `npm run e2e:webkit` locally), the offline journey covers going offline mid-session and resuming (`e2e/data-offline.spec.ts`), and session start is atomic (plan + start event in one transaction).
