# Rae Character Bible v1.0

**Status:** LOCKED / HUMAN-APPROVED CANONICAL CHARACTER TRUTH  
**Approved:** 2026-09-26  
**Character ID:** `rae`  
**Theme:** Pixel Bloom  
**Creative owner:** ChatGPT  
**Implementation owner:** Claude Code  
**Final approval owner:** project owner

This document is the **semantic authority** for Rae v1. The approved character-bible raster is the **visual authority** for proportions, silhouette, palette relationships, rendering language, and overall likeness.

AI systems MUST NOT inspect the image and invent or reinterpret facts already defined here.

---

## 0. Authority hierarchy

When generating, editing, animating, or implementing Rae, use this order:

1. **Explicit fields in `assets/pixel-bloom/db/rae-character-lock.v1.json`** — machine-readable non-negotiable facts.
2. **This document** — human-readable semantic specification.
3. **Approved canonical image** — visual geometry/style/color reference.
4. **Approved derivative assets** — pose/expression/animation-specific references.
5. Prompts, AI memory, older drafts, generated labels, and model assumptions — **non-authoritative**.

### Conflict rule

- If the image is visually ambiguous but text is explicit, **text wins**.
- If text does not specify a visual nuance, use the canonical image.
- AI-rendered words inside the reference image are not authoritative metadata.
- Never invent missing details. Preserve the nearest canonical form or mark the detail as `UNSPECIFIED` and request/await approval.

---

## 1. Canonical visual reference

**Approved source image:** `rae_pixel_bloom_character_bible.png`  
**Canonical repository target:** `assets/pixel-bloom/character/rae/reference/pb-rae-character-bible-v1.png`  
**Dimensions:** `1536 × 1024`  
**SHA-256:** `e0390ef9d39fe92d2d93544d62cb0568a6e9e2b3cd5e6e8305c333b7f3217beb`

This exact raster is the approved visual master. A similar regeneration is not equivalent.

Use the raster as the visual reference whenever the generation/edit tool supports image conditioning.

---

## 2. Canonical identity

- **Name:** Rae
- **Character type:** adult bunny girl
- **Human identity basis:** stylized likeness of the project owner's wife
- **Age read:** adult woman
- **Role:** guide, workout companion, mascot, progression/reward character
- **Personality read:** kind, calm, confident, supportive, playful, determined
- **Overall tone:** cozy, cute, motivating, non-judgmental, capable
- **Rendering:** stylized high-bit pixel art; never photoreal

Rae must never read as a child, teenager, schoolgirl, or generic anime mascot.

---

## 3. Complexion

- Warm **medium-deep brown complexion**.
- The approved raster is the tonal target.
- Do not lighten Rae relative to the approved image.
- Do not introduce pale/pink skin rendering, ashy highlights, or inconsistent skin tone between frames.
- Shading may shift with environment lighting, but base complexion must remain stable.

---

## 4. Hair

### Non-negotiable

- **Color:** black.
- **Texture:** **4C natural hair**.
- Dense, tightly coiled/kinky texture.
- Voluminous natural updo/puff silhouette.
- Selected tightly coiled tendrils may frame the face.

### Forbidden drift

Do not render Rae with:

- straight hair;
- straightened hair;
- silky hair;
- loose beach waves;
- generic large ringlets that erase 4C texture;
- brown/auburn hair as the dominant read.

Animation follow-through must respect dense 4C volume; it does not flow like straight hair.

---

## 5. Face

- Stylized adult likeness, not photorealistic.
- Soft rounded/oval facial structure.
- Friendly expressive eyes.
- Warm smile and readable brows.
- High-bit pixel-art facial planes and simplified forms.
- Likeness comes from face proportions, smile, glasses, skin tone, hair silhouette, and overall styling—not realistic pores or painted skin.

### Gaze

Rae does **not** need to look directly at the viewer.

- Neutral/profile/reward art may use natural off-axis gaze.
- Exercise art should follow movement direction and form clarity.
- Do not force camera eye contact during exercises.

