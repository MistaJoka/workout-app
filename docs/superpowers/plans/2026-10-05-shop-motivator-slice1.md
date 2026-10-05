# Shop as Motivator, Slice 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A mega tier with a 1,000 🥕 road trip, and the shop visibly fed by every flow (Today, player, Complete, Schedule, redeem).

**Architecture:**
- **Pure math** goes in `domain/rewards/pricing.ts`, unit-tested: tiers, weeks, forecast, workouts-to-go.
- **Session carrot count:** a pure `liveSetCarrots(plan, events)` beside the carrot rules.
- **UI:** small additions to existing components (`SavingGoal`, `RedeemConfirmSheet`, `TodayMission`, the player header, the Complete rewards card, Schedule), each reading the pinned "Saving for" reward.

**Tech Stack:** React 19, TS, Vitest, Playwright (`--workers` ≤ 2, `E2E_PORT` set).

**Spec:** `docs/superpowers/specs/2026-10-05-shop-as-motivator-design.md`

## Global Constraints

- **Mega tier:** `TIER_LIMITS.mega = 500`; tier label "Mega prize".
- **Road trip:** `{ id: 'road-trip', name: 'Road trip', emoji: '🚐', cost: 1000, idea: true, artReady: false }`.
- **Live carrots:** `CARROTS_PER_WORKOUT` = 25. The weekly forecast is `c = days × 25 + 20`, and `weeks = ceil(remaining / c)`.
- **Saving reward:** the "Saving for" reward is `savingGoalReward(rewards, getSetting(SAVING_FOR_KEY))`. When none is pinned, every new line is hidden.
- **Wording:** no guilt. No red text, no negative wording, no countdowns.
- **Motion:** animations only under full motion, and reduced/off motion shows the end state with all numbers.
- **Carrot rules:** earning is unchanged. The player chip counts effective completed sets only (1 🥕 each), and never shows projections.
- **Accessibility:** every visual number has an accessible name, and progressbars keep `aria-valuenow`/`max`.
- **Before committing:** `npm run check` before every commit. After the final push: rebuild the APK and install it on the Note 20 (standing owner rule).

## Review Focus

1. **Nothing pinned:** every new line and visual is absent, with no "undefined" or empty gaps. Pinned in Tasks 3–6 tests (a no-goal case each).
2. **A goal already reached** (balance ≥ cost): the road shows the car at the end, workouts-to-go isn't negative, and the forecast says "ready" instead of "~0 weeks". Pinned in Task 1 (pure helpers clamp) and Task 3.
3. **An undone set in the player** doesn't count in the chip. Pinned in Task 5 (uses `withoutIneffectiveSets`).
4. **Redeeming the pinned reward itself:** no "to go" line, since it isn't moving further away. Pinned in Task 4.
5. **Schedule with zero planned days:** the forecast uses the default goal (2) or is hidden, never divides by zero. Pinned in Task 1.

---

### Task 1: Pricing math (pure)

**Files:** Modify `src/domain/rewards/pricing.ts`. Test in `src/domain/rewards/pricing.test.ts` (extend it).

**Interfaces:**
- **Produces:**
  - `RewardTier` gains `'mega'`; `rewardTier(cost)` returns `'mega'` at ≥ 500.
  - `weeksFor(cost: number, perWeek: number): number`, which is `ceil(workoutsFor(cost) / max(1, perWeek))`.
  - `weeklyForecast(days: number, remaining: number): { perWeek: number; weeks: number; ready: boolean }`, where `days ≤ 0` means 2.
  - `workoutsToGoAfter(goal: { cost: number }, balance: number, spend: number): number | null`. It returns the workouts still needed for the goal after spending `spend`. It returns null when the spend doesn't move the goal further (the goal is already out of reach either way and unchanged, or `spend` is 0).

- [ ] **Step 1: Failing tests.**
  - `rewardTier(499) === 'big'` and `rewardTier(500) === 'mega'`.
  - `weeksFor(1000, 3) === 14` (40 workouts / 3).
  - `weeklyForecast(3, 1000)` → `{ perWeek: 95, weeks: 11, ready: false }`.
  - `weeklyForecast(0, 100)` uses 2 days → `perWeek: 70, weeks: 2`.
  - `weeklyForecast(3, 0)` → `ready: true, weeks: 0`.
  - `workoutsToGoAfter({cost:1000}, 400, 60)` → `ceil((1000-340)/25) = 27`.
  - `workoutsToGoAfter({cost:100}, 300, 60)` → 0 (still reachable).
  - `workoutsToGoAfter({cost:1000}, 400, 0)` → null.
