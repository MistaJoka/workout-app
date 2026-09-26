# Claude Handoff — Rae v1 Canonical Visual Reference

**Status:** READY  
**Purpose:** preserve the exact human-approved Rae image as the primary visual source of truth before sprite/animation production.

## Non-negotiable authority rule

The exact approved image is the source of truth for **how Rae looks**.

Do not rebuild Rae from prose, prompts, memory, or older generated boards when the canonical image is available. Supporting docs are descriptive/technical aids and must be corrected if they conflict with the image.

## Canonical binary

Expected repository path:

`assets/pixel-bloom/character/rae/reference/pb-rae-character-bible-v1.png`

Expected file properties:

- dimensions: `1536x1024`
- bytes: `2198087`
- SHA-256: `e0390ef9d39fe92d2d93544d62cb0568a6e9e2b3cd5e6e8305c333b7f3217beb`

Source conversation filename:

`rae_pixel_bloom_character_bible.png`

## Required ingestion procedure

Once the approved PNG is available on disk, Claude Code should:

```bash
mkdir -p assets/pixel-bloom/character/rae/reference
cp /path/to/rae_pixel_bloom_character_bible.png \
  assets/pixel-bloom/character/rae/reference/pb-rae-character-bible-v1.png

sha256sum assets/pixel-bloom/character/rae/reference/pb-rae-character-bible-v1.png
file assets/pixel-bloom/character/rae/reference/pb-rae-character-bible-v1.png
```

The SHA-256 must exactly equal:

`e0390ef9d39fe92d2d93544d62cb0568a6e9e2b3cd5e6e8305c333b7f3217beb`

If it does not, stop. Do not treat a regenerated or recompressed substitute as the v1 canonical reference.

## Required context before generating derivative Rae assets

Read:

1. the canonical image itself;
2. `docs/RAE_CHARACTER_BIBLE_V1.md`;
3. `assets/pixel-bloom/db/rae-character-lock.v1.json`;
4. `docs/RAE_PRODUCTION_ACCEPTANCE_CHECKLIST.md`;
5. `docs/RAE_PRODUCTION_ASSET_PIPELINE.md`;
6. `assets/pixel-bloom/db/asset-db.json`.

## Image-observed anchors

Derivative work should visually preserve what is shown in the approved reference, including:

- medium-deep brown complexion;
- black 4C natural hair and approved silhouette;
- exactly two tan bunny ears with flesh-pink interiors;
- no human ears;
- brown bunny tail;
- round gold wire-frame glasses;
- one black/gray lotus under the anatomical-left collarbone near shoulder;
- thin gold chain with small `A` pendant;
- fine/dainty layered rings;
- pink training top;
- lavender leggings;
- black-and-white Panda-Dunk-inspired sneaker treatment;
- curvy/strong adult proportions;
- high-bit pixel-art treatment.

These bullets are navigation aids only. When judging visual shape, scale, proportion, complexion, silhouette, placement, and styling, compare directly to the canonical image.

## First production action after ingestion

Do not mass-generate the suite immediately.

1. extract/curate palette ramps from the canonical image;
2. create isolated canonical turnarounds/details without redesigning Rae;
3. produce Bodyweight Squat gold-master key poses;
4. compare every key pose to the canonical image using the acceptance checklist;
5. only then create in-between frames and deterministic exports.
