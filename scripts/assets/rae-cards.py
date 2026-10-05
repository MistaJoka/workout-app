#!/usr/bin/env python3
"""Take in the owner's Rae exercise cards (src/domain/content/fixtures/raeCards.json).

Each card is a 1086x1448 ChatGPT image: a title, three numbered panels of
Rae (start, move, return) on lavender mats, then cues and target areas.
For each card this:

  1. keeps the original as source/exercise/library/<loop>-card-v1.png,
  2. cuts Rae out of the three panels with a local background-removal
     model (rembg, isnet-anime) into an RGBA strip
     (<loop>-card-strip-v1.png), hard-edged so the builder's alpha mode
     sees real gaps between arm and body,
  3. publishes the whole card, shrunk, as public/rae/cards/<loop>.webp
     (the exercise's "How to" picture),
  4. adds or replaces the loop's entry in strips.json (alpha: true),

then rebuilds those loops with build-rae-strips.py.

rembg is a build-time tool, never part of the app. One-time setup:
  python3 -m venv ~/.venvs/rae-cards && ~/.venvs/rae-cards/bin/pip install "rembg[cpu]" pillow

Usage:
  ~/.venvs/rae-cards/bin/python scripts/assets/rae-cards.py <cards-dir> [slug ...]
<cards-dir> holds <slug>.png for each card in cards.json.
"""
import hashlib
import json
import shutil
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as nd
from rembg import new_session, remove

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'assets/pixel-bloom/character/rae/source/exercise'
LIB = SRC / 'library'
CARDS_OUT = ROOT / 'public/rae/cards'
MANIFEST = ROOT / 'src/domain/content/fixtures/raeCards.json'

CARD_SIZE = (1086, 1448)
# The panel band starts just below the title's badge row (fraction of the
# card height, measured on the 2026-10-04 set; labels it takes in are
# small shapes figures() leaves out) and
# ends just above the cues box, found per card (panels run 70-81% down).
BAND_TOP = 0.16
CARD_WIDTH = 720  # published card width; enough to read the cues on a phone


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def cues_top(image: Image.Image) -> int:
    """Row where the card's lower section starts: the first row with a
    run of the big dark-navy lettering (the TARGET AREA heading, or a
    standing card's step labels under the figures) on the right half."""
    w, h = image.size
    px = image.load()
    for y in range(int(h * 0.66), int(h * 0.92)):
        navy = 0
        for x in range(int(w * 0.55), int(w * 0.97)):
            r, g, b = px[x, y][:3]
            if b > 100 and r < 80 and g < 80 and b - r > 50:
                navy += 1
        if navy >= 60:
            return y
    sys.exit('could not find the cues box')


def stacked_label_rows(image: Image.Image) -> list[int]:
    """Tops of the numbered labels down a stacked card's left edge (one per
    panel), or [] for a card whose panels sit side by side."""
    w, h = image.size
    px = image.load()
    tops, inside = [], False
    for y in range(int(h * 0.15), int(h * 0.75)):
        navy = 0
        for x in range(int(w * 0.02), int(w * 0.08)):
            r, g, b = px[x, y][:3]
            if b > 100 and r < 90 and g < 80 and b - r > 40:
                navy += 1
        if navy >= 8 and not inside:
            tops.append(y)
        inside = navy >= 8
    return tops if len(tops) == 3 else []


def panel_cuts(profile: np.ndarray) -> tuple[list[int], float]:
    """Two cut points splitting `profile` (opaque pixels per column, or per
    row) into three panels: the emptiest spot near the 1/3 and 2/3 marks.
    Also returns how clean the cuts are (0 = empty gaps, 1 = through Rae)."""
    nz = np.nonzero(profile)[0]
    lo, hi = int(nz.min()), int(nz.max()) + 1
    span = hi - lo
    cuts = []
    for mark in (1 / 3, 2 / 3):
        a, b = lo + int(span * (mark - 0.13)), lo + int(span * (mark + 0.13))
        cuts.append(a + int(np.argmin(profile[a:b])))
    return cuts, float(sum(profile[c] for c in cuts)) / (2 * profile.max())


