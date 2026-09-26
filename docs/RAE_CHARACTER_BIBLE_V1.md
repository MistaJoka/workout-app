# Rae Character Bible v1.0

**Status:** LOCKED / HUMAN-APPROVED CANONICAL CHARACTER TRUTH  
**Approved:** 2026-09-26  
**Character ID:** `rae`  
**Theme:** Pixel Bloom  
**Creative owner:** ChatGPT  
**Implementation owner:** Claude Code  
**Final approval owner:** project owner

This document supports the approved Rae image. It does **not** supersede how Rae looks in that image.

## Source-of-truth hierarchy

1. **The exact approved Rae v1 character-bible image is the visual source of truth for Rae's appearance.**
2. Explicit visual corrections/approvals from the project owner that produced that image explain ambiguous details.
3. This document, the lock JSON, and the asset database are written transcriptions used to preserve and enforce what the approved image shows.
4. Prompts, older generated sheets, draft assets, and AI memory are not authoritative.

If any supporting document describes Rae differently from the approved visual reference, **the approved image wins and the document must be corrected**. Supporting docs must follow the image, never reinterpret it.

The source-of-truth rule applies to Rae's **visual depiction**. Incidental labels/text rendered inside an AI-generated reference board are not semantic authority when they contradict the depicted character or explicit owner approval. Example: the approved Rae image visually shows two bunny ears and no human ears; that visual depiction is authoritative.

---

## 1. Canonical visual reference

**Approved source image:** `rae_pixel_bloom_character_bible.png`  
**Canonical repository target:** `assets/pixel-bloom/character/rae/reference/pb-rae-character-bible-v1.png`  
**Dimensions:** `1536 × 1024`  
**SHA-256:** `e0390ef9d39fe92d2d93544d62cb0568a6e9e2b3cd5e6e8305c333b7f3217beb`

This hash identifies the exact approved raster. A visually similar regeneration is **not** the same source of truth.

Future asset generation should use the approved image itself as the primary visual reference wherever the toolchain supports image conditioning/reference input. Text prompts are supplemental constraints, not a replacement for the image.

---

## 2. What the approved image visually locks

### Character

- **Name:** Rae
- **Age read:** adult woman
- **Character type:** bunny girl
- **Presentation:** warm, confident, supportive, playful, determined
- **Role in app:** guide, workout companion, mascot, progression/reward character
- **Design intent:** recognizable stylized likeness of Rae without photoreal rendering

### Complexion

- Warm **medium-deep brown complexion**.
- The approved image itself is the tonal target.
- Future assets should be color-matched to the reference rather than choosing a new generic skin value.

### Hair

- **Black 4C natural hair.**
- Dense, tightly coiled/kinky texture is a core silhouette feature.
- The approved image shows a voluminous natural 4C updo/puff with tightly coiled volume and selected hanging coils/tendrils.
- Hair must not be converted into straight, straightened, silky-straight, loose-wave, or generic curly hair.
- Secondary animation motion should respect the compact/coiled 4C mass rather than flowing like straight hair.

### Face

- Stylized adult likeness, not photorealistic.
- Soft rounded/oval facial structure.
- Friendly expressive eyes.
- Warm smile and readable brows.
- Facial detail remains compatible with high-bit handheld pixel art.
- Rae does **not** need to look directly at the viewer; gaze should follow the scene/action naturally.

### Glasses

- Thin **gold round wire-frame glasses**.
- Lens geometry and bridge should remain recognizable across angles.

---

## 3. Bunny anatomy

### Ears

The approved image visually establishes:

- **Exactly two ears total.**
- Both are bunny ears.
- **No human ears.**
- Outer ear fur: **tan**.
- Inner ear: **flesh pink**.
- Shape: moderately long, semi-upright, with a soft natural bend rather than heavily floppy ears.
- Ears emerge through/from the upper 4C hair silhouette and maintain consistent base placement.

Any future image with visible human ears does not match the source-of-truth image and is rejected.

### Tail

- One small, round, fluffy **brown bunny tail**.
- Positioned anatomically at the rear pelvis/upper glute area as shown in the turnaround.
- Brown—not white—in Rae v1.

---

## 4. Body and proportions

The approved image is the proportion master.

- Adult fuller/curvy build.
- Strong, athletic visual read while preserving natural curves.
- Grounded human-like proportions adapted to stylized pixel art.
- No extreme waist reduction, exaggerated caricature, or child/teen proportions.
- Limb lengths, torso length, head scale, shoulder width, hip width, and foot size should be compared visually against the approved turnaround rather than recreated from prose alone.

### Animation production grid

The visual design comes from the source image; production sprites are normalized onto:

- full-body logical animation canvas: **256 × 256 px**;
- default high-DPI export: **512 × 512 px at exact 2× nearest-neighbor scale**.

