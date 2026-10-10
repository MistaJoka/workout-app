# Bunny buddy: ChatGPT art prompts

A baby lop bunny lives in Rae's room on Today and grows up as she works out. It's a new character, so its look gets locked first, the same way Rae's was. Every frame is a whole drawing (frame strips, no rigs).

## How to use

**Run order.** 1a → 1b (lock the bunny) → stages 2-4 in order (each stage: idle, hop, happy, sleep, then the still with Rae). Don't start a stage until the reference sheets are approved.

**Chats.**
- Bunny-only images (1a, 1b and every strip): a **new ChatGPT chat** just for the bunny. Rae's look is less likely to leak onto it there.
- Stills with Rae (2e, 3e, 4e): the **Rae chat** that holds her bible.

**Attach these files** (each prompt lists exactly which):
- `assets/pixel-bloom/character/rae/reference/pb-rae-character-bible-v1.png`: the canonical Rae raster. Always attached; for bunny-only images it's a style reference.
- `public/rae/full-3q.png`: Rae's 3/4 figure, cropped pixel-for-pixel from that bible. Attach it for the stills with Rae.
- After you approve them: `pb-bunny-ref-turnaround-v1.png` and `pb-bunny-ref-growth-v1.png` (from prompts 1a and 1b). Attach them to every later bunny prompt.
- Don't attach any other Rae image. Only the bible is approved, so other drawings would just pass their drift along.

**Review.** Use each prompt's QA list. Any unchecked box means a redraw. Write the result the way the QA gate does, e.g. `REGENERATE: B1 three ears in frame 4`. For a fix, ask ChatGPT to change only that defect and keep everything else.

**Hand back.**
1. Rename each approved image to the exact filename in its spec.
2. Put the reference sheets in `assets/pixel-bloom/character/bunny/reference/`, the bunny strips in `assets/pixel-bloom/character/bunny/source/` and the stills with Rae in `assets/pixel-bloom/character/rae/source/bunny/`.
3. A redraw keeps the name with the next version number (`-v2`), so the old file stays.
4. Don't commit them (they're large). Tell Claude Code "bunny art is in" and list each file's QA result.

## Bunny character lock (draft until you approve sheets 1a and 1b)

