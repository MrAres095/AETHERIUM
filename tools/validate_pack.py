#!/usr/bin/env python3
"""Static integrity checks for the AETHERIUM Bedrock packs.

This validates repository references and JSON syntax. It does NOT replace
Minecraft Bedrock's content-log or in-game validation.
"""
from __future__ import annotations

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
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        error(f"Invalid JSON in {relative}: {exc}")
        return None


def identifier_ids(folder: str, root_key: str) -> set[str]:
    found: set[str] = set()
    for path in sorted((ROOT / folder).glob("*.json")):
        data = read_json(path.relative_to(ROOT).as_posix())
        if not data:
            continue
        identifier = data.get(root_key, {}).get("description", {}).get("identifier")
        if not isinstance(identifier, str) or ":" not in identifier:
            error(f"{path.relative_to(ROOT)}: missing namespaced identifier")
        elif identifier in found:
            error(f"Duplicate identifier: {identifier}")
        else:
            found.add(identifier)
    return found


def texture_keys(relative: str) -> set[str]:
    data = read_json(relative)
    return set(data.get("texture_data", {})) if data else set()


def main() -> int:
    bp = read_json("behavior_pack/manifest.json")
    rp = read_json("resource_pack/manifest.json")

    uuids: dict[str, str] = {}
    for relative, manifest in (("behavior_pack/manifest.json", bp),
                               ("resource_pack/manifest.json", rp)):
        if not manifest:
            continue
        entries = [("header", manifest.get("header", {}).get("uuid"))]
        entries += [(f"module[{i}]", m.get("uuid"))
                    for i, m in enumerate(manifest.get("modules", []))]
        for label, value in entries:
            if not isinstance(value, str) or not re.fullmatch(
                    r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}", value):
                error(f"{relative}: invalid UUID at {label}")
            elif value in uuids:
                error(f"Duplicate UUID {value}: {uuids[value]} and {relative}:{label}")
            else:
                uuids[value] = f"{relative}:{label}"

    if bp and rp:
        dependencies = bp.get("dependencies", [])
        match = any(d.get("uuid") == rp.get("header", {}).get("uuid")
                    and d.get("version") == rp.get("header", {}).get("version")
                    for d in dependencies)
        if not match:
            error("Behavior pack dependency does not match the resource-pack header UUID/version")

    items = identifier_ids("behavior_pack/items", "minecraft:item")
    blocks = identifier_ids("behavior_pack/blocks", "minecraft:block")
    known = items | blocks

    item_keys = texture_keys("resource_pack/textures/item_texture.json")
    terrain_keys = texture_keys("resource_pack/textures/terrain_texture.json")

    for path in sorted((ROOT / "behavior_pack/items").glob("*.json")):
        data = read_json(path.relative_to(ROOT).as_posix())
        if not data:
            continue
        icon = data.get("minecraft:item", {}).get("components", {}).get("minecraft:icon")
        icon_key = icon if isinstance(icon, str) else icon.get("texture") if isinstance(icon, dict) else None
        if icon_key and icon_key not in item_keys:
            error(f"{path.relative_to(ROOT)}: item icon '{icon_key}' is not in item_texture.json")

    for path in sorted((ROOT / "behavior_pack/blocks").glob("*.json")):
        data = read_json(path.relative_to(ROOT).as_posix())
        if not data:
            continue
        components = data.get("minecraft:block", {}).get("components", {})
        material = components.get("minecraft:material_instances", {})
        for face in material.values():
            key = face.get("texture") if isinstance(face, dict) else None
            if key and key not in terrain_keys:
                error(f"{path.relative_to(ROOT)}: block texture '{key}' is not in terrain_texture.json")
        loot = components.get("minecraft:loot")
        if isinstance(loot, str) and not (ROOT / "behavior_pack" / loot).is_file():
            error(f"{path.relative_to(ROOT)}: missing loot table '{loot}'")

    for path in sorted((ROOT / "behavior_pack/recipes").glob("*.json")):
        data = read_json(path.relative_to(ROOT).as_posix())
        if not data:
            continue
        recipe = next((v for k, v in data.items() if k.startswith("minecraft:recipe_")), {})
        for ingredient in recipe.get("key", {}).values():
            item = ingredient.get("item")
            if item and item not in known:
                error(f"{path.relative_to(ROOT)}: unknown recipe ingredient '{item}'")
        for ingredient in recipe.get("ingredients", []):
            item = ingredient.get("item")
            if item and item not in known:
                error(f"{path.relative_to(ROOT)}: unknown recipe ingredient '{item}'")
        result = recipe.get("result", {})
        result_id = result.get("item") if isinstance(result, dict) else None
        if result_id and result_id not in known:
            error(f"{path.relative_to(ROOT)}: unknown recipe result '{result_id}'")

    for path in sorted((ROOT / "behavior_pack/loot_tables").rglob("*.json")):
        data = read_json(path.relative_to(ROOT).as_posix())
        if not data:
            continue
        for pool in data.get("pools", []):
            for entry in pool.get("entries", []):
                name = entry.get("name")
                if entry.get("type") == "item" and name and name not in known:
                    error(f"{path.relative_to(ROOT)}: unknown loot item '{name}'")

    for atlas, keys in (("resource_pack/textures/item_texture.json", item_keys),
                        ("resource_pack/textures/terrain_texture.json", terrain_keys)):
        data = read_json(atlas)
        if not data:
            continue
        for key, entry in data.get("texture_data", {}).items():
            raw = entry.get("textures")
            values = raw if isinstance(raw, list) else [raw]
            for value in values:
                if not isinstance(value, str):
                    error(f"{atlas}: invalid texture path for '{key}'")
                    continue
                image_path = ROOT / "resource_pack" / (value + ("" if value.endswith(".png") else ".png"))
                if not image_path.is_file():
                    error(f"{atlas}: missing texture file {image_path.relative_to(ROOT)}")
                else:
                    header = image_path.read_bytes()[:24]
                    if len(header) != 24 or header[:8] != b"\\x89PNG\\r\\n\\x1a\\n":
                        error(f"{image_path.relative_to(ROOT)}: not a valid PNG header")
                    else:
                        width, height = struct.unpack(">II", header[16:24])
                        if width < 1 or height < 1:
                            error(f"{image_path.relative_to(ROOT)}: invalid image dimensions")

    texture_files = list((ROOT / "resource_pack/textures").rglob("*.png"))
    if len(texture_files) > 1:
        hashes = {}
        import hashlib
        for path in texture_files:
            digest = hashlib.sha256(path.read_bytes()).hexdigest()
            hashes.setdefault(digest, []).append(path.relative_to(ROOT).as_posix())
        for paths in hashes.values():
            if len(paths) > 1:
                warn("Identical texture files (may be intentional placeholders): " + ", ".join(paths))

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
