import fs from "node:fs";
import path from "node:path";
import { generateRoutine, loadRoutineIntelligence } from "./generate-routine-intelligence.mjs";

const ROOT = process.cwd();
const CASES_PATH = path.join(ROOT, "content/staging/v2/routine-intelligence/acceptance-cases.v1.json");
const SEMANTIC_PATH = path.join(ROOT, "assets/pixel-bloom/system/manifests/semantic-catalog.v1.json");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const data = loadRoutineIntelligence();
const fixtures = JSON.parse(fs.readFileSync(CASES_PATH, "utf8"));
const semantic = JSON.parse(fs.readFileSync(SEMANTIC_PATH, "utf8"));

assert(data.exercises.length === 30, `Expected 30 exercises, found ${data.exercises.length}`);
assert(Object.keys(data.presets).length === 4, "Expected 4 presets");
assert(data.templates.length === 8, "Expected 8 workout templates");
assert(data.programs.length === 4, "Expected 4 program templates");

const exerciseIds = new Set(data.exercises.map((exercise) => exercise.id));
assert(exerciseIds.size === data.exercises.length, "Exercise IDs must be unique");
const templateIds = new Set(data.templates.map((template) => template.id));
assert(templateIds.size === data.templates.length, "Template IDs must be unique");

for (const exercise of data.exercises) {
  for (const target of [...exercise.progressions, ...exercise.regressions]) {
    assert(exerciseIds.has(target), `Exercise ${exercise.id} references missing relationship target ${target}`);
  }
}

for (const program of data.programs) {
  for (const week of program.schedule) {
    for (const templateId of week) {
      assert(templateIds.has(templateId), `Program ${program.id} references missing template ${templateId}`);
    }
  }
}

const semanticIds = new Set(Object.values(semantic.groups).flat());
for (const template of data.templates) {
  assert(semanticIds.has(template.assetBindings.coverId), `Missing cover asset ${template.assetBindings.coverId}`);
  assert(semanticIds.has(template.assetBindings.mascotStateId), `Missing mascot asset ${template.assetBindings.mascotStateId}`);
}
for (const badgeId of Object.values(data.assetBindingRules.rewardBindings)) {
  assert(semanticIds.has(badgeId), `Missing reward asset ${badgeId}`);
}
for (const exercise of data.exercises) {
  for (const assetId of [exercise.assetBindings.thumbnailId, exercise.assetBindings.instructionalAssetId].filter(Boolean)) {
    assert(semanticIds.has(assetId), `Missing exercise asset ${assetId} for ${exercise.id}`);
  }
}

const balanceRank = { low: 0, medium: 1, high: 2 };
for (const fixture of fixtures.cases) {
  const result = generateRoutine(fixture.request, data);
  const assertion = fixture.assertions;
  const chosen = result.exercises.map((item) => data.exercises.find((exercise) => exercise.id === item.id));
  const patterns = new Set(chosen.map((exercise) => exercise.movementPattern));

  if (assertion.noDisallowedTags) {
    const preset = data.presets[fixture.request.preset];
    assert(chosen.every((exercise) => exercise.tags.every((tag) => !preset.disallowedTags.includes(tag))), `${fixture.id}: disallowed tag leaked`);
  }
  if (assertion.maxBalanceDemand) {
    assert(chosen.every((exercise) => balanceRank[exercise.balanceDemand] <= balanceRank[assertion.maxBalanceDemand]), `${fixture.id}: balance demand exceeded`);
  }
  if (assertion.maxFloorExercises !== undefined) {
    assert(result.floorTransitionCount <= assertion.maxFloorExercises, `${fixture.id}: floor transition cap exceeded`);
  }
  for (const pattern of assertion.requiredPatterns ?? []) {
    assert(patterns.has(pattern), `${fixture.id}: missing required pattern ${pattern}`);
  }
  for (const exerciseId of assertion.expectedPreferred ?? []) {
    assert(result.exercises.some((item) => item.id === exerciseId), `${fixture.id}: expected preferred exercise ${exerciseId} not selected`);
  }
}

console.log(`Routine Intelligence validation passed: ${data.exercises.length} exercises, ${Object.keys(data.presets).length} presets, ${data.templates.length} templates, ${data.programs.length} programs, ${fixtures.cases.length} acceptance cases.`);
