# Rae Production Asset QA Gate

**Status:** REQUIRED BEFORE `approved` OR `production`  
**Character:** `rae`  
**Version:** `v1.0`

Use this checklist for every Rae portrait, pose, sprite, animation frame set, sprite sheet, GIF/WebP preview, exercise guide, reward asset, or UI illustration.

An asset fails if any automatic-reject condition is present, even if the rest looks good.

---

## Gate 0 — provenance

- [ ] Asset has unique ID.
- [ ] Version recorded.
- [ ] Source asset ID recorded.
- [ ] Canonical lock version recorded.
- [ ] Generation/edit method recorded.
- [ ] File hash recorded.
- [ ] Status is not falsely marked `approved` or `production` before review.

---

## Gate 1 — identity hard checks

### Anatomy

- [ ] Exactly **two ears total**.
- [ ] Both ears are bunny ears.
- [ ] **No human ears visible anywhere.**
- [ ] Bunny ears are tan outside.
- [ ] Bunny ears are soft flesh pink inside.
- [ ] Ear bases remain consistent with canonical head/hair placement.
- [ ] One small round fluffy **brown** bunny tail.
- [ ] No duplicate limbs, fingers, glasses, tails, jewelry, or accessories.

### Hair

- [ ] Hair reads clearly as **black**.
- [ ] Hair reads clearly as **4C natural texture**.
- [ ] Hair does not drift to straight, silky, loose-wave, or generic curl texture.
- [ ] Hair silhouette remains recognizably Rae.

### Face / age

- [ ] Adult-woman read.
- [ ] Rae likeness remains recognizable.
- [ ] Face remains stylized pixel art.
- [ ] No photoreal facial treatment.
- [ ] No teen/child coding.

### Complexion

- [ ] Warm medium-deep brown base maintained.
- [ ] No accidental lightening.
- [ ] Lighting does not destroy the canonical skin-tone read.

---

## Gate 2 — signature-detail hard checks

### Glasses

- [ ] Thin round gold wire-frame glasses.
- [ ] No thick/square/black-plastic substitution.
- [ ] Glasses remain stable across animation frames.

### Tattoo

- [ ] Exactly **one tattoo total**.
- [ ] Correct owner-supplied lotus design.
- [ ] Anatomical **left** side.
- [ ] Under left collarbone near shoulder/front deltoid transition.
- [ ] Slightly under/overlapped by left top strap when visible.
- [ ] Not on outer upper arm.
- [ ] Not on right side.
- [ ] Not duplicated because a detail inset/reference exists.

### Necklace

- [ ] Thin delicate gold chain.
- [ ] Small letter **A** pendant.
- [ ] Pendant not oversized.
- [ ] No `R` pendant.

### Rings

- [ ] Rings, if visible, are thin/delicate/layered.
- [ ] No large stones.
- [ ] No chunky rings.
- [ ] No thick statement bands.

---

## Gate 3 — default outfit checks

- [ ] Pink fitted Pixel Bloom training top.
- [ ] Lavender high-waisted athletic leggings.
- [ ] Black-and-white Panda-Dunk-inspired genericized low-top shoes.
- [ ] No unapproved shoe recolor.
- [ ] No protected brand logos required/rendered as production dependency.
- [ ] Clothing remains practical for exercise-form readability.

---

## Gate 4 — body/proportion checks

- [ ] Adult fuller/curvy proportions preserved.
- [ ] Strong/athletic read preserved.
- [ ] No exaggerated waist shrink.
- [ ] No exaggerated bust/hip mutation.
- [ ] Head/body ratio consistent with canonical turnaround.
- [ ] Shoulder/hip width remains stable.
- [ ] Limb lengths remain stable.
- [ ] Hands/feet do not change scale unexpectedly.

For animation:

- [ ] No frame-to-frame body-volume pumping.
- [ ] No limb-length drift.
- [ ] No face-shape drift.

---

## Gate 5 — pixel-art checks

