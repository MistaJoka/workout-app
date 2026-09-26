# Context Engineering Index

**Status:** AUTHORITATIVE ROUTING DOCUMENT  
**Purpose:** tell humans and AI agents what to read, in what order, and what each document is allowed to decide.

This repository is intentionally documented so an implementation agent does not need to reconstruct product intent from commit history or improvise missing rules.

## 1. Authority order

When two documents conflict, use this order:

1. `CLAUDE.md` — live implementation contract and non-negotiable engineering boundaries.
2. `docs/SOURCE_OF_TRUTH_V07.md` — current product behavior, scope, domain invariants and release definition.
3. Focused authoritative docs in `docs/` — architecture, reliability, iPhone/PWA runtime, security, and creative integration.
4. Reviewed schemas/data/content/rules/manifests committed in canonical runtime paths.
5. `support/CLAUDE_REQUESTS.md` — unresolved questions; not product truth by itself.
6. `support/` fixtures/drafts and `docs/rnd/` — research/staging evidence; promote before treating as runtime truth.
7. Historical `docs/superpowers/` plans and `SOURCE_OF_TRUTH_V06.md` — historical context only when v0.7 supersedes them.

**Live code is evidence of implementation, not automatically product authority.** If code contradicts v0.7, stop broadening the contradiction and reconcile it explicitly.

### Rae-specific visual authority exception

For the appearance of the Pixel Bloom character Rae, the **exact approved Rae v1 character-bible image is the primary visual source of truth**.

Canonical target:

`assets/pixel-bloom/character/rae/reference/pb-rae-character-bible-v1.png`

Canonical SHA-256:

`e0390ef9d39fe92d2d93544d62cb0568a6e9e2b3cd5e6e8305c333b7f3217beb`

`docs/RAE_CHARACTER_BIBLE_V1.md`, the character-lock JSON, and `asset-db.json` are supporting descriptions/metadata. If they conflict with how Rae is visually depicted in the approved image, **correct the supporting document**. Do not redesign the image to satisfy stale prose.

Incidental text rendered inside an AI-generated reference board is not semantic product truth when it contradicts the depicted character or explicit project-owner approval.

## 2. Minimum context by task

### Any application-code change
Read:
1. `CLAUDE.md`
2. `docs/SOURCE_OF_TRUTH_V07.md`
3. `docs/ARCHITECTURE.md`
4. the focused document for the affected area

### Workout/session/persistence change
Also read:
- `docs/TESTING_AND_RELIABILITY.md`
- `docs/IOS_PWA_RUNTIME.md`
- relevant domain/repository tests

### UI/theme/animation change
Also read:
- `docs/PIXEL_BLOOM_ASSET_SYSTEM.md`
- `docs/PIXEL_BLOOM_ANIMATION_SYSTEM.md`
- `docs/PIXEL_BLOOM_FRONTEND_CONTEXT.md`
- `docs/RAE_PRODUCTION_ASSET_PIPELINE.md` when producing/integrating Rae art or animation
- `assets/pixel-bloom/db/asset-db.json`
- `assets/pixel-bloom/db/asset-db.schema.json`
- `docs/DEFINITION_OF_DONE.md`

### Rae asset-production change
Read/use, in this order:
1. **the exact approved Rae v1 image itself**;
2. `docs/RAE_CHARACTER_BIBLE_V1.md`;
3. `assets/pixel-bloom/db/rae-character-lock.v1.json`;
4. `docs/RAE_PRODUCTION_ACCEPTANCE_CHECKLIST.md`;
5. `docs/RAE_PRODUCTION_ASSET_PIPELINE.md`;
6. `docs/RAE_AVATAR_ANIMATION_DB.md`;
7. `assets/pixel-bloom/db/asset-db.json`;
8. `assets/pixel-bloom/db/asset-db.schema.json`;
9. `docs/PIXEL_BLOOM_ASSET_SYSTEM.md`;
10. `docs/PIXEL_BLOOM_ANIMATION_SYSTEM.md`;
11. exact source/build/runtime asset paths being changed.

The approved image answers **what Rae looks like**. The docs/DB answer how that visual truth is named, versioned, validated, exported, and integrated.

Do not generate a new Rae identity from memory or text alone when the approved canonical image is available. If the canonical binary is missing from a local checkout, restore the exact hashed binary rather than regenerating it.

### PWA/offline/storage/audio/wake-lock change
Also read:
- `docs/IOS_PWA_RUNTIME.md`
- `docs/SECURITY_AND_PRIVACY.md`
- `public/sw.js`
- `playwright.config.ts`

### Fitness content/progression change
Also read:
- `docs/rnd/foss-fitness/CAPABILITY_MATRIX.md`
- relevant source notes under `docs/rnd/foss-fitness/sources/`
- `support/CLAUDE_REQUESTS.md`
- canonical content schemas/fixtures

Do not infer exercise equivalence, progression edges, safety rules, or medical advice from UI requirements.

## 3. Context budget rule

Do not dump the entire repository into an agent prompt. Load the smallest authoritative set that fully covers the task.

Preferred pattern:

```text
contract
  -> current source of truth
  -> focused system document
  -> exact implementation files/tests
  -> relevant research only when a decision is still open
```

For Rae visual work, prepend the exact canonical image before written context.

This reduces stale-context collisions and makes violations easier to detect.

## 4. Product facts that must remain easy to retrieve

- iPhone portrait-first, installable PWA.
- Local-first/offline-first; no backend required for core use.
- Multiple local profiles are supported on one device; each profile has isolated local data.
- Four persistent primary tabs only: Today, Library, Progress, Settings.
- Routine builder, weekly schedule, exercise detail/history and About are secondary routes, not new primary tabs.
- Curated starter workouts and a larger exercise library coexist.
- User-created routines are local records; authored canonical content remains immutable.
- Started workouts execute immutable `SessionPlan` snapshots.
- Session history is event/result based and durable.
- Progression is deterministic and confirmation-gated.
- Pixel Bloom and Savage Core share one component/domain tree.
- Motion modes are Full / Reduced / Off.
- Rae's appearance is governed by the exact approved v1 image; supporting metadata must match it.
- Rae production assets use the canonical asset DB and production pipeline rather than ad hoc filenames or per-screen art handling.
- No runtime LLM/image generation, camera coaching, microphone coaching or required cloud service.

## 5. Research-to-truth promotion

Research belongs in `docs/rnd/` until it becomes a product decision.

Promotion requires:
1. source/license/provenance recorded;
2. compatibility with current architecture checked;
3. behavior stated without copying incompatible architecture;
4. acceptance tests/fixtures where behavior is deterministic;
5. authoritative target document updated;
6. delivery logged in `support/CHATGPT_DELIVERIES.md`.

## 6. Missing-truth protocol

When an implementation decision would require inventing product truth:

```text
implementation reaches ambiguity
        ↓
check authoritative docs / canonical visual reference
        ↓
check existing reviewed research
        ↓
still unresolved
        ↓
add structured request to support/CLAUDE_REQUESTS.md
        ↓
continue unrelated safe work
```

Do not silently turn a fallback into product policy.

## 7. Historical note

`docs/SOURCE_OF_TRUTH_V06.md` accurately describes the earlier narrow foundation, but the live product subsequently gained local profiles, custom routines, scheduling, weight prescriptions/logging, body-weight logging, a large exercise library and richer progress features. `SOURCE_OF_TRUTH_V07.md` is the reconciliation point for that expanded product.
