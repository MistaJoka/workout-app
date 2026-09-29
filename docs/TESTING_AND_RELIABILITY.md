# Testing and Reliability Strategy

**Status:** AUTHORITATIVE QUALITY CONTEXT  
**Target:** deterministic local-first fitness PWA whose workout history survives normal failure/recovery paths

## 1. Reliability hierarchy

Test the expensive failures first:

1. wrong/corrupt durable workout history;
2. duplicate event/result/progression application;
3. losing an active workout after refresh/background/reopen;
4. inability to operate offline after caching;
5. WebKit/iPhone-specific breakage;
6. profile data leakage;
7. export/import corruption;
8. inaccessible or misleading interaction states;
9. media/theme polish regressions.

Pixel-perfect UI is important, but it must not outrank historical truth.

## 2. Test layers

### Pure domain tests — fastest / broadest
Cover:
- session-machine transitions;
- event replay/idempotency;
- timer math;
- schedule resolution;
- progression evaluation;
- stats/history projections;
- content schema validation;
- unit conversions/calculations.

Pure tests should use explicit timestamps/fixtures and avoid browser APIs.

### Repository/infrastructure tests
Using `fake-indexeddb` or an isolated Dexie database, cover:
- plan immutability;
- unique event IDs;
- immutable results;
- profile isolation expectations;
- migrations;
- custom template CRUD;
- progression/familiarity writes;
- body-weight entries;
- export/import round trip;
- rejected malformed/corrupt imports.

### Application/service tests
Cover orchestration across domain + repositories:
- start session;
- record event;
- complete result exactly once;
- progression applies exactly once;
- shortened session;
- recovery of in-progress sessions;
- error propagation for failed writes.

### E2E tests
Run production build through real browser engines. Focus on journeys and platform boundaries, not exhaustive JSX assertions.

## 3. Browser matrix

Minimum CI projects:

### Chromium mobile
Fast primary regression project.

### WebKit / iPhone-like
Required because the product is iPhone-first. Use Playwright's WebKit engine with a named iPhone device profile where practical.

Desktop browser testing is useful but secondary to these two for V1/v0.7.

Playwright reference:
- https://playwright.dev/docs/test-projects
- https://playwright.dev/docs/emulation

## 4. Golden journeys

At minimum retain automated journeys for:

1. first run -> check-in -> complete curated workout -> progress/history;
2. in-progress workout survives reload -> Today resumes it;
3. library search/filter -> exercise -> create routine -> start routine;
4. weighted prescription -> adjust/log load -> history/progression;
5. weekly schedule changes Today;
6. two local profiles remain isolated;
7. settings/export/destructive guard;
8. theme + motion preference persistence.

## 5. Required new reliability journeys

### A. Real offline relaunch

```text
online initial load
 -> cache ready
 -> start session
 -> network disabled
 -> reload/navigation
 -> resume
 -> complete at least one set/rest
 -> persist locally
 -> inspect history
```

Do not satisfy this test by merely dispatching `offline`/`online` DOM events.

### B. WebKit golden path
Run a shorter but representative workout path on WebKit/iPhone-like configuration.

### C. Background timer recovery
Persist a rest deadline, simulate elapsed clock/background return, verify remaining time derives from timestamp rather than tick count.

### D. Session-start interruption
Simulate failure between plan creation and `SESSION_STARTED` or otherwise prove the operation is atomic/recoverable. A plan with no start event must not become a misleading resumable workout.

### E. Duplicate completion race
Repeated/simultaneous identical event/result attempts must produce one durable outcome and one progression update.

### F. Service-worker update with active session
A new deployed build/service worker must not erase or silently reset the active IndexedDB session.

## 6. Session edge-case corpus

Required cases:

| Scenario | Expected invariant |
|---|---|
| double tap Complete Set | one set event |
| reload during active set | same exercise/set |
| reload during rest | deadline-derived remaining time |
| background past rest deadline | rest resolves correctly on return |
| pause then reload | paused state preserved |
| finish early | completed work retained, shortened result |
| duplicate completion request | one SessionResult |
| failed local write | no optimistic irreversible state loss |
| clock moves forward | timestamp math remains deterministic/documented |
| clock moves backward | no negative/corrupt history; behavior explicitly tested |
| template edited after session start | started plan unchanged |
| profile switch | other profile cannot see session/history |
| app update | session/history survives |

