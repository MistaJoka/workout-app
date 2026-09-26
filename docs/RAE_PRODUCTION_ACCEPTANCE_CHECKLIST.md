# Rae Production Acceptance Checklist

**Status:** REQUIRED GATE FOR EVERY RAE ASSET  
**Character version:** v1.0  
**Primary visual authority:** exact approved Rae character-bible image  
**Canonical SHA-256:** `e0390ef9d39fe92d2d93544d62cb0568a6e9e2b3cd5e6e8305c333b7f3217beb`  
**Supporting description:** `docs/RAE_CHARACTER_BIBLE_V1.md`

## Review rule

This is an **image-comparison gate**, not a keyword checklist.

The reviewer must compare the candidate asset directly against the approved Rae v1 image. A candidate can satisfy every written item below and still fail if it does not visually look like the approved Rae.

If this checklist or another supporting document conflicts with the approved visual reference, update the documentation. Do not alter Rae to satisfy stale prose.

---

## A. Overall likeness

- [ ] Clearly reads as the same Rae shown in the approved character-bible image
- [ ] Adult woman read
- [ ] Same overall face/head silhouette family
- [ ] Same curvy/strong/athletic body-proportion family
- [ ] Same warm medium-deep brown complexion family
- [ ] No photorealistic face treatment

## B. Hair

- [ ] Hair is black
- [ ] Hair reads as 4C natural hair
- [ ] Dense tightly coiled/kinky texture is visible at the target scale
- [ ] Overall updo/puff silhouette matches the approved image
- [ ] No straight/straightened/silky-straight hair
- [ ] No generic loose-wave substitution

## C. Bunny anatomy

- [ ] Exactly two ears total
- [ ] Both are bunny ears
- [ ] Zero visible human ears
- [ ] Outer bunny ears are tan
- [ ] Inner bunny ears are flesh pink
- [ ] Ear length/base/shape visually track the approved reference
- [ ] Ears are semi-upright with natural bend rather than heavily floppy
- [ ] Exactly one small fluffy brown bunny tail
- [ ] Tail position tracks the approved turnaround

## D. Face and glasses

- [ ] Thin round gold wire-frame glasses
- [ ] Glasses proportions/bridge remain recognizable
- [ ] Eyes/brows/mouth preserve Rae's friendly expressive character
- [ ] Gaze is natural to the scene; direct camera gaze is not required

## E. Tattoo

- [ ] Rae has exactly one tattoo
- [ ] It is the owner-supplied black/gray lotus design
- [ ] It is on Rae's anatomical left side
- [ ] It is under the left collarbone near the front shoulder
- [ ] The left top strap may naturally overlap it as in the reference
- [ ] It has not migrated to the deltoid, upper arm, center chest, or right side
- [ ] A detail inset/reference image is not misinterpreted as a second tattoo on Rae

## F. Jewelry

- [ ] Thin delicate gold necklace when visible
- [ ] Small letter `A` pendant
- [ ] Pendant remains subtle/smaller as in the approved image
- [ ] Rings, when visible, are thin/dainty/layered
- [ ] No chunky rings
- [ ] No large rocks / oversized stones

## G. Default outfit

- [ ] Pink fitted Pixel Bloom training top
- [ ] Lavender high-waisted athletic leggings
- [ ] Black-and-white Panda-Dunk-inspired sneaker look
- [ ] Shoe treatment is genericized and does not require protected logo reproduction
- [ ] Outfit silhouette and color blocking remain visually consistent with approved Rae

## H. Pixel-art treatment

- [ ] High-bit late-handheld/GBA-era-inspired pixel-art read
- [ ] Intentional pixel clusters
- [ ] Crisp silhouette
- [ ] Controlled high-color shading
- [ ] Selective color-matched outlines / selout
- [ ] No painterly/airbrushed sprite treatment
- [ ] No random pixelation filter pretending to be authored pixel art
- [ ] Palette feels derived from the approved image

## I. Animation continuity

For frame sequences:

- [ ] Same logical canvas for all frames
- [ ] Same camera/perspective for the sequence
- [ ] Same character scale
- [ ] Same floor/baseline unless movement requires displacement
- [ ] Face does not morph between frames
- [ ] Body proportions do not drift
- [ ] 4C hair mass does not change identity
- [ ] Ear count, color, length, and attachment remain stable
- [ ] Tail size/color/location remain stable
- [ ] Glasses geometry remains stable
- [ ] Tattoo stays anchored to the same anatomy
- [ ] `A` pendant does not change letter/scale
- [ ] Jewelry style does not become chunky
- [ ] Outfit panels do not randomly change
- [ ] Shoes remain the same black/white treatment
- [ ] No unexplained hand/finger/joint deformation

## J. Exercise animation

- [ ] Camera selected for movement/form clarity
- [ ] Rae is not forced to look at the viewer
- [ ] Head/gaze follows movement naturally
- [ ] Start pose is clear
- [ ] Key/bottom/peak pose is clear
- [ ] Finish/return is clear
- [ ] Limb lengths remain stable
- [ ] Feet/support contacts are coherent
- [ ] Knee/hip/torso movement is coherent for the authored exercise
- [ ] Character personality does not obscure form
- [ ] Human form review completed before production approval

## K. Accessibility and fallback

- [ ] Full-motion behavior exists
- [ ] Reduced-motion behavior exists
- [ ] Motion-off fallback exists
- [ ] Static instructional fallback exists for exercise media
- [ ] Alt text exists
- [ ] Workout understanding does not depend solely on animation

## L. Asset/data integrity

- [ ] Stable asset ID
- [ ] Source asset points back to the approved Rae v1 reference
- [ ] Expected dimensions recorded
- [ ] SHA-256 recorded for approved production files
- [ ] Asset DB entry validates
- [ ] Runtime path exists
- [ ] Source/editable path exists
- [ ] Fallback path exists when required
- [ ] Review status is explicit
- [ ] No draft/generated-only asset is silently shipped as production

## Approval result

Record one:

- `REJECTED — identity mismatch`
- `REJECTED — animation/form mismatch`
- `REJECTED — technical/export mismatch`
- `REVIEW — corrections required`
- `APPROVED — visually matches Rae v1 canonical image`

Only the final state is eligible for production promotion.
