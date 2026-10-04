# Movement-first, Less-text Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Today, Library and Progress read at a glance: Rae moving, icons and numbers instead of sentences, one obvious next tap.

**Architecture:** This is presentation-only work. New pure helpers go in `src/presentation/` with unit tests. Existing components gain compact variants instead of being rewritten. Shortened visible text keeps its full meaning in `aria-label`/`sr-only`, so a11y and role-based e2e keep working.

**Tech Stack:** React 19, TypeScript, Tailwind, Vitest, Playwright (Chromium, `--workers` ≤ 2).

**Spec:** `docs/superpowers/specs/2026-10-04-movement-first-less-text-design.md`

## Global Constraints

- Visible text is limited to names, numbers, and at most one short Rae line per screen. The full meaning lives in `aria-label`/`sr-only`.
- Nothing is deleted: every entry point stays reachable in at most 2 taps.
- Motion preference: under reduced/off motion, loops become stills (`RaeExerciseLoop animate={false}`), and nothing is lost.
- Never change the `.rae-room` height (296px): her feet float.
- The workout player, Complete, Settings and onboarding are untouched.
- Pink small text uses `text-primary-ink`. Backdrops/tokens are unchanged.
- `npm run check` must pass before every commit. Run e2e only with `--workers=2` max and `E2E_PORT` set.

## Review Focus

1. **A ready-day template whose moves Rae doesn't demonstrate** (e.g. a custom routine of photo-only moves). Expected: Rae stands as before and nothing breaks. Pinned in Task 1 (`firstRaeLoop` returns null) and Task 2 (falls back to `RaeFigure`).
2. **No extras relevant today** (fresh profile, nothing planned and no recap). Expected: no empty gap or empty scroller on Today. Pinned in Task 4 (the `.today-extras:empty` rule plus an e2e check).
3. **Motion off.** Expected: Rae's room shows a still of the move, never a blank figure. Pinned in Task 2's e2e (`?motion` via the settings key) and Task 6.
4. **A Rae loop listed under two exercise ids** (curated + library). Expected: it shows once in "Moves Rae shows you". Pinned in Task 5 (`uniqueByLoop`).
5. **Long workout or custom routine names in tiles.** Expected: they truncate to 2 lines, with no horizontal page scroll at 360px. Pinned in Task 4's e2e at 360px width.

---

### Task 1: Pick Rae's first demonstrated move for a template

**Files:**
- Create: `src/presentation/todayPose.ts`
- Test: `src/presentation/todayPose.test.ts`

**Interfaces:**
- Produces: `firstRaeLoop(exerciseIds: readonly string[]): RaeLoop | null`, the first id in order that has a Rae loop.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { firstRaeLoop } from './todayPose'
import { RAE_LOOPS } from './components/raeLoops'

const withLoop = RAE_LOOPS[0].exerciseIds[0]

describe('firstRaeLoop', () => {
  it('returns the loop of the first move Rae demonstrates, in workout order', () => {
    expect(firstRaeLoop(['no-such-move', withLoop])?.id).toBe(RAE_LOOPS[0].id)
  })
  it('is null when Rae demonstrates none of the moves', () => {
    expect(firstRaeLoop(['no-such-move', 'another'])).toBeNull()
    expect(firstRaeLoop([])).toBeNull()
  })
})
```

- [ ] **Step 2: Run it to verify it fails.** `npx vitest run src/presentation/todayPose.test.ts`. Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

```ts
import { raeLoopForExercise, type RaeLoop } from './components/raeLoops'

// Today's room shows Rae doing the first move of today's workout that she
// demonstrates, so the day's invitation is the movement itself.
export function firstRaeLoop(exerciseIds: readonly string[]): RaeLoop | null {
  for (const id of exerciseIds) {
    const loop = raeLoopForExercise(id)
    if (loop) return loop
  }
  return null
}
```

- [ ] **Step 4: Run it to verify it passes.**

- [ ] **Step 5: Commit** `feat(today): pick Rae's first demonstrated move`.

### Task 2: Rae performs today's first move in her room

**Files:**
- Modify: `src/presentation/components/RaeHero.tsx` (props + the `.rae-room__figure` block, about line 325)
- Modify: `src/presentation/screens/TodayScreen.tsx` (`TodayData`, `loadToday`, the `<RaeHero>` call)
- Modify: `src/index.css` (add `.rae-room__figure--move`)

**Interfaces:**
- Consumes: `firstRaeLoop` (Task 1).
- Produces: a `RaeHero` prop `pose?: { loop: RaeLoop } | null`.

- [ ] **Step 1:** In `RaeHero`, add `pose?: { loop: RaeLoop } | null` to the props. In the figure block, render the loop when `pose` is set:

