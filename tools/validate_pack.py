#!/usr/bin/env python3
"""Static integrity checks for the AETHERIUM Bedrock packs.

This checks repository structure and cross-references. It does not replace
Bedrock engine validation, content-log review, or in-game testing.
"""
from __future__ import annotations

import hashlib
import json
import re
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ERRORS: list[str] = []
WARNINGS: list[str] = []


def error(message: str) -> None:
    ERRORS.append(message)


def warn(message: str) -> None:
    WARNINGS.append(message)


def read_json(relative: str):
    path = ROOT / relative
    if not path.is_file():
        error(f"Missing JSON file: {relative}")
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        error(f"Invalid JSON in {relative}: {exc}")
        return None
    if not isinstance(data, dict):
        error(f"{relative}: expected a JSON object")
        return None
    return data


def validate_manifest(relative: str, manifest: dict | None) -> set[str]:
    uuids: set[str] = set()
    if not manifest:
        return uuids
    if manifest.get("format_version") != 2:
        error(f"{relative}: expected manifest format_version 2")
    header = manifest.get("header")
    if not isinstance(header, dict):
        error(f"{relative}: header must be an object")
        return uuids
    if not isinstance(header.get("name"), str) or not header.get("name", "").strip():
        error(f"{relative}: header.name must be a non-empty string")
    for key in ("uuid",):
        value = header.get(key)
        if not isinstance(value, str) or not re.fullmatch(
            r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}", value
        ):
            error(f"{relative}: header.{key} must be a UUID")
        else:
            uuids.add(value.lower())
    for key in ("version", "min_engine_version"):
        value = header.get(key)
        if not isinstance(value, list) or len(value) != 3 or not all(
            isinstance(part, int) and not isinstance(part, bool) and part >= 0 for part in value
        ):
            error(f"{relative}: header.{key} must be a three-part non-negative version")
    modules = manifest.get("modules")
    if not isinstance(modules, list) or not modules:
        error(f"{relative}: at least one module is required")
    else:
        for index, module in enumerate(modules):
            if not isinstance(module, dict):
                error(f"{relative}: modules[{index}] must be an object")
                continue
            module_uuid = module.get("uuid")
            if not isinstance(module_uuid, str) or not re.fullmatch(
                r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}", module_uuid
            ):
                error(f"{relative}: modules[{index}].uuid must be a UUID")
            elif module_uuid.lower() in uuids:
                error(f"{relative}: duplicate UUID {module_uuid}")
            else:
                uuids.add(module_uuid.lower())
            version = module.get("version")
            if not isinstance(version, list) or len(version) != 3 or not all(
                isinstance(part, int) and not isinstance(part, bool) and part >= 0 for part in version
            ):
                error(f"{relative}: modules[{index}].version must be a three-part version")
    return uuids


def identifiers(folder: str, component: str) -> set[str]:
    found: set[str] = set()
    base = ROOT / folder
    if not base.is_dir():
        error(f"Missing directory: {folder}")
        return found
    for path in sorted(base.glob("*.json")):
        relative = path.relative_to(ROOT).as_posix()
        data = read_json(relative)
        if not data:
            continue
        body = data.get(component, {})
        description = body.get("description", {}) if isinstance(body, dict) else {}
        identifier = description.get("identifier") if isinstance(description, dict) else None
        if not isinstance(identifier, str) or not re.fullmatch(r"[a-z0-9_.-]+:[a-z0-9_./-]+", identifier):
            error(f"{relative}: missing or invalid namespaced identifier")
        elif identifier in found:
            error(f"{relative}: duplicate identifier {identifier}")
        else:
            found.add(identifier)
    return found


