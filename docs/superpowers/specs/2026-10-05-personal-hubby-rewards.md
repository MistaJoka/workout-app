# Personal Hubby Bunny reward tier

**Date:** 2026-10-05
**Status:** implemented catalog layer; bespoke artwork pending
**Extends:** `2026-10-04-reward-icons-design.md`

## Goal

Make Hubby Bunny's shop feel specific to this relationship instead of reading like a generic wellness reward catalog.

The six rewards below use stable icon ids now, even before bespoke WebP artwork exists. That lets wishes, rewards, gift links, backups and later analytics refer to the same concept immediately. While an icon is marked `artReady: false`, the UI intentionally renders its fallback emoji rather than making a broken image request.

## Personal rewards

| id | Default name | Fallback | Cost 🥕 | Starter |
|---|---|---:|---:|---:|
| `hubby-butter-noodles` | Hubby's butter noodles | 🍜 | 40 | ✓ |
| `hubby-salmon-rice` | Hubby's baked salmon & rice | 🐟 | 60 | ✓ |
| `chipotle-night` | Chipotle night | 🌯 | 50 | ✓ |
| `hubby-cooks-your-pick` | You pick, Hubby cooks | 🧑‍🍳 | 60 | ✓ |
| `hubby-favor` | Hubby favor | 💗 | 35 | ✓ |
| `mandatory-movie-night` | Mandatory movie night | 🎬 | 35 | ✓ |

## Asset contract

When bespoke art is ready, add both files for each id:

```text
public/rewards/<id>.webp
public/rewards/<id>-tile.webp
```

Then change only that catalog entry from:

```ts
artReady: false
```

to either:

```ts
artReady: true
```

or omit the property, because existing art-ready icons default to ready.

No reward ids should be renamed after they have been used in saved data or links.

## Rendering rule

`RewardGlyph` treats three states differently:

1. known icon + art ready → render WebP;
2. known icon + `artReady: false` → render fallback emoji;
3. unknown/missing icon → render fallback emoji.

This keeps forward compatibility and prevents 404s while artwork is being produced incrementally.

## Pricing rationale

The current economy treats roughly 25 carrots as one full workout. Personal rewards are deliberately spread across one-to-three-workout territory:

- 35–40 carrots: easy, frequent affection/comfort rewards;
- 50–60 carrots: a more involved meal or activity;
- larger date/gift rewards remain in the existing 80–150+ carrot tier.

## Tests

- catalog now contains 40 unique ids;
- 25 are starter ideas;
- all costs remain positive;
- only art-ready entries are required to have both WebP files;
- pending personal icons must fall back to emoji rather than a missing image URL.

## Next art batch

Recommended order because these are the most distinctive and immediately useful:

1. `hubby-butter-noodles`
2. `hubby-salmon-rice`
3. `mandatory-movie-night`
4. `chipotle-night`
5. `hubby-cooks-your-pick`
6. `hubby-favor`