```tsx
<span className={`rae-room__figure ${pose ? 'rae-room__figure--move' : ''}`}>
  <button type="button" className="rae-figure-btn" aria-label="Say hi to Rae" onClick={sayHi}>
    <span key={hopId} className={hopId > 0 ? 'rae-hop' : ''}>
      {pose ? (
        <RaeExerciseLoop
          id={pose.loop.id}
          name={pose.loop.name}
          width={pose.loop.width}
          height={pose.loop.height}
          stills={[pose.loop.stills[pose.loop.stills.length - 1]]}
          animate={animate}
          imgClassName="rae-room__move"
        />
      ) : (
        <RaeFigure view="front" height={250} />
      )}
    </span>
  </button>
  {hopId > 0 && <PetalPuff key={hopId} />}
</span>
```

`animate` is `effectiveMotion(motion, osPrefersReduced) === 'full'`, computed with the same hooks `MovementMedia` uses: import `useTheme` and `effectiveMotion`, and read `prefers-reduced-motion` through the same `matchMedia` pattern. Check that `RaeLoop` exposes `width`/`height`/`stills`/`name` in `raeLoops.generated.json`. If width/height are missing, pass `width={200} height={200}`.

- [ ] **Step 2:** Add the CSS to `src/index.css` after `.rae-room__figure`. The room height is unchanged, the figure is bottom-aligned, and the loop is capped at the standing figure's box:

```css
.rae-room__figure--move { bottom: 31px; }
.rae-room__move { max-height: 210px; max-width: 220px; width: auto; image-rendering: pixelated; }
```

- [ ] **Step 3:** In `TodayScreen`, add `pose: RaeLoop | null` to `TodayData`. In `loadToday`, set `pose: mission.kind === 'ready' ? firstRaeLoop(primary.exercises.map((e) => e.exerciseId)) : null`. Pass `pose={data?.pose ? { loop: data.pose } : null}` to `RaeHero`.

- [ ] **Step 4:** Run `npx tsc -b && npx vitest run src/presentation`. Expected: PASS.

- [ ] **Step 5:** Add the e2e test to `e2e/today-layout.spec.ts` (new file):

```ts
import { test, expect } from '@playwright/test'

test.use({ viewport: { width: 384, height: 824 } })

test('a workout day: Rae demonstrates the first move in her room', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.rae-room').getByRole('img', { name: /^Rae doing a / })).toBeVisible()
})
```

- [ ] **Step 6:** Run `E2E_PORT=6320 npx playwright test --project=chromium --workers=1 e2e/today-layout.spec.ts`. Then screenshot Today at 384x824 and check that her feet sit on the rug, not floating. Adjust `bottom` only.

- [ ] **Step 7: Commit** `feat(today): Rae performs today's first move in her room`.

### Task 3: Mission card and week card: numbers and Rae, not sentences

**Files:**
- Modify: `src/presentation/components/TodayMission.tsx`
- Modify: `src/presentation/components/WeekBlooms.tsx` (the goal-gradient line `<p>`)
- Modify: `src/presentation/components/TodayMomentum.tsx` (`MomentumStrip` label)
- Modify: `src/presentation/screens/TodayScreen.tsx` (`describe`, ready `detail`)

**Interfaces:**
- Produces: `Mission` ready gains `minutes: number`. `detail` stays as the sr-only sentence.

- [ ] **Step 1: Ready state.** Replace the `detail` paragraph with a visible `⏱ {mission.minutes}` plus an `sr-only` `{mission.detail}`. Keep the move thumbs and make them bigger and labelled:

```tsx
<div className="flex items-start justify-between gap-2">
  <div className="min-w-0">
    <p className="text-2xl font-extrabold leading-tight">{mission.name}</p>
    <p className="hud-num text-sm font-semibold text-ink-muted"><span aria-hidden>⏱ {mission.minutes} min</span><span className="sr-only">{mission.detail}</span></p>
  </div>
  <span className="badge-primary mt-1 flex-none">{mission.tag}</span>
</div>
```

Thumbs: `h-12 w-12` instead of `h-11 w-11`, kept `aria-hidden`. In `loadToday`, set `minutes: estimateMinutes(primary)`.

- [ ] **Step 2: Done state.** The visible text becomes `✓ Done` plus `{mission.detail}` in sr-only. The extra button's text is `+ {mission.extra.name}` with `aria-label={\`Want more? ${mission.extra.name}\`}`.

- [ ] **Step 3: Rest state.** Keep "Rest day" and make "Recovery is part of the plan." sr-only. The extra button's visible text is `{name}` with `aria-label={\`${name} anyway\`}`.

