# Pixel Bloom Creative Asset System

**Status:** AUTHORITATIVE FOR PIXEL BLOOM CREATIVE PRODUCTION  
**Version:** 1.0-draft  
**Owner boundary:** ChatGPT handles creative direction, asset planning, asset generation, visual references, prompts, SVG/PNG/GIF/WebP outputs, and creative manifests. **Claude Code owns application implementation and integration.**  
**Does not override:** `CLAUDE.md` or `docs/SOURCE_OF_TRUTH_V06.md` for product behavior, architecture, persistence, navigation, domain logic, or implementation.

---

## 1. Locked creative direction

Pixel Bloom is a complete illustrated fitness-game universe, not a cosmetic skin.

- Visual mix: cozy indie pixel game + pastel handheld-game nostalgia + modern mobile fitness UI.
- Lead character: a cute **adult Black woman** with warm brown skin, dark natural hair, friendly athletic proportions, and **long droopy bunny ears**.
- Illustration coverage: full gamut across brand, UI support art, states, world, workout identity, collectibles, progression, character evolution, and exercise media.
- Exercise media target: hero + start + mid + finish + alternate angle + setup + sequence + animated loop.
- Motion: heavy but controlled; creative assets must support the product's `full`, `reduced`, and `off` motion modes.
- World: cozy gym universe with playful variation.
- Progression fantasy: collectibles + character evolution + map progression.
- State coverage: dedicated treatment for empty, error, success, offline, recovery, progression, and workout-player states.
- Scope: the entire Pixel Bloom universe is inventoried now; production proceeds in controlled batches to preserve consistency.

---

## 2. Creative boundary

### ChatGPT creative responsibilities

- visual source of truth;
- character design;
- asset inventory;
- filenames and folders;
- exact generation prompts;
- SVG icon concepts and final SVG files where appropriate;
- PNG/WebP illustrations;
- GIF / frame-sequence / sprite-sheet animation assets;
- workout cover art;
- collectible and achievement art;
- map and environment art;
- exercise-media art direction and generated media;
- visual QA for consistency;
- asset manifests and creative metadata;
- delivery notes for Claude Code.

### Claude Code responsibilities

- consume the approved assets;
- place/integrate them into the application;
- wire components, routes, state, persistence, theme behavior, and runtime logic;
- optimize/bundle assets if implementation requires it;
- run application tests/builds and implementation verification.

ChatGPT does **not** make implementation decisions unless explicitly asked. Generated creative assets are handoff material for Claude Code.

---

## 3. Global visual contract

### Character

The lead character must remain recognizably the same across every generated asset:

- adult Black woman;
- warm brown skin;
- dark natural hair;
- long soft droopy bunny ears;
- friendly athletic proportions;
- rounded approachable facial construction;
- default pastel fitness outfit;
- readable silhouette at small size;
- no child-coded proportions;
- no sexualized styling;
- no random hairstyle, ear-shape, face, skin-tone, or body-proportion drift.

### Mood

- cozy;
- motivating;
- playful;
- positive;
- fitness-focused;
- premium enough for a real product;
- never visually chaotic.

### Pixel treatment

- intentional pixel geometry;
- crisp edges;
- consistent pixel density;
- readable silhouettes;
- restrained anti-aliasing where pixel art is used;
- no random AI texture;
- no important instructional text baked into generated raster art.

---

## 4. Candidate color system

These are **v0 candidate creative tokens** until the visual boards are reviewed.

| Token | Hex |
|---|---|
| Cloud | `#F8FAFF` |
| Blush | `#FFD6E7` |
| Mint | `#C8F7E1` |
| Sky | `#B8E0FF` |
| Lavender | `#D9C8FF` |
| Peach | `#FFE1B8` |
| Ink | `#2B2D42` |
| Pink | `#EC4899` |
| Green | `#22C55E` |
| Blue | `#3B82F6` |
| Amber | `#F59E0B` |
| Purple | `#8B5CF6` |

---

## 5. Canonical creative formats

### SVG

Preferred for:

- logos;
- navigation icons;
- action icons;
- status icons;
- check-in icons;
- progress symbols;
- simple badges;
- UI ornaments.

Creative rules:

