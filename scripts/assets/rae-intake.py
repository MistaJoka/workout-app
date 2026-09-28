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

A redraw (`redraw-NNN`) keeps the strip's hand-tuned order, hold and stills
when the frame count is unchanged, and writes the new art as the next source
version (-v2, -v3...) so the old art stays on disk.

Intake refuses images whose SHA-256 is already in strips.json (the usual
cause: the new batch wasn't downloaded, so the previous one was picked up)
and warns when the images are older than the prompt paste. --force takes
them in anyway.

Usage:
  rae-intake.py 001                      # newest -1..-N group in Downloads
  rae-intake.py 001 img1.png img2.png    # explicit files, batch order
  rae-intake.py 001 --dry-run            # show what would happen; write nothing
  rae-intake.py 001 --force              # take in images already seen
"""
import hashlib
import json
import re
import shutil
import subprocess
import sys
from datetime import datetime
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


# ChatGPT names downloads 'ChatGPT Image Sep 26, 2026, 10_50_14 PM-1.png'.
DOWNLOAD_NAME = re.compile(r'ChatGPT Image (.+?, \d{4}), (\d{1,2})_(\d\d)_(\d\d) (AM|PM)-(\d+)\.png$')
# Images of one download land within seconds of each other; a batch can
# still straddle a minute boundary, so group by gaps, not by minute.
GROUP_GAP_S = 90


def download_time(m: re.Match) -> datetime:
    return datetime.strptime(f'{m.group(1)} {m.group(2)}:{m.group(3)}:{m.group(4)} {m.group(5)}',
                             '%b %d, %Y %I:%M:%S %p')


def group_downloads(names: list[Path], count: int) -> list[Path]:
    found = []
    for p in names:
        m = DOWNLOAD_NAME.match(p.name)
        if m:
            found.append((download_time(m), int(m.group(6)), p))
    found.sort(key=lambda t: (t[0], t[1]))
    # A new group starts at a time gap or when the -N numbering restarts.
    groups: list[dict[int, Path]] = []
    prev = None
    for t, n, p in found:
        if prev is None or (t - prev[0]).total_seconds() > GROUP_GAP_S or n <= prev[1]:
            groups.append({})
        groups[-1][n] = p
        prev = (t, n)
    complete = [g for g in groups if sorted(g) == list(range(1, count + 1))]
    if not complete:
        raise SystemExit(f'No group of ChatGPT downloads numbered -1..-{count} in {DOWNLOADS}. Pass the files explicitly.')
    return [complete[-1][i] for i in range(1, count + 1)]


def find_downloads(count: int) -> list[Path]:
    return group_downloads(list(DOWNLOADS.glob('ChatGPT Image *-*.png')), count)


def next_source(slug: str, current: str) -> Path:
    """library/<slug>-strip-vN.png, one version past the strip's current source."""
    m = re.search(r'-v(\d+)\.png$', current)
    return LIB_SRC / f'{slug}-strip-v{int(m.group(1)) + 1 if m else 2}.png'


def main() -> None:
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    flags = {a for a in sys.argv[2:] if a.startswith('--')}
    dry, force = '--dry-run' in flags, '--force' in flags
    arg = sys.argv[1]
    # 'redraw-001' takes in a redraw paste (rae-redraw-prompts.py); a bare
    # number is a library batch.
    batch_no = arg if arg.startswith('redraw-') else arg.zfill(3)
    batch_file = f'{batch_no}.json' if arg.startswith('redraw-') else f'batch-{batch_no}.json'
    items = json.loads((PROMPTS / batch_file).read_text())
    files = [Path(p) for p in sys.argv[2:] if not p.startswith('--')] or find_downloads(len(items))
    if len(files) != len(items):
        raise SystemExit(f'batch {batch_no} has {len(items)} exercises but {len(files)} images were given')

    manifest = json.loads((SRC / 'strips.json').read_text())
    by_id = {s['id']: s for s in manifest}
    # Guard against taking in the wrong images, which would silently attach
    # old art to new exercises.
    seen = {s['sha256']: s['id'] for s in manifest if s.get('sha256')}
    hashes = [hashlib.sha256(f.read_bytes()).hexdigest() for f in files]
    dupes = [f"{f.name} (already '{seen[h]}')" for f, h in zip(files, hashes) if h in seen]
    if dupes and not force:
        raise SystemExit('These images are already taken in:\n  ' + '\n  '.join(dupes) +
                         '\nDownload the new batch first, or pass --force if this is on purpose.')
    prompt_md = PROMPTS / batch_file.replace('.json', '.md')
    stale = [f.name for f in files if prompt_md.exists() and f.stat().st_mtime < prompt_md.stat().st_mtime]
    if stale and not force:
        print(f'WARNING: {len(stale)} image(s) are older than {prompt_md.name}; they may be from an earlier paste:')
        for name in stale:
            print('  ', name)

    if not dry:
        LIB_SRC.mkdir(parents=True, exist_ok=True)
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
        old = by_id.get(item['slug'])
        # New art for an existing strip goes to the next version; the old file stays.
        dest = next_source(item['slug'], old['source']) if old else LIB_SRC / f"{item['slug']}-strip-v1.png"
        if not dry:
            shutil.copy2(f, dest)
        peak = 2 if frames >= 4 else (1 if frames == 2 else 0)
        entry = {
            'id': item['slug'],
            'name': item['name'],
            'source': f"library/{dest.name}",
            'sha256': hashlib.sha256(f.read_bytes()).hexdigest(),
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
        if item.get('redraw') and item['slug'] in by_id:
            # New art only: name, mapping, batch/group, featured and lean stay.
            # Hand-tuned timing (order, hold, stills) stays unless the frame count changed.
            keep_timing = by_id[item['slug']].get('frames') == frames
            art = {k: entry[k] for k in ('source', 'sha256', 'downloadedAs', 'frames', 'anchor', 'fps')
                   + (() if keep_timing else ('order', 'hold', 'stills'))}
            by_id[item['slug']].update(art)
            by_id[item['slug']].pop('redraw', None)
            by_id[item['slug']]['redrawnFrom'] = batch_no
        elif item['slug'] in by_id:
            by_id[item['slug']].update(entry)
        else:
            manifest.append(entry)
            by_id[item['slug']] = entry
        built.append(item['slug'])
        print(f"{item['n']}. {item['name']} <- {f.name} -> {entry['source']} ({frames} frames)")

    if dry:
        print(f'dry run: {len(built)} strips; nothing written')
        for w in warnings:
            print('  check:', w)
        return
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
