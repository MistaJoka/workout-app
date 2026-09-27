#!/usr/bin/env python3
"""Rebuild every Rae exercise loop listed in
assets/pixel-bloom/character/rae/source/exercise/strips.json (see
build-rae-frames.py for what each build does)."""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'assets/pixel-bloom/character/rae/source/exercise'
GROUPS = {
    'curated': 'Your workout moves',
    'chair-moves': 'Chair and low-impact',
    'low-impact-15': 'Chair and low-impact',
    'extra': 'More moves',
}

for strip in json.loads((SRC / 'strips.json').read_text()):
    if len(sys.argv) > 1 and strip['id'] not in sys.argv[1:]:
        continue
    subprocess.run([
        sys.executable, str(ROOT / 'scripts/assets/build-rae-frames.py'),
        str(SRC / strip['source']), f"ex-{strip['id']}",
        '--frames', str(strip['frames']), '--anchor', strip['anchor'],
        '--order', strip['order'], '--hold', strip['hold'], '--fps', str(strip['fps']),
        # Library-scale strips publish only the loop and its review stills.
        *(['--stills', ','.join(map(str, strip['stills'])), '--lossy'] if strip.get('lean') else []),
    ], check=True)

# Loop index for the app (Meet Rae) and the service worker's precache.
loops = []
for strip in json.loads((SRC / 'strips.json').read_text()):
    meta = json.loads((ROOT / f"public/rae/ex-{strip['id']}.json").read_text())
    loops.append({
        'id': f"ex-{strip['id']}",
        'name': strip['name'],
        'width': meta['frameWidth'],
        'height': meta['frameHeight'],
        'stills': strip['stills'],
        # Exercises whose photos this loop replaces (owner-approved mapping).
        'exerciseIds': strip.get('exerciseIds', []),
        # Featured loops are precached and listed on Meet Rae; the rest are
        # cached on first view (there are hundreds).
        'featured': strip.get('featured', not strip.get('lean', False)),
        # Meet Rae groups featured moves by where they came from.
        'group': GROUPS.get(strip.get('batch', ''), 'Library'),
    })
text = json.dumps(loops, indent=2) + '\n'
(ROOT / 'public/rae/loops.json').write_text(text)
(ROOT / 'src/presentation/components/raeLoops.generated.json').write_text(text)
print(f'{len(loops)} loops indexed')

# Keep assets/pixel-bloom/db/asset-db.json in step with what ships: one
# record per loop (rae-ex-<id>-loop). An existing record keeps its status
# (the owner may have approved it); new ones start at 'review'.
import re  # noqa: E402

DB = ROOT / 'assets/pixel-bloom/db/asset-db.json'
db = json.loads(DB.read_text())
records = {a['id']: a for a in db['assets']}
for strip in json.loads((SRC / 'strips.json').read_text()):
    meta = json.loads((ROOT / f"public/rae/ex-{strip['id']}.json").read_text())
    aid = f"rae-ex-{strip['id']}-loop"
    notes = ' '.join(filter(None, [
        f"Drawn-frame loop ({strip['frames']} frames) from source/exercise/{strip['source']}; built by scripts/assets/build-rae-strips.py.",
        f"Demonstrates: {', '.join(strip.get('exerciseIds', [])) or 'nothing mapped yet'}.",
        f"Retired: {strip['retired']}" if strip.get('retired') else '',
        f"Redraw: {strip['redraw']}" if strip.get('redraw') else '',
        strip.get('notes', ''),
    ]))
    record = records.get(aid) or {'id': aid, 'characterId': 'rae', 'kind': 'animated-webp', 'status': 'review'}
    record.update({
        'repoPath': f"public/rae/ex-{strip['id']}.webp",
        'perspective': record.get('perspective', 'side-left'),
        'format': 'webp',
        'width': meta['frameWidth'],
        'height': meta['frameHeight'],
        'transparent': True,
        'tags': ['rae', 'exercise', strip['id'], 'drawn-frames', 'v1'],
        'sourceAssetId': 'rae-canonical-reference',
        'notes': notes,
    })
    if aid not in records:
        db['assets'].append(record)
        records[aid] = record
text = json.dumps(db, indent=2, ensure_ascii=False) + '\n'
# The file keeps tag lists on one line; match that so diffs stay small.
text = re.sub(r'"tags": \[\s*((?:"[^"]*",?\s*)*)\]',
              lambda m: '"tags": [' + ', '.join(re.findall(r'"[^"]*"', m.group(1))) + ']', text)
DB.write_text(text)
print(f'asset-db: {sum(1 for a in db["assets"] if a["id"].startswith("rae-ex-") and a["id"].endswith("-loop"))} loop records')