---

## 6. Glasses

- Thin round **gold wire-frame glasses**.
- Fine bridge and rims.
- Keep recognizable across all views.
- Do not replace with thick plastic frames, square frames, oversized fashion glasses, or rimless glasses.

---

## 7. Bunny anatomy

### Ears

Rae has **exactly two ears total**.

- Both are bunny ears.
- **No human ears exist or are visible.**
- Outer ear: **tan**.
- Inner ear: **soft flesh pink**.
- Moderately long.
- Semi-upright.
- Gentle natural bend; not dramatically floppy.
- Ears emerge through/from the upper hair silhouette.
- Ear base position must remain consistent across turnarounds and animation frames.

Any visible human ear is an automatic rejection.

### Tail

- Exactly one bunny tail.
- Small.
- Round/fluffy.
- **Brown**.
- Rear pelvis/upper glute placement.
- Not white, pink, oversized, or elongated.

---

## 8. Body and proportions

- Adult fuller/curvy build.
- Strong and athletic visual read.
- Grounded human-like proportions adapted to stylized pixel art.
- Preserve natural curves.
- No extreme hourglass distortion.
- No tiny waist exaggeration.
- No oversized bust/hips for fan-service.
- No childlike head/body ratio.

The approved turnaround is the proportion master.

### Production normalization

- Full-body logical animation canvas: **256 × 256 px**.
- Default high-DPI export: **512 × 512 px**.
- Scale: exact integer **2× nearest-neighbor** for pixel masters.

Canvas size does not redefine anatomy.

---

## 9. Tattoo — exact canonical rule

Rae has **exactly one tattoo total**.

### Design

- The owner-supplied black/gray **lotus flower tattoo**.
- Preserve the recognizable layered lotus petal structure from the approved tattoo reference.
- Do not substitute a generic flower, mandala, rose, leaf spray, or alternate lotus.

### Placement

- Rae's **anatomical left side**.
- Under the **left collarbone**.
- Near the **left shoulder/front deltoid transition**.
- Slightly beneath / partially overlapped by the left training-top strap.
- It is not centered on the chest.
- It is not on the outer upper arm.
- It is not on the right side.

The tattoo-detail inset in the character bible is a magnified view of the **same single tattoo**, not another tattoo.

Automatic rejection if two tattoos appear.

---

## 10. Jewelry

### Necklace

- Thin delicate gold chain.
- Small letter **`A` pendant**.
- `A` is worn for her husband.
- Pendant is deliberately **small/subtle**.
- Never replace `A` with `R`.
- Never enlarge into a large medallion.

### Rings

- Thin, dainty, layered/stacked rings.
- Fine gold jewelry aesthetic.
- Multiple delicate bands are acceptable.
- No large stones.
- No large rocks.
- No chunky statement rings.
- No thick heavy bands.

Jewelry must never reduce exercise-form readability.

---

## 11. Default outfit

### Top

- Pink fitted Pixel Bloom training/sports top.
- Small light Pixel Bloom/flower-like chest mark may be preserved.
- Athletic, practical, adult.

### Bottom

- Lavender high-waisted athletic leggings.
- Animation-friendly silhouette.

### Shoes

- Black-and-white **Panda Dunk-inspired** low-top sneaker visual language.
- High-contrast black/white paneling.
- Runtime art remains genericized and does not require protected brand logos.
- Do not revert to pastel multicolor sneakers unless a future outfit variant explicitly allows it.

---

## 12. Pixel-art visual language

Target:

- premium high-bit late-handheld / GBA-era-inspired pixel art;
- visible intentional pixel clusters;
- crisp silhouettes;
- high-color controlled shading;
- selective color-matched outlines / selout;
- readable anatomy and expression at small size;
- controlled anti-aliasing;
- stable palette and anatomy across frames.

### Forbidden style drift

Reject:

- photoreal faces;
- smooth digital painting;
- generic modern anime rendering;
- pseudo-pixel filters over smooth art;
- heavy blur;
- excessive anti-aliasing that hides pixel structure;
- inconsistent sprite resolution;
- frame-to-frame anatomy mutation.

