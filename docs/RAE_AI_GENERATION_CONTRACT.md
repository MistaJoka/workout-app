# Rae AI Generation Contract

**Status:** REQUIRED FOR ALL RAE ASSET GENERATION  
**Character:** `rae`  
**Version:** `v1.0`  
**Canonical semantic lock:** `assets/pixel-bloom/db/rae-character-lock.v1.json`  
**Canonical character bible:** `docs/RAE_CHARACTER_BIBLE_V1.md`

This document is the operating contract for ChatGPT, Claude Code, image models, animation tools, and future agents that create or modify Rae assets.

The purpose is simple: **do not let AI invent Rae. Reproduce Rae.**

---

## 1. Mandatory context load order

Before touching a Rae asset, load in this order:

1. `assets/pixel-bloom/db/rae-character-lock.v1.json`
2. `docs/RAE_CHARACTER_BIBLE_V1.md`
3. the canonical Rae raster at `assets/pixel-bloom/character/rae/reference/pb-rae-character-bible-v1.png`
4. task-specific approved source asset(s)
5. `docs/RAE_PRODUCTION_ASSET_PIPELINE.md`
6. `docs/RAE_ASSET_QA_GATE.md`

Do not rely on memory from another chat/session.

---

## 2. Canonical prompt preamble

Every image-generation or image-edit prompt involving Rae should begin conceptually with the following constraints:

> Rae is a locked Pixel Bloom character. Preserve her canonical identity exactly. She is an adult Black bunny girl with warm medium-deep brown skin, black 4C natural hair, exactly two tan bunny ears with soft flesh-pink inner ears, no human ears, one small brown bunny tail, thin round gold glasses, exactly one owner-supplied black/gray lotus tattoo under the anatomical left collarbone near the shoulder and slightly beneath the left top strap, a thin gold chain with a small letter A pendant worn for her husband, thin dainty layered gold rings only, a pink fitted Pixel Bloom training top, lavender high-waisted leggings, and black-and-white Panda-Dunk-inspired genericized low-top sneakers. Render in stylized premium high-bit late-handheld/GBA-era pixel art, never photoreal. Do not invent or alter canonical anatomy, accessories, colors, tattoo count/location, hair texture, or identity.

Task-specific instructions come **after** this identity preamble.

---

## 3. Negative prompt / forbidden mutations

Explicitly prevent these whenever the generation system supports negative instructions:

- human ears;
- four ears;
- white or fully pink bunny ears;
- floppy hound-like ears;
- white or pink tail;
- straight hair;
- loose waves;
- silky hair;
- brown/auburn hair replacing black hair;
- photoreal skin;
- generic anime face drift;
- child/teen appearance;
- extra tattoos;
- tattoo on right side;
- tattoo on outer arm;
- generic flower replacing lotus;
- letter R necklace;
- oversized pendant;
- chunky jewelry;
- large gemstone rings;
- thick rings;
- pastel multicolor shoes in the default outfit;
- branded shoe logos;
- exaggerated body proportions;
- random outfit redesign;
- duplicate limbs/accessories;
- frame-to-frame identity mutation.

---

## 4. No-inference policy

AI may not "fill in" canonical identity details from general world knowledge.

Examples:

- Humans normally have ears → **irrelevant. Rae has no human ears.**
- Bunny characters often have pink ears → **irrelevant. Rae has tan outer ears and flesh-pink inner ears.**
- Bunny tails are often white → **irrelevant. Rae's tail is brown.**
- Her name is Rae → **do not infer an R pendant. Her pendant is A.**
- Tattoo detail panel appears beside portrait → **do not infer a second tattoo. Rae has one tattoo total.**
- Low-resolution hair looks loosely curled → **do not reinterpret. Rae has black 4C hair.**

When semantics are explicit, the lock wins over visual ambiguity.

---

## 5. Generation modes

### A. Canonical reference creation/edit

Use when creating character bible or master identity assets.

Requirements:

- highest identity fidelity;
- no pose novelty that hides key canonical features;
- full visibility of ears/hair/glasses/tattoo/outfit/shoes where practical;
- review against canonical sheet before approval.

### B. Portrait/expression

May vary expression and gaze only.

Must preserve:

- face proportions;
- glasses;
- hair silhouette/texture;
- ear anatomy;
- complexion;
- jewelry where visible;
- tattoo if crop includes location.

