# AI Collaboration Protocol — ChatGPT R&D + Claude Implementation

## Purpose

This repository separates support intelligence from implementation ownership.

- **ChatGPT:** R&D, specifications, structured data, schemas, fixtures, test matrices, research synthesis, creative asset generation/reference, audits and handoff packs.
- **Claude Code:** implementation, migration, refactoring, application tests/builds, asset integration and code-level verification.
- **Human owner:** product direction, content/creative approval, architecture exceptions and release decisions.

The goal is not two agents rewriting the same module. The goal is to give Claude unusually strong, inspectable inputs.

## Agent startup / context routing

Before loading broad repository context, read:

1. `docs/CONTEXT_ENGINEERING_INDEX.md`
2. `CLAUDE.md`
3. `docs/SOURCE_OF_TRUTH_V07.md`
4. the smallest focused authoritative document set for the task
5. exact implementation files/tests

Do not load every historical plan/R&D document by default. Context is intentionally layered to reduce conflicts with stale decisions.

## Authoritative vs support material

Authority order is defined in `docs/CONTEXT_ENGINEERING_INDEX.md`.

In short:
- `CLAUDE.md` + `SOURCE_OF_TRUTH_V07.md` define current implementation/product contract;
- focused current `docs/` define subsystem contracts;
- reviewed canonical schemas/data/assets/rules can be authoritative for their scope;
- `support/` is a mailbox/staging zone;
- `docs/rnd/` is research evidence until promoted;
- `SOURCE_OF_TRUTH_V06.md` and older plans are historical where v0.7 supersedes them.

**Live code is evidence, not permission for silent scope expansion.** If behavior appears in code but conflicts with current authority, reconcile it explicitly.

## When Claude should request support

Claude must not invent behavior when implementation finds an underspecified:

- product rule;
- exercise/workout record;
- substitution/progression edge;
- safety boundary;
- schema field;
- test fixture;
- offline/iPhone edge case;
- asset/media requirement;
- creative identity/detail;
- acceptance criterion;
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
2. distinguish research/draft from authoritative change;
3. update the smallest appropriate source-of-truth artifact;
4. prefer structured data/fixtures/test matrices over vague prose when behavior is deterministic;
5. record external sources/license/provenance where relevant;
6. update `support/CHATGPT_DELIVERIES.md`;
7. leave application implementation to Claude unless explicitly requested.

## Creative-asset discipline

ChatGPT may create visual source art; Claude integrates it.

For approved creative material:
- preserve canonical character/style identity;
- record filenames/version/manifest metadata;
- distinguish source art from runtime export;
- do not let Claude regenerate a missing approved visual from prose and silently call it canonical;
- define Full/Reduced/Off fallback for animation;
- use `docs/PIXEL_BLOOM_FRONTEND_CONTEXT.md` as the integration contract.

## High-value support packs

Current priorities are tracked in `support/RND_BACKLOG.md`, including:
- true offline/WebKit acceptance packs;
- session durability edge-case corpus;
- Foundation Strength production review;
- export/import corruption fixtures;
- Pixel Bloom production assets/animation;
- reviewed progression/substitution relationships;
- performance/storage budgets;
- accessibility scenarios.

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
human/review promotion when needed
      ↓
authoritative docs/data/assets
      ↓
Claude pulls and implements
```

## Failure-prevention rule

When uncertain, prefer an explicit unresolved request over an invented assumption. A temporarily incomplete feature is cheaper than durable history or content semantics built on a hallucinated rule.