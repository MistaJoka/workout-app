#!/usr/bin/env python3
"""Take in one ChatGPT batch of Rae strips (see rae-prompts.py).

Finds the batch's images in ~/Downloads: the newest group of ChatGPT
downloads numbered -1..-N, matched to the batch in that order. You can
also pass the files explicitly, in batch order. For each image it:

- detects the frame count from gaps between the figures and warns when it
  differs from what the prompt asked for;
- copies the strip to source/exercise/library/ (on disk, out of git; its
  SHA-256 goes in strips.json so the art stays traceable);
- adds or updates its strips.json entry, mapped to the library exercise;
- rebuilds those loops and writes a QA sheet to content/rae-prompts/qa/.

Usage:
  rae-intake.py 001                      # newest -1..-N group in Downloads
  rae-intake.py 001 img1.png img2.png    # explicit files, batch order
"""
import hashlib
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as nd

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'assets/pixel-bloom/character/rae/source/exercise'
LIB_SRC = SRC / 'library'
PROMPTS = ROOT / 'content/rae-prompts'
DOWNLOADS = Path.home() / 'Downloads'

def key_fg(path: Path) -> np.ndarray:
    rgb = np.asarray(Image.open(path).convert('RGB')).astype(int)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    # ChatGPT's background measures g<=8, r,b>=244. Rae's pink top is also
    # red+blue-heavy (median g~87), so a loose key punched holes in it; keep
    # the key tight and let despill() clear the blended edge fringe.
    magenta = (r > 200) & (b > 200) & (g < 60) & (np.abs(r - b) < 45)
    return nd.binary_opening(~magenta, iterations=1)


def frame_ratio(path: Path) -> float:
    """How many times the figure repeats across the strip.

    Frames are evenly spaced, so the column-mass profile repeats with the
    frame spacing; its autocorrelation peak gives that spacing. Content
    width / spacing lands within one frame of the true count (the last
    figure adds a partial period), which is enough to confirm or flag the
    count the prompt asked for. Tested on the first 17 strips: all within 1.
    """
    fg = key_fg(path)
    prof = fg.sum(0).astype(float)
    xs = np.where(prof > 0)[0]
    prof = prof[xs.min():xs.max() + 1]
    w = len(prof)
    p = prof - prof.mean()
    ac = np.correlate(p, p, 'full')[w - 1:]
    lags = np.arange(int(w / 9.5), int(w / 1.6))
    return w / lags[np.argmax(ac[lags])]


def find_downloads(count: int) -> list[Path]:
    groups: dict[str, dict[int, Path]] = {}
    for p in DOWNLOADS.glob('ChatGPT Image *-*.png'):
        m = re.match(r'(ChatGPT Image .+? \d\d_\d\d)_\d\d (AM|PM)-(\d+)\.png$', p.name)
        if m:
            groups.setdefault(m.group(1) + m.group(2), {})[int(m.group(3))] = p
    complete = [g for g in groups.values() if sorted(g) == list(range(1, count + 1))]
    if not complete:
        raise SystemExit(f'No group of ChatGPT downloads numbered -1..-{count} in {DOWNLOADS}. Pass the files explicitly.')
    newest = max(complete, key=lambda g: max(p.stat().st_mtime for p in g.values()))
    return [newest[i] for i in range(1, count + 1)]


def main() -> None:
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    batch_no = sys.argv[1].zfill(3)
    items = json.loads((PROMPTS / f'batch-{batch_no}.json').read_text())
    files = [Path(p) for p in sys.argv[2:]] or find_downloads(len(items))
    if len(files) != len(items):
        raise SystemExit(f'batch {batch_no} has {len(items)} exercises but {len(files)} images were given')

    LIB_SRC.mkdir(parents=True, exist_ok=True)
    manifest = json.loads((SRC / 'strips.json').read_text())
    by_id = {s['id']: s for s in manifest}
    built, warnings = [], []
    for item, f in zip(items, files):
        ratio = frame_ratio(f)
        frames = item['frames']
        # A strip whose alternate frames look alike repeats at twice the frame
        # spacing, so a ratio near half the asked count also confirms it.
        if abs(ratio - frames) >= 1 and abs(2 * ratio - frames) >= 1.2:
            frames = max(2, min(8, round(ratio + 0.35)))
            warnings.append(f"{item['n']}. {item['name']}: asked for {item['frames']} frames, "
                            f"the strip looks like {frames}; using {frames}. Check it on the QA sheet.")
        dest = LIB_SRC / f"{item['slug']}-strip-v1.png"
        shutil.copy2(f, dest)
        peak = 2 if frames >= 4 else (1 if frames == 2 else 0)
        entry = {
            'id': item['slug'],
            'name': item['name'],
            'source': f"library/{dest.name}",
            'sha256': hashlib.sha256(dest.read_bytes()).hexdigest(),
            'downloadedAs': f.name,
            'batch': f'library-{batch_no}',
            'frames': frames,
            'anchor': 'grid',
            'order': ','.join(map(str, range(frames))),
            'hold': '0:5,1:5,2:5' if frames == 3 else f'0:3,{peak}:3',
            'fps': 8,
            'stills': [0, peak] if peak else [0],
            'exerciseIds': [item['exerciseId']],
            'lean': True,
        }
        if item['slug'] in by_id:
            by_id[item['slug']].update(entry)
        else:
            manifest.append(entry)
            by_id[item['slug']] = entry
        built.append(item['slug'])

    (SRC / 'strips.json').write_text(json.dumps(manifest, indent=2) + '\n')
    subprocess.run([sys.executable, str(ROOT / 'scripts/assets/build-rae-strips.py'), *built], check=True)

    # QA sheet: every frame of every loop in this batch, straight from the source strips.
    rows = []
    for item in items:
        loop = ROOT / f"public/rae/ex-{item['slug']}.webp"
        im = Image.open(loop)
        cells = []
        for k in range(im.n_frames):
            im.seek(k)
            cells.append(im.convert('RGBA').copy())
        # Drop repeated frames (holds) so each key pose shows once.
        uniq = [c for i, c in enumerate(cells) if i == 0 or c.tobytes() != cells[i - 1].tobytes()]
        w = sum(c.width for c in uniq) + 4 * len(uniq)
        h = max(c.height for c in uniq) + 18
        row = Image.new('RGBA', (w, h), (40, 34, 60, 255))
        x = 0
        for c in uniq:
            row.alpha_composite(c, (x, 18))
            x += c.width + 4
        ImageDraw.Draw(row).text((4, 3), f"{item['n']}. {item['name']}", fill=(255, 235, 120))
        rows.append(row)
    qa = PROMPTS / 'qa'
    qa.mkdir(exist_ok=True)
    sheet = Image.new('RGBA', (max(r.width for r in rows), sum(r.height for r in rows)), (20, 20, 30, 255))
    y = 0
    for r in rows:
        sheet.alpha_composite(r, (0, y))
        y += r.height
    out = qa / f'batch-{batch_no}.png'
    sheet.save(out)
    print(f'batch {batch_no}: {len(built)} loops built; QA sheet {out.relative_to(ROOT)}')
    for w in warnings:
        print('  check:', w)


if __name__ == '__main__':
    main()
