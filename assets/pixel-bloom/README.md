# Pixel Bloom Creative Assets

This directory is the canonical destination for Pixel Bloom creative files produced outside the application runtime.

## Ownership boundary

- **ChatGPT:** creative direction, source/reference art, SVG/PNG/WebP/GIF assets, animation frames/sprite sheets, manifests, and visual QA.
- **Claude Code:** application implementation and integration only.

## Authoritative creative docs

- `docs/PIXEL_BLOOM_ASSET_SYSTEM.md`
- `docs/PIXEL_BLOOM_ANIMATION_SYSTEM.md`

## Current generated assets

The following full-resolution files have been generated in the active creative handoff and are tracked in `manifests/assets.manifest.json` with exact SHA-256 hashes and intended repo paths:

- mascot master sheet;
- mascot turnaround pack;
- mascot expression pack;
- Pixel Bloom master-style concept board.

The manifest status distinguishes generated creative binaries from files already committed into GitHub so Claude Code does not invent or silently substitute missing assets.

## Rule

If a manifest entry says `generated-not-yet-committed-binary`, the creative asset exists in the handoff bundle but is not yet a repository binary. Do not recreate it from memory; use the exact handoff file and verify its SHA-256 before integration.
