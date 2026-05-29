#!/usr/bin/env python3
"""Convert web-preview SVG icons to PNG for the tvOS bundle.

cairosvg cannot parse CSS `var(--fill-0, white)` and falls back to BLACK,
which made every sidebar icon invisible on the dark background. We resolve
each `var(--fill-N, <fallback>)` to its fallback color before rendering, so
white icons stay white and the pink swoosh (path-8) stays pink.
"""
import os
import re
import cairosvg

SRC = os.path.join(os.path.dirname(__file__), "..", "..", "web-preview", "public", "images")
DST = os.path.join(os.path.dirname(__file__), "..", "Assets", "Images")

# Render so the LONGEST edge of each asset is this many px (preserving the
# SVG's intrinsic aspect ratio). High enough for crisp Retina tvOS display.
TARGET_LONG_EDGE = 256

VAR_RE = re.compile(r"var\(\s*--[\w-]+\s*,\s*([^)]+)\)")
VIEWBOX_RE = re.compile(r'viewBox="\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*"')


def resolve_vars(svg: str) -> str:
    # Replace every var(--fill-N, <fallback>) with its fallback colour.
    return VAR_RE.sub(lambda m: m.group(1).strip(), svg)


def output_dims(svg: str) -> tuple[int, int]:
    """Compute output px preserving the SVG's intrinsic aspect ratio."""
    m = VIEWBOX_RE.search(svg)
    if not m:
        return TARGET_LONG_EDGE, TARGET_LONG_EDGE
    vw, vh = float(m.group(3)), float(m.group(4))
    if vw <= 0 or vh <= 0:
        return TARGET_LONG_EDGE, TARGET_LONG_EDGE
    if vw >= vh:
        return TARGET_LONG_EDGE, max(1, round(TARGET_LONG_EDGE * vh / vw))
    return max(1, round(TARGET_LONG_EDGE * vw / vh)), TARGET_LONG_EDGE


def main() -> None:
    converted = []
    for fn in sorted(os.listdir(SRC)):
        if not fn.endswith(".svg"):
            continue
        name = fn[:-4]
        with open(os.path.join(SRC, fn), "r", encoding="utf-8") as f:
            svg = f.read()
        svg = resolve_vars(svg)
        w, h = output_dims(svg)
        out = os.path.join(DST, name + ".png")
        cairosvg.svg2png(
            bytestring=svg.encode("utf-8"),
            write_to=out,
            output_width=w,
            output_height=h,
        )
        converted.append(f"{name}({w}x{h})")
    print("Converted:", ", ".join(converted))


if __name__ == "__main__":
    main()
