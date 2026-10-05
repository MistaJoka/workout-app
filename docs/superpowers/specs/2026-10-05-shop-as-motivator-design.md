# The shop as her motivator: design

**Date:** 2026-10-05
**Status:** design approved in conversation (owner: "yes"), awaiting spec review
**Owner's words:** "i feel the shop will be the motivator for her. so i want to ensure that the entire app is supporting it. the workouts, the flows, the rewards systems. we can also add collectables, additions to Rae's surrounding space. we can also add mega prizes like small road trips (2-3 months of consistent workouts, minimum 3 days/week, whatever that carrots points equivalent that is)"

## Decisions (owner)

- **Collectables and Rae's room come both ways.** The room keeps growing free with her level (`roomUnlocks.ts`, unchanged), and the shop also sells room items and collectables for carrots.
- **A mega prize is just a big price.** It's a normal shop reward with a high carrot cost and no separate jar or rules. She saves by not spending, and "Saving for" tracks it.

## Grounding

The R&D doc is `docs/rnd/hubby-shop/REWARD_SYSTEMS_RND.md`. Its findings:

- Reward showing up, not performance.
- Goal-gradient.
- Novelty over price inflation.
- No guilt, FOMO, countdowns or streak loss.

Economy today (`carrots.ts`, `pricing.ts`):

- A full workout earns ~25 🥕, and `CARROTS_PER_WORKOUT` = 25.
- The weekly goal earns +20, a welcome back +15 and a defeated boss +30.
- **Road trip math:** 3 workouts a week for 2–3 months is 26–39 workouts (650–975 🥕), plus 9–13 weekly-goal bonuses (180–260 🥕). That's **≈ 850–1,250 🥕, so the road trip is priced at 1,000 🥕** (about 2.5 months at 3 a week).

Rules this design keeps:

- Earned carrots stay derived from history.
- Spending stays in the redemption ledger.
- Redeeming stays atomic (`redeemReward` checks `earned − spent` inside its transaction).
- He still creates and prices rewards behind his PIN.

## Slice 1: no new art needed

### 1. Mega tier and the road trip

- **Mega tier:**
  - `pricing.ts` gains a `mega` tier at ≥ 500 (`TIER_LIMITS.mega = 500`), so the shop now groups Little / Bigger / Big / Mega.
  - `TIER_LABELS` gains "Mega prize".
  - The editor's quick prices gain "Mega 1000".
- **Road trip:** `rewardIcons.ts` gains a reserved id, `{ id: 'road-trip', name: 'Road trip', emoji: '🚐', cost: 1000, idea: true, artReady: false }`. It shows its emoji until its own art lands in slice 2. It does not reuse the sunset-drive art, because Sunset drive is a separate, smaller reward.
- **Time estimate in the editor** (`pricing.ts`, pure):
  - `weeksFor(cost, perWeek)` = `ceil(workoutsFor(cost) / perWeek)`, where `perWeek` is her current weekly goal (`weeklyGoal(schedule)`, planned days or 2).
  - Mega-tier costs show "≈ 40 workouts, about 14 weeks at 3 a week".
  - Other tiers keep "≈ N workouts".
- **Road view:**
  - When the pinned "Saving for" reward is mega tier, `SavingGoal` draws its progress as a short pixel road with 5 evenly spaced stops (a flag at each 20%, the car at the current %) instead of the plain bar.
  - Same numbers, same accessible progressbar (`aria-valuenow` etc.), no new rules.
  - Motion settings respected: the car glides only under full motion.
- **Informed spending:**
  - When she is saving for reward X and confirms a redeem of a different reward Y, `RedeemConfirmSheet` adds one neutral line: "{X}: {n} workouts to go after this."
  - It's shown only when Y's cost moves X further away (a positive `n`). The wording is never negative, with no "you'll lose" or red text.

### 2. The shop shows up in every flow

- **Today:**
  - When she is saving for a reward, the ready-state mission card shows one small line under ▶ Start: "+≈25 🥕 toward {reward}". The number is `CARROTS_PER_WORKOUT`, with `aria` text "About 25 carrots toward {reward}".
  - Done/rest states unchanged.
