#!/usr/bin/env python3
"""Build a Rae exercise loop from one ChatGPT frame strip.

Input: a strip of N whole-body Rae drawings on a flat #FF00FF background
(one exercise, same camera, feet in one place). Output in public/rae/:

  <id>.webp           animated loop (full motion)
  <id>-<n>.png        each key frame (reduced/off motion shows these)
  <id>.sheet.png      sprite sheet, frames left to right
  <id>.json           frame size, order, per-frame timing

Every frame is a complete drawing, so nothing is bent or warped. The
pipeline only keys out the background, aligns frames on the planted
foot, scales them to the sprite size and shares one palette across them.

Usage:
  build-rae-frames.py <strip.png> <exercise-id> --order 0,1,2,3,2,1 --hold 0:3,2:2
"""
import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as nd

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/rae'
SPRITE_HEIGHT = 264  # logical px of the tallest frame (bible base scale ~256)


def key_magenta(rgb: np.ndarray) -> np.ndarray:
    r, g, b = (rgb[..., i].astype(int) for i in range(3))
    magenta = (r > 150) & (b > 130) & (g < 125) & (r - g > 80) & (b - g > 60)
    fg = nd.binary_opening(~magenta, iterations=1)
    return fg


def split_frames(fg: np.ndarray, expected: int) -> list[tuple[slice, slice]]:
    labels, n = nd.label(fg)
    sizes = nd.sum(fg, labels, range(1, n + 1))
    big = [i + 1 for i in np.argsort(sizes)[::-1][:expected]]
    boxes = [nd.find_objects((labels == i).astype(int))[0] for i in big]
    boxes.sort(key=lambda s: s[1].start)
    # Pull in small detached bits (hair curls, ear tips) whose box lies
    # within a frame's horizontal span.
    return boxes


