# Bespoke Fitness PWA

A private, single-user, offline-first fitness PWA foundation for a curated exercise program and durable guided workout experience.

## Current state

This repository holds the v0.6 foundation: domain types, IndexedDB persistence, and an event-sourced session engine. There are no UI screens yet — that is a follow-up plan built on top of this foundation.

Governing docs (read before changing application code):

1. `CLAUDE.md`
2. `docs/SOURCE_OF_TRUTH_V06.md`
3. `docs/AI_COLLABORATION_PROTOCOL.md`
4. `support/CLAUDE_REQUESTS.md`

## Tech stack

- Vite
- React
- TypeScript
- Dexie (IndexedDB wrapper)
- Zod
- Vitest

## Setup

```bash
npm install
npm run dev     # start the dev server
npm run build   # type-check and build for production
npm test        # run the test suite
```

## Development model

Claude Code owns implementation. ChatGPT supplies research, specs, structured data, fixtures, test matrices, reviewed reference assets, and reconciliation support. Missing product truth should be requested through `support/CLAUDE_REQUESTS.md`, not invented in code.
