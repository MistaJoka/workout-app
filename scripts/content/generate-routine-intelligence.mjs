import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const DATA_PATH = path.join(ROOT, "content/staging/v2/routine-intelligence/routine-intelligence.v1.json");

export function loadRoutineIntelligence() {
  return JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
}

const balanceRank = { low: 0, medium: 1, high: 2 };

function parseArgs(argv) {
  const out = { equipment: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--preset") { out.preset = next; i += 1; }
    else if (arg === "--location") { out.location = next; i += 1; }
    else if (arg === "--minutes") { out.durationMinutes = Number(next); i += 1; }
    else if (arg === "--equipment") { out.equipment = next ? next.split(",").filter(Boolean) : []; i += 1; }
    else if (arg === "--session-type") { out.sessionType = next; i += 1; }
    else if (arg === "--template") { out.templateId = next; i += 1; }
    else if (arg === "--request-json") {
      Object.assign(out, JSON.parse(fs.readFileSync(next, "utf8")));
      i += 1;
    }
  }
  return out;
}

function chooseTemplate(data, request) {
  if (request.templateId) {
    const exact = data.templates.find((template) => template.id === request.templateId);
    if (!exact) throw new Error(`Unknown template: ${request.templateId}`);
    return exact;
  }

  const candidates = data.templates
    .filter((template) => template.preset === request.preset)
    .filter((template) => template.locations.includes(request.location))
    .filter((template) => !request.sessionType || template.sessionType === request.sessionType)
    .sort((a, b) => Math.abs(a.minutes - request.durationMinutes) - Math.abs(b.minutes - request.durationMinutes));

  if (!candidates.length) throw new Error("No compatible workout template found.");
  return candidates[0];
}

function hasEquipment(exercise, available) {
  return exercise.equipment.every((item) => available.includes(item));
}

function isAllowed(exercise, preset, request) {
  if (!exercise.locationFit.includes(request.location)) return false;
  if (!preset.allowedImpact.includes(exercise.impact)) return false;
  if (balanceRank[exercise.balanceDemand] > balanceRank[preset.maxBalanceDemand]) return false;
  if (!hasEquipment(exercise, request.equipment)) return false;
  if (exercise.tags.some((tag) => preset.disallowedTags.includes(tag))) return false;
  return true;
}

function scoreExercise(exercise, template, preset, data) {
  let score = 0;
  if (template.preferredExercises.includes(exercise.id)) score += data.scoring.preferredExercise;
  if (preset.preferredSupportLevels.includes(exercise.supportLevel)) score += data.scoring.preferredSupport;
  if (exercise.beginnerFriendly) score += data.scoring.beginnerFriendly;
  if (exercise.supportedVariationAvailable) score += data.scoring.supportedVariation;
  if (exercise.assetBindings.thumbnailId || exercise.assetBindings.instructionalAssetId) score += data.scoring.assetAvailable;
  if (exercise.rangeOfMotionAdjustable) score += data.scoring.adjustableROM;
  if (preset.floorTransitionPolicy === "minimize" && exercise.floorTransitionRequired) score += data.scoring.floorPenaltyWhenMinimize;
  return score;
}

function dosageFor(exercise, data) {
  if (["squat", "hinge", "push", "pull", "accessory"].includes(exercise.movementPattern)) {
    return { type: "reps", ...data.dosageDefaults.strength };
  }
  if (exercise.movementPattern === "core") {
    return { type: "reps", ...data.dosageDefaults.core };
  }
  if (exercise.movementPattern === "mobility") {
    return { type: "time", ...data.dosageDefaults.mobility };
  }
  return { type: "cardio", ...data.dosageDefaults.cardio };
}

export function generateRoutine(request, data = loadRoutineIntelligence()) {
  const required = ["preset", "location", "durationMinutes", "equipment"];
  for (const key of required) {
    if (request[key] === undefined) throw new Error(`Missing request field: ${key}`);
  }

  const preset = data.presets[request.preset];
  if (!preset) throw new Error(`Unknown preset: ${request.preset}`);

  const template = chooseTemplate(data, request);
  if (!template.locations.includes(request.location)) {
    throw new Error(`Template ${template.id} does not support location ${request.location}`);
  }

  const pool = data.exercises
    .filter((exercise) => isAllowed(exercise, preset, request))
    .map((exercise) => ({ exercise, score: scoreExercise(exercise, template, preset, data) }));

  const selected = [];
  let floorCount = 0;

  for (const slotPatterns of template.slots) {
    const candidates = pool
      .filter(({ exercise }) => slotPatterns.includes(exercise.movementPattern))
      .filter(({ exercise }) => !selected.some((item) => item.id === exercise.id))
      .filter(({ exercise }) => !exercise.floorTransitionRequired || floorCount < preset.maxFloorExercises)
      .sort((a, b) => b.score - a.score || a.exercise.id.localeCompare(b.exercise.id));

    if (!candidates.length) {
      throw new Error(`Unable to fill slot [${slotPatterns.join("|")}] for template ${template.id}`);
    }

    const chosen = candidates[0].exercise;
    if (chosen.floorTransitionRequired) floorCount += 1;
    selected.push({
      id: chosen.id,
      movementPattern: chosen.movementPattern,
      dosage: dosageFor(chosen, data),
      assetBindings: chosen.assetBindings,
      progressions: chosen.progressions,
      regressions: chosen.regressions
    });
  }

  return {
    generatorVersion: data.schemaVersion,
    status: data.status,
    boundary: data.boundary,
    request,
    template: {
      id: template.id,
      name: template.name,
      minutes: template.minutes,
      assetBindings: template.assetBindings
    },
    exercises: selected,
    floorTransitionCount: floorCount,
    completionAssets: {
      mascotStateId: data.assetBindingRules.completionMascotStateId,
      firstWorkoutBadgeId: data.assetBindingRules.rewardBindings.firstWorkout
    }
  };
}

const invokedAsScript = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (invokedAsScript) {
  const request = parseArgs(process.argv.slice(2));
  const result = generateRoutine(request);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