| Field | Lock |
|---|---|
| Species | Small domestic lop-eared rabbit (Holland Lop type). A real animal: 4 legs, 2 ears, 1 cotton tail. Never stands on two legs like a person, never holds things. |
| Fur | Solid soft **lilac** (a real rabbit colour) with a cream underside. Chosen because it's Pixel Bloom's lavender family (`lav #D9C8FF`, Rae's leggings `#A99AF4`) greyed down so it's clearly not her leggings, it stands out against the room's peach floor (`#f2d3bd`), and it can never be mistaken for Rae's tan ears or brown tail. |
| Fur ramp | deep shadow `#6B6385`, shadow `#8A82A3`, base `#A9A1BF`, light `#C8C1DA`, cream `#EEE8F4` |
| Ears (inner), nose | `#F1849E` / `#FFA6B8`: Rae's own inner-ear ramp (bible §11), so the two read as a set |
| Eyes | `#171421` (Rae's darkest hair tone) with one `#F8FAFF` (Cloud token) catch-light |
| Outline | Selout; darkest `#4A3A5C`, the room's own pixel-outline colour (`RaeHero.tsx` speech bubble) |
| Markings | None. It's perfectly symmetric, so the app may mirror it to face right. Rae can never be mirrored because of her tattoo; the bunny can. |
| Face | No eyebrows, eyelashes, whiskers, teeth or human mouth. The mouth is a tiny Y. |
| Accessories | None, ever (no collar, bow or clothes). |
| Size vs Rae | baby ≈ 1/7 of Rae's standing height, young ≈ 1/5, grown ≈ 1/4 (about knee height), ears included |
| Pixel grid | Sitting height: baby ≈ 36 blocks, young ≈ 48, grown ≈ 60. That's Rae's 256-grid density: in the room Rae is about 250 px tall, so the bunny shows at about 36/48/60 px. |
| Silhouette by stage | **Baby:** round ball, big head, "airplane" ears sticking out sideways (real lop kits do this before the ears drop). **Young:** lankier, ears lopped but short (tips at the cheek). **Grown:** compact loaf, crown bump, full lop ears (tips at the jaw). The ears dropping is the growth cue. |
| Style | Same high-bit GBA-era pixel art as Rae: uniform blocks, cluster shading, minimal anti-aliasing |
| Never changes | Species, colours, eye style, no markings, no accessories, ear count, each stage's ear shape, outline colour |

**Negative list:** see the "Negative / must-not" block in each prompt. It's the same list everywhere.

## Growth stages (proposal: owner decides)

| Stage | Suggested trigger | Why |
|---|---|---|
| Baby | Appears after her first finished workout | It arrives because she showed up |
| Young | 12 finished workouts | About a month at 3 a week |
| Grown | 36 finished workouts | About three months |

Like every unlock in the app, it **never shrinks back, never gets sad and never goes hungry** after missed days. On rest days it just sleeps. The alternative is tying it to Bloom level like `roomUnlocks.ts` (e.g. young at level 6, grown at level 12).

## Where it lives (note for Claude Code, later)

Today's room (`RaeHero.tsx`, viewBox 360×280, floor at y=232). Put it on the floor to the right of Rae, about x 236-290, clear of the garden pots (lower left), the plant (x ≥ 306) and the Meet Rae button (bottom right). It's decorative: `aria-hidden`, and it never blocks a tap target.

Intake isn't plug-in yet:
- `build-rae-frames.py` writes to `public/rae/` and scales every frame to 264 px tall. The bunny needs its own output folder and per-stage heights (36/48/60).
- Use `--anchor grid` for all bunny strips. The hop leaves the floor, and `foot` would erase that.
- Effects (sleep "z"s, happy sparkles) are kept out of the art on purpose. The builder drops small detached pieces, so the app draws them in CSS if wanted.
- Stills with Rae must be one connected shape (the bunny touching her hand). Otherwise a 1-frame build keeps only the largest piece and drops the bunny.
- Motion: full plays the loops; reduced shows the idle still; off shows the idle still with no swap to happy.

---

## 1. Lock the bunny

### 1a. Canon sheet: grown turnaround + expressions

**Purpose:** Locks the bunny's design (the adult form first; the younger stages are derived from it).

**Output spec**
- File: `pb-bunny-ref-turnaround-v1.png` → `assets/pixel-bloom/character/bunny/reference/`
- 1536×1024, flat `#F8FAFF` (a reference sheet, so it's not keyed)
- Not animated; it's the reference for everything after it

**Attach**
- `assets/pixel-bloom/character/rae/reference/pb-rae-character-bible-v1.png` (style only)

**Prompt** (paste as one message)

```text
BUNNY LOCK (Pixel Bloom pet, v1). This is Rae's pet bunny: a small domestic lop-eared rabbit (Holland Lop type) drawn as a real animal, not a cartoon person. Exactly four legs, exactly two ears, exactly one small round cotton tail. No clothing, collar, bow, hat or accessory of any kind. It never stands on two legs like a person and never holds objects. Fur is a solid soft lilac (dove-grey with a lavender cast) with a cream underside on the chin, muzzle, chest, belly, inner legs and underside of the tail. No spots, patches, stripes or other markings, so its left and right sides look identical. Fur palette: deep shadow #6B6385, shadow #8A82A3, base #A9A1BF, light #C8C1DA, cream #EEE8F4. Inner ears #F1849E with highlight #FFA6B8. Nose #F1849E. Eyes: large, round, solid near-black #171421 with one small #F8FAFF catch-light in the upper part of each eye, in the same spot in every frame. Outline: selective color-matched outline (selout); the darkest outline color is #4A3A5C, never pure black. No eyebrows, eyelashes, whiskers, teeth or human mouth; the mouth is a tiny Y shape under the nose. Style: the same premium high-bit late-handheld/GBA-era pixel art as the attached Rae reference: intentional visible pixel clusters in uniform square blocks, crisp silhouette, controlled cluster shading, minimal anti-aliasing, lighting the same as the Rae reference.

STAGE: GROWN. A compact, rounded "loaf" body with broad cheeks and a short neck; a soft rounded "crown" bump on top of the head where the ears attach; fully lopped ears hanging close beside the cheeks with rounded tips at jaw level and a thin pink rim of inner ear at the front edge. About 1/4 of Rae's standing height, ears included (about the height of her knee). Drawn on a chunky pixel grid: about 60 pixel blocks tall when sitting.

The attached Rae character bible is a STYLE reference only: match its pixel-art language, outline treatment, shading and lighting. Do not copy anything about Rae onto the bunny (no tan or brown fur, no upright ears, no glasses or jewelry). Rae does not appear in this image.

TASK: a character reference sheet that locks the GROWN bunny before any animation is made. This is a design lock: show every feature clearly, no dramatic poses.

LAYOUT (one 1536x1024 image, flat plain #F8FAFF background, no text anywhere):
- Top row, five full-body views of the same grown bunny sitting, evenly spaced on one shared invisible floor line, all the same size: 1) front, 2) 3/4 front facing screen-left, 3) true side profile facing screen-left, 4) 3/4 back, 5) back (cotton tail visible, lilac on top with cream underside).
- Middle row, five head close-ups of the same bunny, same size as each other: 1) neutral, 2) curious (nose raised, ear bases lifted a little), 3) happy (eyes squeezed into soft upward arcs, a 1-2 block #FFD6E7 cheek blush), 4) sleepy (eyes half closed), 5) startled (eyes a little wider, head up, ear bases lifted). Expressions change only eyes, ear bases and head angle, never the face design.
- Bottom row: ten plain colour squares in this order, no labels: #6B6385, #8A82A3, #A9A1BF, #C8C1DA, #EEE8F4, #F1849E, #FFA6B8, #171421, #F8FAFF, #4A3A5C.

Every view must be the same bunny: identical colours, ear length, eye size and body volume.
```

**Negative / must-not** (paste in the same message, right after the prompt)

```text
Do not draw: clothes, a collar, a bow, a hat, a harness or any accessory; human hands, fingers or a human face; eyebrows, eyelashes, whiskers, teeth or an open human mouth; standing on two legs like a person; holding anything; more or fewer than two ears, four legs or one tail; upright pointed ears (this is a lop); white, tan, brown, orange or grey-blue fur; spots, patches, stripes, a blaze or any marking; pink or white eyes, glowing eyes or more than one catch-light per eye; pure black outlines; photoreal fur, plush-toy, felt, 3D, vector, watercolor, chibi-sticker or anime rendering; blur, soft airbrush shading or a pixel filter over smooth art; sparkles, hearts, stars, "z" letters, motion lines, dust puffs, speech bubbles or any effect; text, numbers, labels, signatures or watermarks; floor, rug, grass, shadows or scenery; any change to the bunny between frames.
```

**QA checklist**
- [ ] **B1 anatomy:** exactly 2 ears, 4 legs, 1 cotton tail (when the view shows it); real-rabbit body, no human features.
- [ ] **B2 stage:** grown ears and proportions as the lock says; not a different stage.
- [ ] **B3 colour:** lilac fur with cream underside, pink inner ears and nose, near-black eyes with one catch-light; no tan/brown/white fur, no markings.
- [ ] **B4 nothing extra:** no clothes, accessories, effects, text, floor or shadow.
- [ ] **B5 pixel art (Gate 5 analogue):** crisp uniform pixel blocks, selout outline (not black), no blur or smooth paint, readable at about 40-60 px tall.
- [ ] **Sheet:** 5 views + 5 heads + 10 swatches, in that layout; no text, no labels, no garbled letters.
- [ ] **Views agree:** ear length, eye size, body volume and colours are identical across all five views; the back view shows exactly one tail.
- [ ] **Expressions:** only eyes/ear bases/head angle change; no eyebrows or human mouth appear.
- [ ] **Worth keeping:** cute, natural and calm, not a generic sticker; you would want this bunny in her room.

### 1b. Canon sheet: growth lineup (baby / young / grown)

**Purpose:** Locks the baby and young stages and the size steps between all three.

**Output spec**
- File: `pb-bunny-ref-growth-v1.png` → `assets/pixel-bloom/character/bunny/reference/`
- 1536×1024, flat `#F8FAFF`
- Run only after 1a is approved

**Attach**
- `assets/pixel-bloom/character/bunny/reference/pb-bunny-ref-turnaround-v1.png`
- `assets/pixel-bloom/character/rae/reference/pb-rae-character-bible-v1.png` (style only)

**Prompt** (paste as one message)

```text
BUNNY LOCK (Pixel Bloom pet, v1). This is Rae's pet bunny: a small domestic lop-eared rabbit (Holland Lop type) drawn as a real animal, not a cartoon person. Exactly four legs, exactly two ears, exactly one small round cotton tail. No clothing, collar, bow, hat or accessory of any kind. It never stands on two legs like a person and never holds objects. Fur is a solid soft lilac (dove-grey with a lavender cast) with a cream underside on the chin, muzzle, chest, belly, inner legs and underside of the tail. No spots, patches, stripes or other markings, so its left and right sides look identical. Fur palette: deep shadow #6B6385, shadow #8A82A3, base #A9A1BF, light #C8C1DA, cream #EEE8F4. Inner ears #F1849E with highlight #FFA6B8. Nose #F1849E. Eyes: large, round, solid near-black #171421 with one small #F8FAFF catch-light in the upper part of each eye, in the same spot in every frame. Outline: selective color-matched outline (selout); the darkest outline color is #4A3A5C, never pure black. No eyebrows, eyelashes, whiskers, teeth or human mouth; the mouth is a tiny Y shape under the nose. Style: the same premium high-bit late-handheld/GBA-era pixel art as the attached Rae reference: intentional visible pixel clusters in uniform square blocks, crisp silhouette, controlled cluster shading, minimal anti-aliasing, lighting the same as the Rae reference.

STAGE: BABY (kit). A very round ball-shaped body; the head is about as big as the body; tiny paws that barely show; short soft ears that stick out sideways and slightly down from the head ("airplane ears", not yet fully lopped), with the pink inner ear showing on their undersides. Small enough to sit in Rae's two cupped hands: about 1/7 of Rae's standing height, ears included. Drawn on a chunky pixel grid: about 36 pixel blocks tall when sitting.

STAGE: YOUNG. A longer body with visible legs and slightly lanky proportions; the head is about three quarters the size of the body; the ears are now lopped, hanging down beside the cheeks, but still short, with tips at about cheek level and a thin pink rim of inner ear showing at the front edge. About 1/5 of Rae's standing height, ears included. Drawn on a chunky pixel grid: about 48 pixel blocks tall when sitting.

STAGE: GROWN. A compact, rounded "loaf" body with broad cheeks and a short neck; a soft rounded "crown" bump on top of the head where the ears attach; fully lopped ears hanging close beside the cheeks with rounded tips at jaw level and a thin pink rim of inner ear at the front edge. About 1/4 of Rae's standing height, ears included (about the height of her knee). Drawn on a chunky pixel grid: about 60 pixel blocks tall when sitting.

The first attached image is the approved grown-bunny turnaround: this is the same bunny at three ages. Copy its colours, eyes, outline and pixel style exactly. The attached Rae character bible is a STYLE reference only; Rae does not appear in this image.

TASK: a growth reference sheet that locks the BABY and YOUNG stages against the approved GROWN design.

LAYOUT (one 1536x1024 image, flat plain #F8FAFF background, no text anywhere):
- Top half: the three stages side by side, left to right baby, young, grown, all in the same 3/4 front view facing screen-left, sitting on one shared invisible floor line, drawn at TRUE relative size: baby about 36 blocks tall, young about 48, grown about 60 (the grown one copied from the approved turnaround).
- Bottom half, four full-body views at the same scale as the top row: 1) baby front view, 2) baby true side profile facing screen-left, 3) young front view, 4) young true side profile facing screen-left.

The growth cue is the ears: baby "airplane" ears sticking out sideways and slightly down; young ears lopped but short (tips at cheek level); grown ears fully lopped (tips at jaw level). Colours, eye style and outline never change with age.
```

**Negative / must-not** (paste in the same message, right after the prompt)

```text
Do not draw: clothes, a collar, a bow, a hat, a harness or any accessory; human hands, fingers or a human face; eyebrows, eyelashes, whiskers, teeth or an open human mouth; standing on two legs like a person; holding anything; more or fewer than two ears, four legs or one tail; upright pointed ears (this is a lop); white, tan, brown, orange or grey-blue fur; spots, patches, stripes, a blaze or any marking; pink or white eyes, glowing eyes or more than one catch-light per eye; pure black outlines; photoreal fur, plush-toy, felt, 3D, vector, watercolor, chibi-sticker or anime rendering; blur, soft airbrush shading or a pixel filter over smooth art; sparkles, hearts, stars, "z" letters, motion lines, dust puffs, speech bubbles or any effect; text, numbers, labels, signatures or watermarks; floor, rug, grass, shadows or scenery; any change to the bunny between frames.
```

**QA checklist**
- [ ] **B1 anatomy:** every figure has exactly 2 ears, 4 legs and a real-rabbit body; tails only where the view shows them.
- [ ] **B2 stages:** baby = airplane ears and a round ball body; young = short lopped ears and a lanky body; grown = full lop and a crown bump. Three clearly different ages.
- [ ] **B3 colour:** all three use the identical lilac/cream/pink/eye palette from 1a.
- [ ] **Scale:** the sizes step up visibly (about 36 : 48 : 60) and stand on one floor line.
- [ ] **Grown matches 1a:** the grown figure is the same bunny as the approved turnaround.
- [ ] **B4/B5:** no accessories, text or effects; crisp pixel blocks, selout outline, no blur.
- [ ] **Likeness:** the baby and young read as the same animal as the grown one, just younger.

---

## 2. Baby stage

### 2a. Baby: idle loop (4 frames)

**Purpose:** Default state in the room on a normal day.

**Output spec**
- File: `pb-bunny-baby-idle-strip-v1.png` → `assets/pixel-bloom/character/bunny/source/`
- 1536×1024, one row of 4 frames in 4 equal columns, flat `#FF00FF`, view: 3/4 front facing screen-left, sitting
- Playback proposal (Claude Code, later): fps 8, order `0,1,0,2,0,3`, hold `0:12,1:2,2:4,3:2` (about 5 s per cycle, loops). Reduced/off: still 0. Built with `--anchor grid`.

**Attach**
- `assets/pixel-bloom/character/bunny/reference/pb-bunny-ref-turnaround-v1.png`
- `assets/pixel-bloom/character/bunny/reference/pb-bunny-ref-growth-v1.png`
- `assets/pixel-bloom/character/rae/reference/pb-rae-character-bible-v1.png` (style only)

**Prompt** (paste as one message)

```text
BUNNY LOCK (Pixel Bloom pet, v1). This is Rae's pet bunny: a small domestic lop-eared rabbit (Holland Lop type) drawn as a real animal, not a cartoon person. Exactly four legs, exactly two ears, exactly one small round cotton tail. No clothing, collar, bow, hat or accessory of any kind. It never stands on two legs like a person and never holds objects. Fur is a solid soft lilac (dove-grey with a lavender cast) with a cream underside on the chin, muzzle, chest, belly, inner legs and underside of the tail. No spots, patches, stripes or other markings, so its left and right sides look identical. Fur palette: deep shadow #6B6385, shadow #8A82A3, base #A9A1BF, light #C8C1DA, cream #EEE8F4. Inner ears #F1849E with highlight #FFA6B8. Nose #F1849E. Eyes: large, round, solid near-black #171421 with one small #F8FAFF catch-light in the upper part of each eye, in the same spot in every frame. Outline: selective color-matched outline (selout); the darkest outline color is #4A3A5C, never pure black. No eyebrows, eyelashes, whiskers, teeth or human mouth; the mouth is a tiny Y shape under the nose. Style: the same premium high-bit late-handheld/GBA-era pixel art as the attached Rae reference: intentional visible pixel clusters in uniform square blocks, crisp silhouette, controlled cluster shading, minimal anti-aliasing, lighting the same as the Rae reference.

STAGE: BABY (kit). A very round ball-shaped body; the head is about as big as the body; tiny paws that barely show; short soft ears that stick out sideways and slightly down from the head ("airplane ears", not yet fully lopped), with the pink inner ear showing on their undersides. Small enough to sit in Rae's two cupped hands: about 1/7 of Rae's standing height, ears included. Drawn on a chunky pixel grid: about 36 pixel blocks tall when sitting.

The attached bunny reference sheets are approved: draw that exact bunny at the BABY stage. The attached Rae character bible is a STYLE reference only; Rae does not appear in this image.

TASK: one animation strip of the BABY bunny: idle loop, 4 frames. Every frame is a complete drawing of the whole bunny.

STRIP FORMAT:
- One wide 1536x1024 image: one row of 4 frames on flat solid #FF00FF magenta.
- Split the width into 4 equal invisible columns and center one bunny in each column. Leave clear magenta between neighbouring bunnies: nothing touches or crosses into the next column.
- Same camera, same scale and the same floor line in every frame. The bunny is as large as fits its column. The floor line is invisible: no floor, rug, shadow or ground mark.
- View: 3/4 front facing screen-left, sitting. Never mirror a frame.
- No text, numbers, labels, borders, separator lines or effects.

FRAMES (left to right):
1. Sitting in a round ball, front paws tucked, eyes open, looking toward screen-left. Airplane ears relaxed.
2. Nose twitch: the nose and muzzle shift up by one pixel block and the cheeks puff very slightly. Everything else as frame 1.
3. Head tilt: the head tilts a little toward the viewer and the near airplane ear lifts slightly at its tip. Body unchanged.
4. Blink: both eyes closed into short horizontal lines. Everything else exactly as frame 1.

CONSISTENCY: the identical BABY bunny in every frame: same size, same ear length and shape, same eye size and catch-light spot, same colours, same outline. Only what each frame describes changes. No two frames identical.
```

**Negative / must-not** (paste in the same message, right after the prompt)

```text
Do not draw: clothes, a collar, a bow, a hat, a harness or any accessory; human hands, fingers or a human face; eyebrows, eyelashes, whiskers, teeth or an open human mouth; standing on two legs like a person; holding anything; more or fewer than two ears, four legs or one tail; upright pointed ears (this is a lop); white, tan, brown, orange or grey-blue fur; spots, patches, stripes, a blaze or any marking; pink or white eyes, glowing eyes or more than one catch-light per eye; pure black outlines; photoreal fur, plush-toy, felt, 3D, vector, watercolor, chibi-sticker or anime rendering; blur, soft airbrush shading or a pixel filter over smooth art; sparkles, hearts, stars, "z" letters, motion lines, dust puffs, speech bubbles or any effect; text, numbers, labels, signatures or watermarks; floor, rug, grass, shadows or scenery; any change to the bunny between frames.
```

**QA checklist**
- [ ] **B1 anatomy:** exactly 2 ears, 4 legs, 1 cotton tail (when the view shows it); real-rabbit body, no human features.
- [ ] **B2 stage:** baby ears and proportions as the lock says; not a different stage.
- [ ] **B3 colour:** lilac fur with cream underside, pink inner ears and nose, near-black eyes with one catch-light; no tan/brown/white fur, no markings.
- [ ] **B4 nothing extra:** no clothes, accessories, effects, text, floor or shadow.
- [ ] **B5 pixel art (Gate 5 analogue):** crisp uniform pixel blocks, selout outline (not black), no blur or smooth paint, readable at about 40-60 px tall.
- [ ] **B9 likeness:** side by side with the approved bunny reference sheets, it is clearly the same bunny.
- [ ] **B6 motion (Gate 6/7 analogue):** every frame matches its numbered description; no filler frame, no two frames near-identical unless the list says so; no frame mirrored.
- [ ] **B7 continuity (Gate 7 analogue):** same size, ear length, eye spot, colours and floor line in every frame; no frame-to-frame drift.
- [ ] **B8 file (Gate 9 analogue):** 1536x1024, flat #FF00FF, exactly 4 figures in 4 equal columns with clear gaps.

### 2b. Baby: hop loop (5 frames)

**Purpose:** An occasional hop across the rug. The art hops in place; the app slides the sprite and mirrors it to hop the other way (allowed: the bunny has no markings).

**Output spec**
- File: `pb-bunny-baby-hop-strip-v1.png` → `assets/pixel-bloom/character/bunny/source/`
- 1536×1024, one row of 5 frames in 5 equal columns, flat `#FF00FF`, view: true side profile facing screen-left
- Playback proposal (Claude Code, later): fps 10, order `0,1,2,3,4`, hold `0:2` (about 0.6 s per hop). Full motion only. Reduced/off: none (idle still). Built with `--anchor grid`.

**Attach**
- `assets/pixel-bloom/character/bunny/reference/pb-bunny-ref-turnaround-v1.png`
- `assets/pixel-bloom/character/bunny/reference/pb-bunny-ref-growth-v1.png`
- `assets/pixel-bloom/character/rae/reference/pb-rae-character-bible-v1.png` (style only)

**Prompt** (paste as one message)

```text
BUNNY LOCK (Pixel Bloom pet, v1). This is Rae's pet bunny: a small domestic lop-eared rabbit (Holland Lop type) drawn as a real animal, not a cartoon person. Exactly four legs, exactly two ears, exactly one small round cotton tail. No clothing, collar, bow, hat or accessory of any kind. It never stands on two legs like a person and never holds objects. Fur is a solid soft lilac (dove-grey with a lavender cast) with a cream underside on the chin, muzzle, chest, belly, inner legs and underside of the tail. No spots, patches, stripes or other markings, so its left and right sides look identical. Fur palette: deep shadow #6B6385, shadow #8A82A3, base #A9A1BF, light #C8C1DA, cream #EEE8F4. Inner ears #F1849E with highlight #FFA6B8. Nose #F1849E. Eyes: large, round, solid near-black #171421 with one small #F8FAFF catch-light in the upper part of each eye, in the same spot in every frame. Outline: selective color-matched outline (selout); the darkest outline color is #4A3A5C, never pure black. No eyebrows, eyelashes, whiskers, teeth or human mouth; the mouth is a tiny Y shape under the nose. Style: the same premium high-bit late-handheld/GBA-era pixel art as the attached Rae reference: intentional visible pixel clusters in uniform square blocks, crisp silhouette, controlled cluster shading, minimal anti-aliasing, lighting the same as the Rae reference.

STAGE: BABY (kit). A very round ball-shaped body; the head is about as big as the body; tiny paws that barely show; short soft ears that stick out sideways and slightly down from the head ("airplane ears", not yet fully lopped), with the pink inner ear showing on their undersides. Small enough to sit in Rae's two cupped hands: about 1/7 of Rae's standing height, ears included. Drawn on a chunky pixel grid: about 36 pixel blocks tall when sitting.

The attached bunny reference sheets are approved: draw that exact bunny at the BABY stage. The attached Rae character bible is a STYLE reference only; Rae does not appear in this image.

TASK: one animation strip of the BABY bunny: hop loop, 5 frames. Every frame is a complete drawing of the whole bunny.

STRIP FORMAT:
- One wide 1536x1024 image: one row of 5 frames on flat solid #FF00FF magenta.
- Split the width into 5 equal invisible columns and center one bunny in each column. Leave clear magenta between neighbouring bunnies: nothing touches or crosses into the next column.
- Same camera, same scale and the same floor line in every frame. The bunny is as large as fits its column. The floor line is invisible: no floor, rug, shadow or ground mark.
- View: true side profile facing screen-left. Never mirror a frame.
- No text, numbers, labels, borders, separator lines or effects.

FRAMES (left to right):
1. Crouched, gathering to hop: body low and round, hind feet under the body, ears slightly back.
2. Push-off: hind legs extend behind, front paws lift, body tilts up toward screen-left. A small, slightly wobbly baby push.
3. Airborne at the peak: a low little hop (about a quarter of its own height off the floor), legs tucked under the round body, ears flipped up a little by the motion.
4. Landing: front paws touch the floor first, hind end still slightly raised, ears swinging forward.
5. Settled: hind feet land and come forward under the body, back to a round crouch close to frame 1.

CONSISTENCY: the identical BABY bunny in every frame: same size, same ear length and shape, same eye size and catch-light spot, same colours, same outline. Only what each frame describes changes. No two frames identical.
```

**Negative / must-not** (paste in the same message, right after the prompt)

```text
Do not draw: clothes, a collar, a bow, a hat, a harness or any accessory; human hands, fingers or a human face; eyebrows, eyelashes, whiskers, teeth or an open human mouth; standing on two legs like a person; holding anything; more or fewer than two ears, four legs or one tail; upright pointed ears (this is a lop); white, tan, brown, orange or grey-blue fur; spots, patches, stripes, a blaze or any marking; pink or white eyes, glowing eyes or more than one catch-light per eye; pure black outlines; photoreal fur, plush-toy, felt, 3D, vector, watercolor, chibi-sticker or anime rendering; blur, soft airbrush shading or a pixel filter over smooth art; sparkles, hearts, stars, "z" letters, motion lines, dust puffs, speech bubbles or any effect; text, numbers, labels, signatures or watermarks; floor, rug, grass, shadows or scenery; any change to the bunny between frames.
```

**QA checklist**
- [ ] **B1 anatomy:** exactly 2 ears, 4 legs, 1 cotton tail (when the view shows it); real-rabbit body, no human features.
- [ ] **B2 stage:** baby ears and proportions as the lock says; not a different stage.
- [ ] **B3 colour:** lilac fur with cream underside, pink inner ears and nose, near-black eyes with one catch-light; no tan/brown/white fur, no markings.
- [ ] **B4 nothing extra:** no clothes, accessories, effects, text, floor or shadow.
- [ ] **B5 pixel art (Gate 5 analogue):** crisp uniform pixel blocks, selout outline (not black), no blur or smooth paint, readable at about 40-60 px tall.
- [ ] **B9 likeness:** side by side with the approved bunny reference sheets, it is clearly the same bunny.
- [ ] **B6 motion (Gate 6/7 analogue):** every frame matches its numbered description; no filler frame, no two frames near-identical unless the list says so; no frame mirrored.
- [ ] **B7 continuity (Gate 7 analogue):** same size, ear length, eye spot, colours and floor line in every frame; no frame-to-frame drift.
- [ ] **B8 file (Gate 9 analogue):** 1536x1024, flat #FF00FF, exactly 5 figures in 5 equal columns with clear gaps.

### 2c. Baby: happy / cheer reaction (5 frames)

**Purpose:** Plays once when she finishes a workout (and on a tap), then back to idle. A binky is a real rabbit's happy jump.

**Output spec**
- File: `pb-bunny-baby-happy-strip-v1.png` → `assets/pixel-bloom/character/bunny/source/`
- 1536×1024, one row of 5 frames in 5 equal columns, flat `#FF00FF`, view: true side profile facing screen-left
- Playback proposal (Claude Code, later): fps 10, order `0,1,2,3,4`, hold `0:3,4:8`, plays once. Reduced: show still 4 briefly. Off: no swap. Built with `--anchor grid`.

**Attach**
- `assets/pixel-bloom/character/bunny/reference/pb-bunny-ref-turnaround-v1.png`
- `assets/pixel-bloom/character/bunny/reference/pb-bunny-ref-growth-v1.png`
- `assets/pixel-bloom/character/rae/reference/pb-rae-character-bible-v1.png` (style only)

**Prompt** (paste as one message)

```text
BUNNY LOCK (Pixel Bloom pet, v1). This is Rae's pet bunny: a small domestic lop-eared rabbit (Holland Lop type) drawn as a real animal, not a cartoon person. Exactly four legs, exactly two ears, exactly one small round cotton tail. No clothing, collar, bow, hat or accessory of any kind. It never stands on two legs like a person and never holds objects. Fur is a solid soft lilac (dove-grey with a lavender cast) with a cream underside on the chin, muzzle, chest, belly, inner legs and underside of the tail. No spots, patches, stripes or other markings, so its left and right sides look identical. Fur palette: deep shadow #6B6385, shadow #8A82A3, base #A9A1BF, light #C8C1DA, cream #EEE8F4. Inner ears #F1849E with highlight #FFA6B8. Nose #F1849E. Eyes: large, round, solid near-black #171421 with one small #F8FAFF catch-light in the upper part of each eye, in the same spot in every frame. Outline: selective color-matched outline (selout); the darkest outline color is #4A3A5C, never pure black. No eyebrows, eyelashes, whiskers, teeth or human mouth; the mouth is a tiny Y shape under the nose. Style: the same premium high-bit late-handheld/GBA-era pixel art as the attached Rae reference: intentional visible pixel clusters in uniform square blocks, crisp silhouette, controlled cluster shading, minimal anti-aliasing, lighting the same as the Rae reference.

STAGE: BABY (kit). A very round ball-shaped body; the head is about as big as the body; tiny paws that barely show; short soft ears that stick out sideways and slightly down from the head ("airplane ears", not yet fully lopped), with the pink inner ear showing on their undersides. Small enough to sit in Rae's two cupped hands: about 1/7 of Rae's standing height, ears included. Drawn on a chunky pixel grid: about 36 pixel blocks tall when sitting.

The attached bunny reference sheets are approved: draw that exact bunny at the BABY stage. The attached Rae character bible is a STYLE reference only; Rae does not appear in this image.

TASK: one animation strip of the BABY bunny: happy / cheer reaction, 5 frames. Every frame is a complete drawing of the whole bunny.

STRIP FORMAT:
- One wide 1536x1024 image: one row of 5 frames on flat solid #FF00FF magenta.
- Split the width into 5 equal invisible columns and center one bunny in each column. Leave clear magenta between neighbouring bunnies: nothing touches or crosses into the next column.
- Same camera, same scale and the same floor line in every frame. The bunny is as large as fits its column. The floor line is invisible: no floor, rug, shadow or ground mark.
- View: true side profile facing screen-left. Never mirror a frame.
- No text, numbers, labels, borders, separator lines or effects.

FRAMES (left to right):
1. Sitting up, eyes bright, ears lifted a little: something nice just happened.
2. Tiny crouch, about to spring.
3. A small happy hop (a baby "binky"): just off the floor, a quick head shake so the airplane ears flick outward, eyes squeezed into soft happy arcs.
4. Landing on all four paws with a little bounce, ears still flicked out.
5. Sitting up tall, nose raised, eyes in happy arcs with a 1-block #FFD6E7 cheek blush.

CONSISTENCY: the identical BABY bunny in every frame: same size, same ear length and shape, same eye size and catch-light spot, same colours, same outline. Only what each frame describes changes. No two frames identical.
```

**Negative / must-not** (paste in the same message, right after the prompt)

```text
Do not draw: clothes, a collar, a bow, a hat, a harness or any accessory; human hands, fingers or a human face; eyebrows, eyelashes, whiskers, teeth or an open human mouth; standing on two legs like a person; holding anything; more or fewer than two ears, four legs or one tail; upright pointed ears (this is a lop); white, tan, brown, orange or grey-blue fur; spots, patches, stripes, a blaze or any marking; pink or white eyes, glowing eyes or more than one catch-light per eye; pure black outlines; photoreal fur, plush-toy, felt, 3D, vector, watercolor, chibi-sticker or anime rendering; blur, soft airbrush shading or a pixel filter over smooth art; sparkles, hearts, stars, "z" letters, motion lines, dust puffs, speech bubbles or any effect; text, numbers, labels, signatures or watermarks; floor, rug, grass, shadows or scenery; any change to the bunny between frames.
```

**QA checklist**
- [ ] **B1 anatomy:** exactly 2 ears, 4 legs, 1 cotton tail (when the view shows it); real-rabbit body, no human features.
- [ ] **B2 stage:** baby ears and proportions as the lock says; not a different stage.
- [ ] **B3 colour:** lilac fur with cream underside, pink inner ears and nose, near-black eyes with one catch-light; no tan/brown/white fur, no markings.
- [ ] **B4 nothing extra:** no clothes, accessories, effects, text, floor or shadow.
- [ ] **B5 pixel art (Gate 5 analogue):** crisp uniform pixel blocks, selout outline (not black), no blur or smooth paint, readable at about 40-60 px tall.
- [ ] **B9 likeness:** side by side with the approved bunny reference sheets, it is clearly the same bunny.
- [ ] **B6 motion (Gate 6/7 analogue):** every frame matches its numbered description; no filler frame, no two frames near-identical unless the list says so; no frame mirrored.
- [ ] **B7 continuity (Gate 7 analogue):** same size, ear length, eye spot, colours and floor line in every frame; no frame-to-frame drift.
- [ ] **B8 file (Gate 9 analogue):** 1536x1024, flat #FF00FF, exactly 5 figures in 5 equal columns with clear gaps.

### 2d. Baby: sleeping (rest days) (3 frames)

**Purpose:** Rest days and night. Calm, never sad.

**Output spec**
- File: `pb-bunny-baby-sleep-strip-v1.png` → `assets/pixel-bloom/character/bunny/source/`
- 1536×1024, one row of 3 frames in 3 equal columns, flat `#FF00FF`, view: 3/4 front facing screen-left (grown: lying on its side)
- Playback proposal (Claude Code, later): fps 4, order `0,1,0,1,0,1,2,1`, hold `0:3,1:3` (about 4 s per cycle, loops). Reduced/off: still 1. Built with `--anchor grid`.

**Attach**
- `assets/pixel-bloom/character/bunny/reference/pb-bunny-ref-turnaround-v1.png`
- `assets/pixel-bloom/character/bunny/reference/pb-bunny-ref-growth-v1.png`
- `assets/pixel-bloom/character/rae/reference/pb-rae-character-bible-v1.png` (style only)

**Prompt** (paste as one message)

```text
BUNNY LOCK (Pixel Bloom pet, v1). This is Rae's pet bunny: a small domestic lop-eared rabbit (Holland Lop type) drawn as a real animal, not a cartoon person. Exactly four legs, exactly two ears, exactly one small round cotton tail. No clothing, collar, bow, hat or accessory of any kind. It never stands on two legs like a person and never holds objects. Fur is a solid soft lilac (dove-grey with a lavender cast) with a cream underside on the chin, muzzle, chest, belly, inner legs and underside of the tail. No spots, patches, stripes or other markings, so its left and right sides look identical. Fur palette: deep shadow #6B6385, shadow #8A82A3, base #A9A1BF, light #C8C1DA, cream #EEE8F4. Inner ears #F1849E with highlight #FFA6B8. Nose #F1849E. Eyes: large, round, solid near-black #171421 with one small #F8FAFF catch-light in the upper part of each eye, in the same spot in every frame. Outline: selective color-matched outline (selout); the darkest outline color is #4A3A5C, never pure black. No eyebrows, eyelashes, whiskers, teeth or human mouth; the mouth is a tiny Y shape under the nose. Style: the same premium high-bit late-handheld/GBA-era pixel art as the attached Rae reference: intentional visible pixel clusters in uniform square blocks, crisp silhouette, controlled cluster shading, minimal anti-aliasing, lighting the same as the Rae reference.

STAGE: BABY (kit). A very round ball-shaped body; the head is about as big as the body; tiny paws that barely show; short soft ears that stick out sideways and slightly down from the head ("airplane ears", not yet fully lopped), with the pink inner ear showing on their undersides. Small enough to sit in Rae's two cupped hands: about 1/7 of Rae's standing height, ears included. Drawn on a chunky pixel grid: about 36 pixel blocks tall when sitting.

The attached bunny reference sheets are approved: draw that exact bunny at the BABY stage. The attached Rae character bible is a STYLE reference only; Rae does not appear in this image.

TASK: one animation strip of the BABY bunny: sleeping (rest days), 3 frames. Every frame is a complete drawing of the whole bunny.

STRIP FORMAT:
- One wide 1536x1024 image: one row of 3 frames on flat solid #FF00FF magenta.
- Split the width into 3 equal invisible columns and center one bunny in each column. Leave clear magenta between neighbouring bunnies: nothing touches or crosses into the next column.
- Same camera, same scale and the same floor line in every frame. The bunny is as large as fits its column. The floor line is invisible: no floor, rug, shadow or ground mark.
- View: 3/4 front facing screen-left (grown: lying on its side). Never mirror a frame.
- No text, numbers, labels, borders, separator lines or effects.

FRAMES (left to right):
1. Asleep curled in a round ball, eyes closed as short curved lines, front paws tucked, airplane ears drooping softly. Breath in: the back is one pixel block higher.
2. Same pose, breath out: the back is one pixel block lower than frame 1. Nothing else changes.
3. Same pose as frame 2, a dreaming twitch: the nose shifts by one block and one ear tip twitches. Eyes stay closed.

CONSISTENCY: the identical BABY bunny in every frame: same size, same ear length and shape, same eye size and catch-light spot, same colours, same outline. Only what each frame describes changes. No two frames identical.
```

**Negative / must-not** (paste in the same message, right after the prompt)

```text
Do not draw: clothes, a collar, a bow, a hat, a harness or any accessory; human hands, fingers or a human face; eyebrows, eyelashes, whiskers, teeth or an open human mouth; standing on two legs like a person; holding anything; more or fewer than two ears, four legs or one tail; upright pointed ears (this is a lop); white, tan, brown, orange or grey-blue fur; spots, patches, stripes, a blaze or any marking; pink or white eyes, glowing eyes or more than one catch-light per eye; pure black outlines; photoreal fur, plush-toy, felt, 3D, vector, watercolor, chibi-sticker or anime rendering; blur, soft airbrush shading or a pixel filter over smooth art; sparkles, hearts, stars, "z" letters, motion lines, dust puffs, speech bubbles or any effect; text, numbers, labels, signatures or watermarks; floor, rug, grass, shadows or scenery; any change to the bunny between frames.
```

**QA checklist**
- [ ] **B1 anatomy:** exactly 2 ears, 4 legs, 1 cotton tail (when the view shows it); real-rabbit body, no human features.
- [ ] **B2 stage:** baby ears and proportions as the lock says; not a different stage.
- [ ] **B3 colour:** lilac fur with cream underside, pink inner ears and nose, near-black eyes with one catch-light; no tan/brown/white fur, no markings.
- [ ] **B4 nothing extra:** no clothes, accessories, effects, text, floor or shadow.
- [ ] **B5 pixel art (Gate 5 analogue):** crisp uniform pixel blocks, selout outline (not black), no blur or smooth paint, readable at about 40-60 px tall.
- [ ] **B9 likeness:** side by side with the approved bunny reference sheets, it is clearly the same bunny.
- [ ] **B6 motion (Gate 6/7 analogue):** every frame matches its numbered description; no filler frame, no two frames near-identical unless the list says so; no frame mirrored.
- [ ] **B7 continuity (Gate 7 analogue):** same size, ear length, eye spot, colours and floor line in every frame; no frame-to-frame drift.
- [ ] **B8 file (Gate 9 analogue):** 1536x1024, flat #FF00FF, exactly 3 figures in 3 equal columns with clear gaps.

### 2e. Rae holds the baby bunny (still with Rae)

**Purpose:** The bond moment: shown when the bunny reaches this stage and on its page. Rae's full contract applies.

**Output spec**
- File: `pb-rae-bunny-baby-hold-v1.png` → `assets/pixel-bloom/character/rae/source/bunny/`
- 1024×1024, flat `#FF00FF`, a single image (not a strip)
- Run in the **Rae chat**. Built later as a 1-frame cut-out; Rae and the bunny must touch.

**Attach**
- `assets/pixel-bloom/character/rae/reference/pb-rae-character-bible-v1.png`
- `public/rae/full-3q.png`
- `assets/pixel-bloom/character/bunny/reference/pb-bunny-ref-turnaround-v1.png`
- `assets/pixel-bloom/character/bunny/reference/pb-bunny-ref-growth-v1.png`

**Prompt** (paste as one message)

```text
Rae is a locked Pixel Bloom character. Preserve her canonical identity exactly. She is an adult Black bunny girl with warm medium-deep brown skin, black 4C natural hair in a voluminous natural updo/puff with tight coils and a few loose tendrils, exactly two tan bunny ears with soft flesh-pink inner ears emerging from the upper hair, no human ears, one small brown bunny tail, thin round gold glasses, exactly one owner-supplied black/gray lotus tattoo under the anatomical left collarbone near the shoulder and slightly beneath the left top strap, a thin gold chain with a small letter A pendant worn for her husband, thin dainty layered gold rings only, a pink fitted Pixel Bloom training top, lavender high-waisted leggings, and black-and-white Panda-Dunk-inspired genericized low-top sneakers. Render in stylized premium high-bit late-handheld/GBA-era pixel art, never photoreal. Do not invent or alter canonical anatomy, accessories, colors, tattoo count/location, hair texture, or identity. Match the approved Rae v1 character bible image exactly: same face, proportions, palette and pixel style. Never: human ears, a headband or clip-on ears, cat or fox ears, a missing or extra bunny ear, straight/wavy/silky hair, a second tattoo, a tattoo on the shoulder, outer arm, right side, neck, face or back, a white or pink tail, a cat/fox tail, more than one tail, an oversized tail, removed or restyled glasses (square, rimless, silver/black or sunglasses), a different necklace letter, a missing pendant or a silver chain, chunky jewelry, an added jacket/shorts/skirt/gloves or socks, a removed Pixel Bloom logo, photoreal skin, a child/teen look, or any identity change between frames.

Also keep exactly as in the attached Rae reference: her face, her proportions (about 7.5 heads tall), and her lavender wristbands. Her shoes have no logo of any kind. Rae's own ears stay her semi-upright tan bunny ears with flesh-pink insides at all times.

The other attached images are Rae's pet bunny (approved reference sheets). Draw that exact bunny, at the BABY stage:
BUNNY LOCK (Pixel Bloom pet, v1). This is Rae's pet bunny: a small domestic lop-eared rabbit (Holland Lop type) drawn as a real animal, not a cartoon person. Exactly four legs, exactly two ears, exactly one small round cotton tail. No clothing, collar, bow, hat or accessory of any kind. It never stands on two legs like a person and never holds objects. Fur is a solid soft lilac (dove-grey with a lavender cast) with a cream underside on the chin, muzzle, chest, belly, inner legs and underside of the tail. No spots, patches, stripes or other markings, so its left and right sides look identical. Fur palette: deep shadow #6B6385, shadow #8A82A3, base #A9A1BF, light #C8C1DA, cream #EEE8F4. Inner ears #F1849E with highlight #FFA6B8. Nose #F1849E. Eyes: large, round, solid near-black #171421 with one small #F8FAFF catch-light in the upper part of each eye, in the same spot in every frame. Outline: selective color-matched outline (selout); the darkest outline color is #4A3A5C, never pure black. No eyebrows, eyelashes, whiskers, teeth or human mouth; the mouth is a tiny Y shape under the nose. Style: the same premium high-bit late-handheld/GBA-era pixel art as the attached Rae reference: intentional visible pixel clusters in uniform square blocks, crisp silhouette, controlled cluster shading, minimal anti-aliasing, lighting the same as the Rae reference.
STAGE: BABY (kit). A very round ball-shaped body; the head is about as big as the body; tiny paws that barely show; short soft ears that stick out sideways and slightly down from the head ("airplane ears", not yet fully lopped), with the pink inner ear showing on their undersides. Small enough to sit in Rae's two cupped hands: about 1/7 of Rae's standing height, ears included. Drawn on a chunky pixel grid: about 36 pixel blocks tall when sitting.

TASK: one still image. Rae stands in the same 3/4 front view as the attached Rae 3/4 figure, cradling the BABY bunny in both cupped hands held low in front of her stomach, well below her chest, so her A pendant and lotus tattoo stay fully visible. She looks down at it with her canonical gentle closed-mouth smile. The baby bunny sits in her palms facing screen-left, airplane ears out, eyes open and calm. Her fingers curve softly around it (five fingers per hand, thin dainty gold rings only). Her feet stand flat, side by side.

SCALE: the bunny is 1/7 of Rae's standing height, ears included, exactly as the lock says. Rae and the bunny are drawn at the same pixel density (the bunny is about 36 pixel blocks tall sitting, on the same grid as Rae).

FORMAT: one 1024x1024 image, flat solid #FF00FF magenta background. Rae and the bunny as large as fits without cropping ears or feet. The bunny touches Rae's hand (or her leg), so the two form one connected shape with no magenta gap between them. No text, labels, floor, rug, shadow, sparkles, hearts or scenery.
```

**Negative / must-not** (paste in the same message, right after the prompt)

```text
For the BUNNY only (Rae follows her own rules above), do not draw: clothes, a collar, a bow, a hat, a harness or any accessory on it; human hands, fingers or a human face on it; eyebrows, eyelashes, whiskers, teeth or an open human mouth; the bunny standing on two legs like a person or holding anything; more or fewer than two ears, four legs or one tail; upright pointed ears (this is a lop); white, tan, brown, orange or grey-blue fur; spots, patches, stripes, a blaze or any marking; pink or white eyes, glowing eyes or more than one catch-light per eye; pure black outlines; photoreal fur, plush-toy, felt, 3D, vector, watercolor, chibi-sticker or anime rendering.

Also do not draw: the bunny covering Rae's A pendant or lotus tattoo; Rae with lop ears or lilac fur; a second bunny; extra or missing fingers; Rae wearing anything not in her canonical outfit; blur or smooth paint; text, labels, sparkles, hearts, floor, rug, shadows or scenery.
```

**QA checklist**
- [ ] **Gate 1 anatomy:** exactly two tan bunny ears with flesh-pink insides, semi-upright; **no human ear anywhere**; brown tail only where the view shows it; no duplicate limbs, fingers or accessories.
- [ ] **Gate 1 hair/face:** black 4C updo/puff with tight coils (not straight, wavy or a tiny puff); adult woman; stylized pixel face, not photoreal; warm medium-deep brown skin, not lightened.
- [ ] **Gate 2 signature details:** thin round gold glasses; exactly one lotus tattoo under her **anatomical left** collarbone (viewer-right in a front view), not on the shoulder cap, arm or right side; small A pendant on a thin gold chain (never R); rings thin and dainty only.
- [ ] **Gate 3 outfit:** pink fitted Pixel Bloom top, lavender high-waisted leggings, black-and-white low-top sneakers with no logo; lavender wristbands as in the reference; no added socks, jacket or gloves.
- [ ] **Gate 4 body:** adult curvy, strong, athletic proportions match the bible; no waist shrink, no bust/hip exaggeration, limb lengths stable.
- [ ] **Gate 5 pixel art:** high-bit GBA-era clusters, selout, crisp silhouette, no blur or smooth paint.
- [ ] **Gate 6 pose:** the pose matches the task; the bunny never covers the A pendant or tattoo; hands have five fingers each.
- [ ] **Gate 9 file:** 1024×1024, flat #FF00FF, Rae and the bunny touch (one connected shape), nothing cropped.
- [ ] **Bunny B1-B3:** baby stage, 2 ears, 4 legs, lilac/cream palette, same bunny as the reference sheets.
- [ ] **Scale:** the bunny is about 1/7 of Rae's height; it hasn't shrunk to a toy or grown past the lock.
- [ ] **No cross-over:** Rae's ears are still her own tan semi-upright bunny ears; the bunny has no tan/brown fur.
- [ ] **Final question (QA gate):** with the bible hidden, is this unmistakably the same Rae? If not clearly yes, it is not approved.

---

## 3. Young stage

### 3a. Young: idle loop (4 frames)

**Purpose:** Default state in the room on a normal day.

**Output spec**
- File: `pb-bunny-young-idle-strip-v1.png` → `assets/pixel-bloom/character/bunny/source/`
- 1536×1024, one row of 4 frames in 4 equal columns, flat `#FF00FF`, view: 3/4 front facing screen-left, sitting
- Playback proposal (Claude Code, later): fps 8, order `0,1,0,2,0,3`, hold `0:12,1:2,2:4,3:2` (about 5 s per cycle, loops). Reduced/off: still 0. Built with `--anchor grid`.

**Attach**
- `assets/pixel-bloom/character/bunny/reference/pb-bunny-ref-turnaround-v1.png`
- `assets/pixel-bloom/character/bunny/reference/pb-bunny-ref-growth-v1.png`
- `assets/pixel-bloom/character/rae/reference/pb-rae-character-bible-v1.png` (style only)

**Prompt** (paste as one message)

```text
BUNNY LOCK (Pixel Bloom pet, v1). This is Rae's pet bunny: a small domestic lop-eared rabbit (Holland Lop type) drawn as a real animal, not a cartoon person. Exactly four legs, exactly two ears, exactly one small round cotton tail. No clothing, collar, bow, hat or accessory of any kind. It never stands on two legs like a person and never holds objects. Fur is a solid soft lilac (dove-grey with a lavender cast) with a cream underside on the chin, muzzle, chest, belly, inner legs and underside of the tail. No spots, patches, stripes or other markings, so its left and right sides look identical. Fur palette: deep shadow #6B6385, shadow #8A82A3, base #A9A1BF, light #C8C1DA, cream #EEE8F4. Inner ears #F1849E with highlight #FFA6B8. Nose #F1849E. Eyes: large, round, solid near-black #171421 with one small #F8FAFF catch-light in the upper part of each eye, in the same spot in every frame. Outline: selective color-matched outline (selout); the darkest outline color is #4A3A5C, never pure black. No eyebrows, eyelashes, whiskers, teeth or human mouth; the mouth is a tiny Y shape under the nose. Style: the same premium high-bit late-handheld/GBA-era pixel art as the attached Rae reference: intentional visible pixel clusters in uniform square blocks, crisp silhouette, controlled cluster shading, minimal anti-aliasing, lighting the same as the Rae reference.

STAGE: YOUNG. A longer body with visible legs and slightly lanky proportions; the head is about three quarters the size of the body; the ears are now lopped, hanging down beside the cheeks, but still short, with tips at about cheek level and a thin pink rim of inner ear showing at the front edge. About 1/5 of Rae's standing height, ears included. Drawn on a chunky pixel grid: about 48 pixel blocks tall when sitting.

The attached bunny reference sheets are approved: draw that exact bunny at the YOUNG stage. The attached Rae character bible is a STYLE reference only; Rae does not appear in this image.

TASK: one animation strip of the YOUNG bunny: idle loop, 4 frames. Every frame is a complete drawing of the whole bunny.

STRIP FORMAT:
- One wide 1536x1024 image: one row of 4 frames on flat solid #FF00FF magenta.
- Split the width into 4 equal invisible columns and center one bunny in each column. Leave clear magenta between neighbouring bunnies: nothing touches or crosses into the next column.
- Same camera, same scale and the same floor line in every frame. The bunny is as large as fits its column. The floor line is invisible: no floor, rug, shadow or ground mark.
- View: 3/4 front facing screen-left, sitting. Never mirror a frame.
- No text, numbers, labels, borders, separator lines or effects.

FRAMES (left to right):
1. Sitting upright on all fours, legs visible, eyes open, looking toward screen-left. Short lop ears hanging relaxed.
2. Nose twitch: the nose and muzzle shift up by one pixel block and the cheeks puff very slightly. Everything else as frame 1.
3. Head tilt: the head tilts a little toward the viewer and the near lop ear swings slightly forward. Body unchanged.
4. Blink: both eyes closed into short horizontal lines. Everything else exactly as frame 1.

CONSISTENCY: the identical YOUNG bunny in every frame: same size, same ear length and shape, same eye size and catch-light spot, same colours, same outline. Only what each frame describes changes. No two frames identical.
```

**Negative / must-not** (paste in the same message, right after the prompt)

```text
Do not draw: clothes, a collar, a bow, a hat, a harness or any accessory; human hands, fingers or a human face; eyebrows, eyelashes, whiskers, teeth or an open human mouth; standing on two legs like a person; holding anything; more or fewer than two ears, four legs or one tail; upright pointed ears (this is a lop); white, tan, brown, orange or grey-blue fur; spots, patches, stripes, a blaze or any marking; pink or white eyes, glowing eyes or more than one catch-light per eye; pure black outlines; photoreal fur, plush-toy, felt, 3D, vector, watercolor, chibi-sticker or anime rendering; blur, soft airbrush shading or a pixel filter over smooth art; sparkles, hearts, stars, "z" letters, motion lines, dust puffs, speech bubbles or any effect; text, numbers, labels, signatures or watermarks; floor, rug, grass, shadows or scenery; any change to the bunny between frames.
```

**QA checklist**
- [ ] **B1 anatomy:** exactly 2 ears, 4 legs, 1 cotton tail (when the view shows it); real-rabbit body, no human features.
- [ ] **B2 stage:** young ears and proportions as the lock says; not a different stage.
- [ ] **B3 colour:** lilac fur with cream underside, pink inner ears and nose, near-black eyes with one catch-light; no tan/brown/white fur, no markings.
- [ ] **B4 nothing extra:** no clothes, accessories, effects, text, floor or shadow.
- [ ] **B5 pixel art (Gate 5 analogue):** crisp uniform pixel blocks, selout outline (not black), no blur or smooth paint, readable at about 40-60 px tall.
- [ ] **B9 likeness:** side by side with the approved bunny reference sheets, it is clearly the same bunny.
- [ ] **B6 motion (Gate 6/7 analogue):** every frame matches its numbered description; no filler frame, no two frames near-identical unless the list says so; no frame mirrored.
- [ ] **B7 continuity (Gate 7 analogue):** same size, ear length, eye spot, colours and floor line in every frame; no frame-to-frame drift.
- [ ] **B8 file (Gate 9 analogue):** 1536x1024, flat #FF00FF, exactly 4 figures in 4 equal columns with clear gaps.

### 3b. Young: hop loop (5 frames)

**Purpose:** An occasional hop across the rug. The art hops in place; the app slides the sprite and mirrors it to hop the other way (allowed: the bunny has no markings).

**Output spec**
- File: `pb-bunny-young-hop-strip-v1.png` → `assets/pixel-bloom/character/bunny/source/`
- 1536×1024, one row of 5 frames in 5 equal columns, flat `#FF00FF`, view: true side profile facing screen-left
- Playback proposal (Claude Code, later): fps 10, order `0,1,2,3,4`, hold `0:2` (about 0.6 s per hop). Full motion only. Reduced/off: none (idle still). Built with `--anchor grid`.

**Attach**
- `assets/pixel-bloom/character/bunny/reference/pb-bunny-ref-turnaround-v1.png`
- `assets/pixel-bloom/character/bunny/reference/pb-bunny-ref-growth-v1.png`
- `assets/pixel-bloom/character/rae/reference/pb-rae-character-bible-v1.png` (style only)

**Prompt** (paste as one message)

```text
BUNNY LOCK (Pixel Bloom pet, v1). This is Rae's pet bunny: a small domestic lop-eared rabbit (Holland Lop type) drawn as a real animal, not a cartoon person. Exactly four legs, exactly two ears, exactly one small round cotton tail. No clothing, collar, bow, hat or accessory of any kind. It never stands on two legs like a person and never holds objects. Fur is a solid soft lilac (dove-grey with a lavender cast) with a cream underside on the chin, muzzle, chest, belly, inner legs and underside of the tail. No spots, patches, stripes or other markings, so its left and right sides look identical. Fur palette: deep shadow #6B6385, shadow #8A82A3, base #A9A1BF, light #C8C1DA, cream #EEE8F4. Inner ears #F1849E with highlight #FFA6B8. Nose #F1849E. Eyes: large, round, solid near-black #171421 with one small #F8FAFF catch-light in the upper part of each eye, in the same spot in every frame. Outline: selective color-matched outline (selout); the darkest outline color is #4A3A5C, never pure black. No eyebrows, eyelashes, whiskers, teeth or human mouth; the mouth is a tiny Y shape under the nose. Style: the same premium high-bit late-handheld/GBA-era pixel art as the attached Rae reference: intentional visible pixel clusters in uniform square blocks, crisp silhouette, controlled cluster shading, minimal anti-aliasing, lighting the same as the Rae reference.

STAGE: YOUNG. A longer body with visible legs and slightly lanky proportions; the head is about three quarters the size of the body; the ears are now lopped, hanging down beside the cheeks, but still short, with tips at about cheek level and a thin pink rim of inner ear showing at the front edge. About 1/5 of Rae's standing height, ears included. Drawn on a chunky pixel grid: about 48 pixel blocks tall when sitting.

The attached bunny reference sheets are approved: draw that exact bunny at the YOUNG stage. The attached Rae character bible is a STYLE reference only; Rae does not appear in this image.

TASK: one animation strip of the YOUNG bunny: hop loop, 5 frames. Every frame is a complete drawing of the whole bunny.

STRIP FORMAT:
- One wide 1536x1024 image: one row of 5 frames on flat solid #FF00FF magenta.
- Split the width into 5 equal invisible columns and center one bunny in each column. Leave clear magenta between neighbouring bunnies: nothing touches or crosses into the next column.
- Same camera, same scale and the same floor line in every frame. The bunny is as large as fits its column. The floor line is invisible: no floor, rug, shadow or ground mark.
- View: true side profile facing screen-left. Never mirror a frame.
- No text, numbers, labels, borders, separator lines or effects.

FRAMES (left to right):
1. Crouched, gathering to hop: body low, hind feet under the body, ears hanging.
2. Push-off: hind legs extend fully behind, body stretched long and tilted up toward screen-left, front paws reaching forward.
3. Airborne at the peak: about half of its own height off the floor, body arched, front paws reaching down toward screen-left, hind legs trailing, lop ears lifted a little by the motion.
4. Landing: front paws on the floor, hind end high, body sloping down to the front, ears swinging forward.
5. Settled: hind feet land and come forward under the body, back to a crouch close to frame 1.

CONSISTENCY: the identical YOUNG bunny in every frame: same size, same ear length and shape, same eye size and catch-light spot, same colours, same outline. Only what each frame describes changes. No two frames identical.
```

**Negative / must-not** (paste in the same message, right after the prompt)

```text
Do not draw: clothes, a collar, a bow, a hat, a harness or any accessory; human hands, fingers or a human face; eyebrows, eyelashes, whiskers, teeth or an open human mouth; standing on two legs like a person; holding anything; more or fewer than two ears, four legs or one tail; upright pointed ears (this is a lop); white, tan, brown, orange or grey-blue fur; spots, patches, stripes, a blaze or any marking; pink or white eyes, glowing eyes or more than one catch-light per eye; pure black outlines; photoreal fur, plush-toy, felt, 3D, vector, watercolor, chibi-sticker or anime rendering; blur, soft airbrush shading or a pixel filter over smooth art; sparkles, hearts, stars, "z" letters, motion lines, dust puffs, speech bubbles or any effect; text, numbers, labels, signatures or watermarks; floor, rug, grass, shadows or scenery; any change to the bunny between frames.
```

**QA checklist**
- [ ] **B1 anatomy:** exactly 2 ears, 4 legs, 1 cotton tail (when the view shows it); real-rabbit body, no human features.
- [ ] **B2 stage:** young ears and proportions as the lock says; not a different stage.
- [ ] **B3 colour:** lilac fur with cream underside, pink inner ears and nose, near-black eyes with one catch-light; no tan/brown/white fur, no markings.
- [ ] **B4 nothing extra:** no clothes, accessories, effects, text, floor or shadow.
- [ ] **B5 pixel art (Gate 5 analogue):** crisp uniform pixel blocks, selout outline (not black), no blur or smooth paint, readable at about 40-60 px tall.
- [ ] **B9 likeness:** side by side with the approved bunny reference sheets, it is clearly the same bunny.
- [ ] **B6 motion (Gate 6/7 analogue):** every frame matches its numbered description; no filler frame, no two frames near-identical unless the list says so; no frame mirrored.
- [ ] **B7 continuity (Gate 7 analogue):** same size, ear length, eye spot, colours and floor line in every frame; no frame-to-frame drift.
- [ ] **B8 file (Gate 9 analogue):** 1536x1024, flat #FF00FF, exactly 5 figures in 5 equal columns with clear gaps.

### 3c. Young: happy / cheer reaction (5 frames)

**Purpose:** Plays once when she finishes a workout (and on a tap), then back to idle. A binky is a real rabbit's happy jump.

**Output spec**
- File: `pb-bunny-young-happy-strip-v1.png` → `assets/pixel-bloom/character/bunny/source/`
- 1536×1024, one row of 5 frames in 5 equal columns, flat `#FF00FF`, view: true side profile facing screen-left
- Playback proposal (Claude Code, later): fps 10, order `0,1,2,3,4`, hold `0:3,4:8`, plays once. Reduced: show still 4 briefly. Off: no swap. Built with `--anchor grid`.

**Attach**
- `assets/pixel-bloom/character/bunny/reference/pb-bunny-ref-turnaround-v1.png`
- `assets/pixel-bloom/character/bunny/reference/pb-bunny-ref-growth-v1.png`
- `assets/pixel-bloom/character/rae/reference/pb-rae-character-bible-v1.png` (style only)

**Prompt** (paste as one message)

```text
BUNNY LOCK (Pixel Bloom pet, v1). This is Rae's pet bunny: a small domestic lop-eared rabbit (Holland Lop type) drawn as a real animal, not a cartoon person. Exactly four legs, exactly two ears, exactly one small round cotton tail. No clothing, collar, bow, hat or accessory of any kind. It never stands on two legs like a person and never holds objects. Fur is a solid soft lilac (dove-grey with a lavender cast) with a cream underside on the chin, muzzle, chest, belly, inner legs and underside of the tail. No spots, patches, stripes or other markings, so its left and right sides look identical. Fur palette: deep shadow #6B6385, shadow #8A82A3, base #A9A1BF, light #C8C1DA, cream #EEE8F4. Inner ears #F1849E with highlight #FFA6B8. Nose #F1849E. Eyes: large, round, solid near-black #171421 with one small #F8FAFF catch-light in the upper part of each eye, in the same spot in every frame. Outline: selective color-matched outline (selout); the darkest outline color is #4A3A5C, never pure black. No eyebrows, eyelashes, whiskers, teeth or human mouth; the mouth is a tiny Y shape under the nose. Style: the same premium high-bit late-handheld/GBA-era pixel art as the attached Rae reference: intentional visible pixel clusters in uniform square blocks, crisp silhouette, controlled cluster shading, minimal anti-aliasing, lighting the same as the Rae reference.

STAGE: YOUNG. A longer body with visible legs and slightly lanky proportions; the head is about three quarters the size of the body; the ears are now lopped, hanging down beside the cheeks, but still short, with tips at about cheek level and a thin pink rim of inner ear showing at the front edge. About 1/5 of Rae's standing height, ears included. Drawn on a chunky pixel grid: about 48 pixel blocks tall when sitting.

The attached bunny reference sheets are approved: draw that exact bunny at the YOUNG stage. The attached Rae character bible is a STYLE reference only; Rae does not appear in this image.

TASK: one animation strip of the YOUNG bunny: happy / cheer reaction, 5 frames. Every frame is a complete drawing of the whole bunny.

STRIP FORMAT:
- One wide 1536x1024 image: one row of 5 frames on flat solid #FF00FF magenta.
- Split the width into 5 equal invisible columns and center one bunny in each column. Leave clear magenta between neighbouring bunnies: nothing touches or crosses into the next column.
- Same camera, same scale and the same floor line in every frame. The bunny is as large as fits its column. The floor line is invisible: no floor, rug, shadow or ground mark.
- View: true side profile facing screen-left. Never mirror a frame.
- No text, numbers, labels, borders, separator lines or effects.

FRAMES (left to right):
1. Sitting up alert, eyes bright, ear bases lifted a little: something nice just happened.
2. Deep crouch, about to spring.
3. Binky take-off: springing straight up, body starting to twist, head turning toward screen-left.
4. Binky peak: in mid-air the head twists one way and the hindquarters kick out sideways the other way, ears flung outward, eyes squeezed into happy arcs.
5. Landed, sitting up tall, nose raised, eyes in happy arcs with a 1-block #FFD6E7 cheek blush.

CONSISTENCY: the identical YOUNG bunny in every frame: same size, same ear length and shape, same eye size and catch-light spot, same colours, same outline. Only what each frame describes changes. No two frames identical.
```

**Negative / must-not** (paste in the same message, right after the prompt)

```text
Do not draw: clothes, a collar, a bow, a hat, a harness or any accessory; human hands, fingers or a human face; eyebrows, eyelashes, whiskers, teeth or an open human mouth; standing on two legs like a person; holding anything; more or fewer than two ears, four legs or one tail; upright pointed ears (this is a lop); white, tan, brown, orange or grey-blue fur; spots, patches, stripes, a blaze or any marking; pink or white eyes, glowing eyes or more than one catch-light per eye; pure black outlines; photoreal fur, plush-toy, felt, 3D, vector, watercolor, chibi-sticker or anime rendering; blur, soft airbrush shading or a pixel filter over smooth art; sparkles, hearts, stars, "z" letters, motion lines, dust puffs, speech bubbles or any effect; text, numbers, labels, signatures or watermarks; floor, rug, grass, shadows or scenery; any change to the bunny between frames.
```

**QA checklist**
- [ ] **B1 anatomy:** exactly 2 ears, 4 legs, 1 cotton tail (when the view shows it); real-rabbit body, no human features.
- [ ] **B2 stage:** young ears and proportions as the lock says; not a different stage.
- [ ] **B3 colour:** lilac fur with cream underside, pink inner ears and nose, near-black eyes with one catch-light; no tan/brown/white fur, no markings.
- [ ] **B4 nothing extra:** no clothes, accessories, effects, text, floor or shadow.
- [ ] **B5 pixel art (Gate 5 analogue):** crisp uniform pixel blocks, selout outline (not black), no blur or smooth paint, readable at about 40-60 px tall.
- [ ] **B9 likeness:** side by side with the approved bunny reference sheets, it is clearly the same bunny.
- [ ] **B6 motion (Gate 6/7 analogue):** every frame matches its numbered description; no filler frame, no two frames near-identical unless the list says so; no frame mirrored.
- [ ] **B7 continuity (Gate 7 analogue):** same size, ear length, eye spot, colours and floor line in every frame; no frame-to-frame drift.
- [ ] **B8 file (Gate 9 analogue):** 1536x1024, flat #FF00FF, exactly 5 figures in 5 equal columns with clear gaps.

### 3d. Young: sleeping (rest days) (3 frames)

**Purpose:** Rest days and night. Calm, never sad.

**Output spec**
- File: `pb-bunny-young-sleep-strip-v1.png` → `assets/pixel-bloom/character/bunny/source/`
- 1536×1024, one row of 3 frames in 3 equal columns, flat `#FF00FF`, view: 3/4 front facing screen-left (grown: lying on its side)
- Playback proposal (Claude Code, later): fps 4, order `0,1,0,1,0,1,2,1`, hold `0:3,1:3` (about 4 s per cycle, loops). Reduced/off: still 1. Built with `--anchor grid`.

**Attach**
- `assets/pixel-bloom/character/bunny/reference/pb-bunny-ref-turnaround-v1.png`
- `assets/pixel-bloom/character/bunny/reference/pb-bunny-ref-growth-v1.png`
- `assets/pixel-bloom/character/rae/reference/pb-rae-character-bible-v1.png` (style only)

**Prompt** (paste as one message)

```text
BUNNY LOCK (Pixel Bloom pet, v1). This is Rae's pet bunny: a small domestic lop-eared rabbit (Holland Lop type) drawn as a real animal, not a cartoon person. Exactly four legs, exactly two ears, exactly one small round cotton tail. No clothing, collar, bow, hat or accessory of any kind. It never stands on two legs like a person and never holds objects. Fur is a solid soft lilac (dove-grey with a lavender cast) with a cream underside on the chin, muzzle, chest, belly, inner legs and underside of the tail. No spots, patches, stripes or other markings, so its left and right sides look identical. Fur palette: deep shadow #6B6385, shadow #8A82A3, base #A9A1BF, light #C8C1DA, cream #EEE8F4. Inner ears #F1849E with highlight #FFA6B8. Nose #F1849E. Eyes: large, round, solid near-black #171421 with one small #F8FAFF catch-light in the upper part of each eye, in the same spot in every frame. Outline: selective color-matched outline (selout); the darkest outline color is #4A3A5C, never pure black. No eyebrows, eyelashes, whiskers, teeth or human mouth; the mouth is a tiny Y shape under the nose. Style: the same premium high-bit late-handheld/GBA-era pixel art as the attached Rae reference: intentional visible pixel clusters in uniform square blocks, crisp silhouette, controlled cluster shading, minimal anti-aliasing, lighting the same as the Rae reference.

STAGE: YOUNG. A longer body with visible legs and slightly lanky proportions; the head is about three quarters the size of the body; the ears are now lopped, hanging down beside the cheeks, but still short, with tips at about cheek level and a thin pink rim of inner ear showing at the front edge. About 1/5 of Rae's standing height, ears included. Drawn on a chunky pixel grid: about 48 pixel blocks tall when sitting.

The attached bunny reference sheets are approved: draw that exact bunny at the YOUNG stage. The attached Rae character bible is a STYLE reference only; Rae does not appear in this image.

TASK: one animation strip of the YOUNG bunny: sleeping (rest days), 3 frames. Every frame is a complete drawing of the whole bunny.

STRIP FORMAT:
- One wide 1536x1024 image: one row of 3 frames on flat solid #FF00FF magenta.
- Split the width into 3 equal invisible columns and center one bunny in each column. Leave clear magenta between neighbouring bunnies: nothing touches or crosses into the next column.
- Same camera, same scale and the same floor line in every frame. The bunny is as large as fits its column. The floor line is invisible: no floor, rug, shadow or ground mark.
- View: 3/4 front facing screen-left (grown: lying on its side). Never mirror a frame.
- No text, numbers, labels, borders, separator lines or effects.

FRAMES (left to right):
1. Asleep in a "loaf": front paws tucked under the chest, body rounded, eyes closed as short curved lines, lop ears resting against the cheeks. Breath in: the back is one pixel block higher.
2. Same pose, breath out: the back is one pixel block lower than frame 1. Nothing else changes.
3. Same pose as frame 2, a dreaming twitch: the nose shifts by one block and the near ear tip twitches. Eyes stay closed.

CONSISTENCY: the identical YOUNG bunny in every frame: same size, same ear length and shape, same eye size and catch-light spot, same colours, same outline. Only what each frame describes changes. No two frames identical.
```

**Negative / must-not** (paste in the same message, right after the prompt)

```text
Do not draw: clothes, a collar, a bow, a hat, a harness or any accessory; human hands, fingers or a human face; eyebrows, eyelashes, whiskers, teeth or an open human mouth; standing on two legs like a person; holding anything; more or fewer than two ears, four legs or one tail; upright pointed ears (this is a lop); white, tan, brown, orange or grey-blue fur; spots, patches, stripes, a blaze or any marking; pink or white eyes, glowing eyes or more than one catch-light per eye; pure black outlines; photoreal fur, plush-toy, felt, 3D, vector, watercolor, chibi-sticker or anime rendering; blur, soft airbrush shading or a pixel filter over smooth art; sparkles, hearts, stars, "z" letters, motion lines, dust puffs, speech bubbles or any effect; text, numbers, labels, signatures or watermarks; floor, rug, grass, shadows or scenery; any change to the bunny between frames.
```

**QA checklist**
- [ ] **B1 anatomy:** exactly 2 ears, 4 legs, 1 cotton tail (when the view shows it); real-rabbit body, no human features.
- [ ] **B2 stage:** young ears and proportions as the lock says; not a different stage.
- [ ] **B3 colour:** lilac fur with cream underside, pink inner ears and nose, near-black eyes with one catch-light; no tan/brown/white fur, no markings.
- [ ] **B4 nothing extra:** no clothes, accessories, effects, text, floor or shadow.
- [ ] **B5 pixel art (Gate 5 analogue):** crisp uniform pixel blocks, selout outline (not black), no blur or smooth paint, readable at about 40-60 px tall.
- [ ] **B9 likeness:** side by side with the approved bunny reference sheets, it is clearly the same bunny.
- [ ] **B6 motion (Gate 6/7 analogue):** every frame matches its numbered description; no filler frame, no two frames near-identical unless the list says so; no frame mirrored.
- [ ] **B7 continuity (Gate 7 analogue):** same size, ear length, eye spot, colours and floor line in every frame; no frame-to-frame drift.
- [ ] **B8 file (Gate 9 analogue):** 1536x1024, flat #FF00FF, exactly 3 figures in 3 equal columns with clear gaps.

### 3e. Rae pets the young bunny (still with Rae)

**Purpose:** The bond moment: shown when the bunny reaches this stage and on its page. Rae's full contract applies.

**Output spec**
- File: `pb-rae-bunny-young-pet-v1.png` → `assets/pixel-bloom/character/rae/source/bunny/`
- 1024×1024, flat `#FF00FF`, a single image (not a strip)
- Run in the **Rae chat**. Built later as a 1-frame cut-out; Rae and the bunny must touch.

**Attach**
- `assets/pixel-bloom/character/rae/reference/pb-rae-character-bible-v1.png`
- `public/rae/full-3q.png`
- `assets/pixel-bloom/character/bunny/reference/pb-bunny-ref-turnaround-v1.png`
- `assets/pixel-bloom/character/bunny/reference/pb-bunny-ref-growth-v1.png`

**Prompt** (paste as one message)

```text
Rae is a locked Pixel Bloom character. Preserve her canonical identity exactly. She is an adult Black bunny girl with warm medium-deep brown skin, black 4C natural hair in a voluminous natural updo/puff with tight coils and a few loose tendrils, exactly two tan bunny ears with soft flesh-pink inner ears emerging from the upper hair, no human ears, one small brown bunny tail, thin round gold glasses, exactly one owner-supplied black/gray lotus tattoo under the anatomical left collarbone near the shoulder and slightly beneath the left top strap, a thin gold chain with a small letter A pendant worn for her husband, thin dainty layered gold rings only, a pink fitted Pixel Bloom training top, lavender high-waisted leggings, and black-and-white Panda-Dunk-inspired genericized low-top sneakers. Render in stylized premium high-bit late-handheld/GBA-era pixel art, never photoreal. Do not invent or alter canonical anatomy, accessories, colors, tattoo count/location, hair texture, or identity. Match the approved Rae v1 character bible image exactly: same face, proportions, palette and pixel style. Never: human ears, a headband or clip-on ears, cat or fox ears, a missing or extra bunny ear, straight/wavy/silky hair, a second tattoo, a tattoo on the shoulder, outer arm, right side, neck, face or back, a white or pink tail, a cat/fox tail, more than one tail, an oversized tail, removed or restyled glasses (square, rimless, silver/black or sunglasses), a different necklace letter, a missing pendant or a silver chain, chunky jewelry, an added jacket/shorts/skirt/gloves or socks, a removed Pixel Bloom logo, photoreal skin, a child/teen look, or any identity change between frames.

Also keep exactly as in the attached Rae reference: her face, her proportions (about 7.5 heads tall), and her lavender wristbands. Her shoes have no logo of any kind. Rae's own ears stay her semi-upright tan bunny ears with flesh-pink insides at all times.

The other attached images are Rae's pet bunny (approved reference sheets). Draw that exact bunny, at the YOUNG stage:
BUNNY LOCK (Pixel Bloom pet, v1). This is Rae's pet bunny: a small domestic lop-eared rabbit (Holland Lop type) drawn as a real animal, not a cartoon person. Exactly four legs, exactly two ears, exactly one small round cotton tail. No clothing, collar, bow, hat or accessory of any kind. It never stands on two legs like a person and never holds objects. Fur is a solid soft lilac (dove-grey with a lavender cast) with a cream underside on the chin, muzzle, chest, belly, inner legs and underside of the tail. No spots, patches, stripes or other markings, so its left and right sides look identical. Fur palette: deep shadow #6B6385, shadow #8A82A3, base #A9A1BF, light #C8C1DA, cream #EEE8F4. Inner ears #F1849E with highlight #FFA6B8. Nose #F1849E. Eyes: large, round, solid near-black #171421 with one small #F8FAFF catch-light in the upper part of each eye, in the same spot in every frame. Outline: selective color-matched outline (selout); the darkest outline color is #4A3A5C, never pure black. No eyebrows, eyelashes, whiskers, teeth or human mouth; the mouth is a tiny Y shape under the nose. Style: the same premium high-bit late-handheld/GBA-era pixel art as the attached Rae reference: intentional visible pixel clusters in uniform square blocks, crisp silhouette, controlled cluster shading, minimal anti-aliasing, lighting the same as the Rae reference.
STAGE: YOUNG. A longer body with visible legs and slightly lanky proportions; the head is about three quarters the size of the body; the ears are now lopped, hanging down beside the cheeks, but still short, with tips at about cheek level and a thin pink rim of inner ear showing at the front edge. About 1/5 of Rae's standing height, ears included. Drawn on a chunky pixel grid: about 48 pixel blocks tall when sitting.

TASK: one still image. Rae kneels on one knee in a 3/4 front view (like the attached Rae 3/4 figure, lowered into a kneel), torso upright. Her near hand gently strokes the YOUNG bunny's back from head toward tail; her other hand rests on her raised knee. The young bunny sits on all fours on the floor beside her front foot, facing screen-left, eyes half closed and content, short lop ears relaxed. Her A pendant and lotus tattoo stay visible and uncovered. Her expression is the canonical "happy": brighter eyes, wider smile. Her glasses, hair and ears are unchanged by the kneel.

SCALE: the bunny is 1/5 of Rae's standing height, ears included, exactly as the lock says. Rae and the bunny are drawn at the same pixel density (the bunny is about 48 pixel blocks tall sitting, on the same grid as Rae).

FORMAT: one 1024x1024 image, flat solid #FF00FF magenta background. Rae and the bunny as large as fits without cropping ears or feet. The bunny touches Rae's hand (or her leg), so the two form one connected shape with no magenta gap between them. No text, labels, floor, rug, shadow, sparkles, hearts or scenery.
```

**Negative / must-not** (paste in the same message, right after the prompt)

```text
For the BUNNY only (Rae follows her own rules above), do not draw: clothes, a collar, a bow, a hat, a harness or any accessory on it; human hands, fingers or a human face on it; eyebrows, eyelashes, whiskers, teeth or an open human mouth; the bunny standing on two legs like a person or holding anything; more or fewer than two ears, four legs or one tail; upright pointed ears (this is a lop); white, tan, brown, orange or grey-blue fur; spots, patches, stripes, a blaze or any marking; pink or white eyes, glowing eyes or more than one catch-light per eye; pure black outlines; photoreal fur, plush-toy, felt, 3D, vector, watercolor, chibi-sticker or anime rendering.

Also do not draw: the bunny covering Rae's A pendant or lotus tattoo; Rae with lop ears or lilac fur; a second bunny; extra or missing fingers; Rae wearing anything not in her canonical outfit; blur or smooth paint; text, labels, sparkles, hearts, floor, rug, shadows or scenery.
```

**QA checklist**
- [ ] **Gate 1 anatomy:** exactly two tan bunny ears with flesh-pink insides, semi-upright; **no human ear anywhere**; brown tail only where the view shows it; no duplicate limbs, fingers or accessories.
- [ ] **Gate 1 hair/face:** black 4C updo/puff with tight coils (not straight, wavy or a tiny puff); adult woman; stylized pixel face, not photoreal; warm medium-deep brown skin, not lightened.
- [ ] **Gate 2 signature details:** thin round gold glasses; exactly one lotus tattoo under her **anatomical left** collarbone (viewer-right in a front view), not on the shoulder cap, arm or right side; small A pendant on a thin gold chain (never R); rings thin and dainty only.
- [ ] **Gate 3 outfit:** pink fitted Pixel Bloom top, lavender high-waisted leggings, black-and-white low-top sneakers with no logo; lavender wristbands as in the reference; no added socks, jacket or gloves.
- [ ] **Gate 4 body:** adult curvy, strong, athletic proportions match the bible; no waist shrink, no bust/hip exaggeration, limb lengths stable.
- [ ] **Gate 5 pixel art:** high-bit GBA-era clusters, selout, crisp silhouette, no blur or smooth paint.
- [ ] **Gate 6 pose:** the pose matches the task; the bunny never covers the A pendant or tattoo; hands have five fingers each.
- [ ] **Gate 9 file:** 1024×1024, flat #FF00FF, Rae and the bunny touch (one connected shape), nothing cropped.
- [ ] **Bunny B1-B3:** young stage, 2 ears, 4 legs, lilac/cream palette, same bunny as the reference sheets.
- [ ] **Scale:** the bunny is about 1/5 of Rae's height; it hasn't shrunk to a toy or grown past the lock.
- [ ] **No cross-over:** Rae's ears are still her own tan semi-upright bunny ears; the bunny has no tan/brown fur.
- [ ] **Final question (QA gate):** with the bible hidden, is this unmistakably the same Rae? If not clearly yes, it is not approved.

---

## 4. Grown stage

### 4a. Grown: idle loop (4 frames)

**Purpose:** Default state in the room on a normal day.

**Output spec**
- File: `pb-bunny-grown-idle-strip-v1.png` → `assets/pixel-bloom/character/bunny/source/`
- 1536×1024, one row of 4 frames in 4 equal columns, flat `#FF00FF`, view: 3/4 front facing screen-left, sitting
- Playback proposal (Claude Code, later): fps 8, order `0,1,0,2,0,3`, hold `0:12,1:2,2:4,3:2` (about 5 s per cycle, loops). Reduced/off: still 0. Built with `--anchor grid`.

**Attach**
- `assets/pixel-bloom/character/bunny/reference/pb-bunny-ref-turnaround-v1.png`
- `assets/pixel-bloom/character/bunny/reference/pb-bunny-ref-growth-v1.png`
- `assets/pixel-bloom/character/rae/reference/pb-rae-character-bible-v1.png` (style only)

**Prompt** (paste as one message)

```text
BUNNY LOCK (Pixel Bloom pet, v1). This is Rae's pet bunny: a small domestic lop-eared rabbit (Holland Lop type) drawn as a real animal, not a cartoon person. Exactly four legs, exactly two ears, exactly one small round cotton tail. No clothing, collar, bow, hat or accessory of any kind. It never stands on two legs like a person and never holds objects. Fur is a solid soft lilac (dove-grey with a lavender cast) with a cream underside on the chin, muzzle, chest, belly, inner legs and underside of the tail. No spots, patches, stripes or other markings, so its left and right sides look identical. Fur palette: deep shadow #6B6385, shadow #8A82A3, base #A9A1BF, light #C8C1DA, cream #EEE8F4. Inner ears #F1849E with highlight #FFA6B8. Nose #F1849E. Eyes: large, round, solid near-black #171421 with one small #F8FAFF catch-light in the upper part of each eye, in the same spot in every frame. Outline: selective color-matched outline (selout); the darkest outline color is #4A3A5C, never pure black. No eyebrows, eyelashes, whiskers, teeth or human mouth; the mouth is a tiny Y shape under the nose. Style: the same premium high-bit late-handheld/GBA-era pixel art as the attached Rae reference: intentional visible pixel clusters in uniform square blocks, crisp silhouette, controlled cluster shading, minimal anti-aliasing, lighting the same as the Rae reference.

STAGE: GROWN. A compact, rounded "loaf" body with broad cheeks and a short neck; a soft rounded "crown" bump on top of the head where the ears attach; fully lopped ears hanging close beside the cheeks with rounded tips at jaw level and a thin pink rim of inner ear at the front edge. About 1/4 of Rae's standing height, ears included (about the height of her knee). Drawn on a chunky pixel grid: about 60 pixel blocks tall when sitting.

The attached bunny reference sheets are approved: draw that exact bunny at the GROWN stage. The attached Rae character bible is a STYLE reference only; Rae does not appear in this image.

TASK: one animation strip of the GROWN bunny: idle loop, 4 frames. Every frame is a complete drawing of the whole bunny.

STRIP FORMAT:
- One wide 1536x1024 image: one row of 4 frames on flat solid #FF00FF magenta.
- Split the width into 4 equal invisible columns and center one bunny in each column. Leave clear magenta between neighbouring bunnies: nothing touches or crosses into the next column.
- Same camera, same scale and the same floor line in every frame. The bunny is as large as fits its column. The floor line is invisible: no floor, rug, shadow or ground mark.
- View: 3/4 front facing screen-left, sitting. Never mirror a frame.
- No text, numbers, labels, borders, separator lines or effects.

FRAMES (left to right):
1. Sitting in a relaxed loaf, eyes open, looking toward screen-left. Full lop ears hanging beside the cheeks.
2. Nose twitch: the nose and muzzle shift up by one pixel block and the cheeks puff very slightly. Everything else as frame 1.
3. Head tilt: the head tilts a little toward the viewer and the near lop ear swings slightly forward. Body unchanged.
4. Blink: both eyes closed into short horizontal lines. Everything else exactly as frame 1.

CONSISTENCY: the identical GROWN bunny in every frame: same size, same ear length and shape, same eye size and catch-light spot, same colours, same outline. Only what each frame describes changes. No two frames identical.
```

**Negative / must-not** (paste in the same message, right after the prompt)

```text
Do not draw: clothes, a collar, a bow, a hat, a harness or any accessory; human hands, fingers or a human face; eyebrows, eyelashes, whiskers, teeth or an open human mouth; standing on two legs like a person; holding anything; more or fewer than two ears, four legs or one tail; upright pointed ears (this is a lop); white, tan, brown, orange or grey-blue fur; spots, patches, stripes, a blaze or any marking; pink or white eyes, glowing eyes or more than one catch-light per eye; pure black outlines; photoreal fur, plush-toy, felt, 3D, vector, watercolor, chibi-sticker or anime rendering; blur, soft airbrush shading or a pixel filter over smooth art; sparkles, hearts, stars, "z" letters, motion lines, dust puffs, speech bubbles or any effect; text, numbers, labels, signatures or watermarks; floor, rug, grass, shadows or scenery; any change to the bunny between frames.
```

**QA checklist**
- [ ] **B1 anatomy:** exactly 2 ears, 4 legs, 1 cotton tail (when the view shows it); real-rabbit body, no human features.
- [ ] **B2 stage:** grown ears and proportions as the lock says; not a different stage.
- [ ] **B3 colour:** lilac fur with cream underside, pink inner ears and nose, near-black eyes with one catch-light; no tan/brown/white fur, no markings.
- [ ] **B4 nothing extra:** no clothes, accessories, effects, text, floor or shadow.
- [ ] **B5 pixel art (Gate 5 analogue):** crisp uniform pixel blocks, selout outline (not black), no blur or smooth paint, readable at about 40-60 px tall.
- [ ] **B9 likeness:** side by side with the approved bunny reference sheets, it is clearly the same bunny.
- [ ] **B6 motion (Gate 6/7 analogue):** every frame matches its numbered description; no filler frame, no two frames near-identical unless the list says so; no frame mirrored.
- [ ] **B7 continuity (Gate 7 analogue):** same size, ear length, eye spot, colours and floor line in every frame; no frame-to-frame drift.
- [ ] **B8 file (Gate 9 analogue):** 1536x1024, flat #FF00FF, exactly 4 figures in 4 equal columns with clear gaps.

### 4b. Grown: hop loop (5 frames)

**Purpose:** An occasional hop across the rug. The art hops in place; the app slides the sprite and mirrors it to hop the other way (allowed: the bunny has no markings).

**Output spec**
- File: `pb-bunny-grown-hop-strip-v1.png` → `assets/pixel-bloom/character/bunny/source/`
- 1536×1024, one row of 5 frames in 5 equal columns, flat `#FF00FF`, view: true side profile facing screen-left
- Playback proposal (Claude Code, later): fps 10, order `0,1,2,3,4`, hold `0:2` (about 0.6 s per hop). Full motion only. Reduced/off: none (idle still). Built with `--anchor grid`.

**Attach**
- `assets/pixel-bloom/character/bunny/reference/pb-bunny-ref-turnaround-v1.png`
- `assets/pixel-bloom/character/bunny/reference/pb-bunny-ref-growth-v1.png`
- `assets/pixel-bloom/character/rae/reference/pb-rae-character-bible-v1.png` (style only)

**Prompt** (paste as one message)

```text
BUNNY LOCK (Pixel Bloom pet, v1). This is Rae's pet bunny: a small domestic lop-eared rabbit (Holland Lop type) drawn as a real animal, not a cartoon person. Exactly four legs, exactly two ears, exactly one small round cotton tail. No clothing, collar, bow, hat or accessory of any kind. It never stands on two legs like a person and never holds objects. Fur is a solid soft lilac (dove-grey with a lavender cast) with a cream underside on the chin, muzzle, chest, belly, inner legs and underside of the tail. No spots, patches, stripes or other markings, so its left and right sides look identical. Fur palette: deep shadow #6B6385, shadow #8A82A3, base #A9A1BF, light #C8C1DA, cream #EEE8F4. Inner ears #F1849E with highlight #FFA6B8. Nose #F1849E. Eyes: large, round, solid near-black #171421 with one small #F8FAFF catch-light in the upper part of each eye, in the same spot in every frame. Outline: selective color-matched outline (selout); the darkest outline color is #4A3A5C, never pure black. No eyebrows, eyelashes, whiskers, teeth or human mouth; the mouth is a tiny Y shape under the nose. Style: the same premium high-bit late-handheld/GBA-era pixel art as the attached Rae reference: intentional visible pixel clusters in uniform square blocks, crisp silhouette, controlled cluster shading, minimal anti-aliasing, lighting the same as the Rae reference.

STAGE: GROWN. A compact, rounded "loaf" body with broad cheeks and a short neck; a soft rounded "crown" bump on top of the head where the ears attach; fully lopped ears hanging close beside the cheeks with rounded tips at jaw level and a thin pink rim of inner ear at the front edge. About 1/4 of Rae's standing height, ears included (about the height of her knee). Drawn on a chunky pixel grid: about 60 pixel blocks tall when sitting.

The attached bunny reference sheets are approved: draw that exact bunny at the GROWN stage. The attached Rae character bible is a STYLE reference only; Rae does not appear in this image.

TASK: one animation strip of the GROWN bunny: hop loop, 5 frames. Every frame is a complete drawing of the whole bunny.

STRIP FORMAT:
- One wide 1536x1024 image: one row of 5 frames on flat solid #FF00FF magenta.
- Split the width into 5 equal invisible columns and center one bunny in each column. Leave clear magenta between neighbouring bunnies: nothing touches or crosses into the next column.
- Same camera, same scale and the same floor line in every frame. The bunny is as large as fits its column. The floor line is invisible: no floor, rug, shadow or ground mark.
- View: true side profile facing screen-left. Never mirror a frame.
- No text, numbers, labels, borders, separator lines or effects.

FRAMES (left to right):
1. Crouched, gathering to hop: compact body low, hind feet under the body, ears hanging.
2. Push-off: hind legs extend behind, body stretched and tilted up toward screen-left, front paws reaching forward.
3. Airborne at the peak: a calm, confident hop about a third of its own height off the floor, body level and stretched, front paws reaching down toward screen-left, ears lifted a little by the motion.
4. Landing: front paws on the floor, hind end raised, ears swinging forward.
5. Settled: hind feet land and come forward under the body, back to a crouch close to frame 1.

CONSISTENCY: the identical GROWN bunny in every frame: same size, same ear length and shape, same eye size and catch-light spot, same colours, same outline. Only what each frame describes changes. No two frames identical.
```

**Negative / must-not** (paste in the same message, right after the prompt)

```text
Do not draw: clothes, a collar, a bow, a hat, a harness or any accessory; human hands, fingers or a human face; eyebrows, eyelashes, whiskers, teeth or an open human mouth; standing on two legs like a person; holding anything; more or fewer than two ears, four legs or one tail; upright pointed ears (this is a lop); white, tan, brown, orange or grey-blue fur; spots, patches, stripes, a blaze or any marking; pink or white eyes, glowing eyes or more than one catch-light per eye; pure black outlines; photoreal fur, plush-toy, felt, 3D, vector, watercolor, chibi-sticker or anime rendering; blur, soft airbrush shading or a pixel filter over smooth art; sparkles, hearts, stars, "z" letters, motion lines, dust puffs, speech bubbles or any effect; text, numbers, labels, signatures or watermarks; floor, rug, grass, shadows or scenery; any change to the bunny between frames.
```

**QA checklist**
- [ ] **B1 anatomy:** exactly 2 ears, 4 legs, 1 cotton tail (when the view shows it); real-rabbit body, no human features.
- [ ] **B2 stage:** grown ears and proportions as the lock says; not a different stage.
- [ ] **B3 colour:** lilac fur with cream underside, pink inner ears and nose, near-black eyes with one catch-light; no tan/brown/white fur, no markings.
- [ ] **B4 nothing extra:** no clothes, accessories, effects, text, floor or shadow.
- [ ] **B5 pixel art (Gate 5 analogue):** crisp uniform pixel blocks, selout outline (not black), no blur or smooth paint, readable at about 40-60 px tall.
- [ ] **B9 likeness:** side by side with the approved bunny reference sheets, it is clearly the same bunny.
- [ ] **B6 motion (Gate 6/7 analogue):** every frame matches its numbered description; no filler frame, no two frames near-identical unless the list says so; no frame mirrored.
- [ ] **B7 continuity (Gate 7 analogue):** same size, ear length, eye spot, colours and floor line in every frame; no frame-to-frame drift.
- [ ] **B8 file (Gate 9 analogue):** 1536x1024, flat #FF00FF, exactly 5 figures in 5 equal columns with clear gaps.

### 4c. Grown: happy / cheer reaction (5 frames)

**Purpose:** Plays once when she finishes a workout (and on a tap), then back to idle. A binky is a real rabbit's happy jump.

**Output spec**
- File: `pb-bunny-grown-happy-strip-v1.png` → `assets/pixel-bloom/character/bunny/source/`
- 1536×1024, one row of 5 frames in 5 equal columns, flat `#FF00FF`, view: true side profile facing screen-left
- Playback proposal (Claude Code, later): fps 10, order `0,1,2,3,4`, hold `0:3,4:8`, plays once. Reduced: show still 4 briefly. Off: no swap. Built with `--anchor grid`.

**Attach**
- `assets/pixel-bloom/character/bunny/reference/pb-bunny-ref-turnaround-v1.png`
- `assets/pixel-bloom/character/bunny/reference/pb-bunny-ref-growth-v1.png`
- `assets/pixel-bloom/character/rae/reference/pb-rae-character-bible-v1.png` (style only)

**Prompt** (paste as one message)

```text
BUNNY LOCK (Pixel Bloom pet, v1). This is Rae's pet bunny: a small domestic lop-eared rabbit (Holland Lop type) drawn as a real animal, not a cartoon person. Exactly four legs, exactly two ears, exactly one small round cotton tail. No clothing, collar, bow, hat or accessory of any kind. It never stands on two legs like a person and never holds objects. Fur is a solid soft lilac (dove-grey with a lavender cast) with a cream underside on the chin, muzzle, chest, belly, inner legs and underside of the tail. No spots, patches, stripes or other markings, so its left and right sides look identical. Fur palette: deep shadow #6B6385, shadow #8A82A3, base #A9A1BF, light #C8C1DA, cream #EEE8F4. Inner ears #F1849E with highlight #FFA6B8. Nose #F1849E. Eyes: large, round, solid near-black #171421 with one small #F8FAFF catch-light in the upper part of each eye, in the same spot in every frame. Outline: selective color-matched outline (selout); the darkest outline color is #4A3A5C, never pure black. No eyebrows, eyelashes, whiskers, teeth or human mouth; the mouth is a tiny Y shape under the nose. Style: the same premium high-bit late-handheld/GBA-era pixel art as the attached Rae reference: intentional visible pixel clusters in uniform square blocks, crisp silhouette, controlled cluster shading, minimal anti-aliasing, lighting the same as the Rae reference.

STAGE: GROWN. A compact, rounded "loaf" body with broad cheeks and a short neck; a soft rounded "crown" bump on top of the head where the ears attach; fully lopped ears hanging close beside the cheeks with rounded tips at jaw level and a thin pink rim of inner ear at the front edge. About 1/4 of Rae's standing height, ears included (about the height of her knee). Drawn on a chunky pixel grid: about 60 pixel blocks tall when sitting.

The attached bunny reference sheets are approved: draw that exact bunny at the GROWN stage. The attached Rae character bible is a STYLE reference only; Rae does not appear in this image.

TASK: one animation strip of the GROWN bunny: happy / cheer reaction, 5 frames. Every frame is a complete drawing of the whole bunny.

STRIP FORMAT:
- One wide 1536x1024 image: one row of 5 frames on flat solid #FF00FF magenta.
- Split the width into 5 equal invisible columns and center one bunny in each column. Leave clear magenta between neighbouring bunnies: nothing touches or crosses into the next column.
- Same camera, same scale and the same floor line in every frame. The bunny is as large as fits its column. The floor line is invisible: no floor, rug, shadow or ground mark.
- View: true side profile facing screen-left. Never mirror a frame.
- No text, numbers, labels, borders, separator lines or effects.

FRAMES (left to right):
1. Sitting up alert, eyes bright, crown and ear bases lifted a little: something nice just happened.
2. Deep crouch, about to spring.
3. Binky take-off: springing up, body starting to twist, head turning toward screen-left.
4. Binky peak: in mid-air the head twists one way and the hindquarters kick out sideways the other way, lop ears flung outward, eyes squeezed into happy arcs.
5. Landed, sitting up tall, nose raised, eyes in happy arcs with a 1-block #FFD6E7 cheek blush.

CONSISTENCY: the identical GROWN bunny in every frame: same size, same ear length and shape, same eye size and catch-light spot, same colours, same outline. Only what each frame describes changes. No two frames identical.
```

**Negative / must-not** (paste in the same message, right after the prompt)

```text
Do not draw: clothes, a collar, a bow, a hat, a harness or any accessory; human hands, fingers or a human face; eyebrows, eyelashes, whiskers, teeth or an open human mouth; standing on two legs like a person; holding anything; more or fewer than two ears, four legs or one tail; upright pointed ears (this is a lop); white, tan, brown, orange or grey-blue fur; spots, patches, stripes, a blaze or any marking; pink or white eyes, glowing eyes or more than one catch-light per eye; pure black outlines; photoreal fur, plush-toy, felt, 3D, vector, watercolor, chibi-sticker or anime rendering; blur, soft airbrush shading or a pixel filter over smooth art; sparkles, hearts, stars, "z" letters, motion lines, dust puffs, speech bubbles or any effect; text, numbers, labels, signatures or watermarks; floor, rug, grass, shadows or scenery; any change to the bunny between frames.
```

**QA checklist**
- [ ] **B1 anatomy:** exactly 2 ears, 4 legs, 1 cotton tail (when the view shows it); real-rabbit body, no human features.
- [ ] **B2 stage:** grown ears and proportions as the lock says; not a different stage.
- [ ] **B3 colour:** lilac fur with cream underside, pink inner ears and nose, near-black eyes with one catch-light; no tan/brown/white fur, no markings.
- [ ] **B4 nothing extra:** no clothes, accessories, effects, text, floor or shadow.
- [ ] **B5 pixel art (Gate 5 analogue):** crisp uniform pixel blocks, selout outline (not black), no blur or smooth paint, readable at about 40-60 px tall.
- [ ] **B9 likeness:** side by side with the approved bunny reference sheets, it is clearly the same bunny.
- [ ] **B6 motion (Gate 6/7 analogue):** every frame matches its numbered description; no filler frame, no two frames near-identical unless the list says so; no frame mirrored.
- [ ] **B7 continuity (Gate 7 analogue):** same size, ear length, eye spot, colours and floor line in every frame; no frame-to-frame drift.
- [ ] **B8 file (Gate 9 analogue):** 1536x1024, flat #FF00FF, exactly 5 figures in 5 equal columns with clear gaps.

### 4d. Grown: sleeping (rest days) (3 frames)

**Purpose:** Rest days and night. Calm, never sad.

**Output spec**
- File: `pb-bunny-grown-sleep-strip-v1.png` → `assets/pixel-bloom/character/bunny/source/`
- 1536×1024, one row of 3 frames in 3 equal columns, flat `#FF00FF`, view: 3/4 front facing screen-left (grown: lying on its side)
- Playback proposal (Claude Code, later): fps 4, order `0,1,0,1,0,1,2,1`, hold `0:3,1:3` (about 4 s per cycle, loops). Reduced/off: still 1. Built with `--anchor grid`.

**Attach**
- `assets/pixel-bloom/character/bunny/reference/pb-bunny-ref-turnaround-v1.png`
- `assets/pixel-bloom/character/bunny/reference/pb-bunny-ref-growth-v1.png`
- `assets/pixel-bloom/character/rae/reference/pb-rae-character-bible-v1.png` (style only)

**Prompt** (paste as one message)

```text
BUNNY LOCK (Pixel Bloom pet, v1). This is Rae's pet bunny: a small domestic lop-eared rabbit (Holland Lop type) drawn as a real animal, not a cartoon person. Exactly four legs, exactly two ears, exactly one small round cotton tail. No clothing, collar, bow, hat or accessory of any kind. It never stands on two legs like a person and never holds objects. Fur is a solid soft lilac (dove-grey with a lavender cast) with a cream underside on the chin, muzzle, chest, belly, inner legs and underside of the tail. No spots, patches, stripes or other markings, so its left and right sides look identical. Fur palette: deep shadow #6B6385, shadow #8A82A3, base #A9A1BF, light #C8C1DA, cream #EEE8F4. Inner ears #F1849E with highlight #FFA6B8. Nose #F1849E. Eyes: large, round, solid near-black #171421 with one small #F8FAFF catch-light in the upper part of each eye, in the same spot in every frame. Outline: selective color-matched outline (selout); the darkest outline color is #4A3A5C, never pure black. No eyebrows, eyelashes, whiskers, teeth or human mouth; the mouth is a tiny Y shape under the nose. Style: the same premium high-bit late-handheld/GBA-era pixel art as the attached Rae reference: intentional visible pixel clusters in uniform square blocks, crisp silhouette, controlled cluster shading, minimal anti-aliasing, lighting the same as the Rae reference.

STAGE: GROWN. A compact, rounded "loaf" body with broad cheeks and a short neck; a soft rounded "crown" bump on top of the head where the ears attach; fully lopped ears hanging close beside the cheeks with rounded tips at jaw level and a thin pink rim of inner ear at the front edge. About 1/4 of Rae's standing height, ears included (about the height of her knee). Drawn on a chunky pixel grid: about 60 pixel blocks tall when sitting.

The attached bunny reference sheets are approved: draw that exact bunny at the GROWN stage. The attached Rae character bible is a STYLE reference only; Rae does not appear in this image.

TASK: one animation strip of the GROWN bunny: sleeping (rest days), 3 frames. Every frame is a complete drawing of the whole bunny.

STRIP FORMAT:
- One wide 1536x1024 image: one row of 3 frames on flat solid #FF00FF magenta.
- Split the width into 3 equal invisible columns and center one bunny in each column. Leave clear magenta between neighbouring bunnies: nothing touches or crosses into the next column.
- Same camera, same scale and the same floor line in every frame. The bunny is as large as fits its column. The floor line is invisible: no floor, rug, shadow or ground mark.
- View: 3/4 front facing screen-left (grown: lying on its side). Never mirror a frame.
- No text, numbers, labels, borders, separator lines or effects.

FRAMES (left to right):
1. Asleep in a "flop": lying on its side with the belly toward the viewer, back along the top, hind legs stretched out loosely behind it toward screen-right, head resting on the floor toward screen-left, eyes closed as short curved lines, lop ears lying flat. Breath in: the side of the body is one pixel block higher.
2. Same pose, breath out: the side of the body is one pixel block lower than frame 1. Nothing else changes.
3. Same pose as frame 2, a dreaming twitch: a hind foot flexes slightly and the nose shifts by one block. Eyes stay closed.

CONSISTENCY: the identical GROWN bunny in every frame: same size, same ear length and shape, same eye size and catch-light spot, same colours, same outline. Only what each frame describes changes. No two frames identical.
```

**Negative / must-not** (paste in the same message, right after the prompt)

```text
Do not draw: clothes, a collar, a bow, a hat, a harness or any accessory; human hands, fingers or a human face; eyebrows, eyelashes, whiskers, teeth or an open human mouth; standing on two legs like a person; holding anything; more or fewer than two ears, four legs or one tail; upright pointed ears (this is a lop); white, tan, brown, orange or grey-blue fur; spots, patches, stripes, a blaze or any marking; pink or white eyes, glowing eyes or more than one catch-light per eye; pure black outlines; photoreal fur, plush-toy, felt, 3D, vector, watercolor, chibi-sticker or anime rendering; blur, soft airbrush shading or a pixel filter over smooth art; sparkles, hearts, stars, "z" letters, motion lines, dust puffs, speech bubbles or any effect; text, numbers, labels, signatures or watermarks; floor, rug, grass, shadows or scenery; any change to the bunny between frames.
```

**QA checklist**
- [ ] **B1 anatomy:** exactly 2 ears, 4 legs, 1 cotton tail (when the view shows it); real-rabbit body, no human features.
- [ ] **B2 stage:** grown ears and proportions as the lock says; not a different stage.
- [ ] **B3 colour:** lilac fur with cream underside, pink inner ears and nose, near-black eyes with one catch-light; no tan/brown/white fur, no markings.
- [ ] **B4 nothing extra:** no clothes, accessories, effects, text, floor or shadow.
- [ ] **B5 pixel art (Gate 5 analogue):** crisp uniform pixel blocks, selout outline (not black), no blur or smooth paint, readable at about 40-60 px tall.
- [ ] **B9 likeness:** side by side with the approved bunny reference sheets, it is clearly the same bunny.
- [ ] **B6 motion (Gate 6/7 analogue):** every frame matches its numbered description; no filler frame, no two frames near-identical unless the list says so; no frame mirrored.
- [ ] **B7 continuity (Gate 7 analogue):** same size, ear length, eye spot, colours and floor line in every frame; no frame-to-frame drift.
- [ ] **B8 file (Gate 9 analogue):** 1536x1024, flat #FF00FF, exactly 3 figures in 3 equal columns with clear gaps.

### 4e. Rae sits with the grown bunny (still with Rae)

**Purpose:** The bond moment: shown when the bunny reaches this stage and on its page. Rae's full contract applies.

**Output spec**
- File: `pb-rae-bunny-grown-lap-v1.png` → `assets/pixel-bloom/character/rae/source/bunny/`
- 1024×1024, flat `#FF00FF`, a single image (not a strip)
- Run in the **Rae chat**. Built later as a 1-frame cut-out; Rae and the bunny must touch.

**Attach**
- `assets/pixel-bloom/character/rae/reference/pb-rae-character-bible-v1.png`
- `public/rae/full-3q.png`
- `assets/pixel-bloom/character/bunny/reference/pb-bunny-ref-turnaround-v1.png`
- `assets/pixel-bloom/character/bunny/reference/pb-bunny-ref-growth-v1.png`

**Prompt** (paste as one message)

```text
Rae is a locked Pixel Bloom character. Preserve her canonical identity exactly. She is an adult Black bunny girl with warm medium-deep brown skin, black 4C natural hair in a voluminous natural updo/puff with tight coils and a few loose tendrils, exactly two tan bunny ears with soft flesh-pink inner ears emerging from the upper hair, no human ears, one small brown bunny tail, thin round gold glasses, exactly one owner-supplied black/gray lotus tattoo under the anatomical left collarbone near the shoulder and slightly beneath the left top strap, a thin gold chain with a small letter A pendant worn for her husband, thin dainty layered gold rings only, a pink fitted Pixel Bloom training top, lavender high-waisted leggings, and black-and-white Panda-Dunk-inspired genericized low-top sneakers. Render in stylized premium high-bit late-handheld/GBA-era pixel art, never photoreal. Do not invent or alter canonical anatomy, accessories, colors, tattoo count/location, hair texture, or identity. Match the approved Rae v1 character bible image exactly: same face, proportions, palette and pixel style. Never: human ears, a headband or clip-on ears, cat or fox ears, a missing or extra bunny ear, straight/wavy/silky hair, a second tattoo, a tattoo on the shoulder, outer arm, right side, neck, face or back, a white or pink tail, a cat/fox tail, more than one tail, an oversized tail, removed or restyled glasses (square, rimless, silver/black or sunglasses), a different necklace letter, a missing pendant or a silver chain, chunky jewelry, an added jacket/shorts/skirt/gloves or socks, a removed Pixel Bloom logo, photoreal skin, a child/teen look, or any identity change between frames.

Also keep exactly as in the attached Rae reference: her face, her proportions (about 7.5 heads tall), and her lavender wristbands. Her shoes have no logo of any kind. Rae's own ears stay her semi-upright tan bunny ears with flesh-pink insides at all times.

The other attached images are Rae's pet bunny (approved reference sheets). Draw that exact bunny, at the GROWN stage:
BUNNY LOCK (Pixel Bloom pet, v1). This is Rae's pet bunny: a small domestic lop-eared rabbit (Holland Lop type) drawn as a real animal, not a cartoon person. Exactly four legs, exactly two ears, exactly one small round cotton tail. No clothing, collar, bow, hat or accessory of any kind. It never stands on two legs like a person and never holds objects. Fur is a solid soft lilac (dove-grey with a lavender cast) with a cream underside on the chin, muzzle, chest, belly, inner legs and underside of the tail. No spots, patches, stripes or other markings, so its left and right sides look identical. Fur palette: deep shadow #6B6385, shadow #8A82A3, base #A9A1BF, light #C8C1DA, cream #EEE8F4. Inner ears #F1849E with highlight #FFA6B8. Nose #F1849E. Eyes: large, round, solid near-black #171421 with one small #F8FAFF catch-light in the upper part of each eye, in the same spot in every frame. Outline: selective color-matched outline (selout); the darkest outline color is #4A3A5C, never pure black. No eyebrows, eyelashes, whiskers, teeth or human mouth; the mouth is a tiny Y shape under the nose. Style: the same premium high-bit late-handheld/GBA-era pixel art as the attached Rae reference: intentional visible pixel clusters in uniform square blocks, crisp silhouette, controlled cluster shading, minimal anti-aliasing, lighting the same as the Rae reference.
STAGE: GROWN. A compact, rounded "loaf" body with broad cheeks and a short neck; a soft rounded "crown" bump on top of the head where the ears attach; fully lopped ears hanging close beside the cheeks with rounded tips at jaw level and a thin pink rim of inner ear at the front edge. About 1/4 of Rae's standing height, ears included (about the height of her knee). Drawn on a chunky pixel grid: about 60 pixel blocks tall when sitting.

TASK: one still image. Rae sits on the floor in a 3/4 front view, legs folded to one side, torso upright and relaxed, one hand on the floor behind her hip for support. The GROWN bunny lies in a relaxed loaf against her folded thigh, facing screen-left, eyes half closed, full lop ears resting. Her free hand rests lightly on its back. Nothing covers her A pendant or lotus tattoo. Her expression is the canonical "smile". Her curvy, strong proportions stay the same as standing; sitting does not slim or shrink her.

SCALE: the bunny is 1/4 of Rae's standing height, ears included, exactly as the lock says. Rae and the bunny are drawn at the same pixel density (the bunny is about 60 pixel blocks tall sitting, on the same grid as Rae).

FORMAT: one 1024x1024 image, flat solid #FF00FF magenta background. Rae and the bunny as large as fits without cropping ears or feet. The bunny touches Rae's hand (or her leg), so the two form one connected shape with no magenta gap between them. No text, labels, floor, rug, shadow, sparkles, hearts or scenery.
```

**Negative / must-not** (paste in the same message, right after the prompt)

```text
For the BUNNY only (Rae follows her own rules above), do not draw: clothes, a collar, a bow, a hat, a harness or any accessory on it; human hands, fingers or a human face on it; eyebrows, eyelashes, whiskers, teeth or an open human mouth; the bunny standing on two legs like a person or holding anything; more or fewer than two ears, four legs or one tail; upright pointed ears (this is a lop); white, tan, brown, orange or grey-blue fur; spots, patches, stripes, a blaze or any marking; pink or white eyes, glowing eyes or more than one catch-light per eye; pure black outlines; photoreal fur, plush-toy, felt, 3D, vector, watercolor, chibi-sticker or anime rendering.

Also do not draw: the bunny covering Rae's A pendant or lotus tattoo; Rae with lop ears or lilac fur; a second bunny; extra or missing fingers; Rae wearing anything not in her canonical outfit; blur or smooth paint; text, labels, sparkles, hearts, floor, rug, shadows or scenery.
```

**QA checklist**
- [ ] **Gate 1 anatomy:** exactly two tan bunny ears with flesh-pink insides, semi-upright; **no human ear anywhere**; brown tail only where the view shows it; no duplicate limbs, fingers or accessories.
- [ ] **Gate 1 hair/face:** black 4C updo/puff with tight coils (not straight, wavy or a tiny puff); adult woman; stylized pixel face, not photoreal; warm medium-deep brown skin, not lightened.
- [ ] **Gate 2 signature details:** thin round gold glasses; exactly one lotus tattoo under her **anatomical left** collarbone (viewer-right in a front view), not on the shoulder cap, arm or right side; small A pendant on a thin gold chain (never R); rings thin and dainty only.
- [ ] **Gate 3 outfit:** pink fitted Pixel Bloom top, lavender high-waisted leggings, black-and-white low-top sneakers with no logo; lavender wristbands as in the reference; no added socks, jacket or gloves.
- [ ] **Gate 4 body:** adult curvy, strong, athletic proportions match the bible; no waist shrink, no bust/hip exaggeration, limb lengths stable.
- [ ] **Gate 5 pixel art:** high-bit GBA-era clusters, selout, crisp silhouette, no blur or smooth paint.
- [ ] **Gate 6 pose:** the pose matches the task; the bunny never covers the A pendant or tattoo; hands have five fingers each.
- [ ] **Gate 9 file:** 1024×1024, flat #FF00FF, Rae and the bunny touch (one connected shape), nothing cropped.
- [ ] **Bunny B1-B3:** grown stage, 2 ears, 4 legs, lilac/cream palette, same bunny as the reference sheets.
- [ ] **Scale:** the bunny is about 1/4 of Rae's height; it hasn't shrunk to a toy or grown past the lock.
- [ ] **No cross-over:** Rae's ears are still her own tan semi-upright bunny ears; the bunny has no tan/brown fur.
- [ ] **Final question (QA gate):** with the bible hidden, is this unmistakably the same Rae? If not clearly yes, it is not approved.

---

## Open decisions for the owner

1. **Name.** The bunny needs one (it never appears in the art).
2. **Growth trigger.** Workouts (1 / 12 / 36, proposed) or Bloom level (e.g. 1 / 6 / 12)?
3. **Breed and colour.** Lilac lop is proposed. Alternatives: cocoa-and-cream lop, or an upright-eared bunny. Upright ears echo Rae's ears more, so they're less distinct from her.
4. **Where it shows.** Only Today's room, or also on Complete (the happy reaction) and Progress?
5. **Does the hop show in the room** (a sprite sliding across the rug), or only idle/happy/sleep?
6. **Effects.** Small CSS "z"s while sleeping and petals on happy, full motion only? Or nothing?
7. **Tap.** Does tapping the bunny play its happy reaction (like tapping Rae makes her hop)?
8. **Before any art:** approve the sheets from prompts 1a and 1b. They become the bunny's lock (Claude Code can then write `assets/pixel-bloom/db/bunny-character-lock.v1.json` and add the bunny to `asset-db.json` at status `review`).
