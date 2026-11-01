# Changelog

All notable AETHERIUM project changes are recorded here.

## 0.2.0 – Core prototype

- Added the original `aetherium:crystal` item.
- Added the `aetherium:crystal_block` placeable block and loot table.
- Added shaped recipes to compress nine crystals into a block and unpack a block into nine crystals.
- Added the matching resource pack, texture atlases, and English/Croatian display names.
- Added the behavior-pack dependency on the resource pack.
- Added a test-kit function for repeatable in-game checks.
- Added a local static validator for manifests, recipes, localization, texture references, and loot tables.\n- Repaired validator control flow and expanded cross-reference checks for icons, block textures, and loot paths.\n- Added unit tests for manifest and recipe validation.
- Added a local .mcaddon build script that packages separate .mcpack archives without GitHub Actions.
- Expanded build, validation, and Android/Windows/BDS test documentation.

**Status:** Development prototype. Static repository validation and in-game validation are separate; runtime testing remains pending.

## 0.1.0 – Initial foundation

- Established the project structure, pack manifests, architecture, roadmap, and server-distribution notes.
- Added a minimal core test function.