- canonical icon canvas: 24×24 or 32×32;
- simple geometry that survives small-size use;
- transparent background;
- avoid embedded raster art;
- no baked text unless part of a logo;
- consistent stroke/fill language;
- prefer recolorable construction where practical.

### PNG / lossless WebP

Preferred for:

- character art;
- environments;
- large illustrations;
- complex badges;
- state illustrations;
- workout covers;
- exercise media.

Recommended character exports:

- master: 2048×2048 or larger;
- UI portrait: 1024×1024;
- compact portrait: 512×512;
- transparent background where appropriate.

### Animation

Creative source/output choices:

- PNG frame sequences as neutral source;
- sprite sheets where reusable;
- animated WebP for compact runtime-ready handoff where useful;
- GIF for preview/docs/fallback;
- Aseprite may become an editable authoring source later.

Pixel assets must be scaled by integer multiples with nearest-neighbor scaling.

---

## 6. Naming convention

Use:

`pb-[category]-[name]-[variant]-[state]-v1.[ext]`

Rules:

- lowercase;
- kebab-case;
- no spaces;
- semantic names;
- version suffix at end.

Examples:

- `pb-logo-primary-v1.svg`
- `pb-nav-today-active-v1.svg`
- `pb-action-start-default-v1.svg`
- `pb-badge-first-workout-v1.svg`
- `pb-mascot-idle-front-v1.png`
- `pb-bg-home-gym-morning-v1.png`
- `pb-workout-foundation-strength-cover-v1.png`
- `pb-exercise-squat-hero-v1.png`
- `pb-anim-mascot-idle-bounce-v1.gif`

---

## 7. Planned creative filesystem

```text
assets/
  pixel-bloom/
    README.md
    manifests/
      assets.manifest.json
      animations.manifest.json
      packs.manifest.json
      exercises.manifest.json
      badges.manifest.json
      collectibles.manifest.json
      map.manifest.json
    tokens/
      pixel-bloom.tokens.json
      pixel-bloom.motion.json
      pixel-bloom.typography.json
    brand/
      logos/
      app-icons/
      favicons/
      splash/
      promo/
    character/
      mascot-master/
      turnarounds/
      poses/
      expressions/
      outfits/
      evolution/
      portraits/
      stickers/
    ui/
      icons/
        nav/
        actions/
        status/
        checkin/
        progress/
        misc/
      badges/
      progress/
      decorative/
    world/
      backgrounds/
      props/
      tiles/
      overlays/
      map/
    workouts/
      covers/
      thumbnails/
      mini-icons/
    exercises/
      fallback/
      media/
    states/
      empty/
      error/
      success/
      workout-player/
    collectibles/
      stickers/
      medals/
      decor/
      items/
      cards/
    animations/
      mascot/
      ui/
      rewards/
      map/
      exports/
        gif/
        webp/
        spritesheets/
        frames/
    boards/
      master-style/
      brand/
      character/
      icons/
      components/
      workouts/
      exercises/
      progression/
      animations/
```

---

## 8. Full creative inventory

### Brand

- primary logo;
- horizontal logo;
- compact mark;
- wordmark;
- monochrome light/dark variants;
- app icon master and derived sizes;
- favicons;
- splash/launch art;
- repo/showcase hero art.

### Character system

Master turnarounds:

- front;
- front 3/4;
- side;
- back 3/4;
- back.

Core poses:

- idle;
- happy;
- focused;
- encouraging;
- celebrating;
- resting;
- stretching;
- warming up;
- holding dumbbells;
- jogging;
- recovery/seated;
- sleepy;
- alert;
- confused;
- trophy pose;
- map walk.

Expressions:

- happy;
- focused;
- tired;
- proud;
- cheer;
- confused;
- wink;
- resting;
- surprised;
- determined.

Outfits:

- default gym fit;
- cozy hoodie;
- training;
- recovery/stretch;
- evolved/achievement.

Evolution stages:

1. Newbie Bloom
2. Steady Bloom
3. Confident Bloom
4. Strong Bloom
5. Savage Bloom
6. Legendary Bloom

Each stage receives:

- idle/full body;
- portrait;
- collectible card portrait;
- map avatar.

### Cozy gym world

