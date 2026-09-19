# Pixel Bloom Animation System

**Status:** AUTHORITATIVE FOR PIXEL BLOOM CREATIVE MOTION PRODUCTION  
**Version:** 1.0-draft  
**Owner boundary:** ChatGPT creates creative motion specifications and animation assets. **Claude Code owns application implementation/integration.**  
**Depends on:** `docs/PIXEL_BLOOM_ASSET_SYSTEM.md`  
**Does not override:** `CLAUDE.md` or `docs/SOURCE_OF_TRUTH_V06.md` for runtime behavior, architecture, persistence, navigation, or domain logic.

---

## 1. Motion goal

Pixel Bloom should feel alive, cozy, rewarding, responsive, encouraging, polished, and game-like without becoming chaotic, distracting, battery-hungry, or visually noisy.

Core principle:

```text
clarity -> feedback -> delight
```

---

## 2. Motion modes

### Full

- mascot loops;
- screen transitions;
- reward reveals;
- ambient effects;
- exercise loops;
- UI micro-motion.

### Reduced

- remove decorative drifting;
- shorten transitions;
- replace bounce with fade/scale;
- reduce particles;
- reduce looping effects;
- preserve essential exercise playback.

### Off

- no ambient loops;
- no decorative motion;
- no bounce/particles;
- static character illustrations where possible;
- only essential state-change feedback;
- exercise media may fall back to static sequence/stills where implementation chooses.

---

## 3. Canonical creative formats

### Character and exercise animation

```text
PNG frame sequence = neutral creative source
-> sprite sheet
-> animated WebP
-> GIF preview
```

### Simple UI motion

Prefer implementation specifications based on SVG/CSS transforms rather than raster animation files.

### Decorative/reward effects

Use frame sequence or sprite sheet with WebP/GIF preview where useful.

---

## 4. Naming

Use:

`pb-anim-[group]-[name]-v1.[ext]`

Examples:

```text
pb-anim-mascot-idle-breathe-v1.gif
pb-anim-mascot-idle-breathe-v1.webp
pb-anim-mascot-idle-breathe-spritesheet-v1.png
pb-anim-ui-button-pop-v1.gif
pb-anim-reward-badge-unlock-v1.gif
pb-anim-map-node-unlock-v1.gif
```

Exercise animation naming:

```text
pb-exercise-[exercise-id]-loop-v1.gif
pb-exercise-[exercise-id]-loop-v1.webp
pb-exercise-[exercise-id]-spritesheet-v1.png
```

Frame-folder convention:

```text
animations/exports/frames/pb-anim-mascot-idle-breathe-v1/
  0001.png
  0002.png
  0003.png
```

---

## 5. Timing guidance

| Animation type | FPS |
|---|---:|
| subtle idle | 6-8 |
| mascot expressive | 8-12 |
| UI micro-motion | 10-14 equivalent |
| reward reveals | 10-14 |
| exercise loops | 8-12 |
| ambient effects | 4-8 |

Typical durations:

| Motion type | Duration |
|---|---:|
| button feedback | 120-180 ms |
| chip/select feedback | 120-180 ms |
| panel transition | 160-220 ms |
| toast/modal entry | 180-260 ms |
| badge unlock | 500-900 ms |
| collectible reveal | 600-1000 ms |
| mascot idle loop | 1.2-2.5 s |
| exercise loop | 1.2-3 s |
| ambient loop | 2-6 s |

---

## 6. Mascot motion pack

Required creative set:

1. idle breathe;
2. blink;
3. happy bounce;
4. cheer;
5. wave;
6. sleepy nod;
7. stretch;
8. jog in place;
9. celebrate;
10. trophy raise;
11. thinking;
12. encourage gesture.

Filenames:

```text
pb-anim-mascot-idle-breathe-v1
pb-anim-mascot-blink-v1
pb-anim-mascot-happy-bounce-v1
pb-anim-mascot-cheer-v1
pb-anim-mascot-wave-v1
pb-anim-mascot-sleepy-nod-v1
pb-anim-mascot-stretch-v1
pb-anim-mascot-jog-loop-v1
pb-anim-mascot-celebrate-v1
pb-anim-mascot-trophy-raise-v1
pb-anim-mascot-thinking-v1
pb-anim-mascot-encourage-v1
```

Creative constraints:

- preserve mascot identity exactly;
- soft ear follow-through;
- no aggressive squash/stretch;
- calm idle energy;
- face remains readable and recognizable.

---

## 7. Exercise animation pack

Each approved exercise should eventually support:

1. hero still;
2. start;
3. mid;
4. finish;
5. sequence strip;
6. loop animation;
7. setup still;
8. alternate angle;
9. optional compact loop;
10. optional alternate-angle loop.

Loop rules:

- fixed camera;
- consistent subject and outfit;
- simple neutral/coherent environment;
- readable silhouette;
- motion shows form clearly;
- no distracting visual effects;
- instructional clarity over spectacle.

---

## 8. UI micro-motion pack

Creative behavior specifications:

