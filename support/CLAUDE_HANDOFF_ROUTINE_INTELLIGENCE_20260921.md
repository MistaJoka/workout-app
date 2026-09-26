# Claude Handoff — Routine Intelligence v1

**Delivery:** DEL-20260921-002  
**Status:** READY FOR REVIEW / INTEGRATION  
**Runtime authority:** no — current pack is staging + executable generator tooling

## Entry points

- `content/staging/v2/routine-intelligence/README.md`
- `content/staging/v2/routine-intelligence/routine-config.v1.json`
- `content/staging/v2/routine-intelligence/constraint-presets.v1.json`
- `content/staging/v2/routine-intelligence/exercise-suitability-a.v1.json` through `exercise-suitability-f.v1.json`
- `content/staging/v2/routine-intelligence/workout-templates.v1.json`
- `content/staging/v2/routine-intelligence/program-templates.v1.json`
- `content/staging/v2/routine-intelligence/acceptance-cases.v1.json`
- `scripts/content/generate-routine-intelligence.mjs`
- `scripts/content/validate-routine-intelligence.mjs`

## Required integration sequence

1. Map every staging exercise slug to the app's canonical exercise ID/version. Do not silently assume a slug is canonical.
2. Preserve the current persisted SessionPlan / progression invariants. Routine Intelligence proposes content; it must not mutate active session truth.
3. Consume Pixel Bloom semantic asset IDs from the existing asset catalog; do not hardcode file paths.
4. Keep canonical exercise media/instructions as movement-form authority wherever the Pixel Bloom pack only provides decorative discovery art.
5. Preserve fail-closed behavior: if a requested slot cannot be filled under the active constraints, surface an explicit unavailable result instead of inserting an incompatible exercise.
6. Run `npm run routine:validate` before and after any mapping/integration work.

## Current pack scope

- 30 suitability-tagged starter exercises
- 4 constraint presets
- 8 deterministic workout templates
- 4 four-week program templates
- semantic Pixel Bloom bindings
- deterministic generator CLI
- 4 acceptance scenarios

## Product boundary

The suitability fields are general-fitness planning heuristics, not clinical screening. Do not convert `jointDemand`, `beginnerFriendly`, support tags, or constraint presets into medical eligibility decisions.