Backgrounds:

- home gym morning;
- home gym day;
- sunset;
- night;
- mobility room;
- cardio nook;
- recovery lounge;
- progress wall;
- trophy/collectible room;
- training garden.

Props include:

- yoga mat;
- dumbbells;
- kettlebell;
- resistance bands;
- step box;
- stability ball;
- trophy shelf;
- plant;
- water bottle;
- towel;
- bench;
- mirror;
- lockers;
- lamp;
- calendar;
- progress board;
- collectible shelf;
- map signpost;
- floor/rug;
- window/cloud panel.

### UI icon families

Navigation:

- Today;
- Library;
- Progress;
- Settings.

Core actions:

- Start;
- Resume;
- Pause;
- Continue;
- Previous;
- Next;
- Complete Set;
- Complete Workout;
- Rest;
- Adjust;
- Easier;
- Alternative;
- Skip;
- How To;
- Preview;
- Finish Early;
- Cancel;
- Retry;
- Search;
- Filter;
- Favorite;
- Theme;
- Motion;
- Sound;
- Export;
- Import;
- Backup;
- Restore;
- Install;
- Offline;
- Reset;
- Close;
- Back;
- More;
- Info.

Status:

- Ready;
- Active;
- Paused;
- Resting;
- Completed;
- Shortened;
- Saved;
- Unsaved;
- Offline;
- Warning;
- Error;
- Locked;
- New;
- Favorite;
- Familiar;
- Progression Candidate;
- Collectible Unlocked;
- Evolution Available.

Check-in families:

- energy: empty, low, okay, good, high;
- readiness: sore, stiff, okay, good, great;
- mood: sleepy, stressed, calm, energized, motivated, cozy, distracted, focused;
- time: Quick 10, 20 min, 30 min, full session.

### Workout-pack art

For each planned family:

1. foundation-strength
2. quick-10
3. mobility-reset
4. warmup-primer
5. upper-body-foundation
6. lower-body-foundation
7. active-breaks
8. balance-foundation
9. low-impact-cardio
10. cooldown-easy

Create:

- cover;
- thumbnail;
- mini icon.

### Collectibles

Starter categories:

- stickers;
- medals/tokens;
- room decor;
- character items;
- map fragments;
- evolution tokens;
- collectible cards.

Initial target: ~40 collectible assets.

### Map progression

Core map pieces:

- world map base;
- start node;
- complete node;
- locked node;
- active node;
- milestone node;
- challenge node;
- reward chest node;
- route path;
- home-base marker;
- unlock banner.

Regions:

- Home Base;
- Starter Studio;
- Bloom Garden;
- Strength Corner;
- Cardio Path;
- Stretch Meadow;
- Focus Ridge;
- Recovery Lounge;
- Champion Hall.

### Achievement badges

Initial set:

- First Workout;
- 3 Workouts;
- 7-Day Streak;
- 30-Day Streak;
- 100 Workouts;
- First Full Week;
- First Quick-10;
- First Mobility Session;
- First Progression;
- Comeback;
- Perfect Week;
- Completion Master;
- Early Bird;
- Night Owl;
- Recovery Day;
- Consistency Queen;
- Stronger Every Week;
- Legendary Bloom.

### Progress visuals

- progress ring;
- segmented bar;
- weekly markers;
- XP/level bar;
- evolution meter;
- map meter;
- collectible counter;
- trophy marker;
- milestone star;
- locked milestone;
- completed/current day markers;
- streak flame;
- streak flower.

### Empty states

- no workouts;
- no history;
- no favorites;
- no search results;
- no active session;
- no achievements;
- no collectibles;
- no map progress;
- no progression;
- no library items;
- no import data;
- no backup.

### Error/recovery states

- generic error;
- storage issue;
- corrupt backup;
- failed import;
- missing media;
- offline but usable;
- unsupported version;
- content unavailable;
- restore failed;
- exercise unavailable.

### Success states

- workout complete;
- shortened workout complete;
- new streak;
- new collectible;
- evolution unlocked;
- progression unlocked;
- backup exported;
- import complete;
- app installed;
- weekly goal reached;
- new map area;
- badge earned.

### Exercise media

For every approved exercise:

