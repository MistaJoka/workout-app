# Source of Truth v0.7

**Status:** AUTHORITATIVE PRODUCT / DOMAIN / UX CONTRACT  
**Supersedes:** `docs/SOURCE_OF_TRUTH_V06.md` for current product behavior  
**Reason for revision:** the live product intentionally expanded beyond the original narrow v0.6 foundation. This document reconciles current implemented behavior with the owner's later direction to compete with strong open-source fitness products without abandoning the local-first architecture.

## 1. Product definition

A private, local-first, iPhone portrait-first fitness PWA for guided workouts, exercise discovery, local routine creation, durable history, deterministic progression and a highly authored visual experience.

The app should feel more like a polished personal fitness game/tool than a generic spreadsheet-style gym logger.

### Core identity

- installable iPhone-first PWA;
- useful without an account or backend;
- normal workouts work offline after required assets are cached;
- local data is durable and exportable;
- exercise/workout guidance is data-driven and reviewable;
- progression/adaptation is deterministic rather than generative;
- Pixel Bloom is the presentation system over the product behavior (the only theme; owner decision 2026-09-26).

The product is **not** a medical diagnostic product, social fitness network, runtime AI coach, camera pose-analysis system, or cloud-required SaaS.

## 2. Product scope now intentionally included

The following are first-class v0.7 behaviors because they exist in the reconciled product direction and live implementation:

- multiple local profiles on one device;
- isolated per-profile local databases;
- curated starter workout templates;
- large searchable/filterable exercise library;
- exercise detail and exercise history;
- user-created local workout routines;
- weekly routine scheduling;
- guided check-in -> preview -> workout flow;
- durable in-progress session resume;
- reps, timed holds and weighted prescriptions;
- per-set weight logging where applicable;
- body-weight logging;
- deterministic progression candidates and explicit confirmation;
- workout/progress history;
- export/import backup;
- offline/PWA behavior;
- one theme (Pixel Bloom) and three motion preferences.

These additions do not authorize unrelated scope expansion.

## 3. Explicit exclusions

Unless the owner explicitly changes this contract:

- no backend required for core functionality;
- no Supabase or runtime database server;
- no mandatory login/account;
- no mandatory cloud sync;
- no runtime LLM/AI/image-generation API;
- no chatbot coach;
- no camera pose tracking;
- no microphone/voice coaching;
- no automatic diagnosis or clinical decision-making;
- no social feed, followers or competitive network;
- no wearable/sensor dependency;
- no automatic exercise-equivalence invention;
- no silent progression without explicit confirmation.

Optional future native/cloud integrations must not break local core behavior.

## 4. User/profile model

A physical device may contain multiple **local profiles**. This is not an authenticated multi-user cloud system.

Each profile has its own local database containing settings, routines, history, progression, familiarity, schedule and body-weight data.

Rules:
- switching profiles must not leak another profile's state;
- deleting a profile is explicitly destructive and must require clear confirmation;
- profile identity is convenience-level local identity, not security/authentication;
- exported data must clearly identify its profile/scope;
- the default experience remains frictionless for one person.

## 5. Navigation model

Exactly four persistent primary tabs:

1. Today
2. Library
3. Progress
4. Settings

Secondary routes may include:
- Check-In;
- Session Preview;
- Workout Player;
- Workout Complete;
- Exercise Detail;
- Exercise History;
- Routine Builder;
- Routine Detail;
- Weekly Schedule;
- About/build information.

Do not add a fifth persistent tab without an explicit product decision.

## 6. Primary flows

### Guided workout

```text
Today
 -> Check-In
 -> Session Preview
 -> Workout Player
    <-> Rest
    <-> Pause
 -> Workout Complete
 -> Progress
```

### Custom routine

```text
Library / Exercise Detail
 -> Routine Builder
 -> Routine Detail
 -> Check-In
 -> Session Preview
 -> Workout Player
```

### Scheduling

```text
Library / Today
 -> Weekly Schedule
 -> local weekday assignment
 -> Today resolves the scheduled routine
```

## 7. Authored content vs user-created content

### Canonical authored content

Canonical exercises and curated workout templates are versioned content. They must not be mutated to represent a user's active workout.

### User-created routines

Custom routines are local mutable records. Editing a custom routine affects future sessions only.

### SessionPlan

Starting a workout creates an immutable `SessionPlan` snapshot containing the exact prescriptions to execute. Once started, the workout is never reconstructed from a later-mutated template.

