# Source of Truth v0.6

## 1. Product definition

A private, single-user, offline-first fitness PWA that presents curated exercise programs through high-quality reviewed visuals and deterministic adaptation/progression logic.

The product is not a generic gym logger, social fitness platform, cloud SaaS, medical diagnostic system, or runtime AI coach.

### Primary device

- iPhone portrait-first.
- Responsive tablet/desktop support is allowed.
- Installable PWA over HTTPS/private deployment.
- Normal use after caching must not require network access.

## 2. Explicit V1 exclusions

- backend/server database
- Supabase
- login/accounts
- cloud sync
- runtime AI/LLMs
- image-generation APIs
- camera pose tracking
- microphone capture/voice coach
- chatbot
- wearable integration
- social/sharing system
- in-app workout builder
- automatic diagnosis or clinical decision-making

## 3. Navigation and screen model

Persistent navigation outside an active workout:

1. Today
2. Library
3. Progress
4. Settings

Primary execution flow:

```text
Today
  -> Daily Check-In
  -> Session Preview
  -> Workout Player
       <-> How To
       <-> Adjust Exercise
       <-> Rest
       <-> Pause
  -> Workout Complete
  -> Progress / History
```

### Today

Shows today's recommended session, a start/check-in action, or `Resume Workout` when an unfinished durable session exists.

### Daily Check-In

Small explicit inputs such as energy/readiness, comfort, available time, and authored constraints. Inputs may alter the deterministic plan only within authored limits. Check-in answers are not diagnoses.

### Session Preview

Shows the immutable session plan that will be executed, including transparent adaptations/reason codes where relevant.

### Workout Player

One exercise per screen. Large media, exercise name, set/rep/duration prescription, progress, primary completion action, How To, and Adjust. Normal execution on the target phone should not require scrolling.

### Rest

Rest is a persisted state within the workout, not a disconnected page. Persist `restStartedAt` and `restEndsAt`; derive remaining time from timestamps.

### Adjust Exercise

Only authored options: easier version, approved alternative, skip when policy permits, cancel. No runtime invention.

### Progress

Capability-oriented history: completed sessions, duration, exercise familiarity, current progression position, advancement history, shortened sessions, and derived metrics. Weight is not the center of the product.

### Settings

Theme, motion level, guidance level, preferred duration, export/import, build/content version, and destructive local-data controls.

## 4. Durable session state

Required conceptual lifecycle:

```text
DRAFT -> READY -> ACTIVE <-> RESTING
                    |
                    +-> PAUSED -> ACTIVE
                    |
                    +-> COMPLETED
                    |
                    +-> COMPLETED_SHORTENED
```

`ABANDONED` must only happen through an explicit destructive action. Closing the app is never abandonment.

### Durability requirements

- refresh restores exact session position;
- close/reopen restores exact session position;
- material actions persist before irreversible transitions;
- timer state is timestamp-derived;
- set/event completion is idempotent;
- completed historical truth is immutable;
- finish-early preserves completed work and records `COMPLETED_SHORTENED`.

## 5. Domain truth

Separate authored knowledge from presentation.

### Exercise

A reusable canonical movement with stable ID and independent version. Rich fields may include identity/name/aliases/version/lifecycle, taxonomy, mechanics, setup, ordered execution phases, cues/common errors, equipment/support/environment requirements, rep/time/hold prescription capabilities, tempo/ROM/support options, demand profile, typed relationships, media manifest, and provenance/review metadata.

### WorkoutTemplate

Authored reusable composition. It is never mutated to represent today's workout.

### SessionPlan

Immutable adapted snapshot created before execution from template/version, exact exercise IDs/versions, preferences, progression state, check-in, available time/equipment, and rule versions.

It contains final prescriptions, adaptation decisions/reason codes, and a reproducibility hash.

### SessionEvents

Durable event history for what actually occurred, including session/set/rest/substitution/regression/skip/pause/resume/completion actions.

### SessionResult

Finalized observed outcome. Derived analytics come after raw historical truth and must not replace it.

## 6. Persistence

V1 local truth uses IndexedDB, preferably through Dexie.

Persist at minimum settings, check-ins, immutable SessionPlans, active-session cursor/state, SessionEvents, SessionResults, familiarity state, progression state, and export/import metadata.

The UI/route state is never the durable source of truth.

Export/import JSON backup is required because there is no account/cloud server protecting device-local history.

## 7. Deterministic adaptation

Allowed decisions may include retain exercise, remove optional work, adjust authored set/repetition/rest values within bounds, use an approved regression or equivalent substitution, mark a progression candidate, or compress a session while preserving authored priorities/coverage.