- hero;
- start;
- mid;
- finish;
- alternate angle;
- setup;
- sequence;
- loop GIF;
- animated WebP where useful;
- sprite sheet where useful.

Filename pattern:

```text
pb-exercise-[exercise-id]-hero-v1.png
pb-exercise-[exercise-id]-start-v1.png
pb-exercise-[exercise-id]-mid-v1.png
pb-exercise-[exercise-id]-finish-v1.png
pb-exercise-[exercise-id]-angle-alt-v1.png
pb-exercise-[exercise-id]-setup-v1.png
pb-exercise-[exercise-id]-sequence-v1.png
pb-exercise-[exercise-id]-loop-v1.gif
pb-exercise-[exercise-id]-loop-v1.webp
pb-exercise-[exercise-id]-spritesheet-v1.png
```

### Exercise fallbacks

- strength;
- cardio;
- mobility;
- recovery;
- setup;
- sequence unavailable;
- video unavailable;
- placeholder silhouette.

### Motion/animation

Mascot:

- idle bounce;
- blink;
- happy bounce;
- cheer;
- breathing/rest;
- sleepy nod;
- walk/run cycle;
- trophy raise.

UI/reward:

- sparkle burst;
- progress pulse;
- streak flame;
- timer pulse;
- button pop;
- badge unlock;
- collectible reveal;
- evolution glow;
- map node unlock;
- petal/confetti completion.

---

## 9. Batch strategy

### Batch 1 — visual source of truth

Create and approve:

1. mascot master sheet;
2. app icon master;
3. primary logo family;
4. master style board;
5. palette board;
6. typography board;
7. character turnarounds.

**Gate:** do not mass-generate downstream character assets until the mascot passes consistency review.

### Batch 2 — reusable UI primitives

Create and approve:

1. navigation family;
2. workout-action icon family;
3. utility-action icon family;
4. status family;
5. energy/readiness/mood/time check-in families;
6. progress icon family;
7. core component reference board;
8. motion-language board.

### Batch 3 — world/environment

- backgrounds;
- props;
- tiles/overlays;
- cozy gym world board.

### Batch 4 — progression/game layer

- badges;
- collectibles;
- maps;
- character evolution art;
- progress visual assets.

### Batch 5 — state illustrations

- empty;
- error;
- success;
- workout-player treatment.

### Batch 6 — workout identity

- 10 covers;
- 10 thumbnails;
- 10 mini-icons.

### Batch 7 — exercise media

Generate by movement/content family in controlled sets.

### Batch 8 — animations

Export GIF/WebP/frame/sprite variants.

### Batch 9 — technical-derived creative exports

Prepare app-icon sizes, favicons, splash assets, repo/showcase art. Claude Code handles implementation/integration.

---

## 10. Batch 1 production prompts

### Master style board

**Target:** `boards/master-style/pb-board-master-style-v1.png`  
**Canvas:** 3840×2160, 16:9

> Create a maximum-detail professional visual design-system board for a mobile fitness app theme called “Pixel Bloom.” Combine polished cozy indie pixel-game aesthetics, pastel handheld-game nostalgia, and highly usable modern mobile UI. The main recurring protagonist is a cute adult Black woman with warm brown skin, dark natural hair, friendly athletic proportions, and long soft droopy bunny ears. She should look approachable, confident, playful, and consistent enough to serve as the app’s recognizable lead character. Show the canonical pastel palette, typography hierarchy, logo family, mascot character reference, navigation icons, action icons, fitness cards, progress meters, achievement badges, collectible examples, cozy gym environmental elements, subtle pixel flowers, stars, hearts and sparkles, and several iPhone portrait UI examples. Favor crisp pixel geometry, rounded panels, soft pastel surfaces, strong accessibility contrast, and uncluttered hierarchy. It should look like a real production design bible, not a mood collage. No illegible decorative text. No random character variations.

### App icon master

**Target:** `brand/app-icons/pb-app-icon-master-v1.png`  
**Canvas:** 2048×2048

