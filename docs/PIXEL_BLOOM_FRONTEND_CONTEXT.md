# Pixel Bloom Frontend Integration Context

**Status:** AUTHORITATIVE CREATIVE -> FRONTEND BRIDGE  
**Creative sources:**
- `docs/PIXEL_BLOOM_ASSET_SYSTEM.md`
- `docs/PIXEL_BLOOM_ANIMATION_SYSTEM.md`

**Implementation owner:** Claude Code  
**Creative/art direction owner:** ChatGPT + human owner approval

This document tells implementation exactly how approved creative material should enter the app without turning Claude into the art generator or letting visual work leak into domain behavior.

## 1. Product goal

Pixel Bloom should feel like a lively premium fitness-game world, not a pastel CSS skin.

Required visual layers:

```text
semantic UI foundation
      +
canonical mascot/personality
      +
workout/exercise media
      +
cozy world/environment art
      +
progress/reward visuals
      +
controlled motion
```

The app must remain fast, readable and usable with all decorative motion disabled.

## 2. Division of labor

### ChatGPT creative lane
Produces/reviews:
- mascot master/turnaround/expression art;
- environments/backgrounds;
- workout covers;
- state illustrations;
- collectibles/reward art;
- exercise key poses and animation source art;
- creative boards/prompts;
- visual asset manifests and consistency criteria.

### Claude Code implementation lane
Owns:
- repository asset placement;
- optimization/export tooling;
- SVG/CSS component implementation;
- sprite/frame playback;
- animation wiring;
- React accessibility/state behavior;
- responsive layout;
- caching/offline integration;
- tests/build verification.

Claude should not replace missing approved character/world art with invented lookalikes unless explicitly marked as temporary placeholders.

## 3. Canonical format strategy

### UI icons / simple decoration
**Canonical:** SVG  
Use CSS/currentColor/tokens where practical.

### Static illustrated art
**Canonical:** lossless source PNG; optimized runtime WebP where useful.  
Retain transparent PNG when alpha/editability matters.

### Character / exercise animation
**Canonical editable truth:** ordered PNG frame sequence.  
Derived runtime formats may include:
- sprite sheet;
- animated WebP;
- CSS-driven transforms around layered art;
- GIF preview/review export.

### GIF policy
GIF is allowed and useful for:
- creative review;
- README/docs previews;
- deliberately tiny simple loops;
- fallback demonstrations.

Do not default the whole runtime to GIF. GIF is generally heavier/less controllable than modern alternatives, and a raw looping `<img>` is harder to coordinate with Reduced/Off motion.

MDN image-format reference: https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Image_types

## 4. Runtime motion strategy

Use the lightest controllable technique that matches the asset.

### Prefer CSS/SVG/Web Animations for
- button press/pop;
- chip selection;
- card entry;
- progress fill/pulse;
- timer emphasis;
- tab state;
- simple sparkles/petals;
- map-path reveal;
- small badge effects.

### Prefer frames/sprites/animated WebP for
- mascot breathing/cheering/waving;
- complex reward art;
- exercise loops;
- character evolution scenes;
- authored illustrated ambient loops.

### Never couple
Domain/session correctness must never depend on animation completion.

Bad:
```text
animationend -> save completed set
```

Good:
```text
user action -> durable event/domain transition
               + visual animation as feedback
```

## 5. Exercise animation strategy

Exercise instruction is not the place for unconstrained generative motion.

Preferred production path:

```text
reviewed exercise definition
 -> approved character/model framing
 -> start key pose
 -> mid/key transition poses
 -> finish key pose
 -> human/form review
 -> ordered frame sequence
 -> sprite/WebP runtime export
```

Requirements:
- fixed/controlled camera;
- same character proportions/outfit;
- same equipment geometry;
- readable joints/silhouette;
- motion demonstrates the intended movement rather than decoration;
- no important cue exists only in moving pixels;
- static fallback remains available.

For each production exercise consider:
- hero;
- setup;
- start;
- mid;
- finish;
- alternate angle only when it materially improves understanding;
- sequence strip;
- runtime loop;
- static fallback.

## 6. Current temporary workout-media behavior

The live `MovementMedia` currently alternates/crossfades start and finish photographs. Treat this as a valid temporary fallback, not the finished Pixel Bloom animation system.

Migration path:

```text
current start/finish crossfade
        ↓
approved Pixel Bloom start/mid/finish
        ↓
controlled frame loop / sprite / animated WebP
        ↓
static sequence in Reduced/Off
```

Do not block workout functionality while the richer art library is produced.

## 7. Mascot runtime roles

The mascot should reinforce app state without becoming a chatbot.

Useful placements:
- Today greeting/idle;
- Check-In reaction;
- rest/recovery state;
- workout completion;
- streak/reward reveal;
- empty states;
- progress/evolution milestones.

