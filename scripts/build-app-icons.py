#!/usr/bin/env python3
"""Build the PWA icons from the commissioned logo.

PDR §4.1 puts the caduceus "A" alone on Deep Space Navy for an app icon —
the full lockup is 3.6:1 and illegible in a square. The crop box below was
checked visually; it starts right of the "R" in AURORA.

Maskable icons must survive a circular mask, so the mark is drawn inside
the middle 60% (the spec's safe zone is the central 80%, and 60% leaves
room for the platform's own rounding).

    python3 scripts/build-app-icons.py
"""
import pathlib
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "public" / "brand" / "hm-aurora-logo.png"
OUT = ROOT / "public" / "app-icons"
NAVY = (6, 11, 34, 255)          # --aurora-navy
CROP = (830, 0, 1000, 276)       # the caduceus "A"

def build(size: int, coverage: float, name: str) -> None:
    mark = Image.open(SRC).convert("RGBA").crop(CROP)
    mark = mark.crop(mark.getbbox())                  # trim transparent edges
    target = int(size * coverage)
    ratio = min(target / mark.width, target / mark.height)
    mark = mark.resize((max(1, round(mark.width * ratio)), max(1, round(mark.height * ratio))), Image.LANCZOS)
    canvas = Image.new("RGBA", (size, size), NAVY)
    canvas.paste(mark, ((size - mark.width) // 2, (size - mark.height) // 2), mark)
    canvas.save(OUT / name)
    print(f"{name}: {size}x{size}, mark {mark.width}x{mark.height}")

OUT.mkdir(parents=True, exist_ok=True)
build(192, 0.78, "icon-192.png")
build(512, 0.78, "icon-512.png")
build(192, 0.60, "maskable-192.png")     # safe zone for a circular mask
build(512, 0.60, "maskable-512.png")
build(180, 0.78, "apple-touch-icon.png") # iOS home screen