## 8. Session durability

Conceptual lifecycle:

```text
DRAFT -> ACTIVE <-> RESTING
           |
           +-> PAUSED -> ACTIVE/RESTING
           |
           +-> COMPLETED
           |
           +-> COMPLETED_SHORTENED
```

The exact type model in code is authoritative where it is stricter, but these invariants must hold:

- closing the app is never abandonment;
- refresh/reopen restores the same durable workout position;
- completion events are idempotent;
- final results are immutable historical truth;
- timers derive from timestamps rather than decrement-only memory state;
- finish-early preserves completed work;
- session startup should behave atomically from the user's perspective;
- any future rest-extension behavior that promises exact recovery must itself be durable.

## 9. Progression and adaptation

Progression and familiarity remain separate.

### Familiarity

Tracks exposure/guidance needs. More familiarity may reduce repeated instructional clutter but does not itself increase difficulty.

### Progression

Deterministic rules may produce a candidate such as higher reps or a higher load. The candidate must:

- be reproducible from durable inputs;
- include a machine-readable reason/detail;
- never mutate the active immutable SessionPlan;
- require explicit user confirmation before becoming the next prescription.

Current generic weighted/bodyweight policies are allowed as implemented fallbacks. Reviewed authored progression edges should replace generic behavior where richer canonical relationships are approved.

### Substitution

Do not infer equivalent exercises from similar names/muscles. Production substitutions/regressions require reviewed relationships.

## 10. Exercise library and content provenance

The larger exercise library may contain imported upstream exercise records, but import does not equal editorial approval.

Required distinction:
- **library/discovery content** may be imported and normalized with provenance;
- **curated program content** must be reviewed before being treated as canonical coaching guidance.

For important exercise guidance keep provenance, source revision/license and review status inspectable.

### Library curation workflow

The generated library (`src/domain/content/generated/libraryExercises.json`) does not ship the full upstream free-exercise-db set — it ships only what the app's owner has explicitly approved for the real people using the app, per CLAUDE.md's ban on inventing safety/appropriateness rules.

