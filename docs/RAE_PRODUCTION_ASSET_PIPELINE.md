# Rae Production Asset + Animation Pipeline

**Status:** AUTHORITATIVE FOR PIXEL BLOOM RAE ASSET PRODUCTION

This document defines the production-grade workflow for creating, reviewing, versioning, exporting, validating, and integrating Rae avatar and animation assets using the tools available to this project. It is intentionally not an MVP/hobby workflow.

## 1. Production objective

The goal is not to generate a folder of attractive images. The goal is a reproducible asset factory:

```text
creative brief
  -> canonical character truth
  -> source art
  -> animation source
  -> deterministic export
  -> asset DB registration
  -> automated validation
  -> visual/form review
  -> runtime integration
  -> WebKit/offline/visual-regression verification
  -> release
```

Approved production assets must be reproducible from source files and metadata. Derived runtime files must never be the only surviving truth.

## 2. Responsibility split

### ChatGPT

Owns creative production inputs:

- art direction and style bible;
- Rae canonical reference imagery;
- pose/expression/keyframe generation;
- environment/reference artwork;
- animation storyboards and frame plans;
- visual QA against approved Rae identity locks;
- creative iteration when an asset does not match Rae or Pixel Bloom.

ChatGPT is the visual generator and creative reviewer, not the runtime integrator.

### Claude Code

Owns deterministic production engineering:

- repository structure;
- image normalization/cropping/alignment;
- palette enforcement tooling;
- sprite-sheet/atlas export;
- animation metadata generation;
- GIF/WebP preview exports;
- SHA-256/hash capture;
- manifest/asset-DB updates;
- build scripts;
- runtime integration;
- visual-regression tests;
- asset linting and CI;
- performance checks.

Claude Code must not redraw or invent Rae from scratch when an approved source asset is missing.

### Human owner

Owns irreversible creative/product approvals:

- Rae identity approval;
- likeness approval;
- tattoo/ear/body-proportion approval;
- exercise-form approval/rejection;
- final release approval.

AI output does not self-approve.

## 3. Tool stack

The complete pipeline can be run with ChatGPT + Claude Code plus local FOSS/CLI tools that Claude can install and operate.

### Required

- ChatGPT image generation/editing — canonical art and keyframes;
- Claude Code — orchestration, code, automation, QA and integration;
- Git/GitHub — versioning and review;
- Python + Pillow — deterministic image inspection/transforms/hashing;
- FFmpeg — preview/fallback animation conversion when required;
- ImageMagick — inspection, montage, format conversion and batch checks;
- Playwright — application visual-regression and phone/WebKit acceptance tests.

### Pixel editor / animation source

**Default FOSS choice: LibreSprite.** Its CLI supports batch operation, frame ranges/tags, layers, sprite-sheet export and JSON metadata. Claude can drive it from shell scripts.

**Optional paid drop-in: Aseprite.** If available, use it for the same role. Aseprite exposes a batch CLI, sprite-sheet + JSON export, layers, tags, slices/pivots and Lua scripting.

Pixelorama is acceptable for manual editing but is not the primary automated pipeline until its CLI/export path is proven stable in this repository.

### Large-source versioning

Use Git LFS for editable source masters and other large authoring binaries when needed (`*.aseprite`, `*.ase`, `*.ora`, very large master PNGs). Keep optimized runtime outputs in ordinary Git when reasonably small so deployment does not depend unnecessarily on LFS behavior.

## 4. Canonical pixel-art specification

Rae uses **high-bit handheld pixel art**: dense late-handheld/action-RPG-style pixel illustration with modern color depth, without copying any franchise.

Do not confuse this with merely applying a pixelation filter to smooth art.

### Canonical working grid

- Full-body character/animation logical canvas: **256 × 256 px**.
- Runtime high-DPI export: **512 × 512 px (2× integer scale)** unless a screen requires another integer scale.
- Portrait logical canvas: **192 × 192 px**; export 384 × 384 or 576 × 576.
- Large hero/reference artwork may be larger, but it is not the animation source grid.
- Exercise animation uses a fixed canvas, baseline, character scale and camera for every frame in that animation.

Never rescale production pixel art by a non-integer factor.

### Pixel rules

- intentional pixel clusters;
- selective color-matched outlines (selout);
- no painterly blur;
- no generated single-pixel noise;
- no photoreal skin texture;
- no sub-pixel positional drift frame-to-frame;
- nearest-neighbor scaling for pixel exports;
- fixed palette ramps for skin, hair, outfit, bunny ears/tail and glasses;
- background glow can be richer, but the character silhouette must remain crisp.

### Palette strategy

Maintain named palette ramps rather than allowing every asset to invent colors:

