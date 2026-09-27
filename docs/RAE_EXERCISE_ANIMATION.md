# Rae Exercise Animation (as built)

**Status:** AUTHORITATIVE FOR HOW RAE DEMONSTRATES EXERCISES (2026-09-26)
**Owner decisions:** the owner rejected cutout/rigged animation ("nightmare fuel"). Rae must demo every library exercise. Strips are drawn in manual ChatGPT batches; there is no image API.

## Principle

Every frame Rae shows is a **whole drawing of her made by ChatGPT**. Nothing is bent, warped, rotated or interpolated. The pipeline only keys, aligns, scales and shares a palette. Identity comes from the canonical bible (`assets/pixel-bloom/character/rae/reference/pb-rae-character-bible-v1.png`) through the Rae chat that holds it.

Rejected, and why:

| Approach | Why not |
|---|---|
| Cutout/skinned 2D rig from sheet parts | Tried twice (squat and jumping jack). Flat AI-drawn parts give doll-ball joints, seams and shifting proportions. The owner rejected it. |
| AI video to frames | Identity drifts frame to frame, and the generation contract forbids independently generated frames. |
| 3D model + mocap | Needs an external image-to-3D account and puts 4C hair and likeness at risk. Parked unless drawn frames can't scale. |

## Strip format (what ChatGPT draws)

One image per exercise: one row of 3 to 6 frames, evenly spaced, on flat `#FF00FF`. Same scale, camera and floor line in every frame, and whatever touches the floor stays put. Side view facing screen-left, or front view for lateral moves. Equipment is drawn identically in every frame. Reps use 4 frames (start, halfway, peak, halfway back); holds and stretches use 3 (settle, breath, hold).

## Pipeline

| Step | Tool | Output |
|---|---|---|
| Prompts | `npm run rae:prompts` → `scripts/assets/rae-prompts.py` | `content/rae-prompts/batch-NNN.md` (paste) + `.json` (intake). There are 8 exercises per batch, each with its library steps, ordered by gentlest equipment. |
| Intake | `npm run rae:intake -- NNN [files]` → `scripts/assets/rae-intake.py` | Takes the newest ChatGPT `-1..-N` download group in batch order. It confirms the frame count from the strip's repeat spacing (autocorrelation) and flags mismatches. It copies sources to `source/exercise/library/` (gitignored, SHA-256 in the manifest), updates `strips.json` and writes a QA sheet (`content/rae-prompts/qa/`). |
| Build | `npm run rae:build` → `scripts/assets/build-rae-strips.py` → `build-rae-frames.py` | Per strip: key magenta, place frames (`foot` = align on the planted toe; `grid` = frames keep their drawn slot position, each piece assigned by its centre, enclosed gaps stay transparent), centre on the first frame's body, fit a 264×360 box, share one 64-colour palette. Writes `public/rae/ex-<id>.webp` (loop), `ex-<id>-<n>.png` (stills) and `ex-<id>.json` (timing). |
| Index | same | `public/rae/loops.json` + `src/presentation/components/raeLoops.generated.json` |

`assets/pixel-bloom/character/rae/source/exercise/strips.json` is the single manifest. Per strip it records: source file (+ SHA-256 for library strips), frames, anchor, playback order and holds, the stills shown under reduced motion, `exerciseIds` (which exercises it demonstrates), and `lean` (library scale: lossy loop and only the review stills are published).

## Runtime

- `raeLoopForExercise(id)` and `raeStillFor(id)` (`components/raeLoops.ts`) look up by exercise id. A missing loop means the exercise falls back to its photos.
- `MovementMedia` (player, exercise detail) shows the loop whenever one exists. Under reduced/off motion it shows the key stills side by side, so motion never removes information.
- Player rest previews the next move's loop under the timer.
- `ExerciseThumb` (theme session) uses `raeStillFor` for list thumbnails.

**Format decision:** the runtime uses animated WebP plus still PNGs, not the sprite sheet + JSON that `RAE_PRODUCTION_ASSET_PIPELINE.md` prefers. The player never needs to pause on or pick a frame: reduced motion shows fixed stills, and the loops are short. WebP is smaller and needs no player code. Featured strips still emit a sprite sheet and timing JSON, so a sheet-driven player remains possible.

**Caching:** featured loops (the first 17, including every curated workout move) are precached by the service worker from `loops.json`. Library loops are cache-first in the long-lived media cache on first view, because precaching ~870 × ~130 KB is too much. Bump `CACHE_NAME` in `public/sw.js` when featured loops change.

## Mapping exercises

Only map a strip to an exercise id when the drawing shows that exercise. The curated `fs.*` moves are also mapped to their identical library records (same free-exercise-db source id). Lookalikes need the owner's OK. For example, the dumbbell RDL strip → `lib.Stiff-Legged_Dumbbell_Deadlift` was approved on 2026-09-26.

## Known art issues (redraw candidates)

- `dead-bug` frame 6 is drawn mirrored and is left out of the loop.
- `split-squat` barely changes depth between frames.
- `glute-bridge` and `crunches` face the other way from the other floor moves. That's not an identity problem, and they must not be mirrored because the tattoo would move sides.
