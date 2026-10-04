# Movement-first, less-text pass: design

**Date:** 2026-10-04
**Status:** approved in conversation (owner), awaiting spec review
**Owner's words:** "i want the UI to be easier to navigate, no need for a lot of text. action and movement is the motivation across this app." and "the workout complete page is cool."

## Goal

Each main tab is understood at a glance, with one obvious next tap. Rae moving, icons and numbers carry meaning. Sentences don't.

## Evidence (audit, 384x824 viewport, after one finished workout)

| Screen | Words | Height |
|---|---|---|
| Today | 153 | 1772px (9 stacked cards) |
| Library | 213 | 4436px |
| Progress | 195 | 2350px |
| Complete (unchanged) | 87 | 1381px |

## Rules (apply everywhere this pass touches)

1. **Visible text** is limited to names (workout, move), numbers, and at most one short line from Rae per screen.
2. **Meaning moves to accessible names.** A shortened visible label keeps its full sentence as `aria-label` / `sr-only` text, so screen readers, axe and role-based tests still read the full meaning.
3. **Workouts and moves show as Rae.** Use loops where she is performing and stills (`raeStillFor`) in thumbnails, falling back to the exercise photo. Never "N exercises" as the main description.
4. **One primary action per screen.** It is big and in thumb reach.
5. **Nothing is deleted.** Every entry point that leaves a screen still exists somewhere reachable in at most two taps.
6. **Motion preference holds.** With reduced/off motion, loops become stills and no information is lost.

## Out of scope

The workout player, Complete, Settings, onboarding, the legal pages, the rewards/story/garden/boss screens themselves, and any domain logic. Visual tokens stay the same (Pixel Bloom only).

## 1. Today (target: the ready state fits one 824px screen)

- **Header:** greeting and the carrot / love-note chips only. The long date line is removed from view.
- **Rae's room (`RaeHero`):** in the `ready` mission, Rae's figure shows the loop of today's workout's first move that Rae demonstrates (from `raeLoopForExercise` over the template's exercises, in order). This needs a new optional `pose` prop on `RaeHero`. The `.rae-room` height is unchanged; the figure box keeps the standing figure's footprint and the loop is bottom-aligned so her feet stay on the rug. `resume`, `rest`, `done` and missing loops keep today's standing figure. Tap-to-hop stays.
- **Mission card (`TodayMission`), ready state:** the workout name, ⏱ minutes, and a row of small Rae stills, one per move (max 6, then "+N"). The big ▶ Start button keeps its accessible name "Start workout". The "5 exercises, about 15 min" line becomes visually hidden text. The done/rest/resume states keep their actions; their secondary sentences shorten to an icon + number where one exists.
- **Week (`WeekBlooms` + `MomentumStrip`):** pots + "1/2". The goal sentence and the milestone sentence become a thin labelled bar with visually hidden full text.
- **Extras row (new `TodayExtras`):** one horizontally scrolling row of small square tiles, each an icon/pixel art + at most 2 words + optional number. Each tile shows only when it is relevant today:
  - new chapter (from `data.newChapter`);
  - week recap (wraps `RecapEntry`'s condition);
  - boss HP (`BossCard`'s data);
  - saving goal (`SavingGoalTodayCard`'s condition);
  - plan week (`data.offerPlanWeek`).

  These replace the five full-width cards.
- **Other workouts:** a horizontal row of tiles (first-move Rae still, name, ⏱, Draft dot), plus a "More" tile to Library. Replaces the text list.
- **`WelcomeCard`:** removed from Today. Onboarding already asks the name, and Settings keeps it editable. Its three tip sentences are dropped. `welcomeDismissed` handling stays harmless.

## 2. Library

- **Routines:** a horizontal row of tiles (three Rae stills, name, ⏱, Draft dot) and a "+ New" tile. Replaces the text rows.
- **Moves Rae shows you:** de-duplicate by loop id. It currently lists curated and library ids for the same move twice, e.g. Bodyweight Squat and Plank.
- **Exercise rows:** a 48px thumbnail (Rae still, else photo) plus the name and a small muscle chip. "No equipment" is hidden while `NO_EQUIPMENT_ONLY` is on, and shown for equipment moves when the flag is off. The search/filter row is unchanged.

## 3. Progress (target: default view ≤ about 1.5 screens)

- Remove Rae's sentence at the top.
- **Level bar + three stat tiles stay.** "This week vs last" loses its heading and fallback sentence. Its highlights (positive-only, as now) become one compact ▲ chip row under the tiles. Some highlights, such as "Longest hold yet", match no tile, so they can't become marks on the tiles.
- **Collection:** a grid of square picture tiles: garden, badges, story, recap (week/month), shop, love notes. Each shows an icon plus a count.
- **Activity:** the month calendar stays visible. The 8-week chart, by-exercise bests, body weight and history move under one "More" disclosure, closed by default, keeping today's "Show all" behaviour inside.

## Testing

- **Unit tests** for any new pure helper: Today's first-move loop pick, Library de-duplication, the extras' visibility rules.
- **e2e:** update selectors broken by visible-text changes; prefer accessible names. Add assertions that:
  - the ready-state Today fits 824px;
  - Today shows a Rae loop on a workout day;
  - Library shows no duplicate Rae moves.
- **a11y:** `e2e/a11y.spec.ts` stays green.
- **Audit re-run:** the same script as the evidence table, and the numbers are reported.
- **Device:** a final look on the Note 20 at the Flip 7 size (1080x2520 at density 450), restoring the display afterwards.

## Delivery

Three increments, each committed and viewable on its own: Today, then Library, then Progress.
