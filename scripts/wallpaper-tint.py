#!/usr/bin/env python3
"""
Prints the `tint` for a wallpaper to paste into lib/wallpaper-data.ts, e.g.
    python3 scripts/wallpaper-tint.py public/wp/mac-sonoma-dark-1280.webp
The tint is the average colour of the top-left and bottom-right halves. It is painted under the real image
(and stored in localStorage next to the choice) so the very first frame already looks like the wallpaper.
Requires Pillow.
"""
import sys
from PIL import Image


def avg(im, box):
    return "#%02x%02x%02x" % im.crop(box).resize((1, 1), Image.BOX).getpixel((0, 0))[:3]


for path in sys.argv[1:]:
    im = Image.open(path).convert("RGB")
    w, h = im.size
    print(f'{path}: tint: ["{avg(im, (0, 0, w // 2, h // 2))}", "{avg(im, (w // 2, h // 2, w, h))}"]')