def validate_recipes(known_items: set[str]) -> None:
    folder = ROOT / "behavior_pack/recipes"
    if not folder.is_dir():
        error("Missing directory: behavior_pack/recipes")
        return
    recipe_ids: set[str] = set()
    for path in sorted(folder.glob("*.json")):
        relative = path.relative_to(ROOT).as_posix()
        data = read_json(relative)
        if not data:
            continue
        recipe_types = [key for key in ("minecraft:recipe_shaped", "minecraft:recipe_shapeless", "minecraft:recipe_furnace") if key in data]
        if len(recipe_types) != 1:
            error(f"{relative}: expected exactly one supported recipe definition")
            continue
        recipe = data[recipe_types[0]]
        if not isinstance(recipe, dict):
            error(f"{relative}: recipe definition must be an object")
            continue
        description = recipe.get("description", {})
        identifier = description.get("identifier") if isinstance(description, dict) else None
        if not isinstance(identifier, str) or ":" not in identifier:
            error(f"{relative}: missing namespaced recipe identifier")
        elif identifier in recipe_ids:
            error(f"{relative}: duplicate recipe identifier {identifier}")
        else:
            recipe_ids.add(identifier)
        if recipe_types[0] == "minecraft:recipe_furnace":
            input_item = recipe.get("input")
            output_item = recipe.get("output")
            if input_item not in known_items:
                error(f"{relative}: unknown furnace input '{input_item}'")
            if output_item not in known_items:
                error(f"{relative}: unknown furnace output '{output_item}'")
            tags = recipe.get("tags")
            if not isinstance(tags, list) or not tags or not all(isinstance(tag, str) for tag in tags):
                error(f"{relative}: furnace recipe needs a non-empty tags list")
            continue

        result = recipe.get("result", {})
        result_item = result.get("item") if isinstance(result, dict) else None
        count = result.get("count", 1) if isinstance(result, dict) else 0
        if result_item not in known_items:
            error(f"{relative}: unknown recipe result '{result_item}'")
        if not isinstance(count, int) or isinstance(count, bool) or count < 1:
            error(f"{relative}: result.count must be a positive integer")
        if recipe_types[0] == "minecraft:recipe_shaped":
            pattern = recipe.get("pattern")
            key_map = recipe.get("key")
            if not isinstance(pattern, list) or not pattern or not all(isinstance(row, str) for row in pattern):
                error(f"{relative}: shaped recipe pattern must be a non-empty list of strings")
                continue
            if len({len(row) for row in pattern}) != 1 or len(pattern) > 3 or len(pattern[0]) > 3:
                error(f"{relative}: shaped recipe pattern must be rectangular and at most 3x3")
            if not isinstance(key_map, dict):
                error(f"{relative}: shaped recipe key must be an object")
                continue
            used_symbols = set("".join(pattern)) - {" "}
            for symbol in used_symbols:
                ingredient = key_map.get(symbol)
                item = ingredient.get("item") if isinstance(ingredient, dict) else None
                if item not in known_items:
                    error(f"{relative}: pattern symbol '{symbol}' has an unknown or missing ingredient")
            unused = set(key_map) - used_symbols
            if unused:
                warn(f"{relative}: unused key symbols: {', '.join(sorted(unused))}")
        else:
            ingredients = recipe.get("ingredients")
            if not isinstance(ingredients, list) or not ingredients:
                error(f"{relative}: shapeless recipe needs at least one ingredient")
                continue
            for ingredient in ingredients:
                item = ingredient.get("item") if isinstance(ingredient, dict) else None
                if item not in known_items:
                    error(f"{relative}: unknown or missing shapeless ingredient '{item}'")


def validate_loot_tables(known_items: set[str]) -> None:
    folder = ROOT / "behavior_pack/loot_tables"
    if not folder.is_dir():
        warn("No loot_tables directory found")
        return
    for path in sorted(folder.rglob("*.json")):
        relative = path.relative_to(ROOT).as_posix()
        data = read_json(relative)
        if not data:
            continue
        pools = data.get("pools")
        if not isinstance(pools, list) or not pools:
            error(f"{relative}: loot table must contain at least one pool")
            continue
        for pool in pools:
            if not isinstance(pool, dict):
                error(f"{relative}: loot pool must be an object")
                continue
            for entry in pool.get("entries", []):
                if isinstance(entry, dict) and entry.get("type") == "item":
                    name = entry.get("name")
                    if name not in known_items:
                        error(f"{relative}: unknown loot item '{name}'")