> Create a production-quality square mobile app icon for Pixel Bloom. Feature the recognizable adult Black bunny-woman protagonist from the Pixel Bloom universe as a simplified head-and-shoulders portrait with warm brown skin, dark natural hair, long droopy bunny ears, friendly determined expression, and subtle fitness/progression symbolism. Place her in a soft pastel pixel-inspired environment with Blush, Mint, Lavender and Sky tones. Strong silhouette, low visual complexity, readable at tiny icon scale, no words, no border, no mockup, centered composition.

### Mascot master sheet

**Target:** `character/mascot-master/pb-mascot-master-sheet-v1.png`  
**Canvas:** 4096×4096

> Create a detailed production character sheet for the canonical Pixel Bloom protagonist. She is an adult Black woman with warm brown skin, dark natural hair, friendly athletic build, cute rounded face, and very long soft droopy bunny ears. Her default outfit is a pastel fitness ensemble suitable for a cozy gym: fitted training top, comfortable high-waisted leggings, clean trainers, subtle wrist accessory. Show front, 3/4, profile, back, facial close-up, color palette, body proportions, ear anatomy/shape, hair design, outfit breakdown, and silhouette examples. Style is polished modern pixel art suitable for an indie fitness game, with clean readable anatomy and consistent proportions. She must read as an adult. Avoid sexualized styling, oversized anatomy, chibi baby proportions, random costume changes, or inconsistent ears.

### Character consistency board

**Target:** `character/mascot-master/pb-mascot-style-spec-v1.png`

> Create a professional character consistency board for the Pixel Bloom bunny-woman protagonist. Show approved face proportions, eye style, nose, mouth, hair shape, warm brown skin palette, droopy bunny-ear length and bend, default body proportions, hand/foot simplification, outline thickness, pixel density, shading rules, default fitness outfit, do/don’t silhouette examples, and readable small-scale character examples. This is a production specification board, not concept art.

### Turnaround template

Targets:

- `pb-mascot-turn-front-v1.png`
- `pb-mascot-turn-front-3q-v1.png`
- `pb-mascot-turn-side-v1.png`
- `pb-mascot-turn-back-3q-v1.png`
- `pb-mascot-turn-back-v1.png`

Canvas: 1024×1024, transparent.

> Render the approved Pixel Bloom protagonist alone in `{VIEW}` view. Adult Black woman, warm brown skin, dark natural hair, long droopy bunny ears, canonical pastel fitness outfit, neutral relaxed standing pose, identical body proportions and character design to the master sheet. Full body centered with generous transparent margins. Crisp polished pixel-art treatment. No props, no background, no text.

---

## 11. Batch 2 icon-style contract

Every Pixel Bloom UI icon should use:

- 24×24 canonical canvas;
- consistent apparent stroke/fill weight;
- rounded corners;
- restrained pixel influence;
- minimal detail;
- strong readability at 20–24 px;
- no gradient-dependent meaning;
- transparent background.

### Navigation

Create canonical default + active variants for:

- Today;
- Library;
- Progress;
- Settings.

Disabled/attention variants should derive from the same geometry rather than being redesigned from scratch.

### Workout-action board prompt

**Target:** `boards/icons/pb-board-workout-actions-v1.png`

> Create a coherent Pixel Bloom fitness-action icon system showing 17 labeled symbols: Start, Resume, Pause, Previous, Next, Complete Set, Complete Workout, Rest, Adjust, Easier, Alternative, Skip, How To, Preview, Finish Early, Cancel and Retry. Every icon must use the same rounded pixel-inspired geometry, stroke weight, optical size and pastel-friendly style. They should remain understandable at 24 px. Present as a clean professional icon specification sheet.

### Utility-action board prompt

**Target:** `boards/icons/pb-board-utility-actions-v1.png`

> Create a coherent Pixel Bloom utility icon family for Search, Filter, Favorite, Theme, Motion, Sound, Export, Import, Backup, Restore, Install, Offline, Reset, Close, Back, More and Info. Use simple rounded pixel-influenced geometry with identical optical size and stroke system. Avoid detailed illustrations. Clear at 20–24 px.

### Status board prompt

> Create a consistent Pixel Bloom status-symbol sheet for Ready, Active, Paused, Resting, Completed, Shortened Workout, Saved, Unsaved, Offline, Warning, Error, Locked, New, Favorite, Familiar, Progression Candidate, Collectible Unlocked, and Evolution Available. Symbols must be simple enough to use as 20–24 px SVG UI indicators. Cozy pastel fitness-game styling, but semantic clarity comes first.

