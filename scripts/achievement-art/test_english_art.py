import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image, ImageDraw
from english_art import export_plan, native_cell, number_position


class EnglishArtTests(unittest.TestCase):
    def test_rejects_the_previous_low_resolution_atlases(self):
        for size, columns, rows in [((1254, 1254), 8, 8), ((1024, 1536), 4, 6)]:
            with self.assertRaisesRegex(ValueError, "upscaling is forbidden"):
                native_cell(Image.new("RGBA", size), columns, rows, 0, 0)

    def test_accepts_native_math_resolution_and_larger_without_upscaling(self):
        for size, expected in [(1024, 512), (1254, 627)]:
            cell, rectangle = native_cell(Image.new("RGBA", (size, size)), 2, 2, 0, 0)
            self.assertEqual(cell.size, (expected, expected))
            self.assertEqual(rectangle, (0, 0, expected, expected))

    def test_rejects_opaque_sources(self):
        with self.assertRaisesRegex(ValueError, "transparent alpha"):
            native_cell(Image.new("RGB", (1024, 1024)), 2, 2, 0, 0)

    def test_centers_digits_in_the_actual_plaque(self):
        source = Image.new("RGBA", (512, 512))
        ImageDraw.Draw(source).rectangle((130, 380, 382, 430), fill=(250, 235, 200, 255))
        self.assertAlmostEqual(number_position(source), 116.22, places=2)
        with self.assertRaisesRegex(ValueError, "plaque not found"):
            number_position(Image.new("RGBA", (512, 512)))

    def test_invalid_batch_cannot_partially_overwrite_good_assets(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            good, bad = root / "good.png", root / "bad.png"
            source = Image.new("RGBA", (1024, 1024))
            ImageDraw.Draw(source).rectangle((130, 380, 382, 430), fill=(250, 235, 200, 255))
            source.save(good)
            Image.new("RGBA", (256, 256)).save(bad)
            plan = root / "plan.json"
            plan.write_text(json.dumps({"grid": [2, 2], "groups": [
                {"id": "good", "source": str(good), "cells": [{"id": "good"}]},
                {"id": "bad", "source": str(bad), "cells": [{"id": "bad"}]},
            ]}))
            output = root / "output"
            with self.assertRaisesRegex(ValueError, "upscaling is forbidden"):
                export_plan(plan, output)
            self.assertFalse(output.exists())


if __name__ == "__main__":
    unittest.main()
