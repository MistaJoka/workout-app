# Dance break: ChatGPT art prompts

A 2-minute dance break: Rae dances six easy moves of about 20 seconds each, and she dances along. Every frame is a whole drawing of Rae (frame strips, no rigs). Feet stay on the floor; nothing needs equipment.

## How to use

**Run order.** 1 → 6, one at a time, in the **Rae chat** that holds her bible. After each one, check it against its QA list before asking for the next.

**Attach to every prompt:**
- `assets/pixel-bloom/character/rae/reference/pb-rae-character-bible-v1.png`: the canonical Rae raster (required).
- `public/rae/full-front.png`: her front-view figure, cropped pixel-for-pixel from that bible. It's the camera to match.
- Only if a result drifts: `assets/pixel-bloom/character/rae/reference/rae-hardened-reference-v1.png` (secondary).
- Don't attach earlier strips. None are approved yet, so they'd pass their drift along.

**Review.** Any unchecked box means a redraw. Write the result the way the QA gate does, e.g. `REGENERATE: Gate 2 tattoo on right side in frame 3`. For a fix, ask ChatGPT to redraw only that defect and keep everything else.

**Hand back.**
1. Rename each approved image to the filename in its spec.
2. Drop it in `assets/pixel-bloom/character/rae/source/dance/`.
3. A redraw is `-v2`, so the old file stays.
4. Don't commit them (they're large). Tell Claude Code "dance art is in" and give each file's QA result.

## Playback proposal (for Claude Code to implement later)