## 7. Export/import corpus

Test at least:
- normal export -> clean database -> import -> equality of durable truth;
- wrong schema/version;
- unknown fields;
- missing required fields;
- duplicate event IDs;
- duplicate results;
- invalid timestamps;
- impossible references;
- partially valid document;
- import interrupted before completion;
- import into profile with existing data;
- old supported schema migration.

Import should validate before destructive replacement whenever possible.

## 8. Content/media validation

Build/test tooling should verify:
- referenced exercise IDs exist;
- template exercise references resolve;
- media manifest paths are valid where marked required;
- curated guaranteed-offline media is actually included in the offline cache strategy;
- provenance/review state is present where required;
- no production progression/substitution edge references unknown exercises;
- static asset naming follows creative contracts.

## 9. Accessibility checks

Automated checks cannot replace manual review, but tests should cover:
- semantic button/link names;
- focus order for critical flows;
- visible focus styles;
- no essential hover-only action;
- 24x24 CSS-pixel WCAG minimum target rule, with larger mobile primary targets preferred;
- reduced/off motion preserves information;
- instructional images have appropriate alternative text/structure;
- modals/sheets have meaningful dialog semantics;
- destructive actions require intentional confirmation.

WCAG 2.2 references:
- https://www.w3.org/TR/WCAG22/
- Target Size Minimum: SC 2.5.8
- Pause, Stop, Hide: SC 2.2.2
- Three Flashes or Below Threshold: SC 2.3.1

## 10. Motion/animation tests

Pixel Bloom is intentionally lively, so motion itself needs acceptance criteria.

For each animated asset/behavior:
- Full mode displays intended motion;
- Reduced mode removes large/repetitive motion while keeping feedback;
- Off mode presents a static equivalent;
- no animation changes durable domain state;
- no essential instruction exists only in an animation;
- looping decorative animation longer than five seconds is disabled/pausable or controlled through the app motion preference;
- avoid flash patterns over accessibility thresholds.

## 11. Performance/media budget checks

Track, don't guess:
- initial JS/CSS payload;
- lazy library payload;
- curated offline media bytes;
- Pixel Bloom animation bytes;
- Cache Storage usage;
- IndexedDB usage;
- startup time on a phone-like environment.

Large cosmetic assets should not block interaction with Today or an active workout.

## 12. CI quality gate

A release branch/master change should not be considered green unless relevant checks pass:

```text
TypeScript
 -> Vitest
 -> production build
 -> Chromium-mobile E2E
 -> WebKit/iPhone-like essential E2E
```

Offline/service-worker E2E may require a separate project/setup because normal test contexts intentionally disable or isolate service-worker state; document that explicitly rather than claiming coverage that is not present.

Current state (2026-09-29): CI runs the Chromium-mobile suite (`e2e` job) and the WebKit/iPhone suite (`e2e-webkit` job, inside Playwright's official Ubuntu image, whose tag is read from the lockfile). Locally, `npm run e2e` is Chromium and `npm run e2e:webkit` runs WebKit in the same Docker image. Playwright WebKit can't drive service-worker reloads, so the offline journeys (`e2e/offline.spec.ts`, `e2e/data-offline.spec.ts`) skip themselves on WebKit: real offline is proven in Chromium only, and real-iPhone offline stays a manual smoke check (section 13).

## 13. Manual iPhone smoke test

Automated WebKit is necessary, not sufficient. Before meaningful releases, validate on a real target iPhone:
- install/standalone;
- safe areas;
- touch targets;
- keyboard/input behavior;
- scroll containment;
- wake lock behavior;
- audible rest feedback after user interaction;
- background/return timer;
- offline relaunch;
- export/share-file behavior;
- motion/reduced motion;
- visual asset clarity.

## 14. Definition of a fixed bug

A bug fix is not done when the symptom disappears once.

Done means:
1. root invariant identified;
2. smallest appropriate regression test added;
3. existing history/migration implications considered;
4. production build/tests pass;
5. source-of-truth docs updated if behavior changed.