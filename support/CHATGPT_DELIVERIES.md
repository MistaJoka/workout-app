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
