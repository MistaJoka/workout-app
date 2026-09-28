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

One image per exercise: one row of 3 to 7 frames, evenly spaced, on flat `#FF00FF`. Same scale, camera and floor line in every frame, and whatever touches the floor stays put. Side view facing screen-left, or front view for lateral moves. Equipment is drawn identically in every frame. Reps use 4 frames (start, halfway, peak, halfway back); holds and stretches use 3 (settle, breath, hold).

## Pipeline

| Step | Tool | Output |
|---|---|---|
| Prompts | `npm run rae:prompts` → `scripts/assets/rae-prompts.py` | `content/rae-prompts/batch-NNN.md` (paste) + `.json` (intake). There are 8 exercises per batch, each with its library steps, ordered by gentlest equipment. |
| Intake | `npm run rae:intake -- NNN [files] [--dry-run] [--force]` → `scripts/assets/rae-intake.py` | Takes the newest ChatGPT `-1..-N` download group in batch order (grouped by download time, ≤ 90 s apart, so a batch may straddle a minute). It refuses images whose SHA-256 is already in `strips.json` (usually: the new batch wasn't downloaded) and warns when images predate the paste; `--force` overrides. It confirms the frame count from the strip's repeat spacing (autocorrelation) and flags mismatches. It copies sources to `source/exercise/library/` (gitignored, SHA-256 in the manifest), updates `strips.json` and writes a QA sheet (`content/rae-prompts/qa/`). |
| Build | `npm run rae:build` → `scripts/assets/build-rae-strips.py` → `build-rae-frames.py` | Per strip: key magenta, place frames (`foot` = align on the planted toe; `grid` = frames keep their drawn slot position, each piece assigned by its centre, enclosed gaps stay transparent), centre on the first frame's body, fit a 264×360 box, share one 64-colour palette. Writes `public/rae/ex-<id>.webp` (loop), `ex-<id>-<n>.png` (stills) and `ex-<id>.json` (timing). `--index-only` rewrites `loops.json` (with each loop's `?v=` content version) from the built files, without the gitignored sources. |
| Index | same | `public/rae/loops.json` + `src/presentation/components/raeLoops.generated.json` (id, name, size, stills, `exerciseIds`, `featured`, `group`) |
| Asset DB | same | One `rae-ex-<id>-loop` record per loop in `assets/pixel-bloom/db/asset-db.json` (`assets` list). Existing records keep their status; new ones start at `review`. The notes carry the source, mapping, and any retired/redraw reason. |
| Redraw | `npm run rae:redraw-prompts`, then `npm run rae:intake -- redraw-NNN` | Pastes for every strip flagged `redraw`. Numbers are stable: pending pastes are rewritten in place, new flags get new pastes. Intake swaps in the art only, as the next source version (`-v2`…), keeping hand-tuned order/hold/stills when the frame count is unchanged. |
| Refresh text | `npm run rae:prompts -- --refresh` | Rewrites the paste text of batches not yet taken in (same numbers, same exercises), e.g. after the prompt header changes. Every paste opens with the contract's identity preamble (`scripts/assets/rae_canon.py`). |
| Re-plan | `npm run rae:prompts -- --from N` | Keeps batches 1..N-1 as they are (pasted batches keep their numbers) and re-plans N onward, e.g. after the library changed (871 → 304 on 2026-09-27: batches 003–037). On 2026-09-28 the owner said "no equipment needed for now": `NO_EQUIPMENT_ONLY` in `rae-prompts.py` plans only bodyweight moves whose steps need no prop (`NEEDS_PROP` is the hand-checked exclusion list; a chair, wall or couch counts as home), giving batches 002–014 (102 moves). |

`assets/pixel-bloom/character/rae/source/exercise/strips.json` is the single manifest. Per strip it records:

- source file (+ SHA-256 for library strips);
- frames, anchor, playback order and holds;
- the stills shown under reduced motion;
- `exerciseIds` (which exercises it demonstrates);
- `batch` (which drives the Meet Rae group);
- `lean` (library scale: lossy loop and only the review stills are published);
- `featured` (precached and on Meet Rae);
- `retired` (kept resolvable, not listed);
- `redraw` (the reason it should be redrawn).

Keying: the ChatGPT background measures g ≤ 8 and r,b ≥ 244, so the key is tight (r,b > 200, g < 60, |r−b| < 45). A looser key punched holes in Rae's saturated pink top.

## Runtime

- `raeLoopForExercise(id)` and `raeStillFor(id)` (`components/raeLoops.ts`) look up by exercise id. A missing loop means the exercise falls back to its photos.
- `MovementMedia` (player, exercise detail) shows the loop whenever one exists. Under reduced/off motion it shows the key stills side by side, so motion never removes information.
- Player rest previews the next move's loop under the timer.
- `ExerciseThumb` (theme session) uses `raeStillFor` for list thumbnails.

**Format decision:** the runtime uses animated WebP plus still PNGs, not the sprite sheet + JSON that `RAE_PRODUCTION_ASSET_PIPELINE.md` prefers. The player never needs to pause on or pick a frame: reduced motion shows fixed stills, and the loops are short. WebP is smaller and needs no player code. Featured strips still emit a sprite sheet and timing JSON, so a sheet-driven player remains possible.

**Caching:** featured loops (30 as of 2026-09-27, including every curated workout move) are precached by the service worker from `loops.json`. Library loops are cache-first in the long-lived media cache on first view, because precaching the 304-exercise library's loops is too much. Bump `CACHE_NAME` in `public/sw.js` when featured loops change.

## Rae's own moves

Some strips show standard beginner movements that have no free-exercise-db record: the chair sit-to-stand set and the low-impact seated set. They live in `src/domain/content/fixtures/raeMoves.ts` (ids `rae.*`, provenance `draft`, no photos). The catalog resolves them synchronously, and `loadLibrary()` lists them first, so they are searchable, usable in the routine builder and play in workouts. Retired duplicates stay resolvable for routines that already use them. Their step text was drafted from the drawings and awaits review (REQ-20260926-003, REQ-20260927-004).

## Mapping exercises

Only map a strip to an exercise id when the drawing shows that exercise. The curated `fs.*` moves are also mapped to their identical library records (same free-exercise-db source id). Lookalikes need the owner's OK. For example, the dumbbell RDL strip → `lib.Stiff-Legged_Dumbbell_Deadlift` was approved on 2026-09-26.

## Known art issues

The `redraw` field in strips.json is the live list. As of 2026-09-27:

- `dead-bug`: frame 6 is drawn mirrored and is left out of the loop.
- `split-squat`: barely changes depth.
- The chair set: the tattoo is drawn on her shoulder, not under the collarbone.
- The low-impact set: off-model (afro puff, headband ears) and low-res. The owner said to use them for now.
- `glute-bridge` and `crunches` face the other way from the other floor moves. That's not an identity problem, and they must never be mirrored (the tattoo would move sides).

## Meet Rae

Featured loops only: one stage plays the chosen move, and the rest are small tiles grouped as "Your workout moves", "Chair and low-impact" and "More moves" (from `batch`). The hundreds of library loops live in the Library.
