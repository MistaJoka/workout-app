# Pixel reward icons for Hubby's shop and her wish list: design

**Date:** 2026-10-04
**Status:** design approved in conversation (owner: "yes"), awaiting spec review
**Source:** 45 ChatGPT pixel-art images the owner downloaded on 2026-10-04 (4:28–5:12 PM). 11 were downloaded twice and are pixel-identical, so 34 icons are unique.

## Goal

Rewards in the shop and wishes on her list show a cute pixel icon instead of a plain emoji, and adding a reward is one tap on a picture.

## Decisions (owner)

- **Scope:** shop rewards, plus her wish list (a wish becomes a reward). Love notes keep their emoji.
- **Look:** two versions of every icon:
  - a cut-out **sticker** for colored tiles and lists;
  - the original rounded **tile** where an icon stands alone (coupon and share cards, gift preview).
- **Existing rewards and wishes** keep their emoji until someone edits them.

## 1. Assets

- **Script:** `scripts/assets/reward-icons.py` (build time only; uses the same rembg venv as `rae-cards.py`):
  - takes the 34 originals, finding exact duplicates by pixel hash;
  - keeps them in the gitignored source folder `assets/pixel-bloom/rewards/source/`;
  - writes `public/rewards/<id>.webp` (sticker: cut out, transparent, 256 px) and `public/rewards/<id>-tile.webp` (rounded square, original background, 256 px).
- **Resize:** nearest-neighbour, so the pixel art stays crisp.
- **Caching:** the service worker precaches `public/rewards/` (≈34 × 2 small webps), so the shop works offline.

## 2. Catalog: `src/domain/rewards/rewardIcons.ts`

```ts
type RewardIcon = { id: string; name: string; emoji: string; cost: number; idea: boolean }
```

The table below is the owner's to edit. `idea` marks the one-tap starter ideas (about 20).

| id | Default name | Fallback emoji | Cost 🥕 | Starter idea |
|---|---|---|---|---|
| nap-time | Nap time | 😴 | 20 | ✓ |
| sleep-in | Sleep in, no alarm | ⏰ | 30 | ✓ |
| no-dishes | No-dishes pass | 🍽️ | 20 | ✓ |
| laundry-done | Laundry done for you | 🧺 | 30 | ✓ |
| no-chores | No-chores day | 🛋️ | 60 | ✓ |
| tv-remote | Remote is yours tonight | 📺 | 20 | ✓ |
| movie-night | Movie night pick | 🍿 | 25 | ✓ |
| game-night | Game night | 🎮 | 30 | |
| love-letter | Love letter | 💌 | 20 | ✓ |
| reading-time | Cozy reading time | 📖 | 30 | |
| foot-rub | Foot rub | 💆 | 30 | ✓ |
| bubble-bath | Bubble bath | 🛁 | 40 | ✓ |
| spa-day | Spa day | 🧖 | 150 | ✓ |
| flowers | Flowers | 💐 | 50 | ✓ |
| coffee-date | Coffee date | ☕ | 40 | ✓ |
| breakfast-in-bed | Breakfast in bed | 🍳 | 60 | ✓ |
| dinner-date | Dinner date | 🥩 | 150 | ✓ |
| blanket-fort | Blanket fort night | ⛺ | 60 | ✓ |
| picnic | Picnic date | 🥪 | 100 | ✓ |
| sunset-drive | Sunset drive | 🌅 | 100 | ✓ |
| surprise-gift | Surprise gift | 🎁 | 80 | ✓ |
| takeout | Takeout night | 🥡 | 50 | |
| pizza | Pizza night | 🍕 | 40 | |
| sushi | Sushi night | 🍣 | 60 | |
| ramen | Ramen night | 🍜 | 40 | |
| tacos | Taco night | 🌮 | 40 | |
| burger | Burger and fries | 🍔 | 40 | |
| burrito | Burrito run | 🌯 | 40 | |
| burrito-bowl | Burrito bowl | 🥗 | 40 | |
| nachos | Nachos | 🧀 | 30 | |
| quesadilla | Quesadilla night | 🫓 | 40 | |
| donut | Donut treat | 🍩 | 20 | |
| sundae | Ice cream sundae | 🍨 | 20 | |
| boba | Boba run | 🧋 | 25 | |

The current five starter ideas keep their names and prices: No-dishes pass 20, Movie night pick 25, Foot rub 30, Breakfast in bed 60, Dinner date 150. Their emoji become the icon's fallback emoji.

## 3. Data (additive only)

- **Records:** `RewardRecord` and `WishRecord` gain `icon?: string`. The field isn't indexed, so there's no Dexie version bump.
- **zod schemas:** add `icon: z.string().optional()`:
  - the backup bundle (`bundleSchema.ts`: rewards, wishes);
  - every gift-link payload carrying a reward or wish (`giftLink.ts`).
- **Old payloads** (no icon) still parse. An older app ignores the icon, because zod objects strip unknown keys.
- **Text stays emoji:** text messages (`couponShareMessage`, wish-list and thank-you texts) are plain text.
- **Unknown icon ids** (say, from a newer app) render as the emoji.

## 4. UI

- **`RewardGlyph({ emoji, icon, size, variant })`** (`presentation/components/RewardGlyph.tsx`):
  - draws the icon's sticker or tile image when the icon is known, else the emoji;
  - is decorative (`alt=""`), since the reward title already names it.
- **Used everywhere a reward or wish emoji is drawn:**
  - shop list, reward editor, `RewardsSheets`;
  - `SavingGoal` (Today tile + shop card);
  - `GiftComposerSheet`, `GiftPreviewScreen`, `ThanksSheet`, `WishSheets`.
- **Canvas cards** (`rewardsCard.ts`: coupon/share cards) draw the tile image when there's an icon, the emoji otherwise.
- **Reward editor:**
  - the emoji picker becomes an icon grid (34);
  - picking an icon sets the icon and its fallback emoji, and fills in the name and cost when those are still empty or untouched;
  - the old emoji row stays as "Other" for rewards no icon fits;
  - starter ideas come from the catalog's `idea` icons.
- **Wish sheet:** same icon grid when she makes a wish.

## Out of scope

- Love notes.
- New icons.
- Prices beyond the table above.
- Changing existing rewards automatically.

## Testing

- **Unit:**
  - the catalog has 34 unique ids, every id has both webp files, and costs are > 0;
  - `RewardGlyph` falls back to the emoji for a missing or unknown icon;
  - gift-link encode/decode round trip with an icon, and an old payload without one;
  - backup import with and without icons.
- **e2e:**
  - add a reward by tapping an icon, then see it in the shop, on Today's saving tile and on a redeemed coupon;
  - a wish made with an icon arrives on the other phone (the `wishlist.spec.ts` flow) with its icon.
- **Device:** a look at the shop on the Note 20 at the Flip 7 size.
