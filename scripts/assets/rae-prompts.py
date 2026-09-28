#!/usr/bin/env python3
"""Write ChatGPT prompt batches so Rae can demo every library exercise.

Each batch is one paste into the ChatGPT chat that holds the Rae bible:
BATCH_SIZE exercises, one frame strip image each, in order. ChatGPT
numbers a multi-image download -1, -2, ... in that same order, which is
how rae-intake.py matches images back to exercises.

Writes content/rae-prompts/batch-NNN.md (to paste) and batch-NNN.json
(for intake). Exercises Rae already demonstrates (strips.json) are
skipped. Order: gentlest equipment first, beginner before advanced.

Usage:
  rae-prompts.py              # first run: write all batches
  rae-prompts.py --force      # rewrite and renumber every batch
  rae-prompts.py --from N     # keep batches 1..N-1 as they are; re-plan N onward
                              # (e.g. after the library changes)
  rae-prompts.py --refresh    # rewrite the paste text of batches not yet taken in,
                              # keeping their numbers and exercises (e.g. after the
                              # header changes)
"""
import json
import re
import sys
from pathlib import Path

from rae_canon import AVOID, PREAMBLE

ROOT = Path(__file__).resolve().parents[2]
LIBRARY = ROOT / 'src/domain/content/generated/libraryExercises.json'
STRIPS = ROOT / 'assets/pixel-bloom/character/rae/source/exercise/strips.json'
OUT = ROOT / 'content/rae-prompts'
BATCH_SIZE = 8  # the owner's ChatGPT runs have produced 8 images per go reliably

EQUIPMENT_ORDER = ['bodyweight', 'none', 'bands', 'foam roll', 'exercise ball', 'dumbbell',
                   'kettlebells', 'medicine ball', 'cable', 'machine', 'e-z curl bar', 'barbell', 'other']
LEVEL_ORDER = ['beginner', 'intermediate', 'expert']

# Owner, 2026-09-28: "no equipment needed for now for the workouts." Only
# moves labelled bodyweight/none are planned, minus the ones whose steps
# still need a prop (hand-checked: bar, bench, box/step, ball, dumbbell,
# belt/band/towel, partner). A chair, wall or couch counts as home, not
# equipment. Set NO_EQUIPMENT_ONLY = False and re-plan with --from N to
# bring equipment moves back.
NO_EQUIPMENT_ONLY = True
NEEDS_PROP = set(json.loads((ROOT / 'src/domain/content/needsProp.json').read_text()))  # shared with the app's library filter


def no_equipment(e: dict) -> bool:
    eq = [q for q in (e['taxonomy'].get('equipment') or []) if q not in ('bodyweight', 'none')]
    return not eq and e['id'] not in NEEDS_PROP

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

HEADER = PREAMBLE + ' ' + AVOID + """

Keep the same palette and pixel style as the exercise strips you already made. Draw **{n} separate images, one per exercise below, in this exact order**. Each image is one exercise animation strip:
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
        # Swings and circles are listed as stretches upstream but move, so
        # drawing them as a still hold teaches nothing.
        steps = ' '.join(e.get('executionPhases') or []).lower()
        if re.search(r'\bswing', steps):
            return 4, '1) start position, 2) swing forward to the top, 3) back through the middle, 4) swing back to the other end'
        if re.search(r'\b(circles?|arc)\b', steps):
            return 4, 'one full circle in quarters: 1) top, 2) side, 3) bottom, 4) other side'
        return 3, 'a held position: 1) settle in, 2) the hold with a tiny breath in, 3) the hold'
    return 4, '1) start position, 2) halfway, 3) end of the movement (peak), 4) halfway back'


def write_batch(n: int, last: int, batch: list[dict]) -> None:
    md = [f'# Rae batch {n:03d} of {last}\n', 'Paste everything below the line into the Rae chat, then download all images at once.\n', '---\n',
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


def refresh(library: list[dict]) -> None:
    """Rewrite pending batches' text in place: same numbers, same exercises."""
    taken = {s.get('batch') for s in json.loads(STRIPS.read_text())}
    by_id = {e['id']: e for e in library}
    files = sorted(OUT.glob('batch-*.json'))
    last = max(int(f.stem.split('-')[1]) for f in files)
    done = []
    for f in files:
        n = int(f.stem.split('-')[1])
        if f'library-{n:03d}' in taken:
            continue
        items = json.loads(f.read_text())
        missing = [i['exerciseId'] for i in items if i['exerciseId'] not in by_id]
        if missing:
            raise SystemExit(f'batch {n:03d}: {missing} left the library; re-plan with --from {n}')
        write_batch(n, last, [by_id[i['exerciseId']] for i in items])
        done.append(n)
    print(f'refreshed {len(done)} pending batches ({done[0]:03d}-{done[-1]:03d}); batches already taken in were left alone')


def main() -> None:
    library = json.loads(LIBRARY.read_text())
    if '--refresh' in sys.argv:
        refresh(library)
        return
    covered = {i for s in json.loads(STRIPS.read_text()) for i in s.get('exerciseIds', [])}
    start = 1
    if '--from' in sys.argv:
        start = int(sys.argv[sys.argv.index('--from') + 1])
        # Exercises in the kept batches are spoken for, drawn or not.
        for kept in OUT.glob('batch-*.json'):
            if int(kept.stem.split('-')[1]) < start:
                covered |= {i['exerciseId'] for i in json.loads(kept.read_text())}
    todo = [e for e in library if e['id'] not in covered]
    if NO_EQUIPMENT_ONLY:
        todo = [e for e in todo if no_equipment(e)]

    def key(e: dict):
        eq = (e['taxonomy'].get('equipment') or ['none'])[0]
        lvl = e['taxonomy'].get('level') or 'intermediate'
        return (EQUIPMENT_ORDER.index(eq) if eq in EQUIPMENT_ORDER else len(EQUIPMENT_ORDER),
                LEVEL_ORDER.index(lvl) if lvl in LEVEL_ORDER else 1, e['name'])

    todo.sort(key=key)
    OUT.mkdir(parents=True, exist_ok=True)
    existing = list(OUT.glob('batch-*.md'))
    if existing and '--force' not in sys.argv and '--from' not in sys.argv:
        # Batches are numbered once. Rewriting after some are drawn would
        # renumber the rest (the old batch 002 would become 001).
        raise SystemExit(f'{len(existing)} batches already exist; pass --force to rewrite and renumber them.')
    for old in OUT.glob('batch-*.*'):
        if int(old.stem.split('-')[1]) >= start:
            old.unlink()
    batches = [todo[i:i + BATCH_SIZE] for i in range(0, len(todo), BATCH_SIZE)]
    last = start + len(batches) - 1
    for n, batch in enumerate(batches, start):
        write_batch(n, last, batch)
    print(f'{len(todo)} exercises to draw in batches {start:03d}-{last:03d} (up to {BATCH_SIZE} each) -> {OUT.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
