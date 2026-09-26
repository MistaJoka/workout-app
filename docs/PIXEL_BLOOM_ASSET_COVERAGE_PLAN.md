# Pixel Bloom Asset Coverage Plan

**Status:** AUTHORITATIVE FOR ASSET PRODUCTION SCOPE

This document defines which visual assets receive full custom Rae animation versus lighter static/fallback treatment. It exists to prevent an unbounded attempt to hand-animate the entire imported exercise library.

## Principle

Production quality does **not** mean every exercise in the large imported library gets bespoke animation immediately. Production quality means every runtime path has a deliberate, reviewed visual treatment and that custom animation is concentrated on approved canonical content.

## Tier A — Rae identity + app personality

Required before broad exercise animation:

- canonical Rae reference package;
- front / side / back / 3/4 turnarounds;
- portrait pack;
- expression pack;
- outfit/accessory reference;
- bunny-ear/tail geometry reference;
- tattoo placement reference;
- named color palette;
- small-scale silhouette tests;
- mascot animations: idle, blink, cheer, wave, stretch, tired/rest, celebrate, focused;
- state illustrations: offline, empty, recovery, progression, completion.

## Tier B — canonical workout exercises

Every exercise promoted into a first-party curated workout pack receives:

- hero still;
- setup still;
- start pose;
- mid/key pose(s);
- finish pose;
- static sequence strip;
- one instructional loop from a fixed side or front camera;
- sprite sheet + JSON metadata;
- animated WebP preview/runtime fallback when useful;
- GIF preview;
- reduced-motion fallback;
- motion-off fallback;
- alt text;
- form-review checklist and approval state.

### Foundation Strength Starter — current required 9

1. `fs.bodyweight-squat`
2. `fs.incline-push-up`
3. `fs.single-leg-glute-bridge`
4. `fs.dead-bug`
5. `fs.plank`
6. `fs.walking-lunge`
7. `fs.glute-bridge`
8. `fs.crunches`
9. `fs.superman`

These 9 are the first complete production animation batch because they are already referenced by the live starter templates.

## Tier C — P0 promoted exercise media

The existing creative production manifest identifies 25 P0 movements for future promotion:

- chair squat
- bodyweight squat
- goblet squat
- reverse lunge
- step-up
- glute bridge
- dumbbell RDL
- incline push-up
- push-up
- dumbbell chest press
- dumbbell shoulder press
- one-arm dumbbell row
- lat pulldown
- biceps curl
- triceps pushdown
- farmer carry
- plank
- side plank
- dead bug
- bird dog
- brisk walk
- incline treadmill walk
- stationary bike
- cat-cow
- hip flexor stretch

Do not duplicate assets when a P0 movement already exists in Foundation Strength; share stable exercise IDs where product/content truth permits.

## Tier D — imported long-tail library

The large imported library does **not** receive bespoke Rae animation by default.

Runtime treatment hierarchy:

1. approved custom Rae loop, when available;
2. approved static Rae sequence;
3. approved source start/finish imagery already bundled/cached;
4. hero/static source imagery;
5. written instructions.

An imported exercise is promoted into Tier B/C only when it becomes part of an approved first-party workout/program or is frequently used enough to justify production cost.

## Workout covers

Create approved 4:3 cover artwork for the 30 workout IDs in `assets/pixel-bloom/manifests/creative-production-v1.json`. Covers are illustrative and may use more expressive 3/4 Rae poses than instructional media.

## World + reward suite

Required app-level visual suite:

- Pixel Bloom Home Base / gym hub;
- map zones and path/node states;
- 20 badges;
- 25 collectibles;
- workout-complete celebration;
- streak/progression visuals;
- level/evolution visuals;
- empty/offline/error/success illustrations;
- app icon, splash and brand marks;
- four primary navigation icon families;
- action/status/check-in/progress icon families.

## Animation implementation rule

- UI micro-motion: CSS/SVG/React.
- Rae personality motion: sprite sheets + JSON.
- Exercise motion: controlled keyframe sprite animation with fixed camera and reviewed form.
- GIF: preview/documentation, not canonical master.
- Source animation masters and frame sequences are preserved separately from runtime exports.

## Completion definition

The asset suite is production-complete when:

1. Tier A identity/personality assets are approved;
2. all current canonical live-workout exercises have Tier B treatment;
3. every screen/state has an intentional visual/fallback;
4. all shipped assets are registered in `assets/pixel-bloom/db/asset-db.json`;
5. source -> build -> runtime exports are reproducible;
6. asset validation, visual regression, WebKit and offline acceptance pass;
7. no runtime route depends on an unreviewed/generated-only asset;
8. long-tail imported exercises degrade through the documented fallback hierarchy rather than blocking use.

## Build order

1. Freeze Rae identity package.
2. Qualify pipeline with Bodyweight Squat gold master.
3. Complete remaining 8 Foundation Strength exercises.
4. Complete Rae mascot/personality animation suite.
5. Complete screen-state/UI/world/reward assets.
6. Complete remaining unique P0 exercises.
7. Complete workout cover set.
8. Promote additional long-tail exercises only by product need.