def despill(rgba: np.ndarray) -> np.ndarray:
    """Pull magenta fringe out of edge pixels."""
    out = rgba.copy()
    r, g, b = (out[..., i].astype(int) for i in range(3))
    tinted = (out[..., 3] > 0) & (r > g + 60) & (b > g + 60)
    edge = out[..., 3] > 0
    edge &= ~nd.binary_erosion(edge, iterations=2)
    fix = tinted & edge
    out[fix, 3] = 0
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('strip')
    ap.add_argument('exercise_id')
    ap.add_argument('--frames', type=int, default=4)
    ap.add_argument('--order', default='0,1,2,3', help='playback order of key frames')
    ap.add_argument('--hold', default='', help='frame:ticks pairs, e.g. 0:3,2:2')
    ap.add_argument('--fps', type=int, default=8)
    ap.add_argument('--anchor', choices=['foot', 'center'], default='foot')
    args = ap.parse_args()

    rgb = np.asarray(Image.open(args.strip).convert('RGB'))
    fg = key_magenta(rgb)
    labels, _ = nd.label(fg)
    boxes = split_frames(fg, args.frames)

    frames = []
    for box in boxes:
        # Everything in this column band belongs to the frame (detached curls).
        x0, x1 = box[1].start, box[1].stop
        band = fg[:, x0:x1]
        ys, xs = np.where(band)
        y0, y1 = ys.min(), ys.max() + 1
        m = band[y0:y1]
        m = nd.binary_fill_holes(m)
        rgba = np.dstack([rgb[y0:y1, x0:x1], m * 255]).astype(np.uint8)
        frames.append(despill(rgba))

    # Anchor: the planted foot. The bottom 6% of each frame is shoes; its
    # leftmost opaque column (toe, facing left) and the bottom row line up.
    def anchor(f: np.ndarray) -> tuple[int, int]:
        a = f[..., 3] > 0
        h = a.shape[0]
        foot = a[int(h * 0.94):]
        cols = np.where(foot.any(0))[0]
        if args.anchor == 'center':
            return int(a.shape[1] / 2), h
        return int(cols.min()), h

    anchors = [anchor(f) for f in frames]
    max_h = max(f.shape[0] for f in frames)
    left = max(ax for ax, _ in anchors)
    right = max(f.shape[1] - ax for f, (ax, _) in zip(frames, anchors))
    canvas_w, canvas_h = left + right, max_h
    aligned = []
    for f, (ax, _) in zip(frames, anchors):
        c = np.zeros((canvas_h, canvas_w, 4), np.uint8)
        y = canvas_h - f.shape[0]
        x = left - ax
        c[y:y + f.shape[0], x:x + f.shape[1]] = f
        aligned.append(c)

    # Centre the canvas on the first frame's body (its opaque-pixel centroid),
    # not on the union of all frames: reaching arms would otherwise push her
    # standing body off-centre wherever the loop is shown.
    cx = int(round(np.where(aligned[0][..., 3] > 0)[1].mean()))
    half = max(cx, canvas_w - cx)
    pad_left = half - cx
    canvas_w = 2 * half
    aligned = [np.pad(c, ((0, 0), (pad_left, canvas_w - c.shape[1] - pad_left), (0, 0))) for c in aligned]

    scale = SPRITE_HEIGHT / canvas_h
    size = (max(1, round(canvas_w * scale)), SPRITE_HEIGHT)
    small = []
    for c in aligned:
        im = Image.fromarray(c, 'RGBA')
        # Premultiply before resampling so the transparent background does
        # not bleed dark fringes into the edges.
        rgb_s = Image.fromarray((c[..., :3] * (c[..., 3:] / 255)).astype(np.uint8)).resize(size, Image.LANCZOS)
        a_s = im.getchannel('A').resize(size, Image.LANCZOS)
        a = np.asarray(a_s).astype(float)
        col = np.asarray(rgb_s).astype(float) / np.maximum(a[..., None] / 255, 1e-3)
        alpha = (a >= 128) * 255
        small.append(np.dstack([np.clip(col, 0, 255), alpha]).astype(np.uint8))

    # One palette shared by every frame keeps colours from flickering.
    stack = np.concatenate([s[..., :3][s[..., 3] > 0] for s in small])[None]
    pal = Image.fromarray(stack.astype(np.uint8)).quantize(64, method=Image.Quantize.MEDIANCUT)
    final = []
    for s in small:
        q = Image.fromarray(s[..., :3]).quantize(palette=pal, dither=Image.Dither.NONE).convert('RGB')
        final.append(Image.fromarray(np.dstack([np.asarray(q), s[..., 3]]).astype(np.uint8), 'RGBA'))

    OUT.mkdir(parents=True, exist_ok=True)
    eid = args.exercise_id
    for i, f in enumerate(final):
        f.save(OUT / f'{eid}-{i}.png', optimize=True)
    sheet = Image.new('RGBA', (size[0] * len(final), size[1]))
    for i, f in enumerate(final):
        sheet.alpha_composite(f, (i * size[0], 0))
    sheet.save(OUT / f'{eid}.sheet.png', optimize=True)

    order = [int(x) for x in args.order.split(',')]
    holds = {int(k): int(v) for k, v in (p.split(':') for p in args.hold.split(',') if p)}
    tick = round(1000 / args.fps)
    timeline = [(i, tick * holds.get(i, 1)) for i in order]
    seq = [final[i] for i, _ in timeline]
    seq[0].save(OUT / f'{eid}.webp', save_all=True, append_images=seq[1:],
                duration=[d for _, d in timeline], loop=0, lossless=True)
    (OUT / f'{eid}.json').write_text(json.dumps({
        'id': eid,
        'source': Path(args.strip).name,
        'frameWidth': size[0],
        'frameHeight': size[1],
        'frames': len(final),
        'timeline': [{'frame': i, 'ms': d} for i, d in timeline],
    }, indent=2) + '\n')
    print(f'{eid}: {len(final)} frames {size[0]}x{size[1]}, loop {sum(d for _, d in timeline)} ms')


if __name__ == '__main__':
    main()
