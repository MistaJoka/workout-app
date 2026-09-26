# Rae Canonical Binary Handoff

**Status:** OPEN — documentation/semantic lock complete; canonical PNG binary still needs to be committed by Claude Code/local Git.

## Required source file

Local approved file name:

`rae_pixel_bloom_character_bible.png`

Canonical repository destination:

`assets/pixel-bloom/character/rae/reference/pb-rae-character-bible-v1.png`

Expected dimensions:

`1536 × 1024`

Expected byte size:

`2198087`

Expected SHA-256:

`e0390ef9d39fe92d2d93544d62cb0568a6e9e2b3cd5e6e8305c333b7f3217beb`

## Claude Code task

When local/cloud-code execution is available:

1. obtain the exact approved binary from the owner/ChatGPT handoff;
2. copy it to the canonical destination above;
3. compute SHA-256 locally;
4. verify it exactly matches the expected hash;
5. do **not** regenerate, recompress, resize, optimize, or otherwise alter the canonical reference;
6. commit the binary unchanged;
7. run the asset registry/validation pipeline;
8. confirm `rae-canonical-reference` resolves to this file;
9. record completion in the delivery log.

## Stop condition

If the hash differs, stop. Do not treat the file as canonical and do not create a replacement by prompting an image model.

The canonical image is identity evidence; derivative optimized copies may be generated later, but they must receive different asset IDs/paths/hashes.
