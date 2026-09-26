# Rae Avatar + Animation Asset Database

**Status:** AUTHORITATIVE FOR RAE ASSET IDENTITY, INVENTORY, AND MOTION METADATA  
**Creative owner:** ChatGPT  
**Implementation owner:** Claude Code  
**Database source:** `assets/pixel-bloom/db/asset-db.json`  
**Validation schema:** `assets/pixel-bloom/db/asset-db.schema.json`  
**Canonical character truth:** `docs/RAE_CHARACTER_BIBLE_V1.md`

## Purpose

This database prevents the frontend and creative pipeline from treating Rae as a pile of loosely named PNGs. Every approved Rae asset or animation gets a stable ID, purpose, perspective, source relationship, motion behavior, output paths, and review status.

Claude Code should query or compile this registry. It should not infer asset identity from filenames or regenerate missing Rae artwork.

## Authority rule

The approved Rae v1 character-bible image and `docs/RAE_CHARACTER_BIBLE_V1.md` are the canonical visual/identity source. If generated text inside the reference artwork conflicts with the written character bible, the written lock wins.

## Why JSON instead of IndexedDB

Rae's canonical artwork is application content bundled with a release. It is not mutable user data.

Use static version-controlled JSON because it is deterministic, inspectable in Git, available before IndexedDB opens, cacheable with the app shell, easy to validate at build time, and safe to compile into TypeScript maps. IndexedDB remains for user/session data, not the canonical art catalog.

## Rae v1 identity contract

The character ID is always `rae`.

Locked traits:

- adult Black woman / bunny girl;
- warm medium-deep brown complexion matching the approved v1 reference;
- recognizable stylized likeness of Rae, never photorealistic;
- black **4C natural hair**, dense/tightly coiled, with the approved voluminous updo/puff silhouette;
- hair may not become straight, straightened, silky-straight, or generic-wavy;
- thin round gold wire-frame glasses;
- fuller/curvy, strong adult proportions, never caricatured or teen-coded;
- **exactly two ears total**;
- both ears are bunny ears;
- **no human ears exist or are visible**;
- bunny ears are tan outside with flesh-pink interiors;
- ears are moderately long and semi-upright with a soft natural bend, not extremely floppy;
- one small fluffy **brown** bunny tail;
- exactly one owner-supplied black/gray lotus tattoo;
- tattoo is on Rae's **anatomical left upper chest/front shoulder, directly under the left collarbone near the shoulder**, slightly beneath/overlapped by the left training-top strap;
- tattoo may not migrate to the deltoid, upper arm, center chest, right side, or appear twice on Rae;
- thin gold chain with a small **`A` pendant** when visible;
- pendant is subtle/small, not oversized;
- thin, dainty, layered rings are allowed; no chunky rings or large rocks;
- default Pixel Bloom training set: pink fitted top + lavender high-waisted leggings;
- default shoes: black-and-white Panda-Dunk-inspired **genericized** sneakers without protected logos;
- Rae does not need to look directly at the viewer; gaze should naturally follow the action/scene.

### Face rule

Rae should look like Rae through head/face silhouette, glasses, smile/mouth shape, eye placement, complexion, 4C hairstyle, and general facial proportions.

Do **not** solve likeness by increasing realism. Skin pores, photographic gradients, realistic lens rendering, painterly facial detail, or photo-composite treatment are out of style.

## Pixel-art contract

Target visual family:

> premium high-bit late-handheld / GBA-era action-RPG pixel illustration translated to a modern high-DPI screen.

This is a visual-technique reference, not permission to copy an existing game character or asset.

Required qualities:

- intentional visible pixel clusters;
- high color depth;
- selective color-matched outlines (`selout`);
- crisp silhouette;
- high-detail 4C hair, cloth, and accessory shading while preserving pixel structure;
- simplified pixel-art face rendering;
- controlled highlights;
- stable palette across frames;
- no painterly smoothing;
- no photorealistic face;
- no mandatory direct camera gaze.

## Perspectives

### Character / reward art

Prefer `front-3q-left`, `front-3q-right`, and occasional `front`. Rae can look toward an object, exercise direction, UI target, or off-axis point. Direct eye contact is optional.

### Exercise demonstrations

Prefer instructional projections:

- `side-left` / `side-right` for squat, hinge, lunge and many lower-body movements;
- `front` when knee/arm symmetry matters;
- alternate angle only when it teaches something not visible in the primary view.

Exercise demonstrations use a fixed camera, fixed logical canvas, fixed baseline, and fixed character scale. Personality does not override form readability.

## Database entities

