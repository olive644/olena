"""Convert imagegen atlases to individual WebP badges, preserving their alpha.

Usage: python scripts/achievement-art/extract-english-atlases.py GLOBAL_ATLAS PART_ATLAS
Requires Pillow. Original imagegen PNGs stay outside the repository.
"""
import sys
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[2] / "public/achievement-badges/english"


def export(atlas, columns, rows, column, row, name):
    width, height = atlas.size
    cell = atlas.crop((round(column * width / columns), round(row * height / rows),
                       round((column + 1) * width / columns), round((row + 1) * height / rows)))
    if min(cell.size) < 512:
        raise ValueError("Native source is smaller than 512px; use english_art.py without upscaling")
    # Keep the grid geometry and transparent margins, without altering the artwork.
    cell.resize((512, 512), Image.Resampling.LANCZOS).save(root / f"{name}.webp", quality=90)
    cell.resize((128, 128), Image.Resampling.LANCZOS).save(root / "thumb" / f"{name}.webp", quality=85)


global_atlas = Image.open(sys.argv[1]).convert("RGBA")
part_atlas = Image.open(sys.argv[2]).convert("RGBA")
for row, (metric, targets) in enumerate([
    ("rounds", [1, 5, 10, 25, 50, 100]),
    ("correct", [1, 10, 50, 100, 250, 500, 1000, 2500]),
    ("days", [1, 3, 7, 14, 30]),
    ("parts", [1, 2, 4, 6, 8]),
    ("perfect", [1, 5, 10, 25]),
    ("variety", [10, 50, 100, 250, 500, 1000]),
]):
    for index, target in enumerate(targets):
        export(global_atlas, 8, 8, round(index * 7 / (len(targets) - 1)), row, f"english-{metric}-{target}")

for part in range(8):
    atlas, columns, rows, row = ((global_atlas, 8, 8, 6 + part) if part < 2
                                  else (part_atlas, 4, 6, part - 2))
    for column, suffix in enumerate(["correct-20", "correct-100", "variety-25", "variety-50"]):
        export(atlas, columns, rows, column * 2 if part < 2 else column, row, f"english-part-{part}-{suffix}")
