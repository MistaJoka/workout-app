# Definition of Done

**Status:** AUTHORITATIVE DELIVERY GATE

A feature is not done because it renders. This repository treats persistence, offline behavior, recovery, accessibility and source-of-truth alignment as part of the feature.

## 1. Any product change

Done only when:
- behavior is consistent with `SOURCE_OF_TRUTH_V07.md`;
- no undocumented product rule was invented;
- relevant tests exist/pass;
- error/failure behavior is defined;
- accessibility/motion behavior is considered;
- affected docs/manifests are updated;
- no unrelated scope expansion was bundled in.

## 2. New or changed screen

Done only when:
- primary state is readable on iPhone portrait;
- loading/empty/error/offline states are handled where applicable;
- large touch targets and semantic controls are used;
- fixed controls respect safe-area insets;
- keyboard/focus behavior remains sensible;
- Full/Reduced/Off motion preserve the same information;
- Pixel Bloom is the only theme; styling changes go through tokens;
- no critical action depends on hover;
- no durable business truth exists only in component state.

## 3. Workout/session change

Done only when:
- SessionPlan immutability remains intact;
- event replay remains deterministic;
- double taps/retries are idempotent;
- refresh/reopen recovery is tested;
- final history remains immutable;
- progression/familiarity cannot double-apply;
- failure to play sound/animation/wake-lock does not break execution;
- local write failure is handled without pretending it is a network error.

## 4. Persistence/schema change

Done only when:
- migration path is defined/tested;
- existing user history is not silently discarded;
- profile scoping is correct;
- export/import implications are addressed;
- corrupted/old data behavior is explicit;
- transaction boundaries protect multi-write invariants where needed.

## 5. PWA/offline change

Done only when:
- production build works online;
- actual network-disabled behavior is tested where affected;
- service-worker cache/update semantics are understood;
- required curated media is available offline;
- active sessions survive update/reload;
- WebKit/iPhone-like project passes for critical flow;
- real iPhone smoke check is performed for meaningful releases.

## 6. Exercise/content change

Done only when:
- stable ID/version/provenance are present;
- schema validates;
- authored vs imported/draft status is explicit;
- instructions/prescriptions are not invented by implementation agent;
- media references resolve or degrade gracefully;
- progression/substitution relationships are reviewed rather than inferred;
- relevant license/source record is maintained.

## 7. Pixel Bloom creative asset

Done only when:
- asset follows canonical character/style contract;
- file has semantic/versioned name;
- source/runtime variants are documented where relevant;
- manifest entry exists;
- transparency/dimensions/loop/FPS metadata are known if animated;
- Reduced/Off fallback is defined;
- text that matters is not baked into raster pixels;
- asset remains readable at its actual UI size;
- visual consistency gate passes.

## 8. Animation

Done only when:
- animation has a functional purpose or controlled decorative role;
- runtime technique is appropriate (CSS/SVG/sprite/WebP/etc.);
- static fallback exists where needed;
- Full/Reduced/Off behavior is defined;
- no unsafe flash pattern;
- no essential info exists only in motion;
- animation does not gate persistence/domain transitions;
- repeated loops do not make the workout player distracting;
- performance/file size is acceptable on iPhone.

## 9. New dependency

Done only when:
- forcing constraint documented;
- license acceptable;
- offline behavior understood;
- privacy/network behavior understood;
- simpler platform/existing-stack solution considered;
- tests/build include it;
- dependency does not create runtime cloud requirement for core workout use.

## 10. Release gate

Release-ready means:

```text
source-of-truth reconciled
        ↓
TypeScript clean
        ↓
unit/infrastructure tests green
        ↓
production build green
        ↓
Chromium-mobile golden path green
        ↓
WebKit/iPhone-like critical path green (CI `e2e-webkit` job; `npm run e2e:webkit` locally)
        ↓
real offline flow proven (Chromium E2E; WebKit can't drive SW reloads, so real-iPhone offline is a manual check)
        ↓
real iPhone smoke check
        ↓
backup/export path verified
```

Plus:
- no unresolved P0 request that invalidates the shipped behavior;
- no known data-loss bug;
- no silent progression;
- no cross-profile leakage;
- no required runtime backend/AI service;
- version/build information updated.