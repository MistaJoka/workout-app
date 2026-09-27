#!/usr/bin/env python3
"""Write ChatGPT prompts to redraw every Rae strip flagged `redraw`.

Reads the `redraw` reasons in strips.json, pulls each move's steps from
wherever it lives (dump-exercises.ts), and writes
content/rae-prompts/redraw-NNN.md (to paste) and .json (for intake), in
batches of 8. Intake with `npm run rae:intake -- redraw-NNN` swaps in the
new art only: name, mapping, group and featured status stay as they are,
and the `redraw` flag is cleared.

Usage: rae-redraw-prompts.py
"""
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'assets/pixel-bloom/character/rae/source/exercise'
OUT = ROOT / 'content/rae-prompts'
BATCH_SIZE = 8

HEADER = """Redraw these Rae exercise strips. Use the approved Rae v1 character bible **exactly**: same face, black 4C hair (NOT an afro puff), exactly two tan-and-pink bunny ears growing from her hair (NOT a headband), round gold glasses, ONE small lotus tattoo under her anatomical-LEFT collarbone (not on her shoulder or arm; no other tattoos), A necklace, pink top, lavender leggings, white socks, black-and-white sneakers, and the same proportions, palette and pixel style as the character bible and the squat strip. Draw **{n} separate images, one per exercise below, in this exact order**. Each image is one exercise animation strip:
- **Full size:** one row of frames filling a wide image, with Rae as large as the image allows. No small figures.
- Frames evenly spaced left to right on flat #FF00FF magenta. No text, labels, borders, separator lines, floor, mat or shadows.
- Same scale, same camera, same floor line in every frame. Whatever touches the floor (feet, hands, back, chair legs) stays in the exact same spot in every frame.
- True side profile facing screen-left unless the exercise says front view. Keep her head on the same side in every frame (never mirror a frame).
- Equipment (chair, bench) is drawn identically in every frame.
- Correct, clean form that matches the steps. This teaches the movement.

"""

# What the frames should show, per move, where the old strip got it wrong.
FRAME_PLANS = {
    'dead-bug': '1) start: on her back, arms straight up, hips and knees at 90 degrees, 2) one leg straightening while the opposite arm reaches back overhead, 3) that leg straight just above the floor, 4) back to start, 5) the other leg and arm, 6) back to start. Head stays on the same side in every frame.',
    'split-squat': '1) tall split stance, one foot forward, one back, 2) halfway down, 3) bottom: back knee just above the floor, front knee over the ankle, 4) halfway up. Each frame clearly deeper or higher than the one before.',
}


def main() -> None:
    strips = [s for s in json.loads((SRC / 'strips.json').read_text()) if s.get('redraw') and not s.get('retired')]
    ids = [s['exerciseIds'][0] for s in strips]
    raw = subprocess.run([str(ROOT / 'node_modules/.bin/tsx'), str(ROOT / 'scripts/assets/dump-exercises.ts'), *ids],
                         cwd=ROOT, capture_output=True, text=True, check=True).stdout
    exercises = json.loads(raw)
    for old in OUT.glob('redraw-*.*'):
        old.unlink()
    batches = [list(zip(strips, exercises))[i:i + BATCH_SIZE] for i in range(0, len(strips), BATCH_SIZE)]
    for n, batch in enumerate(batches, 1):
        md = [f'# Rae redraw {n:03d} of {len(batches)}\n',
              'Paste everything below the line into the Rae chat, then download all images at once.\n', '---\n',
              HEADER.format(n=len(batch))]
        items = []
        for k, (strip, e) in enumerate(batch, 1):
            frames = strip['frames'] if strip['id'] != 'split-squat' else 4
            plan = FRAME_PLANS.get(strip['id'], f"{frames} frames, the same key poses as the steps describe")
            steps = ' '.join([e.get('setup') or '', *e.get('executionPhases', [])]).strip()
            md.append(f"**{k}. {e['name']}** (Side view, {frames} frames)\n"
                      f"Why a redraw: {strip['redraw']}\nFrames: {plan.rstrip('.')}.\nSteps: {steps}\n")
            items.append({'n': k, 'exerciseId': e['id'], 'slug': strip['id'], 'name': e['name'],
                          'frames': frames, 'view': 'Side view', 'redraw': True})
        (OUT / f'redraw-{n:03d}.md').write_text('\n'.join(md))
        (OUT / f'redraw-{n:03d}.json').write_text(json.dumps(items, indent=2) + '\n')
    print(f'{len(strips)} strips to redraw in {len(batches)} pastes -> content/rae-prompts/redraw-*.md')


if __name__ == '__main__':
    main()