- [ ] **Step 2:** Run `npx vitest run src/domain/rewards/pricing.test.ts`. Expected: FAIL. **Step 3:** Implement. **Step 4:** Run it. Expected: PASS.
- [ ] **Step 5: Editor tier support.**
  - `RewardsScreen` `TIER_LABELS` adds `mega: 'Mega prize'`.
  - The editor's `PRICE_PRESETS` adds `{ label: 'Mega', cost: 1000 }`.
  - The editor's estimate line shows `≈ {workoutsFor} workouts, about {weeksFor} weeks at {goal} a week` when the tier is mega. `goal` = `weeklyGoal(schedule)`, passed in as a new `weeklyGoal` prop from `RewardsScreen`, which loads the schedule.
- [ ] **Step 6: Commit** `feat(shop): mega tier, weeks and weekly forecast math`.

### Task 2: Road trip in the catalog

**Files:** `src/domain/rewards/rewardIcons.ts` and its test, `src/presentation/rewardDraft.test.ts`.

- [ ] **Step 1: Failing test.**
  - `rewardIconById('road-trip')` → cost 1000, `artReady: false`, `idea: true`.
  - The catalog has 41 entries and the ideas are 26. Update the existing count assertions with a comment.
- [ ] **Step 2:** Run it. Expected: FAIL. **Step 3:** Add the entry, placed after `surprise-gift`. **Step 4:** Run `npx vitest run src/domain/rewards src/presentation/rewardDraft.test.ts src/presentation/pwa`. Expected: PASS. The precache list is unchanged, since the art isn't ready.
- [ ] **Step 5: Commit** `feat(shop): Road trip, a 1,000-carrot mega prize`.

### Task 3: Road view for a mega goal

**Files:** `src/presentation/components/SavingGoal.tsx` (`SavingGoalBar`), new `src/presentation/components/RoadProgress.tsx`. e2e: `e2e/shop-motivator.spec.ts` (new).

**Interfaces:**
- **Produces:** `RoadProgress({ have, cost, label })`.
  - It renders a `role="progressbar"` with `aria-label={label}` and `aria-valuemin/max/now`.
  - Visually: an inline SVG road with 5 flags at 20% steps (filled once passed) and a 🚐 at the current %.
  - The car's `left` animates under full motion only.

- [ ] **Step 1: Failing e2e** (`shop-motivator.spec.ts`, test "a mega goal shows as a road"):
  - set the PIN;
  - add Road trip from starter ideas;
  - close the editor and "Save for this";
  - expect `getByRole('progressbar', { name: /^Saving for Road trip: 0 of 1000 carrots/ })` visible, plus `[data-testid="road-progress"]` on the shop card and on Today's saving tile;
  - also pin a 25-carrot reward and expect no `road-progress` (plain bar).
- [ ] **Step 2:** Run it. Expected: FAIL (no road). **Step 3:** Implement. `SavingGoalBar` uses `RoadProgress` when `rewardTier(reward.cost) === 'mega'`, else the existing bar. **Step 4:** Run it. Expected: PASS.
- [ ] **Step 5: Commit** `feat(shop): a mega goal's progress is a little road`.

### Task 4: Informed spending line

**Files:** `src/presentation/components/RewardsSheets.tsx` (`RedeemConfirmSheet` gains an optional `goalNote?: string`), `RewardsScreen.tsx` (computes it).

- [ ] **Step 1: Failing e2e** (in `shop-motivator.spec.ts`: "redeeming a smaller treat says how far the goal is"):
  - finish 2 Quick 10s for carrots (`finishWorkout`);
  - add Road trip and Nap time (20), save for Road trip;
  - tap Redeem on Nap time;
  - expect the text `/^Road trip: \d+ workouts to go after this\.$/` in the dialog;
  - cancel; pin Nap time instead; tap Redeem on Nap time;
  - expect no "to go" text.
