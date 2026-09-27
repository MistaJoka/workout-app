# Rae demos for every library exercise

Each `batch-NNN.md` has 8 exercises for ChatGPT to draw as Rae frame strips. The batches run gentlest first: bodyweight, then bands, balls, dumbbells, and on to barbells.

## One batch, start to finish

1. Open the ChatGPT chat that has the Rae character bible (the one that drew the exercise strips).
2. Paste everything below the line in `batch-NNN.md`.
3. Download all 8 images at once. ChatGPT names them `...-1.png` to `...-8.png`, in the prompt's order.
4. Run `npm run rae:intake -- NNN`. It finds that newest -1..-8 group in Downloads, builds the loops, attaches each one to its library exercise, and writes a QA sheet to `content/rae-prompts/qa/batch-NNN.png`.
5. Look at the QA sheet. If an image is wrong (the wrong exercise, a drifted face or outfit, frames that don't line up), ask ChatGPT to redraw that one. Then re-run intake with the files in order: `npm run rae:intake -- NNN file1.png ... file8.png`.
6. Rebuild and deploy (`npm run build && systemctl --user restart workout-app.service`). Rae now demos those moves in the Library, exercise detail and workouts.

`npm run rae:prompts` rewrites the batches, skipping exercises Rae already demos.

Source strips are kept in `assets/pixel-bloom/character/rae/source/exercise/library/`, out of git (they're large). Each one's SHA-256 is recorded in `strips.json`.

## Redraws

`redraw-NNN.md` asks ChatGPT to redraw every strip flagged `redraw` in `strips.json` (off-model art, a mirrored frame, not enough movement). Paste, download all, then run `npm run rae:intake -- redraw-NNN`. Only the art is replaced; the move's name, mapping and grouping stay, and its `redraw` flag is cleared. Regenerate the redraw pastes with `python3 scripts/assets/rae-redraw-prompts.py` after new flags are added.
