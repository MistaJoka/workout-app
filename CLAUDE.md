# CLAUDE.md — Live Implementation Contract

You are implementing a **private, two-person, iPhone-first, offline-first fitness PWA** for the owner and their spouse, used at home or at the gym. Product behavior is governed by this file, then `docs/SOURCE_OF_TRUTH_V06.md` where it is not superseded below (owner decisions of 2026-09-19).

## Read before changing application code

1. `docs/SOURCE_OF_TRUTH_V06.md`
2. `docs/AI_COLLABORATION_PROTOCOL.md`
3. `support/CLAUDE_REQUESTS.md`
4. `docs/rnd/foss-fitness/LICENSE_REGISTER.md` — permissive sources may be adapted; GPL/AGPL are spec-only.

## Commands

```bash
npm run check                 # tsc -b --force && vitest run && vite build — run before every commit
npm run e2e                   # Playwright: 7 phone-viewport journeys against a production build (first time: npm run e2e:install)
npm run generate:library      # regenerate src/domain/content/generated/libraryExercises.json from the pinned free-exercise-db revision
npm run build && systemctl --user restart workout-app.service   # deploy: LAN http://192.168.1.129:4173, tailnet https://nomad.tailed9e33.ts.net:8443
```

Always `git fetch origin` before pushing: the ChatGPT support agent commits directly to `origin/master` (only under `support/` and `docs/`).

## Hard product constraints

- Two private users on one device via profiles (`src/infrastructure/profiles.ts`): one Dexie database per profile, switching reloads the page. No accounts, no auth.
- iPhone portrait-first responsive PWA; one-finger navigation; minimal text; movements shown step by step.
- Normal workouts must work offline after installation/cache.
- No backend, no Supabase, no runtime database server.
- No runtime AI/LLM/image generation; no camera tracking, microphone, voice coach, chatbot.
- Local persistence is IndexedDB via Dexie. Schema versions are additive only (`src/infrastructure/db/schema.ts`).
- Exercise content: 9 curated starter exercises (`src/domain/content/fixtures/`) plus free-exercise-db (Unlicense, pinned revision in `scripts/content/`) imported by script — never hand-edited. Do not invent exercises, substitutions, equipment, progression edges, or safety rules.
- Users build their own routines in-app (`RoutineBuilderScreen`, `customTemplates` table); canonical templates stay immutable.
- Weights: kg internally, lb/kg is a display setting (`src/presentation/units.ts`). Never store lb.
- Deterministic adaptation and progression only; progression requires explicit user confirmation.
- Curated media is committed under `public/exercise-media/`; library photos are fetched from the pinned raw.githubusercontent.com revision and cached by the service worker on first view.
- Exactly two first-class themes, `pixel-bloom` and `savage-core`, sharing routes, components, domain logic, data and media. Motion preference: `full`, `reduced`, `off` — a motion setting must never remove information.

## Architecture rules

- Domain logic (`src/domain/`) is pure TypeScript, framework-independent. React components contain no adaptation/progression/programming logic.
- Starting a workout creates an immutable `SessionPlan` snapshot; a started session is never reconstructed from mutable template data.
- Session actions are durable, idempotent events (`sessionEvents` uses `add`, duplicates are ConstraintErrors). Active workout state survives refresh and close/reopen.
- Rest timers reconstruct from persisted timestamps, never an in-memory counter. Anything that changes the rest end time must be persisted.
- Double taps must not duplicate completed-set/session events or apply progression twice.
- Every material adaptation decision carries a machine-readable reason code.
- Familiarity (how much guidance to show) is separate from progression (difficulty).
- Progression candidates are staged as `pendingCandidate` and confirmed on Session Complete. Bodyweight candidates step the rep bracket (owner override — no authored harder-variant edges exist yet).

## Navigation

Bottom nav: Today, Library, Progress, Settings. Secondary screens: Routine builder/detail, Schedule, Exercise detail/history, Check-In, Session Preview, Workout Player, Session Complete, About.

Primary flow: `Today -> Check-In -> Session Preview -> Workout Player -> Rest/Adjust/Pause -> Complete -> Progress`

## Gotchas

- `public/sw.js`: bump `CACHE_NAME` whenever anything in `SHELL_URLS` changes (including `manifest.json`). Long-lived media lives in its own unversioned cache, never in the shell cache.
- Playwright: a hash-only `goto` does not reload the document; bounce via `about:blank` for a fresh load. Player buttons are briefly `disabled` while an action persists — drive workouts with short-timeout force clicks in a loop (`e2e/helpers.ts`).
- `.claude/` is gitignored and excluded from vitest. Never `git add -A` with a fork worktree present.
- Design system lives in `src/index.css` `@layer components` (`.btn-*`, `.card`, `.chip`, `.field-*`) and `src/presentation/theme/tokens.ts`; use `--color-on-primary` / `--color-on-accent` for text on colored fills, never hardcoded white.

## Support-agent boundary

Claude Code owns implementation. ChatGPT is the R&D/specification/data/asset/test-fixture support layer. When implementation reaches a missing or ambiguous product rule, dataset, schema, fixture, asset or acceptance criterion, do not guess: add a structured request to `support/CLAUDE_REQUESTS.md` and continue unrelated work.

## Change discipline

Prefer the smallest correct diff. Do not broaden scope opportunistically. For material architecture changes, document the forcing constraint first. A rendered screen is not done unless its persistence, offline, state, accessibility (contrast ≥ 4.5:1, reduced motion), and error behavior match this contract. Tests first for domain and application changes; `npm run check` and `npm run e2e` green before pushing.
