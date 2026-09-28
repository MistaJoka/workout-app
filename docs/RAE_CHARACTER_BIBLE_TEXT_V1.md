# Rae Character Bible — Text-Only v1.1

> Portable canonical specification for reproducing Rae when the original visual reference is unavailable. Text-only generation improves consistency but does not guarantee pixel-identical output. Approved visual references remain higher-fidelity QA evidence when available.

## 1. Character identity

- **Name:** Rae
- **Role:** Workout guide, coach, mascot
- **Design:** Adult human woman with bunny traits
- **Age read:** Adult woman in her mid-to-late 30s; never teen-, child-, schoolgirl-, or youth-coded.
- **Build:** Curvy, thick, strong, athletic adult proportions. Substantial hips and thighs, rounded glutes, full bust, defined waist, strong arms and legs. Fit and capable rather than extremely lean, exaggerated, or caricatured.
- **Skin:** Warm medium-deep brown.

## 2. Face

- Softly rounded/oval adult face.
- Large expressive dark-brown eyes.
- Dark defined eyebrows.
- Small-to-medium nose and full lips.
- Thin **round gold wire-frame glasses** are a primary identity feature.
- Friendly, confident, expressive adult presentation.
- Stylized pixel-art facial planes; never photorealistic skin texture.

## 3. Hair

Rae has **black natural 4C hair** in a dense, voluminous natural updo/puff silhouette composed of visibly tight coils, with defined coiled strands framing the face.

Required: visibly kinky/coily texture, dense rounded volume, black/dark brown-black color, recognizable 4C texture even at sprite scale.

Never: straight, straightened, silky, generic loose waves, smooth anime hair, ponytail, or a tiny/simple generic afro puff.

## 4. Bunny anatomy

Rae has **exactly two anatomical bunny ears total**, emerging naturally from the upper head through her hair.

- Moderately long, semi-upright, soft natural bend.
- Broad base with tapered rounded point.
- Warm tan/brown outer fur.
- Flesh/salmon-pink inner ear.
- Slight natural asymmetry is preferred.
- **No visible human ears.**
- Never use a bunny-ear headband, costume ears, cat ears, four ears, or extra ears.

### Tail

Exactly one small, round, fluffy warm medium-brown/tan bunny tail, visible only when perspective exposes it. Never oversized, white, long, fox-like, or cat-like.

## 5. Body proportions

Default full-body Rae is approximately **7–7.5 heads tall**.

Silhouette priority: strong shoulders → full bust → defined waist → full hips → thick powerful thighs → strong calves → athletic sneakers.

Avoid fashion-model thinness, impossible waist exaggeration, hypersexualized anatomy, extreme bodybuilding definition, obesity caricature, or childish/chibi proportions unless a specific UI icon explicitly requires simplification.

## 6. Canonical workout outfit

### Top
Bright warm-pink fitted Pixel Bloom athletic training top with wide athletic straps, modest athletic neckline, and optional small white Pixel Bloom flower/pixel motif.

Approximate palette:
- Base `#F36AA7`
- Highlight `#FF94C5`
- Shadow `#C84F8E`

### Leggings
High-waisted fitted lavender/periwinkle athletic leggings, ankle length.

Approximate palette:
- Base `#A99AF4`
- Highlight `#C3B7FF`
- Shadow `#8074CF`

### Footwear
White athletic socks and chunky black-and-white logo-free athletic sneakers. Classic streetwear/basketball visual language is acceptable, but no protected brand logos.

## 7. Jewelry

- Thin round gold wire-frame glasses.
- Thin delicate gold chain with a **small capital `A` pendant**.
- If rings are visible: thin, dainty layered bands only; no large stones or chunky statement rings.

Approximate gold base: `#D6A53A`.

## 8. Tattoo

Rae has **exactly one tattoo**: a small black/dark-gray lotus flower.

Exact location: **Rae's anatomical LEFT upper chest directly beneath the left collarbone near the shoulder**, slightly beneath/overlapped by the left top strap.

Never move it to the arm, shoulder cap, right chest, center chest, neck, or forearm. Never add another tattoo. If anatomical-left chest is hidden by perspective, the tattoo may correctly be invisible.

## 9. Art style

Use **high-bit pixel art inspired by premium late-16-bit/32-bit handheld action-RPG sprite illustration**, without copying a franchise character or asset.

Required:
- Intentional visible pixel clusters.
- Crisp readable silhouette.
- Selective/color-matched outlines and selout.
- Controlled highlights and shadow clusters.
- Saturated pastel Pixel Bloom palette.
- High-detail sprite illustration.
- Simplified pixel-art facial planes.
- Minimal/controlled anti-aliasing.

