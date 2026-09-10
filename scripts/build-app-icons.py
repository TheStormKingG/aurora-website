#!/usr/bin/env python3
"""Build the PWA icons from the commissioned caduceus "A" mark.

PDR §4.1 puts the caduceus "A" alone on Deep Space Navy for an app icon —
the full lockup is 3.6:1 and illegible in a square.

Source is `public/brand/aurora-app-mark.png`, a purpose-drawn square
mark. Two things about it need normalising rather than trusting:

  * Its background is (9, 14, 36), not the exact brand navy (6, 11, 34).
    A JPEG round-trip shifted it. Every near-background pixel is snapped
    back to the token value, so the icon can be padded and recentred with
    no visible seam.
  * The mark is not centred in its own canvas — it sits left and low
    (centre 805,1030 against an image centre of 1024,1024). It is
    trimmed to its true bounding box and recentred here.

Maskable icons must survive a circular mask, so those are drawn smaller.
The spec's safe zone is the central 80%; this mark is wide enough at the
wings that 60% coverage pushed its bounding box to 211px against a 205px
safe radius, so maskable coverage is 0.56. Measured, not guessed — the
previous, narrower crop did fit at 0.60.

    python3 scripts/build-app-icons.py
"""
import pathlib

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "public" / "brand" / "aurora-app-mark.png"
OUT = ROOT / "public" / "app-icons"
NAVY = (6, 11, 34, 255)  # --aurora-navy
# How far a pixel may sit from the source background and still count as
# background. Generous enough for JPEG noise, tight enough to leave the
# mark's own dark outlines alone.
BG_TOLERANCE = 48


def load_mark() -> Image.Image:
    """The mark on exact brand navy, trimmed to its own bounding box."""
    im = Image.open(SRC).convert("RGB")
    px = im.load()
    w, h = im.size
    source_bg = px[4, 4]

    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            if (
                abs(r - source_bg[0]) + abs(g - source_bg[1]) + abs(b - source_bg[2])
                <= BG_TOLERANCE
            ):
                px[x, y] = NAVY[:3]

    # Bounding box of everything that is not the (now exact) navy.
    mask = Image.new("L", (w, h), 0)
    mpx = mask.load()
    for y in range(h):
        for x in range(w):
            if px[x, y] != NAVY[:3]:
                mpx[x, y] = 255
    box = mask.getbbox()
    return im.crop(box) if box else im


def build(mark: Image.Image, size: int, coverage: float, name: str) -> None:
    target = int(size * coverage)
    ratio = min(target / mark.width, target / mark.height)
    scaled = mark.resize(
        (max(1, round(mark.width * ratio)), max(1, round(mark.height * ratio))),
        Image.LANCZOS,
    )
    canvas = Image.new("RGB", (size, size), NAVY[:3])
    canvas.paste(scaled, ((size - scaled.width) // 2, (size - scaled.height) // 2))
    canvas.save(OUT / name)
    print(f"{name}: {size}x{size}, mark {scaled.width}x{scaled.height}")


OUT.mkdir(parents=True, exist_ok=True)
mark = load_mark()
print(f"source mark trimmed to {mark.width}x{mark.height}")
build(mark, 192, 0.78, "icon-192.png")
build(mark, 512, 0.78, "icon-512.png")
build(mark, 192, 0.56, "maskable-192.png")  # safe zone for a circular mask
build(mark, 512, 0.56, "maskable-512.png")
build(mark, 180, 0.78, "apple-touch-icon.png")  # iOS home screen