- [ ] High-bit late-handheld/GBA-inspired visual language.
- [ ] Intentional visible pixel clusters.
- [ ] Crisp silhouette.
- [ ] Controlled high-color shading.
- [ ] Selective color-matched outlines/selout.
- [ ] No smooth-paint look.
- [ ] No pixel-filter-over-painting look.
- [ ] No excessive blur.
- [ ] Anti-aliasing remains controlled.
- [ ] Asset remains readable at target runtime size.

---

## Gate 6 — pose / gaze checks

### General art

- [ ] Pose serves the requested function.
- [ ] Gaze is natural; direct camera gaze is not forced.
- [ ] No accidental pin-up/fan-service distortion unless explicitly approved.

### Exercise art

- [ ] Form is instructional and readable.
- [ ] Camera angle matches movement family.
- [ ] Scale matches other frames in sequence.
- [ ] Ground/baseline is stable.
- [ ] Joints are readable.
- [ ] Gaze follows movement naturally.
- [ ] Personality styling does not obscure form.

---

## Gate 7 — animation continuity

For frame sequences:

- [ ] Fixed canvas.
- [ ] Fixed camera.
- [ ] Fixed character scale.
- [ ] Stable foot/floor reference.
- [ ] Stable ear bases.
- [ ] Stable hair volume.
- [ ] Stable glasses geometry.
- [ ] Stable tattoo anchor.
- [ ] Stable necklace and ring style.
- [ ] Stable clothing design.
- [ ] Stable shoe design.
- [ ] Secondary hair/ear motion is subtle and intentional.
- [ ] Loop has no identity pop at seam.

---

## Gate 8 — motion accessibility

If animated:

- [ ] `motionFull` defined.
- [ ] `motionReduced` defined.
- [ ] `motionOff` fallback defined.
- [ ] Reduced/off modes do not remove essential exercise information.
- [ ] Decorative loops do not block controls.
- [ ] No unsafe flashing.

---

## Gate 9 — technical file checks

- [ ] Correct file path.
- [ ] Correct naming convention.
- [ ] Expected dimensions.
- [ ] Expected transparency/background.
- [ ] No accidental matte/fringe around transparency.
- [ ] Correct color mode.
- [ ] File opens successfully.
- [ ] SHA-256 recorded.
- [ ] Sprite metadata matches actual sheet dimensions.
- [ ] Frame count matches metadata.
- [ ] FPS/duration metadata is coherent.
- [ ] No missing runtime fallback.

---

## Gate 10 — app integration checks

- [ ] Asset DB entry exists.
- [ ] Shipping UI references asset by registry ID, not an improvised filename.
- [ ] Only `production` assets are used in release UI.
- [ ] Runtime rendering preserves integer pixel scaling where required.
- [ ] No CSS blur/smoothing destroys pixel character art.
- [ ] Responsive crop does not cut ears, face, tattoo, hands, or instructional joints unexpectedly.
- [ ] WebKit/iPhone layout checked for user-facing assets.

---

## Automatic reject conditions

Reject immediately if any occur:

1. visible human ear;
2. ear count other than two;
3. hair not black 4C;
4. tail not single brown bunny tail;
5. more than one tattoo;
6. wrong tattoo design/side/location;
7. necklace pendant is not small `A`;
8. chunky/large-stone ring system;
9. wrong default shoes;
10. photoreal face;
11. child/teen visual read;
12. major body-proportion drift;
13. exercise form becomes unclear/unsafe-looking;
14. identity mutates between animation frames.

---

## Review outcome

Use only one:

- `PASS_APPROVED` — visually and technically approved as an asset source.
- `PASS_PRODUCTION` — approved and technically ready for shipping runtime use.
- `NEEDS_CLEANUP` — source concept is usable but defects must be corrected.
- `REGENERATE` — identity/style/form drift is too significant for cleanup.
- `REJECTED` — violates canon or project requirements.

### Required review note

Every non-pass must record the exact failed gate(s), e.g.:

`REGENERATE — Gate 1: visible human ear; Gate 2: tattoo duplicated; Gate 7: glasses shape changes in frames 5-7.`

Do not use vague notes such as "looks off."

---

## Final release question

Before promotion to production ask:

> If the canonical character sheet were hidden, would this asset still unmistakably look like the same Rae when compared side-by-side afterward?

If the answer is not clearly yes, it is not production-ready.
