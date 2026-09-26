from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / "assets/pixel-bloom/system"


def write_json(rel: str, obj: object) -> None:
    p = ROOT / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(obj, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    identity = {
        "id": "character.bloom",
        "status": "canonical-creative-reference",
        "identity": {
            "adult": True,
            "race": "Black woman",
            "skinTone": "fair/warm brown",
            "hair": "dark natural curly hair",
            "ears": "long soft droopy bunny ears",
            "body": "friendly athletic adult proportions",
            "defaultOutfit": "pastel fitness outfit"
        },
        "driftForbidden": ["skin tone", "age coding", "hair silhouette", "ear shape", "body proportions"],
        "runtimeMaster": "svg.bloom.master",
        "expressionSheet": "svg.bloom.expressions",
        "poseSheet": "svg.bloom.poses"
    }
    style = {
        "id": "style.pixel-bloom",
        "status": "canonical-creative-reference",
        "description": "Premium cozy fitness game: modern pixel-inspired illustration, pastel handheld-game nostalgia, crisp silhouettes, adult proportions, expressive character motion, clean instructional hierarchy and polished mobile UI.",
        "rules": [
            "game-art styling for emotion; instructional clarity for movement",
            "no baked instructional text in raster artwork",
            "consistent character identity across every asset",
            "clean silhouettes and restrained texture",
            "runtime assets must have semantic IDs",
            "motion must preserve Full/Reduced/Off information parity"
        ],
        "paletteSource": "assets/pixel-bloom/system/tokens/pixel-bloom.tokens.json"
    }
    motion = {
        "id": "motion.pixel-bloom",
        "status": "canonical-creative-reference",
        "modes": {
            "full": "normal authored motion",
            "reduced": "minimal transform/fade or static key pose",
            "off": "static asset; no information may be lost"
        },
        "exerciseRule": "Do not fabricate exercise biomechanics. Pixel Bloom discovery art is decorative; canonical exercise media/written guidance remains form authority unless a movement-specific Pixel Bloom set is reviewed."
    }
    recipes = {
        "version": 1,
        "principle": "humans/AI create -> scripts normalize -> metadata describes -> registry exposes -> application consumes",
        "generators": [
            {"script": "scripts/assets/generate-pixel-bloom-system.py", "purpose": "core platform, master sheets, tokens, schemas and core motion"},
            {"script": "scripts/assets/generate-pixel-bloom-library.py", "purpose": "individual workout/reward/world/exercise-discovery/UI asset library"},
            {"script": "scripts/assets/finalize-pixel-bloom-platform.py", "purpose": "semantic references, animation registry and AI catalog"}
        ],
        "validation": "node scripts/assets/validate-assets.mjs"
    }
    write_json("assets/pixel-bloom/system/reference/character/bloom-identity.v1.json", identity)
    write_json("assets/pixel-bloom/system/reference/style/pixel-bloom-style-guide.v1.json", style)
    write_json("assets/pixel-bloom/system/reference/motion/pixel-bloom-motion-guide.v1.json", motion)
    write_json("assets/pixel-bloom/system/source/generation-recipes.v1.json", recipes)

    anim_path = BASE / "manifests/animation-registry.v1.json"
    anim = json.loads(anim_path.read_text(encoding="utf-8"))
    by_id = {a["id"]: a for a in anim["animations"]}
    extra = [
        ("character.bloom.blink", "assets/pixel-bloom/system/runtime/svg/motion/pb-anim-bloom-blink-v1.svg", "static Bloom pose"),
        ("character.bloom.rest", "assets/pixel-bloom/system/runtime/svg/motion/pb-anim-bloom-rest-v1.svg", "static resting Bloom pose"),
        ("ui.button.pop", "assets/pixel-bloom/system/runtime/svg/motion/pb-anim-ui-button-pop-v1.svg", "static button state"),
        ("ui.progress.pulse", "assets/pixel-bloom/system/runtime/svg/motion/pb-anim-ui-progress-pulse-v1.svg", "static progress state"),
        ("reward.badge.unlock", "assets/pixel-bloom/system/runtime/svg/motion/pb-anim-badge-unlock-v1.svg", "static unlocked badge"),
        ("ui.timer.pulse", "assets/pixel-bloom/system/runtime/svg/motion/pb-anim-timer-pulse-v1.svg", "static timer state")
    ]
    for aid, path, fallback in extra:
        by_id[aid] = {"id": aid, "path": path, "motionModes": {"full": "animated SVG", "reduced": fallback, "off": fallback}}
    anim["animations"] = list(by_id.values())
    anim_path.write_text(json.dumps(anim, indent=2) + "\n", encoding="utf-8")

    idx = json.loads((BASE / "manifests/asset-index.v1.json").read_text(encoding="utf-8"))["assets"]
    groups = {
        "character": sorted(k for k in idx if k.startswith("character.") or k.startswith("svg.bloom")),
        "workouts": sorted(k for k in idx if k.startswith("workout.")),
        "exercises": sorted(k for k in idx if k.startswith("exercise.") or k.startswith("svg.exercise")),
        "ui": sorted(k for k in idx if k.startswith("ui.") or k == "svg.ui.kit"),
        "badges": sorted(k for k in idx if k.startswith("badge.")),
        "collectibles": sorted(k for k in idx if k.startswith("collectible.")),
        "world": sorted(k for k in idx if k.startswith("map.") or k == "svg.world.map"),
        "states": sorted(k for k in idx if k == "svg.states"),
        "motion": sorted(a["id"] for a in anim["animations"])
    }
    write_json("assets/pixel-bloom/system/manifests/semantic-catalog.v1.json", {
        "schemaVersion": 1,
        "theme": "pixel-bloom",
        "purpose": "AI/developer-facing semantic entrypoint; consume IDs instead of filenames",
        "groups": groups,
        "references": {
            "character": "assets/pixel-bloom/system/reference/character/bloom-identity.v1.json",
            "style": "assets/pixel-bloom/system/reference/style/pixel-bloom-style-guide.v1.json",
            "motion": "assets/pixel-bloom/system/reference/motion/pixel-bloom-motion-guide.v1.json"
        }
    })

    coverage_path = BASE / "manifests/coverage.v1.json"
    coverage = json.loads(coverage_path.read_text(encoding="utf-8"))
    coverage["complete"]["semanticCatalog"] = True
    coverage["complete"]["sourceRecipes"] = True
    coverage["complete"]["aiReferenceLayer"] = True
    coverage["libraryCounts"]["registeredAnimations"] = len(anim["animations"])
    coverage_path.write_text(json.dumps(coverage, indent=2) + "\n", encoding="utf-8")

    status_path = BASE / "manifests/production-status.v1.json"
    status = json.loads(status_path.read_text(encoding="utf-8"))
    status["semanticCatalog"] = "complete"
    status["sourceReferenceLayers"] = "complete"
    status["registeredAnimationCount"] = len(anim["animations"])
    status_path.write_text(json.dumps(status, indent=2) + "\n", encoding="utf-8")

    pkg_path = ROOT / "package.json"
    pkg = json.loads(pkg_path.read_text(encoding="utf-8"))
    pkg.setdefault("scripts", {})["assets:finalize"] = "python3 scripts/assets/finalize-pixel-bloom-platform.py"
    pkg_path.write_text(json.dumps(pkg, indent=2) + "\n", encoding="utf-8")
    print(f"Finalized Pixel Bloom platform with {len(anim['animations'])} registered animations")


if __name__ == "__main__":
    main()
