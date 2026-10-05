#!/usr/bin/env python3
"""Turn the owner's pixel reward icons into the app's two pictures each.

The 45 ChatGPT downloads of 2026-10-04 (4:28-5:12 PM) hold 34 icons; 11
were downloaded twice, pixel-identical (checked here, not assumed). For
each icon (id per src/domain/rewards/rewardIcons.ts) this writes:

  public/rewards/<id>-tile.webp  the original rounded square, 256 px
  public/rewards/<id>.webp       a cut-out sticker (rembg isnet-anime), 256 px

Both are resized nearest-neighbour so the pixel art stays crisp. The
originals are kept in assets/pixel-bloom/rewards/source/ (gitignored).

Build-time only (rembg). Setup, once:
  python3 -m venv ~/.venvs/rae-cards && ~/.venvs/rae-cards/bin/pip install "rembg[cpu]" pillow
Usage:
  ~/.venvs/rae-cards/bin/python scripts/assets/reward-icons.py [downloads-dir]
"""
import glob
import os
import shutil
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw
from rembg import new_session, remove

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/rewards'
SRC = ROOT / 'assets/pixel-bloom/rewards/source'
SIZE = 256

# Download order (by modification time) -> icon id.
IDS = {
    0: 'nap-time', 1: 'tacos', 2: 'burger', 3: 'ramen', 4: 'donut', 5: 'dinner-date', 6: 'flowers',
    7: 'love-letter', 8: 'reading-time', 10: 'no-dishes', 11: 'coffee-date', 12: 'movie-night',
    13: 'takeout', 14: 'pizza', 15: 'sundae', 16: 'sushi', 17: 'breakfast-in-bed', 18: 'boba',
    19: 'game-night', 20: 'spa-day', 21: 'burrito-bowl', 22: 'burrito', 23: 'nachos', 24: 'quesadilla',
    25: 'laundry-done', 26: 'no-chores', 27: 'foot-rub', 28: 'sleep-in', 29: 'tv-remote',
    30: 'sunset-drive', 31: 'picnic', 32: 'blanket-fort', 33: 'bubble-bath', 34: 'surprise-gift',
}
# Downloaded twice: index -> its twin.
DUPLICATES = {9: 0, **{35 + k: 25 + k for k in range(10)}}


def square(img: Image.Image, margin: float) -> Image.Image:
    box = img.getbbox() or (0, 0, *img.size)
    w, h = box[2] - box[0], box[3] - box[1]
    side = int(max(w, h) * (1 + 2 * margin))
    out = Image.new(img.mode, (side, side), (0, 0, 0, 0) if img.mode == 'RGBA' else img.getpixel((2, 2)))
    out.paste(img.crop(box), ((side - w) // 2, (side - h) // 2))
    return out.resize((SIZE, SIZE), Image.NEAREST)


def content_box(img: Image.Image) -> Image.Image:
    """The icon without the flat border around it (for the tile)."""
    bg = Image.new(img.mode, img.size, img.getpixel((2, 2)))
    diff = ImageChops.difference(img, bg).convert('L').point(lambda v: 255 if v > 24 else 0)
    return img.crop(diff.getbbox() or (0, 0, *img.size))


def rounded(img: Image.Image) -> Image.Image:
    mask = Image.new('L', img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, img.width - 1, img.height - 1), radius=int(img.width * 0.18), fill=255)
    out = img.convert('RGBA')
    out.putalpha(mask)
    return out


def flood_cutout(img: Image.Image) -> Image.Image:
    """Clear the flat cream square by flooding it from the edges: the
    fallback for icons the cut-out model reads as background (a white tub,
    a whole sunset scene). Enclosed light areas are inside the drawing and
    stay."""
    marked = img.copy()
    w, h = marked.size
    for seed in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1), (w // 2, 0), (w // 2, h - 1), (0, h // 2), (w - 1, h // 2)]:
        if marked.getpixel(seed) != (255, 0, 255):
            ImageDraw.floodfill(marked, seed, (255, 0, 255), thresh=28)
    out = img.convert('RGBA')
    out.putalpha(Image.eval(ImageChops.difference(marked, Image.new('RGB', marked.size, (255, 0, 255))).convert('L'), lambda v: 0 if v == 0 else 255))
    return out


def coverage(img: Image.Image) -> int:
    return sum(1 for v in img.getchannel('A').getdata() if v)


def main() -> None:
    folder = Path(sys.argv[1] if len(sys.argv) > 1 else '~/Downloads').expanduser()
    files = sorted(glob.glob(str(folder / 'ChatGPT Image Oct 4, 2026*')), key=os.path.getmtime)[:45]
    if len(files) != 45:
        sys.exit(f'expected 45 icon downloads, found {len(files)}')
    images = [Image.open(f).convert('RGB') for f in files]
    for dup, twin in DUPLICATES.items():
        if ImageChops.difference(images[dup], images[twin]).getbbox() is not None:
            sys.exit(f'download {dup} is not identical to {twin}: pick by hand')

    OUT.mkdir(parents=True, exist_ok=True)
    SRC.mkdir(parents=True, exist_ok=True)
    session = new_session('isnet-anime')
    for index, icon_id in IDS.items():
        shutil.copy2(files[index], SRC / f'{icon_id}.png')
        img = images[index]

        tile = rounded(square(content_box(img), 0.06))
        tile.save(OUT / f'{icon_id}-tile.webp', 'WEBP', quality=88, method=6)

        cut = remove(img, session=session)
        cut.putalpha(cut.getchannel('A').point(lambda v: 255 if v >= 128 else 0))
        flooded = flood_cutout(img)
        if coverage(cut) < coverage(flooded) * 0.5:
            cut = flooded
            print(f'{icon_id}: cut-out lost the drawing, used the flood-fill')
        square(cut, 0.04).save(OUT / f'{icon_id}.webp', 'WEBP', quality=88, method=6)
        print(f'{icon_id}: sticker + tile')


if __name__ == '__main__':
    main()
