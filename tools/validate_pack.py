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


def validate_manifest(relative: str, manifest: dict | None) -> None:
    if not manifest:
        return
    if manifest.get("format_version") != 2:
        error(f"{relative}: expected manifest format_version 2")
    header = manifest.get("header", {})
    if not isinstance(header.get("name"), str) or not header.get("name", "").strip():
        error(f"{relative}: header.name must be a non-empty string")
    for key in ("version", "min_engine_version"):
        value = header.get(key)
        if not isinstance(value, list) or len(value) != 3 or not all(
                isinstance(part, int) and part >= 0 for part in value):
            error(f"{relative}: header.{key} must be a three-part non-negative version")
    modules = manifest.get("modules")
    if not isinstance(modules, list) or not modules:
        error(f"{relative}: at least one module is required")


def validate_recipes(known: set[str]) -> None:
    recipe_ids: set[str] = set()
    validate_recipes(known)

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
                    if len(header) != 24 or header[:8] != bytes([137, 80, 78, 71, 13, 10, 26, 10]):
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