- **Tempo.** One drawn pose per beat at 120 BPM (500 ms = 4 ticks at fps 8, the builder's default tick). Each move has an `order` that reuses frames, so no near-duplicate frames get drawn.
- **Length.** Each move loops to fill about 20 s; 6 moves ≈ 2 min. The finish ends on its last frame, held.
- **Build.** Each strip goes through `build-rae-frames.py` with `--anchor grid` (feet move, so the foot anchor would drag her around). It then needs a `strips.json` entry, and the dance moves need `rae.dance-*` ids like `raeMoves.ts` (provenance `draft`).
- **Text.** Visible text is the move's name only. Rae faces you like a mirror: "screen-left" is your left.
- **Motion.** Reduced/off shows the listed key stills side by side, so the moves stay readable. No audio is included (see the decisions below).
- **Grapevine.** It's drawn in place. Optionally, Claude Code can slide the whole sprite a few px with the steps; that's not a rig, but it's your call.

| # | Move | Frames | Order (beats) | Cycle | Loops ≈ 20 s | Reduced/off stills |
|---|---|---|---|---|---|---|
| 1 | Step-touch with arm swing | 4 | `0,1,2,3` | 2 s | 10 (= 20 s) | 0,2 |
| 2 | Grapevine (in place) | 6 | `0,1,0,2,3,4,3,5` | 4 s | 5 (= 20 s) | 0,1,2 |
| 3 | Rainbow arms (arm waves) | 5 | `0,1,2,3,4,3,2,1` | 4 s | 5 (= 20 s) | 0,2,4 |
| 4 | Hip sway with snaps | 3 | `0,1,2,1` | 2 s | 10 (= 20 s) | 0,2 |
| 5 | Shoulder pops with knee bounce | 3 | `0,1,0,2` | 2 s | 10 (= 20 s) | 1,2 |
| 6 | Celebration finish (no spin) | 4 | `0,1,0,1,2,3` | 4 s | 5 (= 20 s) | 2,3 |

`hold` per move (fps 8): see each spec. Total ≈ 6 × 20 s = 120 s.

---

### 1. Step-touch with arm swing (4 frames)

**Purpose:** Warm-up groove: side to side with a clap.

**Output spec**
- File: `dance-step-touch-strip-v1.png` → `assets/pixel-bloom/character/rae/source/dance/`
- 1536×1024, one row of 4 frames in 4 equal columns, flat `#FF00FF`, front view
- Playback proposal: fps 8, order `0,1,2,3`, hold `0:4,1:4,2:4,3:4`, `--anchor grid`, stills `0,2`

**Attach**
- `assets/pixel-bloom/character/rae/reference/pb-rae-character-bible-v1.png`
- `public/rae/full-front.png`

**Prompt** (paste as one message)

```text
Rae is a locked Pixel Bloom character. Preserve her canonical identity exactly. She is an adult Black bunny girl with warm medium-deep brown skin, black 4C natural hair in a voluminous natural updo/puff with tight coils and a few loose tendrils, exactly two tan bunny ears with soft flesh-pink inner ears emerging from the upper hair, no human ears, one small brown bunny tail, thin round gold glasses, exactly one owner-supplied black/gray lotus tattoo under the anatomical left collarbone near the shoulder and slightly beneath the left top strap, a thin gold chain with a small letter A pendant worn for her husband, thin dainty layered gold rings only, a pink fitted Pixel Bloom training top, lavender high-waisted leggings, and black-and-white Panda-Dunk-inspired genericized low-top sneakers. Render in stylized premium high-bit late-handheld/GBA-era pixel art, never photoreal. Do not invent or alter canonical anatomy, accessories, colors, tattoo count/location, hair texture, or identity. Match the approved Rae v1 character bible image exactly: same face, proportions, palette and pixel style. Never: human ears, a headband or clip-on ears, cat or fox ears, a missing or extra bunny ear, straight/wavy/silky hair, a second tattoo, a tattoo on the shoulder, outer arm, right side, neck, face or back, a white or pink tail, a cat/fox tail, more than one tail, an oversized tail, removed or restyled glasses (square, rimless, silver/black or sunglasses), a different necklace letter, a missing pendant or a silver chain, chunky jewelry, an added jacket/shorts/skirt/gloves or socks, a removed Pixel Bloom logo, photoreal skin, a child/teen look, or any identity change between frames.

Also keep exactly as in the attached Rae reference: her face, her proportions (about 7.5 heads tall), and her lavender wristbands. Her shoes have no logo of any kind. Rae's own ears stay her semi-upright tan bunny ears with flesh-pink insides at all times.

TASK: Rae leads a gentle beginner dance break. Draw ONE animation strip of the dance move "Step-touch with arm swing", 4 frames. Every frame is a complete drawing of Rae, whole body, head to shoes.

STRIP FORMAT:
- One wide 1536x1024 image: one row of 4 frames on flat solid #FF00FF magenta. No text, numbers, labels, borders, separator lines, floor, mat, scenery or shadows.
- Split the width into 4 equal invisible columns and center Rae in each column. Scale Rae so her widest pose still fits inside its column, with clear magenta between neighbouring figures: no touching, no overlap.
- Same scale, same camera, same floor line in every frame. Front view, facing the viewer, like the FRONT figure in the attached reference. Her hips stay centered in her column; only her feet and arms move the way each frame says. Feet stay on the floor in every frame: no jumps, no spins.
- Keep her head on the same side in every frame (never mirror a frame). In a front view her lotus tattoo is on the viewer's right, because that is her anatomical left; it stays there in every frame.
- "Screen-left" and "screen-right" are as the viewer sees the image. Her right side is on screen-left.
- Light, friendly beginner dance: knees soft, movements easy and low-impact.

FRAMES (left to right):
1. She steps her right foot out toward screen-left into an easy wide stance, knees soft, weight shifting onto that foot. Both arms swing low together toward screen-left, elbows soft. Smiling (canonical "smile").
2. Her left foot taps in beside her right foot: toes touching the floor, heel lifted, feet close together, weight on her right foot. Her hands meet in a light clap in front of her belly, below her chest.
3. She steps her left foot out toward screen-right into an easy wide stance, knees soft, weight shifting onto that foot. Both arms swing low together toward screen-right.
4. Her right foot taps in beside her left foot: toes touching the floor, heel lifted, feet close together, weight on her left foot. Light clap in front of her belly, below her chest.

Expression: warm and playful (canonical expressions as named; otherwise canonical "smile"). Gaze toward the viewer or natural, never forced. Secondary motion only: a little hair and ear bounce, the necklace swaying slightly.

CONSISTENCY: identical Rae identity, proportions, hair, two bunny ears, glasses, A pendant, single lotus tattoo spot, rings, outfit, wristbands and shoes in every frame. Same camera, same scale, same floor line. Only the joints each frame describes change.
```

**Negative / must-not** (paste in the same message, right after the prompt)

```text
Do not draw: jumping, hopping, both feet off the floor, spinning, turning her back, kneeling or floor moves; a mirrored frame (her head or tattoo switching sides); hands covering her face, glasses or A pendant; arms hiding or bending her bunny ears; extra or missing fingers, hands or limbs; motion lines, music notes, sparkles, hearts, speech bubbles or any effect; a microphone, props or equipment; a floor, mat, stage, spotlight, shadow or scenery; text, numbers, labels, arrows or watermarks; a changed outfit, hairstyle or body shape between frames.
```

**QA checklist**
- [ ] **Gate 1 anatomy:** exactly two tan bunny ears with flesh-pink insides, semi-upright; **no human ear anywhere**; brown tail only where the view shows it; no duplicate limbs, fingers or accessories.
- [ ] **Gate 1 hair/face:** black 4C updo/puff with tight coils (not straight, wavy or a tiny puff); adult woman; stylized pixel face, not photoreal; warm medium-deep brown skin, not lightened.
- [ ] **Gate 2 signature details:** thin round gold glasses; exactly one lotus tattoo under her **anatomical left** collarbone (viewer-right in a front view), not on the shoulder cap, arm or right side; small A pendant on a thin gold chain (never R); rings thin and dainty only.
- [ ] **Gate 3 outfit:** pink fitted Pixel Bloom top, lavender high-waisted leggings, black-and-white low-top sneakers with no logo; lavender wristbands as in the reference; no added socks, jacket or gloves.
- [ ] **Gate 4 body:** adult curvy, strong, athletic proportions match the bible; no waist shrink, no bust/hip exaggeration, limb lengths stable.
- [ ] **Gate 5 pixel art:** high-bit GBA-era clusters, selout, crisp silhouette, no blur or smooth paint.
- [ ] **Gate 6 pose/gaze:** each frame matches its numbered description; gaze natural; no pin-up posing.
- [ ] **Gate 7 continuity:** fixed camera and scale; the same face, hair mass, ear bases, glasses, tattoo spot, necklace, outfit and shoes in every frame; her head never switches sides (no mirrored frame); no identity pop at the loop seam.
- [ ] **Gate 9 file:** 1536x1024, flat #FF00FF, exactly 4 figures in 4 equal columns with clear magenta gaps; no text, floor or shadow.
- [ ] **Move reads:** someone who has never danced could copy it from the frames; it matches the move name.
- [ ] **Feet:** at least one foot on the floor in every frame; no jump or spin; the stepping feet go where the frame says.
- [ ] **Nothing hidden:** hands and arms never cover her face, glasses or A pendant; the ears are never bent or cut off by her arms.
- [ ] **Final question (QA gate):** with the bible hidden, is this unmistakably the same Rae? If not clearly yes, it is not approved.

### 2. Grapevine (in place) (6 frames)

**Purpose:** The classic travelling step, drawn in place: step, cross behind, step, tap and clap. 4 counts each way.

**Output spec**
- File: `dance-grapevine-strip-v1.png` → `assets/pixel-bloom/character/rae/source/dance/`
- 1536×1024, one row of 6 frames in 6 equal columns, flat `#FF00FF`, front view
- Playback proposal: fps 8, order `0,1,0,2,3,4,3,5`, hold `0:4,1:4,2:4,3:4,4:4,5:4`, `--anchor grid`, stills `0,1,2`

**Attach**
- `assets/pixel-bloom/character/rae/reference/pb-rae-character-bible-v1.png`
- `public/rae/full-front.png`

**Prompt** (paste as one message)

```text
Rae is a locked Pixel Bloom character. Preserve her canonical identity exactly. She is an adult Black bunny girl with warm medium-deep brown skin, black 4C natural hair in a voluminous natural updo/puff with tight coils and a few loose tendrils, exactly two tan bunny ears with soft flesh-pink inner ears emerging from the upper hair, no human ears, one small brown bunny tail, thin round gold glasses, exactly one owner-supplied black/gray lotus tattoo under the anatomical left collarbone near the shoulder and slightly beneath the left top strap, a thin gold chain with a small letter A pendant worn for her husband, thin dainty layered gold rings only, a pink fitted Pixel Bloom training top, lavender high-waisted leggings, and black-and-white Panda-Dunk-inspired genericized low-top sneakers. Render in stylized premium high-bit late-handheld/GBA-era pixel art, never photoreal. Do not invent or alter canonical anatomy, accessories, colors, tattoo count/location, hair texture, or identity. Match the approved Rae v1 character bible image exactly: same face, proportions, palette and pixel style. Never: human ears, a headband or clip-on ears, cat or fox ears, a missing or extra bunny ear, straight/wavy/silky hair, a second tattoo, a tattoo on the shoulder, outer arm, right side, neck, face or back, a white or pink tail, a cat/fox tail, more than one tail, an oversized tail, removed or restyled glasses (square, rimless, silver/black or sunglasses), a different necklace letter, a missing pendant or a silver chain, chunky jewelry, an added jacket/shorts/skirt/gloves or socks, a removed Pixel Bloom logo, photoreal skin, a child/teen look, or any identity change between frames.

Also keep exactly as in the attached Rae reference: her face, her proportions (about 7.5 heads tall), and her lavender wristbands. Her shoes have no logo of any kind. Rae's own ears stay her semi-upright tan bunny ears with flesh-pink insides at all times.

TASK: Rae leads a gentle beginner dance break. Draw ONE animation strip of the dance move "Grapevine (in place)", 6 frames. Every frame is a complete drawing of Rae, whole body, head to shoes.

STRIP FORMAT:
- One wide 1536x1024 image: one row of 6 frames on flat solid #FF00FF magenta. No text, numbers, labels, borders, separator lines, floor, mat, scenery or shadows.
- Split the width into 6 equal invisible columns and center Rae in each column. Scale Rae so her widest pose still fits inside its column, with clear magenta between neighbouring figures: no touching, no overlap.
- Same scale, same camera, same floor line in every frame. Front view, facing the viewer, like the FRONT figure in the attached reference. Her hips stay centered in her column; only her feet and arms move the way each frame says. Feet stay on the floor in every frame: no jumps, no spins.
- Keep her head on the same side in every frame (never mirror a frame). In a front view her lotus tattoo is on the viewer's right, because that is her anatomical left; it stays there in every frame.
- "Screen-left" and "screen-right" are as the viewer sees the image. Her right side is on screen-left.
- Light, friendly beginner dance: knees soft, movements easy and low-impact.

FRAMES (left to right):
1. Step out toward screen-left: her right foot steps wide toward screen-left, feet apart, knees soft. Elbows bent, hands loosely in front at waist height.
2. Cross behind toward screen-left: her left foot crosses behind her right leg, the legs crossed at the shins, the back foot on its toes. Body still facing the viewer, hips level.
3. Tap and clap toward screen-left: feet together, left toes tapping beside the right foot, both hands clapping out toward screen-left at shoulder height, off to the side of her body (not in front of her face or chest).
4. Step out toward screen-right: her left foot steps wide toward screen-right, feet apart, knees soft. Elbows bent, hands loosely in front at waist height.
5. Cross behind toward screen-right: her right foot crosses behind her left leg, the legs crossed at the shins, the back foot on its toes. Body still facing the viewer, hips level.
6. Tap and clap toward screen-right: feet together, right toes tapping beside the left foot, both hands clapping out toward screen-right at shoulder height, off to the side of her body.

Expression: warm and playful (canonical expressions as named; otherwise canonical "smile"). Gaze toward the viewer or natural, never forced. Secondary motion only: a little hair and ear bounce, the necklace swaying slightly.

CONSISTENCY: identical Rae identity, proportions, hair, two bunny ears, glasses, A pendant, single lotus tattoo spot, rings, outfit, wristbands and shoes in every frame. Same camera, same scale, same floor line. Only the joints each frame describes change.
```

**Negative / must-not** (paste in the same message, right after the prompt)

```text
Do not draw: jumping, hopping, both feet off the floor, spinning, turning her back, kneeling or floor moves; a mirrored frame (her head or tattoo switching sides); hands covering her face, glasses or A pendant; arms hiding or bending her bunny ears; extra or missing fingers, hands or limbs; motion lines, music notes, sparkles, hearts, speech bubbles or any effect; a microphone, props or equipment; a floor, mat, stage, spotlight, shadow or scenery; text, numbers, labels, arrows or watermarks; a changed outfit, hairstyle or body shape between frames.
```

**QA checklist**
- [ ] **Gate 1 anatomy:** exactly two tan bunny ears with flesh-pink insides, semi-upright; **no human ear anywhere**; brown tail only where the view shows it; no duplicate limbs, fingers or accessories.
- [ ] **Gate 1 hair/face:** black 4C updo/puff with tight coils (not straight, wavy or a tiny puff); adult woman; stylized pixel face, not photoreal; warm medium-deep brown skin, not lightened.
- [ ] **Gate 2 signature details:** thin round gold glasses; exactly one lotus tattoo under her **anatomical left** collarbone (viewer-right in a front view), not on the shoulder cap, arm or right side; small A pendant on a thin gold chain (never R); rings thin and dainty only.
- [ ] **Gate 3 outfit:** pink fitted Pixel Bloom top, lavender high-waisted leggings, black-and-white low-top sneakers with no logo; lavender wristbands as in the reference; no added socks, jacket or gloves.
- [ ] **Gate 4 body:** adult curvy, strong, athletic proportions match the bible; no waist shrink, no bust/hip exaggeration, limb lengths stable.
- [ ] **Gate 5 pixel art:** high-bit GBA-era clusters, selout, crisp silhouette, no blur or smooth paint.
- [ ] **Gate 6 pose/gaze:** each frame matches its numbered description; gaze natural; no pin-up posing.
- [ ] **Gate 7 continuity:** fixed camera and scale; the same face, hair mass, ear bases, glasses, tattoo spot, necklace, outfit and shoes in every frame; her head never switches sides (no mirrored frame); no identity pop at the loop seam.
- [ ] **Gate 9 file:** 1536x1024, flat #FF00FF, exactly 6 figures in 6 equal columns with clear magenta gaps; no text, floor or shadow.
- [ ] **Move reads:** someone who has never danced could copy it from the frames; it matches the move name.
- [ ] **Feet:** at least one foot on the floor in every frame; no jump or spin; the stepping feet go where the frame says.
- [ ] **Nothing hidden:** hands and arms never cover her face, glasses or A pendant; the ears are never bent or cut off by her arms.
- [ ] **Final question (QA gate):** with the bible hidden, is this unmistakably the same Rae? If not clearly yes, it is not approved.

### 3. Rainbow arms (arm waves) (5 frames)

**Purpose:** A slow, flowing arm wave from side to side over the head. Feet stay put.

**Output spec**
- File: `dance-rainbow-arms-strip-v1.png` → `assets/pixel-bloom/character/rae/source/dance/`
- 1536×1024, one row of 5 frames in 5 equal columns, flat `#FF00FF`, front view
- Playback proposal: fps 8, order `0,1,2,3,4,3,2,1`, hold `0:4,1:4,2:4,3:4,4:4`, `--anchor grid`, stills `0,2,4`

**Attach**
- `assets/pixel-bloom/character/rae/reference/pb-rae-character-bible-v1.png`
- `public/rae/full-front.png`

**Prompt** (paste as one message)

```text
Rae is a locked Pixel Bloom character. Preserve her canonical identity exactly. She is an adult Black bunny girl with warm medium-deep brown skin, black 4C natural hair in a voluminous natural updo/puff with tight coils and a few loose tendrils, exactly two tan bunny ears with soft flesh-pink inner ears emerging from the upper hair, no human ears, one small brown bunny tail, thin round gold glasses, exactly one owner-supplied black/gray lotus tattoo under the anatomical left collarbone near the shoulder and slightly beneath the left top strap, a thin gold chain with a small letter A pendant worn for her husband, thin dainty layered gold rings only, a pink fitted Pixel Bloom training top, lavender high-waisted leggings, and black-and-white Panda-Dunk-inspired genericized low-top sneakers. Render in stylized premium high-bit late-handheld/GBA-era pixel art, never photoreal. Do not invent or alter canonical anatomy, accessories, colors, tattoo count/location, hair texture, or identity. Match the approved Rae v1 character bible image exactly: same face, proportions, palette and pixel style. Never: human ears, a headband or clip-on ears, cat or fox ears, a missing or extra bunny ear, straight/wavy/silky hair, a second tattoo, a tattoo on the shoulder, outer arm, right side, neck, face or back, a white or pink tail, a cat/fox tail, more than one tail, an oversized tail, removed or restyled glasses (square, rimless, silver/black or sunglasses), a different necklace letter, a missing pendant or a silver chain, chunky jewelry, an added jacket/shorts/skirt/gloves or socks, a removed Pixel Bloom logo, photoreal skin, a child/teen look, or any identity change between frames.

Also keep exactly as in the attached Rae reference: her face, her proportions (about 7.5 heads tall), and her lavender wristbands. Her shoes have no logo of any kind. Rae's own ears stay her semi-upright tan bunny ears with flesh-pink insides at all times.

TASK: Rae leads a gentle beginner dance break. Draw ONE animation strip of the dance move "Rainbow arms (arm waves)", 5 frames. Every frame is a complete drawing of Rae, whole body, head to shoes.

STRIP FORMAT:
- One wide 1536x1024 image: one row of 5 frames on flat solid #FF00FF magenta. No text, numbers, labels, borders, separator lines, floor, mat, scenery or shadows.
- Split the width into 5 equal invisible columns and center Rae in each column. Scale Rae so her widest pose still fits inside its column, with clear magenta between neighbouring figures: no touching, no overlap.
- Same scale, same camera, same floor line in every frame. Front view, facing the viewer, like the FRONT figure in the attached reference. Her hips stay centered in her column; only her feet and arms move the way each frame says. Feet stay on the floor in every frame: no jumps, no spins.
- Keep her head on the same side in every frame (never mirror a frame). In a front view her lotus tattoo is on the viewer's right, because that is her anatomical left; it stays there in every frame.
- "Screen-left" and "screen-right" are as the viewer sees the image. Her right side is on screen-left.
- Light, friendly beginner dance: knees soft, movements easy and low-impact.

FRAMES (left to right):
1. Feet planted a bit wider than her hips, knees softly bent. Both arms extended low and out toward screen-left, torso leaning slightly toward screen-left.
2. Knees a little straighter. Both arms raised on a diagonal up toward screen-left, hands at about head height.
3. Knees straight but soft. Both arms overhead in a rainbow arc, hands near each other above and slightly in front of her bunny ears. The ears stay fully visible and unbent. Face fully visible under the arms.
4. Knees a little straighter. Both arms on a diagonal up toward screen-right, hands at about head height.
5. Knees softly bent. Both arms extended low and out toward screen-right, torso leaning slightly toward screen-right.

Expression: warm and playful (canonical expressions as named; otherwise canonical "smile"). Gaze toward the viewer or natural, never forced. Secondary motion only: a little hair and ear bounce, the necklace swaying slightly.

CONSISTENCY: identical Rae identity, proportions, hair, two bunny ears, glasses, A pendant, single lotus tattoo spot, rings, outfit, wristbands and shoes in every frame. Same camera, same scale, same floor line. Only the joints each frame describes change.
```

**Negative / must-not** (paste in the same message, right after the prompt)

```text
Do not draw: jumping, hopping, both feet off the floor, spinning, turning her back, kneeling or floor moves; a mirrored frame (her head or tattoo switching sides); hands covering her face, glasses or A pendant; arms hiding or bending her bunny ears; extra or missing fingers, hands or limbs; motion lines, music notes, sparkles, hearts, speech bubbles or any effect; a microphone, props or equipment; a floor, mat, stage, spotlight, shadow or scenery; text, numbers, labels, arrows or watermarks; a changed outfit, hairstyle or body shape between frames.
```

**QA checklist**
- [ ] **Gate 1 anatomy:** exactly two tan bunny ears with flesh-pink insides, semi-upright; **no human ear anywhere**; brown tail only where the view shows it; no duplicate limbs, fingers or accessories.
- [ ] **Gate 1 hair/face:** black 4C updo/puff with tight coils (not straight, wavy or a tiny puff); adult woman; stylized pixel face, not photoreal; warm medium-deep brown skin, not lightened.
- [ ] **Gate 2 signature details:** thin round gold glasses; exactly one lotus tattoo under her **anatomical left** collarbone (viewer-right in a front view), not on the shoulder cap, arm or right side; small A pendant on a thin gold chain (never R); rings thin and dainty only.
- [ ] **Gate 3 outfit:** pink fitted Pixel Bloom top, lavender high-waisted leggings, black-and-white low-top sneakers with no logo; lavender wristbands as in the reference; no added socks, jacket or gloves.
- [ ] **Gate 4 body:** adult curvy, strong, athletic proportions match the bible; no waist shrink, no bust/hip exaggeration, limb lengths stable.
- [ ] **Gate 5 pixel art:** high-bit GBA-era clusters, selout, crisp silhouette, no blur or smooth paint.
- [ ] **Gate 6 pose/gaze:** each frame matches its numbered description; gaze natural; no pin-up posing.
- [ ] **Gate 7 continuity:** fixed camera and scale; the same face, hair mass, ear bases, glasses, tattoo spot, necklace, outfit and shoes in every frame; her head never switches sides (no mirrored frame); no identity pop at the loop seam.
- [ ] **Gate 9 file:** 1536x1024, flat #FF00FF, exactly 5 figures in 5 equal columns with clear magenta gaps; no text, floor or shadow.
- [ ] **Move reads:** someone who has never danced could copy it from the frames; it matches the move name.
- [ ] **Feet:** at least one foot on the floor in every frame; no jump or spin; the stepping feet go where the frame says.
- [ ] **Nothing hidden:** hands and arms never cover her face, glasses or A pendant; the ears are never bent or cut off by her arms.
- [ ] **Final question (QA gate):** with the bible hidden, is this unmistakably the same Rae? If not clearly yes, it is not approved.

### 4. Hip sway with snaps (3 frames)

**Purpose:** Easy hip sway, side to side, with finger snaps.

**Output spec**
- File: `dance-hip-sway-strip-v1.png` → `assets/pixel-bloom/character/rae/source/dance/`
- 1536×1024, one row of 3 frames in 3 equal columns, flat `#FF00FF`, front view
- Playback proposal: fps 8, order `0,1,2,1`, hold `0:4,1:4,2:4`, `--anchor grid`, stills `0,2`

**Attach**
- `assets/pixel-bloom/character/rae/reference/pb-rae-character-bible-v1.png`
- `public/rae/full-front.png`

**Prompt** (paste as one message)

```text
Rae is a locked Pixel Bloom character. Preserve her canonical identity exactly. She is an adult Black bunny girl with warm medium-deep brown skin, black 4C natural hair in a voluminous natural updo/puff with tight coils and a few loose tendrils, exactly two tan bunny ears with soft flesh-pink inner ears emerging from the upper hair, no human ears, one small brown bunny tail, thin round gold glasses, exactly one owner-supplied black/gray lotus tattoo under the anatomical left collarbone near the shoulder and slightly beneath the left top strap, a thin gold chain with a small letter A pendant worn for her husband, thin dainty layered gold rings only, a pink fitted Pixel Bloom training top, lavender high-waisted leggings, and black-and-white Panda-Dunk-inspired genericized low-top sneakers. Render in stylized premium high-bit late-handheld/GBA-era pixel art, never photoreal. Do not invent or alter canonical anatomy, accessories, colors, tattoo count/location, hair texture, or identity. Match the approved Rae v1 character bible image exactly: same face, proportions, palette and pixel style. Never: human ears, a headband or clip-on ears, cat or fox ears, a missing or extra bunny ear, straight/wavy/silky hair, a second tattoo, a tattoo on the shoulder, outer arm, right side, neck, face or back, a white or pink tail, a cat/fox tail, more than one tail, an oversized tail, removed or restyled glasses (square, rimless, silver/black or sunglasses), a different necklace letter, a missing pendant or a silver chain, chunky jewelry, an added jacket/shorts/skirt/gloves or socks, a removed Pixel Bloom logo, photoreal skin, a child/teen look, or any identity change between frames.

Also keep exactly as in the attached Rae reference: her face, her proportions (about 7.5 heads tall), and her lavender wristbands. Her shoes have no logo of any kind. Rae's own ears stay her semi-upright tan bunny ears with flesh-pink insides at all times.

TASK: Rae leads a gentle beginner dance break. Draw ONE animation strip of the dance move "Hip sway with snaps", 3 frames. Every frame is a complete drawing of Rae, whole body, head to shoes.

STRIP FORMAT:
- One wide 1536x1024 image: one row of 3 frames on flat solid #FF00FF magenta. No text, numbers, labels, borders, separator lines, floor, mat, scenery or shadows.
- Split the width into 3 equal invisible columns and center Rae in each column. Scale Rae so her widest pose still fits inside its column, with clear magenta between neighbouring figures: no touching, no overlap.
- Same scale, same camera, same floor line in every frame. Front view, facing the viewer, like the FRONT figure in the attached reference. Her hips stay centered in her column; only her feet and arms move the way each frame says. Feet stay on the floor in every frame: no jumps, no spins.
- Keep her head on the same side in every frame (never mirror a frame). In a front view her lotus tattoo is on the viewer's right, because that is her anatomical left; it stays there in every frame.
- "Screen-left" and "screen-right" are as the viewer sees the image. Her right side is on screen-left.
- Light, friendly beginner dance: knees soft, movements easy and low-impact.

FRAMES (left to right):
1. Hips swayed toward screen-left, weight on her right leg (screen-left), her other knee softly bent with that heel slightly lifted. Elbows bent at waist height, fingers snapping toward screen-left at hip height, hands clear of her chest.
2. Centered: both feet flat, both knees soft, hips level, hands loosely at her waist.
3. Hips swayed toward screen-right, weight on her left leg (screen-right), her other knee softly bent with that heel slightly lifted. Fingers snapping toward screen-right at hip height, hands clear of her chest.

Expression: warm and playful (canonical expressions as named; otherwise canonical "smile"). Gaze toward the viewer or natural, never forced. Secondary motion only: a little hair and ear bounce, the necklace swaying slightly.

CONSISTENCY: identical Rae identity, proportions, hair, two bunny ears, glasses, A pendant, single lotus tattoo spot, rings, outfit, wristbands and shoes in every frame. Same camera, same scale, same floor line. Only the joints each frame describes change.
```

**Negative / must-not** (paste in the same message, right after the prompt)

```text
Do not draw: jumping, hopping, both feet off the floor, spinning, turning her back, kneeling or floor moves; a mirrored frame (her head or tattoo switching sides); hands covering her face, glasses or A pendant; arms hiding or bending her bunny ears; extra or missing fingers, hands or limbs; motion lines, music notes, sparkles, hearts, speech bubbles or any effect; a microphone, props or equipment; a floor, mat, stage, spotlight, shadow or scenery; text, numbers, labels, arrows or watermarks; a changed outfit, hairstyle or body shape between frames.
```

**QA checklist**
- [ ] **Gate 1 anatomy:** exactly two tan bunny ears with flesh-pink insides, semi-upright; **no human ear anywhere**; brown tail only where the view shows it; no duplicate limbs, fingers or accessories.
- [ ] **Gate 1 hair/face:** black 4C updo/puff with tight coils (not straight, wavy or a tiny puff); adult woman; stylized pixel face, not photoreal; warm medium-deep brown skin, not lightened.
- [ ] **Gate 2 signature details:** thin round gold glasses; exactly one lotus tattoo under her **anatomical left** collarbone (viewer-right in a front view), not on the shoulder cap, arm or right side; small A pendant on a thin gold chain (never R); rings thin and dainty only.
- [ ] **Gate 3 outfit:** pink fitted Pixel Bloom top, lavender high-waisted leggings, black-and-white low-top sneakers with no logo; lavender wristbands as in the reference; no added socks, jacket or gloves.
- [ ] **Gate 4 body:** adult curvy, strong, athletic proportions match the bible; no waist shrink, no bust/hip exaggeration, limb lengths stable.
- [ ] **Gate 5 pixel art:** high-bit GBA-era clusters, selout, crisp silhouette, no blur or smooth paint.
- [ ] **Gate 6 pose/gaze:** each frame matches its numbered description; gaze natural; no pin-up posing.
- [ ] **Gate 7 continuity:** fixed camera and scale; the same face, hair mass, ear bases, glasses, tattoo spot, necklace, outfit and shoes in every frame; her head never switches sides (no mirrored frame); no identity pop at the loop seam.
- [ ] **Gate 9 file:** 1536x1024, flat #FF00FF, exactly 3 figures in 3 equal columns with clear magenta gaps; no text, floor or shadow.
- [ ] **Move reads:** someone who has never danced could copy it from the frames; it matches the move name.
- [ ] **Feet:** at least one foot on the floor in every frame; no jump or spin; the stepping feet go where the frame says.
- [ ] **Nothing hidden:** hands and arms never cover her face, glasses or A pendant; the ears are never bent or cut off by her arms.
- [ ] **Final question (QA gate):** with the bible hidden, is this unmistakably the same Rae? If not clearly yes, it is not approved.

### 5. Shoulder pops with knee bounce (3 frames)

**Purpose:** A playful groove: a knee bounce, then one shoulder pop each side.

**Output spec**
- File: `dance-shoulder-pops-strip-v1.png` → `assets/pixel-bloom/character/rae/source/dance/`
- 1536×1024, one row of 3 frames in 3 equal columns, flat `#FF00FF`, front view
- Playback proposal: fps 8, order `0,1,0,2`, hold `0:4,1:4,2:4`, `--anchor grid`, stills `1,2`

**Attach**
- `assets/pixel-bloom/character/rae/reference/pb-rae-character-bible-v1.png`
- `public/rae/full-front.png`

**Prompt** (paste as one message)

```text
Rae is a locked Pixel Bloom character. Preserve her canonical identity exactly. She is an adult Black bunny girl with warm medium-deep brown skin, black 4C natural hair in a voluminous natural updo/puff with tight coils and a few loose tendrils, exactly two tan bunny ears with soft flesh-pink inner ears emerging from the upper hair, no human ears, one small brown bunny tail, thin round gold glasses, exactly one owner-supplied black/gray lotus tattoo under the anatomical left collarbone near the shoulder and slightly beneath the left top strap, a thin gold chain with a small letter A pendant worn for her husband, thin dainty layered gold rings only, a pink fitted Pixel Bloom training top, lavender high-waisted leggings, and black-and-white Panda-Dunk-inspired genericized low-top sneakers. Render in stylized premium high-bit late-handheld/GBA-era pixel art, never photoreal. Do not invent or alter canonical anatomy, accessories, colors, tattoo count/location, hair texture, or identity. Match the approved Rae v1 character bible image exactly: same face, proportions, palette and pixel style. Never: human ears, a headband or clip-on ears, cat or fox ears, a missing or extra bunny ear, straight/wavy/silky hair, a second tattoo, a tattoo on the shoulder, outer arm, right side, neck, face or back, a white or pink tail, a cat/fox tail, more than one tail, an oversized tail, removed or restyled glasses (square, rimless, silver/black or sunglasses), a different necklace letter, a missing pendant or a silver chain, chunky jewelry, an added jacket/shorts/skirt/gloves or socks, a removed Pixel Bloom logo, photoreal skin, a child/teen look, or any identity change between frames.

Also keep exactly as in the attached Rae reference: her face, her proportions (about 7.5 heads tall), and her lavender wristbands. Her shoes have no logo of any kind. Rae's own ears stay her semi-upright tan bunny ears with flesh-pink insides at all times.

TASK: Rae leads a gentle beginner dance break. Draw ONE animation strip of the dance move "Shoulder pops with knee bounce", 3 frames. Every frame is a complete drawing of Rae, whole body, head to shoes.

STRIP FORMAT:
- One wide 1536x1024 image: one row of 3 frames on flat solid #FF00FF magenta. No text, numbers, labels, borders, separator lines, floor, mat, scenery or shadows.
- Split the width into 3 equal invisible columns and center Rae in each column. Scale Rae so her widest pose still fits inside its column, with clear magenta between neighbouring figures: no touching, no overlap.
- Same scale, same camera, same floor line in every frame. Front view, facing the viewer, like the FRONT figure in the attached reference. Her hips stay centered in her column; only her feet and arms move the way each frame says. Feet stay on the floor in every frame: no jumps, no spins.
- Keep her head on the same side in every frame (never mirror a frame). In a front view her lotus tattoo is on the viewer's right, because that is her anatomical left; it stays there in every frame.
- "Screen-left" and "screen-right" are as the viewer sees the image. Her right side is on screen-left.
- Light, friendly beginner dance: knees soft, movements easy and low-impact.

FRAMES (left to right):
1. Bounce down: knees softly bent, shoulders level, elbows bent with loose fists at waist height.
2. Knees straight but soft. Her right shoulder (screen-left) pops up toward her jaw, her head tilting a little toward it, the left shoulder relaxed down. Fists stay at waist height.
3. Knees straight but soft. Her left shoulder (screen-right) pops up toward her jaw, her head tilting a little toward it, the right shoulder relaxed down. Her lotus tattoo moves with that shoulder but stays under her left collarbone, slightly beneath the strap.

Expression: warm and playful (canonical expressions as named; otherwise canonical "smile"). Gaze toward the viewer or natural, never forced. Secondary motion only: a little hair and ear bounce, the necklace swaying slightly.

CONSISTENCY: identical Rae identity, proportions, hair, two bunny ears, glasses, A pendant, single lotus tattoo spot, rings, outfit, wristbands and shoes in every frame. Same camera, same scale, same floor line. Only the joints each frame describes change.
```

**Negative / must-not** (paste in the same message, right after the prompt)

```text
Do not draw: jumping, hopping, both feet off the floor, spinning, turning her back, kneeling or floor moves; a mirrored frame (her head or tattoo switching sides); hands covering her face, glasses or A pendant; arms hiding or bending her bunny ears; extra or missing fingers, hands or limbs; motion lines, music notes, sparkles, hearts, speech bubbles or any effect; a microphone, props or equipment; a floor, mat, stage, spotlight, shadow or scenery; text, numbers, labels, arrows or watermarks; a changed outfit, hairstyle or body shape between frames.
```

**QA checklist**
- [ ] **Gate 1 anatomy:** exactly two tan bunny ears with flesh-pink insides, semi-upright; **no human ear anywhere**; brown tail only where the view shows it; no duplicate limbs, fingers or accessories.
- [ ] **Gate 1 hair/face:** black 4C updo/puff with tight coils (not straight, wavy or a tiny puff); adult woman; stylized pixel face, not photoreal; warm medium-deep brown skin, not lightened.
- [ ] **Gate 2 signature details:** thin round gold glasses; exactly one lotus tattoo under her **anatomical left** collarbone (viewer-right in a front view), not on the shoulder cap, arm or right side; small A pendant on a thin gold chain (never R); rings thin and dainty only.
- [ ] **Gate 3 outfit:** pink fitted Pixel Bloom top, lavender high-waisted leggings, black-and-white low-top sneakers with no logo; lavender wristbands as in the reference; no added socks, jacket or gloves.
- [ ] **Gate 4 body:** adult curvy, strong, athletic proportions match the bible; no waist shrink, no bust/hip exaggeration, limb lengths stable.
- [ ] **Gate 5 pixel art:** high-bit GBA-era clusters, selout, crisp silhouette, no blur or smooth paint.
- [ ] **Gate 6 pose/gaze:** each frame matches its numbered description; gaze natural; no pin-up posing.
- [ ] **Gate 7 continuity:** fixed camera and scale; the same face, hair mass, ear bases, glasses, tattoo spot, necklace, outfit and shoes in every frame; her head never switches sides (no mirrored frame); no identity pop at the loop seam.
- [ ] **Gate 9 file:** 1536x1024, flat #FF00FF, exactly 3 figures in 3 equal columns with clear magenta gaps; no text, floor or shadow.
- [ ] **Move reads:** someone who has never danced could copy it from the frames; it matches the move name.
- [ ] **Feet:** at least one foot on the floor in every frame; no jump or spin; the stepping feet go where the frame says.
- [ ] **Nothing hidden:** hands and arms never cover her face, glasses or A pendant; the ears are never bent or cut off by her arms.
- [ ] **Final question (QA gate):** with the bible hidden, is this unmistakably the same Rae? If not clearly yes, it is not approved.

### 6. Celebration finish (no spin) (4 frames)

**Purpose:** The last 20 seconds: claps, then a big arms-up V. Ends on frame 4 held.

**Output spec**
- File: `dance-celebration-strip-v1.png` → `assets/pixel-bloom/character/rae/source/dance/`
- 1536×1024, one row of 4 frames in 4 equal columns, flat `#FF00FF`, front view
- Playback proposal: fps 8, order `0,1,0,1,2,3`, hold `0:4,1:4,2:4,3:12`, `--anchor grid`, stills `2,3`

**Attach**
- `assets/pixel-bloom/character/rae/reference/pb-rae-character-bible-v1.png`
- `public/rae/full-front.png`

**Prompt** (paste as one message)

```text
Rae is a locked Pixel Bloom character. Preserve her canonical identity exactly. She is an adult Black bunny girl with warm medium-deep brown skin, black 4C natural hair in a voluminous natural updo/puff with tight coils and a few loose tendrils, exactly two tan bunny ears with soft flesh-pink inner ears emerging from the upper hair, no human ears, one small brown bunny tail, thin round gold glasses, exactly one owner-supplied black/gray lotus tattoo under the anatomical left collarbone near the shoulder and slightly beneath the left top strap, a thin gold chain with a small letter A pendant worn for her husband, thin dainty layered gold rings only, a pink fitted Pixel Bloom training top, lavender high-waisted leggings, and black-and-white Panda-Dunk-inspired genericized low-top sneakers. Render in stylized premium high-bit late-handheld/GBA-era pixel art, never photoreal. Do not invent or alter canonical anatomy, accessories, colors, tattoo count/location, hair texture, or identity. Match the approved Rae v1 character bible image exactly: same face, proportions, palette and pixel style. Never: human ears, a headband or clip-on ears, cat or fox ears, a missing or extra bunny ear, straight/wavy/silky hair, a second tattoo, a tattoo on the shoulder, outer arm, right side, neck, face or back, a white or pink tail, a cat/fox tail, more than one tail, an oversized tail, removed or restyled glasses (square, rimless, silver/black or sunglasses), a different necklace letter, a missing pendant or a silver chain, chunky jewelry, an added jacket/shorts/skirt/gloves or socks, a removed Pixel Bloom logo, photoreal skin, a child/teen look, or any identity change between frames.

Also keep exactly as in the attached Rae reference: her face, her proportions (about 7.5 heads tall), and her lavender wristbands. Her shoes have no logo of any kind. Rae's own ears stay her semi-upright tan bunny ears with flesh-pink insides at all times.

TASK: Rae leads a gentle beginner dance break. Draw ONE animation strip of the dance move "Celebration finish (no spin)", 4 frames. Every frame is a complete drawing of Rae, whole body, head to shoes.

STRIP FORMAT:
- One wide 1536x1024 image: one row of 4 frames on flat solid #FF00FF magenta. No text, numbers, labels, borders, separator lines, floor, mat, scenery or shadows.
- Split the width into 4 equal invisible columns and center Rae in each column. Scale Rae so her widest pose still fits inside its column, with clear magenta between neighbouring figures: no touching, no overlap.
- Same scale, same camera, same floor line in every frame. Front view, facing the viewer, like the FRONT figure in the attached reference. Her hips stay centered in her column; only her feet and arms move the way each frame says. Feet stay on the floor in every frame: no jumps, no spins.
- Keep her head on the same side in every frame (never mirror a frame). In a front view her lotus tattoo is on the viewer's right, because that is her anatomical left; it stays there in every frame.
- "Screen-left" and "screen-right" are as the viewer sees the image. Her right side is on screen-left.
- Light, friendly beginner dance: knees soft, movements easy and low-impact.

FRAMES (left to right):
1. Feet together, knees soft. A light clap held out toward screen-left at shoulder height, off to the side of her body. Big smile (canonical "happy").
2. Same stance. A light clap held out toward screen-right at shoulder height, off to the side of her body. Canonical "happy".
3. She steps her feet out a little wider than her hips, both arms up overhead in a big V, hands open, bunny ears fully visible between her arms. Canonical "cheer": a large joyful smile.
4. Holding the V, with a small lean toward screen-left and a laughing face (canonical "laugh": eyes closed in arcs, open smile). Feet flat in the same wide stance as frame 3.

Expression: warm and playful (canonical expressions as named; otherwise canonical "smile"). Gaze toward the viewer or natural, never forced. Secondary motion only: a little hair and ear bounce, the necklace swaying slightly.

CONSISTENCY: identical Rae identity, proportions, hair, two bunny ears, glasses, A pendant, single lotus tattoo spot, rings, outfit, wristbands and shoes in every frame. Same camera, same scale, same floor line. Only the joints each frame describes change.
```

**Negative / must-not** (paste in the same message, right after the prompt)

```text
Do not draw: jumping, hopping, both feet off the floor, spinning, turning her back, kneeling or floor moves; a mirrored frame (her head or tattoo switching sides); hands covering her face, glasses or A pendant; arms hiding or bending her bunny ears; extra or missing fingers, hands or limbs; motion lines, music notes, sparkles, hearts, speech bubbles or any effect; a microphone, props or equipment; a floor, mat, stage, spotlight, shadow or scenery; text, numbers, labels, arrows or watermarks; a changed outfit, hairstyle or body shape between frames.
```

**QA checklist**
- [ ] **Gate 1 anatomy:** exactly two tan bunny ears with flesh-pink insides, semi-upright; **no human ear anywhere**; brown tail only where the view shows it; no duplicate limbs, fingers or accessories.
- [ ] **Gate 1 hair/face:** black 4C updo/puff with tight coils (not straight, wavy or a tiny puff); adult woman; stylized pixel face, not photoreal; warm medium-deep brown skin, not lightened.
- [ ] **Gate 2 signature details:** thin round gold glasses; exactly one lotus tattoo under her **anatomical left** collarbone (viewer-right in a front view), not on the shoulder cap, arm or right side; small A pendant on a thin gold chain (never R); rings thin and dainty only.
- [ ] **Gate 3 outfit:** pink fitted Pixel Bloom top, lavender high-waisted leggings, black-and-white low-top sneakers with no logo; lavender wristbands as in the reference; no added socks, jacket or gloves.
- [ ] **Gate 4 body:** adult curvy, strong, athletic proportions match the bible; no waist shrink, no bust/hip exaggeration, limb lengths stable.
- [ ] **Gate 5 pixel art:** high-bit GBA-era clusters, selout, crisp silhouette, no blur or smooth paint.
- [ ] **Gate 6 pose/gaze:** each frame matches its numbered description; gaze natural; no pin-up posing.
- [ ] **Gate 7 continuity:** fixed camera and scale; the same face, hair mass, ear bases, glasses, tattoo spot, necklace, outfit and shoes in every frame; her head never switches sides (no mirrored frame); no identity pop at the loop seam.
- [ ] **Gate 9 file:** 1536x1024, flat #FF00FF, exactly 4 figures in 4 equal columns with clear magenta gaps; no text, floor or shadow.
- [ ] **Move reads:** someone who has never danced could copy it from the frames; it matches the move name.
- [ ] **Feet:** at least one foot on the floor in every frame; no jump or spin; the stepping feet go where the frame says.
- [ ] **Nothing hidden:** hands and arms never cover her face, glasses or A pendant; the ears are never bent or cut off by her arms.
- [ ] **Final question (QA gate):** with the bible hidden, is this unmistakably the same Rae? If not clearly yes, it is not approved.

---

## Open decisions for the owner

1. **Approve the six moves.** They're new movements; the app's rule is never to invent exercises without the owner. Approve, swap or drop each one. They ship as `draft` until you do, like Rae's own moves.
2. **Music.** None is bundled (licensing). Options: silent with a visual beat, a beep each beat, or she plays her own music.
3. **Tempo.** 120 BPM is proposed. Slower (100 BPM) is gentler.
4. **Where it lives.** A Today tile, a "Dance break" routine in the Library, or offered after a workout?
5. **Does it count?** Does a dance break count as a workout (streak, flowers, bunny growth) or stay just for fun?
6. **Grapevine slide.** In place, or slide the sprite a few px with the steps?
7. **Count-in.** "3-2-1" before the first move, or start straight away?