- [ ] **Step 4: WeekBlooms.** Wrap the `goalGradientLine` `<p>` content in `sr-only`. The pots and the bar already show it. Shorten the header `summary` visible text to `{done}/{goal}`, keeping `aria-label` as is.

- [ ] **Step 5: MomentumStrip.** Make the milestone `label` `<p>` `sr-only` and put a 🏁 icon left of the bar: `<span aria-hidden>🏁</span>`.

- [ ] **Step 6:** Run `npx tsc -b && npx vitest run`. Then run the e2e specs that read these texts: `command grep -lE "Done for today|Want more|Rest day|anyway|this week|to your" e2e/*.spec.ts`. Update their visible-text selectors to role/name selectors that use the aria-labels above. Run them with `--workers=2`.

- [ ] **Step 7: Commit** `feat(today): mission and week cards show numbers, not sentences`.

### Task 4: One extras row and one workouts row; Welcome card off Today

**Files:**
- Create: `src/presentation/components/TodayTiles.tsx`
- Modify: `RecapEntry.tsx`, `BossCard.tsx`, `SavingGoal.tsx` (`SavingGoalTodayCard`), `PlanWeekCard.tsx`: add a `tile?: boolean` prop to each
- Modify: `src/presentation/screens/TodayScreen.tsx`
- Modify: `src/index.css`

**Interfaces:**
- Produces: `TodayTile({ to, label, art, value? })`, a square 96px link tile where `label` is the accessible name and is visible as at most 2 words.

- [ ] **Step 1:** Create `TodayTiles.tsx`:

```tsx
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

// One square picture tile for Today's swipe rows: art, at most two words,
// an optional number. `name` is the full accessible name.
export function TodayTile({ to, name, short, art, value }: { to: string; name: string; short: string; art: ReactNode; value?: string }) {
  return (
    <Link to={to} aria-label={name} className="today-tile card flex w-24 flex-none flex-col items-center gap-1 p-2 text-center active:bg-field-primary">
      <span aria-hidden className="flex h-12 items-center justify-center">{art}</span>
      <span aria-hidden className="line-clamp-2 text-xs font-bold leading-tight">{short}</span>
      {value && <span aria-hidden className="hud-num text-xs text-ink-muted">{value}</span>}
    </Link>
  )
}

export function TileRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="list" aria-label={label} className="today-row -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [-webkit-overflow-scrolling:touch]">
      {children}
    </div>
  )
}
```

- [ ] **Step 2: The `tile` prop on each extra.** Each component keeps its loading and condition logic. When `tile` is set it returns `<TodayTile …/>` instead of the full card:
  - RecapEntry week: `name={\`Your week in bloom. ${summary}\`}`, `short="Week"`, art = its `PixelBloom` at size 36, value = `${workouts}🌸`.
  - RecapEntry month: `short={offer.label}`, the rest likewise.
  - BossCard: `name` = its current aria-label, `short={state.boss.name}`, art = `<BossSprite size={40}/>`, value = `defeated ? '✓' : \`${pct}%\``.
  - SavingGoalTodayCard: `name={\`Saving for ${title}\`}`, `short={title}`, art = the emoji at `text-3xl`, value = `${have}/${cost}🥕` (the same numbers `SavingGoalBar` computes; read them from the shared helper it uses).
  - PlanWeekCard: `name="Plan your week"`, `short="Plan"`, art = `🗓` at `text-3xl`, `to="/schedule"`.

- [ ] **Step 3: The new-chapter tile** inline in Today: `name={\`New chapter: ${title}. Open Rae's story\`}`, `short="New chapter"`, art = `RaeFace` at size 40.

- [ ] **Step 4: Today layout.** Replace the five cards with:

```tsx
{data && (
  <TileRow label="Today's extras">
    {data.newChapter && <TodayTile … />}
    <RecapEntry tile />
    <BossCard now={now} tile />
    <SavingGoalTodayCard tile />
    {data.offerPlanWeek && <PlanWeekCard tile />}
  </TileRow>
)}
```

Then the workouts row:

```tsx
{data && data.others.length > 0 && (
  <TileRow label={data.mission.kind === 'ready' ? 'Or pick another' : 'Workouts'}>
    {data.others.map(({ template }) => {
      const still = raeStillFor(firstRaeLoop(template.exercises.map((e) => e.exerciseId))?.exerciseIds[0])
      return (
        <TodayTile
          key={template.id}
          to={`/checkin/${template.id}`}
          name={`${template.name}, ${describe(template)}${DRAFT_TEMPLATE_IDS.has(template.id) ? ', draft' : ''}`}
          short={template.name}
          art={still ? <img src={still.src} alt="" className="h-12 w-12 object-contain pixelated" /> : <span className="text-3xl">🌸</span>}
          value={`⏱${estimateMinutes(template)}`}
        />
      )
    })}
    <TodayTile to="/library" name="All workouts in the Library" short="More" art={<span className="text-3xl">→</span>} />
  </TileRow>
)}
```

