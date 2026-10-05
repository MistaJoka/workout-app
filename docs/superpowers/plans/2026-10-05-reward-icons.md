# Pixel Reward Icons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Shop rewards and her wishes show the owner's pixel icons (cut-out sticker or rounded tile), chosen with one tap, with the emoji kept as a fallback everywhere.

**Architecture:** A build-time script turns the 34 unique downloads into `public/rewards/<id>.webp` + `<id>-tile.webp`. A pure catalog (`domain/rewards/rewardIcons.ts`) holds the names, emoji and prices. Records and every payload gain an optional `icon`, which is additive and tolerant both ways. A single `RewardGlyph` component draws the icon or the emoji wherever a reward or wish is shown, and the editors become an icon grid.

**Tech Stack:** Python (Pillow, rembg venv for the asset script), React 19 + TS, zod, Dexie, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-04-reward-icons-design.md`

## Global Constraints

- **Additive data only:**
  - `icon?: string` on `RewardRecord` and `Wish`, with no Dexie version bump (unindexed field);
  - gift/wish/thanks payloads and backup rows accept but never require `icon`.
- **Text stays emoji:** text messages (`couponShareMessage`, `wishShareMessage`, `thanksShareMessage`, gift share text) stay emoji-only.
- **Fallback:** an unknown or missing icon id renders the record's own `emoji`.
- **Existing records are never rewritten**: they keep their emoji until edited.
- **Love notes are out of scope** (keep emoji).
- **Pixel art is resized with nearest-neighbour** and rendered with the `pixelated` class.
- **Catalog values come from the spec table, verbatim** (ids, names, emoji, costs, idea flags).
- **Before every commit:** `npm run check`. e2e uses `--workers` ≤ 2 with `E2E_PORT` set.

## Review Focus

1. **A gift link from an older app** (no `icon` key) is accepted, and the reward shows its emoji. Pinned in Task 2.
2. **A gift link from a newer app with an icon id this app doesn't know** shows the emoji, not a broken image. Pinned in Task 3 (`RewardGlyph` unknown id).
3. **Editing an existing emoji-only reward** keeps the emoji until an icon is tapped. Tapping an icon must not overwrite a title or cost she already changed. Pinned in Task 4.
4. **Offline:** icons render with the network off after one visit (precache). Pinned in Task 3 (sw list) and Task 6 (offline e2e line).
5. **A backup with icons imported into a profile, and an old backup without icons**, both import. Pinned in Task 2.

---

### Task 1: Icon assets and catalog

**Files:**
- Create: `scripts/assets/reward-icons.py`, `src/domain/rewards/rewardIcons.ts`, `src/domain/rewards/rewardIcons.test.ts`
- Create (generated): `public/rewards/*.webp`

**Interfaces:**
- Produces: `RewardIcon = { id; name; emoji; cost; idea }`, `REWARD_ICONS: readonly RewardIcon[]`, `rewardIconById(id?: string): RewardIcon | undefined`, `rewardIconUrl(id: string, variant: 'sticker' | 'tile'): string` (uses `asset()`).

- [ ] **Step 1: Failing test.** `rewardIcons.test.ts`:
  - there are 34 unique ids;
  - every cost is > 0;
  - exactly the spec's ideas carry `idea: true` (20);
  - `rewardIconById('foot-rub')?.emoji === '💆'`;
  - an unknown id gives `undefined`;
  - for every id, `public/rewards/<id>.webp` and `<id>-tile.webp` exist (`node:fs` `existsSync`).
- [ ] **Step 2:** Run `npx vitest run src/domain/rewards/rewardIcons.test.ts`. Expected: FAIL (module missing).
- [ ] **Step 3: Catalog.** `rewardIcons.ts` holds the 34 entries from the spec table, in table order.
- [ ] **Step 4: Asset script.** `reward-icons.py`:
  - **Input:** the first 45 `ChatGPT Image Oct 4, 2026*` files in `~/Downloads` by mtime (or a passed folder).
  - **Mapping:** download index → icon id, a fixed dict in the script. Index 0 is nap-time, 1 tacos, 2 burger, 3 ramen, 4 donut, 5 dinner-date, 6 flowers, 7 love-letter, 8 reading-time, 10 no-dishes, 11 coffee-date, 12 movie-night, 13 takeout, 14 pizza, 15 sundae, 16 sushi, 17 breakfast-in-bed, 18 boba, 19 game-night, 20 spa-day, 21 burrito-bowl, 22 burrito, 23 nachos, 24 quesadilla, 25 laundry-done, 26 no-chores, 27 foot-rub, 28 sleep-in, 29 tv-remote, 30 sunset-drive, 31 picnic, 32 blanket-fort, 33 bubble-bath, 34 surprise-gift. Indices 9 and 35–44 are duplicates.
  - **Check duplicates:** assert the duplicates are pixel-identical to their twin (0↔9, 25–34 ↔ 35–44) and skip them.
  - **Keep originals:** copy them to `assets/pixel-bloom/rewards/source/<id>.png` (add that directory to `.gitignore`).
  - **Tile:** the original, cropped to the content box plus 6% margin, made square, nearest-neighbour resized to 256, corners rounded at 18% radius → `public/rewards/<id>-tile.webp` (lossless).
  - **Sticker:** rembg `isnet-anime` cut-out, alpha hardened at 128, cropped to its bbox, padded square, nearest-neighbour resized to 256 → `public/rewards/<id>.webp` (lossless).
  - Run it with `~/.venvs`/scratch rembg venv python.
- [ ] **Step 5:** Run the test. Expected: PASS.
- [ ] **Step 6:** Build a contact sheet of all 34 sticker and tile versions to the scratchpad and inspect it: no halo, no clipped parts.
- [ ] **Step 7: Commit** `feat(rewards): 34 pixel reward icons and their catalog`.

### Task 2: Data accepts an optional icon (records, repositories, links, backups)

**Files:**
- Modify:
  - `src/infrastructure/db/schema.ts` (RewardRecord)
  - `src/domain/rewards/wishes.ts` (Wish)
  - `src/infrastructure/db/repositories/rewardsRepository.ts` (addReward, updateReward, upsertRewardFromGift)
  - `src/infrastructure/db/repositories/wishesRepository.ts` (addWish)
  - `src/domain/rewards/giftLink.ts` (giftRewardSchema, wish item schema, thanksPayloadSchema)
  - `src/infrastructure/exportImport/bundleSchema.ts` (reward; wish rows if present)
- Test: the existing `giftLink.test.ts`, `rewardsRepository.test.ts`, `wishesRepository.test.ts`, `bundleSchema`/`exportImport.rewards.test.ts`

**Interfaces:**
- Produces: `icon?: string` on `RewardRecord`, `Wish`, the gift reward, the wish item and the thanks payload. Repository inputs accept `icon?: string`, and `updateReward`'s patch accepts `icon`.

- [ ] **Step 1: Failing tests.**
  - giftLink: encode→decode keeps `icon: 'foot-rub'` on a gift reward, a wish item and a thanks payload. A gift payload built without `icon` (old app) still decodes OK, with no icon.
  - rewardsRepository: `addReward({title, cost, emoji, icon:'pizza'})` stores the icon. `upsertRewardFromGift` with an icon stores it. `updateReward(id, {icon:'sushi'})` stores it.
  - wishesRepository: `addWish({title, emoji, icon})` stores it.
  - Backup: a reward row with `icon` round-trips through export→import, and one without still imports.
- [ ] **Step 2:** Run them. Expected: FAIL (icon stripped/absent).
- [ ] **Step 3: Implement.**
  - Add `icon: z.string().min(1).optional()` to the three gift schemas and to the bundle reward/wish rows.
  - Add `icon?: string` to the types.
  - Copy `icon` through in the repositories, only when present (`...(input.icon ? { icon: input.icon } : {})`).
- [ ] **Step 4:** Run `npx vitest run src/domain/rewards src/infrastructure`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(rewards): rewards, wishes, links and backups carry an optional icon`.

### Task 3: RewardGlyph everywhere a reward or wish is drawn, plus offline precache

**Files:**
- Create: `src/presentation/components/RewardGlyph.tsx`, `src/presentation/components/RewardGlyph.test.ts` (pure helper test)
- Modify: every render site from `command grep -rn "\.emoji" src/presentation --include=*.tsx | command grep -v -i "lovenote\|LoveNotes"`, which is at least:
  - `RewardsScreen.tsx`, `RewardsSheets.tsx`, `RewardEditorSheet.tsx` (list rows only here)
  - `SavingGoal.tsx`
  - `GiftComposerSheet.tsx`, `GiftPreviewScreen.tsx`
  - `ThanksSheet.tsx`, `WishSheets.tsx`
- Modify: `public/sw.js`, adding `public/rewards/*` to the best-effort precache list. It should come from the build manifest the same way other media do. If no such list exists, add a `REWARD_ICON_URLS` array generated from the folder by the `sw-build-manifest` plugin in `vite.config.ts`.

**Interfaces:**
- Produces: `glyphSource(icon?: string, variant: 'sticker' | 'tile'): string | null` (pure: the URL, or null for unknown/missing), and `<RewardGlyph emoji icon size variant='sticker' />`. It renders `<img src alt="" aria-hidden className="pixelated" width={size} height={size}>` when the source is known, else `<span aria-hidden style={{fontSize: size*0.8}}>{emoji}</span>`.

- [ ] **Step 1: Failing test.** `glyphSource('pizza','sticker')` ends with `rewards/pizza.webp`. `glyphSource('pizza','tile')` ends with `rewards/pizza-tile.webp`. `glyphSource('not-a-real-icon','sticker')` and `glyphSource(undefined,'sticker')` are `null`.
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3: Implement `RewardGlyph`.** Replace each render of a reward or wish emoji (an `{x.emoji}` inside JSX) with `<RewardGlyph emoji={x.emoji} icon={x.icon} size={…matching the old emoji's visual size…} />`. Leave string/template uses (share text) untouched. Love notes stay untouched.
- [ ] **Step 4: Precache.** Add the reward icons to the SW's best-effort list, and assert in the existing `swPrecacheLists.test.ts` style that `rewards/pizza.webp` is in it.
- [ ] **Step 5:** Run `npx tsc -b && npx vitest run`. Expected: PASS. Run `e2e/rewards.spec.ts`, `e2e/shop-economy.spec.ts`, `e2e/shop-extras.spec.ts`, `e2e/wishlist.spec.ts` and `e2e/gift-link.spec.ts` with `--workers=2`, fixing selectors that read emoji text.
- [ ] **Step 6: Commit** `feat(rewards): one RewardGlyph draws the icon or the emoji everywhere`.

### Task 4: The editors become an icon grid, with starter ideas from the catalog

**Files:**
- Modify: `src/presentation/components/RewardEditorSheet.tsx` (the starter list at lines ~19–23, the emoji picker), `src/presentation/components/WishSheets.tsx` (the wish emoji picker)
- Create: `src/presentation/rewardDraft.ts` + test (pure)

**Interfaces:**
- Produces: `pickIcon(draft: RewardDraft & { icon?: string; touched: { title: boolean; cost: boolean } }, icon: RewardIcon)` returns the next draft:
  - it sets `icon` and `emoji = icon.emoji`;
  - it sets `title = icon.name` only if `!touched.title`, and `cost = icon.cost` only if `!touched.cost`.
  - `STARTER_IDEAS = REWARD_ICONS.filter(i => i.idea)`.

- [ ] **Step 1: Failing test** (`rewardDraft.test.ts`):
  - picking 'pizza' on an empty draft fills the title "Pizza night", cost 40, emoji 🍕, icon 'pizza';
  - with `touched.title` the title is kept;
  - with `touched.cost` the cost is kept;
  - `STARTER_IDEAS.length === 20` and it contains the five old ideas by name with their old prices (No-dishes pass 20, Movie night pick 25, Foot rub 30, Breakfast in bed 60, Dinner date 150).
- [ ] **Step 2:** Run it. Expected: FAIL. **Step 3:** Implement `rewardDraft.ts`. **Step 4:** Run it. Expected: PASS.
- [ ] **Step 5: Reward editor UI.**
  - Replace the emoji picker with a 5-column grid of `RewardGlyph variant='sticker' size={44}` buttons (`aria-label={icon.name}`, `aria-pressed`), one tap = `pickIcon`.
  - Keep the old emoji row under a small "Other" label. Picking an emoji clears `icon`.
  - The starter ideas list renders `STARTER_IDEAS`, each one tap = add a reward with icon, name, cost and emoji.
  - The title/cost inputs set `touched`.
- [ ] **Step 6: Wish sheet.** The same icon grid sets the wish's `icon` + `emoji` (and the title only if empty).
- [ ] **Step 7: e2e** (`e2e/reward-icons.spec.ts`):
  - open the shop editor (PIN flow as in `shop-economy.spec.ts`);
  - tap "Pizza night" in the grid;
  - save, then see `img[src*="rewards/pizza"]` in the shop row;
  - save for it and check Today's saving tile shows the pizza icon;
  - redeem (enough carrots via the spec's existing helper) and check the coupon shows the icon.
- [ ] **Step 8:** Run `npm run check` + the new and shop e2e. **Commit** `feat(rewards): pick a reward or wish by tapping its icon; 20 starter ideas`.

### Task 5: Coupon and share cards draw the tile icon

**Files:**
- Modify: `src/presentation/rewardsCard.ts` (canvas card drawing), `src/presentation/rewardsCard.test.ts`

**Interfaces:**
- Consumes: `glyphSource(icon, 'tile')`.

- [ ] **Step 1: Failing test.** The card layout helper (pure part of `rewardsCard.ts`) returns `{ kind: 'image', src: …pizza-tile.webp }` for a reward with icon 'pizza', and `{ kind: 'emoji', text }` without one.
- [ ] **Step 2:** Run it. Expected: FAIL. **Step 3:** Implement. Where the canvas draws the emoji glyph, await-load the image (`new Image()`, `decode()`) and `drawImage` with `imageSmoothingEnabled = false`. If loading fails, draw the emoji instead.
- [ ] **Step 4:** Run it. Expected: PASS. Run `e2e/share-more.spec.ts` + `e2e/shop-extras.spec.ts`.
- [ ] **Step 5: Commit** `feat(rewards): coupon and share cards show the reward's pixel icon`.

### Task 6: Verify

- [ ] Run the full Chromium e2e `--workers=2`, including offline: add one assertion to `e2e/data-offline.spec.ts` that after the offline reload `/#/rewards` shows a seeded icon reward's `img` loaded (`naturalWidth > 0`).
- [ ] Note 20 at the Flip 7 size (`wm size 1080x2520`, `wm density 450`): open the shop, the editor grid and Today's saving tile; screenshot; restore `wm size 1080x2316` + `wm density 420`.
- [ ] Add one line to CLAUDE.md's gotchas about the RewardGlyph/icon fallback rule.
- [ ] Do the final whole-branch review (fresh reviewer), fix Critical/Important, merge, push, redeploy.
