# ChatGPT Deliveries

## DEL-20260913-001 — v0.6 reconciliation/support baseline

**Status:** DELIVERED  
**Authoritative changes:** yes

Delivered to the live repository:

- root Claude implementation contract,
- consolidated v0.6 product/domain/UX/architecture source of truth,
- explicit ChatGPT R&D ↔ Claude implementation protocol,
- Claude request mailbox,
- prioritized R&D backlog,
- preservation pointer to the legacy prototype branch.

The deeper R&D reservoir maintained in ChatGPT includes structured content-pack drafts, exercise/workout/media schemas, deterministic rule bundles, theme tokens, fixtures and reference visuals. Promote focused packs into GitHub as implementation needs them rather than letting Claude invent missing truth.

## DEL-20260917-001 — Pixel Bloom creative asset system

**Status:** DELIVERED  
**Authoritative changes:** yes, for Pixel Bloom creative production only  
**Implementation authority:** no — Claude Code remains the implementation owner

Delivered:

- `docs/PIXEL_BLOOM_ASSET_SYSTEM.md`
- locked Pixel Bloom creative direction;
- canonical lead-character definition;
- creative/implementation ownership boundary;
- candidate palette and asset-format rules;
- asset naming convention and filesystem blueprint;
- full creative inventory across brand, character, UI iconography, world, collectibles, map progression, achievements, states, workout identity, exercise media and motion;
- Batch 1–9 generation sequence;
- exact Batch 1–2 production prompts;
- character, icon-family and visual-UI acceptance gates.

Use this document as the creative source of truth for ChatGPT-generated Pixel Bloom assets. Claude Code should consume approved outputs and integrate them into the app without treating this document as authority over product behavior, architecture, domain logic, persistence, or navigation.

## DEL-20260917-002 — Pixel Bloom character goods + motion system

**Status:** DELIVERED / CREATIVE PRODUCTION IN PROGRESS  
**Implementation authority:** no — Claude Code remains the implementation owner

Delivered to GitHub:

- `docs/PIXEL_BLOOM_ANIMATION_SYSTEM.md`
- `assets/pixel-bloom/README.md`
- `assets/pixel-bloom/manifests/assets.manifest.json`
- `assets/pixel-bloom/manifests/animations.manifest.json`

Generated creative binaries tracked by exact SHA-256 in the asset manifest:

- mascot master sheet;
- mascot turnaround pack;
- mascot expression pack;
- Pixel Bloom master-style concept board.

The binary originals are generated handoff files and are not yet committed as repository binaries. Their intended repository paths, dimensions, byte sizes, and SHA-256 hashes are recorded so Claude Code must not recreate or substitute them from memory. The next creative production wave is Animation Batch A plus UI SVG primitives.

## DEL-20260917-003 — Deterministic progression candidate promotion pack

**Status:** DELIVERED  
**Authoritative changes:** yes, for the Promotion 001 progression rule contract and acceptance criteria  
**Implementation authority:** no — Claude Code remains the implementation owner  
**Request:** `REQ-20260913-002` partially resolved

Delivered:

- `docs/rnd/foss-fitness/PROMOTION_001_PROGRESSION_CANDIDATE.md`;
- `support/schemas/progression_edge.schema.json`;
- `support/fixtures/progression_candidate_cases.json` with 11 target-independent acceptance cases;
- updated/pinned FitnessTrack research at `docs/rnd/foss-fitness/sources/fitnesstrack.md`;
- upstream reference pinned to FitnessTrack commit `f627429623756aebe93e15bada6f698e8385f6ed`;
- MIT license verified at that revision;
- explicit compatibility finding that FitnessTrack's weight-centric progression cannot be transplanted into the current local product model;
- first compatible rule selected: clean authored upper-range completion may create `PROGRESSION_CANDIDATE` only through an explicit approved harder-variant edge;
- explicit confirmation gate: a candidate never silently mutates the current SessionPlan or advances difficulty;
- deterministic/replay/idempotency acceptance requirements;
- safe behavior when production edges are absent: no candidate rather than inferred progression.

Still unresolved under `REQ-20260913-002`:

- real production progression edges using approved exercise IDs/versions;
- regression/substitution graph data;
- concrete in-session authored adjustment bounds;
- session-compression rules;
- future repeated-failure policy values.