Remove `<WelcomeCard … />` and the date `<p>` (keep `longDate(now)` as an `sr-only` prefix inside the `h1`). Remove the now-unused imports.

- [ ] **Step 5: CSS.** Add `.today-row:empty { display: none; }`. Wrapped extras render `null` while loading, so give a row with no rendered children no margin: `.today-row:not(:has(> *)) { display: none; }`.

- [ ] **Step 6: e2e.** In `e2e/today-layout.spec.ts`, add:

```ts
test('the ready Today fits one phone screen', async ({ page }) => {
  await page.goto('/')
  const start = page.getByRole('link', { name: 'Start workout' })
  await expect(start).toBeVisible()
  const box = await start.boundingBox()
  expect(box!.y + box!.height).toBeLessThanOrEqual(824 - 72) // above the tab bar
})

test('no sideways page scroll at 360px, even with long routine names', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 })
  await page.goto('/')
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360)
})
```

Then update specs that used the old cards: `command grep -lE "Your week in bloom|Plan my week|Saving for|This week|New chapter|Welcome|Got it|What should Rae call you" e2e/*.spec.ts`. Prefer `getByRole('link', { name: /…/ })` on the aria-labels above. A spec that tested the Welcome card on Today moves its name check to onboarding/Settings, or is deleted with a note if the behaviour no longer exists.

- [ ] **Step 7:** Run `npm run check`, plus the changed e2e specs with `--workers=2`.

- [ ] **Step 8: Commit** `feat(today): extras and workouts as swipe rows of picture tiles`. **This finishes increment 1 (Today).**

### Task 5: Library: routine tiles, de-duplicated Rae moves, quieter rows

**Files:**
- Create: `src/presentation/libraryRows.ts`
- Test: `src/presentation/libraryRows.test.ts`
- Modify: `src/presentation/screens/LibraryScreen.tsx`
- Modify: the file exporting `exerciseMeta` (find it with `command grep -rn "export function exerciseMeta" src`)

**Interfaces:**
- Produces: `uniqueByLoop(exercises: Exercise[], loopOf: (id: string) => string | undefined): Exercise[]`, keeping the first exercise per loop id; exercises with no loop are kept.

- [ ] **Step 1: Failing test**

```ts
import { describe, expect, it } from 'vitest'
import { uniqueByLoop } from './libraryRows'

const ex = (id: string) => ({ id }) as never
describe('uniqueByLoop', () => {
  it('keeps one exercise per Rae loop, first one wins', () => {
    const loops: Record<string, string> = { 'fs.squat': 'squat', Bodyweight_Squat: 'squat', plank: 'plank' }
    const out = uniqueByLoop([ex('fs.squat'), ex('Bodyweight_Squat'), ex('plank'), ex('photo-only')], (id) => loops[id])
    expect(out.map((e: { id: string }) => e.id)).toEqual(['fs.squat', 'plank', 'photo-only'])
  })
})
```

- [ ] **Step 2:** Run it and see it fail. **Step 3:** Implement:

```ts
import type { Exercise } from '../domain/content/types'

// A Rae loop can cover a curated id and its library twin; the "Moves Rae
// shows you" row shows each move once.
export function uniqueByLoop(exercises: Exercise[], loopOf: (id: string) => string | undefined): Exercise[] {
  const seen = new Set<string>()
  return exercises.filter((e) => {
    const loop = loopOf(e.id)
    if (!loop) return true
    if (seen.has(loop)) return false
    seen.add(loop)
    return true
  })
}
```

Run it and see it pass.

- [ ] **Step 4:** In `LibraryScreen`, apply `setRaeMoves(uniqueByLoop([...found.values()], (id) => raeLoopForExercise(id)?.id))`.

- [ ] **Step 5: Routines.** Replace the routine `<Link>` rows and the "+ New routine" button with a `TileRow label="Routines"` of `TodayTile`s. Art is up to three Rae stills overlapped (`-space-x-3`, `h-10 w-10`) from `template.exercises`. Value is `⏱${estimateMinutes(template)}`. Name is `${template.name}, ${countLabel(…)}`. A final tile is `to="/routines/new" name="New routine" short="New" art={<span className="text-3xl">+</span>}`.

