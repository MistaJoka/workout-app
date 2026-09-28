#!/usr/bin/env python3
"""Write ChatGPT prompts to redraw every Rae strip flagged `redraw`.

Reads the `redraw` reasons in strips.json, pulls each move's steps from
wherever it lives (dump-exercises.ts), and writes
content/rae-prompts/redraw-NNN.md (to paste) and .json (for intake), in
batches of 8. Intake with `npm run rae:intake -- redraw-NNN` swaps in the
new art only: name, mapping, group and featured status stay as they are,
and the `redraw` flag is cleared.

Numbering is stable: a paste keeps its number until it's taken in. Re-running
rewrites the text of pending pastes in place (dropping moves no longer
flagged), leaves taken-in pastes alone, and puts newly flagged strips in new
pastes numbered after the last one.

Usage: rae-redraw-prompts.py
"""
import json
import subprocess
from pathlib import Path

from rae_canon import AVOID, PREAMBLE

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'assets/pixel-bloom/character/rae/source/exercise'
OUT = ROOT / 'content/rae-prompts'
BATCH_SIZE = 8

HEADER = PREAMBLE + ' ' + AVOID + """

Redraw these Rae exercise strips. Draw **{n} separate images, one per exercise below, in this exact order**. Each image is one exercise animation strip:
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
# Frame counts that differ from the current strip's, where the plan above needs it.
FRAME_COUNTS = {'split-squat': 4}


def number(path: Path) -> int:
    return int(path.stem.split('-')[1])


def main() -> None:
    all_strips = json.loads((SRC / 'strips.json').read_text())
    flagged = {s['id']: s for s in all_strips if s.get('redraw') and not s.get('retired')}
    # Pending pastes keep their number and the moves still flagged in them.
    plan: dict[int, list[str]] = {}
    for f in sorted(OUT.glob('redraw-*.json'), key=number):
        slugs = [i['slug'] for i in json.loads(f.read_text()) if i['slug'] in flagged]
        if slugs:
            plan[number(f)] = slugs
    placed = {s for slugs in plan.values() for s in slugs}
    fresh = [sid for sid in flagged if sid not in placed]
    nxt = max([number(f) for f in OUT.glob('redraw-*.json')], default=0) + 1
    for i in range(0, len(fresh), BATCH_SIZE):
        plan[nxt] = fresh[i:i + BATCH_SIZE]
        nxt += 1

    order = [sid for n in sorted(plan) for sid in plan[n]]
    ids = [flagged[sid]['exerciseIds'][0] for sid in order]
    raw = subprocess.run([str(ROOT / 'node_modules/.bin/tsx'), str(ROOT / 'scripts/assets/dump-exercises.ts'), *ids],
                         cwd=ROOT, capture_output=True, text=True, check=True).stdout if ids else '[]'
    by_slug = dict(zip(order, json.loads(raw)))

    for n in sorted(plan):
        batch = plan[n]
        md = [f'# Rae redraw {n:03d}\n',
              'Paste everything below the line into the Rae chat, then download all images at once.\n', '---\n',
              HEADER.format(n=len(batch))]
        items = []
        for k, sid in enumerate(batch, 1):
            strip, e = flagged[sid], by_slug[sid]
            frames = FRAME_COUNTS.get(sid, strip['frames'])
            shows = FRAME_PLANS.get(sid, f"{frames} frames, the same key poses as the steps describe")
            steps = ' '.join([e.get('setup') or '', *e.get('executionPhases', [])]).strip()
            md.append(f"**{k}. {e['name']}** (Side view, {frames} frames)\n"
                      f"Why a redraw: {strip['redraw']}\nFrames: {shows.rstrip('.')}.\nSteps: {steps}\n")
            items.append({'n': k, 'exerciseId': e['id'], 'slug': sid, 'name': e['name'],
                          'frames': frames, 'view': 'Side view', 'redraw': True})
        (OUT / f'redraw-{n:03d}.md').write_text('\n'.join(md))
        (OUT / f'redraw-{n:03d}.json').write_text(json.dumps(items, indent=2) + '\n')
    pending = ', '.join(f'redraw-{n:03d}' for n in sorted(plan)) or 'none'
    print(f'{len(flagged)} strips to redraw; pending pastes: {pending}')


if __name__ == '__main__':
    main()
