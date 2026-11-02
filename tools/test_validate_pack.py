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


    def test_valid_furnace_recipe_passes(self):
        self.write_json("behavior_pack/recipes/refine.json", {
            "format_version": "1.17.41",
            "minecraft:recipe_furnace": {
                "description": {"identifier": "aetherium:refine"},
                "tags": ["furnace", "blast_furnace"],
                "input": "aetherium:raw_crystal",
                "output": "aetherium:ingot",
            },
        })
        validator.validate_recipes({"aetherium:raw_crystal", "aetherium:ingot"})
        self.assertEqual(validator.ERRORS, [])

    def test_furnace_recipe_rejects_unknown_output(self):
        self.write_json("behavior_pack/recipes/refine.json", {
            "minecraft:recipe_furnace": {
                "description": {"identifier": "aetherium:refine"},
                "tags": ["furnace"],
                "input": "aetherium:raw_crystal",
                "output": "aetherium:missing_ingot",
            },
        })
        validator.validate_recipes({"aetherium:raw_crystal"})
        self.assertTrue(any("unknown furnace output" in message for message in validator.ERRORS))

    def test_content_references_require_localization_for_each_item_and_block(self):
        self.write_json("resource_pack/textures/item_texture.json", {
            "texture_data": {"test_icon": {"textures": "textures/items/test"}}
        })
        self.write_json("resource_pack/textures/terrain_texture.json", {
            "texture_data": {"test_block": {"textures": "textures/blocks/test"}}
        })
        self.write_json("resource_pack/texts/languages.json", ["en_US", "hr_HR"])
        self.write_json("behavior_pack/items/test.json", {
            "minecraft:item": {
                "description": {"identifier": "aetherium:test_item"},
                "components": {
                    "minecraft:icon": "test_icon",
                    "minecraft:display_name": {"value": "item.aetherium:test_item.name"},
                },
            }
        })
        self.write_json("behavior_pack/blocks/test.json", {
            "minecraft:block": {
                "description": {"identifier": "aetherium:test_block"},
                "components": {
                    "minecraft:material_instances": {
                        "*": {"texture": "test_block"}
                    }
                },
            }
        })
        texts = self.root / "resource_pack/texts"
        texts.mkdir(parents=True, exist_ok=True)
        (texts / "en_US.lang").write_text(
            "item.aetherium:test_item.name=Test Item\ntile.aetherium:test_block.name=Test Block",
            encoding="utf-8",
        )
        (texts / "hr_HR.lang").write_text(
            "item.aetherium:test_item.name=Test predmet",
            encoding="utf-8",
        )

        validator.validate_content_references()
        self.assertTrue(any("tile.aetherium:test_block.name" in message and "hr_HR" in message
                            for message in validator.ERRORS))

    def test_content_references_pass_when_all_registered_names_are_localized(self):
        self.write_json("resource_pack/textures/item_texture.json", {
            "texture_data": {"test_icon": {"textures": "textures/items/test"}}
        })
        self.write_json("resource_pack/textures/terrain_texture.json", {
            "texture_data": {"test_block": {"textures": "textures/blocks/test"}}
        })
        self.write_json("resource_pack/texts/languages.json", ["en_US"])
        self.write_json("behavior_pack/items/test.json", {
            "minecraft:item": {
                "description": {"identifier": "aetherium:test_item"},
                "components": {
                    "minecraft:icon": "test_icon",
                    "minecraft:display_name": {"value": "item.aetherium:test_item.name"},
                },
            }
        })
        self.write_json("behavior_pack/blocks/test.json", {
            "minecraft:block": {
                "description": {"identifier": "aetherium:test_block"},
                "components": {
                    "minecraft:material_instances": {
                        "*": {"texture": "test_block"}
                    }
                },
            }
        })
        texts = self.root / "resource_pack/texts"
        texts.mkdir(parents=True, exist_ok=True)
        (texts / "en_US.lang").write_text(
            "item.aetherium:test_item.name=Test Item\ntile.aetherium:test_block.name=Test Block",
            encoding="utf-8",
        )

        validator.validate_content_references()
        self.assertEqual(validator.ERRORS, [])

    def test_valid_grinder_registry_passes(self):
        self.write_json("behavior_pack/industry/grinder_recipes.json", {
            "schema_version": 1, "machine": "aetherium:grinder", "default_output_count": 2,
            "recipes": [{"input": "minecraft:iron_ore", "output": "minecraft:raw_iron", "count": 2}],
        })
        validator.validate_grinder_registry()
        self.assertEqual(validator.ERRORS, [])

    def test_grinder_registry_rejects_duplicate_inputs_and_invalid_counts(self):
        self.write_json("behavior_pack/industry/grinder_recipes.json", {
            "schema_version": 1, "machine": "aetherium:grinder", "default_output_count": 2,
            "recipes": [
                {"input": "minecraft:iron_ore", "output": "minecraft:raw_iron", "count": 2},
                {"input": "minecraft:iron_ore", "output": "minecraft:raw_iron", "count": 0},
            ],
        })
        validator.validate_grinder_registry()
        self.assertTrue(any("duplicate input mapping" in message for message in validator.ERRORS))
        self.assertTrue(any(".count must be a positive integer" in message for message in validator.ERRORS))

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



    def test_localization_rejects_duplicate_translation_keys(self):
        (self.root / "resource_pack/texts").mkdir(parents=True)
        (self.root / "resource_pack/texts/languages.json").write_text(
            json.dumps(["en_US"]), encoding="utf-8"
        )
        (self.root / "resource_pack/texts/en_US.lang").write_text(
            "item.aetherium:crystal.name=Crystal\n"
            "item.aetherium:crystal.name=Duplicate\n",
            encoding="utf-8",
        )
        validator.validate_localization()
        self.assertTrue(any("duplicate translation key" in message
                            for message in validator.ERRORS))

    def test_localization_requires_matching_keys_across_languages(self):
        texts = self.root / "resource_pack/texts"
        texts.mkdir(parents=True)
        (texts / "languages.json").write_text(
            json.dumps(["en_US", "hr_HR"]), encoding="utf-8"
        )
        required = [
            "item.aetherium:crystal.name",
            "item.aetherium:raw_crystal.name",
            "item.aetherium:ingot.name",
            "tile.aetherium:crystal_block.name",
            "tile.aetherium:ore.name",
        ]
        english = "\n".join(f"{key}=English" for key in required)
        croatian = "\n".join(f"{key}=Croatian" for key in required[:-1]) + "\nitem.extra=Extra"
        (texts / "en_US.lang").write_text(english, encoding="utf-8")
        (texts / "hr_HR.lang").write_text(croatian, encoding="utf-8")
        validator.validate_localization()
        self.assertTrue(any("missing keys present in other languages" in message
                            for message in validator.ERRORS))
        self.assertTrue(any("keys not present in other languages" in message
                            for message in validator.ERRORS))

    def test_localization_rejects_duplicate_language_codes(self):
        texts = self.root / "resource_pack/texts"
        texts.mkdir(parents=True)
        (texts / "languages.json").write_text(
            json.dumps(["en_US", "en_US"]), encoding="utf-8"
        )
        (texts / "en_US.lang").write_text("", encoding="utf-8")
        validator.validate_localization()
        self.assertTrue(any("duplicate language codes" in message
                            for message in validator.ERRORS))


if __name__ == "__main__":
    unittest.main(verbosity=2)