Never: photorealism, 3D rendering, smooth digital painting, watercolor, flat vector art, generic anime screenshot, crude 8-bit rendering, painterly texture, or blurred/smoothed pixel edges.

## 10. Pixel scale

Preferred logical full-body canvas: **256×256** logical pixels.
Preferred runtime enlargement: **512×512 exact 2× nearest-neighbor**.

Larger exercise strips may use larger canvases while preserving comparable character pixel density. Never smooth during enlargement.

## 11. Core palette

```text
SKIN
Deep shadow       #78391F
Shadow            #984B29
Base              #B86438
Warm midtone      #CF7748
Highlight         #E39B6D

HAIR
Deepest           #171421
Shadow            #242033
Midtone           #352943
Warm highlight    #55405C

TOP
Shadow            #C84F8E
Base              #F36AA7
Highlight         #FF94C5

LEGGINGS
Deep shadow       #7167BE
Shadow            #887DDA
Base              #A99AF4
Highlight         #C3B7FF

BUNNY EARS
Outer             #C98757
Outer highlight   #E3A06E
Inner             #F1849E
Inner highlight   #FFA6B8

TAIL
Shadow            #865538
Base              #A66D49
Highlight         #C28A60

GOLD
Shadow            #A87522
Base              #D6A53A
Highlight         #F3CB62
```

Exact colors may shift slightly with lighting; relative palette relationships remain stable.

## 12. Turnaround lock

The same body proportions and identity survive every camera angle.

- **Front:** glasses and ears prominent; tattoo appears on viewer-right because that is Rae's anatomical left.
- **3/4 front:** preferred hero angle; face, glasses, hair silhouette, ears, proportions, necklace, and tattoo readable when visible.
- **Side:** true profile while retaining chest/waist/hip relationship, strong thighs, glute silhouette, and natural posture. Do not flatten Rae into a thin profile.
- **3/4 back:** preserve hair/ear silhouette; tail may appear.
- **Back:** exactly two ears, consistent hair, small brown tail, lavender leggings, consistent hips/thighs.

## 13. Expressions

Expressions change emotion, not identity.

- Neutral: relaxed mouth, attentive eyes.
- Smile: gentle closed-mouth smile.
- Happy: brighter eyes, wider smile.
- Cheer: large joyful smile.
- Focused: concentrated eyes, neutral mouth.
- Determined: firm brows, confident expression.
- Tired: softened eyes, mild fatigue.
- Surprised: raised brows, widened eyes.
- Laugh: eyes partly/fully closed, open smile.
- Wink: one eye closed, playful smile.

Default emotional tone: **kind, confident, supportive, playful, determined**. Never judgmental about exercise performance.

## 14. Exercise-animation rules

Exercise artwork is **instructional first**. Correct movement anatomy outranks dramatic posing.

Across a strip preserve:
- same Rae identity and proportions;
- same outfit, hair, ears, jewelry, tattoo, and shoes;
- same camera and character scale;
- same lighting and palette;
- identical equipment;
- stable ground/contact points unless mechanics require movement.

Only joints required by the exercise should substantially change.

## 15. Production exercise-strip format

Unless explicitly overridden:

- One horizontal row of sequential frames.
- Rae fills useful frame space without clipping.
- Flat solid **`#FF00FF` magenta** extraction background.
- Frames evenly spaced left-to-right.
- No text, labels, arrows, borders, separators, scenery, decorative objects, floor graphics, shadows, or UI.
- Mats appear only when physically required by the exercise.

Typical progression: `START → DESCENT/EXTENSION → END RANGE → RETURN`.

## 16. Frame consistency

Fixed between frames: camera, zoom, character scale, floor line, equipment, lighting, palette, hairstyle, clothing, accessories.

Ground-contact points remain spatially fixed unless the movement explicitly requires them to move. Planted feet stay planted; chair legs stay fixed; a lying torso remains spatially anchored; a supporting hand remains fixed.

## 17. Orientation

Default exercise orientation: **true side profile facing screen-left**.

Never mirror an individual frame. If Rae's head begins on the left side of the canvas, it remains on that side through the strip unless the exercise intentionally changes direction.

## 18. Chair exercises

Use a sturdy, simple, armless chair unless mechanics require otherwise. Warm wood or neutral construction is preferred. It is equipment, not scenery. The exact chair and its position must remain identical in every frame, and Rae must visibly interact with it correctly.

## 19. Priority hierarchy

1. Correct exercise form.
2. Rae identity.
3. Frame-to-frame consistency.
4. Instructional readability.
5. Pixel-art quality.
6. Decorative beauty.

Remove visual flair whenever it interferes with understanding the movement.

## 20. Negative character specification

