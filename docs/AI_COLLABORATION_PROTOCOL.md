# AI Collaboration Protocol — ChatGPT R&D + Claude Implementation

## Purpose

This repository separates support intelligence from implementation ownership.

- **ChatGPT:** R&D, specifications, structured data, schemas, fixtures, test matrices, research synthesis, visual-asset prompts/references, audits and handoff packs.
- **Claude Code:** implementation, migration, refactoring, application tests/builds and code-level verification.
- **Human owner:** product direction, content approval, architectural exceptions and release decisions.

The goal is not two agents rewriting the same module. The goal is to give Claude unusually strong, inspectable inputs.

## Authoritative vs support material

Authoritative product truth lives in `CLAUDE.md`, `docs/`, and any reviewed/versioned `schemas/`, `content/`, `rules/`, `themes/` or canonical fixtures later promoted into the repository.

`support/` is a mailbox and staging zone. A support draft is not automatically runtime truth.

## When Claude should request support

Claude must not invent behavior when implementation finds an underspecified:

- product rule,
- exercise/workout record,
- substitution/progression edge,
- safety boundary,
- schema field,
- test fixture,
- offline edge case,
- asset/media requirement,
- acceptance criterion,
- evidence/research question.

Add a structured entry to `support/CLAUDE_REQUESTS.md` instead.

## Request format

```md
## REQ-YYYYMMDD-NNN — Short title

**Status:** OPEN
**Blocking:** yes | no
**Implementation context:** <phase/module/files>
**Need:** <exact missing truth or artifact>
**Why it matters:** <what would otherwise be guessed>
**Requested output:** spec | data | schema | fixture | research | asset | acceptance test | decision
**Constraints already known:** <paths/decisions>
**Proposed fallback if unresolved:** <safe fallback or pause point>
```

Claude may continue unrelated work when the request is non-blocking.

## ChatGPT delivery discipline

A support delivery should:

1. reference the request ID when applicable;
2. distinguish brainstorm/draft from authoritative change;
3. update the smallest appropriate source-of-truth artifact;
4. include structured data/fixtures/tests where useful;
5. update `support/CHATGPT_DELIVERIES.md`;
6. leave implementation details to Claude unless explicitly requested.

## High-value future support packs

- canonical exercise review/enrichment,
- progression/substitution graph packs,
- deterministic adaptation-rule tables,
- session edge-case corpora,
- IndexedDB/export/import corruption fixtures,
- PWA/offline/iPhone behavior matrices,
- theme component-state/contrast matrices,
- accessibility acceptance cases,
- generated exercise visual shot lists and reference assets,
- content provenance/reviewer metadata,
- progress analytics verification datasets.

## Feedback loop

```text
Claude implementation
      ↓
missing/ambiguous product input
      ↓
support/CLAUDE_REQUESTS.md
      ↓
ChatGPT research/spec/data/assets/tests
      ↓
review/promote into source of truth
      ↓
Claude pulls and implements
```