- `rae-skin-*`
- `rae-hair-*`
- `rae-pink-*`
- `rae-lavender-*`
- `rae-ear-*`
- `rae-gold-*`
- `pb-shadow-*`
- `pb-highlight-*`

The palette file itself is versioned. A palette change is a deliberate production change, not silent drift.

## 5. Rae identity lock — gate zero

Before producing animation, freeze one approved Rae model package.

Required source-of-truth references:

1. canonical front/3-quarter reference;
2. front, side, back and 3/4 turnarounds;
3. head/face reference;
4. expression sheet;
5. outfit sheet;
6. bunny-ear geometry sheet;
7. tattoo placement diagram;
8. color palette;
9. small-scale silhouette tests;
10. body-proportion guide.

These must agree with `assets/pixel-bloom/db/asset-db.json` identity locks.

### Identity acceptance gate

Reject an asset if any of these drift materially:

- face silhouette/feature spacing;
- skin tone;
- glasses geometry;
- hair silhouette;
- body proportions;
- exactly two bunny ears;
- ear length/shape;
- bunny tail;
- lotus tattoo location;
- default outfit colors/silhouette;
- adult age read.

No animation work begins until this package is marked `approved`.

## 6. Source vs derived assets

Production uses three layers.

### Layer A — authoring source

Examples:

```text
assets/pixel-bloom/source/rae/
  canonical/
  portraits/
  poses/
  animations/
  exercises/
  palettes/
```

Editable files belong here. These are the files humans/AI revise.

### Layer B — deterministic build outputs

Examples:

```text
assets/pixel-bloom/build/rae/
  frames/
  spritesheets/
  metadata/
  previews/
```

Generated by scripts. Do not hand-edit these.

### Layer C — shipped runtime assets

Examples:

```text
public/assets/pixel-bloom/rae/
  avatars/
  sprites/
  exercise/
  fallbacks/
```

Only optimized files required by the actual app ship here.

Do not ship every source frame, GIF, WebP and sprite sheet simultaneously unless the runtime really consumes all of them.

## 7. Production animation strategy

Use different animation techniques for different jobs.

### UI motion

Use React/CSS/SVG. Do not render button presses, progress pulses, timer pulses or simple sparkles as raster GIFs.

### Rae mascot/emotional motion

Use hand/keyframe-style pixel sequences:

- idle breathe;
- blink;
- wave;
- cheer;
- stretch;
- tired/rest;
- celebration;
- thinking/focused reactions.

Canonical runtime output: sprite sheet + JSON metadata.

### Exercise instruction motion

Exercise motion prioritizes form clarity over personality.

Use fixed orthographic side/front viewpoints and controlled key poses. Do not ask a generative model to invent every frame independently.

Preferred workflow:

```text
approved exercise reference
  -> start key pose
  -> descent/intermediate key pose(s)
  -> bottom/peak key pose
  -> return key pose(s)
  -> cleanup/alignment
  -> timed frame sequence
  -> sprite sheet + metadata
```

> **Superseded 2026-09-26 (owner decision):** rigged/cutout exercise animation was tried and rejected. Exercises use whole drawn frames only. See `docs/RAE_EXERCISE_ANIMATION.md`.

For repetitive exercise animation, use a layered/rigged approach where it improves consistency. Godot may be used as an offline 2D rig/render tool if needed; it is not a runtime dependency of the React app.

## 8. Gold-master workflow for each animation

Every new animation passes these stages.

### Stage 1 — animation brief

Create an entry before artwork exists:

- asset/animation ID;
- purpose;
- screen usage;
- perspective;
- canvas size;
- loop/non-loop;
- target FPS;
- target duration;
- required key poses;
- gaze direction;
- motion-full behavior;
- reduced-motion behavior;
- motion-off fallback;
- performance budget;
- reviewer requirements.

### Stage 2 — storyboard

ChatGPT creates a contact sheet/storyboard. No runtime export yet.

For a squat, for example:

```text
A standing
B hinge/descent
C mid descent
D bottom
E mid ascent
F standing
```

Approve the body mechanics and silhouette before generating in-betweens.

### Stage 3 — gold keyframes

Generate/refine only the key poses first.

All keyframes must have:

- same camera;
- same canvas;
- same baseline;
- same character scale;
- same clothing;
- same ear/tail/tattoo placement;
- same palette;
- consistent glasses/hair.

### Stage 4 — pixel cleanup

Import the keyframes into LibreSprite/Aseprite on the canonical logical grid.

Clean:

- silhouette clusters;
- stray pixels;
- outline consistency;
- palette drift;
- face consistency;
- limb length drift;
- baseline/pivot drift;
- ear/tail drift;
- transparency halos.