Never generate Rae with:

- visible human ears;
- more than two bunny ears;
- bunny-ear headband or cat ears;
- white bunny ears or white tail;
- straight, silky, generic wavy, or smooth anime hair;
- tiny generic afro puff;
- random/additional tattoos;
- arm, shoulder-cap, or right-side tattoo;
- missing/square/silver glasses;
- missing or different pendant;
- thin fashion-model, child, or teen proportions;
- schoolgirl styling;
- hypersexualized anatomy;
- extreme bodybuilding;
- unrequested outfit-color changes;
- protected brand logos;
- photorealistic, 3D, painterly, or blurred rendering.

## 21. Identity priority order

When generation constraints conflict, preserve in this order:

1. Adult Black woman identity.
2. Face + round gold glasses.
3. Black 4C hair silhouette/texture.
4. Exactly two anatomical bunny ears and no human ears.
5. Curvy, strong adult body proportions.
6. Warm medium-deep brown skin tone.
7. Pink/lavender outfit.
8. Lotus tattoo placement.
9. `A` necklace.
10. Brown bunny tail.
11. Black/white sneakers.
12. Minor decorative details.

Never sacrifice items 1–6 for composition.

## 22. Canonical portable generation block

Copy this block into every fresh Rae generation when the visual master is unavailable:

> **RAE CHARACTER LOCK:** Rae is an adult Black woman in her mid-to-late 30s with warm medium-deep brown skin and a curvy, thick, strong athletic adult build: substantial hips and thighs, rounded glutes, full bust, defined waist, strong arms and legs, realistic proportions approximately 7–7.5 heads tall. She has black natural 4C hair arranged in a dense voluminous coiled updo with visibly tight kinky/coily texture and several coiled face-framing strands. She has exactly two anatomical semi-upright bunny ears emerging naturally through the upper hair: warm tan/brown outer fur and salmon-pink inner ears. No visible human ears and never a bunny-ear headband. She wears thin round gold wire-frame glasses, a delicate gold chain with a small capital-A pendant, a fitted warm-pink athletic training top, high-waisted lavender athletic leggings, white athletic socks, and chunky black-and-white logo-free sneakers. She has exactly one small dark lotus tattoo on her anatomical-left upper chest directly beneath the left collarbone near the shoulder, slightly beneath/overlapped by the left top strap; never move the tattoo and never add another tattoo. She has one small round fluffy medium-brown bunny tail when the angle exposes it. Render Rae as crisp premium high-bit pixel art inspired by polished late-16-bit/32-bit handheld action-RPG sprite illustration: intentional visible pixel clusters, selective color-matched outlines, clean silhouettes, controlled cluster shading, saturated pastel colors, simplified pixel-art facial planes and no photorealistic texture. Rae is warm, confident, supportive, playful and determined. Preserve exactly the same identity, proportions, palette, hairstyle, ears, outfit and accessories across every frame.

## 23. Exercise-generation template

```text
[INSERT RAE CHARACTER LOCK]

TASK:
Create an instructional animation strip for:
{EXERCISE_NAME}

VIEW:
True side profile facing screen-left unless otherwise specified.

FRAMES:
{FRAME_COUNT}

MOVEMENT PLAN:
1. {POSE}
2. {POSE}
3. {POSE}
4. {POSE}

CANVAS:
One wide horizontal image.
One row only.
Frames evenly spaced left-to-right.
Rae fills each frame as much as practical without clipping.

BACKGROUND:
Flat solid #FF00FF.

CONSISTENCY LOCK:
Identical Rae identity, proportions, hair, bunny ears, clothing,
jewelry, tattoo, shoes, camera, scale and lighting in every frame.
Equipment must be pixel-identical in position and appearance.
Ground-contact points remain fixed unless movement mechanics require otherwise.

ANIMATION:
Do not mirror any frame.
Do not change camera angle.
Do not change character scale.
Show meaningful intermediate poses.
Movement must be biomechanically readable.

DO NOT INCLUDE:
text, numbers, labels, arrows, borders, frame separators, scenery,
decorative objects, floor graphics, shadows, or extra characters.

PRIORITY:
correct exercise form > Rae identity > temporal consistency > readability > visual polish.
```

## 24. Source-of-truth policy

This document is the portable text specification for Rae. It exists so a fresh model/session can reconstruct the intended character without the original image.

When an approved canonical visual reference is available, use it alongside this document for higher-fidelity QA. Written identity locks override incidental mistakes in generated imagery. Generated exercise art does **not** silently redefine Rae.

Production pipeline:

`RAE_CHARACTER_BIBLE_TEXT_V1.md → exercise movement spec → generation → structural checks → human visual QA → approved canonical strip`
