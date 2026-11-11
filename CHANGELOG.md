# Changelog

## Unreleased – Power network integer precision

- Calculate cable-loss requirements using exact quotient/remainder arithmetic to avoid floating-point rounding near the safe-integer limit.
- Add regression tests for maximum safe-integer lossless delivery and source-energy overflow on lossy cables.


## Unreleased – Power buffer midpoint safety

- Calculate binary-search midpoints without adding two potentially large safe integers.
- Add a regression test for maximum safe-integer power demand.


## Unreleased – Wireless route numeric safety

- Use overflow-safe Euclidean distance checks for wireless relay segments with very large finite coordinates.
- Add a regression test for coordinate squaring overflow.

## Unreleased – Power buffer edge-case coverage

- Add regression coverage for direct same-node power delivery without cables, buffer-only supply when source energy is zero, and unsafe integer energy requests.


## Unreleased – Grinder transaction adapter safety

- Reject declared asynchronous storage adapter methods before any inventory operation runs; Grinder commits require a synchronous, non-yielding adapter.
- Add a regression test proving an async write method is not invoked.


All notable AETHERIUM project changes are recorded here.

## Unreleased – Grinder numeric safety

- Require safe integers for input/output stack quantities, stack limits, recipe output counts, and manual operation cooldown deadlines.
- Reject missing, primitive, and array-shaped Manual Grinder operation requests without throwing.
- Add regression tests for unsafe numeric values and malformed operation requests.

## Unreleased – Manual Grinder tick safety

- Reject tick values that would make the next hand-operation cooldown deadline exceed JavaScript's safe-integer range.
- Add boundary tests for the highest valid tick and the first invalid tick.

## Unreleased – Grinder registry expansion

- Added Aetherium Ore → 2 Raw Aetherium Crystals to the universal Grinder registry.
- Documented the initial 22 explicit ore mappings and clarified that the registry is not yet connected to a runtime machine.
- Kept vanilla and AETHERIUM mining behavior unchanged pending implementation and Bedrock testing.



## Unreleased – Shared machine catalogue integrity

- Added static validation for the shared manual/electric machine catalogue.
- Verify each machine's mode, power flag, input/output slots, and upgrade roles.
- Check that recipe registry references exist inside the behavior pack and match the machine family.
- Reject path traversal and malformed recipe registry paths in both the JavaScript Core contract and Python pack validator.
- Added regression tests for invalid paths, missing registries, duplicate machine IDs, and incomplete electric upgrade slots.


## Unreleased – Universal Grinder design

- Expanded the Grinder specification from Aetherium Ore only to all supported vanilla and AETHERIUM ores.
- Set a baseline output of 2 primary-material items per ore block, with explicit mappings for ore types.
- Added planned compatibility registry for third-party add-ons and future The Lost Realms ores.
- Kept normal mining drops unchanged until the actual machine is implemented and tested.


## 0.3.3 – First refining material

- Added the Aetherium Ingot item as the first refined progression material.
- Added a furnace and blast-furnace recipe converting Raw Aetherium Crystal into one Aetherium Ingot.
- Added English and Croatian localization and included ingots in the Core test kit.
- Extended static recipe validation to check furnace inputs, outputs, and station tags.
- Updated both pack manifests to 0.3.3.

**Status:** Repository implementation only. The smelting recipe and new ingot texture still require in-game verification.

## 0.3.2 – Larger Aetherium ore veins

- Increased the configured Aetherium ore feature vein size from 5 to 7 blocks.
- Kept the Overworld placement frequency at 8 attempts per chunk.
- Updated both pack manifests and development metadata to 0.3.2.
- Recorded the design requirement for The Lost Realms: a much richer underground ore distribution, with Aetherium frequently found alongside other dimension ores.

**Status:** Development tuning change. The configured vein size and actual ore abundance still need to be measured in newly generated Bedrock chunks. The Lost Realms dimension remains planned, not implemented.

## 0.3.1 – Increased Aetherium ore frequency

- Increased the Overworld feature-rule placement attempts from 4 to 8 per chunk.
- Kept the vein size at 5 blocks, increasing frequency without increasing individual vein size.
- Updated both pack manifests and development metadata to 0.3.1.
- Updated the test notes and roadmap to track the new abundance setting.

**Status:** Development tuning change. The actual visible frequency still needs to be measured in newly generated Bedrock chunks.

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

- Established the project structure, pack manifests, architecture, and server-distribution notes.
- Added a minimal core test function.
