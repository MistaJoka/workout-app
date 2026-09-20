# iPhone / PWA Runtime Contract

**Status:** AUTHORITATIVE PLATFORM / RELIABILITY CONTEXT  
**Research refresh:** 2026-09-19  
**Primary target:** iPhone portrait, installed Home Screen web app where possible

This document converts current browser/platform research into product acceptance rules. It is not a generic PWA tutorial.

## 1. Home Screen / standalone behavior

The app manifest uses `display: "standalone"`. Installed PWAs should be treated as a separate app-like launch context rather than merely a Safari tab.

Required:
- valid manifest;
- stable `start_url`;
- PNG app icons in appropriate sizes;
- app works both installed and browser-launched;
- layouts account for standalone safe areas;
- no flow requires browser chrome/back buttons to recover.

Reference:
- WebKit: Web Push for Web Apps on iOS/iPadOS — Home Screen web apps and `display: standalone`: https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/
- MDN: Create a standalone app: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Create_a_standalone_app
- MDN: Define app icons: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Define_app_icons

## 2. Safe areas and fixed controls

Use CSS environment variables for notches/rounded-screen areas:

- `env(safe-area-inset-top)`
- `env(safe-area-inset-right)`
- `env(safe-area-inset-bottom)`
- `env(safe-area-inset-left)`

Fixed bottom navigation, bottom CTAs and sheets must remain fully tappable above the home indicator.

Reference: https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Environment_variables/Using

## 3. Local storage is durable, not immortal

Core user truth lives in IndexedDB/Dexie. Browser storage can still fail or be evicted.

WebKit documents that modern Safari/WebKit quotas are based on disk size and that storage operations can fail with `QuotaExceededError`. Data may be evicted under storage pressure unless the origin is in persistent mode. Home Screen use is one of the heuristics WebKit may use when deciding persistence.

Therefore:
- catch storage write failures;
- do not describe them as network failures;
- expose backup/export prominently enough to be useful;
- use `navigator.storage.estimate()` when diagnostics/storage UI is added;
- consider `navigator.storage.persisted()` / `persist()` as progressive enhancement;
- never rely on browser storage as the sole permanent archival strategy.

Reference: WebKit, Updates to Storage Policy: https://webkit.org/blog/14403/updates-to-storage-policy/

## 4. Offline means network actually unavailable

Showing `navigator.onLine === false` or an Offline banner is not an offline acceptance test.

A release test must prove:

```text
load/install while online
 -> ensure app/media cached
 -> start or create durable state
 -> disable network
 -> reload/close-like navigation
 -> launch app shell
 -> resume/start supported cached workout
 -> complete sets/rest
 -> persist local result
 -> reopen/read history
```

Also test:
- stale service-worker cache after new build;
- app update while a session exists;
- missing optional media;
- library exercise whose remote media has never been cached;
- failed fetch while the local workout remains writable.

## 5. Cache Storage vs IndexedDB

Keep responsibilities separate:

### Cache Storage / service worker
- HTML shell;
- JS/CSS build assets;
- app icons;
- curated exercise media needed for guaranteed offline sessions;
- optionally viewed library media.

### IndexedDB
- profiles/settings;
- check-ins;
- schedules;
- routines;
- session plans/events/results;
- progression/familiarity;
- body-weight/history data.

A cache purge should not erase workout history. An IndexedDB loss should not be disguised by cached UI.

## 6. Service-worker update contract

Updates must be safe around an active workout.

Rules:
- no update process may reset session data;
- old cached chunks may coexist briefly with new deploys, so update flow must fail safely;
- do not force-reload in the middle of a set without explicit UX;
- verify old cached shell -> new deployed shell behavior;
- service-worker cache naming/versioning must be intentional;
- precache lists for guaranteed-offline curated media must stay synchronized with canonical media manifests.

## 7. Wake lock

Screen Wake Lock is a progressive enhancement. MDN lists it as broadly available across current browsers since 2025, but a request can still fail because of visibility, system policy, power state or implementation constraints.

Runtime rule:
- feature-detect;
- request only while a workout benefits from it;
- tolerate rejection;
- expect release when the document is hidden;
- reacquire when visible if still needed;
- release when the workout ends/unmounts;
- never make workout correctness depend on the lock.

The current `useWakeLock` design already follows most of this model.

Reference: https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API

## 8. Audible feedback / autoplay

Safari and other browsers restrict audible autoplay. Audio/Web Audio generally needs a prior user gesture.

Rules:
- prime/resume audio from a direct user action when sound is enabled;
- catch playback failures;
- never block workout progression because a sound did not play;
- visual timer state remains authoritative;
- sound preference is user-controlled.

References:
- MDN Autoplay guide: https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay
- WebKit iOS media policy background: https://webkit.org/blog/6784/new-video-policies-for-ios/

## 9. Background / timers

Do not assume `setInterval` runs accurately while the app is backgrounded.

Rest timers must be reconstructed from timestamps:

```text
remaining = persisted deadline - current clock
```

On visibility/focus return, recompute immediately. UI tick frequency is presentation only.

If a user-visible timer modification (such as `+15s`) is expected to survive refresh/backgrounding, persist the modification itself.

## 10. WebKit testing requirement

Playwright supports WebKit plus mobile-device emulation. The release suite should use projects so the same essential journeys run under at least:

- Chromium mobile;
- WebKit with an iPhone-like device profile.

This is still emulation, not a complete substitute for a real iPhone smoke test, but it catches engine differences that a 390x844 Chromium viewport cannot.

References:
- Playwright projects: https://playwright.dev/docs/test-projects
- Playwright emulation: https://playwright.dev/docs/emulation

## 11. Real-device smoke gate

Before calling a release iPhone-ready, manually verify on at least one real iPhone/Safari/Home Screen install:

- install/launch;
- safe areas;
- profile switch;
- routine selection;
- full check-in/preview/start flow;
- movement media;
- set completion;
- sound after user gesture;
- rest background/return;
- screen wake behavior (best effort);
- offline relaunch after caching;
- completed-session history;
- export file creation;
- theme/motion switching;
- app update/relaunch.

## 12. Platform principle

The PWA should remain correct when optional browser capabilities fail.

```text
IndexedDB write success + deterministic domain state
              = core correctness

wake lock / audio / animation / online media
              = progressive enhancement
```