These production dimensions do not alter Rae's proportions.

---

## 5. Tattoo

The approved image shows **one tattoo on Rae**.

### Design

- The tattoo is the project-owner-supplied **single black/gray lotus flower design**.
- Preserve the recognizable lotus silhouette/petal structure rather than substituting another floral symbol.

### Placement

- Rae's **anatomical left side**.
- Upper chest / front shoulder region.
- **Under the left collarbone and near the shoulder.**
- Slightly beneath / partially overlapped by the left training-top strap as shown.
- Not on the outside deltoid, upper arm, center chest, or opposite side.

The tattoo-detail inset in the reference sheet is a magnified reference to the same single tattoo; it is **not** a second tattoo on Rae.

---

## 6. Jewelry

### Necklace

The approved image shows:

- thin, delicate gold chain;
- small **letter `A` pendant**;
- pendant is deliberately subtle rather than oversized;
- `A` is worn for her husband.

### Rings

The approved portrait shows fine hand jewelry treatment:

- thin, dainty, layered rings/bands;
- fine-scale gold jewelry aesthetic;
- no large rocks;
- no chunky/thick statement rings.

Jewelry remains secondary to Rae's silhouette and exercise readability.

---

## 7. Default outfit

The approved image visually locks the default training look.

### Top

- Pink fitted training/sports top.
- Clean Pixel Bloom styling.
- Small light Pixel Bloom/flower-like chest mark as shown may be preserved.

### Bottom

- Lavender high-waisted athletic leggings.
- Clean, animation-friendly shape.

### Shoes

- **Black-and-white Panda Dunk-inspired sneaker look** as shown in the approved sheet.
- Preserve the high-contrast black/white panel language and silhouette.
- Runtime artwork should remain genericized and need not reproduce protected logos/trademarks.

---

## 8. Pixel-art visual style

The approved sheet itself is the visual style reference.

Production interpretation:

- high-bit late-handheld/GBA-era-inspired pixel art;
- intentional visible pixel clusters;
- crisp silhouette;
- controlled high-color shading;
- selective color-matched outlines / selout;
- readable forms at small size;
- simplified pixel-art face rather than realistic skin rendering;
- stable palette and anatomy across frames.

Reject future assets that drift toward photorealistic faces, smooth digital-paint/anime rendering, random pixelation filters, excessive blur/anti-aliasing, or inconsistent frame-to-frame anatomy.

---

## 9. Color authority

**The approved image is the color source.**

Claude Code should sample/curate stable named palette ramps from the exact canonical raster rather than inventing colors from these labels:

- `rae-skin-*`
- `rae-hair-*`
- `rae-ear-tan-*`
- `rae-ear-inner-*`
- `rae-tail-brown-*`
- `rae-pink-*`
- `rae-lavender-*`
- `rae-gold-*`
- `rae-shoe-black-*`
- `rae-shoe-white-*`

Once extracted, the palette file is a deterministic technical representation of the image—not an independent creative authority.

---

## 10. View and gaze

### Character / reward / world art

- Front, 3/4, side, and back angles may be derived from the approved turnaround.
- Direct camera gaze is optional.
- Rae may look at UI elements, objects, direction of travel, workout equipment, or off-axis naturally.

### Exercise instruction art

- Select camera for form clarity, usually orthographic side or front.
- Keep fixed camera, scale, and baseline inside one movement sequence.
- Rae should look naturally in the movement direction rather than unnaturally turning toward the viewer.
- Form clarity outranks personality posing.

---

## 11. Production comparison rule

Every future Rae asset is compared visually against the canonical image, not merely checked against text keywords.

At review, verify:

- face/overall likeness to approved sheet;
- medium-deep brown complexion;
- black 4C hair and silhouette;
- exactly two tan/flesh-pink bunny ears and no human ears;
- one brown bunny tail;
- thin round gold glasses;
- one correct lotus at left collarbone/shoulder area;
- small gold `A` pendant;
- dainty layered rings when visible;
- pink top and lavender leggings;
- black/white Panda-inspired shoes;
- curvy/strong adult proportions;
- high-bit pixel-art treatment;
- natural scene-appropriate gaze.

A technically compliant asset that **does not visually look like the approved Rae image still fails**.

---

## 12. Change control

Rae v1.0 is frozen around the exact approved image.

A visual change requires:

1. explicit project-owner direction;
2. a newly approved visual reference;
3. a new hash;
4. character-bible version update (`v1.1`, `v2.0`, etc.);
5. lock JSON and asset DB update;
6. impact review for previously approved sprites/animations.

Do not modify the written spec first and then force Rae to match the text. **Approve the visual change first; supporting documentation follows it.**
