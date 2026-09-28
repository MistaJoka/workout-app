# Claude Handoff — Content + Creative Production v1

**Delivery:** DEL-20260920-001  
**Status:** READY FOR REVIEW / INTEGRATION  
**Runtime implementation changed:** no  
**Source branch:** `master`

## Goal

Use the new staging pack as inspectable source material. Do not regenerate it from memory.

## Inputs

### Content

- `content/staging/v1/exercise-editorial-a-v1.json`
- `content/staging/v1/exercise-editorial-b-v1.json`
- `content/staging/v1/exercise-relationships-v1.json`
- `content/staging/v1/workouts-programs-v1.json`
- `content/staging/v1/gameplay-copy-v1.json`

The pack contains 77 exercise editorial records, 30 workouts, 6 programs, 30 relationship edges, 20 badges, 25 collectibles, 6 Pixel Bloom map zones, and product-state UI copy.

### Creative

- `assets/pixel-bloom/manifests/creative-production-v1.json`
- `assets/pixel-bloom/ui/badges/pb-badges-starter-v1.svg`

The creative manifest defines 30 workout-cover targets, 25 P0 exercise-media targets, mascot-state filenames, collectible/map path conventions, and fallback rules. The SVG file contains 8 starter badge symbols that can be integrated directly or used as visual primitives.

## Required integration behavior

1. Keep `src/domain/content/types.ts` and schema contracts authoritative.
2. Map staging exercise slugs to canonical imported/canonical IDs deliberately; never by fuzzy-name guessing when ambiguous.
3. Preserve imported source provenance and licenses.
4. Keep new workout/program content `draft` until owner/content review.
5. Do not infer substitutions from progression/variation relationships.
6. Do not introduce automatic progression; confirmation remains explicit.
7. Keep rewards, collectibles and map state presentation-only.
8. Do not make core workouts depend on network, backend, runtime AI, or generated-at-runtime images.
9. Prefer already-pinned canonical exercise media where adequate; new Pixel Bloom exercise art is an authored replacement layer, not permission to discard provenance.

## Suggested integration order

1. Validate exact exercise mappings.
2. Promote a small reviewed workout subset into the existing content model.
3. Wire the starter badge SVG sprite.
4. Wire cover/media filename contracts with current fallback behavior.
5. Add program representation only if it fits the current architecture without distorting `WorkoutTemplate` or immutable `SessionPlan` semantics.
6. Open a structured request in `support/CLAUDE_REQUESTS.md` for any unresolved product/schema decision instead of inventing behavior.

## Acceptance evidence expected from Claude

- mappings are explicit and reviewable;
- build/typecheck/tests pass;
- canonical content is not silently overwritten;
- imported provenance remains inspectable;
- offline workout flow remains functional;
- the theme preserves behavior (Pixel Bloom is the only theme since 2026-09-26);
- missing raster assets degrade through documented fallback paths;
- active `SessionPlan` immutability and explicit progression confirmation remain intact.