1. button pop;
2. chip select pop;
3. card tap/lift;
4. progress pulse;
5. timer pulse;
6. toast entry;
7. tab transition;
8. nav active change;
9. complete check pop;
10. card expand/collapse.

Most of these should be handed to Claude Code as timing/transform specs rather than raster animation files.

---

## 9. Reward / progression motion

Required set:

1. badge unlock;
2. collectible reveal;
3. streak pop;
4. level-up bloom;
5. evolution glow;
6. map-node unlock;
7. reward chest open;
8. weekly goal complete;
9. workout-complete burst;
10. new-area unlock.

Creative behavior:

- short and rewarding;
- bloom/petal/sparkle motifs;
- never block progress unnecessarily;
- preserve text/UI readability.

---

## 10. Ambient motion

Optional/subtle set:

- sparkle twinkle;
- flower shimmer;
- petal drift;
- cloud drift;
- trophy sparkle;
- room glow pulse;
- decor shimmer.

Ambient motion must never compete with the user's active task.

---

## 11. Screen motion map

### Today
- mascot idle breathe/blink;
- subtle card entry;
- progress pulse;
- optional tiny ambient sparkle.

### Check-In
- chip/select feedback;
- mascot reaction;
- confirmation motion.

### Session Preview
- workout-card reveal;
- plan expand/collapse;
- CTA feedback.

### Workout Player
- exercise loop;
- exercise transition;
- timer pulse;
- set-complete feedback;
- calm rest transition.

### Rest
- subtle rest mascot/ambient loop;
- timer pulse only.

### Complete
- badge/reward reveal;
- streak pop;
- collectible reveal;
- mascot celebrate.

### Progress
- ring fill;
- counters/markers reveal;
- evolution hint;
- streak flicker.

### Library
- card tap;
- filter/select feedback;
- thumbnail fade.

### Settings
- toggle feedback;
- theme preview;
- motion-mode preview.

### Map / Collectibles
- node unlock;
- path fill;
- chest open;
- collectible reveal;
- evolution glow.

---

## 12. Reduced-motion mapping

| Full | Reduced |
|---|---|
| bounce | fade/scale |
| drifting particles | remove or sparse |
| looping ambience | static/near-static |
| reward burst | shorter pop/fade |
| mascot animated idle | slower or one cycle |
| long reveal | shortened reveal |
| map-path animation | simple fill |
| animated background | static background |

---

## 13. Production order

### Phase 1 — core feel

1. mascot idle breathe;
2. mascot blink;
3. button pop;
4. chip select;
5. progress pulse;
6. timer pulse;
7. workout-complete burst.

### Phase 2 — reward feel

8. streak pop;
9. badge unlock;
10. collectible reveal;
11. map-node unlock;
12. level-up bloom.

### Phase 3 — content motion

13. first exercise-loop pack;
14. next-exercise transition behavior;
15. rest-state motion.

### Phase 4 — ambient polish

16. sparkles;
17. petals;
18. room twinkle;
19. trophy sparkle.

---

## 14. First production animation batch

### Mascot

```text
pb-anim-mascot-idle-breathe-v1
pb-anim-mascot-blink-v1
pb-anim-mascot-cheer-v1
```

### UI

```text
pb-anim-ui-button-pop-v1
pb-anim-ui-chip-select-v1
pb-anim-ui-progress-pulse-v1
pb-anim-ui-timer-pulse-v1
```

### Rewards

```text
pb-anim-reward-workout-complete-v1
pb-anim-reward-badge-unlock-v1
pb-anim-reward-streak-pop-v1
```

### Exercise starter loops

```text
pb-exercise-squat-loop-v1
pb-exercise-push-up-loop-v1
pb-exercise-band-row-loop-v1
pb-exercise-dead-bug-loop-v1
pb-exercise-step-up-loop-v1
pb-exercise-hip-flexor-stretch-loop-v1
```

---

## 15. Creative handoff metadata

Every delivered animation should include:

- ID;
- filename base;
- purpose;
- intended screens;
- dimensions;
- frame count;
- FPS;
- duration;
- loop yes/no;
- exported formats;
- transparency;
- Full/Reduced/Off behavior;
- creative notes.

Example:

```json
{
  "id": "mascot-idle-breathe",
  "filenameBase": "pb-anim-mascot-idle-breathe-v1",
  "usage": ["today", "empty-states", "progress"],
  "dimensions": "512x512",
  "frames": 12,
  "fps": 8,
  "durationMs": 1500,
  "loop": true,
  "formats": ["gif", "webp", "spritesheet", "frames"],
  "transparentBackground": true,
  "reducedMotion": "slow one-cycle or subtle fade",
  "motionOff": "static mascot idle still"
}
```

---

## 16. Creative QA gate

Before an animation is approved:

- mascot identity remains stable;
- exercise form is readable;
- loops do not visibly jump;
- ear/hair follow-through is coherent;
- transparency edges are clean;
- frame dimensions are consistent;
- motion remains legible on iPhone-sized UI;
- reduced/off fallback exists in the creative handoff;
- no implementation code is authored here; Claude Code owns integration.