---

## 13. Palette authority

The canonical raster is the color source. Claude Code should extract and maintain deterministic palette ramps rather than invent colors from names.

Required named families:

- `rae-skin-*`
- `rae-hair-*`
- `rae-ear-tan-*`
- `rae-ear-inner-flesh-*`
- `rae-tail-brown-*`
- `rae-pink-*`
- `rae-lavender-*`
- `rae-gold-*`
- `rae-shoe-black-*`
- `rae-shoe-white-*`

Once generated and approved, the palette file becomes the technical source for repeatable exports.

---

## 14. Exercise animation rules

Exercise assets are instructional first and character art second.

For one movement sequence:

- fixed camera;
- fixed canvas;
- fixed character scale;
- fixed floor/baseline;
- stable limb lengths;
- stable head/body ratio;
- stable outfit;
- stable hair silhouette;
- stable ear bases;
- stable tattoo anchor;
- stable glasses geometry;
- stable jewelry treatment;
- stable footwear.

Form clarity outranks dramatic posing.

Do not independently regenerate every frame. Use approved key poses and deterministic interpolation/manual cleanup.

---

## 15. Allowed variation

Without creating Rae v1.1, assets MAY vary:

- pose;
- facial expression;
- gaze direction;
- arm/leg position;
- camera angle from approved turnaround families;
- environment lighting within complexion-preserving limits;
- subtle jewelry visibility due to pose;
- subtle ear secondary motion;
- subtle hair secondary motion;
- outfit deformation caused by natural body movement.

These are **not** identity changes.

---

## 16. Changes requiring a new character version

Do not silently change:

- complexion target;
- hair color or 4C texture;
- ear count/anatomy/colors;
- human-ear rule;
- tail color/shape;
- tattoo design/count/location;
- glasses type;
- `A` pendant identity;
- default body proportions;
- default outfit color system;
- default footwear design;
- core pixel-art style.

Any such change requires owner approval and version increment.

---

## 17. AI anti-hallucination rules

Before generating Rae, AI MUST load this document and the lock JSON.

AI MUST NOT:

- infer human ears because humans normally have them;
- infer pink bunny ears because bunny mascots often use pink ears;
- infer a white bunny tail;
- infer an `R` necklace because the character is named Rae;
- infer multiple tattoos from the tattoo detail inset;
- infer straight/loose-curly hair from a low-resolution frame;
- invent shoe colors;
- replace 4C hair with easier-to-render hair;
- add earrings because the side of the head looks empty;
- add extra jewelry beyond the specified delicate system;
- reinterpret the lotus placement from camera perspective;
- use generic "Black woman" defaults instead of Rae's explicit lock.

If a requested asset conflicts with these rules, preserve canon and flag the conflict.

---

## 18. Production comparison checklist

Every Rae asset must be checked for:

- adult Rae likeness;
- correct medium-deep warm brown complexion;
- black 4C hair;
- exactly two tan/flesh-pink bunny ears;
- no human ears;
- one brown bunny tail;
- thin round gold glasses;
- exactly one correct lotus at left collarbone/near shoulder under strap;
- small gold `A` pendant;
- thin dainty layered rings when visible;
- pink top;
- lavender leggings;
- black/white Panda-inspired shoes;
- curvy/strong adult proportions;
- high-bit pixel-art treatment;
- pose-appropriate gaze;
- no accidental duplicated anatomy or accessories.

A technically compliant asset that does not visually resemble the approved Rae still fails visual review.

---

## 19. Change control

Rae v1.0 is frozen.

A canonical change requires:

1. explicit owner instruction;
2. approved revised visual reference;
3. new SHA-256;
4. version increment (`v1.1`, `v2.0`, etc.);
5. update to this document;
6. update to `rae-character-lock.v1.json` or successor;
7. asset DB update;
8. impact review of existing approved sprites/animations;
9. regression approval before release.

Do not silently mutate Rae while creating new assets.