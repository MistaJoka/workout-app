# UX flow audit: the Flip 7 PWA

**Date:** 2026-10-29
**Status:** plan only. No application code was changed by this audit.
**Target:** the owner's wife, solo, on a Galaxy Z Flip 7, Chrome, installed PWA served from `https://nomad.tailed9e33.ts.net:10000/`. The owner has a second local profile on the same phone.
**Release goal (owner):** "I send my wife the link, she installs the PWA on her Flip 7, and she can just get started." Section 0 covers that journey and is weighted P0.

## How this was measured

- Production build (`npm run build`), served by `npx vite preview --port 6310`. One section also used `scripts/selfhost-server.py`, the live host's server, to measure uncompressed transfer.
- Playwright Chromium, one browser at a time. Viewports: main screen 412x915, cover screen 361x399. Touch, `isMobile`, DPR 2.625, Android Chrome UA. CDP CPU throttling 4x.
- **Tap timing:** a capture-phase `pointerdown` listener stamps `performance.now()`. Polling with `requestAnimationFrame` then finds the first frame where the expected UI exists. Long tasks and layout shifts come from `PerformanceObserver`, installed by an init script.
- **History scaling:** one real finished session, cloned 100 or 300 times into IndexedDB, about one every 2.5 days.
- **Network:** CDP emulation, 150 ms RTT, at 4 Mbps ("LTE") and 1.5 Mbps ("weak").
- Scripts and screenshots are throwaway, in `/tmp/claude-1000/ux-audit/` (`s1`–`s13*.mjs`, `shots/`). They are not in the repo. Re-run a script to regenerate its evidence.

Severity: **P0** blocks the release goal. **P1** is a real trap, dead end or measurable slowness she will hit. **P2** is polish or consistency.

### What already works (keep it, and don't regress it)

| Check | Result |
|---|---|
| Player taps (4x CPU) | Complete Set → rep check 13 ms. Yes → rest 52 ms. Skip rest 32 ms. Undo 39 ms. Pause 35 ms / Resume 26 ms. Skip move 66 ms. End → Complete 49 ms. |
| Tab switches | 25–106 ms. No long tasks on repeat visits. CLS 0 on Today and Complete. |
| Today → Start → Player | 90 ms, then 112 ms (one 58 ms long task) |
| Double tap | A second tap 120 ms after Complete Set landed on the disarmed ThumbBar and was ignored. The rep check showed. |
| Reload mid-workout | Back on the same set in 205 ms |
| Offline cold reload (after SW install) | Today in 372 ms. Library, Garden, Rewards, Exercise detail and starting a workout all worked offline. |
| Update mid-workout | Reload landed on the same session's player |
| Backup | Export downloads `workout-app-backup-me-<date>.json`, then shows "Backup saved." A bad file shows "Import failed … Nothing was changed." |
| Player on the cover screen | Target, Rae and Complete Set all fit (shot `cover-player.png`). Rest, Paused and Complete keep their primary button in view. |
| Missing ids | `/session/x`, `/history/x`, `/routines/x`, `/story/99`, `/gift?d=junk`: each shows a message and a way out |

---

## 0. First open: link → install → first finished workout (P0)

Her path: she taps the link in a message, Chrome opens a tab, she sees onboarding (4 steps), then Today. She installs from Chrome's prompt or menu, taps Start workout twice, and lands on the player. Every finding below sits on that path.