Automation can flag defects, but final visual approval remains human.

### Stage 5 — in-betweens

Produce the minimum frame count required for smooth instructional clarity.

Default targets:

- idle: 6–8 FPS;
- expressive mascot: 8–12 FPS;
- exercise demo: 8–12 FPS;
- reward one-shot: 10–14 FPS.

Do not add frames merely to chase video-like 24/30/60 FPS. Pixel animation should preserve strong poses and readable timing.

### Stage 6 — timing + tags

The editable sprite file stores named animation tags and frame durations.

Examples:

```text
idle
blink
cheer
squat-loop
squat-start
squat-bottom
```

For exercise loops, include dwell time at positions that improve instruction readability.

### Stage 7 — deterministic export

Claude runs the export pipeline. A typical LibreSprite/Aseprite-style export produces:

- packed or row sprite sheet;
- JSON frame metadata;
- frame tags;
- pivot/slice data when available;
- static fallback still/sequence;
- optional animated WebP preview;
- optional GIF preview.

The sprite sheet + JSON metadata is the preferred runtime format because the app can pause, resume, choose a frame, and honor motion preferences deterministically.

> **As built (2026-09-26):** exercise loops ship as animated WebP plus still PNGs for reduced motion. Featured strips also emit sprite sheet + JSON. The reasoning is in `docs/RAE_EXERCISE_ANIMATION.md` § Runtime.

GIF is preview/documentation output, not the primary shipped animation format.

### Stage 8 — registration

Claude updates `assets/pixel-bloom/db/asset-db.json` with:

- stable ID;
- version;
- source path;
- runtime path;
- SHA-256;
- frame count;
- FPS/durations;
- canvas/frame dimensions;
- pivot/anchor;
- tags;
- fallback ID;
- source/reference IDs;
- review status;
- review date;
- toolchain version;
- performance size;
- exercise ID where applicable.

### Stage 9 — automated QA

Claude runs asset linting before integration.

Required checks:

- schema valid;
- all DB paths exist;
- no duplicate IDs;
- hashes match;
- dimensions match metadata;
- all frames share expected canvas;
- frame count matches metadata;
- no accidental opaque background where transparency is required;
- no frame outside performance budget;
- no non-integer runtime scale;
- fallback exists;
- production asset is not still marked `draft`;
- source file exists for every production-derived asset.

### Stage 10 — visual QA board

Automatically generate a review board containing:

- canonical Rae reference;
- first/middle/last frames;
- onion/contact strip;
- sprite sheet;
- 1× and 2× views;
- silhouette view;
- fallback view;
- animation preview.

Review the board rather than opening dozens of files manually.

### Stage 11 — app integration

Claude integrates assets through a reusable player component rather than custom per-exercise code.

Conceptual API:

```ts
<SpriteAnimation
  assetId="rae-bodyweight-squat-side"
  motion={motionPreference}
  paused={paused}
/>
```

The component resolves runtime files from the asset DB/generated runtime manifest.

### Stage 12 — app acceptance

Run Playwright visual regression on at least:

- phone-sized Chromium;
- mobile WebKit/iPhone-like project;
- full motion;
- reduced motion;
- motion off.

Also verify:

- offline reload;
- no missing runtime asset requests;
- no layout shift when animation loads;
- correct scale/crop on the active workout screen;
- no UI text embedded in generated artwork;
- no essential information lost with motion disabled.

## 9. Asset lifecycle

Use explicit state transitions:

```text
planned
  -> generated
  -> cleanup
  -> review
  -> approved
  -> production
  -> deprecated
```

Only `production` assets may be considered release-ready.

Never silently replace an approved asset. Create a new version (`v2`) and preserve the old record until migration is complete.

## 10. Naming/versioning

Base pattern:

```text
pb-rae-[category]-[name]-[perspective]-vN.ext
```

Examples:

```text
pb-rae-avatar-neutral-front3q-v1.png
pb-rae-idle-breathe-front3q-v1.aseprite
pb-rae-idle-breathe-front3q-v1.png
pb-rae-squat-loop-side-left-v1.png
pb-rae-squat-loop-side-left-v1.json
pb-rae-squat-loop-side-left-v1.gif
```

Asset DB IDs are semantic and stable; file versions are explicit.

## 11. Runtime media policy

### Runtime preferred

- sprite sheet PNG/WebP + JSON metadata for controllable animation;
- SVG/CSS for UI motion;
- optimized WebP/PNG for still illustrations.

### Review/preview only

- GIF;
- contact sheets;
- storyboard boards;
- authoring screenshots.

