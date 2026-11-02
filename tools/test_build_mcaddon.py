#!/usr/bin/env python3
"""Unit tests for deterministic AETHERIUM .mcaddon packaging."""
from __future__ import annotations

import importlib.util
import json
import os
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
import zipfile
from io import BytesIO

MODULE_PATH = Path(__file__).with_name("build_mcaddon.py")
SPEC = importlib.util.spec_from_file_location("build_mcaddon", MODULE_PATH)
builder = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(builder)


class BuildMcaddonTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.bp = self.root / "behavior_pack"
        self.rp = self.root / "resource_pack"
        self.dist = self.root / "dist"
        for pack, name, header_uuid, module_uuid in (
            (self.bp, "AETHERIUM Core", "8b61bba4-4c20-4d51-9f5e-8bafc76e0a11",
             "dd9a2a81-7e6a-4baf-a2f8-4c2c8ef05c22"),
            (self.rp, "AETHERIUM Resources", "e78d3a9c-4c1e-4c9f-9b53-11a0c4c2d801",
             "ac31f70b-9e51-43e8-9a42-2c4c8a9d7202"),
        ):
            pack.mkdir()
            (pack / "manifest.json").write_text(json.dumps({
                "header": {"name": name, "uuid": header_uuid, "version": [0, 3, 3]},
                "modules": [{"type": "resources" if pack == self.rp else "data",
                             "uuid": module_uuid, "version": [0, 3, 3]}],
            }), encoding="utf-8")
            (pack / "sample.txt").write_text(name, encoding="utf-8")
        builder.ROOT = self.root
        builder.DIST = self.dist

    def tearDown(self):
        self.temp.cleanup()

    def test_pack_archive_is_reproducible_and_sorted(self):
        first = builder.make_mcpack(self.bp)
        sample = self.bp / "sample.txt"
        os.utime(sample, (1_700_000_000, 1_700_000_000))
        second = builder.make_mcpack(self.bp)
        self.assertEqual(first, second)
        with zipfile.ZipFile(BytesIO(first)) as archive:
            self.assertEqual(archive.namelist(), ["manifest.json", "sample.txt"])
            self.assertIsNone(archive.testzip())

    def test_build_creates_valid_nested_mcaddon_deterministically(self):
        with patch.object(builder.subprocess, "run",
                          return_value=SimpleNamespace(returncode=0)):
            self.assertEqual(builder.main(), 0)
            output = self.dist / "AETHERIUM-0.3.3.mcaddon"
            first = output.read_bytes()
            os.utime(self.bp / "sample.txt", (1_700_000_000, 1_700_000_000))
            self.assertEqual(builder.main(), 0)
            self.assertEqual(first, output.read_bytes())

        with zipfile.ZipFile(output) as addon:
            self.assertEqual(
                set(addon.namelist()),
                {"AETHERIUM-Behavior.mcpack", "AETHERIUM-Resources.mcpack"},
            )
            self.assertIsNone(addon.testzip())
            for name in addon.namelist():
                with zipfile.ZipFile(BytesIO(addon.read(name))) as pack:
                    self.assertIn("manifest.json", pack.namelist())
                    self.assertIsNone(pack.testzip())

    def test_build_rejects_mismatched_pack_versions(self):
        manifest = json.loads((self.rp / "manifest.json").read_text(encoding="utf-8"))
        manifest["header"]["version"] = [0, 3, 4]
        (self.rp / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
        with patch.object(builder.subprocess, "run",
                          return_value=SimpleNamespace(returncode=0)):
            self.assertEqual(builder.main(), 1)
        self.assertFalse(self.dist.exists())


if __name__ == "__main__":
    unittest.main()