- **Workout player:**
  - A small 🥕 chip in the header shows carrots earned in this session so far: 1 per completed effective set (`effectiveSets`, the same count `carrots.ts` uses).
  - It pulses when it changes (full motion only).
  - The finish bonuses (+10, perfect, goal) appear on Complete as today. The chip never shows a projected total.
- **Complete:**
  - When she is saving for a reward, the existing rewards card adds that goal's bar animating from before → after this workout's carrots: "{reward} 340 → 365 / 1,000". It uses the road view for mega.
  - Under reduced/off motion it shows the end state with both numbers.
- **Schedule:**
  - When she is saving for something, a line under the week: "{n} days a week ≈ +{c} 🥕 a week · {reward} in ~{w} weeks".
  - `c` = n × 25 + 20 (weekly goal bonus).
  - `w` = `ceil(remaining / c)`.
  - Pure helper `weeklyForecast(daysPlanned, remaining)` in `pricing.ts`.
- **Unchanged:** XP, garden, badges, boss, story and love notes. Nothing is removed. These systems already pay carrots (boss), and the story/room stay as they are.

### Testing (slice 1)

- **Unit:**
  - `rewardTier(500) === 'mega'`;
  - `weeksFor(1000, 3) === 14`;
  - `weeklyForecast(3, 1000)` → `{ perWeek: 95, weeks: 11 }`;
  - the informed-spending line only when Y moves X further;
  - the player chip count equals effective sets (undone sets don't count).
- **e2e:**
  - add Road trip from starter ideas → the tier "Mega prize" shows;
  - save for it → the road view's progressbar is visible on the shop and Today, and the Today mission line names it;
  - finish a Quick 10 → Complete shows the goal bar with before→after numbers;
  - redeem a cheaper reward while saving → the confirm sheet shows the "workouts to go" line.
- **a11y:** the axe suite stays green.
- **Device:** Note 20 at the Flip 7 size.

## Slice 2: needs approved art

### 3. Room items and collectables in the shop

- **Catalog:** `src/domain/rewards/roomShop.ts`, a pure list of `{ id, name, cost, slot, emoji, artReady }`. Slot is one of Rae's room positions (`floor-left`, `wall-right`, `shelf`, `window`, ...). The art lives in `public/room/<id>.png` (pixel art, transparent).
- **Ledger, additive only:**
  - `RedemptionRecord` gains `kind?: 'room'`. A room purchase is a redemption with `kind: 'room'` and `rewardId` = the room item id, so it spends carrots through the same atomic `redeemReward`.
  - Room purchases never appear as coupons, are never sent to him, and get no thank-you.
  - Backups and merges carry them (rows are passthrough).
- **Shop:**
  - A "For Rae's room" section: tiles with the item art, name and cost. Buying is one tap plus a confirm.
  - Owned items show "In her room ✓".
  - No PIN, because these are her purchases. Hubby doesn't price them; costs come from the catalog.
- **Room:**
  - `RaeHero` draws owned items in their slots alongside the free level unlocks.
  - A small "Collection" tile on Progress shows owned / total.
- **Art:**
  - A ChatGPT prompt batch (≈ 8 items, Pixel Bloom asset rules, the no-slop check) for the room items, the Road trip icon, and the 6 personal Hubby Bunny rewards (`docs/superpowers/specs/2026-10-05-personal-hubby-rewards.md`).
  - Items ship only after owner approval.
  - The `artReady: false` + emoji fallback pattern keeps everything working meanwhile, and room items without art are simply not offered.
- **Prices:** a proposed table (owner-editable) comes with the art batch, roughly 30–120 🥕 each, so decorating competes gently, not heavily, with saving.

### Testing (slice 2)

- **Unit:**
  - a room purchase spends carrots atomically;
  - it is excluded from coupons;
  - owned items are derived from the ledger;
  - a backup round trip keeps it.
- **e2e:** buy an item → it appears in Rae's room on Today and in the Collection tile.

## Out of scope

- A separate savings jar or consistency-gated prizes (owner chose "just a big price").
- New currencies.
- Countdowns or limited-time items.
- Changing how carrots are earned.
- A shop for him (R&D idea #10).

## Delivery

1. Slice 1: mega tier + flow tie-ins.
2. The art prompt batch (owner generates it, I check for slop, the owner approves).
3. Slice 2: room shop + personal-reward art.