Modern WebP supports animation and transparency with better compression characteristics than GIF, but controllable sprite sheets remain preferred for instructional animation.

## 12. Performance budget

Initial release budgets are conservative and must be measured on the target iPhone.

Suggested starting limits:

- Rae small portrait runtime still: <= 150 KB;
- Rae full-body runtime still: <= 300 KB;
- one exercise runtime sprite sheet + JSON: <= 700 KB target, <= 1 MB hard warning threshold;
- reduced-motion sequence fallback: <= 300 KB;
- initial workout route should not preload the entire exercise-media library;
- only current + next exercise media should be eager-loaded; remaining media is lazy/cached.

Source/editable files are not constrained by runtime budgets because they are not shipped to the app.

## 13. Exercise-specific production gate

No exercise animation ships based on visual attractiveness alone.

Required review:

- correct movement direction;
- clear start/end positions;
- no impossible joint motion;
- no frame-to-frame limb-length drift;
- feet/support remain spatially coherent;
- camera does not change;
- clothing/body geometry does not obscure critical form cues;
- written instructions remain available independently of the art.

The asset is instructional media, not clinical diagnosis. If exercise truth is uncertain, stop and request reviewed content rather than inventing it.

## 14. Accessibility/motion gate

Every animation record defines `full`, `reduced`, and `off` behavior.

- Decorative motion must disappear or simplify under reduced/off.
- Exercise information must remain available through static key poses/instructions.
- Never encode required workout instructions solely in movement.
- Respect app motion preference and OS `prefers-reduced-motion`.

## 15. CI/build automation Claude should implement

The production asset pipeline should ultimately expose commands similar to:

```bash
npm run assets:validate
npm run assets:export
npm run assets:previews
npm run assets:manifest
npm run assets:qa-board
npm run assets:test
npm run assets:build
```

Expected behavior:

```text
assets:validate
  schema + source + metadata checks

assets:export
  editable sources -> runtime sheets/frames

assets:previews
  runtime/source frames -> WebP/GIF/contact sheets

assets:manifest
  hashes/sizes/dimensions -> generated runtime manifest

assets:qa-board
  automated visual review boards

assets:test
  deterministic asset/unit checks

assets:build
  validate -> export -> manifest -> test
```

CI must fail if production manifests refer to missing or invalid assets.

## 16. Git strategy

Recommended:

```text
normal Git:
  JSON manifests
  schemas
  scripts
  optimized runtime assets
  QA thumbnails/golden screenshots when reasonably sized

Git LFS:
  editable .aseprite/.ase/.ora masters
  oversized layered sources
  unusually large master PNGs
```

Commit `.gitattributes` so LFS behavior travels with the repository.

Generated temporary frames that can be reproduced exactly do not need to be committed unless they are needed for audit/review; the source file, exporter version and deterministic build recipe must be committed.

## 17. Gold-master sequence for this project

Do not mass-produce 50 exercises first.

Production order:

1. freeze Rae canonical model package;
2. produce `rae-idle-breathe` end-to-end;
3. produce `rae-blink` end-to-end;
4. produce `rae-cheer` end-to-end;
5. produce **one gold exercise**: `rae-bodyweight-squat-side`;
6. integrate all four into the actual app;
7. run WebKit/Chromium/offline/motion QA;
8. refine pipeline until regeneration is deterministic;
9. only then batch the remaining exercises/mascot states.

The squat animation is the pipeline qualification test. If one approved squat cannot be regenerated cleanly from source to shipped sprite + metadata + fallback + tests, the pipeline is not ready to scale.

## 18. Definition of production-ready animation

An animation is production-ready only when all are true:

- Rae identity locks pass;
- source editable file exists;
- asset DB schema passes;
- output is deterministic;
- key poses approved;
- pixel cleanup approved;
- movement/form approved where instructional;
- sprite metadata accurate;
- reduced/off fallback exists;
- runtime budget passes;
- no missing/off-origin runtime dependency;
- WebKit + Chromium rendering passes;
- visual-regression baseline approved;
- offline use passes;
- version/hash recorded;
- status is `production`.

Anything less is a draft asset, even if it looks finished.

## 19. References

Primary implementation references used to design this pipeline:

- Aseprite CLI/sprite-sheet/scripting documentation;
- LibreSprite CLI source/options supporting batch, layers, frame tags, sheet + JSON export;
- MDN web image-format guidance (PNG/WebP/GIF/APNG tradeoffs);
- Playwright screenshot/visual comparison documentation;
- GitHub Git LFS large-file documentation;
- WCAG guidance for reduced/optional interaction animation.

See `docs/RESEARCH_SOURCES.md` for the broader repository research policy.