# Claude Handoff — Promotion 001: Progression Candidate

## Mission

Implement the first real deterministic progression slice for `workout-app` from the already-promoted support contract.

Do not reinterpret the product model. Do not transplant FitnessTrack's weighted double-progression engine.

## Read in this order

1. `CLAUDE.md`
2. `docs/SOURCE_OF_TRUTH_V06.md` — especially §§5–8 and §14
3. `docs/rnd/foss-fitness/PROMOTION_001_PROGRESSION_CANDIDATE.md`
4. `support/schemas/progression_edge.schema.json`
5. `support/fixtures/progression_candidate_cases.json`
6. `docs/rnd/foss-fitness/sources/fitnesstrack.md`
7. existing `src/domain/adaptation/*`
8. existing `src/domain/session/createSessionPlan.ts` and `src/domain/session/types.ts`

## Required behavior

Implement only this first production-capable rule mechanism:

> clean authored upper-range completion -> `PROGRESSION_CANDIDATE`, only when an explicit approved harder-variant progression edge exists.

A candidate is an offer to the user, not an automatic advancement.

## Hard scope guardrails

Do not add in this pass:

- automatic exercise replacement;
- weight/load prescription fields solely to mimic FitnessTrack;
- automatic load bumps;
- deload logic;
- ±15% weight retargeting;
- adaptive tempo;
- inferred progression edges;
- substitutions/regressions not backed by authored graph data;
- runtime AI;
- UI redesign/navigation work.

## Expected implementation properties

- pure deterministic TypeScript domain logic;
- no React-owned progression decisions;
- explicit rule/edge IDs in machine-readable output;
- candidate destination represented structurally, not parsed from `detail` text;
- no candidate when history is missing/malformed;
- no candidate from a draft/unapproved edge;
- no candidate when exercise/version does not match the edge source;
- duplicate/replayed history cannot inflate clean-completion count;
- current immutable SessionPlan is never silently mutated;
- user confirmation remains a separate persisted action before future difficulty changes.

## Compatibility requirement

Preserve the existing `adaptTemplate(...)` seam and injected-rule testability unless a forcing constraint is documented first.

Backwards-compatible extension of `AdaptationDecision` is acceptable when necessary to carry structured candidate metadata.

## Acceptance corpus

Convert every case in:

`support/fixtures/progression_candidate_cases.json`

into executable Vitest coverage or an equivalent table-driven domain test.

Also preserve existing adaptation tests, updating placeholder assertions only where the real rule intentionally supersedes placeholder behavior.

## Safe production-data behavior

There are currently no approved real production progression edges in this handoff.

Therefore:

- the engine mechanism can be implemented and tested with support fixtures;
- fake fixture IDs must never leak into production content;
- with zero approved production edges loaded, production behavior must produce no progression candidate rather than invent one.

## Verification commands

Run at minimum:

```bash
npm test
npm run build
```

If either fails, fix only failures caused by this promotion or report pre-existing failures separately.

## Completion report

When done, report:

1. files changed;
2. exact rule/data flow implemented;
3. tests added and result;
4. build result;
5. whether any persistence/schema migration was required;
6. any remaining request that should go back into `support/CLAUDE_REQUESTS.md`.