Every material decision exposes a reason code. The engine must never invent a movement or fake equivalence.

Short sessions such as Quick-10 are native authored templates, not merely long workouts with the tail chopped off.

## 8. Progression vs familiarity

These are separate systems.

- Familiarity: how much guidance should the UI show?
- Progression: is the user eligible to try an authored harder variant?

Exposure count may simplify guidance but must not automatically increase difficulty. Progression can propose `Try Next Level?`; user confirmation is required.

## 9. Content-pack model

Planned/current pack families:

- foundation-strength
- quick-10
- mobility-reset
- warmup-primer
- upper-body-foundation
- lower-body-foundation
- active-breaks
- balance-foundation
- low-impact-cardio
- cooldown-easy

Packs are versioned, declare dependencies, reference stable exercise IDs, and can add programs without new React components. Candidate/draft content is not automatically approved production guidance.

The current R&D reservoir outside this live repo contains 26 exercise drafts, 12 workout templates, 10 pack manifests, progression graphs, schemas, rule bundles, examples, media manifests, research notes, and reference visuals. Promote focused portions into GitHub as implementation needs them rather than letting missing truth be invented.

## 10. Media policy

Exercise media is created outside the app, manually reviewed, then committed as static files. No image-generation SDK/API belongs in runtime.

Media may include hero/thumbnail, start/mid/finish, sequence image, compact loop video, setup/angle views for complex movements, and posters/showcase art.

Fallback should degrade gracefully: loop -> sequence -> hero -> written instructions. Missing media must not make a workout impossible.

Important instructional text is rendered by HTML/SVG, not baked into AI-generated pixels.

## 11. Theme system

Exactly two first-class themes.

### Pixel Bloom

Cutesy retro pixel-game aesthetic with pastel foundations, vibrant accents, rounded/pixel panels, small playful game indicators, and restrained sparkle/tick/pop motion.

### Savage Core

Dark premium tactical fitness HUD with near-black/graphite surfaces, electric accents, crisp edges, precise alignment, restrained grid/scan/HUD motifs, and controlled high-impact motion.

### Shared architecture

One component tree. Never fork pages/business logic by theme.

Themes control semantic design tokens. Exercise content and behavior do not change by theme.

Motion: full / reduced / off; respect `prefers-reduced-motion` as fallback.

## 12. Accessibility and mobile behavior

- large touch targets;
- visible focus;
- readable text/contrast;
- no hover dependency;
- no tiny required text;
- reduced-motion support;
- one-screen workout execution where practical;
- semantic controls and status states.

## 13. Architecture target

The existing Next.js/Supabase implementation is migration input, not authority.

Target layering:

```text
UI
  -> application/use cases
  -> pure domain
  -> infrastructure
       IndexedDB/Dexie
       content loader
       static asset loader
       service worker/PWA
       export/import
```

React components do not own business rules. Content files do not require bespoke components.

The current implementation should migrate away from server actions and Supabase. Existing pure state-machine logic, timer math, PWA concepts and tests may be salvaged/refactored.

## 14. Testing priorities

Highest-risk behavior is domain/persistence/offline behavior, not JSX.

Required invariants include: valid exercise/version references, explicit graph relationships, immutable templates/history, no runtime exercise invention, idempotent completion, active-session recovery, theme behavioral parity, and export/import round-trip integrity.

Use unit/domain tests plus mobile WebKit/offline E2E coverage.

## 15. Reconciliation sequence

1. keep rollback branch intact;
2. establish v0.6 governance/source-of-truth files;
3. stop expanding Supabase/server-action architecture;
4. establish content/schema validation;
5. establish pure domain types/engines;
6. add IndexedDB/Dexie repositories;
7. create immutable SessionPlan + event/result persistence;
8. port/refactor useful session-machine and timestamp-timer concepts;
9. implement Today/check-in/preview flow;
10. implement durable Workout Player/rest/pause/adjust/complete;
11. Library/Progress/Settings;
12. shared semantic theme engine;
13. offline/cache/export/import hardening;
14. mobile E2E/accessibility polish.

## 16. Definition of V1 done

- installable on target phone;
- normal workouts function offline;
- curated data-driven content validates;
- start/complete/shorten/substitute a workout deterministically;
- active session survives refresh and close/reopen;
- rest timer remains correct after background/reopen;
- local history/progression/familiarity persists;
- progression recommendation requires confirmation;
- export/import works;
- both themes work without duplicated logic;
- no runtime AI/backend/cloud dependency;
- tests/build/mobile smoke flows pass.