Workflow: `npm run library:review` (`scripts/content/list-library-candidates.ts`) fetches the pinned upstream snapshot and applies a *visibility-only* pre-filter (currently `level=beginner`, excluding plyometrics/powerlifting/olympic-weightlifting/strongman categories, barbell/e-z-curl-bar equipment, and isolation-mechanic exercises — the last a program-structure default, not a claim about any individual's condition) to produce `content/staging/library-curation-checklist.md` — a plain checkbox list, grouped by category/equipment, with every box starting unchecked. The owner checks the exercises they approve. `npm run generate:library` then reads only the checked ids (`scripts/content/curationChecklist.ts`) and refuses to run if nothing is checked, rather than silently falling back to shipping everything. See `support/CLAUDE_REQUESTS.md` REQ-20260926-001 for the open curation pass.

The pre-filter constants exist only to keep the review list manageable; loosening them and re-running `library:review` never changes what ships by itself — only checked boxes do that.

## 11. Workout player

The Workout Player is the highest-priority interaction surface.

Requirements:
- one exercise at a time;
- strong current set/exercise orientation;
- readable prescription and previous-performance context;
- large movement media;
- completion is easy with one hand;
- rest state is unmistakable;
- refresh/background/reopen is safe;
- errors do not silently lose work;
- target phone should avoid unnecessary scrolling during the core set-completion loop;
- sound/haptics/motion are enhancements, never prerequisites.

## 12. Exercise media

Media is authored externally, reviewed, committed or otherwise pinned as static content, and never generated at runtime.

Fallback chain:

```text
controlled animation/loop
 -> start/finish or sequence
 -> hero/static image
 -> written instructions
```

### Pixel Bloom production strategy

Preferred media lanes:
- SVG for icons/UI/vector decoration;
- PNG or lossless WebP for canonical still art;
- PNG frame sequences as editable animation truth;
- sprite sheets or animated WebP for runtime character/exercise loops where appropriate;
- GIF for review/previews or deliberately small loops, not as the universal runtime format;
- CSS/SVG/Web Animations for interface micro-motion.

Instructional exercise animation must prioritize consistent anatomy and readable form over visual spectacle.

## 13. Theme and motion system

Exactly one theme: Pixel Bloom. **Owner decision 2026-09-26:** Savage Core was built as a tactical HUD, then retired at the owner's direction; there is no theme picker.

### Pixel Bloom

Cozy premium pixel-inspired fitness-game world with pastel fields, playful progression, the approved adult Black woman/bunny mascot, collectibles, rewards and restrained game-like motion.

Rules:
- one shared route/component/domain tree;
- semantic design tokens control styling.

Motion preference:
- `full`;
- `reduced`;
- `off`.

OS `prefers-reduced-motion` remains a fallback safety signal.

## 14. Offline/local-first contract

Core local truth is IndexedDB/Dexie.

Persist at minimum:
- settings;
- check-ins;
- schedules;
- custom routines;
- immutable SessionPlans;
- SessionEvents;
- SessionResults;
- familiarity;
- progression;
- body-weight entries;
- profile metadata/scope;
- backup/export metadata when required.

The app must degrade safely if storage writes fail. Network connectivity is not a prerequisite for local workout writes.

Offline acceptance means more than showing an Offline banner. A cached installed app must be tested while network is actually unavailable.

## 15. PWA / iPhone contract

- `display: standalone` manifest behavior is required;
- safe-area insets must protect fixed controls on notched/rounded displays;
- WebKit/iPhone-like testing is required in addition to Chromium mobile testing;
- wake lock is progressive enhancement and may be revoked;
- audible feedback must tolerate autoplay/user-gesture restrictions;
- service-worker updates must not corrupt an active session;
- storage quota/eviction must be treated as real failure modes;
- export is the user's durable escape hatch from device-local storage.

See `docs/IOS_PWA_RUNTIME.md`.

## 16. Security/privacy posture

The app stores potentially sensitive fitness/body data locally.

- no analytics/trackers by default;
- minimize third-party runtime requests;
- never commit secrets;
- no claim that local profiles provide authentication or privacy from another person with unlocked device access;
- backup/export files should be treated as sensitive user data;
- prefer a restrictive CSP/deployment policy compatible with the static app;
- validate imported backup/content before persistence.

See `docs/SECURITY_AND_PRIVACY.md`.

## 17. Accessibility

Baseline target: WCAG 2.2 AA-oriented interaction design where practical.

Required:
- large touch targets; prefer ~44px+ for primary mobile controls even though WCAG's minimum target criterion is smaller;
- visible focus;
- semantic controls/status;
- no hover dependency;
- readable contrast/text;
- reduced/off motion behavior;
- no dangerous flashing;
- autoplaying decorative motion over five seconds must be stoppable/disableable or avoided;
- information must not disappear when motion is disabled;
- exercise images require useful alt treatment where they convey instruction.

## 18. Architecture target

```text
presentation / React
      ↓
application use-cases
      ↓
pure TypeScript domain
      ↓
infrastructure
  ├─ Dexie / IndexedDB
  ├─ content loading
  ├─ static media
  ├─ PWA/service worker
  └─ export/import
```

React does not own progression/programming rules. Runtime data access must not leak into pure domain logic.

See `docs/ARCHITECTURE.md`.

## 19. Testing priorities

Highest-risk behavior:
1. persistence/history integrity;
2. active-session recovery;
3. idempotency;
4. progression confirmation/replay;
5. offline reload/execution;
6. WebKit/iPhone behavior;
7. export/import round trips and corruption handling;
8. profile isolation;
9. accessibility/motion modes;
10. content/media validity.

See `docs/TESTING_AND_RELIABILITY.md`.

## 20. Definition of v0.7 done

A release-quality v0.7 should satisfy all of the following:

- installs/launches as a standalone PWA;
- primary flows work at iPhone portrait sizes;
- production build passes TypeScript/unit tests;
- golden path passes Chromium-mobile and WebKit/iPhone-like projects;
- a real offline reload + workout flow passes after caching;
- active workouts survive refresh/reopen;
- no duplicate-set/result/progression application from retries;
- custom routine edits cannot mutate already-started plans;
- profiles remain isolated;
- backup export/import round-trips validated data;
- progression still requires confirmation;
- Full/Reduced/Off motion preserve information;
- Pixel Bloom assets can be integrated through the documented asset contract without changing domain behavior;
- no runtime AI/backend/cloud dependency is required for core use.

## 21. Change rule

A new feature is not authoritative merely because an agent implemented it. Material scope changes must first be described as a product decision or explicitly reconciled into this source of truth.