#!/usr/bin/env python3
"""Write ChatGPT prompt batches so Rae can demo every library exercise.

Each batch is one paste into the ChatGPT chat that holds the Rae bible:
BATCH_SIZE exercises, one frame strip image each, in order. ChatGPT
numbers a multi-image download -1, -2, ... in that same order, which is
how rae-intake.py matches images back to exercises.

Writes content/rae-prompts/batch-NNN.md (to paste) and batch-NNN.json
(for intake). Exercises Rae already demonstrates (strips.json) are
skipped. Order: gentlest equipment first, beginner before advanced.

Usage: rae-prompts.py [--force]  # write batches (--force rewrites and renumbers existing ones)
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LIBRARY = ROOT / 'src/domain/content/generated/libraryExercises.json'
STRIPS = ROOT / 'assets/pixel-bloom/character/rae/source/exercise/strips.json'
OUT = ROOT / 'content/rae-prompts'
BATCH_SIZE = 8  # the owner's ChatGPT runs have produced 8 images per go reliably

EQUIPMENT_ORDER = ['bodyweight', 'none', 'bands', 'foam roll', 'exercise ball', 'dumbbell',
                   'kettlebells', 'medicine ball', 'cable', 'machine', 'e-z curl bar', 'barbell', 'other']
LEVEL_ORDER = ['beginner', 'intermediate', 'expert']

PROPS = {
    'dumbbell': 'dumbbells (one if the steps use one arm)',
    'barbell': 'a barbell with round plates',
    'kettlebells': 'a kettlebell',
    'bands': 'a resistance band',
    'cable': 'a simple cable tower with a handle',
    'machine': 'the exercise machine the steps describe, drawn simply',
    'exercise ball': 'a stability ball',
    'medicine ball': 'a medicine ball',
    'foam roll': 'a foam roller',
    'e-z curl bar': 'an EZ curl bar',
    'other': 'whatever equipment the steps describe, drawn simply',
}

FRONT_VIEW = re.compile(r'lateral|side (lunge|bend|raise|to side)|jumping jack|jack|shrug|fly|flye|butterfly|windmill|arm circle', re.I)

HEADER = """Using the approved Rae v1 character bible exactly (same face, black 4C hair, two bunny ears, glasses, lotus tattoo on her anatomical left, A necklace, pink top, lavender leggings, white socks, black-and-white sneakers, same palette and pixel style as the exercise strips you already made), draw **{n} separate images, one per exercise below, in this exact order**. Each image is one exercise animation strip:
- One row of frames, evenly spaced left to right, on flat #FF00FF magenta. No text, labels, borders, floor, mat or shadows.
- Same scale, same camera, same floor line in every frame. Whatever touches the floor (feet, hands, back) stays in the exact same spot in every frame.
- Use the view named for each exercise. "Side view" means true side profile facing screen-left.
- Correct, clean form that matches the steps. This teaches the movement.
- Equipment is drawn identically in every frame.

"""


def slug(exercise_id: str) -> str:
    return re.sub(r'[^a-z0-9]+', '-', exercise_id.removeprefix('lib.').lower()).strip('-')


def plan(e: dict) -> tuple[int, str]:
    """Frame count and what the frames show."""
    t = e['taxonomy']
    if t.get('category') == 'stretching' or t.get('force') == 'static':
        return 3, 'a held position: 1) settle in, 2) the hold with a tiny breath in, 3) the hold'
    return 4, '1) start position, 2) halfway, 3) end of the movement (peak), 4) halfway back'


def main() -> None:
    library = json.loads(LIBRARY.read_text())
    covered = {i for s in json.loads(STRIPS.read_text()) for i in s.get('exerciseIds', [])}
    todo = [e for e in library if e['id'] not in covered]

    def key(e: dict):
        eq = (e['taxonomy'].get('equipment') or ['none'])[0]
        lvl = e['taxonomy'].get('level') or 'intermediate'
        return (EQUIPMENT_ORDER.index(eq) if eq in EQUIPMENT_ORDER else len(EQUIPMENT_ORDER),
                LEVEL_ORDER.index(lvl) if lvl in LEVEL_ORDER else 1, e['name'])

    todo.sort(key=key)
    OUT.mkdir(parents=True, exist_ok=True)
    existing = list(OUT.glob('batch-*.md'))
    if existing and '--force' not in sys.argv:
        # Batches are numbered once. Rewriting after some are drawn would
        # renumber the rest (the old batch 002 would become 001).
        raise SystemExit(f'{len(existing)} batches already exist; pass --force to rewrite and renumber them.')
    for old in OUT.glob('batch-*.*'):
        old.unlink()
    batches = [todo[i:i + BATCH_SIZE] for i in range(0, len(todo), BATCH_SIZE)]
    for n, batch in enumerate(batches, 1):
        md = [f'# Rae batch {n:03d} of {len(batches)}\n', 'Paste everything below the line into the Rae chat, then download all images at once.\n', '---\n',
              HEADER.format(n=len(batch))]
        items = []
        for k, e in enumerate(batch, 1):
            frames, shows = plan(e)
            eq = [q for q in (e['taxonomy'].get('equipment') or []) if q not in ('bodyweight', 'none')]
            props = ', '.join(PROPS.get(q, q) for q in eq) or 'none'
            view = 'Front view' if FRONT_VIEW.search(e['name']) else 'Side view'
            steps = ' '.join([e.get('setup') or '', *e.get('executionPhases', [])]).strip()
            md.append(f"**{k}. {e['name']}** ({view}, {frames} frames; equipment: {props})\n"
                      f"Frames: {shows}.\nSteps: {steps}\n")
            items.append({'n': k, 'exerciseId': e['id'], 'slug': slug(e['id']), 'name': e['name'],
                          'frames': frames, 'view': view})
        (OUT / f'batch-{n:03d}.md').write_text('\n'.join(md))
        (OUT / f'batch-{n:03d}.json').write_text(json.dumps(items, indent=2) + '\n')
    print(f'{len(todo)} exercises to draw in {len(batches)} batches of up to {BATCH_SIZE} -> {OUT.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
