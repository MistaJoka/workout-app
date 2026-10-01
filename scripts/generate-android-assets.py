#!/usr/bin/env python3
"""Android launcher icons and launch screens for the Capacitor build.

Built from the PWA's own art so the APK matches the home-screen app:
- icons from public/icons/icon-512.png (legacy square + round, and the
  adaptive foreground over the icon's pink background colour);
- launch screens from the iOS splash art (public/splash), Rae's face on the
  app background, for every drawable size Capacitor ships.

Run after changing either source: npm run generate:android-assets
"""
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
RES = ROOT / 'android/app/src/main/res'
ICON = ROOT / 'public/icons/icon-512.png'
SPLASH_SRC = ROOT / 'public/splash/splash-1179x2556.png'
BACKGROUND = (0xF8, 0xFA, 0xFF)

LEGACY = {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}
FOREGROUND = {d: px * 108 // 48 for d, px in LEGACY.items()}


def icons() -> str:
    icon = Image.open(ICON).convert('RGBA')
    for density, px in LEGACY.items():
        out = RES / f'mipmap-{density}'
        square = icon.resize((px, px), Image.LANCZOS)
        square.save(out / 'ic_launcher.png')
        mask = Image.new('L', (px, px), 0)
        ImageDraw.Draw(mask).ellipse((0, 0, px - 1, px - 1), fill=255)
        round_icon = Image.new('RGBA', (px, px), (0, 0, 0, 0))
        round_icon.paste(square, (0, 0), mask)
        round_icon.save(out / 'ic_launcher_round.png')
        # Adaptive foreground: the icon inside the 72dp visible area of a
        # 108dp canvas; the launcher's mask only ever trims pink corners.
        canvas = FOREGROUND[density]
        inner = canvas * 72 // 108
        fg = Image.new('RGBA', (canvas, canvas), (0, 0, 0, 0))
        fg.paste(icon.resize((inner, inner), Image.LANCZOS), ((canvas - inner) // 2,) * 2)
        fg.save(out / 'ic_launcher_foreground.png')
    r, g, b, _ = icon.getpixel((4, 4))
    return f'#{r:02X}{g:02X}{b:02X}'


def splashes() -> None:
    src = Image.open(SPLASH_SRC).convert('RGB')
    # The art is Rae's face in a circle on the plain background: crop to it.
    art = src.convert('L').point(lambda v: 255 if v < 240 else 0)
    face = src.crop(art.getbbox())
    for path in sorted(RES.glob('drawable*/splash.png')):
        w, h = Image.open(path).size
        side = int(min(w, h) * 0.42)
        scaled = face.resize((side, side * face.height // face.width), Image.NEAREST)
        out = Image.new('RGB', (w, h), BACKGROUND)
        out.paste(scaled, ((w - scaled.width) // 2, (h - scaled.height) // 2 - h // 20))
        out.save(path)


if __name__ == '__main__':
    colour = icons()
    (RES / 'values/ic_launcher_background.xml').write_text(
        '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n'
        f'    <color name="ic_launcher_background">{colour}</color>\n</resources>\n'
    )
    splashes()
    print(f'icons (background {colour}) and launch screens written under {RES.relative_to(ROOT)}')