def validate_textures() -> None:
    for atlas in ("resource_pack/textures/item_texture.json", "resource_pack/textures/terrain_texture.json"):
        data = read_json(atlas)
        if not data:
            continue
        texture_data = data.get("texture_data")
        if not isinstance(texture_data, dict):
            error(f"{atlas}: texture_data must be an object")
            continue
        for key, entry in texture_data.items():
            raw = entry.get("textures") if isinstance(entry, dict) else None
            values = raw if isinstance(raw, list) else [raw]
            for value in values:
                if not isinstance(value, str) or not value:
                    error(f"{atlas}: invalid texture path for '{key}'")
                    continue
                image_path = ROOT / "resource_pack" / (value + ("" if value.endswith(".png") else ".png"))
                if not image_path.is_file():
                    error(f"{atlas}: missing texture file {image_path.relative_to(ROOT)}")
                    continue
                header = image_path.read_bytes()[:24]
                if len(header) != 24 or header[:8] != bytes([137, 80, 78, 71, 13, 10, 26, 10]):
                    error(f"{image_path.relative_to(ROOT)}: invalid PNG header")
                else:
                    width, height = struct.unpack(">II", header[16:24])
                    if width < 1 or height < 1:
                        error(f"{image_path.relative_to(ROOT)}: invalid PNG dimensions")
    files = list((ROOT / "resource_pack/textures").rglob("*.png"))
    hashes: dict[str, list[str]] = {}
    for path in files:
        hashes.setdefault(hashlib.sha256(path.read_bytes()).hexdigest(), []).append(
            path.relative_to(ROOT).as_posix()
        )
    for paths in hashes.values():
        if len(paths) > 1:
            warn("Identical texture files (review whether intentional): " + ", ".join(paths))


def validate_content_references() -> None:
    item_atlas = read_json("resource_pack/textures/item_texture.json") or {}
    terrain_atlas = read_json("resource_pack/textures/terrain_texture.json") or {}
    item_keys = set(item_atlas.get("texture_data", {}))
    terrain_keys = set(terrain_atlas.get("texture_data", {}))

    for path in sorted((ROOT / "behavior_pack/items").glob("*.json")):
        relative = path.relative_to(ROOT).as_posix()
        data = read_json(relative)
        if not data:
            continue
        components = data.get("minecraft:item", {}).get("components", {})
        icon = components.get("minecraft:icon")
        if isinstance(icon, dict):
            icon = icon.get("texture")
        if not isinstance(icon, str) or icon not in item_keys:
            error(f"{relative}: item icon '{icon}' is missing from item_texture.json")

    for path in sorted((ROOT / "behavior_pack/blocks").glob("*.json")):
        relative = path.relative_to(ROOT).as_posix()
        data = read_json(relative)
        if not data:
            continue
        components = data.get("minecraft:block", {}).get("components", {})
        instances = components.get("minecraft:material_instances", {})
        if isinstance(instances, dict):
            for slot, material in instances.items():
                texture = material.get("texture") if isinstance(material, dict) else None
                if texture not in terrain_keys:
                    error(f"{relative}: material texture '{texture}' for slot '{slot}' is missing from terrain_texture.json")
        loot_path = components.get("minecraft:loot")
        if isinstance(loot_path, str) and not (ROOT / "behavior_pack" / loot_path).is_file():
            error(f"{relative}: referenced loot table does not exist: {loot_path}")


def validate_worldgen(known_blocks: set[str]) -> None:
    feature_dir = ROOT / "behavior_pack/features"
    rule_dir = ROOT / "behavior_pack/feature_rules"
    features: set[str] = set()
    if not feature_dir.is_dir():
        warn("No behavior_pack/features directory found")
    else:
        for path in sorted(feature_dir.glob("*.json")):
            relative = path.relative_to(ROOT).as_posix()
            data = read_json(relative)
            if not data:
                continue
            body = data.get("minecraft:ore_feature")
            if not isinstance(body, dict):
                error(f"{relative}: only minecraft:ore_feature is currently supported by the worldgen validator")
                continue
            description = body.get("description", {})
            identifier = description.get("identifier") if isinstance(description, dict) else None
            if not isinstance(identifier, str) or ":" not in identifier:
                error(f"{relative}: feature needs a namespaced identifier")
            else:
                features.add(identifier)
                if identifier.split(":", 1)[1] != path.stem:
                    error(f"{relative}: filename must match the feature identifier after its namespace")
            count = body.get("count")
            if not isinstance(count, int) or isinstance(count, bool) or count < 1:
                error(f"{relative}: ore feature count must be a positive integer")
            rules = body.get("replace_rules")
            if not isinstance(rules, list) or not rules:
                error(f"{relative}: ore feature needs at least one replace rule")
            else:
                for rule in rules:
                    block = rule.get("places_block") if isinstance(rule, dict) else None
                    if block not in known_blocks:
                        error(f"{relative}: places_block '{block}' is not a registered AETHERIUM block")
    if not rule_dir.is_dir():
        warn("No behavior_pack/feature_rules directory found")
        return
    for path in sorted(rule_dir.glob("*.json")):
        relative = path.relative_to(ROOT).as_posix()
        data = read_json(relative)
        if not data:
            continue
        body = data.get("minecraft:feature_rules")
        if not isinstance(body, dict):
            error(f"{relative}: missing minecraft:feature_rules object")
            continue
        description = body.get("description", {})
        places = description.get("places_feature") if isinstance(description, dict) else None
        identifier = description.get("identifier") if isinstance(description, dict) else None
        if places not in features:
            error(f"{relative}: places_feature '{places}' does not match a feature file")
        if not isinstance(identifier, str) or ":" not in identifier:
            error(f"{relative}: feature rule needs a namespaced identifier")
        conditions = body.get("conditions")
        if not isinstance(conditions, dict) or not isinstance(conditions.get("minecraft:biome_filter"), list):
            error(f"{relative}: feature rule needs a biome filter")
        distribution = body.get("distribution")
        if not isinstance(distribution, dict):
            error(f"{relative}: feature rule needs a distribution object")
        else:
            iterations = distribution.get("iterations")
            if not isinstance(iterations, int) or isinstance(iterations, bool) or iterations < 1:
                error(f"{relative}: distribution.iterations must be a positive integer")
            for axis in ("x", "y", "z"):
                axis_data = distribution.get(axis, {})
                extent = axis_data.get("extent") if isinstance(axis_data, dict) else None
                if not isinstance(extent, list) or len(extent) != 2 or not all(
                    isinstance(value, int) and not isinstance(value, bool) for value in extent
                ) or extent[0] > extent[1]:
                    error(f"{relative}: distribution.{axis}.extent must be two ordered integer bounds")


