# Architecture

**Status:** AUTHORITATIVE ENGINEERING CONTEXT  
**Product contract:** `docs/SOURCE_OF_TRUTH_V07.md`

This document describes how the current app is structured and which boundaries must survive future development.

## 1. System shape

```text
React presentation
  ├─ screens
  ├─ components
  ├─ theme/motion
  └─ PWA hooks
        ↓
application/use cases
  ├─ session orchestration
  ├─ feedback
  └─ read-model helpers
        ↓
pure TypeScript domain
  ├─ content
  ├─ session
  ├─ adaptation
  ├─ progress
  └─ schedule
        ↓
infrastructure
  ├─ Dexie / IndexedDB repositories
  ├─ per-profile database selection
  ├─ export/import
  └─ static/content loaders
```

Dependencies should point downward. Domain code must not import React, Dexie or browser UI APIs.

## 2. Current high-value modules

### Presentation
- `src/App.tsx` — route graph.
- `src/presentation/layout/AppShell.tsx` — four-tab shell.
- `src/presentation/screens/WorkoutPlayerScreen.tsx` — active execution UI.
- `src/presentation/screens/TodayScreen.tsx` — session resolution/resume entry.
- `src/presentation/screens/LibraryScreen.tsx` — curated/custom routines + exercise discovery.
- `src/presentation/theme/` — theme/motion preferences and semantic tokens.
- `src/presentation/pwa/` — service-worker/update/storage/wake-lock presentation helpers.

### Application
- `src/application/sessionService.ts` — starts sessions, records events, materializes results, triggers post-session progression/familiarity updates.
- `src/application/lastTime.ts` — previous-performance summary.
- `src/application/restFeedback.ts` — rest-end sound/haptic feedback.

### Domain
- `src/domain/session/` — immutable session-plan execution state machine and timer math.
- `src/domain/adaptation/` — deterministic progression policies/evaluation.
- `src/domain/content/` — exercise/template schema, curated starter pack and generated library loader.
- `src/domain/progress/` — history/stats/body-weight projections.
- `src/domain/schedule/` — weekly schedule resolution.

### Infrastructure
- `src/infrastructure/db/schema.ts` — Dexie stores and migrations.
- `src/infrastructure/db/repositories/` — persistence interfaces by concept.
- `src/infrastructure/profiles.ts` — local profile registry/database naming.
- `src/infrastructure/exportImport/` — backup boundary.

## 3. State ownership

### Authored content
Stable exercise/template definitions. Treat curated canonical templates as immutable.

### Custom routines
Mutable local user records. They are inputs to future sessions only.

### SessionPlan
Immutable executable snapshot created at workout start. This is the contract for a particular session.

### SessionEvents
Append-only observed actions. They are the durable execution history and are replayed into current state.

### SessionResult
Immutable final outcome projection for a completed/shortened session.

### Progress/familiarity
Derived durable state updated after successfully finalizing a session. Familiarity and progression are separate.

### UI state
Temporary controls, expanded panels and render state. Never use route/component memory as the only copy of important workout truth.

## 4. Session execution model

```text
WorkoutTemplate/custom routine
        ↓ create plan
immutable SessionPlan
        ↓
SESSION_STARTED
        ↓
append SessionEvents
        ↓
replayEvents(plan, events)
        ↓
SessionState
        ↓ completion
immutable SessionResult
        ↓
progression/familiarity update
```

Important invariants:
- plan never changes after start;
- duplicate `eventId` is harmless;
- replay must be deterministic;
- a result is written once;
- post-session progression must not double-apply on duplicate completion calls;
- historical events/results are not rewritten to reflect later preferences/content.

## 5. Profile isolation

The application currently resolves the active profile's database name at module/database initialization. Profile switching reloads the app so repositories bind to the newly active DB.

This is intentionally simple and acceptable for a local-only product.

Invariant:
> Every profile-scoped read/write must operate on the active profile database. No cross-profile aggregation is allowed unless a future explicitly approved feature defines it.

Profile metadata itself is local convenience identity, not authentication.

## 6. Content architecture

Two content lanes coexist:

### Curated starter/program content
Bundled TypeScript records with stronger product authority and review expectations.

### Large discovery library
Generated/imported data loaded lazily from `src/domain/content/generated/libraryExercises.json`.

The library is intentionally lazy so normal Today/workout startup does not parse the full catalog.

Rules:
- imports must preserve provenance/license/revision;
- library availability does not imply progression/substitution approval;
- user-built routines may reference library exercises;
- started plans must contain enough snapshot truth to remain executable even if a future template is edited.

## 7. Theme architecture

Theme is semantic, not structural.

```text
shared React components
      ↓
semantic CSS variables/tokens
      ↓
Pixel Bloom (the only theme — Savage Core retired by the owner 2026-09-26)
```

Never fork components by visual style; restyle through tokens.

Visual assets may differ, but component/state semantics remain shared.

## 8. Motion architecture

Motion preference is `full | reduced | off`.

- UI micro-motion should be CSS/SVG/Web Animations where practical.
- Character/exercise art may use frame/sprite/animated-image assets.
- disabling motion must not remove instructional information.
- essential workout state must not depend on animation completion callbacks.

See `docs/PIXEL_BLOOM_FRONTEND_CONTEXT.md`.

## 9. PWA architecture

- manifest: `public/manifest.json`;
- service worker: `public/sw.js`;
- registration/update helpers: `src/presentation/pwa/`;
- core data: IndexedDB, not Cache Storage;
- Cache Storage is for app/media resources, not workout history truth.

Offline correctness therefore requires both:
1. cached application/resources;
2. intact IndexedDB data.

## 10. Known architecture risks / next hardening targets

These are documented gaps, not permission for broad rewrites.

### A. Session startup atomicity
Current session start persists the plan and start event as separate operations. A failure between them can leave a plan with no `SESSION_STARTED` event. Preferred future hardening: one Dexie transaction or an explicit recovery invariant.

### B. Rest extension durability
The current `+15s` extension is UI-local and disappears on refresh. If the product promises exact rest recovery, represent extension durably (for example as an event) rather than component state.

### C. Offline acceptance
Current service-worker design exists, but actual network-disabled reload/execution must be tested.

### D. WebKit parity
Phone-sized Chromium is not enough for an iPhone-first product. Add WebKit/iPhone-like execution to the release gate.

### E. Imported library size/media
The generated catalog is large and remote library media may only become offline after first view. Curated workout media needed for guaranteed offline workouts should be pinned/precached explicitly.

## 11. Architecture decision rule

Before introducing a library, backend, global state manager, worker, native wrapper or new persistence layer, answer:

1. Which existing invariant cannot be met cleanly?
2. Why can the current architecture not solve it?
3. What new failure modes does the dependency introduce?
4. How does it behave offline and on WebKit/iPhone?
5. How is it tested?

Prefer boring local architecture until a real forcing constraint exists.

## 12. Anti-patterns

Do not:
- put progression logic in React;
- use localStorage as authoritative session/history persistence;
- mutate authored templates during a session;
- reconstruct a started plan from current template data;
- depend on network for set completion;
- infer substitutions from taxonomy alone;
- duplicate business logic by theme;
- treat imported exercise prose as reviewed coaching merely because it validates against schema;
- convert temporary UI state into an undocumented durable product rule.