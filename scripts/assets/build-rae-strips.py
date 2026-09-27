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

for strip in json.loads((SRC / 'strips.json').read_text()):
    if len(sys.argv) > 1 and strip['id'] not in sys.argv[1:]:
        continue
    subprocess.run([
        sys.executable, str(ROOT / 'scripts/assets/build-rae-frames.py'),
        str(SRC / strip['source']), f"ex-{strip['id']}",
        '--frames', str(strip['frames']), '--anchor', strip['anchor'],
        '--order', strip['order'], '--hold', strip['hold'], '--fps', str(strip['fps']),
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
    })
text = json.dumps(loops, indent=2) + '\n'
(ROOT / 'public/rae/loops.json').write_text(text)
(ROOT / 'src/presentation/components/raeLoops.generated.json').write_text(text)
print(f'{len(loops)} loops indexed')
