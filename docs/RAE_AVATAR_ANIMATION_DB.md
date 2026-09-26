# Rae Avatar + Animation Asset Database

**Status:** AUTHORITATIVE FOR RAE ASSET IDENTITY, INVENTORY, AND MOTION METADATA  
**Creative owner:** ChatGPT  
**Implementation owner:** Claude Code  
**Database source:** `assets/pixel-bloom/db/asset-db.json`  
**Validation schema:** `assets/pixel-bloom/db/asset-db.schema.json`

## Purpose

This database prevents the frontend and creative pipeline from treating Rae as a pile of loosely named PNGs. Every approved Rae asset or animation gets a stable ID, purpose, perspective, source relationship, motion behavior, output paths, and review status.

Claude Code should query or compile this registry. It should not infer asset identity from filenames or regenerate missing Rae artwork.

## Why JSON instead of IndexedDB

Rae's canonical artwork is application content bundled with a release. It is not mutable user data.

Use static version-controlled JSON because it is:

- deterministic;
- inspectable in Git;
- available before IndexedDB opens;
- cacheable with the app shell;
- easy to validate at build time;
- safe to compile into TypeScript maps.

IndexedDB remains for user/session data, not the canonical art catalog.

## Rae identity contract

The character ID is always `rae`.

Locked traits:

- adult Black woman;
- warm medium-deep brown skin;
- recognizable stylized likeness of Rae, never photorealistic;
- large round thin gold wire-frame glasses;
- natural Black hair, with approved short/tapered and curly/headband variations;
- fuller/curvy adult proportions, never caricatured;
- exactly two bunny ears;
- ears are semi-upright with a soft tip bend, not extremely floppy;
- small fluffy bunny tail;
- small dark lotus tattoo on Rae's **anatomical left upper chest/shoulder near the collarbone**, slightly beneath/overlapped by the left top strap;
- `R` necklace when visible;
- default Pixel Bloom workout outfit: pink top, lavender leggings, pastel trainers.

### Face rule

Rae should look like Rae through:

- head/face silhouette;
- glasses;
- smile/mouth shape;
- eye placement;
- skin tone;
- hairstyle;
- general facial proportions.

Do **not** solve likeness by increasing realism. Skin pores, photographic gradients, realistic lens rendering, painterly facial detail, or photo-composite treatment are out of style.

## Pixel-art contract

Target visual family:

> premium high-bit late-handheld / GBA-era action-RPG pixel illustration translated to a modern high-DPI screen.

This is a visual-technique reference, not permission to copy a copyrighted game character or asset.

Required qualities:

- visible intentional pixel clusters;
- high color depth;
- selective color-matched outlines (`selout`);
- crisp silhouette;
- high-detail cloth/hair shading while preserving pixel structure;
- simplified pixel-art face rendering;
- controlled highlights;
- no painterly smoothing;
- no photorealistic face;
- no mandatory direct camera gaze.

## Perspectives

### Character / reward art

Prefer:

- `front-3q-left`
- `front-3q-right`
- occasional `front`

Rae can look toward an object, exercise direction, UI target, or off-axis point. Direct eye contact is an option, not the default.

### Exercise demonstrations

Prefer instructional projections:

- `side-left` / `side-right` for squat, hinge, lunge and many lower-body movements;
- `front` when knee/arm symmetry matters;
- alternate angle only when it teaches something not visible in the primary view.

Exercise demonstrations use a fixed camera and fixed character scale. Personality does not override form readability.

## Database entities

### `characters[]`

Defines immutable identity/style locks.

### `assets[]`

One record per still/reference/export asset. Important fields:

- `id`
- `characterId`
- `kind`
- `status`
- `repoPath`
- `perspective`
- `format`
- dimensions
- transparency
- tags
- source asset relation

### `animations[]`

One logical motion per record. The animation record is independent of its export format.

Example:

`rae-bodyweight-squat-side`

may have all of:

- source frame directory;
- sprite sheet;
- animated WebP;
- GIF preview;
- static sequence fallback.

The animation ID stays the same.

## Canonical motion pipeline

```text
approved Rae reference
        ↓
approved key poses
        ↓
PNG frame sequence  ← canonical animation source
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

### Use SVG/CSS for

- buttons;
- progress indicators;
- simple sparkles;
- selection feedback;
- timers;
- UI micro-motion.

### Use Rae frame/sprite assets for

- idle breathing;
- blink;
- cheer;
- exercise demonstrations;
- character-specific reactions.

### GIF

GIF is a supported preview/export and can be used selectively, but the app should prefer sprite sheets or animated WebP when practical.

## Motion behavior

Every animation must define:

- Full motion;
- Reduced motion;
- Motion off fallback.

No animation is allowed to remove instructional information when disabled.

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

1. canonical reference
2. front 3/4 avatar
3. neutral portrait
4. happy expression
5. focused expression
6. idle full-body pose

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
- animated WebP;
- GIF preview.

## Animation quality gate

Reject an exercise animation if any frame changes:

- face identity;
- glasses geometry;
- ear count;
- ear attachment position;
- tattoo side/location;
- outfit design;
- shoe design;
- body proportions;
- camera framing;
- floor line;
- character scale.

Reject it if interpolation produces anatomically impossible limb transitions.

## Claude integration contract

Claude Code may:

- validate the JSON database;
- generate TypeScript lookup helpers from it;
- build sprite players;
- select reduced/off-motion fallbacks;
- create build-time asset audits;
- fail the build on missing approved asset paths.

Claude Code must not:

- invent an unregistered Rae asset;
- move the lotus tattoo;
- add/remove ears;
- substitute another character;
- regenerate Rae art from textual memory;
- silently fall back from an approved asset to unrelated imagery.

## Recommended lookup API

The implementation can expose a tiny read-only API such as:

```ts
assetDb.getAsset('rae-pose-idle-3q')
assetDb.getAnimation('rae-idle-breathe')
assetDb.getExerciseAnimation('bodyweight-squat', 'side-left')
assetDb.getMotionFallback('rae-bodyweight-squat-side', motionPreference)
```

The JSON registry remains the source of truth; generated TypeScript is disposable build output.

## Next creative production step

Do not expand to dozens of exercises yet.

Produce and approve:

1. Rae canonical reference v1;
2. isolated idle pose;
3. idle breathe frames;
4. blink frames;
5. cheer frames;
6. bodyweight squat key poses;
7. first full squat loop.

Once those pass consistency review, use them as the gold standard for the rest of the exercise library.