### `characters[]`

Defines immutable identity/style locks and points to the canonical Rae v1 character bible.

### `assets[]`

One record per still/reference/export asset. Important fields include `id`, `characterId`, `kind`, `status`, `repoPath`, `perspective`, `format`, dimensions, transparency, tags, hashes, and source-asset relation.

### `animations[]`

One logical motion per record. The animation record is independent of export format.

For example, `rae-bodyweight-squat-side` may have source frames, a sprite sheet, animated WebP, GIF preview, and a static sequence fallback while keeping one stable animation ID.

## Canonical motion pipeline

```text
approved Rae v1 character bible
        ↓
approved key poses
        ↓
editable/source frame sequence
        ↓
PNG frame sequence
        ↓
   ┌────┼───────────┐
   ↓    ↓           ↓
sprite WebP        GIF
sheet runtime      preview/share
        ↓
frontend animation controller
```

Do not make GIF the canonical source.

## Runtime format policy

Use SVG/CSS/React for button motion, progress indicators, simple sparkles, selection feedback, timers, and UI micro-motion.

Use Rae sprite/frame assets for idle breathing, blink, cheer, exercise demonstrations, and character-specific reactions.

GIF is a preview/export format. Runtime should normally prefer sprite sheets + metadata or animated WebP where appropriate.

## Motion behavior

Every animation must define Full, Reduced, and Off behavior. No animation may remove instructional information when disabled.

## Approval lifecycle

```text
planned
  ↓
generated / frames-ready
  ↓
review
  ├── rejected → regenerate/fix
  ↓
approved
  ↓
release asset
```

Only `approved` assets are eligible for production UI use unless a development screen explicitly labels draft art.

## Rae V1 production inventory

### Canonical foundation

1. locked character-bible reference;
2. isolated canonical front/3/4/side/back source views;
3. front 3/4 avatar;
4. neutral portrait;
5. expression pack;
6. idle full-body pose;
7. palette extraction;
8. ear/tail/tattoo/jewelry detail references;
9. small-scale silhouette tests.

### First animations

1. `rae-idle-breathe`
2. `rae-blink`
3. `rae-cheer`
4. `rae-bodyweight-squat-side`

### First exercise package

Bodyweight squat:

- side standing/start;
- descent intermediate;
- bottom;
- ascent intermediate;
- return standing;
- static sequence strip;
- 12-frame source animation;
- sprite sheet;
- JSON metadata;
- animated WebP;
- GIF preview;
- reduced-motion fallback;
- motion-off fallback.

## Animation quality gate

Reject a Rae asset or frame if it changes or violates:

- complexion family;
- black 4C hair texture/silhouette;
- face identity;
- glasses geometry;
- exactly-two-bunny-ear count;
- zero-human-ear rule;
- tan outer / flesh-pink inner ear palette;
- brown tail color/location;
- lotus design, count, side, or collarbone placement;
- small `A` pendant;
- dainty-ring rule;
- pink/lavender default outfit;
- black/white sneaker treatment;
- body proportions;
- camera framing;
- floor line;
- character scale;
- high-bit pixel-art rendering.

Reject exercise interpolation that produces anatomically impossible limb transitions or obscures movement mechanics.

## Claude integration contract

Claude Code may validate the JSON database, generate TypeScript lookup helpers, build sprite players, select reduced/off-motion fallbacks, create asset audits, hash canonical sources, generate deterministic exports, and fail builds on missing approved runtime assets.

Claude Code must not invent an unregistered Rae asset, redraw Rae from text memory, add human ears, change ear/tail colors, move/duplicate the lotus tattoo, replace the `A` pendant, substitute chunky jewelry, straighten Rae's 4C hair, change default footwear treatment, or silently substitute unrelated imagery.

## Recommended lookup API

```ts
assetDb.getAsset('rae-pose-idle-3q')
assetDb.getAnimation('rae-idle-breathe')
assetDb.getExerciseAnimation('fs.bodyweight-squat', 'side-left')
assetDb.getMotionFallback('rae-bodyweight-squat-side', motionPreference)
```

The JSON registry remains source-of-truth data; generated TypeScript is disposable build output.

## Next production step

The foundational Rae v1 identity is now approved. Do not redesign the character.

Next:

1. commit/materialize the approved character-bible raster at its canonical repository path;
2. extract and lock the palette from that exact image;
3. isolate clean source turnarounds/details from the approved design;
4. build the squat gold-master key poses;
5. produce the first deterministic frame/sprite pipeline;
6. run the Rae production acceptance checklist before scaling to additional movements.