### C. Full-body pose

May vary pose/gaze.

Must preserve:

- body proportions;
- outfit;
- shoe colorway;
- tail;
- ear base placement;
- character scale for same asset family.

### D. Exercise key pose

Instructional correctness outranks dramatic style.

Use:

- fixed camera family;
- fixed scale;
- fixed ground plane;
- anatomically readable joints;
- natural gaze;
- stable canonical appearance.

### E. Animation frame

Never create every frame independently from text.

Use approved anchors/keyframes. Intermediate frames must inherit:

- same face/head geometry;
- same 4C hair mass;
- same ear bases;
- same glasses;
- same tattoo anchor;
- same jewelry;
- same outfit;
- same limb lengths;
- same shoes;
- same palette.

---

## 6. Image/reference conditioning rule

Whenever tools allow reference images:

- always include canonical Rae reference;
- also include the nearest approved pose/expression keyframe;
- use text locks to correct anything the visual model may misread;
- do not use obsolete Rae drafts as equal references.

If multiple references disagree, prefer:

1. current semantic lock for facts;
2. canonical reference for identity/style;
3. newest approved task-specific asset for pose.

---

## 7. Prompt specificity rule

Do not prompt only:

> "Rae doing a squat"

Use:

> "Canonical Rae v1 from the supplied approved reference, preserving all locked anatomy, 4C hair, two-ear-only rule, complexion, single lotus placement, A pendant, dainty rings, outfit, tail, glasses and black/white shoes, shown in the approved side-view exercise camera performing the bottom squat key pose."

Identity constraints are repeated because image models do not reliably retain state between generations.

---

## 8. Editing rule

For an existing approved Rae asset:

- make the smallest requested visual change;
- explicitly say what must remain unchanged;
- do not ask the image model to "improve" unrelated areas;
- compare output to input for collateral changes;
- reject edits that silently alter canonical identity.

Example:

> "Change only the arm angle. Preserve face, complexion, hair, ears, glasses, tattoo, A pendant, rings, body proportions, clothing, tail, shoes, palette, camera, scale and background unchanged."

---

## 9. Claude Code responsibilities

Claude Code is the **technical artist / asset engineer**, not the canonical character designer.

Claude Code should:

- read the lock before asset work;
- validate paths/names/metadata;
- build sprite sheets;
- generate animation metadata;
- generate WebP/GIF previews;
- hash outputs;
- run image dimension/transparency checks;
- generate QA contact sheets;
- enforce status gates;
- integrate production assets into React;
- run visual regression tests.

Claude Code should **not**:

- redesign Rae from prose;
- substitute easier-to-render features;
- change identity because a generated source asset is inconsistent;
- promote an unreviewed generated asset to production.

---

## 10. Status lifecycle

Every Rae asset must have one state:

`planned -> generated -> cleanup -> review -> approved -> production -> deprecated`

Rules:

- `generated` is not approved.
- `review` is not production.
- Only `approved` assets may be source parents for production derivation unless explicitly noted.
- Only `production` assets may be referenced by shipping UI.

---

## 11. Required metadata per asset

At minimum:

- asset ID;
- Rae character ID;
- kind;
- version;
- source asset ID;
- perspective;
- dimensions;
- format;
- transparency;
- status;
- SHA-256;
- canonical lock version;
- generation/edit provenance;
- review result;
- notes;
- runtime fallback where applicable.

Animation additionally requires:

- frame count;
- FPS;
- duration;
- loop behavior;
- frame dimensions;
- pivot/baseline;
- motion-full behavior;
- motion-reduced behavior;
- motion-off fallback.

---

## 12. Failure behavior

If the model cannot reliably preserve a canonical detail:

1. do not hide the failure;
2. do not reinterpret canon;
3. mark output `REJECTED` or `NEEDS_CLEANUP`;
4. identify the exact defect;
5. use editing/manual cleanup or regenerate from stronger references;
6. never promote the defective output.

---

## 13. Final instruction to any AI agent

**Rae is not a prompt idea. Rae is a versioned production character.**

Do not redesign her, approximate her, normalize her, or fill gaps using model defaults. Load the canonical lock, preserve it, perform only the requested transformation, validate the result, and leave canon unchanged unless the project owner explicitly approves a new character version.
