#!/usr/bin/env python3
"""Derive Rae preview assets from the canonical v1 character bible.

Crops the expression headshots and turnaround figures out of the approved
bible, removes the sheet background, and writes transparent PNGs to
public/rae/. The bible is the only input: nothing is redrawn or generated,
so every derived pixel is canonical Rae.

Stops if the bible's SHA-256 differs from the lock (support/RAE_CANONICAL_BINARY_HANDOFF.md).
"""
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as nd

ROOT = Path(__file__).resolve().parents[2]
LOCK = json.loads((ROOT / 'assets/pixel-bloom/db/rae-character-lock.v1.json').read_text())
BIBLE = ROOT / LOCK['canonicalReference']['repoPath']
OUT = ROOT / 'public/rae'

# Crop boxes in bible pixel coordinates (1536x1024).
EXPRESSION_ROW = (578, 708)
EXPRESSIONS = {
    'neutral': 70, 'smile': 172, 'happy': 276, 'cheer': 381, 'focused': 487,
    'determined': 582, 'tired': 687, 'surprised': 778, 'laugh': 878, 'wink': 974,
}
FIGURES = {
    'full-front': (296, 44, 408, 500),
    'full-3q': (404, 44, 524, 500),
}


def cut_out(crop: Image.Image) -> Image.Image:
    """Remove the light sheet background connected to the crop's border."""
    a = np.asarray(crop.convert('RGB')).astype(int)
    lum = a.mean(-1)
    sat = a.max(-1) - a.min(-1)
    background_like = (lum > 196) & (sat < 72)
    labels, _ = nd.label(background_like)
    border = set(labels[0]) | set(labels[-1]) | set(labels[:, 0]) | set(labels[:, -1])
    border.discard(0)
    fg = ~np.isin(labels, list(border))
    # Keep only the largest shape: drops slivers of neighbouring figures.
    parts, n = nd.label(fg)
    if n > 1:
        sizes = nd.sum(fg, parts, range(1, n + 1))
        fg = parts == (int(np.argmax(sizes)) + 1)
    fg = nd.binary_fill_holes(fg)
    ys, xs = np.where(fg)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    rgba = np.dstack([a, fg * 255]).astype(np.uint8)[y0:y1, x0:x1]
    return Image.fromarray(rgba, 'RGBA')


def main() -> None:
    data = BIBLE.read_bytes()
    digest = hashlib.sha256(data).hexdigest()
    if digest != LOCK['canonicalReference']['sha256']:
        raise SystemExit(f'Bible hash mismatch ({digest}); refusing to derive from a non-canonical file.')
    bible = Image.open(BIBLE)
    OUT.mkdir(parents=True, exist_ok=True)
    written = {}
    y0, y1 = EXPRESSION_ROW
    for name, cx in EXPRESSIONS.items():
        img = cut_out(bible.crop((cx - 52, y0, cx + 52, y1)))
        path = OUT / f'expr-{name}.png'
        img.save(path, optimize=True)
        written[path.name] = img.size
    for name, box in FIGURES.items():
        img = cut_out(bible.crop(box))
        path = OUT / f'{name}.png'
        img.save(path, optimize=True)
        written[path.name] = img.size
    for name, (w, h) in written.items():
        print(f'{name:22} {w}x{h}')


if __name__ == '__main__':
    main()
