#!/usr/bin/env python3
"""Structural checks for authored Bedrock geometry assets."""
from __future__ import annotations

import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class GeometryModelTests(unittest.TestCase):
    def test_item_extractor_geometry_is_valid_and_bounded(self):
        path = ROOT / "resource_pack/models/blocks/aetherium_item_extractor.geo.json"
        model = json.loads(path.read_text(encoding="utf-8"))
        self.assertEqual(model.get("format_version"), "1.12.0")
        geometries = model.get("minecraft:geometry")
        self.assertIsInstance(geometries, list)
        self.assertEqual(len(geometries), 1)
        geometry = geometries[0]
        description = geometry["description"]
        self.assertEqual(description["identifier"], "geometry.aetherium.item_extractor")
        self.assertEqual(description["texture_width"], 16)
        self.assertEqual(description["texture_height"], 16)
        bones = geometry["bones"]
        self.assertTrue(bones)
        cubes = [cube for bone in bones for cube in bone.get("cubes", [])]
        self.assertGreaterEqual(len(cubes), 6)
        for cube in cubes:
            origin, size = cube["origin"], cube["size"]
            self.assertEqual(len(origin), 3)
            self.assertEqual(len(size), 3)
            self.assertTrue(all(isinstance(v, (int, float)) for v in origin + size))
            self.assertTrue(all(v > 0 for v in size))
            for start, extent in zip(origin, size):
                self.assertGreaterEqual(start, 0)
                self.assertLessEqual(start + extent, 16)


if __name__ == "__main__":
    unittest.main()
