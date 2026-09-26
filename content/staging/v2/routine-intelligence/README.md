# Routine Intelligence v1

Status: **draft staging / executable R&D pack**

This pack adds deterministic, constraint-aware workout assembly on top of the existing exercise/content and Pixel Bloom asset systems. It does **not** change runtime behavior by itself.

## Goals

- Build workouts from explicit exercise suitability metadata instead of ad hoc selection.
- Support low-impact, higher-support, beginner-friendly paths without encoding body weight as a workout identity.
- Prefer stable movement patterns, adjustable range of motion, low balance demand, and fewer floor transitions when requested.
- Bind generated workouts to Pixel Bloom semantic asset IDs rather than filenames.
- Preserve canonical exercise media as form authority when custom Pixel Bloom instructional art is unavailable.

## Files

- `routine-intelligence.v1.json` — 30 exercise records, 4 presets, 8 workout templates, 4 program templates, dosage defaults, scoring and asset-binding rules.
- `exercise-suitability.schema.json` — schema for exercise suitability records.
- `generator-request.schema.json` — generator input contract.
- `acceptance-cases.v1.json` — deterministic acceptance fixtures.

## Commands

```bash
npm run routine:generate -- --preset supportive-start --location home --minutes 30 --equipment chair,band,wall --template supportive-full-body-a
npm run routine:validate
```

## Promotion boundary

All exercise IDs in this pack are staging slugs until explicitly mapped to the app's canonical exercise IDs/versions. Generated routines are general-fitness planning outputs only; they are not individualized medical, rehabilitation, pain-management, or diagnosis guidance.

## Generator behavior

1. Hard-filter by location, impact, balance demand, equipment and disallowed tags.
2. Score compatible exercises using template preference, support, beginner suitability, variation availability, asset availability and adjustable range of motion.
3. Penalize floor transitions when a preset asks to minimize them.
4. Fill template movement-pattern slots deterministically.
5. Attach dosage, progression/regression candidates and semantic asset bindings.
6. Fail closed when a slot cannot be filled instead of silently inserting an incompatible movement.

## Runtime integration

Claude Code should map staging exercise slugs to canonical exercise IDs first, then consume this pack through an application/domain adapter. Do not let presentation rewards or Pixel Bloom assets modify workout truth, progression eligibility or persisted SessionPlans.