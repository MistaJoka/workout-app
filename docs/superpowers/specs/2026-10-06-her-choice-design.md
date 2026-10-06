# Her choice: hearts, Her mix, Surprise me, length dial

Status: draft, awaiting owner review (2026-10-06).
Owner picks (2026-10-06): slice A first; shortening cuts sets, not moves.

## Goal

Give her more say over today's workout, with one tap each, no new text-heavy screens:

1. **Heart** moves she likes.
2. **Her mix**: a routine made from her hearted moves, kept up to date automatically.
3. **Surprise me**: a slot-machine reveal picks today's routine for her.
4. **Length dial**: Short / Usual / Long on the Start screen.

Success: from Today she can get to a workout that fits her mood and her time in at most three taps, and nothing else in the app changes meaning.

## 1. Hearts

- A heart toggle (44px) sits in the Exercise Detail header. One tap hearts the move, a second tap un-hearts it. Full motion adds a small pop and a petal; reduced/off motion swaps the icon only.
- The Library filter row gets a "♥" chip that shows only hearted moves.
- Hearted moves get a small heart on their Library tile.
- Hearts apply per profile, like all other data.

**Data.** A new Dexie table (schema v6, additive): `favorites: 'exerciseId, updatedAt'`. The row shape is `{ exerciseId, hearted: boolean, updatedAt }`. Un-hearting keeps the row with `hearted: false`, as a tombstone, so a backup import can't bring a removed heart back. Export includes the table. Import merges newest-wins by `updatedAt`, like routines, and is zod-validated in `bundleSchema.ts`. Importing another profile's backup skips favorites, like other current state.

## 2. Her mix

- Her mix exists once she has at least 3 hearted moves that are shown now (`isShownNow`). With fewer than 3 it doesn't appear anywhere: no empty state, no nudge.
- It's built on the fly, never stored, by a pure function in `src/domain/content/herMix.ts`: `buildHerMix(hearts, lookup) → WorkoutTemplate | null`.
  - Moves come in the order she hearted them, oldest first, capped at the 8 most recent.
  - Each move uses the same default prescription as the Routine Builder (`defaultPrescription`), so there's no new prescription logic.
  - `id: 'her-mix'`, name "Her mix", `version` = a short hash of the move ids, so each plan records exactly which mix it ran.
- It shows as a routine tile on Today's routine row and in Library's routine tiles, with a heart badge. Starting it goes through the normal Start screen and creates a normal immutable SessionPlan.
- It stays out of `ROTATION`: it never becomes "today's planned workout" by itself. She can put it on her Schedule like any routine.

## 3. Surprise me

- A "Surprise me" tile (🎲 plus Rae) in Today's routine row.
- Tapping it opens a full-screen reveal. A reel of routine cards spins for about 1.2s, slows, and lands on one card; Rae cheers; a short rising note plays. Then it moves on to that routine's Start screen. Tapping during the spin skips to the result. Reduced/off motion shows the result straight away (motion never hides information).
- **Pool:** the curated rotation routines, plus her own routines, plus Her mix (if it exists). It leaves out draft workouts (warm-up, cool-down, chair day) and the routine from her most recent finished session, so it never repeats yesterday. If only one routine is left, it picks that one.
- Selection is plain random (a UI choice, not adaptation). It lives as a pure `pickSurprise(pool, lastTemplateId, random)` with an injectable `random`, for tests.
- Nothing is stored. Backing out of Start just returns to Today.

## 4. Length dial

- A three-segment control on the Start screen, above the move list: **Short · Usual · Long**. Each segment shows its own estimate ("about 8 min"), from `estimateMinutes` run on the scaled template. The default is always **Usual**: a short workout is never applied silently.
- Scaling is a pure function in `src/domain/session/lengthDial.ts`: `scaleTemplate(template, choice)`.
  - **Short:** every move drops to 1 set. Moves, reps, holds and rest are unchanged.
  - **Usual:** unchanged.
  - **Long:** every move gets +1 set, up to a maximum of 4. Nothing else changes.
- The move list, totals and minutes on the Start screen update as she taps.
- **Plan snapshot:** the scaled sets are baked into the immutable SessionPlan, which also records `length: 'short' | 'usual' | 'long'` (an optional field; older plans read as usual) and an adaptation entry with reason code `LENGTH_SHORT` / `LENGTH_LONG`, so the decision can be inspected.

**Interactions (decided here, owner may override):**
- **Progression.** A Short session is no evidence either way, like a workout ended early: it never creates a "try harder" offer and never counts toward a failure streak. Usual and Long are evaluated as today (Long can only make "met" harder).
- **Rewards.** Garden flower, weekly goal, XP, carrots and boss damage work exactly as now, from the sets actually done. A short workout still counts as a workout this week.
- **Bests.** Unaffected: bests are per set.

## Not in this slice

- Picking which moves to cut, or reordering Her mix (the Routine Builder already covers custom routines).
- Hearting from the player mid-workout (it would add a control to the glanceable screen).
- Any minutes target beyond the three segments.

## Testing

- **Unit:** `buildHerMix` (threshold, cap, order, hidden moves, version hash), `pickSurprise` (excludes drafts and the last routine, single-item pool, injected random), `scaleTemplate` (1 set, +1 capped at 4, rest/reps untouched), progression skipping Short plans, favorites merge (tombstone wins when newer, and other-profile import skips favorites), bundle schema.
- **E2E (Chromium, then WebKit in CI):** heart 3 moves → Her mix tile appears → start it → plan has those moves; Surprise me lands on a Start screen that isn't the last routine; Short → player shows "Set 1 of 1" and Complete offers no next level; reduced motion shows the surprise result instantly.
- Phone check at 390×844 and the Flip cover screen (361×399), then rebuild the APK and install it on the Note 20.
