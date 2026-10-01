#!/usr/bin/env python3
"""iOS launch screens (apple-touch-startup-image) for the home-screen app.

Without them, iOS shows a white screen while the app starts. Each image is
the Pixel Bloom background with a blush disc and Rae's happy face, scaled
by a whole number with nearest-neighbour so the pixel art stays crisp. No
text, so nothing depends on fonts.

Writes public/splash/splash-<w>x<h>.png and rewrites the block between the
splash markers in index.html, so the tags always match the files.

Usage: npm run generate:splash
"""
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/splash'
FACE = ROOT / 'public/rae/expr-happy.png'
INDEX = ROOT / 'index.html'
START, END = '<!-- splash:start -->', '<!-- splash:end -->'

BACKGROUND = (0xF8, 0xFA, 0xFF)  # colorBackground, also manifest background_color
BLUSH = (0xFF, 0xD6, 0xE7)  # colorFieldPrimary

# (CSS width, CSS height, device pixel ratio), portrait. Pixel size is
# css * dpr. iOS picks the image whose media query matches the device.
DEVICES = [
    (440, 956, 3),   # iPhone 16 Pro Max
    (402, 874, 3),   # iPhone 16 Pro
    (430, 932, 3),   # iPhone 14 Pro Max, 15 Plus/Pro Max, 16 Plus
    (393, 852, 3),   # iPhone 14 Pro, 15, 15 Pro, 16
    (428, 926, 3),   # iPhone 12/13 Pro Max, 14 Plus
    (390, 844, 3),   # iPhone 12, 13, 14, 12/13 Pro
    (375, 812, 3),   # iPhone X, XS, 11 Pro, 12/13 mini
    (414, 896, 3),   # iPhone XS Max, 11 Pro Max
    (414, 896, 2),   # iPhone XR, 11
    (414, 736, 3),   # iPhone 6s/7/8 Plus
    (375, 667, 2),   # iPhone SE (2nd/3rd), 6s/7/8
    (1024, 1366, 2), # iPad Pro 12.9"
    (834, 1194, 2),  # iPad Pro 11"
    (820, 1180, 2),  # iPad Air (4th+)
    (810, 1080, 2),  # iPad (9th)
    (768, 1024, 2),  # iPad mini/older
]


def render(width: int, height: int, face: Image.Image) -> Image.Image:
    img = Image.new('RGB', (width, height), BACKGROUND)
    short = min(width, height)
    # Face about a third of the short side, whole-number scale only.
    scale = max(1, round(short * 0.34 / face.width))
    sprite = face.resize((face.width * scale, face.height * scale), Image.NEAREST)
    # Avatar disc: the bust sits on the disc's bottom edge and is clipped
    # to the circle, so the shoulders end on the curve, not a flat line.
    r = int(sprite.height * 0.53)
    disc = Image.new('RGBA', (2 * r, 2 * r), BLUSH + (255,))
    disc.alpha_composite(sprite, (r - sprite.width // 2, 2 * r - sprite.height))
    mask = Image.new('L', disc.size, 0)
    ImageDraw.Draw(mask).ellipse((0, 0, 2 * r - 1, 2 * r - 1), fill=255)
    cx, cy = width // 2, int(height * 0.46)
    img.paste(disc, (cx - r, cy - r), mask)
    return img


def link_tags() -> str:
    tags = []
    for w, h, dpr in DEVICES:
        media = (
            f'(device-width: {w}px) and (device-height: {h}px) and '
            f'(-webkit-device-pixel-ratio: {dpr}) and (orientation: portrait)'
        )
        tags.append(f'    <link rel="apple-touch-startup-image" media="{media}" href="/splash/splash-{w * dpr}x{h * dpr}.png" />')
    return '\n'.join(tags)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    face = Image.open(FACE).convert('RGBA')
    written = set()
    for w, h, dpr in DEVICES:
        size = (w * dpr, h * dpr)
        name = f'splash-{size[0]}x{size[1]}.png'
        if name in written:
            continue
        render(*size, face).save(OUT / name, optimize=True)
        written.add(name)
    for stale in OUT.glob('splash-*.png'):
        if stale.name not in written:
            stale.unlink()

    html = INDEX.read_text()
    block = f'{START}\n{link_tags()}\n    {END}'
    if START in html:
        head, rest = html.split(START, 1)
        _, tail = rest.split(END, 1)
        html = head + block + tail
    else:
        html = html.replace('    <title>', f'    {block}\n    <title>', 1)
    INDEX.write_text(html)
    print(f'{len(written)} launch screens -> {OUT.relative_to(ROOT)}; index.html updated')


if __name__ == '__main__':
    main()