def validate_localization() -> None:
    relative = "resource_pack/texts/languages.json"
    languages = ROOT / relative
    if not languages.is_file():
        error(f"Missing localization index: {relative}")
        return
    try:
        codes = json.loads(languages.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        error(f"Invalid {relative}: {exc}")
        return
    if not isinstance(codes, list) or not codes:
        error(f"{relative}: expected a non-empty array of language codes")
        return
    required = {"item.aetherium:crystal.name", "item.aetherium:raw_crystal.name", "item.aetherium:ingot.name", "tile.aetherium:crystal_block.name", "tile.aetherium:ore.name"}
    for code in codes:
        if not isinstance(code, str) or not re.fullmatch(r"[a-z]{2}_[A-Z]{2}", code):
            error(f"{relative}: invalid language code '{code}'")
            continue
        lang_path = ROOT / "resource_pack/texts" / f"{code}.lang"
        if not lang_path.is_file():
            error(f"Missing language file: {lang_path.relative_to(ROOT)}")
            continue
        entries = {}
        for line in lang_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            entries[key.strip()] = value.strip()
        for key in required:
            if not entries.get(key):
                error(f"{lang_path.relative_to(ROOT)}: missing translation '{key}'")


def main() -> int:
    bp_path = "behavior_pack/manifest.json"
    rp_path = "resource_pack/manifest.json"
    bp = read_json(bp_path)
    rp = read_json(rp_path)
    bp_uuids = validate_manifest(bp_path, bp)
    rp_uuids = validate_manifest(rp_path, rp)
    if bp and rp:
        bp_version = bp.get("header", {}).get("version")
        rp_version = rp.get("header", {}).get("version")
        if bp_version != rp_version:
            error("Behavior-pack and resource-pack header versions do not match")
        dependencies = bp.get("dependencies", [])
        if not any(
            isinstance(dep, dict)
            and dep.get("uuid", "").lower() == rp.get("header", {}).get("uuid", "").lower()
            and dep.get("version") == rp_version
            for dep in dependencies if isinstance(dep, dict)
        ):
            error("Behavior pack is missing the matching resource-pack dependency")
    if bp_uuids & rp_uuids:
        error("Behavior-pack and resource-pack manifest UUIDs must be unique")

    items = identifiers("behavior_pack/items", "minecraft:item")
    blocks = identifiers("behavior_pack/blocks", "minecraft:block")
    known = items | blocks
    validate_recipes(known)
    validate_loot_tables(known)
    validate_textures()
    validate_content_references()
    validate_worldgen(blocks)
    validate_localization()

    for message in WARNINGS:
        print("WARN: " + message)
    for message in ERRORS:
        print("ERROR: " + message)
    if ERRORS:
        print(f"FAILED: {len(ERRORS)} error(s), {len(WARNINGS)} warning(s)")
        return 1
    print(f"PASSED: static integrity checks completed ({len(WARNINGS)} warning(s)).")
    print("Note: Bedrock engine/schema and in-game behavior are not verified by this script.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