Claude Code can now implement Promotion 001 without inventing the eligibility rule or test cases. Production difficulty changes remain blocked on reviewed canonical progression-edge data.

## DEL-20260919-001 — v0.7 deep context-engineering + research pack

**Status:** DELIVERED  
**Authoritative changes:** yes — reconciles current product, architecture, platform and quality contracts  
**Implementation authority:** no — Claude Code remains the implementation owner

### Why this delivery exists

The live app had advanced beyond the original v0.6 contract: multiple local profiles, user-built routines, weekly scheduling, weighted prescriptions/logging, body-weight tracking, a large exercise library and richer progress behavior were implemented while the root docs still described a single-user app with no in-app builder. This pack removes that contradiction and gives future agents a task-scoped context-loading system.

### New authoritative/context documents

- `AGENTS.md` — agent-agnostic entrypoint;
- `docs/CONTEXT_ENGINEERING_INDEX.md` — authority order and task-specific context routing;
- `docs/SOURCE_OF_TRUTH_V07.md` — reconciled current product/domain/UX contract;
- `docs/ARCHITECTURE.md` — actual module/state architecture and invariants;
- `docs/IOS_PWA_RUNTIME.md` — iPhone/WebKit/PWA/storage/offline/audio/wake-lock research converted to acceptance rules;
- `docs/TESTING_AND_RELIABILITY.md` — test layers, WebKit/offline gates and failure corpus;
- `docs/SECURITY_AND_PRIVACY.md` — local-data threat model, import/network/CSP/privacy boundaries;
- `docs/DEFINITION_OF_DONE.md` — explicit feature/screen/session/PWA/content/asset/release gates;
- `docs/PIXEL_BLOOM_FRONTEND_CONTEXT.md` — creative-to-frontend integration and animation-format strategy;
- `docs/RESEARCH_SOURCES.md` — trusted primary-source index;
- `docs/rnd/foss-fitness/PRODUCT_BENCHMARK_2026-09.md` — current leader capability benchmark.

### Updated routing/governance docs

- `CLAUDE.md` now points to v0.7/context routing and no longer tells Claude the product is single-user/no-builder;
- `README.md` now describes the actual functional app rather than saying no UI screens exist;
- `docs/AI_COLLABORATION_PROTOCOL.md` now uses task-scoped context loading and clarifies creative asset ownership;
- `support/RND_BACKLOG.md` reprioritized around the remaining concrete gaps.

### Current-source research captured

Primary references were reviewed for:
- WebKit/Safari storage quotas, eviction and persistent-storage behavior;
- iOS/iPadOS Home Screen web apps;
- PWA standalone/display/icon behavior;
- safe-area CSS environment variables;
- Screen Wake Lock lifecycle/failure semantics;
- browser audio/autoplay user-gesture restrictions;
- Playwright WebKit/mobile projects/emulation;
- WCAG 2.2 target sizing, moving-content controls and flash thresholds;
- modern web image/animation format tradeoffs;
- CSP/XSS defense-in-depth;
- U.S. public-health physical-activity framing;
- current FOSS fitness product patterns including Liftosaur/wger plus existing local research sources.

### Important findings promoted into context

- offline acceptance requires a truly network-disabled reload/execution test, not only an Offline banner;
- iPhone-first requires WebKit/iPhone-like E2E in addition to phone-sized Chromium;
- browser storage is durable but can fail/be evicted, so export and write-failure behavior are core reliability concerns;
- wake lock/audio/motion are progressive enhancement and may fail without breaking workout truth;
- current session startup has a documented atomicity risk (plan write then start-event write);
- current `+15s` rest extension is UI-local and not exact-recovery durable;
- current two-frame movement crossfade is a temporary fallback, not the final Pixel Bloom exercise-animation system;
- runtime Pixel Bloom should prefer SVG/CSS for UI motion and controlled frames/sprites/animated WebP for character/exercise motion, with GIF primarily for preview/small intentional loops;
- local profiles are not authentication and export files should be treated as sensitive data.

### Remaining highest-leverage R&D

See the updated `support/RND_BACKLOG.md`; P0 now focuses on:
1. true offline + WebKit acceptance pack;
2. session durability edge-case corpus;
3. Foundation Strength production review;
4. export/import corruption corpus;
5. first production Pixel Bloom integration pack.