# Small delights: Pick a card, Mood dots

Status: draft, awaiting owner review (2026-10-10).
Owner picks (2026-10-10): C (photo booth) waits for stability and extensive QA; D (bunny buddy, dance break) becomes ChatGPT prompt sheets in `content/art-prompts/`.
Owner picks for this slice: the card is flipped on Complete; its effects are bonus carrots, a Rae special moment and garden luck; the mood is tapped on Complete.

## Goal

Two light touches at the end of a workout, neither adding a step she has to take:

1. **Pick a card:** three face-down cards in the Rewards card; she flips one for a small surprise.
2. **Mood dots:** one optional tap (😴 🙂 🔥) that colors that day on her month calendar.

Success: the Complete screen feels a bit more like a game reward, with no new screens, no required taps, and nothing that can be lost, missed or regretted.

## Rules that bind both

- Both are optional. Skipping either costs nothing and nags never.
- No FOMO: the cards she didn't pick are never revealed. No streaks, no "you missed".
- Everything is derived from history, like carrots, XP and the garden. New tables store only what she chose; totals are always computed.
- Draft workouts (warm-up, cool-down, chair day) get neither a card nor a mood row, so a main workout plus a cool-down never deals two hands.
- Motion: full / reduced / off never removes information. The flip animates only in full motion; otherwise the face just appears.
- Visible text: no sentences. The cards and faces carry it, and full meaning goes in `aria-label`.

## 1. Pick a card

**Where:** a new last item inside the Rewards card on Complete (`SessionCompleteScreen.tsx`), after the badges. It shows only for a finished, non-draft session that has no draw yet. Once she has drawn, a revisit shows her face-up card and nothing else.

**Deal:** a pure function `dealFor(sessionId): readonly [CardEffect, CardEffect, CardEffect]` in `src/domain/rewards/cards.ts`, seeded by the session id (the same FNV approach as `garden.ts`), so a reload or a second device shows the same hand. Each card's effect is drawn independently:

| Effect | Weight | What it does |
|---|---|---|
| `carrots` | 50% | +5 (60%), +10 (30%) or +15 (10%) carrots for this session |
| `garden-luck` | 30% | her **next** finished workout's flower rolls with better odds |
| `rae-moment` | 20% | Rae appears big with a rare expression and a sparkle burst |

**Flip:** she taps one of three face-down cards (each a 44px+ button, labelled "Card 1 of 3" etc.). The card flips (full motion) to show its face:
- **Carrots:** 🥕 and "+10". `playCelebration('badge')`. The Complete carrot total and goal gain update.
- **Garden luck:** a four-leaf glyph and the next pot's sprout with a glint. The aria-label explains "Your next flower is more likely to be rare".
- **Rae moment:** RaeFace in a rare expression from the existing set (only expressions already in `RAE_EXPRESSIONS`; no new art), with the sparkle burst used elsewhere.

The other two cards fade out face-down. They are never turned over.

**Data (schema v7, additive):** `cardDraws: 'sessionId, drawnAt'`, row `{ sessionId, pick: 0 | 1 | 2, effect: CardEffect, drawnAt }`. `CardEffect` is `{ kind: 'carrots', amount: 5 | 10 | 15 } | { kind: 'garden-luck' } | { kind: 'rae-moment', expression: RaeExpression }`. The row stores the effect itself (a snapshot), so a later change to the deal weights never rewrites what she got. Writes use `add` (one draw per session; a double tap's second write is a ConstraintError, which is ignored), matching the idempotent-event rule.

**Derivations:**
- **Carrots:** `earnedCarrots` gains one `CarrotSource` per carrots draw (`id: card:<sessionId>`, label "Lucky card"). The balance stays earned minus redemptions.
- **Garden luck:** `speciesFor(sessionId, lucky)` takes an optional `lucky` flag. A lucky roll uses boosted rarity weights: common 0.40, uncommon 0.38, rare 0.18, legendary 0.04. `buildGarden` marks a session lucky when the most recent finished session before it (by `endedAt`) has a `garden-luck` draw. So the luck is consumed by exactly one flower, the very next one grown, even if that's a cool-down's (she sees it right away). It needs no extra write, and a flower already grown never changes.
- **Rae moment:** nothing stored beyond the draw. It's a moment, not a currency.

**Backup:** `cardDraws` is history. Import adds missing rows by `sessionId` and never overwrites, for any profile's backup, the same as sessions and redemptions. It's optional in `bundleSchema.ts` (older backups have none).

## 2. Mood dots

**Where:** on Complete, directly under the hero, before the Rewards card. One row of three round buttons: 😴 / 🙂 / 🔥 (aria-labels "Tired", "Good", "On fire"; `aria-pressed` on the chosen one). It's optional, with no prompt text. Tapping again changes it while she's on Complete. It shows only for finished non-draft sessions.

**Calendar:** `MonthBlooms` (Progress) draws a small colored dot under any day with a mood, using the day's latest mood. Colors are token-driven, with no hardcoded hex: tired uses `--color-info` (or the nearest existing calm token), good uses `--color-primary`, and on fire uses `--color-accent`. The day's aria-label gains ", felt tired/good/on fire". The dot is plain information, so it shows in every motion mode.

**Data (schema v7, additive):** `moods: 'sessionId, at'`, row `{ sessionId, mood: 'tired' | 'good' | 'fired', at }`. It's written with `put` (she can change it), and the newest `at` wins.

**Backup:** moods follow their session. Import puts a row when there's none here or the incoming `at` is newer, for any profile's backup, since they're attached to imported sessions. Optional in the schema.

## Not in this slice

- Using mood to change workouts (that would be adaptation; no rule reads it).
- Card collections, card art beyond glyphs, or more effect kinds (bonus challenge was not picked).
- Editing a mood after leaving Complete.

## Testing

- **Unit:**
  - `dealFor` is deterministic and its frequencies roughly match the weights over 10k ids.
  - Lucky `speciesFor` shifts the rarity distribution, and unlucky is unchanged (the existing species for existing ids is pinned).
  - `buildGarden` applies luck to exactly the next session.
  - Carrot sources include the card bonus.
  - Repositories: draw is add-once; mood newest-wins.
  - Backup merge: draws are add-missing, moods newest-wins, older backups without the tables import.
  - Schema: malformed rows are rejected.
- **E2E (Chromium):**
  - Finish a workout, flip a card: one face shows and the others never do.
  - Reload Complete: the same card is face-up and no hand is dealt.
  - A carrots card raises the shown carrot total.
  - Tap 🔥: Progress month shows the dot and the aria-label.
  - A cool-down finish shows no card and no mood row.
  - Reduced motion shows the face at once.
- Phone check at 390×844 and the Flip cover (361×399), then the APK on the Note 20.
