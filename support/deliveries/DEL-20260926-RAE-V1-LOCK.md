# DEL-20260926 — Rae v1 Canonical Visual Lock

**Status:** DELIVERED / HUMAN-APPROVED  
**Scope:** Rae visual identity, supporting documentation, asset-governance authority  
**Implementation owner:** Claude Code  
**Creative/reference owner:** project owner + ChatGPT

## Canonical visual source of truth

The exact approved Rae v1 character-bible image is the primary source of truth for **how Rae looks**.

Expected repository path:

`assets/pixel-bloom/character/rae/reference/pb-rae-character-bible-v1.png`

Exact properties:

- dimensions: `1536 × 1024`
- bytes: `2198087`
- SHA-256: `e0390ef9d39fe92d2d93544d62cb0568a6e9e2b3cd5e6e8305c333b7f3217beb`

Supporting docs/metadata must follow the image. If they conflict, fix the documentation rather than redefining Rae from prose.

## Locked visual features reflected in supporting docs

- warm medium-deep brown complexion;
- black 4C natural hair with the approved voluminous tightly coiled silhouette;
- exactly two tan bunny ears with flesh-pink interiors;
- no human ears;
- one small fluffy brown bunny tail;
- thin round gold wire-frame glasses;
- one owner-supplied black/gray lotus tattoo under the anatomical-left collarbone near shoulder;
- thin gold chain with small `A` pendant;
- thin/dainty layered rings;
- pink fitted training top;
- lavender high-waisted leggings;
- black-and-white Panda-Dunk-inspired genericized sneakers;
- adult fuller/curvy strong proportions;
- high-bit late-handheld/GBA-era-inspired pixel-art treatment;
- direct camera gaze optional.

## Files created/updated

- `docs/RAE_CHARACTER_BIBLE_V1.md`
- `docs/RAE_PRODUCTION_ACCEPTANCE_CHECKLIST.md`
- `docs/RAE_AVATAR_ANIMATION_DB.md`
- `docs/CONTEXT_ENGINEERING_INDEX.md`
- `assets/pixel-bloom/db/rae-character-lock.v1.json`
- `assets/pixel-bloom/db/asset-db.json`
- `support/CLAUDE_HANDOFF_RAE_V1_REFERENCE.md`

## Important binary note

The GitHub connector used for this documentation pass writes UTF-8 text files and cannot commit the PNG binary itself. The exact approved PNG is therefore locked by filename, dimensions, byte count, and SHA-256 until Claude Code or a local Git workflow places those exact bytes at the canonical repository path.

Do **not** regenerate the reference image to fill the path. Ingest the exact approved file and verify its SHA-256.

## Next gate

Before broad asset production:

1. place exact canonical PNG in repo and verify hash;
2. extract the production palette from that exact image;
3. create isolated source turnarounds/details without redesigning Rae;
4. produce Bodyweight Squat gold-master key poses;
5. run the image-first acceptance checklist;
6. only then expand to frames, sprites, animation exports, and the wider asset suite.
