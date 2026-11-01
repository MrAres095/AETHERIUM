#!/usr/bin/env python3
"""Unit tests for the AETHERIUM static pack validator."""
from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

MODULE_PATH = Path(__file__).with_name("validate_pack.py")
SPEC = importlib.util.spec_from_file_location("validate_pack", MODULE_PATH)
validator = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(validator)


class ValidatorTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        validator.ROOT = self.root
        validator.ERRORS.clear()
        validator.WARNINGS.clear()

    def tearDown(self):
        self.temp.cleanup()
        validator.ERRORS.clear()
        validator.WARNINGS.clear()

    def write_json(self, relative: str, data: dict) -> None:
        path = self.root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(data), encoding="utf-8")

    def test_valid_manifest_returns_unique_uuids(self):
        manifest = {
            "format_version": 2,
            "header": {
                "name": "Test Pack",
                "uuid": "8b61bba4-4c20-4d51-9f5e-8bafc76e0a11",
                "version": [0, 2, 0],
                "min_engine_version": [1, 21, 0],
            },
            "modules": [{
                "type": "data",
                "uuid": "dd9a2a81-7e6a-4baf-a2f8-4c2c8ef05c22",
                "version": [0, 2, 0],
            }],
        }
        result = validator.validate_manifest("manifest.json", manifest)
        self.assertEqual(len(result), 2)
        self.assertEqual(validator.ERRORS, [])

    def test_invalid_manifest_version_is_reported(self):
        validator.validate_manifest("manifest.json", {"format_version": 1})
        self.assertTrue(any("format_version" in message for message in validator.ERRORS))

    def test_valid_shaped_recipe_passes(self):
        self.write_json("behavior_pack/recipes/test.json", {
            "format_version": "1.20.10",
            "minecraft:recipe_shaped": {
                "description": {"identifier": "aetherium:test_recipe"},
                "pattern": ["CC", "CC"],
                "key": {"C": {"item": "aetherium:crystal"}},
                "result": {"item": "aetherium:crystal_block", "count": 1},
            },
        })
        validator.validate_recipes({"aetherium:crystal", "aetherium:crystal_block"})
        self.assertEqual(validator.ERRORS, [])

    def test_unknown_recipe_ingredient_is_reported(self):
        self.write_json("behavior_pack/recipes/test.json", {
            "minecraft:recipe_shapeless": {
                "description": {"identifier": "aetherium:test_recipe"},
                "ingredients": [{"item": "aetherium:missing"}],
                "result": {"item": "aetherium:crystal", "count": 1},
            },
        })
        validator.validate_recipes({"aetherium:crystal"})
        self.assertTrue(any("unknown or missing shapeless ingredient" in message
                            for message in validator.ERRORS))

    def test_shaped_recipe_rejects_missing_key_symbol(self):
        self.write_json("behavior_pack/recipes/test.json", {
            "minecraft:recipe_shaped": {
                "description": {"identifier": "aetherium:test_recipe"},
                "pattern": ["CX"],
                "key": {"C": {"item": "aetherium:crystal"}},
                "result": {"item": "aetherium:crystal", "count": 1},
            },
        })
        validator.validate_recipes({"aetherium:crystal"})
        self.assertTrue(any("pattern symbol 'X'" in message for message in validator.ERRORS))


    def test_worldgen_feature_and_rule_link(self):
        self.write_json("behavior_pack/features/aetherium_ore_feature.json", {
            "minecraft:ore_feature": {
                "description": {"identifier": "aetherium:aetherium_ore_feature"},
                "count": 5,
                "replace_rules": [{"places_block": "aetherium:ore", "may_replace": ["minecraft:stone"]}],
            },
        })
        self.write_json("behavior_pack/feature_rules/overworld_aetherium_ore.json", {
            "minecraft:feature_rules": {
                "description": {
                    "identifier": "aetherium:overworld_aetherium_ore",
                    "places_feature": "aetherium:aetherium_ore_feature",
                },
                "conditions": {"minecraft:biome_filter": [{"test": "has_biome_tag", "operator": "==", "value": "overworld"}]},
                "distribution": {
                    "iterations": 4,
                    "x": {"extent": [0, 16]},
                    "y": {"extent": [-32, 24]},
                    "z": {"extent": [0, 16]},
                },
            },
        })
        validator.validate_worldgen({"aetherium:ore"})
        self.assertEqual(validator.ERRORS, [])

    def test_worldgen_rule_rejects_missing_feature(self):
        self.write_json("behavior_pack/feature_rules/orphan_rule.json", {
            "minecraft:feature_rules": {
                "description": {
                    "identifier": "aetherium:orphan_rule",
                    "places_feature": "aetherium:missing_feature",
                },
                "conditions": {"minecraft:biome_filter": []},
                "distribution": {
                    "iterations": 1,
                    "x": {"extent": [0, 16]},
                    "y": {"extent": [-16, 16]},
                    "z": {"extent": [0, 16]},
                },
            },
        })
        validator.validate_worldgen({"aetherium:ore"})
        self.assertTrue(any("does not match a feature file" in message
                            for message in validator.ERRORS))



if __name__ == "__main__":
    unittest.main(verbosity=2)