- [ ] **Step 2:** Run it. Expected: FAIL. **Step 3:** Implement. `goalNote` = `${goal.title}: ${n} workouts to go after this.` when the goal ≠ the reward being redeemed and `workoutsToGoAfter(goal, balance, reward.cost)` is a positive number. Rendered as `text-sm text-ink-muted`. **Step 4:** Run it. Expected: PASS.
- [ ] **Step 5: Commit** `feat(shop): redeem confirm notes the saving goal, neutrally`.

### Task 5: Live carrots in the player, goal bar on Complete

**Files:**
- `src/domain/rewards/carrots.ts` (+ test): add `liveSetCarrots(plan, events)` = `CARROT_RULES.perSet × count(withoutIneffectiveSets(plan, events) of type SET_COMPLETED)`. Before implementing, check how `earnedCarrots` counts sets and match it exactly.
- `src/presentation/screens/WorkoutPlayerScreen.tsx`: a header chip.
- `src/presentation/screens/SessionCompleteScreen.tsx`: the goal bar.
- New `src/presentation/components/GoalGain.tsx`.

- [ ] **Step 1: Failing unit test.** 3 completed sets → 3. 3 completed + 1 undone (the `SET_UNDONE` that took back the last) → 2. It must equal the per-set part of `carrotsForSession` for a finished session.
- [ ] **Step 2:** Run it. Expected: FAIL. **Step 3:** Implement. **Step 4:** Run it. Expected: PASS.
- [ ] **Step 5: Player chip.** In the header, next to the progress, `<span aria-label={`${n} carrots earned so far`} className="chip">🥕 {n}</span>`. It's shown only once n > 0, and pulses on change under full motion.
- [ ] **Step 6: Complete.** When a saving goal is pinned, the rewards card shows `GoalGain({ title, before, after, cost })`:
  - "{title} {before} → {after} / {cost}";
  - `before` = balance − this session's carrots, `after` = balance;
  - a bar (or `RoadProgress` for mega) animating before→after under full motion, at the end state otherwise.
  - Test: no goal → nothing rendered.
- [ ] **Step 7: e2e** (in `shop-motivator.spec.ts`: "a workout visibly feeds the goal"):
  - pin Road trip, start Quick 10;
  - after the first set + Yes, the header chip shows "🥕 1";
  - finish → Complete shows `/Road trip \d+ → \d+ \/ 1000/`.
- [ ] **Step 8:** Run `npm run check` + the spec. **Commit** `feat(shop): carrots tick up in the player and flow into the goal on Complete`.

### Task 6: Today and Schedule point at the goal

**Files:** `src/presentation/components/TodayMission.tsx` (ready state gains `goal?: { title: string }`), `TodayScreen.tsx` (loads the pinned goal), `ScheduleScreen.tsx` (forecast line).

- [ ] **Step 1: Failing e2e** (in `shop-motivator.spec.ts`: "Today and Schedule point at the goal"):
  - pin Road trip;
  - Today's mission card shows `+≈25 🥕 toward Road trip`;
  - plan 3 days on Schedule → the text `/3 days a week ≈ \+95 🥕 a week · Road trip in ~\d+ weeks/`;
  - unpin → both lines are gone.
- [ ] **Step 2:** Run it. Expected: FAIL. **Step 3:** Implement. The ready-state line goes under ▶ Start, `text-sm text-primary-ink`, with an accessible version. Schedule uses `weeklyForecast(plannedDays, remaining)`, showing "{title} is ready to redeem" when `ready`. **Step 4:** Run it. Expected: PASS.
- [ ] **Step 5: Commit** `feat(shop): Today and Schedule show what a workout or a week is worth toward the goal`.

### Task 7: Verify, review, ship

- [ ] Full Chromium e2e `--workers=2`. Don't touch `test-results/` while it runs.
- [ ] Fresh final reviewer on the whole branch. Fix Critical/Important findings test-first.
- [ ] Note 20 at the Flip 7 size: the shop with a mega goal, Today, the player chip, Complete. Restore `wm size 1080x2316` + `wm density 420`.
- [ ] Merge, fetch, push, redeploy. Then `npm run apk` → install on the Note 20 (`--user 0 -r`).