def figures(cut: Image.Image, label_cuts: list[int] | None = None, fixed_cuts: list[float] | None = None) -> Image.Image:
    """Rae three times, laid out left to right, bottoms aligned: the strip
    shape the builder expects. The card's panels sit side by side (standing
    moves) or stacked (floor moves); whichever way has the cleaner gaps is
    the layout. Ears and feet can reach into the next panel, so each panel
    is cut at its emptiest line and keeps only its largest piece, which
    also drops labels, sparkles and stray text the cut-out kept."""
    rgba = np.asarray(cut)
    alpha = rgba[..., 3] > 0
    across_cuts, across = panel_cuts(alpha.sum(0))
    down_cuts, down = panel_cuts(alpha.sum(1))
    side_by_side = across <= down
    cuts = across_cuts if side_by_side else down_cuts
    if fixed_cuts:
        # A card where one pose truly crosses into the next panel (a raised
        # foot) names its own cut points, as fractions across the band.
        side_by_side = True
        cuts = [int(alpha.shape[1] * f) for f in fixed_cuts]
    elif label_cuts and not side_by_side and down > 0.05:
        # Stacked card whose heads reach up into the panel above, so even the
        # emptiest line runs through a body: cut just above the card's own
        # numbered labels instead.
        cuts = label_cuts
    edges = [0, *cuts, alpha.shape[1] if side_by_side else alpha.shape[0]]

    parts = []
    for k in range(3):
        window = (slice(None), slice(edges[k], edges[k + 1])) if side_by_side else (slice(edges[k], edges[k + 1]), slice(None))
        mask = alpha[window]
        labels, n = nd.label(mask)
        if n == 0:
            raise ValueError(f'panel {k + 1} is empty')
        biggest = 1 + int(np.argmax(nd.sum(mask, labels, range(1, n + 1))))
        keep = labels == biggest
        ys, xs = np.nonzero(keep)
        box = (slice(ys.min(), ys.max() + 1), slice(xs.min(), xs.max() + 1))
        part = rgba[window][box].copy()
        part[..., 3] = np.where(keep[box], part[..., 3], 0)
        parts.append(Image.fromarray(part))
    gap = 40
    out = Image.new('RGBA', (sum(p.width for p in parts) + gap * 4, max(p.height for p in parts) + 2 * gap))
    x = gap
    for part in parts:
        out.paste(part, (x, out.height - gap - part.height), part)
        x += part.width + gap
    return out


def main() -> None:
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    cards_dir = Path(sys.argv[1]).expanduser()
    only = set(sys.argv[2:])
    cards = [c for c in json.loads(MANIFEST.read_text())['cards'] if not only or c['slug'] in only]
    session = new_session('isnet-anime')
    LIB.mkdir(parents=True, exist_ok=True)
    CARDS_OUT.mkdir(parents=True, exist_ok=True)

    strips_path = SRC / 'strips.json'
    strips = json.loads(strips_path.read_text())
    by_id = {s['id']: i for i, s in enumerate(strips)}

    for card in cards:
        src = cards_dir / f"{card['slug']}.png"
        image = Image.open(src).convert('RGB')
        if image.size != CARD_SIZE:
            sys.exit(f'{src}: expected a {CARD_SIZE} card, got {image.size}')
        loop = card['loopId']

        original = LIB / f'{loop}-card-v1.png'
        shutil.copy2(src, original)

        w, h = image.size
        # A card whose first figure's ears reach higher sets its own start.
        top = int(h * card.get('bandTop', BAND_TOP))
        band = image.crop((0, top, w, cues_top(image) - 25))
        labels = stacked_label_rows(image)
        label_cuts = [y - int(h * 0.035) - top for y in labels[1:]] if labels else None
        cut = remove(band, session=session)
        cut.putalpha(cut.getchannel('A').point(lambda v: 255 if v >= 128 else 0))
        try:
            cut = figures(cut, label_cuts, card.get('cuts'))
        except ValueError as error:
            sys.exit(f"{card['slug']}: {error}")
        strip_path = LIB / f'{loop}-card-strip-v1.png'
        cut.save(strip_path)

        published = image.resize((CARD_WIDTH, round(h * CARD_WIDTH / w)), Image.LANCZOS)
        published.save(CARDS_OUT / f'{loop}.webp', 'WEBP', quality=80, method=6)

        entry = {
            'id': loop,
            'name': card['name'],
            'source': f'library/{strip_path.name}',
            'sha256': sha256(strip_path),
            'downloadedAs': f"owner card {card['slug']}.png (sha256 {sha256(original)[:12]})",
            'batch': 'cards-2026-10-04',
            'frames': 3,
            'anchor': 'foot',
            # A card can play a subset of its frames (cards.json), e.g. when
            # one panel's drawing can't be cut out whole.
            'order': card.get('order', '0,1,2'),
            'hold': card.get('hold', '0:3,1:3,2:2'),
            'fps': 6,
            'stills': card.get('stills', [0, 1]),
            'exerciseIds': card['exerciseIds'],
            'alpha': True,
            'card': f'rae/cards/{loop}.webp',
        }
        if loop in by_id:
            old = strips[by_id[loop]]
            # A replaced loop keeps where it was shown (featured/lean).
            for key in ('featured', 'lean'):
                if key in old:
                    entry[key] = old[key]
            entry['replaces'] = old['source']
            strips[by_id[loop]] = entry
        else:
            entry['lean'] = True
            by_id[loop] = len(strips)
            strips.append(entry)
        print(f'{loop}: strip + card ready')

    strips_path.write_text(json.dumps(strips, indent=2) + '\n')
    subprocess.run(['python3', str(ROOT / 'scripts/assets/build-rae-strips.py'), *[c['loopId'] for c in cards]], check=True)


if __name__ == '__main__':
    main()
