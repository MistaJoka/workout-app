# Pixel Bloom Asset Platform v1

This is the canonical asset platform for Pixel Bloom. It separates generated/source art, AI/human reference material, app-ready runtime assets, schemas, tokens, semantic registries, animations, and validation.

## Core rule

Application code consumes semantic IDs. It should not care how an asset was created or where a master file lives.

## Layers

- `source/`: highest-quality masters; never direct runtime dependencies.
- `reference/`: character/style/motion truth for humans and AI agents.
- `runtime/`: app-ready SVG/WebP/PNG/sprite/animation assets.
- `schemas/`: machine-readable contracts.
- `manifests/`: semantic registry, coverage, and fallbacks.
- `tokens/`: canonical Pixel Bloom colors and character identity.

## Character lock

Bloom is an adult Black woman with fair/warm brown skin, dark natural curly hair, long soft droopy bunny ears, friendly athletic adult proportions, and a pastel fitness outfit.

## Validation

Run `npm run assets:generate` then `npm run assets:validate`.