Do not place constant large animation beside instructional exercise motion if it competes for attention.

### Core mascot animation priority
1. idle/breathe;
2. blink;
3. encourage;
4. cheer/celebrate;
5. rest/calm;
6. thinking;
7. wave;
8. stretch/jog as later flavor.

## 8. Screen visual priority

### Today
Strongest world/character identity. Mascot + current plan + progression/reward signal.

### Check-In
Friendly low-friction reaction states. Avoid visual judgment for low energy/readiness.

### Preview
Readable plan first; illustration second.

### Workout Player
Exercise instruction and set action dominate. Character/world decoration is subordinate.

### Rest
Calm, clearly distinct color/motion state; timer remains focal.

### Complete
Highest celebration budget: mascot, reward, collectible, streak/progression candidate.

### Progress
Game-like collection/evolution/map elements may be richer, but raw fitness history remains inspectable.

### Library
Fast scanning/searching first; thumbnails/covers enhance recognition.

## 9. Motion preference contract

### Full
- mascot loops;
- exercise animation;
- UI micro-motion;
- short reward reveals;
- restrained ambient motion.

### Reduced
- exercise information still visible, preferably sequence/static frames;
- no large parallax/drift;
- replace bounce/travel with fade/small scale;
- fewer/reduced particles;
- mascot mostly static or one-shot subtle reaction.

### Off
- static mascot/illustrations;
- no decorative loops;
- no animated progress effects;
- essential state changes remain immediate and obvious;
- exercise uses static start/finish/sequence.

OS `prefers-reduced-motion` is a fallback even if app preference is Full.

## 10. Accessibility rules for lively visuals

WCAG 2.2 requires special care for moving/flashing content.

Rules:
- avoid flashing more than three times per second or below allowed thresholds;
- auto-start decorative movement lasting more than five seconds must be pausable/stoppable/hidden or globally suppressible through an effective motion control;
- motion never obscures text/controls;
- animation does not move primary tap targets while a user is trying to press them;
- text/instruction is HTML/SVG text, not baked into generated raster art;
- focus indicators remain visible over themed surfaces;
- color is not the only state indicator.

References:
- WCAG 2.2 Pause, Stop, Hide: https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide
- WCAG 2.2 Three Flashes: https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold

## 11. Asset loading / performance

Classify assets by need:

### App-shell critical
- app icon/logo basics;
- nav/control SVGs;
- small required theme primitives.

### Workout critical
- media for curated workout currently being executed;
- static fallback frames.

### Lazy
- large environment boards;
- collectibles not yet visible;
- map regions;
- library thumbnails;
- optional celebration variants.

Do not preload hundreds of decorative assets on Today.

For guaranteed-offline curated workouts, required media must be locally available/cached rather than depending on an upstream host.

## 12. Asset manifest requirements

Each production asset should expose enough metadata for tooling/integration:

```json
{
  "id": "mascot-idle-breathe",
  "category": "mascot-animation",
  "source": "approved-creative",
  "files": {
    "static": "...",
    "fullMotion": "...",
    "sprite": "..."
  },
  "dimensions": [512, 512],
  "loop": true,
  "fps": 8,
  "durationMs": 1500,
  "transparent": true,
  "offlineRequired": false,
  "motionFallback": "static-idle",
  "version": 1
}
```

The exact schema may evolve, but the semantic information should not be hidden in filenames alone.

## 13. Creative consistency gate

Before batching downstream mascot/evolution/exercise art, reject drift in:
- skin tone;
- face identity;
- adult proportions;
- hair silhouette;
- droopy-ear length/shape;
- default outfit language;
- pixel density/render treatment;
- palette relationships.

A technically valid image is not automatically an approved canonical asset.

## 14. Integration acceptance

A Pixel Bloom feature is not done because the art appears on-screen.

Done means:
- approved asset/version used;
- correct Full/Reduced/Off behavior;
- alt/semantic treatment reviewed;
- iPhone portrait layout works;
- asset does not block workout interaction;
- required offline asset is available offline;
- missing asset has graceful fallback;
- no domain logic duplicated or altered by theme;
- performance cost is reasonable;
- visual state matches the relevant product state.

## 15. Near-term creative build order

1. canonical mascot source set;
2. app icon/logo and reusable SVG UI language;
3. Today/check-in/complete state art;
4. core progress/reward/collectible language;
5. cozy gym/world backgrounds and map language;
6. workout cover identity;
7. first 3–5 gold-standard exercise frame loops;
8. validate integration/performance/consistency;
9. batch remaining exercise media;
10. ambient polish last.

This prevents hundreds of inconsistent generated assets from becoming technical debt.