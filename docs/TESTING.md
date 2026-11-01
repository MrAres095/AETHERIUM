# Testing AETHERIUM

## Current prototype contents

The Core 0.2.0 prototype contains:
- Behavior pack: Aetherium Crystal item, Aetherium Crystal Block, two crafting recipes, a smoke-test function, and a test-kit function.
- Resource pack: item and block texture atlases, English and Croatian language strings, and early placeholder PNG textures.
- The behavior pack declares the resource pack as a dependency.

## Import and in-game test

1. Build the package with `python3 tools/build_mcaddon.py`, or import the behavior and resource packs separately.
2. Open the package in Minecraft Bedrock and confirm that both packs import without warnings.
3. Create a disposable Creative test world.
4. Activate AETHERIUM Core. Confirm its resource-pack dependency is enabled as well.
5. Enable cheats for the test world.
6. Search the Creative inventory for Aetherium Crystal and Aetherium Crystal Block.
7. Run `/function aetherium/core/test` to verify the pack function loads.
8. Run `/function aetherium/core/test_kit` to receive 9 crystals and 1 crystal block for testing.
9. Use the crafting table: 9 crystals should create 1 block; 1 block should return 9 crystals.
10. Place and break the block. Confirm its texture displays and that it drops itself.
11. Switch Minecraft language to Croatian and confirm the item/block display names are localized.
12. Check the world/content log for manifest, texture, block, or recipe errors.

## Pass criteria

- Both packs import and activate without invalid-manifest warnings.
- The custom item appears with its intended icon and display name.
- The custom block appears, places, breaks, and drops correctly.
- Both recipes work in both directions.
- Both Core test functions run successfully.
- English and Croatian display names resolve correctly.
- No unrelated vanilla gameplay is changed.

## Before each release

- Run `python3 tools/validate_pack.py`.
- Build the .mcaddon and verify archive integrity.
- Import into a clean Bedrock test world.
- Test on Android and Windows Bedrock where available.
- Check behavior with the other AETHERIUM modules enabled.
- Record the exact Minecraft version and test result.

Repository-side JSON and package-structure checks do not replace the in-game test. The current prototype has not yet been confirmed inside Minecraft.