| ID | Sev | Finding | Evidence | Fix (files) |
|---|---|---|---|---|
| F1 | P0 | **The live host serves JS uncompressed.** `selfhost-server.py` has no gzip/br, and the funnel doesn't compress either. | `curl -H 'Accept-Encoding: gzip, br'` on the live `vendor-*.js` gets 393,132 bytes with no `content-encoding`. First screen, measured: **5.7 s at 1.5 Mbps** (uncompressed) vs 2.6 s (gzip), and **2.6 s vs 1.7 s on LTE**. The first-install shell is 33 assets, 1,588 KB raw. | Precompress at publish time: in `scripts/selfhost.sh`, after `rsync`, write `.gz` (and `.br` if `brotli` exists) next to `*.js`, `*.css`, `*.json`, `*.html` and `sw.js`. In `scripts/selfhost-server.py`, serve the sibling when `Accept-Encoding` allows, with `Content-Encoding` and `Vary: Accept-Encoding`. Keep the original `Content-Type` and the existing `Cache-Control`. Verify with curl. Re-measure with `s12b.mjs`. |
| F2 | P0 | **White screen until JS runs.** `index.html` ships an empty `#root`. | FCP 1,988 ms (weak, gzip) and 5,136 ms (weak, uncompressed). Nothing is drawn before that. | Add an inline splash to `index.html`: inline `<style>` with background `#f8faff`, plus the app name and one small static Rae/icon `<img>` inside `#root` (React replaces it on mount). Use `%BASE_URL%` for the image. No new JS. |
| F3 | P0 | **The manifest is incomplete for Chrome's install UI.** It has no `id`, `description`, `screenshots`, `orientation` or `lang`. Both icons are `"purpose": "any maskable"` (Lighthouse warns about this). Names differ: manifest "Foundation Strength"/"Foundation" vs `apple-mobile-web-app-title` "Workout". | `public/manifest.json`. Without `screenshots` and `description`, Chrome Android shows the plain mini-infobar, not the richer install sheet. The icon glyph sits inside the maskable safe zone (furthest point about 170 px from centre; the safe radius at 512 px is 205 px), so a separate maskable entry can reuse the art. | Add `"id": "./"`, `description`, `orientation: "portrait"`, `lang: "en"`, `categories: ["health","fitness"]`. Add 2–3 `screenshots` (`form_factor: "narrow"`, 1080x2400 PNG of Today/Player/Complete) under `public/screenshots/`, plus a `"wide"` one if wanted. Split icons into `purpose: "any"` and `purpose: "maskable"` entries. Pick one home-screen name with the owner (needs an owner decision; log it in `support/CLAUDE_REQUESTS.md`). **Same file as the just-landed shortcuts (15f1e6f).** Extend `manifest.test.ts` rather than adding a second test, and add screenshots to the precache only if they're small (they don't have to work offline). |
| F4 | P0 | **The app never helps her install.** Nothing captures `beforeinstallprompt`, and onboarding doesn't mention installing. If she dismisses Chrome's infobar, the only route is ⋮ → "Install app". | `grep beforeinstallprompt src` finds nothing. | New `src/presentation/pwa/installPrompt.ts`: capture and `preventDefault` the event, expose `canInstall()` and `promptInstall()`, clear on `appinstalled`. Register it in `main.tsx` beside `registerServiceWorker()`. The owner's intro window (section 0.1) uses it. Until then, add a quiet "Install" row on Settings that shows only in a browser tab when `canInstall()` is true. |
| F5 | P0 | **Wrong message on Android about the browser vs the app.** `OpenInAppNotice` says "This opened in the browser, which keeps its own data". On Android Chrome the tab and the installed WebAPK share same-origin storage, so the message is false there and would make her think her data is gone. | `GiftPreviewScreen.tsx:173` and `:351-376` | Show the notice only where it's true (iOS Safari vs home-screen). On Android, show nothing, or "Open in the app" when `getInstalledRelatedApps` / `display-mode` says so. Put the check in `appContext.ts` (`browserStorageIsSeparate()`) and unit-test it in `appContext.test.ts`. |
| F6 | P0 | **Links can point at a host she can't reach.** `PUBLIC_APP_URL` defaults to `https://nomad.tailed9e33.ts.net:8443/`, which is tailnet-only (`appContext.ts:9-10`); the APK uses it for every gift, wish and thank-you link. Web builds use `window.location.origin` (`appContext.ts:32-39`, `giftLink.ts:185`), so a gift the owner composes on the `:8443` install, or on `localhost`/LAN `:4173`, points at a host she can't open. A different origin also means a different IndexedDB, so the two installs never share data. `selfhost.sh` doesn't set `VITE_PUBLIC_APP_URL`. CLAUDE.md's "deploy" command still names `:8443`. | Code read. The `:10000` host was reachable (`curl` 200 on `/`, `sw.js`, `manifest.json`). | Default `PUBLIC_APP_URL` to the funnel URL (`https://nomad.tailed9e33.ts.net:10000/`). In `linkLocationFor`, also use `publicUrl` when the page's origin differs from the public origin (not just in the APK). Export `VITE_PUBLIC_APP_URL` in `scripts/selfhost.sh` and the APK scripts. Add unit cases for localhost, `:8443` and `:10000`. Update CLAUDE.md's deploy line, and decide with the owner whether `:8443` keeps running at all, because two live origins mean two data silos. Files: `src/presentation/appContext.ts`, `appContext.test.ts`, `scripts/selfhost.sh`, `CLAUDE.md`. |
| F7 | P0 (ops) | **First install and every update need the owner's PC awake.** If it's asleep she gets Chrome's error page, not the app. | `scripts/selfhost.sh` header | Release checklist before sending the link: PC awake, `systemctl --user status workout-app-site`, `loginctl enable-linger`, curl the URL from cellular. After install the app runs offline (verified). No code change. |
| F8 | P1 | **Unreviewed "Draft" workouts are the first thing she browses.** Today's "Or pick another" row shows Warm-up, Cool-down and Chair day tagged "Draft". The Start screen offers "Warm up first", which leads to a draft. | Visible text on Today (`s1`): "Warm-up / Draft / Cool-down / Draft / Chair day / Draft". Library shot `11-library.png`. | Owner decision (REQ-20260929-006 is still open). Either approve them, or hide drafts from her UI behind a `SHOW_DRAFTS` flag while keeping their ids resolvable. Files: `TodayScreen.tsx:193-198,397`, `LibraryScreen.tsx:127-152`, `CheckInScreen.tsx:151,188-203`, `fixtures/raeDraftTemplates.ts`. |
| F9 | P2 | Onboarding ends with `location.reload()` (a white flash on a phone), and Skip throws away a name she typed. | `OnboardingGate.tsx:212-228`; finish → Today took 267 ms locally | Write the profile name and `weightUnit` through the existing setting caches (`settingCache.ts`, `useWeightUnit`) and close the overlay without reloading; Today re-reads the name on `profiles` change. Skip saves a non-empty name and unit. |

Today itself works for a first-timer on the main screen: Start workout sits at about 540 px of 915 (`03-today-first.png`). On the cover screen it doesn't (S4).

### 0.1 Where the owner's intro window should hook in (spec only, don't build)

- **Component:** a new `IntroGate`, mounted in `App.tsx` just before `<OnboardingGate />`. It shows once **per device**, not per profile: a `localStorage` key such as `workout-app:intro-seen`, read synchronously the way `profiles.ts` reads its own key. The owner's second profile must not see it again.
- **Browser tab** (`!isInstalledApp()`, `appContext.ts:44`) shows two cards:
  1. The owner's personal message.
  2. Install: an "Install" button when `installPrompt.canInstall()` (F4). Otherwise two pictured steps: Chrome ⋮ → "Install app" → open from the home screen.
  
  Then "Continue in browser". On Android the data carries over to the installed app, so continuing is safe.
- **Installed** (`display-mode: standalone`) shows the message card only, then hands over to onboarding. If she already saw it in the tab, skip it.
- **Never in the APK** (`isNativeApp()`).
- **It must not break:**
  - Never cover a `#/session/*` link (same rule as `profilePick.ts`).
  - Let a `#/gift` link proceed after one tap.
  - Keep the `navigator.webdriver` escape hatch, with an opt-in like `?intro=1` (mirror `isOnboardingForced`), so the e2e suite stays green.
  - Sit below `OnboardingGate` (`z-[60]`) and above `ProfilePickGate` (`z-50`), or show strictly before them, never stacked.
  - No `location.reload()`.
  - One-tap dismiss; reduced/off motion keeps all content.
  - At most one short paragraph per card (owner's minimal-text rule).
  - No notification or storage permission prompts in the same moment.
  - Uses `asset()` for any image (base-path rule).
  - Ships with its own e2e spec (tab vs standalone, via `page.emulateMedia` or a matchMedia stub).

---

## 1. Smooth and well developed?

| ID | Sev | Flow | Evidence | Fix (files) |
|---|---|---|---|---|
| S1 | P1 | Complete → Back to Today → **Android back gesture** | Measured: after "Back to Today", `history.back()` lands on `#/session/<id>/complete` again ("Workout complete … New to your garden!"). The finished celebration replays and invites a second look at the stale screen. | `SessionCompleteScreen.tsx:276-310`: give "Back to Today" and "See your progress" `replace`, so Complete leaves history. Add an e2e step: finish, Back to Today, `page.goBack()`, expect not Complete. |
| S2 | P1 | The same routine tile goes two different places | On Today the tiles open Start (`/checkin/:id`, `TodayScreen.tsx:404-411`). In Library the same tiles open Routine Detail (`/routines/:id`, `LibraryScreen.tsx:133-152`). | Pick one behaviour. Recommendation: both open Start (one tap from going), with Routine Detail reached from the Start screen header (an info/edit chevron). Confirm with the owner. |
| S3 | P1 | Unknown route | `#/does-not-exist` renders **nothing**: empty body, no tab bar, no exit (`s9`, shot `22-unknown-route.png`). Home-screen shortcuts (15f1e6f) and old links make this reachable. | `App.tsx`: add `<Route path="*" element={<Navigate to="/" replace />} />` at the end. Add a unit/e2e check alongside `manifest.test.ts`. |
| S4 | P1 | Today on the **cover screen** | Start workout sits at y=510 in a 399 px viewport, behind the tab bar (`cover-today.png`), so she has to scroll before she can start. | `index.css` short-screen block (around line 722): under `@media (max-height: 520px)`, clip `.today-stage > .rae-room` to about 140 px (or hide the scene and keep the speech line), so the mission's Start button lands above the tab bar. Check that `TodayMission` still reads. Extend `e2e/cover-screen.spec.ts` with "Start workout in view". |
| S5 | P2 | Not-found and empty states differ by screen | Start-screen not-found is a bare text and underline button with no BackButton (`CheckInScreen.tsx:131-140`). Exercise not-found is an underline link only (`ExerciseDetailScreen.tsx:43`, `10-exercise-detail.png`). `#/session/x/complete` shows **"Workout complete"** for a session that doesn't exist. `#/routines/x/edit` opens a blank "New routine" builder. | One shared `NotFound` (Rae face, one line, BackButton) used by CheckIn, ExerciseDetail, RoutineDetail, SessionDetail and StoryChapter. Complete renders NotFound when no plan/result exists. The builder in edit mode with an unknown id renders NotFound instead of a new routine. Files: the screens named, plus new `components/NotFound.tsx`. |
| S6 | P2 | Routine builder length | Each move row is about 570 px with 9 controls (`14-builder.png`), so three moves fill two screens. | Accordion rows: a collapsed one-line summary ("3 × 10 · 60s") with ↑/↓/×, tap to expand one at a time. Files: `RoutineBuilderScreen.tsx`, `routineBuilderRows.ts` (plus tests). |
| S7 | P2 | "Start workout" twice in a row | Today's mission button and the Start screen's ThumbBar both say "Start workout" (`03-today-first.png`, `04-start-screen.png`). The second tap feels like a repeat. | Rename one, e.g. the Start screen's to "Go" or "Let's go". Text-only change in `CheckInScreen.tsx:256-258` plus the e2e locators that use `name: 'Start workout'` on that screen (many specs; do it as one sweep). Owner decision. |
| S8 | P2 | Surprise me | 2.6 s from the tap to a Start screen she can act on (`s5`) | Let a tap on the reel skip to the result. `SurpriseScreen.tsx`. |

## 2. Error-proof?

| ID | Sev | Flow | Evidence | Fix (files) |
|---|---|---|---|---|
| E1 | P1 | Routine builder + **Android back gesture** | Measured: typed a name in `/routines/new`, then `page.goBack()` → `#/library`. No sheet appeared and the edits were lost. The guard only covers the in-app BackButton and the tabs (HashRouter can't block). | In `components/unsavedGuard.ts`, add `useBackGuard(dirty, ask)`: while dirty, push one sentinel history entry; on `popstate`, re-push it and open the existing leave ConfirmSheet. Wire it into `RoutineBuilderScreen.tsx`. Use the same pattern in `useSheetFocus.ts` so back closes an open sheet instead of leaving the page (measured: back with the Rewards PIN sheet open left the page). e2e: dirty builder + `goBack()` shows the sheet. |
| E2 | P1 | Settings → "Hubby's reward shop" **opens the giver's PIN setup on her phone** | Measured dialog: "Set a PIN · This guards Hubby mode: editing the shop, delivering coupons, and writing love notes …". She can create the PIN the owner is meant to own. Cause: `SettingsScreen.tsx:264` passes `state={{ openManage: true }}`, and `RewardsScreen.tsx:149-151` turns that into `pinSetup`. | Make the Settings row open the shop as a shopper (no `openManage`). Put "Manage shop (Hubby)" behind an explicit, collapsed giver-only row, or ask "Who's setting this up?" before `pinSetup`. Files: `SettingsScreen.tsx`, `RewardsScreen.tsx`. |
| E3 | P1 | **Update toast mid-workout** | On the cover screen the toast spans y=167–239 over the player stage at 93–282 and hides the rep target (`21-update-toast-over-player-cover.png`). A mis-tap on Reload mid-set reloads the app (the session resumes, but it's jarring). | `UpdateToast.tsx`: hide while `location.hash` starts with `#/session/` or `#/checkin/`. It lives outside the router in `main.tsx`, so listen to `hashchange`. Show it on Today/Complete instead. Anchor it above the bar (`bottom: calc(4rem + env(safe-area-inset-bottom) + 0.5rem)`) instead of `bottom-40`. Extend `e2e/sw-update.spec.ts`: toast hidden in the player, shown on Today. |
| E4 | P2 | Daily "Who's working out?" | Once the owner adds a profile on her phone, the gate asks every day (`profilePick.ts`, `shouldShowProfilePick`). That's an extra tap every morning for the main user. | Owner decision. Options: remember the last pick for N days, or add a "Mostly me" choice that only asks after the other profile was used on this device. Files: `profilePick.ts`, `ProfilePickGate.tsx` + tests. |
| E5 | P2 | Storage write failure is untested | The code shows `SAVE_ERROR` paths in the player (`WorkoutPlayerScreen.tsx:55,236-238`), `ResumeActions`, and CheckIn's "Couldn't start on this device". Not fault-injected in this audit. | Add an e2e fault-injection spec: override `IDBObjectStore.prototype.add/put` to throw `QuotaExceededError` for one call. Assert the error line shows, nothing advanced, and the retry works, for Complete Set, Start, builder Save and schedule set. Put it in `e2e/data-safety.spec.ts`. |
| E6 | P2 | Onboarding Skip loses input | `OnboardingGate.tsx:225-228` | Covered by F9. |

## 3. Fast and immediate?

| ID | Sev | Flow | Evidence | Fix (files) |
|---|---|---|---|---|
| P1 | P0 | First open over the funnel | See F1 and F2: 5.7 s and 2.6 s to the first screen, white until FCP | F1 + F2 |
| P2 | P1 | **First visit to every lazy route flashes a skeleton** | First visits at 4x CPU, in ms: Schedule 327, routine builder 320, Routine Detail 325, Exercise Detail 312, Garden 351, Boss 323, Story 328, Rewards 335, Notes 314, Badges 338, Recap 333, Surprise 326, About 321. Second visits: **8–22 ms**. The Skeleton appears after 150 ms (`Skeleton.tsx:9`), so each first open shows a placeholder for about 170 ms. | After Today's first render, warm the chunks with `requestIdleCallback(() => import('./presentation/screens/…'))`. Export a `preloadRoutes()` map from `App.tsx` beside the `lazy()` calls (one place) and call it from `AppShell` once. Keep it idle-only so it never competes with the player. Re-measure with `s3-routes.mjs`; target under 50 ms on the first visit. |
| P3 | P1 | **History makes Today, Progress, Badges, Recap and Complete slow** (superlinear) | Seeded sessions vs 1 session (4x CPU). With 300 (about 2 years at 3/week): **Today 681 ms** (25 ms with 1), **Progress 698 ms** (258 ms long task), **Badges 1,566 ms** (686 ms long task), **Recap 1,093 ms** (496 ms long task), **End → Complete XP 1,037 ms**, cold load → Today mission 587 ms. With 100: 156 / 224 / 442 / 413 / 579 ms. Three times the data costs about four times the time. | Add `application/historyIndex.ts`: read plans, results and events once, group events by `sessionId`, bucket results by ISO-week key, and cache per data version (bumped by `recordEvent`/import/discard). Domain functions take the index instead of raw arrays. Hot spots: `TodayScreen.tsx:91-102` (all plans and events on every mount), `:112-119` and `:208-211` (an `await getPlan` per row), `stats.ts:141` (`results.filter` per week inside streak/garden loops), `lastTime.ts:26` (`events.filter` per result), `achievements.ts`/`xp.ts` evaluation. Add a unit perf guard: 300 synthetic sessions, each pure function under a budget. Tests first (CLAUDE.md). |
| P4 | P2 | Library first open | 137–269 ms including the 461 KB library chunk; typing in search adds no long tasks | Fine. P2's prefetch also warms `libraryExercises` when idle. |
| P5 | — | Player, tabs, rest, pause | 13–112 ms, no CLS (see "What already works") | Keep. Any player change re-runs `s2-workout.mjs`. |

## 4. Organized?

Current map (who links where, `grep` of route strings):

| Route | Reached from |
|---|---|
| Schedule | Today week card "Plan", PlanWeekCard tile, Routine Detail |
| Reminders | Schedule only, and only after a day is planned (`ScheduleScreen.tsx:247`) |
| Motion setting | Settings → "About, animations, credits" (`AboutScreen.tsx:15-60`) |
| Rewards shop | Progress tile, Settings row (opens PIN setup, E2), carrot celebration, SavingGoal |
| Love notes | Progress tile, Rewards, Today badge |
| Garden | Progress tile, Complete, Recap |
| Badges | Progress tile, Complete unlocks |
| Story | Today tile (when new), Progress tile |
| Recap | Today tile, Progress tile |
| Boss | Today tile only |
| Surprise | Today row |
| Privacy/Terms/Licenses | Settings **and** inside About |

| ID | Sev | Finding | Evidence | Fix (files) |
|---|---|---|---|---|
| O1 | P1 | **Library is one long page.** That breaks the owner's "tabs/panels, no long scroll" rule. | 4,139 px tall at 915, 76 interactive elements (`s3`). Three stacked sections: Routines row, "Moves Rae shows you" row, Exercises list. | A segmented control under the title: **Routines | Moves | ♥**, one panel at a time. Search and filter live in Moves. Remember the last panel per session. Files: `LibraryScreen.tsx`, `libraryRows.ts`, e2e specs that touch the Library (`hearts`, `library-rae`, `her-mix`). |
| O2 | P1 | **The collection is scattered and hidden on day one.** Progress hides the collection grid until a workout is finished (`ProgressScreen.tsx:150-196`), so before then the shop and notes are reachable only through Settings, which springs the PIN trap (E2). Boss is reachable only from a Today tile. | Map above | Progress gets two panels, **Stats** and **Collection** (Garden, Badges, Story, Recap, Boss, Shop, Notes). Collection shows from day one with locked/empty states. Today keeps only the time-sensitive tiles (new chapter, recap ready, boss hit). Files: `ProgressScreen.tsx`, `TodayScreen.tsx:374-389`, `BossCard.tsx`, `e2e/progress-*.spec.ts`. |
| O3 | P1 | **Settings buries everyday controls and repeats legal links.** Motion sits under "About, animations, credits", reminders sit under Schedule, and Privacy/Terms/Licenses appear in both Settings and About. | `SettingsScreen.tsx:180-300`, `AboutScreen.tsx` | Settings → Workout gets **Motion (On/Less/Off)** and a **Reminders** row (→ Schedule's card) next to units and sound. Legal links live only in About. Settings → "More" becomes: Meet Rae, About. |
| O4 | P2 | Schedule is hard to find | Only from Today's week card and Routine Detail | Add a "Your week" row in Settings → Workout and a "Plan week" tile at the end of Library's Routines panel. |
| O5 | P2 | Progress "More" will get crowded | It already holds the 8-week chart, bests, body weight and history (`ProgressScreen.tsx:221-290`) | Turn "More" into panels: **History | Bests | Body**. Body is where measurements and photos go (below). |

### Where the in-flight features belong (don't plan them here, just place them)

- **Activity logging** (a walk, a class): a small "Log something else" action on Today's mission card when the mission is done or a rest day, never a fifth tab. Logged items appear in Progress → History and count toward the week pots.
- **Measurements:** Progress → More → **Body** panel, beside the existing `BodyWeightCard`.
- **Progress photos:** the same Body panel, behind one tap (private by default). Never on Today or Complete.
- **Exercise swap** (landed, 88ca322, "Swap …" on the Start screen): keep it on Start and optionally in the player's overview sheet ("1 of 5 ▾"). Never in the ThumbBar or the stage.
- **Circuits** (landed, 2d9c01e): authoring in the routine builder (S6's accordion must allow a circuit toggle); the player shows the round in the "1 of 5" header.
- **PWA reminders** (landed, 15f1e6f): the card stays in Schedule, with a Reminders row in Settings → Workout linking to it (O3).
- **Manifest shortcuts** (landed): every shortcut URL must resolve. S3's catch-all guards against stale ones. Consider "Start today's workout" (`./#/`) as the first shortcut.

---

## Execution order (independent batches)

Each batch ships alone with `npm run check` + the named e2e specs (`--workers=1`), then one full `npm run e2e` at the end. "Touches" lists the files that overlap with other batches, so they can be sequenced or merged with care.

1. **B1: First-open hosting** (F1, F2, F7)
   - Files: `scripts/selfhost-server.py`, `scripts/selfhost.sh`, `index.html`.
   - Verify: curl shows `content-encoding: gzip`; `s12b.mjs` first screen under 3 s at 1.5 Mbps; the splash shows before JS.
   - Overlaps: B3 (`selfhost.sh`).
2. **B3: Links and hosts** (F5, F6)
   - Files: `appContext.ts` (+ test), `GiftPreviewScreen.tsx` (`OpenInAppNotice`), `scripts/selfhost.sh`, `CLAUDE.md`.
   - Overlaps: B1 (`selfhost.sh`), B2 (`appContext.ts` if `isInstalledApp` changes). Needs the owner's call on retiring `:8443`.
3. **B2: Manifest and install** (F3, F4)
   - Files: `public/manifest.json`, `manifest.test.ts`, `public/icons/`, new `public/screenshots/`, new `pwa/installPrompt.ts`, `main.tsx`, `SettingsScreen.tsx` (browser-only Install row).
   - Overlaps: the landed shortcuts in `manifest.json`; B5 and B6 (`main.tsx`, `SettingsScreen.tsx`). Needs the owner's naming decision. The intro window (0.1) builds on this later.
4. **B4: Navigation safety** (S1, S3, S5, E1)
   - Files: `App.tsx`, `SessionCompleteScreen.tsx`, `unsavedGuard.ts`, `useSheetFocus.ts`, `RoutineBuilderScreen.tsx`, `CheckInScreen.tsx`, `ExerciseDetailScreen.tsx`, new `components/NotFound.tsx`.
   - Overlaps: B8 (`App.tsx`), B10 (`RoutineBuilderScreen.tsx`).
5. **B5: Around the player** (E3, S4)
   - Files: `UpdateToast.tsx`, `main.tsx`, `index.css` (short-screen block), `TodayScreen.tsx`/`RaeHero.tsx` (cover layout only).
   - Specs: `sw-update`, `cover-screen`.
   - Overlaps: B2 (`main.tsx`), B7/B8/B9 (`TodayScreen.tsx`).
6. **B6: Settings and the shop trap** (E2, O3, O4)
   - Files: `SettingsScreen.tsx`, `AboutScreen.tsx`, `RewardsScreen.tsx`.
   - Specs: `settings-layout`, `rewards`, `shop-*`, `motion`.
   - Overlaps: B2 (`SettingsScreen.tsx`).
7. **B8: Performance** (P2, P3)
   - Files: `App.tsx`/`AppShell.tsx` (prefetch); new `application/historyIndex.ts`; `domain/progress/stats.ts`, `xp.ts`, `achievements.ts`, `domain/session/lastTime.ts`; `TodayScreen.tsx`, `ProgressScreen.tsx`, `AchievementsScreen.tsx`, `RecapScreen.tsx`, `SessionCompleteScreen.tsx`.
   - Tests first; re-run `s3-routes.mjs` and `s8-history.mjs 300`. Targets: Today under 200 ms and Badges under 400 ms at 300 sessions.
   - Overlaps: B4, B5, B9 (screens). Do the domain/index half first, the screen wiring second.
8. **B7: Library panels and tile destinations** (O1, S2)
   - Files: `LibraryScreen.tsx`, `libraryRows.ts`, `TodayScreen.tsx` (tile `to`).
   - Specs: `hearts`, `her-mix`, `library-rae`, `today-layout`.
   - Overlaps: B5, B8, B9 (`TodayScreen.tsx`).
9. **B9: Progress collection and drafts** (O2, O5, F8)
   - Files: `ProgressScreen.tsx`, `TodayScreen.tsx`, `BossCard.tsx`, `LibraryScreen.tsx`, `CheckInScreen.tsx`, `raeDraftTemplates.ts`.
   - Specs: `progress-*`, `boss`, `today-*`.
   - Overlaps: B7, B8. The drafts half waits on the owner (REQ-20260929-006).
10. **B10: Polish** (F9, S6, S7, S8, E4, E5)
    - Files: `OnboardingGate.tsx`, `RoutineBuilderScreen.tsx`, `routineBuilderRows.ts`, `CheckInScreen.tsx` + e2e locator sweep, `SurpriseScreen.tsx`, `profilePick.ts`, `e2e/data-safety.spec.ts`.
    - Overlaps: B4 (builder), B9 (`CheckInScreen.tsx`). S7 and E4 are owner decisions.

**Suggested order:** B1 → B3 → B2 (release goal) → B4 → B5 → B6 → B8 → B7 → B9 → B10. Batches with no file overlap (B1 with B4, or B6 with B8's domain half) can run side by side, at most two heavy agents at once.

**Owner decisions to collect first** (one `support/CLAUDE_REQUESTS.md` entry each):
- The home-screen name (F3).
- Retiring or keeping the `:8443` host (F6).
- What happens to the draft workouts (F8).
- One destination for routine tiles (S2).
- The second "Start workout" label (S7).
- The daily profile question (E4).