### Energy family prompt

> Design a five-level Pixel Bloom energy indicator family. Represent Empty, Low, Okay, Good and High using one consistent visual metaphor, preferably a small flower/battery/energy-bloom that visibly fills or blossoms as energy increases. It must read instantly at mobile size and look coherent in a horizontal selector.

### Readiness family prompt

> Design a five-state Pixel Bloom physical-readiness icon family representing Sore, Stiff, Okay, Good and Great. Use one consistent body/flower indicator that changes expression or posture progressively. Do not imply medical diagnosis. Keep the icons simple, friendly and mobile-readable.

### Mood family prompt

> Create eight compact Pixel Bloom mood icons for Sleepy, Stressed, Calm, Energized, Motivated, Cozy, Distracted and Focused. Use expressive but simple faces or symbolic motifs from the Pixel Bloom universe. The states must be visually distinct without requiring labels.

### Time family prompt

> Create four Pixel Bloom workout-duration selector icons representing Quick 10, 20 Minutes, 30 Minutes and Full Session. Use a consistent timer/flower-clock metaphor with increasingly complete visual states. Optimize for mobile cards.

### Progress-family prompt

> Create a cohesive Pixel Bloom progression icon system containing a streak flame, streak flower, level star, XP gem, locked milestone, completed milestone, current day, completed day, trophy, collectible marker, evolution symbol, map node, map path and completion check. Friendly collectible-game energy, consistent pastel/pixel geometry, readable at 20–32 px.

### Core component reference board

**Target:** `boards/components/pb-board-core-components-v1.png`

> Create a production UI component board for the Pixel Bloom fitness app. Show mobile-first variants for primary button, secondary button, ghost button, destructive button, icon button, workout card, exercise card, stat card, achievement card, collectible card, chip, tag, segmented control, progress ring, progress bar, timer, check-in selector, bottom navigation, modal, toast, empty-state panel, and workout-player controls. Use the canonical Pixel Bloom palette, rounded pixel panels, excellent readability, large touch targets and restrained decorative details. Include default, pressed, selected, disabled, success and error states where relevant.

### Motion-language board

**Target:** `boards/components/pb-board-motion-language-v1.png`

> Create a Pixel Bloom motion-language reference board that visually explains the intended animation style: tiny sparkle pop, soft bounce, flower bloom, progress pulse, petal burst, collectible reveal, map-node unlock, streak flicker, bunny-ear follow-through, button press squash, achievement pop and gentle idle breathing. Motion should feel lively and game-like but not frantic. Include Full Motion, Reduced Motion and Motion Off behavioral examples.

---

## 12. Creative acceptance gates

### Character gate

Before generating downstream character-heavy packs, verify:

- same skin tone;
- same face construction;
- same hair identity;
- same ear length/shape;
- same body proportions;
- same default outfit design;
- clearly adult;
- recognizable at compact size.

If any of these drift materially, regenerate/revise before proceeding.

### Icon-family gate

Verify:

- consistent stroke/fill weight;
- consistent optical size;
- shared geometry language;
- mobile-scale readability;
- semantic meaning is clear;
- geometry is practical to reproduce/export as SVG.

### Visual-UI gate

Verify creative references support:

- iPhone portrait readability;
- large touch-target visual affordance;
- sufficient visual contrast;
- pixel styling without hurting legibility;
- reduced-motion alternative concept;
- important information remaining HTML/UI text rather than baked into imagery.

---

## 13. Production order

Generate systems before instances:

1. mascot master;
2. app icon;
3. logo;
4. master style board;
5. palette;
6. typography;
7. character turnarounds;
8. navigation;
9. workout actions;
10. utility actions;
11. statuses;
12. check-in families;
13. progress family;
14. component board;
15. motion language;
16. world/environment;
17. progression/collectibles/maps;
18. state illustrations;
19. workout-pack art;
20. exercise media;
21. animation exports;
22. derived app/repo creative exports.

**Transferable rule:** lock reusable visual systems first, then produce instances from those systems. This minimizes style drift and rework.