- [ ] **Step 6: Exercise rows.** In `exerciseMeta`, drop the equipment part when `NO_EQUIPMENT_ONLY` is true and the exercise needs no equipment. Update its unit test to assert `['Core']` for a no-equipment core move while the flag is on.

- [ ] **Step 7: e2e.** Add to `e2e/today-layout.spec.ts`:

```ts
test('Library lists each Rae move once', async ({ page }) => {
  await page.goto('/#/library')
  const names = await page.getByRole('region', { name: 'Moves Rae shows you' }).getByRole('link').allInnerTexts()
  expect(new Set(names).size).toBe(names.length)
})
```

To make this work, give the section `aria-label="Moves Rae shows you"` and turn its visible heading into the same short label. Update specs that used "+ New routine" or "N exercises" rows (`command grep -lE "New routine|exercises\\b" e2e/*.spec.ts`).

- [ ] **Step 8:** Run `npm run check` and the changed specs. **Commit** `feat(library): routine tiles, each Rae move once, quieter rows`. **This finishes increment 2.**

### Task 6: Progress: lead with numbers and pictures; details behind More

**Files:**
- Modify: `src/presentation/screens/ProgressScreen.tsx`
- Modify: `src/presentation/components/WeekCompareCard.tsx`
- Modify: the collection tiles (`GardenCard` compact, `BadgesTile`, `StoryTile`, `RecapLink compact`, `RewardsShopTile`, `LoveNotesTile`): visible title down to one word, full title kept in `aria-label`

**Interfaces:**
- Produces: `WeekCompareCard` with a `bare` prop, which renders only the chips row with no heading or fallback (it returns null when there are no highlights).

- [ ] **Step 1:** Remove the `RaeNote` sentence for `rows.length > 0` (the empty-state RaeNote stays: it's the one Rae line).

- [ ] **Step 2:** `<WeekCompareCard compare={snapshot.compare} bare />`. In bare mode, return `compare.highlights.length ? <ul aria-label="This week's highlights" className="flex flex-wrap gap-2">…chips…</ul> : null`, with each chip's visible text prefixed by ▲.

- [ ] **Step 3: Collection tiles.** Visible title: Garden, Badges, Story, Week, Month, Shop, Notes. Counts stay. Remove the "Your collection" heading text (`sr-only`). Keep each tile's existing `aria-label`, or add one using the old full title.

- [ ] **Step 4: More disclosure.** Wrap the "Last 8 weeks" card, "By exercise", `<BodyWeightCard />` and "History" in:

```tsx
<details className="group space-y-2" data-testid="progress-more">
  <summary className="btn-secondary w-full list-none">More</summary>
  …existing sections unchanged…
</details>
```

The month calendar stays outside, visible.

- [ ] **Step 5: e2e.** Specs touching history/body-weight/by-exercise/compare on Progress (`command grep -lE "History|Body weight|Log body weight|By exercise|This week vs last|Last 8 weeks" e2e/*.spec.ts`) first click `getByText('More', { exact: true })`. Add to `e2e/today-layout.spec.ts`: Progress's default view is at most 1.5 screens tall:

```ts
test('Progress leads short, details behind More', async ({ page }) => {
  await page.goto('/#/progress')
  await expect(page.getByTestId('progress-more')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(824 * 1.5 + 200)
})
```

The +200 allows for the empty-history state's calendar. Tighten it in Task 7 once the audit numbers are known.

- [ ] **Step 6:** Run `npm run check` and the changed specs. **Commit** `feat(progress): numbers and pictures first, details behind More`. **This finishes increment 3.**

### Task 7: Verify: audit, full suite, a11y, device

- [ ] **Step 1:** Re-run the text audit (the temporary spec from the design session: Today/Library/Progress words and height at 384x824 after one workout). Record the before/after table in the spec's Evidence section.
- [ ] **Step 2:** Run the full Chromium e2e, `E2E_PORT=6321 npx playwright test --project=chromium --workers=2`, including `e2e/a11y.spec.ts`. Read the whole failure list, not just the tail.
- [ ] **Step 3:** On the Note 20 (`R5CN80AKWXB`): install the APK with `--user 0`, set `wm size 1080x2520` + `wm density 450`, screenshot Today (ready + done), Library and Progress, then restore `wm size 1080x2316` + `wm density 420` and verify both.
- [ ] **Step 4:** Update `CLAUDE.md`'s product constraints with one line: "Visible text: names, numbers, one Rae line per screen; full meaning in aria-label/sr-only (movement-first pass, 2026-10-04)."
- [ ] **Step 5:** Commit, fetch, push, redeploy (`npm run build && systemctl --user restart workout-app.service`).
