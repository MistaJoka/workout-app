# Research Sources

**Status:** CURATED REFERENCE INDEX  
**Last refreshed:** 2026-09-19

Use primary/official sources first for platform behavior, accessibility and health-guideline framing. Use FOSS repositories for implementation patterns only after license/compatibility review.

## 1. iPhone / PWA / Web platform

### WebKit storage policy
https://webkit.org/blog/14403/updates-to-storage-policy/

Use for:
- Safari/WebKit quotas;
- eviction;
- persistent-storage behavior;
- `navigator.storage.estimate()` / `persist()` considerations.

### WebKit Home Screen apps
https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/

Use for:
- Home Screen web-app model;
- standalone manifest behavior;
- iOS/iPadOS PWA context.

### MDN standalone PWA
https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Create_a_standalone_app

Use for:
- `display: standalone`;
- installed display-mode detection.

### MDN app icons
https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Define_app_icons

Use for:
- manifest icons;
- PNG fallbacks;
- maskable icon concepts.

### MDN safe-area environment variables
https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Environment_variables/Using

Use for:
- `safe-area-inset-*`;
- fixed bottom/top controls on modern phones.

### MDN Screen Wake Lock
https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API

Use for:
- feature detection;
- rejection/revocation behavior;
- visibility/reacquisition;
- progressive enhancement.

### MDN autoplay / Web Audio
https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay

Use for:
- user-gesture requirements;
- graceful audio feedback failure.

### WebKit iOS media policy background
https://webkit.org/blog/6784/new-video-policies-for-ios/

Use when Safari/iPhone media playback behavior matters.

## 2. Browser testing

### Playwright projects
https://playwright.dev/docs/test-projects

Use for running the same essential journeys across Chromium and WebKit configurations.

### Playwright emulation
https://playwright.dev/docs/emulation

Use for named mobile device profiles and touch/mobile settings.

### Playwright browsers
https://playwright.dev/docs/browsers

Use for supported browser-engine installation/CI configuration.

## 3. Accessibility / motion

### WCAG 2.2
https://www.w3.org/TR/WCAG22/

Primary accessibility standard reference.

Particularly relevant:
- 2.2.2 Pause, Stop, Hide;
- 2.3.1 Three Flashes or Below Threshold;
- 2.5.7 Dragging Movements;
- 2.5.8 Target Size (Minimum);
- focus visibility/obscuring criteria.

### Pause, Stop, Hide explainer
https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide

Use for looping/ambient Pixel Bloom motion.

### Three Flashes explainer
https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold

Use for reward/celebration/sparkle animation review.

## 4. Image / animation formats

### MDN image format guide
https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Image_types

Use for choosing SVG/PNG/WebP/APNG/GIF/AVIF based on transparency, animation and compatibility.

Local strategy remains:
- SVG: UI/vector;
- PNG: canonical lossless source/transparent art;
- WebP: efficient runtime still/animation where appropriate;
- frame sequences/sprites: controllable character/exercise animation;
- GIF: preview/small intentional loops, not universal runtime format.

## 5. Security

### MDN Content Security Policy
https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP

Use for static-SPA resource restrictions/XSS defense in depth.

### OWASP CSP Cheat Sheet
https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html

Use for CSP implementation/review patterns.

## 6. General physical-activity framing

### U.S. Physical Activity Guidelines for Americans, 2nd edition
https://odphp.health.gov/our-work/nutrition-physical-activity/physical-activity-guidelines/current-guidelines

Reference for broad public-health framing such as adults performing muscle-strengthening activity on at least two days per week. Do not use general population guidance to invent an individual's prescription, exercise substitution or medical recommendation.

### Healthy People 2030 muscle-strengthening objective
https://odphp.health.gov/healthypeople/objectives-and-data/browse-objectives/physical-activity/increase-proportion-adults-who-do-enough-muscle-strengthening-activity-pa-04

Use only for broad context, not exercise-specific programming logic.

## 7. FOSS fitness research

Canonical local index:
- `docs/rnd/foss-fitness/CAPABILITY_MATRIX.md`
- `docs/rnd/foss-fitness/LICENSE_REGISTER.md`
- `docs/rnd/foss-fitness/SOURCE_REGISTRY.md`
- `docs/rnd/foss-fitness/PRODUCT_BENCHMARK_2026-09.md`

Important sources include:
- Liftosaur: https://github.com/astashov/liftosaur
- wger: https://github.com/wger-project/wger
- FitTrackee: https://github.com/SamR1/FitTrackee (main project hosted on Codeberg; mostly outdoor-activity benchmark)
- free-exercise-db: source pinned/documented locally
- FitnessTrack, OpenWorkout and Ischys: pinned/local source notes under `docs/rnd/foss-fitness/sources/`.

## 8. Evidence discipline

When a decision depends on an external fact:
1. prefer official/current primary source;
2. record access/research date for volatile platform behavior;
3. distinguish platform fact from local product decision;
4. pin source revisions for code/data reuse;
5. check license before copying implementation;
6. promote conclusions into authoritative docs only when they are product decisions.

Do not make future agents re-search settled facts unless the underlying platform/source may have changed materially.