# Changelog

All notable AETHERIUM project changes are recorded here.

## 0.3.0 – First ore-generation prototype

- Added the original `aetherium:ore` block.
- Added `aetherium:raw_crystal` as the ore's drop.
- Added an ore feature and Overworld underground feature rule targeting stone and deepslate.
- Added English and Croatian names for the ore and raw material.
- Added distinct original 16×16 pixel-art textures for the raw crystal and ore block.
- Expanded the test kit with raw crystals and ore blocks.
- Extended static validation to check feature identifiers, placed blocks, feature-rule references, biome filters, and distribution bounds.
- Updated the pack manifests and development metadata to 0.3.0.

**Status:** Development prototype. World generation, mining drops, Android/Windows behavior, and BDS compatibility still require in-game testing. Crystal item and crystal-block textures remain placeholders; the new ore and raw-material textures are original 16×16 pixel art.

## 0.2.0 – Core prototype

- Added the original `aetherium:crystal` item and `aetherium:crystal_block` placeable block.
- Added shaped recipes to compress nine crystals into a block and unpack a block into nine crystals.
- Added the matching resource pack, texture atlases, and English/Croatian display names.
- Added the behavior-pack dependency on the resource pack.
- Added a test-kit function for repeatable in-game checks.
- Added a local static validator, unit tests, and a local .mcaddon build script.
- Expanded build, validation, and Android/Windows/BDS test documentation.

**Status:** Development prototype. Static repository validation and in-game validation are separate; runtime testing remains pending.

## 0.1.0 – Initial foundation

- Established the project structure, pack manifests, architecture, roadmap, and server-distribution notes.
- Added a minimal core test function.
