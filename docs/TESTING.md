# Testing AETHERIUM

## Current prototype contents

The 0.3.0 development prototype contains:
- Aetherium Crystal and Aetherium Crystal Block from the initial Core prototype.
- Aetherium Ore, which is intended to generate in underground Overworld stone/deepslate.
- Raw Aetherium Crystal dropped by the ore.
- English and Croatian names for the new content.
- A test-kit function that supplies sample items and blocks.

The raw crystal and ore now have distinct original 16×16 pixel-art textures. The original crystal and crystal-block textures remain placeholders.

## World-generation requirement

The current custom feature/feature-rule approach may require the **Creation of Custom Biomes** experiment to be enabled in the test world, depending on the Bedrock release. Use a disposable world and record which experiments are enabled. A feature rule only affects newly generated chunks; explore fresh terrain after activating the pack.

## Import and in-game test

1. Run the unit tests and static validator, then build with `python3 tools/build_mcaddon.py`.
2. Import the package into Minecraft Bedrock and create a disposable Creative test world.
3. Activate both AETHERIUM packs and enable cheats.
4. If ore world generation does not activate, enable the required world-generation experiment in that disposable world and create fresh chunks.
5. Run `/function aetherium/core/test` and `/function aetherium/core/test_kit`.
6. Confirm the test kit includes Aetherium Crystal, Raw Aetherium Crystal, Aetherium Ore, and Aetherium Crystal Block.
7. Locate Aetherium Ore in newly generated underground Overworld terrain, including stone and deepslate areas.
8. Mine the ore and confirm it drops Raw Aetherium Crystal.
9. Check the Creative inventory names in English and Croatian.
10. Check the Content Log for feature, feature-rule, block, loot-table, texture, and manifest errors.

## Pass criteria

- Both packs import and activate.
- The test-kit function gives all four test resources.
- The ore feature and feature rule load without Content Log errors.
- New chunks in the target height range can generate the ore in the Overworld.
- Mining the ore drops the raw crystal.
- English and Croatian names resolve correctly.

## Before each release

- Run `python3 -m unittest discover -s tools -p 'test_*.py' -v`.
- Run `python3 tools/validate_pack.py`.
- Build the .mcaddon and verify archive integrity.
- Import into a clean Bedrock test world.
- Test on Android and Windows Bedrock where available.
- Test the same pack on the target Bedrock Dedicated Server.
- Record the exact Minecraft version, platform, experiment settings, and test result.

Repository-side checks do not replace testing in the actual Bedrock engine. The current 0.3.0 prototype has not yet been confirmed inside Minecraft.
