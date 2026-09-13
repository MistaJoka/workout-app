# Bespoke Fitness PWA

Private, single-user, offline-first fitness PWA for a curated exercise program and durable guided workout experience.

## Current state

This repository contains a legacy working prototype plus a **v0.6 reconciliation contract** that now governs continued development.

The original prototype is preserved on branch `legacy-mvp-2026-09-13`.

Start here:

1. `CLAUDE.md`
2. `docs/SOURCE_OF_TRUTH_V06.md`
3. `docs/AI_COLLABORATION_PROTOCOL.md`
4. `support/CLAUDE_REQUESTS.md`

## Product direction

- iPhone portrait-first PWA
- offline-first / local-first
- no backend in V1
- no runtime AI
- IndexedDB/Dexie local persistence
- deterministic adaptation/progression
- curated/versioned exercises and content packs
- reviewed static exercise media
- Pixel Bloom + Savage Core themes
- Today / Library / Progress / Settings

## Development model

Claude Code owns implementation. ChatGPT supplies research, specs, structured data, fixtures, test matrices, reviewed reference assets, and reconciliation support. Missing product truth should be requested through `support/CLAUDE_REQUESTS.md`, not invented in code.
